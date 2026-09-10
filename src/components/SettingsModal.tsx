'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Activity,
  Smartphone,
  Monitor,
  Tablet,
  Zap,
  Search,
  Globe,
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

interface UserActivityItem {
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  firstSeenAt: string;
  lastActiveAt: string;
  totalVisits: number;
  deviceType?: 'Mobile' | 'Tablet' | 'Desktop';
  isOnline: boolean;
  status: 'online' | 'today' | 'offline';
  relativeTime: string;
}

interface ActivityStatsData {
  totalUsers: number;
  activeNow: number;
  activeToday: number;
  totalVisits: number;
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
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  // Access Management & Usage state (Admin only)
  const [pendingUsers, setPendingUsers] = useState<PendingUserRecord[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [preapproveInput, setPreapproveInput] = useState('');
  const [adminEmail, setAdminEmail] = useState('teja.sai42@gmail.com');
  const [accessMessage, setAccessMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [usageStats, setUsageStats] = useState<ActivityStatsData | null>(null);
  const [activityUsers, setActivityUsers] = useState<UserActivityItem[]>([]);
  const [usageSearchQuery, setUsageSearchQuery] = useState('');

  // Fetch Users and Usage Analytics for Admin
  const loadUsersList = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const [usersRes, usageRes] = await Promise.allSettled([
        fetch('/api/auth/users').then((r) => r.json()),
        fetch('/api/auth/usage').then((r) => r.json()),
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value?.success) {
        setPendingUsers(usersRes.value.pendingUsers || []);
        setApprovedUsers(usersRes.value.approvedUsers || []);
        if (usersRes.value.adminEmail) setAdminEmail(usersRes.value.adminEmail);
      }

      if (usageRes.status === 'fulfilled' && usageRes.value?.success) {
        setUsageStats(usageRes.value.stats || null);
        setActivityUsers(usageRes.value.users || []);
      }
    } catch (err) {
      console.error('Failed to load user access & usage list:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  // Compute filtered active/approved users for directory table
  const filteredUsersList = useMemo(() => {
    let list: UserActivityItem[] =
      activityUsers.length > 0
        ? [...activityUsers]
        : [
            {
              email: adminEmail,
              name: 'Master Admin',
              role: 'admin' as const,
              firstSeenAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              totalVisits: 1,
              deviceType: 'Desktop' as const,
              isOnline: true,
              status: 'online' as const,
              relativeTime: 'Just now',
            },
            ...approvedUsers
              .filter((u) => u.email.toLowerCase() !== adminEmail.toLowerCase())
              .map((u) => ({
                email: u.email,
                name: u.name || u.email.split('@')[0],
                role: 'user' as const,
                firstSeenAt: u.approvedAt,
                lastActiveAt: u.approvedAt,
                totalVisits: 0,
                deviceType: 'Desktop' as const,
                isOnline: false,
                status: 'offline' as const,
                relativeTime: new Date(u.approvedAt).toLocaleDateString(),
              })),
          ];

    if (usageSearchQuery.trim()) {
      const q = usageSearchQuery.toLowerCase();
      list = list.filter(
        (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activityUsers, approvedUsers, adminEmail, usageSearchQuery]);

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

  // Detect client's public static IP for easy 1-click whitelisting
  useEffect(() => {
    if (isOpen && activeTab === 'upstox' && !publicIp) {
      fetch('https://api.ipify.org?format=json')
        .then((r) => r.json())
        .then((d) => {
          if (d?.ip) setPublicIp(d.ip);
        })
        .catch(() => {});
    }
  }, [isOpen, activeTab, publicIp]);

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
      // Step A: Attempt server-side verification first
      const res = await fetch('/api/upstox/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-upstox-token': token,
        },
        body: JSON.stringify({ analyticsToken: token }),
      });

      let data = await res.json().catch(() => ({}));

      // Step B: If server verification is blocked by Upstox Static IP rule, seamlessly verify from browser!
      // Direct browser requests originate from the user's whitelisted home/broadband Static IP.
      if (!data.success && (data.isStaticIpError || data.requiresClientDirect || data.error?.includes('static IP'))) {
        try {
          const directRes = await fetch('https://api.upstox.com/v2/user/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
              'Api-Version': '2.0',
            },
          });
          const directData = await directRes.json().catch(() => ({}));

          if (directRes.ok && (directData?.status === 'success' || directData?.data)) {
            const verifiedProfile = directData.data || {};

            // Save verified session on server without re-triggering Upstox IP checks
            const saveRes = await fetch('/api/upstox/auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-upstox-token': token,
              },
              body: JSON.stringify({ analyticsToken: token, verifiedProfile }),
            });
            data = await saveRes.json().catch(() => ({}));
          } else {
            const directErrMsg =
              directData?.errors?.[0]?.message ||
              directData?.message ||
              '';
            const errorCode = directData?.errors?.[0]?.errorCode || directData?.errors?.[0]?.error_code;

            // When Static IP is updated in Upstox, Upstox automatically invalidates previous tokens!
            if (errorCode === 'UDAPI100050' || directErrMsg.toLowerCase().includes('invalid token')) {
              setUpstoxMessage({
                success: false,
                message: 'Fresh Token Required: Upstox automatically revoked your previous token when you updated your Static IP today. Please go to developer.upstox.com -> My Apps -> Analytics tab -> click "Generate Token", paste the new token below, and click Connect!',
              });
              return;
            }

            if (directErrMsg.includes('static IP') || errorCode === 'UDAPI100069') {
              setUpstoxMessage({
                success: false,
                message: `Static IP Required: Please whitelist your Public IP (${publicIp || 'shown above'}) in developer.upstox.com -> My Apps -> Primary Static IP. Once added, click Connect!`,
              });
              return;
            }

            setUpstoxMessage({
              success: false,
              message: directErrMsg || 'Direct browser verification rejected by Upstox. Please verify your token.',
            });
            return;
          }
        } catch (directErr: any) {
          console.warn('Direct browser Upstox verification error:', directErr);
          if (directErr.message?.toLowerCase().includes('invalid token')) {
            setUpstoxMessage({
              success: false,
              message: 'Fresh Token Required: Upstox revoked previous tokens when your Static IP changed. Please generate a new 1-Year Analytics Token at developer.upstox.com -> My Apps -> Analytics.',
            });
            return;
          }
          if (directErr.message?.includes('static IP')) {
            setUpstoxMessage({
              success: false,
              message: `Static IP Required: Please whitelist your Public IP (${publicIp || 'shown above'}) in developer.upstox.com -> My Apps -> Primary Static IP. (100% Free).`,
            });
            return;
          }
          setUpstoxMessage({
            success: false,
            message: directErr.message || 'Direct Upstox verification failed.',
          });
          return;
        }
      }

      if (data.success) {
        // Save isolated token in user's browser localStorage
        const userTokenKey = userEmail ? `dalal_upstox_token_${userEmail}` : 'dalal_upstox_token';
        localStorage.setItem(userTokenKey, token);
        localStorage.setItem('dalal_upstox_token', token);
        if (data.user_name || data.user_id) {
          localStorage.setItem('dalal_upstox_user_name', data.user_name || data.user_id);
        }

        setUpstoxMessage({
          success: true,
          message: `Connected successfully via whitelisted Static IP! 1-Year session active (User: ${data.user_name || data.user_id}).`,
        });
        setUpstoxAnalyticsToken('');
        if (onUpstoxStatusChange) onUpstoxStatusChange();

        // Refresh Upstox status
        const statusRes = await fetch('/api/upstox/auth', {
          headers: { 'x-upstox-token': token },
        });
        const statusData = await statusRes.json().catch(() => ({}));
        if (statusData.success) {
          setUpstoxStatus({
            isConnected: statusData.isConnected,
            userName: statusData.user_name || data.user_name,
            userId: statusData.user_id || data.user_id,
            apiKeyMasked: statusData.apiKeyMasked,
            analyticsTokenMasked: statusData.analyticsTokenMasked,
            hasCredentials: statusData.hasCredentials,
            hasAnalyticsToken: true,
            tokenType: 'analytics',
            isAnalyticsToken: true,
            expiresAt: statusData.expires_at || data.expires_at,
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
      <div className={`bg-surface-card border border-surface-border rounded-2xl w-full ${activeTab === 'access' ? 'max-w-3xl' : 'max-w-xl'} overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-all duration-200`}>
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
              <span>Access &amp; Usage</span>
              {usageStats?.activeNow ? (
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{usageStats.activeNow}</span>
                </span>
              ) : null}
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

                  {/* Free Static IP Whitelist helper */}
                  <div className="bg-surface-card border border-surface-border/80 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">Your Public Static IP:</span>
                          {publicIp ? (
                            <span className="font-mono text-emerald-300 font-bold text-xs bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                              {publicIp}
                            </span>
                          ) : (
                            <span className="text-[11px] text-surface-muted italic animate-pulse">Detecting IP...</span>
                          )}
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            100% Free
                          </span>
                        </div>
                        <p className="text-[11px] text-surface-muted mt-1 leading-relaxed">
                          Whitelist this IP in <a href="https://developer.upstox.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-semibold">developer.upstox.com &rarr; My Apps &rarr; Static IP</a>. Dalal AI verifies directly from your browser to match this IP for ₹0.
                        </p>
                      </div>
                    </div>

                    {publicIp && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(publicIp);
                          setCopiedIp(true);
                          setTimeout(() => setCopiedIp(false), 2000);
                        }}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-surface border border-surface-border hover:border-surface-borderLight text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        {copiedIp ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedIp ? 'Copied' : 'Copy IP'}</span>
                      </button>
                    )}
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

          {/* TAB 3: ACCESS & USAGE ANALYTICS (ADMIN ONLY) */}
          {activeTab === 'access' && isAdmin && (
            <div className="space-y-5">
              {/* Admin Banner */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-amber-300 flex items-center gap-2">
                      <span>Institutional Gatekeeper &amp; Telemetry</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                        Upstash Cloud Vault
                      </span>
                    </div>
                    <p className="text-amber-200/80 mt-1 leading-relaxed">
                      Master Administrator: <strong className="font-mono text-white">{adminEmail}</strong>.
                      Live active sessions and all-time user engagement are continuously tracked below.
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadUsersList}
                  disabled={loadingUsers}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0 transition-colors"
                  title="Refresh Telemetry"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingUsers ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* TOP 4 USAGE STATS CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-muted block">
                    Total Users
                  </span>
                  <div className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span>{usageStats?.totalUsers ?? (approvedUsers.length + 1)}</span>
                  </div>
                  <span className="text-[10px] text-surface-muted">All-Time Registered</span>
                </div>

                <div className="bg-surface border border-emerald-500/30 rounded-xl p-3 bg-emerald-500/5 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Online Right Now
                  </span>
                  <div className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <span>{usageStats?.activeNow ?? 1}</span>
                  </div>
                  <span className="text-[10px] text-emerald-300">Active &lt; 5m</span>
                </div>

                <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-muted block">
                    Active Today
                  </span>
                  <div className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span>{usageStats?.activeToday ?? 1}</span>
                  </div>
                  <span className="text-[10px] text-surface-muted">Logged in &lt; 24h</span>
                </div>

                <div className="bg-surface border border-surface-border rounded-xl p-3 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-muted block">
                    Total Sessions
                  </span>
                  <div className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
                    <Zap className="h-4 w-4 text-indigo-400" />
                    <span>{usageStats?.totalVisits ?? 1}</span>
                  </div>
                  <span className="text-[10px] text-surface-muted">Terminal Visits</span>
                </div>
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

              {/* SECTION: LIVE USER DIRECTORY & ACTIVITY */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      User Directory &amp; Live Activity ({filteredUsersList.length})
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="h-3 w-3 text-surface-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      value={usageSearchQuery}
                      onChange={(e) => setUsageSearchQuery(e.target.value)}
                      className="bg-surface border border-surface-border rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-white placeholder-surface-muted focus:outline-none focus:border-blue-500 w-48"
                    />
                  </div>
                </div>

                {/* Users List Table */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredUsersList.map((u) => {
                    const isMaster = u.email.toLowerCase() === adminEmail.toLowerCase();
                    return (
                      <div
                        key={u.email}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          u.isOnline
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : 'bg-surface border-surface-border'
                        }`}
                      >
                        {/* User Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {u.picture ? (
                            <img
                              src={u.picture}
                              alt={u.name}
                              className="h-8 w-8 rounded-lg object-cover border border-surface-border shrink-0"
                            />
                          ) : (
                            <div
                              className={`h-8 w-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                                isMaster
                                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                                  : 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                              }`}
                            >
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
                                {u.name || u.email.split('@')[0]}
                              </span>
                              {isMaster ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black uppercase">
                                  Owner
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                                  Approved
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-surface-muted font-mono truncate max-w-[180px] sm:max-w-[260px]">
                              {u.email}
                            </div>
                          </div>
                        </div>

                        {/* Telemetry & Device */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Live Status Badge */}
                          <div className="flex flex-col items-end text-right">
                            {u.isOnline ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Online</span>
                              </span>
                            ) : u.status === 'today' ? (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <span>Active Today</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-surface-muted">
                                <span className="h-1.5 w-1.5 rounded-full bg-surface-muted" />
                                <span>Offline</span>
                              </span>
                            )}
                            <span className="text-[10px] text-surface-muted">
                              {u.relativeTime || 'Recently'}
                            </span>
                          </div>

                          {/* Device & Visits Pill */}
                          <div className="hidden sm:flex flex-col items-end text-right">
                            <span className="text-[10px] text-surface-muted flex items-center gap-1">
                              {u.deviceType === 'Mobile' ? (
                                <Smartphone className="h-3 w-3 text-cyan-400" />
                              ) : u.deviceType === 'Tablet' ? (
                                <Tablet className="h-3 w-3 text-indigo-400" />
                              ) : (
                                <Monitor className="h-3 w-3 text-blue-400" />
                              )}
                              <span>{u.deviceType || 'Desktop'}</span>
                            </span>
                            <span className="text-[10px] text-surface-muted font-mono">
                              {u.totalVisits || 1} {u.totalVisits === 1 ? 'visit' : 'visits'}
                            </span>
                          </div>

                          {/* Revoke Action */}
                          {!isMaster && (
                            <button
                              onClick={() => handleRevokeUser(u.email)}
                              className="px-2 py-1 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-all ml-1"
                              title="Revoke access"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: PENDING REQUESTS */}
              <div className="space-y-2.5 pt-2 border-t border-surface-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Pending Approvals ({pendingUsers.length})
                    </span>
                  </div>
                </div>

                {pendingUsers.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-center text-xs text-surface-muted">
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

              {/* Pre-Approve Email Form */}
              <div className="bg-surface border border-surface-border rounded-xl p-3.5 space-y-2">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
