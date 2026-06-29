import { supabase } from '../../lib/supabase';
import type { TimetableConfig, TimetableRow } from '../types/timetable';
import { defaultPeriods } from '../constants/defaults';

// ── 字段映射 ──────────────────────────────────────────────────────

/** Supabase 行 → 前端 TimetableConfig 对象 */
function dbRowToTimetable(row: TimetableRow): TimetableConfig {
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

/** 前端 TimetableConfig → Supabase 行 */
function timetableToDbRow(t: TimetableConfig): Omit<TimetableRow, 'user_id' | 'created_at'> {
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

// ── Repository ────────────────────────────────────────────────────

export const timetableRepository = {
  /** 按用户 ID 拉取全量课表配置 */
  async fetchByUser(userId: string): Promise<{ data: TimetableConfig[] | null; error: string | null }> {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');

    if (error) return { data: null, error: error.message };
    return { data: (data as TimetableRow[]).map(dbRowToTimetable), error: null };
  },

  /** 批量 upsert 课表配置 */
  async upsert(userId: string, timetables: TimetableConfig[]): Promise<{ error: string | null }> {
    if (timetables.length === 0) return { error: null };

    const rows = timetables.map(t => ({ ...timetableToDbRow(t), user_id: userId }));
    const { error } = await supabase
      .from('timetables')
      .upsert(rows, { onConflict: 'id' });

    return { error: error ? error.message : null };
  },

  /** 删除一个课表 */
  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('timetables')
      .delete()
      .eq('id', id);

    return { error: error ? error.message : null };
  },
};
