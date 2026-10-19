import { Router } from "express";
import { db } from "../db/client";
import { openingFiles } from "../db/schema";
import { eq } from "drizzle-orm";
const r = Router();
r.post("/ingest", async (req, res) => {
  const { fileId, size, thumbUrl } = req.body || {};
  if (!fileId || typeof size !== "number") return res.status(400).json({ error: "Missing fileId/size" });
  await db.update(openingFiles).set({ thumbUrl: thumbUrl ?? null }).where(eq(openingFiles.id, fileId));
  return res.json({ ok: true });
});
export default r;
