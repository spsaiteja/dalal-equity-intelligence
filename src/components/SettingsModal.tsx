'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Shield,
  Users,
  UserPlus,
  Trash2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface PendingUserRecord {
  email: string;
  name: string;
  picture?: string;
  requestedAt: string;
}

interface ApprovedUserRecord {
  email: string;
  name: string;
  approvedAt: string;
  approvedBy: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onUpstoxStatusChange?: () => void;
  isAdmin?: boolean;
  userEmail?: string;
  onUsersUpdated?: () => void;
  initialTab?: 'gemini' | 'upstox' | 'access';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  onUpstoxStatusChange,
  isAdmin = false,
  userEmail,
  onUsersUpdated,
  initialTab = 'gemini',
}) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'upstox' | 'access'>(initialTab);

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
  const [upstoxAnalyticsToken, setUpstoxAnalyticsToken] = useState('');
  const [upstoxAuthMethod, setUpstoxAuthMethod] = useState<'analytics' | 'oauth'>('analytics');
  const [upstoxRedirectUri, setUpstoxRedirectUri] = useState('http://localhost:3000/api/upstox/callback');
  const [upstoxStatus, setUpstoxStatus] = useState<{
    isConnected: boolean;
    userName?: string | null;
    userId?: string | null;
    apiKeyMasked?: string | null;
    analyticsTokenMasked?: string | null;
    hasCredentials?: boolean;
    hasAnalyticsToken?: boolean;
    tokenType?: 'oauth' | 'analytics';
    isAnalyticsToken?: boolean;
    expiresAt?: string | null;
  } | null>(null);
  const [connectingUpstox, setConnectingUpstox] = useState(false);
  const [connectingAnalytics, setConnectingAnalytics] = useState(false);
  const [upstoxMessage, setUpstoxMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  // Access Management state (Admin only)
  const [pendingUsers, setPendingUsers] = useState<PendingUserRecord[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [preapproveInput, setPreapproveInput] = useState('');
  const [adminEmail, setAdminEmail] = useState('teja.sai42@gmail.com');
  const [accessMessage, setAccessMessage] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch Users for Admin
  const loadUsersList = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.success) {
        setPendingUsers(data.pendingUsers || []);
        setApprovedUsers(data.approvedUsers || []);
        if (data.adminEmail) setAdminEmail(data.adminEmail);
      }
    } catch (err) {
      console.error('Failed to load user access list:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setInputKey(apiKey || '');
      setTestResult(null);
      setUpstoxMessage(null);
      setAccessMessage(null);

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
      const userTokenKey = userEmail ? `dalal_upstox_token_${userEmail}` : 'dalal_upstox_token';
      const storedUserToken = typeof window !== 'undefined' ? localStorage.getItem(userTokenKey) : null;

      fetch('/api/upstox/auth', {
        headers: storedUserToken ? { 'x-upstox-token': storedUserToken } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUpstoxStatus({
              isConnected: data.isConnected,
              userName: data.user_name,
              userId: data.user_id,
              apiKeyMasked: data.apiKeyMasked,
              analyticsTokenMasked: data.analyticsTokenMasked,
              hasCredentials: data.hasCredentials,
              hasAnalyticsToken: data.hasAnalyticsToken || Boolean(storedUserToken),
              tokenType: data.tokenType,
              isAnalyticsToken: data.isAnalyticsToken || Boolean(storedUserToken),
              expiresAt: data.expires_at,
            });
            if (data.isAnalyticsToken || storedUserToken) {
              setUpstoxAuthMethod('analytics');
            } else if (data.hasCredentials) {
              setUpstoxAuthMethod('oauth');
            }
            if (data.redirectUri) {
              setUpstoxRedirectUri(data.redirectUri);
            }
          }
        })
        .catch((e) => console.error('Upstox status check error:', e));

      // Load Users if Admin
      if (isAdmin) {
        loadUsersList();
      }
    }
  }, [isOpen, apiKey, isAdmin, userEmail, loadUsersList]);

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

  // Connect via 1-Year Analytics Access Token (Instant 365-Day Validity)
  const handleConnectAnalytics = async () => {
    const token = upstoxAnalyticsToken.trim();
    if (!token) {
      setUpstoxMessage({
        success: false,
        message: 'Please paste your 1-Year Analytics Access Token from Upstox Developer portal.',
      });
      return;
    }

    setConnectingAnalytics(true);
    setUpstoxMessage(null);

    try {
      const res = await fetch('/api/upstox/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-upstox-token': token,
        },
        body: JSON.stringify({ analyticsToken: token }),
      });

      const data = await res.json();

      if (data.success) {
        // Save isolated token in user's browser localStorage
        const userTokenKey = userEmail ? `dalal_upstox_token_${userEmail}` : 'dalal_upstox_token';
        localStorage.setItem(userTokenKey, token);
        localStorage.setItem('dalal_upstox_token', token);

        setUpstoxMessage({
          success: true,
          message: `Connected successfully! 1-Year session active (User: ${data.user_name || data.user_id}).`,
        });
        setUpstoxAnalyticsToken('');
        if (onUpstoxStatusChange) onUpstoxStatusChange();

        // Refresh Upstox status
        const statusRes = await fetch('/api/upstox/auth', {
          headers: { 'x-upstox-token': token },
        });
        const statusData = await statusRes.json();
        if (statusData.success) {
          setUpstoxStatus({
            isConnected: statusData.isConnected,
            userName: statusData.user_name,
            userId: statusData.user_id,
            apiKeyMasked: statusData.apiKeyMasked,
            analyticsTokenMasked: statusData.analyticsTokenMasked,
            hasCredentials: statusData.hasCredentials,
            hasAnalyticsToken: true,
            tokenType: 'analytics',
            isAnalyticsToken: true,
            expiresAt: statusData.expires_at,
          });
        }
      } else {
        setUpstoxMessage({
          success: false,
          message: data.error || 'Failed to verify Upstox Analytics Token.',
        });
      }
    } catch (err: any) {
      setUpstoxMessage({
        success: false,
        message: err.message || 'Connection error. Please try again.',
      });
    } finally {
      setConnectingAnalytics(false);
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
      const userTokenKey = userEmail ? `dalal_upstox_token_${userEmail}` : 'dalal_upstox_token';
      localStorage.removeItem(userTokenKey);
      localStorage.removeItem('dalal_upstox_token');

      const res = await fetch('/api/upstox/auth', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUpstoxStatus((prev) => (prev ? { ...prev, isConnected: false, userName: null, userId: null } : null));
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

  // Admin Actions: Approve User
  const handleApproveUser = async (email: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', email, name }),
      });
      const data = await res.json();
      if (data.success) {
        setAccessMessage({ success: true, message: `Approved access for ${email}` });
        await loadUsersList();
        if (onUsersUpdated) onUsersUpdated();
      } else {
        setAccessMessage({ success: false, message: data.error || 'Failed to approve user' });
      }
    } catch (err: any) {
      setAccessMessage({ success: false, message: err.message || 'Error approving user' });
    }
  };

  // Admin Actions: Pre-approve email
  const handlePreapprove = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = preapproveInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setAccessMessage({ success: false, message: 'Please enter a valid email address.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preapprove', email }),
      });
      const data = await res.json();
      if (data.success) {
        setAccessMessage({ success: true, message: `Pre-approved access for ${email}` });
        setPreapproveInput('');
        await loadUsersList();
        if (onUsersUpdated) onUsersUpdated();
      } else {
        setAccessMessage({ success: false, message: data.error || 'Failed to pre-approve user' });
      }
    } catch (err: any) {
      setAccessMessage({ success: false, message: err.message || 'Error pre-approving user' });
    }
  };

  // Admin Actions: Revoke User
  const handleRevokeUser = async (email: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${email}?`)) return;

    try {
      const res = await fetch(`/api/auth/users?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setAccessMessage({ success: true, message: `Access revoked for ${email}` });
        await loadUsersList();
        if (onUsersUpdated) onUsersUpdated();
      } else {
        setAccessMessage({ success: false, message: data.error || 'Failed to revoke access' });
      }
    } catch (err: any) {
      setAccessMessage({ success: false, message: err.message || 'Error revoking user' });
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
              <h3 className="text-base font-bold text-white">System &amp; API Integrations</h3>
              <p className="text-xs text-surface-muted">Manage Gemini AI keys, Upstox Demat &amp; Access Controls</p>
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
        <div className="flex border-b border-surface-border bg-surface/50 px-5 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('gemini')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
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

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('access');
                loadUsersList();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'access'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-surface-muted hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 text-amber-400" />
              <span>Access Management</span>
              {pendingUsers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-black animate-pulse">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          )}
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
                      <span>Server API Key Active &amp; Ready</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                        .env.local
                      </span>
                    </div>
                    <p className="text-emerald-300/80 mt-1 leading-relaxed">
                      Your Gemini key is securely stored in your server environment (
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
                      <div className="font-bold text-emerald-300 flex items-center gap-2 text-xs flex-wrap">
                        <span>
                          {upstoxStatus.isAnalyticsToken
                            ? '1-Year Analytics Session Active'
                            : 'Upstox Live Session Active'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                          {upstoxStatus.userName || upstoxStatus.userId || 'Demat Linked'}
                        </span>
                        {upstoxStatus.isAnalyticsToken && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                            365 Days • Read-Only
                          </span>
                        )}
                      </div>
                      <p className="text-emerald-300/80 text-[11px] mt-1 leading-relaxed">
                        {upstoxStatus.isAnalyticsToken
                          ? 'Synchronizing live Demat holdings, buy average prices, and P&L with 1-year continuous validity.'
                          : 'DalalAI is synchronizing live Demat holdings, buy average prices, and real-time P&L directly from your Upstox account.'}
                      </p>
                      {upstoxStatus.expiresAt && (
                        <p className="text-[10px] text-surface-muted mt-1">
                          {upstoxStatus.isAnalyticsToken
                            ? `Valid until: ${new Date(upstoxStatus.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${Math.max(0, Math.round((new Date(upstoxStatus.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining)`
                            : `Session valid until: ${new Date(upstoxStatus.expiresAt).toLocaleTimeString()} (SEBI 24hr OAuth rule)`}
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
                      You are currently previewing an 8-holding institutional portfolio. Connect your personal 1-Year Analytics Token below. Your token is stored safely in your browser and never shared with other users.
                    </p>
                  </div>
                </div>
              )}

              {/* Method Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-surface-border text-xs">
                <button
                  type="button"
                  onClick={() => setUpstoxAuthMethod('analytics')}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    upstoxAuthMethod === 'analytics'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-surface-muted hover:text-white'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>1-Year Analytics Token (Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUpstoxAuthMethod('oauth')}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    upstoxAuthMethod === 'oauth'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-surface-muted hover:text-white'
                  }`}
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>Daily OAuth 2.0 (Full Trading)</span>
                </button>
              </div>

              {/* SECTION A: 1-YEAR ANALYTICS ACCESS TOKEN */}
              {upstoxAuthMethod === 'analytics' && (
                <div className="space-y-3 bg-surface border border-surface-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-white text-xs block">1-Year Analytics Access Token</span>
                      <p className="text-[11px] text-surface-muted mt-0.5">
                        Generated in your Upstox Developer App. Valid for <strong className="text-blue-400">365 days</strong> with read-only access to Demat holdings, positions, and live P&amp;L without daily login.
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0">
                      No Daily Login
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-surface-muted block mb-1">
                      Analytics Access Token
                    </label>
                    <input
                      type="password"
                      placeholder={
                        upstoxStatus?.analyticsTokenMasked
                          ? `Saved: ${upstoxStatus.analyticsTokenMasked}`
                          : 'Paste your Upstox 1-Year Analytics Access Token here...'
                      }
                      value={upstoxAnalyticsToken}
                      onChange={(e) => setUpstoxAnalyticsToken(e.target.value)}
                      className="w-full bg-surface-card border border-surface-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                    <div className="flex items-center justify-between text-[10px] text-surface-muted mt-1.5">
                      <span>Copied directly from developer.upstox.com app details.</span>
                      <a
                        href="https://developer.upstox.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-0.5 font-semibold"
                      >
                        Developer Portal <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={handleConnectAnalytics}
                      disabled={connectingAnalytics || !upstoxAnalyticsToken.trim()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {connectingAnalytics ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      <span>Verify &amp; Connect (365-Day Access)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION B: DAILY OAUTH 2.0 */}
              {upstoxAuthMethod === 'oauth' && (
                <div className="space-y-4">
                  {/* 3 Step Setup Guide */}
                  <div className="bg-surface border border-surface-border rounded-xl p-3.5 text-xs space-y-2">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>How to connect via Daily OAuth (SEBI compliant):</span>
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
                      <li>Log in to <span className="text-white font-mono">developer.upstox.com</span> and open your app</li>
                      <li>Paste the Redirect URL below into your app settings</li>
                      <li>Enter your <span className="text-white">API Key</span> &amp; <span className="text-white">API Secret</span> and click Authorize</li>
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
            </div>
          )}

          {/* TAB 3: ACCESS MANAGEMENT (ADMIN ONLY) */}
          {activeTab === 'access' && isAdmin && (
            <div className="space-y-5">
              {/* Admin Banner */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-amber-300 flex items-center gap-2">
                    <span>Terminal Gatekeeper Active</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      Zero DB Whitelist
                    </span>
                  </div>
                  <p className="text-amber-200/80 mt-1 leading-relaxed">
                    Master Administrator: <strong className="font-mono text-white">{adminEmail}</strong>.
                    Only users approved below can access the DalalAI screener and share your server-side Gemini API key.
                  </p>
                </div>
              </div>

              {/* Pre-Approve Email Form */}
              <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">Pre-Approve an Email Address</span>
                </div>
                <form onSubmit={handlePreapprove} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="colleague@example.com"
                    value={preapproveInput}
                    onChange={(e) => setPreapproveInput(e.target.value)}
                    className="flex-1 bg-surface-card border border-surface-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    Pre-Approve
                  </button>
                </form>
                <p className="text-[11px] text-surface-muted">
                  Pre-approved emails will instantly bypass the pending gate upon their first Google sign-in.
                </p>
              </div>

              {/* Access Status Message */}
              {accessMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    accessMessage.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {accessMessage.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{accessMessage.message}</span>
                </div>
              )}

              {/* SECTION: PENDING REQUESTS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Pending Requests ({pendingUsers.length})
                    </span>
                  </div>
                  <button
                    onClick={loadUsersList}
                    disabled={loadingUsers}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingUsers ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {pendingUsers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-surface border border-surface-border text-center text-xs text-surface-muted">
                    No pending approval requests. When new users attempt Google login, they will be listed here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingUsers.map((u) => (
                      <div
                        key={u.email}
                        className="p-3.5 rounded-xl bg-surface border border-amber-500/30 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          {u.picture ? (
                            <img
                              src={u.picture}
                              alt={u.name}
                              className="h-8 w-8 rounded-lg object-cover border border-surface-border"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-white">{u.name}</div>
                            <div className="text-[11px] text-surface-muted font-mono">{u.email}</div>
                            <div className="text-[10px] text-amber-400/80">
                              Requested {new Date(u.requestedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveUser(u.email, u.name)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRevokeUser(u.email)}
                            className="p-1.5 rounded-lg text-surface-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Reject Request"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: APPROVED USERS */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Authorized Users ({approvedUsers.length})
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* Master Admin Entry */}
                  <div className="p-3 rounded-xl bg-surface border border-surface-border flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Master Administrator</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black uppercase">
                          Permanent
                        </span>
                      </div>
                      <div className="text-[11px] text-surface-muted font-mono">{adminEmail}</div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold">Owner</span>
                  </div>

                  {approvedUsers.map((u) => {
                    const isMaster = u.email.toLowerCase() === adminEmail.toLowerCase();
                    if (isMaster) return null; // already shown above

                    return (
                      <div
                        key={u.email}
                        className="p-3 rounded-xl bg-surface border border-surface-border flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{u.name || u.email.split('@')[0]}</div>
                          <div className="text-[11px] text-surface-muted font-mono">{u.email}</div>
                          <div className="text-[10px] text-surface-muted">
                            Approved by {u.approvedBy} • {new Date(u.approvedAt).toLocaleDateString()}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeUser(u.email)}
                          className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-all"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
