import { Router } from "express";
import { requireAuth as isAuthenticated } from "../clerkAuth";
import {
  getProjectActivities,
  getOrganizationActivities,
} from "../services/activity.service";

const router = Router();

/**
 * Activities Routes
 * Handles project activity feeds and organization-wide activity tracking
 */

/**
 * GET /api/projects/:projectId/activities
 * Get activity feed for a specific project
 * CRITICAL: Requires organization scoping for cross-tenant protection
 */
router.get(
  "/projects/:projectId/activities",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const projectId = req.params.projectId;
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const activityTypes = req.query.types
        ? (req.query.types as string).split(",")
        : undefined;

      const result = await getProjectActivities(projectId, organizationId, {
        limit,
        offset,
        activityTypes,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching project activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  }
);

/**
 * GET /api/activities
 * Get recent activities across all projects in the organization
 */
router.get(
  "/activities",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const activityTypes = req.query.types
        ? (req.query.types as string).split(",")
        : undefined;

      const result = await getOrganizationActivities(organizationId, {
        limit,
        offset,
        activityTypes,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching organization activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  }
);

export default router;
