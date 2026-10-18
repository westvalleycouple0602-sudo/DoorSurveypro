import { Router } from "express";
import { z } from "zod";
import { requireAuth as isAuthenticated } from "../clerkAuth";
import { VersioningService, type VersionComparisonResult, type VersionWithMarks } from "../services/versioningService";
import { storage } from "../storage";
import { logger } from "../logger";
import type { VersionableEntityType } from "@shared/schema";

const router = Router();

const versioningService = new VersioningService(storage);

const createVersionSchema = z.object({
  entityType: z.enum(["quote", "diagram", "floor_plan", "note", "spec", "opening"]),
  entityId: z.string().uuid(),
  snapshot: z.record(z.any()),
  versionName: z.string().optional(),
  changeSummary: z.string().optional(),
  thumbnailUrl: z.string().optional(),
});

const compareVersionsSchema = z.object({
  versionId1: z.string().uuid(),
  versionId2: z.string().uuid(),
});

const restoreVersionSchema = z.object({
  versionId: z.string().uuid(),
});

const entityTypeSchema = z.enum(["quote", "diagram", "floor_plan", "note", "spec", "opening"]);

router.post(
  "/versions",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const userId = req.dbUser!.id;

      const validationResult = createVersionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { entityType, entityId, snapshot, versionName, changeSummary, thumbnailUrl } = validationResult.data;

      const version = await versioningService.createVersion(
        organizationId,
        entityType as VersionableEntityType,
        entityId,
        snapshot,
        userId,
        { versionName, changeSummary, thumbnailUrl }
      );

      const versionWithMarks = await versioningService.getVersion(version.id);

      logger.info("Version created via API", {
        entityType,
        entityId,
        versionId: version.id,
        versionNumber: version.versionNumber,
        userId,
        organizationId,
      });

      res.status(201).json(versionWithMarks);
    } catch (error: any) {
      logger.error("Error creating version", {
        error: error.message,
        stack: error.stack,
        body: req.body,
      });
      res.status(500).json({ error: "Failed to create version" });
    }
  }
);

router.get(
  "/entities/:entityType/:entityId/history",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const { entityType, entityId } = req.params;

      const entityTypeResult = entityTypeSchema.safeParse(entityType);
      if (!entityTypeResult.success) {
        return res.status(400).json({
          error: "Invalid entity type",
          details: entityTypeResult.error.errors,
        });
      }

      const uuidSchema = z.string().uuid();
      const entityIdResult = uuidSchema.safeParse(entityId);
      if (!entityIdResult.success) {
        return res.status(400).json({
          error: "Invalid entity ID format",
          details: entityIdResult.error.errors,
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await versioningService.getVersionHistory(
        organizationId,
        entityType as VersionableEntityType,
        entityId,
        limit,
        offset
      );

      res.json(result);
    } catch (error: any) {
      logger.error("Error fetching version history", {
        error: error.message,
        stack: error.stack,
        params: req.params,
      });
      res.status(500).json({ error: "Failed to fetch version history" });
    }
  }
);

router.get(
  "/versions/:versionId",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const { versionId } = req.params;

      const uuidSchema = z.string().uuid();
      const versionIdResult = uuidSchema.safeParse(versionId);
      if (!versionIdResult.success) {
        return res.status(400).json({
          error: "Invalid version ID format",
          details: versionIdResult.error.errors,
        });
      }

      const version = await versioningService.getVersion(versionId);

      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      res.json(version);
    } catch (error: any) {
      logger.error("Error fetching version", {
        error: error.message,
        stack: error.stack,
        versionId: req.params.versionId,
      });
      res.status(500).json({ error: "Failed to fetch version" });
    }
  }
);

router.post(
  "/compare",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const validationResult = compareVersionsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { versionId1, versionId2 } = validationResult.data;

      const comparison = await versioningService.compareVersions(versionId1, versionId2);

      logger.info("Versions compared via API", {
        versionId1,
        versionId2,
        totalChanges: comparison.summary.totalChanges,
        organizationId,
      });

      res.json(comparison);
    } catch (error: any) {
      if (error.message === "One or both versions not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Cannot compare versions from different entities") {
        return res.status(400).json({ error: error.message });
      }
      logger.error("Error comparing versions", {
        error: error.message,
        stack: error.stack,
        body: req.body,
      });
      res.status(500).json({ error: "Failed to compare versions" });
    }
  }
);

router.post(
  "/restore",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const userId = req.dbUser!.id;

      const validationResult = restoreVersionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { versionId } = validationResult.data;

      const restoredVersion = await versioningService.restoreVersion(
        versionId,
        userId,
        organizationId
      );

      logger.info("Version restored via API", {
        originalVersionId: versionId,
        newVersionId: restoredVersion.id,
        userId,
        organizationId,
      });

      res.status(201).json(restoredVersion);
    } catch (error: any) {
      if (error.message === "Version not found" || error.message === "Versioned entity not found") {
        return res.status(404).json({ error: error.message });
      }
      logger.error("Error restoring version", {
        error: error.message,
        stack: error.stack,
        body: req.body,
      });
      res.status(500).json({ error: "Failed to restore version" });
    }
  }
);

router.get(
  "/versions/:versionId/marks",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const { versionId } = req.params;
      const { category } = req.query;

      const uuidSchema = z.string().uuid();
      const versionIdResult = uuidSchema.safeParse(versionId);
      if (!versionIdResult.success) {
        return res.status(400).json({
          error: "Invalid version ID format",
          details: versionIdResult.error.errors,
        });
      }

      let marks;
      if (category && typeof category === "string") {
        marks = await versioningService.getRevisionMarksByCategory(versionId, category);
      } else {
        const version = await versioningService.getVersion(versionId);
        if (!version) {
          return res.status(404).json({ error: "Version not found" });
        }
        marks = version.revisionMarks;
      }

      res.json(marks);
    } catch (error: any) {
      logger.error("Error fetching revision marks", {
        error: error.message,
        stack: error.stack,
        versionId: req.params.versionId,
      });
      res.status(500).json({ error: "Failed to fetch revision marks" });
    }
  }
);

router.delete(
  "/entities/:entityType/:entityId",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const { entityType, entityId } = req.params;

      const entityTypeResult = entityTypeSchema.safeParse(entityType);
      if (!entityTypeResult.success) {
        return res.status(400).json({
          error: "Invalid entity type",
          details: entityTypeResult.error.errors,
        });
      }

      const uuidSchema = z.string().uuid();
      const entityIdResult = uuidSchema.safeParse(entityId);
      if (!entityIdResult.success) {
        return res.status(400).json({
          error: "Invalid entity ID format",
          details: entityIdResult.error.errors,
        });
      }

      await versioningService.deleteVersionHistory(
        organizationId,
        entityType as VersionableEntityType,
        entityId
      );

      logger.info("Version history deleted via API", {
        entityType,
        entityId,
        organizationId,
      });

      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error("Error deleting version history", {
        error: error.message,
        stack: error.stack,
        params: req.params,
      });
      res.status(500).json({ error: "Failed to delete version history" });
    }
  }
);

export default router;
