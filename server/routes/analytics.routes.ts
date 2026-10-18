/**
 * Analytics API Routes
 * Provides performance metrics and system analytics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../utils/performance-alerts';
import { queryMonitor } from '../utils/query-performance';
import { cache } from '../utils/cache';
import { requireRole } from '../middleware/requireRole';
import { storage, db } from '../storage';
import { sql } from 'drizzle-orm';
import { sessions, projects, quoteRequests, doorOpenings, photos } from '@shared/schema';

const router = Router();

// Require admin role for analytics access
const requireAdmin = requireRole('admin');

/**
 * Get system performance metrics (admin only)
 */
router.get('/performance', requireAdmin, (req: Request, res: Response) => {
  const metrics = performanceMonitor.getMetrics();
  res.json(metrics);
});

/**
 * Get performance alerts (admin only)
 */
router.get('/alerts', requireAdmin, (req: Request, res: Response) => {
  const alerts = performanceMonitor.getAlerts(20);
  res.json(alerts);
});

/**
 * Get critical alerts only (admin only)
 */
router.get('/alerts/critical', requireAdmin, (req: Request, res: Response) => {
  const alerts = performanceMonitor.getCriticalAlerts();
  res.json(alerts);
});

/**
 * Get database query statistics (admin only)
 */
router.get('/queries', requireAdmin, (req: Request, res: Response) => {
  const stats = queryMonitor.getStats();
  const slowQueries = queryMonitor.getSlowQueries(10);
  
  res.json({
    stats,
    slowQueries,
  });
});

/**
 * Get cache statistics (admin only)
 */
router.get('/cache', requireAdmin, (req: Request, res: Response) => {
  const stats = cache.getStats();
  res.json(stats);
});

/**
 * Get user analytics metrics (admin only)
 */
router.get('/metrics', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Query active sessions (sessions not expired)
    const activeSessionsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(sql`expire > NOW()`);
    
    // Query total projects
    const totalProjectsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects);
    
    // Query total quote requests
    const totalQuotesResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(quoteRequests);
    
    // Query total door openings (surveys completed)
    const totalOpeningsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(doorOpenings);
    
    // Query total photos uploaded
    const totalPhotosResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photos);
    
    const metrics = {
      activeUsers: activeSessionsResult[0]?.count || 0,
      totalProjects: totalProjectsResult[0]?.count || 0,
      totalQuotes: totalQuotesResult[0]?.count || 0,
      totalOpenings: totalOpeningsResult[0]?.count || 0,
      totalPhotos: totalPhotosResult[0]?.count || 0,
      conversionRate: totalProjectsResult[0]?.count > 0
        ? ((totalQuotesResult[0]?.count || 0) / totalProjectsResult[0].count * 100).toFixed(2)
        : 0,
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching analytics metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * Clear cache (admin only)
 */
router.post('/cache/clear', requireAdmin, (req: Request, res: Response) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

/**
 * Reset performance metrics (admin only)
 */
router.post('/performance/reset', requireAdmin, (req: Request, res: Response) => {
  performanceMonitor.resetMetrics();
  queryMonitor.clearMetrics();
  
  res.json({ success: true, message: 'Metrics reset' });
});

export default router;
