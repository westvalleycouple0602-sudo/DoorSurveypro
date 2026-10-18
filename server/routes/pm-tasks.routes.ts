// server/routes/pm-tasks.routes.ts
// PM Task Management Routes

import { Router } from "express";
import { z } from "zod";
import { requireAuth as isAuthenticated } from "../clerkAuth";
import { requireRole } from "../middleware/requireRole";
import { requireOrgAccess } from "../middleware/validateOrg";
import { logger } from "../logger";
import { handleValidationError } from "../utils/error-handler";
import {
  instantiateTasksForProject,
  pmTaskTemplates,
  type PmTask,
  type PmTaskStatus,
  type PmFeatureTag,
  type PmPhase,
  type PmDiscipline,
  PM_PHASE_LABELS,
  PM_DISCIPLINE_LABELS,
  PM_STATUS_LABELS,
  PM_FEATURE_TAG_LABELS,
} from "@shared/projectManagement";

const router = Router();

const pmTasksByProject = new Map<string, PmTask[]>();

const updateTaskSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "HOLD", "COMPLETE", "VOID"]).optional(),
  assigneeName: z.string().nullable().optional(),
  assigneeRole: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  redFlag: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

router.post(
  "/pm/bootstrap",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "projectId is required" });
      }

      const existing = pmTasksByProject.get(projectId);
      if (existing && existing.length) {
        return res.json({ tasks: existing });
      }

      const tasks = instantiateTasksForProject({ projectId });
      pmTasksByProject.set(projectId, tasks);

      logger.info("PM tasks bootstrapped for project", { projectId, taskCount: tasks.length });
      res.status(201).json({ tasks });
    } catch (error: any) {
      logger.error("PM bootstrap failed", { error: error.message });
      res.status(500).json({ error: "Failed to bootstrap PM tasks" });
    }
  }
);

router.get(
  "/pm/projects/:projectId/tasks",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const tasks = pmTasksByProject.get(projectId) ?? [];
      res.json({ tasks });
    } catch (error: any) {
      logger.error("PM tasks fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch PM tasks" });
    }
  }
);

router.get(
  "/pm/projects/:projectId/tasks/div28-only",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const tasks = pmTasksByProject.get(projectId) ?? [];
      const div28Tasks = tasks.filter((t) => t.discipline === "DIV28");
      res.json({ tasks: div28Tasks });
    } catch (error: any) {
      logger.error("PM Div28 tasks fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch Div28 PM tasks" });
    }
  }
);

router.get(
  "/pm/projects/:projectId/tasks/by-feature",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const tag = req.query.tag as PmFeatureTag | undefined;
      const tasks = pmTasksByProject.get(projectId) ?? [];
      
      if (!tag) {
        return res.json({ tasks });
      }
      
      const filtered = tasks.filter(
        (t) => t.featureTags && t.featureTags.includes(tag)
      );
      res.json({ tasks: filtered });
    } catch (error: any) {
      logger.error("PM tasks by feature fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch PM tasks by feature" });
    }
  }
);

router.get(
  "/pm/projects/:projectId/tasks/by-phase/:phase",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId, phase } = req.params;
      const tasks = pmTasksByProject.get(projectId) ?? [];
      const filtered = tasks.filter((t) => t.phase === phase);
      res.json({ tasks: filtered });
    } catch (error: any) {
      logger.error("PM tasks by phase fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch PM tasks by phase" });
    }
  }
);

router.get(
  "/pm/projects/:projectId/stats",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const tasks = pmTasksByProject.get(projectId) ?? [];
      
      const stats = {
        total: tasks.length,
        byStatus: {
          notStarted: tasks.filter((t) => t.status === "NOT_STARTED").length,
          inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
          hold: tasks.filter((t) => t.status === "HOLD").length,
          complete: tasks.filter((t) => t.status === "COMPLETE").length,
          void: tasks.filter((t) => t.status === "VOID").length,
        },
        byDiscipline: {
          div8: tasks.filter((t) => t.discipline === "DIV8").length,
          div28: tasks.filter((t) => t.discipline === "DIV28").length,
          other: tasks.filter((t) => !["DIV8", "DIV28"].includes(t.discipline)).length,
        },
        redFlags: tasks.filter((t) => t.redFlag).length,
      };
      
      res.json(stats);
    } catch (error: any) {
      logger.error("PM stats fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch PM stats" });
    }
  }
);

router.patch(
  "/pm/projects/:projectId/tasks/:taskId",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const validation = updateTaskSchema.safeParse(req.body);
      
      if (!validation.success) {
        return handleValidationError(validation.error, res);
      }
      
      const tasks = pmTasksByProject.get(projectId);
      if (!tasks) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const idx = tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      const existing = tasks[idx];
      const updated: PmTask = {
        ...existing,
        ...validation.data,
        updatedAt: new Date().toISOString(),
      };
      tasks[idx] = updated;
      pmTasksByProject.set(projectId, tasks);

      logger.info("PM task updated", { projectId, taskId, updates: validation.data });
      res.json({ task: updated });
    } catch (error: any) {
      logger.error("PM task update failed", { error: error.message });
      res.status(500).json({ error: "Failed to update PM task" });
    }
  }
);

router.get(
  "/pm/templates",
  isAuthenticated,
  async (req, res) => {
    try {
      res.json({ templates: pmTaskTemplates });
    } catch (error: any) {
      logger.error("PM templates fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch PM templates" });
    }
  }
);

router.get(
  "/pm/labels",
  isAuthenticated,
  async (req, res) => {
    try {
      res.json({
        phases: PM_PHASE_LABELS,
        disciplines: PM_DISCIPLINE_LABELS,
        statuses: PM_STATUS_LABELS,
        featureTags: PM_FEATURE_TAG_LABELS,
      });
    } catch (error: any) {
      logger.error("PM labels fetch failed", { error: error.message });
      res.status(500).json({ error: "Failed to fetch PM labels" });
    }
  }
);

export default router;
