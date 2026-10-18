import { Request, Response } from "express";
import axios from "axios";

export async function qbStart(req: Request, res: Response) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
  const scope = encodeURIComponent("com.intuit.quickbooks.accounting openid profile email");
  const url = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(url);
}

export async function qbCallback(req: Request, res: Response) {
  const { code, realmId } = req.query as any;
  if (!code) return res.status(400).json({ error: "Missing code" });
  try {
    // Exchange code for tokens (placeholder)
    // TODO: Use Intuit OAuth endpoints to exchange code for tokens
    return res.json({ ok: true, code, realmId });
  } catch (e:any) {
    return res.status(500).json({ error: e.message });
  }
}
