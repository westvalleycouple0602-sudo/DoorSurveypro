
import { Router } from "express";
import { db } from "../db/client";
import { exportProfiles } from "../db/schema/exportProfiles";
import { eq, and } from "drizzle-orm";

const router = Router();

function getContext(req: any) {
  const tenantId = req.user?.tenantId || req.headers["x-tenant-id"];
  const userId = req.user?.id;
  if (!tenantId) throw new Error("Missing tenant context");
  if (!userId) throw new Error("Missing user context");
  return { tenantId, userId };
}

router.get("/api/export-profiles", async (req, res, next) => {
  try {
    const { tenantId } = getContext(req);
    const rows = await db.select().from(exportProfiles).where(eq(exportProfiles.tenantId, tenantId));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/api/export-profiles", async (req, res, next) => {
  try {
    const { tenantId, userId } = getContext(req);
    const body = req.body || {};
    const [created] = await db
      .insert(exportProfiles)
      .values({
        tenantId,
        userId,
        name: body.name,
        description: body.description ?? null,
        scope: body.scope ?? "both",
        showLineItems: body.showLineItems ?? true,
        showLineItemPrices: body.showLineItemPrices ?? true,
        showLineItemQuantities: body.showLineItemQuantities ?? true,
        showLineItemTotals: body.showLineItemTotals ?? true,
        showSummaryTotals: body.showSummaryTotals ?? true,
        groupItemsBy: body.groupItemsBy ?? "none",
        showMaterialBreakdown: body.showMaterialBreakdown ?? true,
        showLaborBreakdown: body.showLaborBreakdown ?? true,
        taxMode: body.taxMode ?? "include_tax",
        showTaxRate: body.showTaxRate ?? true,
        showInternalNotes: body.showInternalNotes ?? false,
        showCostBreakdown: body.showCostBreakdown ?? true,
        showMarginOrMarkup: body.showMarginOrMarkup ?? false,
        defaultAlternativeLabel: body.defaultAlternativeLabel ?? null,
        isDefaultForTenant: body.isDefaultForTenant ?? false,
        templateType: body.templateType ?? null,
        language: body.language ?? "en",
        exportBrandingId: body.exportBrandingId ?? null,
        includeImages: body.includeImages ?? false,
        includeDoorIcons: body.includeDoorIcons ?? false,
        includeScanSnapshots: body.includeScanSnapshots ?? false,
        includeComplianceSummary: body.includeComplianceSummary ?? false,
        includeInstallTimeline: body.includeInstallTimeline ?? false,
        includeCutSheetSection: body.includeCutSheetSection ?? false,
        includeCostCharts: body.includeCostCharts ?? false,
        goodBetterBestMode: body.goodBetterBestMode ?? false,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch("/api/export-profiles/:id", async (req, res, next) => {
  try {
    const { tenantId } = getContext(req);
    const id = req.params.id;
    const body = req.body || {};

    const [updated] = await db
      .update(exportProfiles)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(exportProfiles.id, id), eq(exportProfiles.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Export profile not found" });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/api/export-profiles/:id", async (req, res, next) => {
  try {
    const { tenantId } = getContext(req);
    const id = req.params.id;

    const deleted = await db
      .delete(exportProfiles)
      .where(and(eq(exportProfiles.id, id), eq(exportProfiles.tenantId, tenantId)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: "Export profile not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
