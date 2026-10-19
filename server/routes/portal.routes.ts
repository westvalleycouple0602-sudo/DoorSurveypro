import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as schema from "@shared/schema";
import { logger, logError, logSecurityEvent } from "../logger";
import { emailService } from "../email-service";
import { storage } from "../storage";

const router = Router();

const MAGIC_LINK_EXPIRY_MINUTES = 30;

async function notifySalesTeam(
  originalRequest: any,
  updatedRequest: any,
  items: any[],
  portalUser: any
): Promise<void> {
  try {
    const memberships = await db.select({ user: schema.users, role: schema.memberships.role })
      .from(schema.memberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
      .where(eq(schema.memberships.organizationId, originalRequest.organizationId));

    const salesUsers = memberships
      .filter(m => ["owner", "admin", "manager"].includes(m.role))
      .map(m => m.user)
      .filter((user): user is typeof user & { email: string } => !!user.email);

    if (salesUsers.length === 0) {
      logger.warn("No sales team members found to notify", {
        organizationId: originalRequest.organizationId,
      });
      return;
    }

    const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000";

    const queueUrl = `${baseUrl}/service-queue`;

    const hasPhotos = items.some(item => {
      const photos = item.photos as any[] | null;
      return photos && photos.length > 0;
    });
    const hasScans = items.some(item => item.lidarScanId !== null);

    const priorityLabels: Record<string, string> = {
      low: "Low",
      normal: "Normal",
      high: "High",
      urgent: "URGENT",
    };
    const priorityLabel = priorityLabels[originalRequest.priority] || originalRequest.priority;

    const triageLabels: Record<string, string> = {
      quotable: "Ready to Quote",
      needs_site_visit: "Needs Site Visit",
      pending: "Pending Review",
    };
    const triageLabel = triageLabels[updatedRequest.triageDecision] || updatedRequest.triageDecision;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">New Service Request</h1>
          </div>
          
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Request #</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${originalRequest.requestNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Title</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${originalRequest.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Priority</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: ${originalRequest.priority === 'urgent' ? '#dc2626' : originalRequest.priority === 'high' ? '#ea580c' : '#374151'}; font-weight: 500;">${priorityLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Auto-Triage</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: ${updatedRequest.triageDecision === 'quotable' ? '#16a34a' : '#ea580c'}; font-weight: 500;">${triageLabel}</td>
              </tr>
            </table>

            <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px; font-size: 14px; color: #374151;">Submitter</h3>
              <p style="margin: 0 0 4px; font-size: 14px;">${portalUser.name}</p>
              <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">${portalUser.email}</p>
              ${portalUser.company ? `<p style="margin: 0; font-size: 14px; color: #6b7280;">${portalUser.company}</p>` : ""}
            </div>

            ${originalRequest.locationName || originalRequest.locationAddress ? `
              <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px; font-size: 14px; color: #374151;">Location</h3>
                ${originalRequest.locationName ? `<p style="margin: 0 0 4px; font-size: 14px;">${originalRequest.locationName}</p>` : ""}
                ${originalRequest.locationAddress ? `<p style="margin: 0; font-size: 14px; color: #6b7280;">${originalRequest.locationAddress}</p>` : ""}
              </div>
            ` : ""}

            <p style="text-align: center; font-size: 14px; color: #6b7280; margin-bottom: 20px;">
              <strong>${items.length}</strong> door item${items.length !== 1 ? "s" : ""}
              ${hasPhotos ? " • Photos attached" : ""}
              ${hasScans ? " • LiDAR scans" : ""}
            </p>

            <div style="text-align: center;">
              <a href="${queueUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                View in Service Queue
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `${originalRequest.priority === 'urgent' ? '[URGENT] ' : ''}New Service Request ${originalRequest.requestNumber} - ${triageLabel}`;

    for (const salesUser of salesUsers) {
      try {
        await emailService.sendEmail({
          to: salesUser.email,
          subject,
          html,
        });
        logger.info("Sales team member notified of new service request", {
          userId: salesUser.id,
          requestNumber: originalRequest.requestNumber,
        });
      } catch (emailError) {
        logger.error("Failed to notify sales team member", {
          userId: salesUser.id,
          error: emailError instanceof Error ? emailError.message : "Unknown error",
        });
      }
    }
  } catch (error) {
    logger.error("Error notifying sales team", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

const PORTAL_SESSION_COOKIE = "portal_session";

const requestMagicLinkSchema = z.object({
  email: z.string().email("Valid email is required"),
  organizationId: z.string().min(1, "Organization is required"),
});

const createPortalUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  organizationId: z.string().min(1, "Organization is required"),
});

interface PortalSession {
  portalUserId: string;
  organizationId: string;
  email: string;
  name: string;
}

function generateMagicToken(): { token: string; tokenHash: string; tokenLookup: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenLookup = token.substring(0, 8);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash, tokenLookup };
}

async function sendMagicLinkEmail(
  email: string,
  name: string,
  token: string,
  organizationName: string
): Promise<boolean> {
  const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000";
  
  const magicLink = `${baseUrl}/portal/auth/verify?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Sign in to DoorSurvey Pro</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">DoorSurvey Pro</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Client Portal</p>
        </div>
        
        <div style="padding: 32px 24px;">
          <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Hi ${name},</p>
          
          <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.6;">
            Click the button below to sign in to the ${organizationName} service request portal. 
            This link will expire in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${magicLink}" 
               style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 15px;">
              Sign In to Portal
            </a>
          </div>
          
          <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
            If you didn't request this link, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          
          <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${magicLink}" style="color: #2563eb; word-break: break-all;">${magicLink}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await emailService.sendEmail({
      to: email,
      subject: `Sign in to ${organizationName} Portal`,
      html,
    });
    return result.success;
  } catch (error) {
    logError(error as Error, { context: "portal-magic-link", email });
    return false;
  }
}

router.post("/api/portal/auth/request-link", async (req: Request, res: Response) => {
  try {
    const parsed = requestMagicLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const { email, organizationId } = parsed.data;

    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, organizationId),
    });

    if (!org) {
      logger.warn("Portal auth: organization not found", { organizationId });
      return res.status(200).json({ 
        success: true, 
        message: "If the email is registered, a login link has been sent." 
      });
    }

    let portalUser = await db.query.portalUsers.findFirst({
      where: and(
        eq(schema.portalUsers.email, email.toLowerCase()),
        eq(schema.portalUsers.organizationId, organizationId)
      ),
    });

    if (!portalUser) {
      logger.warn("Portal auth: user not found", { email, organizationId });
      return res.status(200).json({ 
        success: true, 
        message: "If the email is registered, a login link has been sent." 
      });
    }

    if (portalUser.status !== "active") {
      logger.warn("Portal auth: inactive user attempted login", { email, organizationId });
      return res.status(200).json({ 
        success: true, 
        message: "If the email is registered, a login link has been sent." 
      });
    }

    const { token, tokenHash, tokenLookup } = generateMagicToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(schema.portalAuthTokens).values({
      portalUserId: portalUser.id,
      tokenHash,
      tokenLookup,
      expiresAt,
      ipAddress: req.ip || req.connection.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });

    const emailSent = await sendMagicLinkEmail(
      email,
      portalUser.name,
      token,
      org.name
    );

    if (!emailSent) {
      logger.error("Failed to send magic link email", { email, organizationId });
    }

    logSecurityEvent("portal_magic_link_requested", "low", {
      portalUserId: portalUser.id,
      email,
      organizationId,
      emailSent,
      ip: req.ip,
    });

    return res.status(200).json({ 
      success: true, 
      message: "If the email is registered, a login link has been sent." 
    });
  } catch (error) {
    logError(error as Error, { context: "portal-request-magic-link" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/portal/auth/verify", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token || token.length !== 64) {
      return res.redirect("/portal/login?error=invalid_link");
    }

    const tokenLookup = token.substring(0, 8);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const authToken = await db.query.portalAuthTokens.findFirst({
      where: and(
        eq(schema.portalAuthTokens.tokenLookup, tokenLookup),
        eq(schema.portalAuthTokens.isUsed, false),
        gte(schema.portalAuthTokens.expiresAt, new Date())
      ),
    });

    if (!authToken || authToken.tokenHash !== tokenHash) {
      logger.warn("Portal auth: invalid or expired token", { tokenLookup });
      return res.redirect("/portal/login?error=expired_link");
    }

    await db.update(schema.portalAuthTokens)
      .set({ 
        isUsed: true, 
        usedAt: new Date() 
      })
      .where(eq(schema.portalAuthTokens.id, authToken.id));

    const portalUser = await db.query.portalUsers.findFirst({
      where: eq(schema.portalUsers.id, authToken.portalUserId),
    });

    if (!portalUser || portalUser.status !== "active") {
      return res.redirect("/portal/login?error=account_inactive");
    }

    await db.update(schema.portalUsers)
      .set({ 
        lastLoginAt: new Date(),
        loginCount: (portalUser.loginCount || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(schema.portalUsers.id, portalUser.id));

    const sessionData: PortalSession = {
      portalUserId: portalUser.id,
      organizationId: portalUser.organizationId,
      email: portalUser.email,
      name: portalUser.name,
    };

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(schema.portalAuthTokens).values({
      portalUserId: portalUser.id,
      tokenHash: sessionHash,
      tokenLookup: sessionToken.substring(0, 8),
      expiresAt: sessionExpiry,
      ipAddress: req.ip || req.connection.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });

    res.cookie(PORTAL_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logSecurityEvent("portal_login_success", "low", {
      portalUserId: portalUser.id,
      email: portalUser.email,
      organizationId: portalUser.organizationId,
      ip: req.ip,
    });

    return res.redirect("/portal");
  } catch (error) {
    logError(error as Error, { context: "portal-verify-token" });
    return res.redirect("/portal/login?error=server_error");
  }
});

export async function portalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies?.[PORTAL_SESSION_COOKIE];
    
    if (!sessionToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const tokenLookup = sessionToken.substring(0, 8);
    const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");

    const session = await db.query.portalAuthTokens.findFirst({
      where: and(
        eq(schema.portalAuthTokens.tokenLookup, tokenLookup),
        gte(schema.portalAuthTokens.expiresAt, new Date())
      ),
    });

    if (!session || session.tokenHash !== tokenHash) {
      res.clearCookie(PORTAL_SESSION_COOKIE);
      return res.status(401).json({ error: "Session expired" });
    }

    const portalUser = await db.query.portalUsers.findFirst({
      where: and(
        eq(schema.portalUsers.id, session.portalUserId),
        eq(schema.portalUsers.status, "active")
      ),
    });

    if (!portalUser) {
      res.clearCookie(PORTAL_SESSION_COOKIE);
      return res.status(401).json({ error: "Account not found" });
    }

    (req as any).portalUser = portalUser;
    next();
  } catch (error) {
    logError(error as Error, { context: "portal-auth-middleware" });
    return res.status(500).json({ error: "Authentication error" });
  }
}

router.get("/api/portal/auth/me", portalAuth, async (req: Request, res: Response) => {
  const portalUser = (req as any).portalUser;
  
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, portalUser.organizationId),
  });

  return res.json({
    id: portalUser.id,
    email: portalUser.email,
    name: portalUser.name,
    phone: portalUser.phone,
    company: portalUser.company,
    role: portalUser.role,
    organizationId: portalUser.organizationId,
    organizationName: org?.name || "Unknown",
    lastLoginAt: portalUser.lastLoginAt,
  });
});

router.post("/api/portal/auth/logout", async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.[PORTAL_SESSION_COOKIE];
  
  if (sessionToken) {
    const tokenLookup = sessionToken.substring(0, 8);
    
    await db.update(schema.portalAuthTokens)
      .set({ expiresAt: new Date() })
      .where(eq(schema.portalAuthTokens.tokenLookup, tokenLookup));
  }

  res.clearCookie(PORTAL_SESSION_COOKIE);
  return res.json({ success: true });
});


router.post("/api/portal/users", async (req: Request, res: Response) => {
  try {
    const parsed = createPortalUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const { email, name, phone, company, organizationId } = parsed.data;

    const existingUser = await db.query.portalUsers.findFirst({
      where: and(
        eq(schema.portalUsers.email, email.toLowerCase()),
        eq(schema.portalUsers.organizationId, organizationId)
      ),
    });

    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const invitedById = (req as any).user?.id || null;

    const [portalUser] = await db.insert(schema.portalUsers).values({
      email: email.toLowerCase(),
      name,
      phone,
      company,
      organizationId,
      invitedBy: invitedById,
      status: "active",
    }).returning();

    logger.info("Portal user created", { 
      portalUserId: portalUser.id, 
      email, 
      organizationId 
    });

    return res.status(201).json(portalUser);
  } catch (error) {
    logError(error as Error, { context: "portal-create-user" });
    return res.status(500).json({ error: "Internal server error" });
  }
});


const createServiceRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  requestType: z.enum(["quote", "repair", "inspection", "emergency", "other"]).default("quote"),
  workOrderNumber: z.string().optional(),
  poNumber: z.string().optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  buildingName: z.string().optional(),
  floorLevel: z.string().optional(),
  accessNotes: z.string().optional(),
});

function generateRequestNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SR-${timestamp}-${random}`;
}

router.post("/api/portal/requests", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    
    const parsed = createServiceRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const requestNumber = generateRequestNumber();

    const [serviceRequest] = await db.insert(schema.serviceRequests).values({
      organizationId: portalUser.organizationId,
      requestNumber,
      portalUserId: portalUser.id,
      submitterName: portalUser.name,
      submitterEmail: portalUser.email,
      submitterPhone: portalUser.phone,
      submitterCompany: portalUser.company,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      requestType: parsed.data.requestType,
      workOrderNumber: parsed.data.workOrderNumber,
      poNumber: parsed.data.poNumber,
      locationName: parsed.data.locationName,
      locationAddress: parsed.data.locationAddress,
      buildingName: parsed.data.buildingName,
      floorLevel: parsed.data.floorLevel,
      accessNotes: parsed.data.accessNotes,
      status: "new",
    }).returning();

    logger.info("Service request created", { 
      requestId: serviceRequest.id,
      requestNumber,
      portalUserId: portalUser.id,
      organizationId: portalUser.organizationId
    });

    return res.status(201).json(serviceRequest);
  } catch (error) {
    logError(error as Error, { context: "portal-create-request" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/portal/requests", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;

    const requests = await db.query.serviceRequests.findMany({
      where: eq(schema.serviceRequests.portalUserId, portalUser.id),
      orderBy: desc(schema.serviceRequests.createdAt),
    });

    return res.json(requests);
  } catch (error) {
    logError(error as Error, { context: "portal-list-requests" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/portal/requests/:id", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const requestId = req.params.id;

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.portalUserId, portalUser.id)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const items = await db.query.serviceRequestItems.findMany({
      where: eq(schema.serviceRequestItems.serviceRequestId, requestId),
    });

    const notes = await db.query.serviceRequestNotes.findMany({
      where: and(
        eq(schema.serviceRequestNotes.serviceRequestId, requestId),
        eq(schema.serviceRequestNotes.noteType, "customer")
      ),
      orderBy: desc(schema.serviceRequestNotes.createdAt),
    });

    return res.json({
      ...serviceRequest,
      items,
      notes,
    });
  } catch (error) {
    logError(error as Error, { context: "portal-get-request" });
    return res.status(500).json({ error: "Internal server error" });
  }
});


const createServiceRequestItemSchema = z.object({
  doorLabel: z.string().optional(),
  locationHint: z.string().optional(),
  doorType: z.string().optional(),
  doorMaterial: z.string().optional(),
  approximateSize: z.string().optional(),
  conditionNotes: z.string().optional(),
  issueDescription: z.string().optional(),
  urgency: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  hardwareDetails: z.record(z.any()).optional(),
  accessControlDetails: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

router.post("/api/portal/requests/:id/items", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const requestId = req.params.id;

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.portalUserId, portalUser.id)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const parsed = createServiceRequestItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const existingItems = await db.query.serviceRequestItems.findMany({
      where: eq(schema.serviceRequestItems.serviceRequestId, requestId),
    });
    const itemNumber = existingItems.length + 1;

    const [item] = await db.insert(schema.serviceRequestItems).values({
      serviceRequestId: requestId,
      organizationId: portalUser.organizationId,
      itemNumber,
      ...parsed.data,
      status: "pending",
    }).returning();

    return res.status(201).json(item);
  } catch (error) {
    logError(error as Error, { context: "portal-create-request-item" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/portal/requests/:requestId/items/:itemId", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const { requestId, itemId } = req.params;

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.portalUserId, portalUser.id)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const parsed = createServiceRequestItemSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const [updated] = await db.update(schema.serviceRequestItems)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.serviceRequestItems.id, itemId),
        eq(schema.serviceRequestItems.serviceRequestId, requestId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.json(updated);
  } catch (error) {
    logError(error as Error, { context: "portal-update-request-item" });
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/api/portal/requests/:id/notes", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const requestId = req.params.id;

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.portalUserId, portalUser.id)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const { content } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required" });
    }

    const [note] = await db.insert(schema.serviceRequestNotes).values({
      serviceRequestId: requestId,
      organizationId: portalUser.organizationId,
      content,
      noteType: "customer",
      isPortalUser: true,
      portalUserId: portalUser.id,
      authorName: portalUser.name,
    }).returning();

    return res.status(201).json(note);
  } catch (error) {
    logError(error as Error, { context: "portal-create-note" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/portal/requests/:id/submit", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const requestId = req.params.id;

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.portalUserId, portalUser.id),
        eq(schema.serviceRequests.status, "new")
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found or already submitted" });
    }

    const items = await db.query.serviceRequestItems.findMany({
      where: eq(schema.serviceRequestItems.serviceRequestId, requestId),
    });

    let triageDecision: "quotable" | "needs_site_visit" | "pending" = "pending";
    let triageReason = "";

    if (items.length > 0) {
      const hasPhotos = items.some(item => {
        const photos = item.photos as any[] | null;
        return photos && photos.length > 0;
      });
      
      const hasLidarScans = items.some(item => item.lidarScanId !== null);
      const hasRequiredInfo = items.every(item => 
        item.doorType && item.approximateSize
      );

      if (hasRequiredInfo && (hasPhotos || hasLidarScans)) {
        triageDecision = "quotable";
        triageReason = "Request has sufficient information and media for quoting";
      } else if (!hasRequiredInfo) {
        triageDecision = "needs_site_visit";
        triageReason = "Missing door type or size information";
      } else if (!hasPhotos && !hasLidarScans) {
        triageDecision = "needs_site_visit";
        triageReason = "No photos or scans provided";
      }
    } else {
      triageDecision = "needs_site_visit";
      triageReason = "No door items specified";
    }

    const [updated] = await db.update(schema.serviceRequests)
      .set({
        status: "submitted",
        triageDecision,
        triageReason,
        triagedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.serviceRequests.id, requestId))
      .returning();

    logger.info("Service request submitted", {
      requestId,
      requestNumber: serviceRequest.requestNumber,
      triageDecision,
      itemCount: items.length,
    });

    notifySalesTeam(serviceRequest, updated, items, portalUser).catch(error => {
      logError(error as Error, { context: "portal-notify-sales-team" });
    });

    return res.json(updated);
  } catch (error) {
    logError(error as Error, { context: "portal-submit-request" });
    return res.status(500).json({ error: "Internal server error" });
  }
});


