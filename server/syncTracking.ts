// Sync Tracking Service
// Manages bidirectional sync links and event tracking for external integrations
// Prevents duplicates, tracks sync status, and enables conflict resolution

import { db } from "./db";
import { 
  hubspotSyncLinks, 
  hubspotSyncEvents,
  type HubSpotSyncLink,
  type InsertHubSpotSyncLink 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

export interface SyncLinkIdentifier {
  localObjectType: 'project' | 'contact' | 'quote' | 'opening';
  localObjectId: string;
  hubspotObjectType: 'deal' | 'contact' | 'company' | 'note';
  hubspotObjectId?: string;
}

export interface SyncEventData {
  eventType: 'create' | 'update' | 'delete' | 'conflict';
  syncDirection: 'push' | 'pull';
  outcome: 'success' | 'failure' | 'conflict';
  errorCode?: string;
  errorMessage?: string;
  diffSnapshot?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class SyncTrackingService {
  constructor(private organizationId: string) {}

  /**
   * Get existing sync link or create placeholder for tracking
   * Returns link with HubSpot object ID if already synced, or new pending link
   * 
   * @param identifier - Object identifiers
   * @param syncDirection - Direction for new links ('push', 'pull', 'bidirectional')
   */
  async getOrCreateLink(
    identifier: SyncLinkIdentifier,
    syncDirection: 'push' | 'pull' | 'bidirectional' = 'push'
  ): Promise<HubSpotSyncLink> {
    try {
      // For pull syncs: try to find by HubSpot object ID first
      if (identifier.hubspotObjectId) {
        const hubspotLinks = await db
          .select()
          .from(hubspotSyncLinks)
          .where(
            and(
              eq(hubspotSyncLinks.organizationId, this.organizationId),
              eq(hubspotSyncLinks.hubspotObjectType, identifier.hubspotObjectType),
              eq(hubspotSyncLinks.hubspotObjectId, identifier.hubspotObjectId)
            )
          )
          .limit(1);

        if (hubspotLinks.length > 0) {
          return hubspotLinks[0];
        }
      }

      // For push syncs: look up by local object AND HubSpot object type
      // This allows multiple links per local object (e.g., project -> deal + note)
      const localLinks = await db
        .select()
        .from(hubspotSyncLinks)
        .where(
          and(
            eq(hubspotSyncLinks.organizationId, this.organizationId),
            eq(hubspotSyncLinks.localObjectType, identifier.localObjectType),
            eq(hubspotSyncLinks.localObjectId, identifier.localObjectId),
            eq(hubspotSyncLinks.hubspotObjectType, identifier.hubspotObjectType)
          )
        )
        .limit(1);

      if (localLinks.length > 0) {
        return localLinks[0];
      }

      // Create new pending link as placeholder
      // hubspotObjectId will be populated by updateLinkOnSuccess after API call
      const now = new Date();
      const [newLink] = await db
        .insert(hubspotSyncLinks)
        .values({
          organizationId: this.organizationId,
          localObjectType: identifier.localObjectType,
          localObjectId: identifier.localObjectId,
          hubspotObjectType: identifier.hubspotObjectType,
          hubspotObjectId: '', // Empty until populated by updateLinkOnSuccess
          syncDirection,
          syncStatus: 'pending',
          lastAttemptAt: now
        })
        .returning();

      logger.info('Created pending sync link', {
        organizationId: this.organizationId,
        linkId: newLink.id,
        localObjectType: identifier.localObjectType,
        localObjectId: identifier.localObjectId,
        syncDirection
      });

      return newLink;
    } catch (error) {
      logger.error('Error getting or creating sync link', {
        organizationId: this.organizationId,
        identifier,
        error
      });
      throw error;
    }
  }

  /**
   * Create new sync link after successful sync
   * DEPRECATED: Use getOrCreateLink() + updateLinkOnSuccess() instead
   */
  async createLink(
    identifier: SyncLinkIdentifier & { hubspotObjectId: string },
    etag?: string,
    syncDirection: 'push' | 'pull' | 'bidirectional' = 'push',
    syncStatus: 'pending' | 'synced' | 'failed' | 'conflict' = 'synced'
  ): Promise<HubSpotSyncLink> {
    try {
      const now = new Date();
      
      const [newLink] = await db
        .insert(hubspotSyncLinks)
        .values({
          organizationId: this.organizationId,
          localObjectType: identifier.localObjectType,
          localObjectId: identifier.localObjectId,
          hubspotObjectType: identifier.hubspotObjectType,
          hubspotObjectId: identifier.hubspotObjectId,
          syncDirection,
          syncStatus,
          lastSyncAt: syncStatus === 'synced' ? now : null,
          lastAttemptAt: now,
          lastEtag: etag,
          lastError: null
        })
        .returning();

      logger.info('Created sync link', {
        organizationId: this.organizationId,
        linkId: newLink.id,
        localObjectType: identifier.localObjectType,
        localObjectId: identifier.localObjectId,
        hubspotObjectId: identifier.hubspotObjectId,
        syncDirection,
        syncStatus
      });

      return newLink;
    } catch (error) {
      logger.error('Error creating sync link', {
        organizationId: this.organizationId,
        identifier,
        error
      });
      throw error;
    }
  }

  /**
   * Update link on successful sync
   */
  async updateLinkOnSuccess(
    linkId: string,
    hubspotObjectId: string,
    etag?: string
  ): Promise<void> {
    try {
      const now = new Date();
      
      await db
        .update(hubspotSyncLinks)
        .set({
          hubspotObjectId,
          syncStatus: 'synced',
          lastSyncAt: now,
          lastAttemptAt: now,
          lastEtag: etag,
          lastError: null,
          updatedAt: now
        })
        .where(eq(hubspotSyncLinks.id, linkId));

      logger.info('Updated sync link on success', {
        linkId,
        hubspotObjectId
      });
    } catch (error) {
      logger.error('Error updating sync link on success', {
        linkId,
        error
      });
      throw error;
    }
  }

  /**
   * Mark link as failed with error details
   * Optionally persist HubSpot object ID if known (e.g., HubSpot succeeded but local persistence failed)
   */
  async markLinkFailure(
    linkId: string,
    errorCode: string,
    errorMessage: string,
    hubspotObjectId?: string
  ): Promise<void> {
    try {
      const now = new Date();
      
      await db
        .update(hubspotSyncLinks)
        .set({
          ...(hubspotObjectId ? { hubspotObjectId } : {}),
          syncStatus: 'failed',
          lastAttemptAt: now,
          lastError: errorMessage,
          updatedAt: now
        })
        .where(eq(hubspotSyncLinks.id, linkId));

      logger.warn('Marked sync link as failed', {
        linkId,
        errorCode,
        errorMessage,
        hubspotObjectId
      });
    } catch (error) {
      logger.error('Error marking sync link failure', {
        linkId,
        error
      });
      throw error;
    }
  }

  /**
   * Mark link as conflict for manual resolution
   */
  async markLinkConflict(
    linkId: string,
    conflictDetails: string
  ): Promise<void> {
    try {
      const now = new Date();
      
      await db
        .update(hubspotSyncLinks)
        .set({
          syncStatus: 'conflict',
          lastAttemptAt: now,
          lastError: conflictDetails,
          updatedAt: now
        })
        .where(eq(hubspotSyncLinks.id, linkId));

      logger.warn('Marked sync link as conflict', {
        linkId,
        conflictDetails
      });
    } catch (error) {
      logger.error('Error marking sync link conflict', {
        linkId,
        error
      });
      throw error;
    }
  }

  /**
   * Record sync event for audit trail
   */
  async recordEvent(
    linkId: string | null,
    identifier: SyncLinkIdentifier,
    eventData: SyncEventData
  ): Promise<void> {
    try {
      await db
        .insert(hubspotSyncEvents)
        .values({
          linkId,
          organizationId: this.organizationId,
          eventType: eventData.eventType,
          syncDirection: eventData.syncDirection,
          outcome: eventData.outcome,
          localObjectType: identifier.localObjectType,
          localObjectId: identifier.localObjectId,
          hubspotObjectType: identifier.hubspotObjectType,
          hubspotObjectId: identifier.hubspotObjectId,
          errorCode: eventData.errorCode,
          errorMessage: eventData.errorMessage,
          diffSnapshot: eventData.diffSnapshot as any,
          metadata: eventData.metadata as any
        });

      logger.info('Recorded sync event', {
        linkId,
        eventType: eventData.eventType,
        outcome: eventData.outcome,
        localObjectType: identifier.localObjectType
      });
    } catch (error) {
      logger.error('Error recording sync event', {
        linkId,
        identifier,
        eventData,
        error
      });
      // Don't throw - event recording shouldn't break sync flow
    }
  }

  /**
   * Check for ETag conflict (bidirectional change detection)
   */
  async checkETagConflict(linkId: string, currentEtag: string): Promise<boolean> {
    try {
      const [link] = await db
        .select()
        .from(hubspotSyncLinks)
        .where(eq(hubspotSyncLinks.id, linkId))
        .limit(1);

      if (!link || !link.lastEtag) {
        return false; // No previous ETag, not a conflict
      }

      // Conflict if ETags don't match
      return link.lastEtag !== currentEtag;
    } catch (error) {
      logger.error('Error checking ETag conflict', {
        linkId,
        error
      });
      return false; // Assume no conflict on error
    }
  }

  /**
   * Get all failed/pending sync links for retry
   */
  async getPendingSyncs(limit: number = 100): Promise<HubSpotSyncLink[]> {
    try {
      return await db
        .select()
        .from(hubspotSyncLinks)
        .where(
          and(
            eq(hubspotSyncLinks.organizationId, this.organizationId),
            eq(hubspotSyncLinks.syncStatus, 'failed')
          )
        )
        .limit(limit);
    } catch (error) {
      logger.error('Error getting pending syncs', {
        organizationId: this.organizationId,
        error
      });
      return [];
    }
  }

  /**
   * Get sync events for a link (audit trail)
   */
  async getLinkEvents(linkId: string, limit: number = 50): Promise<any[]> {
    try {
      return await db
        .select()
        .from(hubspotSyncEvents)
        .where(eq(hubspotSyncEvents.linkId, linkId))
        .orderBy(hubspotSyncEvents.createdAt)
        .limit(limit);
    } catch (error) {
      logger.error('Error getting link events', {
        linkId,
        error
      });
      return [];
    }
  }
}
