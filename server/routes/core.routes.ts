import type { Express } from "express";
import { z, ZodError } from "zod";
import csrf from "csurf";
import multer from "multer";
import { MEMBERSHIP_ROLES, type MembershipRole } from "@shared/schema";
import type { RouteDependencies } from "./deps";
import { getRequestPath } from "../utils/request";
import { requireAuth, getOrganizationContext } from "../clerkAuth";
import { getAuth, clerkClient } from "@clerk/express";
import { verifiedClerkEmail } from "../clerk-account-binding";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerCoreRoutes(app: Express, deps: RouteDependencies) {
  const { storage, logger, logError, rateLimiters, middleware } = deps;

  // Note: CSRF protection is applied globally in main routes.ts
  // Individual routes receive csrfProtection middleware from deps if needed
  
  const csrfProtection = csrf({ cookie: true });

  // CSRF Token endpoint
  app.get("/api/csrf-token", csrfProtection, (req, res) => {
    res.json({ csrfToken: (req as any).csrfToken() });
  });

  // Error reporting endpoint
  const errorReportSchema = z.object({
    error: z.object({
      message: z.string().max(1000),
      name: z.string().max(100).optional(),
      stack: z.string().max(5000).optional(),
    }),
    errorInfo: z.object({
      componentStack: z.string().max(5000).optional(),
    }).optional(),
    context: z.object({
      url: z.string().max(500).optional(),
      userAgent: z.string().max(500).optional(),
      timestamp: z.string().optional(),
    }).optional(),
  });

  app.post("/api/errors/report", rateLimiters.errorReport, async (req, res) => {
    try {
      const validated = errorReportSchema.parse(req.body);
      
      logError(new Error(validated.error.message), {
        source: 'frontend',
        errorName: validated.error.name,
        stack: validated.error.stack,
        componentStack: validated.errorInfo?.componentStack,
        url: validated.context?.url,
        userAgent: validated.context?.userAgent,
        timestamp: validated.context?.timestamp,
      });

      res.status(201).json({ message: "Error reported successfully" });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: "Invalid error report format" });
      }
      logError(err instanceof Error ? err : new Error(String(err)), { context: 'error-reporting' });
      res.status(500).json({ error: "Failed to report error" });
    }
  });

  // Get current user information
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      const dbUser = req.dbUser!;
      const organization = dbUser.organization;

      res.json({
        id: dbUser.id,
        language: dbUser.language,
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          subscriptionTier: organization.subscriptionTier,
          subscriptionStatus: organization.subscriptionStatus,
          activeAddons: organization.activeAddons || [],
        } : null,
        role: dbUser.role,
        roles: dbUser.roles,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-user' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user profile
  app.post("/api/user/accept-invitation", requireAuth, async (req, res) => {
    try {
      const { token } = z.object({ token: z.string().min(1).max(512) }).parse(req.body);
      const user = req.dbUser!;
      const org = user.organization;
      const recent = org?.createdAt && new Date(org.createdAt).getTime() > Date.now() - 5 * 60 * 1000;
      const eligible = org && user.role === "owner" && recent &&
        org.subscriptionStatus === "trialing" && org.subscriptionTier === "free" &&
        !org.stripeCustomerId && !org.stripeSubscriptionId && org.isMasterAccount !== "yes";
      if (!eligible) return res.json({ applied: false });
      const email = await verifiedClerkEmail(getAuth(req).userId!, req.identity?.email ?? null);
      const invitation = await storage.consumeInvitationToken(token, user.id, email);
      if (!invitation) return res.json({ applied: false });
      const metadata = invitation.metadata as { tierOverride?: string } | null;
      const tier = metadata?.tierOverride || "enterprise";
      if (!["starter", "professional", "enterprise"].includes(tier)) {
        return res.status(400).json({ error: "Invalid invitation tier" });
      }
      await storage.updateOrganization(org.id, {
        subscriptionTier: tier, subscriptionStatus: "active",
        projectLimit: null, userLimit: null, trialEndsAt: null,
      });
      res.json({ applied: true });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: "accept-invitation" });
      res.status(error instanceof ZodError ? 400 : 500).json({ error: "Unable to apply invitation" });
    }
  });

  const updateProfileSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
  });

  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const validated = updateProfileSchema.parse(req.body);
      // Identity edits go to Clerk, using its native ID, never the local legacy PK.
      await clerkClient.users.updateUser(getAuth(req).userId!, validated);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid profile data" });
      }
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'update-profile' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user language preference
  const updateLanguageSchema = z.object({
    language: z.enum(['en', 'es', 'fr']),
  });

  app.patch("/api/user/language", requireAuth, async (req, res) => {
    try {
      const validated = updateLanguageSchema.parse(req.body);
      const [updated] = await db.update(users).set({ language: validated.language })
        .where(eq(users.id, req.dbUser!.id)).returning();

      res.json({
        id: updated.id,
        language: updated.language,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid language preference" });
      }
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'update-language' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user statistics
  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const user = req.dbUser as any;
      const claims = user ? { sub: user.id } : undefined;
      
      // Development bypass: Return mock stats for dev mode
      if (!claims?.sub && process.env.NODE_ENV === 'development') {
        const projects = await storage.getProjects('dev-org-001');
        const openings = await storage.getOpenings();
        const allQuotes = await storage.getQuoteRequests();
        
        const projectIds = projects.map(p => p.id);
        const quotesCount = allQuotes.filter(q => projectIds.includes(q.projectId)).length;
        const openingsCount = openings.filter(o => projectIds.includes(o.projectId)).length;
        
        return res.json({
          projectsCount: projects.length,
          quotesCount,
          openingsCount,
        });
      }
      
      if (!claims?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dbUser = await storage.getUser(claims.sub);
      if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const membership = await storage.getUserPrimaryMembership(dbUser.id);
      if (!membership) {
        return res.json({
          projectsCount: 0,
          quotesCount: 0,
          openingsCount: 0,
        });
      }

      // Get organization-scoped statistics
      const [projects, openings, allQuotes] = await Promise.all([
        storage.getProjects(membership.organizationId),
        storage.getOpenings(),
        storage.getQuoteRequests(),
      ]);

      const projectsCount = projects.length;
      const projectIds = projects.map(p => p.id);
      
      // Filter quotes and openings by user's projects
      const quotesCount = allQuotes.filter(q => projectIds.includes(q.projectId)).length;
      const openingsCount = openings.filter(o => projectIds.includes(o.projectId)).length;

      res.json({
        projectsCount,
        quotesCount,
        openingsCount,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-user-stats' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user preferences
  app.get("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const user = req.dbUser as any;
      const claims = user ? { sub: user.id } : undefined;
      
      // Development bypass: Return default preferences for dev mode
      if (!claims?.sub && process.env.NODE_ENV === 'development') {
        return res.json({
          emailNotifications: true,
          projectUpdates: true,
          quoteAlerts: true,
          weeklyDigest: false,
          marketingEmails: false,
        });
      }
      
      if (!claims?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return default preferences for now
      // In a real implementation, these would be stored in the database
      res.json({
        emailNotifications: true,
        projectUpdates: true,
        quoteAlerts: true,
        weeklyDigest: false,
        marketingEmails: false,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-preferences' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user preferences
  const updatePreferencesSchema = z.object({
    emailNotifications: z.boolean().optional(),
    projectUpdates: z.boolean().optional(),
    quoteAlerts: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
  });

  app.patch("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const user = req.dbUser as any;
      const claims = user ? { sub: user.id } : undefined;
      
      if (!claims?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = updatePreferencesSchema.parse(req.body);
      
      // In a real implementation, these would be stored in the database
      // For now, just return success
      logger.info("User preferences updated", { userId: claims.sub, preferences: validated });
      
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid preferences data" });
      }
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'update-preferences' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Team Management Routes
  app.get("/api/team/members", middleware.requireRole(MEMBERSHIP_ROLES.ADMIN), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const members = await storage.getOrganizationMembers(orgContext.organizationId);
      for (const member of members) {
        if (member.user.id === req.dbUser!.id) {
          Object.assign(member.user, req.identity);
        }
      }
      res.json(members);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-team-members' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/team/members/:membershipId/role", middleware.requireRole(MEMBERSHIP_ROLES.ADMIN), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { membershipId } = req.params;
      const { role } = req.body;

      const validRoles: MembershipRole[] = ["owner", "admin", "manager", "engineer", "technician", "viewer"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const targetMembership = await storage.getMembership(membershipId);
      if (!targetMembership || targetMembership.organizationId !== orgContext.organizationId) {
        return res.status(404).json({ error: "Membership not found" });
      }

      if (role === MEMBERSHIP_ROLES.OWNER && orgContext.role !== MEMBERSHIP_ROLES.OWNER) {
        return res.status(403).json({ error: "Only owners can assign owner role" });
      }

      if (targetMembership.role === MEMBERSHIP_ROLES.OWNER && role !== MEMBERSHIP_ROLES.OWNER) {
        return res.status(403).json({ error: "Cannot demote owner. Assign a new owner first." });
      }

      const updated = await storage.updateMembershipRole(membershipId, role);
      res.json(updated);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'update-member-role' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/team/members/:membershipId", middleware.requireRole(MEMBERSHIP_ROLES.ADMIN), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { membershipId } = req.params;

      const targetMembership = await storage.getMembership(membershipId);
      if (!targetMembership || targetMembership.organizationId !== orgContext.organizationId) {
        return res.status(404).json({ error: "Membership not found" });
      }

      if (targetMembership.role === MEMBERSHIP_ROLES.OWNER) {
        return res.status(403).json({ error: "Cannot remove owner" });
      }

      if (targetMembership.userId === orgContext.userId) {
        return res.status(403).json({ error: "Cannot remove yourself" });
      }

      await storage.deleteMembership(membershipId);
      res.json({ success: true });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'delete-team-member' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Organization Branding Routes
  app.get("/api/branding", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const organization = await storage.getOrganization(orgContext.organizationId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json({
        organizationName: organization.name,
        logoUrl: organization.logoUrl,
        signatureName: organization.signatureName,
        signatureTitle: organization.signatureTitle,
        signaturePhone: organization.signaturePhone,
        signatureEmail: organization.signatureEmail,
        brandingColor: organization.brandingColor,
        websiteUrl: organization.websiteUrl,
        proposalContactName: organization.proposalContactName,
        proposalContactEmail: organization.proposalContactEmail,
        proposalContactPhone: organization.proposalContactPhone,
        proposalContactAddress: organization.proposalContactAddress,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-branding' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/branding", middleware.requireRole(MEMBERSHIP_ROLES.ADMIN), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { 
        signatureName, 
        signatureTitle, 
        signaturePhone, 
        signatureEmail, 
        brandingColor,
        websiteUrl,
        proposalContactName,
        proposalContactEmail,
        proposalContactPhone,
        proposalContactAddress,
      } = req.body;

      if (brandingColor && !/^#[0-9A-F]{6}$/i.test(brandingColor)) {
        return res.status(400).json({ error: "Invalid color format. Use hex format (#RRGGBB)" });
      }

      const updated = await storage.updateOrganization(orgContext.organizationId, {
        signatureName,
        signatureTitle,
        signaturePhone,
        signatureEmail,
        brandingColor,
        websiteUrl,
        proposalContactName,
        proposalContactEmail,
        proposalContactPhone,
        proposalContactAddress,
      });

      res.json({
        organizationName: updated.name,
        logoUrl: updated.logoUrl,
        signatureName: updated.signatureName,
        signatureTitle: updated.signatureTitle,
        signaturePhone: updated.signaturePhone,
        signatureEmail: updated.signatureEmail,
        brandingColor: updated.brandingColor,
        websiteUrl: updated.websiteUrl,
        proposalContactName: updated.proposalContactName,
        proposalContactEmail: updated.proposalContactEmail,
        proposalContactPhone: updated.proposalContactPhone,
        proposalContactAddress: updated.proposalContactAddress,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'update-branding' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Logo upload configuration
  const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 2 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml", "image/webp"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, SVG, and WebP images are allowed."));
      }
    },
  });

  app.post("/api/branding/logo", middleware.requireRole(MEMBERSHIP_ROLES.ADMIN), logoUpload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const base64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

      const updated = await storage.updateOrganization(orgContext.organizationId, {
        logoUrl: dataUrl,
      });

      res.json({
        logoUrl: updated.logoUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid file type")) {
        return res.status(400).json({ error: error.message });
      }
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'upload-logo' });
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
