import fs from 'fs';
import path from 'path';
import { AuthUser, getApprovedUsers, syncAccessRecordsFromVault, getAdminEmail } from './auth';
import { readVaultFile, writeVaultFile, isVaultConfigured } from './drive-vault';

export interface UserActivityRecord {
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  firstSeenAt: string;
  lastActiveAt: string;
  totalVisits: number;
  deviceType?: 'Mobile' | 'Tablet' | 'Desktop';
}

export interface ActivityStats {
  totalUsers: number;
  activeNow: number;
  activeToday: number;
  totalVisits: number;
}

export interface UserActivitySummaryItem extends UserActivityRecord {
  isOnline: boolean;
  status: 'online' | 'today' | 'offline';
  relativeTime: string;
}

const VAULT_ACTIVITY_FILE = 'user_activity_ledger.json';

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'dalal_data');
  }
  return path.join(process.cwd(), 'data');
}

function getLocalActivityFile(): string {
  return path.join(getDataDir(), 'user_activity_ledger.json');
}

function detectDevice(userAgent?: string): 'Mobile' | 'Tablet' | 'Desktop' {
  if (!userAgent) return 'Desktop';
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    return 'Mobile';
  }
  return 'Desktop';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Unknown';
  }
}

/**
 * Loads the user activity ledger from Upstash Cloud Vault, falling back to local disk.
 */
export async function loadActivityLedger(): Promise<UserActivityRecord[]> {
  // 1. Try Upstash / Cloud Vault
  if (isVaultConfigured()) {
    try {
      const raw = await readVaultFile(VAULT_ACTIVITY_FILE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading activity ledger from vault:', e);
    }
  }

  // 2. Try local disk
  try {
    const file = getLocalActivityFile();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

/**
 * Saves the user activity ledger to local disk and Upstash Cloud Vault.
 */
export async function saveActivityLedger(records: UserActivityRecord[]): Promise<boolean> {
  // Save local disk
  try {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getLocalActivityFile(), JSON.stringify(records, null, 2), 'utf8');
  } catch {}

  // Save to Upstash Cloud Vault
  if (isVaultConfigured()) {
    try {
      await writeVaultFile(VAULT_ACTIVITY_FILE, JSON.stringify(records, null, 2), 'application/json');
    } catch (e) {
      console.error('Failed to save activity ledger to cloud vault:', e);
      return false;
    }
  }

  return true;
}

/**
 * Records a user heartbeat / active session ping.
 */
export async function recordUserHeartbeat(
  user: AuthUser,
  userAgent?: string
): Promise<ActivityStats> {
  const email = user.email.trim().toLowerCase();
  const records = await loadActivityLedger();
  const now = new Date().toISOString();
  const device = detectDevice(userAgent);

  const existingIndex = records.findIndex((r) => r.email.toLowerCase() === email);

  if (existingIndex >= 0) {
    const existing = records[existingIndex];
    // If last active was more than 15 minutes ago, count as a new visit/session
    const lastActiveMs = new Date(existing.lastActiveAt).getTime();
    const isNewSession = Date.now() - lastActiveMs > 15 * 60 * 1000;

    records[existingIndex] = {
      ...existing,
      name: user.name || existing.name,
      picture: user.picture || existing.picture,
      role: user.role,
      lastActiveAt: now,
      totalVisits: isNewSession ? (existing.totalVisits || 1) + 1 : existing.totalVisits || 1,
      deviceType: device,
    };
  } else {
    records.push({
      email,
      name: user.name || email.split('@')[0],
      picture: user.picture,
      role: user.role,
      firstSeenAt: now,
      lastActiveAt: now,
      totalVisits: 1,
      deviceType: device,
    });
  }

  // Pre-seed Master Admin and approved users who haven't logged in yet
  try {
    await syncAccessRecordsFromVault();
    const adminEmail = getAdminEmail();
    if (!records.some((r) => r.email.toLowerCase() === adminEmail)) {
      records.push({
        email: adminEmail,
        name: 'Master Admin',
        role: 'admin',
        firstSeenAt: now,
        lastActiveAt: now,
        totalVisits: 1,
        deviceType: device,
      });
    }

    const approved = getApprovedUsers();
    for (const appUser of approved) {
      const appEmail = appUser.email.toLowerCase();
      if (!records.some((r) => r.email.toLowerCase() === appEmail)) {
        records.push({
          email: appEmail,
          name: appUser.name || appEmail.split('@')[0],
          role: appEmail === adminEmail ? 'admin' : 'user',
          firstSeenAt: appUser.approvedAt || now,
          lastActiveAt: appUser.approvedAt || now,
          totalVisits: 0,
        });
      }
    }
  } catch {}

  await saveActivityLedger(records);

  const stats = computeActivityStats(records);
  return stats;
}

function computeActivityStats(records: UserActivityRecord[]): ActivityStats {
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  let activeNow = 0;
  let activeToday = 0;
  let totalVisits = 0;

  records.forEach((r) => {
    const diff = now - new Date(r.lastActiveAt).getTime();
    if (diff <= fiveMinutesMs) {
      activeNow++;
    }
    if (diff <= twentyFourHoursMs) {
      activeToday++;
    }
    totalVisits += r.totalVisits || 0;
  });

  return {
    totalUsers: records.length,
    activeNow: Math.max(1, activeNow), // At least 1 (the calling user)
    activeToday: Math.max(1, activeToday),
    totalVisits: Math.max(1, totalVisits),
  };
}

/**
 * Returns full usage analytics and user breakdown for Master Admin.
 */
export async function getUserActivityStats(): Promise<{
  stats: ActivityStats;
  users: UserActivitySummaryItem[];
}> {
  await syncAccessRecordsFromVault();
  const records = await loadActivityLedger();
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const adminEmail = getAdminEmail();

  // Make sure Master Admin and approved users are included
  try {
    if (!records.some((r) => r.email.toLowerCase() === adminEmail)) {
      records.push({
        email: adminEmail,
        name: 'Master Admin',
        role: 'admin',
        firstSeenAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalVisits: 1,
        deviceType: 'Desktop',
      });
    }

    const approved = getApprovedUsers();
    for (const appUser of approved) {
      const appEmail = appUser.email.toLowerCase();
      if (!records.some((r) => r.email.toLowerCase() === appEmail)) {
        records.push({
          email: appEmail,
          name: appUser.name || appEmail.split('@')[0],
          role: appEmail === adminEmail ? 'admin' : 'user',
          firstSeenAt: appUser.approvedAt || new Date().toISOString(),
          lastActiveAt: appUser.approvedAt || new Date().toISOString(),
          totalVisits: 0,
        });
      }
    }
  } catch {}

  const userItems: UserActivitySummaryItem[] = records.map((r) => {
    const diff = now - new Date(r.lastActiveAt).getTime();
    const isOnline = diff <= fiveMinutesMs;
    let status: 'online' | 'today' | 'offline' = 'offline';
    if (isOnline) {
      status = 'online';
    } else if (diff <= twentyFourHoursMs) {
      status = 'today';
    }

    return {
      ...r,
      isOnline,
      status,
      relativeTime: formatRelativeTime(r.lastActiveAt),
    };
  });

  // Sort: online first, then most recently active
  userItems.sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });

  const stats = computeActivityStats(records);

  return {
    stats,
    users: userItems,
  };
}
