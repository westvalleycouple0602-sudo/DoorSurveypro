import { Issuer, generators } from "openid-client";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/client";
import { users, tenants, memberships } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const getClient = async () => {
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER!);
  const client = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID!,
    client_secret: process.env.OIDC_CLIENT_SECRET!,
    redirect_uris: [process.env.OIDC_REDIRECT_URI!],
    response_types: ["code"]
  });
  return client;
};

export async function login(req: Request, res: Response){
  const client = await getClient();
  const state = generators.state(); const nonce = generators.nonce();
  const url = client.authorizationUrl({ scope: "openid email profile", state, nonce });
  res.cookie("oidc_state", state, { httpOnly: true, sameSite: "lax" });
  res.cookie("oidc_nonce", nonce, { httpOnly: true, sameSite: "lax" });
  return res.redirect(url);
}

export async function callback(req: Request, res: Response){
  const client = await getClient();
  const params = client.callbackParams(req);
  const tokenSet = await client.callback(process.env.OIDC_REDIRECT_URI!, params, { state: req.cookies["oidc_state"], nonce: req.cookies["oidc_nonce"] });
  const claims = tokenSet.claims();
  const email = String(claims.email || "");
  if (!email) return res.status(400).send("No email from provider");
  // upsert user
  const existing = await db.select().from(users).where(eq(users.email, email));
  let userId: string;
  if (existing.length) userId = (existing[0] as any).id; else {
    userId = randomUUID();
    await db.insert(users).values({ id: userId, email, passwordHash: "oidc", displayName: String(claims.name || email) });
  }
  // ensure tenant/membership
  const ms = await db.select().from(memberships).where(eq(memberships.userId, userId));
  let tenantId = (ms[0] as any)?.tenantId;
  if (!tenantId){
    tenantId = randomUUID();
    await db.insert(tenants).values({ id: tenantId, name: email.split("@")[0] + " Workspace" });
    await db.insert(memberships).values({ tenantId, userId, role: "owner" });
  }
  const token = jwt.sign({ sub: userId, email }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
  const redirectUrl = `${process.env.APP_POST_LOGIN_REDIRECT || "/"}?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(tenantId)}`;
  return res.redirect(redirectUrl);
}

export async function me(req: Request, res: Response){
  try{
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    return res.json({ sub: payload.sub, email: payload.email, exp: payload.exp });
  }catch(e:any){ return res.status(401).json({ error: "Unauthorized", detail: e?.message }); }
}
