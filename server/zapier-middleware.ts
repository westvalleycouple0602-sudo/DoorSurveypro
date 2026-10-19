import type { Request, Response, NextFunction } from 'express';

// Compatibility export for internal callers. The global ZAPIER_API_KEY is retired.
export { apiKeyAuth as validateZapierApiKey } from "./middleware/apiKeyAuth";

/**
 * Rate Limiting Middleware
 * 
 * Implements a sliding window rate limiter to prevent API abuse.
 * Limits: 100 requests per minute per IP address
 */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

// Cleanup old entries every 5 minutes
const zapierCleanupInterval = setInterval(() => {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(ts => ts > cutoff);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Export cleanup for graceful shutdown
export function cleanupZapierRateLimiting() {
  clearInterval(zapierCleanupInterval);
  rateLimitStore.clear();
}

export function rateLimitZapierApi(req: Request, res: Response, next: NextFunction) {
  const identifier = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(identifier, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  // Check if rate limit is exceeded
  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestTimestamp = entry.timestamps[0];
    const retryAfterMs = oldestTimestamp + RATE_LIMIT_WINDOW_MS - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', new Date(oldestTimestamp + RATE_LIMIT_WINDOW_MS).toISOString());
    res.setHeader('Retry-After', retryAfterSeconds.toString());

    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute allowed.`,
      retryAfter: retryAfterSeconds,
    });
  }

  // Add current timestamp
  entry.timestamps.push(now);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', (RATE_LIMIT_MAX_REQUESTS - entry.timestamps.length).toString());
  res.setHeader('X-RateLimit-Reset', new Date(now + RATE_LIMIT_WINDOW_MS).toISOString());

  next();
}

/**
 * General API Rate Limiting Middleware
 * 
 * More generous rate limiting for general API endpoints
 * Limits: 300 requests per minute per IP address
 */

const generalRateLimitStore = new Map<string, RateLimitEntry>();
const GENERAL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const GENERAL_RATE_LIMIT_MAX_REQUESTS = 300;

// Cleanup old entries every 5 minutes
const generalCleanupInterval = setInterval(() => {
  const now = Date.now();
  const cutoff = now - GENERAL_RATE_LIMIT_WINDOW_MS;
  
  for (const [key, entry] of generalRateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(ts => ts > cutoff);
    if (entry.timestamps.length === 0) {
      generalRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Export cleanup for graceful shutdown
export function cleanupGeneralRateLimiting() {
  clearInterval(generalCleanupInterval);
  generalRateLimitStore.clear();
}

export function rateLimitGeneralApi(req: Request, res: Response, next: NextFunction) {
  const identifier = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - GENERAL_RATE_LIMIT_WINDOW_MS;

  let entry = generalRateLimitStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    generalRateLimitStore.set(identifier, entry);
  }

  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  if (entry.timestamps.length >= GENERAL_RATE_LIMIT_MAX_REQUESTS) {
    const oldestTimestamp = entry.timestamps[0];
    const retryAfterMs = oldestTimestamp + GENERAL_RATE_LIMIT_WINDOW_MS - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    res.setHeader('X-RateLimit-Limit', GENERAL_RATE_LIMIT_MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', new Date(oldestTimestamp + GENERAL_RATE_LIMIT_WINDOW_MS).toISOString());
    res.setHeader('Retry-After', retryAfterSeconds.toString());

    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${GENERAL_RATE_LIMIT_MAX_REQUESTS} requests per minute allowed.`,
      retryAfter: retryAfterSeconds,
    });
  }

  entry.timestamps.push(now);

  res.setHeader('X-RateLimit-Limit', GENERAL_RATE_LIMIT_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', (GENERAL_RATE_LIMIT_MAX_REQUESTS - entry.timestamps.length).toString());
  res.setHeader('X-RateLimit-Reset', new Date(now + GENERAL_RATE_LIMIT_WINDOW_MS).toISOString());

  next();
}
