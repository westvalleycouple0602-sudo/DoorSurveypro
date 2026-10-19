---
name: dsp-manage-opening-lifecycle
description: Design or change DSP opening records, floor-plan markers, installation inventory, warranties, maintenance history, PM handoffs, or customer portal views. Use when a feature must preserve one opening's identity across its lifetime.
---

# Manage the opening lifecycle

## Repository integration
Read repository-root AGENTS.md, replit.md, docs/architecture-overview.md, and the relevant .agents/memory topic first. Follow docs/PROJECT_ROADMAP.md for workstream scope and docs/ENGINEERING_FOUNDATION.md for checks. Preserve existing platform and local skills. Use a task branch from develop and a PR into develop under docs/GIT_WORKFLOW.md; publishing is a separate action.

## Inspect before modeling
Read the current opening, building, project, asset, warranty, service, and attachment models plus relevant permissions. Verify which features exist. Treat the following relationships as design requirements to map onto existing entities, not instructions to replace the schema. Discuss shared/schema.ts changes with Terry before editing.

## Preserve identity and evidence
1. Keep a stable opening identifier within its tenant/building. Treat a door replacement as an event and installed-asset change at the same opening, unless the physical opening itself is genuinely new.
2. Preserve door, frame, hardware, and electronic-device records as distinct components. Capture manufacturer/model, serial or tag when available, installation/removal dates, condition, source, and verification status. Distinguish unknown from not applicable.
3. Keep survey observations and measured values traceable to author, time, source scan/photo, units, and revision. Record a reason for corrections; preserve the prior value and evidence.
4. Link floor-plan markers to the stable opening ID. Persist plan revision and coordinate system; validate alignment after plan replacement. Prevent orphaned or cross-building markers.
5. Link warranty terms to the relevant installed component and actual supporting document. Record the contract-defined start trigger, duration, exclusions, responsible party, and claim status. Keep an unknown start date unknown; do not infer coverage from upload date.
6. Preserve service visits, findings, approvals, installed/reused/removed items, and closeout evidence. Model planned, installed, verified, and retired states separately.
7. Reuse the existing PM/scheduling workflow for assigned technicians, engineering review, procurement, installation, and closeout. Map transitions and permissions before coding. Require reasoned invalidation of approvals when material specifications change.
8. Keep customer-visible records separate from internal costing, private notes, and restricted master-key data. Associate a master-key system with the opening through authorized records; never expose key codes in ordinary history exports.

## Handle legacy and exceptional records
Preserve historical dual-scan surveys even if new captures require a different sequence. Provide explicit incomplete/legacy status and a completion path instead of silently rejecting or overwriting them. Keep attachment access scoped to the record's tenant and authorized audience.

Treat history correction, warranty claim closure, and asset retirement as auditable transitions. Apply the established retention/deletion policy; do not promise immutable retention beyond that policy.

## Verify
Exercise door replacement with unchanged opening ID; moved plan marker; expired and unknown warranty; edited approved specification; technician closeout; portal visibility; and a foreign-tenant ID. Check that exports and history agree with stored revisions.

Return the entity mapping, transition rules, permissions, migration implications, and checks run. Do not claim a warranty or compliance finding is verified without its supporting evidence.
