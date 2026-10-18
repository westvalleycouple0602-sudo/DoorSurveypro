# Engineering foundation

## What is configured in source

- Existing app and sandbox workflows are retained rather than duplicated.
- `npm test` now has an explicit runner/isolation inventory.
- GitHub CI independently checks safe unit tests, full TypeScript, production
  build and high-severity runtime dependency findings. Required gates do not
  use `continue-on-error`.
- Contribution guidance, issue/PR templates, workstreams and focused local
  skill procedures are versioned with the application.

## Check commands

| Command | Meaning |
| --- | --- |
| `npm run doctor` | Structural/tooling checks only; no secrets read or provider connections |
| `npm test` | Isolated Node contracts, Jest server/UI units and pure calculation assertions |
| `npm run check` | Full existing application TypeScript check; failures remain visible |
| `npm run build` | Frontend and backend production compilation |
| `npm run verify` | Structural checks, unit tests, full type check and build in sequence |
| `npm run test:integration` | Guarded database-writing Node fixtures |
| `npm run test:e2e` | Existing real-browser suite; requires a dedicated environment |

Jest transpiles tests without duplicating the application type checker; the
full type check is a separate mandatory CI job. This is not a waiver of type
errors. Tests checking mock queue/cache implementations are not proof that
real Redis or worker failover works.

## Database and browser test safety

Default unit-test processes clear provider credentials and use deliberately
unreachable database/cache/event endpoints. No saved workspace variables change.
Provider requests must be explicitly mocked.

Database fixtures are excluded from default unit tests. They require:

1. A separately provisioned disposable PostgreSQL database, compatible with the
   application's driver, with reviewed test schema/fixtures.
2. `TEST_DATABASE_URL` supplied through secure configuration, not committed.
3. `INTEGRATION_TESTS_APPROVED=isolated` for the test process.
4. A database name containing a test/testing/ci segment and a connection
   different from the application's `DATABASE_URL`.

These guardrails reduce accidental misuse; a name is not proof of isolation.
The operator must verify the database is disposable. The command does not apply
schema changes automatically. Legacy Redis/API integration tests need additional
dedicated service fixtures and remain explicitly listed in the test manifest.

Browser tests need isolated Clerk test identities, organization fixtures and
external-service mocks/sandboxes. Do not revive retired auth endpoints or bypass
access controls to make an outdated browser test pass.

## Repository and GitHub access

The existing repository is the intended destination. CI/templates in this
workspace are prepared source, not a successful remote upload or project-board
creation. Verify authenticated access, private visibility, the intended branch,
and remote content before declaring setup complete.

Private repository access has been verified, and the six workstreams now have
real repository milestones. These are repository milestones, not a separately
created GitHub Projects board. See the verification status for remaining gates.

For Desktop transfer, clone the existing remote into a new folder and overlay
clean source files without replacing the clone's `.git`. Commit on a new branch.
Never merge the original oversized-file history or force-push main to fix a
history conflict.

## Skills and ongoing work

Use existing platform-provided skills for workflows, authentication, database
access, secrets, testing and publishing. New local procedures cover tenant
regression checks and media-session durability, where application changes need
more specialized checks. Product-specific facts stay in project documentation
and memory rather than being published as generic rules for unrelated projects.

See `PROJECT_ROADMAP.md` for workstreams and `AGENTS.md` for preservation rules.
See `FOUNDATION_STATUS.md` for the observed results and open verification debt.
