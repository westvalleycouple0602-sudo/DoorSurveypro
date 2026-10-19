# Replit Integration Kit — DoorSurvey Pro
This kit drops into your existing **Node/Express + TypeScript** app to wire up the integrations and enhancements we discussed (CRM/ERP, e-sign, notifications, storage, calendars, webhooks, BI, and an AI assistant).

## What's inside
- `scripts/install.sh` — installs deps and sets up project scaffolding
- `openapi/openapi.yaml` — API docs for integration endpoints
- `src/routes/integrations.ts` — Express router that exposes integration endpoints
- `src/webhooks/router.ts` — Central webhook router
- `src/integrations/*` — Per-service clients and OAuth helpers (stubs ready to fill)
- `src/jobs/queue.ts` — BullMQ queue placeholder for background syncs
- `docs/IntegrationRoadmap.md` — Phased plan (Core → Growth → Enterprise)
- `docs/SecurityChecklist.md` — SOC2/Enterprise readiness checklist
- `.env.example` — env vars you’ll need

## Quick start (Replit / local)
```bash
bash scripts/install.sh
# After install, integrate the routes:
# server.ts (or app.ts)
# import integrationsRouter from "./src/routes/integrations";
# import webhookRouter from "./src/webhooks/router";
# app.use("/api/integrations", integrationsRouter);
# app.use("/api/webhooks", webhookRouter);
```

## Next steps
1. Copy `.env.example` to `.env` and add real keys
2. Fill in each `src/integrations/*/client.ts` with real API calls
3. Open `openapi/openapi.yaml` in Swagger UI (auto-wired in install script) at `/docs`
