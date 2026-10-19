#!/usr/bin/env tsx

/**
 * Database Migration Runner
 * 
 * This script runs pending database migrations using Drizzle ORM.
 * It should be run before starting the application in production.
 * 
 * Usage:
 *   npm run db:migrate-run    # Run pending migrations
 *   tsx server/migrate.ts     # Direct execution
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigrations() {
  console.log('🔄 Starting database migrations...');
  
  try {
    // DATABASE_URL is guaranteed to be defined after the check above
    const sql = neon(DATABASE_URL!);
    const db = drizzle(sql);

    await migrate(db, { migrationsFolder: './migrations' });

    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
