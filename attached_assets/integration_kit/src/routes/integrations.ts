import { Router, Request, Response } from "express";
import { hubspotStart, hubspotCallback } from "../integrations/hubspot/oauth";
import { qbStart, qbCallback } from "../integrations/quickbooks/oauth";
import { requireTenant } from "../shared/tenant";
export const router = Router();

router.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

// Tenant middleware (stub) — replace with your auth/tenant context
router.use(requireTenant);

// HubSpot OAuth
router.get("/hubspot/oauth/start", hubspotStart);
router.get("/hubspot/oauth/callback", hubspotCallback);

// QuickBooks OAuth
router.get("/quickbooks/oauth/start", qbStart);
router.get("/quickbooks/oauth/callback", qbCallback);

// TODO: Add DocuSign, Slack, Google, Outlook, Dropbox, Drive endpoints similarly

export default router;
