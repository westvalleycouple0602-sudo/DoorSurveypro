import { Router } from "express";
import { z } from "zod";
import {
  createPortalShare,
  validatePortalShare,
  revokePortalShare,
  getProjectPortalShares,
  getOrganizationPortalShares,
  updatePortalShare,
  deletePortalShare,
} from "../services/portal-share.service";
import {
  approveQuote,
  requestChanges,
  rejectQuote,
  resetApproval,
  getProjectApprovalHistory,
  validateApprovalAction,
} from "../services/portal-approval.service";
import { insertPortalShareSchema, portalShares } from "@shared/schema";
import { requireRole } from "../middleware/requireRole";
import { authenticatePortalShare, requirePortalPermission } from "../middleware/portalAuth";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { storage } from "../storage";

const router = Router();

/**
 * Create a new portal share for a project
 * POST /api/portal-shares
 * 
 * Returns the share record AND the plaintext token (shown only once!)
 */
router.post(
  "/",
  requireRole("manager"),
  async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validatedData = insertPortalShareSchema.parse(req.body);

      // Ensure user is creating share for their organization
      if (validatedData.organizationId !== user.organizationId) {
        return res.status(403).json({ error: "Cannot create share for different organization" });
      }

      const result = await createPortalShare({
        ...validatedData,
        createdBy: user.id,
      });

      res.json({
        share: result.share,
        token: result.token, // IMPORTANT: Only returned once!
        message: "Portal share created successfully. Save this token - it won't be shown again!",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating portal share:", error);
      res.status(500).json({ error: "Failed to create portal share" });
    }
  }
);

/**
 * Get all portal shares for a project
 * GET /api/portal-shares/project/:projectId
 */
router.get(
  "/project/:projectId",
  requireRole("viewer"),
  async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const shares = await getProjectPortalShares(req.params.projectId);

      // Filter to only shares from user's organization
      const orgShares = shares.filter(
        (share) => share.organizationId === user.organizationId
      );

      res.json(orgShares);
    } catch (error) {
      console.error("Error fetching project portal shares:", error);
      res.status(500).json({ error: "Failed to fetch portal shares" });
    }
  }
);

/**
 * Get all portal shares for the authenticated user's organization
 * GET /api/portal-shares
 */
router.get(
  "/",
  requireRole("manager"),
  async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const shares = await getOrganizationPortalShares(user.organizationId);
      res.json(shares);
    } catch (error) {
      console.error("Error fetching organization portal shares:", error);
      res.status(500).json({ error: "Failed to fetch portal shares" });
    }
  }
);

/**
 * Update a portal share
 * PATCH /api/portal-shares/:shareId
 */
router.patch(
  "/:shareId",
  requireRole("manager"),
  async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // CRITICAL: Fetch and verify ownership BEFORE mutation
      const [existingShare] = await db
        .select()
        .from(portalShares)
        .where(eq(portalShares.id, req.params.shareId))
        .limit(1);

      if (!existingShare) {
        return res.status(404).json({ error: "Portal share not found" });
      }

      if (existingShare.organizationId !== user.organizationId) {
        return res.status(403).json({ error: "Cannot update share from different organization" });
      }

      const updateSchema = insertPortalShareSchema
        .partial()
        .omit({ organizationId: true, projectId: true })
        .extend({
          password: z.string().optional(),
        });

      const validatedData = updateSchema.parse(req.body);
      const updated = await updatePortalShare(req.params.shareId, validatedData);

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating portal share:", error);
      res.status(500).json({ error: "Failed to update portal share" });
    }
  }
);

/**
 * Revoke a portal share (soft delete - sets isActive to false)
 * POST /api/portal-shares/:shareId/revoke
 */
router.post(
  "/:shareId/revoke",
  requireRole("manager"),
  async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // CRITICAL: Fetch and verify ownership BEFORE mutation
      const [existingShare] = await db
        .select()
        .from(portalShares)
        .where(eq(portalShares.id, req.params.shareId))
        .limit(1);

      if (!existingShare) {
        return res.status(404).json({ error: "Portal share not found" });
      }

      if (existingShare.organizationId !== user.organizationId) {
        return res.status(403).json({ error: "Cannot revoke share from different organization" });
      }

      await revokePortalShare(req.params.shareId);
      res.json({ message: "Portal share revoked successfully" });
    } catch (error) {
      console.error("Error revoking portal share:", error);
      res.status(500).json({ error: "Failed to revoke portal share" });
    }
  }
);

