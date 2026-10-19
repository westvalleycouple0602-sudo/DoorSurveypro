/**
 * Feedback Trigger Hook
 * 
 * Manages contextual feedback prompts based on user actions
 * and time-based triggers
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";

export interface FeedbackTriggerConfig {
  // Trigger after specific actions
  afterActions?: string[];
  
  // Trigger after time on page (milliseconds)
  afterTimeOnPage?: number;
  
  // Trigger after number of page views
  afterPageViews?: number;
  
  // Trigger on specific routes
  onRoutes?: string[];
  
  // Minimum time between triggers (milliseconds)
  minTimeBetweenTriggers?: number;
  
  // Storage key for tracking
  storageKey?: string;
}

const DEFAULT_CONFIG: FeedbackTriggerConfig = {
  afterTimeOnPage: 5 * 60 * 1000, // 5 minutes
  minTimeBetweenTriggers: 7 * 24 * 60 * 60 * 1000, // 7 days
  storageKey: "doorsurvey_feedback_trigger",
};

export interface FeedbackTriggerState {
  shouldShow: boolean;
  triggerType: "action" | "time" | "pageviews" | "route" | null;
  context?: Record<string, any>;
}

export function useFeedbackTrigger(config: FeedbackTriggerConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [location] = useLocation();
  const [state, setState] = useState<FeedbackTriggerState>({
    shouldShow: false,
    triggerType: null,
  });

  // Check if enough time has passed since last trigger
  const canShowFeedback = useCallback(() => {
    const storageKey = mergedConfig.storageKey || "doorsurvey_feedback_trigger";
    const lastShown = localStorage.getItem(`${storageKey}_last_shown`);
    
    if (!lastShown) return true;
    
    const timeSince = Date.now() - parseInt(lastShown, 10);
    return timeSince >= (mergedConfig.minTimeBetweenTriggers || 0);
  }, [mergedConfig.storageKey, mergedConfig.minTimeBetweenTriggers]);

  // Mark feedback as shown
  const markAsShown = useCallback(() => {
    const storageKey = mergedConfig.storageKey || "doorsurvey_feedback_trigger";
    localStorage.setItem(`${storageKey}_last_shown`, Date.now().toString());
  }, [mergedConfig.storageKey]);

  // Dismiss feedback
  const dismiss = useCallback(() => {
    setState({ shouldShow: false, triggerType: null });
    markAsShown();
  }, [markAsShown]);

  // Trigger after action
  const triggerAfterAction = useCallback((actionName: string, context?: Record<string, any>) => {
    if (!mergedConfig.afterActions?.includes(actionName)) return;
    if (!canShowFeedback()) return;

    setState({
      shouldShow: true,
      triggerType: "action",
      context: { action: actionName, ...context },
    });
  }, [mergedConfig.afterActions, canShowFeedback]);

  // Time-based trigger
  useEffect(() => {
    if (!mergedConfig.afterTimeOnPage) return;
    if (!canShowFeedback()) return;

    const timer = setTimeout(() => {
      setState({
        shouldShow: true,
        triggerType: "time",
        context: { timeOnPage: mergedConfig.afterTimeOnPage },
      });
    }, mergedConfig.afterTimeOnPage);

    return () => clearTimeout(timer);
  }, [mergedConfig.afterTimeOnPage, canShowFeedback]);

  // Route-based trigger
  useEffect(() => {
    if (!mergedConfig.onRoutes?.length) return;
    if (!canShowFeedback()) return;

    const shouldTriggerOnRoute = mergedConfig.onRoutes.some(route => 
      location.startsWith(route)
    );

    if (shouldTriggerOnRoute) {
      setState({
        shouldShow: true,
        triggerType: "route",
        context: { route: location },
      });
    }
  }, [location, mergedConfig.onRoutes, canShowFeedback]);

  // Page views trigger
  useEffect(() => {
    if (!mergedConfig.afterPageViews) return;
    if (!canShowFeedback()) return;

    const storageKey = mergedConfig.storageKey || "doorsurvey_feedback_trigger";
    const pageViewsKey = `${storageKey}_page_views`;
    const currentViews = parseInt(localStorage.getItem(pageViewsKey) || "0", 10);
    const newViews = currentViews + 1;

    localStorage.setItem(pageViewsKey, newViews.toString());

    if (newViews >= mergedConfig.afterPageViews) {
      setState({
        shouldShow: true,
        triggerType: "pageviews",
        context: { pageViews: newViews },
      });
      localStorage.setItem(pageViewsKey, "0"); // Reset counter
    }
  }, [location, mergedConfig.afterPageViews, mergedConfig.storageKey, canShowFeedback]);

  return {
    ...state,
    dismiss,
    triggerAfterAction,
    markAsShown,
  };
}
