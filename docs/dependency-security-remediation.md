# Dependency security remediation

## Scope and result

The 84 supplied findings are retained as the regression baseline in
`scripts/security-dependency-findings.json`.

Every project manifest was inventoried using a filesystem walk that prunes
dependency directories, VCS metadata, and compiled output. This included the
main application, mockup sandbox, workers, imported source projects, and
untracked generated export copies. Replit-provided tooling and installed Python
packages are dependencies/tooling, not independently managed project manifests.

All originally reported vulnerable package/version pairs have been removed
from project declarations and resolved lockfile entries. A fresh dependency
scan also confirmed no remaining findings for the original advisory IDs.
This is not a claim that the project has zero other security advisories.

## Remediation approach

- Attempted npm audit fixes from each Node manifest directory. Missing npm
  lockfiles were generated before retrying where the project was resolvable.
- Attempted pip-audit fixes from each requirements directory. Python projects
  with UV lockfiles were updated using advisory-backed constraints and `uv lock`.
- Upgraded all declared Drizzle ORM copies to the patched stable release.
- Updated old Vite projects to patched Vite 6, retaining Express 4 and its
  existing middleware interfaces.
- Used npm overrides for transitive UUID, esbuild, and once dependencies where
  the latest parent still selected an affected release.
- Replaced node-vibrant's vulnerable legacy decoder with Sharp, while retaining
  the same Vibrant quantizer and palette generator. Migrated the worker's Jimp
  import to the patched package's named export.
- Raised Python minimum versions for the affected packages. Rechecked framework
  compatibility after pip-audit injected transitive pins.

### Imported-project limitations

Some reference manifests cannot be independently installed because they
reference unpublished local `@doorsurvey/*` packages outside a complete
workspace, or the unavailable `open-policy-agent` npm package. Audit auto-fixes
were attempted from those directories; the affected direct constraints were
updated explicitly. Their original missing application structure was not
rebuilt as part of dependency remediation.

UV does not have a security auto-fix command, and pip-audit's `--locked` mode
does not read UV lockfiles. Exporting the resolved UV dependencies permits
auditing without reinstalling them. Changes must be applied to the project
constraints and lockfile, not only to the exported requirements.

## Verification

- `python scripts/audit-dependencies.py --verify`: all inventoried declarations
  and lockfile resolutions checked against the 84 supplied findings.
- `bash scripts/post-merge.sh`: clean npm lockfile install completed.
- `npm run build`: main production build passed.
- Mockup sandbox build passed with its managed workflow's base path and port.
- Both worker TypeScript checks and the replacement palette helper's TypeScript
  check passed.
- `npx tsx --test tests/logo-palette.test.ts`: six regression tests passed,
  covering image formats, invalid images, SQL identifier escaping, and
  Drizzle-Zod compatibility.
- ExcelJS XLSX write/read round trip, Google Cloud Storage initialization, and
  a GraphQL request passed.
- The main app and mockup workflows started. The public landing page rendered
  successfully. Signed-in UI was not visually verified; authentication was
  left intact.

## Remaining issues outside the supplied findings

The broader audit reports other advisories, including an unpatched braces
issue and older Python transitive dependencies. Some are in build/test tools
and imported reference projects. Those are not suppressed or claimed fixed.

The full `npm run check` is not clean: unrelated UI/schema errors remain.
The changed palette helper and both workers pass their targeted checks.

The clean install also reports pre-existing Node engine warnings for GraphQL
helper dependencies requiring Node 22 while this app uses Node 20. The GraphQL
request smoke test passed, but it does not establish support for every helper
code path. No runtime migration was made in this dependency-only task.

Optional Redis/NATS services were unavailable during startup, and the app used
its existing fallbacks. These infrastructure warnings are separate from the
dependency changes.
