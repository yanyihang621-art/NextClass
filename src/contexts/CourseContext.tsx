import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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

interface CourseContextType {
  courses: Course[];
  loading: boolean;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, course: Course) => void;
  deleteCourse: (id: string) => void;
  deleteCoursesByTimetable: (timetableId: string) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const COURSE_COLORS = [
  '#6d23f9', '#2196F3', '#4CAF50', '#FF9800', '#E91E63', 
  '#00BCD4', '#8BC34A', '#FFC107', '#F44336', '#3F51B5', 
  '#009688', '#9C27B0'
];

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

// Helper: convert DB row to Course object
function dbRowToCourse(row: any): Course {
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

// Helper: convert Course object to DB row
function courseToDbRow(course: Course) {
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

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

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
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', user.id)
          .order('day')
          .order('period_start');

        if (error) {
          console.error('Failed to fetch courses from Supabase:', error);
          // 网络失败时保持 localStorage 缓存的数据，不清空
        } else if (data) {
          const parsed = data.map(dbRowToCourse);
          setCourses(parsed);
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
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
      
      // Async persist to Supabase
      if (user) {
        supabase.from('courses').insert({ ...courseToDbRow(newCourse), user_id: user.id }).then(({ error }) => {
          if (error) console.error('Failed to add course to Supabase:', error);
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
        supabase.from('courses').update({ ...courseToDbRow(updatedCourse), user_id: user.id }).eq('id', id).then(({ error }) => {
          if (error) console.error('Failed to update course in Supabase:', error);
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
        supabase.from('courses').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Failed to delete course from Supabase:', error);
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
        supabase.from('courses').delete().eq('timetable_id', timetableId).then(({ error }) => {
          if (error) console.error('Failed to delete courses by timetable from Supabase:', error);
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
