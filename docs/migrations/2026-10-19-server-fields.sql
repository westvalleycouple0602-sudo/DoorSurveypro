-- REVIEW ONLY: not registered for automatic execution.
-- Inspect target metadata and take the environment's normal backup first.
-- Existing columns must match these types/defaults; stop on incompatibility.
-- No row data, identities, memberships, or existing types are changed.
BEGIN;
DO $$
DECLARE mismatch record;
BEGIN
  FOR mismatch IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN (VALUES
      ('organizations', 'branding_onboarding_status', 'text'),
      ('organizations', 'branding_onboarding_progress', 'jsonb'),
      ('hardware_items', 'catalog_item_id', 'varchar'),
      ('door_openings', 'clear_width', 'float4'),
      ('door_openings', 'clear_height', 'float4')
    ) AS expected(table_name, column_name, udt_name)
      ON c.table_name = expected.table_name AND c.column_name = expected.column_name
    WHERE c.table_schema = 'public'
      AND (c.udt_name <> expected.udt_name OR c.is_nullable <> 'YES')
  LOOP
    RAISE EXCEPTION 'Incompatible existing column %.%; review metadata before migration',
      mismatch.table_name, mismatch.column_name;
  END LOOP;
END $$;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS branding_onboarding_status text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS branding_onboarding_progress jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.hardware_items
  ADD COLUMN IF NOT EXISTS catalog_item_id varchar;
ALTER TABLE public.door_openings
  ADD COLUMN IF NOT EXISTS clear_width real,
  ADD COLUMN IF NOT EXISTS clear_height real;
COMMIT;
