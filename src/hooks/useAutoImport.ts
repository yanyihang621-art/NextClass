/**
 * useAutoImport.ts
 *
 * InAppBrowser 教务系统课表自动抓取 Hook
 *
 * 核心流程：
 *   1. openWebView → 加载教务系统登录页
 *   2. 用户在浏览器中登录 & 导航到课表页
 *   3. 用户点击 WebView 内注入的悬浮「抓取课表」按钮
 *   4. 注入脚本抓取 outerHTML → 通过 mobileApp.postMessage 传回原生层
 *   5. 原生层接收 HTML → 关闭浏览器 → 交给 smartParseSchedule 解析
 *
 * 数据回传策略：
 *   通过 @capgo/inappbrowser 的 postMessage 原生通信桥直接传递 HTML 字符串，
 *   完全不依赖剪贴板，兼容 HTTP 非安全环境。
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

// ─── 注入脚本：抓取 HTML 并通过 postMessage 发回 ─────────────────────────

/**
 * 注入到 WebView 中的抓取脚本。
 * 抓取完整的 document.documentElement.outerHTML，
 * 然后通过 window.mobileApp.postMessage 发送回原生层。
 * 不使用剪贴板，兼容 HTTP 环境。
 */
const CAPTURE_SCRIPT = `
(function() {
  try {
    var html = document.documentElement.outerHTML;
    if (!html || html.length < 100) {
      window.mobileApp.postMessage({
        action: 'captureError',
        error: '页面内容为空或过短，请确保页面已完全加载'
      });
      return;
    }
    window.mobileApp.postMessage({
      action: 'htmlCaptured',
      html: html
    });
  } catch(e) {
    window.mobileApp.postMessage({
      action: 'captureError',
      error: e.message || '未知错误'
    });
  }
})();
`;

// ─── FAB 注入脚本 ────────────────────────────────────────────────────────

/**
 * 注入到 WebView 中的悬浮按钮脚本。
 * 点击按钮时直接执行 CAPTURE_SCRIPT 的逻辑（抓取 HTML + postMessage）。
 * 使用 Shadow DOM 隔离样式，挂载到 documentElement 避免受 body transform 影响。
 */
