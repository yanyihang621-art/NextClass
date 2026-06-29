import React from 'react';
import { motion } from 'motion/react';
import { defaultPeriods } from '../../shared/constants/defaults';
import type { Period } from '../../shared/types/timetable';

interface TimetableEditorProps {
  editingTableId: string;
  closeEditModal: () => void;
  handleEditSave: () => void;
  editName: string;
  setEditName: (val: string) => void;
  editStartDate: string;
  setEditStartDate: (val: string) => void;
  editTotalWeeks: number;
  editPeriods: Period[];
  setEditPeriods: (val: Period[]) => void;
  setIsStartDatePickerOpen: (val: boolean) => void;
  setIsTotalWeeksPickerOpen: (val: boolean) => void;
  setActiveTimePicker: (val: { index: number; type: 'start' | 'end' } | null) => void;
  addMinutes: (time: string, mins: number) => string;
  setShowDeleteConfirm: (val: boolean) => void;
}

export default function TimetableEditor({
  editingTableId,
  closeEditModal,
  handleEditSave,
  editName,
  setEditName,
  editStartDate,
  editTotalWeeks,
  editPeriods,
  setEditPeriods,
  setIsStartDatePickerOpen,
  setIsTotalWeeksPickerOpen,
  setActiveTimePicker,
  addMinutes,
  setShowDeleteConfirm,
}: TimetableEditorProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white rounded-dynamic w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <button onClick={closeEditModal} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-600">close</span>
          </button>
          <h3 className="font-bold text-lg">{editingTableId === 'new' ? '新建课表' : '编辑课表'}</h3>
          <button onClick={handleEditSave} className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-primary transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">check</span>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">课表名称</label>
            <input 
              type="text" 
              value={editName} 
              onChange={e => setEditName(e.target.value)} 
              className="w-full bg-slate-100 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary text-slate-800" 
            />
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
                    className="flex-1 bg-white border border-slate-200 rounded-md p-1.5 text-sm outline-none text-center cursor-pointer hover:border-primary text-slate-700"
                  >
                    {period.start}
                  </div>
                  <span className="text-slate-400">-</span>
                  <div
                    onClick={() => setActiveTimePicker({ index, type: 'end' })}
                    className="flex-1 bg-white border border-slate-200 rounded-md p-1.5 text-sm outline-none text-center cursor-pointer hover:border-primary text-slate-700"
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
                  className="text-sm text-primary font-bold flex items-center gap-1 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
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
                  className="text-sm text-primary font-bold flex items-center gap-1 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
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
                className="w-full py-4 rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary/15 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">delete</span>
                删除课表
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
