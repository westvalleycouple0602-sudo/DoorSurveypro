import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import {
  projects,
  doorOpenings,
  organizations,
  hardwareItems,
  insertProjectSchema,
  insertDoorOpeningSchema,
  type Project,
  type DoorOpening,
} from "@shared/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { logger, logAuditEvent } from "../logger";
import { apiKeyAuth, requireScope } from "../middleware/apiKeyAuth";

const router = Router();

// ===========================
// MIDDLEWARE: All routes require API key authentication
// ===========================
router.use(apiKeyAuth);

// ===========================
// PROJECTS API
// ===========================

/**
 * GET /api/v1/projects
 * List all projects for the authenticated organization
 * Scope: projects:read OR projects:*
 */
router.get(
  "/projects",
  requireScope(["projects:read", "projects:*"]),
  async (req, res) => {
    try {
      const { organizationId } = (req as any).apiKey;

      // Query parameters for pagination
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const results = await db
        .select()
        .from(projects)
        .where(eq(projects.organizationId, organizationId))
        .orderBy(desc(projects.id))
        .limit(limit)
        .offset(offset);

      res.json({
        data: results,
        pagination: {
          limit,
          offset,
          count: results.length,
        },
      });
    } catch (error) {
      logger.error("API v1: Failed to fetch projects", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch projects",
      });
    }
  }
);

/**
 * GET /api/v1/projects/:id
 * Get a single project by ID
 * Scope: projects:read OR projects:*
 */
router.get(
  "/projects/:id",
  requireScope(["projects:read", "projects:*"]),
  async (req, res) => {
    try {
      const { organizationId } = (req as any).apiKey;
      const projectId = req.params.id;

      const result = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "Project not found",
        });
      }

      res.json({ data: result[0] });
    } catch (error) {
      logger.error("API v1: Failed to fetch project", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch project",
      });
    }
  }
);

/**
 * POST /api/v1/projects
 * Create a new project
 * Scope: projects:write OR projects:*
 */
router.post(
  "/projects",
  requireScope(["projects:write", "projects:*"]),
  async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).apiKey;

      // Validate request body
      const validationResult = insertProjectSchema
        .omit({ organizationId: true })
        .safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid project data",
          details: validationResult.error.errors,
        });
      }

      // Create project with organization context
      const newProject = await db
        .insert(projects)
        .values({
          ...validationResult.data,
          organizationId,
        })
        .returning();

      logAuditEvent(
        userId || "api-system",
        organizationId,
        "project-created",
        "project",
        newProject[0].id,
        { via: "api-v1", name: newProject[0].name }
      );

      res.status(201).json({ data: newProject[0] });
    } catch (error) {
      logger.error("API v1: Failed to create project", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create project",
      });
    }
  }
);

/**
 * PATCH /api/v1/projects/:id
 * Update an existing project
 * Scope: projects:write OR projects:*
 */
router.patch(
  "/projects/:id",
  requireScope(["projects:write", "projects:*"]),
  async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).apiKey;
      const projectId = req.params.id;

      // Verify project exists and belongs to organization
      const existing = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "Project not found",
        });
      }

      // Validate and update
      const validationResult = insertProjectSchema
        .partial()
        .omit({ organizationId: true })
        .safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid project data",
          details: validationResult.error.errors,
        });
      }

      const updated = await db
        .update(projects)
        .set(validationResult.data)
        .where(eq(projects.id, projectId))
        .returning();

      logAuditEvent(
        userId || "api-system",
        organizationId,
        "project-updated",
        "project",
        projectId,
        { via: "api-v1" }
      );

      res.json({ data: updated[0] });
    } catch (error) {
      logger.error("API v1: Failed to update project", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update project",
      });
    }
  }
);

/**
 * DELETE /api/v1/projects/:id
 * Delete a project
 * Scope: projects:write OR projects:*
 */
router.delete(
  "/projects/:id",
  requireScope(["projects:write", "projects:*"]),
  async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).apiKey;
      const projectId = req.params.id;

      // Verify project exists
      const existing = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "Project not found",
        });
      }

      await db.delete(projects).where(eq(projects.id, projectId));

      logAuditEvent(
        userId || "api-system",
        organizationId,
        "project-deleted",
        "project",
        projectId,
        { via: "api-v1" }
      );

      res.status(204).send();
    } catch (error) {
      logger.error("API v1: Failed to delete project", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to delete project",
      });
    }
  }
);

