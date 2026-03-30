import React, { createContext, useContext, useState, useEffect } from 'react';

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
  addCourse: (course: Course) => void;
  updateCourse: (id: string, course: Course) => void;
  deleteCourse: (id: string) => void;
  deleteCoursesByTimetable: (timetableId: string) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const initialCourses: Course[] = [
  { id: '1', timetableId: '1', day: 1, periodStart: 1, periodEnd: 2, name: '高等数学 A(II)', teacher: '张建国 教授', location: '教3-102', weeks: '1-16', color: '#009688', bg: '#E0F2F1' },
  { id: '2', timetableId: '1', day: 2, periodStart: 3, periodEnd: 3, name: '大学物理 B(I)', teacher: '李冬梅 讲师', location: '教1-405', weeks: '1-16', color: '#2196F3', bg: '#E3F2FD' },
  { id: '3', timetableId: '1', day: 4, periodStart: 3, periodEnd: 3, name: '大学英语', teacher: 'Sarah Wilson', location: '综合楼201', weeks: '1-16', color: '#9C27B0', bg: '#F3E5F5' },
  { id: '4', timetableId: '1', day: 6, periodStart: 3, periodEnd: 3, name: '人工智能导论', teacher: '王强 教授', location: '网络课程', weeks: '1-16', color: '#673AB7', bg: '#EDE7F6' },
  { id: '5', timetableId: '1', day: 1, periodStart: 7, periodEnd: 7, name: '数学分析实践', teacher: '刘明 副教授', location: '教2-201', weeks: '1-16', color: '#FF5722', bg: '#FBE9E7' },
  { id: '6', timetableId: '1', day: 2, periodStart: 7, periodEnd: 7, name: '中国近代史纲要', teacher: '陈红 讲师', location: '教1-B102', weeks: '1-16', color: '#FF9800', bg: '#FFF3E0' },
  { id: '7', timetableId: '1', day: 3, periodStart: 7, periodEnd: 8, name: '大学物理实验', teacher: '赵强 讲师', location: '实验楼 E', weeks: '1-16', color: '#03A9F4', bg: '#E1F5FE' },
  { id: '8', timetableId: '1', day: 4, periodStart: 7, periodEnd: 8, name: 'C语言程序设计', teacher: '孙伟 教授', location: '二教 C-305', weeks: '1-16', color: '#4CAF50', bg: '#E8F5E9' },
];

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('courses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialCourses;
      }
    }
    return initialCourses;
  });

  useEffect(() => {
    localStorage.setItem('courses', JSON.stringify(courses));
  }, [courses]);

  const addCourse = (course: Course) => {
    setCourses(prev => [...prev, course]);
  };

  const updateCourse = (id: string, course: Course) => {
    setCourses(prev => prev.map(c => c.id === id ? course : c));
  };

  const deleteCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const deleteCoursesByTimetable = (timetableId: string) => {
    setCourses(prev => prev.filter(c => (c.timetableId || '1') !== timetableId));
  };

  return (
    <CourseContext.Provider value={{ courses, addCourse, updateCourse, deleteCourse, deleteCoursesByTimetable }}>
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
