# DoorSurvey Pro contributor instructions

Read `replit.md`, `docs/architecture-overview.md`, and the relevant topic in
`.agents/memory/` before changing a feature. Use `docs/PROJECT_ROADMAP.md` for
workstream boundaries and `docs/ENGINEERING_FOUNDATION.md` for check commands.

## Required boundaries

- Improve the existing application; do not replace it with a new scaffold.
- Preserve the original code/history/catalog backups and the private-repository requirement.
- Do not reset, replace, or force-push the existing database or Git history.
- Do not remove Stripe configuration or alter billing behavior incidentally.
- Preserve local account IDs, Clerk identity bindings and organization memberships.
- Both capture protocols coexist. Persistence fixes must not convert their states or API responses.
- Database session metadata and uploaded file durability are different requirements.
- Frontend navigation permissions do not replace server-side tenant/role checks.
- Never commit credentials, live database dumps, generated transfer packages or oversized reference assets.

## Verification

`npm run doctor` → `npm test` → `npm run check` → `npm run build`.
Use the lowest-cost relevant check during editing; run the coherent set once
before delivery. Report failures honestly. Never remove failing assertions,
weaken access controls, skip type errors, or call a mocked provider a live
integration just to make checks green.

`npm test` is deliberately isolated. Database and authenticated browser tests
require a separately provisioned test environment; never run them against the
existing application's data. Register new tests in `tests/test-manifest.json`.

Use the provided workflow, database, auth, secrets and integration skills for
their respective operations. The local tenant-boundary and media-session skills
add focused procedures; they do not replace platform safety instructions.
