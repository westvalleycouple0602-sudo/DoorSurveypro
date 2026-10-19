import { MutationCache, QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// CSRF token management
let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken !== null) return csrfToken;
  const res = await fetch("/api/csrf-token", { credentials: "include" });
  await throwIfResNotOk(res);
  const data = await res.json();
  if (!data.csrfToken) throw new Error("Unable to obtain CSRF protection token");
  csrfToken = data.csrfToken;
  return csrfToken!;
}

// Both JSON calls and uploads/streams use this one cookie-based request path.
export function apiRequest(method: string, url: string, data?: unknown): Promise<Response>;
export function apiRequest(url: string, options?: RequestInit): Promise<Response>;
export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | RequestInit,
  data?: unknown,
): Promise<Response> {
  const jsonCall = typeof urlOrOptions === "string";
  const url = jsonCall ? urlOrOptions : methodOrUrl;
  const options: RequestInit = jsonCall
    ? { method: methodOrUrl, body: data !== undefined ? JSON.stringify(data) : undefined }
    : (urlOrOptions ?? {}) as RequestInit;
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (jsonCall && data !== undefined) headers.set("Content-Type", "application/json");
  const sameOriginApi = url.startsWith("/api/");
  if (sameOriginApi && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const token = await getCsrfToken();
    if (token) headers.set("x-csrf-token", token);
  }
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Only use string parts of the queryKey for the URL
    // Filter out objects which are used for cache segmentation only
    const urlParts = queryKey.filter((part): part is string => typeof part === "string");
    // returnNull is reserved for deliberately optional public identity checks.
    const res = unauthorizedBehavior === "returnNull"
      ? await fetch(urlParts.join("/"), { credentials: "include" })
      : await apiRequest(urlParts.join("/"));

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    // Skip if the individual mutation already handles its own error
    if (mutation.options.onError) return;
    const msg = error instanceof Error ? error.message : String(error);
    toast({
      title: "Something went wrong",
      description: msg || "Please try again.",
      variant: "destructive",
    });
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Smart caching: Keep data fresh for 5 minutes by default
      // This balances performance (fewer refetches) with data freshness
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cache data for 10 minutes before garbage collection
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: undefined,
  mutationCache,
});
