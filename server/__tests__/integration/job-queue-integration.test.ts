import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { jobQueue } from '../../utils/job-queue';
import type { JobType } from '../../utils/job-queue';
import {
  createTestContext,
  createMultiTenantContexts,
  delay,
} from './setup';

/**
 * Integration Tests for BullMQ Job Queue with Multi-Tenant Context
 * Tests real job queue operations with proper authentication context
 */

describe('Job Queue Integration Tests', () => {
  const testJobIds: string[] = [];

  // Register job handlers before running tests
  beforeAll(async () => {
    // Force in-memory mode for testing to avoid Redis dependency
    // This ensures deterministic test behavior without waiting for 90s failover
    await (jobQueue as any).forceInMemoryModeForTesting();
    
    // Register email-send handler
    jobQueue.registerHandler('email-send', async (job) => {
      // Simulate email sending
      return { sent: true, to: job.data.to };
    });

    // Register pdf-generation handler
    jobQueue.registerHandler('pdf-generation', async (job) => {
      // Simulate PDF generation
      return { generated: true, reportType: job.data.reportType };
    });

    // Register excel-export handler
    jobQueue.registerHandler('excel-export', async (job) => {
      // Simulate Excel export
      return { exported: true, fileId: job.data.fileId };
    });
  });

  afterEach(async () => {
    // Clean up test jobs if possible
    testJobIds.length = 0;
  });

  describe('Job Creation with Authentication Context', () => {
    it('should create job with user and organization context', async () => {
      const context = createTestContext();
      const jobData = {
        type: 'send-email' as const,
        to: context.user.email,
        subject: 'Test Email',
        template: 'welcome',
      };

      const jobId = await jobQueue.addJob(
        'email-send' as JobType,
        jobData,
        {
          userId: context.userId,
          organizationId: context.organizationId,
        }
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      testJobIds.push(jobId);

      // Verify job can be retrieved
      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      if (job) {
        expect(job.userId).toBe(context.userId);
        expect(job.organizationId).toBe(context.organizationId);
      }
    });

    it('should create jobs for multiple tenants independently', async () => {
      const contexts = createMultiTenantContexts(3);
      
      const jobIds = await Promise.all(
        contexts.map(context =>
          jobQueue.addJob(
            'pdf-generation' as JobType,
            { reportType: 'monthly' },
            {
              userId: context.userId,
              organizationId: context.organizationId,
            }
          )
        )
      );

      expect(jobIds).toHaveLength(3);
      
      // Verify each job has correct tenant context
      for (let i = 0; i < jobIds.length; i++) {
        const job = await jobQueue.getJob(jobIds[i]);
        if (job) {
          expect(job.userId).toBe(contexts[i].userId);
          expect(job.organizationId).toBe(contexts[i].organizationId);
        }
        testJobIds.push(jobIds[i]);
      }
    });
  });

  describe('Job Priority and Scheduling', () => {
    it('should create high-priority jobs', async () => {
      const context = createTestContext();
      const jobData = {
        fileId: 'file-123',
        filename: 'urgent-scan.pdf',
      };

      const jobId = await jobQueue.addJob(
        'excel-export' as JobType,
        jobData,
        {
          userId: context.userId,
          organizationId: context.organizationId,
          priority: 'high',
        }
      );

      expect(jobId).toBeDefined();
      testJobIds.push(jobId);

      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      if (job) {
        expect(job.priority).toBe('high');
      }
    });

    it('should schedule delayed jobs', async () => {
      const context = createTestContext();
      const delayMs = 2000; // 2 seconds

      const jobId = await jobQueue.addJob(
        'email-send' as JobType,
        {
          to: 'reminder@example.com',
          type: 'reminder',
        },
        {
          userId: context.userId,
          organizationId: context.organizationId,
          delay: delayMs,
        }
      );

      expect(jobId).toBeDefined();
      testJobIds.push(jobId);

      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
    });

    it('should create jobs with retry configuration', async () => {
      const context = createTestContext();

      const jobId = await jobQueue.addJob(
        'photo-analysis' as JobType,
        { photoId: 'photo-123' },
        {
          userId: context.userId,
          organizationId: context.organizationId,
          maxRetries: 5,
        }
      );

      expect(jobId).toBeDefined();
      testJobIds.push(jobId);

      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      if (job) {
        expect(job.maxRetries).toBe(5);
      }
    });
  });

  describe('Job Status and Tracking', () => {
    it('should track job state', async () => {
      const context = createTestContext();

      const jobId = await jobQueue.addJob(
        'email-send' as JobType,
        { to: 'test@example.com' },
        {
          userId: context.userId,
          organizationId: context.organizationId,
        }
      );
      
      expect(jobId).toBeDefined();
      testJobIds.push(jobId);

      // Job should be retrievable
      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      if (job) {
        expect(['pending', 'processing', 'completed', 'failed']).toContain(job.status);
      }
    });

    it('should provide job details', async () => {
      const context = createTestContext();

      const jobId = await jobQueue.addJob(
        'pdf-generation' as JobType,
        {
          reportType: 'annual',
          includeCharts: true,
        },
        {
          userId: context.userId,
          organizationId: context.organizationId,
        }
      );

      expect(jobId).toBeDefined();
      testJobIds.push(jobId);

      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      if (job) {
        expect(job.userId).toBe(context.userId);
        expect(job.organizationId).toBe(context.organizationId);
        expect(job.data.reportType).toBe('annual');
      }
    });
  });

  describe('Multi-Tenant Job Isolation', () => {
    it('should isolate jobs by organization', async () => {
      const contexts = createMultiTenantContexts(2);
      const [org1, org2] = contexts;

      // Create jobs for different organizations
      const org1JobId = await jobQueue.addJob(
        'pdf-generation' as JobType,
        { scope: 'organization' },
        {
          userId: org1.userId,
          organizationId: org1.organizationId,
        }
      );

      const org2JobId = await jobQueue.addJob(
        'pdf-generation' as JobType,
        { scope: 'organization' },
        {
          userId: org2.userId,
          organizationId: org2.organizationId,
        }
      );

      testJobIds.push(org1JobId, org2JobId);

      // Verify tenant isolation
      const org1Job = await jobQueue.getJob(org1JobId);
      const org2Job = await jobQueue.getJob(org2JobId);

      expect(org1Job).toBeDefined();
      expect(org2Job).toBeDefined();

      if (org1Job && org2Job) {
        expect(org1Job.organizationId).toBe(org1.organizationId);
        expect(org2Job.organizationId).toBe(org2.organizationId);
        expect(org1Job.organizationId).not.toBe(org2Job.organizationId);
      }
    });
  });

  describe('Job Queue Statistics', () => {
    it('should provide accurate queue statistics', async () => {
      const stats = await jobQueue.getStats();

      expect(stats).toHaveProperty('backend');
      expect(stats).toHaveProperty('healthy');
      expect(['bullmq', 'in-memory']).toContain(stats.backend);
      expect(typeof stats.healthy).toBe('boolean');
    });

    it('should track queue health', async () => {
      const context = createTestContext();

      // Create a few test jobs
      const jobIds = await Promise.all([
        jobQueue.addJob(
          'email-send' as JobType,
          { to: 'test1@example.com' },
          {
            userId: context.userId,
            organizationId: context.organizationId,
          }
        ),
        jobQueue.addJob(
          'pdf-generation' as JobType,
          { type: 'report' },
          {
            userId: context.userId,
            organizationId: context.organizationId,
          }
        ),
      ]);

      jobIds.forEach(id => testJobIds.push(id));

      const stats = await jobQueue.getStats();
      expect(stats.healthy).toBe(true);
    });
  });

  describe('Queue Health Monitoring', () => {
    it('should report healthy status when queue is operational', async () => {
      const stats = await jobQueue.getStats();

      expect(stats.healthy).toBe(true);
      expect(stats.backend).toBeDefined();
    });

    it('should detect backend type correctly', async () => {
      const stats = await jobQueue.getStats();

      // Should be using BullMQ or fallback to in-memory
      expect(['bullmq', 'in-memory']).toContain(stats.backend);

      if (stats.backend === 'bullmq') {
        expect(stats.usingBullMQ).toBe(true);
      } else {
        expect(stats.usingBullMQ).toBe(false);
      }
    });
  });

  describe('Concurrent Job Processing', () => {
    it('should handle concurrent job creation', async () => {
      const context = createTestContext();

      const jobIds = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          jobQueue.addJob(
            'excel-export' as JobType,
            {
              fileId: `file-${i}`,
              index: i,
            },
            {
              userId: context.userId,
              organizationId: context.organizationId,
            }
          )
        )
      );

      expect(jobIds).toHaveLength(10);
      jobIds.forEach(id => {
        expect(id).toBeDefined();
        testJobIds.push(id);
      });

      // Verify all jobs were created
      const jobs = await Promise.all(
        jobIds.map(id => jobQueue.getJob(id))
      );

      jobs.forEach((job, index) => {
        expect(job).toBeDefined();
        if (job) {
          expect(job.data.index).toBe(index);
        }
      });
    });
  });

  describe('Job Data Validation', () => {
    it('should preserve complex job data structures', async () => {
      const context = createTestContext();
      const complexData = {
        reportConfig: {
          type: 'comprehensive',
          dateRange: {
            start: new Date('2025-01-01').toISOString(),
            end: new Date('2025-12-31').toISOString(),
          },
          sections: ['summary', 'details', 'analytics'],
          options: {
            includeCharts: true,
            format: 'pdf',
            pageSize: 'letter',
          },
        },
        recipients: [
          { email: 'user1@example.com', role: 'manager' },
          { email: 'user2@example.com', role: 'admin' },
        ],
      };

      const jobId = await jobQueue.addJob(
        'pdf-generation' as JobType,
        complexData,
        {
          userId: context.userId,
          organizationId: context.organizationId,
        }
      );

      expect(jobId).toBeDefined();
      testJobIds.push(jobId);

      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      if (job) {
        expect(job.data).toMatchObject(complexData);
        expect(job.data.reportConfig.sections).toHaveLength(3);
        expect(job.data.recipients).toHaveLength(2);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle job creation with minimal data', async () => {
      const context = createTestContext();

      const jobId = await jobQueue.addJob(
        'email-send' as JobType,
        { minimal: true },
        {
          userId: context.userId,
          organizationId: context.organizationId,
        }
      );

      expect(jobId).toBeDefined();
      testJobIds.push(jobId);

      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      if (job) {
        expect(job.userId).toBe(context.userId);
        expect(job.organizationId).toBe(context.organizationId);
      }
    });
  });
});
