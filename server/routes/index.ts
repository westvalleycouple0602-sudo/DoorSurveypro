import type { Express } from "express";
import type { IStorage } from "../storage";
import type { Multer } from "multer";
import type { RouteDependencies } from "./deps";
import { registerCoreRoutes } from "./core.routes";
import { registerSubscriptionRoutes } from "./subscriptions.routes";
import { registerProjectsRoutes } from "./projects.routes";
import { registerChangeOrdersRoutes } from "./change-orders.routes";
import { registerPartnerPricingRoutes } from "./partner-pricing.routes";
import { registerDoorFrameOptionsRoutes } from "./door-frame-options.routes";
import { registerManufacturersRoutes } from "./manufacturers.routes";
import { registerDistributorsRoutes } from "./distributors.routes";
import analyticsRouter from "./analytics.routes";
import dashboardAnalyticsRouter from "./dashboard.analytics";
import { infrastructureRoutes } from "./infrastructure.routes";
import hubspotSettingsRouter from "./hubspot-settings.routes";
import { registerHubSpotMonitoringRoutes } from "./hubspot-monitoring.routes";
import reportingRouter from "./reporting.routes";
import performanceRouter from "./performance.routes";
import competitiveRouter from "./competitive.routes";
import recommendationsRouter from "./recommendations.routes";
import complianceRouter from "./compliance.routes";
import validationRouter from "./validation.routes";
import computerVisionRouter from "./computer-vision.routes";
import documentIntelligenceRouter from "./document-intelligence.routes";
import arMeasurementsRouter from "./ar-measurements.routes";
import scanRouter from "./scan.routes";
import pdfCatalogImportRouter from "./pdf-catalog-import.routes";
import hardwareCatalogRouter from "./hardware-catalog.routes";
import prelaunchRouter from "./prelaunch.routes";
import salesRouter from "./sales.routes";
import marketingRouter from "./marketing.routes";
import { registerQuoteAnalyticsRoutes } from "./quote-analytics.routes";
import { registerTeamRoutes } from "./team.routes";
import apiKeysRouter from "./api-keys.routes";
import webhooksRouter from "./webhooks.routes";
import apiV1Router from "./api-v1.routes";
import resendWebhookRouter from "./webhooks/resend.js";
import { createTestimonialsRoutes } from "./testimonials.routes";
import { createBlogRoutes } from "./blog.routes";
import { registerSearchRoutes } from "./search.routes";
import integrationsRouter from "./integrations.routes";
import bulkImportRouter from "./bulk-import.routes";
import productBulkImportRouter from "./product-bulk-import.routes";
import chatRouter from "./chat.routes";
import sqlAssistantRouter from "./sql-assistant.routes";
import exportProfilesRouter from "./exportProfiles";
import projectAlternativesRouter from "./projectAlternatives";
import exportBrandingRouter from "./exportBranding";
import exportRouter from "./export";
import brandingOnboardingRouter from "./brandingOnboarding";
import taxonomyRouter from "./taxonomy.routes";
import lockDataRouter from "./lock-data.routes";
import trialRouter from "./trial.routes";
import portalSharesRouter from "./portal-shares.routes";
import commentsRouter from "./comments.routes";
import activitiesRouter from "./activities.routes";
import versioningRouter from "./versioning.routes";
import { lidarComplianceHandler } from "./lidarCompliance";
import doorSurveysRouter from "./door-surveys.routes";
import portalRouter from "./portal.routes";
import { createQuoteDeliveryRoutes } from "./quote-delivery.routes";
import { registerMasterKeyingRoutes } from "./master-keying.routes";
import { registerKeyRecordsRoutes } from "./key-records.routes";
import { registerHROnboardingRoutes } from "./hr-onboarding.routes";
import { registerJobTitlesRoutes } from "./job-titles.routes";
import { seedJobTitles } from "../seed/job-titles.seed";
import { seedEmailTemplates } from "../seed/email-templates.seed";
import { seedBlogPosts } from "../seed/blog-posts.seed";
import emailTemplatesRouter from "./email-templates.routes";
import systemAdminRouter from "./system-admin.routes";
import superAdminRouter from "./super-admin.routes";
import div28Router from "./div28.routes";
import pmTasksRouter from "./pm-tasks.routes";
import procurementRouter from "./procurement.routes";
import calibrationRouter from "./calibration.routes";
import revenueAssessmentRouter from "./revenue-assessment.routes";

