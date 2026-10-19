# Mini Web UI (no build step)

This adds a lightweight UI served statically from `/public`:
- Paste or upload an opening JSON
- Run **/bom**
- Run **/quote** (margin, tax, shipping)
- View/download results (JSON/CSV/PDF)

## Files
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `src/index_with_ui.ts` (server that serves `/public`)

## Run
```bash
npm install
# update package.json "dev" script or run:
ts-node src/index_with_ui.ts
```
Open http://localhost:3000 and click **Run BOM**, then **Run Quote**.