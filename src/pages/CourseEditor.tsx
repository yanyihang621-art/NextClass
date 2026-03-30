import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCourses } from '../contexts/CourseContext';
import { useSettings } from '../contexts/SettingsContext';
import PickerModal from '../components/PickerModal';
import WeekSelectorModal from '../components/WeekSelectorModal';

export default function CourseEditor() {
  const navigate = useNavigate();
  const { addCourse, updateCourse, deleteCourse } = useCourses();
  const { activeTimetable } = useSettings();
  const locationState = useLocation().state as any;
  const initialData = locationState?.courseData || {};
  const isNew = locationState?.isNew ?? (!initialData.courseName);

  if (!activeTimetable) {
    return (
      <div className="text-on-surface min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">error</span>
        <h2 className="text-xl font-bold text-slate-700 mb-2">当前无课表，去导入</h2>
        <p className="text-slate-500 mb-8">当前没有可用的课表，请先创建一个课表。</p>
        <button onClick={() => navigate('/settings')} className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          去导入 / 创建课表
        </button>
      </div>
    );
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [courseName, setCourseName] = useState(initialData.courseName || '');
  const [teacher, setTeacher] = useState(initialData.teacher || '');
  const [location, setLocation] = useState(initialData.location || '');
  const [weeks, setWeeks] = useState(initialData.weeks || '1-16');
  const [day, setDay] = useState(initialData.day || '1');
  const [periodStart, setPeriodStart] = useState(initialData.periodStart || '1');
  const [periodEnd, setPeriodEnd] = useState(initialData.periodEnd || '2');

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);

  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);
  const [isWeekSelectorOpen, setIsWeekSelectorOpen] = useState(false);

  const dayOptions = [
    { label: '星期一', value: '1' },
    { label: '星期二', value: '2' },
    { label: '星期三', value: '3' },
    { label: '星期四', value: '4' },
    { label: '星期五', value: '5' },
    { label: '星期六', value: '6' },
    { label: '星期日', value: '7' },
  ];

  const periodOptions = activeTimetable.periods.map(p => ({
    label: `第 ${p.id} 节`,
    value: String(p.id)
  }));

  const handleSaveClick = () => {
    if (!courseName.trim()) {
      setShowValidationAlert(true);
      return;
    }
    setShowSaveConfirm(true);
  };

  const confirmSave = () => {
    const courseData = {
      id: isNew ? Date.now().toString() : initialData.id,
      timetableId: activeTimetable.id,
      name: courseName,
      teacher,
      location,
      weeks,
      day: parseInt(day, 10),
      periodStart: parseInt(periodStart, 10),
      periodEnd: parseInt(periodEnd, 10),
      color: initialData.color || '',
      bg: initialData.bg || ''
    };

    if (isNew) {
      addCourse(courseData);
    } else {
      updateCourse(courseData.id, courseData);
    }
    navigate(-1);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteCourse(initialData.id);
    navigate(-1);
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body pb-24">
      {/* Modals */}
      {showValidationAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-dynamic p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">提示</h3>
            <p className="text-slate-600 mb-6">请输入课程名称</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowValidationAlert(false)}
                className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-dynamic p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">保存修改</h3>
            <p className="text-slate-600 mb-6">是否保存对课程的修改？</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowSaveConfirm(false)}
                className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmSave}
                className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-dynamic p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-rose-600 mb-2">删除课程</h3>
            <p className="text-slate-600 mb-6">确定要删除这门课程吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="px-6 py-2 bg-rose-500 text-white rounded-full font-bold hover:bg-rose-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickers */}
      <PickerModal 
        isOpen={isDayPickerOpen} 
        onClose={() => setIsDayPickerOpen(false)} 
        title="选择星期" 
        options={dayOptions} 
        value={day} 
        onChange={(v) => setDay(String(v))} 
      />
      <PickerModal 
        isOpen={isStartPickerOpen} 
        onClose={() => setIsStartPickerOpen(false)} 
        title="开始节次" 
        options={periodOptions} 
        value={periodStart} 
        onChange={(v) => {
          setPeriodStart(String(v));
          if (parseInt(String(v), 10) > parseInt(periodEnd, 10)) {
            setPeriodEnd(String(v));
          }
        }} 
      />
      <PickerModal 
        isOpen={isEndPickerOpen} 
        onClose={() => setIsEndPickerOpen(false)} 
        title="结束节次" 
        options={periodOptions} 
        value={periodEnd} 
        onChange={(v) => {
          setPeriodEnd(String(v));
          if (parseInt(String(v), 10) < parseInt(periodStart, 10)) {
            setPeriodStart(String(v));
          }
        }} 
      />
      <WeekSelectorModal
        isOpen={isWeekSelectorOpen}
        onClose={() => setIsWeekSelectorOpen(false)}
        title="选择上课周数"
        value={weeks}
        onChange={(v) => setWeeks(v)}
        totalWeeks={activeTimetable.totalWeeks}
      />

      <header className="fixed top-0 w-full z-50 bg-glass shadow-sm px-4 py-3 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <span className="material-symbols-outlined text-slate-600">close</span>
        </button>
        <h1 className="font-bold text-lg">{isNew ? '新建课程' : '编辑课程'}</h1>
        <button onClick={handleSaveClick} className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-primary transition-colors">
          <span className="material-symbols-outlined">check</span>
        </button>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-dynamic p-4 shadow-sm border border-slate-100">
          <input 
            type="text" 
            placeholder="课程名称" 
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300"
          />
        </div>

        <div className="bg-white rounded-dynamic shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center p-4 border-b border-slate-50">
            <span className="material-symbols-outlined text-slate-400 mr-4">person</span>
            <input 
              type="text" 
              placeholder="授课教师" 
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className="w-full bg-transparent border-none outline-none placeholder:text-slate-300"
            />
          </div>
          <div className="flex items-center p-4">
            <span className="material-symbols-outlined text-slate-400 mr-4">location_on</span>
            <input 
              type="text" 
              placeholder="上课地点" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-transparent border-none outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="bg-white rounded-dynamic shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-50">
            <div className="flex items-center">
              <span className="material-symbols-outlined text-slate-400 mr-4">date_range</span>
              <span className="text-slate-700">周数</span>
            </div>
            <div 
              onClick={() => setIsWeekSelectorOpen(true)}
              className="text-primary font-medium cursor-pointer"
            >
              {weeks || '请选择周数'}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border-b border-slate-50">
            <div className="flex items-center">
              <span className="material-symbols-outlined text-slate-400 mr-4">today</span>
              <span className="text-slate-700">星期</span>
            </div>
            <div 
              onClick={() => setIsDayPickerOpen(true)}
              className="text-primary font-medium cursor-pointer"
            >
              {dayOptions.find(o => o.value === day)?.label || '星期一'}
            </div>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <span className="material-symbols-outlined text-slate-400 mr-4">schedule</span>
              <span className="text-slate-700">节次</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                onClick={() => setIsStartPickerOpen(true)}
                className="text-primary font-medium cursor-pointer"
              >
                第 {periodStart} 节
              </div>
              <span className="text-slate-300">-</span>
              <div 
                onClick={() => setIsEndPickerOpen(true)}
                className="text-primary font-medium cursor-pointer"
              >
                第 {periodEnd} 节
              </div>
            </div>
          </div>
        </div>
        
        {!isNew && (
          <button 
            onClick={handleDeleteClick}
            className="w-full py-4 rounded-dynamic bg-rose-50 text-rose-500 font-bold mt-8 hover:bg-rose-100 transition-colors"
          >
            删除课程
          </button>
        )}
      </main>
    </div>
  );
}
