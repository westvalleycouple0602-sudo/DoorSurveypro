import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Lazy Load Utilities
 * Code splitting and lazy loading for better performance
 */

/**
 * Generic loading fallback component
 */
export function PageLoader() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

/**
 * Wrapper for lazy loaded components with Suspense and error boundary
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <PageLoader />
) {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload a lazy component (useful for route prefetching)
 */
export function preloadComponent(importFunc: () => Promise<any>) {
  // Trigger the import to start loading
  importFunc();
}

/**
 * Route-specific lazy loaders
 * Examples showing how to use lazy loading for routes
 * Note: Import paths should match actual page file names
 */

// Example lazy loaders (update paths to match your actual pages):
// export const LazyProjectsPage = lazyLoad(() => import('@/pages/projects'));
// export const LazyDashboard = lazyLoad(() => import('@/pages/dashboard'));
// export const LazyAnalyticsDashboard = lazyLoad(() => import('@/pages/AnalyticsDashboard'));

/**
 * Prefetch critical routes on mount or hover
 */
export function usePrefetchRoutes() {
  const prefetchAll = () => {
    // Example: Prefetch analytics dashboard
    preloadComponent(() => import('@/pages/AnalyticsDashboard'));
  };

  return { prefetchAll };
}
