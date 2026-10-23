import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { ArchiveError, archivePath, type Archive, type ArchiveInput, type ArchiveRepository, type Destination, type StorageDestination } from '../customer-storage/contracts';
import { CustomerArchiveService } from '../customer-storage/service';
import { ArchiveSecrets } from '../customer-storage/secrets';
import { archiveIdentity, PostgresArchiveRepository } from '../customer-storage/repository';
import { GoogleDriveDestination, uploadUrl } from '../customer-storage/google-drive';
import { archiveRouter } from '../customer-storage/routes';
import { GoogleArchiveOAuth } from '../customer-storage/oauth';
import { transferArchive, type ArchiveQueueEntry } from '../../client/src/lib/customer-archive-queue';

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const owner = { organizationId: 'tenant-a', userId: 'local-user-not-clerk-subject', role: 'owner' };
const bytes = Buffer.from('original scan');
const input: ArchiveInput = { projectId: 'project-a', openingId: 'opening-a', sessionId: 'scan-a', filename: 'scan.ply', contentType: 'application/octet-stream', size: bytes.length, sha256: sha(bytes) };
const copy = <T>(v: T): T => structuredClone(v);
class MemoryRepo implements ArchiveRepository {
  destinations = new Map<string, Destination>(); archives = new Map<string, Archive>(); tail = Promise.resolve();
  async locked<T>(org: string, id: string, fn: (s: ArchiveRepository) => Promise<T>) {
    if (!await this.destination(org, id)) throw new ArchiveError('destination-not-found', 404);
    const previous = this.tail; let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await previous; try { return await fn(this); } finally { release(); }
  }
  async destination(org: string, id: string) { const d = this.destinations.get(`${org}:${id}`); return d && copy(d); }
  async saveDestination(d: Destination) { this.destinations.set(`${d.organizationId}:${d.id}`, copy(d)); }
  async listDestinations(org: string) { return [...this.destinations.values()].filter(d => d.organizationId === org).map(copy); }
  async archive(org: string, id: string) { const a = this.archives.get(`${org}:${id}`); return a && copy(a); }
  async reserve(a: Archive) {
    const found = [...this.archives.values()].find(v => v.organizationId === a.organizationId && v.destinationId === a.destinationId && archiveIdentity(v) === archiveIdentity(a));
    if (found && (found.size !== a.size || found.contentType !== a.contentType)) throw new ArchiveError('archive-metadata-conflict');
    if (found) return copy(found);
    await this.saveArchive(a); return copy(a);
  }
  async saveArchive(a: Archive) { this.archives.set(`${a.organizationId}:${a.id}`, copy(a)); }
}
class Provider implements StorageDestination {
  calls = 0; data = Buffer.alloc(0); starts = 0; lostAck = false; exists = false; expired = false; disconnected = false;
  async generateId() { this.calls++; return `file-${this.calls}`; }
  async ensurePath(_root: string, _parts: string[]) { this.calls++; return 'folder'; }
  async start() { this.calls++; this.starts++; this.expired = false; return 'https://www.googleapis.com/upload/drive/v3/files?upload_id=test'; }
  async progress() { this.calls++; if (this.disconnected) throw new ArchiveError('provider-disconnected'); return this.expired ? 'expired' as const : this.exists ? 'complete' as const : this.data.length; }
  async upload(_url: string, chunk: Buffer, offset: number) {
    this.calls++; assert.equal(offset, this.data.length); this.data = Buffer.concat([this.data, chunk]); this.exists = true;
    if (this.lostAck) { this.lostAck = false; throw new Error('connection lost after provider commit'); }
    return 'complete' as const;
  }
  async inspect() { this.calls++; if (!this.exists) throw new ArchiveError('provider-file-unavailable', 404); return { size: this.data.length, sha256: sha(this.data) }; }
  async download() { this.calls++; return new Response(this.data); }
}
async function fixture() {
  const repo = new MemoryRepo(), secrets = new ArchiveSecrets('ab'.repeat(32)), provider = new Provider();
  await repo.saveDestination({ id: 'destination', organizationId: owner.organizationId, provider: 'google-drive', rootId: 'root', active: true, secret: 'test-only' });
  const authorize = async (scope: typeof owner, a: ArchiveInput) => {
    if (scope.organizationId !== owner.organizationId || a.projectId !== input.projectId || a.openingId !== input.openingId || a.sessionId !== input.sessionId) throw new ArchiveError('project-not-found', 404);
    return { customerId: 'customer-a' };
  };
  const service = new CustomerArchiveService(repo, secrets, () => provider, authorize);
  return { repo, provider, secrets, service };
}
test('original bytes verified before archive completion; references and retrieval stay tenant scoped', async () => {
  const { service, provider } = await fixture();
  const a = await service.create(owner, 'destination', input);
  assert.equal(a.state, 'pending'); assert.equal(provider.starts, 0);
  assert.deepEqual(archivePath(a), ['tenant-a', 'customer-a', 'project-a', 'opening-a', 'scan-a']);
  const done = await service.transfer(owner, a.id, 0, bytes);
  assert.equal(done.state, 'archived'); assert.ok(done.verifiedAt); assert.equal(done.uploadSecret, undefined);
  assert.equal(await (await service.retrieve(owner, a.id)).text(), bytes.toString());
});
test('duplicate creation and repeated upload return one archive and one provider file', async () => {
  const { service, provider } = await fixture();
  const [a, b] = await Promise.all([service.create(owner, 'destination', input), service.create(owner, 'destination', input)]);
  assert.equal(a.id, b.id);
  await Promise.all([service.transfer(owner, a.id, 0, bytes), service.transfer(owner, b.id, 0, bytes)]);
  assert.equal(provider.starts, 1); assert.equal(provider.data.length, bytes.length);
});
test('lost final acknowledgement and new service process resume the same stable provider ID', async () => {
  const f = await fixture(); const a = await f.service.create(owner, 'destination', input);
  f.provider.lostAck = true;
  await assert.rejects(f.service.transfer(owner, a.id, 0, bytes), /provider-retry/);
  const pending = await f.service.get(owner, a.id);
  assert.equal(pending.state, 'retryable'); assert.ok(pending.uploadSecret); assert.ok(!pending.uploadSecret.includes('googleapis'));
  const restarted = new CustomerArchiveService(f.repo, f.secrets, () => f.provider, async () => ({ customerId: 'customer-a' }));
  assert.equal((await restarted.transfer(owner, a.id, 0, bytes)).state, 'archived');
  assert.equal(f.provider.starts, 1);
});
test('expired upload resets safely; stale client receives zero offset then retries', async () => {
  const { service, provider } = await fixture(); const a = await service.create(owner, 'destination', input);
  await service.transfer(owner, a.id, 0, Buffer.alloc(0)); provider.expired = true;
  const retry = await service.transfer(owner, a.id, 0, bytes);
  assert.equal(retry.state, 'uploading'); assert.equal(retry.offset, 0); assert.equal(retry.uploadSecret, undefined);
  assert.equal((await service.transfer(owner, a.id, 0, bytes)).state, 'archived'); assert.equal(provider.starts, 2);
});
test('checksum mismatch retains a failed record and refuses retrieval', async () => {
  const { service } = await fixture(); const a = await service.create(owner, 'destination', { ...input, sha256: '0'.repeat(64) });
  await assert.rejects(service.transfer(owner, a.id, 0, bytes), /checksum-mismatch/);
  assert.equal((await service.get(owner, a.id)).state, 'verification-failed');
  await assert.rejects(service.retrieve(owner, a.id), /archive-not-verified/);
});
test('local disconnect removes credentials, preserves references and customer files', async () => {
  const { service, repo, provider } = await fixture(); const a = await service.create(owner, 'destination', input);
  await service.transfer(owner, a.id, 0, bytes); const calls = provider.calls;
  await service.disconnect(owner, 'destination');
  assert.equal((await repo.destination(owner.organizationId, 'destination'))?.secret, '');
  assert.equal((await service.get(owner, a.id)).state, 'archived');
  await assert.rejects(service.retrieve(owner, a.id), /provider-disconnected/);
  assert.equal(provider.calls, calls); assert.equal(provider.exists, true);
});
test('provider revocation persists disconnected state without claiming completion', async () => {
  const { service, provider } = await fixture(); const a = await service.create(owner, 'destination', input);
  provider.disconnected = true;
  await assert.rejects(service.transfer(owner, a.id, 0, bytes), /provider-disconnected/);
  assert.equal((await service.get(owner, a.id)).state, 'disconnected');
});
test('known foreign IDs, forged project/opening/session and insufficient management roles cause no provider side effects', async () => {
  const { service, provider } = await fixture(); const a = await service.create(owner, 'destination', input); const calls = provider.calls;
  const stranger = { ...owner, organizationId: 'tenant-b' };
  for (const op of [() => service.get(stranger, a.id), () => service.transfer(stranger, a.id, 0, bytes),
    () => service.retrieve(stranger, a.id), () => service.disconnect(stranger, 'destination'),
    () => service.create(owner, 'destination', { ...input, projectId: 'foreign' }),
    () => service.create(owner, 'destination', { ...input, openingId: 'foreign' }),
    () => service.create(owner, 'destination', { ...input, sessionId: 'foreign' }),
    () => service.disconnect({ ...owner, role: 'viewer' }, 'destination')]) await assert.rejects(op());
  assert.equal(provider.calls, calls);
});
test('AEAD rejects swapped tenant credentials, corrupted ciphertext, plaintext and absent keys', () => {
  const secrets = new ArchiveSecrets('ab'.repeat(32)); const sealed = secrets.seal('refresh token', 'tenant-a:destination');
  assert.equal(secrets.open(sealed, 'tenant-a:destination'), 'refresh token');
  assert.throws(() => secrets.open(sealed, 'tenant-b:destination'));
  assert.throws(() => secrets.open('plaintext', 'tenant-a:destination'));
  assert.throws(() => secrets.open(sealed.slice(0, -4), 'tenant-a:destination'));
  assert.throws(() => new ArchiveSecrets(''));
});
test('Google adapter restricts bearer credential destinations and interprets resumed offsets', async () => {
  let calls = 0;
  const adapter = new GoogleDriveDestination(async () => 'test-token', async (url, init) => {
    calls++; assert.equal(new URL(String(url)).hostname, 'www.googleapis.com');
    assert.equal((init?.headers as any).Authorization, 'Bearer test-token'); assert.equal(init?.redirect, 'error');
    return new Response(null, { status: 308, headers: { range: 'bytes=0-262143' } });
  });
  const valid = 'https://www.googleapis.com/upload/drive/v3/files?upload_id=opaque';
  assert.equal(await adapter.progress(valid, 524288), 262144);
  for (const url of ['https://evil.invalid/?upload_id=x', 'http://www.googleapis.com/upload/drive/v3/files?upload_id=x', 'https://www.googleapis.com.evil.invalid/upload/drive/v3/files?upload_id=x']) assert.throws(() => uploadUrl(url));
  await assert.rejects(adapter.progress('https://evil.invalid', 100)); assert.equal(calls, 1);
});
test('Google remote checksum hashes actual bytes and provider 429/401/404 stay distinguishable', async () => {
  const adapter = new GoogleDriveDestination(async () => 'token', async () => new Response(bytes));
  assert.deepEqual(await adapter.inspect('file'), { size: bytes.length, sha256: sha(bytes) });
  for (const [status, code] of [[429, 'provider-retry'], [401, 'provider-disconnected'], [404, 'provider-file-unavailable']] as const) {
    const failed = new GoogleDriveDestination(async () => 'token', async () => new Response(null, { status }));
    await assert.rejects(failed.download('file'), new RegExp(code));
  }
});
test('database repository queries bind organization and destination; locks use composite ownership', async () => {
  const calls: { sql: string; args: any[] }[] = [];
  const client = { query: async (sql: string, args: any[] = []) => { calls.push({ sql, args }); return { rows: [], rowCount: 0 }; }, release() {} };
  const repo = new PostgresArchiveRepository({ ...client, connect: async () => client } as any);
  await repo.archive('tenant-b', 'known-foreign-id'); await repo.destination('tenant-b', 'destination');
  await assert.rejects(repo.locked('tenant-b', 'destination', async () => { throw new Error('must not execute'); }), /destination-not-found/);
  assert.ok(calls.filter(c => c.sql.includes('SELECT')).every(c => c.sql.includes('organization_id=$1') && c.args[0] === 'tenant-b'));
  assert.ok(calls.some(c => c.sql.includes('FOR UPDATE') && c.args[1] === 'destination'));
});

