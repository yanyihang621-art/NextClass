import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import SchoolSelector from '../components/SchoolSelector';
import ImportContainer from '../components/ImportContainer';
import { useCourses } from '../contexts/CourseContext';
import { useSettings } from '../contexts/SettingsContext';
import { smartParseSchedule } from '../lib/parseSchedule';
import type { ParsedCourse } from '../lib/parseSchedule';
import type { School } from '../data/schools';
import type { Course } from '../contexts/CourseContext';

type ImportView = 'home' | 'school-selector' | 'import-container';

export default function Import() {
  const navigate = useNavigate();
  const { addCourse } = useCourses();
  const { activeTimetable } = useSettings();
  const [view, setView] = useState<ImportView>('home');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [parseResult, setParseResult] = useState<{ count: number; error?: string } | null>(null);

  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setView('import-container');
  };

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

      // 将 ParsedCourse 转换为 Course 并批量添加
      for (const pc of parsed) {
        const course: Course = {
          id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          timetableId: activeTimetable?.id,
          name: pc.name,
          teacher: pc.teacher,
          location: pc.location,
          weeks: pc.weeks,
          day: pc.day,
          periodStart: pc.periodStart,
          periodEnd: pc.periodEnd,
          color: '',
          bg: '',
        };
        addCourse(course);
      }

      setParseResult({ count: parsed.length });
      // 短暂延迟后跳转到课表页
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      console.error('[Import] Parse error:', err);
      setParseResult({ count: 0, error: `解析出错：${err instanceof Error ? err.message : String(err)}` });
    }
  };

  /** 处理自动导入（InAppBrowser）返回的已解析课程数组 */
  const handleCoursesImported = useCallback((parsed: ParsedCourse[]) => {
    for (const pc of parsed) {
      const course: Course = {
        id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timetableId: activeTimetable?.id,
        name: pc.name,
        teacher: pc.teacher,
        location: pc.location,
        weeks: pc.weeks,
        day: pc.day,
        periodStart: pc.periodStart,
        periodEnd: pc.periodEnd,
        color: '',
        bg: '',
      };
      addCourse(course);
    }
    setParseResult({ count: parsed.length });
    setTimeout(() => navigate('/'), 1500);
  }, [activeTimetable, addCourse, navigate]);

  return (
    <div className="app-page bg-[#F7F7F9] text-on-surface font-body">
      <main className="app-content pt-6 px-4 pb-4 max-w-2xl mx-auto">
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

      {/* School Selector overlay */}
      {view === 'school-selector' && (
        <SchoolSelector
          onSelect={handleSelectSchool}
          onBack={() => setView('home')}
        />
      )}

      {/* Parse Result Toast */}
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

      {/* Import Container overlay */}
      {view === 'import-container' && selectedSchool && (
        <ImportContainer
          school={selectedSchool}
          onBack={() => setView('school-selector')}
          onStartParsing={handleStartParsing}
          onCoursesImported={handleCoursesImported}
        />
      )}
    </div>
  );
}