/**
 * Delete a portal share permanently
 * DELETE /api/portal-shares/:shareId
 */
router.delete(
  "/:shareId",
  requireRole("admin"),
  async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // CRITICAL: Fetch and verify ownership BEFORE mutation
      const [existingShare] = await db
        .select()
        .from(portalShares)
        .where(eq(portalShares.id, req.params.shareId))
        .limit(1);

      if (!existingShare) {
        return res.status(404).json({ error: "Portal share not found" });
      }

      if (existingShare.organizationId !== user.organizationId) {
        return res.status(403).json({ error: "Cannot delete share from different organization" });
      }

      await deletePortalShare(req.params.shareId);
      res.json({ message: "Portal share deleted successfully" });
    } catch (error) {
      console.error("Error deleting portal share:", error);
      res.status(500).json({ error: "Failed to delete portal share" });
    }
  }
);

// ============================================================================
// APPROVAL WORKFLOW ROUTES (Team authenticated)
// ============================================================================

/**
 * Reset approval status back to pending
 * POST /api/portal-shares/:shareId/reset-approval
 */
router.post(
  "/:shareId/reset-approval",
  requireRole("manager"),
  async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Verify ownership
      const [existingShare] = await db
        .select()
        .from(portalShares)
        .where(eq(portalShares.id, req.params.shareId))
        .limit(1);

      if (!existingShare) {
        return res.status(404).json({ error: "Portal share not found" });
      }

      if (existingShare.organizationId !== user.organizationId) {
        return res.status(403).json({ error: "Cannot reset approval for different organization" });
      }

      const updated = await resetApproval(req.params.shareId);
      res.json(updated);
    } catch (error) {
      console.error("Error resetting approval:", error);
      res.status(500).json({ error: "Failed to reset approval" });
    }
  }
);

/**
 * Get approval history for a project
 * GET /api/portal-shares/project/:projectId/approvals
 */
router.get(
  "/project/:projectId/approvals",
  requireRole("viewer"),
  async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const history = await getProjectApprovalHistory(req.params.projectId);

      // Filter to only shares from user's organization
      const orgHistory = history.filter(
        (share) => share.organizationId === user.organizationId
      );

      res.json(orgHistory);
    } catch (error) {
      console.error("Error fetching approval history:", error);
      res.status(500).json({ error: "Failed to fetch approval history" });
    }
  }
);

// ============================================================================
// PUBLIC PORTAL ROUTES (Token-authenticated, no user session required)
// ============================================================================

/**
 * Validate a portal share token
 * POST /api/portal/validate
 * 
 * Public endpoint - used by clients to validate their access token
 */
