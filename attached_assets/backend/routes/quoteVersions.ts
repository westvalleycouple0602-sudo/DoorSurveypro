
import { Router } from "express";
import { db } from "../db/client";
import { quoteVersions } from "../db/schema/quoteVersions";
import { eq } from "drizzle-orm";

const router = Router();

function getContext(req: any) {
  const tenantId = req.user?.tenantId || req.headers["x-tenant-id"];
  const userId = req.user?.id;
  if (!tenantId) throw new Error("Missing tenant context");
  if (!userId) throw new Error("Missing user context");
  return { tenantId, userId };
}

router.get("/api/quotes/:quoteId/versions", async (req, res, next) => {
  try {
    getContext(req);
    const { quoteId } = req.params;
    const rows = await db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quoteId));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/api/quotes/:quoteId/versions", async (req, res, next) => {
  try {
    const { userId } = getContext(req);
    const { quoteId } = req.params;
    const body = req.body || {};

    const [created] = await db
      .insert(quoteVersions)
      .values({
        quoteId,
        label: body.label ?? "Option",
        isPrimary: body.isPrimary ?? false,
        notes: body.notes ?? null,
        createdBy: userId,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch("/api/quote-versions/:id", async (req, res, next) => {
  try {
    getContext(req);
    const id = req.params.id;
    const body = req.body || {};

    const [updated] = await db
      .update(quoteVersions)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(quoteVersions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Quote version not found" });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
