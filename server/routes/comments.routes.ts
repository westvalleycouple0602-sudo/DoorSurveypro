import { Router } from "express";
import { z } from "zod";
import { requireAuth as isAuthenticated } from "../clerkAuth";
import {
  createComment,
  getProjectComments,
  getCommentById,
  updateComment,
  deleteComment,
  getUserMentions,
  markMentionAsRead,
} from "../services/comments.service";
import { logCommentAdded } from "../services/activity.service";
import { insertProjectCommentSchema } from "@shared/schema";

const router = Router();

/**
 * Comments Routes
 * Handles project comments, mentions, and comment threads
 */

// Create comment schema with validation
const createCommentSchema = z.object({
  projectId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentCommentId: z.string().uuid().optional(),
});

/**
 * POST /api/projects/:projectId/comments
 * Create a new comment on a project
 */
router.post(
  "/projects/:projectId/comments",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const projectId = req.params.projectId;
      const body = createCommentSchema.parse({ ...req.body, projectId });
      
      const userId = req.dbUser!.id;
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      // Create comment
      const comment = await createComment({
        organizationId,
        projectId: body.projectId,
        authorId: userId,
        authorType: "team",
        content: body.content,
        parentCommentId: body.parentCommentId,
      });

      // Log activity
      await logCommentAdded({
        organizationId,
        projectId: body.projectId,
        commentId: comment.id,
        actorId: userId,
        actorType: "team",
        commentPreview: body.content.substring(0, 100),
      });

      res.status(201).json(comment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  }
);

/**
 * GET /api/projects/:projectId/comments
 * Get all comments for a project with pagination
 * CRITICAL: Requires organization scoping for cross-tenant protection
 */
router.get(
  "/projects/:projectId/comments",
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
      const includeDeleted = req.query.includeDeleted === "true";

      const result = await getProjectComments(projectId, organizationId, {
        limit,
        offset,
        includeDeleted,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  }
);

/**
 * GET /api/comments/:commentId
 * Get a specific comment by ID
 * CRITICAL: Requires organization scoping for cross-tenant protection
 */
router.get(
  "/comments/:commentId",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const commentId = req.params.commentId;
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const comment = await getCommentById(commentId, organizationId);
      res.json(comment);
    } catch (error: any) {
      if (error.message === "Comment not found") {
        return res.status(404).json({ error: "Comment not found" });
      }
      console.error("Error fetching comment:", error);
      res.status(500).json({ error: "Failed to fetch comment" });
    }
  }
);

/**
 * PATCH /api/comments/:commentId
 * Update a comment (only by author)
 */
router.patch(
  "/comments/:commentId",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const commentId = req.params.commentId;
      const { content } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }

      if (content.length > 5000) {
        return res.status(400).json({ error: "Content exceeds maximum length" });
      }

      const userId = req.dbUser!.id;
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const comment = await updateComment({
        commentId,
        authorId: userId,
        content,
        organizationId,
      });

      res.json(comment);
    } catch (error: any) {
      if (error.message === "Comment not found or unauthorized") {
        return res.status(404).json({ error: "Comment not found or unauthorized" });
      }
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  }
);

/**
 * DELETE /api/comments/:commentId
 * Soft delete a comment (only by author)
 * CRITICAL: Requires organization scoping for cross-tenant protection
 */
router.delete(
  "/comments/:commentId",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const commentId = req.params.commentId;
      const userId = req.dbUser!.id;
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      await deleteComment(commentId, userId, organizationId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Comment not found or unauthorized") {
        return res.status(404).json({ error: "Comment not found or unauthorized" });
      }
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  }
);

/**
 * GET /api/mentions
 * Get all comments where current user was mentioned
 * CRITICAL: Requires organization scoping to prevent cross-tenant data exposure
 */
router.get(
  "/mentions",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const userId = req.dbUser!.id;
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === "true";

      const result = await getUserMentions(userId, organizationId, {
        limit,
        offset,
        unreadOnly,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching mentions:", error);
      res.status(500).json({ error: "Failed to fetch mentions" });
    }
  }
);

/**
 * POST /api/comments/:commentId/mark-read
 * Mark a mention as read
 * CRITICAL: Requires organization scoping for defense-in-depth
 */
router.post(
  "/comments/:commentId/mark-read",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const commentId = req.params.commentId;
      const userId = req.dbUser!.id;
      const organizationId = req.dbUser!.organizationId;

      if (!organizationId) {
        return res.status(403).json({ error: "No organization context" });
      }

      await markMentionAsRead(commentId, userId, organizationId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking mention as read:", error);
      res.status(500).json({ error: "Failed to mark mention as read" });
    }
  }
);

export default router;
