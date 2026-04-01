import React, { useState, useEffect } from 'react';
import WheelPicker from './WheelPicker';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

export default function DatePickerModal({ isOpen, onClose, title, value, onChange }: DatePickerModalProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [day, setDay] = useState<number>(new Date().getDate());

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      if (y && m && d) {
        setYear(parseInt(y, 10));
        setMonth(parseInt(m, 10));
        setDay(parseInt(d, 10));
      }
    }
  }, [value, isOpen]);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    label: `${currentYear - 5 + i}年`,
    value: currentYear - 5 + i
  }));

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: i + 1
  }));

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({
    label: `${i + 1}日`,
    value: i + 1
  }));

  const handleConfirm = () => {
    const formattedMonth = String(month).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    onChange(`${year}-${formattedMonth}-${formattedDay}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center px-0 sm:px-4">
      <div 
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-dynamic shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 px-2 py-1">取消</button>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={handleConfirm} className="text-primary font-bold px-2 py-1">确定</button>
        </div>
        <div className="p-4 flex gap-2">
          <div className="flex-1">
            <WheelPicker 
              options={yearOptions} 
              value={year} 
              onChange={(v) => setYear(Number(v))} 
            />
          </div>
          <div className="flex-1">
            <WheelPicker 
              options={monthOptions} 
              value={month} 
              onChange={(v) => {
                setMonth(Number(v));
                const newDaysInMonth = new Date(year, Number(v), 0).getDate();
                if (day > newDaysInMonth) {
                  setDay(newDaysInMonth);
                }
              }} 
            />
          </div>
          <div className="flex-1">
            <WheelPicker 
              options={dayOptions} 
              value={day} 
              onChange={(v) => setDay(Number(v))} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
