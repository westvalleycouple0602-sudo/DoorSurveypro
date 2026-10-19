
# Glass Pivot/Patch Hardware Catalog — Replit App

A minimal Flask API to serve a catalog of glass pivot/patch hardware for commercial glass door systems.

## Endpoints

- `GET /` — API info
- `GET /hardware` — list full catalog
- `GET /hardware/<PartNumber>` — fetch one item (e.g., `PH20C`)
- `GET /search?role=TopPatch&manufacturer=CRL` — filter by role/manufacturer
  - Add `&q=term` to full-text search within records

## Run on Replit

1. Create a new Python Repl.
2. Upload the contents of this folder (keep the structure).
3. Ensure **Run** command is `python3 main.py` and the port is 3000.
4. Click **Run**, then open the web view.

## Data

Catalog lives in `hardware_catalog/pivot_catalog.json`. A CSV mirror is also included.

You can expand entries or add fields like pricing, supplier links, images, or CAD references.

## Replit DB (optional)

If available, responses are cached per part under keys like `pivot_PH20C` in Replit DB.
