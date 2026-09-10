import crypto from 'crypto';

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  folder_id: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Parses Service Account credentials from environment variables.
 * Supports either GOOGLE_SERVICE_ACCOUNT_KEY (full JSON) or individual env vars.
 */
function getVaultCredentials(): ServiceAccountCredentials | null {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!folderId) return null;

  // 1. Try parsing full JSON credentials
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

  // 2. Try individual environment variables
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (email && privateKey) {
    // Handle escaped newlines in environment variable strings
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

/**
 * Returns true if Google Drive Vault is configured with credentials and folder ID.
 */
export function isVaultConfigured(): boolean {
  return getVaultCredentials() !== null;
}

/**
 * Generates an OAuth 2.0 access token for Google Service Account using RS256 JWT assertion.
 */
async function getVaultAccessToken(): Promise<string | null> {
  const creds = getVaultCredentials();
  if (!creds) return null;

  // Return cached token if valid for at least 2 more minutes
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 120 * 1000) {
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
    };

    return token;
  } catch (error) {
    console.error('Error generating Google Service Account token:', error);
    return null;
  }
}

/**
 * Searches for a file by exact name inside the configured Google Drive Vault folder.
 */
async function findVaultFile(filename: string): Promise<{ id: string; name: string } | null> {
  const token = await getVaultAccessToken();
  const creds = getVaultCredentials();
  if (!token || !creds) return null;

  try {
    const query = `'${creds.folder_id}' in parents and name = '${filename}' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name)&pageSize=1`;

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
 * Returns null if file not found or error occurs.
 */
export async function readVaultFile(filename: string): Promise<string | null> {
  const token = await getVaultAccessToken();
  if (!token) return null;

  try {
    const file = await findVaultFile(filename);
    if (!file) return null;

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
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
 * If the file exists, it updates it. Otherwise, it creates it in the vault folder.
 */
export async function writeVaultFile(
  filename: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<boolean> {
  const token = await getVaultAccessToken();
  const creds = getVaultCredentials();
  if (!token || !creds) return false;

  try {
    const existingFile = await findVaultFile(filename);

    if (existingFile) {
      // Update existing file content
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
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
        parents: [creds.folder_id],
      });

      const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n` +
        `${content}\r\n` +
        `--${boundary}--`;

      const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
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
