# Dual-scan persistence

Dual-scan API sessions are now database-backed, not process-local. All session
reads and updates are scoped to the authenticated organization. The API still
returns 403 for a known session belonging to a different organization and 404
for a missing session. Concurrent updates return 409 instead of overwriting a
newer capture or result.

## Database compatibility

The inspected database uses `varchar` identifiers for organizations, projects,
and openings. Migration `migrations/0002_dual_scan_sessions.sql` adds only
`dual_scan_sessions` and its organization index. It does not change legacy
tables, foreign keys, or uploaded files. The declaration is in its own domain
schema and is included in the Drizzle configuration without changing
`shared/schema.ts`.

Do not reset the database or force-push the full declared schema: existing
legacy tables differ from some source declarations. For an environment that
does not already have this table, apply only the reviewed additive SQL through
that environment's normal migration process. Do not replay the baseline
migrations against an existing unbaselined database.

## Recovery

Every successful create, capture, processing transition, analysis result, and
drawing generation is committed before its API response. Reload the existing
session ID with `GET /api/dual-scan/sessions/:sessionId`, then continue uploading
or processing with the same endpoints. Project/opening links, file paths,
formats, analysis, drawings, and timestamps survive application restarts.

An interrupted synchronous processing request can leave status `processing`.
The existing process endpoint accepts a retry when both captures are present;
there is no automatic background processing or startup-wide status reset.

Object-storage keys are kept unchanged and downloaded through the existing
storage service when processing. Legacy `/tmp/dual-scans` captures remain
readable when those files still exist. Local fallback uploads cannot survive
loss of the server's filesystem (such as a new deployment or host replacement).
An unavailable capture causes an explicit processing failure, not a fabricated
result. No existing objects are moved or deleted by this change.

## Focused verification

After the additive migration is available in the test database:

```sh
node --import tsx --test server/__tests__/dual-scan-persistence.test.ts
```

These tests write uniquely named fixtures and remove only their own rows and
files. A separate process resumes an unfinished capture using the database and
the original file, with no shared in-memory store. Other tests cover tenant
isolation, stale updates, interrupted-processing retries, retained results and
drawings, and both local and object-storage capture reads.
