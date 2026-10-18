#!/usr/bin/env tsx
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function check() {
  const result = await sql`SELECT * FROM __drizzle_migrations`;
  console.log('Migrations table:', JSON.stringify(result, null, 2));
}

check();
