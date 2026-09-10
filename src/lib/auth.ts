import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { isVaultConfigured, readVaultFile, writeVaultFile } from './drive-vault';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  isApproved: boolean;
}

export interface ApprovedUserRecord {
  email: string;
  name: string;
  approvedAt: string;
  approvedBy: string;
}

export interface PendingUserRecord {
  email: string;
  name: string;
  picture?: string;
  requestedAt: string;
}

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'dalal_data');
  }
  return path.join(process.cwd(), 'data');
}

function getApprovedUsersFile() {
  return path.join(getDataDir(), 'approved_users.json');
}

function getPendingUsersFile() {
  return path.join(getDataDir(), 'pending_users.json');
}

export const AUTH_COOKIE_NAME = 'dalal_auth_session';
export const APPROVAL_PASS_COOKIE = 'dalal_approval_pass';
const VAULT_ACCESS_FILE = 'dalal_access_records.json';
let isVaultAccessSynced = false;

// Sign an approval pass tied to a specific email (1-Year Validity)
export function signApprovalPass(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const payload = {
    email: cleanEmail,
    approved: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 365 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

// Verify approval pass for a specific email
export function verifyApprovalPass(token?: string | null, email?: string | null): boolean {
  if (!token || !email || !token.includes('.')) return false;
  try {
    const [payloadB64, signature] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', getAuthSecret())
      .update(payloadB64)
      .digest('base64url');
    if (signature !== expectedSig) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;
    return payload.email === email.trim().toLowerCase() && payload.approved === true;
  } catch {
    return false;
  }
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

// Master Admin Email
export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || 'teja.sai42@gmail.com').trim().toLowerCase();
}

// Auth Secret for Signing Session Cookies
function getAuthSecret(): string {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }
  if (process.env.GOOGLE_CLIENT_SECRET || process.env.GEMINI_API_KEY) {
    return `dalal_sec_${process.env.GOOGLE_CLIENT_SECRET || ''}_${process.env.GEMINI_API_KEY || ''}`;
  }
  return 'dalal-ai-terminal-secure-secret-key-2026-production';
}

// Check if an email is the Master Admin
export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getAdminEmail();
}

/**
 * Synchronizes approved and pending users from Google Drive Vault.
 * Ensures cold-started serverless functions have the latest user access records.
 */
export async function syncAccessRecordsFromVault(force = false): Promise<void> {
  if (!isVaultConfigured()) return;
  if (isVaultAccessSynced && !force) return;

  try {
    const raw = await readVaultFile(VAULT_ACCESS_FILE);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.approved)) {
        const localApproved = getApprovedUsers();
        for (const item of data.approved) {
          if (item?.email && !localApproved.some((a) => a.email.toLowerCase() === item.email.toLowerCase())) {
            localApproved.push(item);
          }
        }
        saveApprovedUsers(localApproved, false);
      }

      if (Array.isArray(data.pending)) {
        const localPending = getPendingUsers();
        for (const item of data.pending) {
          if (item?.email && !localPending.some((p) => p.email.toLowerCase() === item.email.toLowerCase())) {
            localPending.push(item);
          }
        }
        savePendingUsers(localPending, false);
      }
    }
    isVaultAccessSynced = true;
  } catch (err) {
    console.warn('Could not sync access records from Drive Vault:', err);
  }
}

/**
 * Saves access records to the Google Drive Vault so approvals persist forever.
 */
export async function syncAccessRecordsToVault(): Promise<boolean> {
  if (!isVaultConfigured()) return false;
  try {
    const payload = {
      approved: getApprovedUsers(),
      pending: getPendingUsers(),
      updatedAt: new Date().toISOString(),
    };
    return await writeVaultFile(VAULT_ACCESS_FILE, JSON.stringify(payload, null, 2), 'application/json');
  } catch (err) {
    console.warn('Could not sync access records to Drive Vault:', err);
    return false;
  }
}

// Read Approved Users
export function getApprovedUsers(): ApprovedUserRecord[] {
  ensureDataDir();
  const records: ApprovedUserRecord[] = [];
  const approvedFile = getApprovedUsersFile();

  try {
    if (fs.existsSync(approvedFile)) {
      const content = fs.readFileSync(approvedFile, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        records.push(...parsed);
      }
    }
  } catch (err) {
    console.error('Error reading approved_users.json:', err);
  }

  // Also include ALLOWED_EMAILS from environment variables
  const envAllowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const email of envAllowed) {
    if (!records.some((r) => r.email.toLowerCase() === email)) {
      records.push({
        email,
        name: email.split('@')[0],
        approvedAt: new Date().toISOString(),
        approvedBy: 'ENV_CONFIG',
      });
    }
  }

  return records;
}

