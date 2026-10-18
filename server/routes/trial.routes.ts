import { Router } from "express";
import { getOrganizationContext, requireAuth as isAuthenticated } from "../clerkAuth";
import { logger } from "../logger";
import {
  checkTrialEligibility,
  activateTrial,
  getTrialStatus,
} from "../services/trial.service";
import { z } from "zod";

const router = Router();

// All trial routes require authentication
// Use path-scoped middleware to avoid catching non-API routes like "/"
router.use("/api/*", isAuthenticated);

/**
 * Check trial eligibility for organization
 * GET /api/organizations/:organizationId/trial/eligibility
 */
router.get("/api/organizations/:organizationId/trial/eligibility", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { organizationId } = req.params;

    // Verify user has access to this organization
    if (orgContext.organizationId !== organizationId) {
      return res.status(403).json({ error: "Access denied to this organization" });
    }

    const eligibility = await checkTrialEligibility(organizationId);

    res.json(eligibility);
  } catch (error: any) {
    logger.error("Failed to check trial eligibility", { errorMessage: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Unable to check trial eligibility. Please retry." });
  }
});

/**
 * Get current trial status for organization
 * GET /api/organizations/:organizationId/trial/status
 */
router.get("/api/organizations/:organizationId/trial/status", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { organizationId } = req.params;

    // Verify user has access to this organization
    if (orgContext.organizationId !== organizationId) {
      return res.status(403).json({ error: "Access denied to this organization" });
    }

    const status = await getTrialStatus(organizationId);
    const eligibility = await checkTrialEligibility(organizationId);

    res.json({
      isActive: status.isActive,
      tier: status.tier,
      endsAt: status.endsAt,
      daysRemaining: status.daysRemaining,
      totalDays: status.totalDays, // Include total trial duration for progress calculations
      isInGracePeriod: status.isInGracePeriod,
      gracePeriodEndsAt: status.gracePeriodEndsAt,
      organizationChanged: status.organizationChanged ?? false,
      canActivateTrial: eligibility.eligible,
      availableTiers: eligibility.availableTiers,
    });
  } catch (error: any) {
    logger.error("Failed to get trial status", { errorMessage: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Unable to load trial status. Please retry." });
  }
});

/**
 * Get current trial status for the authenticated user's organization
 * GET /api/trial/status
 */
router.get("/api/trial/status", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const status = await getTrialStatus(orgContext.organizationId);
    const eligibility = await checkTrialEligibility(orgContext.organizationId);

    res.json({
      isActive: status.isActive,
      tier: status.tier,
      endsAt: status.endsAt,
      daysRemaining: status.daysRemaining,
      totalDays: status.totalDays, // Include total trial duration for progress calculations
      isInGracePeriod: status.isInGracePeriod,
      gracePeriodEndsAt: status.gracePeriodEndsAt,
      organizationChanged: status.organizationChanged ?? false,
      canActivateTrial: eligibility.eligible,
      availableTiers: eligibility.availableTiers,
    });
  } catch (error: any) {
    logger.error("Failed to get trial status", { errorMessage: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Unable to load trial status. Please retry." });
  }
});

const activateTrialSchema = z.object({
  tier: z.enum(["professional", "enterprise"]),
  durationDays: z.number().min(1).max(30).optional(),
});

/**
 * Activate a trial for the authenticated user's organization
 * POST /api/trial/activate
 */
router.post("/api/trial/activate", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only owners and admins can activate trials
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({
        error: "Only organization owners and admins can activate trials",
      });
    }

    // Validate request body
    const validationResult = activateTrialSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
    }

    const config = validationResult.data;

    // Activate the trial
    const result = await activateTrial(orgContext.organizationId, config);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info("Trial activated via API", {
      organizationId: orgContext.organizationId,
      tier: config.tier,
      userId: orgContext.userId,
    });

    res.json({
      success: true,
      message: `${config.tier} trial activated successfully`,
      trialEndsAt: result.trialEndsAt,
    });
  } catch (error: any) {
    logger.error("Failed to activate trial", { errorMessage: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Unable to activate the trial. Please retry." });
  }
});

/**
 * Activate a trial for organization (with org ID parameter)
 * POST /api/organizations/:organizationId/trial/activate
 */
router.post("/api/organizations/:organizationId/trial/activate", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { organizationId } = req.params;

    // Verify user has access to this organization
    if (orgContext.organizationId !== organizationId) {
      return res.status(403).json({ error: "Access denied to this organization" });
    }

    // Only owners and admins can activate trials
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({
        error: "Only organization owners and admins can activate trials",
      });
    }

    // Validate request body
    const validationResult = activateTrialSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
    }

    const config = validationResult.data;

    // Activate the trial
    const result = await activateTrial(organizationId, config);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info("Trial activated via API", {
      organizationId,
      tier: config.tier,
      userId: orgContext.userId,
    });

    res.json({
      success: true,
      message: `${config.tier} trial activated successfully`,
      trialEndsAt: result.trialEndsAt,
    });
  } catch (error: any) {
    logger.error("Failed to activate trial", { errorMessage: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Unable to activate the trial. Please retry." });
  }
});

/**
 * Cancel trial and downgrade to Free tier
 * POST /api/organizations/:organizationId/trial/cancel
 */
router.post("/api/organizations/:organizationId/trial/cancel", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { organizationId } = req.params;

    // Verify user has access to this organization
    if (orgContext.organizationId !== organizationId) {
      return res.status(403).json({ error: "Access denied to this organization" });
    }

    // Only owners and admins can cancel trials
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({
        error: "Only organization owners and admins can cancel trials",
      });
    }

    const { downgradeToFree } = await import("../services/trial.service");
    const result = await downgradeToFree(organizationId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    logger.info("Trial cancelled via API", {
      organizationId,
      userId: orgContext.userId,
    });

    res.json({
      success: true,
      message: "Trial cancelled and downgraded to Free tier",
    });
  } catch (error: any) {
    logger.error("Failed to cancel trial", { error });
    res.status(500).json({ error: error.message || "Failed to cancel trial" });
  }
});

/**
 * TESTING ENDPOINT: Manually trigger trial notifications for testing
 * POST /api/organizations/:organizationId/trial/test-notifications
 * 
 * This endpoint allows testing the notification system without waiting for the scheduled job.
 * Should only be enabled in development/staging environments.
 */
router.post("/api/organizations/:organizationId/trial/test-notifications", async (req, res) => {
  try {
    // Safety check: Only allow in development/staging
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ 
        error: "Manual notification triggering is disabled in production" 
      });
    }

    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { organizationId } = req.params;

    // Verify user belongs to organization AND has owner/admin role
    if (orgContext.organizationId !== organizationId) {
      return res.status(403).json({ error: "Access denied to this organization" });
    }
    
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({ error: "Access denied - owner/admin only" });
    }

    // Import the notification processor
    const { processTrialNotifications } = await import("../services/trial-notification.service");

    logger.info("Manually triggering trial notification check", {
      organizationId,
      triggeredBy: orgContext.userId,
    });

    // Run the notification processor
    const result = await processTrialNotifications();

    res.json({
      success: true,
      message: "Trial notifications processed",
      result: {
        processed: result.processed,
        sent: result.sent,
        skipped: result.skipped,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    logger.error("Failed to process trial notifications", { error });
    res.status(500).json({ 
      error: error.message || "Failed to process trial notifications" 
    });
  }
});

export default router;
