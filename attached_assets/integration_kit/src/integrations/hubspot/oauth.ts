import { Request, Response } from "express";
import axios from "axios";
import qs from "querystring";

export async function hubspotStart(req: Request, res: Response) {
  const clientId = process.env.HUBSPOT_CLIENT_ID as string;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI as string;
  const url = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=crm.objects.contacts.read%20crm.objects.contacts.write&response_type=code`;
  res.redirect(url);
}

export async function hubspotCallback(req: Request, res: Response) {
  const { code } = req.query as { code?: string };
  if (!code) return res.status(400).json({ error: "Missing code" });
  try {
    const tokenRes = await axios.post("https://api.hubapi.com/oauth/v1/token",
      qs.stringify({
        grant_type: "authorization_code",
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
        code
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    // TODO: persist tokens per-tenant
    return res.json({ ok: true, tokens: tokenRes.data });
  } catch (e:any) {
    return res.status(500).json({ error: e.message });
  }
}
