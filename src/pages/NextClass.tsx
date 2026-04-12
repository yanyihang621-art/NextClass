import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getBeijingTime } from '../lib/timeUtils';

type DeleteStep = 'idle' | 'confirm1' | 'otp' | 'confirm2' | 'deleting' | 'done';

export default function NextClass() {
  const navigate = useNavigate();
  const { user, sendEmailOtp, verifyEmailOtp } = useAuth();

  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const menuItems = [
    { label: '联系我们', path: '#' },
    { label: '关于NextClass', path: '#' },
    { label: '个人信息收集清单', path: '#' },
    { label: '第三方信息共享清单', path: '#' },
    { label: '注销账号', path: '#', action: () => handleStartDelete() },
  ];

  const handleStartDelete = () => {
    setDeleteStep('confirm1');
    setOtpCode('');
    setErrorMsg('');
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleConfirm1 = async () => {
    if (!user?.email) return;
    setIsSubmitting(true);
    setErrorMsg('');
    const { error } = await sendEmailOtp(user.email);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error);
      return;
    }
    
    startResendCooldown();
    setDeleteStep('otp');
  };

  const handleResendOtp = async () => {
    if (!user?.email || resendCooldown > 0) return;
    setErrorMsg('');
    const { error } = await sendEmailOtp(user.email);
    if (error) {
      setErrorMsg(error);
    } else {
      startResendCooldown();
    }
  };

  const handleOtpSubmit = async () => {
    if (!user?.email || otpCode.length !== 6) return;
    setIsSubmitting(true);
    setErrorMsg('');

    const { error } = await verifyEmailOtp(user.email, otpCode);

    if (error) {
      setErrorMsg(error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setDeleteStep('confirm2');
    setErrorMsg('');
  };

  const handleFinalDelete = async () => {
    if (!user) return;
    setDeleteStep('deleting');
    setErrorMsg('');
    const uid = user.id;

    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) {
        console.error('Failed to delete account:', error);
        setErrorMsg(`注销失败: ${error.message}`);
        setDeleteStep('confirm2');
        return;
      }
      // Clear all localStorage
      localStorage.removeItem(`courses_${uid}`);
      localStorage.removeItem(`timetables_${uid}`);
      localStorage.removeItem('courses');
      localStorage.removeItem('timetables');
      await supabase.auth.signOut();
      setDeleteStep('done');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (e: any) {
      setErrorMsg(`注销失败: ${e.message}`);
      setDeleteStep('confirm2');
    }
  };

  const handleCancel = () => {
    setDeleteStep('idle');
    setOtpCode('');
    setErrorMsg('');
  };

  return (
    <div className="bg-[#F7F7F9] text-on-surface min-h-screen font-body">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#F7F7F9] sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors">
          <span className="material-symbols-outlined text-slate-800">arrow_back_ios_new</span>
        </button>
        <h3 className="text-lg font-bold">更多</h3>
        <div className="w-10"></div>
      </div>

      <main className="px-4 pt-2">
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left ${
                index !== menuItems.length - 1 ? 'border-b border-slate-50' : ''
              }`}
            >
              <span className={`text-[16px] ${item.label === '注销账号' ? 'text-primary' : 'text-slate-800'}`}>{item.label}</span>
              <span className="material-symbols-outlined text-slate-300">chevron_right</span>
            </button>
          ))}
        </section>
      </main>

      {/* Step 1: Initial Confirmation */}
      {deleteStep === 'confirm1' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary">warning</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">注销账号</h3>
            </div>
            <p className="text-slate-600 mb-2 leading-relaxed">确定要注销您的账号吗？</p>
            <p className="text-sm text-slate-400 mb-6">注销后，您的账号及所有课表、课程数据将被永久删除，且无法恢复。</p>
            {errorMsg && (
              <p className="text-sm text-primary bg-primary/10 rounded-lg px-3 py-2 mb-4">{errorMsg}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors">
                取消
              </button>
              <button onClick={handleConfirm1} className="px-6 py-2.5 bg-primary text-white rounded-full font-bold hover:bg-primary transition-colors">
                继续注销
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: OTP Verification */}
      {deleteStep === 'otp' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary">verified_user</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">安全验证</h3>
                <p className="text-xs text-slate-400">已向您的邮箱发送注销验证码</p>
              </div>
            </div>
            
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">pin</span>
              <input
                type="text"
                value={otpCode}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtpCode(val);
                }}
                onKeyDown={e => e.key === 'Enter' && otpCode.length === 6 && handleOtpSubmit()}
                placeholder="输入6位验证码"
                className="w-full bg-slate-100 border-none rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-primary text-center text-lg tracking-[0.5em] font-mono"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            
            {errorMsg && (
              <p className="text-sm text-primary bg-primary/10 rounded-lg px-3 py-2 mb-4">{errorMsg}</p>
            )}
            
            <div className="text-center mb-4">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendCooldown > 0 ? `${resendCooldown}s 后可重新发送` : '重新发送验证码'}
              </button>
            </div>
            
            <div className="flex justify-end gap-3 rounded-lg">
              <button onClick={handleCancel} className="flex-1 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors" disabled={isSubmitting}>
                取消
              </button>
              <button
                onClick={handleOtpSubmit}
                disabled={isSubmitting || otpCode.length !== 6}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '验证'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Final Confirmation */}
      {deleteStep === 'confirm2' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary">delete_forever</span>
              </div>
              <h3 className="text-lg font-bold text-primary">最终确认</h3>
            </div>
            <p className="text-slate-600 mb-2 leading-relaxed">您的身份已验证。</p>
            <p className="text-sm text-primary font-medium bg-primary/10 rounded-lg px-3 py-2.5 mb-6">
              ⚠️ 点击"确认注销"后，您的账号及所有课表、课程数据将被立即且永久删除。此操作无法撤销。
            </p>
            {errorMsg && (
              <p className="text-sm text-primary bg-primary/10 rounded-lg px-3 py-2 mb-4 border border-primary/20">{errorMsg}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors">
                取消
              </button>
              <button onClick={handleFinalDelete} className="px-6 py-2.5 bg-primary text-white rounded-full font-bold hover:brightness-110 transition-colors">
                确认注销
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleting In Progress */}
      {deleteStep === 'deleting' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-xs shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-700 font-bold">正在注销账号...</p>
            <p className="text-xs text-slate-400">请勿关闭页面</p>
          </div>
        </div>
      )}

      {/* Done */}
      {deleteStep === 'done' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-xs shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
            </div>
            <p className="text-slate-700 font-bold">账号已注销</p>
            <p className="text-xs text-slate-400">正在跳转到登录页...</p>
          </div>
        </div>
      )}
    </div>
  );
}
