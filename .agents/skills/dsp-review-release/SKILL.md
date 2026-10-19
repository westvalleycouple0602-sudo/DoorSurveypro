---
name: dsp-review-release
description: Review DSP changes for release readiness, regression risk, database compatibility, dependencies, and deployment handoff. Use before merging or deploying, for bug review, or when preparing a Replit implementation handoff.
---

# Review a DSP release

## Repository integration
Read repository-root AGENTS.md, replit.md, docs/architecture-overview.md, and the relevant .agents/memory topic first. Follow docs/PROJECT_ROADMAP.md for workstream scope and docs/ENGINEERING_FOUNDATION.md for checks. Preserve existing platform and local skills. Use a task branch from develop and a PR into develop under docs/GIT_WORKFLOW.md; publishing is a separate action. Preserve Stripe configuration and billing behavior. Follow the repository's doctor, isolated tests, typecheck, and build gates; report existing failures without weakening them.

## Establish scope and authorization
Identify the exact repository, source commit/branch, intended base, changed files, and working-tree status. Inspect project instructions, current CI, package manager, and available tests. Distinguish review-only requests from requests to fix or publish. Do not infer merge/deploy authorization from a review.

Treat document completion claims as unverified until supported by source and tests. Never substitute a passing sample project for checks against the actual changed application.

## Review the risk
- Trace changed workflows through UI, API, database, jobs, attachments, and exports. Check regression risks for opening identity/history, private customer evidence, and tenant isolation.
- Inspect dependency diffs and relevant official release notes. Prefer targeted compatible upgrades; do not force-install or blanket-upgrade the dependency tree.
- Review migrations for data preservation, version compatibility, lock/backfill behavior, and recovery. Discuss shared/schema.ts changes with Terry before editing it.
- Treat production migration, data deletion, and restore as separately authorized operations. Inspect scripts before running them; do not assume build/test commands are side-effect free.
- Preserve the Clerk/local identity bridge and legacy survey compatibility. Check whether existing clients and queued offline operations still work.
- Reject evidence-free compliance or measurement claims in code and marketing. Require traceable support and appropriate review state.
- Keep secrets, customer records, client photos, and security-sensitive key data out of logs, fixtures, source control, and release notes.

## Run proportionate checks
1. Run existing relevant typechecks/builds and targeted unit/integration tests in an appropriate nonproduction environment.
2. Exercise the changed end-to-end journey. Include negative cases for permissions, validation, and failure/retry behavior.
3. For a database change, test migration and recovery on disposable representative data before proposing production execution.
4. Compare failures with the unchanged base when necessary to separate new regressions from existing problems.
5. Stop optional testing when the material risks are adequately resolved. Report skipped checks and environmental limitations honestly.

## Produce a usable handoff
List findings by severity with file/function evidence and a reproduction or reasoning path. State changed behavior, checks run and outcomes, blockers, rollout prerequisites, and recovery steps. Make release readiness conditional on unresolved blockers.

For a Replit handoff, provide a small task scope, known paths/contracts, acceptance criteria, verification commands confirmed from the project, and decisions still needed. Avoid open-ended instructions to rebuild the application.

When authorized to save code, use the repository's established branch workflow and preserve unrelated commits. Do not force-push, alter protections, merge, publish, or send external notifications unless that action is within the user's request. Update roadmap status only after verifying implementation.
