import type { RequestHandler } from "express";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";

// SameSite cookies alone do not protect against an untrusted sibling origin.
// Keep this before operator authentication/body processing, and retain CSRF
// token validation as a separate defense for every state-changing operator API.
export const sameOriginOperatorMutations: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const reject = () => res.status(403).json({ error: "Cross-origin operator request denied" });
  const host = getClerkProxyHost(req) || req.get("host");
  if (!host) return reject();
  let expected: string;
  try { expected = new URL(`${req.protocol}://${host}`).origin; }
  catch { return reject(); }
  const origin = req.get("origin");
  if (origin) return origin === expected ? next() : reject();
  // Opaque/sandbox origins are rejected above. Missing-origin browser requests
  // from siblings/cross-site documents must not fall through to authentication.
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite === "same-site" || fetchSite === "cross-site") return reject();
  const referer = req.get("referer");
  if (referer) {
    try { return new URL(referer).origin === expected ? next() : reject(); }
    catch { return reject(); }
  }
  // Non-browser clients still need the session AND the server's CSRF token.
  return next();
};
