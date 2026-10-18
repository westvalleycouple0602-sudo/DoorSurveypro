# DoorSurvey Pro — OpenAI Starter

This zip gives you a **Replit-ready** starter: Node/Express API + React widget + RAG ingestion stubs.

## Structure
- `server/` — TypeScript Express API with OpenAI routes
- `web/` — Vite + React app with an Assistant widget
- `scripts/ingest.ts` — RAG ingestion stub (pgvector)
- `.env.example` — Environment keys

## Quick Start (Replit)
1. Create a new Replit for **Node + React (Vite)** or separate repls for `server` and `web`.
2. Copy folders or upload this ZIP and extract.
3. In **server**:
   ```bash
   npm i
   npm run dev
   ```
4. In **web**:
   ```bash
   npm i
   npm run dev
   ```

> Set env vars from `.env.example` in Replit Secrets before running.

## API Routes
- `POST /ai/vision-identify` — image → JSON attributes
- `POST /ai/compliance-check` — opening JSON → violations/actions (RAG-ready)
- `POST /ai/sql-assistant` — NL → parameterized SQL (read-only guardrails)

## Notes
- Replace stubs with your database schema and rule content.
- All responses aim for **strict JSON** for stable front-end parsing.
