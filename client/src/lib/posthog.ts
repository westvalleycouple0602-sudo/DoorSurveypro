import posthog from 'posthog-js';

// Initialize PostHog
export function initPostHog() {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    console.info('ℹ️ PostHog API key not provided - analytics disabled');
    return false;
  }

  if (!posthog.__loaded) {
    posthog.init(apiKey, {
      api_host: apiHost,
      capture_pageview: false, // We'll manually track page views for better control
      capture_pageleave: true,
      autocapture: false, // Disable autocapture for better performance
      session_recording: {
        maskAllInputs: true, // Privacy: mask all inputs
        maskTextSelector: '[data-private]', // Mask elements with data-private attribute
      },
      persistence: 'localStorage+cookie',
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log('PostHog loaded successfully');
        }
      },
    });
  }

  return true;
}

// Identify user (call after authentication)
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!posthog.__loaded) return;
  
  posthog.identify(userId, properties);
}

// Track page view
export function trackPageView(path: string, properties?: Record<string, any>) {
  if (!posthog.__loaded) return;
  
  posthog.capture('$pageview', {
    $current_url: window.location.href,
    path,
    ...properties,
  });
}

// Track custom event
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (!posthog.__loaded) return;
  
  posthog.capture(eventName, properties);
}

// Set user properties
export function setUserProperties(properties: Record<string, any>) {
  if (!posthog.__loaded) return;
  
  posthog.people.set(properties);
}

// Reset user on logout
export function resetUser() {
  if (!posthog.__loaded) return;
  
  posthog.reset();
}

// Export posthog instance for advanced usage
export { posthog };

// Event tracking helpers for common actions
export const analytics = {
  // Project events
  projectCreated: (projectId: string, name: string) => 
    trackEvent('project_created', { projectId, name }),
  
  projectViewed: (projectId: string) => 
    trackEvent('project_viewed', { projectId }),
  
  projectDeleted: (projectId: string) => 
    trackEvent('project_deleted', { projectId }),
  
  // Opening events
  openingCreated: (openingId: string, projectId: string) => 
    trackEvent('opening_created', { openingId, projectId }),
  
  openingViewed: (openingId: string) => 
    trackEvent('opening_viewed', { openingId }),
  
  // Scan events
  scanStarted: (openingId: string, scanType: 'ar' | 'lidar' | 'manual') => 
    trackEvent('scan_started', { openingId, scanType }),
  
  scanCompleted: (openingId: string, scanType: 'ar' | 'lidar' | 'manual', duration: number) => 
    trackEvent('scan_completed', { openingId, scanType, duration }),
  
  // Quote events
  quoteGenerated: (quoteId: string, projectId: string, amount: number) => 
    trackEvent('quote_generated', { quoteId, projectId, amount }),
  
  quoteViewed: (quoteId: string) => 
    trackEvent('quote_viewed', { quoteId }),
  
  quotePaid: (quoteId: string, amount: number) => 
    trackEvent('quote_paid', { quoteId, amount }),
  
  // Compliance events
  complianceCheckRun: (openingId: string, passed: boolean) => 
    trackEvent('compliance_check_run', { openingId, passed }),
  
  // Command palette usage
  commandPaletteOpened: () => 
    trackEvent('command_palette_opened'),
  
  commandExecuted: (commandId: string) => 
    trackEvent('command_executed', { commandId }),
  
  // Keyboard shortcut usage
  keyboardShortcutUsed: (shortcut: string, destination: string) => 
    trackEvent('keyboard_shortcut_used', { shortcut, destination }),
  
  // Feature usage
  featureUsed: (featureName: string, context?: Record<string, any>) => 
    trackEvent('feature_used', { featureName, ...context }),
};
