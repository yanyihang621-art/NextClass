import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCourses } from '../contexts/CourseContext';
import { useSettings } from '../contexts/SettingsContext';
import PickerModal from '../components/PickerModal';
import WeekSelectorModal from '../components/WeekSelectorModal';

interface TimeSlot {
  id: string;
  teacher: string;
  location: string;
  weeks: string;
  day: string;
  periodStart: string;
  periodEnd: string;
}

export default function CourseEditor() {
  const navigate = useNavigate();
  const { courses, addCourse, updateCourse, deleteCourse } = useCourses();
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
        <button onClick={() => navigate('/settings', { state: { openCreateTimetable: true } })} className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          去导入 / 创建课表
        </button>
      </div>
    );
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [courseName, setCourseName] = useState(initialData.courseName || '');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Track original sibling courses to know which ones to delete
  const [originalSlotIds, setOriginalSlotIds] = useState<string[]>([]);

  useEffect(() => {
    // Determine sibling courses
    if (!isNew && courseName) {
      const siblingCourses = courses.filter(c => c.name === initialData.courseName && (c.timetableId || '1') === activeTimetable.id);
      if (siblingCourses.length > 0) {
        setTimeSlots(siblingCourses.map(c => ({
          id: c.id,
          weeks: c.weeks || '1-16',
          day: String(c.day),
          periodStart: String(c.periodStart),
          periodEnd: String(c.periodEnd),
          teacher: c.teacher || '',
          location: c.location || ''
        })));
        setOriginalSlotIds(siblingCourses.map(c => c.id));
      } else {
        // Fallback
        setTimeSlots([{
          id: initialData.id,
          weeks: initialData.weeks || '1-16',
          day: initialData.day || '1',
          periodStart: initialData.periodStart || '1',
          periodEnd: initialData.periodEnd || '2',
          teacher: initialData.teacher || '',
          location: initialData.location || ''
        }]);
        setOriginalSlotIds([initialData.id]);
      }
    } else {
      setTimeSlots([{
        id: `temp_${Date.now()}`,
        weeks: initialData.weeks || '1-16',
        day: initialData.day || '1',
        periodStart: initialData.periodStart || '1',
        periodEnd: initialData.periodEnd || '2',
        teacher: '',
        location: ''
      }]);
    }
    // Only run on init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);

  // Modal active states
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
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
    const finalSlotIds = timeSlots.map(s => s.id);
    const slotsToDelete = originalSlotIds.filter(id => !finalSlotIds.includes(id));
    
    slotsToDelete.forEach(id => deleteCourse(id));

    timeSlots.forEach(slot => {
      const courseData = {
        id: slot.id.startsWith('temp_') ? Date.now().toString() + Math.random().toString(36).substring(2, 6) : slot.id,
        timetableId: activeTimetable.id,
        name: courseName.trim(),
        teacher: slot.teacher,
        location: slot.location,
        weeks: slot.weeks,
        day: parseInt(slot.day, 10),
        periodStart: parseInt(slot.periodStart, 10),
        periodEnd: parseInt(slot.periodEnd, 10),
        color: initialData.color || '',
        bg: initialData.bg || ''
      };

      if (!slot.id.startsWith('temp_') && originalSlotIds.includes(slot.id)) {
        updateCourse(slot.id, courseData);
      } else {
        addCourse(courseData);
      }
    });

    navigate(-1);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    originalSlotIds.forEach(id => deleteCourse(id));
    navigate(-1);
  };

  const activeSlot = activeSlotId ? timeSlots.find(s => s.id === activeSlotId) : null;

  const updateSlot = (id: string, updates: Partial<TimeSlot>) => {
    setTimeSlots(prev => prev.map(slot => slot.id === id ? { ...slot, ...updates } : slot));
  };

  const handleDayChange = (v: string | number) => {
    if (activeSlotId) updateSlot(activeSlotId, { day: String(v) });
  };
  const handleStartChange = (v: string | number) => {
    if (activeSlotId && activeSlot) {
      updateSlot(activeSlotId, { 
        periodStart: String(v), 
        periodEnd: parseInt(String(v), 10) > parseInt(activeSlot.periodEnd, 10) ? String(v) : activeSlot.periodEnd 
      });
    }
  };
  const handleEndChange = (v: string | number) => {
    if (activeSlotId && activeSlot) {
      updateSlot(activeSlotId, { 
        periodEnd: String(v), 
        periodStart: parseInt(String(v), 10) < parseInt(activeSlot.periodStart, 10) ? String(v) : activeSlot.periodStart 
      });
    }
  };
  const handleWeeksChange = (v: string) => {
    if (activeSlotId) updateSlot(activeSlotId, { weeks: v });
  };

  const handleAddSlot = () => {
    const defaultData = timeSlots.length > 0 ? timeSlots[0] : null;
    setTimeSlots(prev => [...prev, {
      id: `temp_${Date.now()}`,
      weeks: defaultData ? defaultData.weeks : (initialData.weeks || '1-16'),
      day: defaultData ? defaultData.day : (initialData.day || '1'),
      periodStart: defaultData ? defaultData.periodStart : (initialData.periodStart || '1'),
      periodEnd: defaultData ? defaultData.periodEnd : (initialData.periodEnd || '2'),
      teacher: defaultData ? defaultData.teacher : '',
      location: defaultData ? defaultData.location : ''
    }]);
    
    // Scroll to bottom after adding slot, delay slightly to allow render
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleRemoveSlot = (id: string) => {
    if (timeSlots.length <= 1) return;
    setTimeSlots(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body pb-32">
      {/* Pickers */}
      <PickerModal
        isOpen={isDayPickerOpen}
        onClose={() => setIsDayPickerOpen(false)}
        title="选择星期"
        options={dayOptions}
        value={activeSlot?.day || '1'}
        onChange={handleDayChange}
      />
      <PickerModal
        isOpen={isStartPickerOpen}
        onClose={() => setIsStartPickerOpen(false)}
        title="开始节次"
        options={periodOptions}
        value={activeSlot?.periodStart || '1'}
        onChange={handleStartChange}
      />
      <PickerModal
        isOpen={isEndPickerOpen}
        onClose={() => setIsEndPickerOpen(false)}
        title="结束节次"
        options={periodOptions}
        value={activeSlot?.periodEnd || '2'}
        onChange={handleEndChange}
      />
      <WeekSelectorModal
        isOpen={isWeekSelectorOpen}
        onClose={() => setIsWeekSelectorOpen(false)}
        title="选择上课周数"
        value={activeSlot?.weeks || '1-16'}
        onChange={handleWeeksChange}
        totalWeeks={activeTimetable.totalWeeks}
      />

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
            <p className="text-slate-600 mb-6">是否保存对这门课程的所有修改？</p>
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
            <p className="text-slate-600 mb-6">确定要删除这门课程及其所有时间段吗？此操作不可恢复。</p>
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

      <header className="fixed top-0 w-full z-40 bg-glass shadow-sm px-4 py-3 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <span className="material-symbols-outlined text-slate-600">close</span>
        </button>
        <h1 className="font-bold text-lg">{isNew ? '新建课程' : '编辑课程'}</h1>
        <button onClick={handleSaveClick} className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-primary transition-colors">
          <span className="material-symbols-outlined">check</span>
        </button>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-dynamic p-4 shadow-sm border border-slate-100 relative">
          <input
            type="text"
            placeholder="课程名称"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 pr-10"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg text-sm tooltip">sell</span>
          </div>
        </div>

        {timeSlots.map((slot, index) => (
          <div key={slot.id} className="bg-white rounded-dynamic shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 bg-slate-50/50">
               <span className="text-xs font-bold text-slate-500 tracking-wider">时间段 {index + 1}</span>
               {timeSlots.length > 1 && (
                 <button onClick={() => handleRemoveSlot(slot.id)} className="p-1 -mr-2 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                    <span className="material-symbols-outlined text-lg block">close</span>
                 </button>
               )}
            </div>

            <div className="flex items-center justify-between p-4 border-b border-slate-50">
              <div className="flex items-center">
                <span className="material-symbols-outlined text-slate-400 mr-4 text-[20px]">date_range</span>
                <span className="text-slate-700">周数</span>
              </div>
              <div
                onClick={() => { setActiveSlotId(slot.id); setIsWeekSelectorOpen(true); }}
                className="text-primary font-medium cursor-pointer"
              >
                第 {slot.weeks || '1-16'} 周
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-b border-slate-50">
              <div className="flex items-center">
                <span className="material-symbols-outlined text-slate-400 mr-4 text-[20px]">today</span>
                <span className="text-slate-700">时间</span>
              </div>
              <div className="flex items-center gap-4 text-primary font-medium">
                  <div className="cursor-pointer" onClick={() => { setActiveSlotId(slot.id); setIsDayPickerOpen(true); }}>
                      {dayOptions.find(o => o.value === slot.day)?.label.replace('星期', '周') || '周一'}
                  </div>
                  <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => { setActiveSlotId(slot.id); setIsStartPickerOpen(true); }}>
                      第 {slot.periodStart}-{slot.periodEnd} 节
                  </div>
              </div>
            </div>

            <div className="flex items-center p-4 border-b border-slate-50">
              <span className="material-symbols-outlined text-slate-400 mr-4 text-[20px]">person</span>
              <input
                type="text"
                placeholder="授课教师"
                value={slot.teacher}
                onChange={(e) => updateSlot(slot.id, { teacher: e.target.value })}
                className="w-full bg-transparent border-none outline-none placeholder:text-slate-300 font-medium"
              />
            </div>
            
            <div className="flex items-center p-4">
              <span className="material-symbols-outlined text-slate-400 mr-4 text-[20px]">door_open</span>
              <input
                type="text"
                placeholder="上课地点"
                value={slot.location}
                onChange={(e) => updateSlot(slot.id, { location: e.target.value })}
                className="w-full bg-transparent border-none outline-none placeholder:text-slate-300 font-medium"
              />
            </div>
          </div>
        ))}

        {!isNew && originalSlotIds.length > 0 && (
          <button
            onClick={handleDeleteClick}
            className="w-full py-4 rounded-dynamic bg-rose-50 text-rose-500 font-bold mt-8 hover:bg-rose-100 transition-colors"
          >
            删除全部课程
          </button>
        )}
      </main>

      {/* Floating Add Slot Button */}
      <button 
        onClick={handleAddSlot}
        className="fixed bottom-8 right-6 w-14 h-14 bg-primary-container text-on-primary-container rounded-2xl shadow-xl shadow-primary-container/40 flex items-center justify-center transition-transform active:scale-95 hover:bg-[#d6c7ff] z-40 border border-[#d6c7ff]/50"
      >
        <span className="material-symbols-outlined text-3xl font-light">add</span>
      </button>

    </div>
  );
}