// Save Approved Users
function saveApprovedUsers(records: ApprovedUserRecord[], triggerVaultSync = true) {
  ensureDataDir();
  try {
    fs.writeFileSync(getApprovedUsersFile(), JSON.stringify(records, null, 2), 'utf8');
    if (triggerVaultSync) {
      syncAccessRecordsToVault().catch(() => {});
    }
    return true;
  } catch (err) {
    console.error('Error saving approved_users.json:', err);
    return false;
  }
}

// Read Pending Users
export function getPendingUsers(): PendingUserRecord[] {
  ensureDataDir();
  const pendingFile = getPendingUsersFile();
  try {
    if (fs.existsSync(pendingFile)) {
      const content = fs.readFileSync(pendingFile, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading pending_users.json:', err);
  }
  return [];
}

// Save Pending Users
function savePendingUsers(records: PendingUserRecord[], triggerVaultSync = true) {
  ensureDataDir();
  try {
    fs.writeFileSync(getPendingUsersFile(), JSON.stringify(records, null, 2), 'utf8');
    if (triggerVaultSync) {
      syncAccessRecordsToVault().catch(() => {});
    }
    return true;
  } catch (err) {
    console.error('Error saving pending_users.json:', err);
    return false;
  }
}

// Record a new pending login attempt
export function recordPendingUser(user: { email: string; name: string; picture?: string }) {
  const email = user.email.trim().toLowerCase();
  if (isMasterAdmin(email) || isUserApproved(email)) return;

  const current = getPendingUsers();
  const existingIdx = current.findIndex((u) => u.email.toLowerCase() === email);

  if (existingIdx >= 0) {
    current[existingIdx] = {
      email,
      name: user.name || email.split('@')[0],
      picture: user.picture,
      requestedAt: new Date().toISOString(),
    };
  } else {
    current.unshift({
      email,
      name: user.name || email.split('@')[0],
      picture: user.picture,
      requestedAt: new Date().toISOString(),
    });
  }

  savePendingUsers(current, true);
}

// Check if user is approved
export function isUserApproved(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // Admin is always approved
  if (isMasterAdmin(cleanEmail)) return true;

  const approved = getApprovedUsers();
  return approved.some((u) => u.email.toLowerCase() === cleanEmail);
}

// Approve a user
export function approveUser(email: string, name?: string, approvedBy: string = 'ADMIN'): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const current = getApprovedUsers();

  if (!current.some((u) => u.email.toLowerCase() === cleanEmail)) {
    current.push({
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      approvedAt: new Date().toISOString(),
      approvedBy,
    });
    saveApprovedUsers(current, true);
  }

  // Remove from pending list
  const pending = getPendingUsers().filter((u) => u.email.toLowerCase() !== cleanEmail);
  savePendingUsers(pending, true);

  return true;
}

// Revoke a user
export function revokeUser(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  if (isMasterAdmin(cleanEmail)) return false; // Cannot revoke master admin

  const current = getApprovedUsers().filter((u) => u.email.toLowerCase() !== cleanEmail);
  saveApprovedUsers(current, true);
  return true;
}

// --- Cryptographic Cookie Session Signing (HMAC SHA-256) ---

export function signSessionPayload(user: AuthUser): string {
  const payload = {
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token?: string | null): AuthUser | null {
  if (!token || !token.includes('.')) return null;

  try {
    const [payloadB64, signature] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', getAuthSecret())
      .update(payloadB64)
      .digest('base64url');

    if (signature !== expectedSig) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    // Dynamic approval check: user is approved if master admin, if already signed with approval, or on approved list
    const isAdmin = isMasterAdmin(payload.email);
    const isApproved = isAdmin || Boolean(payload.isApproved) || isUserApproved(payload.email);

    return {
      id: payload.id || payload.email,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      role: isAdmin ? 'admin' : 'user',
      isApproved,
    };
  } catch {
    return null;
  }
}

// Extract Session User from NextRequest
export function getSessionUser(request: NextRequest): AuthUser | null {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return verifySessionToken(cookie);
}

// Calculate canonical OAuth redirect URI
export function getAuthRedirectUri(request: NextRequest): string {
  if (process.env.APP_URL) {
    return `${process.env.APP_URL.replace(/\/$/, '')}/api/auth/google/callback`;
  }
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = (forwardedHost || request.headers.get('host') || '').toLowerCase();

  // In local development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `http://${host}/api/auth/google/callback`;
  }

  // On any Vercel deployment (*.vercel.app) or preview URL, always use the canonical production domain
  return 'https://dalal-equity-intelligence.vercel.app/api/auth/google/callback';
}
