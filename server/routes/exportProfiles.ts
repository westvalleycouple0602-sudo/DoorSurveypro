import { Router } from "express";
import { db } from "../db";
import { exportProfiles, insertExportProfileSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getOrganizationContext } from "../clerkAuth";

const router = Router();

// Get all export profiles for the organization
router.get("/api/export-profiles", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    
    const rows = await db
      .select()
      .from(exportProfiles)
      .where(eq(exportProfiles.organizationId, organizationId));
    
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Create new export profile
router.post("/api/export-profiles", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId, userId } = context;
    
    const validated = insertExportProfileSchema.parse({
      ...req.body,
      organizationId,
      userId,
    });
    
    const [created] = await db
      .insert(exportProfiles)
      .values(validated)
      .returning();
    
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Update export profile
router.patch("/api/export-profiles/:id", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const id = req.params.id;
    
    const validated = insertExportProfileSchema.partial().parse(req.body);
    
    // Strip protected fields to prevent tenant reassignment
    const { organizationId: _, userId: __, ...safeUpdate } = validated;
    
    const [updated] = await db
      .update(exportProfiles)
      .set({
        ...safeUpdate,
        updatedAt: new Date(),
      })
      .where(and(eq(exportProfiles.id, id), eq(exportProfiles.organizationId, organizationId)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Export profile not found" });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete export profile
router.delete("/api/export-profiles/:id", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const id = req.params.id;
    
    const deleted = await db
      .delete(exportProfiles)
      .where(and(eq(exportProfiles.id, id), eq(exportProfiles.organizationId, organizationId)))
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
