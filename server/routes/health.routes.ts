import express, { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";
import { cache } from "../utils/cache";
import { jobQueue } from "../utils/job-queue";
import { infrastructureMonitor } from "../utils/infrastructure-monitoring";

const router = Router();

/**
 * Simple health check endpoint (commonly used by monitoring tools)
 * Returns 200 if the service is running
 */
router.get("/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * Liveness probe - checks if the service is running
 * Returns 200 if the process is alive
 */
router.get("/_health/alive", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "doorsurvey-pro"
  });
});

/**
 * Readiness probe - checks if the service is ready to accept traffic
 * Verifies database connectivity and other critical dependencies
 */
router.get("/_health/ready", async (req, res) => {
  const checks: Record<string, any> = {
    version: process.env.REPLIT_DEPLOYMENT_ID || process.env.REPL_SLUG || "development",
    timestamp: new Date().toISOString()
  };

  let allOk = true;

  // Database health check
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;
    
    checks.database = {
      ok: true,
      latency_ms: latency,
      type: "postgresql"
    };
  } catch (error) {
    allOk = false;
    checks.database = {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error"
    };
  }

  // Cache health check
  try {
    const cacheOk = await cache.has('_health_check');
    checks.cache = {
      ok: true,
      backend: cache.isUsingRedis() ? "redis" : "in-memory",
      fallback_active: !cache.isUsingRedis()
    };
  } catch (error) {
    checks.cache = {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown cache error",
      backend: "error"
    };
    // Cache failure is not critical - we have fallback
  }

  // Job queue health check
  try {
    checks.queue = {
      ok: true,
      backend: jobQueue.isUsingBullMQ() ? "bullmq-redis" : "in-memory",
      fallback_active: !jobQueue.isUsingBullMQ()
    };
  } catch (error) {
    checks.queue = {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown queue error",
      backend: "error"
    };
    // Queue failure is not critical - we have fallback
  }

  // Session store health (postgresql-backed)
  checks.session = {
    ok: true,
    type: "postgresql-store"
  };

  // Environment configuration check
  checks.config = {
    ok: Boolean(process.env.DATABASE_URL && process.env.SESSION_SECRET),
    database_configured: Boolean(process.env.DATABASE_URL),
    session_configured: Boolean(process.env.SESSION_SECRET),
    auth_configured: Boolean(process.env.REPLIT_DEPLOYMENT)
  };

  const httpStatus = allOk ? 200 : 503;
  
  res.status(httpStatus).json({
    ok: allOk,
    checks
  });
});

/**
 * Metrics endpoint (stub for future Prometheus integration)
 * Returns basic application metrics
 */
router.get("/_health/metrics", (req, res) => {
  const metrics = {
    process: {
      uptime_seconds: process.uptime(),
      memory_usage_mb: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heap_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu_usage: process.cpuUsage(),
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    environment: {
      node_env: process.env.NODE_ENV || "development",
      deployment_id: process.env.REPLIT_DEPLOYMENT_ID || "local"
    }
  };

  res.json(metrics);
});

/**
 * RUM (Real User Monitoring) endpoint
 * Accepts web-vitals metrics and client errors from the frontend
 */
router.post("/_health/rum", express.json(), (req, res) => {
  const { name, value, userId, variant, url } = req.body;
  
  // Log web-vitals metrics
  if (name && value !== undefined) {
    logger.info('RUM metric', {
      metric: name,
      value,
      userId,
      variant,
      url: url || req.get('referer'),
      userAgent: req.get('user-agent')
    });
  }
  
  res.json({ ok: true });
});

/**
 * Client error tracking endpoint
 * Accepts JavaScript errors from the frontend
 */
router.post("/_health/errors", express.json(), (req, res) => {
  const { event, userId, msg, stack, url } = req.body;
  
  logger.error('Client error', {
    event,
    userId,
    message: msg,
    stack,
    url: url || req.get('referer'),
    userAgent: req.get('user-agent')
  });
  
  res.json({ ok: true });
});

/**
 * Infrastructure monitoring endpoint
 * Returns detailed infrastructure health including Redis/BullMQ status and alerts
 */
router.get("/_health/infrastructure", async (req, res) => {
  const currentHealth = await infrastructureMonitor.getCurrentHealth();
  const recentAlerts = infrastructureMonitor.getRecentAlerts(20);
  
  res.json({
    health: currentHealth,
    alerts: recentAlerts,
    monitoring: {
      enabled: infrastructureMonitor.isRunning(),
      degraded: infrastructureMonitor.isDegraded(),
    }
  });
});

/**
 * Infrastructure monitoring history endpoint
 * Returns historical health data for trending analysis
 */
router.get("/_health/infrastructure/history", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = infrastructureMonitor.getHealthHistory(limit);
  
  res.json({
    history,
    count: history.length
  });
});

export default router;
