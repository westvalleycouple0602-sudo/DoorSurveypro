---
name: Entitlement repair safety
description: Risks when repairing reads that previously failed before reaching entitlement changes
---

Repairing a broken status read can reactivate downstream entitlement writes that the failed read never reached.

**Why:** Trial reads were failing before expiration logic and returning a false inactive result. Correcting the schema mappings made automatic expiration reachable again. Subscription state can also be updated independently of trial metadata, so old trial dates alone are not evidence that current paid access is a trial.

**How to apply:** When repairing these reads, trace their write side effects, require positive current-trial evidence before revoking access, preserve paid and protected accounts, and test expiration using disposable fixtures rather than probing real organizations with a potentially mutating status call. Database failures must remain explicit; they are not evidence that no trial exists.
