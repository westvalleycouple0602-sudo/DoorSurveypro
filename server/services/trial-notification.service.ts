// ============================================================================
// TRIAL NOTIFICATION SERVICE - Automated trial lifecycle email notifications
// ============================================================================

import { db } from "../db";
import { organizations, users, memberships } from "@shared/schema";
import { getTrialStatus } from "./trial.service.js";
import { eq, and, isNotNull, lt, gt, sql } from "drizzle-orm";
import { logger } from "../logger.js";
import { notificationService } from "./notification-service.js";
import type {
  Trial7DayWarningData,
  Trial1DayWarningData,
  TrialExpiredData,
  TrialGracePeriodData,
  NotificationEventType,
} from "@shared/events/notification-events";

const APP_URL = process.env.REPL_SLUG 
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : "http://localhost:5000";

type NotificationType = "7-day-warning" | "1-day-warning" | "trial-expired" | "grace-period";

interface TrialNotificationResult {
  organizationId: string;
  organizationName: string;
  notificationType: NotificationType;
  sentTo: string[]; // Email addresses
  skipped?: string; // Reason if skipped
}

/**
 * Check which trial notifications should be sent for an organization
 * Uses timestamp-based tracking to allow grace-period notifications to repeat daily
 */
async function getRequiredNotifications(organizationId: string): Promise<NotificationType[]> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org || !org.trialEndsAt || !org.trialTier) {
    return []; // No active trial
  }

  const now = new Date();
  const trialEndsAt = new Date(org.trialEndsAt);
  const sentNotifications = (org.trialNotificationsSent as Record<string, string>) || {};

  // Calculate time until/since trial expiration
  const msUntilExpiration = trialEndsAt.getTime() - now.getTime();
  const daysUntilExpiration = Math.ceil(msUntilExpiration / (1000 * 60 * 60 * 24));
  const hoursUntilExpiration = Math.ceil(msUntilExpiration / (1000 * 60 * 60));

  const notifications: NotificationType[] = [];

  // Trial is still active
  if (now < trialEndsAt) {
    // 7-day warning (send when 7 days or less remaining, but not yet sent)
    if (daysUntilExpiration <= 7 && daysUntilExpiration > 1 && !sentNotifications["7-day-warning"]) {
      notifications.push("7-day-warning");
    }

    // 1-day warning (send when 24 hours or less remaining, but not yet sent)
    if (hoursUntilExpiration <= 24 && !sentNotifications["1-day-warning"]) {
      notifications.push("1-day-warning");
    }
  }
  
  // Trial has expired (now >= trialEndsAt)
  else {
    // Check if grace period is active
    const gracePeriodEndDate = org.gracePeriodEndDate ? new Date(org.gracePeriodEndDate) : null;
    
    if (gracePeriodEndDate && now <= gracePeriodEndDate) {
      // In grace period
      
      // Trial expired notification (send once on the day of expiration)
      if (!sentNotifications["trial-expired"]) {
        notifications.push("trial-expired");
      }
      
      // Grace period reminder - can be sent daily
      // Send if: (1) never sent before OR (2) last sent more than 24 hours ago
      const gracePeriodLastSent = sentNotifications["grace-period-last-sent"];
      if (!gracePeriodLastSent) {
        // Never sent before - send on day 0 (expiration day) but only if trial-expired was already sent
        // This prevents sending both on the same scheduler run
        if (sentNotifications["trial-expired"]) {
          notifications.push("grace-period");
        }
      } else {
        // Check if last grace-period notification was sent more than 24 hours ago
        const lastSentDate = new Date(gracePeriodLastSent);
        const hoursSinceLastSent = (now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSent >= 24) {
          notifications.push("grace-period");
        }
      }
    }
  }

  return notifications;
}

/**
 * Get organization owner and admin emails for notifications
 */
async function getNotificationRecipients(organizationId: string): Promise<Array<{ email: string; name: string | null; userId: string }>> {
  const members = await db
    .select({
      email: users.email,
      name: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      userId: users.id,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        sql`${memberships.role} IN ('owner', 'admin')`
      )
    );

  return members
    .filter((m: any) => m.email)
    .map((m: any) => ({
      email: m.email!,
      name: m.name,
      userId: m.userId,
    }));
}

