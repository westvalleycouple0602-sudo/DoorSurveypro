---
name: dsp-build-offline-sync
description: Implement or diagnose DSP offline field surveys, local drafts, photo upload queues, reconnection, synchronization conflicts, and recovery on iPad or other field devices.
---

# Protect offline field work

## Repository integration
Read repository-root AGENTS.md, replit.md, docs/architecture-overview.md, and the relevant .agents/memory topic first. Follow docs/PROJECT_ROADMAP.md for workstream scope and docs/ENGINEERING_FOUNDATION.md for checks. Preserve existing platform and local skills. Use a task branch from develop and a PR into develop under docs/GIT_WORKFLOW.md; publishing is a separate action. For storage/recovery changes, also use the existing media-session-durability skill and its recovery matrix. Preserve both live capture protocols and their API states; database session metadata cannot restore lost file bytes.

## Map existing persistence
Inspect current local storage, service worker, query caching, authentication, APIs, and upload workers. Identify what is actually durable versus memory-only. Use the existing stack when possible. Discuss shared/schema.ts changes with Terry before editing.

## Specify state and ownership
- Partition local drafts, attachments, caches, and queues by tenant and user. Revalidate the current session and membership before syncing. Never replay one user's queue into another account.
- Show separate states for saved on this device, pending upload, syncing, synced, conflict, and failed. A successful local write is not a successful server save.
- Generate stable operation IDs and enforce idempotency on the server. Bind parent opening references before accepting child attachments; use explicit mappings for locally created IDs.
- Retain drafts and blobs until authoritative acknowledgment. Keep acknowledged metadata even if an attachment is still pending. Avoid relying on a transient signed upload URL as the durable asset identity.
- Use version/revision checks for concurrent edits. Merge only demonstrably independent changes; surface conflicting measurements, approvals, and hardware selections for review. Do not silently apply last-write-wins to these fields.
- Handle deletions through the current retention and tombstone policy. A delayed update must not resurrect a deleted record.

## Implement recovery
1. Commit each local change and its queue operation atomically where supported.
2. Retry transient failures with bounded backoff; keep permanent validation/authentication failures visible and actionable.
3. Renew expired upload authorization after checking access. Resume or restart uploads safely, with checksum/size validation and duplicate prevention.
4. Provide a foreground reconnect/resume path and a manual retry. Treat background processing as an enhancement whose device support must be verified.
5. Handle browser suspension, tab closure, quota exhaustion, device storage eviction, clock differences, and network changes explicitly. Do not promise recovery after data has been evicted.
6. During logout or tenant switch, isolate pending work immediately and apply the established retention policy. Warn before an action would discard unsynced work; offer a permitted recovery path without exposing it to the next user.
7. Keep telemetry free of photo content, session tokens, signed URLs, and sensitive survey details.

## Verify
Exercise airplane-mode create/edit, reload before reconnect, interrupted attachment upload, server commit followed by lost response, two editors changing one measurement, session expiry, revoked membership, tenant switch, and storage failure. Verify the final record count and attachment count, not just a success toast.

Run real-device iPad checks where available. Report simulated network tests separately from physical-device verification. Return the persistence/state map, conflict policy, recovery behavior, and test evidence.
