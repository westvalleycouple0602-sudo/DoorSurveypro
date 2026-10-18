# Foundation verification status

The development foundation is configured; this does **not** certify all
application functions or make the app ready to publish.

## Observed checks

| Check | Result |
| --- | --- |
| Structural tooling check | Passed |
| Explicit test inventory | 36 files classified by runner and isolation |
| Node contracts and isolation checks | 15 passed |
| Jest units | 298 passed; 18 failed across four existing UI suites |
| Legacy landed-cost calculation assertions | 18 failures; fixture expects an older result contract |
| Full TypeScript check | 345 errors: 257 server and 88 client |
| Production compilation | Passed; bundle-size warnings remain |
| Database-writing fixtures | Intentionally not run against the application database; missing isolated configuration is blocked |
| Authenticated browser suite | Not run; requires dedicated identities/data and service setup |

The test command runs each safe suite even when another fails, then returns a
nonzero aggregate status. The existing application type errors are not suppressed
and failing unit assertions are not disabled.

The runner setup was corrected to separate Jest, Node and Playwright; ignore
workspace dependency caches during Jest discovery; use the proper Playwright
exports; prevent live unit-test network connections; and fix cursor/unique-ID
bugs in test-only Redis/queue models. No production application behavior, billing,
identity bindings, database schema or stored customer data changed.

## Prioritized repair work

1. Reconcile current server route/storage types with the actual schema and
   existing APIs. Do not apply schema declarations blindly to the legacy database.
2. Fix client API-response handling and the largest remaining client type-error
   clusters using the current API contracts.
3. Resolve the four UI-suite failures: tooltip/duplicate-label queries, shared
   card/loading selectors and trend display expectations. Distinguish stale test
   assumptions from real UI defects before changing production behavior.
4. Reconcile the older landed-cost assertions with the current calculator and
   its callers; preserve pricing behavior until the expected contract is verified.
5. Provision isolated integration fixtures and validate a full survey-to-quote
   path, then organization/role and provider-specific paths.

## GitHub

The existing repository was confirmed private with push permission. Six real
milestones were created for the workstreams. Source upload and CI execution must
be verified separately; access permission alone is not proof that files were
published or checks passed.
