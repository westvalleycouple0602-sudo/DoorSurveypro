import type { Request, Response, NextFunction } from "express";
import { logger, logSecurityEvent } from "../logger";

export interface OrgContext {
  userId: string;
  organizationId: string;
  userRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      orgContext?: OrgContext;
    }
  }
}

export function requireOrgAccess(req: Request, res: Response, next: NextFunction) {
  const user = req.dbUser as any;
  
  if (!user) {
    logSecurityEvent('org-access-denied', 'medium', { 
      path: req.path,
      reason: 'no-user'
    });
    return res.status(401).json({ error: "Unauthorized" });
  }

  const orgId = req.params.organizationId || req.body.organizationId;
  
  if (!orgId) {
    logSecurityEvent('org-access-denied', 'low', { 
      userId: user.id,
      path: req.path,
      reason: 'no-org-id'
    });
    return res.status(400).json({ error: "Organization ID required" });
  }

  if (user.organizationId !== orgId) {
    logSecurityEvent('org-access-denied', 'high', { 
      userId: user.id,
      requestedOrg: orgId,
      userOrg: user.organizationId,
      path: req.path,
      reason: 'org-mismatch'
    });
    return res.status(403).json({ error: "Access denied to this organization" });
  }

  req.orgContext = {
    userId: user.id,
    organizationId: orgId,
    userRole: user.role
  };

  next();
}

export async function withOrgContext<T>(
  userId: string,
  userOrgId: string,
  requestedOrgId: string,
  operation: (orgId: string) => Promise<T>
): Promise<T> {
  if (userOrgId !== requestedOrgId) {
    logSecurityEvent('org-context-violation', 'high', {
      userId,
      userOrg: userOrgId,
      requestedOrg: requestedOrgId,
      reason: 'org-mismatch'
    });
    throw new Error('Access denied to organization');
  }

  logger.debug('Executing operation with org context', {
    userId,
    organizationId: requestedOrgId
  });

  return operation(requestedOrgId);
}
