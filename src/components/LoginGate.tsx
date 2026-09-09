'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  Shield,
  Clock,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Users,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface AuthSessionData {
  authenticated: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    role: 'admin' | 'user';
  } | null;
  hasGoogleConfig?: boolean;
  adminEmail?: string;
}

interface LoginGateProps {
  session: AuthSessionData | null;
  onRefreshSession: () => Promise<void>;
}

export const LoginGate: React.FC<LoginGateProps> = ({ session, onRefreshSession }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [devLoggingIn, setDevLoggingIn] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshSession();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
      window.location.reload();
    }
  };

  const handleDevLogin = async (role: 'admin' | 'user') => {
    setDevLoggingIn(true);
    setDevError(null);
    try {
      const email = role === 'admin'
        ? (session?.adminEmail || 'teja.sai42@gmail.com')
        : 'guest.investor@dalalai.test';
      const name = role === 'admin' ? 'Master Admin' : 'Guest Investor';

      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      });

      const data = await res.json();
      if (data.success) {
        await onRefreshSession();
      } else {
        setDevError(data.error || 'Dev login failed');
      }
    } catch (err: any) {
      setDevError(err.message || 'Dev login network error');
    } finally {
      setDevLoggingIn(false);
    }
  };

  const isPending = session?.authenticated && !session.isApproved;

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between selection:bg-blue-500/20 selection:text-blue-300">
      {/* Top Brand Bar */}
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">
                Dalal<span className="text-market-blue">AI</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Institutional Terminal
              </span>
            </div>
            <p className="text-[11px] text-surface-muted hidden sm:block">
              NSE / BSE Screener &amp; Multi-Agent Intelligence
            </p>
          </div>
        </div>

        {session?.authenticated && (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-surface-border text-surface-muted hover:text-white hover:border-rose-500/40 hover:bg-rose-500/10 text-xs font-semibold transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </header>

      {/* Main Center Stage */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-lg">
          {isPending ? (
            /* STATE 2: AUTHENTICATED BUT PENDING APPROVAL */
            <div className="bg-surface-card border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400"></div>

              {/* User Avatar & Info */}
              <div className="flex items-center gap-4 pb-6 border-b border-surface-border">
                {session.user?.picture ? (
                  <img
                    src={session.user.picture}
                    alt={session.user.name}
                    className="h-14 w-14 rounded-2xl border-2 border-amber-500/40 object-cover shadow-md"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-xl flex items-center justify-center shadow-md">
                    {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {session.user?.name || 'Investor'}
                  </h3>
                  <p className="text-xs text-surface-muted font-mono">{session.user?.email}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                    <Clock className="h-3 w-3 animate-pulse text-amber-400" />
                    <span>Access Pending Administrator Approval</span>
                  </div>
                </div>
              </div>

              {/* Explanation Card */}
              <div className="py-6 space-y-3 text-xs text-surface-muted leading-relaxed">
                <p>
                  Welcome to <strong className="text-white">DalalAI Institutional Terminal</strong>.
                  To protect proprietary quantitative models and institutional API quotas, new accounts require one-time approval from the terminal administrator.
                </p>
                <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Shield className="h-4 w-4 text-amber-400" />
                    <span>Terminal Administrator:</span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 font-mono">
                    {session.adminEmail || 'teja.sai42@gmail.com'}
                  </p>
                  <p className="text-[11px] text-surface-muted pt-1">
                    Your Google account verification request has been logged. Once the administrator approves your email, you will gain full access to the screener, 5-Agent Council, and portfolio sync.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Checking Approval Status...' : 'Check Approval Status'}</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface border border-surface-border hover:border-surface-borderLight text-surface-muted hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Switch Google Account</span>
                </button>
              </div>
            </div>
          ) : (
            /* STATE 1: NOT AUTHENTICATED */
            <div className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600"></div>

              {/* Header Badge */}
              <div className="text-center space-y-2 pb-6 border-b border-surface-border">
                <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shadow-inner">
                  <Lock className="h-7 w-7 text-blue-400" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Institutional Access Portal
                </h2>
                <p className="text-xs text-surface-muted max-w-sm mx-auto leading-relaxed">
                  Sign in with your authorized Google identity to enter the DalalAI Equity Intelligence Terminal.
                </p>
              </div>

              {/* Terminal Highlights */}
              <div className="py-6 grid grid-cols-1 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-surface border border-surface-border flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">5-Agent AI Deliberation</h4>
                    <p className="text-[11px] text-surface-muted">CIO, Fundamentalist, Technical Sentinel, News Scout &amp; Risk Guardian</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-surface-border flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Zero-Storage Broker Isolation</h4>
                    <p className="text-[11px] text-surface-muted">Connect your own Upstox Demat token securely in your browser</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-surface-border flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Live NSE &amp; BSE Analytics</h4>
                    <p className="text-[11px] text-surface-muted">500+ Indian equities screened with real-time technical indicators</p>
                  </div>
                </div>
              </div>

              {/* Sign In Primary Action */}
              <div className="space-y-3 pt-2">
                <a
                  href="/api/auth/google"
                  className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {/* Google G Logo SVG */}
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </a>

                {/* Local Dev Mode & Quick Login Bypass */}
                {(!session?.hasGoogleConfig || process.env.NODE_ENV === 'development') && (
                  <div className="mt-5 pt-5 border-t border-surface-border">
                    <div className="flex items-center justify-between text-[11px] text-surface-muted mb-2.5">
                      <span className="font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Localhost Dev Mode
                      </span>
                      <span>Test Auth States</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDevLogin('admin')}
                        disabled={devLoggingIn}
                        className="py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                        <span>Login as Admin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDevLogin('user')}
                        disabled={devLoggingIn}
                        className="py-2 px-3 rounded-lg bg-surface hover:bg-surface/80 border border-surface-border text-surface-muted hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Login as Guest</span>
                      </button>
                    </div>

                    {devError && (
                      <p className="text-[11px] text-rose-400 mt-2 text-center">{devError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-surface/50 py-4 px-6 text-center text-xs text-surface-muted flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>DalalAI Equity Intelligence Terminal</span>
          <span className="text-surface-borderLight">•</span>
          <span>Encrypted Session Storage</span>
        </div>
        <div className="text-[11px]">
          Master Administrator: <span className="font-mono text-white">{session?.adminEmail || 'teja.sai42@gmail.com'}</span>
        </div>
      </footer>
    </div>
  );
};

