import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 重置密码页面
 * 用户通过重置密码邮件中的链接跳转到此页面。
 * Supabase 会自动处理 URL 中的 token，在页面加载时完成 session 恢复。
 * 用户只需在此页面输入新密码即可。
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, session } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // 如果没有有效 session（用户直接访问此页面而非通过邮件链接），3 秒后重定向
  const [waitingForSession, setWaitingForSession] = useState(true);

  useEffect(() => {
    // 给 Supabase 一些时间来处理 URL 中的 token 并恢复 session
    const timer = setTimeout(() => {
      setWaitingForSession(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (session) {
      setWaitingForSession(false);
    }
  }, [session]);

  // 如果等待结束仍然没有 session，重定向到登录页
  useEffect(() => {
    if (!waitingForSession && !session && !done) {
      navigate('/login', { replace: true });
    }
  }, [waitingForSession, session, done, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setError(error);
      } else {
        setDone(true);
        setTimeout(() => navigate('/timetable', { replace: true }), 2000);
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state while waiting for session
  if (waitingForSession) {
    return (
      <div className="min-h-screen bg-[#F7F7F9] font-body flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400 font-medium">正在验证身份...</span>
        </div>
      </div>
    );
  }

  // Success state
  if (done) {
    return (
      <div className="min-h-screen bg-[#F7F7F9] font-body flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-lg flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">密码已更新</h2>
          <p className="text-sm text-slate-400">正在跳转到主页...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F9] font-body flex flex-col">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[15%] w-[70%] h-[50%] bg-primary/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[5%] -right-[15%] w-[60%] h-[40%] bg-primary/3 rounded-full blur-[80px]"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-[22px] bg-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
            <span className="material-symbols-outlined text-white text-4xl fill">calendar_month</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">设置新密码</h1>
          <p className="text-slate-400 text-sm font-medium">请输入你的新密码</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">新密码</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">lock</span>
              <input
                id="new-password-input"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="设置新密码（至少6位）"
                autoComplete="new-password"
                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-12 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">确认新密码</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">lock_reset</span>
              <input
                id="confirm-new-password-input"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                autoComplete="new-password"
                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm py-3 px-4 rounded-xl border border-primary/20">
              <span className="material-symbols-outlined text-lg">error</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="reset-submit-btn"
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>更新中...</span>
              </>
            ) : (
              <span>更新密码</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center pb-6">
        <p className="text-xs text-slate-300">NextClass © 2026</p>
      </div>
    </div>
  );
}
