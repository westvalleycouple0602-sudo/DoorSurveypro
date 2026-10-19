import type { Express } from "express";
import { createServer, type Server } from "http";
import csrf from "csurf";
import { storage } from "./storage";
import { requireAuth as isAuthenticated, getOrganizationContext } from "./clerkAuth";
import { db } from "./db";
import { eq, and, gte } from "drizzle-orm";
import {
  insertCustomerSchema,
  insertCustomerLocationSchema,
  insertCustomerProductHistorySchema,
  insertProjectSchema,
  insertServiceHistorySchema,
  updateServiceHistorySchema,
  insertDoorOpeningSchema,
  insertPhotoSchema,
  insertHardwareItemSchema,
  insertHardwareBundleSchema,
  insertBundleItemSchema,
  insertCatalogItemSchema,
  insertHardwareCrossReferenceSchema,
  insertDoorTemplateSchema,
  insertManufacturerContactSchema,
  insertManufacturerProductSchema,
  insertQuoteRequestSchema,
  insertProjectCostSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderLineItemSchema,
  insertVendorQuoteSchema,
  insertDisclaimerSchema,
  insertDisclaimerLinkSchema,
  insertGasketingCatalogSchema,
  insertOpeningGasketingSchema,
  insertMasterKeySystemSchema,
  insertLockSetSchema,
  insertFloorPlanSchema,
  insertDoorLocationSchema,
  insertUserIntegrationSchema,
  insertLidarScanSchema,
  insertScanPhotoSchema,
  insertHardwareScanSchema,
  insertBugReportSchema,
  insertExternalServiceConnectionSchema,
  insertLinkedExternalResourceSchema,
  insertProjectAssignmentSchema,
  insertProcurementItemSchema,
  insertProjectIssueSchema,
  insertProjectMilestoneSchema,
  insertManufacturerOrderFormSchema,
  bugReports,
  userOnboarding,
} from "@shared/schema";
import * as schema from "@shared/schema";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { generateProjectPDF } from "./pdf-generator";
import { maskToken } from "./encryption";
import multer from "multer";
import { objectStorageService, ObjectStorageConfigError } from "./objectStorage";
import { processPointCloud, processDualScan } from "./lidar-processor";
import { scanOpeningMeasurements } from "./lib/scan-opening-measurements";
import { generateDoorDrawingSet, exportToDxf } from "./drawing-generator";
import { decodeImage, parseHardwareTokens, normalizeFields } from "./hardware-scanner";
import type { DualScanSessionData } from "../shared/schemas/dual-scans.schema";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { 
  checkOpeningCompliance,
  checkOpeningComplianceComprehensive,
  getOpeningViolations, 
  getProjectViolations,
  resolveViolation,
  waiveViolation,
  getAllHardwareRules,
  getHardwareRulesByCategory,
  getHardwareRulesForJurisdiction,
  checkHardwareCompliance,
  type HardwareComplianceContext,
  type ComprehensiveComplianceResult
} from "./compliance-checker";
import { generateBom } from "./services/bom-generator";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@shared/subscriptions";
import { checkProjectLimit, checkUserLimit, checkBarcodeScanLimit, requireFeature } from "./feature-gates";
import { MEMBERSHIP_ROLES, ROLE_HIERARCHY, type MembershipRole, hardwareScans } from "@shared/schema";
import { logger, logError, logAuditEvent, logIntegrationCall, logSecurityEvent } from "./logger";
import { parseAddress } from "./utils/addressParser";
import { getJurisdictionByState, getApplicableStandards, type JurisdictionProfile } from "./data/jurisdictionCodes";
import { getRequestPath } from "./utils/request";
import { publish } from "./natsBus";
import {
  errorReportLimiter,
  leadCreationLimiter,
  quoteRequestLimiter,
  fileUploadLimiter,
  aiAnalysisLimiter,
  webhookLimiter
} from "./middleware/rateLimiting";
import { authenticationLimiter, passwordResetLimiter } from "./middleware/enhanced-rate-limiting";
import { requireRole, requireAnyRole } from "./middleware/requireRole";
import { requireOrgAccess, withOrgContext } from "./middleware/validateOrg";
import { z } from "zod";
import { registerModularRoutes } from "./routes/index";
import { handleValidationError } from "./utils/error-handler";
import { cache, CacheKeys } from "./utils/cache";
import { generateNonce, verifyNonceMiddleware } from "./utils/nonce-verification";

// ============================================================================
// DUAL-SCAN PROTOCOL CONFIGURATION
// ============================================================================

export const DUAL_SCAN_PROTOCOL_STEPS = [
  {
    step: 1,
    title: "Position Device",
    description: "Stand approximately 1.5 meters from the closed door, centered on the opening",
    doorState: "closed" as const,
    tips: ["Ensure good lighting", "Remove obstructions from the floor", "Check that the door is fully closed"]
  },
  {
    step: 2,
    title: "Scan Closed Door",
    description: "Capture the door in its closed position, scanning the full frame and leaf",
    doorState: "closed" as const,
    tips: ["Include the full frame perimeter", "Capture both sides of the door if accessible", "Hold device steady during scan"]
  },
  {
    step: 3,
    title: "Open Door",
    description: "Open the door to approximately 90 degrees and ensure it stays in position",
    doorState: "transition" as const,
    tips: ["Use a door stop if available", "Ensure the door won't move during scanning"]
  },
  {
    step: 4,
    title: "Scan Open Door",
    description: "Capture the door in its open position to determine swing direction and hardware",
    doorState: "open" as const,
    tips: ["Capture the hinge side clearly", "Include the exposed frame jamb", "Scan any visible hardware"]
  },
  {
    step: 5,
    title: "Review & Submit",
    description: "Review both scans and submit for processing",
    doorState: "complete" as const,
    tips: ["Check point cloud quality in preview", "Ensure both scans are complete", "Add any notes about the opening"]
  }
];

