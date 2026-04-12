import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'register' | 'verify' | 'forgot-password' | 'forgot-password-verify';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, verifyOtp, resendOtp, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store email used for registration (for OTP verification)
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      } else {
        navigate('/timetable', { replace: true });
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Register ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
      } else if (result.needsVerification) {
        setPendingEmail(email.trim().toLowerCase());
        setMode('verify');
        setOtpCode('');
        startCooldown();
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ── OTP Verification ──
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error } = await verifyOtp(pendingEmail, otpCode);
      if (error) {
        setError(error);
      } else {
        navigate('/timetable', { replace: true });
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccessMsg('');

    try {
      const { error } = await resendOtp(pendingEmail);
      if (error) {
        setError(error);
      } else {
        setSuccessMsg('验证码已重新发送，请查收邮箱');
        startCooldown();
      }
    } catch {
      setError('发送失败，请稍后重试');
    }
  };

  // ── Forgot password ──
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error);
      } else {
        setPendingEmail(email.trim().toLowerCase());
        setMode('forgot-password-verify');
        setOtpCode('');
        setSuccessMsg('验证码已发送，请查收邮箱');
        startCooldown();
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Verify Reset OTP ──
  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error } = await verifyOtp(pendingEmail, otpCode, 'recovery');
      if (error) {
        setError(error);
      } else {
        // Verification success! The user is now technically logged in via Supabase recovery flow.
        // We navigate them to the ResetPassword page where they can actually set the new password.
        navigate('/reset-password', { replace: true });
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };


  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
    setConfirmPassword('');
    setOtpCode('');
  };

  // ── Title & action label per mode ──
  const modeConfig = {
    login: { title: '登录', subtitle: '欢迎回来' },
    register: { title: '注册', subtitle: '创建你的账号' },
    verify: { title: '邮箱验证', subtitle: `验证码已发送至 ${pendingEmail}` },
    'forgot-password': { title: '忘记密码', subtitle: '输入邮箱以重置密码' },
    'forgot-password-verify': { title: '重置验证', subtitle: `验证码已发送至 ${pendingEmail}` },
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

        {/* ─── Login / Register Tab ─── */}
        {(mode === 'login' || mode === 'register') && (
          <div className="w-full max-w-sm mb-6">
            <div className="flex bg-white rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  mode === 'login'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => switchMode('register')}
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
        )}

        {/* ─── Verify / Forgot-Password header ─── */}
        {(mode === 'verify' || mode === 'forgot-password' || mode === 'forgot-password-verify') && (
          <div className="w-full max-w-sm mb-6">
            <button
              onClick={() => switchMode(mode === 'forgot-password-verify' ? 'forgot-password' : 'login')}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors mb-3"
            >
              <span className="material-symbols-outlined text-lg">arrow_back_ios_new</span>
              <span className="text-sm font-medium">返回登录</span>
            </button>
            <h2 className="text-xl font-bold text-slate-800">{modeConfig[mode].title}</h2>
            <p className="text-sm text-slate-400 mt-1">{modeConfig[mode].subtitle}</p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            LOGIN FORM
           ════════════════════════════════════════════════════════════ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">邮箱</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">mail</span>
                <input
                  id="email-input"
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
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  autoComplete="current-password"
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

            {/* Forgot password link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode('forgot-password')}
                className="text-sm text-primary font-medium hover:underline"
              >
                忘记密码？
              </button>
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
              id="auth-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>登录中...</span>
                </>
              ) : (
                <span>登录</span>
              )}
            </button>

            {/* Switch to register */}
            <p className="text-sm text-slate-400 text-center mt-4">
              还没有账号？
              <button onClick={() => switchMode('register')} className="text-primary font-bold ml-1 hover:underline">
                注册
              </button>
            </p>
          </form>
        )}

        {/* ════════════════════════════════════════════════════════════
            REGISTER FORM
           ════════════════════════════════════════════════════════════ */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4">
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
              <button onClick={() => switchMode('login')} className="text-primary font-bold ml-1 hover:underline">
                登录
              </button>
            </p>
          </form>
        )}

        {/* ════════════════════════════════════════════════════════════
            OTP VERIFICATION FORM
           ════════════════════════════════════════════════════════════ */}
        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="w-full max-w-sm space-y-4">
            {/* OTP illustration */}
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">verified</span>
              </div>
            </div>

            {/* OTP input */}
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">6位验证码</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">pin</span>
                <input
                  id="otp-input"
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtpCode(val);
                  }}
                  placeholder="输入验证码"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300 text-center text-lg tracking-[0.5em] font-mono"
                />
              </div>
            </div>

            {/* Success message */}
            {successMsg && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm py-3 px-4 rounded-xl border border-primary/20">
                <span className="material-symbols-outlined text-lg">check_circle</span>
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
              id="verify-submit-btn"
              type="submit"
              disabled={submitting || otpCode.length !== 6}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>验证中...</span>
                </>
              ) : (
                <span>验证并登录</span>
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="text-sm text-primary font-medium hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `${resendCooldown}s 后可重新发送` : '重新发送验证码'}
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════════════════════════
            FORGOT PASSWORD FORM
           ════════════════════════════════════════════════════════════ */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="w-full max-w-sm space-y-4">
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
        )}

        {/* ════════════════════════════════════════════════════════════
            FORGOT PASSWORD VERIFY FORM (OTP)
           ════════════════════════════════════════════════════════════ */}
        {mode === 'forgot-password-verify' && (
          <form onSubmit={handleVerifyReset} className="w-full max-w-sm space-y-4">
            {/* OTP illustration */}
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">lock_open</span>
              </div>
            </div>

            {/* OTP input */}
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">6位重置码</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">pin</span>
                <input
                  id="reset-otp-input"
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtpCode(val);
                  }}
                  placeholder="输入邮件验证码"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300 text-center text-lg tracking-[0.5em] font-mono"
                />
              </div>
            </div>

            {/* Success message */}
            {successMsg && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm py-3 px-4 rounded-xl border border-primary/20">
                <span className="material-symbols-outlined text-lg">check_circle</span>
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
              id="verify-reset-submit-btn"
              type="submit"
              disabled={submitting || otpCode.length !== 6}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>校验中...</span>
                </>
              ) : (
                <span>验证并设置新密码</span>
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="text-sm text-primary font-medium hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `${resendCooldown}s 后可重新发送` : '重新发送验证码'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-6">
        <p className="text-xs text-slate-300">NextClass © 2026</p>
      </div>
    </div>
  );
}
