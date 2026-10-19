// ============================================================================
// RESEND WEBHOOKS - Handle email deliverability events from Resend
// ============================================================================

import { Router } from "express";
import { logger } from "../../logger.js";

const router = Router();

/**
 * Resend webhook payload types
 * https://resend.com/docs/api-reference/webhooks
 */
interface ResendWebhookEvent {
  type: "email.sent" | "email.delivered" | "email.delivery_delayed" | "email.complained" | "email.bounced" | "email.opened" | "email.clicked";
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    // Additional fields based on event type
    bounce?: {
      type: "hard" | "soft";
    };
    complaint?: {
      feedback_type: string;
    };
  };
}

/**
 * Webhook endpoint for Resend events
 * POST /api/webhooks/resend
 */
router.post("/", async (req, res) => {
  try {
    const event = req.body as ResendWebhookEvent;

    logger.info("Received Resend webhook", {
      type: event.type,
      emailId: event.data.email_id,
      to: event.data.to,
    });

    // Handle different event types
    switch (event.type) {
      case "email.sent":
        await handleEmailSent(event);
        break;
      
      case "email.delivered":
        await handleEmailDelivered(event);
        break;
      
      case "email.delivery_delayed":
        await handleEmailDelayed(event);
        break;
      
      case "email.bounced":
        await handleEmailBounced(event);
        break;
      
      case "email.complained":
        await handleEmailComplained(event);
        break;
      
      case "email.opened":
        await handleEmailOpened(event);
        break;
      
      case "email.clicked":
        await handleEmailClicked(event);
        break;
      
      default:
        logger.warn("Unknown Resend webhook event type", {
          type: event.type,
        });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Error processing Resend webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Handle email sent event
 * Updates background_jobs tracking when implemented with database integration
 */
async function handleEmailSent(event: ResendWebhookEvent): Promise<void> {
  logger.debug("Email sent", {
    emailId: event.data.email_id,
    to: event.data.to,
  });
}

/**
 * Handle email delivered event
 * Updates background_jobs tracking when implemented with database integration
 */
async function handleEmailDelivered(event: ResendWebhookEvent): Promise<void> {
  logger.info("Email delivered successfully", {
    emailId: event.data.email_id,
    to: event.data.to,
  });
}

/**
 * Handle email delayed event
 * Updates background_jobs tracking when implemented with database integration
 */
async function handleEmailDelayed(event: ResendWebhookEvent): Promise<void> {
  logger.warn("Email delivery delayed", {
    emailId: event.data.email_id,
    to: event.data.to,
  });
}

/**
 * Handle email bounce event
 * Future: Update background_jobs, mark invalid emails, publish to NATS
 */
async function handleEmailBounced(event: ResendWebhookEvent): Promise<void> {
  const bounceType = event.data.bounce?.type || "unknown";
  
  logger.error("Email bounced", {
    emailId: event.data.email_id,
    to: event.data.to,
    bounceType,
  });
  
  if (bounceType === "hard") {
    logger.warn("Hard bounce detected - email address may be invalid", {
      email: event.data.to[0],
    });
  }
}

/**
 * Handle email complaint event (spam report)
 * Future: Update background_jobs, unsubscribe from marketing, publish to NATS, alert admins
 */
async function handleEmailComplained(event: ResendWebhookEvent): Promise<void> {
  logger.error("Email complaint received (spam report)", {
    emailId: event.data.email_id,
    to: event.data.to,
    feedbackType: event.data.complaint?.feedback_type,
  });
}

/**
 * Handle email opened event
 * Future: Track email engagement metrics for analytics
 */
async function handleEmailOpened(event: ResendWebhookEvent): Promise<void> {
  logger.debug("Email opened", {
    emailId: event.data.email_id,
    to: event.data.to,
  });
}

/**
 * Handle email clicked event
 * Future: Track email engagement metrics for analytics
 */
async function handleEmailClicked(event: ResendWebhookEvent): Promise<void> {
  logger.debug("Email link clicked", {
    emailId: event.data.email_id,
    to: event.data.to,
  });
}

export default router;
