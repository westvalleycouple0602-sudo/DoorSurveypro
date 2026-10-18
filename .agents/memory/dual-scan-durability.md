---
name: Dual-scan durability boundaries
description: Preserve legacy scan APIs and distinguish session metadata durability from capture-file availability.
---

Keep the older dual-scan workflow compatible with its closed/open capture
statuses; do not silently convert existing sessions to the newer three-capture
protocol.

**Why:** Both scan workflows coexist, and session persistence was requested
without changing existing responses or uploaded objects.

**How to apply:** Treat protocol conversion as a separate product change.
Database-backed metadata does not make legacy local fallback captures durable
across host replacement. Do not promise recovery of files that no longer exist.
