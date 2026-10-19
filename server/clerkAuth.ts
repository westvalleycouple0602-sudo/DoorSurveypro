import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { organizations, memberships, type User } from "@shared/schema";
import { storage } from "./storage";
import { bindClerkAccount, verifiedClerkEmail } from "./clerk-account-binding";

type AppUser = User & {
  organizationId: string | null;
  role: string;
  roles: string[];
  organization: Awaited<ReturnType<typeof storage.getOrganization>> | null;
};

declare global {
  namespace Express {
    interface Request {
      dbUser?: AppUser;
      identity?: { email: string | null; firstName: string | null; lastName: string | null };
    }
  }
}

// Serialize concurrent first requests for the same account. DB conflict handling
// below also protects provisioning across multiple server processes.
const provisioning = new Map<string, Promise<AppUser>>();

async function resolveUser(clerkId: string, userId: string, email: string | null, username: string | null, joinDemo: boolean): Promise<AppUser> {
  const user = await bindClerkAccount({ clerkId, legacyId: userId, email, username });

  // Match the previous login ordering: a first-time demo user joins the demo
  // before personal-organization provisioning, so it remains their primary org.
  if (joinDemo) {
    const { DEMO_ORG_SLUG } = await import("./demo-seed");
    const demo = await storage.getOrganizationBySlug(DEMO_ORG_SLUG);
    if (demo) {
      await db.insert(memberships).values({
        userId: user.id, organizationId: demo.id, role: "owner",
      }).onConflictDoNothing();
    }
  }
  let membership = await storage.getUserPrimaryMembership(user.id);
  if (!membership) {
    const slug = user.id.toLowerCase().replace(/[^a-z0-9]/g, "-");
    let [org] = await db.insert(organizations).values({
      name: email ? `${email.split("@")[0]}'s Organization` : "Personal Organization",
      slug, subscriptionTier: "free", subscriptionStatus: "trialing",
      projectLimit: 3, userLimit: 1,
    }).onConflictDoNothing().returning();
    if (!org) [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (!org) throw new Error("Unable to provision organization");
    await db.insert(memberships).values({
      userId: user.id, organizationId: org.id, role: "owner",
    }).onConflictDoNothing();
    membership = await storage.getUserPrimaryMembership(user.id);
  }

  const masterEmails = process.env.MASTER_ACCOUNT_EMAIL?.split(",").map(e => e.trim().toLowerCase()) || [];
  if (email && masterEmails.includes(email.toLowerCase())) {
    for (const m of await storage.getUserMemberships(user.id)) {
      const org = await storage.getOrganization(m.organizationId);
      if (org && (org.isMasterAccount !== "yes" || org.subscriptionTier !== "master") &&
          await verifiedClerkEmail(clerkId, email)) {
        await storage.updateOrganization(org.id, {
          subscriptionTier: "master", subscriptionStatus: "active", isMasterAccount: "yes",
          projectLimit: null, userLimit: null, trialEndsAt: null,
        });
      }
    }
  }
  return {
    ...user, organizationId: membership?.organizationId ?? null,
    role: membership?.role ?? user.role, roles: membership?.roles ?? [],
    organization: membership ? await storage.getOrganization(membership.organizationId) ?? null : null,
  };
}

export const resolveClerkUser: RequestHandler = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) return next();
    const claims = auth.sessionClaims;
    if (typeof claims?.userId !== "string" || !claims.userId) {
      throw new Error("Managed Clerk userId session claim is missing");
    }
    const userId = claims.userId;
    const email = typeof claims?.email === "string" ? claims.email : null;
    const username = typeof claims?.username === "string" ? claims.username : null;
    req.identity = {
      email,
      firstName: typeof claims?.firstName === "string" ? claims.firstName : null,
      lastName: typeof claims?.lastName === "string" ? claims.lastName : null,
    };
    let pending = provisioning.get(auth.userId);
    if (!pending) {
      pending = resolveUser(auth.userId, userId, email, username, req.cookies?.app_demo === "1");
      provisioning.set(auth.userId, pending);
      const clerkId = auth.userId;
      pending.finally(() => { if (provisioning.get(clerkId) === pending) provisioning.delete(clerkId); }).catch(() => {});
    }
    req.dbUser = { ...await pending, ...req.identity };
    if (req.cookies?.app_demo) res.clearCookie("app_demo", { path: "/" });
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId || !req.dbUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

export async function getOrganizationContext(req: Express.Request) {
  const user = req.dbUser;
  if (!user?.organizationId) return null;
  const context = { organizationId: user.organizationId, userId: user.id, role: user.role };
  Object.assign(req, { organizationId: context.organizationId, userId: context.userId });
  return context;
}
