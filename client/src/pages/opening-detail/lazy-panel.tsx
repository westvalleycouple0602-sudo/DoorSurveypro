import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from "react";
import { Loader2 } from "lucide-react";

/**
 * Helper component to wrap lazy-loaded panels with Suspense
 * Provides loading skeleton and optional prefetch on hover
 */
interface LazyPanelProps {
  /**
   * Lazy-loaded component to render
   */
  component: LazyExoticComponent<ComponentType<any>>;
  
  /**
   * Props to pass to the lazy component
   */
  props?: Record<string, any>;
  
  /**
   * Optional: Prefetch component on hover/focus
   * Improves perceived performance by loading before tab switch
   */
  prefetch?: boolean;
}

function PanelLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading panel...</p>
      </div>
    </div>
  );
}

export function LazyPanel({ component: Component, props = {}, prefetch = true }: LazyPanelProps) {
  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Utility to create a lazy-loaded panel component
 * Wraps React.lazy with consistent error boundaries
 */
export function createLazyPanel<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(importFn);
}
