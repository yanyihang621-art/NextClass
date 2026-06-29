import { supabase } from '../../lib/supabase';
import type { Course, CourseRow } from '../types/course';

// ── 字段映射 ──────────────────────────────────────────────────────

/** Supabase 行 → 前端 Course 对象 */
function dbRowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    timetableId: row.timetable_id || undefined,
    name: row.name,
    teacher: row.teacher || '',
    location: row.location || '',
    weeks: row.weeks || '',
    day: row.day,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    color: row.color || '',
    bg: row.bg || '',
  };
}

/** 前端 Course 对象 → Supabase 行 */
function courseToDbRow(course: Course): Omit<CourseRow, 'user_id'> {
  return {
    id: course.id,
    timetable_id: course.timetableId || null,
    name: course.name,
    teacher: course.teacher,
    location: course.location,
    weeks: course.weeks,
    day: course.day,
    period_start: course.periodStart,
    period_end: course.periodEnd,
    color: course.color,
    bg: course.bg,
  };
}

// ── Repository ────────────────────────────────────────────────────

export const courseRepository = {
  /** 按用户 ID 拉取全量课程，按 day + period_start 排序 */
  async fetchByUser(userId: string): Promise<{ data: Course[] | null; error: string | null }> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('day')
      .order('period_start');

    if (error) return { data: null, error: error.message };
    return { data: (data as CourseRow[]).map(dbRowToCourse), error: null };
  },

  /** 新增一门课程 */
  async create(userId: string, course: Course): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('courses')
      .insert({ ...courseToDbRow(course), user_id: userId });

    return { error: error ? error.message : null };
  },

  /** 更新一门课程 */
  async update(userId: string, id: string, course: Course): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('courses')
      .update({ ...courseToDbRow(course), user_id: userId })
      .eq('id', id);

    return { error: error ? error.message : null };
  },

  /** 删除一门课程 */
  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    return { error: error ? error.message : null };
  },

  /** 删除指定课表下的所有课程 */
  async deleteByTimetable(timetableId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('timetable_id', timetableId);

    return { error: error ? error.message : null };
  },
};
