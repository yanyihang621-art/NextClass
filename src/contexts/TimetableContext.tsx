import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { timetableRepository } from '../shared/services/timetableRepository';
import type { TimetableConfig } from '../shared/types/timetable';
import { defaultPeriods } from '../shared/constants/defaults';

// ── Context Type ──────────────────────────────────────────────────

interface TimetableContextType {
  timetables: TimetableConfig[];
  setTimetables: (timetables: TimetableConfig[]) => void;
  activeTimetable: TimetableConfig | undefined;
  loading: boolean;
}

const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────

export function TimetableProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  /**
   * 脏标记：当本地 timetables 有尚未同步到 Supabase 的变更时为 true。
   * 在 dirty 状态下，fetchTimetables 拉取到的云端数据不会覆盖本地数据。
   */
  const dirtyRef = React.useRef(false);
  const pendingOpsRef = React.useRef(0);

  const markDirty = () => {
    dirtyRef.current = true;
    pendingOpsRef.current += 1;
  };

  const markSynced = () => {
    pendingOpsRef.current = Math.max(0, pendingOpsRef.current - 1);
    if (pendingOpsRef.current === 0) {
      dirtyRef.current = false;
    }
  };

  // ── 离线优先：同步从 localStorage 加载课表配置，保证 UI 瞬间渲染 ──
  const [timetables, setTimetablesState] = useState<TimetableConfig[]>(() => {
    if (!user) return [];
    const cacheKey = `timetables_${user.id}`;
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved) as TimetableConfig[];
        return parsed.map(t => {
          if (!t.periods || t.periods.length !== 20) {
            return { ...t, periods: defaultPeriods };
          }
          return t;
        });
      }
    } catch { /* ignore */ }
    return [];
  });
  const [loading, setLoading] = useState(true);

  // 后台从 Supabase 拉取最新数据，成功后刷新本地状态 + 更新缓存
  useEffect(() => {
    if (!user) {
      setTimetablesState([]);
      setLoading(false);
      return;
    }

    const cacheKey = `timetables_${user.id}`;

    // 同步恢复缓存（处理 user 变更时的场景）
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved) as TimetableConfig[];
        setTimetablesState(parsed.map(t => {
          if (!t.periods || t.periods.length !== 20) {
            return { ...t, periods: defaultPeriods };
          }
          return t;
        }));
      }
    } catch { /* ignore */ }

    const fetchTimetables = async () => {
      setLoading(true);
      try {
        const { data, error } = await timetableRepository.fetchByUser(user.id);

        if (error) {
          console.error('Failed to fetch timetables:', error);
          // 网络失败时保持 localStorage 缓存的数据，不清空
        } else if (data) {
          // ★ 关键保护：如果本地有未同步的变更，不用云端数据覆盖本地
          if (dirtyRef.current) {
            console.info('[TimetableContext] 本地有未同步的 timetables 变更，跳过云端数据覆盖');
          } else {
            setTimetablesState(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
        }
      } catch (e) {
        console.error('Network error fetching timetables:', e);
        // 完全离线时静默失败，继续使用缓存数据
      }
      setLoading(false);
    };
    fetchTimetables();
  }, [user]);

  const setTimetables = useCallback((newTimetables: TimetableConfig[]) => {
    setTimetablesState(prev => {
      if (!user) return newTimetables;

      // Determine what changed: deletions
      const prevIds = new Set<string>(prev.map(t => t.id));
      const newIds = new Set<string>(newTimetables.map(t => t.id));
      const deletedIds = Array.from(prevIds).filter(id => !newIds.has(id));

      // Async persist to Supabase（标脏 → 写入 → 同步完成后解除脏标记）
      markDirty();
      (async () => {
        try {
          // Delete removed timetables
          for (const id of deletedIds) {
            const { error } = await timetableRepository.delete(id);
            if (error) console.error('Failed to delete timetable:', error);
          }

          // Upsert all current timetables
          const { error } = await timetableRepository.upsert(user.id, newTimetables);
          if (error) console.error('Failed to upsert timetables:', error);
        } finally {
          markSynced();
        }
      })();

      // Update user-scoped localStorage cache
      localStorage.setItem(`timetables_${user.id}`, JSON.stringify(newTimetables));
      return newTimetables;
    });
  }, [user]);

  const activeTimetable = timetables.find(t => t.active) || timetables[0];

  return (
    <TimetableContext.Provider value={{
      timetables, setTimetables,
      activeTimetable,
      loading,
    }}>
      {children}
    </TimetableContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────

export const useTimetable = () => {
  const context = useContext(TimetableContext);
  if (!context) throw new Error('useTimetable must be used within TimetableProvider');
  return context;
};
