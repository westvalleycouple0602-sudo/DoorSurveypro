import { Router } from "express";
import { storage } from "../storage";
import { insertRoadmapMilestoneSchema, insertRoadmapTaskSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { logger } from "../logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ============================================================================
// MILESTONES
// ============================================================================

// GET /api/roadmap/milestones - Get all milestones for organization
router.get("/milestones", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const milestones = await storage.getRoadmapMilestones(organizationId);
    res.json(milestones);
  } catch (error) {
    next(error);
  }
});

// GET /api/roadmap/milestones/:id - Get specific milestone
router.get("/milestones/:id", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const milestone = await storage.getRoadmapMilestone(req.params.id, organizationId);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    res.json(milestone);
  } catch (error) {
    next(error);
  }
});

// POST /api/roadmap/milestones - Create new milestone
router.post("/milestones", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = insertRoadmapMilestoneSchema.parse({
      ...req.body,
      organizationId,
    });

    const milestone = await storage.createRoadmapMilestone(data);
    res.status(201).json(milestone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    next(error);
  }
});

// PATCH /api/roadmap/milestones/:id - Update milestone
router.patch("/milestones/:id", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const milestone = await storage.updateRoadmapMilestone(
      req.params.id,
      organizationId,
      req.body
    );

    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    res.json(milestone);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/roadmap/milestones/:id - Delete milestone
router.delete("/milestones/:id", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const success = await storage.deleteRoadmapMilestone(req.params.id, organizationId);
    if (!success) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TASKS
// ============================================================================

// GET /api/roadmap/milestones/:milestoneId/tasks - Get tasks for milestone
router.get("/milestones/:milestoneId/tasks", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify milestone belongs to organization
    const milestone = await storage.getRoadmapMilestone(req.params.milestoneId, organizationId);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const tasks = await storage.getRoadmapTasksByMilestone(req.params.milestoneId, organizationId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /api/roadmap/tasks - Get all tasks for organization
router.get("/tasks", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tasks = await storage.getRoadmapTasksByOrganization(organizationId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /api/roadmap/tasks/:id - Get specific task
router.get("/tasks/:id", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // SECURITY: getRoadmapTask now verifies organization ownership
    const task = await storage.getRoadmapTask(req.params.id, organizationId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// POST /api/roadmap/tasks - Create new task
router.post("/tasks", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify milestone belongs to organization
    const milestone = await storage.getRoadmapMilestone(req.body.milestoneId, organizationId);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const data = insertRoadmapTaskSchema.parse(req.body);
    const task = await storage.createRoadmapTask(data);
    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    next(error);
  }
});

// PATCH /api/roadmap/tasks/:id - Update task
router.patch("/tasks/:id", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // SECURITY: updateRoadmapTask now verifies organization ownership
    const updated = await storage.updateRoadmapTask(req.params.id, organizationId, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/roadmap/tasks/:id - Delete task
router.delete("/tasks/:id", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // SECURITY: deleteRoadmapTask now verifies organization ownership
    const success = await storage.deleteRoadmapTask(req.params.id, organizationId);
    if (!success) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BULK IMPORT
// ============================================================================

// POST /api/roadmap/import - Import roadmap from JSON
router.post("/import", async (req, res, next) => {
  try {
    const organizationId = req.dbUser?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate JSON structure
    if (!req.body || !req.body.milestones || !Array.isArray(req.body.milestones)) {
      return res.status(400).json({ message: "Invalid roadmap JSON format" });
    }

    const result = await storage.importRoadmapFromJSON(req.body, organizationId);
    
    logger.info("Roadmap imported successfully", {
      organizationId,
      milestones: result.milestones,
      tasks: result.tasks,
    });

    res.json({
      message: "Roadmap imported successfully",
      ...result,
    });
  } catch (error) {
    logger.error("Failed to import roadmap", { error });
    next(error);
  }
});

export default router;
