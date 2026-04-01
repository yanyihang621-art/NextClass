import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useCourses } from '../contexts/CourseContext';
import { useSettings } from '../contexts/SettingsContext';
import { getBeijingTime } from '../lib/timeUtils';

export default function Agenda() {
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { activeTimetable } = useSettings();
  const [currentDate, setCurrentDate] = useState(getBeijingTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(getBeijingTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const currentDay = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

  // Format date for display
  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = currentDate.toLocaleDateString('zh-CN', dateOptions);
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const formattedDayName = dayNames[currentDate.getDay()];

  // Get today's courses
  const todayCourses = useMemo(() => {
    if (!activeTimetable) return [];
    return courses
      .filter(c => (c.timetableId || '1') === activeTimetable.id && c.day === currentDay)
      .sort((a, b) => a.periodStart - b.periodStart);
  }, [courses, currentDay, activeTimetable]);

  // Helper to format time
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return { time: `${formattedHours.toString().padStart(2, '0')}:${minutes}`, ampm };
  };

  if (!activeTimetable) {
    return (
      <div className="text-on-surface min-h-screen pb-28 font-body bg-white flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-6">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">event_busy</span>
          <h2 className="text-xl font-bold text-slate-700 mb-2">当前无课表，去导入</h2>
          <p className="text-slate-500 mb-8">您还没有创建任何课表，或者所有课表已被删除。</p>
          <Link to="/settings" state={{ openCreateTimetable: true }} className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            去导入 / 创建课表
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="text-on-surface min-h-screen pb-28 font-body bg-white">
      <main className="pt-6 px-4 max-w-2xl mx-auto">
        <section className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                {currentDate.getFullYear()}-{String(currentDate.getMonth() + 1).padStart(2, '0')}-{String(currentDate.getDate()).padStart(2, '0')} {formattedDayName}
              </h2>
            </div>
            <div className="bg-primary-container px-3 py-1.5 rounded-dynamic">
              <span className="text-on-primary-container font-bold text-sm">今日 {todayCourses.length} 门课程</span>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {todayCourses.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center opacity-50">
              <span className="material-symbols-outlined text-6xl mb-4">sentiment_satisfied</span>
              <p className="text-lg font-bold">今天没有课程，好好休息吧！</p>
            </div>
          ) : (
            todayCourses.map((course, index) => {
              const periodInfo = activeTimetable.periods.find(p => p.id === course.periodStart);
              const { time, ampm } = periodInfo ? formatTime(periodInfo.start) : { time: '--:--', ampm: '' };

              return (
                <div key={course.id} className="flex gap-4 group cursor-pointer" onClick={() => navigate('/editor', { state: { isNew: false, courseData: { id: course.id, courseName: course.name, teacher: course.teacher || '', location: course.location, weeks: course.weeks || '1-16', day: course.day.toString(), periodStart: course.periodStart.toString(), periodEnd: course.periodEnd.toString(), color: course.color } } })}>
                  <div className="flex flex-col items-center py-2 w-14">
                    <span className="text-lg font-bold text-on-surface leading-none">{time}</span>
                    <span className="text-[10px] font-medium text-outline mt-1 uppercase">{ampm}</span>
                  </div>
                  <div className="flex-1 rounded-dynamic p-5 relative overflow-hidden flex gap-4 transition-all duration-300 hover:shadow-lg" style={{ backgroundColor: course.bg }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: course.color }}></div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-on-surface mb-1 leading-tight">{course.name}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-1.5 text-on-surface-variant text-sm">
                          <span className="material-symbols-outlined text-[18px]">location_on</span>
                          <span>{course.location}</span>
                        </div>
                        {course.teacher && (
                          <div className="flex items-center gap-1.5 text-on-surface-variant text-sm">
                            <span className="material-symbols-outlined text-[18px]">person</span>
                            <span>{course.teacher}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <Link to="/editor" state={{ isNew: true }} className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 hover:shadow-primary/40 z-50">
        <span className="material-symbols-outlined text-3xl">add</span>
      </Link>

      <BottomNav />
    </div>
  );
}
