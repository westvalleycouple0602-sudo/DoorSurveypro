import { Router } from "express";
import { db } from "../db";
import { exportBranding, insertExportBrandingSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getOrganizationContext } from "../clerkAuth";

const router = Router();

// Get all branding for the organization
router.get("/api/export-branding", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    
    const rows = await db
      .select()
      .from(exportBranding)
      .where(eq(exportBranding.organizationId, organizationId));
    
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Create new branding
router.post("/api/export-branding", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    
    const validated = insertExportBrandingSchema.parse({
      ...req.body,
      organizationId,
    });
    
    const [created] = await db
      .insert(exportBranding)
      .values(validated)
      .returning();
    
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Update branding
router.patch("/api/export-branding/:id", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const id = req.params.id;
    
    const validated = insertExportBrandingSchema.partial().parse(req.body);
    
    // Strip protected fields to prevent tenant reassignment
    const { organizationId: _, ...safeUpdate } = validated;
    
    const [updated] = await db
      .update(exportBranding)
      .set({
        ...safeUpdate,
        updatedAt: new Date(),
      })
      .where(and(eq(exportBranding.id, id), eq(exportBranding.organizationId, organizationId)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Export branding not found" });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete branding
router.delete("/api/export-branding/:id", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const id = req.params.id;
    
    const deleted = await db
      .delete(exportBranding)
      .where(and(eq(exportBranding.id, id), eq(exportBranding.organizationId, organizationId)))
      .returning();
    
    if (!deleted.length) {
      return res.status(404).json({ error: "Export branding not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
