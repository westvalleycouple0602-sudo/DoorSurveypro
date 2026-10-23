/** OAuth codes/state and upload capabilities must not enter application audit logs. */
export function archiveSafeAuditPath(originalUrl: string): string {
  return originalUrl.startsWith('/api/customer-storage/') ? originalUrl.split('?')[0] : originalUrl;
}
