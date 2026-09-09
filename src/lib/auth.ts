import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

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

const DATA_DIR = path.join(process.cwd(), 'data');
const APPROVED_USERS_FILE = path.join(DATA_DIR, 'approved_users.json');
const PENDING_USERS_FILE = path.join(DATA_DIR, 'pending_users.json');
export const AUTH_COOKIE_NAME = 'dalal_auth_session';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Master Admin Email
export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || 'teja.sai42@gmail.com').trim().toLowerCase();
}

// Auth Secret for Signing Session Cookies
function getAuthSecret(): string {
  return process.env.AUTH_SECRET || 'dalal-ai-terminal-secure-secret-key-2026-production';
}

// Check if an email is the Master Admin
export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getAdminEmail();
}

// Read Approved Users
export function getApprovedUsers(): ApprovedUserRecord[] {
  ensureDataDir();
  const records: ApprovedUserRecord[] = [];

  try {
    if (fs.existsSync(APPROVED_USERS_FILE)) {
      const content = fs.readFileSync(APPROVED_USERS_FILE, 'utf8');
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
function saveApprovedUsers(records: ApprovedUserRecord[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(APPROVED_USERS_FILE, JSON.stringify(records, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving approved_users.json:', err);
    return false;
  }
}

// Read Pending Users
export function getPendingUsers(): PendingUserRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(PENDING_USERS_FILE)) {
      const content = fs.readFileSync(PENDING_USERS_FILE, 'utf8');
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
function savePendingUsers(records: PendingUserRecord[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(PENDING_USERS_FILE, JSON.stringify(records, null, 2), 'utf8');
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

  savePendingUsers(current);
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
    saveApprovedUsers(current);
  }

  // Remove from pending list
  const pending = getPendingUsers().filter((u) => u.email.toLowerCase() !== cleanEmail);
  savePendingUsers(pending);

  return true;
}

// Revoke a user
export function revokeUser(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  if (isMasterAdmin(cleanEmail)) return false; // Cannot revoke master admin

  const current = getApprovedUsers().filter((u) => u.email.toLowerCase() !== cleanEmail);
  saveApprovedUsers(current);
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

    // Dynamic approval check: even if session token was signed earlier, verify against current approval state
    const isApproved = isUserApproved(payload.email);
    const isAdmin = isMasterAdmin(payload.email);

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

