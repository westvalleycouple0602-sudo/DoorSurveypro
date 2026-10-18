type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void | Promise<unknown>;
    };
  }
}

/** Replit injects the tracker on published apps with analytics enabled. */
export function trackProjectEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;
  try {
    // Handle both synchronous errors and a rejected tracker request.
    const result = window.umami?.track(name, data);
    if (result) void Promise.resolve(result).catch(() => {});
  } catch {
    // Analytics must never interrupt an interaction or a successful save.
  }
}
