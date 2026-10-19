#!/usr/bin/env tsx

/**
 * Baseline Migration Script
 * 
 * This script marks the baseline migration as applied WITHOUT running it.
 * Use this ONCE on existing databases that were created with db:push.
 * 
 * This allows future migrations to work properly without trying to
 * recreate existing tables.
 * 
 * Usage:
 *   tsx scripts/baseline-migration.ts
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function baselineMigration() {
  console.log('🔄 Baselining migration system for existing database...');
  
  try {
    const sql = neon(DATABASE_URL!);

    // Create drizzle migrations table if it doesn't exist
    console.log('📝 Creating __drizzle_migrations table...');
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    // Drizzle uses the migration filename (without .sql) as the hash
    const migrationHash = '0000_complete_longshot';

    // Check if baseline already marked
    const existing = await sql`
      SELECT * FROM __drizzle_migrations 
      WHERE hash = ${migrationHash}
    `;

    if (existing.length > 0) {
      console.log('✅ Baseline migration already marked as applied!');
      console.log('   No action needed.');
      process.exit(0);
    }

    // Mark baseline migration as applied
    console.log('📌 Marking baseline migration (0000_complete_longshot) as applied...');
    await sql`
      INSERT INTO __drizzle_migrations (hash, created_at)
      VALUES (${migrationHash}, ${Date.now()})
      ON CONFLICT DO NOTHING
    `;

    console.log('✅ Baseline migration marked successfully!');
    console.log('');
    console.log('🎉 Your database is now ready for future migrations.');
    console.log('   Run `tsx server/migrate.ts` to apply future migrations.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Baselining failed:', error);
    process.exit(1);
  }
}

baselineMigration();
