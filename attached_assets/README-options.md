# Options Catalogs & Validation

This bundle includes:
- `door_options_catalog.csv` — Door options (residential + commercial)
- `frame_options_catalog.csv` — Frame options (residential + commercial)
- `options_dropdowns.json` — Hierarchical dropdown data for UI forms
- `validation_rules.json` — Declarative rules for cross-field validation

## Dropdown Structure
applies_to → market → attribute_group → attribute_name → [options]

## Key Code Pointers
- Fire ratings ≥60 min with full-lite require *fire‑resistive* glazing to maintain the rating.
- Electrified readers/locks require a power transfer (EPT/electric hinge).
- ADA clear width: ensure ≥32" clear considering stops/trim/projections.

