import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isOffline } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F9]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400 font-medium">加载中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 离线模式下跳过邮箱验证检查（本地 session 可能没有最新的 email_confirmed_at）
  // 只有在线时才严格检查邮箱验证状态
  if (!isOffline && !user.email_confirmed_at) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {/* 离线状态提示条 */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-xs text-center py-1.5 font-medium shadow-sm" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.375rem)' }}>
          📡 离线模式 · 数据来自本地缓存
        </div>
      )}
      {children}
    </>
  );
}
