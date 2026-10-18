// server/routes/procurement.routes.ts
// Procurement Package Management Routes

import { Router } from "express";
import { z } from "zod";
import { requireAuth as isAuthenticated } from "../clerkAuth";
import { requireRole } from "../middleware/requireRole";
import { requireOrgAccess } from "../middleware/validateOrg";
import { logger } from "../logger";
import { handleValidationError } from "../utils/error-handler";
import {
  groupLinesIntoPackages,
  countRedFlags,
  getLinesWithRedFlags,
  type ProcurementPackage,
  type ProcurementPackageStatus,
  type HardwareLineInput,
  MANUFACTURER_LABELS,
  PROCUREMENT_STATUS_LABELS,
} from "@shared/projectManagement";

const router = Router();

const packagesByProject = new Map<string, ProcurementPackage[]>();

const hardwareLineSchema = z.object({
  openingId: z.string(),
  hardwareSetId: z.string(),
  manufacturer: z.enum(["ALLEGION", "ASSA_ABLOY", "DORMAKABA", "STANLEY", "HAGER", "OTHER"]),
  manufacturerPart: z.string(),
  description: z.string(),
  quantity: z.number().min(0),
  uom: z.string().optional(),
  voltage: z.string().nullable().optional(),
  finish: z.string().nullable().optional(),
  handing: z.string().nullable().optional(),
  fireRating: z.string().nullable().optional(),
});

const buildPackagesSchema = z.object({
  projectId: z.string(),
  lines: z.array(hardwareLineSchema),
});

const updatePackageSchema = z.object({
  status: z.enum([
    "DRAFT",
    "READY_FOR_REVIEW",
    "RELEASED_TO_MANUFACTURER",
    "ON_HOLD",
    "REVISE_AND_RESUBMIT",
    "CLOSED",
  ]).optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactNotes: z.string().nullable().optional(),
});

router.post(
  "/procurement/build",
  isAuthenticated,
  async (req, res) => {
    try {
      const validation = buildPackagesSchema.safeParse(req.body);
      if (!validation.success) {
        return handleValidationError(validation.error, res);
      }

      const { projectId, lines } = validation.data;
      if (!lines.length) {
        return res.status(400).json({ error: "At least one line is required" });
      }

      const pkgs = groupLinesIntoPackages(lines as HardwareLineInput[], projectId);
      
      const existing = packagesByProject.get(projectId) ?? [];
      existing.push(...pkgs);
      packagesByProject.set(projectId, existing);

      logger.info("Procurement packages built", {
        projectId,
        packagesCreated: pkgs.length,
        totalLines: lines.length,
      });

      res.status(201).json({ packages: pkgs });
    } catch (error: any) {
      logger.error("Procurement build failed", { error: error.message });
      res.status(500).json({ error: "Failed to build procurement packages" });
    }
  }
);

router.get(
  "/procurement/projects/:projectId/packages",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const list = packagesByProject.get(projectId) ?? [];
      res.json({ packages: list });
    } catch (error: any) {
      logger.error("Procurement packages fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch procurement packages" });
    }
  }
);

router.get(
  "/procurement/projects/:projectId/packages/:packageId",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId, packageId } = req.params;
      const list = packagesByProject.get(projectId) ?? [];
      const pkg = list.find((p) => p.id === packageId);
      
      if (!pkg) {
        return res.status(404).json({ error: "Package not found" });
      }
      
      res.json({ package: pkg });
    } catch (error: any) {
      logger.error("Procurement package fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch procurement package" });
    }
  }
);

router.patch(
  "/procurement/projects/:projectId/packages/:packageId",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId, packageId } = req.params;
      const validation = updatePackageSchema.safeParse(req.body);
      
      if (!validation.success) {
        return handleValidationError(validation.error, res);
      }
      
      const list = packagesByProject.get(projectId);
      if (!list) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const idx = list.findIndex((p) => p.id === packageId);
      if (idx === -1) {
        return res.status(404).json({ error: "Package not found" });
      }
      
      const existing = list[idx];
      const updated: ProcurementPackage = {
        ...existing,
        ...validation.data,
        updatedAt: new Date().toISOString(),
      };
      list[idx] = updated;
      packagesByProject.set(projectId, list);

      logger.info("Procurement package updated", { projectId, packageId });
      res.json({ package: updated });
    } catch (error: any) {
      logger.error("Procurement package update failed", { error: error.message });
      res.status(500).json({ error: "Failed to update procurement package" });
    }
  }
);

router.get(
  "/procurement/projects/:projectId/red-flags",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const packages = packagesByProject.get(projectId) ?? [];
      const linesWithFlags = getLinesWithRedFlags(packages);
      const totalFlags = countRedFlags(packages);
      
      res.json({
        totalRedFlags: totalFlags,
        linesWithRedFlags: linesWithFlags,
      });
    } catch (error: any) {
      logger.error("Procurement red flags fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch procurement red flags" });
    }
  }
);

router.get(
  "/procurement/projects/:projectId/stats",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const packages = packagesByProject.get(projectId) ?? [];
      
      const stats = {
        totalPackages: packages.length,
        totalLines: packages.reduce((sum, pkg) => sum + pkg.lines.length, 0),
        totalRedFlags: countRedFlags(packages),
        byStatus: {
          draft: packages.filter((p) => p.status === "DRAFT").length,
          readyForReview: packages.filter((p) => p.status === "READY_FOR_REVIEW").length,
          released: packages.filter((p) => p.status === "RELEASED_TO_MANUFACTURER").length,
          onHold: packages.filter((p) => p.status === "ON_HOLD").length,
          revise: packages.filter((p) => p.status === "REVISE_AND_RESUBMIT").length,
          closed: packages.filter((p) => p.status === "CLOSED").length,
        },
        byManufacturer: {} as Record<string, number>,
      };
      
      for (const pkg of packages) {
        stats.byManufacturer[pkg.manufacturer] = 
          (stats.byManufacturer[pkg.manufacturer] || 0) + 1;
      }
      
      res.json(stats);
    } catch (error: any) {
      logger.error("Procurement stats fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch procurement stats" });
    }
  }
);

router.get(
  "/procurement/labels",
  isAuthenticated,
  async (req, res) => {
    try {
      res.json({
        manufacturers: MANUFACTURER_LABELS,
        statuses: PROCUREMENT_STATUS_LABELS,
      });
    } catch (error: any) {
      logger.error("Procurement labels fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch procurement labels" });
    }
  }
);

export default router;
