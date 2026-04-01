import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  loading: boolean;
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
  { id: 6, start: '13:00', end: '13:45' },
  { id: 7, start: '13:50', end: '14:35' },
  { id: 8, start: '14:45', end: '15:30' },
  { id: 9, start: '15:40', end: '16:25' },
  { id: 10, start: '16:30', end: '17:15' },
  { id: 11, start: '18:00', end: '18:45' },
  { id: 12, start: '18:50', end: '19:35' },
  { id: 13, start: '19:40', end: '20:25' },
  { id: 14, start: '21:45', end: '22:30' },
  { id: 15, start: '21:55', end: '22:40' },
  { id: 16, start: '22:05', end: '22:50' },
  { id: 17, start: '22:15', end: '23:00' },
  { id: 18, start: '22:25', end: '23:10' },
  { id: 19, start: '22:35', end: '23:20' },
  { id: 20, start: '22:45', end: '23:30' },
];

// Helper: convert DB row to TimetableConfig
function dbRowToTimetable(row: any): TimetableConfig {
  return {
    id: row.id,
    name: row.name,
    term: row.term || '',
    active: row.active || false,
    startDate: row.start_date || '',
    totalWeeks: row.total_weeks || 20,
    periods: row.periods || defaultPeriods,
  };
}

// Helper: convert TimetableConfig to DB row
function timetableToDbRow(t: TimetableConfig) {
  return {
    id: t.id,
    name: t.name,
    term: t.term,
    active: t.active,
    start_date: t.startDate,
    total_weeks: t.totalWeeks,
    periods: t.periods,
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // UI preferences — stay in localStorage (no cloud sync needed)
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    return (localStorage.getItem('themeColor') as ThemeColor) || 'purple';
  });
  const [transparency, setTransparency] = useState(() => {
    return Number(localStorage.getItem('transparency')) || 80;
  });
  const [cornerRadius, setCornerRadius] = useState(() => {
    return Number(localStorage.getItem('cornerRadius')) || 16;
  });
  const [cellHeight, setCellHeight] = useState(() => {
    return Number(localStorage.getItem('cellHeight')) || 72;
  });

  // Persist UI preferences to localStorage
  useEffect(() => { localStorage.setItem('themeColor', themeColor); }, [themeColor]);
  useEffect(() => { localStorage.setItem('transparency', String(transparency)); }, [transparency]);
  useEffect(() => { localStorage.setItem('cornerRadius', String(cornerRadius)); }, [cornerRadius]);
  useEffect(() => { localStorage.setItem('cellHeight', String(cellHeight)); }, [cellHeight]);

  // Timetables — stored in Supabase
  const [timetables, setTimetablesState] = useState<TimetableConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Load timetables from Supabase on mount
  useEffect(() => {
    if (!user) {
      setTimetablesState([]);
      setLoading(false);
      return;
    }

    const cacheKey = `timetables_${user.id}`;
    const fetchTimetables = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('timetables')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (error) {
        console.error('Failed to fetch timetables from Supabase:', error);
        // Fallback to user-scoped localStorage
        const saved = localStorage.getItem(cacheKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setTimetablesState(parsed.map((t: TimetableConfig) => {
              if (!t.periods || t.periods.length !== 20) {
                return { ...t, periods: defaultPeriods };
              }
              return t;
            }));
          } catch (e) { /* ignore */ }
        }
      } else if (data) {
        const parsed = data.map(dbRowToTimetable);
        setTimetablesState(parsed);
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
      }
      setLoading(false);
    };
    fetchTimetables();
  }, [user]);

  const setTimetables = useCallback((newTimetables: TimetableConfig[]) => {
    setTimetablesState(prev => {
      if (!user) return newTimetables;

      // Determine what changed: additions, updates, deletions
      const prevIds = new Set<string>(prev.map(t => t.id));
      const newIds = new Set<string>(newTimetables.map(t => t.id));

      // Deleted timetables
      const deletedIds = Array.from(prevIds).filter(id => !newIds.has(id));
      // Added or updated timetables
      const upserted = newTimetables;

      // Async persist to Supabase
      (async () => {
        // Delete removed timetables
        for (const id of deletedIds) {
          const { error } = await supabase.from('timetables').delete().eq('id', id);
          if (error) console.error('Failed to delete timetable from Supabase:', error);
        }

        // Upsert all current timetables
        if (upserted.length > 0) {
          const rows = upserted.map(t => ({ ...timetableToDbRow(t), user_id: user.id }));
          const { error } = await supabase.from('timetables').upsert(rows, { onConflict: 'id' });
          if (error) console.error('Failed to upsert timetables to Supabase:', error);
        }
      })();

      // Update user-scoped localStorage cache
      if (user) localStorage.setItem(`timetables_${user.id}`, JSON.stringify(newTimetables));
      return newTimetables;
    });
  }, [user]);

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
      activeTimetable,
      loading
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
