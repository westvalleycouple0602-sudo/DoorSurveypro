
import { Router } from "express";
import { generateQuoteExport } from "../services/exportService";

const router = Router();

function getContext(req: any) {
  const tenantId = req.user?.tenantId || req.headers["x-tenant-id"];
  const userId = req.user?.id;
  if (!tenantId) throw new Error("Missing tenant context");
  if (!userId) throw new Error("Missing user context");
  return { tenantId, userId };
}

router.post("/api/quotes/:quoteId/export", async (req, res, next) => {
  try {
    const { tenantId, userId } = getContext(req);
    const { quoteId } = req.params;
    const body = req.body || {};

    const { buffer, filename, mimetype } = await generateQuoteExport({
      tenantId,
      userId,
      quoteId,
      exportProfileId: body.exportProfileId ?? null,
      quoteVersionId: body.quoteVersionId ?? null,
      format: body.format ?? "pdf",
      templateType: body.templateType ?? null,
      language: body.language ?? "en",
    });

    res.setHeader("Content-Type", mimetype);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
