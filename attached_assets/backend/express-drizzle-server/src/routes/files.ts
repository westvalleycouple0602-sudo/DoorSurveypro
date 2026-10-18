import { Router } from "express";
import { authMiddleware } from "../auth/auth";
import { signUpload, signDownload } from "../storage/s3";
import { db } from "../db/client";
import { openingFiles } from "../db/schema";
import { randomUUID } from "crypto";
const r = Router();
r.post("/sign-upload", authMiddleware("write"), async (req, res) => {
  const { openingId, name, kind, contentType } = req.body || {};
  if (!openingId || !name || !kind || !contentType) return res.status(400).json({ error: "Missing fields" });
  const key = `${req.auth!.tenantId}/${openingId}/${Date.now()}_${name}`;
  const uploadUrl = await signUpload(key, contentType);
  const id = randomUUID();
  await db.insert(openingFiles).values({ id, openingId, kind, name, url: `s3://${process.env.S3_BUCKET}/${key}` });
  return res.json({ id, key, uploadUrl });
});
r.get("/:id/signed", authMiddleware("read"), async (req, res) => {
  const id = req.params.id;
  const rec = (await db.select().from(openingFiles).where(openingFiles.id.eq(id))).at(0);
  if (!rec) return res.status(404).json({ error: "Not found" });
  const key = (rec as any).url.replace(/^s3:\/\//, "").split("/").slice(1).join("/");
  const url = await signDownload(key);
  return res.json({ url });
});
export default r;
