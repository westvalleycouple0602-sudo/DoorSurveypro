// frontend-components/apiClient.ts
// Centralized fetch with JWT + Tenant header support
export function apiFetch(path: string, opts: RequestInit = {}, token?: string, tenantId?: string) {
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (tenantId) headers.set("X-Tenant-Id", tenantId);
  return fetch(path, { ...opts, headers });
}
