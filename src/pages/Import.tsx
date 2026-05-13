import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import SchoolSelector from '../components/SchoolSelector';
import ImportContainer from '../components/ImportContainer';
import { useSettings } from '../contexts/SettingsContext';
import { smartParseSchedule } from '../lib/parseSchedule';
import type { ParsedCourse } from '../lib/parseSchedule';
import type { School } from '../data/schools';

// ─── 课程配色方案（柔和色） ──────────────────────────────────────────────────

const IMPORT_COLORS = [
  '#6d23f9', // 紫色
  '#2196F3', // 蓝色
  '#4CAF50', // 绿色
  '#FF9800', // 橙色
  '#E91E63', // 粉色
  '#00BCD4', // 青色
];

// ─── 视图状态 ──────────────────────────────────────────────────────────────

type ImportView = 'home' | 'school-selector' | 'import-container';

/** 导入后确认对话框的操作类型 */
type ImportAction = 'overwrite' | 'create-new' | 'cancel';

export default function Import() {
  const navigate = useNavigate();
  const { activeTimetable } = useSettings();

  const [view, setView] = useState<ImportView>('home');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [parseResult, setParseResult] = useState<{ count: number; error?: string } | null>(null);

  // ── 导入确认对话框 ──
  const [pendingCourses, setPendingCourses] = useState<ParsedCourse[] | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ── 选择学校 ──
  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setView('import-container');
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 核心：将 ParsedCourse[] 通过 router state 传递给 CourseEditor
  // ═══════════════════════════════════════════════════════════════════════

  /** 跳转到编辑器页面，让用户预览/编辑后再保存 */
  const navigateToEditor = useCallback((parsed: ParsedCourse[], mode: 'overwrite' | 'create-new') => {
    navigate('/editor', {
      state: {
        importedCourses: parsed,
        importMode: mode,
        autoTitle: '导入的课表',
      },
    });
  }, [navigate]);

  // ── 处理确认对话框的选择 ──
  const handleConfirmAction = useCallback((action: ImportAction) => {
    setShowConfirmDialog(false);
    if (action === 'cancel' || !pendingCourses) {
      setPendingCourses(null);
      return;
    }
    // 将数据带到编辑器页面
    navigateToEditor(pendingCourses, action);
    setPendingCourses(null);
  }, [pendingCourses, navigateToEditor]);

  // ═══════════════════════════════════════════════════════════════════════
  // 解析回调
  // ═══════════════════════════════════════════════════════════════════════

  /** 手动粘贴 HTML 解析（Web 环境） */
  const handleStartParsing = (html: string, systemType: string) => {
    console.log('[Import] Start parsing', { systemType, htmlLength: html.length });
    setParseResult(null);

    try {
      const parsed = smartParseSchedule(html, systemType);

      if (parsed.length === 0) {
        setParseResult({
          count: 0,
          error: '未解析到课程数据。请确保已在教务系统中加载课表后，复制完整的页面 HTML。\n\n提示：正方系统 V9.0 的课表通过 AJAX 动态加载，直接 "查看源代码" 中不含课表数据。请改为在开发者工具(F12) 中选择课表表格元素并复制其 outerHTML。',
        });
        return;
      }

      // 显示确认对话框
      setPendingCourses(parsed);
      setShowConfirmDialog(true);
    } catch (err) {
      console.error('[Import] Parse error:', err);
      setParseResult({ count: 0, error: `解析出错：${err instanceof Error ? err.message : String(err)}` });
    }
  };

  /** 自动导入回调（InAppBrowser 返回已解析课程数组） */
  const handleCoursesImported = useCallback((parsed: ParsedCourse[]) => {
    // 显示确认对话框，让用户选择覆盖/新建
    setPendingCourses(parsed);
    setShowConfirmDialog(true);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // 渲染
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="app-page bg-[#F7F7F9] text-on-surface font-body">
      <main className="app-content pt-6 px-4 pb-4 max-w-2xl mx-auto">

        {/* ═══════════════════════════════════════════
            Section 1: 教务系统导入（选择学校）
            ═══════════════════════════════════════════ */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">school</span>
            <h3 className="text-xl font-bold font-headline">教务系统导入</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setView('school-selector')}
              className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
                <h4 className="text-xl font-bold">选择学校</h4>
              </div>
              <p className="text-on-surface-variant text-sm opacity-80 pl-16">支持全国 1000+ 所高校教务系统一键导入</p>
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            Section 2: 文件导入
            ═══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
            <h3 className="text-xl font-bold font-headline">文件导入</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">table_chart</span>
              </div>
              <h4 className="text-lg font-bold mb-1">Excel 课表</h4>
              <p className="text-on-surface-variant text-xs opacity-70">支持 .xls, .xlsx 格式</p>
            </button>

            <button className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">description</span>
              </div>
              <h4 className="text-lg font-bold mb-1">PDF 课表</h4>
              <p className="text-on-surface-variant text-xs opacity-70">智能识别 PDF 课表内容</p>
            </button>

            <button className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">ICS 日历文件</h4>
                  <p className="text-on-surface-variant text-xs opacity-70">导入标准日历格式文件</p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />

      {/* ═══════════════════════════════════════════
          School Selector overlay
          ═══════════════════════════════════════════ */}
      {view === 'school-selector' && (
        <SchoolSelector
          onSelect={handleSelectSchool}
          onBack={() => setView('home')}
        />
      )}

      {/* ═══════════════════════════════════════════
          Import Container overlay
          ═══════════════════════════════════════════ */}
      {view === 'import-container' && selectedSchool && (
        <ImportContainer
          school={selectedSchool}
          onBack={() => setView('school-selector')}
          onStartParsing={handleStartParsing}
          onCoursesImported={handleCoursesImported}
        />
      )}

      {/* ═══════════════════════════════════════════
          导入确认对话框（覆盖 / 新建 / 取消）
          ═══════════════════════════════════════════ */}
      {showConfirmDialog && pendingCourses && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="mx-6 p-6 rounded-2xl shadow-2xl max-w-sm w-full bg-white border border-slate-100">
            <div className="flex flex-col items-center text-center gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary">check_circle</span>
              </div>

              {/* Title */}
              <h4 className="text-lg font-bold text-slate-800">
                已解析 {pendingCourses.length} 门课程
              </h4>
              <p className="text-sm text-slate-500">请选择导入方式</p>

              {/* Course preview */}
              {pendingCourses.length > 0 && (
                <div className="w-full bg-slate-50 rounded-xl p-3 max-h-32 overflow-y-auto text-left">
                  {pendingCourses.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: IMPORT_COLORS[i % IMPORT_COLORS.length] }}
                      />
                      <span className="text-xs text-slate-600 truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">
                        周{c.day} {c.periodStart}-{c.periodEnd}节
                      </span>
                    </div>
                  ))}
                  {pendingCourses.length > 5 && (
                    <p className="text-[10px] text-slate-400 text-center pt-1">
                      还有 {pendingCourses.length - 5} 门课程...
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="w-full space-y-2.5 pt-2">
                {/* 覆盖当前课表 */}
                <button
                  onClick={() => handleConfirmAction('overwrite')}
                  disabled={!activeTimetable}
                  className="w-full py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">sync_alt</span>
                  覆盖当前课表
                  {activeTimetable && (
                    <span className="text-xs font-normal opacity-80">（{activeTimetable.name}）</span>
                  )}
                </button>

                {/* 新建课表 */}
                <button
                  onClick={() => handleConfirmAction('create-new')}
                  className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">add_circle</span>
                  新建课表
                </button>

                {/* 取消 */}
                <button
                  onClick={() => handleConfirmAction('cancel')}
                  className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 active:scale-[0.98] transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Parse Result Toast
          ═══════════════════════════════════════════ */}
      {parseResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`mx-6 p-6 rounded-2xl shadow-2xl max-w-sm w-full ${parseResult.error ? 'bg-white border border-red-100' : 'bg-white border border-green-100'}`}>
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${parseResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                <span className={`material-symbols-outlined text-3xl ${parseResult.error ? 'text-red-500' : 'text-green-500'}`}>
                  {parseResult.error ? 'error' : 'check_circle'}
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-800">
                {parseResult.error ? '解析失败' : `成功导入 ${parseResult.count} 门课程`}
              </h4>
              {parseResult.error && (
                <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{parseResult.error}</p>
              )}
              {!parseResult.error && (
                <p className="text-sm text-slate-400">即将跳转到课表页面...</p>
              )}
              {parseResult.error && (
                <button
                  onClick={() => setParseResult(null)}
                  className="mt-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors"
                >
                  知道了
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
