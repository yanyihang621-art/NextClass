import React from 'react';
import { motion } from 'motion/react';
import { COURSE_COLORS } from '../../shared/constants/colors';
import type { ParsedCourse } from '../../lib/parseSchedule';
import type { TimetableConfig } from '../../shared/types/timetable';

interface ImportConfirmDialogProps {
  isOpen: boolean;
  pendingCourses: ParsedCourse[] | null;
  activeTimetable: TimetableConfig | null;
  onAction: (action: 'overwrite' | 'create-new' | 'cancel') => void;
}

export default function ImportConfirmDialog({
  isOpen,
  pendingCourses,
  activeTimetable,
  onAction,
}: ImportConfirmDialogProps) {
  if (!isOpen || !pendingCourses) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="mx-6 p-6 rounded-2xl shadow-2xl max-w-sm w-full bg-white border border-slate-100"
      >
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
                    style={{ backgroundColor: COURSE_COLORS[i % COURSE_COLORS.length] }}
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
              onClick={() => onAction('overwrite')}
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
              onClick={() => onAction('create-new')}
              className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              新建课表
            </button>

            {/* 取消 */}
            <button
              onClick={() => onAction('cancel')}
              className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 active:scale-[0.98] transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