const FAB_INJECT_SCRIPT = `
(function() {
  // 移除旧按钮（如果存在）
  var old = document.getElementById('nextclass-fab-root');
  if (old) old.remove();

  // 创建一个顶层容器，挂在 documentElement 上而非 body
  var root = document.createElement('div');
  root.id = 'nextclass-fab-root';
  // 采用 0x0 锚点绝对定位方案，随视觉视口移动，彻底解决固定定位移动或组件消失的问题
  root.style.cssText = 'position:absolute!important; z-index:2147483647!important; pointer-events:none!important; width:0!important; height:0!important; overflow:visible!important;';
  
  var updatePosition = function() {
    var vpX = window.visualViewport ? window.visualViewport.pageLeft : window.scrollX || document.documentElement.scrollLeft || 0;
    var vpY = window.visualViewport ? window.visualViewport.pageTop : window.scrollY || document.documentElement.scrollTop || 0;
    var vpW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    var vpH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    
    root.style.left = (vpX + vpW) + 'px';
    root.style.top = (vpY + vpH) + 'px';
  };

  var ticking = false;
  var requestUpdate = function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        updatePosition();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', requestUpdate, {passive: true});
  window.addEventListener('resize', requestUpdate, {passive: true});
  if (window.visualViewport) {
    window.visualViewport.addEventListener('scroll', requestUpdate);
    window.visualViewport.addEventListener('resize', requestUpdate);
  }
  
  // 初始定位与兜底刷新
  updatePosition();
  setInterval(updatePosition, 500);

  // 使用 Shadow DOM 隔离样式，避免被页面 CSS 覆盖
  var shadow = root.attachShadow({ mode: 'closed' });
  var style = document.createElement('style');
  style.textContent = \`
    .nc-fab {
      position: absolute;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #22c55e, #059669);
      color: white;
      font-weight: 700;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border: none;
      border-radius: 50px;
      padding: 14px 22px;
      box-shadow: 0 8px 24px rgba(5, 150, 105, 0.4);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      line-height: 1;
      pointer-events: auto;
      white-space: nowrap;
    }
    .nc-fab:active { transform: scale(0.93); box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
    .nc-icon { font-size: 20px; line-height: 1; }
  \`;
  shadow.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'nc-fab';
  btn.innerHTML = '<span class="nc-icon">✨</span>抓取课表';
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    btn.innerHTML = '<span class="nc-icon">⏳</span>抓取中...';
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';

    // 直接抓取 HTML 并通过原生桥发回（不经过剪贴板）
    try {
      var html = document.documentElement.outerHTML;
      if (!html || html.length < 100) {
        window.mobileApp.postMessage({
          action: 'captureError',
          error: '页面内容为空或过短，请确保页面已完全加载'
        });
        // 恢复按钮状态
        btn.innerHTML = '<span class="nc-icon">✨</span>抓取课表';
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
        return;
      }
      window.mobileApp.postMessage({
        action: 'htmlCaptured',
        html: html
      });
    } catch(err) {
      window.mobileApp.postMessage({
        action: 'captureError',
        error: err.message || '未知错误'
      });
      btn.innerHTML = '<span class="nc-icon">✨</span>抓取课表';
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    }
  }, true);
  shadow.appendChild(btn);

  // 挂到 documentElement 确保不受 body 的 transform/overflow 影响
  document.documentElement.appendChild(root);
})();
`;

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

  // ── 处理 WebView 传回的 HTML（核心解析逻辑） ────────────────────────

  const handleHtmlCaptured = useCallback(async (rawHtml: string) => {
    setStatus('extracting');
    setError(null);

    try {
      // 关闭内置浏览器
      try { await InAppBrowser.close(); } catch { /* already closed */ }

      if (!rawHtml || rawHtml.length < 100 || !/<[a-z]/i.test(rawHtml)) {
        throw new Error('未能读取到页面内容，请确保已进入课表查询页。');
      }

      // 解析（使用自动识别模式）
      const parsed = smartParseSchedule(rawHtml, 'auto');

      if (parsed.length === 0) {
        throw new Error(
          '页面中未发现课表数据。\n\n' +
          '可能原因：\n' +
          '• 课表尚未完全加载（AJAX 动态内容需等待几秒）\n' +
          '• 当前页面不是课表页面\n' +
          '• 该教务系统的格式暂不支持自动解析'
        );
      }

      // 成功 → 持久化当前有效 URL
      saveEffectiveUrl(schoolIdRef.current, activeUrlRef.current);

      setCourses(parsed);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  // ── 手动触发抓取（注入脚本方式，不依赖剪贴板） ──────────────────────

  const captureNow = useCallback(async () => {
    setStatus('extracting');
    setError(null);

    try {
      // 注入脚本 → 抓取 HTML 并通过 postMessage 发回
      // 数据将通过 messageFromWebview 事件接收并由 handleHtmlCaptured 处理
      await InAppBrowser.executeScript({ code: CAPTURE_SCRIPT });
    } catch (err) {
      setError(`注入脚本失败: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
    }
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
        // 允许 WebView 内部导航（点击链接不跳外部浏览器）
        activeNativeNavigationForWebview: true,
        preventDeeplink: true,
        // 导航工具栏（含前进/后退按钮）
        toolbarType: 'navigation' as any,
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

      // 每次页面加载完成后注入悬浮抓取按钮
      await InAppBrowser.addListener('browserPageLoaded', () => {
        InAppBrowser.executeScript({ code: FAB_INJECT_SCRIPT });
      });

      // 接收 WebView 通过 postMessage 发回的消息
      await InAppBrowser.addListener('messageFromWebview', (event: any) => {
        // @capgo/inappbrowser 的消息格式可能嵌套在不同层级
        const msg = event?.detail || event;
        const action = msg?.action || msg?.message?.action || msg?.detail?.action;

        if (action === 'htmlCaptured') {
          // 收到抓取的 HTML → 解析
          const html = msg?.html || msg?.message?.html || msg?.detail?.html || '';
          handleHtmlCaptured(html);
        } else if (action === 'captureNow') {
          // 兼容：如果仍收到 captureNow 动作，注入抓取脚本
          captureNow();
        } else if (action === 'captureError') {
          // 抓取出错
          const errMsg = msg?.error || msg?.message?.error || msg?.detail?.error || '未知错误';
          setError(`抓取失败: ${errMsg}`);
          setStatus('error');
        }
      });
    } catch (err) {
      setError(`无法打开浏览器: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
    }
  }, [currentUrl, captureNow, handleHtmlCaptured]);

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
          activeNativeNavigationForWebview: true,
          preventDeeplink: true,
          toolbarType: 'navigation' as any,
        });
        setStatus('browsing');
      } catch (e2) {
        setError(`无法打开浏览器: ${e2 instanceof Error ? e2.message : String(e2)}`);
        setStatus('error');
      }
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
