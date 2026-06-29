import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../shared/lib/utils';
import { getBeijingTime } from '../../lib/timeUtils';
import { defaultPeriods } from '../../shared/constants/defaults';
import type { TimetableConfig } from '../../shared/types/timetable';

interface TimetableManagerProps {
  isOpen: boolean;
  onClose: () => void;
  timetables: TimetableConfig[];
  handleSetActive: (id: string) => void;
  setEditingTableId: (id: string | null) => void;
  setEditName: (val: string) => void;
  setEditStartDate: (val: string) => void;
  setEditTotalWeeks: (val: number) => void;
  setEditPeriods: (val: any) => void;
}

export default function TimetableManager({
  isOpen,
  onClose,
  timetables,
  handleSetActive,
  setEditingTableId,
  setEditName,
  setEditStartDate,
  setEditTotalWeeks,
  setEditPeriods,
}: TimetableManagerProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[90] flex flex-col bg-[#F7F7F9]"
    >
      <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] bg-[#F7F7F9] sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
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
    </motion.div>
  );
}
