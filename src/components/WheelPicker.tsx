import React, { useRef, useEffect, useState } from 'react';
import { cn } from './BottomNav';

interface WheelPickerProps {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (value: string | number) => void;
  itemHeight?: number;
}

export default function WheelPicker({ options, value, onChange, itemHeight = 40 }: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedIndex = options.findIndex(opt => opt.value === value);

  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      containerRef.current.scrollTop = selectedIndex * itemHeight;
    }
  }, [value, selectedIndex, itemHeight, isScrolling]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      if (containerRef.current) {
        const index = Math.round(containerRef.current.scrollTop / itemHeight);
        if (index >= 0 && index < options.length) {
          onChange(options[index].value);
        }
      }
    }, 150);
  };

  return (
    <div 
      className="relative overflow-hidden w-full" 
      style={{ height: itemHeight * 5 }}
    >
      {/* Highlight overlay */}
      <div 
        className="absolute w-full bg-primary/10 rounded-lg pointer-events-none"
        style={{ 
          height: itemHeight, 
          top: itemHeight * 2,
        }}
      />
      
      {/* Gradient masks */}
      <div className="absolute top-0 w-full bg-gradient-to-b from-white to-transparent pointer-events-none z-10" style={{ height: itemHeight * 2 }} />
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-white to-transparent pointer-events-none z-10" style={{ height: itemHeight * 2 }} />

      <div 
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide relative z-0"
        onScroll={handleScroll}
        style={{ padding: `${itemHeight * 2}px 0` }}
      >
        {options.map((opt) => (
          <div 
            key={opt.value}
            className={cn(
              "flex items-center justify-center snap-center transition-all duration-200 cursor-pointer",
              value === opt.value ? "opacity-100 font-bold text-primary text-lg" : "opacity-40 text-slate-600 text-base"
            )}
            style={{ height: itemHeight }}
            onClick={() => {
              onChange(opt.value);
              if (containerRef.current) {
                const idx = options.findIndex(o => o.value === opt.value);
                containerRef.current.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
              }
            }}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}
