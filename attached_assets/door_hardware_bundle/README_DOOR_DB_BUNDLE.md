# Door Hardware Database Bundle (v1.6)

This bundle includes all versions of the database (v1.0 → v1.6), plus scripts, templates, validators, and loaders.

## Contents
- **Excel Workbooks**: v1.0, v1.1, v1.2, v1.3, v1.4, v1.5, v1.6
- **JSON/CSV**: v1.0 records, v1.1 JSON, seed records JSON, BHMA function map JSON, distributor CSV template
- **Scripts**:
  - `importer_normalizer.py` — normalize distributor CSVs into your schema
  - `code_validator.py` — flags common AHJ/code issues
  - `validators.ts` — frontend/runtime checks (finishes + maglock rules)
  - `psu_calc.ts` / `psu_calc.py` — PSU sizing utilities
  - `seed_loader.ts` — loads workbook data to PostgreSQL
  - `door_hardware_seed_schema.sql` — DB tables

## Quick Start
1. Create tables:
   ```bash
   psql "$DATABASE_URL" -f door_hardware_seed_schema.sql
   ```
2. Load workbook (e.g., v1.6):
   ```bash
   ts-node seed_loader.ts --db "$DATABASE_URL" --xlsx door_hardware_database_v1_6.xlsx
   ```
3. Import distributor price list:
   ```bash
   python importer_normalizer.py distributor_pricelist_template.csv normalized.json --finishes-xlsx door_hardware_database_v1_6.xlsx --functions-xlsx door_hardware_database_v1_6.xlsx
   python code_validator.py normalized.json findings.json
   ```

## Notes
- Prices are **indicative**. Verify with manufacturer/distributor before quoting.
- `Official` function catalogs in v1.6 are flagged `verified=false`. Cross-check with current brand catalogs to flip to true.
- Maglock life-safety: include **motion REX**, **manual release**, and **fire alarm drop** per AHJ.

Generated: 2025-11-03T06:03:37Z
