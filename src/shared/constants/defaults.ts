import type { Period, ThemeColor } from '../types/timetable';

/**
 * 默认节次时间表（20 节）
 */
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

/**
 * 主题色配置映射（primary / container / onContainer）
 */
export const themeColorMap: Record<ThemeColor, { primary: string; container: string; onContainer: string }> = {
  purple: { primary: '#6d23f9', container: '#e8ddff', onContainer: '#5300cd' },
  blue: { primary: '#008bff', container: '#dbeafe', onContainer: '#1e3a8a' },
  emerald: { primary: '#00b48e', container: '#d1fae5', onContainer: '#064e3b' },
  rose: { primary: '#ff007a', container: '#ffe4e6', onContainer: '#881337' },
  amber: { primary: '#ff7a4b', container: '#fef3c7', onContainer: '#78350f' },
  indigo: { primary: '#6366f1', container: '#e0e7ff', onContainer: '#312e81' },
};

/**
 * 默认总周数
 */
export const DEFAULT_TOTAL_WEEKS = 20;
