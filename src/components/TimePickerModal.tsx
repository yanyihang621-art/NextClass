import React, { useState, useEffect } from 'react';
import WheelPicker from './WheelPicker';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string; // HH:MM
  onChange: (value: string) => void;
}

export default function TimePickerModal({ isOpen, onClose, title, value, onChange }: TimePickerModalProps) {
  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(0);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      if (h && m) {
        setHour(parseInt(h, 10));
        setMinute(parseInt(m, 10));
      }
    }
  }, [value, isOpen]);

  if (!isOpen) return null;

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    label: String(i).padStart(2, '0'),
    value: i
  }));

  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    label: String(i).padStart(2, '0'),
    value: i
  }));

  const handleConfirm = () => {
    const formattedHour = String(hour).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    onChange(`${formattedHour}:${formattedMinute}`);
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
              options={hourOptions} 
              value={hour} 
              onChange={(v) => setHour(Number(v))} 
            />
          </div>
          <div className="flex items-center justify-center font-bold text-xl text-slate-400 pb-[40px]">
            :
          </div>
          <div className="flex-1">
            <WheelPicker 
              options={minuteOptions} 
              value={minute} 
              onChange={(v) => setMinute(Number(v))} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
