import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CRITICAL UI ERROR BOUNDARY]', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-[#0a0a0a]">
          <div className="max-w-md w-full bg-[#121217] border border-red-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-extrabold text-white">
                {this.props.fallbackTitle || 'Došlo je do neočekivane greške u prikazu'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sistem je detektovao problem u učitavanju ove komponente. Molimo osvežite stranicu ili se vratite na početnu.
              </p>
              {this.state.error && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-left text-[11px] font-mono text-red-300 overflow-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Osveži Stranicu</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/10"
              >
                <Home className="w-4 h-4" />
                <span>Početna</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
