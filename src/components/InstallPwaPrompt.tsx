'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone app mode (installed)
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check if previously dismissed in this session
    const dismissed = sessionStorage.getItem('dalal_pwa_dismissed');
    if (dismissed) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      // Show prompt after a slight delay on iOS
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for Chrome/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('dalal_pwa_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <aside
      aria-label="Install mobile app prompt"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="p-4 rounded-2xl bg-surface-card border border-blue-500/40 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600"></div>

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-surface-muted hover:text-white transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white">Install DalalAI App</h3>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-surface-muted mt-0.5 leading-snug">
              Install to your home screen for instant fullscreen access with zero browser bars.
            </p>
          </div>
        </div>

        {/* Action Button: Android/Desktop vs iOS Safari Instructions */}
        <div className="mt-3 pt-2.5 border-t border-surface-border">
          {isIos ? (
            <div className="flex items-center gap-2 text-[11px] text-blue-300 bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
              <span>Tap</span>
              <Share2 className="h-3.5 w-3.5 text-blue-400 shrink-0 inline" />
              <span>Share and select</span>
              <span className="font-bold text-white flex items-center gap-1">
                <PlusSquare className="h-3.5 w-3.5" /> Add to Home Screen
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-surface-muted hover:text-white transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install App</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

