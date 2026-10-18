import { Router } from "express";
import { db } from "../db";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { encryptApiKey } from "../utils/encryption";
import { getOrganizationContext, requireAuth as isAuthenticated } from "../clerkAuth";
import { requireFeature } from "../feature-gates";
import { logger } from "../logger";
import { createHubSpotService } from "../hubspot";

const router = Router();

// HubSpot-specific middleware applied to each route individually below
// (Previously used router.use("/api/*") which incorrectly caught ALL API requests)

/**
 * Get HubSpot configuration status for organization
 */
router.get("/api/organizations/:organizationId/hubspot/status", isAuthenticated, requireFeature("crmSync"), async (req, res) => {
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
    
    const org = await db
      .select({
        hubspotEnabled: organizations.hubspotEnabled,
        hubspotApiKeyConfigured: organizations.hubspotApiKey,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    if (org.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }
    
    res.json({
      enabled: org[0].hubspotEnabled === 'yes',
      configured: !!org[0].hubspotApiKeyConfigured,
    });
  } catch (error: any) {
    logger.error('Failed to get HubSpot status', { error });
    res.status(500).json({ error: error.message || 'Failed to get HubSpot status' });
  }
});

/**
 * Configure HubSpot API key for organization
 */
router.post("/api/organizations/:organizationId/hubspot/configure", isAuthenticated, requireFeature("crmSync"), async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { organizationId } = req.params;
    const { apiKey, enabled } = req.body;
    
    // Verify user has access to this organization and has admin role
    if (orgContext.organizationId !== organizationId) {
      return res.status(403).json({ error: "Access denied to this organization" });
    }
    
    // Verify user is owner or admin
    if (orgContext.role !== 'owner' && orgContext.role !== 'admin') {
      return res.status(403).json({ error: "Only owners and admins can configure integrations" });
    }
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ error: "Valid API key is required" });
    }
    
    // Encrypt the API key before storing
    const encryptedApiKey = encryptApiKey(apiKey.trim());
    
    // Test the API key by creating a service instance
    try {
      const testService = await createHubSpotService(organizationId);
      // Temporarily set the key to test it
      (testService as any).apiKey = apiKey.trim();
      // Make a simple test request
      await (testService as any).request('/crm/v3/objects/contacts?limit=1');
    } catch (error: any) {
      logger.warn('HubSpot API key test failed', { organizationId, error: error.message });
      return res.status(400).json({ 
        error: 'Invalid HubSpot API key or insufficient permissions',
        details: error.message 
      });
    }
    
    // Update organization with encrypted API key
    await db
      .update(organizations)
      .set({
        hubspotApiKey: encryptedApiKey,
        hubspotEnabled: enabled !== false ? 'yes' : 'no',
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
    
    logger.info('HubSpot integration configured', {
      organizationId,
      enabled: enabled !== false,
    });
    
    res.json({
      success: true,
      message: 'HubSpot integration configured successfully',
      enabled: enabled !== false,
    });
  } catch (error: any) {
    logger.error('Failed to configure HubSpot', { error });
    res.status(500).json({ error: error.message || 'Failed to configure HubSpot' });
  }
});

/**
 * Enable/disable HubSpot integration without changing API key
 */
router.patch("/api/organizations/:organizationId/hubspot/toggle", isAuthenticated, requireFeature("crmSync"), async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { organizationId } = req.params;
    const { enabled } = req.body;
    
    // Verify user has access to this organization
    if (orgContext.organizationId !== organizationId) {
      return res.status(403).json({ error: "Access denied to this organization" });
    }
    
    // Verify user is owner or admin
    if (orgContext.role !== 'owner' && orgContext.role !== 'admin') {
      return res.status(403).json({ error: "Only owners and admins can manage integrations" });
    }
    
    await db
      .update(organizations)
      .set({
        hubspotEnabled: enabled ? 'yes' : 'no',
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
    
    logger.info('HubSpot integration toggled', {
      organizationId,
      enabled,
    });
    
    res.json({
      success: true,
      enabled,
    });
  } catch (error: any) {
    logger.error('Failed to toggle HubSpot', { error });
    res.status(500).json({ error: error.message || 'Failed to toggle HubSpot integration' });
  }
});

/**
 * Remove HubSpot configuration
 */
router.delete("/api/organizations/:organizationId/hubspot/configure", isAuthenticated, requireFeature("crmSync"), async (req, res) => {
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
    
    // Verify user is owner or admin
    if (orgContext.role !== 'owner' && orgContext.role !== 'admin') {
      return res.status(403).json({ error: "Only owners and admins can remove integrations" });
    }
    
    await db
      .update(organizations)
      .set({
        hubspotApiKey: null,
        hubspotEnabled: 'no',
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
    
    logger.info('HubSpot integration removed', { organizationId });
    
    res.json({
      success: true,
      message: 'HubSpot integration removed successfully',
    });
  } catch (error: any) {
    logger.error('Failed to remove HubSpot configuration', { error });
    res.status(500).json({ error: error.message || 'Failed to remove HubSpot configuration' });
  }
});

export default router;
