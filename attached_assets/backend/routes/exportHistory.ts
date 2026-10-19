
import { Router } from "express";
import { db } from "../db/client";
import { exportHistory } from "../db/schema/exportHistory";
import { eq } from "drizzle-orm";

const router = Router();

function getContext(req: any) {
  const tenantId = req.user?.tenantId || req.headers["x-tenant-id"];
  const userId = req.user?.id;
  if (!tenantId) throw new Error("Missing tenant context");
  if (!userId) throw new Error("Missing user context");
  return { tenantId, userId };
}

router.get("/api/export-history", async (req, res, next) => {
  try {
    const { tenantId } = getContext(req);
    const rows = await db
      .select()
      .from(exportHistory)
      .where(eq(exportHistory.tenantId, tenantId));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
