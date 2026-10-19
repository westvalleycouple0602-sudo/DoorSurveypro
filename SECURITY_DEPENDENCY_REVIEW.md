# Dependency security review

Reviewed October 9, 2026. No force upgrade or stack replacement was used.

## Audit results

| Scope | Before | After |
| --- | ---: | ---: |
| Root npm dependency tree | 126 findings: 64 high, 58 moderate, 4 low | 46 findings: 7 high, 39 moderate, 0 low |
| Root production tree (`npm audit --omit=dev`) | Not directly comparable: test and type-only packages were then classified as production dependencies | 15 findings: 4 high, 11 moderate, 0 low |

The full-tree reduction is 80 findings, including 57 fewer high findings. There are no critical findings in the final audit. Production totals reflect both security updates and moving test/build-only packages out of `dependencies`.

## Changes made

- Ran `npm audit fix` without `--force`, then applied targeted updates. Examples include Vite 6.4.4, GraphQL Yoga 5.24.4, Sentry 10.76.2, `csv-parse` 7.0.3, and Sharp 0.35.5. Vite's installed plugin peer ranges include Vite 6; the build passed. The CSV synchronous parser and Sharp's native encode/resize path also passed focused runtime smoke tests.
- Updated other compatible packages including `@google-cloud/storage` 7.22.0, `@graphql-tools/schema` 10.1.3, Ajv 8.20.0, Axios 1.20.0, body-parser 2.3.0, compression 1.8.2, express-rate-limit 8.7.1, Jimp 1.6.1, Multer 2.4.0, PostCSS 8.5.29, Resend 6.32.1, UUID 13.0.2, and ws 8.22.0.
- Removed unused direct dependencies `adm-zip`, `tw-animate-css`, and `i18next-http-backend` after confirming there were no source imports. The latter had a low-severity SSRF advisory.
- Moved test-only packages, test helpers, and type packages to `devDependencies`, reducing the production install surface.
- Preserved the existing Clerk pins (`@clerk/express` 2.1.76, `@clerk/react` 6.17.6, `@clerk/shared` 4.39.0, `@clerk/themes` 2.4.57) and existing `qs`, `proxy-addr`, `handlebars`, and `fast-xml-parser` overrides.
- Added focused overrides for PostCSS 8.5.29 and `csurf`'s nested `cookie` package 0.7.2. The latter keeps the current CSRF middleware API; `GET /api/csrf-token` returned HTTP 200 after installation.

## Findings intentionally deferred

### Reachable production high severity

- **Drizzle ORM** (`drizzle-orm` 0.39.x): npm reports SQL injection through improperly escaped SQL identifiers (GHSA-gpj5-g38j-94v9). It is used broadly by server storage and route code, including `server/storage.ts` and `shared/schema.ts`. npm's proposed fixed version, 0.45.4, crosses several 0.x releases and needs a query/API compatibility review and regression coverage before upgrading.
- **Clerk proxy dependency chain**: `http-proxy-middleware` 3.0.7 is used in `server/middlewares/clerkProxyMiddleware.ts`. Its `micromatch`/`braces` chain has a high-severity deeply nested pattern denial-of-service advisory (GHSA-vfj7-8cjw-p6xm). npm's suggested fix is a downgrade to 0.2.0, which would break the current middleware configuration. No safe patched 3.x resolution was available during this review. Do not apply the audit-suggested downgrade; use a patched upstream release or a separately reviewed replacement.

### Reachable production moderate severity

- **Google Cloud Storage** 7.22.0 retains a moderate advisory in its `retry-request` / `teeny-request` dependency chain. npm's offered fix is a downgrade to 5.18.3. Moving to Storage 8 requires Node 22, while this app runs Node 20.20.0. Wait for a compatible 7.x dependency fix or approve and test the runtime upgrade.
- **ExcelJS** 4.4.x retains a moderate advisory through its nested UUID 8 dependency. npm suggests downgrading to ExcelJS 3.4.0; ExcelJS is used in exports and imports, so that downgrade needs an API/data compatibility review.
- **node-vibrant** 4.0.3 retains a moderate advisory in its image/Jimp/file-type chain. The audit suggestion is a major downgrade to 3.1.6. It is used by `server/routes/brandingOnboarding.ts`; verify the palette API and uploaded-image flow before changing versions.

### Development/build-only findings

