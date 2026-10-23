import { randomUUID } from 'node:crypto';
import { ArchiveError, archivePath, requireManager, type Archive, type ArchiveInput, type ArchiveRepository,
  type Destination, type Scope, type StorageDestination } from './contracts';
import type { ArchiveSecrets } from './secrets';

const isArchived = (a: Archive): boolean => a.state === 'archived';
export const ARCHIVE_CHUNK_SIZE = 8 * 1024 * 1024;
export class CustomerArchiveService {
  constructor(private repo: ArchiveRepository, private secrets: ArchiveSecrets,
    private provider: (destination: Destination, store: ArchiveRepository) => StorageDestination,
    private authorize: (scope: Scope, input: ArchiveInput) => Promise<{ customerId: string }>) {}
  async create(scope: Scope, destinationId: string, input: ArchiveInput) {
    const { customerId } = await this.authorize(scope, input);
    return this.repo.locked(scope.organizationId, destinationId, async store => {
      const d = await this.connected(store, scope.organizationId, destinationId);
      const adapter = this.provider(d, store);
      return store.reserve({ ...input, id: randomUUID(), organizationId: scope.organizationId, destinationId,
        customerId, fileId: await adapter.generateId(), offset: 0, state: 'pending', attempts: 0 });
    });
  }
  async get(scope: Scope, id: string) {
    const a = await this.repo.archive(scope.organizationId, id);
    if (!a) throw new ArchiveError('archive-not-found', 404);
    await this.authorize(scope, a);
    return a;
  }
  private async connected(store: ArchiveRepository, org: string, id: string) {
    const d = await store.destination(org, id);
    if (!d) throw new ArchiveError('destination-not-found', 404);
    if (!d.active || !d.secret) throw new ArchiveError('provider-disconnected');
    return d;
  }
  private binding(a: Archive) { return `${a.organizationId}:${a.destinationId}:${a.id}:upload`; }
  private async verify(a: Archive, adapter: StorageDestination) {
    const actual = await adapter.inspect(a.fileId);
    if (actual.size !== a.size || actual.sha256 !== a.sha256) throw new ArchiveError('checksum-mismatch', 422);
    a.offset = a.size; a.state = 'archived'; a.verifiedAt = new Date().toISOString();
    delete a.uploadSecret; delete a.lastError;
  }
  async transfer(scope: Scope, id: string, offset: number, bytes: Buffer) {
    const initial = await this.get(scope, id); // No provider calls before access checks.
    const result = await this.repo.locked(scope.organizationId, initial.destinationId, async store => {
      const a = await store.archive(scope.organizationId, id);
      if (!a) throw new ArchiveError('archive-not-found', 404);
      const d = await this.connected(store, scope.organizationId, a.destinationId);
      if (isArchived(a)) return { archive: a };
      if (a.state === 'verification-failed') throw new ArchiveError('checksum-mismatch', 422);
      const adapter = this.provider(d, store);
      a.attempts++;
      try {
        // Check the stable ID first: resolves remote success followed by a lost DB commit.
        if (!a.uploadSecret) {
          try { await this.verify(a, adapter); }
          catch (e) { if (!(e instanceof ArchiveError) || e.code !== 'provider-file-unavailable') throw e; }
          if (!isArchived(a)) {
            const parent = await adapter.ensurePath(d.rootId, [d.id, ...archivePath(a)]);
            a.uploadSecret = this.secrets.seal(await adapter.start(a, parent), this.binding(a));
            a.offset = 0;
          }
        }
        if (!isArchived(a)) {
          const url = this.secrets.open(a.uploadSecret!, this.binding(a));
          const progress = await adapter.progress(url, a.size);
          if (progress === 'complete') await this.verify(a, adapter);
          else if (progress === 'expired') {
            delete a.uploadSecret; a.offset = 0;
            // Completion could have happened immediately before expiration.
            try { await this.verify(a, adapter); }
            catch (e) { if (!(e instanceof ArchiveError) || e.code !== 'provider-file-unavailable') throw e; }
          } else {
            if (!Number.isSafeInteger(progress) || progress < 0 || progress > a.size) throw new ArchiveError('invalid-provider-offset', 502);
            a.offset = progress;
            if (offset === a.offset && bytes.length) {
              if (bytes.length > ARCHIVE_CHUNK_SIZE || offset + bytes.length > a.size ||
                  (offset + bytes.length < a.size && bytes.length % (256 * 1024) !== 0))
                throw new ArchiveError('invalid-chunk', 400);
              a.state = 'uploading';
              const next = await adapter.upload(url, bytes, offset, a.size);
              if (next === 'complete') await this.verify(a, adapter);
              else {
                if (!Number.isSafeInteger(next) || next < offset || next > offset + bytes.length) throw new ArchiveError('invalid-provider-offset', 502);
                a.offset = next;
              }
            }
            // A stale/replayed chunk gets authoritative progress, never appended twice.
          }
        }
        if (!isArchived(a)) { a.state = 'uploading'; delete a.lastError; }
        await store.saveArchive(a);
        return { archive: a };
      } catch (error) {
        const code = error instanceof ArchiveError ? error.code : 'provider-retry';
        a.lastError = code;
        a.state = code === 'checksum-mismatch' ? 'verification-failed' : code === 'provider-disconnected' ? 'disconnected' : 'retryable';
        await store.saveArchive(a);
        // Commit checkpoints/errors even when a provider operation failed.
        return { error: error instanceof ArchiveError ? error : new ArchiveError('provider-retry', 503) };
      }
    });
    if (result.error) throw result.error;
    return result.archive!;
  }
  async retrieve(scope: Scope, id: string) {
    const a = await this.get(scope, id);
    if (!isArchived(a)) throw new ArchiveError('archive-not-verified');
    return this.repo.locked(scope.organizationId, a.destinationId, async store => {
      const d = await this.connected(store, scope.organizationId, a.destinationId);
      return this.provider(d, store).download(a.fileId);
    });
  }
  async disconnect(scope: Scope, id: string) {
    requireManager(scope);
    await this.repo.locked(scope.organizationId, id, async store => {
      const d = await store.destination(scope.organizationId, id);
      if (!d) throw new ArchiveError('destination-not-found', 404);
      d.active = false; d.secret = '';
      await store.saveDestination(d);
    });
  }
}
