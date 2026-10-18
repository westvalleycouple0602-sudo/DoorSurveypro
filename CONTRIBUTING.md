# Working on DoorSurvey Pro

## Start here

1. Read `AGENTS.md` and the architecture overview.
2. Use the existing repository. Create a short-lived feature branch from the
   agreed integration branch; do not merge the oversized original history into
   the clean upload branch.
3. Restore dependencies with `npm ci`. Do not regenerate the lockfile casually.
4. Use the existing `Start application` workflow (`npm run dev`) for preview.
   The component sandbox is separate; do not start duplicate app servers.
5. Run `npm run doctor`, `npm test`, `npm run check`, and `npm run build`.

## Testing is deliberately separated

- `npm test`: offline/isolated Node, Jest and calculation assertions.
- `npm run test:inventory`: makes unclassified or missing tests fail explicitly.
- `npm run test:integration`: guarded, database-writing fixtures; requires a
  distinct disposable database and explicit approval. See the engineering guide.
- `npm run test:e2e`: real browser flows; configure isolated identities/data first.
- Existing legacy service-integration tests remain in the repository and manifest.
  They are not silently counted as passing unit tests.

The required CI gates do not migrate databases, provision credentials, publish
the app, or fabricate authentication. CI only runs on GitHub after these source
files have actually been pushed. Local files are not proof of a remote CI run.

## Pull requests

Describe the user-visible change, organization/role boundaries, persistence and
file-storage effects, checks run, and remaining limitations. Keep migrations
reviewable and separate from unrelated UI changes.

Keep GitHub private. Do not commit `.env`, provider credentials, generated
archives, dependency folders, database dumps or the oversized original catalog.
Preserve separate full backups.
