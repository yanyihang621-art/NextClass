import React from 'react';
import type { AuthMode } from './useAuthForm';

interface RegisterFormProps {
  email: string;
  setEmail: (val: string) => void;
  password:  string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  submitting: boolean;
  error: string;
  handleRegister: (e: React.FormEvent) => void;
  switchMode: (mode: AuthMode) => void;
}

export default function RegisterForm({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  submitting,
  error,
  handleRegister,
  switchMode,
}: RegisterFormProps) {
  return (
    <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4 animate-in fade-in duration-200">
      {/* Email */}
      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">邮箱</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">mail</span>
          <input
            id="register-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入你的邮箱"
            autoComplete="email"
            className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">密码</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">lock</span>
          <input
            id="register-password-input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="设置密码（至少6位）"
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

      {/* Confirm password */}
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm py-3 px-4 rounded-xl border border-primary/20">
          <span className="material-symbols-outlined text-lg">error</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        id="register-submit-btn"
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>注册中...</span>
          </>
        ) : (
          <span>注册</span>
        )}
      </button>

      {/* Switch to login */}
      <p className="text-sm text-slate-400 text-center mt-4">
        已有账号？
        <button type="button" onClick={() => switchMode('login')} className="text-primary font-bold ml-1 hover:underline">
          登录
        </button>
      </p>
    </form>
  );
}
