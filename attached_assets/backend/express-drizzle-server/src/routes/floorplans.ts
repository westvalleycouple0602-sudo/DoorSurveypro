import { Router } from "express";
import { db } from "../db/client";
import { floorPlans, openings } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../auth/auth";
const r = Router();
r.get("/:id", authMiddleware("read"), async (req, res) => {
  const id = req.params.id;
  const plan = (await db.select().from(floorPlans).where(eq(floorPlans.id, id))).at(0);
  if (!plan) return res.status(404).json({ error: "Not found" });
  const ops = await db.select().from(openings).where(eq(openings.floorPlanId, id));
  return res.json({ ...plan, openings: ops.map(o => ({ ...o, x: parseFloat((o as any).x), y: parseFloat((o as any).y) })) });
});
export default r;
