---
name: dsp-apply-brand-ux
description: Design or implement DSP navigation, dashboards, landing pages, field forms, icons, Octo guidance, and responsive interfaces. Use when aligning Door Survey Pro to its approved brand and iPad-first workflows.
---

# Apply DSP brand and field UX

## Repository integration
Read repository-root AGENTS.md, replit.md, docs/architecture-overview.md, and the relevant .agents/memory topic first. Follow docs/PROJECT_ROADMAP.md for workstream scope and docs/ENGINEERING_FOUNDATION.md for checks. Preserve existing platform and local skills. Use a task branch from develop and a PR into develop under docs/GIT_WORKFLOW.md; publishing is a separate action.

## Read the current design
Inspect existing routes, components, theme tokens, asset manifests, role permissions, and the latest approved brand package. Use supplied assets rather than recreating a logo from memory. Verify which screens and features exist before reorganizing navigation.

Use navy and orange as the current direction. Prefer the approved Octo Field Pro variant with baseball cap and toolbelt. Read exact colors, type, spacing, and logo variants from approved assets; if unavailable, label proposed tokens as provisional. Keep DSP branding distinct from Lanmor branding unless the specific request calls for Lanmor.

## Structure around the user's task
1. Map each role's existing journey and propose navigation around real tasks: find customer/building, inspect opening/map/history, capture or review evidence, hand off work, and track service.
2. Show the next useful action and clear status. Preserve access to existing functions and route links; use redirects or migration notes when changing navigation.
3. Keep field capture usable on iPad portrait and landscape, with phone fallback. Avoid hover-only actions and preserve keyboard focus, accessible labels, contrast, and readable errors.
4. Reuse the existing shadcn/Radix, form validation, and state patterns where present. Avoid a second component library or a new visual system without a reasoned decision.
5. Show local-save, upload, processing, review, and failure states distinctly. Preserve partially entered measurements and attachments across navigation.
6. Use progressive disclosure for engineering details. Keep core opening identity, measurement units, required evidence, and unresolved issues visible.
7. Use Octo for brief contextual guidance, progress, and recoverable errors. Keep popups dismissible and nonblocking. Never obscure a measurement, camera view, or primary field action.
8. Use verified real-world hardware geometry and orientation in technical visuals. Separate illustrative marketing art from authoritative drawings.
9. On landing/funnel pages, distinguish available capabilities from planned or prototype features. Do not invent accuracy, compliance certification, testimonials, or customer metrics.

## Verify
Exercise the affected journey at tablet portrait/landscape and phone widths, with keyboard and screen-reader labels where testable. Check empty, loading, validation, offline, permission-denied, and recovery states. Confirm focus behavior and that the user can complete the main task without the mascot or animation.

Return the route/task mapping, reused assets/components, visual evidence where available, tests performed, and unresolved design decisions. Do not claim device testing from screenshots alone.
