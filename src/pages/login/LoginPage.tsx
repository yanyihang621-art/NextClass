import React from 'react';
import { useAuthForm } from './useAuthForm';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import OtpVerifyForm from './OtpVerifyForm';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function LoginPage() {
  const {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    otpCode,
    setOtpCode,
    error,
    successMsg,
    submitting,
    showPassword,
    setShowPassword,
    resendCooldown,
    pendingEmail,
    isOffline,
    handleLogin,
    handleRegister,
    handleVerify,
    handleResendOtp,
    handleForgotPassword,
    handleVerifyReset,
    switchMode,
  } = useAuthForm();

  const modeConfig = {
    login: { title: '登录', subtitle: '欢迎回来' },
    register: { title: '注册', subtitle: '创建你的账号' },
    verify: { title: '邮箱验证', subtitle: `验证码已发送至 ${pendingEmail}` },
    'forgot-password': { title: '忘记密码', subtitle: '输入邮箱以重置密码' },
    'forgot-password-verify': { title: '重置验证', subtitle: `验证码已发送至 ${pendingEmail}` },
  };

  return (
    <div className="min-h-screen bg-[#F7F7F9] font-body flex flex-col relative overflow-hidden">
      {/* 离线提示 */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs text-center py-2 font-medium shadow-sm z-10" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}>
          📡 当前无网络连接 · 登录需要网络支持
        </div>
      )}

      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[15%] w-[70%] h-[50%] bg-primary/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[5%] -right-[15%] w-[60%] h-[40%] bg-primary/3 rounded-full blur-[80px]"></div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 z-10">
        {/* Logo & title */}
        <div className="text-center mb-10">
          <img
            src="/icon.jpg"
            alt="NextClass Logo"
            className="w-20 h-20 rounded-[22px] mx-auto mb-5 shadow-lg shadow-primary/15 object-cover"
          />
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">NextClass</h1>
          <p className="text-slate-400 text-sm font-medium">大学生课表与日程管理</p>
        </div>

        {/* Tab switcher for Login / Register */}
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

        {/* Back / Title header for internal screens */}
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

        {/* Forms Routing */}
        {mode === 'login' && (
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            submitting={submitting}
            error={error}
            handleLogin={handleLogin}
            switchMode={switchMode}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            submitting={submitting}
            error={error}
            handleRegister={handleRegister}
            switchMode={switchMode}
          />
        )}

        {mode === 'verify' && (
          <OtpVerifyForm
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            successMsg={successMsg}
            error={error}
            submitting={submitting}
            resendCooldown={resendCooldown}
            handleSubmit={handleVerify}
            handleResendOtp={handleResendOtp}
            submitLabel="验证并登录"
            submittingLabel="验证中"
          />
        )}

        {mode === 'forgot-password' && (
          <ForgotPasswordForm
            email={email}
            setEmail={setEmail}
            successMsg={successMsg}
            error={error}
            submitting={submitting}
            handleSubmit={handleForgotPassword}
          />
        )}

        {mode === 'forgot-password-verify' && (
          <OtpVerifyForm
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            successMsg={successMsg}
            error={error}
            submitting={submitting}
            resendCooldown={resendCooldown}
            handleSubmit={handleVerifyReset}
            handleResendOtp={handleResendOtp}
            submitLabel="验证并设置新密码"
            submittingLabel="校验中"
          />
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-6 z-10">
        <p className="text-xs text-slate-300">NextClass © 2026</p>
      </div>
    </div>
  );
}
