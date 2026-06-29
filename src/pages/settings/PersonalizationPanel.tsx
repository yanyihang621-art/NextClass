import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../shared/lib/utils';
import type { ThemeColor } from '../../shared/types/timetable';

interface PersonalizationPanelProps {
  isOpen: boolean;
  onCancel: () => void;
  onSave: () => void;
  cornerRadius: number;
  setCornerRadius: (val: number) => void;
  cellHeight: number;
  setCellHeight: (val: number) => void;
  transparency: number;
  setTransparency: (val: number) => void;
  themeColor: ThemeColor;
  setThemeColor: (val: ThemeColor) => void;
  colors: readonly { readonly id: ThemeColor; readonly class: string }[];
}

export default function PersonalizationPanel({
  isOpen,
  onCancel,
  onSave,
  cornerRadius,
  setCornerRadius,
  cellHeight,
  setCellHeight,
  transparency,
  setTransparency,
  themeColor,
  setThemeColor,
  colors,
}: PersonalizationPanelProps) {
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
        <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-800">arrow_back_ios_new</span>
        </button>
        <h3 className="text-lg font-bold">个性化设置</h3>
        <button onClick={onSave} className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-primary transition-colors flex items-center justify-center w-10 h-10">
          <span className="material-symbols-outlined">check</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28 space-y-4">
        {/* Corner Radius */}
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

        {/* Cell Height */}
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

        {/* Transparency */}
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

        {/* Theme Color */}
        <div className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="mb-4">
            <label className="font-bold text-[16px] text-slate-800 block mb-4">主题颜色</label>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setThemeColor(c.id)}
                  className={cn(
                    "w-12 h-12 rounded-full flex-shrink-0 border-4 border-white transition-all",
                    c.class,
                    themeColor === c.id ? "shadow-md ring-2 ring-primary scale-110" : "shadow-sm hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
