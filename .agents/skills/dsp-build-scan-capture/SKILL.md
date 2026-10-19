---
name: dsp-build-scan-capture
description: Build or review Door Survey Pro photo, video, photogrammetry, LiDAR, OCR, calibration, measurement, and scan-quality workflows. Use for guided field capture, scan ingestion, hardware observations, or measurement review.
---

# Build evidence-based scan capture

## Repository integration
Read repository-root AGENTS.md, replit.md, docs/architecture-overview.md, and the relevant .agents/memory topic first. Follow docs/PROJECT_ROADMAP.md for workstream scope and docs/ENGINEERING_FOUNDATION.md for checks. Preserve existing platform and local skills. Use a task branch from develop and a PR into develop under docs/GIT_WORKFLOW.md; publishing is a separate action. For storage/recovery changes, also use the existing media-session-durability skill and its recovery matrix. Preserve both live capture protocols and their API states; database session metadata cannot restore lost file bytes.

## Verify the capture surface
Inspect the current scan flow, device capability detection, upload contracts, worker processing, and viewer. Confirm whether the task targets browser capture, imported models, or a native integration. Check current official platform documentation before choosing sensor APIs. Never equate a model viewer or camera upload with proven direct LiDAR access.

Preserve existing scan records and API compatibility. Discuss shared/schema.ts changes with Terry before editing.

## Define capture and processing
1. Link every session to tenant, building, opening, operator, and timestamp. Record device/capture mode, units, coordinate frame, and relevant calibration evidence.
2. Inspect the existing triple-capture rules. The supplied project snapshot describes door-open both sides, closed side A, and closed side B. Preserve explicit side/state labels and legacy dual-scan records; do not invent new count semantics.
3. Guide users to capture the whole opening, each relevant side, frame, threshold/floor, labels, hinges, lock/latch, closer/operator, power transfer, and accessory details as applicable. Include a safe retake/skip-with-reason path.
4. Separate raw photos/depth/video from derived meshes, dimensions, OCR, and hardware suggestions. Preserve source links and processing-version identifiers so results can be reprocessed and audited.
5. Establish scale from validated calibration or measured reference dimensions. Track transformations and units through fusion. Detect contradictory scales, drift, occlusion, missing geometry, and outliers.
6. Represent each result as measured, manually entered, inferred, or unknown, with method and quality evidence. Never present estimated geometry as a verified fabrication dimension.
7. Allow human review and correction of width/height, handing, swing, bevel, reveal, undercut, hinge locations, frame depth/profile, and hardware identification. Preserve original observations and correction history.
8. Keep workflow states distinct: local capture, queued upload, uploaded, processing, needs review, accepted, failed. Validate actual payload/file type, size, tenant access, and processing limits server-side.
9. Keep dimensions and hardware compatibility review separate from regulatory conclusions. Retrieve applicable requirements with provenance before assessing compliance; do not embed guessed tolerances or model-generated code rules.
10. Use the 10–15 minute survey goal as a product target. Measure it on representative workflows; do not promise it as achieved.

## Verify on realistic cases
Use known-dimension fixtures covering both handings, pairs, reflective glazing, dark surfaces, partial capture, scale mismatch, and unavailable sensors. Compare outputs against independently measured values and approved tolerances. Test interrupted upload, duplicate submissions, and processing failure without losing raw evidence.

Return the device capability matrix, capture contract, review states, accuracy evidence, and limitations. Label mock scans and simulated processing explicitly. Do not claim field accuracy from a UI demonstration.
