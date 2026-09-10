import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  folder_id: string;
}

let cachedAccessToken: { token: string; expiresAt: number; authType: 'oauth' | 'service_account' } | null = null;

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'dalal_data');
  }
  return path.join(process.cwd(), 'data');
}

/**
 * Parses Service Account credentials from environment variables.
 */
function getServiceAccountCredentials(): ServiceAccountCredentials | null {
  const folderId = getVaultFolderId();
  if (!folderId) return null;

  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (jsonKey) {
    try {
      const parsed = JSON.parse(jsonKey);
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          folder_id: folderId,
        };
      }
    } catch (e) {
      console.warn('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (email && privateKey) {
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    return {
      client_email: email,
      private_key: privateKey,
      folder_id: folderId,
    };
  }

  return null;
}

export function getVaultFolderId(): string | null {
  return (process.env.GOOGLE_DRIVE_FOLDER_ID || '1pJvfXKqi9MxOwyQgFLySOJt3qAUL-o73').trim();
}

/**
 * Gets cached or configured OAuth Refresh Token for Master Admin.
 */
export function getAdminRefreshToken(): string | null {
  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim()) {
    return process.env.GOOGLE_DRIVE_REFRESH_TOKEN.trim();
  }

  try {
    const tokenFile = path.join(getDataDir(), 'vault_refresh_token.json');
    if (fs.existsSync(tokenFile)) {
      const parsed = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
      if (parsed.refresh_token) {
        return parsed.refresh_token.trim();
      }
    }
  } catch {}

  return null;
}

/**
 * Saves Admin OAuth Refresh Token to server disk cache so it persists immediately.
 */
export function saveAdminRefreshToken(token: string): boolean {
  try {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tokenFile = path.join(dir, 'vault_refresh_token.json');
    fs.writeFileSync(tokenFile, JSON.stringify({ refresh_token: token, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('Failed to cache vault refresh token:', err);
    return false;
  }
}

/**
 * Returns true if Google Drive Vault is configured with folder ID and either
 * OAuth Refresh Token or Service Account credentials.
 */
export function isVaultConfigured(): boolean {
  const folderId = getVaultFolderId();
  if (!folderId) return false;

  return Boolean(getAdminRefreshToken() || getServiceAccountCredentials());
}

/**
 * Generates an OAuth 2.0 access token using Master Admin's personal refresh token.
 * This runs under the Admin's 15 GB quota, avoiding all Service Account quota blocks.
 */
async function getOAuthAccessToken(): Promise<string | null> {
  const refreshToken = getAdminRefreshToken();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!refreshToken || !clientId || !clientSecret) return null;

  if (
    cachedAccessToken &&
    cachedAccessToken.authType === 'oauth' &&
    cachedAccessToken.expiresAt > Date.now() + 120 * 1000
  ) {
    return cachedAccessToken.token;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      console.warn('Admin OAuth refresh failed:', data);
      return null;
    }

    const token = data.access_token as string;
    const expiresIn = (data.expires_in as number) || 3600;

    cachedAccessToken = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
      authType: 'oauth',
    };

    return token;
  } catch (error) {
    console.error('Error refreshing OAuth access token:', error);
    return null;
  }
}

/**
 * Generates an OAuth 2.0 access token for Google Service Account using RS256 JWT assertion.
 */
async function getServiceAccountAccessToken(): Promise<string | null> {
  const creds = getServiceAccountCredentials();
  if (!creds) return null;

  if (
    cachedAccessToken &&
    cachedAccessToken.authType === 'service_account' &&
    cachedAccessToken.expiresAt > Date.now() + 120 * 1000
  ) {
    return cachedAccessToken.token;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const toSign = `${headerB64}.${claimsB64}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(toSign);
    const signature = signer.sign(creds.private_key, 'base64url');
    const assertion = `${toSign}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      console.error('Google Service Account token exchange failed:', data);
      return null;
    }

    const token = data.access_token as string;
    const expiresIn = (data.expires_in as number) || 3600;

    cachedAccessToken = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
      authType: 'service_account',
    };

    return token;
  } catch (error) {
    console.error('Error generating Google Service Account token:', error);
    return null;
  }
}

/**
 * Gets a valid access token. Prioritizes Master Admin OAuth (15 GB quota),
 * falling back to Service Account.
 */
async function getVaultAccessToken(): Promise<string | null> {
  // 1. Try OAuth Refresh Token first (recommended for personal Google Drive)
  const oauthToken = await getOAuthAccessToken();
  if (oauthToken) return oauthToken;

  // 2. Fall back to Service Account
  return getServiceAccountAccessToken();
}

/**
 * Searches for a file by exact name inside the configured Google Drive Vault folder.
 */
async function findVaultFile(filename: string): Promise<{ id: string; name: string } | null> {
  const token = await getVaultAccessToken();
  const folderId = getVaultFolderId();
  if (!token || !folderId) return null;

  try {
    const query = `'${folderId}' in parents and name = '${filename}' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name)&pageSize=1&supportsAllDrives=true`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn(`Drive query failed for ${filename}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (error) {
    console.error(`Error searching vault for ${filename}:`, error);
    return null;
  }
}

/**
 * Reads the text content of a file from the Google Drive Vault.
 */
export async function readVaultFile(filename: string): Promise<string | null> {
  const token = await getVaultAccessToken();
  if (!token) return null;

  try {
    const file = await findVaultFile(filename);
    if (!file) return null;

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn(`Failed to read file ${filename} (${file.id}): HTTP ${res.status}`);
      return null;
    }

    return await res.text();
  } catch (error) {
    console.error(`Error reading vault file ${filename}:`, error);
    return null;
  }
}

/**
 * Writes text content to the Google Drive Vault.
 * Uses supportsAllDrives=true and handles both new file creation and content updates.
 */
export async function writeVaultFile(
  filename: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<boolean> {
  const token = await getVaultAccessToken();
  const folderId = getVaultFolderId();
  if (!token || !folderId) return false;

  try {
    const existingFile = await findVaultFile(filename);

    if (existingFile) {
      // Update existing file content
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media&supportsAllDrives=true`;
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mimeType,
        },
        body: content,
      });

      return res.ok;
    } else {
      // Create new file via multipart upload
      const boundary = '-------DalalVaultBoundary' + Date.now();
      const metadata = JSON.stringify({
        name: filename,
        parents: [folderId],
      });

      const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n` +
        `${content}\r\n` +
        `--${boundary}--`;

      const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true';
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      });

      return res.ok;
    }
  } catch (error) {
    console.error(`Error writing vault file ${filename}:`, error);
    return false;
  }
}
