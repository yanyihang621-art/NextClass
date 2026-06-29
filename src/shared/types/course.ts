/**
 * 课程数据模型
 */
export interface Course {
  id: string;
  timetableId?: string;
  name: string;
  teacher: string;
  location: string;
  weeks: string;
  day: number;
  periodStart: number;
  periodEnd: number;
  color: string;
  bg: string;
}

/**
 * Supabase `courses` 表的行结构（snake_case 字段）。
 * 用于 dbRowToCourse / courseToDbRow 的类型安全映射。
 */
export interface CourseRow {
  id: string;
  user_id: string;
  timetable_id: string | null;
  name: string;
  teacher: string | null;
  location: string | null;
  weeks: string | null;
  day: number;
  period_start: number;
  period_end: number;
  color: string | null;
  bg: string | null;
}
