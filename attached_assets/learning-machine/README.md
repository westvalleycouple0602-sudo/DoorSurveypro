# DoorSurvey Pro — Learning Machine Starter (Server + Workers)

This starter packages a **typed ingestion API**, an **event-driven enrichment worker**, and **infrastructure configs** to turn your app into a "door learning machine." It is **Replit-friendly** and can also run locally with Docker.

## What’s inside
- **/server** — Node/Express + TypeScript + Drizzle ORM + Zod. Endpoint: `POST /ingest`.
- **/workers/node/enricher** — NATS consumer that reacts to `survey.ingested` events and creates placeholder derived artifacts.
- **/workers/python** — Placeholder microservice entry for embeddings or geometry jobs.
- **/infra** — `docker-compose.yml` for Postgres, NATS, and MinIO (S3-compatible). Dockerfiles for server and worker.
- **.env.example files** — copy to `.env` and fill in.

> **Note:** This repo ships as a minimal skeleton with clean boundaries and data contracts. Extend workers to add OCR, embeddings, and compliance checks.


## Quick start (Replit, server-only)
1. Open **/server** in Replit.
2. Copy `/server/.env.example` → `/server/.env` and set values.
3. Install & run:
   ```bash
   npm install
   npm run dev
   ```
4. Test ingest:
   ```bash
   curl -X POST http://localhost:3000/ingest \
     -H "Content-Type: application/json" \
     -d '{
       "projectId": "00000000-0000-0000-0000-000000000000",
       "doorType": "hinged",
       "locationLabel": "ER Wing A - 102A",
       "captures": [
         {
           "kind": "photo",
           "s3Url": "https://example-bucket/tenant-x/proj-y/opening-z/cap-1.jpg",
           "sha256": "0"*64
         }
       ]
     }'
   ```

## Quick start (Docker, full stack)
```bash
cd infra
docker compose up -d --build
# Seed the database schema
docker compose exec postgres psql -U app -d app -c "CREATE EXTENSION IF NOT EXISTS vector;"
docker compose exec server npm run db:migrate
```
Then POST to `http://localhost:3000/ingest`.

## Data model highlights
- **Projects → Openings → Captures**
- **features_opening_latest** — computed door features (clear width, swing, etc.)
- **embeddings** — pgvector for cross-modal search
- **violations** — compliance findings with evidence links

## Event flow
- `POST /ingest` → write DB rows → publish `survey.ingested` on NATS
- **enricher** consumes → (thumbnail/OCR/EXIF/embeddings) → write back to DB + S3-like storage

## Next steps
- Replace placeholder logic in **/workers** with your OCR/vision/LiDAR and compliance modules.
- Add **HubSpot sync** in a separate worker (subscribe to `survey.completed`, `violation.created`).

---

### Environment variables (minimum)
- `DATABASE_URL` (e.g., `postgres://app:app@localhost:5432/app`)
- `NATS_URL` (e.g., `nats://localhost:4222`)
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`
- `EMBEDDINGS_ENDPOINT` (optional, for Python service)

### License
MIT


## Client (React) quick start
```
cd client
npm install
npm run dev
# Open http://localhost:5173
```

## Compliance rule worker
- Listens on `survey.ingested`
- Ensures a placeholder clearWidth (800 mm) exists, then flags a violation if `< 813 mm`
- Replace placeholder logic to compute real clear width from LiDAR/AR.

Run via Docker Compose (already included) or locally:
```
cd workers/node/compliance
npm install
npm run dev
```