router.post("/portal/validate", async (req, res) => {
  try {
    const schema = z.object({
      token: z.string(),
      password: z.string().optional(),
    });

    const { token, password } = schema.parse(req.body);
    const share = await validatePortalShare(token, password);

    if (!share) {
      return res.status(403).json({
        error: "Invalid or expired portal access",
        code: "PORTAL_INVALID",
      });
    }

    res.json({
      valid: true,
      share: {
        id: share.id,
        projectId: share.projectId,
        accessLevel: share.accessLevel,
        clientName: share.clientName,
        clientEmail: share.clientEmail,
        clientCompany: share.clientCompany,
        requiresPassword: share.requiresPassword,
        expiresAt: share.expiresAt,
        approvalStatus: share.approvalStatus,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error validating portal share:", error);
    res.status(500).json({ error: "Failed to validate portal access" });
  }
});

/**
 * Get project details via portal share
 * GET /api/portal/project
 * 
 * Public endpoint - requires valid portal token
 */
router.get(
  "/portal/project",
  authenticatePortalShare,
  requirePortalPermission('view'),
  async (req, res) => {
    try {
      const share = req.portalShare!;
      
      const project = await storage.getProject(share.projectId, share.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const openings = await storage.getOpeningsByProject(share.projectId);

      // Sanitized response
      const response: any = {
        name: project.name,
        description: project.notes, // project.notes or project.scopeOfWork? The task said description
        location: project.location,
        status: project.status,
        openingCount: openings.length,
        createdAt: project.createdAt,
      };

      if (share.accessLevel === 'edit' || share.accessLevel === 'approve') {
        response.openings = openings;
        response.scopeOfWork = project.scopeOfWork;
      }

      res.json(response);
    } catch (error) {
      console.error("Error fetching portal project:", error);
      res.status(500).json({ error: "Failed to fetch project details" });
    }
  }
);

/**
 * Approve a quote via portal share
 * POST /api/portal/approve
 * 
 * Public endpoint - requires valid portal token with 'approve' permission
 */
router.post(
  "/portal/approve",
  authenticatePortalShare,
  requirePortalPermission('approve'),
  async (req, res) => {
    try {
      const share = req.portalShare!;
      
      const schema = z.object({
        feedback: z.string().optional(),
      });

      const { feedback } = schema.parse(req.body);

      // Validate approval action
      const validation = await validateApprovalAction(share.id);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }

      const updated = await approveQuote(share.id, feedback);
      
      res.json({
        success: true,
        approvalStatus: updated.approvalStatus,
        approvedAt: updated.approvedAt,
        message: "Quote approved successfully",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      if (error.message === "APPROVAL_CONFLICT") {
        return res.status(409).json({ 
          error: "This quote has already been decided. Please contact your vendor to reset the approval if needed.",
          code: "APPROVAL_CONFLICT" 
        });
      }
      console.error("Error approving quote:", error);
      res.status(500).json({ error: "Failed to approve quote" });
    }
  }
);

/**
 * Request changes to a quote via portal share
 * POST /api/portal/request-changes
 * 
 * Public endpoint - requires valid portal token with 'approve' permission
 */
router.post(
  "/portal/request-changes",
  authenticatePortalShare,
  requirePortalPermission('approve'),
  async (req, res) => {
    try {
      const share = req.portalShare!;
      
      const schema = z.object({
        feedback: z.string().min(1, "Feedback is required when requesting changes"),
      });

      const { feedback } = schema.parse(req.body);

      // Validate approval action
      const validation = await validateApprovalAction(share.id);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }

      const updated = await requestChanges(share.id, feedback);
      
      res.json({
        success: true,
        approvalStatus: updated.approvalStatus,
        feedback: updated.approvalFeedback,
        message: "Changes requested successfully",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      if (error.message === "APPROVAL_CONFLICT") {
        return res.status(409).json({ 
          error: "This quote has already been decided. Please contact your vendor to reset the approval if needed.",
          code: "APPROVAL_CONFLICT" 
        });
      }
      console.error("Error requesting changes:", error);
      res.status(500).json({ error: "Failed to request changes" });
    }
  }
);

/**
 * Reject a quote via portal share
 * POST /api/portal/reject
 * 
 * Public endpoint - requires valid portal token with 'approve' permission
 */
router.post(
  "/portal/reject",
  authenticatePortalShare,
  requirePortalPermission('approve'),
  async (req, res) => {
    try {
      const share = req.portalShare!;
      
      const schema = z.object({
        feedback: z.string().optional(),
      });

      const { feedback } = schema.parse(req.body);

      // Validate approval action
      const validation = await validateApprovalAction(share.id);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }

      const updated = await rejectQuote(share.id, feedback);
      
      res.json({
        success: true,
        approvalStatus: updated.approvalStatus,
        feedback: updated.approvalFeedback,
        message: "Quote rejected successfully",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      if (error.message === "APPROVAL_CONFLICT") {
        return res.status(409).json({ 
          error: "This quote has already been decided. Please contact your vendor to reset the approval if needed.",
          code: "APPROVAL_CONFLICT" 
        });
      }
      console.error("Error rejecting quote:", error);
      res.status(500).json({ error: "Failed to reject quote" });
    }
  }
);

export default router;
