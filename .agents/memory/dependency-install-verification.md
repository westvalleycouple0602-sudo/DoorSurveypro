---
name: Dependency install verification
description: Why successful incremental installs are insufficient evidence for post-merge setup
---

Verify post-merge dependency restoration with a clean lockfile install, not only an incremental package install.

**Why:** An incremental install reused existing packages successfully, while the clean install exposed older transitive versions blocked by Replit's security policy. The migration could not be considered operational until both dependency restoration and startup passed.

**How to apply:** Keep the package firewall enabled. Update blocked dependencies to compatible safe versions and verify the configured setup script before claiming a merge is ready.

Inspect the `engines` requirements of resolved transitive packages after package-family updates. A parent can support the app's Node version while a nested helper selected by the lockfile requires a newer runtime.

**Why:** npm may finish a clean install with `EBADENGINE` warnings, and a small runtime smoke test may not exercise every affected code path.

**How to apply:** Check the lockfile and install warnings, then test the affected runtime paths. Decide whether to pin compatible transitive packages or approve a runtime upgrade before treating the engine mismatch as resolved.

Validate Python requirement resolution after automatic security fixes, not just the audit's success message.

**Why:** The audit tool can inject a patched transitive version that conflicts with a pinned parent framework or telemetry family, leaving requirements that cannot be installed.

**How to apply:** Resolve the complete requirements with the project's package manager after fixes. Update compatible parents together, or remove an out-of-scope injected pin; never bypass the package firewall.
