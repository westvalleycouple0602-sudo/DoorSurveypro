/**
 * Background Job Queue System with BullMQ
 * Handles asynchronous tasks like PDF generation, Excel exports, and email sending
 * 
 * UPGRADE: Now uses BullMQ with Redis for production-grade job processing!
 */

import { Queue, Worker, QueueEvents, Job as BullJob } from 'bullmq';
import { logger, logError } from "../logger";

export type JobType = 
  | 'pdf-generation'
  | 'excel-export'
  | 'email-send'
  | 'lidar-processing'
  | 'photo-analysis'
  | 'quote-generation'
  | 'compliance-check';

export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Job {
  id: string;
  type: JobType;
  priority: JobPriority;
  data: any;
  userId: string;
  organizationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retries: number;
  maxRetries: number;
}

export interface JobHandler {
  (job: Job): Promise<any>;
}

/**
 * Redis connection configuration with error suppression
 * Supports both REDIS_URL and individual connection parameters
 * Parses Upstash rediss:// URLs properly for BullMQ
 */
function getRedisConfig(): any {
  const redisUrl = process.env.REDIS_URL;
  
  // If REDIS_URL is provided, parse it for BullMQ (needs object config, not URL string)
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      const useTLS = url.protocol === 'rediss:';
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        tls: useTLS ? {} : undefined,
        connectTimeout: 5000,
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        enableOfflineQueue: false,
        retryStrategy: (times: number) => {
          if (times > 1) return null;
          return 100;
        },
        showFriendlyErrorStack: false,
      };
    } catch (error) {
      logger.error("Failed to parse REDIS_URL for job queue", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Otherwise use individual connection parameters
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPassword = process.env.REDIS_PASSWORD;
  
  // Enable TLS for cloud providers (Upstash, Redis Cloud, etc.)
  const needsTLS = redisHost.includes('upstash.io') || 
                  redisHost.includes('redis.cloud') || 
                  redisHost.includes('amazonaws.com') ||
                  (redisPassword && redisHost !== '127.0.0.1' && redisHost !== 'localhost');
  
  return {
    host: redisHost,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: redisPassword,
    tls: needsTLS ? {} : undefined,
    connectTimeout: 5000,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      if (times > 1) return null;
      return 100;
    },
    showFriendlyErrorStack: false,
  };
}

const REDIS_CONFIG = getRedisConfig();

/**
 * Priority to BullMQ priority mapping
 * (Lower number = higher priority in BullMQ)
 */
const PRIORITY_MAP: Record<JobPriority, number> = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
};

/**
 * BullMQ-based job queue with Redis backend
 * Falls back to in-memory queue if Redis is unavailable
 */
class JobQueueManager {
  private queues: Map<JobType, Queue> = new Map();
  private workers: Map<JobType, Worker> = new Map();
  private queueEvents: Map<JobType, QueueEvents> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private usingBullMQ: boolean = false;
  private fallbackQueue: InMemoryQueue | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: Date | null = null;
  private healthCheckFailures: number = 0;

