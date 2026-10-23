import { archiveSafeAuditPath } from "./customer-storage/audit-path";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { auditLogs } from "@shared/schema";
import { logger } from "./logger";

/**
 * Audit logging middleware for compliance and security tracking
 * Records all API requests with timing, status, and user context
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const userAgent = req.headers["user-agent"] || "";

  // Listen for response finish to capture status code and timing
  res.on("finish", async () => {
    try {
      // Extract organization and user context from authenticated session
      // Try multiple possible locations where auth context might be stored
      let organizationId = "unknown";
      let userId = "anonymous";
      
      // Priority 1: Check req.userId/organizationId set by getOrganizationContext
      if ((req as any).userId) {
        userId = (req as any).userId;
      }
      if ((req as any).organizationId) {
        organizationId = (req as any).organizationId;
      }
      
      // Priority 2: Check session for Replit Auth user info
      if (userId === "anonymous" && (req as any).session?.user) {
        userId = (req as any).session.user.id || userId;
      }
      
      // Priority 3: Check for user from authentication middleware
      if (userId === "anonymous" && (req as any).user?.id) {
        userId = (req as any).user.id;
      }
      
      // Calculate response time
      const responseTimeMs = Date.now() - startTime;
      
      // Record audit log
      await db.insert(auditLogs).values({
        organizationId: organizationId as string,
        userId: userId as string,
        method: req.method as "GET" | "POST" | "PATCH" | "DELETE",
        path: archiveSafeAuditPath(req.originalUrl).slice(0, 512),
        status: res.statusCode,
        ip: (req.ip || req.socket.remoteAddress || "").slice(0, 64),
        userAgent: String(userAgent),
        responseTimeMs,
        extra: {
          responseTime: responseTimeMs,
          statusCode: res.statusCode,
        },
      });
    } catch (error) {
      // Don't let audit logging failures break the app
      logger.error("Failed to write audit log", {
        error: error instanceof Error ? error.message : String(error),
        method: req.method,
        path: archiveSafeAuditPath(req.originalUrl),
      });
    }
  });

  next();
}

/**
 * Audit logging middleware factory that allows configuration
 * Can be used to exclude certain paths or customize behavior
 */
export function createAuditMiddleware(options: {
  excludePaths?: string[];
  includeBody?: boolean;
} = {}) {
  const { excludePaths = [], includeBody = false } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip audit logging for excluded paths
    if (excludePaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();
    const userAgent = req.headers["user-agent"] || "";

    res.on("finish", async () => {
      try {
        // Extract organization and user context from authenticated session
        let organizationId = "unknown";
        let userId = "anonymous";
        
        // Check session for Replit Auth user info
        if ((req as any).session?.user) {
          userId = (req as any).session.user.id || userId;
        }
        
        // Check for organizationId from getOrganizationContext middleware result
        if ((req as any).organizationId) {
          organizationId = (req as any).organizationId;
        }
        
        // Check for user from authentication middleware
        if ((req as any).user?.id) {
          userId = (req as any).user.id;
        }
        
        const responseTimeMs = Date.now() - startTime;

        const extra: Record<string, any> = {
          responseTime: responseTimeMs,
          statusCode: res.statusCode,
        };

        // Optionally include request body for POST/PATCH (be careful with sensitive data)
        if (includeBody && !req.originalUrl.startsWith('/api/customer-storage/') && (req.method === "POST" || req.method === "PATCH")) {
          extra.requestBody = req.body;
        }

        await db.insert(auditLogs).values({
          organizationId: organizationId as string,
          userId: userId as string,
          method: req.method as "GET" | "POST" | "PATCH" | "DELETE",
          path: archiveSafeAuditPath(req.originalUrl).slice(0, 512),
          status: res.statusCode,
          ip: (req.ip || req.socket.remoteAddress || "").slice(0, 64),
          userAgent: String(userAgent),
          responseTimeMs,
          extra,
        });
      } catch (error) {
        logger.error("Failed to write audit log", {
          error: error instanceof Error ? error.message : String(error),
          method: req.method,
          path: archiveSafeAuditPath(req.originalUrl),
        });
      }
    });

    next();
  };
}