// ===========================
// DOOR OPENINGS API
// ===========================

/**
 * GET /api/v1/projects/:projectId/door-openings
 * List all door openings for a project
 * Scope: door-openings:read OR door-openings:* OR projects:*
 */
router.get(
  "/projects/:projectId/door-openings",
  requireScope(["door-openings:read", "door-openings:*", "projects:*"]),
  async (req, res) => {
    try {
      const { organizationId } = (req as any).apiKey;
      const projectId = req.params.projectId;

      // Verify project belongs to organization
      const project = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .limit(1);

      if (project.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "Project not found",
        });
      }

      const results = await db
        .select()
        .from(doorOpenings)
        .where(eq(doorOpenings.projectId, projectId))
        .orderBy(asc(doorOpenings.openingNumber));

      res.json({ data: results });
    } catch (error) {
      logger.error("API v1: Failed to fetch door openings", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch door openings",
      });
    }
  }
);

/**
 * POST /api/v1/projects/:projectId/door-openings
 * Create a new door opening
 * Scope: door-openings:write OR door-openings:* OR projects:*
 */
router.post(
  "/projects/:projectId/door-openings",
  requireScope(["door-openings:write", "door-openings:*", "projects:*"]),
  async (req, res) => {
    try {
      const { organizationId } = (req as any).apiKey;
      const projectId = req.params.projectId;

      // Verify project belongs to organization
      const project = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .limit(1);

      if (project.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "Project not found",
        });
      }

      // Validate request body - projectId is provided via URL parameter
      const dataToValidate = { ...req.body, projectId };
      const validationResult = insertDoorOpeningSchema.safeParse(dataToValidate);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid door opening data",
          details: validationResult.error.errors,
        });
      }

      const newDoorOpening = await db
        .insert(doorOpenings)
        .values(validationResult.data)
        .returning();

      res.status(201).json({ data: newDoorOpening[0] });
    } catch (error) {
      logger.error("API v1: Failed to create door opening", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create door opening",
      });
    }
  }
);

// ===========================
// ORGANIZATIONS API (Read-only)
// ===========================

/**
 * GET /api/v1/organization
 * Get the authenticated organization's details
 * Scope: organization:read OR *
 */
router.get(
  "/organization",
  requireScope(["organization:read", "*"]),
  async (req, res) => {
    try {
      const { organizationId } = (req as any).apiKey;

      const result = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "Organization not found",
        });
      }

      res.json({ data: result[0] });
    } catch (error) {
      logger.error("API v1: Failed to fetch organization", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch organization",
      });
    }
  }
);

// ===========================
// HARDWARE API (Read-only)
// ===========================

/**
 * GET /api/v1/projects/:projectId/hardware
 * List all hardware items for a project (across all door openings)
 * Scope: hardware:read OR hardware:* OR projects:*
 */
router.get(
  "/projects/:projectId/hardware",
  requireScope(["hardware:read", "hardware:*", "projects:*"]),
  async (req, res) => {
    try {
      const { organizationId } = (req as any).apiKey;
      const projectId = req.params.projectId;

      // Verify project belongs to organization
      const project = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
          )
        )
        .limit(1);

      if (project.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "Project not found",
        });
      }

      // Get all door openings for this project
      const openings = await db
        .select({ id: doorOpenings.id })
        .from(doorOpenings)
        .where(eq(doorOpenings.projectId, projectId));

      if (openings.length === 0) {
        return res.json({ data: [] });
      }

      // Get hardware for ALL openings using IN clause
      const openingIds = openings.map(o => o.id);
      const results = await db
        .select()
        .from(hardwareItems)
        .where(
          // Drizzle ORM's inArray for querying multiple IDs
          inArray(hardwareItems.openingId, openingIds)
        )
        .orderBy(asc(hardwareItems.openingId), asc(hardwareItems.id));

      res.json({ data: results });
    } catch (error) {
      logger.error("API v1: Failed to fetch hardware items", { error });
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch hardware items",
      });
    }
  }
);

export default router;