const staffTriageSchema = z.object({
  triageDecision: z.enum(["quotable", "needs_site_visit", "pending"]),
  triageReason: z.string().optional(),
  salesOwnerId: z.string().optional(),
});

const staffStatusSchema = z.object({
  status: z.enum(["new", "submitted", "in_review", "quoted", "scheduled", "completed", "cancelled"]),
});

router.get("/api/service-requests", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status, priority, limit = "50", offset = "0" } = req.query;

    let whereConditions = [eq(schema.serviceRequests.organizationId, user.organizationId)];
    
    if (status && status !== "all") {
      whereConditions.push(eq(schema.serviceRequests.status, status as string));
    }
    if (priority && priority !== "all") {
      whereConditions.push(eq(schema.serviceRequests.priority, priority as string));
    }

    const requests = await db.query.serviceRequests.findMany({
      where: and(...whereConditions),
      orderBy: [desc(schema.serviceRequests.createdAt)],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    const total = await db
      .select({ count: schema.serviceRequests.id })
      .from(schema.serviceRequests)
      .where(and(...whereConditions));

    return res.json({
      requests,
      total: total.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    logError(error as Error, { context: "staff-list-service-requests" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/service-requests/stats", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requests = await db.query.serviceRequests.findMany({
      where: eq(schema.serviceRequests.organizationId, user.organizationId),
    });

    const stats = {
      total: requests.length,
      byStatus: {
        new: requests.filter(r => r.status === "new").length,
        submitted: requests.filter(r => r.status === "submitted").length,
        in_review: requests.filter(r => r.status === "in_review").length,
        quoted: requests.filter(r => r.status === "quoted").length,
        scheduled: requests.filter(r => r.status === "scheduled").length,
        completed: requests.filter(r => r.status === "completed").length,
        cancelled: requests.filter(r => r.status === "cancelled").length,
      },
      byPriority: {
        low: requests.filter(r => r.priority === "low").length,
        normal: requests.filter(r => r.priority === "normal").length,
        high: requests.filter(r => r.priority === "high").length,
        urgent: requests.filter(r => r.priority === "urgent").length,
      },
      byTriage: {
        quotable: requests.filter(r => r.triageDecision === "quotable").length,
        needs_site_visit: requests.filter(r => r.triageDecision === "needs_site_visit").length,
        pending: requests.filter(r => r.triageDecision === "pending" || !r.triageDecision).length,
      },
    };

    return res.json(stats);
  } catch (error) {
    logError(error as Error, { context: "staff-service-request-stats" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/service-requests/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestId = req.params.id;

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.organizationId, user.organizationId)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const items = await db.query.serviceRequestItems.findMany({
      where: eq(schema.serviceRequestItems.serviceRequestId, requestId),
    });

    const notes = await db.query.serviceRequestNotes.findMany({
      where: eq(schema.serviceRequestNotes.serviceRequestId, requestId),
      orderBy: desc(schema.serviceRequestNotes.createdAt),
    });

    let portalUser = null;
    if (serviceRequest.portalUserId) {
      portalUser = await db.query.portalUsers.findFirst({
        where: eq(schema.portalUsers.id, serviceRequest.portalUserId),
      });
    }

    return res.json({
      ...serviceRequest,
      items,
      notes,
      portalUser: portalUser ? {
        id: portalUser.id,
        email: portalUser.email,
        name: portalUser.name,
        phone: portalUser.phone,
        company: portalUser.company,
      } : null,
    });
  } catch (error) {
    logError(error as Error, { context: "staff-get-service-request" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/service-requests/:id/triage", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestId = req.params.id;
    const parsed = staffTriageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.organizationId, user.organizationId)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const [updated] = await db.update(schema.serviceRequests)
      .set({
        triageDecision: parsed.data.triageDecision,
        triageReason: parsed.data.triageReason,
        triagedBy: user.id,
        triagedAt: new Date(),
        salesOwnerId: parsed.data.salesOwnerId,
        assignedAt: parsed.data.salesOwnerId ? new Date() : serviceRequest.assignedAt,
        status: "in_review",
        updatedAt: new Date(),
      })
      .where(eq(schema.serviceRequests.id, requestId))
      .returning();

    logger.info("Service request triaged", {
      requestId,
      requestNumber: serviceRequest.requestNumber,
      triageDecision: parsed.data.triageDecision,
      triagedBy: user.id,
    });

    return res.json(updated);
  } catch (error) {
    logError(error as Error, { context: "staff-triage-service-request" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/service-requests/:id/status", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestId = req.params.id;
    const parsed = staffStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.organizationId, user.organizationId)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const updateData: any = {
      status: parsed.data.status,
      updatedAt: new Date(),
    };

    if (parsed.data.status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await db.update(schema.serviceRequests)
      .set(updateData)
      .where(eq(schema.serviceRequests.id, requestId))
      .returning();

    logger.info("Service request status updated", {
      requestId,
      requestNumber: serviceRequest.requestNumber,
      status: parsed.data.status,
      updatedBy: user.id,
    });

    return res.json(updated);
  } catch (error) {
    logError(error as Error, { context: "staff-update-service-request-status" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/service-requests/:id/notes", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestId = req.params.id;
    const { content, noteType = "internal" } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required" });
    }

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.organizationId, user.organizationId)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const [note] = await db.insert(schema.serviceRequestNotes).values({
      serviceRequestId: requestId,
      organizationId: user.organizationId,
      content,
      noteType,
      authorId: user.id,
      authorName: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email,
      isPortalUser: false,
    }).returning();

    return res.status(201).json(note);
  } catch (error) {
    logError(error as Error, { context: "staff-create-service-request-note" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/service-requests/:id/link-project", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestId = req.params.id;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, requestId),
        eq(schema.serviceRequests.organizationId, user.organizationId)
      ),
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const project = await db.query.projects.findFirst({
      where: and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, user.organizationId)
      ),
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const [updated] = await db.update(schema.serviceRequests)
      .set({
        linkedProjectId: projectId,
        linkedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.serviceRequests.id, requestId))
      .returning();

    logger.info("Service request linked to project", {
      requestId,
      requestNumber: serviceRequest.requestNumber,
      projectId,
      linkedBy: user.id,
    });

    return res.json(updated);
  } catch (error) {
    logError(error as Error, { context: "staff-link-service-request-project" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

const portalLidarScanSchema = z.object({
  scanFormat: z.enum(["ply", "obj", "json"]),
  captureMethod: z.enum(["lidarkit", "arkit", "manual", "ios_lidar"]),
  captureNotes: z.string().optional(),
  deviceInfo: z.string().optional(),
  scanLabel: z.string().optional(),
  processedMetrics: z.object({
    frameWidthMm: z.number().optional(),
    frameHeightMm: z.number().optional(),
    leafWidthMm: z.number().optional(),
    leafHeightMm: z.number().optional(),
    swingDirection: z.enum(["left", "right", "double"]).optional(),
    hingeCount: z.number().optional(),
  }).optional(),
  confidenceScores: z.object({
    overall: z.number().optional(),
    dimensions: z.number().optional(),
    hardware: z.number().optional(),
  }).optional(),
});

router.post("/api/portal/items/:itemId/scans", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const itemId = req.params.itemId;

    const item = await db.query.serviceRequestItems.findFirst({
      where: eq(schema.serviceRequestItems.id, itemId),
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, item.serviceRequestId),
        eq(schema.serviceRequests.portalUserId, portalUser.id)
      ),
    });

    if (!serviceRequest) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (serviceRequest.status !== "new") {
      return res.status(400).json({ error: "Cannot add scans to submitted requests" });
    }

    const parsed = portalLidarScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid scan data", details: parsed.error.issues });
    }

    const scanId = crypto.randomUUID();
    const storageKey = `portal-scans/${serviceRequest.organizationId}/${serviceRequest.id}/${itemId}/${scanId}`;

    const [scan] = await db.insert(schema.lidarScans).values({
      id: scanId,
      organizationId: serviceRequest.organizationId,
      uploaderId: portalUser.id,
      serviceRequestId: serviceRequest.id,
      serviceRequestItemId: itemId,
      originalFilename: `scan_${Date.now()}.${parsed.data.scanFormat}`,
      storageKey,
      fileSizeBytes: 0,
      scanFormat: parsed.data.scanFormat,
      captureMethod: parsed.data.captureMethod,
      captureNotes: parsed.data.captureNotes,
      deviceInfo: parsed.data.deviceInfo,
      scanLabel: parsed.data.scanLabel,
      processedMetrics: parsed.data.processedMetrics,
      confidenceScores: parsed.data.confidenceScores,
      processingStatus: "processed",
      processingCompletedAt: new Date(),
    }).returning();

    await db.update(schema.serviceRequestItems)
      .set({
        lidarScanId: scanId,
        updatedAt: new Date(),
      })
      .where(eq(schema.serviceRequestItems.id, itemId));

    logger.info("Portal LiDAR scan created", {
      scanId,
      itemId,
      serviceRequestId: serviceRequest.id,
      captureMethod: parsed.data.captureMethod,
    });

    return res.status(201).json(scan);
  } catch (error) {
    logError(error as Error, { context: "portal-create-lidar-scan" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/portal/items/:itemId/scans", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const itemId = req.params.itemId;

    const item = await db.query.serviceRequestItems.findFirst({
      where: eq(schema.serviceRequestItems.id, itemId),
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, item.serviceRequestId),
        eq(schema.serviceRequests.portalUserId, portalUser.id)
      ),
    });

    if (!serviceRequest) {
      return res.status(403).json({ error: "Access denied" });
    }

    const scans = await db.query.lidarScans.findMany({
      where: eq(schema.lidarScans.serviceRequestItemId, itemId),
      orderBy: desc(schema.lidarScans.createdAt),
    });

    return res.json(scans);
  } catch (error) {
    logError(error as Error, { context: "portal-get-lidar-scans" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/portal/scans/:scanId", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const scanId = req.params.scanId;

    const scan = await db.query.lidarScans.findFirst({
      where: eq(schema.lidarScans.id, scanId),
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const serviceRequest = await db.query.serviceRequests.findFirst({
      where: and(
        eq(schema.serviceRequests.id, scan.serviceRequestId!),
        eq(schema.serviceRequests.portalUserId, portalUser.id)
      ),
    });

    if (!serviceRequest) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (serviceRequest.status !== "new") {
      return res.status(400).json({ error: "Cannot delete scans from submitted requests" });
    }

    if (scan.serviceRequestItemId) {
      await db.update(schema.serviceRequestItems)
        .set({
          lidarScanId: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.serviceRequestItems.id, scan.serviceRequestItemId));
    }

    await db.delete(schema.lidarScans).where(eq(schema.lidarScans.id, scanId));

    logger.info("Portal LiDAR scan deleted", {
      scanId,
      serviceRequestId: serviceRequest.id,
    });

    return res.status(204).send();
  } catch (error) {
    logError(error as Error, { context: "portal-delete-lidar-scan" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// PORTAL INVITATION SYSTEM - Staff endpoints to invite clients
// ============================================================================

const INVITATION_EXPIRY_DAYS = 7;

const portalInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  company: z.string().optional(),
  customerId: z.string().optional(),
  customerLocationId: z.string().optional(),
  role: z.enum(["client", "technician"]).default("client"),
  customMessage: z.string().optional(),
});

router.post("/api/portal-invitations", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = portalInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const { email, name, phone, company, customerId, customerLocationId, role, customMessage } = parsed.data;

    let existingPortalUser = await db.query.portalUsers.findFirst({
      where: and(
        eq(schema.portalUsers.organizationId, user.organizationId),
        eq(schema.portalUsers.email, email.toLowerCase())
      ),
    });

    if (!existingPortalUser) {
      const [newUser] = await db.insert(schema.portalUsers).values({
        organizationId: user.organizationId,
        email: email.toLowerCase(),
        name,
        phone,
        company,
        customerId,
        customerLocationId,
        role,
        invitedBy: user.id,
        status: "active",
      }).returning();
      existingPortalUser = newUser;
    } else {
      await db.update(schema.portalUsers)
        .set({
          name,
          phone,
          company,
          customerId: customerId || existingPortalUser.customerId,
          customerLocationId: customerLocationId || existingPortalUser.customerLocationId,
          updatedAt: new Date(),
        })
        .where(eq(schema.portalUsers.id, existingPortalUser.id));
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(token, 10);
    const tokenLookup = crypto.createHash("sha256").update(token).digest("hex");

    await db.insert(schema.portalAuthTokens).values({
      portalUserId: existingPortalUser.id,
      tokenHash,
      tokenLookup,
      expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await db.update(schema.portalUsers)
      .set({ invitationSentAt: new Date() })
      .where(eq(schema.portalUsers.id, existingPortalUser.id));

    const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000";

    const magicLink = `${baseUrl}/client-portal/login?token=${token}`;

    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, user.organizationId),
    });

    let customerName: string | undefined;
    if (customerId) {
      const customer = await db.query.customers.findFirst({
        where: eq(schema.customers.id, customerId),
      });
      customerName = customer?.name;
    }

    const inviterDisplayName = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email;
    const orgName = org?.name || "DoorSurvey Pro";

    const invitationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Client Portal Invitation</h1>
          </div>
          
          <div style="padding: 24px;">
            <p style="font-size: 16px; color: #333;">Hello ${name},</p>
            
            <p style="font-size: 16px; color: #333;">
              ${inviterDisplayName} from ${orgName} has invited you to access the Client Portal${customerName ? ` for ${customerName}` : ""}.
            </p>
            
            ${customMessage ? `<div style="background: #f1f5f9; border-radius: 6px; padding: 16px; margin: 16px 0;"><p style="color: #475569; font-style: italic; margin: 0;">${customMessage}</p></div>` : ""}
            
            <p style="font-size: 16px; color: #333;">The Client Portal allows you to:</p>
            <ul style="color: #475569;">
              <li>View your active projects and work in progress</li>
              <li>Track status updates and project milestones</li>
              <li>Access door opening history and specifications</li>
              <li>Submit new service requests</li>
              <li>Print and export reports</li>
            </ul>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${magicLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Accept Invitation & Access Portal</a>
            </div>
            
            <p style="font-size: 13px; color: #64748b; text-align: center;">
              This invitation link will expire in 7 days. If you need a new link, please contact ${orgName}.
            </p>
          </div>
          
          <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              If you didn't expect this invitation, please contact ${orgName} directly.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      to: email,
      subject: `You've been invited to the ${orgName} Portal`,
      html: invitationHtml,
    });

    logger.info("Portal invitation sent", {
      portalUserId: existingPortalUser.id,
      email,
      invitedBy: user.id,
      customerId,
      role,
    });

    return res.status(201).json({
      success: true,
      portalUserId: existingPortalUser.id,
      message: `Invitation sent to ${email}`,
    });
  } catch (error) {
    logError(error as Error, { context: "send-portal-invitation" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/portal-users", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { customerId, status } = req.query;

    let whereConditions = [eq(schema.portalUsers.organizationId, user.organizationId)];
    
    if (customerId && customerId !== "all") {
      whereConditions.push(eq(schema.portalUsers.customerId, customerId as string));
    }
    if (status && status !== "all") {
      whereConditions.push(eq(schema.portalUsers.status, status as string));
    }

    const portalUsers = await db.query.portalUsers.findMany({
      where: and(...whereConditions),
      orderBy: desc(schema.portalUsers.createdAt),
    });

    return res.json(portalUsers);
  } catch (error) {
    logError(error as Error, { context: "list-portal-users" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/portal-users/:id/resend-invitation", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const portalUserId = req.params.id;

    const portalUser = await db.query.portalUsers.findFirst({
      where: and(
        eq(schema.portalUsers.id, portalUserId),
        eq(schema.portalUsers.organizationId, user.organizationId)
      ),
    });

    if (!portalUser) {
      return res.status(404).json({ error: "Portal user not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(token, 10);
    const tokenLookup = crypto.createHash("sha256").update(token).digest("hex");

    await db.insert(schema.portalAuthTokens).values({
      portalUserId: portalUser.id,
      tokenHash,
      tokenLookup,
      expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await db.update(schema.portalUsers)
      .set({ invitationSentAt: new Date() })
      .where(eq(schema.portalUsers.id, portalUser.id));

    const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000";

    const magicLink = `${baseUrl}/client-portal/login?token=${token}`;

    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, user.organizationId),
    });

    const inviterDisplayName = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email;
    const orgName = org?.name || "DoorSurvey Pro";

    const resendHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Your Portal Access Link</h1>
          </div>
          
          <div style="padding: 24px;">
            <p style="font-size: 16px; color: #333;">Hello ${portalUser.name},</p>
            
            <p style="font-size: 16px; color: #333;">
              Here is your new access link to the ${orgName} Client Portal.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${magicLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Access Portal</a>
            </div>
            
            <p style="font-size: 13px; color: #64748b; text-align: center;">
              This link will expire in 7 days.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      to: portalUser.email,
      subject: `Your ${orgName} Portal access link`,
      html: resendHtml,
    });

    logger.info("Portal invitation resent", {
      portalUserId: portalUser.id,
      email: portalUser.email,
      resentBy: user.id,
    });

    return res.json({
      success: true,
      message: `Invitation resent to ${portalUser.email}`,
    });
  } catch (error) {
    logError(error as Error, { context: "resend-portal-invitation" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// CLIENT PROJECT VISIBILITY - Portal users can view their linked projects
// ============================================================================

router.get("/api/portal/my-projects", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;

    const serviceRequests = await db.query.serviceRequests.findMany({
      where: and(
        eq(schema.serviceRequests.organizationId, portalUser.organizationId),
        eq(schema.serviceRequests.portalUserId, portalUser.id)
      ),
      with: {
        linkedProject: true,
      },
      orderBy: desc(schema.serviceRequests.createdAt),
    });

    const projectIds = serviceRequests
      .filter(sr => sr.linkedProjectId)
      .map(sr => sr.linkedProjectId!);

    let projects: any[] = [];
    if (projectIds.length > 0) {
      projects = await db.query.projects.findMany({
        where: and(
          eq(schema.projects.organizationId, portalUser.organizationId),
        ),
      });
      projects = projects.filter(p => projectIds.includes(p.id));
    }

    if (portalUser.customerId) {
      const customerProjects = await db.query.projects.findMany({
        where: and(
          eq(schema.projects.organizationId, portalUser.organizationId),
          eq(schema.projects.customerId, portalUser.customerId)
        ),
      });
      
      const existingIds = new Set(projects.map(p => p.id));
      customerProjects.forEach(cp => {
        if (!existingIds.has(cp.id)) {
          projects.push(cp);
        }
      });
    }

    const projectsWithSummary = await Promise.all(projects.map(async (project) => {
      const openings = await db.query.doorOpenings.findMany({
        where: eq(schema.doorOpenings.projectId, project.id),
      });

      return {
        ...project,
        summary: {
          totalOpenings: openings.length,
          statusCounts: { active: openings.length },
          lastUpdated: openings.length > 0 
            ? openings.reduce((latest, o) => 
                o.createdAt > latest ? o.createdAt : latest, 
                openings[0].createdAt
              )
            : project.updatedAt,
        },
      };
    }));

    return res.json({
      serviceRequests: serviceRequests.map(sr => ({
        id: sr.id,
        requestNumber: sr.requestNumber,
        title: sr.title,
        status: sr.status,
        priority: sr.priority,
        triageDecision: sr.triageDecision,
        createdAt: sr.createdAt,
        linkedProjectId: sr.linkedProjectId,
      })),
      projects: projectsWithSummary,
    });
  } catch (error) {
    logError(error as Error, { context: "portal-my-projects" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/portal/projects/:id", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const projectId = req.params.id;

    const project = await db.query.projects.findFirst({
      where: and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, portalUser.organizationId)
      ),
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    let customerName: string | undefined;
    let locationDetails: { locationName?: string; address?: string; city?: string; state?: string } = {};
    
    if (project.customerId) {
      const customer = await db.query.customers.findFirst({
        where: eq(schema.customers.id, project.customerId),
      });
      customerName = customer?.name;
    }
    
    if (project.locationId) {
      const location = await db.query.customerLocations.findFirst({
        where: eq(schema.customerLocations.id, project.locationId),
      });
      if (location) {
        locationDetails = {
          locationName: location.locationName,
          address: location.address ?? undefined,
          city: location.city ?? undefined,
          state: location.state ?? undefined,
        };
      }
    }

    const hasAccess = project.customerId === portalUser.customerId ||
      await db.query.serviceRequests.findFirst({
        where: and(
          eq(schema.serviceRequests.linkedProjectId, projectId),
          eq(schema.serviceRequests.portalUserId, portalUser.id)
        ),
      });

    if (!hasAccess && project.customerId !== portalUser.customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const openings = await db.query.doorOpenings.findMany({
      where: eq(schema.doorOpenings.projectId, projectId),
      orderBy: desc(schema.doorOpenings.createdAt),
    });

    const activities = await db.query.projectActivities.findMany({
      where: eq(schema.projectActivities.projectId, projectId),
      orderBy: desc(schema.projectActivities.createdAt),
      limit: 20,
    });

    return res.json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        customerName,
        ...locationDetails,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      summary: {
        totalOpenings: openings.length,
        statusCounts: { active: openings.length },
        completedPercentage: 0,
      },
      openings: openings.map(o => ({
        id: o.id,
        openingNumber: o.openingNumber,
        floor: o.floor,
        room: o.roomName || o.roomNumber,
        doorType: o.doorType,
        location: o.location,
        createdAt: o.createdAt,
      })),
      recentActivity: activities.map(a => ({
        id: a.id,
        type: a.activityType,
        description: a.description,
        actorName: a.actorName,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    logError(error as Error, { context: "portal-project-detail" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Export project as PDF
router.get("/api/portal/projects/:id/export-pdf", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const projectId = req.params.id;

    const project = await db.query.projects.findFirst({
      where: and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, portalUser.organizationId)
      ),
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    let customerName: string | undefined;
    let locationDetails: { locationName?: string; address?: string; city?: string; state?: string } = {};
    
    if (project.customerId) {
      const customer = await db.query.customers.findFirst({
        where: eq(schema.customers.id, project.customerId),
      });
      customerName = customer?.name;
    }
    
    if (project.locationId) {
      const location = await db.query.customerLocations.findFirst({
        where: eq(schema.customerLocations.id, project.locationId),
      });
      if (location) {
        locationDetails = {
          locationName: location.locationName,
          address: location.address ?? undefined,
          city: location.city ?? undefined,
          state: location.state ?? undefined,
        };
      }
    }

    const hasAccess = project.customerId === portalUser.customerId ||
      await db.query.serviceRequests.findFirst({
        where: and(
          eq(schema.serviceRequests.linkedProjectId, projectId),
          eq(schema.serviceRequests.portalUserId, portalUser.id)
        ),
      });

    if (!hasAccess && project.customerId !== portalUser.customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const openings = await db.query.doorOpenings.findMany({
      where: eq(schema.doorOpenings.projectId, projectId),
      orderBy: desc(schema.doorOpenings.createdAt),
    });

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="project-${project.name.replace(/[^a-zA-Z0-9]/g, "-")}.pdf"`);
    
    doc.pipe(res);

    doc.fontSize(24).font("Helvetica-Bold").text("Project Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(16).font("Helvetica").text(project.name, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(14).font("Helvetica-Bold").text("Project Information");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Customer: ${customerName || "—"}`);
    doc.text(`Status: ${project.status.replace(/_/g, " ")}`);
    if (locationDetails.locationName) {
      doc.text(`Location: ${locationDetails.locationName}`);
    }
    if (locationDetails.address) {
      doc.text(`Address: ${locationDetails.address}`);
      if (locationDetails.city || locationDetails.state) {
        doc.text(`         ${[locationDetails.city, locationDetails.state].filter(Boolean).join(", ")}`);
      }
    }
    doc.text(`Created: ${new Date(project.createdAt).toLocaleDateString()}`);
    doc.text(`Last Updated: ${new Date(project.updatedAt || project.createdAt).toLocaleDateString()}`);
    doc.moveDown(2);

    doc.fontSize(14).font("Helvetica-Bold").text(`Door Openings (${openings.length})`);
    doc.moveDown(0.5);

    if (openings.length === 0) {
      doc.fontSize(11).font("Helvetica-Oblique").text("No door openings recorded");
    } else {
      const tableTop = doc.y;
      const colWidths = [50, 150, 60, 80, 100];
      const headers = ["#", "Location", "Floor", "Room", "Door Type"];
      
      doc.fontSize(10).font("Helvetica-Bold");
      let x = 50;
      headers.forEach((h, i) => {
        doc.text(h, x, tableTop, { width: colWidths[i] });
        x += colWidths[i];
      });

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      doc.font("Helvetica").fontSize(9);
      let y = tableTop + 20;
      
      openings.forEach((opening) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        
        x = 50;
        doc.text(opening.openingNumber, x, y, { width: colWidths[0] });
        x += colWidths[0];
        doc.text(opening.location || "—", x, y, { width: colWidths[1] });
        x += colWidths[1];
        doc.text(opening.floor || "—", x, y, { width: colWidths[2] });
        x += colWidths[2];
        doc.text(opening.roomName || opening.roomNumber || "—", x, y, { width: colWidths[3] });
        x += colWidths[3];
        doc.text(opening.doorType || "—", x, y, { width: colWidths[4] });
        
        y += 15;
      });
    }

    doc.moveDown(3);
    doc.fontSize(9).font("Helvetica-Oblique").fillColor("gray");
    doc.text(`Generated by DoorSurvey Pro Client Portal on ${new Date().toLocaleDateString()}`, 50, doc.y, { align: "center" });

    doc.end();
  } catch (error) {
    logError(error as Error, { context: "portal-project-export-pdf" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// TECHNICIAN QUOTE REQUEST - Add doors to be quoted with salesperson notification
// ============================================================================

const technicianQuoteRequestSchema = z.object({
  projectId: z.string().optional(),
  locationName: z.string().min(1),
  locationAddress: z.string().optional(),
  buildingName: z.string().optional(),
  floorLevel: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  notes: z.string().optional(),
  doors: z.array(z.object({
    doorLabel: z.string().optional(),
    locationHint: z.string().optional(),
    doorType: z.enum(["single", "double", "sliding", "revolving", "overhead", "other"]).optional(),
    doorMaterial: z.enum(["wood", "metal", "glass", "hollow_metal", "fiberglass", "other"]).optional(),
    approximateSize: z.string().optional(),
    conditionNotes: z.string().optional(),
    issueDescription: z.string().optional(),
    urgency: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  })).min(1),
});

router.post("/api/portal/technician-quote-request", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;

    if (portalUser.role !== "technician") {
      return res.status(403).json({ error: "Only technicians can submit quote requests" });
    }

    const parsed = technicianQuoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const { projectId, locationName, locationAddress, buildingName, floorLevel, priority, notes, doors } = parsed.data;

    const lastRequest = await db.query.serviceRequests.findFirst({
      where: eq(schema.serviceRequests.organizationId, portalUser.organizationId),
      orderBy: desc(schema.serviceRequests.requestNumber),
    });

    let nextNumber = 1;
    if (lastRequest?.requestNumber) {
      const match = lastRequest.requestNumber.match(/SR-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const requestNumber = `SR-${String(nextNumber).padStart(4, "0")}`;

    const [serviceRequest] = await db.insert(schema.serviceRequests).values({
      organizationId: portalUser.organizationId,
      requestNumber,
      portalUserId: portalUser.id,
      submitterName: portalUser.name,
      submitterEmail: portalUser.email,
      submitterPhone: portalUser.phone,
      submitterCompany: portalUser.company,
      title: `Quote Request from ${portalUser.name}`,
      description: notes,
      priority,
      requestType: "quote",
      locationName,
      locationAddress,
      buildingName,
      floorLevel,
      status: "submitted",
      triageDecision: "quotable",
      triageReason: "Technician quote request - ready for salesperson review",
      triagedAt: new Date(),
      linkedProjectId: projectId,
    }).returning();

    const itemValues = doors.map((door, index) => ({
      serviceRequestId: serviceRequest.id,
      organizationId: portalUser.organizationId,
      itemNumber: index + 1,
      doorLabel: door.doorLabel,
      locationHint: door.locationHint,
      doorType: door.doorType,
      doorMaterial: door.doorMaterial,
      approximateSize: door.approximateSize,
      conditionNotes: door.conditionNotes,
      issueDescription: door.issueDescription,
      urgency: door.urgency,
      status: "pending" as const,
    }));

    await db.insert(schema.serviceRequestItems).values(itemValues);

    const items = await db.query.serviceRequestItems.findMany({
      where: eq(schema.serviceRequestItems.serviceRequestId, serviceRequest.id),
    });

    notifySalesTeam(serviceRequest, serviceRequest, items, portalUser).catch(error => {
      logError(error as Error, { context: "technician-notify-sales-team" });
    });

    logger.info("Technician quote request submitted", {
      requestId: serviceRequest.id,
      requestNumber,
      technicianId: portalUser.id,
      doorCount: doors.length,
      priority,
    });

    return res.status(201).json({
      success: true,
      requestId: serviceRequest.id,
      requestNumber,
      message: "Quote request submitted. Sales team has been notified.",
    });
  } catch (error) {
    logError(error as Error, { context: "technician-quote-request" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// MANAGER DASHBOARD - Summary of all submissions with follow-up warnings
// ============================================================================

router.get("/api/manager/submissions-summary", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, user.id),
        eq(schema.memberships.organizationId, user.organizationId)
      ),
    });

    if (!membership || !["owner", "admin", "manager"].includes(membership.role)) {
      return res.status(403).json({ error: "Manager access required" });
    }

    const serviceRequests = await db.query.serviceRequests.findMany({
      where: eq(schema.serviceRequests.organizationId, user.organizationId),
      with: {
        portalUser: true,
        salesOwner: true,
        items: true,
      },
      orderBy: desc(schema.serviceRequests.createdAt),
    });

    const now = new Date();
    const WARNING_HOURS = 24;
    const CRITICAL_HOURS = 48;

    const requestsWithWarnings = serviceRequests.map(sr => {
      const hoursSinceSubmission = (now.getTime() - new Date(sr.requestedAt).getTime()) / (1000 * 60 * 60);
      
      let warningLevel: "none" | "warning" | "critical" = "none";
      let warningMessage = "";

      if (sr.status === "submitted" || sr.status === "new") {
        if (hoursSinceSubmission > CRITICAL_HOURS) {
          warningLevel = "critical";
          warningMessage = `No action for ${Math.round(hoursSinceSubmission)} hours`;
        } else if (hoursSinceSubmission > WARNING_HOURS) {
          warningLevel = "warning";
          warningMessage = `Pending for ${Math.round(hoursSinceSubmission)} hours`;
        }
      } else if (sr.status === "in_review" && !sr.salesOwnerId) {
        warningLevel = "warning";
        warningMessage = "No sales owner assigned";
      }

      return {
        id: sr.id,
        requestNumber: sr.requestNumber,
        title: sr.title,
        status: sr.status,
        priority: sr.priority,
        triageDecision: sr.triageDecision,
        submitterName: sr.submitterName,
        submitterCompany: sr.submitterCompany,
        salesOwner: sr.salesOwner ? {
          id: sr.salesOwner.id,
          name: sr.salesOwner.firstName ? `${sr.salesOwner.firstName} ${sr.salesOwner.lastName || ""}`.trim() : sr.salesOwner.email,
        } : null,
        itemCount: sr.items?.length || 0,
        requestedAt: sr.requestedAt,
        triagedAt: sr.triagedAt,
        completedAt: sr.completedAt,
        warningLevel,
        warningMessage,
        hoursSinceSubmission: Math.round(hoursSinceSubmission),
      };
    });

    const statusCounts = {
      new: 0,
      submitted: 0,
      in_review: 0,
      quoted: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
    };
    serviceRequests.forEach(sr => {
      if (sr.status in statusCounts) {
        statusCounts[sr.status as keyof typeof statusCounts]++;
      }
    });

    const priorityCounts = {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    };
    serviceRequests.forEach(sr => {
      if (sr.priority in priorityCounts) {
        priorityCounts[sr.priority as keyof typeof priorityCounts]++;
      }
    });

    const warningCounts = {
      none: requestsWithWarnings.filter(r => r.warningLevel === "none").length,
      warning: requestsWithWarnings.filter(r => r.warningLevel === "warning").length,
      critical: requestsWithWarnings.filter(r => r.warningLevel === "critical").length,
    };

    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeekCount = serviceRequests.filter(sr => new Date(sr.createdAt) >= thisWeek).length;
    const lastWeekCount = serviceRequests.filter(sr => 
      new Date(sr.createdAt) >= lastWeek && new Date(sr.createdAt) < thisWeek
    ).length;

    return res.json({
      summary: {
        total: serviceRequests.length,
        statusCounts,
        priorityCounts,
        warningCounts,
        trend: {
          thisWeek: thisWeekCount,
          lastWeek: lastWeekCount,
          change: thisWeekCount - lastWeekCount,
        },
      },
      requests: requestsWithWarnings,
    });
  } catch (error) {
    logError(error as Error, { context: "manager-submissions-summary" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/manager/follow-up-alerts", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, user.id),
        eq(schema.memberships.organizationId, user.organizationId)
      ),
    });

    if (!membership || !["owner", "admin", "manager"].includes(membership.role)) {
      return res.status(403).json({ error: "Manager access required" });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const pendingRequests = await db.query.serviceRequests.findMany({
      where: and(
        eq(schema.serviceRequests.organizationId, user.organizationId),
      ),
      with: {
        portalUser: true,
        salesOwner: true,
      },
      orderBy: desc(schema.serviceRequests.requestedAt),
    });

    const alerts = pendingRequests
      .filter(sr => {
        const isPending = ["new", "submitted", "in_review"].includes(sr.status);
        const isOld = new Date(sr.requestedAt) < twentyFourHoursAgo;
        const noOwner = sr.status === "in_review" && !sr.salesOwnerId;
        return isPending && (isOld || noOwner);
      })
      .map(sr => {
        const hoursSince = Math.round((now.getTime() - new Date(sr.requestedAt).getTime()) / (1000 * 60 * 60));
        
        let alertType: "no_response" | "no_owner" | "stale" = "stale";
        let alertMessage = `Request pending for ${hoursSince} hours`;

        if (sr.status === "new" || sr.status === "submitted") {
          alertType = "no_response";
          alertMessage = `No response for ${hoursSince} hours`;
        } else if (sr.status === "in_review" && !sr.salesOwnerId) {
          alertType = "no_owner";
          alertMessage = "In review but no sales owner assigned";
        }

        return {
          id: sr.id,
          requestNumber: sr.requestNumber,
          title: sr.title,
          status: sr.status,
          priority: sr.priority,
          submitterName: sr.submitterName,
          submitterEmail: sr.submitterEmail,
          requestedAt: sr.requestedAt,
          hoursSinceSubmission: hoursSince,
          alertType,
          alertMessage,
          salesOwner: sr.salesOwner ? {
            id: sr.salesOwner.id,
            name: sr.salesOwner.firstName ? `${sr.salesOwner.firstName} ${sr.salesOwner.lastName || ""}`.trim() : sr.salesOwner.email,
          } : null,
        };
      });

    return res.json({
      alertCount: alerts.length,
      alerts,
    });
  } catch (error) {
    logError(error as Error, { context: "manager-follow-up-alerts" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// SITE WALK SCHEDULING - Calendar integration and appointment booking
// ============================================================================

import { calendarService } from "../services/calendar.service";
import { travelTimeService } from "../services/travel-time.service";

const MINIMUM_LEAD_TIME_HOURS = 4;

async function validateLocationOwnership(locationId: string, portalUser: any): Promise<{
  valid: boolean;
  location?: any;
  error?: string;
}> {
  const [row] = await db.select({ location: schema.customerLocations })
    .from(schema.customerLocations)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.customerLocations.customerId))
    .where(and(
      eq(schema.customerLocations.id, locationId),
      eq(schema.customers.organizationId, portalUser.organizationId)
    )).limit(1);
  const location = row?.location;

  if (!location) {
    return { valid: false, error: "Location not found" };
  }

  if (portalUser.customerId && location.customerId !== portalUser.customerId) {
    return { valid: false, error: "Access denied to this location" };
  }

  return { valid: true, location };
}

async function validateProjectOwnership(projectId: string, portalUser: any): Promise<{
  valid: boolean;
  project?: any;
  error?: string;
}> {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(schema.projects.id, projectId),
      eq(schema.projects.organizationId, portalUser.organizationId)
    ),
  });

  if (!project) {
    return { valid: false, error: "Project not found" };
  }

  if (portalUser.customerId && project.customerId !== portalUser.customerId) {
    return { valid: false, error: "Access denied to this project" };
  }

  return { valid: true, project };
}

// Get available time slots for scheduling
router.get("/api/portal/site-walk/availability", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const { projectId, locationId, from, to, duration } = req.query;

    const now = new Date();
    const minStartDate = new Date(now.getTime() + MINIMUM_LEAD_TIME_HOURS * 60 * 60 * 1000);
    let startDate = from ? new Date(from as string) : minStartDate;
    
    if (startDate < minStartDate) {
      startDate = minStartDate;
    }
    
    const endDate = to ? new Date(to as string) : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const slotDuration = parseInt(duration as string) || 60;

    let travelMinutes = 0;
    let locationDetails = null;

    if (locationId) {
      const validation = await validateLocationOwnership(locationId as string, portalUser);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }

      const location = validation.location;
      locationDetails = {
        id: location.id,
        name: location.locationName,
        address: location.address,
        city: location.city,
        state: location.state,
        zip: location.zip,
      };

      const travelResult = await travelTimeService.getTravelTimeToLocation(
        portalUser.organizationId,
        {
          address: location.address ?? undefined,
          city: location.city ?? undefined,
          state: location.state ?? undefined,
          zip: location.zip ?? undefined,
        }
      );
      travelMinutes = travelResult.durationMinutes;
    }

    if (projectId) {
      const validation = await validateProjectOwnership(projectId as string, portalUser);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }
    }

    const slots = await calendarService.getAvailableSlots(
      portalUser.organizationId,
      locationId as string || null,
      startDate,
      endDate,
      slotDuration,
      travelMinutes
    );

    const availableSlots = slots
      .filter(s => s.available && s.start >= minStartDate)
      .map(s => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        travelMinutes: s.travelMinutes,
      }));

    return res.json({
      location: locationDetails,
      travelMinutes,
      slotDuration,
      availableSlots,
      totalSlots: slots.length,
      availableCount: availableSlots.length,
      minimumLeadTimeHours: MINIMUM_LEAD_TIME_HOURS,
    });
  } catch (error) {
    logError(error as Error, { context: "portal-site-walk-availability" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Check if a specific time slot is available
router.post("/api/portal/site-walk/check-availability", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const { start, end, locationId } = req.body;

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end times are required" });
    }

    const startDate = new Date(start);
    const now = new Date();
    const minStartDate = new Date(now.getTime() + MINIMUM_LEAD_TIME_HOURS * 60 * 60 * 1000);

    if (startDate < minStartDate) {
      return res.json({
        available: false,
        travelMinutes: 0,
        conflictReason: `Appointments must be scheduled at least ${MINIMUM_LEAD_TIME_HOURS} hours in advance`,
      });
    }

    let travelMinutes = 0;
    if (locationId) {
      const validation = await validateLocationOwnership(locationId, portalUser);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }

      const location = validation.location;
      const travelResult = await travelTimeService.getTravelTimeToLocation(
        portalUser.organizationId,
        {
          address: location.address ?? undefined,
          city: location.city ?? undefined,
          state: location.state ?? undefined,
          zip: location.zip ?? undefined,
        }
      );
      travelMinutes = travelResult.durationMinutes;
    }

    const conflict = await calendarService.checkConflicts(
      portalUser.organizationId,
      new Date(start),
      new Date(end),
      travelMinutes
    );

    return res.json({
      available: !conflict.hasConflict,
      travelMinutes,
      conflictReason: conflict.reason,
    });
  } catch (error) {
    logError(error as Error, { context: "portal-site-walk-check-availability" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Book a site walk appointment
const siteWalkBookingSchema = z.object({
  projectId: z.string().optional(),
  locationId: z.string().optional(),
  start: z.string(),
  end: z.string(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  locationZip: z.string().optional(),
  clientNotes: z.string().optional(),
});

router.post("/api/portal/site-walk/book", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;

    const parsed = siteWalkBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid booking data", 
        details: parsed.error.flatten().fieldErrors 
      });
    }

    const { projectId, locationId, start, end, clientNotes, ...locationOverrides } = parsed.data;

    const startDate = new Date(start);
    const now = new Date();
    const minStartDate = new Date(now.getTime() + MINIMUM_LEAD_TIME_HOURS * 60 * 60 * 1000);

    if (startDate < minStartDate) {
      return res.status(400).json({
        error: `Appointments must be scheduled at least ${MINIMUM_LEAD_TIME_HOURS} hours in advance`,
      });
    }

    if (projectId) {
      const validation = await validateProjectOwnership(projectId, portalUser);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }
    }

    let locationDetails = {
      locationName: locationOverrides.locationName,
      locationAddress: locationOverrides.locationAddress,
      locationCity: locationOverrides.locationCity,
      locationState: locationOverrides.locationState,
      locationZip: locationOverrides.locationZip,
    };

    let travelMinutes = 0;

    if (locationId) {
      const validation = await validateLocationOwnership(locationId, portalUser);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }

      const location = validation.location;
      locationDetails = {
        locationName: location.locationName,
        locationAddress: location.address ?? undefined,
        locationCity: location.city ?? undefined,
        locationState: location.state ?? undefined,
        locationZip: location.zip ?? undefined,
      };

      const travelResult = await travelTimeService.getTravelTimeToLocation(
        portalUser.organizationId,
        {
          address: location.address ?? undefined,
          city: location.city ?? undefined,
          state: location.state ?? undefined,
          zip: location.zip ?? undefined,
        }
      );
      travelMinutes = travelResult.durationMinutes;
    }

    const conflict = await calendarService.checkConflicts(
      portalUser.organizationId,
      new Date(start),
      new Date(end),
      travelMinutes
    );

    if (conflict.hasConflict) {
      return res.status(409).json({
        error: "Time slot not available",
        conflictReason: conflict.reason,
      });
    }

    const { appointment, eventId } = await calendarService.createAppointment({
      organizationId: portalUser.organizationId,
      projectId,
      customerLocationId: locationId,
      portalUserId: portalUser.id,
      scheduledStart: new Date(start),
      scheduledEnd: new Date(end),
      travelMinutes,
      ...locationDetails,
      clientName: portalUser.name,
      clientEmail: portalUser.email,
      clientPhone: portalUser.phone,
      clientNotes,
    });

    logger.info("Site walk appointment booked via portal", {
      appointmentId: appointment.id,
      portalUserId: portalUser.id,
      projectId,
      externalEventId: eventId,
    });

    return res.status(201).json({
      success: true,
      appointment: {
        id: appointment.id,
        scheduledStart: appointment.scheduledStart,
        scheduledEnd: appointment.scheduledEnd,
        status: appointment.status,
        locationName: appointment.locationName,
        travelMinutes: appointment.travelMinutes,
      },
      calendarSynced: !!eventId,
    });
  } catch (error) {
    logError(error as Error, { context: "portal-site-walk-book" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get portal user's site walk appointments
router.get("/api/portal/site-walk/my-appointments", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const { status, from, to } = req.query;

    let whereConditions = and(
      eq(schema.siteWalkAppointments.organizationId, portalUser.organizationId),
      eq(schema.siteWalkAppointments.portalUserId, portalUser.id)
    );

    if (status && status !== "all") {
      whereConditions = and(
        whereConditions,
        eq(schema.siteWalkAppointments.status, status as string)
      );
    }

    if (from) {
      whereConditions = and(
        whereConditions,
        gte(schema.siteWalkAppointments.scheduledStart, new Date(from as string))
      );
    }

    if (to) {
      whereConditions = and(
        whereConditions,
        lte(schema.siteWalkAppointments.scheduledEnd, new Date(to as string))
      );
    }

    const appointments = await db.query.siteWalkAppointments.findMany({
      where: whereConditions,
      orderBy: desc(schema.siteWalkAppointments.scheduledStart),
    });

    return res.json({
      appointments: appointments.map(a => ({
        id: a.id,
        scheduledStart: a.scheduledStart,
        scheduledEnd: a.scheduledEnd,
        status: a.status,
        locationName: a.locationName,
        locationAddress: a.locationAddress,
        locationCity: a.locationCity,
        locationState: a.locationState,
        travelMinutes: a.travelMinutes,
        notes: a.notes,
        clientNotes: a.clientNotes,
        confirmedAt: a.confirmedAt,
        completedAt: a.completedAt,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    logError(error as Error, { context: "portal-site-walk-my-appointments" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel a site walk appointment
router.post("/api/portal/site-walk/cancel/:id", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    const appointmentId = req.params.id;

    const appointment = await db.query.siteWalkAppointments.findFirst({
      where: and(
        eq(schema.siteWalkAppointments.id, appointmentId),
        eq(schema.siteWalkAppointments.organizationId, portalUser.organizationId),
        eq(schema.siteWalkAppointments.portalUserId, portalUser.id)
      ),
    });

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    if (appointment.status === "cancelled" || appointment.status === "completed") {
      return res.status(400).json({ error: "Cannot cancel this appointment" });
    }

    await calendarService.cancelAppointment(appointmentId, portalUser.organizationId);

    logger.info("Site walk appointment cancelled via portal", {
      appointmentId,
      portalUserId: portalUser.id,
    });

    return res.json({
      success: true,
      message: "Appointment cancelled",
    });
  } catch (error) {
    logError(error as Error, { context: "portal-site-walk-cancel" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// STAFF AVAILABILITY MANAGEMENT - Block out times and manage calendar
// ============================================================================

// Get availability blocks (staff route)
router.get("/api/site-walk/blocks", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { from, to } = req.query;

    const startDate = from ? new Date(from as string) : new Date();
    const endDate = to ? new Date(to as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const blocks = await db.query.availabilityBlocks.findMany({
      where: and(
        eq(schema.availabilityBlocks.organizationId, user.organizationId),
        eq(schema.availabilityBlocks.isActive, true),
        lte(schema.availabilityBlocks.startAt, endDate),
        gte(schema.availabilityBlocks.endAt, startDate)
      ),
      orderBy: [desc(schema.availabilityBlocks.startAt)],
    });

    return res.json({
      blocks: blocks.map(b => ({
        id: b.id,
        startAt: b.startAt,
        endAt: b.endAt,
        allDay: b.allDay,
        reason: b.reason,
        blockType: b.blockType,
        recurrenceRule: b.recurrenceRule,
        appliesToOrgWide: b.appliesToOrgWide,
        locationId: b.locationId,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    logError(error as Error, { context: "site-walk-get-blocks" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create availability block
const createBlockSchema = z.object({
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean().optional().default(false),
  reason: z.string().optional(),
  blockType: z.enum(["unavailable", "vacation", "meeting", "lunch", "travel", "other"]).optional().default("unavailable"),
  recurrenceRule: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  appliesToOrgWide: z.boolean().optional().default(false),
  locationId: z.string().optional(),
});

router.post("/api/site-walk/blocks", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = createBlockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid block data", 
        details: parsed.error.flatten().fieldErrors 
      });
    }

    const { startAt, endAt, recurrenceEndDate, ...rest } = parsed.data;

    const [block] = await db.insert(schema.availabilityBlocks)
      .values({
        organizationId: user.organizationId,
        createdByUserId: user.id,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        ...rest,
      })
      .returning();

    logger.info("Availability block created", {
      blockId: block.id,
      userId: user.id,
      blockType: rest.blockType,
    });

    return res.status(201).json({
      success: true,
      block: {
        id: block.id,
        startAt: block.startAt,
        endAt: block.endAt,
        blockType: block.blockType,
        reason: block.reason,
      },
    });
  } catch (error) {
    logError(error as Error, { context: "site-walk-create-block" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete availability block
router.delete("/api/site-walk/blocks/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const blockId = req.params.id;

    const block = await db.query.availabilityBlocks.findFirst({
      where: and(
        eq(schema.availabilityBlocks.id, blockId),
        eq(schema.availabilityBlocks.organizationId, user.organizationId)
      ),
    });

    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    await db.update(schema.availabilityBlocks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.availabilityBlocks.id, blockId));

    logger.info("Availability block deleted", {
      blockId,
      userId: user.id,
    });

    return res.json({
      success: true,
      message: "Block removed",
    });
  } catch (error) {
    logError(error as Error, { context: "site-walk-delete-block" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all site walk appointments (staff route)
router.get("/api/site-walk/appointments", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status, from, to } = req.query;

    let whereConditions: ReturnType<typeof and> = eq(schema.siteWalkAppointments.organizationId, user.organizationId);

    if (status && status !== "all") {
      whereConditions = and(
        whereConditions,
        eq(schema.siteWalkAppointments.status, status as string)
      );
    }

    if (from) {
      whereConditions = and(
        whereConditions,
        gte(schema.siteWalkAppointments.scheduledStart, new Date(from as string))
      );
    }

    if (to) {
      whereConditions = and(
        whereConditions,
        lte(schema.siteWalkAppointments.scheduledEnd, new Date(to as string))
      );
    }

    const appointments = await db.query.siteWalkAppointments.findMany({
      where: whereConditions,
      with: {
        project: true,
        portalUser: true,
        assignedUser: true,
      },
      orderBy: desc(schema.siteWalkAppointments.scheduledStart),
    });

    return res.json({
      appointments: appointments.map(a => ({
        id: a.id,
        appointmentType: a.appointmentType || "site_walk",
        priority: a.priority || "normal",
        scheduledStart: a.scheduledStart,
        scheduledEnd: a.scheduledEnd,
        status: a.status,
        locationName: a.locationName,
        locationAddress: a.locationAddress,
        locationCity: a.locationCity,
        locationState: a.locationState,
        locationZip: a.locationZip,
        travelMinutes: a.travelMinutes,
        clientName: a.clientName,
        clientEmail: a.clientEmail,
        clientPhone: a.clientPhone,
        notes: a.notes,
        clientNotes: a.clientNotes,
        tradeDependencies: a.tradeDependencies || [],
        tradeCoordinationNotes: a.tradeCoordinationNotes,
        assignedTeam: a.assignedTeam || [],
        project: a.project ? {
          id: a.project.id,
          name: a.project.name,
        } : null,
        portalUser: a.portalUser ? {
          id: a.portalUser.id,
          name: a.portalUser.name,
          email: a.portalUser.email,
        } : null,
        assignedUser: a.assignedUser ? {
          id: a.assignedUser.id,
          name: a.assignedUser.firstName ? `${a.assignedUser.firstName} ${a.assignedUser.lastName || ""}`.trim() : a.assignedUser.email,
        } : null,
        confirmedAt: a.confirmedAt,
        completedAt: a.completedAt,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    logError(error as Error, { context: "site-walk-get-appointments" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new appointment (staff route)
const createAppointmentSchema = z.object({
  appointmentType: z.enum(["site_walk", "measurement_verification", "installation", "warranty_repair"]).default("site_walk"),
  priority: z.enum(["normal", "urgent"]).default("normal"),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  locationZip: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
  tradeDependencies: z.array(z.string()).optional().default([]),
  tradeCoordinationNotes: z.string().optional(),
  projectId: z.string().optional(),
});

router.post("/api/site-walk/appointments", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    const data = parsed.data;

    const [appointment] = await db.insert(schema.siteWalkAppointments).values({
      organizationId: user.organizationId,
      appointmentType: data.appointmentType,
      priority: data.priority,
      scheduledStart: new Date(data.scheduledStart),
      scheduledEnd: new Date(data.scheduledEnd),
      locationName: data.locationName,
      locationAddress: data.locationAddress,
      locationCity: data.locationCity,
      locationState: data.locationState,
      locationZip: data.locationZip,
      clientName: data.clientName,
      clientEmail: data.clientEmail || null,
      clientPhone: data.clientPhone,
      notes: data.notes,
      tradeDependencies: data.tradeDependencies,
      tradeCoordinationNotes: data.tradeCoordinationNotes,
      projectId: data.projectId || null,
      assignedUserId: user.id,
      status: "pending",
    }).returning();

    return res.status(201).json({ appointment });
  } catch (error) {
    logError(error as Error, { context: "site-walk-create-appointment" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update appointment status (staff route)
const updateAppointmentSchema = z.object({
  status: z.enum(["requested", "pending", "confirmed", "in_progress", "cancelled", "completed", "no_show"]).optional(),
  notes: z.string().optional(),
  tradeDependencies: z.array(z.string()).optional(),
  tradeCoordinationNotes: z.string().optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
});

router.patch("/api/site-walk/appointments/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const appointmentId = req.params.id;
    const parsed = updateAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    }

    // Check ownership
    const existing = await db.query.siteWalkAppointments.findFirst({
      where: and(
        eq(schema.siteWalkAppointments.id, appointmentId),
        eq(schema.siteWalkAppointments.organizationId, user.organizationId)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const updateData: any = { ...parsed.data, updatedAt: new Date() };
    
    // Track status changes
    if (parsed.data.status === "completed" && existing.status !== "completed") {
      updateData.completedAt = new Date();
    }
    if (parsed.data.status === "confirmed" && existing.status !== "confirmed") {
      updateData.confirmedAt = new Date();
      updateData.confirmedBy = user.id;
    }

    const [updated] = await db.update(schema.siteWalkAppointments)
      .set(updateData)
      .where(eq(schema.siteWalkAppointments.id, appointmentId))
      .returning();

    return res.json({ appointment: updated });
  } catch (error) {
    logError(error as Error, { context: "site-walk-update-appointment" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete appointment (staff route)
router.delete("/api/site-walk/appointments/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const appointmentId = req.params.id;

    // Check ownership
    const existing = await db.query.siteWalkAppointments.findFirst({
      where: and(
        eq(schema.siteWalkAppointments.id, appointmentId),
        eq(schema.siteWalkAppointments.organizationId, user.organizationId)
      ),
    });

    if (!existing) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    await db.delete(schema.siteWalkAppointments)
      .where(eq(schema.siteWalkAppointments.id, appointmentId));

    return res.json({ success: true });
  } catch (error) {
    logError(error as Error, { context: "site-walk-delete-appointment" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get calendar integration status
router.get("/api/site-walk/calendar-status", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const integration = await calendarService.getActiveIntegration(user.organizationId);

    if (!integration) {
      return res.json({
        connected: false,
        provider: null,
        message: "No calendar connected. Connect Google Calendar or Microsoft Outlook to enable scheduling.",
      });
    }

    return res.json({
      connected: true,
      provider: integration.provider,
      accountEmail: integration.accountEmail,
      calendarName: integration.calendarName,
      homeBaseAddress: integration.homeBaseAddress ? [
        integration.homeBaseAddress,
        integration.homeBaseCity,
        integration.homeBaseState,
        integration.homeBaseZip,
      ].filter(Boolean).join(", ") : null,
      lastSyncAt: integration.lastSyncAt,
    });
  } catch (error) {
    logError(error as Error, { context: "site-walk-calendar-status" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// Quote Viewing & Approval (Client Portal)
// ============================================================================

import { quoteService } from "../services/quote.service";
import { 
  quoteSelections, 
  quoteApprovals,
  portalQuotesViewState 
} from "@shared/schema";

// Get quotes available to portal user for a project
router.get("/api/portal/projects/:id/quotes", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    if (!portalUser) {
      return res.status(401).json({ error: "Portal authentication required" });
    }

    const projectId = req.params.id;

    // Verify project access
    const share = await db.query.portalShares.findFirst({
      where: and(
        eq(schema.portalShares.projectId, projectId),
        eq(schema.portalShares.clientEmail, portalUser.email.toLowerCase()),
        eq(schema.portalShares.isActive, true)
      ),
    });

    if (!share) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Get all sent quotes for this project
    const projectQuotes = await db.query.quotes.findMany({
      where: and(
        eq(schema.quotes.projectId, projectId),
        eq(schema.quotes.organizationId, portalUser.organizationId)
      ),
      orderBy: desc(schema.quotes.createdAt),
    });

    // Filter to only show sent quotes (not drafts)
    const sentQuotes = projectQuotes.filter(q => q.status !== "draft");

    // Get view state for each quote
    const quotesWithViewState = await Promise.all(
      sentQuotes.map(async (quote) => {
        const viewState = await db.query.portalQuotesViewState.findFirst({
          where: and(
            eq(portalQuotesViewState.quoteId, quote.id),
            eq(portalQuotesViewState.portalUserId, portalUser.id)
          ),
        });

        // Get approval status
        const approval = await db.query.quoteApprovals.findFirst({
          where: eq(schema.quoteApprovals.quoteId, quote.id),
        });

        return {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          version: quote.version,
          status: quote.status,
          subtotal: quote.subtotal,
          tax: quote.taxAmount,
          total: quote.total,
          validUntil: quote.expiresAt,
          sentAt: quote.sentAt,
          approvalStatus: approval ? {
            decision: approval.decision,
            signedAt: approval.signedAt,
            method: approval.method,
          } : null,
          viewedAt: viewState?.firstViewedAt || null,
          lastViewedAt: viewState?.lastViewedAt || null,
        };
      })
    );

    res.json(quotesWithViewState);
  } catch (error) {
    logError(error as Error, { context: "portal-get-project-quotes" });
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

// Get quote detail with line items and options
router.get("/api/portal/quotes/:id", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    if (!portalUser) {
      return res.status(401).json({ error: "Portal authentication required" });
    }

    const quoteId = req.params.id;

    // Get the quote
    const quote = await db.query.quotes.findFirst({
      where: and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.organizationId, portalUser.organizationId)
      ),
    });

    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    // Verify project access
    const share = await db.query.portalShares.findFirst({
      where: and(
        eq(schema.portalShares.projectId, quote.projectId),
        eq(schema.portalShares.clientEmail, portalUser.email.toLowerCase()),
        eq(schema.portalShares.isActive, true)
      ),
    });

    if (!share) {
      return res.status(403).json({ error: "Access denied to this quote" });
    }

    // Get full quote details
    const quoteDetails = await quoteService.getQuoteById(quoteId, portalUser.organizationId);
    if (!quoteDetails) {
      return res.status(404).json({ error: "Quote not found" });
    }

    // Get customer's current selections
    const selections = await db.query.quoteSelections.findMany({
      where: and(
        eq(schema.quoteSelections.quoteId, quoteId),
        eq(schema.quoteSelections.portalUserId, portalUser.id)
      ),
    });

    // Calculate totals with selections
    const totals = await quoteService.calculateQuoteTotal(quoteId, portalUser.organizationId);

    // Update view state
    const existingViewState = await db.query.portalQuotesViewState.findFirst({
      where: and(
        eq(portalQuotesViewState.quoteId, quoteId),
        eq(portalQuotesViewState.portalUserId, portalUser.id)
      ),
    });

    if (existingViewState) {
      await db
        .update(portalQuotesViewState)
        .set({ 
          lastViewedAt: new Date(),
          viewCount: existingViewState.viewCount + 1,
        })
        .where(eq(portalQuotesViewState.id, existingViewState.id));
    } else {
      await db.insert(portalQuotesViewState).values({
        quoteId,
        portalUserId: portalUser.id,
        organizationId: portalUser.organizationId,
        firstViewedAt: new Date(),
        lastViewedAt: new Date(),
        viewCount: 1,
      });
    }

    // Get approval status
    const approval = await db.query.quoteApprovals.findFirst({
      where: eq(schema.quoteApprovals.quoteId, quoteId),
    });

    // Get organization branding for display
    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, portalUser.organizationId),
      columns: {
        name: true,
        logoUrl: true,
      },
    });

    res.json({
      ...quoteDetails,
      customerSelections: selections.map(s => ({
        optionGroupId: s.optionGroupId,
        optionId: s.optionId,
      })),
      calculatedTotals: totals,
      approvalStatus: approval ? {
        decision: approval.decision,
        signedAt: approval.signedAt,
        method: approval.method,
        comments: approval.comments,
      } : null,
      organization: org,
    });
  } catch (error) {
    logError(error as Error, { context: "portal-get-quote-detail" });
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

// Save option selections
const saveSelectionsSchema = z.object({
  selections: z.array(z.object({
    optionGroupId: z.string().uuid(),
    optionId: z.string().uuid(),
  })),
});

router.post("/api/portal/quotes/:id/selections", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    if (!portalUser) {
      return res.status(401).json({ error: "Portal authentication required" });
    }

    const quoteId = req.params.id;

    // Validate request
    const result = saveSelectionsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid selections",
        details: result.error.issues,
      });
    }

    // Get the quote
    const quote = await db.query.quotes.findFirst({
      where: and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.organizationId, portalUser.organizationId)
      ),
    });

    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    // Check if quote is still open for selections
    if (quote.status === "approved" || quote.status === "declined") {
      return res.status(400).json({ error: "Quote is no longer open for changes" });
    }

    // Verify project access
    const share = await db.query.portalShares.findFirst({
      where: and(
        eq(schema.portalShares.projectId, quote.projectId),
        eq(schema.portalShares.clientEmail, portalUser.email.toLowerCase()),
        eq(schema.portalShares.isActive, true)
      ),
    });

    if (!share) {
      return res.status(403).json({ error: "Access denied to this quote" });
    }

    // Delete existing selections for this user
    await db
      .delete(quoteSelections)
      .where(
        and(
          eq(quoteSelections.quoteId, quoteId),
          eq(quoteSelections.portalUserId, portalUser.id)
        )
      );

    // Insert new selections
    if (result.data.selections.length > 0) {
      await db.insert(quoteSelections).values(
        result.data.selections.map(sel => ({
          quoteId,
          optionGroupId: sel.optionGroupId,
          optionId: sel.optionId,
          portalUserId: portalUser.id,
          organizationId: portalUser.organizationId,
        }))
      );
    }

    // Calculate updated totals
    const totals = await quoteService.calculateQuoteTotal(quoteId, portalUser.organizationId);

    logger.info("Portal user saved quote selections", {
      quoteId,
      portalUserId: portalUser.id,
      selectionsCount: result.data.selections.length,
    });

    res.json({
      success: true,
      calculatedTotals: totals,
    });
  } catch (error) {
    logError(error as Error, { context: "portal-save-selections" });
    res.status(500).json({ error: "Failed to save selections" });
  }
});

// Approve or decline quote
const quoteApprovalSchema = z.object({
  action: z.enum(["approve", "decline"]),
  customerNotes: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  billingContact: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    company: z.string().optional(),
  }).optional(),
});

router.post("/api/portal/quotes/:id/approval", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    if (!portalUser) {
      return res.status(401).json({ error: "Portal authentication required" });
    }

    const quoteId = req.params.id;

    // Validate request
    const result = quoteApprovalSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid approval request",
        details: result.error.issues,
      });
    }

    // Get the quote
    const quote = await db.query.quotes.findFirst({
      where: and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.organizationId, portalUser.organizationId)
      ),
    });

    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    // Check if quote is still open for approval
    if (quote.status === "approved" || quote.status === "declined") {
      return res.status(400).json({ error: "Quote has already been " + quote.status });
    }

    // Check if quote is expired
    if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Quote has expired" });
    }

    // Verify project access
    const share = await db.query.portalShares.findFirst({
      where: and(
        eq(schema.portalShares.projectId, quote.projectId),
        eq(schema.portalShares.clientEmail, portalUser.email.toLowerCase()),
        eq(schema.portalShares.isActive, true)
      ),
    });

    if (!share) {
      return res.status(403).json({ error: "Access denied to this quote" });
    }

    const { action, customerNotes, purchaseOrderNumber, billingContact } = result.data;
    const now = new Date();

    // Create approval record using schema-compliant field names
    const [approval] = await db.insert(quoteApprovals).values({
      quoteId,
      decision: action === "approve" ? "approved" : "rejected",
      method: "portal",
      approverEmail: portalUser.email,
      approverName: portalUser.name,
      approverCompany: portalUser.company || null,
      portalUserId: portalUser.id,
      comments: customerNotes,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      organizationId: portalUser.organizationId,
    }).returning();

    // Update quote status (use "rejected" to match schema)
    const newStatus = action === "approve" ? "approved" : "rejected";
    await db
      .update(schema.quotes)
      .set({ 
        status: newStatus,
        approvedAt: action === "approve" ? now : null,
        rejectedAt: action === "decline" ? now : null,
      })
      .where(eq(schema.quotes.id, quoteId));

    logger.info("Portal user submitted quote approval", {
      quoteId,
      portalUserId: portalUser.id,
      action,
      approvalId: approval.id,
    });

    // Send notification email to sales team
    try {
      const quote = await db.query.quotes.findFirst({
        where: eq(schema.quotes.id, quoteId),
      });

      if (quote) {
        const salesTeam = await storage.getProjectTeamMembers(quote.projectId);
        
        if (salesTeam.length > 0) {
          const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
            : "http://localhost:5000";
          
          const projectUrl = `${baseUrl}/projects/${quote.projectId}`;
          const actionLabel = action === "approve" ? "APPROVED" : "REJECTED";
          
          const html = `
            <h2>Quote ${actionLabel}</h2>
            <p>Customer <strong>${portalUser.name}</strong> (${portalUser.email}) from <strong>${portalUser.company || 'Unknown Company'}</strong> has ${action === 'approve' ? 'approved' : 'rejected'} quote <strong>${quote.quoteNumber || quoteId}</strong>.</p>
            ${customerNotes ? `<p><strong>Customer Notes:</strong> ${customerNotes}</p>` : ''}
            <p><a href="${projectUrl}">View Project Details</a></p>
          `;

          for (const member of salesTeam) {
            if (!member.email) continue;
            await emailService.sendEmail({
              to: member.email,
              subject: `Quote ${actionLabel}: ${quote.quoteNumber || quoteId}`,
              html,
            });
          }
          
          logger.info("Sales team notified of quote decision", {
            quoteId,
            teamSize: salesTeam.length,
            action
          });
        } else {
          logger.warn("No sales team members found for project notification", { projectId: quote.projectId });
        }
      }
    } catch (notifyError) {
      logError(notifyError as Error, { context: "portal-approval-notification", quoteId });
    }

    res.json({
      success: true,
      approval: {
        id: approval.id,
        decision: approval.decision,
        signedAt: approval.signedAt,
      },
    });
  } catch (error) {
    logError(error as Error, { context: "portal-quote-approval" });
    res.status(500).json({ error: "Failed to process approval" });
  }
});

// Get confirmation link for PDF-based approval
router.get("/api/portal/quotes/:id/confirmation-link", portalAuth, async (req: Request, res: Response) => {
  try {
    const portalUser = (req as any).portalUser;
    if (!portalUser) {
      return res.status(401).json({ error: "Portal authentication required" });
    }

    const quoteId = req.params.id;

    // Get the quote
    const quote = await db.query.quotes.findFirst({
      where: and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.organizationId, portalUser.organizationId)
      ),
    });

    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    // Verify project access
    const share = await db.query.portalShares.findFirst({
      where: and(
        eq(schema.portalShares.projectId, quote.projectId),
        eq(schema.portalShares.clientEmail, portalUser.email.toLowerCase()),
        eq(schema.portalShares.isActive, true)
      ),
    });

    if (!share) {
      return res.status(403).json({ error: "Access denied to this quote" });
    }

    // Generate a secure confirmation token
    const confirmationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store the confirmation token (you could also use a separate table)
    await db
      .update(schema.quotes)
      .set({ 
        confirmationToken,
        confirmationTokenExpiresAt: expiresAt,
      })
      .where(eq(schema.quotes.id, quoteId));

    const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000";

    const confirmationLink = `${baseUrl}/quote-confirm/${confirmationToken}`;

    res.json({
      confirmationLink,
      expiresAt,
    });
  } catch (error) {
    logError(error as Error, { context: "portal-get-confirmation-link" });
    res.status(500).json({ error: "Failed to generate confirmation link" });
  }
});

// Public confirmation link approval (no auth required - token-based)
router.post("/api/quote-confirm/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Find quote by confirmation token
    const quote = await db.query.quotes.findFirst({
      where: eq(schema.quotes.confirmationToken, token),
    });

    if (!quote) {
      return res.status(404).json({ error: "Invalid or expired confirmation link" });
    }

    // Check if token is expired
    if (quote.confirmationTokenExpiresAt && new Date(quote.confirmationTokenExpiresAt) < new Date()) {
      return res.status(400).json({ error: "Confirmation link has expired" });
    }

    // Check if already approved/declined
    if (quote.status === "approved" || quote.status === "declined") {
      return res.status(400).json({ error: "Quote has already been " + quote.status });
    }

    // Validate request
    const approvalSchema = z.object({
      action: z.enum(["approve", "decline"]),
      customerName: z.string().min(1),
      customerEmail: z.string().email(),
      notes: z.string().optional(),
    });

    const result = approvalSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid approval request",
        details: result.error.issues,
      });
    }

    const { action, customerName, customerEmail, notes } = result.data;
    const now = new Date();

    // Create approval record using schema-compliant field names
    const [approval] = await db.insert(quoteApprovals).values({
      quoteId: quote.id,
      decision: action === "approve" ? "approved" : "rejected",
      method: "pdf_link",
      approverEmail: customerEmail,
      approverName: customerName,
      comments: notes,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      organizationId: quote.organizationId,
    }).returning();

    // Update quote status and clear token
    const newStatus = action === "approve" ? "approved" : "rejected";
    await db
      .update(schema.quotes)
      .set({ 
        status: newStatus,
        approvedAt: action === "approve" ? now : null,
        rejectedAt: action === "decline" ? now : null,
        confirmationToken: null,
        confirmationTokenExpiresAt: null,
      })
      .where(eq(schema.quotes.id, quote.id));

    logger.info("Quote approved via confirmation link", {
      quoteId: quote.id,
      action,
      customerEmail,
      approvalId: approval.id,
    });

    res.json({
      success: true,
      message: action === "approve" 
        ? "Quote approved successfully. You will receive a confirmation email shortly."
        : "Quote declined. The sales team has been notified.",
    });
  } catch (error) {
    logError(error as Error, { context: "quote-confirm-token" });
    res.status(500).json({ error: "Failed to process confirmation" });
  }
});

// Get quote confirmation page data (public, token-based)
router.get("/api/quote-confirm/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Find quote by confirmation token
    const quote = await db.query.quotes.findFirst({
      where: eq(schema.quotes.confirmationToken, token),
    });

    if (!quote) {
      return res.status(404).json({ error: "Invalid or expired confirmation link" });
    }

    // Check if token is expired
    if (quote.confirmationTokenExpiresAt && new Date(quote.confirmationTokenExpiresAt) < new Date()) {
      return res.status(400).json({ error: "Confirmation link has expired" });
    }

    // Get organization info
    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, quote.organizationId),
      columns: {
        name: true,
        logoUrl: true,
      },
    });

    // Get project info
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, quote.projectId),
      columns: {
        name: true,
      },
    });

    res.json({
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      total: quote.total,
      validUntil: quote.expiresAt,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      projectName: project?.name,
      organization: org,
      isExpired: quote.expiresAt && new Date(quote.expiresAt) < new Date(),
      isAlreadyActioned: quote.status === "approved" || quote.status === "rejected",
    });
  } catch (error) {
    logError(error as Error, { context: "quote-confirm-get" });
    res.status(500).json({ error: "Failed to load confirmation page" });
  }
});

export default router;
