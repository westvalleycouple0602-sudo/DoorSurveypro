# Server repair deployment preflight

This source change declares five nullable fields used by existing workflows:

| Table | Column | Type / unit | Default |
| --- | --- | --- | --- |
| organizations | branding_onboarding_status | text | not_started |
| organizations | branding_onboarding_progress | jsonb | empty object |
| hardware_items | catalog_item_id | varchar | null |
| door_openings | clear_width | real, millimeters | null |
| door_openings | clear_height | real, millimeters | null |

The additive SQL proposal is `docs/migrations/2026-10-19-server-fields.sql`.
It is deliberately outside automatic migration registration and has NOT run.
These columns enter generated SELECTs: apply compatible additions before
deploying this source. Do not force a schema push onto the legacy database.

An operator must first inspect `information_schema.columns` for these five
columns, confirm the target schema is `public`, and compare type, nullability,
defaults and existing data semantics. In particular, an existing clearance
column must already represent millimeters. SQL type checks cannot prove units.
Review existing constraints and catalog-link semantics. The proposal stops on
incompatible existing types/nullability; it does not change existing defaults,
cast existing data, add a foreign key to unverified legacy links, or backfill.
Take the environment's normal backup before the separately approved migration.

On a disposable representative database, verify branding progress and tenant
ownership, procurement JSON arrays, HR import email failure/success, project
team membership, scan link/process/reprocess for both capture protocols, and
foreign-organization export/PO denials. The isolated tests do not establish
live schema compatibility, provider delivery, or scan-file durability.

Clear opening dimensions remain distinct from door leaf dimensions. Scan
depth in millimeters is converted to the existing frame-depth text in inches.
Swing classification stays in scan metrics; it is not written to an invented
opening field. Old null progress still starts at `not_started`.

Source rollback can leave these nullable additions in place. Do not drop them
automatically, because the new version may have stored user data there.
