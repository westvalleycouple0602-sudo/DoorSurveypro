import { Router } from "express";
import { storage } from "../storage";
import { getOrganizationContext } from "../clerkAuth";
import { insertApiKeySchema } from "@shared/schema";
import { generateApiKey } from "../utils/apiKey";
import { logger, logAuditEvent, logSecurityEvent } from "../logger";
import { z } from "zod";

const router = Router();

/**
 * GET /api/api-keys
 * List all API keys for the organization (without showing the actual keys)
 */
router.get("/", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const keys = await storage.getApiKeys(orgContext.organizationId);
    
    // SECURITY: Never return the actual key hash or full key
    const sanitizedKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
      rateLimitWindow: key.rateLimitWindow,
      lastUsedAt: key.lastUsedAt,
      requestCount: key.requestCount,
      expiresAt: key.expiresAt,
      revokedAt: key.revokedAt,
      revokedReason: key.revokedReason,
      allowedIps: key.allowedIps,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
    }));

    res.json(sanitizedKeys);
  } catch (error: any) {
    logger.error("Failed to list API keys", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/api-keys
 * Create a new API key (returns the plain key ONCE)
 */
router.post("/", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only owners and admins can create API keys
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only owners and admins can create API keys" 
      });
    }

    // Validate request body
    const validatedData = insertApiKeySchema.parse({
      ...req.body,
      organizationId: orgContext.organizationId,
      createdBy: orgContext.userId,
    });

    // Generate API key and hash
    const { apiKey, keyHash, keyPrefix } = generateApiKey();

    // Store the key (with hash only)
    const newKey = await storage.createApiKey(validatedData, keyHash, keyPrefix);

    // Log audit event
    logAuditEvent(
      orgContext.userId,
      orgContext.organizationId,
      "api_key.created",
      "api_key",
      newKey.id,
      { name: newKey.name, scopes: newKey.scopes }
    );

    // SECURITY: Return the plain key ONLY once at creation
    res.status(201).json({
      id: newKey.id,
      name: newKey.name,
      apiKey, // ⚠️ This is the only time the plain key is returned
      keyPrefix: newKey.keyPrefix,
      scopes: newKey.scopes,
      rateLimit: newKey.rateLimit,
      rateLimitWindow: newKey.rateLimitWindow,
      expiresAt: newKey.expiresAt,
      allowedIps: newKey.allowedIps,
      createdAt: newKey.createdAt,
      message: "⚠️ Save this API key now. You won't be able to see it again!",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    logger.error("Failed to create API key", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/api-keys/:id
 * Get a specific API key (without the actual key)
 */
router.get("/:id", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const key = await storage.getApiKey(req.params.id, orgContext.organizationId);
    
    if (!key) {
      return res.status(404).json({ error: "API key not found" });
    }

    // SECURITY: Never return the key hash
    res.json({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
      rateLimitWindow: key.rateLimitWindow,
      lastUsedAt: key.lastUsedAt,
      requestCount: key.requestCount,
      expiresAt: key.expiresAt,
      revokedAt: key.revokedAt,
      revokedReason: key.revokedReason,
      allowedIps: key.allowedIps,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
    });
  } catch (error: any) {
    logger.error("Failed to get API key", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/api-keys/:id
 * Update an API key (name, scopes, rate limits, IP restrictions, expiration)
 */
router.patch("/:id", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only owners and admins can update API keys
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only owners and admins can update API keys" 
      });
    }

    // Validate updates (partial schema)
    const updateSchema = insertApiKeySchema.partial().omit({
      organizationId: true,
      createdBy: true,
    });
    
    const validatedUpdates = updateSchema.parse(req.body);

    const updated = await storage.updateApiKey(
      req.params.id,
      orgContext.organizationId,
      validatedUpdates
    );

    if (!updated) {
      return res.status(404).json({ error: "API key not found" });
    }

    // Log audit event
    logAuditEvent(
      orgContext.userId,
      orgContext.organizationId,
      "api_key.updated",
      "api_key",
      updated.id,
      { updates: Object.keys(validatedUpdates) }
    );

    res.json({
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scopes: updated.scopes,
      rateLimit: updated.rateLimit,
      rateLimitWindow: updated.rateLimitWindow,
      expiresAt: updated.expiresAt,
      allowedIps: updated.allowedIps,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    logger.error("Failed to update API key", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/api-keys/:id/revoke
 * Revoke an API key (prevents future use)
 */
router.post("/:id/revoke", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only owners and admins can revoke API keys
    if (orgContext.role !== "owner" && orgContext.role !== "admin") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only owners and admins can revoke API keys" 
      });
    }

    const { reason } = req.body;

    const revoked = await storage.revokeApiKey(
      req.params.id,
      orgContext.organizationId,
      orgContext.userId,
      reason
    );

    if (!revoked) {
      return res.status(404).json({ error: "API key not found" });
    }

    // Log security event
    logSecurityEvent("api-key-revoked", "medium", {
      keyId: revoked.id,
      organizationId: orgContext.organizationId,
      revokedBy: orgContext.userId,
      reason,
    });

    // Log audit event
    logAuditEvent(
      orgContext.userId,
      orgContext.organizationId,
      "api_key.revoked",
      "api_key",
      revoked.id,
      { reason }
    );

    res.json({
      message: "API key revoked successfully",
      id: revoked.id,
      revokedAt: revoked.revokedAt,
      revokedBy: revoked.revokedBy,
      revokedReason: revoked.revokedReason,
    });
  } catch (error: any) {
    logger.error("Failed to revoke API key", { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/api-keys/:id
 * Permanently delete an API key
 */
router.delete("/:id", async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only owners can delete API keys
    if (orgContext.role !== "owner") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only owners can delete API keys" 
      });
    }

    const deleted = await storage.deleteApiKey(
      req.params.id,
      orgContext.organizationId
    );

    if (!deleted) {
      return res.status(404).json({ error: "API key not found" });
    }

    // Log audit event
    logAuditEvent(
      orgContext.userId,
      orgContext.organizationId,
      "api_key.deleted",
      "api_key",
      req.params.id,
      {}
    );

    res.json({ message: "API key deleted successfully" });
  } catch (error: any) {
    logger.error("Failed to delete API key", { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
