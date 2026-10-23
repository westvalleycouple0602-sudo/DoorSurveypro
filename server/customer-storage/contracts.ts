/** Customer file archives are independent of app-owned object storage. Never store business records here. */
export type ProviderKind = 'google-drive';
export type ArchiveState = 'pending' | 'uploading' | 'retryable' | 'disconnected' | 'verification-failed' | 'archived';
export class ArchiveError extends Error {
  constructor(public code: string, public status = 409) { super(code); }
}
export interface Destination {
  id: string; organizationId: string; provider: ProviderKind;
  rootId: string; accountId?: string; secret: string; active: boolean;
}
export interface ArchiveInput {
  projectId: string; openingId: string; sessionId: string;
  filename: string; contentType: string; size: number; sha256: string;
}
export interface Archive extends ArchiveInput {
  id: string; organizationId: string; destinationId: string; customerId: string;
  fileId: string; state: ArchiveState; offset: number; uploadSecret?: string;
  attempts: number; lastError?: string; verifiedAt?: string;
}
export interface Scope { organizationId: string; userId: string; role: string }
export interface ArchiveRepository {
  // A distributed per-destination lock also serializes disconnects and folder creation.
  locked<T>(organizationId: string, destinationId: string, fn: (store: ArchiveRepository) => Promise<T>): Promise<T>;
  destination(org: string, id: string): Promise<Destination | undefined>;
  saveDestination(destination: Destination): Promise<void>;
  listDestinations(org: string): Promise<Destination[]>;
  archive(org: string, id: string): Promise<Archive | undefined>;
  reserve(archive: Archive): Promise<Archive>;
  saveArchive(archive: Archive): Promise<void>;
}
export interface StorageDestination {
  generateId(): Promise<string>;
  ensurePath(rootId: string, segments: string[]): Promise<string>;
  start(archive: Archive, parentId: string): Promise<string>;
  progress(url: string, size: number): Promise<number | 'complete' | 'expired'>;
  upload(url: string, bytes: Buffer, offset: number, total: number): Promise<number | 'complete'>;
  inspect(fileId: string): Promise<{ size: number; sha256: string }>;
  download(fileId: string): Promise<Response>;
}
export function requireManager(scope: Scope) {
  if (!['owner', 'admin'].includes(scope.role)) throw new ArchiveError('forbidden', 403);
}
export function archivePath(a: Archive): string[] {
  // Encode the full identifier, not a lossy replacement that can collide.
  return [a.organizationId, a.customerId, a.projectId, a.openingId, a.sessionId].map(encodeURIComponent);
}
export function publicArchive(a: Archive) {
  const { uploadSecret, ...safe } = a;
  return safe;
}
