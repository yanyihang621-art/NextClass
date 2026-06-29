import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ThemeColor } from '../shared/types/timetable';
import { themeColorMap } from '../shared/constants/defaults';

// ── Context Type ──────────────────────────────────────────────────

interface PreferencesContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  transparency: number;
  setTransparency: (val: number) => void;
  cornerRadius: number;
  setCornerRadius: (val: number) => void;
  cellHeight: number;
  setCellHeight: (val: number) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  // UI preferences — stay in localStorage only (no cloud sync needed)
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

  // Apply CSS custom properties to :root
  useEffect(() => {
    const root = document.documentElement;
    const colors = themeColorMap[themeColor];
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-primary-container', colors.container);
    root.style.setProperty('--theme-on-primary-container', colors.onContainer);

    root.style.setProperty('--glass-opacity', (transparency / 100).toString());
    root.style.setProperty('--app-radius', `${cornerRadius}px`);

    root.style.setProperty('--cell-height', `${cellHeight}px`);
  }, [themeColor, transparency, cornerRadius, cellHeight]);

  return (
    <PreferencesContext.Provider value={{
      themeColor, setThemeColor,
      transparency, setTransparency,
      cornerRadius, setCornerRadius,
      cellHeight, setCellHeight,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within PreferencesProvider');
  return context;
};
