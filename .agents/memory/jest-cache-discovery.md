---
name: Jest cache discovery boundaries
description: Why exact testMatch lists still need constrained roots in this workspace.
---

Jest's testMatch selection does not constrain its package/Haste discovery.
Workspace dependency caches and exported app copies can introduce duplicate
package names even when every selected test file is explicit.

**Why:** A new multi-project runner discovered multiple ansi-styles manifests
under the workspace's Bun cache and failed before any assertions ran. This was
not an application dependency conflict.

**How to apply:** Constrain each Jest project's roots to its actual source/test
directories and exclude caches/generated exports. Do not delete original backups
or change application dependencies to resolve a Haste discovery collision.
