'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
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

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('dalal_pwa_dismissed');
    if (dismissed) return;

    // Detect mobile devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isMobileDevice = isIosDevice || isAndroidDevice || /mobile|tablet/.test(userAgent);

    setIsIos(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // On mobile devices, always show the prompt after a short delay
    if (isMobileDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 1200);

      // Also listen for native Chrome beforeinstallprompt event if available (HTTPS)
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // Desktop Chrome PWA listener
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
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="p-3.5 rounded-2xl bg-surface-card border border-blue-500/40 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600"></div>

        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-surface-muted hover:text-white transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Smartphone className="h-4 w-4" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white">Install DalalAI App</h3>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-surface-muted mt-0.5 leading-snug">
              Add to your home screen for full-screen view without browser tabs.
            </p>
          </div>
        </div>

        {/* Action Button depending on platform */}
        <div className="mt-2.5 pt-2 border-t border-surface-border">
          {deferredPrompt ? (
            /* Native Install Button (Chrome with prompt) */
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleDismiss}
                className="px-2.5 py-1 text-xs text-surface-muted hover:text-white"
              >
                Later
              </button>
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install App</span>
              </button>
            </div>
          ) : isIos ? (
            /* iOS Safari Instructions */
            <div className="flex items-center gap-1.5 text-[11px] text-blue-300 bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
              <span>Tap</span>
              <Share2 className="h-3.5 w-3.5 text-blue-400 shrink-0 inline" />
              <span>Share &rarr;</span>
              <span className="font-bold text-white flex items-center gap-1">
                <PlusSquare className="h-3.5 w-3.5" /> Add to Home Screen
              </span>
            </div>
          ) : (
            /* Android / Chrome Local Wi-Fi HTTP Instructions */
            <div className="flex items-center justify-between text-[11px] text-blue-300 bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
              <div className="flex items-center gap-1">
                <span>Tap Chrome</span>
                <MoreVertical className="h-3.5 w-3.5 text-blue-400 shrink-0 inline" />
                <span>menu &rarr;</span>
                <strong className="text-white font-semibold">Add to Home screen</strong>
              </div>
              <button
                onClick={handleDismiss}
                className="text-[10px] text-surface-muted hover:text-white underline ml-1"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