/**
 * Send trial notification emails for an organization
 */
async function sendTrialNotifications(organizationId: string, notificationType: NotificationType): Promise<TrialNotificationResult> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) {
    return {
      organizationId,
      organizationName: "Unknown",
      notificationType,
      sentTo: [],
      skipped: "Organization not found",
    };
  }

  if (!org.trialEndsAt || !org.trialTier) {
    return {
      organizationId,
      organizationName: org.name,
      notificationType,
      sentTo: [],
      skipped: "No active trial",
    };
  }

  // Get recipients (owners and admins)
  const recipients = await getNotificationRecipients(organizationId);

  if (recipients.length === 0) {
    return {
      organizationId,
      organizationName: org.name,
      notificationType,
      sentTo: [],
      skipped: "No owners or admins found",
    };
  }

  const trialEndsAt = new Date(org.trialEndsAt);
  const now = new Date();
  const upgradeUrl = `${APP_URL}/subscription`;
  const trialSettingsUrl = `${APP_URL}/trial-settings`;
  const featuresUrl = `${APP_URL}/pricing`;
  const contactSalesUrl = `${APP_URL}/contact`;

  const trialTierName = org.trialTier.charAt(0).toUpperCase() + org.trialTier.slice(1);

  // Determine event type and base data
  let eventType: NotificationEventType;
  
  // Helper function to create personalized email data for a recipient
  const createEmailData = (recipientName: string): any => {
    switch (notificationType) {
      case "7-day-warning": {
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          userName: recipientName,
          organizationName: org.name,
          trialTier: trialTierName,
          expiresInDays: daysRemaining,
          expiresAt: trialEndsAt,
          upgradeUrl,
          trialSettingsUrl,
        } as Trial7DayWarningData;
      }

      case "1-day-warning": {
        const hoursRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60));
        return {
          userName: recipientName,
          organizationName: org.name,
          trialTier: trialTierName,
          expiresInHours: hoursRemaining,
          expiresAt: trialEndsAt,
          upgradeUrl,
          trialSettingsUrl,
        } as Trial1DayWarningData;
      }

      case "trial-expired": {
        const gracePeriodEndDate = org.gracePeriodEndDate ? new Date(org.gracePeriodEndDate) : new Date(trialEndsAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        const gracePeriodDays = Math.ceil((gracePeriodEndDate.getTime() - trialEndsAt.getTime()) / (1000 * 60 * 60 * 24));
        return {
          userName: recipientName,
          organizationName: org.name,
          trialTier: trialTierName,
          expiredAt: trialEndsAt,
          gracePeriodDays,
          gracePeriodEndsAt: gracePeriodEndDate,
          upgradeUrl,
          featuresUrl,
        } as TrialExpiredData;
      }

      case "grace-period": {
        const gracePeriodEndDate = org.gracePeriodEndDate ? new Date(org.gracePeriodEndDate) : new Date(trialEndsAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.ceil((gracePeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          userName: recipientName,
          organizationName: org.name,
          trialTier: trialTierName,
          gracePeriodEndsAt: gracePeriodEndDate,
          daysRemaining,
          upgradeUrl,
          contactSalesUrl,
        } as TrialGracePeriodData;
      }

      default:
        return null;
    }
  };

  // Map notification type to event type
  switch (notificationType) {
    case "7-day-warning":
      eventType = "billing.trial-7day-warning";
      break;
    case "1-day-warning":
      eventType = "billing.trial-1day-warning";
      break;
    case "trial-expired":
      eventType = "billing.trial-expired";
      break;
    case "grace-period":
      eventType = "billing.trial-grace-period";
      break;
    default:
      logger.warn(`Unknown notification type: ${notificationType}`);
      return {
        organizationId,
        organizationName: org.name,
        notificationType,
        sentTo: [],
        skipped: "Unknown notification type",
      };
  }

  // Process each recipient individually to personalize userName
  let totalQueued = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const recipient of recipients) {
    const emailData = createEmailData(recipient.name || "there");
    
    if (!emailData) {
      totalErrors++;
      continue;
    }

    try {
      const result = await notificationService.processNotification({
        eventId: `${organizationId}:${notificationType}:${recipient.userId}:${Date.now()}`,
        eventType,
        timestamp: new Date(),
        actor: { userId: "system", email: null, name: "System" },
        context: { organizationId, organizationName: org.name },
        targets: [{
          userId: recipient.userId,
          email: recipient.email,
          name: recipient.name,
          language: "en",
        }],
        payload: emailData,
        priority: "normal",
      });

      totalQueued += result.queued;
      totalSkipped += result.skipped;
      totalErrors += result.errors;

      logger.debug("Trial notification queued for recipient", {
        organizationId,
        notificationType,
        recipient: recipient.email,
        queued: result.queued,
      });
    } catch (error) {
      totalErrors++;
      logger.error("Failed to queue trial notification for recipient", {
        organizationId,
        notificationType,
        recipient: recipient.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Trial notification batch complete", {
    organizationId,
    notificationType,
    totalQueued,
    totalSkipped,
    totalErrors,
  });

  // Update organization to mark this notification as sent with timestamp
  // Use database transaction to prevent race conditions
  await db.transaction(async (tx) => {
    // Re-fetch org to get latest data (prevents race conditions)
    const latestOrg = await tx.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!latestOrg) {
      logger.warn("Organization not found during notification tracking", {
        organizationId,
      });
      return;
    }

    const sentNotifications = (latestOrg.trialNotificationsSent as Record<string, string>) || {};
    
    // Store timestamp for this notification
    // For grace-period, use "grace-period-last-sent" to allow repeating
    const key = notificationType === "grace-period" ? "grace-period-last-sent" : notificationType;
    sentNotifications[key] = new Date().toISOString();

    await tx
      .update(organizations)
      .set({ trialNotificationsSent: sentNotifications })
      .where(eq(organizations.id, organizationId));

    logger.debug("Trial notification timestamp recorded", {
      organizationId,
      notificationType,
      timestamp: sentNotifications[key],
    });
  });

  return {
    organizationId,
    organizationName: org.name,
    notificationType,
    sentTo: recipients.map(r => r.email),
  };
}

