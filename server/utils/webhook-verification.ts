import crypto from 'crypto';
import { logger, logSecurityEvent } from '../logger';

/**
 * Webhook verification utilities for secure webhook handling
 */

export interface WebhookVerificationResult<T = any> {
  success: boolean;
  event?: T;
  error?: string;
}

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 * @param rawBody - Raw request body
 * @param signature - X-Hub-Signature-256 header value
 * @param secret - Webhook secret configured in GitHub
 * @returns Verification result
 */
export function verifyGitHubWebhook(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string | undefined
): WebhookVerificationResult {
  if (!signature) {
    logSecurityEvent('webhook-verification-failed', 'high', {
      service: 'github',
      reason: 'missing-signature'
    });
    return {
      success: false,
      error: 'Missing X-Hub-Signature-256 header'
    };
  }

  if (!secret) {
    logSecurityEvent('webhook-misconfigured', 'critical', {
      service: 'github',
      reason: 'missing-secret'
    });
    return {
      success: false,
      error: 'GitHub webhook secret not configured'
    };
  }

  // GitHub signature format: sha256=<hash>
  const signatureParts = signature.split('=');
  if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
    logSecurityEvent('webhook-verification-failed', 'high', {
      service: 'github',
      reason: 'invalid-signature-format'
    });
    return {
      success: false,
      error: 'Invalid signature format'
    };
  }

  const providedHash = signatureParts[1];
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  const hashesMatch = crypto.timingSafeEqual(
    Buffer.from(providedHash, 'hex'),
    Buffer.from(computedHash, 'hex')
  );

  if (!hashesMatch) {
    logSecurityEvent('webhook-verification-failed', 'high', {
      service: 'github',
      reason: 'signature-mismatch'
    });
    return {
      success: false,
      error: 'Webhook signature verification failed'
    };
  }

  logger.info('GitHub webhook verified successfully');
  return { success: true };
}

/**
 * Verify generic HMAC-SHA256 webhook signature
 * Used for services like Twilio, SendGrid, etc.
 * @param rawBody - Raw request body
 * @param signature - Signature header value
 * @param secret - Webhook secret
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns Verification result
 */
export function verifyHMACWebhook(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string | undefined,
  algorithm: string = 'sha256'
): WebhookVerificationResult {
  if (!signature) {
    logSecurityEvent('webhook-verification-failed', 'medium', {
      service: 'generic-hmac',
      reason: 'missing-signature'
    });
    return {
      success: false,
      error: 'Missing signature header'
    };
  }

  if (!secret) {
    logSecurityEvent('webhook-misconfigured', 'critical', {
      service: 'generic-hmac',
      reason: 'missing-secret'
    });
    return {
      success: false,
      error: 'Webhook secret not configured'
    };
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const computedSignature = crypto
    .createHmac(algorithm, secret)
    .update(body)
    .digest('hex');

  // Use timing-safe comparison
  const signaturesMatch = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );

  if (!signaturesMatch) {
    logSecurityEvent('webhook-verification-failed', 'high', {
      service: 'generic-hmac',
      reason: 'signature-mismatch'
    });
    return {
      success: false,
      error: 'Webhook signature verification failed'
    };
  }

  logger.info('HMAC webhook verified successfully');
  return { success: true };
}