  /**
   * Initialize BullMQ or fallback to in-memory
   */
  async initialize() {
    let testQueue: Queue | null = null;
    try {
      // Create test queue with suppressed errors
      testQueue = new Queue('test', { connection: REDIS_CONFIG });
      
      // Suppress ALL error events BEFORE attempting connection
      const connection = await testQueue.client;
      connection.on('error', () => {
        // Silent - errors handled in catch block
      });
      connection.on('connect', () => {
        // Silent success
      });
      connection.on('reconnecting', () => {
        // Silent - already in fallback mode
      });
      
      // Wait for queue with timeout
      await Promise.race([
        testQueue.waitUntilReady(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      await testQueue.close();
      
      this.usingBullMQ = true;
      this.startHealthMonitoring();
      logger.info('✅ Job Queue: Using BullMQ with Redis backend');
    } catch (error) {
      this.usingBullMQ = false;
      this.fallbackQueue = new InMemoryQueue();
      logger.warn('⚠️  BullMQ unavailable, using in-memory job queue fallback');
    }
  }
  
  /**
   * Start periodic health monitoring for Redis
   */
  private startHealthMonitoring() {
    // Check Redis health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, 30000);
  }
  
  /**
   * Check if Redis is still available
   */
  private async checkHealth(): Promise<boolean> {
    if (!this.usingBullMQ) {
      return false; // Already using fallback
    }
    
    try {
      // Try to get a queue and perform a simple operation
      const queue = this.queues.values().next().value as Queue | undefined;
      if (queue) {
        await queue.getJobCounts();
      }
      
      this.lastHealthCheck = new Date();
      this.healthCheckFailures = 0;
      return true;
    } catch (error) {
      this.healthCheckFailures++;
      logger.warn(`Redis health check failed (${this.healthCheckFailures} consecutive failures)`, { error });
      
      // Failover to in-memory after 3 consecutive failures
      if (this.healthCheckFailures >= 3) {
        await this.failoverToInMemory();
      }
      
      return false;
    }
  }
  
  /**
   * Failover from BullMQ to in-memory queue
   */
  private async failoverToInMemory() {
    logger.error('🔴 Redis connection lost, failing over to in-memory job queue');
    
    // Close all BullMQ resources
    try {
      await this.close();
    } catch (error) {
      logger.error('Error closing BullMQ resources during failover', { error });
    }
    
    // Switch to in-memory
    this.usingBullMQ = false;
    this.fallbackQueue = new InMemoryQueue();
    
    // Re-register all handlers with fallback queue
    const handlerEntries = Array.from(this.handlers.entries());
    for (const [type, handler] of handlerEntries) {
      this.fallbackQueue.registerHandler(type, handler);
    }
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    logger.info('✅ Failover complete - using in-memory job queue');
  }

  /**
   * Register a job handler for a specific job type
   */
  registerHandler(type: JobType, handler: JobHandler) {
    this.handlers.set(type, handler);
    
    if (this.usingBullMQ) {
      this.setupBullMQQueue(type, handler);
    } else if (this.fallbackQueue) {
      this.fallbackQueue.registerHandler(type, handler);
    }
    
    logger.info(`Registered job handler for ${type}`);
  }

  /**
   * Setup BullMQ queue and worker for a job type
   */
  private setupBullMQQueue(type: JobType, handler: JobHandler) {
    // Create queue
    const queue = new Queue(type, {
      connection: REDIS_CONFIG,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep for 24 hours
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    this.queues.set(type, queue);

    // Create worker
    const worker = new Worker(
      type,
      async (bullJob: BullJob) => {
        const job: Job = {
          id: bullJob.id!,
          type: type,
          priority: this.getBullMQPriority(bullJob.opts.priority),
          data: bullJob.data.data,
          userId: bullJob.data.userId,
          organizationId: bullJob.data.organizationId,
          status: 'processing',
          progress: 0,
          createdAt: new Date(bullJob.timestamp),
          startedAt: new Date(),
          retries: bullJob.attemptsMade,
          maxRetries: bullJob.opts.attempts || 3,
        };

        logger.info(`Processing job ${job.id} of type ${type}`);

        try {
          const result = await handler(job);
          
          job.status = 'completed';
          job.result = result;
          job.progress = 100;
          job.completedAt = new Date();
          
          logger.info(`Job ${job.id} completed successfully`);
          return result;
        } catch (error) {
          logError(error as Error, {
            context: 'job-queue',
            jobId: job.id,
            jobType: type,
            retries: job.retries,
          });
          
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : 'Unknown error';
          job.completedAt = new Date();
          
          throw error; // Let BullMQ handle retries
        }
      },
      {
        connection: REDIS_CONFIG,
        concurrency: 3,
        limiter: {
          max: 10,
          duration: 1000, // Max 10 jobs per second
        },
      }
    );

    this.workers.set(type, worker);

    // Setup queue events
    const queueEvents = new QueueEvents(type, {
      connection: REDIS_CONFIG,
    });

    queueEvents.on('completed', ({ jobId }) => {
      logger.info(`✅ Job ${jobId} completed`);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`❌ Job ${jobId} failed: ${failedReason}`);
    });

    this.queueEvents.set(type, queueEvents);
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    type: JobType,
    data: any,
    options: {
      userId: string;
      organizationId: string;
      priority?: JobPriority;
      maxRetries?: number;
      delay?: number; // Delay in milliseconds
    }
  ): Promise<string> {
    if (this.fallbackQueue) {
      return this.fallbackQueue.addJob(type, data, options);
    }

    const queue = this.queues.get(type);
    if (!queue) {
      throw new Error(`No queue found for job type: ${type}`);
    }

    try {
      const priority = options.priority || 'normal';
      const bullJob = await queue.add(
        type,
        {
          data,
          userId: options.userId,
          organizationId: options.organizationId,
        },
        {
          priority: PRIORITY_MAP[priority],
          attempts: options.maxRetries || 3,
          delay: options.delay,
        }
      );

      logger.info(`Added job ${bullJob.id} of type ${type} to queue (priority: ${priority})`);
      return bullJob.id!;
    } catch (error) {
      // If adding job fails, trigger health check but respect failure threshold
      logger.error('Failed to add job to BullMQ, triggering health check...', { type, error });
      
      // Trigger health check (will increment failure counter)
      await this.checkHealth();
      
      // Only retry if we've already failed over to in-memory
      // (checkHealth will automatically failover after 3 consecutive failures)
      if (!this.usingBullMQ && this.fallbackQueue) {
        logger.info('Retrying job with in-memory queue after failover');
        return this.addJob(type, data, options);
      }
      
      // Otherwise, throw the error and let the caller handle it
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<Job | undefined> {
    if (this.fallbackQueue) {
      return this.fallbackQueue.getJob(jobId);
    }

    // Search across all queues
    const queueEntries = Array.from(this.queues.entries());
    for (const [type, queue] of queueEntries) {
      try {
        const bullJob = await queue.getJob(jobId);
        if (bullJob) {
          return await this.convertBullJobToJob(bullJob, type);
        }
      } catch (error) {
        // Continue searching
      }
    }

    return undefined;
  }

  /**
   * Get all jobs for a user
   */
  async getUserJobs(userId: string): Promise<Job[]> {
    if (this.fallbackQueue) {
      return this.fallbackQueue.getUserJobs(userId);
    }

    const userJobs: Job[] = [];
    const queueEntries = Array.from(this.queues.entries());

    for (const [type, queue] of queueEntries) {
      const jobs = await queue.getJobs([
        'active',
        'waiting',
        'completed',
        'failed',
        'delayed',
      ]);

      const filtered = await Promise.all(
        jobs
          .filter((job: BullJob) => job.data.userId === userId)
          .map(async (job: BullJob) => await this.convertBullJobToJob(job, type))
      );

      userJobs.push(...filtered);
    }

    return userJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all jobs for an organization
   */
  async getOrganizationJobs(organizationId: string): Promise<Job[]> {
    if (this.fallbackQueue) {
      return this.fallbackQueue.getOrganizationJobs(organizationId);
    }

    const orgJobs: Job[] = [];
    const queueEntries = Array.from(this.queues.entries());

    for (const [type, queue] of queueEntries) {
      const jobs = await queue.getJobs([
        'active',
        'waiting',
        'completed',
        'failed',
        'delayed',
      ]);

      const filtered = await Promise.all(
        jobs
          .filter((job: BullJob) => job.data.organizationId === organizationId)
          .map(async (job: BullJob) => await this.convertBullJobToJob(job, type))
      );

      orgJobs.push(...filtered);
    }

    return orgJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (this.fallbackQueue) {
      return this.fallbackQueue.cancelJob(jobId);
    }

    const queues = Array.from(this.queues.values());
    for (const queue of queues) {
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.remove();
          logger.info(`Job ${jobId} cancelled`);
          return true;
        }
      } catch (error) {
        // Continue searching
      }
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    if (this.fallbackQueue) {
      return {
        ...this.fallbackQueue.getStats(),
        backend: 'in-memory',
      };
    }

    const stats: any = {
      backend: 'bullmq',
      queues: {},
    };

    const queueEntries = Array.from(this.queues.entries());
    for (const [type, queue] of queueEntries) {
      const counts = await queue.getJobCounts();
      stats.queues[type] = counts;
    }

    return stats;
  }

  /**
   * Convert BullMQ job to our Job interface
   */
  private async convertBullJobToJob(bullJob: BullJob, type: JobType): Promise<Job> {
    const state = await bullJob.getState();
    const priority = bullJob.opts.priority;
    
    return {
      id: bullJob.id!,
      type: type,
      priority: this.getBullMQPriority(typeof priority === 'number' ? priority : undefined),
      data: bullJob.data.data,
      userId: bullJob.data.userId,
      organizationId: bullJob.data.organizationId,
      status: this.mapBullMQState(state),
      progress: (bullJob.progress as number) || 0,
      result: bullJob.returnvalue,
      error: bullJob.failedReason,
      createdAt: new Date(bullJob.timestamp),
      startedAt: bullJob.processedOn ? new Date(bullJob.processedOn) : undefined,
      completedAt: bullJob.finishedOn ? new Date(bullJob.finishedOn) : undefined,
      retries: bullJob.attemptsMade,
      maxRetries: bullJob.opts.attempts || 3,
    };
  }

  /**
   * Map BullMQ state to our status
   */
  private mapBullMQState(state: string): Job['status'] {
    switch (state) {
      case 'active':
        return 'processing';
      case 'waiting':
      case 'delayed':
        return 'pending';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Get priority name from BullMQ priority number
   */
  private getBullMQPriority(priority?: number): JobPriority {
    if (!priority) return 'normal';
    
    for (const [name, value] of Object.entries(PRIORITY_MAP)) {
      if (value === priority) return name as JobPriority;
    }
    
    return 'normal';
  }

  /**
   * Close all queues and workers
   */
  async close() {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    const workers = Array.from(this.workers.values());
    for (const worker of workers) {
      await worker.close();
    }
    
    const queues = Array.from(this.queues.values());
    for (const queue of queues) {
      await queue.close();
    }
    
    const queueEvents = Array.from(this.queueEvents.values());
    for (const events of queueEvents) {
      await events.close();
    }
    
    logger.info('Job queue manager closed');
  }

  /**
   * Check if using BullMQ
   */
  isUsingBullMQ(): boolean {
    return this.usingBullMQ;
  }

  /**
   * Force in-memory mode for testing
   * This method is only intended for use in test environments
   */
  async forceInMemoryModeForTesting() {
    if (this.usingBullMQ) {
      logger.warn('Forcing job queue to in-memory mode for testing');
      
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // Close all BullMQ resources
      const workers = Array.from(this.workers.values());
      for (const worker of workers) {
        await worker.close();
      }
      
      const queues = Array.from(this.queues.values());
      for (const queue of queues) {
        await queue.close();
      }
      
      const queueEvents = Array.from(this.queueEvents.values());
      for (const events of queueEvents) {
        await events.close();
      }
      
      // Clear the maps
      this.workers.clear();
      this.queues.clear();
      this.queueEvents.clear();
      
      // Switch to in-memory mode
      this.usingBullMQ = false;
      this.fallbackQueue = new InMemoryQueue();
      
      // Re-register any existing handlers with the fallback queue
      this.handlers.forEach((handler, type) => {
        this.fallbackQueue!.registerHandler(type, handler);
      });
      
      logger.info('Job queue forced to in-memory mode for testing');
    }
  }
}

/**
 * Fallback in-memory queue implementation
 */
class InMemoryQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private processing: boolean = false;
  private concurrency: number = 3;
  private activeJobs: number = 0;

  registerHandler(type: JobType, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  async addJob(
    type: JobType,
    data: any,
    options: {
      userId: string;
      organizationId: string;
      priority?: JobPriority;
      maxRetries?: number;
    }
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job = {
      id: jobId,
      type,
      priority: options.priority || 'normal',
      data,
      userId: options.userId,
      organizationId: options.organizationId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      retries: 0,
      maxRetries: options.maxRetries || 3,
    };

    this.jobs.set(jobId, job);

    if (!this.processing) {
      this.startProcessing();
    }

    return jobId;
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getUserJobs(userId: string): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getOrganizationJobs(organizationId: string): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') return false;

    job.status = 'failed';
    job.error = 'Job cancelled by user';
    job.completedAt = new Date();
    
    return true;
  }

  private async startProcessing() {
    this.processing = true;

    while (this.processing) {
      if (this.activeJobs >= this.concurrency) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const job = this.getNextJob();
      if (!job) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      this.processJob(job);
    }
  }

  private getNextJob(): Job | undefined {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending');

    if (pendingJobs.length === 0) return undefined;

    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    
    return pendingJobs.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })[0];
  }

  private async processJob(job: Job) {
    this.activeJobs++;
    
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      const result = await handler(job);
      
      job.status = 'completed';
      job.result = result;
      job.progress = 100;
      job.completedAt = new Date();
    } catch (error) {
      logError(error as Error, {
        context: 'job-queue',
        jobId: job.id,
        jobType: job.type,
        retries: job.retries,
      });

      if (job.retries < job.maxRetries) {
        job.retries++;
        job.status = 'pending';
        job.progress = 0;
      } else {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = new Date();
      }
    } finally {
      this.activeJobs--;
    }
  }

  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;

    const jobEntries = Array.from(this.jobs.entries());
    for (const [jobId, job] of jobEntries) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        now - job.completedAt.getTime() > maxAgeMs
      ) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old jobs from queue`);
    }
  }

  getStats() {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      activeJobs: this.activeJobs,
      concurrency: this.concurrency,
    };
  }
}

// Singleton instance
export const jobQueue = new JobQueueManager();

// Initialize on startup
jobQueue.initialize().catch(error => {
  logger.error('Failed to initialize job queue', { error });
});

// Auto-cleanup every hour (for in-memory fallback)
setInterval(() => {
  if (!jobQueue.isUsingBullMQ() && jobQueue['fallbackQueue']) {
    jobQueue['fallbackQueue'].cleanup();
  }
}, 60 * 60 * 1000);

// Example job handlers (register these in your app initialization)
export function registerDefaultHandlers() {
  // PDF generation handler
  jobQueue.registerHandler('pdf-generation', async (job) => {
    const { projectId, type } = job.data;
    // Import PDF generator and generate document
    // const { generateProjectPDF } = await import('../pdf-generator');
    // const pdf = await generateProjectPDF(projectId, type);
    // return { pdfPath: pdf };
    
    // Placeholder
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { status: 'generated' };
  });

  // Excel export handler
  jobQueue.registerHandler('excel-export', async (job) => {
    const { data, format } = job.data;
    // Generate Excel file
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { status: 'exported' };
  });

  // Email sending handler
  jobQueue.registerHandler('email-send', async (job) => {
    const { to, subject, html, attachments } = job.data;
    // Send email via email service
    // const { emailService } = await import('../email-service');
    // await emailService.sendEmail({ to, subject, html, attachments });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { status: 'sent' };
  });

  logger.info('Default job handlers registered');
}
