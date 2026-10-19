/**
 * Database Query Performance Monitoring
 * Tracks slow queries and provides performance insights
 */

import { logger } from '../logger';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
  slow: boolean;
}

class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private slowQueryThreshold: number;
  private maxMetricsSize: number;

  constructor(slowQueryThreshold: number = 100, maxMetricsSize: number = 1000) {
    this.slowQueryThreshold = slowQueryThreshold; // ms
    this.maxMetricsSize = maxMetricsSize;
  }

  /**
   * Record a query execution
   */
  recordQuery(query: string, duration: number, params?: any): void {
    const isSlow = duration > this.slowQueryThreshold;
    
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      params: this.sanitizeParams(params),
      slow: isSlow,
    };

    this.metrics.push(metric);

    // Trim metrics if exceeding max size
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // Log slow queries
    if (isSlow) {
      logger.warn('Slow query detected', {
        query: metric.query,
        duration: `${duration}ms`,
        threshold: `${this.slowQueryThreshold}ms`,
      });
    }
  }

  /**
   * Get slow query statistics
   */
  getSlowQueries(limit: number = 10): QueryMetrics[] {
    return this.metrics
      .filter(m => m.slow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get query statistics
   */
  getStats() {
    const totalQueries = this.metrics.length;
    const slowQueries = this.metrics.filter(m => m.slow).length;
    
    const durations = this.metrics.map(m => m.duration);
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;

    return {
      totalQueries,
      slowQueries,
      slowQueryPercentage: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
      avgDuration: Math.round(avgDuration * 100) / 100,
      maxDuration,
      minDuration,
      threshold: this.slowQueryThreshold,
    };
  }

  /**
   * Get queries by time range
   */
  getQueriesByTimeRange(startTime: Date, endTime: Date): QueryMetrics[] {
    return this.metrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Truncate very long queries
    if (query.length > 500) {
      return query.substring(0, 500) + '...';
    }
    return query;
  }

  /**
   * Sanitize query parameters (remove sensitive values)
   */
  private sanitizeParams(params: any): any {
    if (!params) return undefined;
    
    // Don't log passwords, tokens, etc.
    const sensitive = ['password', 'token', 'secret', 'apiKey'];
    
    if (typeof params === 'object' && params !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(params)) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    
    return params;
  }
}

// Singleton instance
export const queryMonitor = new QueryPerformanceMonitor();

/**
 * Middleware to track query performance
 */
export function trackQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return queryFn()
    .then(result => {
      const duration = Date.now() - start;
      queryMonitor.recordQuery(queryName, duration);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      queryMonitor.recordQuery(queryName, duration);
      throw error;
    });
}

/**
 * Decorator for tracking query performance
 */
export function TrackQuery(queryName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        queryMonitor.recordQuery(`${queryName}.${propertyKey}`, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        queryMonitor.recordQuery(`${queryName}.${propertyKey}`, duration);
        throw error;
      }
    };

    return descriptor;
  };
}