- Three remaining high entries (`tailwindcss`, `chokidar`, and `fast-glob`) are in the development/build tree, not the production-only audit. They come from the Tailwind 3 toolchain and its pattern-matching dependencies. Removing them safely would require a Tailwind 4 configuration/plugin migration; that migration was not included.
- Remaining moderate development findings include the Tailwind typography/animation plugins, Drizzle Kit, Jest, and ts-jest dependency trees. The audit's suggested fixes for some of these are older releases or downgrades; they were not applied without compatibility review.

### Runtime engine warning

The clean install warns that nested `@whatwg-node/disposablestack` and `@whatwg-node/promise-helpers` require Node >=22.15, while the app uses Node 20.20.0. GraphQL Yoga itself declares a lower Node requirement, and a basic GraphQL request succeeded under Node 20, but that does not validate every runtime path. Review an upstream-compatible pin or approve a Node runtime upgrade before treating this warning as resolved.

## Verification

- `bash scripts/post-merge.sh` completed successfully; it performs a clean `npm ci` with the package firewall unchanged.
- `npm run build` passed after the clean install. Vite reported the project's existing large-chunk warning.
- `npm audit`: 46 total (7 high, 39 moderate, 0 low, 0 critical). `npm audit --omit=dev`: 15 total (4 high, 11 moderate, 0 low, 0 critical).
- CSV parsing and Sharp native encode/resize smoke tests passed. The CSRF token endpoint returned HTTP 200.
- Package manifest and lockfile root dependency sections match.
- `npm run check` exits with 361 TypeScript diagnostics across 52 files after syncing with the main project. Source files were not changed by this dependency task; no baseline typecheck was captured, so this review does not attribute those diagnostics to either the prior state or these dependency updates.

## Compatibility decisions still needed

1. Approve a tested Drizzle ORM migration to a fixed release, or retain 0.39.x until query/schema compatibility is reviewed.
2. Approve a Clerk proxy middleware replacement or wait for a safe patched 3.x release; do not downgrade to 0.2.0.
3. Decide whether to approve Node 22 for the storage/GraphQL dependency chain. Separately, a Tailwind 4 migration is needed to remove the remaining high build-tree findings.

## Broader workspace security scans

These scanner results cover more than the root npm package files above, including Python dependencies and the separate `artifacts/mockup-sandbox` package tree. Their totals should not be compared directly with `npm audit`.

- **Workspace dependency audit — completed:** 256 records: 8 critical, 90 high, 140 moderate, 16 low, and 2 informational. Critical records include PyJWT 2.9.0 and 2.10.1 (scanner fix target 2.14.0) and AnyIO 4.11.0 (fix target 4.14.2). High records also include Pillow 12.0.0, Starlette, protobuf 4.25.9, and Vite 7.3.2 from another dependency tree. The root `pyproject.toml` has Python dependencies, and `artifacts/mockup-sandbox/package.json` is a separate Vite application; neither was modified in this Node-package task. Resolve the Python environment and the artifact's own lockfile before assuming these broader findings are fixed.
- **SAST — completed:** 4 findings: 1 high and 3 medium. The high finding is untrusted `X-File-Ext` joined into a file path at `python-services/lidar_service.py:21-24`. The main Express caller currently limits scan formats to `ply`, `obj`, or `json`, but the Flask endpoint should validate independently and confine writes to its storage directory if it can be reached directly. The medium alerts include SHA-1 HMAC in TOTP generation (`server/utils/two-factor-auth.ts:79,118`), which is required by the current TOTP protocol and should not be replaced without an interoperability plan. The scanner's “hard-coded bcrypt secret” alert at `server/services/portal-share.service.ts:27` is a false positive: that line generates a random token with `crypto.randomBytes`.
- **HoundDog — completed:** 29 findings: 3 critical, 2 medium, and 24 low. The three critical “Auth Token sent to Logs” alerts point to `server/middleware/apiKeyAuth.ts:143,166,206`, where the code logs the API-key database ID and error objects, not the raw API-key value; these alerts appear overbroad but should be confirmed against the logger's error serialization. Separately, `server/middleware/apiKeyAuth.ts:68` logs the first eight characters of a rejected API key. Remove that prefix and ensure serialized errors cannot include `Authorization` or `X-API-Key` values.

The additional Python and source-code findings are recorded for follow-up rather than mixed into the root npm remediation. The Node dependency changes above do not claim to resolve them.
