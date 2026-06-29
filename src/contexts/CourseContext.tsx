import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { courseRepository } from '../shared/services/courseRepository';
import { COURSE_COLORS } from '../shared/constants/colors';
import type { Course } from '../shared/types/course';

// Re-export Course type for backward compatibility
export type { Course } from '../shared/types/course';

interface CourseContextType {
  courses: Course[];
  loading: boolean;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, course: Course) => void;
  deleteCourse: (id: string) => void;
  deleteCoursesByTimetable: (timetableId: string) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

function getAutoColor(newCourse: Course, existingCourses: Course[], currentColor?: string): string {
  const sameDayCourses = existingCourses.filter(c => c.day === newCourse.day && c.id !== newCourse.id && (c.timetableId || '1') === (newCourse.timetableId || '1'));
  
  const adjacentColors = new Set<string>();
  const sameDayColors = new Set<string>();

  sameDayCourses.forEach(c => {
    sameDayColors.add(c.color);
    const isOverlapping = Math.max(c.periodStart, newCourse.periodStart) <= Math.min(c.periodEnd, newCourse.periodEnd);
    const isAdjacent = c.periodStart === newCourse.periodEnd + 1 || newCourse.periodStart === c.periodEnd + 1;
    
    if (isOverlapping || isAdjacent) {
      adjacentColors.add(c.color);
    }
  });

  if (currentColor && !adjacentColors.has(currentColor)) {
    return currentColor;
  }

  const availableColors = COURSE_COLORS.filter(color => !adjacentColors.has(color));
  
  if (availableColors.length === 0) {
    return COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)];
  }

  const completelyUnusedColors = availableColors.filter(color => !sameDayColors.has(color));
  
  if (completelyUnusedColors.length > 0) {
    return completelyUnusedColors[Math.floor(Math.random() * completelyUnusedColors.length)];
  }

  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  /**
   * 脏标记：当本地有尚未同步到 Supabase 的变更时为 true。
   * 在 dirty 状态下，fetchCourses 拉取到的云端数据不会覆盖本地数据，
   * 避免用户导入课表后快速退出 → 再次打开时未同步的课表被云端旧数据覆盖而消失。
   *
   * 使用 ref 而非 state，因为仅在异步回调中读取，不需要触发重渲染。
   */
  const dirtyRef = React.useRef(false);

  /**
   * 待同步到 Supabase 的操作计数器。
   * 每发起一次异步写操作 +1，完成（成功或失败）后 -1。
   * 当计数器归零时将 dirtyRef 置为 false。
   */
  const pendingOpsRef = React.useRef(0);

  /** 发起一次待同步操作 → 标脏 + 计数器 +1 */
  const markDirty = () => {
    dirtyRef.current = true;
    pendingOpsRef.current += 1;
  };

  /** 一次同步操作完成 → 计数器 -1，归零时解除脏标记 */
  const markSynced = () => {
    pendingOpsRef.current = Math.max(0, pendingOpsRef.current - 1);
    if (pendingOpsRef.current === 0) {
      dirtyRef.current = false;
    }
  };

  // ── 离线优先：同步从 localStorage 加载缓存作为初始状态，保证 UI 瞬间渲染 ──
  const [courses, setCourses] = useState<Course[]>(() => {
    if (!user) return [];
    const cacheKey = `courses_${user.id}`;
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) return JSON.parse(saved) as Course[];
    } catch { /* ignore */ }
    return [];
  });
  const [loading, setLoading] = useState(true);

  // 后台从 Supabase 拉取最新数据，成功后刷新本地状态 + 更新缓存
  useEffect(() => {
    if (!user) {
      setCourses([]);
      setLoading(false);
      return;
    }

    const cacheKey = `courses_${user.id}`;

    // 同步恢复缓存（处理 user 变更时的场景）
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const cached = JSON.parse(saved) as Course[];
        setCourses(cached);
      }
    } catch { /* ignore */ }

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const { data, error } = await courseRepository.fetchByUser(user.id);

        if (error) {
          console.error('Failed to fetch courses:', error);
          // 网络失败时保持 localStorage 缓存的数据，不清空
        } else if (data) {
          // ★ 关键保护：如果本地有未同步的变更，不用云端数据覆盖本地
          if (dirtyRef.current) {
            console.info('[CourseContext] 本地有未同步的变更，跳过云端数据覆盖');
          } else {
            setCourses(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
        }
      } catch (e) {
        console.error('Network error fetching courses:', e);
        // 完全离线时静默失败，继续使用缓存数据
      }
      setLoading(false);
    };
    fetchCourses();
  }, [user]);

  const addCourse = useCallback((course: Course) => {
    setCourses(prev => {
      const color = getAutoColor(course, prev);
      const newCourse = { ...course, color, bg: `${color}20` };
      
      // Async persist to Supabase（标脏 → 写入 → 同步完成后解除脏标记）
      if (user) {
        markDirty();
        courseRepository.create(user.id, newCourse).then(({ error }) => {
          if (error) console.error('Failed to add course:', error);
          markSynced();
        });
      }

      const updated = [...prev, newCourse];
      if (user) localStorage.setItem(`courses_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const updateCourse = useCallback((id: string, course: Course) => {
    setCourses(prev => {
      const existing = prev.find(c => c.id === id);
      const color = getAutoColor(course, prev, existing?.color);
      const updatedCourse = { ...course, color, bg: `${color}20` };

      // Async persist to Supabase
      if (user) {
        markDirty();
        courseRepository.update(user.id, id, updatedCourse).then(({ error }) => {
          if (error) console.error('Failed to update course:', error);
          markSynced();
        });
      }

      const updated = prev.map(c => c.id === id ? updatedCourse : c);
      if (user) localStorage.setItem(`courses_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const deleteCourse = useCallback((id: string) => {
    setCourses(prev => {
      // Async persist to Supabase
      if (user) {
        markDirty();
        courseRepository.delete(id).then(({ error }) => {
          if (error) console.error('Failed to delete course:', error);
          markSynced();
        });
      }

      const updated = prev.filter(c => c.id !== id);
      if (user) localStorage.setItem(`courses_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const deleteCoursesByTimetable = useCallback((timetableId: string) => {
    setCourses(prev => {
      // Async persist to Supabase
      if (user) {
        markDirty();
        courseRepository.deleteByTimetable(timetableId).then(({ error }) => {
          if (error) console.error('Failed to delete courses by timetable:', error);
          markSynced();
        });
      }

      const updated = prev.filter(c => (c.timetableId || '1') !== timetableId);
      if (user) localStorage.setItem(`courses_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  return (
    <CourseContext.Provider value={{ courses, loading, addCourse, updateCourse, deleteCourse, deleteCoursesByTimetable }}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
};
