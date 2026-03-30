import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useSettings, defaultPeriods } from '../contexts/SettingsContext';
import { useCourses } from '../contexts/CourseContext';
import { cn } from '../components/BottomNav';
import PickerModal from '../components/PickerModal';
import DatePickerModal from '../components/DatePickerModal';
import TimePickerModal from '../components/TimePickerModal';
import { getBeijingTime } from '../lib/timeUtils';

export default function Settings() {
  const navigate = useNavigate();
  const { 
    themeColor, setThemeColor, 
    transparency, setTransparency, 
    cornerRadius, setCornerRadius, 
    cellHeight, setCellHeight,
    timetables, setTimetables
  } = useSettings();
  const { deleteCoursesByTimetable } = useCourses();

  const colors = [
    { id: 'purple', class: 'bg-[#6d23f9]' },
    { id: 'blue', class: 'bg-blue-500' },
    { id: 'emerald', class: 'bg-emerald-500' },
    { id: 'rose', class: 'bg-rose-500' },
    { id: 'amber', class: 'bg-amber-500' },
    { id: 'indigo', class: 'bg-indigo-500' },
  ] as const;

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [isTimetableManageOpen, setIsTimetableManageOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editTotalWeeks, setEditTotalWeeks] = useState(20);
  const [editPeriods, setEditPeriods] = useState(defaultPeriods);

  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
  const [initialPersonalization, setInitialPersonalization] = useState<any>(null);

  const handleOpenPersonalization = () => {
    setInitialPersonalization({ themeColor, cornerRadius, cellHeight, transparency });
    setIsPersonalizationOpen(true);
  };

  const handleCancelPersonalization = () => {
    if (initialPersonalization) {
      setThemeColor(initialPersonalization.themeColor);
      setCornerRadius(initialPersonalization.cornerRadius);
      setCellHeight(initialPersonalization.cellHeight);
      setTransparency(initialPersonalization.transparency);
    }
    setIsPersonalizationOpen(false);
  };

  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isTotalWeeksPickerOpen, setIsTotalWeeksPickerOpen] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState<{index: number, type: 'start' | 'end'} | null>(null);

  const addMinutes = (time: string, mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const totalMins = h * 60 + m + mins;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const totalWeeksOptions = Array.from({ length: 50 }, (_, i) => ({
    label: `${i + 1} 周`,
    value: i + 1
  }));

  const handleEditSave = () => {
    if (editingTableId && editName.trim()) {
      if (editingTableId === 'new') {
        setTimetables([...timetables, { 
          id: Date.now().toString(), 
          name: editName, 
          term: '', 
          active: timetables.length === 0, 
          startDate: editStartDate || '2024-09-01', 
          totalWeeks: editTotalWeeks, 
          periods: editPeriods 
        }]);
      } else {
        setTimetables(timetables.map(t => t.id === editingTableId ? { 
          ...t, 
          name: editName,
          startDate: editStartDate,
          totalWeeks: editTotalWeeks,
          periods: editPeriods
        } : t));
      }
      setEditingTableId(null);
    }
  };

  const handleSetActive = (id: string) => {
    setTimetables(timetables.map(t => ({ ...t, active: t.id === id })));
  };

  const handleDeleteTimetable = (id: string) => {
    const newTimetables = timetables.filter(t => t.id !== id);
    if (newTimetables.length > 0 && timetables.find(t => t.id === id)?.active) {
      newTimetables[0].active = true;
    }
    setTimetables(newTimetables);
    deleteCoursesByTimetable(id);
    setEditingTableId(null);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-[#F7F7F9] text-on-surface min-h-screen pb-28 font-body">
      <main className="pt-12 px-4 max-w-2xl mx-auto">
        {/* User Profile Section */}
        <section className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-4 border-2 border-white shadow-sm">
            <span className="material-symbols-outlined text-5xl text-slate-800">person</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">未登录</h2>
          <div className="flex items-center text-sm text-slate-500">
            <span>学校/年级</span>
            <span className="material-symbols-outlined text-sm ml-0.5">chevron_right</span>
          </div>
        </section>

        {/* Promotional Banner Placeholder */}
        <section className="mb-6">
          <div className="h-20 bg-slate-100/50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
            空白占位符
          </div>
        </section>

        {/* Menu Group 1 */}
        <section className="mb-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            onClick={() => setIsTimetableManageOpen(true)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left border-b border-slate-50"
          >
            <span className="text-[16px] text-slate-800">课表管理</span>
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
          <button 
            onClick={handleOpenPersonalization}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left"
          >
            <span className="text-[16px] text-slate-800">个性化设置</span>
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
        </section>

        {/* Menu Group 2 */}
        <section className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left border-b border-slate-50"
          >
            <span className="text-[16px] text-slate-800">常见问题</span>
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
          <button 
            onClick={() => navigate('/nextclass')}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left"
          >
            <span className="text-[16px] text-slate-800">更多</span>
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
        </section>
      </main>

      {/* Timetable Management Modal */}
      {isTimetableManageOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#F7F7F9] animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 bg-[#F7F7F9] sticky top-0 z-10">
            <button onClick={() => setIsTimetableManageOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined text-slate-800">arrow_back_ios_new</span>
            </button>
            <h3 className="text-lg font-bold">课表管理</h3>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28">
            <div className="grid grid-cols-1 gap-4">
              {timetables.map(t => (
                <div key={t.id} className={cn("group relative p-5 rounded-2xl border transition-all text-left bg-white shadow-sm", t.active ? "border-primary/30 ring-1 ring-primary/10" : "border-transparent hover:border-primary/20")}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleSetActive(t.id)}>
                      {t.active && <p className="text-sm font-bold text-primary mb-1">当前学期</p>}
                      <div className="flex items-center gap-2">
                        <h4 className={cn("text-2xl font-bold", !t.active && "text-on-surface-variant opacity-80")}>{t.name}</h4>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingTableId(t.id); 
                            setEditName(t.name); 
                            setEditStartDate(t.startDate || '');
                            setEditTotalWeeks(t.totalWeeks || 20);
                            setEditPeriods(t.periods || defaultPeriods);
                          }}
                          className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-primary transition-colors flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      </div>
                      {t.term && <p className={cn("text-sm mt-1", t.active ? "text-on-surface-variant opacity-60" : "text-on-surface-variant opacity-50")}>{t.term}</p>}
                    </div>
                    {t.active ? (
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-white fill">check_circle</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={() => handleSetActive(t.id)}>
                         <span className="material-symbols-outlined text-on-surface-variant opacity-40">arrow_forward_ios</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => {
                  const now = getBeijingTime();
                  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  setEditingTableId('new');
                  setEditName('');
                  setEditStartDate(defaultDate);
                  setEditTotalWeeks(20);
                  setEditPeriods(defaultPeriods);
                }}
                className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-primary/50 hover:text-primary transition-colors bg-white shadow-sm"
              >
                <span className="material-symbols-outlined">add</span>
                <span className="font-bold">新建课表</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Timetable Modal */}
      {editingTableId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-dynamic w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <button onClick={() => setEditingTableId(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-slate-600">close</span>
              </button>
              <h3 className="font-bold text-lg">{editingTableId === 'new' ? '新建课表' : '编辑课表'}</h3>
              <button onClick={handleEditSave} className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-primary transition-colors">
                <span className="material-symbols-outlined">check</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">课表名称</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-slate-100 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">第一周第一天 (开学日期)</label>
                <div 
                  onClick={() => setIsStartDatePickerOpen(true)}
                  className="w-full bg-slate-100 border-none rounded-xl p-3 outline-none text-slate-700 cursor-pointer"
                >
                  {editStartDate || '请选择日期'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">学期周数</label>
                <div 
                  onClick={() => setIsTotalWeeksPickerOpen(true)}
                  className="w-full bg-slate-100 border-none rounded-xl p-3 outline-none text-slate-700 cursor-pointer"
                >
                  {editTotalWeeks} 周
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">上课时间表</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {editPeriods.map((period, index) => (
                    <div key={period.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="w-12 text-center font-bold text-slate-400 text-sm">第{period.id}节</span>
                      <div 
                        onClick={() => setActiveTimePicker({ index, type: 'start' })}
                        className="flex-1 bg-white border border-slate-200 rounded-md p-1.5 text-sm outline-none text-center cursor-pointer hover:border-primary"
                      >
                        {period.start}
                      </div>
                      <span className="text-slate-400">-</span>
                      <div 
                        onClick={() => setActiveTimePicker({ index, type: 'end' })}
                        className="flex-1 bg-white border border-slate-200 rounded-md p-1.5 text-sm outline-none text-center cursor-pointer hover:border-primary"
                      >
                        {period.end}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 justify-between items-center mt-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const lastPeriod = editPeriods[editPeriods.length - 1];
                        const newId = lastPeriod ? lastPeriod.id + 1 : 1;
                        const newStart = lastPeriod ? lastPeriod.end : '08:00';
                        const newEnd = addMinutes(newStart, 45);
                        setEditPeriods([...editPeriods, { id: newId, start: newStart, end: newEnd }]);
                      }}
                      className="text-sm text-primary font-bold flex items-center gap-1 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      新增时间
                    </button>
                    <button 
                      onClick={() => setEditPeriods(defaultPeriods)}
                      className="text-sm text-amber-500 font-bold flex items-center gap-1 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      恢复默认
                    </button>
                  </div>
                  {editPeriods.length > 1 && (
                    <button 
                      onClick={() => {
                        setEditPeriods(editPeriods.slice(0, -1));
                      }}
                      className="text-sm text-rose-500 font-bold flex items-center gap-1 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                      删除最后一节
                    </button>
                  )}
                </div>
              </div>
              
              {editingTableId !== 'new' && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-4 rounded-xl font-bold bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">delete</span>
                    删除课表
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-dynamic p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-rose-600 mb-2">删除课表</h3>
            <p className="text-slate-600 mb-6">确定要删除这个课表吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => handleDeleteTimetable(editingTableId!)}
                className="px-6 py-2 bg-rose-500 text-white rounded-full font-bold hover:bg-rose-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickers for Settings */}
      <DatePickerModal
        isOpen={isStartDatePickerOpen}
        onClose={() => setIsStartDatePickerOpen(false)}
        title="选择开学日期"
        value={editStartDate}
        onChange={(v) => setEditStartDate(v)}
      />

      <PickerModal
        isOpen={isTotalWeeksPickerOpen}
        onClose={() => setIsTotalWeeksPickerOpen(false)}
        title="选择学期周数"
        options={totalWeeksOptions}
        value={editTotalWeeks}
        onChange={(v) => setEditTotalWeeks(Number(v))}
      />

      <TimePickerModal
        isOpen={activeTimePicker !== null}
        onClose={() => setActiveTimePicker(null)}
        title={activeTimePicker?.type === 'start' ? '选择开始时间' : '选择结束时间'}
        value={activeTimePicker ? editPeriods[activeTimePicker.index][activeTimePicker.type] : '08:00'}
        onChange={(v) => {
          if (activeTimePicker) {
            const newPeriods = [...editPeriods];
            newPeriods[activeTimePicker.index][activeTimePicker.type] = v;
            setEditPeriods(newPeriods);
          }
        }}
      />

      {/* Personalization Modal */}
      {isPersonalizationOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#F7F7F9] animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 bg-[#F7F7F9] sticky top-0 z-10">
            <button onClick={handleCancelPersonalization} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined text-slate-800">arrow_back_ios_new</span>
            </button>
            <h3 className="text-lg font-bold">个性化设置</h3>
            <button onClick={() => setIsPersonalizationOpen(false)} className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-primary transition-colors flex items-center justify-center w-10 h-10">
              <span className="material-symbols-outlined">check</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28 space-y-4">
            <div className="p-5 rounded-2xl bg-white shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <label className="font-bold text-[16px] text-slate-800">圆角/方角</label>
                <span className="text-primary font-bold px-3 py-1 bg-primary/10 rounded-full text-sm">{cornerRadius}px</span>
              </div>
              <input 
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary" 
                max="48" min="0" type="range" 
                value={cornerRadius}
                onChange={(e) => setCornerRadius(Number(e.target.value))}
              />
              <div className="flex justify-between mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>方角</span>
                <span>圆角</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <label className="font-bold text-[16px] text-slate-800">课程长度</label>
                <span className="text-primary font-bold px-3 py-1 bg-primary/10 rounded-full text-sm">{cellHeight}px</span>
              </div>
              <input 
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary" 
                max="120" min="40" type="range" 
                value={cellHeight}
                onChange={(e) => setCellHeight(Number(e.target.value))}
              />
              <div className="flex justify-between mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>紧凑</span>
                <span>宽松</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <label className="font-bold text-[16px] text-slate-800">透明度</label>
                <span className="text-primary font-bold px-3 py-1 bg-primary/10 rounded-full text-sm">{transparency}%</span>
              </div>
              <input 
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary" 
                max="100" min="0" type="range" 
                value={transparency}
                onChange={(e) => setTransparency(Number(e.target.value))}
              />
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-sm">
              <div className="mb-4">
                <label className="font-bold text-[16px] text-slate-800 block mb-4">主题颜色</label>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {colors.map((c) => (
                    <button 
                      key={c.id}
                      onClick={() => setThemeColor(c.id as any)}
                      className={cn(
                        "w-12 h-12 rounded-full flex-shrink-0 border-4 border-white transition-all",
                        c.class,
                        themeColor === c.id ? "shadow-md ring-2 ring-primary scale-110" : "shadow-sm hover:scale-105"
                      )}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