// Invoke the actual Express router without opening a socket (unit runner denies network).
function route(router: any, method: string, url: string, body?: any) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = { method, url, headers: {}, body, query: {} };
    const res: any = { locals: {}, statusCode: 200, set() { return this; }, status(n: number) { this.statusCode = n; return this; },
      json(value: any) { resolve({ status: this.statusCode, body: value }); }, end() { resolve({ status: this.statusCode, body: undefined }); } };
    router.handle(req, res, (e: unknown) => e ? reject(e) : resolve({ status: 404, body: undefined }));
  });
}
test('real archive routes deny unauthenticated/foreign access, reject spoofed tenant and redact secrets', async () => {
  const f = await fixture(); const a = await f.service.create(owner, 'destination', input); let scope: typeof owner | null = null;
  const router = archiveRouter({ ...f, oauth: {} as any, context: async () => scope });
  const calls = f.provider.calls;
  assert.equal((await route(router, 'GET', `/archives/${a.id}`)).status, 401);
  scope = { ...owner, organizationId: 'tenant-b' };
  assert.equal((await route(router, 'GET', `/archives/${a.id}`)).status, 404);
  assert.equal((await route(router, 'GET', `/archives/${a.id}/content`)).status, 404);
  scope = owner;
  assert.equal((await route(router, 'POST', '/destinations/destination/archives', { ...input, organizationId: 'tenant-b' })).status, 400);
  scope = { ...owner, role: 'viewer' };
  assert.equal((await route(router, 'DELETE', '/destinations/destination')).status, 403);
  assert.equal((await route(router, 'GET', '/destinations')).status, 403);
  scope = owner;
  const list = await route(router, 'GET', '/destinations'); assert.equal(list.status, 200); assert.equal(list.body[0].secret, undefined);
  assert.equal(f.provider.calls, calls);
});
test('OAuth state binds user and tenant, expires, is consumed once, and uses PKCE', async () => {
  const f = await fixture(); let row: any; let providerCalls = 0;
  const pool: any = { query: async (sql: string, args: any[] = []) => {
    if (sql.startsWith('INSERT')) row = { hash: args[0], org: args[1], user: args[2], secret: args[3], live: true };
    if (sql.includes('RETURNING')) {
      if (row?.live && row.hash === args[0] && row.org === args[1] && row.user === args[2]) { row.live = false; return { rows: [{ secret: row.secret }] }; }
    }
    return { rows: [] };
  } };
  const oauth = new GoogleArchiveOAuth(pool, f.repo, f.secrets, { clientId: 'test', clientSecret: 'test', redirectUri: 'https://app.example/api/customer-storage/google-drive/callback' }, async () => { providerCalls++; return new Response(null, { status: 400 }); });
  const url = new URL(await oauth.begin(owner)); const state = url.searchParams.get('state')!;
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256'); assert.ok(url.searchParams.get('code_challenge'));
  assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/drive.file');
  await assert.rejects(oauth.callback({ ...owner, userId: 'other-user' }, state, 'code'), /invalid-oauth-state/);
  await assert.rejects(oauth.callback({ ...owner, organizationId: 'tenant-b' }, state, 'code'), /invalid-oauth-state/);
  assert.equal(providerCalls, 0);
  await assert.rejects(oauth.callback(owner, state, 'code'), /provider-disconnected/);
  await assert.rejects(oauth.callback(owner, state, 'code'), /invalid-oauth-state/); assert.equal(providerCalls, 1);
  await assert.rejects(oauth.begin({ ...owner, role: 'viewer' }), /forbidden/);
  assert.throws(() => new GoogleArchiveOAuth(pool, f.repo, f.secrets, { clientId: '', clientSecret: '', redirectUri: 'http://evil.invalid' }));
});
test('browser queue keeps original on outage; resumes stable archive and only releases after verified completion', async () => {
  const f = await fixture(); const a = await f.service.create(owner, 'destination', input);
  const entry: ArchiveQueueEntry = { id: 'browser-id', ...owner, destinationId: 'destination', input, file: new Blob([bytes]), state: 'pending' };
  let saves = 0;
  await assert.rejects(transferArchive(entry, owner, async () => { saves++; }, async () => new Response(null, { status: 503 })));
  assert.equal(entry.state, 'retryable'); assert.ok(entry.file); assert.equal(saves, 1);
  const done = { ...a, state: 'archived', offset: bytes.length, verifiedAt: new Date().toISOString() };
  await transferArchive(entry, owner, async () => { saves++; }, async (_url, options) => new Response(JSON.stringify(options.method === 'POST' ? a : done)));
  assert.equal(entry.archiveId, a.id); assert.equal(entry.state, 'archived'); assert.equal(entry.file, undefined);
});
test('browser queue blocks account switches before networking and retains originals on checksum rejection', async () => {
  const f = await fixture(); const a = await f.service.create(owner, 'destination', input);
  const entry: ArchiveQueueEntry = { id: 'browser-id', ...owner, destinationId: 'destination', input, file: new Blob([bytes]), state: 'pending' };
  let calls = 0;
  const transport = async () => { calls++; return new Response(JSON.stringify({ ...a, state: 'verification-failed' })); };
  await assert.rejects(transferArchive(entry, { ...owner, userId: 'other-user' }, async () => {}, transport)); assert.equal(calls, 0);
  await assert.rejects(transferArchive(entry, owner, async () => {}, transport), /checksum/); assert.ok(entry.file);
});

