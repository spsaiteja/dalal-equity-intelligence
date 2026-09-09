'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Wallet,
  Copy,
  Check,
  Unplug,
  ArrowRight,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onUpstoxStatusChange?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  onUpstoxStatusChange,
}) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'upstox'>('gemini');

  // Gemini state
  const [inputKey, setInputKey] = useState(apiKey);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [serverKeyStatus, setServerKeyStatus] = useState<{
    hasServerKey: boolean;
    maskedServerKey: string | null;
    model?: string;
  } | null>(null);

  // Upstox state
  const [upstoxApiKey, setUpstoxApiKey] = useState('');
  const [upstoxApiSecret, setUpstoxApiSecret] = useState('');
  const [upstoxRedirectUri, setUpstoxRedirectUri] = useState('http://localhost:3000/api/upstox/callback');
  const [upstoxStatus, setUpstoxStatus] = useState<{
    isConnected: boolean;
    userName?: string | null;
    userId?: string | null;
    apiKeyMasked?: string | null;
    hasCredentials?: boolean;
    expiresAt?: string | null;
  } | null>(null);
  const [connectingUpstox, setConnectingUpstox] = useState(false);
  const [upstoxMessage, setUpstoxMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputKey(apiKey || '');
      setTestResult(null);
      setUpstoxMessage(null);

      // Check Gemini server key configuration
      fetch('/api/ai/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setServerKeyStatus({
              hasServerKey: data.hasServerKey,
              maskedServerKey: data.maskedServerKey,
              model: data.model,
            });
          }
        })
        .catch((e) => console.error('Gemini status check error:', e));

      // Check Upstox connection & credentials
      fetch('/api/upstox/auth')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUpstoxStatus({
              isConnected: data.isConnected,
              userName: data.user_name,
              userId: data.user_id,
              apiKeyMasked: data.apiKeyMasked,
              hasCredentials: data.hasCredentials,
              expiresAt: data.expires_at,
            });
            if (data.redirectUri) {
              setUpstoxRedirectUri(data.redirectUri);
            }
          }
        })
        .catch((e) => console.error('Upstox status check error:', e));
    }
  }, [isOpen, apiKey]);

  if (!isOpen) return null;

  // Save Gemini Key
  const handleSaveGeminiKey = () => {
    const trimmed = inputKey.trim();
    onSaveApiKey(trimmed);
    setTestResult({
      success: true,
      message: trimmed ? 'Browser override key saved!' : 'Custom key cleared. Using server environment key.',
    });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Test Gemini Connection
  const handleTestGeminiConnection = async () => {
    setTestingGemini(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputKey.trim() || undefined }),
      });
      const data = await res.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `${data.message} (${data.maskedKey || 'Key verified'})`,
        });
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed.' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error connecting to Gemini API.' });
    } finally {
      setTestingGemini(false);
    }
  };

  // Connect to Upstox (Save credentials & redirect to OAuth login)
  const handleConnectUpstox = async () => {
    if (!upstoxApiKey.trim() && !upstoxStatus?.apiKeyMasked) {
      setUpstoxMessage({ success: false, message: 'Please enter your Upstox API Key (Client ID).' });
      return;
    }

    setConnectingUpstox(true);
    setUpstoxMessage(null);

    try {
      const res = await fetch('/api/upstox/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: upstoxApiKey.trim() || undefined,
          apiSecret: upstoxApiSecret.trim() || undefined,
          redirectUri: upstoxRedirectUri.trim(),
        }),
      });
      const data = await res.json();

      if (data.success && data.loginUrl) {
        setUpstoxMessage({
          success: true,
          message: 'Redirecting to Upstox Secure Login...',
        });
        // Redirect user to Upstox OAuth portal
        window.location.href = data.loginUrl;
      } else {
        setUpstoxMessage({
          success: false,
          message: data.error || 'Failed to initiate Upstox login.',
        });
        setConnectingUpstox(false);
      }
    } catch {
      setUpstoxMessage({
        success: false,
        message: 'Network error connecting to Upstox auth service.',
      });
      setConnectingUpstox(false);
    }
  };

  // Disconnect Upstox Session
  const handleDisconnectUpstox = async () => {
    try {
      const res = await fetch('/api/upstox/auth', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUpstoxStatus((prev) => prev ? { ...prev, isConnected: false, userName: null, userId: null } : null);
        setUpstoxMessage({
          success: true,
          message: 'Upstox session disconnected. Portfolio returned to demo mode.',
        });
        if (onUpstoxStatusChange) onUpstoxStatusChange();
      }
    } catch {
      setUpstoxMessage({
        success: false,
        message: 'Failed to disconnect Upstox session.',
      });
    }
  };

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(upstoxRedirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">System & API Integrations</h3>
              <p className="text-xs text-surface-muted">Manage Gemini AI keys & Upstox Demat connectivity</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-muted hover:text-white hover:bg-surface transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-surface-border bg-surface/50 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('gemini')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'gemini'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-surface-muted hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span>Google Gemini AI</span>
            {serverKeyStatus?.hasServerKey && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upstox')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'upstox'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-surface-muted hover:text-white'
            }`}
          >
            <Wallet className="h-4 w-4 text-indigo-400" />
            <span>Upstox Brokerage</span>
            {upstoxStatus?.isConnected ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                LIVE
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                DEMO
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: GEMINI AI */}
          {activeTab === 'gemini' && (
            <div className="space-y-4">
              {/* Server Key Detected Banner */}
              {serverKeyStatus?.hasServerKey && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-300 flex items-center gap-2">
                      <span>Server API Key Active & Ready</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                        .env.local
                      </span>
                    </div>
                    <p className="text-emerald-300/80 mt-1 leading-relaxed">
                      Your Gemini key is securely stored in your local project (
                      <span className="font-mono text-emerald-200 font-bold">{serverKeyStatus.maskedServerKey}</span>
                      ). The 5-Agent Council and Screener access it automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* Key Input Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-surface-muted">
                    {serverKeyStatus?.hasServerKey ? 'Custom Browser Override (Optional)' : 'Google Gemini API Key'}
                  </label>
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => setInputKey('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline"
                    >
                      Clear Browser Key
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    placeholder={serverKeyStatus?.hasServerKey ? 'Using server key (.env.local)...' : 'AIzaSy...'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
                <p className="text-[11px] text-surface-muted mt-1.5">
                  {serverKeyStatus?.hasServerKey
                    ? 'Leave blank to use the active server key, or enter a different key to override it in this browser.'
                    : 'Enter your Google Gemini API key to activate the 5-Agent Council and Deep Dive analyses.'}
                </p>
              </div>

              {/* Test connection results */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Link to Google AI Studio */}
              <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">Need a Gemini key?</span>
                  <span className="text-surface-muted">Free with any Google account at AI Studio</span>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  onClick={handleTestGeminiConnection}
                  disabled={testingGemini || (!inputKey.trim() && !serverKeyStatus?.hasServerKey)}
                  className="px-4 py-2 rounded-xl border border-surface-border hover:border-surface-borderLight text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingGemini ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>

                <button
                  onClick={handleSaveGeminiKey}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPSTOX BROKERAGE */}
          {activeTab === 'upstox' && (
            <div className="space-y-4">
              {/* Connection Status Banner */}
              {upstoxStatus?.isConnected ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300 flex items-center gap-2 text-xs">
                        <span>Upstox Live Session Active</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                          {upstoxStatus.userName || upstoxStatus.userId || 'Demat Linked'}
                        </span>
                      </div>
                      <p className="text-emerald-300/80 text-[11px] mt-1 leading-relaxed">
                        DalalAI is synchronizing live Demat holdings, buy average prices, and real-time P&L directly from your Upstox account.
                      </p>
                      {upstoxStatus.expiresAt && (
                        <p className="text-[10px] text-surface-muted mt-1">
                          Session valid until: {new Date(upstoxStatus.expiresAt).toLocaleTimeString()} (SEBI 24hr OAuth rule)
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnectUpstox}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-surface border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                  <Wallet className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-blue-300 flex items-center gap-2">
                      <span>Demo Portfolio Mode Enabled</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30">
                        8 Institutional Stocks
                      </span>
                    </div>
                    <p className="text-blue-200/80 mt-1 leading-relaxed">
                      You are currently previewing an 8-holding institutional portfolio. Link your free Upstox developer credentials below to sync your real Demat holdings and trigger real-time AI Council Audits.
                    </p>
                  </div>
                </div>
              )}

              {/* 3 Step Setup Guide */}
              <div className="bg-surface border border-surface-border rounded-xl p-3.5 text-xs space-y-2">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>How to connect your Upstox account (SEBI compliant):</span>
                  <a
                    href="https://developer.upstox.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    <span>Developer Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <ol className="list-decimal list-inside text-surface-muted text-[11px] space-y-1">
                  <li>Log in to <span className="text-white font-mono">developer.upstox.com</span> and create a free app</li>
                  <li>Paste the Redirect URL below into your app settings</li>
                  <li>Copy your <span className="text-white">API Key</span> &amp; <span className="text-white">API Secret</span> here and click Connect</li>
                </ol>
              </div>

              {/* Redirect URI Field with Copy Button */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-surface-muted block mb-1.5">
                  Redirect URL (Must match your Upstox App)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={upstoxRedirectUri}
                    onChange={(e) => setUpstoxRedirectUri(e.target.value)}
                    className="flex-1 bg-surface border border-surface-border rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRedirect}
                    className="px-3 py-2 rounded-xl bg-surface border border-surface-border hover:border-surface-borderLight text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
                  >
                    {copiedUri ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedUri ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Upstox API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-surface-muted">
                    Upstox API Key (Client ID)
                  </label>
                  {upstoxStatus?.apiKeyMasked && (
                    <span className="text-[11px] text-surface-muted font-mono">
                      Saved: {upstoxStatus.apiKeyMasked}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={upstoxStatus?.apiKeyMasked ? 'Enter new key to update...' : 'e.g. 1a2b3c4d-5e6f-7a8b-9c0d...'}
                  value={upstoxApiKey}
                  onChange={(e) => setUpstoxApiKey(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              {/* Upstox API Secret */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-surface-muted block mb-1.5">
                  Upstox API Secret
                </label>
                <input
                  type="password"
                  placeholder={upstoxStatus?.hasCredentials ? '••••••••••••••••' : 'Enter your Upstox API secret'}
                  value={upstoxApiSecret}
                  onChange={(e) => setUpstoxApiSecret(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              {/* Status Message */}
              {upstoxMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    upstoxMessage.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {upstoxMessage.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                  <span>{upstoxMessage.message}</span>
                </div>
              )}

              {/* Connect / Authorize Button */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  onClick={handleConnectUpstox}
                  disabled={connectingUpstox}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {connectingUpstox ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  <span>{upstoxStatus?.isConnected ? 'Re-authorize Upstox Session' : 'Authorize & Connect Upstox'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
