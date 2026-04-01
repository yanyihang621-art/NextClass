import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getBeijingTime } from '../lib/timeUtils';

type DeleteStep = 'idle' | 'confirm1' | 'password' | 'confirm2' | 'deleting' | 'done';

interface DeletionLimits {
  date: string;
  attempts: number;
}

function getBeijingDateStr(): string {
  const bjNow = getBeijingTime();
  const y = bjNow.getFullYear();
  const m = String(bjNow.getMonth() + 1).padStart(2, '0');
  const d = String(bjNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDeletionLimits(userId: string): DeletionLimits {
  const key = `account_deletion_limits_${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { date: getBeijingDateStr(), attempts: 0 };
}

function saveDeletionLimits(userId: string, limits: DeletionLimits) {
  localStorage.setItem(`account_deletion_limits_${userId}`, JSON.stringify(limits));
}

export default function NextClass() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);

  const menuItems = [
    { label: '联系我们', path: '#' },
    { label: '关于NextClass', path: '#' },
    { label: '个人信息收集清单', path: '#' },
    { label: '第三方信息共享清单', path: '#' },
    { label: '注销账号', path: '#', action: () => handleStartDelete() },
    { label: '退出登录', path: '#' },
  ];

  const handleStartDelete = () => {
    setDeleteStep('confirm1');
    setPassword('');
    setErrorMsg('');
  };

  const handleConfirm1 = () => {
    if (!user) return;
    const todayStr = getBeijingDateStr();
    const limits = getDeletionLimits(user.id);
    if (limits.date !== todayStr) {
      limits.date = todayStr;
      limits.attempts = 0;
      saveDeletionLimits(user.id, limits);
    }
    if (limits.attempts >= 5) {
      setErrorMsg('今日密码验证次数已用尽，请明天再试');
      return;
    }
    setRemainingAttempts(5 - limits.attempts);
    setDeleteStep('password');
    setErrorMsg('');
    setPassword('');
  };

  const handlePasswordSubmit = async () => {
    if (!user?.email || !password) return;
    setIsSubmitting(true);
    setErrorMsg('');

    const todayStr = getBeijingDateStr();
    const limits = getDeletionLimits(user.id);
    if (limits.date !== todayStr) {
      limits.date = todayStr;
      limits.attempts = 0;
    }
    if (limits.attempts >= 5) {
      setErrorMsg('今日密码验证次数已用尽，请明天再试');
      setIsSubmitting(false);
      return;
    }

    // Verify password by re-authenticating
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (error) {
      limits.attempts += 1;
      saveDeletionLimits(user.id, limits);
      const left = 5 - limits.attempts;
      setRemainingAttempts(left);
      if (left <= 0) {
        setErrorMsg('今日密码验证次数已用尽，请明天再试');
      } else {
        setErrorMsg(`密码错误，今日还剩 ${left} 次机会`);
      }
      setPassword('');
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
      localStorage.removeItem(`account_deletion_limits_${uid}`);
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
    setPassword('');
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
              <span className={`text-[16px] ${item.label === '注销账号' ? 'text-rose-500' : 'text-slate-800'}`}>{item.label}</span>
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
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-rose-500">warning</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">注销账号</h3>
            </div>
            <p className="text-slate-600 mb-2 leading-relaxed">确定要注销您的账号吗？</p>
            <p className="text-sm text-slate-400 mb-6">注销后，您的账号及所有课表、课程数据将被永久删除，且无法恢复。</p>
            {errorMsg && (
              <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2 mb-4">{errorMsg}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors">
                取消
              </button>
              <button onClick={handleConfirm1} className="px-6 py-2.5 bg-rose-500 text-white rounded-full font-bold hover:bg-rose-600 transition-colors">
                继续注销
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Password Verification */}
      {deleteStep === 'password' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-amber-600">lock</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">身份验证</h3>
                <p className="text-xs text-slate-400">请输入当前账号的密码以确认身份</p>
              </div>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="请输入密码"
              className="w-full bg-slate-100 border-none rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-amber-400 mb-3 text-sm"
              autoFocus
              disabled={isSubmitting || remainingAttempts <= 0}
            />
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400">今日剩余 {remainingAttempts} 次验证机会</p>
            </div>
            {errorMsg && (
              <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2 mb-4">{errorMsg}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors" disabled={isSubmitting}>
                取消
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={isSubmitting || !password || remainingAttempts <= 0}
                className="px-6 py-2.5 bg-amber-500 text-white rounded-full font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                验证
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
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-rose-600">delete_forever</span>
              </div>
              <h3 className="text-lg font-bold text-rose-600">最终确认</h3>
            </div>
            <p className="text-slate-600 mb-2 leading-relaxed">您的身份已验证。</p>
            <p className="text-sm text-rose-500 font-medium bg-rose-50 rounded-lg px-3 py-2.5 mb-6">
              ⚠️ 点击"确认注销"后，您的账号及所有课表、课程数据将被立即且永久删除。此操作无法撤销。
            </p>
            {errorMsg && (
              <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2 mb-4 border border-rose-200">{errorMsg}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors">
                取消
              </button>
              <button onClick={handleFinalDelete} className="px-6 py-2.5 bg-rose-600 text-white rounded-full font-bold hover:bg-rose-700 transition-colors">
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
            <div className="w-12 h-12 border-3 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-700 font-bold">正在注销账号...</p>
            <p className="text-xs text-slate-400">请勿关闭页面</p>
          </div>
        </div>
      )}

      {/* Done */}
      {deleteStep === 'done' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-xs shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
            </div>
            <p className="text-slate-700 font-bold">账号已注销</p>
            <p className="text-xs text-slate-400">正在跳转到登录页...</p>
          </div>
        </div>
      )}
    </div>
  );
}