function generateSessionId(): string {
  return `dss_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Clerk authentication and local-user provisioning are mounted in server/index.ts.
  // CSRF Protection for state-changing requests
  const csrfProtection = csrf({ cookie: true });
  
  // Define routes that should skip CSRF protection
  const csrfExemptPaths = [
    "/api/errors/report",
    "/api/leads",
  ];
  
  const csrfExemptPrefixes = [
    "/api/demo/",
    "/api/webhooks/",
  ];
  
  // Apply CSRF protection to all state-changing API routes
  app.use("/api/*", (req, res, next) => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }
    
    // SECURITY: Only allow CSRF bypass for automated tests when explicitly enabled
    // This flag should ONLY be set in test environment, NEVER in development or production
    const allowCsrfBypass = process.env.ALLOW_CSRF_BYPASS_FOR_TESTS === 'true' && process.env.NODE_ENV === 'test';
    
    if (allowCsrfBypass) {
      logger.debug("CSRF bypassed (test mode with explicit flag)", {
        path: req.path,
        method: req.method,
        userAgent: req.get("user-agent"),
      });
      return next();
    }
    
    // Use helper to get full request path (without query string)
    const requestPath = getRequestPath(req);
    
    // Skip CSRF for exact path matches
    if (csrfExemptPaths.includes(requestPath)) {
      return next();
    }
    
    // Skip CSRF for path prefixes
    if (csrfExemptPrefixes.some(prefix => requestPath.startsWith(prefix))) {
      return next();
    }
    
    // Apply CSRF protection (production only)
    csrfProtection(req, res, next);
  });

  // ============================================================================
  // MODULAR ROUTES - Core & Subscriptions extracted to separate files
  // ============================================================================
  
  // Configure file uploaders for modular routes
  const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml", "image/webp"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, SVG, and WebP images are allowed."));
      }
    },
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      // Allow common document and data formats for imports/exports
      const allowedMimes = [
        // Spreadsheet formats
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // Document formats
        "application/pdf",
        // JSON for data import/export
        "application/json",
        "text/json",
      ];
      
      // Also check file extension as a secondary validation
      const allowedExtensions = [".csv", ".xls", ".xlsx", ".pdf", ".json"];
      const fileExtension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
      
      if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error(
          `Invalid file type. Only CSV, Excel, PDF, and JSON files are allowed. ` +
          `Received: ${file.mimetype} (${fileExtension})`
        ));
      }
    },
  });

  const lidarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  const hardwareLabelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // Register modular routes (Core + Subscriptions)
  await registerModularRoutes(
    app,
    storage,
    {
      logo: logoUpload,
      lidar: lidarUpload,
      hardwareLabel: hardwareLabelUpload,
      general: upload,
    },
    {
      errorReport: errorReportLimiter,
      leadCreation: leadCreationLimiter,
      quoteRequest: quoteRequestLimiter,
      fileUpload: fileUploadLimiter,
      aiAnalysis: aiAnalysisLimiter,
      webhook: webhookLimiter,
    },
    {
      requireOrgAccess,
      withOrgContext,
      requireRole,
    },
    {
      logger,
      logError,
      logAuditEvent,
      logIntegrationCall,
      logSecurityEvent,
    }
  );

  // ============================================================================
  // LEGACY ROUTES (To be migrated to modules)
  // ============================================================================
  
  // NOTE: The following routes are duplicated in modular files and commented out here:
  // - /api/csrf-token (in core.routes.ts)
  // - /api/errors/report (in core.routes.ts)
  // - /api/user (in core.routes.ts)
  // - /api/team/* (in core.routes.ts)
  // - /api/branding/* (in core.routes.ts)
  // - /api/subscriptions/* (in subscriptions.routes.ts)
  // - /api/webhooks/stripe (in subscriptions.routes.ts)

  /*
  // CSRF Token endpoint - NOW IN core.routes.ts
  app.get("/api/csrf-token", csrfProtection, (req, res) => {
    res.json({ csrfToken: (req as any).csrfToken() });
  });
  */

  // Error reporting endpoint - NOW IN core.routes.ts

  // Protect all API routes except auth endpoints, webhooks, public endpoints, and demo routes
  app.use("/api/*", (req, res, next) => {
    const requestPath = getRequestPath(req);
    
    // Allow unauthenticated access to auth routes, webhooks, public endpoints, and demo routes
    if (
      requestPath === "/api/webhooks/stripe" ||
      requestPath === "/api/nonce" || // Allow public nonce generation (anti-bot protection)
      (requestPath === "/api/leads" && req.method === "POST") || // Allow public lead creation
      requestPath === "/api/errors/report" || // Allow public error reporting
      requestPath.startsWith("/api/demo/")  // Allow demo endpoints
    ) {
      return next();
    }
    // All other API routes require authentication
    return isAuthenticated(req, res, next);
  });

  // Helper to check if user has specific role or higher
  const hasRole = (userRole: MembershipRole, requiredRole: MembershipRole): boolean => {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  };

  // ============================================================================
  // NOTE: User, Team, Branding, and Subscription routes migrated to:
  // - core.routes.ts: /api/user, /api/team/*, /api/branding/*
  // - subscriptions.routes.ts: /api/subscriptions/*, /api/webhooks/stripe
  // ============================================================================

  // ============================================================================
  // PROJECT & DASHBOARD ROUTES (Active - not yet migrated)
  // ============================================================================

  // Dashboard summary - optimized endpoint to reduce API calls
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Fetch projects for this organization
      const projects = await storage.getProjects(orgContext.organizationId);
      const projectIds = projects.map(p => p.id);
      
      // Fetch all data in parallel
      const [openings, photos, quoteRequests] = await Promise.all([
        storage.getOpeningsByOrganization(orgContext.organizationId),
        storage.getPhotosByOrganization(orgContext.organizationId),
        storage.getQuoteRequestsByOrganization(orgContext.organizationId),
      ]);

      res.json({
        projects,
        openings,
        photos,
        quoteRequests,
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Dashboard analytics - comprehensive trends and insights
  app.get("/api/dashboard/analytics", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Fetch organization data
      const projects = await storage.getProjects(orgContext.organizationId);
      
      const [openings, photos] = await Promise.all([
        storage.getOpeningsByOrganization(orgContext.organizationId),
        storage.getPhotosByOrganization(orgContext.organizationId),
      ]);

      // Calculate project trends (last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const projectTrends = projects
        .filter(p => new Date(p.createdAt) >= thirtyDaysAgo)
        .reduce((acc, project) => {
          const date = new Date(project.createdAt).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      // Project status distribution
      const statusDistribution = projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Building type distribution
      const buildingTypeDistribution = projects.reduce((acc, p) => {
        const type = p.buildingType || 'unspecified';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Door type distribution
      const doorTypeDistribution = openings.reduce((acc, o) => {
        const type = o.doorType || 'unspecified';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Activity timeline (recent 10 activities)
      const activities = [
        ...projects.slice(0, 5).map(p => ({
          type: 'project_created' as const,
          title: `Project created: ${p.name}`,
          timestamp: p.createdAt,
          metadata: { projectId: p.id, projectName: p.name }
        })),
        ...openings.slice(0, 5).map(o => ({
          type: 'opening_added' as const,
          title: `Opening added: ${o.openingNumber}`,
          timestamp: o.createdAt,
          metadata: { openingId: o.id, openingNumber: o.openingNumber }
        }))
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      // Metrics with trends
      const activeProjects = projects.filter(p => p.status === 'active').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      
      // Calculate week-over-week changes
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const projectsLastWeek = projects.filter(p => 
        new Date(p.createdAt) >= sevenDaysAgo
      ).length;
      const projectsPreviousWeek = projects.filter(p => 
        new Date(p.createdAt) >= fourteenDaysAgo && new Date(p.createdAt) < sevenDaysAgo
      ).length;
      
      const projectTrend = projectsPreviousWeek === 0 
        ? 0 
        : Math.round(((projectsLastWeek - projectsPreviousWeek) / projectsPreviousWeek) * 100);

      const openingsLastWeek = openings.filter(o => 
        new Date(o.createdAt) >= sevenDaysAgo
      ).length;
      const openingsPreviousWeek = openings.filter(o => 
        new Date(o.createdAt) >= fourteenDaysAgo && new Date(o.createdAt) < sevenDaysAgo
      ).length;
      
      const openingsTrend = openingsPreviousWeek === 0 
        ? 0 
        : Math.round(((openingsLastWeek - openingsPreviousWeek) / openingsPreviousWeek) * 100);

      res.json({
        metrics: {
          activeProjects,
          completedProjects,
          totalOpenings: openings.length,
          totalPhotos: photos.length,
          trends: {
            projects: projectTrend,
            openings: openingsTrend,
          }
        },
        charts: {
          projectTrends: Object.entries(projectTrends).map(([date, count]) => ({ date, count })),
          statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({ 
            status: status.charAt(0).toUpperCase() + status.slice(1), 
            count 
          })),
          buildingTypes: Object.entries(buildingTypeDistribution).map(([type, count]) => ({ 
            type: type.charAt(0).toUpperCase() + type.slice(1), 
            count 
          })),
          doorTypes: Object.entries(doorTypeDistribution).map(([type, count]) => ({ type, count })).slice(0, 10),
        },
        activities,
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Get current user information (authenticated users only)
  app.get("/api/user", async (req, res) => {
    try {
      const user = req.dbUser as any;
      const claims = user ? { sub: user.id } : undefined;
      
      if (!claims?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get user from database
      const dbUser = await storage.getUser(claims.sub);
      if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's primary membership and organization
      const membership = await storage.getUserPrimaryMembership(dbUser.id);
      const organization = membership ? await storage.getOrganization(membership.organizationId) : null;

      res.json({
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
        emailVerified: !!dbUser.emailVerifiedAt,
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          subscriptionTier: organization.subscriptionTier,
          subscriptionStatus: organization.subscriptionStatus,
        } : null,
        role: membership?.role,
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Door Openings API
  app.get("/api/openings", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userOpenings = await storage.getOpeningsByOrganization(orgContext.organizationId);
      res.json(userOpenings);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });


  app.get("/api/openings/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      res.json(opening);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/openings", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Validate that projectId belongs to user's organization
      if (req.body.projectId) {
        const project = await storage.getProject(req.body.projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Cannot create opening for project not in your organization" });
        }
      }
      
      const data = insertDoorOpeningSchema.parse(req.body);
      const opening = await storage.createOpening(data);
      
      // Publish event for async processing (compliance, enrichment, etc.)
      const natsUrl = process.env.NATS_URL;
      if (natsUrl) {
        // Async processing via worker
        await publish('survey.ingested', {
          openingId: opening.id,
          projectId: opening.projectId,
          organizationId: orgContext.organizationId,
          userId: orgContext.userId,
          doorType: opening.doorType,
          timestamp: new Date().toISOString(),
        });
        
        logger.info('Opening created - event published for async compliance check', {
          service: 'doorsurvey-pro',
          openingId: opening.id,
          projectId: opening.projectId,
        });
      } else {
        // Fallback: Synchronous compliance check when NATS unavailable
        try {
          await checkOpeningCompliance(opening.id);
          logger.info('Opening created - synchronous compliance check completed', {
            service: 'doorsurvey-pro',
            openingId: opening.id,
          });
        } catch (complianceError) {
          logError(complianceError instanceof Error ? complianceError : new Error(String(complianceError)), { 
            context: 'compliance-check',
            openingId: opening.id 
          });
          // Don't fail the request if compliance check fails
        }
      }
      
      res.status(201).json(opening);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/openings/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing opening to verify ownership
      const existingOpening = await storage.getOpening(req.params.id);
      if (!existingOpening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(existingOpening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // If projectId is being changed, validate new project belongs to user's org
      if (req.body.projectId && req.body.projectId !== existingOpening.projectId) {
        const newProject = await storage.getProject(req.body.projectId, orgContext.organizationId);
        if (!newProject) {
          return res.status(403).json({ error: "Cannot move opening to project not in your organization" });
        }
      }
      
      const opening = await storage.updateOpening(req.params.id, orgContext.organizationId, req.body);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Automatically re-check compliance after updating door opening
      try {
        await checkOpeningCompliance(opening.id);
      } catch (complianceError) {
        logError(complianceError instanceof Error ? complianceError : new Error(String(complianceError)), { 
          context: 'compliance-check',
          openingId: opening.id 
        });
        // Don't fail the request if compliance check fails
      }
      
      res.json(opening);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/openings/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing opening to verify ownership
      const existingOpening = await storage.getOpening(req.params.id);
      if (!existingOpening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(existingOpening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      const success = await storage.deleteOpening(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Opening not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/openings/:id/duplicate", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing opening to verify ownership
      const existingOpening = await storage.getOpening(req.params.id);
      if (!existingOpening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(existingOpening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      const duplicated = await storage.duplicateOpening(req.params.id);
      if (!duplicated) {
        return res.status(404).json({ error: "Opening not found" });
      }
      res.json(duplicated);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // BOM (Bill of Materials) API - AI-generated hardware recommendations
  app.post("/api/openings/:id/bom/generate", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get opening and verify ownership
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Generate BOM using the intelligent service
      const bomItemsList = generateBom({ doorOpening: opening });
      
      // Create BOM record
      const bom = await storage.createBom({
        openingId: opening.id,
        organizationId: orgContext.organizationId,
        generatedBy: orgContext.userId,
        status: "draft",
        notes: `Auto-generated hardware recommendations for ${opening.location}`,
        context: { doorOpening: opening },
        itemCount: bomItemsList.length,
      });
      
      // Create BOM items
      const createdItems = [];
      for (const item of bomItemsList) {
        const bomItem = await storage.createBomItem({
          bomId: bom.id,
          catalogItemId: null,
          category: item.category,
          description: item.description,
          brand: item.brand || null,
          sku: item.sku || null,
          finish: item.finish || null,
          quantity: item.quantity,
          notes: item.notes || null,
        });
        createdItems.push(bomItem);
      }
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "bom.generate",
        "bom",
        bom.id,
        { openingId: opening.id, itemCount: createdItems.length }
      );
      
      res.json({ bom, items: createdItems });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/openings/:id/bom", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get opening and verify ownership
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      // Get BOMs for this opening
      const boms = await storage.getBomsByOpening(opening.id, orgContext.organizationId);
      
      // Get items for each BOM
      const bomsWithItems = await Promise.all(
        boms.map(async (bom) => {
          const items = await storage.getBomItems(bom.id);
          return { ...bom, items };
        })
      );
      
      res.json(bomsWithItems);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/openings/:openingId/bom/:bomId", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const deleted = await storage.deleteBom(req.params.bomId, orgContext.organizationId);
      if (!deleted) {
        return res.status(404).json({ error: "BOM not found" });
      }
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "bom.delete",
        "bom",
        req.params.bomId,
        { openingId: req.params.openingId }
      );
      
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Photos API
  app.get("/api/photos", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userPhotos = await storage.getPhotosByOrganization(orgContext.organizationId);
      res.json(userPhotos);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/photos/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      // Verify photo's parent opening belongs to user's organization
      const opening = await storage.getOpening(photo.openingId);
      if (!opening) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      res.json(photo);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/openings/:id/photos", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Verify opening belongs to user's organization
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      const photos = await storage.getPhotosByOpening(req.params.id);
      res.json(photos);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/photos", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Validate that openingId belongs to user's organization
      if (req.body.openingId) {
        const opening = await storage.getOpening(req.body.openingId);
        if (!opening) {
          return res.status(404).json({ error: "Opening not found" });
        }
        
        const project = await storage.getProject(opening.projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Cannot create photo for opening not in your organization" });
        }
      }
      
      const data = insertPhotoSchema.parse(req.body);
      const photo = await storage.createPhoto(data);
      
      // Publish event for async photo enrichment (OCR, thumbnails, metadata extraction)
      const opening = await storage.getOpening(photo.openingId);
      if (opening) {
        await publish('photo.uploaded', {
          photoId: photo.id,
          openingId: photo.openingId,
          projectId: opening.projectId,
          organizationId: orgContext.organizationId,
          userId: orgContext.userId,
          url: photo.url,
          timestamp: new Date().toISOString(),
        });
      }
      
      res.status(201).json(photo);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/photos/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get photo and verify ownership
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      const opening = await storage.getOpening(photo.openingId);
      if (!opening) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      // Update photo (mainly for annotations)
      const updated = await storage.updatePhoto(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Photo not found" });
      }
      res.json(updated);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/photos/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get photo and verify ownership
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      const opening = await storage.getOpening(photo.openingId);
      if (!opening) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      const deleted = await storage.deletePhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Photo not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // LIDAR SCANS API
  // ============================================================================

  // Configure multer for LiDAR scan uploads (200MB limit for point cloud files)

  // GET /api/lidar/scans - Get all scans for organization
  app.get("/api/lidar/scans", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get all scans and filter by organization
      const allScans = await storage.getLidarScans();
      const orgScans = allScans.filter(scan => scan.organizationId === orgContext.organizationId);
      
      res.json(orgScans);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST /api/lidar/scans - Upload LiDAR scan file
  // Supports standalone scans (no project/opening) that can be linked later for faster surveys
  app.post("/api/lidar/scans", lidarUpload.single("file"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { openingId, projectId, captureMethod, captureNotes, deviceInfo, scanLabel, scanPurpose } = req.body;

      // If project/opening provided, validate them
      let validatedProjectId: string | null = null;
      let validatedOpeningId: string | null = null;

      if (projectId && openingId) {
        // Verify opening and project belong to user's organization
        const opening = await storage.getOpening(openingId);
        if (!opening) {
          return res.status(404).json({ error: "Opening not found" });
        }

        const project = await storage.getProject(projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Project not found or access denied" });
        }

        // Verify opening belongs to the project (multi-tenant security)
        if (opening.projectId !== projectId) {
          return res.status(400).json({ error: "Opening does not belong to the specified project" });
        }

        validatedProjectId = projectId;
        validatedOpeningId = openingId;
      }

      // Determine scan format from file extension
      const ext = path.extname(req.file.originalname).toLowerCase();
      let scanFormat: "ply" | "obj" | "json";
      if (ext === ".ply") scanFormat = "ply";
      else if (ext === ".obj") scanFormat = "obj";
      else if (ext === ".json") scanFormat = "json";
      else {
        return res.status(400).json({ error: "Invalid file format" });
      }

      // Generate a unique scan ID for storage
      const scanId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      let storageKey: string;
      let uploadMetadata: { checksum: string } | undefined;

      // Upload to object storage if configured, otherwise fallback to /tmp
      if (objectStorageService.isConfigured()) {
        try {
          const uploadResult = await objectStorageService.uploadLidarScan(
            req.file.buffer,
            orgContext.organizationId,
            scanId,
            req.file.originalname,
            scanFormat
          );
          storageKey = uploadResult.storageKey;
          uploadMetadata = { checksum: uploadResult.metadata.checksum };
          
          logger.info("LiDAR scan uploaded to object storage", {
            scanId,
            storageKey,
            checksum: uploadResult.metadata.checksum,
            standalone: !validatedProjectId,
          });
        } catch (error) {
          logger.error("Failed to upload to object storage, falling back to /tmp", { error });
          // Fallback to /tmp storage
          const tmpDir = "/tmp/lidar-scans";
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          const filename = `${Date.now()}-${req.file.originalname}`;
          storageKey = path.join(tmpDir, filename);
          fs.writeFileSync(storageKey, req.file.buffer);
        }
      } else {
        // Use /tmp storage when object storage is not configured
        const tmpDir = "/tmp/lidar-scans";
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        const filename = `${Date.now()}-${req.file.originalname}`;
        storageKey = path.join(tmpDir, filename);
        fs.writeFileSync(storageKey, req.file.buffer);
      }

      // Create database record - projectId and openingId can be null for standalone scans
      const scanData = insertLidarScanSchema.parse({
        organizationId: orgContext.organizationId,
        projectId: validatedProjectId,
        openingId: validatedOpeningId,
        uploaderId: orgContext.userId,
        originalFilename: req.file.originalname,
        storageKey,
        fileSizeBytes: req.file.size,
        scanFormat,
        captureMethod: captureMethod || "ios_lidar",
        captureNotes,
        deviceInfo,
        scanLabel: scanLabel || null,
        scanPurpose: scanPurpose || "single",
        processingStatus: "uploaded",
        rawMetadata: uploadMetadata ? { checksum: uploadMetadata.checksum } : undefined,
      });

      const scan = await storage.createLidarScan(scanData);
      
      // Publish event for async LiDAR processing
      await publish('lidar.uploaded', {
        scanId: scan.id,
        openingId: validatedOpeningId,
        projectId: validatedProjectId,
        organizationId: orgContext.organizationId,
        userId: orgContext.userId,
        storageKey: scan.storageKey,
        scanFormat: scan.scanFormat,
        standalone: !validatedProjectId,
        timestamp: new Date().toISOString(),
      });
      
      logger.info("LiDAR scan created", {
        scanId: scan.id,
        standalone: !validatedProjectId,
        scanLabel: scanLabel || null,
      });
      
      res.status(201).json(scan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST /api/lidar/scans/:id/link - Link a standalone scan to a project/opening
  app.post("/api/lidar/scans/:id/link", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Verify ownership
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if already linked
      if (scan.projectId && scan.openingId) {
        return res.status(400).json({ error: "Scan is already linked to a project/opening" });
      }

      const { projectId, openingId } = req.body;

      if (!projectId || !openingId) {
        return res.status(400).json({ error: "projectId and openingId are required" });
      }

      // Verify project belongs to organization
      const project = await storage.getProject(projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify opening exists and belongs to the project
      const opening = await storage.getOpening(openingId);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      if (opening.projectId !== projectId) {
        return res.status(400).json({ error: "Opening does not belong to the specified project" });
      }

      // Link the scan
      const updatedScan = await storage.updateLidarScan(req.params.id, {
        projectId,
        openingId,
        linkedAt: new Date(),
      });

      logger.info("LiDAR scan linked to project/opening", {
        scanId: req.params.id,
        projectId,
        openingId,
      });

      // If the scan was already processed, apply measurements to the opening
      if (scan.processingStatus === "processed" && scan.processedMetrics) {
        const metrics = scan.processedMetrics as any;
        if (metrics.width && metrics.height) {
          const updateData = scanOpeningMeasurements(metrics);
          await storage.updateOpening(openingId, orgContext.organizationId, updateData);
          logger.info("Applied processed measurements to newly linked opening", {
            scanId: req.params.id,
            openingId,
            width: metrics.width,
            height: metrics.height,
          });
        }
      }

      res.json(updatedScan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST /api/lidar/scans/:id/unlink - Unlink a scan from its project/opening
  app.post("/api/lidar/scans/:id/unlink", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Verify ownership
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if scan is linked
      if (!scan.projectId && !scan.openingId) {
        return res.status(400).json({ error: "Scan is not linked to any project/opening" });
      }

      // Unlink the scan
      const updatedScan = await storage.updateLidarScan(req.params.id, {
        projectId: null,
        openingId: null,
        linkedAt: null,
      });

      logger.info("LiDAR scan unlinked from project/opening", {
        scanId: req.params.id,
        previousProjectId: scan.projectId,
        previousOpeningId: scan.openingId,
      });

      res.json(updatedScan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST /api/lidar/scans/:id/process - Trigger scan processing
  app.post("/api/lidar/scans/:id/process", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Verify ownership
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update status to processing
      await storage.updateLidarScan(req.params.id, {
        processingStatus: "processing",
        processingStartedAt: new Date(),
      });

      try {
        // Process the point cloud
        const { metrics, confidence } = await processPointCloud(
          scan.storageKey,
          scan.scanFormat as "ply" | "obj" | "json"
        );

        // Update the linked opening with measurements
        if (scan.openingId && metrics.width && metrics.height) {
          const updateData = scanOpeningMeasurements(metrics);
          
          await storage.updateOpening(scan.openingId, orgContext.organizationId, updateData);
        }

        // Trigger compliance validation on the updated opening
        let complianceFindings: any = {};
        if (scan.openingId) {
          const violations = await checkOpeningCompliance(scan.openingId);
          complianceFindings = {
            violations: violations.map(v => ({
              ruleId: v.ruleId,
              status: v.status,
              detectedAt: v.detectedAt,
            })),
            totalViolations: violations.length,
            checkedAt: new Date(),
          };
        }

        // Update scan with results
        const updatedScan = await storage.updateLidarScan(req.params.id, {
          processedMetrics: metrics as any,
          confidenceScores: confidence as any,
          complianceFindings: complianceFindings as any,
          processingStatus: "processed",
          processingCompletedAt: new Date(),
        });

        res.json(updatedScan);
      } catch (processingError) {
        logError(processingError instanceof Error ? processingError : new Error(String(processingError)), { 
          context: 'lidar-scan-processing',
          scanId: req.params.id 
        });
        
        // Update status to failed
        await storage.updateLidarScan(req.params.id, {
          processingStatus: "failed",
          processingCompletedAt: new Date(),
        });

        return res.status(500).json({ error: "Failed to process scan" });
      }
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/lidar/scans/:id - Get scan details and results
  app.get("/api/lidar/scans/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Verify ownership
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(scan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/lidar/scans/:id/file - Get signed URL for scan file download
  app.get("/api/lidar/scans/:id/file", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Verify ownership
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if storage key is in object storage format
      if (scan.storageKey.startsWith("/lidar-scans/") && objectStorageService.isConfigured()) {
        // Get signed URL from object storage with 1-hour TTL
        const signedUrl = await objectStorageService.getLidarScanUrl(scan.storageKey, 3600);
        
        logger.info("Generated signed URL for LiDAR scan", {
          scanId: scan.id,
          storageKey: scan.storageKey,
        });

        res.json({
          downloadUrl: signedUrl,
          originalFilename: scan.originalFilename,
          contentType: scan.scanFormat === "json" ? "application/json" : 
                       scan.scanFormat === "ply" ? "application/x-ply" : "text/plain",
          size: scan.fileSizeBytes,
          expiresIn: 3600,
          storageType: "object_storage",
        });
      } else if (scan.storageKey.startsWith("/tmp/")) {
        // Legacy /tmp storage - check if file exists
        if (!fs.existsSync(scan.storageKey)) {
          return res.status(404).json({ error: "Scan file not found on disk" });
        }

        // For /tmp files, we serve directly (not recommended for production)
        res.json({
          downloadUrl: `/api/lidar/scans/${scan.id}/download`,
          originalFilename: scan.originalFilename,
          contentType: scan.scanFormat === "json" ? "application/json" : 
                       scan.scanFormat === "ply" ? "application/x-ply" : "text/plain",
          size: scan.fileSizeBytes,
          storageType: "local",
        });
      } else {
        return res.status(500).json({ error: "Unknown storage format" });
      }
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/lidar/scans/:id/download - Direct download for legacy /tmp files
  app.get("/api/lidar/scans/:id/download", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Verify ownership
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const asset = req.query.asset as string | undefined;

      if (asset === "model") {
        if (!scan.modelStorageKey) {
          return res.status(404).json({ error: "3D model not available" });
        }
        if (fs.existsSync(scan.modelStorageKey)) {
          const ext = (scan.modelFormat || "gltf").toLowerCase();
          const contentType = ext === "gltf" ? "model/gltf+json" : ext === "usdz" ? "model/vnd.usdz+zip" : "application/octet-stream";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Content-Disposition", `attachment; filename="model.${ext}"`);
          fs.createReadStream(scan.modelStorageKey).pipe(res);
          return;
        }
        return res.status(404).json({ error: "Model file not found on disk" });
      }

      if (asset === "wireframe") {
        if (!scan.wireframeStorageKey) {
          return res.status(404).json({ error: "Wireframe not available" });
        }
        if (fs.existsSync(scan.wireframeStorageKey)) {
          const ext = (scan.wireframeFormat || "svg").toLowerCase();
          const contentType = ext === "svg" ? "image/svg+xml" : ext === "json" ? "application/json" : "application/octet-stream";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Content-Disposition", `attachment; filename="wireframe.${ext}"`);
          fs.createReadStream(scan.wireframeStorageKey).pipe(res);
          return;
        }
        return res.status(404).json({ error: "Wireframe file not found on disk" });
      }

      if (asset === "preview") {
        if (!scan.previewImageKey) {
          return res.status(404).json({ error: "Preview image not available" });
        }
        if (fs.existsSync(scan.previewImageKey)) {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Content-Disposition", `inline; filename="preview.png"`);
          fs.createReadStream(scan.previewImageKey).pipe(res);
          return;
        }
        return res.status(404).json({ error: "Preview file not found on disk" });
      }

      // Handle object storage files
      if (scan.storageKey.startsWith("/lidar-scans/") && objectStorageService.isConfigured()) {
        await objectStorageService.downloadLidarScan(scan.storageKey, res);
        return;
      }

      // Handle legacy /tmp files
      if (!fs.existsSync(scan.storageKey)) {
        return res.status(404).json({ error: "Scan file not found" });
      }

      const contentType = scan.scanFormat === "json" ? "application/json" : 
                         scan.scanFormat === "ply" ? "application/x-ply" : "text/plain";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${scan.originalFilename}"`);
      
      const fileStream = fs.createReadStream(scan.storageKey);
      fileStream.pipe(res);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/openings/:id/lidar-scans - List all scans for an opening
  app.get("/api/openings/:id/lidar-scans", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify opening belongs to user's organization
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const scans = await storage.getLidarScansByOpening(req.params.id);
      res.json(scans);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ==================== PYTHON LIDAR SERVICE PROXY ROUTES ====================
  // Advanced LiDAR processing using Python Flask service with Open3D
  const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8080";

  // POST /api/lidar/scans/:id/process-advanced - Advanced processing with Open3D
  app.post("/api/lidar/scans/:id/process-advanced", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update status to processing
      await storage.updateLidarScan(req.params.id, {
        processingStatus: "processing",
        processingStartedAt: new Date(),
      });

      try {
        // Upload scan file to Python service
        const fileBuffer = fs.readFileSync(scan.storageKey);
        const uploadResponse = await fetch(`${PYTHON_SERVICE_URL}/uploadScan`, {
          method: "POST",
          headers: {
            "X-Scan-Type": "ios_lidar",
            "X-File-Ext": scan.scanFormat,
            "Content-Type": "application/octet-stream",
          },
          body: fileBuffer,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload scan to Python service");
        }

        const uploadResult: any = await uploadResponse.json();
        const pythonScanId = uploadResult.scan_id;

        // Process with fast or full mode
        const modeSchema = z.object({ mode: z.enum(["fast", "full"]).optional() });
        const parsedMode = modeSchema.safeParse(req.body);
        const mode = (parsedMode.success && parsedMode.data.mode) ? parsedMode.data.mode : (req.query.mode as string) || "fast";
        const processResponse = await fetch(
          `${PYTHON_SERVICE_URL}/processLidar/${pythonScanId}?mode=${mode}`,
          {
            method: "POST",
            headers: { "X-Mode": mode },
          }
        );

        if (!processResponse.ok) {
          throw new Error("Failed to process scan with Python service");
        }

        const processResult: any = await processResponse.json();
        
        // Extract metrics
        const metrics = {
          width: processResult.metrics.width_mm,
          height: processResult.metrics.height_mm,
          frameDepth: processResult.metrics.frame_depth_mm,
          units: "mm",
        };

        // Update the linked opening with measurements
        if (scan.openingId && metrics.width && metrics.height) {
          await storage.updateOpening(scan.openingId, orgContext.organizationId, scanOpeningMeasurements(metrics));
        }

        // Trigger compliance validation
        let complianceFindings: any = {};
        if (scan.openingId) {
          const violations = await checkOpeningCompliance(scan.openingId);
          complianceFindings = {
            violations: violations.map(v => ({
              ruleId: v.ruleId,
              status: v.status,
              detectedAt: v.detectedAt,
            })),
            totalViolations: violations.length,
            checkedAt: new Date(),
          };
        }

        // Update scan with results
        const updatedScan = await storage.updateLidarScan(req.params.id, {
          processedMetrics: metrics as any,
          confidenceScores: { overall: 0.8, width: 0.8, height: 0.8, frameDepth: 0.7 } as any,
          complianceFindings: complianceFindings as any,
          processingStatus: "processed",
          processingCompletedAt: new Date(),
        });

        res.json({
          scan: updatedScan,
          pythonResults: processResult,
        });
      } catch (processingError) {
        logError(processingError instanceof Error ? processingError : new Error(String(processingError)), { 
          context: 'lidar-python-processing',
          scanId: req.params.id 
        });
        
        await storage.updateLidarScan(req.params.id, {
          processingStatus: "failed",
          processingCompletedAt: new Date(),
        });

        return res.status(500).json({ 
          error: "Failed to process scan with advanced processing",
          details: processingError instanceof Error ? processingError.message : String(processingError)
        });
      }
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/lidar/scans/:id/progress - Get processing progress from Python service
  app.get("/api/lidar/scans/:id/progress", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Proxy to Python service
      const pythonScanId = req.query.pythonScanId || req.params.id;
      const progressResponse = await fetch(`${PYTHON_SERVICE_URL}/progress/${pythonScanId}`);
      
      if (!progressResponse.ok) {
        return res.status(404).json({ error: "Progress not found" });
      }

      const progressData = await progressResponse.json();
      res.json(progressData);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'lidar-progress' });
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // DELETE /api/lidar/scans/:id - Delete a scan
  app.delete("/api/lidar/scans/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Verify ownership
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Delete file from storage
      try {
        if (fs.existsSync(scan.storageKey)) {
          fs.unlinkSync(scan.storageKey);
        }
      } catch (fileError) {
        logError(fileError instanceof Error ? fileError : new Error(String(fileError)), { 
          context: 'file-deletion',
          scanId: req.params.id 
        });
      }

      // Delete database record
      const deleted = await storage.deleteLidarScan(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Scan not found" });
      }

      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // SCAN PHOTOS API - Reference photos captured during LiDAR scanning
  // ============================================================================

  const photoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  // POST /api/lidar/scans/:id/photos - Upload photos for a scan session
  app.post("/api/lidar/scans/:id/photos", photoUpload.array("photos", 20), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No photos uploaded" });
      }

      const scanPhotoBodySchema = z.object({
        photoType: z.string().optional(),
        stitchingGroupId: z.string().nullable().optional(),
        captions: z.string().optional(),
      });
      const parsedPhotoBody = scanPhotoBodySchema.safeParse(req.body);
      if (!parsedPhotoBody.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsedPhotoBody.error.errors });
      }
      const photoType = parsedPhotoBody.data.photoType || "reference";
      const stitchingGroupId = parsedPhotoBody.data.stitchingGroupId || null;
      const captions: string[] = parsedPhotoBody.data.captions ? JSON.parse(parsedPhotoBody.data.captions) : [];

      const createdPhotos = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tmpDir = "/tmp/scan-photos";
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        const filename = `${Date.now()}-${i}-${file.originalname}`;
        const storageKey = path.join(tmpDir, filename);
        fs.writeFileSync(storageKey, file.buffer);

        const photoData = insertScanPhotoSchema.parse({
          scanId: scan.id,
          organizationId: orgContext.organizationId,
          openingId: scan.openingId || null,
          projectId: scan.projectId || null,
          uploaderId: orgContext.userId,
          storageKey,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          sequenceIndex: i,
          photoType,
          stitchingGroupId,
          caption: captions[i] || null,
        });

        const photo = await storage.createScanPhoto(photoData);
        createdPhotos.push(photo);
      }

      logger.info("Scan photos uploaded", {
        scanId: scan.id,
        count: createdPhotos.length,
        photoType,
      });

      res.status(201).json(createdPhotos);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/lidar/scans/:id/photos - Get all photos for a scan
  app.get("/api/lidar/scans/:id/photos", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }
      if (scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const photos = await storage.getScanPhotosByScan(scan.id);
      res.json(photos);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/lidar/scans/:scanId/photos/:photoId/download - Download a scan photo
  app.get("/api/lidar/scans/:scanId/photos/:photoId/download", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.scanId);
      if (!scan || scan.organizationId !== orgContext.organizationId) {
        return res.status(404).json({ error: "Not found" });
      }

      const photos = await storage.getScanPhotosByScan(scan.id);
      const photo = photos.find(p => p.id === req.params.photoId);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      if (fs.existsSync(photo.storageKey)) {
        res.setHeader("Content-Type", photo.mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${photo.originalFilename}"`);
        const fileStream = fs.createReadStream(photo.storageKey);
        fileStream.pipe(res);
      } else {
        res.status(404).json({ error: "Photo file not found on disk" });
      }
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE /api/lidar/scans/:scanId/photos/:photoId - Delete a scan photo
  app.delete("/api/lidar/scans/:scanId/photos/:photoId", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getLidarScan(req.params.scanId);
      if (!scan || scan.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const photos = await storage.getScanPhotosByScan(scan.id);
      const photo = photos.find(p => p.id === req.params.photoId);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      try {
        if (fs.existsSync(photo.storageKey)) {
          fs.unlinkSync(photo.storageKey);
        }
      } catch (e) { /* ignore */ }

      await storage.deleteScanPhoto(photo.id);
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/openings/:id/dual-scan-status - Check dual scan completion status
  app.get("/api/openings/:id/dual-scan-status", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const scans = await storage.getLidarScansByOpening(req.params.id);
      const closedAScans = scans.filter(s => s.scanPurpose === "dual-closed-a");
      const closedBScans = scans.filter(s => s.scanPurpose === "dual-closed-b");
      const closedLegacyScans = scans.filter(s => s.scanPurpose === "dual-closed");
      const openScans = scans.filter(s => s.scanPurpose === "dual-open");
      const singleScans = scans.filter(s => s.scanPurpose === "single");

      const allClosedScans = [...closedAScans, ...closedBScans, ...closedLegacyScans];

      const closedAProcessed = closedAScans.some(s => s.processingStatus === "processed");
      const closedBProcessed = closedBScans.some(s => s.processingStatus === "processed");
      const openProcessed = openScans.some(s => s.processingStatus === "processed");

      const hasClosedA = closedAScans.length > 0;
      const hasClosedB = closedBScans.length > 0;
      const hasOpen = openScans.length > 0;
      const tripleScanComplete = hasClosedA && hasClosedB && hasOpen;
      const tripleScanProcessed = closedAProcessed && closedBProcessed && openProcessed;

      const totalPhotos = (await Promise.all(
        scans.map(s => storage.getScanPhotosByScan(s.id))
      )).flat().length;

      res.json({
        openingId: req.params.id,
        scans: {
          total: scans.length,
          closedA: {
            count: closedAScans.length,
            processed: closedAProcessed,
            scanIds: closedAScans.map(s => s.id),
          },
          closedB: {
            count: closedBScans.length,
            processed: closedBProcessed,
            scanIds: closedBScans.map(s => s.id),
          },
          closed: {
            count: allClosedScans.length,
            processed: closedAProcessed || closedBProcessed,
            scanIds: allClosedScans.map(s => s.id),
          },
          open: {
            count: openScans.length,
            processed: openProcessed,
            scanIds: openScans.map(s => s.id),
          },
          single: {
            count: singleScans.length,
            scanIds: singleScans.map(s => s.id),
          },
        },
        tripleScanComplete,
        tripleScanProcessed,
        dualScanComplete: tripleScanComplete,
        dualScanProcessed: tripleScanProcessed,
        hardwareIdReady: tripleScanComplete,
        totalPhotos,
        hasModel: scans.some(s => s.modelStorageKey),
        hasWireframe: scans.some(s => s.wireframeStorageKey),
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // DUAL-SCAN LIDAR PROCESSING & CAD DRAWING GENERATION API
  // ============================================================================

  // Configure multer for dual-scan uploads (200MB limit for point cloud files)
  const dualScanUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedExtensions = [".ply", ".obj", ".json"];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Only PLY, OBJ, and JSON point cloud files are allowed. Received: ${fileExtension}`));
      }
    }
  });

  // GET /api/dual-scan/protocol - Get scanning protocol steps
  app.get("/api/dual-scan/protocol", async (req, res) => {
    try {
      res.json({
        steps: DUAL_SCAN_PROTOCOL_STEPS,
        totalSteps: DUAL_SCAN_PROTOCOL_STEPS.length,
        estimatedDurationMinutes: 5
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST /api/dual-scan/sessions - Create new dual scan session
  app.post("/api/dual-scan/sessions", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { openingId, projectId } = req.body;

      if (!openingId || !projectId) {
        return res.status(400).json({ error: "openingId and projectId are required" });
      }

      // Verify project access
      const project = await storage.getProject(projectId, orgContext.organizationId);
      if (!project) {
        return res.status(403).json({ error: "Project not found or access denied" });
      }

      // Verify opening exists and belongs to project
      const opening = await storage.getOpening(openingId);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      if (opening.projectId !== projectId) {
        return res.status(400).json({ error: "Opening does not belong to the specified project" });
      }

      // Create session
      const sessionId = generateSessionId();
      const now = new Date();
      
      const session: DualScanSessionData = {
        id: sessionId,
        openingId,
        projectId,
        organizationId: orgContext.organizationId,
        status: "pending-closed",
        createdAt: now,
        updatedAt: now
      };

      await storage.createDualScanSession(session);

      logger.info("Dual-scan session created", {
        sessionId,
        openingId,
        projectId,
        organizationId: orgContext.organizationId
      });

      res.status(201).json({
        id: sessionId,
        status: session.status,
        createdAt: session.createdAt,
        nextStep: "Upload closed door scan"
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST /api/dual-scan/sessions/:sessionId/upload/:scanType - Upload scan file
  app.post("/api/dual-scan/sessions/:sessionId/upload/:scanType", dualScanUpload.single("file"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { sessionId, scanType } = req.params;

      if (!["closed", "open"].includes(scanType)) {
        return res.status(400).json({ error: "scanType must be 'closed' or 'open'" });
      }

      const session = await storage.getDualScanSession(sessionId, orgContext.organizationId);
      if (!session) {
        if (await storage.dualScanSessionExists(sessionId)) {
          return res.status(403).json({ error: "Access denied" });
        }
        return res.status(404).json({ error: "Session not found" });
      }

      // Verify ownership
      if (session.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate state transitions
      if (scanType === "closed" && session.status !== "pending-closed") {
        return res.status(400).json({ error: "Session is not awaiting closed scan" });
      }
      if (scanType === "open" && session.status !== "closed-captured" && session.status !== "pending-open") {
        return res.status(400).json({ error: "Session is not awaiting open scan. Upload closed scan first." });
      }

      // Determine format from file extension
      const fileExtension = path.extname(req.file.originalname).toLowerCase().replace(".", "") as "ply" | "obj" | "json";

      let filePath: string;

      // Upload to object storage if configured, otherwise fallback to /tmp
      if (objectStorageService.isConfigured()) {
        try {
          const scanId = `${sessionId}_${scanType}`;
          const uploadResult = await objectStorageService.uploadLidarScan(
            req.file.buffer,
            session.organizationId,
            scanId,
            req.file.originalname,
            fileExtension
          );
          filePath = uploadResult.storageKey;
          
          logger.info("Dual-scan file uploaded to object storage", {
            sessionId,
            scanType,
            storageKey: filePath,
            checksum: uploadResult.metadata.checksum,
          });
        } catch (error) {
          logger.error("Failed to upload dual-scan to object storage, falling back to /tmp", { error });
          // Fallback to /tmp storage
          const tmpDir = "/tmp/dual-scans";
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          const filename = `${sessionId}_${scanType}_${Date.now()}.${fileExtension}`;
          filePath = path.join(tmpDir, filename);
          fs.writeFileSync(filePath, req.file.buffer);
        }
      } else {
        // Use /tmp storage when object storage is not configured
        const tmpDir = "/tmp/dual-scans";
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        const filename = `${sessionId}_${scanType}_${Date.now()}.${fileExtension}`;
        filePath = path.join(tmpDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
      }

      // Update session
      if (scanType === "closed") {
        session.closedScanPath = filePath;
        session.closedScanFormat = fileExtension;
        session.status = "closed-captured";
      } else {
        session.openScanPath = filePath;
        session.openScanFormat = fileExtension;
        session.status = "open-captured";
      }
      session.updatedAt = new Date();

      await storage.saveDualScanSession(session, orgContext.organizationId);

      logger.info("Dual-scan file uploaded", {
        sessionId,
        scanType,
        format: fileExtension,
        fileSize: req.file.size,
        storagePath: filePath
      });

      res.json({
        id: sessionId,
        status: session.status,
        scanType,
        fileSize: req.file.size,
        format: fileExtension,
        nextStep: scanType === "closed" ? "Upload open door scan" : "Process scans"
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST /api/dual-scan/sessions/:sessionId/process - Process dual scan
  app.post("/api/dual-scan/sessions/:sessionId/process", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { sessionId } = req.params;
      const session = await storage.getDualScanSession(sessionId, orgContext.organizationId);

      if (!session) {
        if (await storage.dualScanSessionExists(sessionId)) {
          return res.status(403).json({ error: "Access denied" });
        }
        return res.status(404).json({ error: "Session not found" });
      }

      // Verify ownership
      if (session.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify both scans are uploaded
      if (!session.closedScanPath || !session.openScanPath) {
        return res.status(400).json({ 
          error: "Both closed and open scans must be uploaded before processing",
          hasClosedScan: !!session.closedScanPath,
          hasOpenScan: !!session.openScanPath
        });
      }

      // Update status to processing
      session.status = "processing";
      session.updatedAt = new Date();
      await storage.saveDualScanSession(session, orgContext.organizationId);

      logger.info("Starting dual-scan processing", { sessionId });

      try {
        // Process dual scan
        const analysisResult = await processDualScan(
          session.closedScanPath,
          session.openScanPath,
          session.closedScanFormat || "ply",
          session.openScanFormat || session.closedScanFormat || "ply"
        );

        // Update session with results
        session.analysisResult = analysisResult;
        session.status = "completed";
        session.completedAt = new Date();
        session.updatedAt = new Date();
        await storage.saveDualScanSession(session, orgContext.organizationId);

        logger.info("Dual-scan processing completed", {
          sessionId,
          hingeSide: analysisResult.orientation.hingeSide,
          swingDirection: analysisResult.orientation.swingDirection,
          confidence: analysisResult.confidence.overall
        });

        res.json({
          id: sessionId,
          status: session.status,
          analysisResult,
          completedAt: session.completedAt
        });
      } catch (processingError) {
        // Update status to failed
        session.status = "failed";
        session.updatedAt = new Date();
        await storage.saveDualScanSession(session, orgContext.organizationId);

        logError(processingError instanceof Error ? processingError : new Error(String(processingError)), {
          context: "dual-scan-processing",
          sessionId
        });

        return res.status(500).json({
          error: "Scan processing failed",
          message: processingError instanceof Error ? processingError.message : "Unknown error"
        });
      }
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST /api/dual-scan/sessions/:sessionId/drawings - Generate drawings
  app.post("/api/dual-scan/sessions/:sessionId/drawings", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { sessionId } = req.params;
      const session = await storage.getDualScanSession(sessionId, orgContext.organizationId);

      if (!session) {
        if (await storage.dualScanSessionExists(sessionId)) {
          return res.status(403).json({ error: "Access denied" });
        }
        return res.status(404).json({ error: "Session not found" });
      }

      // Verify ownership
      if (session.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify analysis is complete
      if (!session.analysisResult) {
        return res.status(400).json({ 
          error: "Analysis must be completed before generating drawings",
          sessionStatus: session.status
        });
      }

      // Get opening data for drawing metadata
      const opening = await storage.getOpening(session.openingId);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const project = await storage.getProject(session.projectId, orgContext.organizationId);

      logger.info("Generating door drawing set", { sessionId, openingId: session.openingId });

      // Generate drawings
      const openingData = {
        id: session.openingId,
        name: `Opening ${opening.openingNumber || opening.id}`,
        openingNumber: opening.openingNumber || "",
        location: opening.location || "",
        projectName: project?.name
      };

      const drawingOptionsSchema = z.object({
        scale: z.string().optional(),
        units: z.enum(["mm", "in"]).optional(),
        colorScheme: z.enum(["print-friendly", "color", "greyscale"]).optional(),
      });
      const parsedDrawingOpts = drawingOptionsSchema.safeParse(req.body);
      const drawingOptions = parsedDrawingOpts.success ? parsedDrawingOpts.data : {};

      const drawingSet = generateDoorDrawingSet(session.analysisResult, openingData, {
        scale: drawingOptions.scale || "1:10",
        units: drawingOptions.units === "in" ? "inches" : "mm",
        colorScheme: drawingOptions.colorScheme === "color" ? "color-coded" : "print-friendly"
      });

      // Store in session
      session.drawingSet = drawingSet;
      session.updatedAt = new Date();
      await storage.saveDualScanSession(session, orgContext.organizationId);

      logger.info("Door drawing set generated", {
        sessionId,
        drawingCount: drawingSet.drawings.length
      });

      res.json({
        id: sessionId,
        drawingSet: {
          id: drawingSet.id,
          generatedAt: drawingSet.generatedAt,
          drawingCount: drawingSet.drawings.length,
          drawings: drawingSet.drawings.map(d => ({
            id: d.id,
            type: d.type,
            title: d.title,
            scale: d.scale
          }))
        }
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/dual-scan/sessions/:sessionId - Get session status and results
  app.get("/api/dual-scan/sessions/:sessionId", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { sessionId } = req.params;
      const session = await storage.getDualScanSession(sessionId, orgContext.organizationId);

      if (!session) {
        if (await storage.dualScanSessionExists(sessionId)) {
          return res.status(403).json({ error: "Access denied" });
        }
        return res.status(404).json({ error: "Session not found" });
      }

      // Verify ownership
      if (session.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({
        id: session.id,
        openingId: session.openingId,
        projectId: session.projectId,
        status: session.status,
        hasClosedScan: !!session.closedScanPath,
        hasOpenScan: !!session.openScanPath,
        hasAnalysis: !!session.analysisResult,
        hasDrawings: !!session.drawingSet,
        analysisResult: session.analysisResult,
        drawingSet: session.drawingSet ? {
          id: session.drawingSet.id,
          generatedAt: session.drawingSet.generatedAt,
          drawingCount: session.drawingSet.drawings.length,
          drawings: session.drawingSet.drawings.map(d => ({
            id: d.id,
            type: d.type,
            title: d.title,
            scale: d.scale
          }))
        } : null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        completedAt: session.completedAt
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/dual-scan/sessions/:sessionId/export/:format - Export drawing
  app.get("/api/dual-scan/sessions/:sessionId/export/:format", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { sessionId, format } = req.params;
      const { drawingId } = req.query;

      if (!["svg", "dxf", "pdf"].includes(format)) {
        return res.status(400).json({ error: "Format must be 'svg', 'dxf', or 'pdf'" });
      }

      const session = await storage.getDualScanSession(sessionId, orgContext.organizationId);

      if (!session) {
        if (await storage.dualScanSessionExists(sessionId)) {
          return res.status(403).json({ error: "Access denied" });
        }
        return res.status(404).json({ error: "Session not found" });
      }

      // Verify ownership
      if (session.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!session.drawingSet) {
        return res.status(400).json({ error: "No drawings generated for this session" });
      }

      // Find the specific drawing or use the first one
      let drawing = session.drawingSet.drawings[0];
      if (drawingId && typeof drawingId === "string") {
        const found = session.drawingSet.drawings.find(d => d.id === drawingId);
        if (found) drawing = found;
      }

      if (!drawing) {
        return res.status(404).json({ error: "Drawing not found" });
      }

      const filename = `door_drawing_${sessionId}_${drawing.type}.${format}`;

      if (format === "svg") {
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(drawing.svgContent);
      } else if (format === "dxf") {
        const dxfContent = exportToDxf(drawing);
        res.setHeader("Content-Type", "application/dxf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(dxfContent);
      } else if (format === "pdf") {
        // For PDF, we wrap the SVG in a basic HTML document for printing
        const pdfHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                body { margin: 0; padding: 20px; }
                svg { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>
              ${drawing.svgContent}
            </body>
          </html>
        `;
        res.setHeader("Content-Type", "text/html");
        res.setHeader("Content-Disposition", `attachment; filename="${filename.replace('.pdf', '.html')}"`);
        res.send(pdfHtml);
      }
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // HARDWARE SCANS (BARCODE/LABEL SCANNING) API
  // ============================================================================

  // Configure multer for hardware label/barcode image uploads

  // POST /api/hardware/scan-label - Scan hardware label/barcode
  app.post("/api/hardware/scan-label", checkBarcodeScanLimit, hardwareLabelUpload.single("image"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const { openingId, projectId } = req.body;

      // Optional: verify opening and project if provided
      if (projectId) {
        const project = await storage.getProject(projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Project not found or access denied" });
        }
      }

      if (openingId) {
        const opening = await storage.getOpening(openingId);
        if (!opening) {
          return res.status(404).json({ error: "Opening not found" });
        }

        // Verify opening belongs to the project if both are provided
        if (projectId && opening.projectId !== projectId) {
          return res.status(400).json({ error: "Opening does not belong to the specified project" });
        }
      }

      // Save image to /tmp/hardware-scans directory
      const tmpDir = "/tmp/hardware-scans";
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const filename = `${Date.now()}-${req.file.originalname}`;
      const imagePath = path.join(tmpDir, filename);
      fs.writeFileSync(imagePath, req.file.buffer);

      // Store retrievable URL instead of filesystem path
      const imageUrl = `/api/hardware/scan-images/${filename}`;

      // Decode barcodes from image
      let decodedTokens: any[] = [];
      try {
        const decoded = await decodeImage(req.file.buffer);
        decodedTokens = decoded.map(d => ({
          symbology: d.symbology,
          text: d.text,
        }));
      } catch (decodeError) {
        logError(decodeError instanceof Error ? decodeError : new Error(String(decodeError)), { 
          context: 'barcode-decode',
          filename: req.file?.originalname 
        });
        // Continue even if decoding fails - we still store the image
      }

      // Parse hardware fields from decoded tokens
      const tokenTexts = decodedTokens.map(t => t.text);
      const extractedFields = parseHardwareTokens(tokenTexts);

      // Normalize fields with descriptions and catalog links
      const normalizedFields = await normalizeFields(extractedFields);

      // Create database record
      const scanData = insertHardwareScanSchema.parse({
        organizationId: orgContext.organizationId,
        projectId: projectId || null,
        openingId: openingId || null,
        scannedBy: orgContext.userId,
        scanType: "label_scan",
        imageUrl: imageUrl,
        imageFilename: req.file.originalname,
        decodedTokens: decodedTokens as any,
        extractedFields: extractedFields as any,
        normalizedFields: normalizedFields as any,
      });

      const scan = await storage.createHardwareScan(scanData);
      res.json(scan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/hardware/scan-usage - Get daily barcode scan usage stats
  app.get("/api/hardware/scan-usage", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const organization = await storage.getOrganization(orgContext.organizationId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Get tier limits
      const tier = organization.subscriptionTier as SubscriptionTier;
      const tierConfig = SUBSCRIPTION_TIERS[tier];
      const tierLimit = tierConfig?.features?.barcodeScanLimit;

      // Calculate start of today in UTC
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      // Calculate tomorrow (when limit resets)
      const tomorrow = new Date(todayStart);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      // Get today's scan count from database
      const todayScans = await db
        .select()
        .from(hardwareScans)
        .where(
          and(
            eq(hardwareScans.organizationId, organization.id),
            gte(hardwareScans.scannedAt, todayStart)
          )
        );

      const current = todayScans.length;
      const limit = tierLimit;
      const isUnlimited = limit === null || limit === undefined;
      
      // Calculate percent used (avoid division by zero)
      let percentUsed = 0;
      if (!isUnlimited && limit !== null && limit > 0) {
        percentUsed = Math.round((current / limit) * 100);
      }

      // Calculate remaining
      const remaining = isUnlimited ? null : Math.max(0, (limit || 0) - current);

      res.json({
        current,
        limit,
        isUnlimited,
        percentUsed,
        remaining,
        resetsAt: tomorrow.toISOString(),
        tier,
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/hardware/scans - List all hardware scans for organization
  app.get("/api/hardware/scans", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scans = await storage.getHardwareScans(orgContext.organizationId);
      res.json(scans);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/hardware/scans/:id - Get scan details
  app.get("/api/hardware/scans/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getHardwareScan(req.params.id, orgContext.organizationId);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      res.json(scan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/openings/:id/hardware-scans - List all scans for an opening
  app.get("/api/openings/:id/hardware-scans", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify opening belongs to user's organization
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const scans = await storage.getHardwareScansByOpening(req.params.id, orgContext.organizationId);
      res.json(scans);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE /api/hardware/scans/:id - Delete a hardware scan
  app.delete("/api/hardware/scans/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const scan = await storage.getHardwareScan(req.params.id, orgContext.organizationId);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Delete image file from storage
      try {
        // Extract filename from URL path (e.g., /api/hardware/scan-images/filename.jpg -> filename.jpg)
        const filename = scan.imageUrl.split('/').pop();
        if (filename) {
          const imagePath = path.join("/tmp/hardware-scans", filename);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
      } catch (fileError) {
        logError(fileError instanceof Error ? fileError : new Error(String(fileError)), { 
          context: 'file-deletion',
          scanId: req.params.id 
        });
      }

      // Delete database record
      const deleted = await storage.deleteHardwareScan(req.params.id, orgContext.organizationId);
      if (!deleted) {
        return res.status(404).json({ error: "Scan not found" });
      }

      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET /api/hardware/scan-images/:filename - Serve hardware scan images
  app.get("/api/hardware/scan-images/:filename", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { filename } = req.params;

      // Validate filename to prevent directory traversal attacks
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(400).json({ error: "Invalid filename" });
      }

      // Verify that a scan with this image URL exists and belongs to the user's organization
      const imageUrl = `/api/hardware/scan-images/${filename}`;
      const scans = await storage.getHardwareScans(orgContext.organizationId);
      const scan = scans.find(s => s.imageUrl === imageUrl);

      if (!scan) {
        return res.status(404).json({ error: "Image not found or access denied" });
      }

      // Serve the image file
      const imagePath = path.join("/tmp/hardware-scans", filename);
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ error: "Image file not found" });
      }

      // Detect content type from filename
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === ".png" ? "image/png" : "image/jpeg";

      res.setHeader("Content-Type", contentType);
      res.sendFile(imagePath);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Hardware Items API
  app.get("/api/hardware", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userItems = await storage.getHardwareItemsByOrganization(orgContext.organizationId);
      res.json(userItems);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/openings/:id/hardware", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Verify opening belongs to user's organization
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      const items = await storage.getHardwareItemsByOpening(req.params.id);
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/hardware", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Validate that openingId belongs to user's organization
      if (req.body.openingId) {
        const opening = await storage.getOpening(req.body.openingId);
        if (!opening) {
          return res.status(404).json({ error: "Opening not found" });
        }
        
        const project = await storage.getProject(opening.projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Cannot create hardware item for opening not in your organization" });
        }
      }
      
      const data = insertHardwareItemSchema.parse(req.body);
      const item = await storage.createHardwareItem(data);
      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/hardware/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get hardware item and verify ownership
      const existingItem = await storage.getHardwareItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Hardware item not found" });
      }
      
      const opening = await storage.getOpening(existingItem.openingId);
      if (!opening) {
        return res.status(404).json({ error: "Hardware item not found" });
      }
      
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Hardware item not found" });
      }
      
      // If openingId is being changed, validate new opening belongs to user's org
      if (req.body.openingId && req.body.openingId !== existingItem.openingId) {
        const newOpening = await storage.getOpening(req.body.openingId);
        if (!newOpening) {
          return res.status(404).json({ error: "Opening not found" });
        }
        const newProject = await storage.getProject(newOpening.projectId, orgContext.organizationId);
        if (!newProject) {
          return res.status(403).json({ error: "Cannot move hardware item to opening not in your organization" });
        }
      }
      
      const item = await storage.updateHardwareItem(req.params.id, orgContext.organizationId, req.body);
      if (!item) {
        return res.status(404).json({ error: "Hardware item not found" });
      }
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/hardware/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get hardware item and verify ownership
      const existingItem = await storage.getHardwareItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Hardware item not found" });
      }
      
      const opening = await storage.getOpening(existingItem.openingId);
      if (!opening) {
        return res.status(404).json({ error: "Hardware item not found" });
      }
      
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Hardware item not found" });
      }
      
      const deleted = await storage.deleteHardwareItem(req.params.id, orgContext.organizationId);
      if (!deleted) {
        return res.status(404).json({ error: "Hardware item not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Hardware Bundles API (organization-scoped)
  app.get("/api/bundles", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const bundles = await storage.getHardwareBundles(orgContext.organizationId);
      res.json(bundles);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/bundles/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const bundle = await storage.getHardwareBundle(req.params.id, orgContext.organizationId);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      res.json(bundle);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/bundles", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const data = insertHardwareBundleSchema.parse({ ...req.body, organizationId: orgContext.organizationId });
      const bundle = await storage.createHardwareBundle(data);
      res.status(201).json(bundle);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/bundles/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const bundle = await storage.updateHardwareBundle(req.params.id, orgContext.organizationId, req.body);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      res.json(bundle);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/bundles/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const deleted = await storage.deleteHardwareBundle(req.params.id, orgContext.organizationId);
      if (!deleted) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Bundle Items API
  app.get("/api/bundles/:id/items", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Verify bundle belongs to user's organization
      const bundle = await storage.getHardwareBundle(req.params.id, orgContext.organizationId);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      
      const items = await storage.getBundleItems(req.params.id);
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/bundles/:bundleId/items", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Verify bundle belongs to user's organization
      const bundle = await storage.getHardwareBundle(req.params.bundleId, orgContext.organizationId);
      if (!bundle) {
        return res.status(403).json({ error: "Cannot create items for bundle not in your organization" });
      }
      
      const data = insertBundleItemSchema.parse({
        ...req.body,
        bundleId: req.params.bundleId,
      });
      const item = await storage.createBundleItem(data);
      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/bundle-items/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing bundle item and verify ownership
      const allItems = await storage.getBundleItems();
      const existingItem = allItems.find(i => i.id === req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Bundle item not found" });
      }
      
      // Verify parent bundle belongs to user's organization
      const bundle = await storage.getHardwareBundle(existingItem.bundleId, orgContext.organizationId);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle item not found" });
      }
      
      // If bundleId is being changed, validate new bundle belongs to user's org
      if (req.body.bundleId && req.body.bundleId !== existingItem.bundleId) {
        const newBundle = await storage.getHardwareBundle(req.body.bundleId, orgContext.organizationId);
        if (!newBundle) {
          return res.status(403).json({ error: "Cannot move bundle item to bundle not in your organization" });
        }
      }
      
      const item = await storage.updateBundleItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Bundle item not found" });
      }
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/bundle-items/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing bundle item and verify ownership
      const allItems = await storage.getBundleItems();
      const existingItem = allItems.find(i => i.id === req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Bundle item not found" });
      }
      
      // Verify parent bundle belongs to user's organization
      const bundle = await storage.getHardwareBundle(existingItem.bundleId, orgContext.organizationId);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle item not found" });
      }
      
      const deleted = await storage.deleteBundleItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Bundle item not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // BOM Templates - Pre-configured hardware sets
  app.get("/api/bom-templates", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const templates = await storage.getBomTemplates(orgContext.organizationId);
      res.json(templates);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/bom-templates/:id", async (req, res) => {
    try {
      const template = await storage.getBomTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/bom-templates/:id/items", async (req, res) => {
    try {
      const items = await storage.getBomTemplateItems(req.params.id);
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Alias routes for /api/hardware-bundles (maps to /api/bundles)
  app.get("/api/hardware-bundles", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const bundles = await storage.getHardwareBundles(orgContext.organizationId);
      res.json(bundles);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/hardware-bundles/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const bundle = await storage.getHardwareBundle(req.params.id, orgContext.organizationId);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      res.json(bundle);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/hardware-bundles", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const data = insertHardwareBundleSchema.parse({ ...req.body, organizationId: orgContext.organizationId });
      const bundle = await storage.createHardwareBundle(data);
      res.status(201).json(bundle);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/hardware-bundles/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const bundle = await storage.updateHardwareBundle(req.params.id, orgContext.organizationId, req.body);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      res.json(bundle);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/hardware-bundles/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const deleted = await storage.deleteHardwareBundle(req.params.id, orgContext.organizationId);
      if (!deleted) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Catalog Items API (organization-scoped)
  app.get("/api/catalog", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Check cache first
      const cacheKey = CacheKeys.catalogByOrg(orgContext.organizationId);
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      // Fetch from database
      const items = await storage.getCatalogItems(orgContext.organizationId);
      
      // Cache for 5 minutes (300000 ms)
      cache.set(cacheKey, items, 300000);
      
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/catalog/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const item = await storage.getCatalogItem(req.params.id, orgContext.organizationId);
      if (!item) {
        return res.status(404).json({ error: "Catalog item not found" });
      }
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/catalog", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const data = insertCatalogItemSchema.parse({ ...req.body, organizationId: orgContext.organizationId });
      const item = await storage.createCatalogItem(data);
      
      // Invalidate catalog cache
      cache.delete(CacheKeys.catalogByOrg(orgContext.organizationId));
      
      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/catalog/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const item = await storage.updateCatalogItem(req.params.id, orgContext.organizationId, req.body);
      if (!item) {
        return res.status(404).json({ error: "Catalog item not found" });
      }
      
      // Invalidate catalog cache
      cache.delete(CacheKeys.catalogByOrg(orgContext.organizationId));
      
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/catalog/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const deleted = await storage.deleteCatalogItem(req.params.id, orgContext.organizationId);
      if (!deleted) {
        return res.status(404).json({ error: "Catalog item not found" });
      }
      
      // Invalidate catalog cache
      cache.delete(CacheKeys.catalogByOrg(orgContext.organizationId));
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Hardware Cross-Reference API
  app.get("/api/cross-reference", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const items = await storage.getHardwareCrossReferences();
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/cross-reference/search/:partNumber", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const results = await storage.searchCrossReferenceByPart(req.params.partNumber);
      res.json(results);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/cross-reference/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const item = await storage.getHardwareCrossReference(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Cross-reference not found" });
      }
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/cross-reference", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const data = insertHardwareCrossReferenceSchema.parse(req.body);
      const item = await storage.createHardwareCrossReference(data);
      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/cross-reference/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const item = await storage.updateHardwareCrossReference(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Cross-reference not found" });
      }
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/cross-reference/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const deleted = await storage.deleteHardwareCrossReference(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Cross-reference not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Door Templates API (organization-scoped)
  app.get("/api/templates", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const templates = await storage.getDoorTemplates(orgContext.organizationId);
      res.json(templates);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const template = await storage.getDoorTemplate(req.params.id, orgContext.organizationId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const data = insertDoorTemplateSchema.parse({ ...req.body, organizationId: orgContext.organizationId });
      const template = await storage.createDoorTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const template = await storage.updateDoorTemplate(req.params.id, orgContext.organizationId, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const deleted = await storage.deleteDoorTemplate(req.params.id, orgContext.organizationId);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Reference Data API
  app.get("/api/reference/doors", async (req, res) => {
    try {
      const doors = await storage.getDoorReference();
      res.json(doors);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/reference/options", async (req, res) => {
    try {
      const options = await storage.getOptionsLookup();
      res.json(options);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/reference/survey-fields", async (req, res) => {
    try {
      const fields = await storage.getSurveyFieldReference();
      res.json(fields);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/reference/hardware-locations", async (req, res) => {
    try {
      const locations = await storage.getHardwareLocationCheat();
      res.json(locations);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/reference/edge-lite-types", async (req, res) => {
    try {
      const types = await storage.getEdgeLiteTypesHmma810();
      res.json(types);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/reference/lite-kits", async (req, res) => {
    try {
      const liteKits = await storage.getLiteKits();
      res.json(liteKits);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/reference/glass-types", async (req, res) => {
    try {
      const glassTypes = await storage.getGlassTypes();
      res.json(glassTypes);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/reference/glass-fire-sizes", async (req, res) => {
    try {
      const glassFire = await storage.getGlassFireSizes();
      res.json(glassFire);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/reference/pivot-patch-hardware", async (req, res) => {
    try {
      const hardware = await storage.getPivotPatchHardware();
      res.json(hardware);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Reference Data Export - Export all reference tables as JSON
  app.get("/api/reference/export", async (req, res) => {
    try {
      const [doorReference, optionsLookup, surveyFieldReference, hardwareLocationCheat, edgeLiteTypes] = await Promise.all([
        storage.getDoorReference(),
        storage.getOptionsLookup(),
        storage.getSurveyFieldReference(),
        storage.getHardwareLocationCheat(),
        storage.getEdgeLiteTypesHmma810()
      ]);

      const exportData = {
        door_reference: doorReference,
        options_lookup: optionsLookup,
        survey_field_reference: surveyFieldReference,
        hardware_location_cheat: hardwareLocationCheat,
        edge_lite_types_hmma_810: edgeLiteTypes
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="reference_data_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Reference Data Import - Import reference tables from JSON
  app.post("/api/reference/import", async (req, res) => {
    try {
      const data = req.body;

      // Validate structure
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: "Invalid data format" });
      }

      const validTables = ['door_reference', 'options_lookup', 'survey_field_reference', 'hardware_location_cheat', 'edge_lite_types_hmma_810'];
      const tablesToImport = Object.keys(data).filter(key => validTables.includes(key));

      if (tablesToImport.length === 0) {
        return res.status(400).json({ error: "No valid reference tables found in import data" });
      }

      const results: any = {
        imported: {},
        errors: []
      };

      // Import each table
      for (const table of tablesToImport) {
        try {
          const records = data[table];
          if (!Array.isArray(records)) {
            results.errors.push({ table, error: "Data must be an array" });
            continue;
          }

          // Use storage methods to import data
          let count = 0;
          switch (table) {
            case 'door_reference':
              await storage.importDoorReference(records);
              count = records.length;
              break;
            case 'options_lookup':
              await storage.importOptionsLookup(records);
              count = records.length;
              break;
            case 'survey_field_reference':
              await storage.importSurveyFieldReference(records);
              count = records.length;
              break;
            case 'hardware_location_cheat':
              await storage.importHardwareLocationCheat(records);
              count = records.length;
              break;
            case 'edge_lite_types_hmma_810':
              await storage.importEdgeLiteTypesHmma810(records);
              count = records.length;
              break;
          }
          
          results.imported[table] = count;
        } catch (err: any) {
          results.errors.push({ table, error: err.message });
        }
      }

      res.json({
        success: results.errors.length === 0,
        ...results
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Excel Export API
  app.post("/api/export/excel", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) return res.status(401).json({ error: "Unauthorized" });
      const { projectIds } = req.body;
      
      if (!Array.isArray(projectIds) || projectIds.length === 0) {
        return res.status(400).json({ error: "Project IDs required" });
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "DoorSurvey Pro";
      workbook.created = new Date();

      for (const projectId of projectIds) {
        const project = await storage.getProject(projectId, orgContext.organizationId);
        if (!project) continue;

        const openings = await storage.getOpeningsByProject(projectId);
        const costs = await storage.getProjectCost(projectId);
        
        const sheet = workbook.addWorksheet(
          project.name.substring(0, 31)
        );

        // Project info section
        sheet.getCell("A1").value = "Project Information";
        sheet.getCell("A1").font = { bold: true, size: 14 };
        sheet.getCell("A2").value = "Project Name:";
        sheet.getCell("B2").value = project.name;
        sheet.getCell("A3").value = "Location:";
        sheet.getCell("B3").value = project.location;
        sheet.getCell("A4").value = "Building Type:";
        sheet.getCell("B4").value = project.buildingType;
        sheet.getCell("A5").value = "Status:";
        sheet.getCell("B5").value = project.status;

        // Headers row
        const headerRow = 7;
        const headers = [
          "Opening #",
          "Location",
          "Door Type",
          "Door Material",
          "Door W (in)",
          "Door H (in)",
          "Door T (in)",
          "Frame Type",
          "Frame Material",
          "Frame W (in)",
          "Frame D (in)",
          "Lock Type",
          "Hinge Type",
          "Hinge Count",
          "Closer Type",
          "Exit Device",
          "Automation Req",
          "Automation Type",
          "Access Control Req",
          "Access Control Type",
          "Notes",
        ];

        headers.forEach((header, index) => {
          const cell = sheet.getCell(headerRow, index + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" },
          };
        });

        // Data rows
        openings.forEach((opening, index) => {
          const row = headerRow + 1 + index;
          const data = [
            opening.openingNumber,
            opening.location,
            opening.doorType,
            opening.doorMaterial,
            opening.doorWidth,
            opening.doorHeight,
            opening.doorThickness,
            opening.frameType,
            opening.frameMaterial,
            opening.frameWidth,
            opening.frameDepth,
            opening.lockType,
            opening.hingeType,
            opening.hingeCount,
            opening.closerType,
            opening.exitDevice,
            opening.automationRequired,
            opening.automationType,
            opening.accessControlRequired,
            opening.accessControlType,
            opening.notes,
          ];

          data.forEach((value, colIndex) => {
            sheet.getCell(row, colIndex + 1).value = value || "";
          });
        });

        // Auto-size columns
        sheet.columns.forEach((column) => {
          let maxLength = 10;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value?.toString() || "";
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(maxLength + 2, 50);
        });

        // Costs section
        if (costs) {
          const costsStartRow = headerRow + openings.length + 3;
          
          // Costs header
          sheet.getCell(costsStartRow, 1).value = "Project Costs";
          sheet.getCell(costsStartRow, 1).font = { bold: true, size: 14 };
          
          // Labor costs
          let currentRow = costsStartRow + 2;
          sheet.getCell(currentRow, 1).value = "Labor Hours & Rates";
          sheet.getCell(currentRow, 1).font = { bold: true };
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "PM Hours:";
          sheet.getCell(currentRow, 2).value = costs.pmHours || 0;
          sheet.getCell(currentRow, 3).value = "PM Rate:";
          sheet.getCell(currentRow, 4).value = costs.pmHourlyRate || 0;
          sheet.getCell(currentRow, 4).numFmt = "$#,##0.00";
          sheet.getCell(currentRow, 5).value = "PM Cost:";
          sheet.getCell(currentRow, 6).value = (costs.pmHours || 0) * (costs.pmHourlyRate || 0);
          sheet.getCell(currentRow, 6).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Engineering Hours:";
          sheet.getCell(currentRow, 2).value = costs.engineeringHours || 0;
          sheet.getCell(currentRow, 3).value = "Engineering Rate:";
          sheet.getCell(currentRow, 4).value = costs.engineeringHourlyRate || 0;
          sheet.getCell(currentRow, 4).numFmt = "$#,##0.00";
          sheet.getCell(currentRow, 5).value = "Engineering Cost:";
          sheet.getCell(currentRow, 6).value = (costs.engineeringHours || 0) * (costs.engineeringHourlyRate || 0);
          sheet.getCell(currentRow, 6).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Survey Hours:";
          sheet.getCell(currentRow, 2).value = costs.surveyHours || 0;
          sheet.getCell(currentRow, 3).value = "Survey Rate:";
          sheet.getCell(currentRow, 4).value = costs.surveyHourlyRate || 0;
          sheet.getCell(currentRow, 4).numFmt = "$#,##0.00";
          sheet.getCell(currentRow, 5).value = "Survey Cost:";
          sheet.getCell(currentRow, 6).value = (costs.surveyHours || 0) * (costs.surveyHourlyRate || 0);
          sheet.getCell(currentRow, 6).numFmt = "$#,##0.00";
          currentRow += 2;
          
          // Fixed costs & travel
          sheet.getCell(currentRow, 1).value = "Fixed Costs & Travel";
          sheet.getCell(currentRow, 1).font = { bold: true };
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Overhead Cost:";
          sheet.getCell(currentRow, 2).value = costs.overheadCost || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Travel Time (hrs):";
          sheet.getCell(currentRow, 2).value = costs.travelTime || 0;
          sheet.getCell(currentRow, 3).value = "Travel Rate:";
          sheet.getCell(currentRow, 4).value = costs.travelRate || 0;
          sheet.getCell(currentRow, 4).numFmt = "$#,##0.00";
          sheet.getCell(currentRow, 5).value = "Travel Cost:";
          sheet.getCell(currentRow, 6).value = (costs.travelTime || 0) * (costs.travelRate || 0);
          sheet.getCell(currentRow, 6).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Initial Visit Cost:";
          sheet.getCell(currentRow, 2).value = costs.initialVisitCost || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Expedited Cost:";
          sheet.getCell(currentRow, 2).value = costs.expeditedCost || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Subcontractor Cost:";
          sheet.getCell(currentRow, 2).value = costs.subcontractorCost || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow += 2;
          
          // Fees & charges
          sheet.getCell(currentRow, 1).value = "Fees & Charges";
          sheet.getCell(currentRow, 1).font = { bold: true };
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Material/Fuel Charge:";
          sheet.getCell(currentRow, 2).value = costs.materialFuelCharge || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Handling Fee:";
          sheet.getCell(currentRow, 2).value = costs.handlingFee || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Programming/Testing/Labeling:";
          sheet.getCell(currentRow, 2).value = costs.programmingTestingLabelingFee || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Fire Prevention/Inspection:";
          sheet.getCell(currentRow, 2).value = costs.firePreventionInspectionFee || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Fire Relabeling/Inspection:";
          sheet.getCell(currentRow, 2).value = costs.fireRelabelingInspectionFee || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Disposal Fee:";
          sheet.getCell(currentRow, 2).value = costs.disposalFee || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Consumable Allowance:";
          sheet.getCell(currentRow, 2).value = costs.consumableAllowance || 0;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow += 2;
          
          // Calculated Estimates (from enhanced calculations)
          const hasCalculatedEstimates = costs.estimatedInstallationHours || costs.totalProjectWeight || 
            costs.hardwareMaterialCost || costs.hardwareWasteCost || 
            costs.freightBaseCost || costs.freightFuelSurcharge || costs.freightExpedited || costs.freightLiftGate || 
            costs.taxAmount;
          if (hasCalculatedEstimates) {
            sheet.getCell(currentRow, 1).value = "Calculated Estimates";
            sheet.getCell(currentRow, 1).font = { bold: true };
            currentRow++;
            
            if (costs.estimatedInstallationHours) {
              sheet.getCell(currentRow, 1).value = "Estimated Installation (hours):";
              sheet.getCell(currentRow, 2).value = costs.estimatedInstallationHours;
              sheet.getCell(currentRow, 2).numFmt = "#,##0.0";
              currentRow++;
            }
            
            if (costs.totalProjectWeight) {
              sheet.getCell(currentRow, 1).value = "Total Project Weight (lbs):";
              sheet.getCell(currentRow, 2).value = costs.totalProjectWeight;
              sheet.getCell(currentRow, 2).numFmt = "#,##0";
              currentRow++;
            }
            
            if (costs.hardwareMaterialCost || costs.hardwareWasteCost) {
              sheet.getCell(currentRow, 1).value = "Hardware Material:";
              sheet.getCell(currentRow, 2).value = costs.hardwareMaterialCost || 0;
              sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
              currentRow++;
              
              if (costs.hardwareWasteCost) {
                sheet.getCell(currentRow, 1).value = "Hardware Waste (8%):";
                sheet.getCell(currentRow, 2).value = costs.hardwareWasteCost;
                sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
                currentRow++;
              }
              
              const hardwareTotal = (costs.hardwareMaterialCost || 0) + (costs.hardwareWasteCost || 0);
              sheet.getCell(currentRow, 1).value = "Total Hardware Costs:";
              sheet.getCell(currentRow, 1).font = { bold: true };
              sheet.getCell(currentRow, 2).value = hardwareTotal;
              sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
              sheet.getCell(currentRow, 2).font = { bold: true };
              currentRow++;
            }
            
            if (costs.freightBaseCost || costs.freightFuelSurcharge || costs.freightExpedited || costs.freightLiftGate) {
              currentRow++;
              sheet.getCell(currentRow, 1).value = "Freight Breakdown:";
              sheet.getCell(currentRow, 1).font = { bold: true };
              currentRow++;
              
              if (costs.freightBaseCost) {
                sheet.getCell(currentRow, 1).value = "Base Freight:";
                sheet.getCell(currentRow, 2).value = costs.freightBaseCost;
                sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
                currentRow++;
              }
              
              if (costs.freightFuelSurcharge) {
                sheet.getCell(currentRow, 1).value = "Fuel Surcharge:";
                sheet.getCell(currentRow, 2).value = costs.freightFuelSurcharge;
                sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
                currentRow++;
              }
              
              if (costs.freightExpedited) {
                sheet.getCell(currentRow, 1).value = "Expedited Fee:";
                sheet.getCell(currentRow, 2).value = costs.freightExpedited;
                sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
                currentRow++;
              }
              
              if (costs.freightLiftGate) {
                sheet.getCell(currentRow, 1).value = "Lift Gate Fee:";
                sheet.getCell(currentRow, 2).value = costs.freightLiftGate;
                sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
                currentRow++;
              }
              
              const totalFreight = (costs.freightBaseCost || 0) + (costs.freightFuelSurcharge || 0) + 
                                  (costs.freightExpedited || 0) + (costs.freightLiftGate || 0);
              sheet.getCell(currentRow, 1).value = "Total Freight:";
              sheet.getCell(currentRow, 1).font = { bold: true };
              sheet.getCell(currentRow, 2).value = totalFreight;
              sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
              sheet.getCell(currentRow, 2).font = { bold: true };
              currentRow++;
            }
            
            if (costs.taxAmount) {
              const taxLabel = costs.taxRate ? `Tax (${costs.taxRate}%):` : "Tax:";
              sheet.getCell(currentRow, 1).value = taxLabel;
              sheet.getCell(currentRow, 1).font = { bold: true };
              sheet.getCell(currentRow, 2).value = costs.taxAmount;
              sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
              sheet.getCell(currentRow, 2).font = { bold: true };
              currentRow++;
            }
            
            currentRow += 2;
          }
          
          // Calculate totals
          const laborCosts = 
            ((costs.pmHours || 0) * (costs.pmHourlyRate || 0)) +
            ((costs.engineeringHours || 0) * (costs.engineeringHourlyRate || 0)) +
            ((costs.surveyHours || 0) * (costs.surveyHourlyRate || 0));
          
          const travelCosts = (costs.travelTime || 0) * (costs.travelRate || 0);
          
          const fixedCosts = 
            (costs.overheadCost || 0) +
            (costs.initialVisitCost || 0) +
            (costs.expeditedCost || 0) +
            (costs.subcontractorCost || 0);
          
          const fees = 
            (costs.materialFuelCharge || 0) +
            (costs.handlingFee || 0) +
            (costs.programmingTestingLabelingFee || 0) +
            (costs.firePreventionInspectionFee || 0) +
            (costs.fireRelabelingInspectionFee || 0) +
            (costs.disposalFee || 0) +
            (costs.consumableAllowance || 0);
          
          const subtotal = laborCosts + travelCosts + fixedCosts + fees;
          const margin = subtotal * ((costs.marginPercent || 0) / 100);
          const surcharge = subtotal * ((costs.surchargePercent || 0) / 100);
          const discount = subtotal * ((costs.discountPercent || 0) / 100);
          const total = subtotal + margin + surcharge - discount;
          
          // Cost summary
          sheet.getCell(currentRow, 1).value = "Cost Summary";
          sheet.getCell(currentRow, 1).font = { bold: true };
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Labor Costs:";
          sheet.getCell(currentRow, 2).value = laborCosts;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Travel Costs:";
          sheet.getCell(currentRow, 2).value = travelCosts;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Fixed Costs:";
          sheet.getCell(currentRow, 2).value = fixedCosts;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Fees & Charges:";
          sheet.getCell(currentRow, 2).value = fees;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "Subtotal:";
          sheet.getCell(currentRow, 1).font = { bold: true };
          sheet.getCell(currentRow, 2).value = subtotal;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          sheet.getCell(currentRow, 2).font = { bold: true };
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = `Margin (${costs.marginPercent || 0}%):`;
          sheet.getCell(currentRow, 2).value = margin;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = `Surcharge (${costs.surchargePercent || 0}%):`;
          sheet.getCell(currentRow, 2).value = surcharge;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = `Discount (${costs.discountPercent || 0}%):`;
          sheet.getCell(currentRow, 2).value = -discount;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          currentRow++;
          
          sheet.getCell(currentRow, 1).value = "TOTAL:";
          sheet.getCell(currentRow, 1).font = { bold: true, size: 12 };
          sheet.getCell(currentRow, 2).value = total;
          sheet.getCell(currentRow, 2).numFmt = "$#,##0.00";
          sheet.getCell(currentRow, 2).font = { bold: true, size: 12 };
          sheet.getCell(currentRow, 2).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0FFE0" },
          };
        }
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=door-survey-${new Date().toISOString().split("T")[0]}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'excel-export' });
      res.status(500).json({ error: "Export failed" });
    }
  });

  // PDF Export API - MIGRATED TO projects.routes.ts

  // Configure multer for file uploads (memory storage with limits)
  // COMMENTED OUT - upload already declared above for modular routes
  /*
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  });
  */

  // Import API - Catalog Import (CSV/Excel)
  app.post("/api/import/catalog", fileUploadLimiter, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file size
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
      }

      // Validate mimetype (allow common CSV and XLSX variants)
      const allowedMimeTypes = [
        "text/csv",
        "text/plain", // CSV can be sent as plain text
        "application/vnd.ms-excel", // CSV from some browsers
        "application/csv", // Another CSV variant
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid file type. Only CSV and XLSX files are supported." 
        });
      }

      const fileType = req.file.originalname.split(".").pop()?.toLowerCase();
      let catalogItems: any[] = [];

      if (fileType === "csv") {
        // Parse CSV
        const csvContent = req.file.buffer.toString("utf-8");
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });

        catalogItems = records
          .map((record: any) => ({
            category: record.category || "Doors",
            manufacturer: record.manufacturer?.trim(),
            model: record.model?.trim(),
            specifications: record.specifications?.trim() || "",
          }))
          .filter((item: any) => item.manufacturer && item.model); // Filter out rows with missing required fields
      } else if (fileType === "xlsx") {
        // Parse Excel (XLSX only, not legacy XLS)
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
          return res.status(400).json({ error: "Invalid Excel file" });
        }

        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell) => {
          headers.push(cell.value?.toString() || "");
        });

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header row

          const item: any = {};
          row.eachCell((cell, colNumber) => {
            item[headers[colNumber - 1]] = cell.value?.toString()?.trim();
          });

          // Only add if required fields are present
          if (item.manufacturer && item.model) {
            catalogItems.push({
              category: item.category || "Doors",
              manufacturer: item.manufacturer,
              model: item.model,
              specifications: item.specifications || "",
            });
          }
        });
      } else {
        return res.status(400).json({ error: "Unsupported file type. Only CSV and XLSX files are supported." });
      }

      // Insert catalog items into database
      let count = 0;
      for (let index = 0; index < catalogItems.length; index++) {
        const item = catalogItems[index];
        try {
          const validatedItem = insertCatalogItemSchema.parse(item);
          await storage.createCatalogItem(validatedItem);
          count++;
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), { 
            context: 'catalog-item-insert',
            row: index 
          });
        }
      }

      res.json({
        message: "Catalog imported successfully",
        count,
        total: catalogItems.length,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'catalog-import' });
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Import API - Cut Sheet Upload (PDF)
  app.post("/api/import/cutsheet", fileUploadLimiter, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file size
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
      }

      // Validate mimetype
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Invalid file type. Only PDF files are supported." });
      }

      const fileType = req.file.originalname.split(".").pop()?.toLowerCase();
      if (fileType !== "pdf") {
        return res.status(400).json({ error: "Only PDF files are supported" });
      }

      // Store cut sheet as base64 in database (for MVP)
      // In production, would use cloud storage like S3
      const base64Content = req.file.buffer.toString("base64");
      const fileName = req.file.originalname;

      // For MVP, we'll just return success without storing
      // In production, would store in dedicated cutsheets table or cloud storage

      res.json({
        message: "Cut sheet uploaded successfully",
        filename: fileName,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'cutsheet-upload' });
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Import API - Reference Data Import (JSON/CSV)
  app.post("/api/import/reference", fileUploadLimiter, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file size
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
      }

      // Validate mimetype (allow common JSON and CSV variants)
      const allowedMimeTypes = [
        "application/json",
        "text/csv",
        "text/plain", // CSV can be sent as plain text
        "application/vnd.ms-excel", // CSV from some browsers
        "application/csv", // Another CSV variant
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid file type. Only JSON and CSV files are supported." 
        });
      }

      const fileType = req.file.originalname.split(".").pop()?.toLowerCase();
      let referenceData: any[] = [];

      if (fileType === "json") {
        // Parse JSON
        const jsonContent = req.file.buffer.toString("utf-8");
        referenceData = JSON.parse(jsonContent);
      } else if (fileType === "csv") {
        // Parse CSV
        const csvContent = req.file.buffer.toString("utf-8");
        referenceData = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } else {
        return res.status(400).json({ error: "Unsupported file type. Use JSON or CSV." });
      }

      // For MVP, reference data import is not yet implemented
      // Reference data is pre-seeded and read-only
      // In production, would implement proper update/insert logic

      res.json({
        message: "Reference data import received (feature in development)",
        count: 0,
        total: referenceData.length,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'reference-import' });
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Compliance API
  
  // Check comprehensive compliance (database rules + hardware rules)
  app.post("/api/openings/:id/check-compliance", async (req, res) => {
    try {
      const result = await checkOpeningComplianceComprehensive(req.params.id);
      res.json({ 
        // Database-backed violations (persisted)
        databaseViolations: result.databaseViolations,
        databaseCount: result.databaseViolations.length,
        // Hardware rule violations (computed at runtime, not persisted)
        hardwareViolations: result.hardwareViolations,
        hardwareCount: result.hardwareViolations.length,
        // Legacy compatibility - total count
        count: result.databaseViolations.length + result.hardwareViolations.length,
        // Legacy compatibility - combined violations array
        violations: result.databaseViolations
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/openings/:id/violations", async (req, res) => {
    try {
      const violations = await getOpeningViolations(req.params.id);
      res.json(violations);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/openings/:id/compliance-report", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const openingId = req.params.id;
      const opening = await storage.getOpening(openingId);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(403).json({ error: "Project not found or access denied" });
      }

      const result = await checkOpeningComplianceComprehensive(openingId);

      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="compliance-report-${openingId}.pdf"`);
        res.send(pdfBuffer);
      });

      doc.fontSize(24).text("Door Opening Compliance Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Opening: ${opening.openingNumber || openingId}`, { align: "center" });
      doc.text(`Project: ${project.name}`, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(2);

      const totalViolations = result.databaseViolations.length + result.hardwareViolations.length;
      const isCompliant = totalViolations === 0;

      doc.fontSize(16).text("Compliance Summary", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(isCompliant ? "green" : "red")
        .text(`Status: ${isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}`);
      doc.fillColor("black");
      doc.text(`Total Violations: ${totalViolations}`);
      doc.text(`Database Rules: ${result.databaseViolations.length} violation(s)`);
      doc.text(`Hardware Rules: ${result.hardwareViolations.length} violation(s)`);
      doc.moveDown(1.5);

      if (result.hardwareViolations.length > 0) {
        doc.fontSize(16).text("Hardware Compliance Violations", { underline: true });
        doc.moveDown(0.5);
        result.hardwareViolations.forEach((v: any, i: number) => {
          doc.fontSize(11).fillColor("red").text(`${i + 1}. ${v.ruleName || v.ruleId}`);
          doc.fillColor("black").fontSize(10);
          doc.text(`   Message: ${v.message || "No message"}`);
          if (v.remediation) doc.text(`   Remediation: ${v.remediation}`);
          if (v.codeReferences?.length) doc.text(`   Codes: ${v.codeReferences.join(", ")}`);
          doc.moveDown(0.5);
        });
        doc.moveDown();
      }

      if (result.databaseViolations.length > 0) {
        doc.fontSize(16).text("Database Rule Violations", { underline: true });
        doc.moveDown(0.5);
        result.databaseViolations.forEach((v: any, i: number) => {
          doc.fontSize(11).fillColor("red").text(`${i + 1}. ${v.type || "Violation"}`);
          doc.fillColor("black").fontSize(10);
          doc.text(`   Description: ${v.description || "No description"}`);
          if (v.status) doc.text(`   Status: ${v.status}`);
          doc.moveDown(0.5);
        });
        doc.moveDown();
      }

      if (isCompliant) {
        doc.fontSize(14).fillColor("green").text("This door opening meets all compliance requirements.", { align: "center" });
        doc.fillColor("black");
      }

      doc.moveDown(2);
      doc.fontSize(9).fillColor("gray")
        .text("This report is generated automatically based on current compliance rules.", { align: "center" })
        .text("Always verify with local building codes and AHJ requirements.", { align: "center" });

      doc.end();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/violations/:id/resolve", async (req, res) => {
    try {
      const { notes } = req.body;
      const violation = await resolveViolation(req.params.id, notes);
      res.json(violation);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/violations/:id/waive", async (req, res) => {
    try {
      const { notes } = req.body;
      if (!notes) {
        return res.status(400).json({ error: "Notes required for waiving violation" });
      }
      const violation = await waiveViolation(req.params.id, notes);
      res.json(violation);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/jurisdictions/lookup", async (req, res) => {
    try {
      const { address, buildingType } = req.body;

      if (!address || typeof address !== "string") {
        return res.status(400).json({ error: "Address is required" });
      }

      const parsed = parseAddress(address);
      const jurisdiction = parsed.state
        ? getJurisdictionByState(parsed.state)
        : getJurisdictionByState("__fallback__");
      const standards = getApplicableStandards(jurisdiction, buildingType);

      let cityOverride: Partial<JurisdictionProfile> | null = null;
      if (parsed.city && jurisdiction.cityOverrides) {
        const cityKey = parsed.city.toLowerCase();
        for (const [key, override] of Object.entries(jurisdiction.cityOverrides)) {
          if (key.toLowerCase() === cityKey) {
            cityOverride = override;
            break;
          }
        }
      }

      const ahjInfo = (cityOverride as any)?.ahj || jurisdiction.ahj || null;

      res.json({
        parsed: {
          state: parsed.state,
          stateName: parsed.stateName,
          city: parsed.city,
          zipCode: parsed.zipCode,
          confidence: parsed.confidence,
        },
        jurisdiction: {
          code: jurisdiction.jurisdictionCode,
          stateName: jurisdiction.stateName,
          ibcEdition: jurisdiction.ibcEdition,
          ifcEdition: jurisdiction.ifcEdition,
          localCodeName: jurisdiction.localCodeName || null,
          adoptedCodes: jurisdiction.adoptedCodes,
          localAmendments: jurisdiction.localAmendments,
          adaApplies: jurisdiction.adaApplies,
          nfpaApplies: jurisdiction.nfpaApplies,
        },
        cityOverride: cityOverride
          ? {
              localCodeName: cityOverride.localCodeName || null,
              localAmendments: cityOverride.localAmendments || [],
              adoptedCodes: cityOverride.adoptedCodes || [],
            }
          : null,
        applicableStandards: standards,
        ahj: ahjInfo,
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Database-backed compliance rules
  app.get("/api/compliance/rules", async (req, res) => {
    try {
      // Check cache first
      const cacheKey = CacheKeys.complianceRules();
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      // Fetch from database
      const rules = await storage.getComplianceRules();
      
      // Cache for 15 minutes (900000 ms) - compliance rules rarely change
      cache.set(cacheKey, rules, 900000);
      
      res.json(rules);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Code-based hardware compliance rules (ADA, IBC, NFPA 80, etc.)
  app.get("/api/compliance/hardware-rules", async (req, res) => {
    try {
      const { category, jurisdiction } = req.query;
      
      let rules;
      if (category && typeof category === "string") {
        rules = getHardwareRulesByCategory(category as any);
      } else if (jurisdiction && typeof jurisdiction === "string") {
        rules = getHardwareRulesForJurisdiction(jurisdiction);
      } else {
        rules = getAllHardwareRules();
      }
      
      res.json(rules);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Validate hardware measurements against compliance rules
  app.post("/api/compliance/validate-hardware", async (req, res) => {
    try {
      const context: HardwareComplianceContext = req.body;
      const results = checkHardwareCompliance(context);
      
      const failures = results.filter(r => !r.passed && r.severity === "FAIL");
      const warnings = results.filter(r => !r.passed && r.severity === "WARN");
      const passes = results.filter(r => r.passed);
      
      res.json({
        results,
        summary: {
          total: results.length,
          passed: passes.length,
          failed: failures.length,
          warnings: warnings.length,
          compliant: failures.length === 0
        }
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // AI-Powered Features API
  const {
    analyzePhotoForSpecs,
    validateMeasurements,
    explainCompliance,
    suggestCorrections,
  } = await import("./ai-service.js");

  app.post("/api/ai/analyze-photo", aiAnalysisLimiter, async (req, res) => {
    try {
      const { imageBase64, buildingType } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: "Image data required" });
      }

      const result = await analyzePhotoForSpecs(imageBase64, buildingType);
      res.json(result);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-photo-analysis' });
      res.status(500).json({ error: "Photo analysis failed" });
    }
  });

  app.post("/api/ai/validate-measurements", aiAnalysisLimiter, async (req, res) => {
    try {
      const { width, height, thickness, doorType, buildingType } = req.body;
      
      if (!width || !height) {
        return res.status(400).json({ error: "Width and height required" });
      }

      const result = await validateMeasurements({
        width,
        height,
        thickness,
        doorType,
        buildingType,
      });
      
      res.json(result);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-measurement-validation' });
      res.status(500).json({ error: "Measurement validation failed" });
    }
  });

  app.post("/api/ai/explain-compliance", aiAnalysisLimiter, async (req, res) => {
    try {
      const { violation, doorSpecs } = req.body;
      
      if (!violation) {
        return res.status(400).json({ error: "Violation data required" });
      }

      const result = await explainCompliance(violation, doorSpecs || {});
      res.json(result);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-compliance-explanation' });
      res.status(500).json({ error: "Compliance explanation failed" });
    }
  });

  app.post("/api/ai/track-correction", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { openingId, correctionType, originalData, correctedData, context } = req.body;
      
      if (!correctionType || !originalData || !correctedData) {
        return res.status(400).json({ error: "Correction data required" });
      }
      
      // Validate that openingId belongs to user's organization (if provided)
      if (openingId) {
        const opening = await storage.getOpening(openingId);
        if (!opening) {
          return res.status(404).json({ error: "Opening not found" });
        }
        
        const project = await storage.getProject(opening.projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Cannot track correction for opening not in your organization" });
        }
      }

      // Analyze the correction to learn from it
      const insights = await suggestCorrections(originalData, correctedData, context || correctionType);
      
      // Store the correction in database
      const correction = await storage.createAiCorrection({
        openingId,
        correctionType,
        originalData,
        correctedData,
        context,
        insights,
      });
      
      res.json({ correction, insights });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-correction-tracking' });
      res.status(500).json({ error: "Correction tracking failed" });
    }
  });

  app.get("/api/ai/corrections/:openingId", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Verify opening belongs to user's organization
      const opening = await storage.getOpening(req.params.openingId);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }
      
      const corrections = await storage.getAiCorrectionsByOpening(req.params.openingId);
      res.json(corrections);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Customers (organization-scoped)
  app.get("/api/customers", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const customers = await storage.getCustomers(orgContext.organizationId);
      res.json(customers);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const customer = await storage.getCustomer(req.params.id, orgContext.organizationId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const validatedData = insertCustomerSchema.parse({ ...req.body, organizationId: orgContext.organizationId });
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const customer = await storage.updateCustomer(req.params.id, orgContext.organizationId, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const success = await storage.deleteCustomer(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Customer Locations
  app.get("/api/customers/:customerId/locations", async (req, res) => {
    try {
      const locations = await storage.getCustomerLocations(req.params.customerId);
      res.json(locations);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/customer-locations/:id", async (req, res) => {
    try {
      const location = await storage.getCustomerLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/customers/:customerId/locations", async (req, res) => {
    try {
      const validatedData = insertCustomerLocationSchema.parse({
        ...req.body,
        customerId: req.params.customerId,
      });
      const location = await storage.createCustomerLocation(validatedData);
      res.status(201).json(location);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/customer-locations/:id", async (req, res) => {
    try {
      const location = await storage.updateCustomerLocation(req.params.id, req.body);
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/customer-locations/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomerLocation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Customer Product History
  app.get("/api/customers/:customerId/product-history", async (req, res) => {
    try {
      const history = await storage.getCustomerProductHistory(req.params.customerId);
      res.json(history);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/customers/:customerId/most-used-products", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const products = await storage.getCustomerMostUsedProducts(req.params.customerId, limit);
      res.json(products);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/customers/:customerId/product-history", async (req, res) => {
    try {
      const validatedData = insertCustomerProductHistorySchema.parse({
        ...req.body,
        customerId: req.params.customerId,
      });
      const history = await storage.createProductHistory(validatedData);
      res.status(201).json(history);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Manufacturer Contacts (organization-scoped)
  app.get("/api/manufacturers", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Check cache first
      const cacheKey = CacheKeys.manufacturersByOrg(orgContext.organizationId);
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      // Fetch from database
      const contacts = await storage.getManufacturerContacts(orgContext.organizationId);
      
      // Cache for 10 minutes (600000 ms) - manufacturers change infrequently
      cache.set(cacheKey, contacts, 600000);
      
      res.json(contacts);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/manufacturers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const contact = await storage.getManufacturerContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }
      res.json(contact);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/manufacturers", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const validatedData = insertManufacturerContactSchema.parse({ ...req.body, organizationId: orgContext.organizationId });
      const contact = await storage.createManufacturerContact(validatedData, orgContext.userId, orgContext.organizationId);
      
      // Invalidate manufacturers cache
      cache.delete(CacheKeys.manufacturersByOrg(orgContext.organizationId));
      
      res.status(201).json(contact);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/manufacturers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const data = insertManufacturerContactSchema.partial().omit({ organizationId: true }).parse(req.body);
      const contact = await storage.updateManufacturerContact(req.params.id, data, orgContext.userId, orgContext.organizationId);
      if (!contact) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }
      
      // Invalidate manufacturers cache
      cache.delete(CacheKeys.manufacturersByOrg(orgContext.organizationId));
      
      res.json(contact);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/manufacturers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const success = await storage.deleteManufacturerContact(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }
      
      // Invalidate manufacturers cache
      cache.delete(CacheKeys.manufacturersByOrg(orgContext.organizationId));
      
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Manufacturer Products
  app.get("/api/manufacturers/:contactId/products", async (req, res) => {
    try {
      const products = await storage.getManufacturerProducts(req.params.contactId);
      res.json(products);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/manufacturers/:contactId/products", async (req, res) => {
    try {
      const validatedData = insertManufacturerProductSchema.parse({
        ...req.body,
        contactId: req.params.contactId,
      });
      const product = await storage.createManufacturerProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/manufacturers/products/:id", async (req, res) => {
    try {
      const success = await storage.deleteManufacturerProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Manufacturer product not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Quote Requests
  // GET all quote requests - requires engineering review access
  app.get("/api/quote-requests", requireFeature("engineeringReview"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userRequests = await storage.getQuoteRequestsByOrganization(orgContext.organizationId);
      res.json(userRequests);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/quote-requests/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const request = await storage.getQuoteRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(request.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      res.json(request);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });


  app.post("/api/quote-requests", quoteRequestLimiter, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Validate that projectId belongs to user's organization
      if (req.body.projectId) {
        const project = await storage.getProject(req.body.projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Cannot create quote request for project not in your organization" });
        }
      }
      
      const validatedData = insertQuoteRequestSchema.parse(req.body);
      const request = await storage.createQuoteRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/quote-requests/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing request and verify ownership
      const existingRequest = await storage.getQuoteRequest(req.params.id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      const project = await storage.getProject(existingRequest.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // If projectId is being changed, validate new project belongs to user's org
      if (req.body.projectId && req.body.projectId !== existingRequest.projectId) {
        const newProject = await storage.getProject(req.body.projectId, orgContext.organizationId);
        if (!newProject) {
          return res.status(403).json({ error: "Cannot move quote request to project not in your organization" });
        }
      }
      
      const request = await storage.updateQuoteRequest(req.params.id, req.body);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      res.json(request);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Send quote request emails
  app.post("/api/quote-requests/:id/send", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const request = await storage.getQuoteRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(request.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      // Check if quote has been approved before sending
      if (request.reviewStatus !== "approved") {
        return res.status(400).json({ error: "Quote must be approved by engineering before sending to customer" });
      }

      const [contact, opening, hardwareItem, disclaimers] = await Promise.all([
        storage.getManufacturerContact(request.manufacturerContactId),
        request.openingId ? storage.getOpening(request.openingId) : Promise.resolve(undefined),
        request.hardwareItemId ? storage.getHardwareItem(request.hardwareItemId) : Promise.resolve(undefined),
        storage.getDisclaimers(),
      ]);

      if (!project || !contact) {
        return res.status(404).json({ error: "Project or manufacturer contact not found" });
      }

      // Filter only active disclaimers
      const activeDisclaimers = disclaimers.filter(d => d.isActive === "yes");

      // Generate PDF forms
      const { generateAllQuoteForms } = await import("./manufacturer-quote-pdfs");
      const { coverPage, hardMachineSheet, orderForm } = await generateAllQuoteForms({
        project,
        opening,
        hardwareItem,
        disclaimers: activeDisclaimers,
      });

      // Send email with attachments
      const { emailService } = await import("./email-service");
      const result = await emailService.sendManufacturerQuote({
        project,
        opening,
        hardwareItem,
        manufacturerContact: contact,
        quoteRequest: request,
        attachments: [
          { filename: "cover-page.pdf", content: coverPage, contentType: "application/pdf" },
          { filename: "hard-machine-sheet.pdf", content: hardMachineSheet, contentType: "application/pdf" },
          { filename: "order-form.pdf", content: orderForm, contentType: "application/pdf" },
        ],
      });

      if (result.success) {
        // Update request status
        await storage.updateQuoteRequest(request.id, {
          status: "sent",
          sentAt: new Date(),
        });

        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ error: result.error || "Email send failed" });
      }
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'quote-request-send' });
      res.status(500).json({ error: "Failed to send quote request" });
    }
  });

  // Engineering Review Endpoints
  
  // Submit quote for engineering review
  app.post("/api/quote-requests/:id/submit-for-review", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const request = await storage.getQuoteRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(request.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      if (request.reviewStatus !== "draft" && request.reviewStatus !== "needs_revision") {
        return res.status(400).json({ error: "Quote can only be submitted from draft or needs revision status" });
      }

      const updated = await storage.updateQuoteRequest(request.id, {
        reviewStatus: "pending_review",
        submittedForReviewAt: new Date(),
      });

      res.json(updated);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'quote-submit-review' });
      res.status(500).json({ error: "Failed to submit quote for review" });
    }
  });

  // Approve quote request (Engineer+ only) - requires engineering review feature
  app.post("/api/quote-requests/:id/approve", requireFeature("engineeringReview"), requireRole(MEMBERSHIP_ROLES.ENGINEER), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const request = await storage.getQuoteRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(request.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      if (request.reviewStatus !== "pending_review") {
        return res.status(400).json({ error: "Quote must be in pending review status to approve" });
      }

      const { reviewerName, reviewNotes } = req.body;

      const updated = await storage.updateQuoteRequest(request.id, {
        reviewStatus: "approved",
        reviewedBy: reviewerName || "Engineering",
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || "Approved for customer submission",
      });

      res.json(updated);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'quote-approve' });
      res.status(500).json({ error: "Failed to approve quote" });
    }
  });

  // Reject quote request (Engineer+ only) - requires engineering review feature
  app.post("/api/quote-requests/:id/reject", requireFeature("engineeringReview"), requireRole(MEMBERSHIP_ROLES.ENGINEER), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const request = await storage.getQuoteRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(request.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      if (request.reviewStatus !== "pending_review") {
        return res.status(400).json({ error: "Quote must be in pending review status to reject" });
      }

      const { reviewerName, reviewNotes } = req.body;

      if (!reviewNotes) {
        return res.status(400).json({ error: "Review notes are required when rejecting a quote" });
      }

      const updated = await storage.updateQuoteRequest(request.id, {
        reviewStatus: "rejected",
        reviewedBy: reviewerName || "Engineering",
        reviewedAt: new Date(),
        reviewNotes,
      });

      res.json(updated);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'quote-reject' });
      res.status(500).json({ error: "Failed to reject quote" });
    }
  });

  // Request revisions on quote (Engineer+ only) - requires engineering review feature
  app.post("/api/quote-requests/:id/request-revision", requireFeature("engineeringReview"), requireRole(MEMBERSHIP_ROLES.ENGINEER), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const request = await storage.getQuoteRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(request.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      if (request.reviewStatus !== "pending_review") {
        return res.status(400).json({ error: "Quote must be in pending review status to request revisions" });
      }

      const { reviewerName, reviewNotes } = req.body;

      if (!reviewNotes) {
        return res.status(400).json({ error: "Review notes are required when requesting revisions" });
      }

      const updated = await storage.updateQuoteRequest(request.id, {
        reviewStatus: "needs_revision",
        reviewedBy: reviewerName || "Engineering",
        reviewedAt: new Date(),
        reviewNotes,
      });

      res.json(updated);
    } catch (error) {
      logError(error, { context: 'quote-revision-request' });
      res.status(500).json({ error: "Failed to request revisions" });
    }
  });

  // Customer Approval for Quotes (public-facing after internal approval)
  app.post("/api/quote-requests/:id/customer-approve", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const request = await storage.getQuoteRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(request.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      // Only internally approved quotes can be customer-approved
      if (request.reviewStatus !== "approved") {
        return res.status(400).json({ error: "Quote must be internally approved before customer approval" });
      }

      const { approverName, tier, notes, paymentAmount } = req.body;

      if (!tier || !["basic", "standard", "premium"].includes(tier)) {
        return res.status(400).json({ error: "Valid tier selection required (basic, standard, or premium)" });
      }

      if (!paymentAmount || paymentAmount <= 0) {
        return res.status(400).json({ error: "Valid payment amount required" });
      }

      const updated = await storage.updateQuoteRequest(request.id, {
        customerApprovalStatus: "approved",
        customerApprovedBy: approverName || "Customer",
        customerApprovedAt: new Date(),
        customerApprovalTier: tier,
        customerApprovalNotes: notes,
        paymentAmount: parseFloat(paymentAmount),
        paymentStatus: "unpaid",
      });

      res.json(updated);
    } catch (error) {
      logError(error, { context: 'customer-approval' });
      res.status(500).json({ error: "Failed to process customer approval" });
    }
  });

  // Preserve old links without allowing new online payments.
  app.post("/api/quote-requests/:id/create-payment", async (req, res) => {
    res.status(410).json({ error: "Online payments have been removed. Contact support to arrange payment." });
  });

  // Get Payment Status for Quote
  app.get("/api/quote-requests/:id/payment-status", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const request = await storage.getQuoteRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(request.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      res.json({
        paymentStatus: request.paymentStatus,
        paymentAmount: request.paymentAmount,
        paymentCurrency: request.paymentCurrency,
        paidAt: request.paidAt,
        customerApprovalStatus: request.customerApprovalStatus,
        customerApprovalTier: request.customerApprovalTier,
      });
    } catch (error) {
      logError(error, { context: 'payment-status-query' });
      res.status(500).json({ error: "Failed to get payment status" });
    }
  });

  // Purchase Orders API
  app.get("/api/purchase-orders", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get user's projects
      const userProjects = await storage.getProjects(orgContext.organizationId);
      const projectIds = userProjects.map(p => p.id);
      
      // Get all purchase orders and filter to user's projects
      const allPos = await storage.getPurchaseOrders();
      const userPos = allPos.filter(po => projectIds.includes(po.projectId));
      
      res.json(userPos);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(po.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      res.json(po);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });


  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Validate that projectId belongs to user's organization
      if (req.body.projectId) {
        const project = await storage.getProject(req.body.projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Cannot create purchase order for project not in your organization" });
        }
      }
      
      // Generate PO number if not provided
      if (!req.body.poNumber) {
        req.body.poNumber = await storage.generateNextPONumber();
      }
      
      const validatedData = insertPurchaseOrderSchema.parse(req.body);
      const po = await storage.createPurchaseOrder(validatedData);
      res.status(201).json(po);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/purchase-orders/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing PO and verify ownership
      const existingPo = await storage.getPurchaseOrder(req.params.id);
      if (!existingPo) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      const project = await storage.getProject(existingPo.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      // If projectId is being changed, validate new project belongs to user's org
      if (req.body.projectId && req.body.projectId !== existingPo.projectId) {
        const newProject = await storage.getProject(req.body.projectId, orgContext.organizationId);
        if (!newProject) {
          return res.status(403).json({ error: "Cannot move purchase order to project not in your organization" });
        }
      }
      
      const po = await storage.updatePurchaseOrder(req.params.id, req.body);
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json(po);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/purchase-orders/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing PO and verify ownership
      const existingPo = await storage.getPurchaseOrder(req.params.id);
      if (!existingPo) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      const project = await storage.getProject(existingPo.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      const success = await storage.deletePurchaseOrder(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Purchase Order Line Items API
  app.get("/api/purchase-orders/:poId/line-items", async (req, res) => {
    try {
      const items = await storage.getLineItemsByPO(req.params.poId);
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/purchase-orders/:poId/line-items", async (req, res) => {
    try {
      const validatedData = insertPurchaseOrderLineItemSchema.parse({
        ...req.body,
        purchaseOrderId: req.params.poId,
      });
      const item = await storage.createLineItem(validatedData);
      
      // Recalculate PO totals
      const allItems = await storage.getLineItemsByPO(req.params.poId);
      const subtotal = allItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      const po = await storage.getPurchaseOrder(req.params.poId);
      if (po) {
        const taxAmount = subtotal * ((po.taxRate || 0) / 100);
        const totalAmount = subtotal + taxAmount + (po.shippingCost || 0);
        await storage.updatePurchaseOrder(req.params.poId, {
          subtotal,
          taxAmount,
          totalAmount,
        });
      }
      
      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/purchase-orders/:poId/line-items/:itemId", async (req, res) => {
    try {
      const item = await storage.updateLineItem(req.params.itemId, req.body);
      if (!item) {
        return res.status(404).json({ error: "Line item not found" });
      }
      
      // Recalculate PO totals
      const allItems = await storage.getLineItemsByPO(req.params.poId);
      const subtotal = allItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      const po = await storage.getPurchaseOrder(req.params.poId);
      if (po) {
        const taxAmount = subtotal * ((po.taxRate || 0) / 100);
        const totalAmount = subtotal + taxAmount + (po.shippingCost || 0);
        await storage.updatePurchaseOrder(req.params.poId, {
          subtotal,
          taxAmount,
          totalAmount,
        });
      }
      
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/purchase-orders/:poId/line-items/:itemId", async (req, res) => {
    try {
      const success = await storage.deleteLineItem(req.params.itemId);
      if (!success) {
        return res.status(404).json({ error: "Line item not found" });
      }
      
      // Recalculate PO totals
      const allItems = await storage.getLineItemsByPO(req.params.poId);
      const subtotal = allItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      const po = await storage.getPurchaseOrder(req.params.poId);
      if (po) {
        const taxAmount = subtotal * ((po.taxRate || 0) / 100);
        const totalAmount = subtotal + taxAmount + (po.shippingCost || 0);
        await storage.updatePurchaseOrder(req.params.poId, {
          subtotal,
          taxAmount,
          totalAmount,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Generate next PO number
  app.get("/api/purchase-orders/generate-number/next", async (req, res) => {
    try {
      const poNumber = await storage.generateNextPONumber();
      res.json({ poNumber });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Create PO from Quote Request
  app.post("/api/quote-requests/:id/create-po", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) return res.status(401).json({ error: "Unauthorized" });
      const quoteRequest = await storage.getQuoteRequest(req.params.id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      const project = await storage.getProject(quoteRequest.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Generate PO number
      const poNumber = await storage.generateNextPONumber();

      // Validate optional PO creation fields
      const createPoBodySchema = z.object({
        paymentTerms: z.string().optional(),
        shipToName: z.string().optional(),
        shipToAddress: z.string().optional(),
      });
      const parsedPoBody = createPoBodySchema.safeParse(req.body);
      if (!parsedPoBody.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsedPoBody.error.errors });
      }

      // Create the purchase order
      const poData: any = {
        poNumber,
        projectId: quoteRequest.projectId,
        quoteRequestId: quoteRequest.id,
        vendorContactId: quoteRequest.manufacturerContactId,
        status: "draft",
        paymentTerms: parsedPoBody.data.paymentTerms || "Net 30",
        shipToName: parsedPoBody.data.shipToName || project.name,
        shipToAddress: parsedPoBody.data.shipToAddress || project.location,
        notes: quoteRequest.responseNotes || "",
        taxRate: 0,
        shippingCost: 0,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      };

      const po = await storage.createPurchaseOrder(poData);

      res.status(201).json(po);
    } catch (error) {
      logError(error, { context: 'create-po-from-quote' });
      handleValidationError(error, res, logError);
    }
  });

  // Generate PO PDF
  app.get("/api/purchase-orders/:id/pdf", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) return res.status(401).json({ error: "Unauthorized" });
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      const project = await storage.getProject(po.projectId, orgContext.organizationId);
      if (!project) return res.status(404).json({ error: "Purchase order not found" });
      const lineItems = await storage.getLineItemsByPO(req.params.id);
      
      // Fetch vendor contact details
      const vendorContactRecord = await storage.getManufacturerContact(po.vendorContactId);
      const vendorContact = vendorContactRecord ? {
        name: vendorContactRecord.manufacturerName,
        email: vendorContactRecord.email,
        phone: vendorContactRecord.phone,
        address: null,
      } : undefined;

      const { generatePurchaseOrderPDF } = await import("./pdf-generator");
      const pdfBuffer = await generatePurchaseOrderPDF({
        purchaseOrder: po,
        lineItems,
        project: project || undefined,
        vendorContact,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="PO-${po.poNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logError(error, { context: 'po-pdf-generation' });
      handleValidationError(error, res, logError);
    }
  });

  // Hardware Schedule Export API - MIGRATED TO projects.routes.ts

  // Vendor Quotes API
  app.get("/api/vendor-quotes", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get user's projects
      const userProjects = await storage.getProjects(orgContext.organizationId);
      const projectIds = userProjects.map(p => p.id);
      
      // Get all vendor quotes and filter to user's projects
      const allQuotes = await storage.getVendorQuotes();
      const userQuotes = allQuotes.filter(q => projectIds.includes(q.projectId));
      
      res.json(userQuotes);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/vendor-quotes/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const quote = await storage.getVendorQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(quote.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      
      res.json(quote);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });


  app.post("/api/vendor-quotes", fileUploadLimiter, upload.single("file"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Validate that projectId belongs to user's organization
      if (req.body.projectId) {
        const project = await storage.getProject(req.body.projectId, orgContext.organizationId);
        if (!project) {
          return res.status(403).json({ error: "Cannot create vendor quote for project not in your organization" });
        }
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file size (10MB max)
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
      }

      // Allowed file types
      const allowedMimeTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
        "application/vnd.ms-excel", // XLS
        "application/msword", // DOC
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
        "text/csv",
        "image/png",
        "image/jpeg",
      ];

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid file type. Supported: PDF, Excel, Word, CSV, PNG, JPEG" 
        });
      }

      // Convert file to base64
      const base64Content = req.file.buffer.toString("base64");
      const fileType = req.file.originalname.split(".").pop()?.toLowerCase() || "unknown";

      // Parse metadata from request body
      const quoteData = {
        projectId: req.body.projectId,
        quoteRequestId: req.body.quoteRequestId || null,
        purchaseOrderId: req.body.purchaseOrderId || null,
        vendorContactId: req.body.vendorContactId,
        quoteNumber: req.body.quoteNumber || null,
        quoteDate: req.body.quoteDate ? new Date(req.body.quoteDate) : null,
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null,
        totalAmount: req.body.totalAmount ? parseFloat(req.body.totalAmount) : 0,
        currency: req.body.currency || "USD",
        fileName: req.file.originalname,
        fileType,
        fileSize: req.file.size,
        fileData: base64Content,
        description: req.body.description || null,
        notes: req.body.notes || null,
        status: req.body.status || "pending",
        uploadedBy: req.body.uploadedBy || null,
      };

      const validatedData = insertVendorQuoteSchema.parse(quoteData);
      const quote = await storage.createVendorQuote(validatedData);
      
      res.status(201).json(quote);
    } catch (error) {
      logError(error, { context: 'vendor-quote-upload' });
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/vendor-quotes/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing quote and verify ownership
      const existingQuote = await storage.getVendorQuote(req.params.id);
      if (!existingQuote) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      
      const project = await storage.getProject(existingQuote.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      
      // If projectId is being changed, validate new project belongs to user's org
      if (req.body.projectId && req.body.projectId !== existingQuote.projectId) {
        const newProject = await storage.getProject(req.body.projectId, orgContext.organizationId);
        if (!newProject) {
          return res.status(403).json({ error: "Cannot move vendor quote to project not in your organization" });
        }
      }
      
      const quote = await storage.updateVendorQuote(req.params.id, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      res.json(quote);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/vendor-quotes/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get existing quote and verify ownership
      const existingQuote = await storage.getVendorQuote(req.params.id);
      if (!existingQuote) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      
      const project = await storage.getProject(existingQuote.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      
      const success = await storage.deleteVendorQuote(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Download vendor quote file
  app.get("/api/vendor-quotes/:id/download", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const quote = await storage.getVendorQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }
      
      // Verify parent project belongs to user's org
      const project = await storage.getProject(quote.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Vendor quote not found" });
      }

      // Convert base64 back to buffer
      const fileBuffer = Buffer.from(quote.fileData, "base64");

      // Set appropriate content type
      const mimeTypes: { [key: string]: string } = {
        pdf: "application/pdf",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        xls: "application/vnd.ms-excel",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        csv: "text/csv",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
      };

      const contentType = mimeTypes[quote.fileType] || "application/octet-stream";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${quote.fileName}"`);
      res.send(fileBuffer);
    } catch (error) {
      logError(error, { context: 'vendor-quote-download' });
      handleValidationError(error, res, logError);
    }
  });

  // Project Costs API - MIGRATED TO projects.routes.ts

  // Zapier's API-key-only router is mounted before browser auth in server/index.ts.

  // ====== External Service Integrations Routes ======
  
  // Get all external service connections for organization
  app.get("/api/integrations/connections", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const connections = await storage.getExternalServiceConnections(orgContext.organizationId);
      res.json(connections);
    } catch (error) {
      logError(error, { context: 'fetch-external-connections' });
      res.status(500).json({ error: "Failed to fetch external connections" });
    }
  });

  // Get a specific external service connection
  app.get("/api/integrations/connections/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const connection = await storage.getExternalServiceConnection(req.params.id, orgContext.organizationId);
      
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json(connection);
    } catch (error) {
      logError(error, { context: 'fetch-external-connection' });
      res.status(500).json({ error: "Failed to fetch connection" });
    }
  });

  // Create a new external service connection
  app.post("/api/integrations/connect", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = insertExternalServiceConnectionSchema.parse(req.body);

      // Check if connection already exists for this service
      const existing = await storage.getExternalServiceConnectionByService(
        orgContext.organizationId,
        validated.service
      );

      if (existing) {
        return res.status(409).json({ 
          error: "Connection already exists",
          message: `A connection to ${validated.service} already exists for this organization` 
        });
      }

      const connection = await storage.createExternalServiceConnection({
        ...validated,
        organizationId: orgContext.organizationId,
        userId: orgContext.userId,
      });

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'integration.connected',
        'external_service_connection',
        connection.id,
        { service: validated.service }
      );

      res.status(201).json(connection);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // Delete an external service connection
  app.delete("/api/integrations/connections/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get connection details before deletion for audit log
      const connection = await storage.getExternalServiceConnection(req.params.id, orgContext.organizationId);

      const deleted = await storage.deleteExternalServiceConnection(req.params.id, orgContext.organizationId);

      if (!deleted) {
        return res.status(404).json({ error: "Connection not found" });
      }

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'integration.disconnected',
        'external_service_connection',
        req.params.id,
        { service: connection?.service }
      );

      res.json({ message: "Connection deleted successfully" });
    } catch (error) {
      logError(error, { context: 'delete-external-connection' });
      res.status(500).json({ error: "Failed to delete connection" });
    }
  });

  // Get linked external resources
  app.get("/api/integrations/linked-resources", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const projectId = req.query.projectId as string | undefined;
      const service = req.query.service as string | undefined;

      let resources;
      if (service) {
        resources = await storage.getLinkedExternalResourcesByService(
          orgContext.organizationId,
          service,
          projectId
        );
      } else {
        resources = await storage.getLinkedExternalResources(
          orgContext.organizationId,
          projectId
        );
      }

      res.json(resources);
    } catch (error) {
      logError(error, { context: 'fetch-linked-resources' });
      res.status(500).json({ error: "Failed to fetch linked resources" });
    }
  });

  // Create a linked external resource
  app.post("/api/integrations/linked-resources", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = insertLinkedExternalResourceSchema.parse(req.body);

      const resource = await storage.createLinkedExternalResource({
        ...validated,
        organizationId: orgContext.organizationId,
      });

      res.status(201).json(resource);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // Composite action: Schedule Site Visit
  // Creates Jira issue, calendar event, and Confluence page for a project site visit
  app.post("/api/integrations/schedule-site-visit", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { projectId, title, description, scheduledDate, location } = req.body;

      if (!projectId || !title || !scheduledDate) {
        return res.status(400).json({ 
          error: "Missing required fields: projectId, title, scheduledDate" 
        });
      }

      // Get project details
      const project = await storage.getProject(projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check for connected services
      const jiraConnection = await storage.getExternalServiceConnectionByService(
        orgContext.organizationId,
        "jira"
      );
      const calendarConnection = await storage.getExternalServiceConnectionByService(
        orgContext.organizationId,
        "google-calendar"
      ) || await storage.getExternalServiceConnectionByService(
        orgContext.organizationId,
        "outlook"
      );
      const confluenceConnection = await storage.getExternalServiceConnectionByService(
        orgContext.organizationId,
        "confluence"
      );

      const results = {
        jira: null as any,
        calendar: null as any,
        confluence: null as any,
        errors: [] as string[],
      };

      // Jira: connected but API not yet active — return honest status without creating fake data
      if (jiraConnection) {
        results.jira = {
          connected: true,
          synced: false,
          reason: "External API integration not yet active — configure your Jira credentials to enable sync",
        };
      } else {
        results.errors.push("Jira not connected");
      }

      // Calendar: connected but API not yet active — return honest status without creating fake data
      if (calendarConnection) {
        results.calendar = {
          connected: true,
          synced: false,
          reason: "External API integration not yet active — configure your Google Calendar/Outlook credentials to enable sync",
        };
      } else {
        results.errors.push("Calendar not connected");
      }

      // Confluence: connected but API not yet active — return honest status without creating fake data
      if (confluenceConnection) {
        results.confluence = {
          connected: true,
          synced: false,
          reason: "External API integration not yet active — configure your Confluence credentials to enable sync",
        };
      } else {
        results.errors.push("Confluence not connected");
      }

      const connectedCount = [results.jira, results.calendar, results.confluence].filter(Boolean).length;

      // If no services were connected, return error
      if (connectedCount === 0) {
        return res.status(400).json({
          success: false,
          results,
          error: "No services available",
          message: `Unable to schedule site visit. Services unavailable: ${results.errors.join(', ')}`,
        });
      }

      // Return status indicating which services are connected (but not yet synced)
      res.status(200).json({
        success: true,
        connectedCount,
        results,
        message: results.errors.length > 0
          ? `Site visit noted (${connectedCount}/3 services connected). Unavailable: ${results.errors.join(', ')}. Configure external API credentials to enable full sync.`
          : "Site visit noted. All services are connected — configure external API credentials to enable full sync.",
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'schedule-site-visit' });
      res.status(500).json({ error: "Failed to schedule site visit" });
    }
  });
  // ============================================================================
  // USER INTEGRATIONS API (Jira, Confluence, Notion)
  // ============================================================================

  // Get all user integrations
  app.get("/api/integrations", async (req, res) => {
    try {
      const user = req.dbUser as any;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const integrations = await storage.getUserIntegrations(user.id);
      
      // Mask sensitive API tokens in response (never return plaintext)
      const sanitized = integrations.map(integration => ({
        ...integration,
        atlassianApiToken: integration.atlassianApiToken ? maskToken(integration.atlassianApiToken) : null,
        notionApiKey: integration.notionApiKey ? maskToken(integration.notionApiKey) : null,
      }));

      res.json(sanitized);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Get specific integration
  app.get("/api/integrations/:service", async (req, res) => {
    try {
      const user = req.dbUser as any;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const integration = await storage.getUserIntegration(user.id, req.params.service);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      // Mask sensitive API tokens (never return plaintext)
      const sanitized = {
        ...integration,
        atlassianApiToken: integration.atlassianApiToken ? maskToken(integration.atlassianApiToken) : null,
        notionApiKey: integration.notionApiKey ? maskToken(integration.notionApiKey) : null,
      };

      res.json(sanitized);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Create or update integration
  app.post("/api/integrations/:service", async (req, res) => {
    try {
      const user = req.dbUser as any;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const service = req.params.service as 'jira' | 'confluence' | 'notion';
      if (!['jira', 'confluence', 'notion'].includes(service)) {
        return res.status(400).json({ error: "Invalid service type" });
      }

      // Check if integration exists
      const existing = await storage.getUserIntegration(user.id, service);
      
      const integrationData = insertUserIntegrationSchema.parse({
        ...req.body,
        userId: user.id,
        service,
      });

      let integration;
      if (existing) {
        integration = await storage.updateUserIntegration(user.id, service, integrationData);
      } else {
        integration = await storage.createUserIntegration(integrationData);
      }

      // Test connection
      try {
        const { JiraService, ConfluenceService, NotionService } = await import('./integration-services');
        let isValid = false;
        
        if (service === 'jira' && integration) {
          const jira = new JiraService(integration);
          isValid = await jira.testConnection();
        } else if (service === 'confluence' && integration) {
          const confluence = new ConfluenceService(integration);
          isValid = await confluence.testConnection();
        } else if (service === 'notion' && integration) {
          const notion = new NotionService(integration);
          isValid = await notion.testConnection();
        }

        // Mask sensitive tokens (never return plaintext)
        const sanitized = integration ? {
          ...integration,
          atlassianApiToken: integration.atlassianApiToken ? maskToken(integration.atlassianApiToken) : null,
          notionApiKey: integration.notionApiKey ? maskToken(integration.notionApiKey) : null,
        } : null;

        res.json({ 
          integration: sanitized, 
          connectionValid: isValid 
        });
      } catch (testError: any) {
        // Still return the saved integration even if test fails
        const sanitized = integration ? {
          ...integration,
          atlassianApiToken: integration.atlassianApiToken ? maskToken(integration.atlassianApiToken) : null,
          notionApiKey: integration.notionApiKey ? maskToken(integration.notionApiKey) : null,
        } : null;

        res.json({ 
          integration: sanitized, 
          connectionValid: false,
          testError: testError.message 
        });
      }
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Test integration connection
  app.post("/api/integrations/:service/test", async (req, res) => {
    try {
      const user = req.dbUser as any;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const integration = await storage.getUserIntegration(user.id, req.params.service);
      if (!integration) {
        return res.status(404).json({ error: "Integration not configured" });
      }

      const { JiraService, ConfluenceService, NotionService } = await import('./integration-services');
      let isValid = false;

      if (req.params.service === 'jira') {
        const jira = new JiraService(integration);
        isValid = await jira.testConnection();
      } else if (req.params.service === 'confluence') {
        const confluence = new ConfluenceService(integration);
        isValid = await confluence.testConnection();
      } else if (req.params.service === 'notion') {
        const notion = new NotionService(integration);
        isValid = await notion.testConnection();
      }

      res.json({ valid: isValid });
    } catch (error: any) {
      res.status(500).json({ 
        valid: false, 
        error: error.message 
      });
    }
  });

  // Delete integration
  app.delete("/api/integrations/:service", async (req, res) => {
    try {
      const user = req.dbUser as any;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteUserIntegration(user.id, req.params.service);
      if (!deleted) {
        return res.status(404).json({ error: "Integration not found" });
      }

      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Sync project to integration - MIGRATED TO projects.routes.ts

  // HubSpot CRM Integration API (DEPRECATED - use /api/organizations/:orgId/hubspot/* instead)
  const { createHubSpotService } = await import('./hubspot');

  app.get("/api/hubspot/status", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      const isConfigured = hubspotService.isConfigured();
      
      res.json({ 
        configured: isConfigured,
        message: isConfigured 
          ? 'HubSpot integration is configured for your organization' 
          : 'HubSpot integration not configured. Configure it in organization settings.'
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/hubspot/sync/project/:projectId", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }

      // Get project cost for total amount
      const cost = await storage.getProjectCost(req.params.projectId);
      const totalCost = cost ? hubspotService.calculateTotalCost(cost as any) : 0;

      const result = await hubspotService.syncProject({
        ...project,
        totalCost,
      });

      res.json({ 
        success: true, 
        message: 'Project synced to HubSpot',
        hubspotDeal: result 
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || 'Failed to sync project to HubSpot'
      });
    }
  });

  app.post("/api/hubspot/sync/manufacturer/:id", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const manufacturer = await storage.getManufacturerContact(req.params.id);
      if (!manufacturer) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }
      
      // Verify manufacturer belongs to organization
      if (manufacturer.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!manufacturer.email) {
        return res.status(400).json({ error: "Manufacturer must have an email to sync to HubSpot" });
      }

      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }

      const result = await hubspotService.syncManufacturerContact(manufacturer);

      res.json({ 
        success: true, 
        message: 'Manufacturer contact synced to HubSpot',
        hubspotContact: result 
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || 'Failed to sync manufacturer to HubSpot'
      });
    }
  });

  app.post("/api/hubspot/sync/all-projects", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }
      
      const projects = await storage.getProjects(orgContext.organizationId);
      const results = [];
      const errors = [];

      for (const project of projects) {
        try {
          const cost = await storage.getProjectCost(project.id);
          const totalCost = cost ? hubspotService.calculateTotalCost(cost as any) : 0;

          const result = await hubspotService.syncProject({
            ...project,
            totalCost,
          });
          results.push({ projectId: project.id, projectName: project.name, success: true });
        } catch (error: any) {
          errors.push({ projectId: project.id, projectName: project.name, error: error.message });
        }
      }

      res.json({ 
        success: true,
        synced: results.length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || 'Failed to sync projects to HubSpot'
      });
    }
  });

  app.post("/api/hubspot/sync/all-manufacturers", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }
      
      const manufacturers = await storage.getManufacturerContacts(orgContext.organizationId);
      const results = [];
      const errors = [];

      for (const manufacturer of manufacturers) {
        try {
          if (!manufacturer.email) {
            errors.push({ 
              manufacturerId: manufacturer.id, 
              manufacturerName: manufacturer.manufacturerName, 
              error: 'No email address' 
            });
            continue;
          }

          const result = await hubspotService.syncManufacturerContact(manufacturer);
          results.push({ 
            manufacturerId: manufacturer.id, 
            manufacturerName: manufacturer.manufacturerName, 
            success: true 
          });
        } catch (error: any) {
          errors.push({ 
            manufacturerId: manufacturer.id, 
            manufacturerName: manufacturer.manufacturerName, 
            error: error.message 
          });
        }
      }

      res.json({ 
        success: true,
        synced: results.length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || 'Failed to sync manufacturers to HubSpot'
      });
    }
  });

  // Customer sync endpoints
  app.post("/api/hubspot/sync/customer/:id", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const customer = await storage.getCustomer(req.params.id, orgContext.organizationId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      // Verify customer belongs to organization
      if (customer.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }

      // Get customer locations
      const locations = await storage.getCustomerLocations(req.params.id);

      const result = await hubspotService.syncCustomer(customer, locations);

      res.json({ 
        success: true, 
        message: 'Customer synced to HubSpot as company',
        hubspotCompanyId: result.id 
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || 'Failed to sync customer to HubSpot'
      });
    }
  });

  app.post("/api/hubspot/sync/all-customers", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }
      
      const customers = await storage.getCustomers(orgContext.organizationId);
      const results = [];
      const errors = [];

      for (const customer of customers) {
        try {
          const locations = await storage.getCustomerLocations(customer.id);
          const result = await hubspotService.syncCustomer(customer, locations);
          results.push({ 
            customerId: customer.id, 
            customerName: customer.name, 
            success: true,
            hubspotCompanyId: result.id
          });
        } catch (error: any) {
          errors.push({ 
            customerId: customer.id, 
            customerName: customer.name, 
            error: error.message 
          });
        }
      }

      res.json({ 
        success: true,
        synced: results.length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || 'Failed to sync customers to HubSpot'
      });
    }
  });

  app.get("/api/hubspot/deals", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const deals = await hubspotService.getDeals(limit);
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || 'Failed to fetch deals from HubSpot'
      });
    }
  });

  app.get("/api/hubspot/contacts", requireFeature("crmSync"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hubspotService = await createHubSpotService(orgContext.organizationId);
      if (!hubspotService.isConfigured()) {
        return res.status(400).json({ 
          error: "HubSpot integration not configured for your organization" 
        });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const contacts = await hubspotService.getContacts(limit);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || 'Failed to fetch contacts from HubSpot'
      });
    }
  });

  // Disclaimers API
  app.get("/api/disclaimers", async (req, res) => {
    try {
      const disclaimers = await storage.getDisclaimers();
      res.json(disclaimers);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/disclaimers/:id", async (req, res) => {
    try {
      const disclaimer = await storage.getDisclaimer(req.params.id);
      if (!disclaimer) {
        return res.status(404).json({ error: "Disclaimer not found" });
      }
      res.json(disclaimer);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/disclaimers", async (req, res) => {
    try {
      const data = insertDisclaimerSchema.parse(req.body);
      const disclaimer = await storage.createDisclaimer(data);
      res.status(201).json(disclaimer);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/disclaimers/:id", async (req, res) => {
    try {
      const disclaimer = await storage.updateDisclaimer(req.params.id, req.body);
      if (!disclaimer) {
        return res.status(404).json({ error: "Disclaimer not found" });
      }
      res.json(disclaimer);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/disclaimers/:id", async (req, res) => {
    try {
      const success = await storage.deleteDisclaimer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Disclaimer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Disclaimer Links API
  app.get("/api/disclaimer-links", async (req, res) => {
    try {
      const { entityType, entityId, disclaimerId } = req.query;
      
      if (entityType && entityId) {
        const links = await storage.getDisclaimerLinksByEntity(entityType as string, entityId as string);
        return res.json(links);
      }
      
      if (disclaimerId) {
        const links = await storage.getDisclaimerLinksByDisclaimer(disclaimerId as string);
        return res.json(links);
      }
      
      const links = await storage.getDisclaimerLinks();
      res.json(links);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/disclaimer-links", async (req, res) => {
    try {
      const data = insertDisclaimerLinkSchema.parse(req.body);
      const link = await storage.createDisclaimerLink(data);
      res.status(201).json(link);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/disclaimer-links/:id", async (req, res) => {
    try {
      const success = await storage.deleteDisclaimerLink(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Disclaimer link not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Gasketing Catalog API
  app.get("/api/gasketing-catalog", async (req, res) => {
    try {
      const catalog = await storage.getGasketingCatalog();
      res.json(catalog);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/gasketing-catalog/:id", async (req, res) => {
    try {
      const item = await storage.getGasketingItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Gasketing item not found" });
      }
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/gasketing-catalog", async (req, res) => {
    try {
      const data = insertGasketingCatalogSchema.parse(req.body);
      const item = await storage.createGasketingItem(data);
      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/gasketing-catalog/:id", async (req, res) => {
    try {
      const item = await storage.updateGasketingItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Gasketing item not found" });
      }
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/gasketing-catalog/:id", async (req, res) => {
    try {
      const success = await storage.deleteGasketingItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Gasketing item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Opening Gasketing API
  app.get("/api/openings/:openingId/gasketing", async (req, res) => {
    try {
      const items = await storage.getOpeningGasketing(req.params.openingId);
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/openings/:openingId/gasketing", async (req, res) => {
    try {
      const data = insertOpeningGasketingSchema.parse({
        ...req.body,
        openingId: req.params.openingId,
      });
      const item = await storage.createOpeningGasketing(data);
      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/opening-gasketing/:id", async (req, res) => {
    try {
      const success = await storage.deleteOpeningGasketing(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Opening gasketing not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Service History API (organization-scoped)
  app.get("/api/openings/:openingId/service-history", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const history = await storage.getServiceHistory(req.params.openingId, orgContext.organizationId);
      res.json(history);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/service-history/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const history = await storage.getServiceHistoryById(req.params.id, orgContext.organizationId);
      if (!history) {
        return res.status(404).json({ error: "Service history not found" });
      }
      res.json(history);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/openings/:openingId/service-history", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = insertServiceHistorySchema.parse({
        ...req.body,
        openingId: req.params.openingId,
        organizationId: orgContext.organizationId,
      });

      const history = await storage.createServiceHistory(data);
      res.status(201).json(history);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/service-history/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = updateServiceHistorySchema.parse(req.body);
      const updated = await storage.updateServiceHistory(req.params.id, orgContext.organizationId, data);
      
      if (!updated) {
        return res.status(404).json({ error: "Service history not found" });
      }

      res.json(updated);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/service-history/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteServiceHistory(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Service history not found" });
      }

      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Master Key Systems API (organization-scoped)
  app.get("/api/master-key-systems", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const systems = await storage.getMasterKeySystems(orgContext.organizationId);
      res.json(systems);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/master-key-systems/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const system = await storage.getMasterKeySystem(req.params.id, orgContext.organizationId);
      if (!system) {
        return res.status(404).json({ error: "Master key system not found" });
      }
      res.json(system);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/master-key-systems", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = insertMasterKeySystemSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
      });
      const system = await storage.createMasterKeySystem(data);
      res.status(201).json(system);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/master-key-systems/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const system = await storage.updateMasterKeySystem(
        req.params.id,
        orgContext.organizationId,
        req.body
      );
      if (!system) {
        return res.status(404).json({ error: "Master key system not found" });
      }
      res.json(system);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/master-key-systems/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteMasterKeySystem(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Master key system not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Lock Sets API (organization-scoped)
  app.get("/api/lock-sets", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const projectId = req.query.projectId as string | undefined;
      const sets = await storage.getLockSets(orgContext.organizationId, projectId);
      res.json(sets);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/lock-sets/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const set = await storage.getLockSet(req.params.id, orgContext.organizationId);
      if (!set) {
        return res.status(404).json({ error: "Lock set not found" });
      }
      res.json(set);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/lock-sets", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = insertLockSetSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
      });
      const set = await storage.createLockSet(data);
      res.status(201).json(set);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/lock-sets/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const set = await storage.updateLockSet(
        req.params.id,
        orgContext.organizationId,
        req.body
      );
      if (!set) {
        return res.status(404).json({ error: "Lock set not found" });
      }
      res.json(set);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/lock-sets/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteLockSet(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Lock set not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Floor Plans (organization-scoped) - Blueprint/map uploads
  app.get("/api/floor-plans", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const projectId = req.query.projectId as string | undefined;
      const plans = await storage.getFloorPlans(orgContext.organizationId, projectId);
      res.json(plans);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/floor-plans/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const plan = await storage.getFloorPlan(req.params.id, orgContext.organizationId);
      if (!plan) {
        return res.status(404).json({ error: "Floor plan not found" });
      }
      res.json(plan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/floor-plans", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = insertFloorPlanSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
      });
      const plan = await storage.createFloorPlan(data);
      res.status(201).json(plan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/floor-plans/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const plan = await storage.updateFloorPlan(
        req.params.id,
        orgContext.organizationId,
        req.body
      );
      if (!plan) {
        return res.status(404).json({ error: "Floor plan not found" });
      }
      res.json(plan);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/floor-plans/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteFloorPlan(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Floor plan not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Door Locations - Map openings to floor plans (organization-scoped via floor plans)
  app.get("/api/door-locations", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const floorPlanId = req.query.floorPlanId as string;
      if (!floorPlanId) {
        return res.status(400).json({ error: "floorPlanId query parameter required" });
      }

      const locations = await storage.getDoorLocations(floorPlanId, orgContext.organizationId);
      res.json(locations);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.get("/api/door-locations/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const location = await storage.getDoorLocation(req.params.id, orgContext.organizationId);
      if (!location) {
        return res.status(404).json({ error: "Door location not found" });
      }
      res.json(location);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.post("/api/door-locations", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = insertDoorLocationSchema.parse(req.body);
      const location = await storage.createDoorLocation(data, orgContext.organizationId);
      res.status(201).json(location);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.patch("/api/door-locations/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const location = await storage.updateDoorLocation(
        req.params.id,
        orgContext.organizationId,
        req.body
      );
      if (!location) {
        return res.status(404).json({ error: "Door location not found" });
      }
      res.json(location);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  app.delete("/api/door-locations/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteDoorLocation(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Door location not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // FloorPlanViewer specific endpoint - returns floor plan with door location markers
  app.get("/api/floorplans/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const plan = await storage.getFloorPlan(req.params.id, orgContext.organizationId);
      if (!plan) {
        return res.status(404).json({ error: "Floor plan not found" });
      }

      // Get all door locations for this floor plan
      const doorLocations = await storage.getDoorLocations(req.params.id, orgContext.organizationId);
      
      // Get opening details for all door locations in a single batch query
      const openingIds = doorLocations.map(loc => loc.openingId);
      const openings = await storage.getOpeningsByIds(openingIds, orgContext.organizationId);
      const openingMap = new Map(openings.map(o => [o.id, o]));

      const markers = doorLocations
        .map(loc => {
          const opening = openingMap.get(loc.openingId);
          if (!opening) return null;
          
          return {
            id: loc.id,
            openingId: loc.openingId,
            openingNumber: opening.openingNumber,
            location: opening.location,
            xPosition: loc.xPosition,
            yPosition: loc.yPosition,
            rotation: loc.rotation || 0,
            doorType: opening.doorType,
            status: opening.openingStatus,
          };
        })
        .filter(Boolean);

      res.json({
        ...plan,
        markers,
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // SALES & MARKETING ROUTES
  // ============================================================================

  // Public nonce generation (for bot/spam prevention)
  // No authentication required - used by landing page forms
  app.get("/api/nonce", (req, res) => {
    try {
      const nonce = generateNonce();
      res.json({ nonce });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { 
        context: 'nonce-generation' 
      });
      res.status(500).json({ error: "Failed to generate verification token" });
    }
  });

  // Public lead creation (no auth required - for marketing funnel)
  // Protected by signed nonce verification to prevent bot/spam submissions
  app.post("/api/leads", leadCreationLimiter, verifyNonceMiddleware, async (req, res) => {
    try {
      const { insertLeadSchema } = await import("@shared/schema");
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);
      
      logSecurityEvent("lead_created", "low", {
        leadId: lead.id,
        email: lead.email,
        source: lead.source,
        userAgent: req.get("user-agent"),
        ip: req.ip,
      });
      
      res.status(201).json(lead);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Get all leads (organization-scoped)
  app.get("/api/leads", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const leads = await storage.getLeads(orgContext.organizationId);
      res.json(leads);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Get specific lead
  app.get("/api/leads/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Verify lead belongs to organization
      if (lead.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(lead);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Update lead
  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const existing = await storage.getLead(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Verify lead belongs to organization
      if (existing.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const lead = await storage.updateLead(req.params.id, req.body);
      res.json(lead);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const existing = await storage.getLead(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Verify lead belongs to organization
      if (existing.organizationId !== orgContext.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const success = await storage.deleteLead(req.params.id);
      res.json({ success });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Get sales activities for a lead
  app.get("/api/leads/:id/activities", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead || lead.organizationId !== orgContext.organizationId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const activities = await storage.getSalesActivities(req.params.id);
      res.json(activities);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Create sales activity
  app.post("/api/sales-activities", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { insertSalesActivitySchema } = await import("@shared/schema");
      const data = insertSalesActivitySchema.parse(req.body);
      
      // Verify lead belongs to organization
      const lead = await storage.getLead(data.leadId);
      if (!lead || lead.organizationId !== orgContext.organizationId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const activity = await storage.createSalesActivity(data);
      res.status(201).json(activity);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // Get sales projects and milestones (for sales milestone view)
  app.get("/api/sales/projects-milestones", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get user info to check role
      const user = await storage.getUser(orgContext.userId);
      const allowedRoles = ["sales_rep", "admin", "owner"];
      
      if (!user || (user.role && !allowedRoles.includes(user.role))) {
        return res.status(403).json({ error: "Access denied. This page is only accessible to sales representatives, administrators, and owners." });
      }

      // Get all project assignments for the organization
      let assignments = await storage.listProjectAssignments(orgContext.organizationId);
      
      // If user is a sales rep, filter to only their assignments
      if (user.role === "sales_rep") {
        assignments = assignments.filter(a => a.salesRepId === orgContext.userId);
      }

      // Get project details for each assignment
      const assignmentsWithProjects = await Promise.all(
        assignments.map(async (assignment) => {
          const project = await storage.getProject(assignment.projectId, orgContext.organizationId);
          return {
            ...assignment,
            project: project || null,
          };
        })
      );

      // Filter out assignments without projects
      const validAssignments = assignmentsWithProjects.filter(a => a.project !== null);

      // Get all milestones for these projects
      const projectIds = validAssignments.map(a => a.projectId);
      const allMilestones = await storage.listProjectMilestones(orgContext.organizationId);
      const relevantMilestones = allMilestones.filter(m => projectIds.includes(m.projectId));

      res.json({
        assignments: validAssignments,
        milestones: relevantMilestones,
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // ONBOARDING ROUTES
  // ============================================================================

  // Get current user's onboarding status
  app.get("/api/onboarding", isAuthenticated, async (req, res) => {
    try {
      const user = req.dbUser as any;
      const userId = user.id;
      
      // Get or create onboarding record
      let onboarding = await db.query.userOnboarding.findFirst({
        where: eq(schema.userOnboarding.userId, userId),
      });
      
      if (!onboarding) {
        // Create new onboarding record for this user
        [onboarding] = await db.insert(schema.userOnboarding).values({
          userId,
        }).returning();
      }
      
      res.json(onboarding);
    } catch (error) {
      logError(error, { context: 'fetch-onboarding-status' });
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  });

  // Update a specific onboarding step
  app.post("/api/onboarding/step", isAuthenticated, async (req, res) => {
    try {
      const user = req.dbUser as any;
      const userId = user.id;
      const { step, value } = req.body;
      
      // Validate value is "yes" or "no"
      if (!step || typeof value !== 'string' || (value !== 'yes' && value !== 'no')) {
        return res.status(400).json({ error: "Invalid step or value (must be 'yes' or 'no')" });
      }
      
      // Valid step names
      const validSteps = [
        'hasSeenWelcome', 'hasCreatedOrganization', 'hasCreatedProject',
        'hasAddedDoorOpening', 'hasUploadedPhoto', 'hasGeneratedQuote',
        'hasDismissedTour', 'hasViewedCatalog', 'hasUsedAiFeature', 'hasViewedDashboard'
      ];
      
      if (!validSteps.includes(step)) {
        return res.status(400).json({ error: "Invalid step name" });
      }
      
      // Get or create onboarding record
      let onboarding = await db.query.userOnboarding.findFirst({
        where: eq(schema.userOnboarding.userId, userId),
      });
      
      if (!onboarding) {
        [onboarding] = await db.insert(schema.userOnboarding).values({
          userId,
        }).returning();
      }
      
      // Update the step
      const updates: any = {
        [step]: value,
        lastStepCompletedAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Calculate completed steps count - include ALL tracked fields
      const currentSteps = {
        hasSeenWelcome: onboarding.hasSeenWelcome,
        hasCreatedOrganization: onboarding.hasCreatedOrganization,
        hasCreatedProject: onboarding.hasCreatedProject,
        hasAddedDoorOpening: onboarding.hasAddedDoorOpening,
        hasUploadedPhoto: onboarding.hasUploadedPhoto,
        hasGeneratedQuote: onboarding.hasGeneratedQuote,
        hasDismissedTour: onboarding.hasDismissedTour,
        hasViewedCatalog: onboarding.hasViewedCatalog,
        hasUsedAiFeature: onboarding.hasUsedAiFeature,
        hasViewedDashboard: onboarding.hasViewedDashboard,
        ...updates,
      };
      
      const completedCount = Object.values(currentSteps).filter(v => v === 'yes').length;
      updates.completedStepsCount = completedCount;
      
      if (step === 'hasDismissedTour' && value === 'yes') {
        updates.tourDismissedAt = new Date();
      }
      
      const [updated] = await db.update(schema.userOnboarding)
        .set(updates)
        .where(eq(schema.userOnboarding.userId, userId))
        .returning();
      
      res.json(updated);
    } catch (error) {
      logError(error, { context: 'update-onboarding-step' });
      res.status(500).json({ error: "Failed to update onboarding step" });
    }
  });

  // Dismiss the onboarding tour
  app.post("/api/onboarding/dismiss", isAuthenticated, async (req, res) => {
    try {
      const user = req.dbUser as any;
      const userId = user.id;
      
      const [updated] = await db.update(schema.userOnboarding)
        .set({
          hasDismissedTour: 'yes',
          tourDismissedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.userOnboarding.userId, userId))
        .returning();
      
      res.json(updated);
    } catch (error) {
      logError(error, { context: 'dismiss-onboarding' });
      res.status(500).json({ error: "Failed to dismiss onboarding" });
    }
  });

  // ============================================================================
  // DEMO ROUTES
  // ============================================================================

  // Seed demo data (public endpoint for initial setup)
  app.post("/api/demo/seed", async (req, res) => {
    try {
      const { seedDemoData } = await import("./demo-seed");
      const result = await seedDemoData();
      
      res.json({ 
        success: true, 
        message: "Demo data seeded successfully",
        demoOrg: result.demoOrg,
        demoUser: result.demoUser,
      });
    } catch (error) {
      logError(error, { context: 'seed-demo-data' });
      res.status(500).json({ error: "Failed to seed demo data" });
    }
  });

  // Reset demo data (admin only)
  app.post("/api/demo/reset", requireRole("owner"), async (req, res) => {
    try {
      const { resetDemoData } = await import("./demo-seed");
      await resetDemoData();
      res.json({ success: true, message: "Demo data reset successfully" });
    } catch (error) {
      logError(error, { context: 'reset-demo-data' });
      res.status(500).json({ error: "Failed to reset demo data" });
    }
  });

  // Get demo organization info (public)
  app.get("/api/demo/info", async (req, res) => {
    try {
      const { DEMO_ORG_SLUG, DEMO_USER_EMAIL } = await import("./demo-seed");
      res.json({ 
        slug: DEMO_ORG_SLUG,
        userEmail: DEMO_USER_EMAIL,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get demo info" });
    }
  });

  // Join demo organization (authenticated)
  app.post("/api/demo/join", isAuthenticated, async (req, res) => {
    try {
      const user = req.dbUser!;
      const { DEMO_ORG_SLUG } = await import("./demo-seed");
      
      // Find demo organization
      const demoOrg = await storage.getOrganizationBySlug(DEMO_ORG_SLUG);
      if (!demoOrg) {
        return res.status(404).json({ error: "Demo organization not found" });
      }

      // Check if user is already a member
      const existingMembership = (await storage.getUserMemberships(user.id))
        .find(membership => membership.organizationId === demoOrg.id);
      if (existingMembership) {
        return res.json({ 
          success: true, 
          message: "Already a member of demo organization",
          organizationId: demoOrg.id,
        });
      }

      // Add user as a member with owner role to see all features
      const { insertMembershipSchema } = await import("@shared/schema");
      const membershipData = insertMembershipSchema.parse({
        userId: user.id,
        organizationId: demoOrg.id,
        role: "owner",
      });

      await storage.createMembership(membershipData);

      res.json({ 
        success: true, 
        message: "Successfully joined demo organization",
        organizationId: demoOrg.id,
      });
    } catch (error) {
      logError(error, { context: 'join-demo-organization' });
      res.status(500).json({ error: "Failed to join demo organization" });
    }
  });

  // ============================================================================
  // WIRING DIAGRAM ROUTES
  // ============================================================================

  // Get all diagrams for an organization (optionally filter by project or opening)
  app.get("/api/wiring-diagrams", isAuthenticated, async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string;
      const projectId = req.query.projectId as string | undefined;
      const openingId = req.query.openingId as string | undefined;

      if (!organizationId) {
        return res.status(400).json({ error: "organizationId is required" });
      }

      const diagrams = await storage.getWiringDiagrams(organizationId, projectId, openingId);
      res.json(diagrams);
    } catch (error) {
      logError(error, { context: 'fetch-wiring-diagrams' });
      res.status(500).json({ error: "Failed to fetch wiring diagrams" });
    }
  });

  // Get single diagram with all its components, connections, and annotations
  app.get("/api/wiring-diagrams/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({ error: "organizationId is required" });
      }

      const diagram = await storage.getWiringDiagram(id, organizationId);
      if (!diagram) {
        return res.status(404).json({ error: "Diagram not found" });
      }

      res.json(diagram);
    } catch (error) {
      logError(error, { context: 'fetch-wiring-diagram' });
      res.status(500).json({ error: "Failed to fetch wiring diagram" });
    }
  });

  // Create a new wiring diagram
  app.post("/api/wiring-diagrams", isAuthenticated, async (req, res) => {
    try {
      const { insertWiringDiagramSchema } = await import("@shared/schema");
      const diagramData = insertWiringDiagramSchema.parse(req.body);

      const diagram = await storage.createWiringDiagram(diagramData);
      res.json(diagram);
    } catch (error) {
      logError(error, { context: 'create-wiring-diagram' });
      res.status(500).json({ error: "Failed to create wiring diagram" });
    }
  });

  // Update a wiring diagram
  app.patch("/api/wiring-diagrams/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({ error: "organizationId is required" });
      }

      const diagram = await storage.updateWiringDiagram(id, organizationId, req.body);
      if (!diagram) {
        return res.status(404).json({ error: "Diagram not found" });
      }

      res.json(diagram);
    } catch (error) {
      logError(error, { context: 'update-wiring-diagram' });
      res.status(500).json({ error: "Failed to update wiring diagram" });
    }
  });

  // Delete a wiring diagram
  app.delete("/api/wiring-diagrams/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({ error: "organizationId is required" });
      }

      const success = await storage.deleteWiringDiagram(id, organizationId);
      if (!success) {
        return res.status(404).json({ error: "Diagram not found" });
      }

      res.json({ success: true });
    } catch (error) {
      logError(error, { context: 'delete-wiring-diagram' });
      res.status(500).json({ error: "Failed to delete wiring diagram" });
    }
  });

  // Get all available access control components (system defaults + organization custom)
  app.get("/api/access-control-components", isAuthenticated, async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const components = await storage.getAccessControlComponents(organizationId);
      res.json(components);
    } catch (error) {
      logError(error, { context: 'fetch-access-control-components' });
      res.status(500).json({ error: "Failed to fetch access control components" });
    }
  });

  // Create custom access control component
  app.post("/api/access-control-components", isAuthenticated, async (req, res) => {
    try {
      const { insertAccessControlComponentSchema } = await import("@shared/schema");
      const componentData = insertAccessControlComponentSchema.parse(req.body);

      const component = await storage.createAccessControlComponent(componentData);
      res.json(component);
    } catch (error) {
      logError(error, { context: 'create-access-control-component' });
      res.status(500).json({ error: "Failed to create access control component" });
    }
  });

  // Add component to diagram
  app.post("/api/diagram-components", isAuthenticated, async (req, res) => {
    try {
      const { insertDiagramComponentSchema } = await import("@shared/schema");
      const componentData = insertDiagramComponentSchema.parse(req.body);

      const diagramComponent = await storage.createDiagramComponent(componentData);
      res.json(diagramComponent);
    } catch (error) {
      logError(error, { context: 'add-diagram-component' });
      res.status(500).json({ error: "Failed to add component to diagram" });
    }
  });

  // Update diagram component position/properties
  app.patch("/api/diagram-components/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const component = await storage.updateDiagramComponent(id, req.body);
      
      if (!component) {
        return res.status(404).json({ error: "Component not found" });
      }

      res.json(component);
    } catch (error) {
      logError(error, { context: 'update-diagram-component' });
      res.status(500).json({ error: "Failed to update diagram component" });
    }
  });

  // Delete diagram component
  app.delete("/api/diagram-components/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDiagramComponent(id);
      
      if (!success) {
        return res.status(404).json({ error: "Component not found" });
      }

      res.json({ success: true });
    } catch (error) {
      logError(error, { context: 'delete-diagram-component' });
      res.status(500).json({ error: "Failed to delete diagram component" });
    }
  });

  // Create wiring connection
  app.post("/api/diagram-connections", isAuthenticated, async (req, res) => {
    try {
      const { insertDiagramConnectionSchema } = await import("@shared/schema");
      const connectionData = insertDiagramConnectionSchema.parse(req.body);

      const connection = await storage.createDiagramConnection(connectionData);
      res.json(connection);
    } catch (error) {
      logError(error, { context: 'create-diagram-connection' });
      res.status(500).json({ error: "Failed to create diagram connection" });
    }
  });

  // Update diagram connection
  app.patch("/api/diagram-connections/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await storage.updateDiagramConnection(id, req.body);
      
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json(connection);
    } catch (error) {
      logError(error, { context: 'update-diagram-connection' });
      res.status(500).json({ error: "Failed to update diagram connection" });
    }
  });

  // Delete diagram connection
  app.delete("/api/diagram-connections/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDiagramConnection(id);
      
      if (!success) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json({ success: true });
    } catch (error) {
      logError(error, { context: 'delete-diagram-connection' });
      res.status(500).json({ error: "Failed to delete diagram connection" });
    }
  });

  // Create diagram annotation
  app.post("/api/diagram-annotations", isAuthenticated, async (req, res) => {
    try {
      const { insertDiagramAnnotationSchema } = await import("@shared/schema");
      const annotationData = insertDiagramAnnotationSchema.parse(req.body);

      const annotation = await storage.createDiagramAnnotation(annotationData);
      res.json(annotation);
    } catch (error) {
      logError(error, { context: 'create-diagram-annotation' });
      res.status(500).json({ error: "Failed to create diagram annotation" });
    }
  });

  // Update diagram annotation
  app.patch("/api/diagram-annotations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const annotation = await storage.updateDiagramAnnotation(id, req.body);
      
      if (!annotation) {
        return res.status(404).json({ error: "Annotation not found" });
      }

      res.json(annotation);
    } catch (error) {
      logError(error, { context: 'update-diagram-annotation' });
      res.status(500).json({ error: "Failed to update diagram annotation" });
    }
  });

  // Delete diagram annotation
  app.delete("/api/diagram-annotations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDiagramAnnotation(id);
      
      if (!success) {
        return res.status(404).json({ error: "Annotation not found" });
      }

      res.json({ success: true });
    } catch (error) {
      logError(error, { context: 'delete-diagram-annotation' });
      res.status(500).json({ error: "Failed to delete diagram annotation" });
    }
  });

  // ==================== MARKETING LANDING PAGE ROUTES ====================
  
  // Verify admin credentials are set before enabling admin routes
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  
  if (!adminUser || !adminPass) {
    logger.error('Admin credentials not configured - marketing admin routes disabled', {
      reason: 'ADMIN_USER and ADMIN_PASS environment variables must be set',
      routes: 'marketing admin routes are disabled for security'
    });
  }
  
  // Basic auth middleware for admin routes
  const adminAuth = (req: any, res: any, next: any) => {
    // First check if credentials are configured
    if (!adminUser || !adminPass) {
      return res.status(503).json({ 
        error: 'Admin functionality disabled', 
        message: 'ADMIN_USER and ADMIN_PASS environment variables must be configured by the system administrator' 
      });
    }
    
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    if (username === adminUser && password === adminPass) {
      return next();
    }
    
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).json({ error: 'Invalid credentials' });
  };

  // Store lead locally (called after HubSpot submission)
  app.post("/admin-store", async (req, res) => {
    try {
      const leadData = req.body;
      const leadsPath = path.join(process.cwd(), 'leads.json');
      
      let leads: any[] = [];
      if (fs.existsSync(leadsPath)) {
        const data = fs.readFileSync(leadsPath, 'utf-8');
        leads = JSON.parse(data);
      }
      
      leads.push({
        ...leadData,
        timestamp: new Date().toISOString()
      });
      
      fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
      res.json({ success: true });
    } catch (error) {
      logError(error, { context: 'store-lead-locally' });
      res.status(500).json({ error: 'Failed to store lead' });
    }
  });

  // List local leads (admin only)
  app.get("/admin-list", adminAuth, (req, res) => {
    try {
      const leadsPath = path.join(process.cwd(), 'leads.json');
      
      if (!fs.existsSync(leadsPath)) {
        return res.json({ leads: [] });
      }
      
      const data = fs.readFileSync(leadsPath, 'utf-8');
      const leads = JSON.parse(data);
      res.json({ leads });
    } catch (error) {
      logError(error, { context: 'read-leads-list' });
      res.status(500).json({ error: 'Failed to read leads' });
    }
  });

  // Fetch HubSpot contacts (admin only)
  app.get("/admin-hubspot", adminAuth, async (req, res) => {
    try {
      const hubspotToken = process.env.HUBSPOT_TOKEN;
      if (!hubspotToken) {
        return res.status(400).json({ error: 'HUBSPOT_TOKEN not configured' });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      
      const response = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,company,jobtitle`,
        {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        logError(new Error(errorText), { context: 'hubspot-api-fetch', status: response.status });
        return res.status(response.status).json({ error: 'HubSpot API error', details: errorText });
      }
      
      const data = await response.json();
      
      // Transform HubSpot data to match our format
      const rows = (data.results || []).map((contact: any) => ({
        name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
        email: contact.properties.email || '',
        company: contact.properties.company || '',
        role: contact.properties.jobtitle || '',
        utm: {} // HubSpot contacts don't have UTM data in this simple fetch
      }));
      
      res.json({ rows });
    } catch (error) {
      logError(error, { context: 'fetch-hubspot-contacts' });
      res.status(500).json({ error: 'Failed to fetch HubSpot contacts' });
    }
  });


  // ====== Bug Reporting Routes ======
  
  // Submit a bug report
  app.post("/api/bugs", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = insertBugReportSchema.parse(req.body);

      const bugReport = await storage.createBugReport({
        ...validated,
        organizationId: orgContext.organizationId,
        userId: orgContext.userId,
      });

      res.status(201).json(bugReport);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // Get all bug reports for the organization
  app.get("/api/bugs", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const bugs = await storage.getBugReports(orgContext.organizationId, req.query);

      res.json(bugs);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'fetch-bug-reports' });
      res.status(500).json({ error: "Failed to fetch bug reports" });
    }
  });

  // Get a single bug report
  app.get("/api/bugs/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const bug = await storage.getBugReport(req.params.id, orgContext.organizationId);

      if (!bug) {
        return res.status(404).json({ error: "Bug report not found" });
      }

      res.json(bug);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'fetch-bug-report' });
      res.status(500).json({ error: "Failed to fetch bug report" });
    }
  });

  // Update bug report (status, severity, assignment, notes)
  app.patch("/api/bugs/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { status, severity, assignedTo, notes } = req.body;

      const updated = await storage.updateBugReport(req.params.id, orgContext.organizationId, {
        status,
        severity,
        assignedTo,
        notes,
      });

      if (!updated) {
        return res.status(404).json({ error: "Bug report not found" });
      }

      res.json(updated);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'update-bug-report' });
      res.status(500).json({ error: "Failed to update bug report" });
    }
  });

  // Delete a bug report
  app.delete("/api/bugs/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteBugReport(req.params.id, orgContext.organizationId);

      if (!deleted) {
        return res.status(404).json({ error: "Bug report not found" });
      }

      res.json({ message: "Bug report deleted successfully" });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'delete-bug-report' });
      res.status(500).json({ error: "Failed to delete bug report" });
    }
  });

  // Mount reference library routes (industry reference data)
  const referenceLibraryRouter = (await import("./routes/reference-library.routes")).default;
  app.use("/api/reference", isAuthenticated, referenceLibraryRouter);

  // Mount roadmap routes (product roadmap management)
  const roadmapRouter = (await import("./routes/roadmap.routes")).default;
  app.use("/api/roadmap", isAuthenticated, roadmapRouter);

  // SEO Routes
  // Sitemap.xml for search engines
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? `https://${req.get('host')}`
      : `http://${req.get('host')}`;

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  });

  // Robots.txt for search engine crawlers
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? `https://${req.get('host')}`
      : `http://${req.get('host')}`;

    const robots = `# DoorSurvey Pro - Robots.txt
# Allow search engines to index public pages

User-agent: *
Allow: /
Allow: /login

# Disallow authenticated/private areas
Disallow: /api/
Disallow: /dashboard/
Disallow: /projects/
Disallow: /customers/
Disallow: /quotes/
Disallow: /admin/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (be nice to our servers)
Crawl-delay: 1`;

    res.header('Content-Type', 'text/plain');
    res.send(robots);
  });

  // AI Chat Completions - Streaming SSE endpoint for AI assistant
  app.post("/api/chat/completions", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: "AI service not configured. Please add OPENAI_API_KEY" });
      }

      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid request: messages array required" });
      }

      // Set up Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      // CRITICAL: Flush headers immediately to establish SSE connection
      // Without this, compression/proxy middleware can buffer the response
      res.flushHeaders();

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // System prompt for door survey domain expertise
      const systemMessage = {
        role: "system",
        content: `You are an expert AI assistant for DoorSurvey Pro, specializing in commercial door surveys, building codes, hardware selection, and project workflows. 

Your expertise includes:
- IBC (International Building Code), ADA, NFPA 101, and IFC compliance
- Commercial door hardware (locks, hinges, closers, exit devices, access control)
- Fire ratings, door materials, and frame specifications
- Cost estimation and project management
- Hardware catalogs and BHMA standards

Provide accurate, helpful guidance while being concise and professional. When discussing codes, cite specific sections when relevant.`
      };

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [systemMessage, ...messages],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      logError(error instanceof Error ? error : new Error(String(error)), { 
        context: 'ai-chat-completions',
        userId: (req as any).userId 
      });
      
      // Send error through SSE format
      res.write(`data: ${JSON.stringify({ error: "AI service temporarily unavailable" })}\n\n`);
      res.end();
    }
  });

  // ============================================================================
  // PROJECT MANAGEMENT ROUTES
  // ============================================================================

  // ==================== PROJECT ASSIGNMENTS ====================
  
  // Create project assignment (PM/admin only)
  app.post("/api/project-assignments", isAuthenticated, requireAnyRole(["owner", "admin", "pm_manager", "project_manager"]), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = insertProjectAssignmentSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
      });

      const assignment = await storage.createProjectAssignment(validated);
      
      logAuditEvent(orgContext.userId, orgContext.organizationId, "create", "project_assignment", assignment.id, {
        projectId: assignment.projectId,
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // List all project assignments for organization
  app.get("/api/project-assignments", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const assignments = await storage.listProjectAssignments(orgContext.organizationId);
      res.json(assignments);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-project-assignments' });
      res.status(500).json({ error: "Failed to fetch project assignments" });
    }
  });

  // Get specific project assignment
  app.get("/api/project-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const assignment = await storage.getProjectAssignment(req.params.id, orgContext.organizationId);
      
      if (!assignment) {
        return res.status(404).json({ error: "Project assignment not found" });
      }

      res.json(assignment);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-project-assignment' });
      res.status(500).json({ error: "Failed to fetch project assignment" });
    }
  });

  // Get assignment for specific project
  app.get("/api/projects/:projectId/assignment", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const assignment = await storage.getProjectAssignmentByProjectId(req.params.projectId, orgContext.organizationId);
      
      if (!assignment) {
        return res.status(404).json({ error: "Project assignment not found" });
      }

      res.json(assignment);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-project-assignment-by-project' });
      res.status(500).json({ error: "Failed to fetch project assignment" });
    }
  });

  // Update project assignment (PM/admin only)
  app.put("/api/project-assignments/:id", isAuthenticated, requireAnyRole(["owner", "admin", "pm_manager", "project_manager"]), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updated = await storage.updateProjectAssignment(req.params.id, orgContext.organizationId, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "Project assignment not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "update", "project_assignment", updated.id, {
        projectId: updated.projectId,
      });

      res.json(updated);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // Delete project assignment (admin only)
  app.delete("/api/project-assignments/:id", isAuthenticated, requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteProjectAssignment(req.params.id, orgContext.organizationId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Project assignment not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "delete", "project_assignment", req.params.id, {});

      res.json({ message: "Project assignment deleted successfully" });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'delete-project-assignment' });
      res.status(500).json({ error: "Failed to delete project assignment" });
    }
  });

  // ==================== PROCUREMENT ITEMS ====================

  // Create procurement item
  app.post("/api/procurement-items", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = insertProcurementItemSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
        createdBy: orgContext.userId,
      });

      const item = await storage.createProcurementItem(validated);
      
      logAuditEvent(orgContext.userId, orgContext.organizationId, "create", "procurement_item", item.id, {
        projectId: item.projectId,
        manufacturer: item.manufacturer,
      });
      
      res.status(201).json(item);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // List all procurement items for organization
  app.get("/api/procurement-items", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const items = await storage.listProcurementItems(orgContext.organizationId);
      res.json(items);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-procurement-items' });
      res.status(500).json({ error: "Failed to fetch procurement items" });
    }
  });

  // List procurement items for specific project
  app.get("/api/projects/:projectId/procurement-items", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const items = await storage.listProcurementItemsByProject(req.params.projectId, orgContext.organizationId);
      res.json(items);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-procurement-items-by-project' });
      res.status(500).json({ error: "Failed to fetch procurement items" });
    }
  });

  // Get specific procurement item
  app.get("/api/procurement-items/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const item = await storage.getProcurementItem(req.params.id, orgContext.organizationId);
      
      if (!item) {
        return res.status(404).json({ error: "Procurement item not found" });
      }

      res.json(item);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-procurement-item' });
      res.status(500).json({ error: "Failed to fetch procurement item" });
    }
  });

  // Update procurement item
  app.put("/api/procurement-items/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updated = await storage.updateProcurementItem(req.params.id, orgContext.organizationId, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "Procurement item not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "update", "procurement_item", updated.id, {
        projectId: updated.projectId,
        status: updated.status,
      });

      res.json(updated);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // Delete procurement item
  app.delete("/api/procurement-items/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteProcurementItem(req.params.id, orgContext.organizationId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Procurement item not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "delete", "procurement_item", req.params.id, {});

      res.json({ message: "Procurement item deleted successfully" });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'delete-procurement-item' });
      res.status(500).json({ error: "Failed to delete procurement item" });
    }
  });

  // ==================== PROJECT ISSUES ====================

  // Create project issue
  app.post("/api/project-issues", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = insertProjectIssueSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
        createdByUserId: orgContext.userId,
      });

      const issue = await storage.createProjectIssue(validated);
      
      logAuditEvent(orgContext.userId, orgContext.organizationId, "create", "project_issue", issue.id, {
        projectId: issue.projectId,
        type: issue.type,
        severity: issue.severity,
      });
      
      res.status(201).json(issue);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // List all project issues for organization
  app.get("/api/project-issues", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const issues = await storage.listProjectIssues(orgContext.organizationId);
      res.json(issues);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-project-issues' });
      res.status(500).json({ error: "Failed to fetch project issues" });
    }
  });

  // List project issues for specific project
  app.get("/api/projects/:projectId/issues", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const issues = await storage.listProjectIssuesByProject(req.params.projectId, orgContext.organizationId);
      res.json(issues);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-project-issues-by-project' });
      res.status(500).json({ error: "Failed to fetch project issues" });
    }
  });

  // Get specific project issue
  app.get("/api/project-issues/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const issue = await storage.getProjectIssue(req.params.id, orgContext.organizationId);
      
      if (!issue) {
        return res.status(404).json({ error: "Project issue not found" });
      }

      res.json(issue);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-project-issue' });
      res.status(500).json({ error: "Failed to fetch project issue" });
    }
  });

  // Update project issue
  app.put("/api/project-issues/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updates = { ...req.body };
      
      // If resolving the issue, set resolution metadata
      if (updates.status === "resolved" && !updates.resolvedAt) {
        updates.resolvedAt = new Date();
        updates.resolvedBy = orgContext.userId;
      }

      const updated = await storage.updateProjectIssue(req.params.id, orgContext.organizationId, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Project issue not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "update", "project_issue", updated.id, {
        projectId: updated.projectId,
        status: updated.status,
      });

      res.json(updated);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // Delete project issue
  app.delete("/api/project-issues/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteProjectIssue(req.params.id, orgContext.organizationId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Project issue not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "delete", "project_issue", req.params.id, {});

      res.json({ message: "Project issue deleted successfully" });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'delete-project-issue' });
      res.status(500).json({ error: "Failed to delete project issue" });
    }
  });

  // ==================== PROJECT MILESTONES ====================

  // Create project milestone
  app.post("/api/project-milestones", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = insertProjectMilestoneSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
      });

      const milestone = await storage.createProjectMilestone(validated);
      
      logAuditEvent(orgContext.userId, orgContext.organizationId, "create", "project_milestone", milestone.id, {
        projectId: milestone.projectId,
        name: milestone.name,
      });
      
      res.status(201).json(milestone);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // List all project milestones for organization
  app.get("/api/project-milestones", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const milestones = await storage.listProjectMilestones(orgContext.organizationId);
      res.json(milestones);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-project-milestones' });
      res.status(500).json({ error: "Failed to fetch project milestones" });
    }
  });

  // List project milestones for specific project
  app.get("/api/projects/:projectId/milestones", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const milestones = await storage.listProjectMilestonesByProject(req.params.projectId, orgContext.organizationId);
      res.json(milestones);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-project-milestones-by-project' });
      res.status(500).json({ error: "Failed to fetch project milestones" });
    }
  });

  // Get specific project milestone
  app.get("/api/project-milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const milestone = await storage.getProjectMilestone(req.params.id, orgContext.organizationId);
      
      if (!milestone) {
        return res.status(404).json({ error: "Project milestone not found" });
      }

      res.json(milestone);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-project-milestone' });
      res.status(500).json({ error: "Failed to fetch project milestone" });
    }
  });

  // Update project milestone
  app.put("/api/project-milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get current milestone to check if status is changing to completed
      const currentMilestone = await storage.getProjectMilestone(req.params.id, orgContext.organizationId);
      if (!currentMilestone) {
        return res.status(404).json({ error: "Project milestone not found" });
      }

      const updates = { ...req.body };
      const isCompletingNow = updates.status === "completed" && currentMilestone.status !== "completed";
      
      // If completing the milestone, set completion metadata
      if (updates.status === "completed" && !updates.actualCompletionDate) {
        updates.actualCompletionDate = new Date();
        updates.completedBy = orgContext.userId;
        updates.percentComplete = 100;
      }

      const updated = await storage.updateProjectMilestone(req.params.id, orgContext.organizationId, updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Project milestone not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "update", "project_milestone", updated.id, {
        projectId: updated.projectId,
        status: updated.status,
      });

      // Send notification to sales rep if milestone just completed and notifySalesOnComplete is true
      if (isCompletingNow && updated.notifySalesOnComplete) {
        try {
          // Get project assignment to find sales rep
          const assignment = await storage.getProjectAssignmentByProjectId(updated.projectId, orgContext.organizationId);
          
          if (assignment?.salesRepId) {
            // Get sales rep user info
            const salesRep = await storage.getUser(assignment.salesRepId);
            
            if (salesRep?.email) {
              // Get project info
              const project = await storage.getProject(updated.projectId, orgContext.organizationId);
              
              // Get PM info (the user who completed the milestone)
              const pmUser = await storage.getUser(orgContext.userId);
              
              // Get organization info
              const organization = await storage.getOrganization(orgContext.organizationId);
              
              // Get all milestones for the project to find next milestone and progress
              const allMilestones = await storage.listProjectMilestonesByProject(updated.projectId, orgContext.organizationId);
              const completedCount = allMilestones.filter(m => m.status === "completed").length;
              const nextMilestone = allMilestones
                .filter(m => m.status !== "completed" && m.id !== updated.id)
                .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))[0];
              
              // Build the app URL based on environment
              const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN 
                ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
                : 'http://localhost:5000';
              
              // Render and queue the email
              const { renderEmailTemplate } = await import("./email-templates/index.js");
              const { queueEmail } = await import("./jobs/emailNotificationQueue.js");
              
              const emailData = {
                projectName: project?.name || "Project",
                projectLocation: project?.location,
                milestoneName: updated.name,
                milestoneDescription: updated.description || undefined,
                completionDate: updated.actualCompletionDate || new Date(),
                pmName: pmUser?.firstName && pmUser?.lastName 
                  ? `${pmUser.firstName} ${pmUser.lastName}` 
                  : pmUser?.email || "Project Manager",
                pmEmail: pmUser?.email || undefined,
                nextMilestoneName: nextMilestone?.name,
                nextMilestoneTargetDate: nextMilestone?.targetDate || undefined,
                projectUrl: `${baseUrl}/projects/${updated.projectId}`,
                milestoneProgress: {
                  completed: completedCount,
                  total: allMilestones.length,
                },
                notes: updated.notes || undefined,
                organizationName: organization?.name || "Organization",
              };
              
              const rendered = await renderEmailTemplate("milestone-notification", emailData);
              
              await queueEmail({
                eventId: `milestone-complete-${updated.id}-${Date.now()}`,
                eventType: "milestone.completed",
                to: salesRep.email,
                subject: rendered.subject,
                html: rendered.html,
                priority: "normal",
                metadata: {
                  milestoneId: updated.id,
                  projectId: updated.projectId,
                  salesRepId: assignment.salesRepId,
                },
              });
              
              // Update last notified timestamp
              await storage.updateProjectMilestone(updated.id, orgContext.organizationId, {
                lastNotifiedAt: new Date(),
              });
              
              logger.info("Milestone completion notification queued", {
                milestoneId: updated.id,
                projectId: updated.projectId,
                salesRepId: assignment.salesRepId,
                salesRepEmail: salesRep.email,
              });
            }
          }
        } catch (notificationError) {
          // Log the error but don't fail the request
          logger.error("Failed to send milestone completion notification", {
            milestoneId: updated.id,
            projectId: updated.projectId,
            error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          });
        }
      }

      res.json(updated);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // Delete project milestone
  app.delete("/api/project-milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteProjectMilestone(req.params.id, orgContext.organizationId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Project milestone not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "delete", "project_milestone", req.params.id, {});

      res.json({ message: "Project milestone deleted successfully" });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'delete-project-milestone' });
      res.status(500).json({ error: "Failed to delete project milestone" });
    }
  });

  // ==================== MANUFACTURER ORDER FORMS ====================

  // Create manufacturer order form
  app.post("/api/manufacturer-order-forms", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = insertManufacturerOrderFormSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
        createdBy: orgContext.userId,
      });

      const form = await storage.createManufacturerOrderForm(validated);
      
      logAuditEvent(orgContext.userId, orgContext.organizationId, "create", "manufacturer_order_form", form.id, {
        projectId: form.projectId,
        manufacturer: form.manufacturer,
      });
      
      res.status(201).json(form);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // List all manufacturer order forms for organization
  app.get("/api/manufacturer-order-forms", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const forms = await storage.listManufacturerOrderForms(orgContext.organizationId);
      res.json(forms);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-manufacturer-order-forms' });
      res.status(500).json({ error: "Failed to fetch manufacturer order forms" });
    }
  });

  // List manufacturer order forms for specific project
  app.get("/api/projects/:projectId/order-forms", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const forms = await storage.listManufacturerOrderFormsByProject(req.params.projectId, orgContext.organizationId);
      res.json(forms);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'list-manufacturer-order-forms-by-project' });
      res.status(500).json({ error: "Failed to fetch manufacturer order forms" });
    }
  });

  // Get specific manufacturer order form
  app.get("/api/manufacturer-order-forms/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const form = await storage.getManufacturerOrderForm(req.params.id, orgContext.organizationId);
      
      if (!form) {
        return res.status(404).json({ error: "Manufacturer order form not found" });
      }

      res.json(form);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-manufacturer-order-form' });
      res.status(500).json({ error: "Failed to fetch manufacturer order form" });
    }
  });

  // Update manufacturer order form
  app.put("/api/manufacturer-order-forms/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updated = await storage.updateManufacturerOrderForm(req.params.id, orgContext.organizationId, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "Manufacturer order form not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "update", "manufacturer_order_form", updated.id, {
        projectId: updated.projectId,
        manufacturer: updated.manufacturer,
      });

      res.json(updated);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  // Delete manufacturer order form
  app.delete("/api/manufacturer-order-forms/:id", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteManufacturerOrderForm(req.params.id, orgContext.organizationId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Manufacturer order form not found" });
      }

      logAuditEvent(orgContext.userId, orgContext.organizationId, "delete", "manufacturer_order_form", req.params.id, {});

      res.json({ message: "Manufacturer order form deleted successfully" });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'delete-manufacturer-order-form' });
      res.status(500).json({ error: "Failed to delete manufacturer order form" });
    }
  });

  // Generate PDF for manufacturer order form
  app.post("/api/manufacturer-order-forms/:id/generate-pdf", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const form = await storage.getManufacturerOrderForm(req.params.id, orgContext.organizationId);
      
      if (!form) {
        return res.status(404).json({ error: "Manufacturer order form not found" });
      }

      // Generate PDF using PDFKit
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      
      // Header
      doc.fontSize(20).text(`Order Form - ${form.manufacturer}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Template: ${form.templateId}`);
      doc.text(`Division: ${form.division}`);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Form fields
      doc.fontSize(14).text('Form Fields:', { underline: true });
      doc.moveDown(0.5);
      
      if (form.fields && Array.isArray(form.fields)) {
        for (const field of form.fields as any[]) {
          const statusIcon = field.status === 'ok' ? '✓' : field.status === 'missing' ? '⚠' : '?';
          doc.fontSize(10).text(`${statusIcon} ${field.fieldId}: ${field.value || 'N/A'}`);
        }
      }

      doc.end();

      // Wait for PDF generation to complete
      await new Promise<void>((resolve) => doc.on('end', resolve));
      
      const pdfBuffer = Buffer.concat(chunks);
      const pdfBase64 = pdfBuffer.toString('base64');
      const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

      // Update the form with PDF info
      const updated = await storage.updateManufacturerOrderForm(req.params.id, orgContext.organizationId, {
        pdfUrl,
        pdfGeneratedAt: new Date(),
      });

      logAuditEvent(orgContext.userId, orgContext.organizationId, "generate_pdf", "manufacturer_order_form", form.id, {
        projectId: form.projectId,
        manufacturer: form.manufacturer,
      });

      res.json({ 
        success: true, 
        pdfUrl,
        pdfGeneratedAt: updated?.pdfGeneratedAt,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'generate-order-form-pdf' });
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // ==================== PM ANALYTICS ====================

  // Get analytics for current PM user
  app.get("/api/pm-analytics", isAuthenticated, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = req.dbUser as any;
      
      // Check if user is a project manager or higher
      if (!["owner", "admin", "pm_manager", "project_manager"].includes(user.role)) {
        return res.status(403).json({ error: "Access denied. PM role required." });
      }

      const analytics = await storage.getPMAnalyticsSummary(orgContext.userId, orgContext.organizationId);
      
      if (!analytics) {
        // Return empty analytics if none exist yet
        return res.json({
          projectManagerId: orgContext.userId,
          organizationId: orgContext.organizationId,
          activeProjects: 0,
          completedProjects: 0,
          onHoldProjects: 0,
          overdueProjects: 0,
          totalProcurementItems: 0,
          procurementItemsComplete: 0,
          procurementRedFlags: 0,
          openIssues: 0,
          criticalIssues: 0,
          upcomingMilestones: 0,
          overdueMilestones: 0,
          avgProjectDurationDays: null,
          calculatedAt: new Date(),
        });
      }

      res.json(analytics);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-pm-analytics' });
      res.status(500).json({ error: "Failed to fetch PM analytics" });
    }
  });

  // Get analytics for specific PM (pm_manager only)
  app.get("/api/pm-analytics/:userId", isAuthenticated, requireAnyRole(["owner", "admin", "pm_manager"]), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const analytics = await storage.getPMAnalyticsSummary(req.params.userId, orgContext.organizationId);
      
      if (!analytics) {
        return res.status(404).json({ error: "PM analytics not found" });
      }

      res.json(analytics);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-pm-analytics-by-user' });
      res.status(500).json({ error: "Failed to fetch PM analytics" });
    }
  });

  // Get full overview for PM managers
  app.get("/api/pm-manager-overview", isAuthenticated, requireAnyRole(["owner", "admin", "pm_manager"]), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get all project assignments to find all PMs
      const assignments = await storage.listProjectAssignments(orgContext.organizationId);
      
      // Get unique PM IDs
      const pmIds = [...new Set(assignments
        .map(a => a.projectManagerId)
        .filter((id): id is string => id !== null)
      )];

      // Fetch analytics for each PM
      const pmAnalytics = await Promise.all(
        pmIds.map(async (pmId) => {
          const analytics = await storage.getPMAnalyticsSummary(pmId, orgContext.organizationId);
          return analytics || {
            projectManagerId: pmId,
            organizationId: orgContext.organizationId,
            activeProjects: 0,
            completedProjects: 0,
            onHoldProjects: 0,
            overdueProjects: 0,
            totalProcurementItems: 0,
            procurementItemsComplete: 0,
            procurementRedFlags: 0,
            openIssues: 0,
            criticalIssues: 0,
            upcomingMilestones: 0,
            overdueMilestones: 0,
            avgProjectDurationDays: null,
            calculatedAt: new Date(),
          };
        })
      );

      // Calculate org-wide totals
      const totals = {
        totalActiveProjects: pmAnalytics.reduce((sum, a) => sum + a.activeProjects, 0),
        totalCompletedProjects: pmAnalytics.reduce((sum, a) => sum + a.completedProjects, 0),
        totalOnHoldProjects: pmAnalytics.reduce((sum, a) => sum + a.onHoldProjects, 0),
        totalOverdueProjects: pmAnalytics.reduce((sum, a) => sum + a.overdueProjects, 0),
        totalProcurementItems: pmAnalytics.reduce((sum, a) => sum + a.totalProcurementItems, 0),
        totalProcurementComplete: pmAnalytics.reduce((sum, a) => sum + a.procurementItemsComplete, 0),
        totalRedFlags: pmAnalytics.reduce((sum, a) => sum + a.procurementRedFlags, 0),
        totalOpenIssues: pmAnalytics.reduce((sum, a) => sum + a.openIssues, 0),
        totalCriticalIssues: pmAnalytics.reduce((sum, a) => sum + a.criticalIssues, 0),
        totalUpcomingMilestones: pmAnalytics.reduce((sum, a) => sum + a.upcomingMilestones, 0),
        totalOverdueMilestones: pmAnalytics.reduce((sum, a) => sum + a.overdueMilestones, 0),
      };

      res.json({
        organizationId: orgContext.organizationId,
        projectManagers: pmAnalytics,
        totals,
        generatedAt: new Date(),
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-pm-manager-overview' });
      res.status(500).json({ error: "Failed to fetch PM manager overview" });
    }
  });

  // Setup GraphQL server for efficient complex queries
  // Import dynamically to avoid circular dependencies
  const { setupGraphQL } = await import('./graphql/server');
  setupGraphQL(app, storage);

  const httpServer = createServer(app);
  return httpServer;
}
