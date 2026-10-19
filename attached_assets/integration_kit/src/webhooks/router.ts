import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

// Generic webhook endpoint: /api/webhooks/:provider
router.post("/:provider", (req: Request, res: Response) => {
  const provider = req.params.provider;
  // Verify signatures (example)
  const secret = process.env.WEBHOOK_SIGNING_SECRET || "dev-secret";
  const sig = req.headers["x-signature"] as string | undefined;
  if (sig) {
    const hmac = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
    if (sig !== hmac) return res.status(401).json({ ok: false, error: "Invalid signature" });
  }
  console.log(`[webhook] provider=${provider}`, req.body);
  // TODO: Dispatch to provider-specific handlers
  return res.json({ ok: true });
});

export default router;
