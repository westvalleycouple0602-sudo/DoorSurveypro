/**
 * Two-Factor Authentication (2FA) Utilities
 * Supports TOTP (Time-based One-Time Password) via authenticator apps
 * 
 * Future Enhancement: Add SMS-based 2FA via Twilio integration
 */

import * as crypto from 'crypto';
import { logger, logError, logSecurityEvent } from "../logger";

/**
 * Generate a random base32 secret for TOTP
 */
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding
 */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const index = alphabet.indexOf(input[i].toUpperCase());
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generate TOTP code
 */
export function generateTOTP(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(time));

  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(buffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify TOTP code with time window tolerance
 */
export function verifyTOTP(
  secret: string,
  token: string,
  window: number = 1 // Allow ±1 time step (30 seconds)
): boolean {
  const currentCode = generateTOTP(secret);
  
  // Check current time window
  if (currentCode === token) {
    return true;
  }

  // Check previous and next time windows
  for (let i = -window; i <= window; i++) {
    if (i === 0) continue; // Already checked
    
    const time = Math.floor(Date.now() / 1000 / 30) + i;
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(time));

    const secretBuffer = base32Decode(secret);
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(buffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    
    if (otp === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate QR code URL for authenticator apps
 */
export function generateTOTPQRCodeURL(
  secret: string,
  accountName: string,
  issuer: string = 'DoorSurvey Pro'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}`;
}

/**
 * Generate backup codes (one-time use recovery codes)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
}

/**
 * Hash backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, hashedCode: string): boolean {
  const hash = hashBackupCode(code);
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hashedCode)
  );
}

/**
 * 2FA Session Management
 */
export interface TwoFactorSession {
  userId: string;
  verified: boolean;
  verifiedAt?: Date;
  expiresAt: Date;
}

const twoFactorSessions = new Map<string, TwoFactorSession>();

/**
 * Create 2FA session after first factor (password) verification
 */
export function createTwoFactorSession(userId: string, ttlMinutes: number = 15): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  
  twoFactorSessions.set(sessionId, {
    userId,
    verified: false,
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });
  
  return sessionId;
}

/**
 * Verify second factor and mark session as complete
 */
export function verifyTwoFactorSession(sessionId: string, userId: string): boolean {
  const session = twoFactorSessions.get(sessionId);
  
  if (!session) {
    return false;
  }
  
  if (session.userId !== userId) {
    logSecurityEvent('2fa-session-mismatch', 'critical', {
      sessionId,
      expectedUserId: session.userId,
      providedUserId: userId,
    });
    return false;
  }
  
  if (session.expiresAt < new Date()) {
    twoFactorSessions.delete(sessionId);
    return false;
  }
  
  session.verified = true;
  session.verifiedAt = new Date();
  
  logger.info('2FA session verified', { userId, sessionId });
  
  return true;
}

/**
 * Check if 2FA session is verified
 */
export function isTwoFactorSessionVerified(sessionId: string): boolean {
  const session = twoFactorSessions.get(sessionId);
  
  if (!session) {
    return false;
  }
  
  if (session.expiresAt < new Date()) {
    twoFactorSessions.delete(sessionId);
    return false;
  }
  
  return session.verified;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions() {
  const now = new Date();
  let cleaned = 0;
  
  for (const [sessionId, session] of twoFactorSessions.entries()) {
    if (session.expiresAt < now) {
      twoFactorSessions.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired 2FA sessions`);
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

/**
 * Middleware to require 2FA verification
 */
export function requireTwoFactor(req: any, res: any, next: any) {
  const sessionId = req.headers['x-2fa-session'];
  
  if (!sessionId || !isTwoFactorSessionVerified(sessionId)) {
    return res.status(403).json({
      error: 'Two-factor authentication required',
      code: '2FA_REQUIRED',
    });
  }
  
  next();
}
