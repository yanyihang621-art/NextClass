import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Student ID validation: alphanumeric only
const STUDENT_ID_REGEX = /^[a-zA-Z0-9]+$/;
const EMAIL_SUFFIX = '@nextclass.com';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (studentId: string, password: string) => Promise<{ error: string | null }>;
  signIn: (studentId: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  getStudentId: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function studentIdToEmail(studentId: string): string {
  return `${studentId.toLowerCase()}${EMAIL_SUFFIX}`;
}

function emailToStudentId(email: string): string {
  return email.replace(EMAIL_SUFFIX, '');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (studentId: string, password: string): Promise<{ error: string | null }> => {
    // Validate student ID format
    if (!studentId || !studentId.trim()) {
      return { error: '请输入学号' };
    }
    if (!STUDENT_ID_REGEX.test(studentId)) {
      return { error: '学号只能包含数字和字母' };
    }
    if (studentId.length < 3) {
      return { error: '学号长度不能少于3位' };
    }

    // Validate password
    if (!password || password.length < 6) {
      return { error: '密码长度不能少于6位' };
    }

    const email = studentIdToEmail(studentId);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return { error: '该学号已被注册' };
      }
      if (error.message.includes('Password')) {
        return { error: '密码不符合要求，至少需要6位' };
      }
      if (error.message.includes('rate limit')) {
        return { error: '注册频率受限，请稍后再试（或在 Supabase 控制台关闭邮箱确认以解除限制）' };
      }
      return { error: error.message };
    }

    return { error: null };
  }, []);

  const signIn = useCallback(async (studentId: string, password: string): Promise<{ error: string | null }> => {
    if (!studentId || !studentId.trim()) {
      return { error: '请输入学号' };
    }
    if (!password) {
      return { error: '请输入密码' };
    }

    const email = studentIdToEmail(studentId);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: '学号或密码错误' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: '账号未验证，请联系管理员' };
      }
      return { error: error.message };
    }

    return { error: null };
  }, []);

  const signOutFn = useCallback(async () => {
    // Capture user ID before signOut clears the session
    const uid = user?.id;
    await supabase.auth.signOut();
    // Clear user-scoped local cache
    if (uid) {
      localStorage.removeItem(`courses_${uid}`);
      localStorage.removeItem(`timetables_${uid}`);
    }
    // Also clear any legacy unscoped keys
    localStorage.removeItem('courses');
    localStorage.removeItem('timetables');
  }, [user]);

  const getStudentId = useCallback(() => {
    if (!user?.email) return '';
    return emailToStudentId(user.email);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut: signOutFn,
      getStudentId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
