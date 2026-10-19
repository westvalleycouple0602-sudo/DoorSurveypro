# Replit Import Starter

This project seeds the Door Hardware Database into PostgreSQL from the v1.6 workbook.

## Steps (Replit)

1) **Create a new Repl** (Node.js). In the Files pane, upload these files and the Excel workbook:
   - door_hardware_database_v1_6.xlsx
   - door_hardware_seed_schema.sql
   - seed_loader.ts
   - package.json
   - tsconfig.json
   - replit.nix

2) **Set your Postgres URL**:
   - Create a `.env` file with:
     DATABASE_URL=postgres://USER:PASS@HOST:PORT/DB?sslmode=require

   (Neon/ElephantSQL/etc. typically require SSL.)

3) **Install dependencies** (shell):
   ```bash
   npm install
   ```

4) **Create tables**:
   ```bash
   npm run schema
   ```

5) **Seed the data**:
   ```bash
   npm run seed
   ```

If you get SSL errors, append `?sslmode=require` (Neon) or `?ssl=true` depending on your provider.

### Optional
- Upload older workbooks (v1.0–v1.5) if you want to load those instead by changing the `--xlsx` path.
- Use `validators.ts`, `importer_normalizer.py`, and `code_validator.py` in separate Repls or add Python support.