import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { infrastructureRoutes } from '../../routes/infrastructure.routes';

/**
 * Integration Tests for Infrastructure Health API
 * Tests the REAL /api/infrastructure/* endpoints from server/routes/infrastructure.routes.ts
 * Uses supertest to test actual production code paths
 */

// Create test Express app with REAL infrastructure routes
let app: express.Application;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  
  // Mount the REAL infrastructure routes from production code
  app.use('/api/infrastructure', infrastructureRoutes);
});

describe('Infrastructure API Integration Tests', () => {
  describe('GET /api/infrastructure/health', () => {
    it('should return 200 with health status', async () => {
      const response = await request(app)
        .get('/api/infrastructure/health')
        .expect(200)
        .expect('Content-Type', /json/);
      
      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('queue');
    });

    it('should include cache health information', async () => {
      const response = await request(app)
        .get('/api/infrastructure/health')
        .expect(200);
      
      expect(response.body.cache).toHaveProperty('backend');
      expect(['redis', 'in-memory']).toContain(response.body.cache.backend);
      expect(response.body.cache).toHaveProperty('healthy');
      expect(typeof response.body.cache.healthy).toBe('boolean');
      expect(response.body.cache).toHaveProperty('entries');
      expect(response.body.cache).toHaveProperty('memory');
    });

    it('should include queue health information', async () => {
      const response = await request(app)
        .get('/api/infrastructure/health')
        .expect(200);
      
      expect(response.body.queue).toHaveProperty('backend');
      expect(['bullmq', 'in-memory']).toContain(response.body.queue.backend);
      expect(response.body.queue).toHaveProperty('healthy');
      expect(typeof response.body.queue.healthy).toBe('boolean');
      expect(response.body.queue).toHaveProperty('usingBullMQ');
      expect(response.body.queue).toHaveProperty('queues');
    });

    it('should have valid timestamp', async () => {
      const response = await request(app)
        .get('/api/infrastructure/health')
        .expect(200);
      
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should return healthy status when all components are operational', async () => {
      const response = await request(app)
        .get('/api/infrastructure/health')
        .expect(200);
      
      // If cache and queue are both healthy, overall status should be healthy
      if (response.body.cache.healthy && response.body.queue.healthy) {
        expect(response.body.status).toBe('healthy');
      }
    });
  });

  describe('GET /api/infrastructure/cache', () => {
    it('should return 200 with cache statistics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/cache')
        .expect(200)
        .expect('Content-Type', /json/);
      
      expect(response.body).toHaveProperty('backend');
      expect(['redis', 'in-memory']).toContain(response.body.backend);
    });

    it('should include detailed cache metrics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/cache')
        .expect(200);
      
      expect(response.body).toHaveProperty('totalEntries');
      expect(response.body).toHaveProperty('activeEntries');
      expect(response.body).toHaveProperty('expiredEntries');
      expect(response.body).toHaveProperty('memoryEstimate');
      expect(response.body).toHaveProperty('timestamp');
      
      expect(typeof response.body.totalEntries).toBe('number');
      expect(typeof response.body.activeEntries).toBe('number');
      expect(typeof response.body.expiredEntries).toBe('number');
      expect(typeof response.body.memoryEstimate).toBe('string');
    });

    it('should include cache configuration', async () => {
      const response = await request(app)
        .get('/api/infrastructure/cache')
        .expect(200);
      
      expect(response.body).toHaveProperty('configuration');
      expect(response.body.configuration).toHaveProperty('scanBatchSize');
      expect(response.body.configuration).toHaveProperty('deleteBatchSize');
      expect(response.body.configuration).toHaveProperty('minTTL');
      expect(response.body.configuration).toHaveProperty('defaultTTL');
      
      // Verify production-ready configuration
      expect(response.body.configuration.scanBatchSize).toBe(100);
      expect(response.body.configuration.deleteBatchSize).toBe(1000);
      expect(response.body.configuration.minTTL).toBe(1);
    });
  });

  describe('GET /api/infrastructure/queue', () => {
    it('should return 200 with queue statistics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/queue')
        .expect(200)
        .expect('Content-Type', /json/);
      
      expect(response.body).toHaveProperty('backend');
      expect(['bullmq', 'in-memory']).toContain(response.body.backend);
    });

    it('should include job count metrics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/queue')
        .expect(200);
      
      expect(response.body).toHaveProperty('totalJobs');
      expect(response.body).toHaveProperty('totalActive');
      expect(response.body).toHaveProperty('totalWaiting');
      expect(response.body).toHaveProperty('totalCompleted');
      expect(response.body).toHaveProperty('totalFailed');
      
      expect(typeof response.body.totalJobs).toBe('number');
      expect(typeof response.body.totalActive).toBe('number');
      expect(typeof response.body.totalWaiting).toBe('number');
      expect(typeof response.body.totalCompleted).toBe('number');
      expect(typeof response.body.totalFailed).toBe('number');
    });

    it('should include BullMQ status and queues', async () => {
      const response = await request(app)
        .get('/api/infrastructure/queue')
        .expect(200);
      
      expect(response.body).toHaveProperty('usingBullMQ');
      expect(typeof response.body.usingBullMQ).toBe('boolean');
      expect(response.body).toHaveProperty('queues');
      expect(typeof response.body.queues).toBe('object');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include queue configuration', async () => {
      const response = await request(app)
        .get('/api/infrastructure/queue')
        .expect(200);
      
      expect(response.body).toHaveProperty('configuration');
      expect(response.body.configuration).toHaveProperty('healthCheckInterval');
      expect(response.body.configuration).toHaveProperty('failureThreshold');
      expect(response.body.configuration).toHaveProperty('failoverTime');
      
      // Verify production-ready configuration (90s failover)
      expect(response.body.configuration.healthCheckInterval).toBe(30);
      expect(response.body.configuration.failureThreshold).toBe(3);
      expect(response.body.configuration.failoverTime).toBe(90);
    });
  });

  describe('GET /api/infrastructure/metrics', () => {
    it('should return 200 with application metrics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/metrics')
        .expect(200)
        .expect('Content-Type', /json/);
      
      expect(response.body).toHaveProperty('application');
      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('queue');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include application uptime', async () => {
      const response = await request(app)
        .get('/api/infrastructure/metrics')
        .expect(200);
      
      expect(response.body.application).toHaveProperty('uptime');
      expect(response.body.application.uptime).toHaveProperty('seconds');
      expect(response.body.application.uptime).toHaveProperty('formatted');
      
      expect(typeof response.body.application.uptime.seconds).toBe('number');
      expect(response.body.application.uptime.seconds).toBeGreaterThan(0);
      expect(typeof response.body.application.uptime.formatted).toBe('string');
    });

    it('should include memory usage metrics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/metrics')
        .expect(200);
      
      expect(response.body.application).toHaveProperty('memory');
      expect(response.body.application.memory).toHaveProperty('usedMB');
      expect(response.body.application.memory).toHaveProperty('totalMB');
      expect(response.body.application.memory).toHaveProperty('percentage');
      
      expect(typeof response.body.application.memory.usedMB).toBe('number');
      expect(typeof response.body.application.memory.totalMB).toBe('number');
      expect(typeof response.body.application.memory.percentage).toBe('number');
      
      expect(response.body.application.memory.usedMB).toBeGreaterThan(0);
      expect(response.body.application.memory.totalMB).toBeGreaterThan(0);
      expect(response.body.application.memory.percentage).toBeGreaterThan(0);
      expect(response.body.application.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should include CPU usage metrics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/metrics')
        .expect(200);
      
      expect(response.body.application).toHaveProperty('cpu');
      expect(response.body.application.cpu).toHaveProperty('user');
      expect(response.body.application.cpu).toHaveProperty('system');
      
      expect(typeof response.body.application.cpu.user).toBe('number');
      expect(typeof response.body.application.cpu.system).toBe('number');
      expect(response.body.application.cpu.user).toBeGreaterThanOrEqual(0);
      expect(response.body.application.cpu.system).toBeGreaterThanOrEqual(0);
    });

    it('should include cache summary in metrics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/metrics')
        .expect(200);
      
      expect(response.body.cache).toHaveProperty('backend');
      expect(response.body.cache).toHaveProperty('entries');
      expect(response.body.cache).toHaveProperty('memory');
      
      expect(['redis', 'in-memory']).toContain(response.body.cache.backend);
      expect(typeof response.body.cache.entries).toBe('number');
      expect(typeof response.body.cache.memory).toBe('string');
    });

    it('should include queue summary in metrics', async () => {
      const response = await request(app)
        .get('/api/infrastructure/metrics')
        .expect(200);
      
      expect(response.body.queue).toHaveProperty('backend');
      expect(response.body.queue).toHaveProperty('usingBullMQ');
      
      expect(['bullmq', 'in-memory']).toContain(response.body.queue.backend);
      expect(typeof response.body.queue.usingBullMQ).toBe('boolean');
    });
  });

  describe('API Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/infrastructure/nonexistent')
        .expect(404);
    });
  });

  describe('Production Readiness Validation', () => {
    it('should validate SCAN-based cache invalidation configuration', async () => {
      const response = await request(app)
        .get('/api/infrastructure/cache')
        .expect(200);
      
      // Verify production-ready configuration
      expect(response.body.configuration.scanBatchSize).toBe(100);
      expect(response.body.configuration.deleteBatchSize).toBe(1000);
    });

    it('should validate automatic failover configuration', async () => {
      const response = await request(app)
        .get('/api/infrastructure/queue')
        .expect(200);
      
      // Verify 90-second failover configuration (30s × 3 failures)
      expect(response.body.configuration.healthCheckInterval).toBe(30);
      expect(response.body.configuration.failureThreshold).toBe(3);
      expect(response.body.configuration.failoverTime).toBe(90);
    });

    it('should validate TTL clamping configuration', async () => {
      const response = await request(app)
        .get('/api/infrastructure/cache')
        .expect(200);
      
      // Verify minimum TTL is 1 second (prevents memory leaks)
      expect(response.body.configuration.minTTL).toBe(1);
    });

    it('should monitor both cache and queue health status', async () => {
      const response = await request(app)
        .get('/api/infrastructure/health')
        .expect(200);
      
      // Both components should report health status
      expect(typeof response.body.cache.healthy).toBe('boolean');
      expect(typeof response.body.queue.healthy).toBe('boolean');
      
      // Overall status should reflect component health
      const allHealthy = response.body.cache.healthy && response.body.queue.healthy;
      if (allHealthy) {
        expect(response.body.status).toBe('healthy');
      } else {
        expect(['degraded', 'unhealthy']).toContain(response.body.status);
      }
    });
  });
});
