import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(studentId, password);
        if (error) {
          setError(error);
        } else {
          navigate('/timetable', { replace: true });
        }
      } else {
        const { error } = await signUp(studentId, password);
        if (error) {
          setError(error);
        } else {
          navigate('/timetable', { replace: true });
        }
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F9] font-body flex flex-col">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[15%] w-[70%] h-[50%] bg-primary/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[5%] -right-[15%] w-[60%] h-[40%] bg-primary/3 rounded-full blur-[80px]"></div>
      </div>

      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Logo & title */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-[22px] bg-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
            <span className="material-symbols-outlined text-white text-4xl fill">calendar_month</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">NextClass</h1>
          <p className="text-slate-400 text-sm font-medium">大学生课表与日程管理</p>
        </div>

        {/* Tab switcher */}
        <div className="w-full max-w-sm mb-6">
          <div className="flex bg-white rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => { setMode('login'); setError(''); setConfirmPassword(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              注册
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          {/* Student ID input */}
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">学号</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">badge</span>
              <input
                id="student-id-input"
                type="text"
                value={studentId}
                onChange={(e) => {
                  // Only allow alphanumeric
                  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                  setStudentId(val);
                }}
                placeholder="输入你的学号"
                autoComplete="username"
                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">密码</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">lock</span>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '设置密码（至少6位）' : '输入密码'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

          {/* Confirm password (register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">确认密码</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">lock_reset</span>
                <input
                  id="confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300"
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm py-3 px-4 rounded-xl border border-red-100">
              <span className="material-symbols-outlined text-lg">error</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{mode === 'login' ? '登录中...' : '注册中...'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? '登录' : '注册'}</span>
            )}
          </button>
        </form>

        {/* Switch mode link */}
        <p className="text-sm text-slate-400 mt-6">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            onClick={switchMode}
            className="text-primary font-bold ml-1 hover:underline"
          >
            {mode === 'login' ? '注册' : '登录'}
          </button>
        </p>
      </div>

      {/* Footer */}
      <div className="text-center pb-6">
        <p className="text-xs text-slate-300">NextClass © 2026</p>
      </div>
    </div>
  );
}
