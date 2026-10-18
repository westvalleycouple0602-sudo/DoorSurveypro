// ============================================================================
// EMAIL WORKER - BullMQ worker for processing email notifications
// ============================================================================

import { Worker, Job } from "bullmq";
import { emailService } from "../../server/email-service.js";
import { logger } from "../../server/logger.js";

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}

// Worker configuration
const workerOptions = {
  connection: {
    host: process.env.REDIS_URL?.split(":")[0] || "localhost",
    port: parseInt(process.env.REDIS_URL?.split(":")[1] || "6379"),
  },
  concurrency: 5, // Process up to 5 emails concurrently
  limiter: {
    max: 50, // Max 50 jobs per duration
    duration: 60000, // Per 1 minute (respects Resend rate limits)
  },
};

/**
 * Process an email job
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, html, eventType, metadata } = job.data;

  logger.info("Processing email job", {
    jobId: job.id,
    eventType,
    to,
    subject,
  });

  try {
    // Send email via email service
    const result = await emailService.sendEmail({
      to,
      subject,
      html,
    });

    if (!result.success) {
      throw new Error(result.error || "Email sending failed");
    }

    logger.info("Email sent successfully", {
      jobId: job.id,
      messageId: result.messageId,
      to,
      eventType,
    });

    // Update job progress
    await job.updateProgress(100);

    // TODO: Record delivery in background_jobs table
    // await recordDelivery({
    //   jobId: job.id,
    //   messageId: result.messageId,
    //   eventType,
    //   status: 'completed',
    // });
  } catch (error) {
    logger.error("Failed to send email", {
      jobId: job.id,
      eventType,
      to,
      error: error instanceof Error ? error.message : String(error),
    });

    // TODO: Record failure in background_jobs table
    // await recordDelivery({
    //   jobId: job.id,
    //   eventType,
    //   status: 'failed',
    //   error: error instanceof Error ? error.message : String(error),
    // });

    throw error; // Re-throw to trigger BullMQ retry logic
  }
}

// Create workers for both queues
const emailNotificationWorker = new Worker(
  "email-notifications",
  processEmailJob,
  workerOptions
);

const autoResponderWorker = new Worker(
  "auto-responders",
  processEmailJob,
  {
    ...workerOptions,
    concurrency: 10, // Higher concurrency for auto-responders
  }
);

// Event listeners for email notification worker
emailNotificationWorker.on("completed", (job) => {
  logger.info("Email notification job completed", {
    jobId: job.id,
    queue: "email-notifications",
  });
});

emailNotificationWorker.on("failed", (job, error) => {
  logger.error("Email notification job failed", {
    jobId: job?.id,
    queue: "email-notifications",
    error: error.message,
    attemptsMade: job?.attemptsMade,
  });
});

emailNotificationWorker.on("error", (error) => {
  logger.error("Email notification worker error", {
    error: error.message,
  });
});

// Event listeners for auto-responder worker
autoResponderWorker.on("completed", (job) => {
  logger.info("Auto-responder job completed", {
    jobId: job.id,
    queue: "auto-responders",
  });
});

autoResponderWorker.on("failed", (job, error) => {
  logger.error("Auto-responder job failed", {
    jobId: job?.id,
    queue: "auto-responders",
    error: error.message,
    attemptsMade: job?.attemptsMade,
  });
});

autoResponderWorker.on("error", (error) => {
  logger.error("Auto-responder worker error", {
    error: error.message,
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received - closing email workers");
  
  await Promise.all([
    emailNotificationWorker.close(),
    autoResponderWorker.close(),
  ]);
  
  process.exit(0);
});

logger.info("Email workers initialized", {
  queues: ["email-notifications", "auto-responders"],
  concurrency: {
    emailNotifications: workerOptions.concurrency,
    autoResponders: 10,
  },
});

// Export workers for testing
export { emailNotificationWorker, autoResponderWorker };
