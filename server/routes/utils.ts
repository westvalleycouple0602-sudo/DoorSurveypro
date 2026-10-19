import type { Request, Response } from "express";
import type { IStorage } from "../storage";
import { logSecurityEvent } from "../logger";
import type { User } from "@shared/schema";

export async function withOrgContext<T>(
  req: Request,
  res: Response,
  orgId: number,
  storage: IStorage,
  operation: () => Promise<T>
): Promise<T | undefined> {
  const user = req.dbUser as User | undefined;
  
  if (!user) {
    logSecurityEvent('unauthorized-access', 'medium', {
      path: req.originalUrl,
      method: req.method
    });
    res.status(401).json({ error: "Unauthorized" });
    return undefined;
  }

  const membership = await storage.getUserPrimaryMembership(user.id);
  if (!membership || Number(membership.organizationId) !== orgId) {
    logSecurityEvent('cross-org-access-attempt', 'high', {
      userId: user.id,
      attemptedOrgId: orgId,
      path: req.originalUrl
    });
    res.status(403).json({ error: "Access denied" });
    return undefined;
  }

  try {
    return await operation();
  } catch (error) {
    throw error;
  }
}

export function validateSchema<T>(data: unknown, schema: any): T {
  return schema.parse(data) as T;
}

export function streamDownload(res: Response, filename: string, contentType: string) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res;
}
