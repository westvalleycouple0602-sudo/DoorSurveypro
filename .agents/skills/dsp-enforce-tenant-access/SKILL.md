---
name: dsp-enforce-tenant-access
description: Review or implement DSP authentication, organization membership, role permissions, customer portal access, private attachments, and tenant isolation. Use for protected endpoints, jobs, caches, search, or exports that handle customer records.
---

# Enforce tenant and audience boundaries

## Repository integration
Read repository-root AGENTS.md, replit.md, docs/architecture-overview.md, and the relevant .agents/memory topic first. Follow docs/PROJECT_ROADMAP.md for workstream scope and docs/ENGINEERING_FOUNDATION.md for checks. Preserve existing platform and local skills. Use a task branch from develop and a PR into develop under docs/GIT_WORKFLOW.md; publishing is a separate action. Use the existing tenant-boundary-regression skill and its access matrix for focused checks, including side effects of denied requests.

## Inspect the identity path
Read the existing middleware, session claims, account bridge, memberships, permissions, and resource queries. The supplied snapshot uses Replit-managed Clerk with local linkedProviders and membership/role records. Verify the current code and preserve that relationship; do not introduce parallel identities or an alternate login system as a shortcut.

Fail explicitly on missing required identity claims. Do not trust client-supplied tenant, role, email, or local user ID as authorization. Discuss shared/schema.ts changes with Terry before editing.

## Trace access end to end
1. Identify actor, active organization, membership state, requested action, resource owner, and permitted audience.
2. Authorize on the server for each read/write/export action, including authenticated callers. Login alone does not authorize access to every opening or customer.
3. Scope queries and related records to the verified tenant. Check parent-child ownership for opening, project, photo, warranty, service record, and plan marker IDs.
4. Scope caches, vector searches, websocket subscriptions, background jobs, and generated exports. Revalidate privileges for delayed work when access may have changed.
5. Issue short-lived attachment access only after resource authorization. Avoid public bucket assumptions, predictable public paths, and broad reusable download grants.
6. Apply purpose-specific portal permissions. Exclude internal pricing, private notes, security configuration, and restricted master-key details from ordinary customer responses.
7. Preserve established cookie/session and CSRF protections for mutations. Validate webhook signatures and replay/idempotency controls where the integration requires them.
8. Record authorization-relevant audit events while redacting tokens, full session payloads, private images, credentials, key codes, and signed URLs.

## Verify denial paths
Use isolated development fixtures for at least two tenants and different roles. Test swapped IDs, tenant IDs in the request body, nested-resource mismatch, revoked membership, disabled user, expired session, unauthorized portal fields, stale cached results, delayed jobs, and signed-download access. Check both read and write denial.

Do not run destructive security tests against production without authorization. Return concrete findings with evidence, affected paths, impact, and remediation. If asked only to review, do not implement changes. Never claim isolation solely because UI controls are hidden.
