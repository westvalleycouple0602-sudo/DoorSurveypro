---
name: dsp-maintain-application
description: Maintain or extend Door Survey Pro using its existing architecture and verified repository state. Use for feature implementation, bug fixes, refactoring, dependency updates, or translating DSP roadmap items into scoped code changes.
---

# Maintain Door Survey Pro

## Repository integration
Read repository-root AGENTS.md, replit.md, docs/architecture-overview.md, and the relevant .agents/memory topic first. Follow docs/PROJECT_ROADMAP.md for workstream scope and docs/ENGINEERING_FOUNDATION.md for checks. Preserve existing platform and local skills. Use a task branch from develop and a PR into develop under docs/GIT_WORKFLOW.md; publishing is a separate action. Preserve Stripe configuration and billing behavior. Follow the repository's doctor, isolated tests, typecheck, and build gates; report existing failures without weakening them.

## Establish the working facts
1. Confirm repository, branch, working-tree changes, and applicable project instructions. Read current replit.md, package manifests, lockfile, relevant routes, schema, and tests. Preserve unrelated work.
2. Treat the October 18, 2026 supplied replit.md as a documented snapshot: React/TypeScript, Express, PostgreSQL/Drizzle, TanStack Query, React Hook Form/Zod, shadcn/Radix, Clerk, pgvector/OpenAI, and existing workers. Verify each relevant component against source before relying on it.
3. Treat ROADMAP.md's February 7, 2026 completion claims and targets as planning evidence, not proof of deployed functionality. Distinguish implemented, partially implemented, planned, and unverified.
4. Use this repository's npm lockfile and Node version requirements; inspect package.json and lifecycle scripts before installing dependencies. Do not import the separate Plan repository's pnpm workspace assumptions.
5. If code is unavailable, produce a bounded design or patch specification with explicit assumptions; do not invent file paths, test results, or completed features.

## Make a scoped change
- Translate the request into one user outcome and concrete acceptance criteria. Trace the existing UI-to-API-to-storage path before adding another path.
- Reuse the current route, validation, component, and data-access patterns. Avoid parallel accounts, duplicate opening records, duplicate navigation, and replacement infrastructure without a justified decision.
- Discuss changes to shared/schema.ts with Terry before editing it. Explain the proposed fields, compatibility, migration, and affected records. Do not evade this rule by creating a second schema.
- Preserve Replit-managed Clerk identity and the local account/membership bridge when present. Verify the actual implementation before adjusting claims, provider links, cookies, or permissions.
- Keep dependencies aligned to the installed stable versions. Read official release notes for a necessary upgrade; propose breaking changes before applying them. Do not copy latest-version or force-install examples blindly.
- Respect the requested scope: investigation yields findings; an implementation request authorizes the relevant fix. Do not infer authorization to publish, migrate production data, or send messages from a code request.
- Prefer small reviewable patches. Keep database, tenant, and historical-data compatibility explicit. Add only tests that exercise changed behavior or material regression risks.

## Verify and hand off
Run the applicable existing typecheck/build and targeted tests after inspecting their scripts and required environment. Identify pre-existing failures separately. For a UI change, exercise the affected flow with loading, empty, error, and saved states. For a fix, demonstrate the original failure and corrected behavior where practical.

Return the outcome, changed files, checks actually run, remaining limitations, and the next integration action. Update current project instructions only for verified durable decisions; do not copy temporary task chatter or personal information into them.
