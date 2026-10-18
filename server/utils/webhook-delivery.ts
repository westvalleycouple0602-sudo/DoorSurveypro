import crypto from "crypto";
import { logger } from "../logger";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  organizationId: string;
}

export interface WebhookDeliveryOptions {
  url: string;
  secret: string;
  payload: WebhookPayload;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  attemptsMade: number;
  deliveryTime: number;
}

/**
 * Generate HMAC signature for webhook payload
 * @param secret Webhook secret
 * @param payload Stringified JSON payload
 * @returns HMAC SHA-256 signature with "sha256=" prefix
 */
function generateSignature(secret: string, payload: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Deliver webhook with retry logic and exponential backoff
 * @param options Webhook delivery options
 * @returns Delivery result with success status and metadata
 */
export async function deliverWebhook(
  options: WebhookDeliveryOptions
): Promise<WebhookDeliveryResult> {
  const {
    url,
    secret,
    payload,
    timeoutMs = 10000,
    maxRetries = 3,
  } = options;

  const startTime = Date.now();
  let attemptsMade = 0;
  let lastError: string | undefined;

  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(secret, payloadString);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attemptsMade = attempt + 1;

    try {
      logger.info("Delivering webhook", {
        url,
        event: payload.event,
        attempt: attemptsMade,
        maxRetries: maxRetries + 1,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": payload.event,
          "X-Webhook-Timestamp": payload.timestamp,
          "User-Agent": "DoorSurvey-Pro-Webhook/1.0",
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();
      const deliveryTime = Date.now() - startTime;

      if (response.ok) {
        logger.info("Webhook delivered successfully", {
          url,
          event: payload.event,
          statusCode: response.status,
          attemptsMade,
          deliveryTime,
        });

        return {
          success: true,
          statusCode: response.status,
          responseBody: responseBody.substring(0, 500), // Limit size
          attemptsMade,
          deliveryTime,
        };
      } else {
        lastError = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
        logger.warn("Webhook delivery failed", {
          url,
          event: payload.event,
          statusCode: response.status,
          error: lastError,
          attemptsMade,
        });

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            statusCode: response.status,
            responseBody: responseBody.substring(0, 500),
            error: lastError,
            attemptsMade,
            deliveryTime: Date.now() - startTime,
          };
        }
      }
    } catch (error: any) {
      lastError = error.name === "AbortError" 
        ? `Timeout after ${timeoutMs}ms`
        : error.message || "Unknown error";

      logger.warn("Webhook delivery attempt failed", {
        url,
        event: payload.event,
        error: lastError,
        attemptsMade,
      });
    }

    // Exponential backoff: wait 1s, 2s, 4s between retries
    if (attempt < maxRetries) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      logger.info("Retrying webhook delivery", {
        url,
        event: payload.event,
        nextAttempt: attemptsMade + 1,
        backoffMs,
      });
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  // All retries exhausted
  const deliveryTime = Date.now() - startTime;
  logger.error("Webhook delivery failed after all retries", {
    url,
    event: payload.event,
    attemptsMade,
    error: lastError,
    deliveryTime,
  });

  return {
    success: false,
    error: lastError || "All retry attempts failed",
    attemptsMade,
    deliveryTime,
  };
}

/**
 * Trigger webhooks for a specific event
 * @param organizationId Organization ID
 * @param event Event name (e.g., "project.created")
 * @param data Event data payload
 */
export async function triggerWebhooks(
  organizationId: string,
  event: string,
  data: any
): Promise<void> {
  const { storage } = await import("../storage");

  // Get all active webhooks for this organization that listen to this event
  const webhooks = await storage.getWebhooks(organizationId);
  const matchingWebhooks = webhooks.filter(
    (hook) => hook.isActive === "yes" && (hook.events as string[]).includes(event)
  );

  if (matchingWebhooks.length === 0) {
    logger.debug("No webhooks configured for event", {
      organizationId,
      event,
    });
    return;
  }

  logger.info("Triggering webhooks", {
    organizationId,
    event,
    webhookCount: matchingWebhooks.length,
  });

  // Import decryption utility
  const { decryptSecret } = await import("./encryption");

  // Deliver webhooks in parallel (don't block on each one)
  const deliveryPromises = matchingWebhooks.map(async (hook) => {
    // SECURITY: Decrypt the webhook secret before generating HMAC signature
    const decryptedSecret = decryptSecret(hook.secret);

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      organizationId,
    };

    const result = await deliverWebhook({
      url: hook.url,
      secret: decryptedSecret,
      payload,
      timeoutMs: (hook.timeoutSeconds || 10) * 1000,
      maxRetries: hook.retryAttempts || 3,
    });

    // Update webhook statistics
    try {
      await storage.updateWebhookStats(hook.id, {
        lastTriggeredAt: new Date(),
        successCount: result.success ? hook.successCount + 1 : hook.successCount,
        failureCount: result.success ? hook.failureCount : hook.failureCount + 1,
        lastSuccess: result.success ? new Date() : hook.lastSuccess,
        lastFailure: result.success ? hook.lastFailure : new Date(),
        lastFailureReason: result.success ? hook.lastFailureReason : result.error,
      });
    } catch (error) {
      logger.error("Failed to update webhook stats", {
        webhookId: hook.id,
        error,
      });
    }
  });

  // Fire and forget - don't wait for all deliveries to complete
  Promise.allSettled(deliveryPromises).catch((error) => {
    logger.error("Error in webhook delivery batch", { error });
  });
}
