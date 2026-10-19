-- Baseline Migration Script
-- 
-- This SQL script marks the baseline migration as applied WITHOUT running it.
-- Use this ONCE on existing databases that were created with db:push.
--
-- This allows future migrations to work properly without trying to
-- recreate existing tables.
--
-- Usage:
--   psql $DATABASE_URL < scripts/baseline.sql
--   OR run via Neon dashboard SQL editor

-- Create drizzle migrations tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- Mark baseline migration (0000_complete_longshot) as applied
-- This tells Drizzle that the baseline is already in place
-- Drizzle uses the migration filename (without .sql) as the hash
INSERT INTO __drizzle_migrations (hash, created_at)
VALUES ('0000_complete_longshot', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT DO NOTHING;

-- Verify the baseline was marked
SELECT * FROM __drizzle_migrations;
