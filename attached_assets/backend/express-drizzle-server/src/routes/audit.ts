import { Router } from "express";
import { db } from "../db/client";
import { auditLogs } from "../db/schema";
import { desc } from "drizzle-orm";
import { authMiddleware } from "../auth/auth";
const r = Router();
r.get("/", authMiddleware("admin"), async (req, res) => {
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.at)).limit(200);
  return res.json(rows);
});
export default r;
