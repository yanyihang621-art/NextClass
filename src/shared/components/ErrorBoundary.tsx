import React, { Component } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F9] px-6 text-center font-body">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
            error_outline
          </span>
          <h1 className="text-xl font-bold text-slate-800 mb-2">应用出现了意外错误</h1>
          <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
