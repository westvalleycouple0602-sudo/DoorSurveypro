// ============================================================================
// TRIAL NOTIFICATION SCHEDULER - Daily trial status check and notification
// ============================================================================

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { logger } from "../logger.js";
import { processTrialNotifications } from "../services/trial-notification.service.js";

const REDIS_URL = process.env.REDIS_URL;
const isRedisConfigured = Boolean(REDIS_URL);

// Scheduler state
let schedulerInitialized = false;
let schedulerDisabled = false;
let trialQueue: Queue | null = null;
let trialWorker: Worker | null = null;

function createRedisConnection(): IORedis | null {
  if (!REDIS_URL) return null;
  
  try {
    const url = new URL(REDIS_URL);
    const useTLS = url.protocol === 'rediss:';
    
    const client = new IORedis({
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      tls: useTLS ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 100, 1000);
      },
    });
    
    // Suppress all connection errors (they're expected with Upstash)
    client.on('error', () => {
      // Silent - prevents unhandled error crashes
    });
    
    return client;
  } catch (error) {
    return null;
  }
}

// Initialize scheduler lazily (called from server startup)
export async function initializeTrialNotificationScheduler(): Promise<void> {
  if (schedulerInitialized || schedulerDisabled) return;
  
  if (!isRedisConfigured) {
    logger.info("Trial notification scheduler: Redis not configured, using fallback mode");
    schedulerDisabled = true;
    return;
  }

  try {
    const connection = createRedisConnection();
    if (!connection) {
      logger.warn("Trial notification scheduler: Could not create Redis connection");
      schedulerDisabled = true;
      return;
    }

    // Test the connection before creating queue/worker
    try {
      await connection.connect();
      await connection.ping();
    } catch (pingError) {
      logger.warn("Trial notification scheduler: Redis connection test failed, disabling");
      schedulerDisabled = true;
      try { connection.disconnect(); } catch {}
      return;
    }

    // Create queue with tested connection
    trialQueue = new Queue("trial-notifications", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential" as const,
          delay: 5000,
        },
        removeOnComplete: {
          age: 7 * 24 * 3600,
          count: 100,
        },
        removeOnFail: {
          age: 30 * 24 * 3600,
        },
      },
    });

    // Create worker with new connection
    const workerConnection = createRedisConnection();
    if (!workerConnection) {
      logger.warn("Trial notification scheduler: Could not create worker connection");
      schedulerDisabled = true;
      return;
    }

    trialWorker = new Worker(
      "trial-notifications",
      async (job) => {
        logger.info("Processing trial notification job", {
          jobId: job.id,
          jobName: job.name,
        });

        try {
          const result = await processTrialNotifications();
          logger.info("Trial notification job completed", {
            jobId: job.id,
            processed: result.processed,
            sent: result.sent,
            skipped: result.skipped,
            errors: result.errors,
          });
          return result;
        } catch (error) {
          logger.error("Trial notification job failed", {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
      {
        connection: workerConnection,
        concurrency: 1,
        limiter: {
          max: 1,
          duration: 60000,
        },
      }
    );

    // Suppress worker errors
    trialWorker.on("error", (err) => {
      if (err.message?.includes('ECONNRESET') || err.message?.includes('Connection is closed')) {
        return;
      }
      logger.error("Trial notification worker error", { error: err.message });
    });

    trialWorker.on("completed", (job) => {
      logger.info("Trial notification worker completed job", {
        jobId: job.id,
        returnValue: job.returnvalue,
      });
    });

    trialWorker.on("failed", (job, err) => {
      logger.error("Trial notification worker failed job", {
        jobId: job?.id,
        error: err.message,
      });
    });

    // Wait for queue to be ready
    await trialQueue.waitUntilReady();

    // Remove existing repeatable jobs
    try {
      const repeatableJobs = await trialQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await trialQueue.removeRepeatableByKey(job.key);
      }
    } catch {}

    // Add daily repeatable job (9:00 AM UTC)
    await trialQueue.add(
      "check-trial-statuses",
      {},
      {
        repeat: {
          pattern: "0 9 * * *",
        },
        jobId: "daily-trial-check",
      }
    );

    schedulerInitialized = true;
    logger.info("Trial notification scheduler initialized", {
      schedule: "Daily at 9:00 AM UTC",
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Don't log connection errors as errors (they're expected)
    if (errorMessage.includes('ECONNRESET') || errorMessage.includes('Connection is closed')) {
      logger.info("Trial notification scheduler: Redis connection unavailable, disabling");
    } else {
      logger.error("Failed to initialize trial notification scheduler", { error: errorMessage });
    }
    
    schedulerDisabled = true;
  }
}

// Export queue reference for external use
export function getTrialNotificationQueue(): Queue | null {
  return trialQueue;
}

/**
 * Manually trigger a trial notification check
 */
export async function triggerTrialCheck(): Promise<void> {
  if (!trialQueue) {
    throw new Error("Trial notification scheduler not available");
  }

  await trialQueue.add(
    "check-trial-statuses",
    {},
    {
      jobId: `manual-trial-check-${Date.now()}`,
      priority: 1,
    }
  );

  logger.info("Manual trial check triggered");
}

/**
 * Get trial notification queue statistics
 */
export async function getTrialQueueStats() {
  if (!trialQueue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      repeatableJobs: [],
      redisAvailable: false,
    };
  }

  try {
    const [waiting, active, completed, failed, delayed, repeatableJobs] = await Promise.all([
      trialQueue.getWaitingCount(),
      trialQueue.getActiveCount(),
      trialQueue.getCompletedCount(),
      trialQueue.getFailedCount(),
      trialQueue.getDelayedCount(),
      trialQueue.getRepeatableJobs(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      repeatableJobs: repeatableJobs.map((job) => ({
        key: job.key,
        pattern: job.pattern,
        next: job.next,
      })),
      redisAvailable: true,
    };
  } catch (error) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      repeatableJobs: [],
      redisAvailable: false,
    };
  }
}

/**
 * Check if scheduler is available
 */
export function isSchedulerAvailable(): boolean {
  return schedulerInitialized && !schedulerDisabled;
}
