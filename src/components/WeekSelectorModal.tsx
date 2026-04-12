import React, { useState, useEffect } from 'react';
import { cn } from './BottomNav';

interface WeekSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string; // e.g. "1-18" or "1,3,5" or "1-8,10-18"
  onChange: (value: string) => void;
  totalWeeks?: number;
}

export default function WeekSelectorModal({ isOpen, onClose, title, value, onChange, totalWeeks = 20 }: WeekSelectorModalProps) {
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const newSelected = new Set<number>();
      if (value) {
        const parts = value.split(',');
        parts.forEach(part => {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = start; i <= end; i++) {
                newSelected.add(i);
              }
            }
          } else {
            const num = Number(part);
            if (!isNaN(num)) {
              newSelected.add(num);
            }
          }
        });
      }
      setSelectedWeeks(newSelected);
    }
  }, [value, isOpen]);

  if (!isOpen) return null;

  const toggleWeek = (week: number) => {
    const next = new Set(selectedWeeks);
    if (next.has(week)) {
      next.delete(week);
    } else {
      next.add(week);
    }
    setSelectedWeeks(next);
  };

  const handleConfirm = () => {
    // Format the selected weeks into a string like "1-18" or "1,3,5"
    const sorted = Array.from<number>(selectedWeeks).sort((a, b) => a - b);
    if (sorted.length === 0) {
      onChange('');
      onClose();
      return;
    }

    const parts: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) {
          parts.push(`${start}`);
        } else {
          parts.push(`${start}-${end}`);
        }
        start = sorted[i];
        end = sorted[i];
      }
    }
    
    if (start === end) {
      parts.push(`${start}`);
    } else {
      parts.push(`${start}-${end}`);
    }

    onChange(parts.join(','));
    onClose();
  };

  const selectAll = () => {
    const all = new Set<number>();
    for (let i = 1; i <= totalWeeks; i++) all.add(i);
    setSelectedWeeks(all);
  };

  const selectOdd = () => {
    const odd = new Set<number>();
    for (let i = 1; i <= totalWeeks; i += 2) odd.add(i);
    setSelectedWeeks(odd);
  };

  const selectEven = () => {
    const even = new Set<number>();
    for (let i = 2; i <= totalWeeks; i += 2) even.add(i);
    setSelectedWeeks(even);
  };

  const clearAll = () => {
    setSelectedWeeks(new Set());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center px-0 sm:px-4">
      <div 
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-dynamic shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 px-2 py-1">取消</button>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={handleConfirm} className="text-primary font-bold px-2 py-1">确定</button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={selectAll} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium whitespace-nowrap">全选</button>
            <button onClick={selectOdd} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium whitespace-nowrap">单周</button>
            <button onClick={selectEven} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium whitespace-nowrap">双周</button>
            <button onClick={clearAll} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium whitespace-nowrap">清空</button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => (
              <button
                key={week}
                onClick={() => toggleWeek(week)}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center text-lg font-bold transition-all",
                  selectedWeeks.has(week) 
                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" 
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                )}
              >
                {week}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
