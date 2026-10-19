# Project scope schema restoration

Terry approved source-level schema compatibility repairs on October 19, 2026,
with the live database left untouched. This change restores eleven declarations
in `shared/schemas/projects.schema.ts`, re-exported by `shared/schema.ts`.
It does not add a parallel schema or new database design.

## Evidence and behavior

All eleven columns already appear in `migrations/0000_complete_longshot.sql`
and both committed migration snapshots. Their existing consumers are the
scope-of-work screen, project duplication/version snapshots in storage, and
scope sections of PDF exports. The missing declarations caused type errors and
caused Zod to silently strip these scope fields from create/update payloads.

An isolated before/after check against the previous PR head (`d92c5ae`) confirmed
that `{ scopePowerByOthers: 'yes', scopeItemsToRemain: ['Existing frame'],
scopeAdditionalDisclaimers: 'Power by others' }` parsed to `{}` before this fix
and retains all three values after it. This checks validation, not live storage.

| Fields | Historical SQL contract |
| --- | --- |
| Eight `scope…ByOthers` flags: power, demolition, patching, painting, asbestos abatement, structural work, fire alarm, access control | Nullable `text`, default `'no'` |
| `scopeItemsToRemain`, `scopeItemsToRemove` | Nullable `text[]`, no default |
| `scopeAdditionalDisclaimers` | Nullable `text`, no default |

The restored declarations preserve those names, types, defaults and nullability.
List validation accepts strings only, rather than silently coercing non-text
elements. Omitted fields remain omitted in partial updates; explicit null and
empty values remain supported. Ownership columns, IDs, foreign keys, account
bindings and existing records are unchanged.

## Required deployment preflight (not performed here)

Source migration history is not proof of the live database structure. Restoring
these columns adds them to generated project SELECTs, so deployment is blocked
until a database operator checks the actual target. Do not use `db:push` to
force the source schema onto a legacy database.

Run the following metadata-only query using the target environment's normal
authorized database tooling. Confirm the application schema is `public`, or
adjust that predicate to the actual configured schema. No row data is read.

```sql
WITH expected(column_name, expected_udt, expected_default) AS (
  VALUES
    ('scope_power_by_others', 'text', '''no''::text'),
    ('scope_demolition_by_others', 'text', '''no''::text'),
    ('scope_patching_by_others', 'text', '''no''::text'),
    ('scope_painting_by_others', 'text', '''no''::text'),
    ('scope_asbestos_abatement_by_others', 'text', '''no''::text'),
    ('scope_structural_work_by_others', 'text', '''no''::text'),
    ('scope_fire_alarm_by_others', 'text', '''no''::text'),
    ('scope_access_control_by_others', 'text', '''no''::text'),
    ('scope_items_to_remain', '_text', NULL),
    ('scope_items_to_remove', '_text', NULL),
    ('scope_additional_disclaimers', 'text', NULL)
)
SELECT e.column_name, e.expected_udt, e.expected_default,
       c.udt_name AS actual_udt, c.is_nullable, c.column_default,
       CASE
         WHEN c.column_name IS NULL THEN 'MISSING OR NOT VISIBLE'
         WHEN c.udt_name <> e.expected_udt OR c.is_nullable <> 'YES'
           THEN 'REVIEW TYPE / NULLABILITY'
         WHEN c.column_default IS DISTINCT FROM e.expected_default
           THEN 'REVIEW DEFAULT EXPRESSION'
         ELSE 'MATCH'
       END AS review_status
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = 'projects'
 AND c.column_name = e.column_name
ORDER BY e.column_name;
```

If all eleven contracts match, no migration is needed for this restoration.
If a column is missing or differs, stop and review metadata/permissions before
drafting a separately approved additive migration. Do not drop, rename, cast,
backfill, or replace existing columns/records automatically. No new migration
is registered or executed by this repair.

Before deployment, exercise create, read, partial update, duplicate/version and
PDF export on a disposable representative database. Include legacy nulls and
two-organization access denials. The isolated schema tests are not a substitute
for those database/route checks.

## Recovery

No database changes require rollback. Reverting this source commit restores
the previous behavior, including the known loss of scope fields in validation;
it does not remove stored values. Keep this PR as draft until remaining release
checks and target-database compatibility are verified.
