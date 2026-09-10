'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, ShieldAlert, LogOut } from 'lucide-react';

interface InactivityTrackerProps {
  enabled?: boolean;
  timeoutMinutes?: number; // default 30
  warningSeconds?: number; // default 120 (2 minutes)
}

const STORAGE_KEY = 'dalal_last_activity_ts';

export const InactivityTracker: React.FC<InactivityTrackerProps> = ({
  enabled = true,
  timeoutMinutes = 30,
  warningSeconds = 120,
}) => {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningSeconds * 1000;

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningSeconds);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const lastEventThrottleRef = useRef<number>(Date.now());
  const isExecutingLogoutRef = useRef<boolean>(false);

  // Read the latest activity timestamp from localStorage or default to now
  const getLastActivityTime = useCallback((): number => {
    if (typeof window === 'undefined') return Date.now();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return Date.now();
  }, []);

  // Update activity timestamp in localStorage
  const updateActivity = useCallback(
    (force = false) => {
      const now = Date.now();
      // Throttle event firing to once every 4 seconds unless forced
      if (!force && now - lastEventThrottleRef.current < 4000) {
        return;
      }
      lastEventThrottleRef.current = now;

      try {
        localStorage.setItem(STORAGE_KEY, now.toString());
      } catch {}

      if (showWarning) {
        setShowWarning(false);
      }
    },
    [showWarning]
  );

  // Perform automatic logout when 30 minutes is reached
  const executeAutoLogout = useCallback(async () => {
    if (isExecutingLogoutRef.current) return;
    isExecutingLogoutRef.current = true;
    setIsLoggingOut(true);

    try {
      localStorage.removeItem(STORAGE_KEY);
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Inactivity logout error:', err);
    } finally {
      const message = encodeURIComponent(
        `Session expired due to ${timeoutMinutes} minutes of inactivity. Please sign in again.`
      );
      window.location.href = `/?auth=timeout&reason=${message}`;
    }
  }, [timeoutMinutes]);

  // Set initial activity timestamp on mount
  useEffect(() => {
    if (!enabled) return;
    updateActivity(true);
  }, [enabled, updateActivity]);

  // Listen to user interaction events across the window
  useEffect(() => {
    if (!enabled) return;

    const handleUserActivity = () => {
      updateActivity(false);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Multi-tab synchronization: if another tab reports activity, dismiss warning here
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setShowWarning(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [enabled, updateActivity]);

  // Main countdown & timeout ticker (runs every 1 second)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (isExecutingLogoutRef.current) return;

      const now = Date.now();
      const lastActive = getLastActivityTime();
      const idleTime = now - lastActive;

      // 1. Inactivity limit reached (30 minutes) -> Logout directly
      if (idleTime >= timeoutMs) {
        executeAutoLogout();
        return;
      }

      // 2. Inactivity warning period (last 2 minutes) -> Show countdown
      const remainingMs = timeoutMs - idleTime;
      if (idleTime >= timeoutMs - warningMs) {
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
        setSecondsRemaining(remainingSec);
        setShowWarning(true);
      } else {
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, timeoutMs, warningMs, getLastActivityTime, executeAutoLogout, showWarning]);

  if (!enabled || !showWarning) {
    return null;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface-card border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden text-center">
        {/* Top Warning Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 animate-pulse" />

        {/* Icon & Heading */}
        <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <ShieldAlert className="h-6 w-6 animate-bounce" />
        </div>

        <h3 className="text-lg font-black text-white tracking-tight">
          Session Inactivity Warning
        </h3>
        <p className="text-xs text-surface-muted mt-1.5 leading-relaxed">
          You have been idle for {timeoutMinutes - Math.ceil(warningSeconds / 60)} minutes. To protect your broker integration and terminal security, you will be automatically logged out in:
        </p>

        {/* Live Countdown Display */}
        <div className="my-5 p-4 rounded-xl bg-surface border border-amber-500/30 flex items-center justify-center gap-3">
          <Clock className="h-5 w-5 text-amber-400 animate-spin" />
          <span className="font-mono text-3xl font-black tracking-widest text-amber-300">
            {formattedCountdown}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => updateActivity(true)}
            disabled={isLoggingOut}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            Stay Signed In
          </button>

          <button
            onClick={executeAutoLogout}
            disabled={isLoggingOut}
            className="w-full py-2.5 px-4 rounded-xl bg-surface border border-surface-border hover:border-surface-borderLight text-surface-muted hover:text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{isLoggingOut ? 'Logging out...' : 'Sign Out Now'}</span>
          </button>
        </div>

        <p className="text-[10px] text-surface-muted/80 mt-4">
          Any mouse movement or keypress will automatically keep your session active.
        </p>
      </div>
    </div>
  );
};

