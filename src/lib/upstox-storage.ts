import fs from 'fs';
import path from 'path';
import { UpstoxSession } from '@/types/upstox';

export interface UpstoxConfig {
  apiKey?: string;
  apiSecret?: string;
  redirectUri?: string;
  analyticsToken?: string;
}

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'dalal_data');
  }
  return path.join(process.cwd(), 'data');
}

function getSessionFile() {
  return path.join(getDataDir(), 'upstox_session.json');
}

function getConfigFile() {
  return path.join(getDataDir(), 'upstox_config.json');
}

function ensureDataDir() {
  const dir = getDataDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('Warning: Could not create data dir:', err);
  }
}

export function getUpstoxConfig(): UpstoxConfig {
  ensureDataDir();
  const cfgFile = getConfigFile();
  try {
    if (fs.existsSync(cfgFile)) {
      const content = fs.readFileSync(cfgFile, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading upstox_config.json:', e);
  }

  // Fallback to process.env
  return {
    apiKey: process.env.UPSTOX_API_KEY || '',
    apiSecret: process.env.UPSTOX_API_SECRET || '',
    redirectUri: process.env.UPSTOX_REDIRECT_URI || 'http://localhost:3000/api/upstox/callback',
    analyticsToken: process.env.UPSTOX_ANALYTICS_TOKEN || '',
  };
}

export function saveUpstoxConfig(config: UpstoxConfig) {
  ensureDataDir();
  try {
    const current = getUpstoxConfig();
    const updated = {
      ...current,
      ...config,
    };
    fs.writeFileSync(getConfigFile(), JSON.stringify(updated, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving upstox_config.json:', e);
    return false;
  }
}

export function getUpstoxSession(): UpstoxSession | null {
  ensureDataDir();
  const sessFile = getSessionFile();
  try {
    if (!fs.existsSync(sessFile)) return null;
    const content = fs.readFileSync(sessFile, 'utf8');
    const session = JSON.parse(content) as UpstoxSession;

    // Check 24-hour expiration
    const expiry = new Date(session.expires_at).getTime();
    if (Date.now() > expiry) {
      return null;
    }

    return session;
  } catch (e) {
    console.error('Error reading upstox_session.json:', e);
    return null;
  }
}

export function saveUpstoxSession(session: UpstoxSession) {
  ensureDataDir();
  try {
    fs.writeFileSync(getSessionFile(), JSON.stringify(session, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving upstox_session.json:', e);
    return false;
  }
}

export function saveAnalyticsSession(
  token: string,
  profile: {
    user_id?: string;
    user_name?: string;
    email?: string;
    broker?: string;
  }
): UpstoxSession {
  ensureDataDir();
  // 365 days (1 full year) validity
  const oneYearExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const session: UpstoxSession = {
    access_token: token.trim(),
    user_id: profile.user_id || 'UPSTOX_USER',
    user_name: profile.user_name || 'Upstox Investor',
    email: profile.email || '',
    broker: profile.broker || 'Upstox',
    created_at: new Date().toISOString(),
    expires_at: oneYearExpiry,
    is_active: true,
    token_type: 'analytics',
    is_analytics_token: true,
  };

  saveUpstoxSession(session);
  saveUpstoxConfig({ analyticsToken: token.trim() });
  return session;
}

export function clearUpstoxSession() {
  ensureDataDir();
  const sessFile = getSessionFile();
  try {
    if (fs.existsSync(sessFile)) {
      fs.unlinkSync(sessFile);
    }
    return true;
  } catch (e) {
    console.error('Error clearing upstox_session.json:', e);
    return false;
  }
}

export function maskKey(key?: string): string {
  if (!key || key.length < 6) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-3)}`;
}

