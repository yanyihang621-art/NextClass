import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Supabase Dashboard 配置要求:
 * 1. Authentication → Providers → Email:
 *    - Enable Email provider: ON
 *    - Confirm email: ON
 *    - Email OTP type: 选择 Email (OTP)，用户注册后收到 6 位数验证码
 *    - OTP 过期时间建议: 10 分钟
 * 2. Authentication → URL Configuration:
 *    - Site URL: http://localhost:5173 (开发环境)
 *    - Redirect URLs: http://localhost:5173/reset-password
 */

interface SignUpResult {
  error: string | null;
  needsVerification?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  verifyOtp: (email: string, token: string, type?: 'signup' | 'recovery' | 'magiclink' | 'invite') => Promise<{ error: string | null }>;
  resendOtp: (email: string, type?: 'signup' | 'recovery') => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  getUserEmail: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // ──────────────────────────────────────────────
  // 注册 & 邮箱验证
  // ──────────────────────────────────────────────

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    // 前端校验
    if (!email || !email.trim()) {
      return { error: '请输入邮箱地址' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: '请输入有效的邮箱地址' };
    }
    if (!password || password.length < 6) {
      return { error: '密码长度不能少于6位' };
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return { error: '该邮箱已被注册' };
      }
      if (error.message.includes('Password')) {
        return { error: '密码不符合要求，至少需要6位' };
      }
      if (error.message.includes('rate limit')) {
        return { error: '操作过于频繁，请稍后再试' };
      }
      return { error: error.message };
    }

    // 注册成功，需要邮箱验证
    return { error: null, needsVerification: true };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string, type: 'signup' | 'recovery' | 'magiclink' | 'invite' = 'signup'): Promise<{ error: string | null }> => {
    if (!token || token.trim().length !== 6) {
      return { error: '请输入6位验证码' };
    }

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: type,
    });

    if (error) {
      if (error.message.includes('expired') || error.message.includes('Token has expired')) {
        return { error: '验证码已过期，请重新发送' };
      }
      if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        return { error: '验证码错误，请重新输入' };
      }
      return { error: error.message };
    }

    return { error: null };
  }, []);

  const resendOtp = useCallback(async (email: string, type: 'signup' | 'recovery' = 'signup'): Promise<{ error: string | null }> => {
    if (type === 'recovery') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) return { error: error.message };
      return { error: null };
    }

    const { error } = await supabase.auth.resend({
      type: type as 'signup', // standard resend only supports signup/email_change
      email: email.trim().toLowerCase(),
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        return { error: '发送过于频繁，请稍后再试' };
      }
      return { error: error.message };
    }
    return { error: null };
  }, []);

  // ──────────────────────────────────────────────
  // 登录
  // ──────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!email || !email.trim()) {
      return { error: '请输入邮箱地址' };
    }
    if (!password) {
      return { error: '请输入密码' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: '邮箱或密码错误' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: '邮箱尚未验证，请先完成邮箱验证' };
      }
      return { error: error.message };
    }

    return { error: null };
  }, []);

  // ──────────────────────────────────────────────
  // 退出登录
  // ──────────────────────────────────────────────

  const signOutFn = useCallback(async () => {
    const uid = user?.id;
    await supabase.auth.signOut();
    if (uid) {
      localStorage.removeItem(`courses_${uid}`);
      localStorage.removeItem(`timetables_${uid}`);
    }
    localStorage.removeItem('courses');
    localStorage.removeItem('timetables');
  }, [user]);

  // ──────────────────────────────────────────────
  // 忘记密码 / 重置密码
  // ──────────────────────────────────────────────

  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (!email || !email.trim()) {
      return { error: '请输入邮箱地址' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );

    if (error) {
      if (error.message.includes('rate limit')) {
        return { error: '操作过于频繁，请稍后再试' };
      }
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ error: string | null }> => {
    if (!newPassword || newPassword.length < 6) {
      return { error: '新密码长度不能少于6位' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }, []);

  // ──────────────────────────────────────────────
  // 发送邮箱 OTP（通用，用于注销账号等场景）
  // ──────────────────────────────────────────────

  const sendEmailOtp = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (!email || !email.trim()) {
      return { error: '请输入邮箱地址' };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        return { error: '操作过于频繁，请稍后再试' };
      }
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string): Promise<{ error: string | null }> => {
    if (!token || token.trim().length !== 6) {
      return { error: '请输入6位验证码' };
    }

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      if (error.message.includes('expired') || error.message.includes('Token has expired')) {
        return { error: '验证码已过期，请重新发送' };
      }
      if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        return { error: '验证码错误，请重新输入' };
      }
      return { error: error.message };
    }

    return { error: null };
  }, []);

  // ──────────────────────────────────────────────
  // 获取当前用户邮箱
  // ──────────────────────────────────────────────

  const getUserEmail = useCallback(() => {
    return user?.email ?? '';
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      verifyOtp,
      resendOtp,
      signIn,
      signOut: signOutFn,
      resetPassword,
      updatePassword,
      sendEmailOtp,
      verifyEmailOtp,
      getUserEmail,
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
