import { getAuth } from "@clerk/express";
/**
 * Advanced Analytics & User Behavior Tracking
 * Tracks events, funnels, and user journeys for business intelligence
 * 
 * Future Enhancement: Integrate with Mixpanel, Amplitude, or Segment
 */

import { logger } from "../logger";

export type EventCategory =
  | 'user'
  | 'project'
  | 'opening'
  | 'quote'
  | 'purchase'
  | 'compliance'
  | 'integration'
  | 'subscription'
  | 'marketing';

export interface AnalyticsEvent {
  id: string;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  referrer?: string;
}

export interface FunnelStep {
  name: string;
  completed: boolean;
  timestamp?: Date;
  properties?: Record<string, any>;
}

export interface UserJourney {
  userId: string;
  sessionId: string;
  events: AnalyticsEvent[];
  startedAt: Date;
  lastActivityAt: Date;
  durationMs: number;
}

/**
 * Analytics Service
 * In-memory storage for development, replace with database in production
 */
class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private journeys: Map<string, UserJourney> = new Map();
  private maxEventsInMemory = 10000;

  /**
   * Track an event
   */
  track(params: {
    category: EventCategory;
    action: string;
    label?: string;
    value?: number;
    userId?: string;
    organizationId?: string;
    sessionId?: string;
    properties?: Record<string, any>;
    userAgent?: string;
    ip?: string;
    referrer?: string;
  }): void {
    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...params,
      timestamp: new Date(),
    };

    this.events.push(event);

    // Update user journey
    if (params.sessionId) {
      this.updateJourney(params.sessionId, event);
    }

    // Cleanup old events
    if (this.events.length > this.maxEventsInMemory) {
      this.events = this.events.slice(-this.maxEventsInMemory);
    }

    logger.debug('Analytics event tracked', {
      category: event.category,
      action: event.action,
      userId: event.userId,
    });
  }

  /**
   * Update user journey
   */
  private updateJourney(sessionId: string, event: AnalyticsEvent) {
    let journey = this.journeys.get(sessionId);

    if (!journey) {
      journey = {
        userId: event.userId || 'anonymous',
        sessionId,
        events: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
        durationMs: 0,
      };
      this.journeys.set(sessionId, journey);
    }

    journey.events.push(event);
    journey.lastActivityAt = new Date();
    journey.durationMs = journey.lastActivityAt.getTime() - journey.startedAt.getTime();
  }

  /**
   * Track funnel progression
   */
  trackFunnel(
    funnelName: string,
    step: string,
    userId: string,
    organizationId: string,
    properties?: Record<string, any>
  ): void {
    this.track({
      category: 'user',
      action: `funnel_${funnelName}_${step}`,
      userId,
      organizationId,
      properties: {
        funnelName,
        step,
        ...properties,
      },
    });
  }

  /**
   * Get events by filters
   */
  getEvents(filters: {
    category?: EventCategory;
    userId?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
    action?: string;
  }): AnalyticsEvent[] {
    let filtered = this.events;

    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }

    if (filters.organizationId) {
      filtered = filtered.filter(e => e.organizationId === filters.organizationId);
    }

    if (filters.action) {
      filtered = filtered.filter(e => e.action === filters.action);
    }

    if (filters.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
    }

    return filtered;
  }

  /**
   * Get user journey
   */
  getJourney(sessionId: string): UserJourney | undefined {
    return this.journeys.get(sessionId);
  }

  /**
   * Get funnel conversion rates
   */
  getFunnelMetrics(
    funnelName: string,
    startDate?: Date,
    endDate?: Date
  ): {
    steps: Array<{ name: string; count: number; conversionRate: number }>;
    totalStarted: number;
    totalCompleted: number;
    overallConversionRate: number;
  } {
    const events = this.getEvents({
      action: `funnel_${funnelName}*` as any,
      startDate,
      endDate,
    });

    // Group by step
    const stepCounts = new Map<string, number>();
    
    events.forEach(event => {
      const step = event.properties?.step;
      if (step) {
        stepCounts.set(step, (stepCounts.get(step) || 0) + 1);
      }
    });

    // Sort steps and calculate conversion rates
    const steps = Array.from(stepCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count], index, arr) => ({
        name,
        count,
        conversionRate: index === 0 ? 100 : (count / arr[0][1]) * 100,
      }));

    const totalStarted = steps[0]?.count || 0;
    const totalCompleted = steps[steps.length - 1]?.count || 0;

    return {
      steps,
      totalStarted,
      totalCompleted,
      overallConversionRate: totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0,
    };
  }

  /**
   * Get popular actions
   */
  getPopularActions(limit: number = 10): Array<{ action: string; count: number }> {
    const actionCounts = new Map<string, number>();

    this.events.forEach(event => {
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
    });

    return Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([action, count]) => ({ action, count }));
  }

  /**
   * Get active users count
   */
  getActiveUsers(timeWindowMs: number = 24 * 60 * 60 * 1000): {
    dau: number;
    uniqueSessions: number;
  } {
    const cutoff = new Date(Date.now() - timeWindowMs);
    const recentEvents = this.events.filter(e => e.timestamp >= cutoff);

    const uniqueUsers = new Set(recentEvents.map(e => e.userId).filter(Boolean));
    const uniqueSessions = new Set(recentEvents.map(e => e.sessionId).filter(Boolean));

    return {
      dau: uniqueUsers.size,
      uniqueSessions: uniqueSessions.size,
    };
  }

  /**
   * Get retention metrics
   */
  getRetentionMetrics(cohortStartDate: Date, cohortEndDate: Date): {
    cohortSize: number;
    day1: number;
    day7: number;
    day30: number;
  } {
    // Get users who signed up in cohort period
    const cohortUsers = new Set(
      this.events
        .filter(e =>
          e.action === 'user_signup' &&
          e.timestamp >= cohortStartDate &&
          e.timestamp <= cohortEndDate
        )
        .map(e => e.userId)
        .filter(Boolean)
    );

    // Count returning users
    const day1Returning = new Set<string>();
    const day7Returning = new Set<string>();
    const day30Returning = new Set<string>();

    cohortUsers.forEach(userId => {
      if (!userId) return; // Type guard
      
      const userEvents = this.events.filter(e => e.userId === userId);
      const signupEvent = userEvents.find(e => e.action === 'user_signup');
      
      if (!signupEvent) return;

      const signupDate = signupEvent.timestamp;
      const day1Cutoff = new Date(signupDate.getTime() + 24 * 60 * 60 * 1000);
      const day7Cutoff = new Date(signupDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const day30Cutoff = new Date(signupDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const hasDay1Activity = userEvents.some(
        e => e.timestamp > signupDate && e.timestamp <= day1Cutoff
      );
      const hasDay7Activity = userEvents.some(
        e => e.timestamp > signupDate && e.timestamp <= day7Cutoff
      );
      const hasDay30Activity = userEvents.some(
        e => e.timestamp > signupDate && e.timestamp <= day30Cutoff
      );

      if (hasDay1Activity) day1Returning.add(userId);
      if (hasDay7Activity) day7Returning.add(userId);
      if (hasDay30Activity) day30Returning.add(userId);
    });

    const cohortSize = cohortUsers.size;

    return {
      cohortSize,
      day1: cohortSize > 0 ? (day1Returning.size / cohortSize) * 100 : 0,
      day7: cohortSize > 0 ? (day7Returning.size / cohortSize) * 100 : 0,
      day30: cohortSize > 0 ? (day30Returning.size / cohortSize) * 100 : 0,
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp >= last24h);

    return {
      totalEvents: this.events.length,
      eventsLast24h: recentEvents.length,
      activeJourneys: this.journeys.size,
      ...this.getActiveUsers(),
      popularActions: this.getPopularActions(5),
    };
  }

  /**
   * Clear old data
   */
  cleanup(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAgeMs);
    
    // Remove old events
    const beforeCount = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= cutoff);
    
    // Remove old journeys
    let removedJourneys = 0;
    for (const [sessionId, journey] of Array.from(this.journeys.entries())) {
      if (journey.lastActivityAt < cutoff) {
        this.journeys.delete(sessionId);
        removedJourneys++;
      }
    }

    logger.info('Analytics cleanup completed', {
      eventsRemoved: beforeCount - this.events.length,
      journeysRemoved: removedJourneys,
    });
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

// Auto-cleanup every 24 hours
setInterval(() => {
  analytics.cleanup();
}, 24 * 60 * 60 * 1000);

/**
 * Express middleware to track page views
 */
export function trackPageView(req: any, res: any, next: any) {
  const user = req.dbUser as any;
  
  analytics.track({
    category: 'user',
    action: 'page_view',
    label: req.path,
    userId: user?.id,
    organizationId: user?.organizationId,
    sessionId: getAuth(req).sessionId ?? undefined,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    referrer: req.get('referer'),
  });
  
  next();
}

/**
 * Predefined funnels
 */
export const FUNNELS = {
  ONBOARDING: 'onboarding',
  PROJECT_CREATION: 'project_creation',
  QUOTE_GENERATION: 'quote_generation',
  SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
  LEAD_CONVERSION: 'lead_conversion',
} as const;

/**
 * Helper functions for common tracking scenarios
 */
export const trackEvent = {
  userSignup: (userId: string, organizationId: string, properties?: Record<string, any>) => {
    analytics.track({
      category: 'user',
      action: 'user_signup',
      userId,
      organizationId,
      properties,
    });
  },

  projectCreated: (userId: string, organizationId: string, projectId: string) => {
    analytics.track({
      category: 'project',
      action: 'project_created',
      userId,
      organizationId,
      properties: { projectId },
    });
  },

  quoteGenerated: (userId: string, organizationId: string, quoteId: string, value?: number) => {
    analytics.track({
      category: 'quote',
      action: 'quote_generated',
      value,
      userId,
      organizationId,
      properties: { quoteId },
    });
  },

  subscriptionUpgraded: (userId: string, organizationId: string, fromTier: string, toTier: string) => {
    analytics.track({
      category: 'subscription',
      action: 'subscription_upgraded',
      userId,
      organizationId,
      properties: { fromTier, toTier },
    });
  },

  featureUsed: (userId: string, organizationId: string, feature: string) => {
    analytics.track({
      category: 'user',
      action: 'feature_used',
      label: feature,
      userId,
      organizationId,
      properties: { feature },
    });
  },
};
