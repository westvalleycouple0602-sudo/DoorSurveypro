/**
 * Performance Optimization Utilities for React
 * 
 * This module provides utilities for optimizing React component rendering
 * and detecting performance issues.
 */

import { useRef, useEffect, useCallback, useMemo, useState } from "react";

/**
 * Hook to detect slow component renders in development
 * Logs a warning if a component takes longer than the threshold to render
 */
export function useRenderPerformance(componentName: string, threshold = 16) {
  const renderStartTime = useRef(performance.now());

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const renderTime = performance.now() - renderStartTime.current;
      if (renderTime > threshold) {
        console.warn(
          `[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render (threshold: ${threshold}ms)`
        );
      }
    }
    renderStartTime.current = performance.now();
  });
}

/**
 * Hook to detect unnecessary re-renders in development
 * Logs when a component re-renders and shows which props changed
 */
export function useWhyDidYouRender(componentName: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (previousProps.current && process.env.NODE_ENV === "development") {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(`[Re-render] ${componentName}`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * Debounce function for expensive operations
 * Returns a memoized debounced function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Throttle function for high-frequency events
 * Returns a memoized throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay]
  );
}

/**
 * Hook to measure the time between two points
 * Useful for measuring user interaction latency
 */
export function usePerformanceMark(markName: string) {
  const start = useCallback(() => {
    performance.mark(`${markName}-start`);
  }, [markName]);

  const end = useCallback(() => {
    performance.mark(`${markName}-end`);
    performance.measure(markName, `${markName}-start`, `${markName}-end`);
    
    const measure = performance.getEntriesByName(markName, "measure")[0];
    if (measure && process.env.NODE_ENV === "development") {
      console.log(`[Performance] ${markName}: ${measure.duration.toFixed(2)}ms`);
    }
    
    // Clean up marks and measures
    performance.clearMarks(`${markName}-start`);
    performance.clearMarks(`${markName}-end`);
    performance.clearMeasures(markName);
    
    return measure?.duration || 0;
  }, [markName]);

  return { start, end };
}

/**
 * Hook to detect and warn about expensive re-renders
 * Tracks render count and warns if component renders too frequently
 */
export function useRenderCount(componentName: string, threshold = 10) {
  const renderCount = useRef(0);
  const resetTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    renderCount.current += 1;

    // Reset counter after 1 second of no renders
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    resetTimer.current = setTimeout(() => {
      if (renderCount.current > threshold && process.env.NODE_ENV === "development") {
        console.warn(
          `[Performance] ${componentName} rendered ${renderCount.current} times in 1 second (threshold: ${threshold})`
        );
      }
      renderCount.current = 0;
    }, 1000);

    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  });
}

/**
 * Hook for memoizing expensive computations
 * Similar to useMemo but with performance logging
 */
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  label?: string
): T {
  return useMemo(() => {
    const start = performance.now();
    const result = factory();
    const duration = performance.now() - start;

    if (duration > 16 && process.env.NODE_ENV === "development") {
      console.warn(
        `[Performance] Expensive computation${label ? ` (${label})` : ""}: ${duration.toFixed(2)}ms`
      );
    }

    return result;
  }, deps);
}

/**
 * Virtual scrolling parameters calculator
 * Calculate visible items based on container size and scroll position
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan = 3
) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return {
    startIndex,
    endIndex,
    visibleItems: endIndex - startIndex + 1,
  };
}

/**
 * Image lazy loading utility
 * Returns whether an element is in viewport
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Hook to prefetch data on hover (for better perceived performance)
 */
export function usePrefetchOnHover<T>(
  prefetchFn: () => Promise<T>,
  delay = 100
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const onMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      prefetchFn().catch((error) => {
        console.error("[Prefetch] Failed to prefetch data:", error);
      });
    }, delay);
  }, [prefetchFn, delay]);

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { onMouseEnter, onMouseLeave };
}
