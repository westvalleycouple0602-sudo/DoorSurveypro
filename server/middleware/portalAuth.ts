import { Request, Response, NextFunction } from "express";
import { validatePortalShare } from "../services/portal-share.service";
import type { PortalShare } from "@shared/schema";

/**
 * Portal Authentication Middleware
 * 
 * Validates portal share tokens from client requests.
 * Tokens can be provided via query param or Authorization header.
 */

declare global {
  namespace Express {
    interface Request {
      portalShare?: PortalShare;
    }
  }
}

export async function authenticatePortalShare(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract token from query param or Authorization header
    const token = req.query.token as string || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: "Portal access token required",
        code: "PORTAL_TOKEN_MISSING"
      });
    }

    // Extract optional password from query param, header, or body
    const password = (req.query.password as string) ||
                     req.headers['x-portal-password'] as string ||
                     req.body?.password as string | undefined;

    // Validate the portal share
    const share = await validatePortalShare(token, password);

    if (!share) {
      return res.status(403).json({
        error: "Invalid or expired portal access token",
        code: "PORTAL_TOKEN_INVALID"
      });
    }

    // Attach share to request for downstream handlers
    req.portalShare = share;
    next();
  } catch (error) {
    const { logger } = await import("../logger.js");
    logger.error("Portal authentication error", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: "Portal authentication failed",
      code: "PORTAL_AUTH_ERROR"
    });
  }
}

/**
 * Checks if the authenticated portal share has a specific permission
 */
export function requirePortalPermission(permission: 'view' | 'comment' | 'approve') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.portalShare) {
      return res.status(401).json({
        error: "Portal authentication required",
        code: "PORTAL_AUTH_REQUIRED"
      });
    }

    const hasPermission = checkPortalPermission(req.portalShare, permission);

    if (!hasPermission) {
      return res.status(403).json({
        error: `Portal access does not allow '${permission}' permission`,
        code: "PORTAL_PERMISSION_DENIED"
      });
    }

    next();
  };
}

/**
 * Helper function to check portal permissions
 * Access levels: 'view' < 'comment' < 'approve'
 */
function checkPortalPermission(
  share: PortalShare,
  permission: 'view' | 'comment' | 'approve'
): boolean {
  const accessLevel = share.accessLevel;
  
  switch (permission) {
    case 'view':
      return ['view', 'comment', 'approve'].includes(accessLevel);
    case 'comment':
      return ['comment', 'approve'].includes(accessLevel);
    case 'approve':
      return accessLevel === 'approve';
    default:
      return false;
  }
}
