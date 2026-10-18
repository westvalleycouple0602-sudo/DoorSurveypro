// ============================================================================
// NOTIFICATION SUBSCRIBER - NATS event subscriber for notifications
// ============================================================================

import { getNatsConnection } from "../natsBus.js";
import { notificationService } from "../services/notification-service.js";
import { logger } from "../logger.js";
import { NATS_SUBJECTS } from "./subjects.js";
import type { NotificationEnvelope } from "@shared/events/notification-events";
import { StringCodec } from "nats";

const sc = StringCodec();

/**
 * Subscribe to email notification requests from NATS
 * This allows any part of the application to trigger email notifications
 * by publishing to the NATS subject
 */
export async function subscribeToEmailNotifications(): Promise<void> {
  const nc = await getNatsConnection();
  
  if (!nc) {
    logger.warn("NATS not available - email notifications will not be processed from event bus", {
      service: "doorsurvey-pro",
    });
    return;
  }

  const subscription = nc.subscribe(NATS_SUBJECTS.EMAIL_NOTIFICATION_REQUESTED);

  logger.info("Subscribed to email notification requests", {
    subject: NATS_SUBJECTS.EMAIL_NOTIFICATION_REQUESTED,
  });

  (async () => {
    for await (const msg of subscription) {
      try {
        const data = JSON.parse(sc.decode(msg.data));
        const envelope = data as NotificationEnvelope;

        logger.debug("Received email notification request", {
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          targetCount: envelope.targets.length,
        });

        // Process the notification asynchronously
        notificationService.processNotification(envelope).catch((error) => {
          logger.error("Error processing notification from event bus", {
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            error: error instanceof Error ? error.message : String(error),
          });
        });

        // Acknowledge receipt immediately (fire-and-forget)
        msg.respond(sc.encode(JSON.stringify({ received: true })));
      } catch (error) {
        logger.error("Error parsing notification message", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  })();
}

/**
 * Initialize all notification subscribers
 * Call this when the application starts
 */
export async function initializeNotificationSubscribers(): Promise<void> {
  try {
    await subscribeToEmailNotifications();
    logger.info("Notification subscribers initialized", {
      service: "doorsurvey-pro",
    });
  } catch (error) {
    logger.error("Failed to initialize notification subscribers", {
      service: "doorsurvey-pro",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
