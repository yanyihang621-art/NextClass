import React from 'react';

interface ForgotPasswordFormProps {
  email: string;
  setEmail: (val: string) => void;
  successMsg: string;
  error: string;
  submitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export default function ForgotPasswordForm({
  email,
  setEmail,
  successMsg,
  error,
  submitting,
  handleSubmit,
}: ForgotPasswordFormProps) {
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-in fade-in duration-200">
      {/* Illustration */}
      <div className="flex justify-center mb-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-3xl">lock_reset</span>
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">邮箱</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">mail</span>
          <input
            id="forgot-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入你注册时使用的邮箱"
            autoComplete="email"
            className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-start gap-2 bg-primary/10 text-primary text-sm py-3 px-4 rounded-xl border border-primary/20">
          <span className="material-symbols-outlined text-lg mt-0.5 flex-shrink-0">check_circle</span>
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm py-3 px-4 rounded-xl border border-primary/20">
          <span className="material-symbols-outlined text-lg">error</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        id="forgot-submit-btn"
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>发送中...</span>
          </>
        ) : (
          <span>发送重置邮件</span>
        )}
      </button>
    </form>
  );
}
