/**
 * useAutoImport.ts
 *
 * InAppBrowser 教务系统课表自动抓取 Hook
 *
 * 核心流程：
 *   1. openWebView → 加载教务系统登录页
 *   2. 用户在浏览器中登录 & 导航到课表页
 *   3. 用户点击 App 悬浮的「抓取」按钮（或 URL 自动匹配后触发）
 *   4. executeScript 注入 JS → 复制 outerHTML 到系统剪贴板
 *   5. close() 关闭浏览器 → 从剪贴板读取 HTML → 交给 smartParseSchedule
 *
 * 数据回传策略：
 *   @capgo/inappbrowser 的 executeScript 是 fire-and-forget（不返回值），
 *   因此我们将 HTML 写入系统剪贴板，关闭浏览器后在 App 主线程读取。
 *
 * URL 管理策略：
 *   - 每个 school 的可用 URL 以 `CUSTOM_EAS_URL:<schoolId>` 为 key 持久化到 localStorage
 *   - 初始化时优先读取缓存 URL，否则使用 school.login_url 默认值
 *   - 抓取成功后自动将当前 URL 写入缓存
 */

import { useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { InAppBrowser } from '@capgo/inappbrowser';
import { smartParseSchedule, type ParsedCourse } from '../lib/parseSchedule';

// ─── Types ───────────────────────────────────────────────────────────────

export type ImportStatus = 'idle' | 'browsing' | 'extracting' | 'success' | 'error';

export interface UseAutoImportReturn {
  status: ImportStatus;
  statusText: string;
  courses: ParsedCourse[];
  error: string | null;
  /** 地址栏绑定的当前 URL */
  currentUrl: string;
  /** 更新地址栏中的 URL（纯 UI 状态，不触发导航） */
  setCurrentUrl: (url: string) => void;
  /** 打开内置浏览器，开始导入流程 */
  startImport: (loginUrl: string, systemType: string, schoolId?: string) => Promise<void>;
  /** 浏览器打开期间，动态跳转到新 URL */
  navigateTo: (url: string) => Promise<void>;
  /** 用户确认已在课表页时，手动触发抓取 */
  captureNow: () => Promise<void>;
  /** 关闭浏览器 / 重置状态 */
  cancel: () => Promise<void>;
}

// ─── Constants ───────────────────────────────────────────────────────────

const CUSTOM_EAS_URL_PREFIX = 'CUSTOM_EAS_URL:';

const STATUS_TEXT: Record<ImportStatus, string> = {
  idle: '',
  browsing: '请登录教务系统，进入课表页面后点击下方「抓取课表」',
  extracting: '正在提取页面数据…',
  success: '课表抓取成功！',
  error: '抓取失败',
};

// ─── Helpers ─────────────────────────────────────────────────────────────

/** 读取 localStorage 中缓存的有效 URL；若无缓存则返回 fallback */
function getEffectiveUrl(schoolId: string | undefined, fallback: string): string {
  if (!schoolId) return fallback;
  try {
    const cached = localStorage.getItem(CUSTOM_EAS_URL_PREFIX + schoolId);
    if (cached) return cached;
  } catch { /* ignore */ }
  return fallback;
}

/** 将有效 URL 写入 localStorage */
function saveEffectiveUrl(schoolId: string | undefined, url: string): void {
  if (!schoolId || !url) return;
  try {
    localStorage.setItem(CUSTOM_EAS_URL_PREFIX + schoolId, url);
  } catch { /* ignore */ }
}

/** 确保 URL 以协议开头 */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

// ─── Hook ────────────────────────────────────────────────────────────────

export function useAutoImport(): UseAutoImportReturn {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [courses, setCourses] = useState<ParsedCourse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');

  const systemTypeRef = useRef('zhengfang');
  const schoolIdRef = useRef<string | undefined>(undefined);
  const activeUrlRef = useRef('');          // 实际加载到 WebView 中的 URL

  // ── 初始化 URL（供 ImportContainer 在挂载时调用） ──────────────────

  const initUrl = useCallback((schoolId: string, defaultUrl: string) => {
    const effective = getEffectiveUrl(schoolId, defaultUrl);
    setCurrentUrl(effective);
    schoolIdRef.current = schoolId;
    activeUrlRef.current = effective;
  }, []);

  // ── 打开浏览器 ──────────────────────────────────────────────────────

  const startImport = useCallback(async (loginUrl: string, systemType: string, schoolId?: string) => {
    setCourses([]);
    setError(null);
    systemTypeRef.current = systemType;
    schoolIdRef.current = schoolId;

    // 确定最终要加载的 URL
    const urlToLoad = normalizeUrl(currentUrl || loginUrl);
    activeUrlRef.current = urlToLoad;
    setCurrentUrl(urlToLoad);

    if (!Capacitor.isNativePlatform()) {
      setError('自动导入仅支持 App 环境');
      setStatus('error');
      return;
    }

    try {
      setStatus('browsing');

      await InAppBrowser.openWebView({
        url: urlToLoad,
        title: '教务系统',
        toolbarColor: '#6d23f9',
        showArrow: true,
        isPresentAfterPageLoad: true,
      });

      // 监听 URL 变化 → 同步到 React 状态
      await InAppBrowser.addListener('urlChangeEvent', (event: any) => {
        if (event?.url) {
          activeUrlRef.current = event.url;
          setCurrentUrl(event.url);
        }
      });

      // 监听浏览器关闭 → 重置状态（如果用户自己关了）
      await InAppBrowser.addListener('closeEvent', () => {
        setStatus(prev => (prev === 'browsing' ? 'idle' : prev));
      });
    } catch (err) {
      setError(`无法打开浏览器: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
    }
  }, [currentUrl]);

  // ── 动态跳转到新 URL（浏览器打开期间） ──────────────────────────────

  const navigateTo = useCallback(async (url: string) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    activeUrlRef.current = normalized;
    setCurrentUrl(normalized);

    try {
      await InAppBrowser.setUrl({ url: normalized });
    } catch (err) {
      // 如果 setUrl 失败（浏览器可能已关闭），尝试重新打开
      console.warn('[useAutoImport] setUrl failed, retrying with openWebView', err);
      try {
        await InAppBrowser.openWebView({
          url: normalized,
          title: '教务系统',
          toolbarColor: '#6d23f9',
          showArrow: true,
          isPresentAfterPageLoad: true,
        });
        setStatus('browsing');
      } catch (e2) {
        setError(`无法打开浏览器: ${e2 instanceof Error ? e2.message : String(e2)}`);
        setStatus('error');
      }
    }
  }, []);

  // ── 抓取当前页面 ────────────────────────────────────────────────────

  const captureNow = useCallback(async () => {
    setStatus('extracting');
    setError(null);

    try {
      // Step 1: 注入脚本 → 将整个 HTML 复制到系统剪贴板
      await InAppBrowser.executeScript({
        code: `
(function(){
  try {
    var html = document.documentElement.outerHTML;
    var ta = document.createElement('textarea');
    ta.value = html;
    ta.setAttribute('readonly','');
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    document.title = 'NextClass_OK_' + html.length;
  } catch(e) {
    document.title = 'NextClass_ERR_' + e.message;
  }
})();
        `,
      });

      // 等待脚本执行完成
      await new Promise(r => setTimeout(r, 800));

      // Step 2: 关闭内置浏览器
      await InAppBrowser.close();

      // Step 3: 从剪贴板读取 HTML
      await new Promise(r => setTimeout(r, 300));

      let html = '';
      try {
        html = await navigator.clipboard.readText();
      } catch {
        throw new Error('无法读取剪贴板。请授予剪贴板权限后重试。');
      }

      if (!html || html.length < 100 || !/<[a-z]/i.test(html)) {
        throw new Error('剪贴板中未找到有效的 HTML 数据。请确保已在课表页面后重试。');
      }

      // Step 4: 解析
      const parsed = smartParseSchedule(html, systemTypeRef.current);

      if (parsed.length === 0) {
        throw new Error(
          '页面中未发现课表数据。\n\n' +
          '可能原因：\n' +
          '• 课表尚未完全加载（AJAX 动态内容需等待几秒）\n' +
          '• 当前页面不是课表页面\n' +
          '• 该教务系统的格式暂不支持自动解析'
        );
      }

      // Step 5: 成功 → 持久化当前有效 URL
      saveEffectiveUrl(schoolIdRef.current, activeUrlRef.current);

      setCourses(parsed);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  // ── 取消 ────────────────────────────────────────────────────────────

  const cancel = useCallback(async () => {
    try { await InAppBrowser.close(); } catch { /* already closed */ }
    setStatus('idle');
    setError(null);
    setCourses([]);
  }, []);

  return {
    status,
    statusText: error || STATUS_TEXT[status],
    courses,
    error,
    currentUrl,
    setCurrentUrl,
    startImport,
    navigateTo,
    captureNow,
    cancel,
  };
}
