import type { Request, Response, NextFunction } from "express";
type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();
export function rateLimit({ rate = 120, perSec = 60 } = {}){
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.auth?.tenantId || "public") + ":" + (req.auth?.userId || req.ip);
    const now = Date.now(); const refill = rate / (perSec*1000);
    const b = buckets.get(key) || { tokens: rate, last: now };
    const dt = now - b.last; b.tokens = Math.min(rate, b.tokens + dt*refill); b.last = now;
    if (b.tokens < 1) return res.status(429).json({ error: "rate_limited" }); b.tokens -= 1; buckets.set(key,b); next();
  }
}
