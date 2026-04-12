import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  // 邮箱未验证拦截：用户存在但 email_confirmed_at 为空
  if (!user.email_confirmed_at) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
