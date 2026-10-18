// ============================================================================
// EMAIL NOTIFICATION QUEUE - BullMQ queue for email delivery
// ============================================================================

import { Queue, QueueOptions } from "bullmq";
import { logger } from "../logger.js";

// Parse Redis URL properly for BullMQ (supports Upstash rediss:// URLs)
function parseRedisUrl(redisUrl: string | undefined) {
  if (!redisUrl) return null;
  
  try {
    const url = new URL(redisUrl);
    const useTLS = url.protocol === 'rediss:';
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      tls: useTLS ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  } catch (error) {
    logger.error("Failed to parse REDIS_URL", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// Check if Redis is configured
const redisConfig = parseRedisUrl(process.env.REDIS_URL);
const isRedisConfigured = Boolean(redisConfig);

// Queue configuration (only if Redis is available)
const queueOptions: QueueOptions | null = isRedisConfigured && redisConfig
  ? {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: "exponential",
          delay: 2000, // Start with 2 second delay, doubles each retry
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    }
  : null;

// Email notification queue (normal priority) - only if Redis is configured
export const emailNotificationQueue = isRedisConfigured && queueOptions
  ? new Queue("email-notifications", queueOptions)
  : null;

// Auto-responder queue (high priority, faster processing) - only if Redis is configured
export const autoResponderQueue = isRedisConfigured && queueOptions
  ? new Queue("auto-responders", {
      ...queueOptions,
      defaultJobOptions: {
        ...queueOptions.defaultJobOptions!,
        attempts: 5, // More retries for critical emails
        priority: 1, // Highest priority
      },
    })
  : null;

// Initialize queues and log status
async function initializeQueues() {
  if (!isRedisConfigured) {
    logger.warn("Redis not configured - email notification queues disabled", {
      service: "doorsurvey-pro",
      suggestion: "Set REDIS_URL to enable BullMQ email queues",
    });
    return;
  }

  try {
    await emailNotificationQueue?.waitUntilReady();
    logger.info("Email notification queue ready", {
      queue: "email-notifications",
    });
  } catch (error) {
    logger.error("Failed to initialize email notification queue", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await autoResponderQueue?.waitUntilReady();
    logger.info("Auto-responder queue ready", {
      queue: "auto-responders",
    });
  } catch (error) {
    logger.error("Failed to initialize auto-responder queue", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Initialize on module load
initializeQueues();

/**
 * Add an email to the notification queue
 * Uses eventId:recipientEmail as jobId for idempotency
 * 
 * If Redis is not configured, falls back to direct email sending
 */
export async function queueEmail(params: {
  eventId: string;
  eventType: string;
  to: string;
  subject: string;
  html: string;
  priority?: "high" | "normal" | "low";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { eventId, eventType, to, subject, html, priority = "normal", metadata } = params;
  const jobId = `${eventId}:${to}`; // Idempotent key

  // Graceful degradation: if Redis is not configured, send email directly
  if (!isRedisConfigured || !emailNotificationQueue || !autoResponderQueue) {
    logger.warn("Redis not available - falling back to direct email send", {
      jobId,
      eventType,
      to,
    });
    
    // Fallback: Send email directly without queue
    try {
      const { emailService } = await import("../email-service.js");
      await emailService.sendEmail({ to, subject, html });
      
      logger.info("Email sent directly (no queue)", {
        jobId,
        eventType,
        to,
      });
    } catch (error) {
      logger.error("Failed to send email directly", {
        jobId,
        eventType,
        to,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    
    return;
  }

  const queue = priority === "high" ? autoResponderQueue : emailNotificationQueue;

  try {
    await queue.add(
      "send-email",
      {
        to,
        subject,
        html,
        eventType,
        metadata,
      },
      {
        jobId,
        priority: priority === "high" ? 1 : priority === "low" ? 3 : 2,
      }
    );

    logger.info("Email queued successfully", {
      jobId,
      eventType,
      to,
      queue: queue.name,
      priority,
    });
  } catch (error) {
    logger.error("Failed to queue email", {
      jobId,
      eventType,
      to,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  if (!isRedisConfigured || !emailNotificationQueue || !autoResponderQueue) {
    return {
      emailNotifications: { waiting: 0, active: 0, completed: 0, failed: 0 },
      autoResponders: { waiting: 0, active: 0, completed: 0, failed: 0 },
      redisAvailable: false,
    };
  }

  try {
    const [emailStats, autoResponderStats] = await Promise.all([
      emailNotificationQueue.getJobCounts(),
      autoResponderQueue.getJobCounts(),
    ]);

    return {
      emailNotifications: emailStats,
      autoResponders: autoResponderStats,
      redisAvailable: true,
    };
  } catch (error) {
    logger.error("Failed to get queue stats", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