test('production authorizer derives customer and rejects mismatched project/opening/session relationships', async () => {
  const { archiveAuthorizer } = await import('../customer-storage/access');
  let openingProject = 'project-a', sessionOpening = 'opening-a';
  const authorize = archiveAuthorizer({
    getProject: async (id: string, org: string) => org === 'tenant-a' && id === 'project-a' ? { id, customerId: 'actual-customer' } as any : undefined,
    getOpening: async (id: string) => ({ id, projectId: openingProject }) as any,
    getDualScanSession: async (id: string, org: string) => ({ id, organizationId: org, projectId: 'project-a', openingId: sessionOpening }) as any,
  });
  assert.deepEqual(await authorize(owner, input), { customerId: 'actual-customer' });
  await assert.rejects(authorize({ ...owner, organizationId: 'tenant-b' }, input), /project-not-found/);
  openingProject = 'other-project'; await assert.rejects(authorize(owner, input), /opening-not-found/);
  openingProject = 'project-a'; sessionOpening = 'other-opening'; await assert.rejects(authorize(owner, input), /session-not-found/);
});
test('OAuth query credentials are omitted from both success and failure audit paths', async () => {
  const { archiveSafeAuditPath } = await import('../customer-storage/audit-path');
  assert.equal(archiveSafeAuditPath('/api/customer-storage/google-drive/callback?code=secret&state=secret'), '/api/customer-storage/google-drive/callback');
  assert.equal(archiveSafeAuditPath('/api/projects?status=open'), '/api/projects?status=open');
});

