import type { Request, Response, NextFunction } from "express";
import { db } from "./db/client";
import { auditLogs } from "./db/schema";
export function auditMiddleware(req: Request, res: Response, next: NextFunction){
  const started = Date.now(); const ua = req.headers["user-agent"] || "";
  res.on("finish", async () => {
    try{
      await db.insert(auditLogs).values({
        tenantId: (req.auth?.tenantId ?? "public") as any,
        userId: (req.auth?.userId ?? "anon") as any,
        method: req.method, path: req.originalUrl.slice(0,512),
        status: res.statusCode, ip: (req.ip || "").slice(0,64) as any, ua: String(ua),
        extra: { ms: Date.now()-started }
      });
    }catch{}
  }); next();
}
