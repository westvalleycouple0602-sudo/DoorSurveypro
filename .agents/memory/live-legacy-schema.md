---
name: Live legacy schema
description: Existing database drift and the requirement to adapt without replacing live structures
---

The existing database predates some of the modular schema declarations. Do not assume the declared column types or invitation counters describe the live database.

**Why:** During auth migration, actual database metadata revealed legacy storage shapes different from the current declarations. Trusting only the source caused provider-link writes and invitation redemption to fail. Automatically pushing those declarations would risk changing preserved data and relationships.

**How to apply:** Inspect metadata in the target environment and adapt reads/writes to its existing shapes. Do not use a forced schema push to resolve compatibility problems. Keep unrelated declarations and FK relationships intact.
