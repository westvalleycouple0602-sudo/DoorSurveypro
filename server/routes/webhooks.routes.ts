import { Router } from "express";
import { storage } from "../storage";
import { getOrganizationContext } from "../clerkAuth";
import { insertWebhookSchema } from "@shared/schema";
import { generateWebhookSecret } from "../utils/apiKey";
import { logger, logAuditEvent } from "../logger";
import { z } from "zod";

const router = Router();

/**
 * GET /api/webhooks
 * List all webhooks for the organization
 */
router.get("/", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hooks = await storage.getWebhooks(orgContext.organizationId);
    
    // SECURITY: Mask the webhook secret (show only prefix)
    const sanitizedHooks = hooks.map(hook => ({
      id: hook.id,
      name: hook.name,
      url: hook.url,
      secretPrefix: hook.secret.substring(0, 12) + "...", // Show "whsec_XXXXX..."
      events: hook.events,
      isActive: hook.isActive,
      retryAttempts: hook.retryAttempts,
      timeoutSeconds: hook.timeoutSeconds,
      lastTriggeredAt: hook.lastTriggeredAt,
      successCount: hook.successCount,
      failureCount: hook.failureCount,
      lastSuccess: hook.lastSuccess,
      lastFailure: hook.lastFailure,
      lastFailureReason: hook.lastFailureReason,
      createdAt: hook.createdAt,
      createdBy: hook.createdBy,
    }));

    res.json(sanitizedHooks);
  } catch (error: any) {
    logger.error("Failed to list webhooks", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post("/", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only owners and admins can create webhooks
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only owners and admins can create webhooks" 
      });
    }

    // Validate request body
    const validatedData = insertWebhookSchema.parse({
      ...req.body,
      organizationId: orgContext.organizationId,
      createdBy: orgContext.userId,
    });

    // Generate webhook secret
    const secret = generateWebhookSecret();

    // Store the webhook
    const newHook = await storage.createWebhook(validatedData, secret);

    // Log audit event
    logAuditEvent(
      orgContext.userId,
      orgContext.organizationId,
      "webhook.created",
      "webhook",
      newHook.id,
      { name: newHook.name, url: newHook.url, events: newHook.events }
    );

    // Return the secret ONLY once at creation
    res.status(201).json({
      id: newHook.id,
      name: newHook.name,
      url: newHook.url,
      secret, // ⚠️ This is the only time the secret is returned
      events: newHook.events,
      isActive: newHook.isActive,
      retryAttempts: newHook.retryAttempts,
      timeoutSeconds: newHook.timeoutSeconds,
      createdAt: newHook.createdAt,
      message: "⚠️ Save this webhook secret now. You won't be able to see it again!",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    logger.error("Failed to create webhook", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhooks/:id
 * Get a specific webhook (without the secret)
 */
router.get("/:id", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hook = await storage.getWebhook(req.params.id, orgContext.organizationId);
    
    if (!hook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // SECURITY: Mask the secret
    res.json({
      id: hook.id,
      name: hook.name,
      url: hook.url,
      secretPrefix: hook.secret.substring(0, 12) + "...",
      events: hook.events,
      isActive: hook.isActive,
      retryAttempts: hook.retryAttempts,
      timeoutSeconds: hook.timeoutSeconds,
      lastTriggeredAt: hook.lastTriggeredAt,
      successCount: hook.successCount,
      failureCount: hook.failureCount,
      lastSuccess: hook.lastSuccess,
      lastFailure: hook.lastFailure,
      lastFailureReason: hook.lastFailureReason,
      createdAt: hook.createdAt,
      createdBy: hook.createdBy,
    });
  } catch (error: any) {
    logger.error("Failed to get webhook", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/webhooks/:id
 * Update a webhook
 */
router.patch("/:id", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only owners and admins can update webhooks
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only owners and admins can update webhooks" 
      });
    }

    // Validate updates (partial schema)
    const updateSchema = insertWebhookSchema.partial().omit({
      organizationId: true,
      createdBy: true,
    });
    
    const validatedUpdates = updateSchema.parse(req.body);

    const updated = await storage.updateWebhook(
      req.params.id,
      orgContext.organizationId,
      validatedUpdates
    );

    if (!updated) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Log audit event
    logAuditEvent(
      orgContext.userId,
      orgContext.organizationId,
      "webhook.updated",
      "webhook",
      updated.id,
      { updates: Object.keys(validatedUpdates) }
    );

    res.json({
      id: updated.id,
      name: updated.name,
      url: updated.url,
      events: updated.events,
      isActive: updated.isActive,
      retryAttempts: updated.retryAttempts,
      timeoutSeconds: updated.timeoutSeconds,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    logger.error("Failed to update webhook", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/:id/test
 * Send a test webhook event
 */
router.post("/:id/test", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hook = await storage.getWebhook(req.params.id, orgContext.organizationId);
    
    if (!hook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Decrypt the webhook secret for delivery
    const { decryptSecret } = await import("../utils/encryption");
    const decryptedSecret = decryptSecret(hook.secret);

    // Send test webhook payload
    const { deliverWebhook } = await import("../utils/webhook-delivery");
    const result = await deliverWebhook({
      url: hook.url,
      secret: decryptedSecret,
      payload: {
        event: "webhook.test",
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook event from DoorSurvey Pro",
          webhookId: hook.id,
          webhookName: hook.name,
        },
        organizationId: orgContext.organizationId,
      },
      timeoutMs: (hook.timeoutSeconds || 10) * 1000,
      maxRetries: 0, // No retries for test
    });

    // Update webhook stats
    await storage.updateWebhookStats(hook.id, {
      lastTriggeredAt: new Date(),
      successCount: result.success ? hook.successCount + 1 : hook.successCount,
      failureCount: result.success ? hook.failureCount : hook.failureCount + 1,
      lastSuccess: result.success ? new Date() : hook.lastSuccess,
      lastFailure: result.success ? hook.lastFailure : new Date(),
      lastFailureReason: result.success ? hook.lastFailureReason : result.error,
    });

    // Log audit event
    logAuditEvent(
      orgContext.userId,
      orgContext.organizationId,
      "webhook.tested",
      "webhook",
      hook.id,
      { success: result.success, url: hook.url }
    );

    res.json({
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
      attemptsMade: result.attemptsMade,
      deliveryTime: result.deliveryTime,
      message: result.success
        ? "Test webhook delivered successfully"
        : "Test webhook delivery failed",
    });
  } catch (error: any) {
    logger.error("Failed to test webhook", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook
 */
router.delete("/:id", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only owners can delete webhooks
    if (orgContext.role !== "owner") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only owners can delete webhooks" 
      });
    }

    const deleted = await storage.deleteWebhook(
      req.params.id,
      orgContext.organizationId
    );

    if (!deleted) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Log audit event
    logAuditEvent(
      orgContext.userId,
      orgContext.organizationId,
      "webhook.deleted",
      "webhook",
      req.params.id,
      {}
    );

    res.json({ message: "Webhook deleted successfully" });
  } catch (error: any) {
    logger.error("Failed to delete webhook", { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