export async function registerModularRoutes(
  app: Express,
  storage: IStorage,
  uploaders: {
    logo: Multer;
    lidar: Multer;
    hardwareLabel: Multer;
    general: Multer;
  },
  rateLimiters: any,
  middleware: any,
  logger: any
): Promise<void> {
  const deps: RouteDependencies = {
    storage,
    uploaders,
    logger: logger.logger,
    logError: logger.logError,
    logAuditEvent: logger.logAuditEvent,
    logIntegrationCall: logger.logIntegrationCall,
    logSecurityEvent: logger.logSecurityEvent,
    rateLimiters,
    middleware
  };

  // Register route modules
  await registerCoreRoutes(app, deps);
  await registerSubscriptionRoutes(app, deps);
  await registerProjectsRoutes(app, deps);
  await registerChangeOrdersRoutes(app, deps);
  await registerPartnerPricingRoutes(app, deps);
  await registerDoorFrameOptionsRoutes(app, deps);
  await registerManufacturersRoutes(app, deps);
  await registerDistributorsRoutes(app, deps);
  
  // Analytics and monitoring routes (admin-only)
  app.use("/api/analytics", analyticsRouter);
  
  // System admin routes (owner/admin only)
  app.use("/api/system-admin", systemAdminRouter);

  // Super admin portal routes (ADMIN_USER/ADMIN_PASS credentials, platform-wide access)
  app.use(superAdminRouter);
  
  // Dashboard analytics routes (org-specific, user-facing)
  app.use("/api/dashboard/analytics", dashboardAnalyticsRouter);
  
  // Infrastructure health and monitoring routes
  app.use("/api/infrastructure", infrastructureRoutes);
  
  // HubSpot integration settings routes
  app.use(hubspotSettingsRouter);
  
  // HubSpot sync monitoring routes
  await registerHubSpotMonitoringRoutes(app, deps);
  
  // Trial management routes
  app.use(trialRouter);
  
  // Advanced Reporting routes (Workstream 1)
  app.use("/api/reports", reportingRouter);
  
  // Performance Metrics routes (Workstream 1)
  app.use(performanceRouter);
  
  // Competitive Analysis routes (Workstream 1)
  app.use(competitiveRouter);
  
  // Hardware Recommendations routes (Workstream 2)
  app.use(recommendationsRouter);
  
  // Compliance Validation routes (Workstream 2)
  app.use(complianceRouter);
  
  // Building Code Validation routes (US/Canada compliance)
  app.use("/api", validationRouter);
  
  // Computer Vision routes (Workstream 2)
  app.use(computerVisionRouter);
  
  // Document Intelligence routes (Workstream 2)
  app.use(documentIntelligenceRouter);
  
  // AR Measurements routes (Workstream 3 - Field Capture)
  app.use(arMeasurementsRouter);
  
  // LiDAR Compliance Validation (automated door compliance from LiDAR scans)
  app.post("/api/lidar-compliance", lidarComplianceHandler);
  
  // Guided Scan System routes (Workstream 3 - Field Capture)
  app.use(scanRouter);
  
  // Door Survey Wizard routes (Multi-step survey workflow)
  app.use("/api/door-surveys", doorSurveysRouter);
  
  // Division 28 Electronic Security Assessment routes
  app.use("/api", div28Router);
  
  // PM Task Management routes (Project Management Board)
  app.use("/api", pmTasksRouter);
  
  // Procurement Package routes (Manufacturer order management)
  app.use("/api", procurementRouter);

  app.use(calibrationRouter);
  
  // Revenue Assessment routes (SaaS business valuation)
  app.use(revenueAssessmentRouter);
  
  // PDF Catalog Import routes (Data Platform)
  app.use(pdfCatalogImportRouter);
  
  // Hardware Catalog routes (Reference Database)
  app.use(hardwareCatalogRouter);
  
  // Prelaunch waitlist routes (public)
  app.use("/api/prelaunch-signups", prelaunchRouter);
  
  // Sales CRM routes
  app.use(salesRouter);
  
  // Marketing & Lead Generation routes
  app.use(marketingRouter);
  
  // Testimonials & Case Studies routes (Phase 8 - Marketing & Growth)
  const testimonialsRouter = createTestimonialsRoutes(storage);
  app.use("/api/testimonials", testimonialsRouter);
  
  // Blog/CMS routes (Phase 8 - Marketing & Growth)
  const blogRouter = createBlogRoutes(storage);
  app.use("/api/blog", blogRouter);
  
  // Quote Analytics routes
  registerQuoteAnalyticsRoutes(app);
  
  // Team management routes (managers and above)
  registerTeamRoutes(app, deps);
  
  // Global search routes (Phase 1: Quick Wins)
  registerSearchRoutes(app, deps);
  
  // ============================================================================
  // Phase 6: Integrations & Ecosystem
  // ============================================================================
  
  // QuickBooks & DocuSign integrations (Phase 1 integrations)
  app.use("/api/integrations", integrationsRouter);
  
  // Bulk import routes (Quick Wins - Phase C)
  app.use("/api/bulk-import", bulkImportRouter);
  
  // Product Catalog Bulk Import routes (Comprehensive Catalog)
  app.use("/api/products/bulk-import", productBulkImportRouter);
  
  // Taxonomy routes (Manufacturer groups & product categories)
  app.use("/api/taxonomy", taxonomyRouter);
  
  // Lock Data routes (Lock product types, manufacturer timelines, market tiers, compliance, assets)
  app.use("/api/lock-data", lockDataRouter);
  
  // Key Records routes (Free tier - individual door key tracking)
  await registerKeyRecordsRoutes(app, deps);
  
  // Master Keying routes (Paid tier - Hierarchical key systems, manufacturer presets, key-door assignments)
  await registerMasterKeyingRoutes(app, deps);
  
  // HR Onboarding routes (Plan templates, employee onboarding, step progress, HR integrations)
  registerHROnboardingRoutes(app, deps);
  
  // Corporate Job Titles routes (Division 8 & 28 predefined titles, role mappings, user assignments)
  registerJobTitlesRoutes(app, deps);
  
  // Email Templates routes (Role-based email templates with workflow integration)
  app.use("/api/email-templates", emailTemplatesRouter);
  
  // Seed predefined job titles on startup (only if table is empty)
  await seedJobTitles();
  
  // Seed email templates on startup (only if table is empty)
  await seedEmailTemplates();
  
  // Seed blog posts on startup (only if table is empty)
  await seedBlogPosts();
  
  // AI Chat routes (AI-powered assistance)
  app.use("/api/chat", chatRouter);
  
  // SQL Assistant routes (RE-ENABLED - Production-grade security implemented)
  // AST-based parsing with pgsql-parser, prepared statements, and multi-tenant isolation
  app.use(sqlAssistantRouter);
  
  // API Keys management routes (owners/admins only)
  app.use("/api/api-keys", apiKeysRouter);
  
  // Webhooks management routes (owners/admins only)
  app.use("/api/webhooks", webhooksRouter);
  
  // Incoming webhooks from external services (no authentication required)
  app.use("/api/webhooks/resend", resendWebhookRouter);
  
  // DocuSign webhook is registered in server/index.ts with raw body middleware for HMAC verification
  
  // Public REST API v1 (API key authentication required)
  app.use("/api/v1", apiV1Router);
  
  // ============================================================================
  // Quote Delivery & Confirmation System
  // ============================================================================
  
  // Quote delivery - Create, send, and manage customer quotes
  const quoteDeliveryRouter = createQuoteDeliveryRoutes(deps);
  app.use("/api", quoteDeliveryRouter);
  
  // ============================================================================
  // Quote Export & Versioning System
  // ============================================================================
  
  // Versioning - Version management for quotes, diagrams, floor plans, notes, specs, openings
  app.use("/api/versioning", versioningRouter);
  
  // Branding onboarding - Wizard for setting up export branding
  app.use(brandingOnboardingRouter);
  
  // Export profiles - Customizable export templates
  app.use(exportProfilesRouter);
  
  // Project alternatives - Good/Better/Best pricing options
  app.use(exportRouter);
  
  // Export branding - Custom branding for exports
  app.use(exportBrandingRouter);
  
  // Project alternatives - Quote alternatives
  app.use(projectAlternativesRouter);
  
  // ============================================================================
  // Customer Portal & Collaboration
  // ============================================================================
  
  // Portal shares - Secure shareable links for client access
  app.use("/api/portal-shares", portalSharesRouter);
  
  // Comments - Project comments with @mentions support
  app.use("/api", commentsRouter);
  
  // Activities - Project activity feeds and audit trail
  app.use("/api", activitiesRouter);

  // ============================================================================
  // Client Portal & Service Requests
  // ============================================================================
  
  // Client Portal - Magic link auth, service requests, lightweight door capture
  app.use(portalRouter);
  
  // More modules will be added as we extract them
}
