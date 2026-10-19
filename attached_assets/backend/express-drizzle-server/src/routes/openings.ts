import { Router } from "express";
import { db } from "../db/client";
import { openings } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../auth/auth";
const r = Router();
r.get("/:id", authMiddleware("read"), async (req, res) => {
  const id = req.params.id;
  const o = (await db.select().from(openings).where(eq(openings.id, id))).at(0);
  if (!o) return res.status(404).json({ error: "Not found" });
  return res.json({ ...o, x: parseFloat((o as any).x), y: parseFloat((o as any).y) });
});
r.post("/", authMiddleware("write"), async (req, res) => {
  const b = req.body || {};
  if (!b.id){
    const id = crypto.randomUUID();
    await db.insert(openings).values({ id, floorPlanId: b.floorPlanId, code: b.code, label: b.label ?? null, type: b.type, status: b.status ?? null, x: String(b.x ?? 0), y: String(b.y ?? 0), heroUrl: b.heroUrl ?? null, thumbUrl: b.thumbUrl ?? null });
    const created = (await db.select().from(openings).where(eq(openings.id, id))).at(0)!;
    return res.json({ ok:true, opening: { ...created, x: parseFloat((created as any).x), y: parseFloat((created as any).y) } });
  } else {
    await db.update(openings).set({ code: b.code, label: b.label ?? null, type: b.type, status: b.status ?? null, x: String(b.x ?? 0), y: String(b.y ?? 0), heroUrl: b.heroUrl ?? null, thumbUrl: b.thumbUrl ?? null }).where(eq(openings.id, b.id));
    const updated = (await db.select().from(openings).where(eq(openings.id, b.id))).at(0)!;
    return res.json({ ok:true, opening: { ...updated, x: parseFloat((updated as any).x), y: parseFloat((updated as any).y) } });
  }
});
export default r;
