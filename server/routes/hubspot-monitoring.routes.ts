import type { Express } from "express";
import type { RouteDependencies } from "./deps";
import { getOrganizationContext } from "../clerkAuth";
import { handleValidationError } from "../utils/error-handler";
import { db } from "../db";
import { hubspotSyncLinks, hubspotSyncEvents } from "@shared/schema";
import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { createHubSpotService } from "../hubspot";

/**
 * HubSpot Sync Monitoring Routes
 * Provides monitoring, analytics, and retry capabilities for HubSpot sync operations
 * 
 * Endpoints:
 * - GET /api/hubspot/sync/links - List sync links with filters
 * - GET /api/hubspot/sync/events - List sync events with filters
 * - GET /api/hubspot/sync/stats - Get sync statistics
 * - POST /api/hubspot/sync/retry/:linkId - Retry failed sync
 */

// Query validation schemas
const linksQuerySchema = z.object({
  status: z.enum(['pending', 'synced', 'failed', 'conflict']).optional(),
  localObjectType: z.enum(['project', 'contact', 'deal', 'company']).optional(),
  hubspotObjectType: z.enum(['deal', 'contact', 'company', 'note']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0)
});

const eventsQuerySchema = z.object({
  outcome: z.enum(['success', 'failure']).optional(),
  eventType: z.enum(['create', 'update', 'delete']).optional(),
  syncDirection: z.enum(['push', 'pull']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export async function registerHubSpotMonitoringRoutes(app: Express, deps: RouteDependencies) {
  const { logError, logAuditEvent } = deps;

  /**
   * GET /api/hubspot/sync/links
   * List sync links with optional filters
   * Returns historical data even if HubSpot is not currently configured
   */
  app.get("/api/hubspot/sync/links", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Validate query parameters
      const params = linksQuerySchema.parse(req.query);

      // Build filters for organization-scoped query
      const filters: any[] = [eq(hubspotSyncLinks.organizationId, orgContext.organizationId)];

      if (params.status) {
        filters.push(eq(hubspotSyncLinks.syncStatus, params.status));
      }

      if (params.localObjectType) {
        filters.push(eq(hubspotSyncLinks.localObjectType, params.localObjectType));
      }

      if (params.hubspotObjectType) {
        filters.push(eq(hubspotSyncLinks.hubspotObjectType, params.hubspotObjectType));
      }

      if (params.fromDate) {
        filters.push(gte(hubspotSyncLinks.createdAt, params.fromDate));
      }

      if (params.toDate) {
        filters.push(lte(hubspotSyncLinks.createdAt, params.toDate));
      }

      // Query with pagination
      const links = await db
        .select()
        .from(hubspotSyncLinks)
        .where(and(...filters))
        .orderBy(desc(hubspotSyncLinks.updatedAt))
        .limit(params.limit)
        .offset(params.offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(hubspotSyncLinks)
        .where(and(...filters));

      // Check if HubSpot is currently configured
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      const isConfigured = hubspotService.isConfigured();

      res.json({
        links,
        pagination: {
          total: count,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + params.limit < count
        },
        hubspotConfigured: isConfigured,
        warning: !isConfigured ? 'HubSpot integration not currently configured' : undefined
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/hubspot/sync/events
   * List sync events with optional filters
   * Returns historical data even if HubSpot is not currently configured
   */
  app.get("/api/hubspot/sync/events", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Validate query parameters
      const params = eventsQuerySchema.parse(req.query);

      // Build filters for organization-scoped query
      const filters: any[] = [eq(hubspotSyncEvents.organizationId, orgContext.organizationId)];

      if (params.outcome) {
        filters.push(eq(hubspotSyncEvents.outcome, params.outcome));
      }

      if (params.eventType) {
        filters.push(eq(hubspotSyncEvents.eventType, params.eventType));
      }

      if (params.syncDirection) {
        filters.push(eq(hubspotSyncEvents.syncDirection, params.syncDirection));
      }

      if (params.fromDate) {
        filters.push(gte(hubspotSyncEvents.createdAt, params.fromDate));
      }

      if (params.toDate) {
        filters.push(lte(hubspotSyncEvents.createdAt, params.toDate));
      }

      // Query with pagination
      const events = await db
        .select()
        .from(hubspotSyncEvents)
        .where(and(...filters))
        .orderBy(desc(hubspotSyncEvents.createdAt))
        .limit(params.limit)
        .offset(params.offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(hubspotSyncEvents)
        .where(and(...filters));

      // Check if HubSpot is currently configured
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      const isConfigured = hubspotService.isConfigured();

      res.json({
        events,
        pagination: {
          total: count,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + params.limit < count
        },
        hubspotConfigured: isConfigured,
        warning: !isConfigured ? 'HubSpot integration not currently configured' : undefined
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/hubspot/sync/stats
   * Get aggregated sync statistics
   * Returns overall sync health metrics
   */
  app.get("/api/hubspot/sync/stats", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Get link status breakdown
      const linkStats = await db
        .select({
          status: hubspotSyncLinks.syncStatus,
          count: sql<number>`count(*)::int`
        })
        .from(hubspotSyncLinks)
        .where(eq(hubspotSyncLinks.organizationId, orgContext.organizationId))
        .groupBy(hubspotSyncLinks.syncStatus);

      // Get event outcome breakdown
      const eventStats = await db
        .select({
          outcome: hubspotSyncEvents.outcome,
          count: sql<number>`count(*)::int`
        })
        .from(hubspotSyncEvents)
        .where(eq(hubspotSyncEvents.organizationId, orgContext.organizationId))
        .groupBy(hubspotSyncEvents.outcome);

      // Get recent failures for quick visibility
      const recentFailures = await db
        .select()
        .from(hubspotSyncLinks)
        .where(and(
          eq(hubspotSyncLinks.organizationId, orgContext.organizationId),
          eq(hubspotSyncLinks.syncStatus, 'failed')
        ))
        .orderBy(desc(hubspotSyncLinks.lastAttemptAt))
        .limit(10);

      // Calculate success rate
      const totalEvents = eventStats.reduce((sum, stat) => sum + stat.count, 0);
      const successfulEvents = eventStats.find(stat => stat.outcome === 'success')?.count || 0;
      const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;

      // Check if HubSpot is currently configured
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      const isConfigured = hubspotService.isConfigured();

      res.json({
        linkStats: linkStats.reduce((acc, stat) => ({
          ...acc,
          [stat.status]: stat.count
        }), { pending: 0, synced: 0, failed: 0, conflict: 0 }),
        eventStats: eventStats.reduce((acc, stat) => ({
          ...acc,
          [stat.outcome]: stat.count
        }), { success: 0, failure: 0 }),
        successRate: Math.round(successRate * 100) / 100,
        totalSyncOperations: totalEvents,
        recentFailures,
        hubspotConfigured: isConfigured,
        warning: !isConfigured ? 'HubSpot integration not currently configured' : undefined
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * POST /api/hubspot/sync/retry/:linkId
   * Retry a failed sync operation
   * Validates ownership and link status before retry
   */
  app.post("/api/hubspot/sync/retry/:linkId", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const { linkId } = req.params;

      // Get link and verify ownership
      const [link] = await db
        .select()
        .from(hubspotSyncLinks)
        .where(and(
          eq(hubspotSyncLinks.id, linkId),
          eq(hubspotSyncLinks.organizationId, orgContext.organizationId)
        ))
        .limit(1);

      if (!link) {
        return res.status(404).json({ error: "Sync link not found" });
      }

      // Validate link is in a retryable state
      if (link.syncStatus !== 'failed') {
        return res.status(400).json({ 
          error: `Cannot retry sync in status: ${link.syncStatus}. Only 'failed' syncs can be retried.` 
        });
      }

      // Check if HubSpot is configured
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }

      // Dispatch retry based on object type
      let result;
      
      if (link.localObjectType === 'project') {
        // Get project data
        const { storage } = deps;
        const project = await storage.getProject(link.localObjectId, orgContext.organizationId);
        if (!project) {
          return res.status(404).json({ error: "Project not found" });
        }

        // Get project cost
        const cost = await storage.getProjectCost(link.localObjectId);
        const totalCost = cost ? hubspotService.calculateTotalCost(cost as any) : 0;

        // Retry sync
        result = await hubspotService.syncProject({
          ...project,
          totalCost
        });
      } else {
        // Future: implement retry for other object types (contact, deal, company)
        return res.status(400).json({ 
          error: `Retry not yet implemented for object type: ${link.localObjectType}` 
        });
      }

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'hubspot.sync.retry',
        link.localObjectType,
        link.localObjectId,
        { 
          linkId: link.id,
          hubspotObjectType: link.hubspotObjectType,
          hubspotObjectId: link.hubspotObjectId
        }
      );

      res.json({ 
        success: true, 
        message: 'Sync retry completed successfully',
        link: {
          id: link.id,
          localObjectType: link.localObjectType,
          localObjectId: link.localObjectId,
          hubspotObjectType: link.hubspotObjectType,
          hubspotObjectId: link.hubspotObjectId
        },
        result
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
}
