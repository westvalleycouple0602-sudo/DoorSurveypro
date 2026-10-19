import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { apiKeys, apiKeyUsageLogs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { hashApiKey, isIpAllowed } from "../utils/apiKey";
import { logger, logSecurityEvent } from "../logger";
import { atomicRateLimitIncrement } from "../utils/redis";

/**
 * Extract API key from request headers
 * Supports both "Authorization: Bearer sk_live_..." and "X-API-Key: sk_live_..."
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  // Check X-API-Key header
  const apiKeyHeader = req.get("X-API-Key");
  if (apiKeyHeader) {
    return apiKeyHeader;
  }
  
  return null;
}

/**
 * API Key Authentication Middleware
 * Validates API key, checks permissions, and enforces rate limits
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  try {
    // Extract API key from request
    const apiKey = extractApiKey(req);
    
    if (!apiKey) {
      logSecurityEvent("api-key-missing", "medium", {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      
      return res.status(401).json({
        error: "Unauthorized",
        message: "API key is required. Provide it in Authorization header (Bearer token) or X-API-Key header.",
      });
    }
    
    // Hash the API key for lookup
    const keyHash = hashApiKey(apiKey);
    
    // Find the API key in database
    const [apiKeyRecord] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);
    
    if (!apiKeyRecord) {
      logSecurityEvent("api-key-invalid", "high", {
        path: req.path,
        method: req.method,
        ip: req.ip,
        keyPrefix: apiKey.substring(0, 8),
      });
      
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key",
      });
    }
    
    // Check if key is revoked
    if (apiKeyRecord.revokedAt) {
      logSecurityEvent("api-key-revoked", "high", {
        path: req.path,
        method: req.method,
        ip: req.ip,
        keyId: apiKeyRecord.id,
        organizationId: apiKeyRecord.organizationId,
        revokedAt: apiKeyRecord.revokedAt,
        revokedReason: apiKeyRecord.revokedReason,
      });
      
      return res.status(401).json({
        error: "Unauthorized",
        message: "API key has been revoked",
      });
    }
    
    // Check if key is expired
    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
      logSecurityEvent("api-key-expired", "medium", {
        path: req.path,
        method: req.method,
        ip: req.ip,
        keyId: apiKeyRecord.id,
        organizationId: apiKeyRecord.organizationId,
        expiresAt: apiKeyRecord.expiresAt,
      });
      
      return res.status(401).json({
        error: "Unauthorized",
        message: "API key has expired",
      });
    }
    
    // Check IP restrictions
    const allowedIps = (apiKeyRecord.allowedIps as string[]) || [];
    const clientIp = req.ip || "";
    
    if (!isIpAllowed(clientIp, allowedIps)) {
      logSecurityEvent("api-key-ip-blocked", "critical", {
        path: req.path,
        method: req.method,
        ip: clientIp,
        keyId: apiKeyRecord.id,
        organizationId: apiKeyRecord.organizationId,
        allowedIps,
      });
      
      return res.status(403).json({
        error: "Forbidden",
        message: "API key not allowed from this IP address",
      });
    }
    
    // Rate limiting using atomic Redis operations (prevents race conditions)
    const rateLimitKey = `api_rate_limit:${apiKeyRecord.id}`;
    const rateLimitWindowSeconds: number = (apiKeyRecord.rateLimitWindow !== null ? apiKeyRecord.rateLimitWindow : 3600);
    const rateLimit: number = (apiKeyRecord.rateLimit !== null ? apiKeyRecord.rateLimit : 1000);
    
    try {
      // ATOMIC: Increment counter and set expiry if first request (Lua script ensures atomicity)
      const currentCount = await atomicRateLimitIncrement(rateLimitKey, rateLimitWindowSeconds);
      
      // If Redis is unavailable, skip rate limiting (graceful degradation)
      if (currentCount === null) {
        logger.warn("Rate limiting unavailable - Redis not connected", {
          keyId: apiKeyRecord.id,
        });
      } else if (currentCount > rateLimit) {
        // Rate limit exceeded
        logSecurityEvent("api-key-rate-limit-exceeded", "high", {
          path: req.path,
          method: req.method,
          ip: clientIp,
          keyId: apiKeyRecord.id,
          organizationId: apiKeyRecord.organizationId,
          currentCount,
          rateLimit,
        });
        
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Rate limit exceeded. Limit: ${rateLimit} requests per ${rateLimitWindowSeconds} seconds`,
          retryAfter: rateLimitWindowSeconds,
        });
      }
    } catch (rateLimitError) {
      // Log error but don't fail the request if rate limiting fails
      logger.error("Rate limiting check failed", {
        error: rateLimitError,
        keyId: apiKeyRecord.id,
      });
    }
    
    // Attach API key info to request for use in route handlers
    (req as any).apiKey = {
      id: apiKeyRecord.id,
      organizationId: apiKeyRecord.organizationId,
      createdBy: apiKeyRecord.createdBy,
      scopes: (apiKeyRecord.scopes as string[]) || [],
      name: apiKeyRecord.name,
    };
    
    // Log usage after response completes (to capture actual status code)
    res.on("finish", () => {
      const responseTime = Date.now() - startTime;
      
      // Update last used timestamp and request count
      db.update(apiKeys)
        .set({
          lastUsedAt: new Date(),
          requestCount: apiKeyRecord.requestCount + 1,
        })
        .where(eq(apiKeys.id, apiKeyRecord.id))
        .then(() => {
          // Log API key usage with accurate status code
          return db.insert(apiKeyUsageLogs).values({
            apiKeyId: apiKeyRecord.id,
            organizationId: apiKeyRecord.organizationId,
            method: req.method,
            endpoint: req.path,
            statusCode: res.statusCode, // Now captures actual response code
            responseTime,
            ipAddress: clientIp,
            userAgent: req.get("User-Agent") || null,
          });
        })
        .catch(err => {
          logger.error("Failed to log API key usage", {
            error: err,
            keyId: apiKeyRecord.id,
          });
        });
    });
    
    next();
  } catch (error) {
    logger.error("API key authentication error", { error });
    
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to authenticate API key",
    });
  }
}

/**
 * Middleware to check if API key has required scope(s)
 * 
 * @param requiredScopes - The scope(s) required (e.g., "projects:write" or ["projects:read", "projects:*"])
 */
export function requireScope(requiredScopes: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey;
    
    if (!apiKey) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "API key authentication required",
      });
    }
    
    const scopes: string[] = apiKey.scopes || [];
    const scopesToCheck = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
    
    // Check if API key has ANY of the required scopes (OR logic)
    const hasScope = scopesToCheck.some(requiredScope => {
      return scopes.some(scope => {
        if (scope === requiredScope) return true;
        
        // Check for wildcard scopes (e.g., "projects:*" matches "projects:read" and "projects:write")
        const [resource, action] = scope.split(":");
        const [requiredResource, requiredAction] = requiredScope.split(":");
        
        if (resource === requiredResource && action === "*") return true;
        if (resource === "*") return true; // Full access wildcard
        
        return false;
      });
    });
    
    if (!hasScope) {
      logSecurityEvent("api-key-insufficient-scope", "medium", {
        path: req.path,
        method: req.method,
        keyId: apiKey.id,
        organizationId: apiKey.organizationId,
        requiredScopes: scopesToCheck,
        availableScopes: scopes,
      });
      
      return res.status(403).json({
        error: "Forbidden",
        message: `API key does not have required scope(s): ${scopesToCheck.join(", ")}`,
      });
    }
    
    next();
  };
}
