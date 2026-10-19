import crypto from "crypto";
import Redis from "ioredis";
import { logger } from "../logger";

/**
 * Nonce Verification Utility
 * 
 * Provides signed nonce generation and verification to prevent bot/spam submissions
 * on public endpoints (e.g., /api/leads). This is a lightweight alternative to captcha
 * that doesn't require external services or user interaction.
 * 
 * Security Model:
 * - Server generates cryptographically signed nonces with expiration timestamps
 * - Nonces are single-use and expire after 10 minutes
 * - HMAC-SHA256 signature prevents tampering
 * - Distributed nonce tracking via Redis (or in-memory for single-instance)
 * - Rate limiting provides additional protection against brute force
 * 
 * Multi-Instance Security:
 * - Uses Redis for distributed nonce tracking (prevents replay across instances)
 * - Falls back to in-memory Set for single-instance deployments
 * - Redis keys have TTL matching nonce validity (automatic cleanup)
 * 
 * @see server/routes.ts - /api/leads endpoint implementation
 */

// Secret key for signing nonces (use environment variable in production)
const NONCE_SECRET = process.env.NONCE_SECRET || crypto.randomBytes(32).toString("hex");

// Nonce validity period (10 minutes)
const NONCE_VALIDITY_MS = 10 * 60 * 1000;

// In-memory fallback for single-instance deployments
// Map stores nonce → expiration timestamp for TTL-based cleanup
const usedNoncesMemory = new Map<string, number>();

// Cleanup interval for in-memory nonces (every 5 minutes - remove expired only)
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiresAt] of Array.from(usedNoncesMemory.entries())) {
    if (now > expiresAt) {
      usedNoncesMemory.delete(nonce);
    }
  }
}, 5 * 60 * 1000);

// Parse Redis URL for ioredis (handles Upstash rediss:// URLs)
function parseRedisUrlForIORedis(redisUrl: string | undefined) {
  if (!redisUrl) return null;
  try {
    const url = new URL(redisUrl);
    const useTLS = url.protocol === 'rediss:';
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      tls: useTLS ? {} : undefined,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry, fall back to in-memory
      lazyConnect: true,
    };
  } catch (error) {
    logger.warn("Failed to parse REDIS_URL for nonce verification", { error });
    return null;
  }
}

// Dedicated Redis client for nonce verification (atomic operations)
let redisClient: Redis | null = null;
try {
  const redisUrl = process.env.REDIS_URL;
  const parsedConfig = parseRedisUrlForIORedis(redisUrl);

  if (parsedConfig) {
    // Use parsed URL config (works with Upstash rediss:// URLs)
    redisClient = new Redis(parsedConfig);
  } else {
    // Use individual connection parameters
    const redisHost = process.env.REDIS_HOST;
    const redisPort = parseInt(process.env.REDIS_PORT || "6379");
    const redisPassword = process.env.REDIS_PASSWORD;

    if (redisHost) {
      // Enable TLS for cloud providers (Upstash, Redis Cloud, etc.)
      const needsTLS = redisHost.includes('upstash.io') || 
                      redisHost.includes('redis.cloud') || 
                      redisHost.includes('amazonaws.com') ||
                      (redisPassword && redisHost !== '127.0.0.1' && redisHost !== 'localhost');
      
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        tls: needsTLS ? {} : undefined,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't retry, fall back to in-memory
        lazyConnect: true,
      });
    }
  }

  // Connect asynchronously if client was created
  if (redisClient) {
    redisClient.connect().catch((error) => {
      logger.warn("Redis connection failed for nonce verification, using in-memory fallback", { error: error.message });
      redisClient = null;
    });
  }
} catch (error) {
  logger.warn("Redis initialization failed for nonce verification", { error });
  redisClient = null;
}

/**
 * Generates a cryptographically signed nonce with expiration timestamp
 * 
 * @returns {string} Base64-encoded signed nonce
 */
export function generateNonce(): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const payload = `${timestamp}:${randomBytes}`;
  
  // Create HMAC signature
  const hmac = crypto.createHmac("sha256", NONCE_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  
  // Combine payload and signature
  const nonce = `${payload}:${signature}`;
  
  // Return base64-encoded nonce
  return Buffer.from(nonce).toString("base64");
}

