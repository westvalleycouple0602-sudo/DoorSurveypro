import crypto from 'crypto';

// Ensure encryption key is set
const ENCRYPTION_KEY = process.env.SESSION_SECRET;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters for encryption');
}

// Derive a 32-byte key from the session secret
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(ciphertext: string): string {
  const parts = ciphertext.split(':');
  
  // Handle legacy plaintext tokens (backward compatibility)
  if (parts.length !== 3) {
    // This is a plaintext token, return it as-is
    // The calling code should re-encrypt it
    return ciphertext;
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function isEncrypted(token: string): boolean {
  const parts = token.split(':');
  return parts.length === 3;
}

export function maskToken(token: string): string {
  if (!token || token.length < 8) {
    return '***';
  }
  // Show first 4 and last 4 characters
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}
