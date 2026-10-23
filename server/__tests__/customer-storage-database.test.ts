import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import { PostgresArchiveRepository } from '../customer-storage/repository';
import type { Archive, Destination } from '../customer-storage/contracts';

neonConfig.webSocketConstructor = ws;
test('isolated PostgreSQL: same-looking IDs stay tenant scoped, unique reservations and distributed disconnect serialize', async () => {
  // Run only through npm run test:integration, never against the app database.
  assert.equal(process.env.NODE_ENV, 'test');
  const url = new URL(process.env.DATABASE_URL!);
  assert.match(url.pathname, /(?:^|[_/-])(test|testing|ci)(?:[_/-]|$)/i);
  const pool = new Pool({ connectionString: url.href });
  const repo = new PostgresArchiveRepository(pool);
  const prefix = `archive-test-${randomUUID()}`;
  const orgA = `${prefix}-a`, orgB = `${prefix}-b`;
  const d: Destination = { id: 'same-destination', organizationId: orgA, provider: 'google-drive', rootId: 'root', active: true, secret: 'fixture-not-a-credential' };
  const a: Archive = { id: 'same-archive', organizationId: orgA, destinationId: d.id, projectId: 'p', openingId: 'o', sessionId: 's', customerId: 'c', filename: 'scan.ply', contentType: 'application/octet-stream', size: 10, sha256: '0'.repeat(64), fileId: 'provider-file', state: 'pending', offset: 0, attempts: 0 };
  try {
    // Migration must have been reviewed and applied to this disposable database before running.
    await repo.saveDestination(d); await repo.saveDestination({ ...d, organizationId: orgB, rootId: 'other-root' });
    await repo.reserve(a); await repo.reserve({ ...a, organizationId: orgB, fileId: 'other-file' });
    assert.equal((await repo.archive(orgA, a.id))?.fileId, 'provider-file');
    assert.equal((await repo.archive(orgB, a.id))?.fileId, 'other-file');
    assert.equal(await repo.archive(`${prefix}-unknown`, a.id), undefined);
    const [one, two] = await Promise.all([repo.reserve({ ...a, id: randomUUID() }), repo.reserve({ ...a, id: randomUUID() })]);
    assert.equal(one.id, two.id); assert.equal(one.id, a.id);
    await repo.locked(orgA, d.id, async locked => {
      const saved = (await locked.destination(orgA, d.id))!;
      await locked.saveDestination({ ...saved, active: false, secret: '' });
    });
    const restarted = new PostgresArchiveRepository(pool);
    assert.equal((await restarted.destination(orgA, d.id))?.active, false);
    assert.equal((await restarted.destination(orgB, d.id))?.active, true);
    assert.equal((await restarted.archive(orgA, a.id))?.fileId, a.fileId);
  } finally {
    await pool.query('DELETE FROM customer_storage_archives WHERE organization_id = ANY($1::varchar[])', [[orgA, orgB]]);
    await pool.query('DELETE FROM customer_storage_destinations WHERE organization_id = ANY($1::varchar[])', [[orgA, orgB]]);
    await pool.end();
  }
});
