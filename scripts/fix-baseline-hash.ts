#!/usr/bin/env tsx
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function fixHash() {
  console.log('Updating hash to correct format...');
  await sql`UPDATE __drizzle_migrations SET hash = '0000_complete_longshot' WHERE id = 1`;
  console.log('✅ Hash updated!');
  
  const result = await sql`SELECT * FROM __drizzle_migrations`;
  console.log('Migrations table:', JSON.stringify(result, null, 2));
}

fixHash();
