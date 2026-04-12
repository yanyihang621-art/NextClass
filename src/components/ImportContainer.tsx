import { useState, useCallback } from 'react';
import type { School } from '../data/schools';

interface ImportContainerProps {
  school: School;
  onBack: () => void;
  onStartParsing: (html: string, systemType: string) => void;
}

/**
 * 运行环境检测
 * 如果是 Capacitor/Cordova 环境，isNativeApp 为 true
 */
const isNativeApp = typeof (window as any).Capacitor !== 'undefined';

export default function ImportContainer({ school, onBack, onStartParsing }: ImportContainerProps) {
  const [htmlSource, setHtmlSource] = useState('');
  const [error, setError] = useState('');

  const handleParse = useCallback(() => {
    setError('');
    if (!htmlSource.trim()) {
      setError('请先粘贴课表页面的 HTML 源码');
      return;
    }
    onStartParsing(htmlSource, school.system_type);
  }, [htmlSource, school.system_type, onStartParsing]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#F7F7F9] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F7F9] sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors">
          <span className="material-symbols-outlined text-slate-800">arrow_back_ios_new</span>
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold truncate">{school.name}</h3>
          <p className="text-[11px] text-slate-400 truncate">{school.login_url}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {isNativeApp ? (
          /* ══════════════════════════════════════════
             App 生产环境：原生 WebView
             ══════════════════════════════════════════ */
          <div className="flex flex-col items-center justify-center h-full text-center">
            {/*
             * TODO: Capacitor InAppBrowser 集成位置
             *
             * 在此处调用 Capacitor 的 InAppBrowser 或原生 WebView 插件，
             * 打开 school.login_url，供用户登录教务系统。
             *
             * 示例用法:
             * import { Browser } from '@capacitor/browser';
             * await Browser.open({ url: school.login_url });
             *
             * 或者使用自定义 Capacitor 插件创建嵌入式 WebView，
             * 在用户登录后主动抓取课表页面的 HTML，
             * 然后调用 onStartParsing(capturedHtml, school.system_type)
             */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">open_in_browser</span>
            </div>
            <p className="text-slate-600 font-medium mb-2">即将打开教务系统</p>
            <p className="text-sm text-slate-400">{school.login_url}</p>
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
      {!isNativeApp && (
        <div className="sticky bottom-0 px-4 py-4 bg-gradient-to-t from-[#F7F7F9] via-[#F7F7F9] to-transparent pt-8">
          <button
            onClick={handleParse}
            disabled={!htmlSource.trim()}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
            一键解析课表
          </button>
        </div>
      )}
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
