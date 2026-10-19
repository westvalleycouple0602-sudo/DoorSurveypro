// ============================================================================
// NOTIFICATION SERVICE - Event-driven email notification orchestration
// ============================================================================

import { logger } from "../logger.js";
import { renderEmailTemplate } from "../email-templates/index.js";
import type { NotificationPreference } from "@shared/schema";
import {
  NotificationEventType,
  NotificationCategory,
  NotificationEnvelope,
  EVENT_TO_CATEGORY,
  EVENT_TO_TEMPLATE,
  type RenderResult,
  type NotificationTarget,
} from "@shared/events/notification-events";
import {
  CATEGORY_DEFAULTS,
  EVENT_OVERRIDES,
  RATE_LIMITS,
  HIGH_PRIORITY_EVENTS,
} from "../config/notification-defaults.js";

// Simple in-memory LRU cache for preferences (will be replaced with node-cache)
class PreferenceCache {
  private cache: Map<string, { preferences: NotificationPreference[]; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(userId: string, preferences: NotificationPreference[]): void {
    this.cache.set(userId, {
      preferences,
      timestamp: Date.now(),
    });
  }

  get(userId: string): NotificationPreference[] | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(userId);
      return null;
    }

    return entry.preferences;
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }
}

class NotificationService {
  private preferenceCache = new PreferenceCache();

  /**
   * Process a notification envelope and queue emails for delivery
   * This is the main entry point for the notification system
   */
  async processNotification<TPayload>(
    envelope: NotificationEnvelope<TPayload>
  ): Promise<{ queued: number; skipped: number; errors: number }> {
    const { eventType, targets, payload, priority } = envelope;

    logger.info("Processing notification", {
      eventId: envelope.eventId,
      eventType,
      targetCount: targets.length,
      priority,
    });

    let queued = 0;
    let skipped = 0;
    let errors = 0;

    for (const target of targets) {
      try {
        // Check if user wants this notification
        const shouldSend = await this.checkUserPreference(target.userId, eventType);
        
        if (!shouldSend) {
          logger.debug("Skipping notification - user opted out", {
            userId: target.userId,
            eventType,
          });
          skipped++;
          continue;
        }

        // Render the email template
        const renderResult = await this.renderNotificationEmail(eventType, payload, target);

        // Queue the email for delivery
        await this.queueEmail({
          eventId: envelope.eventId,
          eventType,
          target,
          renderResult,
          priority: priority || (HIGH_PRIORITY_EVENTS.has(eventType) ? "high" : "normal"),
        });

        queued++;
      } catch (error) {
        logger.error("Error processing notification for target", {
          eventId: envelope.eventId,
          eventType,
          targetUserId: target.userId,
          error: error instanceof Error ? error.message : String(error),
        });
        errors++;
      }
    }

    logger.info("Notification processing complete", {
      eventId: envelope.eventId,
      queued,
      skipped,
      errors,
    });

    return { queued, skipped, errors };
  }

  /**
   * Check if a user wants to receive a specific notification
   * Uses cached preferences and falls back to category/event defaults
   */
  private async checkUserPreference(
    userId: string,
    eventType: NotificationEventType
  ): Promise<boolean> {
    // Get category for this event
    const category = EVENT_TO_CATEGORY[eventType];

    // Check category defaults first
    const categoryDefault = CATEGORY_DEFAULTS[category];
    if (!categoryDefault.canDisable) {
      // Cannot disable transactional/billing emails
      return true;
    }

    // Check event-specific overrides
    const eventOverride = EVENT_OVERRIDES[eventType];
    if (eventOverride) {
      return eventOverride.defaultEnabled;
    }

    // Try to get user preferences from cache
    let preferences = this.preferenceCache.get(userId);

    // If not in cache, fetch from database (stub for now)
    if (!preferences) {
      preferences = await this.fetchUserPreferences(userId);
      this.preferenceCache.set(userId, preferences);
    }

    // Check for specific event preference
    const eventPreference = preferences.find(
      (p) => p.eventType === eventType && p.channel === "email"
    );
    
    if (eventPreference) {
      return eventPreference.isEnabled === "yes";
    }

    // Fall back to category default
    return categoryDefault.defaultEnabled;
  }

  /**
   * Fetch user notification preferences from database
   */
  private async fetchUserPreferences(userId: string): Promise<NotificationPreference[]> {
    const { notificationPreferences } = await import("../../shared/schema.js");
    const { eq } = await import("drizzle-orm");
    const { db } = await import("../db.js");

    try {
      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));
      
      return prefs;
    } catch (error) {
      logger.error("Error fetching user preferences from database", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Render notification email using the appropriate template
   */
  private async renderNotificationEmail(
    eventType: NotificationEventType,
    payload: unknown,
    target: NotificationTarget
  ): Promise<RenderResult> {
    const templateId = EVENT_TO_TEMPLATE[eventType];

    // Check if template is implemented
    if (!templateId) {
      throw new Error(
        `No template implemented for event type: ${eventType}. ` +
        `Currently implemented: user.welcome, project.invitation, project.status-update, quote.approved, compliance.alert`
      );
    }

    try {
      return await renderEmailTemplate(templateId, payload, {
        language: target.language || "en",
      });
    } catch (error) {
      logger.error("Error rendering email template", {
        templateId,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Queue an email for delivery via BullMQ
   */
  private async queueEmail(params: {
    eventId: string;
    eventType: NotificationEventType;
    target: NotificationTarget;
    renderResult: RenderResult;
    priority: "high" | "normal" | "low";
  }): Promise<void> {
    const { eventId, eventType, target, renderResult, priority } = params;

    // Import the queueEmail function from the BullMQ module
    // Note: Dynamic import to avoid circular dependencies
    const { queueEmail } = await import("../jobs/emailNotificationQueue.js");
    
    await queueEmail({
      eventId,
      eventType,
      to: target.email,
      subject: renderResult.subject,
      html: renderResult.html,
      priority,
      metadata: {
        userId: target.userId,
        userName: target.name,
      },
    });

    logger.info("Email queued for delivery", {
      eventId,
      eventType,
      to: target.email,
      subject: renderResult.subject,
      priority,
    });
  }

  /**
   * Invalidate cached preferences for a user
   * Call this when user updates their notification preferences
   */
  invalidateUserPreferences(userId: string): void {
    this.preferenceCache.invalidate(userId);
    logger.debug("Invalidated preference cache", { userId });
  }

  /**
   * Clear all cached preferences
   */
  clearPreferenceCache(): void {
    this.preferenceCache.clear();
    logger.info("Cleared all preference caches");
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