/**
 * Atomically marks a nonce as used if not already used (check-and-set)
 * 
 * @param {string} nonceKey - Deterministic key for the nonce
 * @param {number} ttlSeconds - TTL in seconds
 * @returns {Promise<boolean>} True if nonce was NOT already used (first use)
 */
async function atomicMarkNonceAsUsed(nonceKey: string, ttlSeconds: number): Promise<boolean> {
  const expiresAt = Date.now() + (ttlSeconds * 1000);
  
  // Try Redis first if available - SETNX provides atomic check-and-set
  if (redisClient) {
    try {
      const cacheKey = `nonce:used:${nonceKey}`;
      
      // Attempt atomic set-if-not-exists using Redis SET with NX option
      // Returns "OK" if key was set (first use), null if already exists
      const wasSet = await redisClient.set(cacheKey, "1", "EX", ttlSeconds, "NX");
      
      if (wasSet === "OK") {
        // Successfully marked as used (first time)
        // Also store in memory for fast local checks
        usedNoncesMemory.set(nonceKey, expiresAt);
        return true;
      } else {
        // Already used (replay attempt)
        return false;
      }
    } catch (error) {
      // Redis error - fall through to in-memory fallback
      logger.warn("Redis nonce verification error, falling back to in-memory", { error });
    }
  }
  
  // Redis unavailable or error - fall back to in-memory for single-instance
  // Check expiration first
  const existing = usedNoncesMemory.get(nonceKey);
  if (existing && existing > Date.now()) {
    // Already used and not expired
    return false;
  }
  
  // Mark as used with expiration
  usedNoncesMemory.set(nonceKey, expiresAt);
  return true;
}

/**
 * Verifies a signed nonce with atomic replay protection
 * 
 * Security improvements:
 * 1. Verifies signature BEFORE any storage interaction (prevents invalid-nonce poisoning)
 * 2. Uses atomic SETNX for check-and-set (eliminates TOCTOU race condition)
 * 3. Deterministic key based on payload (consistent across instances)
 * 
 * @param {string} nonce - Base64-encoded signed nonce
 * @returns {Promise<boolean>} True if nonce is valid and not expired
 */
export async function verifyNonce(nonce: string): Promise<boolean> {
  try {
    // Decode base64 nonce
    const decoded = Buffer.from(nonce, "base64").toString("utf8");
    const parts = decoded.split(":");
    
    if (parts.length !== 3) {
      return false;
    }
    
    const [timestampStr, randomBytes, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    // Check if nonce has expired (before any storage interaction)
    if (Date.now() - timestamp > NONCE_VALIDITY_MS) {
      return false;
    }
    
    // Verify signature FIRST (before Redis lookup to prevent invalid-nonce poisoning)
    const payload = `${timestamp}:${randomBytes}`;
    const hmac = crypto.createHmac("sha256", NONCE_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    
    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    )) {
      return false;
    }
    
    // Nonce is valid - now atomically check-and-set
    // Use deterministic key based on payload for consistency across instances
    const nonceKey = `${timestamp}:${randomBytes}`;
    const ttlSeconds = Math.ceil(NONCE_VALIDITY_MS / 1000) + 60;
    
    // Atomic check-and-set: returns true if first use, false if replay
    const isFirstUse = await atomicMarkNonceAsUsed(nonceKey, ttlSeconds);
    
    return isFirstUse;
  } catch (error) {
    // Any decoding or parsing error means invalid nonce
    return false;
  }
}

/**
 * Express middleware to verify nonce in request body (async for distributed tracking)
 * 
 * Usage:
 * app.post("/api/leads", verifyNonceMiddleware, async (req, res) => { ... });
 */
export async function verifyNonceMiddleware(req: any, res: any, next: any) {
  const { _nonce } = req.body;
  
  if (!_nonce) {
    return res.status(400).json({
      error: "Missing verification token. Please refresh the page and try again."
    });
  }
  
  const isValid = await verifyNonce(_nonce);
  if (!isValid) {
    return res.status(400).json({
      error: "Invalid or expired verification token. Please refresh the page and try again."
    });
  }
  
  // Remove nonce from body before processing
  delete req.body._nonce;
  
  next();
}