/**
 * Process trial notifications for all organizations
 * This should be called by a scheduled job (daily)
 */
export async function processTrialNotifications(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  logger.info("Starting trial notification processing");

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Find all organizations with active trials or in grace period
    const orgsWithTrials = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        trialEndsAt: organizations.trialEndsAt,
        trialTier: organizations.trialTier,
        gracePeriodEndDate: organizations.gracePeriodEndDate,
      })
      .from(organizations)
      .where(
        and(
          isNotNull(organizations.trialEndsAt),
          isNotNull(organizations.trialTier)
        )
      );

    logger.info(`Found ${orgsWithTrials.length} organizations with trials`);

    for (const org of orgsWithTrials) {
      processed++;

      try {
        // Get required notifications for this organization
        const requiredNotifications = await getRequiredNotifications(org.id);

        if (requiredNotifications.length === 0) {
          logger.debug(`No notifications required for ${org.name}`);
          skipped++;
          continue;
        }

        // Send each required notification
        for (const notificationType of requiredNotifications) {
          const result = await sendTrialNotifications(org.id, notificationType);
          
          if (result.skipped) {
            skipped++;
            logger.warn(`Notification skipped for ${org.name}`, {
              notificationType,
              reason: result.skipped,
            });
          } else {
            sent++;
            logger.info(`Notification sent for ${org.name}`, {
              notificationType,
              recipients: result.sentTo.length,
            });
          }
        }
      } catch (error) {
        errors++;
        logger.error(`Error processing trial notifications for ${org.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Trial notification processing complete", {
      processed,
      sent,
      skipped,
      errors,
    });

    return { processed, sent, skipped, errors };
  } catch (error) {
    logger.error("Failed to process trial notifications", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Send a specific trial notification for an organization (for manual/testing purposes)
 */
export async function sendTrialNotification(
  organizationId: string,
  notificationType: NotificationType
): Promise<TrialNotificationResult> {
  return sendTrialNotifications(organizationId, notificationType);
}
