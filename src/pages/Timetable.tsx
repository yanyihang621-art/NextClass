import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import BottomNav from '../components/BottomNav';
import { useSettings } from '../contexts/SettingsContext';
import { useCourses } from '../contexts/CourseContext';
import { getBeijingTime, calculateCurrentWeek } from '../lib/timeUtils';

export default function Timetable() {
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { activeTimetable } = useSettings();
  
  const [currentDate, setCurrentDate] = useState(getBeijingTime());
  const { semesterStart, currentWeek: initialWeek } = useMemo(() => 
    activeTimetable ? calculateCurrentWeek(currentDate, activeTimetable.startDate, activeTimetable.totalWeeks) : { semesterStart: new Date(), currentWeek: 1 }, 
  [currentDate, activeTimetable?.startDate, activeTimetable?.totalWeeks]);
  
  const [week, setWeek] = useState(initialWeek);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    setWeek(initialWeek);
  }, [initialWeek]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(getBeijingTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const weekDates = useMemo(() => {
    const startDay = semesterStart.getDay();
    const offsetToMondayStart = startDay === 0 ? 6 : startDay - 1;
    const startMonday = new Date(semesterStart);
    startMonday.setDate(semesterStart.getDate() - offsetToMondayStart);
    startMonday.setHours(0, 0, 0, 0);
    
    const selectedMonday = new Date(startMonday);
    selectedMonday.setDate(startMonday.getDate() + (week - 1) * 7);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedMonday);
      d.setDate(selectedMonday.getDate() + i);
      return d;
    });
  }, [semesterStart, week]);

  const currentMonth = weekDates[0].getMonth() + 1;

  const handlePrevWeek = () => {
    setDirection(-1);
    setWeek((prev) => Math.max(1, prev - 1));
  };

  const handleNextWeek = () => {
    setDirection(1);
    if (activeTimetable) {
      setWeek((prev) => Math.min(activeTimetable.totalWeeks, prev + 1));
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  const EmptySlot: React.FC<{ day: number, periodId: number }> = ({ day, periodId }) => (
    <div 
      onClick={() => navigate('/editor', { state: { isNew: true, courseData: { day: (day + 1).toString(), periodStart: periodId.toString(), periodEnd: periodId.toString() } } })} 
      className="bg-slate-50/50 rounded-dynamic m-[1px] cursor-pointer hover:bg-slate-100 transition-colors"
    ></div>
  );

  if (!activeTimetable) {
    return (
      <div className="text-on-surface min-h-screen font-body bg-white flex flex-col">
        <header className="fixed top-0 w-full z-50 bg-glass shadow-sm px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="font-black tracking-tight text-slate-900 text-lg">课表</h1>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-20">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">calendar_today</span>
          <h2 className="text-xl font-bold text-slate-700 mb-2">当前无课表，去导入</h2>
          <p className="text-slate-500 mb-8">您还没有创建任何课表，或者所有课表已被删除。</p>
          <Link to="/settings" className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            去导入 / 创建课表
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  const grid = Array.from({ length: activeTimetable.periods.length + 1 }, () => Array(7).fill(null));
  const currentCourses = courses.filter(c => (c.timetableId || '1') === activeTimetable.id);
  currentCourses.forEach(course => {
    const gridDay = course.day - 1;
    grid[course.periodStart][gridDay] = course;
    for (let p = course.periodStart + 1; p <= course.periodEnd; p++) {
      grid[p][gridDay] = 'spanned';
    }
  });

  return (
    <div className="text-on-surface selection:bg-primary-container min-h-screen font-body bg-white pb-28 overflow-x-hidden">
      <main className="pt-4 pb-16 px-2">
        <div className="flex justify-between items-center mb-2 px-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 -ml-1">
              <button onClick={handlePrevWeek} className="p-1 hover:bg-slate-100 rounded-full transition-colors active:scale-90">
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <span className="font-black tracking-tight text-slate-900 text-lg w-20 text-center">第 {week} 周</span>
              <button onClick={handleNextWeek} className="p-1 hover:bg-slate-100 rounded-full transition-colors active:scale-90">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant font-medium text-[10px] pl-1">
              <span>{currentDate.getFullYear()}/{String(currentDate.getMonth() + 1).padStart(2, '0')}/{String(currentDate.getDate()).padStart(2, '0')}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className={week === initialWeek ? "text-primary" : "text-slate-400"}>
                {week === initialWeek ? "本周" : "非本周"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/editor" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-600">add</span>
            </Link>
          </div>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={week}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="grid grid-cols-[2.5rem_repeat(7,1fr)] gap-1 md:gap-2"
          >
            {/* Header Spacer */}
            <div className="flex flex-col items-center justify-end pb-1" style={{ gridColumn: 1 }}>
              <span className="text-[10px] font-bold text-slate-400">{currentMonth}月</span>
            </div>
            
            {/* Days Header */}
            {weekDates.map((d, i) => {
              const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
              const isWeekend = i === 5 || i === 6;
              const isToday = d.getFullYear() === currentDate.getFullYear() && 
                              d.getMonth() === currentDate.getMonth() && 
                              d.getDate() === currentDate.getDate();
              
              return (
                <div key={i} className="text-center pb-1 flex flex-col items-center">
                  <p className={`text-[10px] font-bold uppercase ${isWeekend ? 'text-rose-500' : 'text-slate-400'}`}>{dayNames[i]}</p>
                  <div className={`w-7 h-7 mt-0.5 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white shadow-sm' : ''}`}>
                    <p className={`text-base font-black ${isWeekend && !isToday ? 'text-rose-500' : ''}`}>{d.getDate()}</p>
                  </div>
                </div>
              );
            })}

            {activeTimetable.periods.map(period => (
              <React.Fragment key={`period-${period.id}`}>
                <div className="flex flex-col items-center justify-center" style={{ height: 'var(--cell-height, 4.5rem)', gridColumn: 1 }}>
                  <span className="text-[11px] font-black leading-none">{period.id}</span>
                  <span className="text-[8px] text-slate-400 font-bold mt-1">{period.start}</span>
                  <span className="text-[8px] text-slate-400 font-bold">{period.end}</span>
                </div>
                {[0, 1, 2, 3, 4, 5, 6].map(day => {
                  const cell = grid[period.id][day];
                  if (cell === 'spanned') return null;
                  if (cell) {
                    const span = cell.periodEnd - cell.periodStart + 1;
                    return (
                      <div 
                        key={`course-${period.id}-${day}`} 
                        className="relative"
                        style={{ gridRow: span > 1 ? `span ${span} / span ${span}` : undefined }}
                      >
                        <div onClick={() => navigate('/editor', { state: { isNew: false, courseData: { id: cell.id, courseName: cell.name, teacher: cell.teacher || '', location: cell.location, weeks: cell.weeks || '1-16', day: cell.day.toString(), periodStart: cell.periodStart.toString(), periodEnd: cell.periodEnd.toString(), color: cell.color } } })} className="absolute inset-[1px] rounded-dynamic p-1.5 border-l-[3px] flex flex-col overflow-hidden active:scale-95 transition-all cursor-pointer hover:brightness-95" style={{ backgroundColor: cell.bg, borderColor: cell.color, opacity: 'var(--glass-opacity)' }}>
                          <h3 className="text-[10px] font-bold text-slate-800 leading-tight">{cell.name}</h3>
                          <p className="text-[8px] text-slate-500 mt-0.5 leading-none">{cell.location}</p>
                          <p className="text-[8px] text-slate-400 mt-0.5 leading-none">{cell.teacher}</p>
                        </div>
                      </div>
                    );
                  }
                  return <EmptySlot key={`empty-${period.id}-${day}`} day={day} periodId={period.id} />;
                })}
              </React.Fragment>
            ))}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Background Decoration */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/3 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary-container/10 rounded-full blur-[60px]"></div>
      </div>

      <BottomNav />
    </div>
  );
}
