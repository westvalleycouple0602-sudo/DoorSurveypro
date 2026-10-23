import { openDB } from 'idb';
import type { ArchiveInput, Archive } from '../../../server/customer-storage/contracts';

const CHUNK = 8 * 1024 * 1024;
export interface ArchiveQueueEntry {
  id: string; organizationId: string; userId: string; destinationId: string;
  input: ArchiveInput; file?: Blob; archiveId?: string;
  state: 'pending' | 'retryable' | 'archived'; lastError?: string;
}
export type ArchiveTransport = (url: string, options: RequestInit) => Promise<Response>;
const defaultTransport: ArchiveTransport = async (url, options) => {
  const { apiRequest } = await import('./queryClient');
  return apiRequest(url, options); // Existing cookie authentication and CSRF handling.
};

/** The caller supplies the current local-user/organization scope, never a provider subject. */
export async function transferArchive(entry: ArchiveQueueEntry, scope: { organizationId: string; userId: string },
  save: (entry: ArchiveQueueEntry) => Promise<void>, transport: ArchiveTransport = defaultTransport) {
  if (entry.organizationId !== scope.organizationId || entry.userId !== scope.userId) throw new Error('archive-queue-scope-mismatch');
  if (entry.state === 'archived') return;
  if (!entry.file) throw new Error('archive-original-unavailable');
  const request = async (path: string, options: RequestInit): Promise<Archive> => {
    const response = await transport(`/api/customer-storage${path}`, options);
    if (!response.ok) throw new Error(`archive-transfer-${response.status}`);
    const body: Archive = await response.json();
    if (body.organizationId !== entry.organizationId || body.destinationId !== entry.destinationId ||
      body.sha256 !== entry.input.sha256 || body.size !== entry.input.size ||
      (entry.archiveId && body.id !== entry.archiveId)) throw new Error('archive-response-mismatch');
    return body;
  };
  try {
    let archive = entry.archiveId
      ? await request(`/archives/${encodeURIComponent(entry.archiveId)}`, { method: 'GET' })
      : await request(`/destinations/${encodeURIComponent(entry.destinationId)}/archives`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry.input) });
    entry.archiveId = archive.id;
    await save(entry); // Keep stable server identity across page reloads.
    let stalls = 0;
    while (archive.state !== 'archived') {
      if (archive.state === 'verification-failed') throw new Error('archive-checksum-mismatch');
      const offset = archive.offset;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > entry.file.size) throw new Error('archive-invalid-offset');
      const next = await request(`/archives/${encodeURIComponent(archive.id)}/content?offset=${offset}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: entry.file.slice(offset, offset + CHUNK) });
      stalls = next.offset <= archive.offset ? stalls + 1 : 0;
      archive = next;
      if (stalls > 2) throw new Error('archive-no-progress');
    }
    if (!archive.verifiedAt) throw new Error('archive-not-verified');
    entry.state = 'archived'; delete entry.lastError; delete entry.file;
    await save(entry); // Only a verified customer archive releases the browser original.
  } catch (error) {
    entry.state = 'retryable'; entry.lastError = error instanceof Error ? error.message : 'archive-transfer-failed';
    await save(entry);
    throw error; // Reconnect/manual or next online attempt resumes the same archive.
  }
}

/** Separate from measurement sync: success there must not delete original media here. */
export class CustomerArchiveQueue {
  private database = openDB('DoorSurveyCustomerArchives', 1, { upgrade(db) {
    db.createObjectStore('archives', { keyPath: 'id' });
  } });
  async add(scope: { organizationId: string; userId: string }, destinationId: string,
    input: Omit<ArchiveInput, 'sha256' | 'size'>, file: Blob) {
    if (!file.size || file.size > 200 * 1024 * 1024) throw new Error('archive-file-size-limit');
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const entry: ArchiveQueueEntry = { ...scope, id: crypto.randomUUID(), destinationId, input: { ...input, sha256, size: file.size }, file, state: 'pending' };
    await (await this.database).put('archives', entry);
    return entry.id; // QuotaExceededError remains visible: never claim bytes are queued if storage failed.
  }
  async sync(scope: { organizationId: string; userId: string }, transport = defaultTransport) {
    const db = await this.database;
    const entries: ArchiveQueueEntry[] = await db.getAll('archives');
    const result = { archived: 0, failed: 0 };
    for (const entry of entries.filter(e => e.organizationId === scope.organizationId && e.userId === scope.userId && e.state !== 'archived')) {
      try {
        await transferArchive(entry, scope, async e => { await db.put('archives', e); }, transport);
        result.archived++;
      } catch { result.failed++; }
    }
    return result;
  }
}
