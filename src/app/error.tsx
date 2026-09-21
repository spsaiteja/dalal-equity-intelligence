'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Client-side error caught by DalalAI ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
        <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Temporary Interface Issue</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            DalalAI encountered a client-side rendering exception. All backend data, Demat linkages, and agent council routines remain intact.
          </p>
        </div>
        {error?.message && (
          <div className="text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-rose-300 text-left overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-purple-600/30"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/';
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2 transition-colors border border-slate-700"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Reload Terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
}

