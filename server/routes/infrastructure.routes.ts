/**
 * Infrastructure Health API Routes
 * Provides endpoints for monitoring cache and job queue health
 */

import { Router } from 'express';
import { cache } from '../utils/cache';
import { jobQueue } from '../utils/job-queue';
import { logger } from '../logger';

const router = Router();

/**
 * GET /api/infrastructure/health
 * Get overall infrastructure health status
 */
router.get('/health', async (req, res) => {
  try {
    // Get cache stats
    const cacheStats = await cache.getStats();
    
    // Get job queue stats
    const queueStats = await jobQueue.getStats();
    
    // Determine overall health
    const cacheHealthy = cacheStats.backend === 'redis' || cacheStats.backend === 'in-memory';
    const queueHealthy = queueStats.backend === 'bullmq' || queueStats.backend === 'in-memory';
    
    res.json({
      status: cacheHealthy && queueHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      cache: {
        backend: cacheStats.backend,
        healthy: cacheHealthy,
        entries: cacheStats.totalEntries,
        memory: cacheStats.memoryEstimate,
      },
      queue: {
        backend: queueStats.backend,
        healthy: queueHealthy,
        usingBullMQ: jobQueue.isUsingBullMQ(),
        queues: queueStats.queues || {},
      },
    });
  } catch (error) {
    logger.error('Error fetching infrastructure health', { error });
    res.status(500).json({ error: 'Failed to fetch infrastructure health' });
  }
});

/**
 * GET /api/infrastructure/cache
 * Get detailed cache statistics
 */
router.get('/cache', async (req, res) => {
  try {
    const stats = await cache.getStats();
    
    res.json({
      backend: stats.backend,
      totalEntries: stats.totalEntries,
      activeEntries: stats.activeEntries,
      expiredEntries: stats.expiredEntries,
      memoryEstimate: stats.memoryEstimate,
      timestamp: new Date().toISOString(),
      configuration: {
        scanBatchSize: 100,
        deleteBatchSize: 1000,
        minTTL: 1, // seconds
        defaultTTL: 300, // seconds
      },
    });
  } catch (error) {
    logger.error('Error fetching cache stats', { error });
    res.status(500).json({ error: 'Failed to fetch cache statistics' });
  }
});

/**
 * GET /api/infrastructure/queue
 * Get detailed job queue statistics
 */
router.get('/queue', async (req, res) => {
  try {
    const stats = await jobQueue.getStats();
    
    // Calculate total jobs across all queues
    let totalJobs = 0;
    let totalActive = 0;
    let totalWaiting = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    
    if (stats.queues) {
      Object.values(stats.queues).forEach((queueStats: any) => {
        totalActive += queueStats.active || 0;
        totalWaiting += queueStats.waiting || 0;
        totalCompleted += queueStats.completed || 0;
        totalFailed += queueStats.failed || 0;
        totalJobs += (queueStats.active || 0) + (queueStats.waiting || 0);
      });
    }
    
    res.json({
      backend: stats.backend,
      usingBullMQ: jobQueue.isUsingBullMQ(),
      totalJobs,
      totalActive,
      totalWaiting,
      totalCompleted,
      totalFailed,
      queues: stats.queues || {},
      timestamp: new Date().toISOString(),
      configuration: {
        healthCheckInterval: 30, // seconds
        failureThreshold: 3,
        failoverTime: 90, // seconds (30s × 3)
        concurrency: 3,
        rateLimit: '10 jobs/second',
      },
    });
  } catch (error) {
    logger.error('Error fetching queue stats', { error });
    res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
});

/**
 * POST /api/infrastructure/cache/clear
 * Clear cache (admin only)
 */
router.post('/cache/clear', async (req, res) => {
  try {
    // Check if user is admin (optional - remove if not using authentication)
    const user = req.dbUser;
    if (!user || !["owner", "admin"].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { pattern } = req.body;
    
    if (pattern) {
      // Clear specific pattern
      await cache.invalidatePattern(pattern);
      logger.info('Cache pattern cleared', { pattern, userId: user.id });
      res.json({ success: true, message: `Cleared cache pattern: ${pattern}` });
    } else {
      // Clear all cache
      await cache.invalidatePattern('cache:*');
      logger.info('All cache cleared', { userId: user.id });
      res.json({ success: true, message: 'All cache cleared' });
    }
  } catch (error) {
    logger.error('Error clearing cache', { error });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * GET /api/infrastructure/metrics
 * Get infrastructure metrics for monitoring
 */
router.get('/metrics', async (req, res) => {
  try {
    const cacheStats = await cache.getStats();
    const queueStats = await jobQueue.getStats();
    
    // Calculate uptime
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    res.json({
      application: {
        uptime: {
          seconds: Math.floor(uptime),
          formatted: `${uptimeHours}h ${uptimeMinutes}m`,
        },
        memory: {
          usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        },
        cpu: {
          user: process.cpuUsage().user,
          system: process.cpuUsage().system,
        },
      },
      cache: {
        backend: cacheStats.backend,
        entries: cacheStats.totalEntries,
        memory: cacheStats.memoryEstimate,
      },
      queue: {
        backend: queueStats.backend,
        usingBullMQ: jobQueue.isUsingBullMQ(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching infrastructure metrics', { error });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export { router as infrastructureRoutes };
