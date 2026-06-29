/**
 * 课表节次时间配置
 */
export interface Period {
  id: number;
  start: string;
  end: string;
}

/**
 * 课表配置（一个课表包含多门课程）
 */
export interface TimetableConfig {
  id: string;
  name: string;
  term: string;
  active: boolean;
  startDate: string;
  totalWeeks: number;
  periods: Period[];
}

/**
 * Supabase `timetables` 表的行结构（snake_case 字段）。
 */
export interface TimetableRow {
  id: string;
  user_id: string;
  name: string;
  term: string | null;
  active: boolean;
  start_date: string | null;
  total_weeks: number;
  periods: Period[];
  created_at?: string;
}

/**
 * 主题色枚举
 */
export type ThemeColor = 'purple' | 'blue' | 'emerald' | 'rose' | 'amber' | 'indigo';
