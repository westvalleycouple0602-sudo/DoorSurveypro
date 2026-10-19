/**
 * Infrastructure Monitoring Service
 * 
 * Monitors critical infrastructure components (Redis, BullMQ, Database)
 * and provides alerting capabilities for failover events and health degradation.
 */

import { logger } from '../logger';
import { cache } from './cache';
import { jobQueue } from './job-queue';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface InfrastructureHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  components: {
    database: ComponentHealth;
    cache: ComponentHealth;
    queue: ComponentHealth;
  };
  alerts: Alert[];
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  backend: string;
  usingFallback: boolean;
  latency?: number;
  error?: string;
  uptime?: number;
  lastHealthCheck?: Date;
}

export interface Alert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  details?: any;
}

/**
 * Infrastructure Monitor
 * Periodically checks health of all infrastructure components
 */
class InfrastructureMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthHistory: InfrastructureHealth[] = [];
  private maxHistorySize = 100;
  private lastAlerts: Map<string, Alert> = new Map();
  private isMonitoring = false;

  // State tracking for change detection
  private lastKnownState = {
    cacheBackend: 'unknown',
    queueBackend: 'unknown',
    databaseHealthy: true,
  };

  /**
   * Start monitoring infrastructure components
   */
  start(intervalMs: number = 30000) {
    if (this.isMonitoring) {
      logger.warn('Infrastructure monitoring already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting infrastructure monitoring', { interval: `${intervalMs}ms` });

    // Initial check
    this.performHealthCheck();

    // Periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      logger.info('Infrastructure monitoring stopped');
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<InfrastructureHealth> {
    const timestamp = new Date();
    const alerts: Alert[] = [];

    // Check database health
    const database = await this.checkDatabaseHealth();
    if (database.status === 'critical') {
      alerts.push({
        severity: 'critical',
        component: 'database',
        message: 'Database connection failed',
        timestamp,
        details: { error: database.error },
      });
    } else if (database.latency && database.latency > 1000) {
      alerts.push({
        severity: 'warning',
        component: 'database',
        message: `Database latency high: ${database.latency}ms`,
        timestamp,
        details: { latency: database.latency },
      });
    }

    // Check cache health
    const cacheHealth = await this.checkCacheHealth();
    
    // Detect cache backend changes (failover/recovery)
    if (cacheHealth.backend !== this.lastKnownState.cacheBackend && this.lastKnownState.cacheBackend !== 'unknown') {
      if (cacheHealth.backend === 'in-memory') {
        alerts.push({
          severity: 'error',
          component: 'cache',
          message: '🔴 Cache failover detected: Redis → in-memory',
          timestamp,
          details: { 
            from: this.lastKnownState.cacheBackend, 
            to: cacheHealth.backend,
            reason: 'Redis connection lost'
          },
        });
        logger.error('Cache failover detected', {
          from: this.lastKnownState.cacheBackend,
          to: cacheHealth.backend,
        });
      } else if (cacheHealth.backend === 'redis') {
        alerts.push({
          severity: 'info',
          component: 'cache',
          message: '✅ Cache recovered: in-memory → Redis',
          timestamp,
          details: { 
            from: this.lastKnownState.cacheBackend, 
            to: cacheHealth.backend 
          },
        });
        logger.info('Cache recovered to Redis', {
          from: this.lastKnownState.cacheBackend,
          to: cacheHealth.backend,
        });
      }
    }
    this.lastKnownState.cacheBackend = cacheHealth.backend;

    // Check job queue health
    const queueHealth = await this.checkQueueHealth();
    
    // Detect queue backend changes (failover/recovery)
    if (queueHealth.backend !== this.lastKnownState.queueBackend && this.lastKnownState.queueBackend !== 'unknown') {
      if (queueHealth.backend === 'in-memory') {
        alerts.push({
          severity: 'error',
          component: 'queue',
          message: '🔴 Job queue failover detected: BullMQ → in-memory',
          timestamp,
          details: { 
            from: this.lastKnownState.queueBackend, 
            to: queueHealth.backend,
            reason: 'Redis connection lost'
          },
        });
        logger.error('Job queue failover detected', {
          from: this.lastKnownState.queueBackend,
          to: queueHealth.backend,
        });
      } else if (queueHealth.backend === 'bullmq-redis') {
        alerts.push({
          severity: 'info',
          component: 'queue',
          message: '✅ Job queue recovered: in-memory → BullMQ',
          timestamp,
          details: { 
            from: this.lastKnownState.queueBackend, 
            to: queueHealth.backend 
          },
        });
        logger.info('Job queue recovered to BullMQ', {
          from: this.lastKnownState.queueBackend,
          to: queueHealth.backend,
        });
      }
    }
    this.lastKnownState.queueBackend = queueHealth.backend;

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (database.status === 'critical') {
      overallStatus = 'critical';
    } else if (cacheHealth.status === 'degraded' || queueHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }

    const health: InfrastructureHealth = {
      status: overallStatus,
      timestamp,
      components: {
        database,
        cache: cacheHealth,
        queue: queueHealth,
      },
      alerts,
    };

    // Store in history
    this.healthHistory.push(health);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }

    // Log alerts
    for (const alert of alerts) {
      this.logAlert(alert);
    }

    return health;
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      const latency = Date.now() - start;

      return {
        name: 'PostgreSQL Database',
        status: latency > 1000 ? 'degraded' : 'healthy',
        backend: 'postgresql',
        usingFallback: false,
        latency,
        lastHealthCheck: new Date(),
      };
    } catch (error) {
      return {
        name: 'PostgreSQL Database',
        status: 'critical',
        backend: 'postgresql',
        usingFallback: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastHealthCheck: new Date(),
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<ComponentHealth> {
    try {
      await cache.has('_infrastructure_health_check');
      const usingRedis = cache.isUsingRedis();

      return {
        name: 'Cache',
        status: usingRedis ? 'healthy' : 'degraded',
        backend: usingRedis ? 'redis' : 'in-memory',
        usingFallback: !usingRedis,
        lastHealthCheck: new Date(),
      };
    } catch (error) {
      return {
        name: 'Cache',
        status: 'degraded',
        backend: 'error',
        usingFallback: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastHealthCheck: new Date(),
      };
    }
  }

  /**
   * Check job queue health
   */
  private async checkQueueHealth(): Promise<ComponentHealth> {
    try {
      const usingBullMQ = jobQueue.isUsingBullMQ();

      return {
        name: 'Job Queue',
        status: usingBullMQ ? 'healthy' : 'degraded',
        backend: usingBullMQ ? 'bullmq-redis' : 'in-memory',
        usingFallback: !usingBullMQ,
        lastHealthCheck: new Date(),
      };
    } catch (error) {
      return {
        name: 'Job Queue',
        status: 'degraded',
        backend: 'error',
        usingFallback: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastHealthCheck: new Date(),
      };
    }
  }

  /**
   * Log alert with deduplication
   */
  private logAlert(alert: Alert) {
    const alertKey = `${alert.component}:${alert.message}`;
    const lastAlert = this.lastAlerts.get(alertKey);

    // Deduplicate alerts (don't log same alert within 5 minutes)
    if (lastAlert && Date.now() - lastAlert.timestamp.getTime() < 5 * 60 * 1000) {
      return;
    }

    this.lastAlerts.set(alertKey, alert);

    // Log with appropriate level
    const logMethod = alert.severity === 'critical' || alert.severity === 'error' 
      ? logger.error 
      : alert.severity === 'warning' 
        ? logger.warn 
        : logger.info;

    logMethod('Infrastructure alert', {
      severity: alert.severity,
      component: alert.component,
      message: alert.message,
      details: alert.details,
    });
  }

  /**
   * Get current health status
   */
  async getCurrentHealth(): Promise<InfrastructureHealth> {
    return await this.performHealthCheck();
  }

  /**
   * Get health history
   */
  getHealthHistory(limit?: number): InfrastructureHealth[] {
    const history = this.healthHistory.slice();
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): Alert[] {
    const allAlerts = this.healthHistory
      .flatMap(h => h.alerts)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return allAlerts.slice(0, limit);
  }

  /**
   * Check if any component is in degraded state
   */
  isDegraded(): boolean {
    if (this.healthHistory.length === 0) return false;
    const latest = this.healthHistory[this.healthHistory.length - 1];
    return latest.status === 'degraded' || latest.status === 'critical';
  }

  /**
   * Get monitoring status
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }
}

// Singleton instance
export const infrastructureMonitor = new InfrastructureMonitor();

// Auto-start monitoring when module is imported
infrastructureMonitor.start(30000); // Check every 30 seconds
