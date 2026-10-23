import type { Pool, PoolClient } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import { ArchiveError, type ArchiveRepository, type Archive, type Destination } from './contracts';

export function archiveIdentity(a: Archive): string {
  return createHash('sha256').update(JSON.stringify([
    a.customerId, a.projectId, a.openingId, a.sessionId, a.filename, a.sha256,
  ])).digest('hex');
}
export class PostgresArchiveRepository implements ArchiveRepository {
  constructor(private pool: Pool, private client?: PoolClient) {}
  private get sql() { return this.client ?? this.pool; }
  async locked<T>(org: string, id: string, fn: (store: ArchiveRepository) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '3s'");
      const result = await client.query('SELECT id FROM customer_storage_destinations WHERE organization_id=$1 AND id=$2 FOR UPDATE', [org, id]);
      if (!result.rowCount) throw new ArchiveError('destination-not-found', 404);
      const value = await fn(new PostgresArchiveRepository(this.pool, client));
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  async destination(org: string, id: string): Promise<Destination | undefined> {
    return (await this.sql.query('SELECT data FROM customer_storage_destinations WHERE organization_id=$1 AND id=$2', [org, id])).rows[0]?.data;
  }
  async listDestinations(org: string): Promise<Destination[]> {
    return (await this.sql.query('SELECT data FROM customer_storage_destinations WHERE organization_id=$1', [org])).rows.map(r => r.data);
  }
  async saveDestination(d: Destination) {
    await this.sql.query(`INSERT INTO customer_storage_destinations (organization_id,id,data) VALUES ($1,$2,$3)
      ON CONFLICT (organization_id,id) DO UPDATE SET data=EXCLUDED.data`, [d.organizationId, d.id, JSON.stringify(d)]);
  }
  async archive(org: string, id: string): Promise<Archive | undefined> {
    return (await this.sql.query('SELECT data FROM customer_storage_archives WHERE organization_id=$1 AND id=$2', [org, id])).rows[0]?.data;
  }
  async reserve(a: Archive): Promise<Archive> {
    const identity = archiveIdentity(a);
    await this.sql.query(`INSERT INTO customer_storage_archives (organization_id,id,destination_id,identity_key,data)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (organization_id,destination_id,identity_key) DO NOTHING`,
    [a.organizationId, a.id, a.destinationId, identity, JSON.stringify(a)]);
    const saved: Archive = (await this.sql.query(`SELECT data FROM customer_storage_archives
      WHERE organization_id=$1 AND destination_id=$2 AND identity_key=$3`, [a.organizationId, a.destinationId, identity])).rows[0].data;
    if (saved.size !== a.size || saved.contentType !== a.contentType) throw new ArchiveError('archive-metadata-conflict');
    return saved;
  }
  async saveArchive(a: Archive) {
    const result = await this.sql.query(`UPDATE customer_storage_archives SET data=$1
      WHERE organization_id=$2 AND id=$3 AND destination_id=$4`, [JSON.stringify(a), a.organizationId, a.id, a.destinationId]);
    if (!result.rowCount) throw new ArchiveError('archive-not-found', 404);
  }
}
