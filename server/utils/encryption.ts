import crypto from 'crypto';
import { logger } from '../logger';

// CRITICAL: Require a proper encryption key - fail fast if missing
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    'CRITICAL SECURITY ERROR: SESSION_SECRET must be set and at least 32 characters for secure API key encryption. ' +
    'Generate a secure key with: openssl rand -base64 32'
  );
}

const ENCRYPTION_KEY = process.env.SESSION_SECRET;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Generic secret encryption (for API keys, webhook secrets, etc.)
 */
export function encryptSecret(secret: string): string {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Failed to encrypt secret', { error });
    throw new Error('Encryption failed');
  }
}

/**
 * Generic secret decryption (for API keys, webhook secrets, etc.)
 */
export function decryptSecret(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt secret', { error });
    throw new Error('Decryption failed');
  }
}

// Legacy exports for backward compatibility
export const encryptApiKey = encryptSecret;
export const decryptApiKey = decryptSecret;
