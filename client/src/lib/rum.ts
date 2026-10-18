import { apiRequest as fetch } from "@/lib/queryClient";
import { onCLS, onLCP, onINP, onFCP, onTTFB, type Metric } from 'web-vitals';

interface RUMConfig {
  userId?: string;
  variant?: string;
  endpoint?: string;
}

let config: RUMConfig = {
  endpoint: '/_health/rum'
};

let initialized = false;

/**
 * Sends metrics to the backend using sendBeacon (preferred) or fetch fallback
 */
const sendMetric = (path: string, payload: any) => {
  const body = JSON.stringify(payload);
  
  // Use sendBeacon for better reliability (survives page unload)
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(path, blob);
  }
  
  // Fallback to fetch for browsers without sendBeacon
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true // Similar to sendBeacon behavior
  }).catch(err => {
    console.warn('Failed to send RUM metric:', err);
  });
};

/**
 * Handles web-vitals metric and sends to backend
 */
const handleMetric = (metric: Metric) => {
  sendMetric(config.endpoint!, {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    userId: config.userId,
    variant: config.variant,
    url: window.location.href,
    timestamp: Date.now()
  });
};

/**
 * Initialize Real User Monitoring (RUM)
 * Tracks Core Web Vitals and sends them to the backend
 * 
 * This function is idempotent - calling it multiple times is safe.
 * 
 * @param userId - Optional user identifier
 * @param variant - Optional A/B test variant identifier
 * 
 * Core Web Vitals tracked:
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - LCP (Largest Contentful Paint) - Loading performance
 * - INP (Interaction to Next Paint) - Responsiveness (replaces deprecated FID)
 * - FCP (First Contentful Paint) - Initial render
 * - TTFB (Time to First Byte) - Server response time
 */
export const initRUM = (userId?: string, variant?: string) => {
  // Guard against re-initialization (idempotent)
  if (initialized) {
    return;
  }
  
  config = {
    ...config,
    userId,
    variant
  };

  // Track Core Web Vitals
  onCLS(handleMetric);
  onLCP(handleMetric);
  onINP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);

  // Track global JavaScript errors
  window.addEventListener('error', (event) => {
    sendMetric('/_health/errors', {
      event: 'client_error',
      userId: config.userId,
      msg: event.message,
      stack: event.error?.stack || '',
      url: window.location.href,
      line: event.lineno,
      column: event.colno,
      timestamp: Date.now()
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    sendMetric('/_health/errors', {
      event: 'unhandled_rejection',
      userId: config.userId,
      msg: String(event.reason),
      stack: event.reason?.stack || '',
      url: window.location.href,
      timestamp: Date.now()
    });
  });
  
  initialized = true;
};

/**
 * Update user context for RUM tracking
 * Call this after user authentication to associate metrics with a user
 * 
 * @param userId - User identifier
 */
export const updateUserContext = (userId?: string) => {
  config.userId = userId;
};

/**
 * Manually track a custom metric
 */
export const trackMetric = (name: string, value: number, metadata?: Record<string, any>) => {
  sendMetric(config.endpoint!, {
    name,
    value,
    userId: config.userId,
    variant: config.variant,
    url: window.location.href,
    timestamp: Date.now(),
    ...metadata
  });
};

/**
 * Track a custom event (e.g., user actions, business metrics)
 */
export const trackEvent = (event: string, data?: Record<string, any>) => {
  sendMetric('/_health/errors', {
    event,
    userId: config.userId,
    url: window.location.href,
    timestamp: Date.now(),
    ...data
  });
};
