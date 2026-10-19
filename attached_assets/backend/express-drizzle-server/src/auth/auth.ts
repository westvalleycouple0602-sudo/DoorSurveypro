import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/client";
import { memberships } from "../db/schema";
import { eq } from "drizzle-orm";

export type AuthContext = { userId: string; tenantId: string; role: string };
declare global { namespace Express { interface Request { auth?: AuthContext } } }

export function authMiddleware(required: "read"|"write"|"admin" = "read"){
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const tenantId = String(req.headers["x-tenant-id"] || "");
      if (!token || !tenantId) return res.status(401).json({ error: "Missing token or tenant" });
      const payload: any = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
      const ms = await db.select().from(memberships).where(eq(memberships.userId, payload.sub));
      const m = ms.find(x => (x as any).tenantId === tenantId);
      if (!m) return res.status(403).json({ error: "No tenant access" });
      req.auth = { userId: String(payload.sub), tenantId, role: (m as any).role };
      const rank = ["viewer","surveyor","manager","admin","owner"];
      const need = required === "read" ? 0 : required === "write" ? 1 : 3;
      if (rank.indexOf((m as any).role) < need) return res.status(403).json({ error: "Insufficient role" });
      next();
    } catch (e:any) { return res.status(401).json({ error: "Unauthorized", detail: e?.message }); }
  }
}
