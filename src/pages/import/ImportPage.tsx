import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import BottomNav from '../../components/BottomNav';
import SchoolSelector from '../../components/SchoolSelector';
import ImportContainer from '../../components/ImportContainer';
import { useTimetable } from '../../contexts/TimetableContext';
import { useCourses } from '../../contexts/CourseContext';
import { smartParseSchedule } from '../../lib/parseSchedule';
import type { ParsedCourse } from '../../lib/parseSchedule';
import type { School } from '../../data/schools';
import { generateId } from '../../shared/lib/id';
import ImportConfirmDialog from './ImportConfirmDialog';

type ImportView = 'home' | 'school-selector' | 'import-container';
type ImportAction = 'overwrite' | 'create-new' | 'cancel';

export default function ImportPage() {
  const navigate = useNavigate();
  const { activeTimetable } = useTimetable();
  const { addCourse, deleteCoursesByTimetable } = useCourses();

  const [view, setView] = useState<ImportView>('home');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [parseResult, setParseResult] = useState<{ count: number; error?: string } | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // ── 导入确认对话框 ──
  const [pendingCourses, setPendingCourses] = useState<ParsedCourse[] | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ── 选择学校 ──
  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setView('import-container');
  };

  // ── 处理确认对话框的选择 ──
  const handleConfirmAction = useCallback((action: ImportAction) => {
    setShowConfirmDialog(false);
    if (action === 'cancel' || !pendingCourses) {
      setPendingCourses(null);
      return;
    }
    
    if (action === 'create-new') {
      navigate('/settings', { 
        state: { 
          openCreateTimetable: true, 
          pendingImport: pendingCourses 
        } 
      });
    } else if (action === 'overwrite') {
      if (!activeTimetable) {
        alert('当前没有激活的课表');
        return;
      }
      // 直接覆盖当前课表数据
      deleteCoursesByTimetable(activeTimetable.id);
      pendingCourses.forEach(c => {
        addCourse({
          id: generateId(),
          timetableId: activeTimetable.id,
          name: c.name,
          teacher: c.teacher || '',
          location: c.location,
          weeks: c.weeks || '1-16',
          day: c.day,
          periodStart: c.periodStart,
          periodEnd: c.periodEnd,
          color: '',
          bg: ''
        });
      });
      // 成功后直接跳转到课表页面
      navigate('/timetable', { replace: true });
    }
    setPendingCourses(null);
  }, [pendingCourses, activeTimetable, addCourse, deleteCoursesByTimetable, navigate]);

  /** 手动粘贴 HTML 解析（Web 环境） */
  const handleStartParsing = (html: string, systemType: string) => {
    console.log('[Import] Start parsing', { systemType, htmlLength: html.length });
    setParseResult(null);
    setIsParsing(true);

    setTimeout(() => {
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
      } finally {
        setIsParsing(false);
      }
    }, 500);
  };

  /** 自动导入回调 */
  const handleCoursesImported = useCallback((parsed: ParsedCourse[]) => {
    setPendingCourses(parsed);
    setShowConfirmDialog(true);
  }, []);

  return (
    <div className="app-page bg-[#F7F7F9] text-on-surface font-body">
      <main className="app-content pt-[max(env(safe-area-inset-top),_1.5rem)] px-4 pb-4 max-w-2xl mx-auto">
        {/* Section 1: 教务系统导入（选择学校） */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">school</span>
            <h3 className="text-xl font-bold font-headline">教务系统导入</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setView('school-selector')}
              className="group relative p-6 rounded-dynamic bg-white border border-outline-variant/15 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left overflow-hidden animate-in fade-in duration-200"
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

        {/* Section 2: 文件导入 */}
        <section className="animate-in fade-in duration-300">
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
                  <p className="text-on-surface-variant text-xs opacity-70">导入标准日历格式 file</p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />

      {/* School Selector overlay */}
      <AnimatePresence>
        {view === 'school-selector' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-surface"
          >
            <SchoolSelector
              onSelect={handleSelectSchool}
              onBack={() => setView('home')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Container overlay */}
      <AnimatePresence>
        {view === 'import-container' && selectedSchool && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-surface"
          >
            <ImportContainer
              school={selectedSchool}
              onBack={() => setView('school-selector')}
              onStartParsing={handleStartParsing}
              onCoursesImported={handleCoursesImported}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 导入确认对话框（覆盖 / 新建 / 取消） */}
      <AnimatePresence>
        <ImportConfirmDialog
          isOpen={showConfirmDialog}
          pendingCourses={pendingCourses}
          activeTimetable={activeTimetable}
          onAction={handleConfirmAction}
        />
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isParsing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-600 animate-pulse">正在解析课表数据...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parse Result Toast */}
      <AnimatePresence>
        {parseResult && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`mx-6 p-6 rounded-2xl shadow-2xl max-w-sm w-full bg-white border ${parseResult.error ? 'border-red-100' : 'border-green-100'}`}
            >
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
