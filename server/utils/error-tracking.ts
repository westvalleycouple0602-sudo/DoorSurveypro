/**
 * Error Tracking Integration
 * Centralized error tracking and reporting
 * Compatible with Sentry, LogRocket, or custom solutions
 */

import { logger } from '../logger';

export interface ErrorContext {
  userId?: number;
  organizationId?: number;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

export interface ErrorReport {
  error: Error;
  context?: ErrorContext;
  level?: 'fatal' | 'error' | 'warning' | 'info';
  tags?: Record<string, string>;
}

class ErrorTracker {
  private enabled: boolean;
  private sentryDsn: string | null;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'production';
    this.sentryDsn = process.env.SENTRY_DSN || null;
    
    if (this.enabled && this.sentryDsn) {
      this.initializeSentry();
    }
  }

  /**
   * Initialize Sentry (if available)
   */
  private initializeSentry(): void {
    try {
      // Sentry is initialized in server/instrument.ts (imported first in index.ts)
      // This confirms the initialization was successful
      logger.info('Sentry error tracking enabled', { 
        environment: process.env.NODE_ENV 
      });
    } catch (error) {
      logger.warn('Sentry not available, using fallback error tracking');
    }
  }

  /**
   * Capture an error
   */
  captureError(report: ErrorReport): void {
    const { error, context, level = 'error', tags } = report;

    // Map fatal to error for Winston (Winston doesn't have fatal level)
    const logLevel = level === 'fatal' ? 'error' : level;

    // Log to Winston
    logger[logLevel](error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      tags,
    });

    // Send to Sentry if available
    if (this.enabled && this.sentryDsn) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.withScope((scope: any) => {
          if (context) {
            scope.setContext('custom', context);
          }
          if (tags) {
            Object.entries(tags).forEach(([key, value]) => {
              scope.setTag(key, value);
            });
          }
          scope.setLevel(level);
          Sentry.captureException(error);
        });
      } catch (err) {
        logger.error('Failed to send error to Sentry', { error: err });
      }
    }
  }

  /**
   * Capture a message (non-error event)
   */
  captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info', context?: ErrorContext): void {
    // Map fatal to error for Winston
    const logLevel = level === 'fatal' ? 'error' : level;
    logger[logLevel](message, { context });

    if (this.enabled && this.sentryDsn) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.captureMessage(message, level);
      } catch (err) {
        logger.error('Failed to send message to Sentry', { error: err });
      }
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: number; email?: string; organizationId?: number }): void {
    if (this.enabled && this.sentryDsn) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.setUser({
          id: user.id.toString(),
          email: user.email,
          organizationId: user.organizationId?.toString(),
        });
      } catch (err) {
        logger.error('Failed to set Sentry user', { error: err });
      }
    }
  }

  /**
   * Add breadcrumb for error tracking
   */
  addBreadcrumb(message: string, category: string, data?: any): void {
    if (this.enabled && this.sentryDsn) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.addBreadcrumb({
          message,
          category,
          data,
          level: 'info',
        });
      } catch (err) {
        logger.debug('Failed to add Sentry breadcrumb', { error: err });
      }
    }
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

/**
 * Express error handling middleware
 */
export function errorTrackingMiddleware(err: Error, req: any, res: any, next: any) {
  errorTracker.captureError({
    error: err,
    context: {
      path: req.path,
      method: req.method,
      userId: req.dbUser?.id,
      organizationId: req.dbUser?.organizationId,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    },
    level: 'error',
    tags: {
      endpoint: req.path,
      method: req.method,
    },
  });

  // Pass to next error handler
  next(err);
}

/**
 * Utility to wrap async route handlers with error tracking
 */
export function trackErrors<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error) {
        errorTracker.captureError({
          error,
          level: 'error',
        });
      }
      throw error;
    }
  }) as T;
}
