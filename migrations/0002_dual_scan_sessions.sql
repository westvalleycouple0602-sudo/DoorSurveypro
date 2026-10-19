-- Additive only: preserve legacy tables and uploaded objects.
CREATE TABLE IF NOT EXISTS "dual_scan_sessions" (
  "id" varchar PRIMARY KEY,
  "organization_id" varchar NOT NULL,
  "project_id" varchar NOT NULL,
  "opening_id" varchar NOT NULL,
  "data" jsonb NOT NULL,
  "revision" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dual_scan_sessions_org_idx" ON "dual_scan_sessions" ("organization_id");