test('partial chunk acknowledgement loss resumes at provider offset and stale chunks do not append twice', async () => {
  const f = await fixture(); const original = Buffer.alloc(512 * 1024 + 10, 37);
  const a = await f.service.create(owner, 'destination', { ...input, size: original.length, sha256: sha(original) });
  let lose = true;
  f.provider.upload = async (_url, chunk, offset) => {
    f.provider.calls++; assert.equal(offset, f.provider.data.length);
    f.provider.data = Buffer.concat([f.provider.data, chunk]);
    if (f.provider.data.length === original.length) { f.provider.exists = true; return 'complete'; }
    if (lose) { lose = false; throw new Error('lost partial acknowledgement'); }
    return f.provider.data.length as any;
  };
  const first = original.subarray(0, 256 * 1024);
  await assert.rejects(f.service.transfer(owner, a.id, 0, first), /provider-retry/);
  const stale = await f.service.transfer(owner, a.id, 0, first);
  assert.equal(stale.offset, first.length); assert.equal(f.provider.data.length, first.length);
  const done = await f.service.transfer(owner, a.id, first.length, original.subarray(first.length));
  assert.equal(done.state, 'archived'); assert.equal(f.provider.starts, 1); assert.deepEqual(f.provider.data, original);
});
test('invalid nonfinal chunks and reservation metadata conflicts fail without uploading bytes', async () => {
  const f = await fixture(); const a = await f.service.create(owner, 'destination', { ...input, size: 1024 * 1024 });
  await assert.rejects(f.service.transfer(owner, a.id, 0, Buffer.alloc(1)), /invalid-chunk/);
  assert.equal(f.provider.data.length, 0);
  await assert.rejects(f.service.create(owner, 'destination', { ...input, size: 1024 * 1024, contentType: 'image/png' }), /archive-metadata-conflict/);
});
