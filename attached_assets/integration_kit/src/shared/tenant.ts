import { Request, Response, NextFunction } from "express";

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  // In production, derive from auth session/JWT/header
  const tenantId = (req.headers["x-tenant-id"] as string) || "demo-tenant";
  (req as any).tenantId = tenantId;
  next();
}
