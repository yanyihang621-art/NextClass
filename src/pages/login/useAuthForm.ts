import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export type AuthMode = 'login' | 'register' | 'verify' | 'forgot-password' | 'forgot-password-verify';

export function useAuthForm() {
  const navigate = useNavigate();
  const { signIn, signUp, verifyOtp, resendOtp, resetPassword, isOffline } = useAuth();

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

  // Store email used for registration/reset (for OTP verification)
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
      setError('无法连接到服务器，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

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
      setError('无法连接到服务器，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

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
      setError('无法连接到服务器，请检查网络连接');
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
      setError('无法连接到服务器，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error } = await verifyOtp(pendingEmail, otpCode, 'recovery');
      if (error) {
        setError(error);
      } else {
        navigate('/reset-password', { replace: true });
      }
    } catch {
      setError('无法连接到服务器，请检查网络连接');
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

  return {
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
    setError,
    successMsg,
    setSuccessMsg,
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
  };
}
