/**
 * Performance Monitoring and Alerting
 * Detects performance issues and sends alerts
 */

import { logger } from '../logger';
import { queryMonitor } from './query-performance';

interface PerformanceThresholds {
  maxResponseTime: number; // ms
  maxMemoryUsage: number; // MB
  maxCPUUsage: number; // percentage
  maxSlowQueriesPercentage: number; // percentage
}

interface PerformanceAlert {
  type: 'response_time' | 'memory' | 'cpu' | 'slow_queries' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

class PerformanceMonitor {
  private thresholds: PerformanceThresholds;
  private alerts: PerformanceAlert[] = [];
  private requestDurations: number[] = [];
  private errorCount: number = 0;
  private requestCount: number = 0;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxResponseTime: 1000, // 1 second
      maxMemoryUsage: 512, // 512 MB
      maxCPUUsage: 80, // 80%
      maxSlowQueriesPercentage: 10, // 10%
      ...thresholds,
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Record request duration
   * @param statusCode - HTTP status code (optional, used to filter expected errors)
   */
  recordRequest(duration: number, isError: boolean = false, statusCode?: number): void {
    this.requestDurations.push(duration);
    this.requestCount++;
    
    // Only count as error if it's a real system error (500+)
    // Exclude auth errors (401) and client errors (400-499) from error rate
    if (isError && statusCode && statusCode >= 500) {
      this.errorCount++;
    }

    // Keep only last 1000 requests
    if (this.requestDurations.length > 1000) {
      this.requestDurations.shift();
    }

    // Check for slow response
    if (duration > this.thresholds.maxResponseTime) {
      this.createAlert({
        type: 'response_time',
        severity: this.getSeverity(duration, this.thresholds.maxResponseTime),
        message: `Slow response detected: ${duration}ms`,
        value: duration,
        threshold: this.thresholds.maxResponseTime,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const queryStats = queryMonitor.getStats();

    const avgResponseTime = this.requestDurations.length > 0
      ? this.requestDurations.reduce((a, b) => a + b, 0) / this.requestDurations.length
      : 0;

    const errorRate = this.requestCount > 0
      ? (this.errorCount / this.requestCount) * 100
      : 0;

    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      },
      queries: queryStats,
      uptime: process.uptime(),
    };
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): PerformanceAlert[] {
    return this.alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThan: Date): void {
    this.alerts = this.alerts.filter(a => a.timestamp > olderThan);
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.requestDurations = [];
    this.errorCount = 0;
    this.requestCount = 0;
    this.alerts = [];
  }

  /**
   * Start background monitoring
   */
  private startMonitoring(): void {
    // Check system metrics every 30 seconds
    setInterval(() => {
      this.checkSystemMetrics();
    }, 30 * 1000);

    // Clean old alerts every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.clearOldAlerts(oneHourAgo);
    }, 60 * 60 * 1000);
  }

  /**
   * Check system metrics and create alerts
   */
  private checkSystemMetrics(): void {
    const metrics = this.getMetrics();

    // Check memory usage
    if (metrics.memory.heapUsed > this.thresholds.maxMemoryUsage) {
      this.createAlert({
        type: 'memory',
        severity: this.getSeverity(metrics.memory.heapUsed, this.thresholds.maxMemoryUsage),
        message: `High memory usage: ${metrics.memory.heapUsed}MB`,
        value: metrics.memory.heapUsed,
        threshold: this.thresholds.maxMemoryUsage,
        timestamp: new Date(),
      });
    }

    // Check slow queries
    if (metrics.queries.slowQueryPercentage > this.thresholds.maxSlowQueriesPercentage) {
      this.createAlert({
        type: 'slow_queries',
        severity: 'medium',
        message: `High percentage of slow queries: ${metrics.queries.slowQueryPercentage.toFixed(2)}%`,
        value: metrics.queries.slowQueryPercentage,
        threshold: this.thresholds.maxSlowQueriesPercentage,
        timestamp: new Date(),
      });
    }

    // Check error rate (only if we have enough requests to be meaningful)
    // Require at least 10 requests in the window to avoid false positives
    if (metrics.requests.total >= 10 && metrics.requests.errorRate > 5) { // > 5% error rate
      this.createAlert({
        type: 'error_rate',
        severity: metrics.requests.errorRate > 10 ? 'high' : 'medium',
        message: `High error rate: ${metrics.requests.errorRate.toFixed(2)}%`,
        value: metrics.requests.errorRate,
        threshold: 5,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Create and store an alert
   */
  private createAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Log alert
    const logLevel = alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warn';
    logger[logLevel]('Performance alert', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
    });
  }

  /**
   * Determine severity based on how much threshold is exceeded
   */
  private getSeverity(value: number, threshold: number): PerformanceAlert['severity'] {
    const ratio = value / threshold;
    
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Express middleware for performance monitoring
 */
export function performanceMiddleware(req: any, res: any, next: any) {
  const start = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    res.send = originalSend;
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    
    // Pass status code to help filter real errors from expected failures
    performanceMonitor.recordRequest(duration, isError, res.statusCode);
    
    return originalSend.call(this, data);
  };

  next();
}
