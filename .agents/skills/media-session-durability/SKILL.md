---
name: media-session-durability
description: "Validate recovery for workflows that combine persisted session state with uploaded media. Use for scan, document, photo or recording changes involving restarts, retries, concurrent updates or storage migration."
---

# Media-session durability

Session metadata and file bytes have separate lifecycles. A persisted path does
not establish that the referenced file survives host replacement.

1. Inventory each state transition and the API response contract before editing.
   Coexisting old/new capture protocols are not automatically interchangeable.
2. For each referenced file, classify storage as durable object storage,
   host-local fallback, temporary upload, or browser-local queue.
3. Trace upload completion → metadata commit → processing → result persistence.
   Identify failure windows where a path is saved before bytes become durable.
4. Use `references/recovery-matrix.md` to choose focused failure tests.
5. Check stale concurrent saves, tenant ownership and retry idempotency without
   overwriting a newer capture or changing an older protocol.

If bytes are gone, return a clear recoverable/re-upload state. Do not claim that
database persistence recreated the file. Use the existing database/integration
skills for actual storage operations; do not replace stores as a side effect.
