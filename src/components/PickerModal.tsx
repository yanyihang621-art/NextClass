import React from 'react';
import WheelPicker from './WheelPicker';

interface PickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (value: string | number) => void;
}

export default function PickerModal({ isOpen, onClose, title, options, value, onChange }: PickerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center px-0 sm:px-4">
      <div 
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-dynamic shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 px-2 py-1">取消</button>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-primary font-bold px-2 py-1">确定</button>
        </div>
        <div className="p-4">
          <WheelPicker 
            options={options} 
            value={value} 
            onChange={onChange} 
          />
        </div>
      </div>
    </div>
  );
}
