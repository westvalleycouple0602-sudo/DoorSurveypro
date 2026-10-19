
DoorSurvey Pro – Export System Bundle

This bundle contains backend + frontend code to implement configurable export/print
including export profiles, quote versions, branding, and export history.

Backend:
  - Wire routes into your Express app:
      import exportProfilesRouter from "./routes/exportProfiles";
      import quoteVersionsRouter from "./routes/quoteVersions";
      import exportRouter from "./routes/export";
      import exportHistoryRouter from "./routes/exportHistory";

      app.use(exportProfilesRouter);
      app.use(quoteVersionsRouter);
      app.use(exportRouter);
      app.use(exportHistoryRouter);

  - Adjust db/client, tenants, users, quotes imports to match your project.
  - Replace the simple Buffer in exportService.ts with a real PDF/HTML generator when ready.

Frontend:
  - Ensure React Query (TanStack) is configured.
  - Import and use:
      import { ExportPanel } from "./components/export";

      <ExportPanel quoteId={quote.id} />

Auth:
  - getContext(req) assumes req.user.tenantId and req.user.id.
  - Adapt to your auth/tenant middleware as needed.
