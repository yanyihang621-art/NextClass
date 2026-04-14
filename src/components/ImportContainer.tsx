import React, { useState, useCallback, useEffect } from 'react';
import type { School } from '../data/schools';
import { useAutoImport } from '../hooks/useAutoImport';
import type { ParsedCourse } from '../lib/parseSchedule';

interface ImportContainerProps {
  school: School;
  onBack: () => void;
  onStartParsing: (html: string, systemType: string) => void;
  /** 新增：直接接收解析好的课程数组（来自自动导入） */
  onCoursesImported?: (courses: ParsedCourse[]) => void;
}

/**
 * 运行环境检测
 * 如果是 Capacitor/Cordova 环境，isNativeApp 为 true
 */
const isNativeApp = typeof (window as any).Capacitor !== 'undefined';

export default function ImportContainer({ school, onBack, onStartParsing, onCoursesImported }: ImportContainerProps) {
  const [htmlSource, setHtmlSource] = useState('');
  const [error, setError] = useState('');

  // ── 自动导入 Hook ──
  const {
    status, statusText, courses,
    error: autoError,
    currentUrl, setCurrentUrl,
    startImport, navigateTo, captureNow, cancel,
  } = useAutoImport();

  // ── 初始化地址栏 URL（优先读取 localStorage 缓存）──
  useEffect(() => {
    if (isNativeApp) {
      // 尝试从 localStorage 读取缓存 URL
      const cacheKey = `CUSTOM_EAS_URL:${school.id}`;
      const cached = localStorage.getItem(cacheKey);
      setCurrentUrl(cached || school.login_url);
    }
  }, [school.id, school.login_url, setCurrentUrl]);

  const handleParse = useCallback(() => {
    setError('');
    if (!htmlSource.trim()) {
      setError('请先粘贴课表页面的 HTML 源码');
      return;
    }
    onStartParsing(htmlSource, school.system_type);
  }, [htmlSource, school.system_type, onStartParsing]);

  // ── 启动自动导入 ──
  const handleStartAutoImport = useCallback(async () => {
    await startImport(currentUrl || school.login_url, school.system_type, school.id);
  }, [school, currentUrl, startImport]);

  // ── 地址栏确认按钮：根据状态执行不同操作 ──
  const handleUrlConfirm = useCallback(async () => {
    const url = currentUrl.trim();
    if (!url) return;

    if (status === 'browsing') {
      // 浏览器已打开 → 动态导航到新 URL
      await navigateTo(url);
    } else {
      // 浏览器未打开 → 用地址栏的 URL 启动导入
      await startImport(url, school.system_type, school.id);
    }
  }, [currentUrl, status, navigateTo, startImport, school]);

  // ── 地址栏回车 ──
  const handleUrlKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUrlConfirm();
    }
  }, [handleUrlConfirm]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#F7F7F9] animate-in slide-in-from-right duration-300">

      {/* ═══════════════════════════════════════════════════
          Header — 根据环境分别渲染
          ═══════════════════════════════════════════════════ */}
      {isNativeApp ? (
        /* ── Native App：药丸形地址栏 Header ── */
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 bg-[#F7F7F9] sticky top-0 z-10"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          {/* 返回按钮 */}
          <button
            onClick={() => { cancel(); onBack(); }}
            className="p-2 -ml-1 rounded-full hover:bg-slate-200 active:bg-slate-300 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-slate-700 text-[22px]">arrow_back_ios_new</span>
          </button>

          {/* 药丸形地址栏 */}
          <div className="flex-1 min-w-0 flex items-center bg-[#E8EDF2] rounded-2xl pl-3.5 pr-1 py-1.5 gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 leading-tight mb-0.5 select-none">在此输入教务网址</p>
              <input
                type="url"
                value={currentUrl}
                onChange={e => setCurrentUrl(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                placeholder="https://jwgl.example.edu.cn"
                className="w-full bg-transparent text-[13px] text-slate-700 font-medium leading-tight outline-none border-none p-0 placeholder:text-slate-300 truncate"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* 确认/前往按钮 */}
            <button
              onClick={handleUrlConfirm}
              disabled={!currentUrl.trim()}
              className="w-8 h-8 rounded-xl bg-primary/10 hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-primary text-lg">check</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── Web 调试环境：原有标题栏 ── */
        <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F7F9] sticky top-0 z-10"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <button onClick={() => { cancel(); onBack(); }} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors">
            <span className="material-symbols-outlined text-slate-800">arrow_back_ios_new</span>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate">{school.name}</h3>
            <p className="text-[11px] text-slate-400 truncate">{school.login_url}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {isNativeApp ? (
          /* ══════════════════════════════════════════
             App 环境：InAppBrowser 自动抓取
             ══════════════════════════════════════════ */
          <div className="flex flex-col gap-4 pt-2">
            {/* 状态卡片 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  status === 'error' ? 'bg-red-50' :
                  status === 'success' ? 'bg-green-50' : 'bg-primary/10'
                }`}>
                  <span className={`material-symbols-outlined text-xl ${
                    status === 'error' ? 'text-red-500' :
                    status === 'success' ? 'text-green-500' : 'text-primary'
                  }`}>
                    {status === 'idle' ? 'school' :
                     status === 'browsing' ? 'open_in_browser' :
                     status === 'extracting' ? 'sync' :
                     status === 'success' ? 'check_circle' : 'error'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    {status === 'idle' ? '一键导入' :
                     status === 'browsing' ? '浏览器已打开' :
                     status === 'extracting' ? '正在提取…' :
                     status === 'success' ? `成功导入 ${courses.length} 门课程` :
                     '导入失败'}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                    {statusText}
                  </p>
                </div>
              </div>
            </div>

            {/* 操作步骤说明 */}
            {(status === 'idle' || status === 'error') && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h4 className="text-sm font-bold text-slate-700 mb-3">使用步骤</h4>
                <div className="space-y-2.5">
                  <Step num={1} text="确认上方地址栏中的教务系统网址，点击 ✓ 打开浏览器" />
                  <Step num={2} text="在弹出的浏览器中登录你的教务账号" />
                  <Step num={3} text="导航到「学生课表」或「个人课表」页面" />
                  <Step num={4} text="等待课表完全加载后，返回本页点击「抓取课表」" />
                </div>

                {/* 错误恢复提示 */}
                {status === 'error' && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="material-symbols-outlined text-amber-600 text-sm">lightbulb</span>
                      <span className="text-xs font-bold text-amber-800">网页打不开？</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      请尝试在上方地址栏中修改为正确的教务系统网址，然后点击 ✓ 重新加载。
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 浏览时显示提示 */}
            {status === 'browsing' && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-amber-600 text-lg">tips_and_updates</span>
                  <span className="text-sm font-bold text-amber-800">提示</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  请在弹出的浏览器中完成登录，并进入课表页面。
                  确保课表数据已完全加载显示后，返回此页点击「抓取课表」按钮。
                </p>
                <div className="mt-3 p-2.5 bg-white/60 rounded-lg border border-amber-100/60">
                  <p className="text-[11px] text-amber-600 leading-relaxed">
                    💡 如果页面加载失败，可在上方地址栏修改网址后点击 ✓ 重新跳转。
                  </p>
                </div>
              </div>
            )}

            {/* 成功后显示课程预览 */}
            {status === 'success' && courses.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
                <h4 className="text-sm font-bold text-slate-700 mb-3">
                  已解析 {courses.length} 门课程
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {courses.slice(0, 10).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        周{c.day} 第{c.periodStart}节
                      </span>
                      <span className="text-sm text-slate-700 font-medium truncate">{c.name}</span>
                    </div>
                  ))}
                  {courses.length > 10 && (
                    <p className="text-xs text-slate-400 text-center pt-1">
                      还有 {courses.length - 10} 门课程...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ══════════════════════════════════════════
             Web 调试环境：手动粘贴源码
             ══════════════════════════════════════════ */
          <div className="flex flex-col gap-4 pt-2">
            {/* Info card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-amber-500 text-xl">info</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Web 调试模式</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    当前处于 Web 调试模式，无法跨域抓取教务系统页面。请按以下步骤操作：
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5 pl-[52px]">
                <Step num={1} text={<>在浏览器中打开 <a href={school.login_url} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline break-all">{school.login_url}</a></>} />
                <Step num={2} text="登录你的教务系统账号" />
                <Step num={3} text="进入「学生课表」或「个人课表」页面" />
                <Step num={4} text={<>按 <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Ctrl+U</kbd> 或右键「查看网页源代码」</>} />
                <Step num={5} text="全选并复制所有源码，粘贴到下方" />
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-500 pl-1">HTML 源码</span>
                {htmlSource.length > 0 && (
                  <span className="text-[11px] text-slate-300 pr-1">{(htmlSource.length / 1024).toFixed(1)} KB</span>
                )}
              </label>
              <textarea
                value={htmlSource}
                onChange={e => { setHtmlSource(e.target.value); setError(''); }}
                placeholder="在此粘贴课表页面的 HTML 源码..."
                rows={12}
                className="w-full bg-white border border-slate-200 rounded-xl p-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-xs text-slate-700 placeholder:text-slate-300 font-mono leading-relaxed resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm py-3 px-4 rounded-xl border border-red-100">
                <span className="material-symbols-outlined text-lg">error</span>
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom fixed button */}
      <div className="sticky bottom-0 px-4 py-4 bg-gradient-to-t from-[#F7F7F9] via-[#F7F7F9] to-transparent pt-8"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {isNativeApp ? (
          // ── App 环境按钮 ──
          status === 'idle' || status === 'error' ? (
            <button
              onClick={handleStartAutoImport}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">open_in_browser</span>
              打开教务系统
            </button>
          ) : status === 'browsing' ? (
            <button
              onClick={captureNow}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 animate-pulse"
            >
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
              抓取课表
            </button>
          ) : status === 'extracting' ? (
            <button disabled className="w-full py-3.5 bg-slate-300 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 cursor-not-allowed">
              <span className="material-symbols-outlined text-xl animate-spin">sync</span>
              正在抓取…
            </button>
          ) : status === 'success' ? (
            <button
              onClick={() => {
                if (onCoursesImported && courses.length > 0) {
                  onCoursesImported(courses);
                }
              }}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">check</span>
              确认导入 {courses.length} 门课程
            </button>
          ) : null
        ) : (
          // ── Web 环境按钮 ──
          <button
            onClick={handleParse}
            disabled={!htmlSource.trim()}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
            一键解析课表
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ num, text }: { num: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {num}
      </span>
      <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
    </div>
  );
}
