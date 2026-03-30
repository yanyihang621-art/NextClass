import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeColor = 'purple' | 'blue' | 'emerald' | 'rose' | 'amber' | 'indigo';

export interface Period {
  id: number;
  start: string;
  end: string;
}

export interface TimetableConfig {
  id: string;
  name: string;
  term: string;
  active: boolean;
  startDate: string;
  totalWeeks: number;
  periods: Period[];
}

interface SettingsContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  transparency: number;
  setTransparency: (val: number) => void;
  cornerRadius: number;
  setCornerRadius: (val: number) => void;
  cellHeight: number;
  setCellHeight: (val: number) => void;
  timetables: TimetableConfig[];
  setTimetables: (timetables: TimetableConfig[]) => void;
  activeTimetable: TimetableConfig | undefined;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const themeColors = {
  purple: { primary: '#6d23f9', container: '#e8ddff', onContainer: '#5300cd' },
  blue: { primary: '#3b82f6', container: '#dbeafe', onContainer: '#1e3a8a' },
  emerald: { primary: '#10b981', container: '#d1fae5', onContainer: '#064e3b' },
  rose: { primary: '#f43f5e', container: '#ffe4e6', onContainer: '#881337' },
  amber: { primary: '#f59e0b', container: '#fef3c7', onContainer: '#78350f' },
  indigo: { primary: '#6366f1', container: '#e0e7ff', onContainer: '#312e81' },
};

export const defaultPeriods: Period[] = [
  { id: 1, start: '08:00', end: '08:45' },
  { id: 2, start: '08:50', end: '09:35' },
  { id: 3, start: '09:50', end: '10:35' },
  { id: 4, start: '10:45', end: '11:30' },
  { id: 5, start: '11:35', end: '12:20' },
  { id: 6, start: '12:25', end: '13:10' },
  { id: 7, start: '13:50', end: '14:35' },
  { id: 8, start: '14:45', end: '15:30' },
  { id: 9, start: '15:40', end: '16:25' },
  { id: 10, start: '16:35', end: '17:20' },
  { id: 11, start: '17:25', end: '18:10' },
  { id: 12, start: '18:30', end: '19:15' },
  { id: 13, start: '19:20', end: '20:05' },
  { id: 14, start: '20:10', end: '20:55' },
  { id: 15, start: '21:00', end: '21:45' },
  { id: 16, start: '21:50', end: '22:35' },
  { id: 17, start: '22:40', end: '23:03' },
];

const initialTimetables: TimetableConfig[] = [
  { id: '1', name: '第一学期', term: '2025年9月 - 2026年1月', active: false, startDate: '2025-09-01', totalWeeks: 20, periods: defaultPeriods },
  { id: '2', name: '第二学期', term: '2026年2月 - 2026年7月', active: true, startDate: '2026-02-23', totalWeeks: 20, periods: defaultPeriods },
];

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState<ThemeColor>('purple');
  const [transparency, setTransparency] = useState(80);
  const [cornerRadius, setCornerRadius] = useState(16);
  const [cellHeight, setCellHeight] = useState(72);
  const [timetables, setTimetablesState] = useState<TimetableConfig[]>(() => {
    const saved = localStorage.getItem('timetables');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialTimetables;
      }
    }
    return initialTimetables;
  });

  const setTimetables = (newTimetables: TimetableConfig[]) => {
    setTimetablesState(newTimetables);
    localStorage.setItem('timetables', JSON.stringify(newTimetables));
  };

  const activeTimetable = timetables.find(t => t.active) || timetables[0];

  useEffect(() => {
    const root = document.documentElement;
    const colors = themeColors[themeColor];
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-primary-container', colors.container);
    root.style.setProperty('--theme-on-primary-container', colors.onContainer);
    
    root.style.setProperty('--glass-opacity', (transparency / 100).toString());
    root.style.setProperty('--app-radius', `${cornerRadius}px`);
    
    root.style.setProperty('--cell-height', `${cellHeight}px`);
  }, [themeColor, transparency, cornerRadius, cellHeight]);

  return (
    <SettingsContext.Provider value={{ 
      themeColor, setThemeColor, 
      transparency, setTransparency, 
      cornerRadius, setCornerRadius, 
      cellHeight, setCellHeight,
      timetables, setTimetables,
      activeTimetable
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
