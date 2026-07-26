import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { isNetworkError } from '../shared/lib/network';
import {
  clearCachedAuthUser,
  createInitialAuthState,
  writeCachedAuthUser,
} from '../shared/lib/authCache';
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
  /** 当前是否处于离线状态（Supabase 不可达） */
  isOffline: boolean;
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
  // 同步恢复上次登录用户，让其 user.id 在首个 React render 前即可用于
  // CourseContext/TimetableContext 读取用户级 localStorage 缓存。
  const [initialAuthState] = useState(createInitialAuthState);
  const [user, setUser] = useState<User | null>(initialAuthState.user);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(initialAuthState.loading);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  /** 标记是否已经完成过一次初始化（避免 onAuthStateChange 重复触发时覆盖离线恢复结果） */
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      try {
        // Supabase SDK 的 getSession() 优先从 localStorage 读取缓存的 session，
        // 如果存在有效 session 则直接返回，不需要网络请求。
        // 只有 session 不存在或需要刷新 token 时才发起网络请求。
        const { data: { session: cachedSession }, error } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          // 网络错误：尝试从 localStorage 恢复用户信息
          if (isNetworkError(error)) {
            console.warn('[AuthContext] 网络不可用，尝试从缓存恢复 session');
            setIsOffline(true);
            // Supabase SDK 会在 localStorage 中存放 session，
            // getSession() 即使在离线时也会返回缓存数据。
            // 如果 error 出现但 cachedSession 不为空，仍可使用。
          } else {
            console.error('[AuthContext] getSession error:', error);
            setSession(null);
            setUser(null);
            clearCachedAuthUser();
          }
        } else {
          setIsOffline(false);
        }

        if (cachedSession) {
          setSession(cachedSession);
          setUser(cachedSession.user);
          writeCachedAuthUser(cachedSession.user);
        } else if (!error) {
          // 在线且 Supabase 明确确认没有 session，移除可能过期的启动缓存。
          setSession(null);
          setUser(null);
          clearCachedAuthUser();
        }
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          console.warn('[AuthContext] 完全离线，使用缓存 session');
          setIsOffline(true);
          // 即使 getSession() 抛出异常，Supabase SDK 内部可能已读取到缓存
          // 此处不清空 user/session，保持默认 null 状态
        } else {
          console.error('[AuthContext] Unexpected error:', err);
          setSession(null);
          setUser(null);
          clearCachedAuthUser();
        }
      } finally {
        if (!cancelled) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        // 仅在初始化完成后响应状态变更（避免竞争条件）
        if (!initializedRef.current) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession) {
          writeCachedAuthUser(newSession.user);
        } else {
          clearCachedAuthUser();
        }
        setLoading(false);
        // 收到 auth 事件意味着网络可用
        if (newSession) setIsOffline(false);
      }
    );

    // 监听浏览器在线/离线事件
    const handleOnline = () => {
      setIsOffline(false);
      // 网络恢复时尝试刷新 session
      supabase.auth.getSession().then(({ data: { session: freshSession } }) => {
        if (freshSession) {
          setSession(freshSession);
          setUser(freshSession.user);
          writeCachedAuthUser(freshSession.user);
        } else {
          setSession(null);
          setUser(null);
          clearCachedAuthUser();
        }
      }).catch(() => { /* 静默 */ });
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (isNetworkError(error)) {
          return { error: '网络连接失败，请检查网络后重试' };
        }
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

      // 若启用 User Enumeration Protection，已注册的用户不会返回错误，但其 identities 数组为空
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        return { error: '该邮箱已被注册' };
      }

      // 注册成功，需要邮箱验证
      return { error: null, needsVerification: true };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: '网络连接失败，请检查网络后重试' };
      }
      throw err;
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string, type: 'signup' | 'recovery' | 'magiclink' | 'invite' = 'signup'): Promise<{ error: string | null }> => {
    if (!token || token.trim().length !== 6) {
      return { error: '请输入6位验证码' };
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: type,
      });

      if (error) {
        if (isNetworkError(error)) {
          return { error: '网络连接失败，请检查网络后重试' };
        }
        if (error.message.includes('expired') || error.message.includes('Token has expired')) {
          return { error: '验证码已过期，请重新发送' };
        }
        if (error.message.includes('invalid') || error.message.includes('Invalid')) {
          return { error: '验证码错误，请重新输入' };
        }
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: '网络连接失败，请检查网络后重试' };
      }
      throw err;
    }
  }, []);

  const resendOtp = useCallback(async (email: string, type: 'signup' | 'recovery' = 'signup'): Promise<{ error: string | null }> => {
    try {
      if (type === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
        if (error) {
          if (isNetworkError(error)) return { error: '网络连接失败，请检查网络后重试' };
          return { error: error.message };
        }
        return { error: null };
      }

      const { error } = await supabase.auth.resend({
        type: type as 'signup', // standard resend only supports signup/email_change
        email: email.trim().toLowerCase(),
      });

      if (error) {
        if (isNetworkError(error)) return { error: '网络连接失败，请检查网络后重试' };
        if (error.message.includes('rate limit')) {
          return { error: '发送过于频繁，请稍后再试' };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: '网络连接失败，请检查网络后重试' };
      }
      throw err;
    }
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

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (isNetworkError(error)) {
          return { error: '网络连接失败，请检查网络后重试' };
        }
        if (error.message.includes('Invalid login credentials')) {
          return { error: '邮箱或密码错误' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: '邮箱尚未验证，请先完成邮箱验证' };
        }
        return { error: error.message };
      }

      setIsOffline(false);
      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: '网络连接失败，请检查网络后重试' };
      }
      throw err;
    }
  }, []);

  // ──────────────────────────────────────────────
  // 退出登录
  // ──────────────────────────────────────────────

  const signOutFn = useCallback(async () => {
    const uid = user?.id;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // 离线时 signOut 可能失败，但仍需清理本地状态
      console.warn('[AuthContext] signOut 网络失败，清理本地状态:', err);
    }
    // 无论网络成功与否，都清除本地缓存
    if (uid) {
      localStorage.removeItem(`courses_${uid}`);
      localStorage.removeItem(`timetables_${uid}`);
    }
    localStorage.removeItem('courses');
    localStorage.removeItem('timetables');
    clearCachedAuthUser();
    setUser(null);
    setSession(null);
  }, [user]);

  // ──────────────────────────────────────────────
  // 忘记密码 / 重置密码
  // ──────────────────────────────────────────────

  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (!email || !email.trim()) {
      return { error: '请输入邮箱地址' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (error) {
        if (isNetworkError(error)) {
          return { error: '网络连接失败，请检查网络后重试' };
        }
        if (error.message.includes('rate limit')) {
          return { error: '操作过于频繁，请稍后再试' };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: '网络连接失败，请检查网络后重试' };
      }
      throw err;
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ error: string | null }> => {
    if (!newPassword || newPassword.length < 6) {
      return { error: '新密码长度不能少于6位' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        if (isNetworkError(error)) {
          return { error: '网络连接失败，请检查网络后重试' };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: '网络连接失败，请检查网络后重试' };
      }
      throw err;
    }
  }, []);

  // ──────────────────────────────────────────────
  // 发送邮箱 OTP（通用，用于注销账号等场景）
  // ──────────────────────────────────────────────

  const sendEmailOtp = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (!email || !email.trim()) {
      return { error: '请输入邮箱地址' };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });

      if (error) {
        if (isNetworkError(error)) return { error: '网络连接失败，请检查网络后重试' };
        if (error.message.includes('rate limit')) {
          return { error: '操作过于频繁，请稍后再试' };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: '网络连接失败，请检查网络后重试' };
      }
      throw err;
    }
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string): Promise<{ error: string | null }> => {
    if (!token || token.trim().length !== 6) {
      return { error: '请输入6位验证码' };
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email',
      });

      if (error) {
        if (isNetworkError(error)) return { error: '网络连接失败，请检查网络后重试' };
        if (error.message.includes('expired') || error.message.includes('Token has expired')) {
          return { error: '验证码已过期，请重新发送' };
        }
        if (error.message.includes('invalid') || error.message.includes('Invalid')) {
          return { error: '验证码错误，请重新输入' };
        }
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: '网络连接失败，请检查网络后重试' };
      }
      throw err;
    }
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
      isOffline,
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
