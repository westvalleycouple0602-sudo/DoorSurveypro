# Door Reference – Replit App Bundle

This bundle includes a SQLite database and a minimal FastAPI app for your door/frame/hardware reference.
It was generated directly from your image set and industry standards.

## Files
- `door_ref.db` — SQLite database
- `app.py` — FastAPI app exposing REST endpoints
- `requirements.txt` — Python deps for Replit (`fastapi`, `uvicorn`)
- `schema.sql` — DDL used to build the database
- `seed.json` — JSON export of the dataset for quick bootstrapping

## Run (Replit)
1. Create a new **Python** Replit.
2. Upload all files in this bundle to Replit’s workspace root.
3. In the Shell:
   ```bash
   pip install -r requirements.txt
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
4. Open the webview at the URL Replit shows.

## API
- `GET /health` — health check
- `GET /doors?limit=50&offset=0&category=Hollow%20Metal&material=Steel`
- `GET /doors/{id}` — one record
- `GET /options/{field}` — dropdown options (e.g., `Duty Level`, `Core Type`, …)
- `GET /reference/survey` — survey cheat sheet
- `GET /reference/hardware_locations` — standard CL heights
- `GET /reference/edge_lite_types` — HMMA 810 edge & lite types

> Tip: set env var `DB_PATH` if you move the database, otherwise defaults to `door_ref.db`.


## Frontend (no-build React)
A minimal React UI is served at `/` by FastAPI (StaticFiles). It uses CDN React and fetches the API.

### Replit run
```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```
Open the webview root `/` for the UI, and `/docs` for Swagger.
