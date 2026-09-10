import crypto from 'crypto';

/**
 * Derives a master encryption secret from server environment variables.
 */
function getMasterSecret(): string {
  if (process.env.VAULT_SECRET) {
    return process.env.VAULT_SECRET;
  }
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }
  if (process.env.GOOGLE_CLIENT_SECRET || process.env.GEMINI_API_KEY) {
    return `dalal_vault_master_${process.env.GOOGLE_CLIENT_SECRET || ''}_${process.env.GEMINI_API_KEY || ''}`;
  }
  return 'dalal-terminal-default-vault-secure-key-2026';
}

/**
 * Derives a unique 256-bit cryptographic key for a specific user email
 * using Scrypt key derivation function.
 */
function deriveUserKey(email: string): Buffer {
  const cleanEmail = email.trim().toLowerCase();
  const masterSecret = getMasterSecret();
  // Use email as salt to ensure per-user key isolation
  return crypto.scryptSync(masterSecret, `salt_${cleanEmail}`, 32);
}

/**
 * Returns a 16-character alphanumeric hash for safe filenames (e.g. wl_4a2c9e1b.enc).
 */
export function getUserVaultHash(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  return crypto.createHash('sha256').update(`dalal_user_${cleanEmail}`).digest('hex').substring(0, 16);
}

interface EncryptedPayload {
  v: number; // version
  iv: string; // base64
  tag: string; // base64
  data: string; // base64
}

/**
 * Encrypts arbitrary data for a specific user using AES-256-GCM.
 * Only the server with the user's derived key can decrypt this data.
 */
export function encryptUserData<T>(data: T, userEmail: string): string {
  try {
    const key = deriveUserKey(userEmail);
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const plaintext = JSON.stringify(data);
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    const payload: EncryptedPayload = {
      v: 1,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: encrypted.toString('base64'),
    };

    return JSON.stringify(payload);
  } catch (error) {
    console.error('Failed to encrypt user data:', error);
    throw new Error('Encryption error');
  }
}

/**
 * Decrypts data previously encrypted with encryptUserData.
 * Returns null if authentication tag fails or data is corrupted.
 */
export function decryptUserData<T>(cipherString: string, userEmail: string): T | null {
  try {
    if (!cipherString || typeof cipherString !== 'string') return null;

    const payload: EncryptedPayload = JSON.parse(cipherString);
    if (!payload.iv || !payload.tag || !payload.data) {
      return null;
    }

    const key = deriveUserKey(userEmail);
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const encryptedData = Buffer.from(payload.data, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return JSON.parse(decrypted.toString('utf8')) as T;
  } catch (error) {
    console.warn(`Decryption failed or invalid format for user ${userEmail}:`, error);
    return null;
  }
}

