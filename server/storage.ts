// Reference: blueprint:javascript_database
// From Replit Auth blueprint integration
import {
  notificationPreferences,
  type NotificationPreference,
  users,
  organizations,
  memberships,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Membership,
  type InsertMembership,
  customers,
  customerLocations,
  customerProductHistory,
  projects,
  projectVersions,
  doorOpenings,
  photos,
  additionalDoorItems,
  hardwareItems,
  hardwareBundles,
  bundleItems,
  bomTemplates,
  bomTemplateItems,
  boms,
  bomItems,
  catalogItems,
  hardwareCrossReference,
  doorTemplates,
  doorReference,
  optionsLookup,
  surveyFieldReference,
  hardwareLocationCheat,
  edgeLiteTypesHmma810,
  liteKits,
  glassTypes,
  glassFireSizes,
  pivotPatchHardware,
  complianceRules,
  aiCorrections,
  type Customer,
  type InsertCustomer,
  type CustomerLocation,
  type InsertCustomerLocation,
  type CustomerProductHistory,
  type InsertCustomerProductHistory,
  type Project,
  type InsertProject,
  type ProjectVersion,
  type InsertProjectVersion,
  type DoorOpening,
  type InsertDoorOpening,
  type Photo,
  type InsertPhoto,
  type AdditionalDoorItem,
  type InsertAdditionalDoorItem,
  type UpdateAdditionalDoorItem,
  type HardwareItem,
  type InsertHardwareItem,
  type HardwareBundle,
  type InsertHardwareBundle,
  type BundleItem,
  type InsertBundleItem,
  type BomTemplate,
  type InsertBomTemplate,
  type BomTemplateItem,
  type InsertBomTemplateItem,
  type Bom,
  type InsertBom,
  type BomItem,
  type InsertBomItem,
  type CatalogItem,
  type InsertCatalogItem,
  type HardwareCrossReference,
  type InsertHardwareCrossReference,
  type DoorTemplate,
  type InsertDoorTemplate,
  type DoorReference,
  type OptionsLookup,
  type SurveyFieldReference,
  type HardwareLocationCheat,
  type EdgeLiteTypesHmma810,
  type ComplianceRule,
  type AiCorrection,
  type InsertAiCorrection,
  manufacturerContacts,
  manufacturerProducts,
  manufacturerLiterature,
  distributors,
  distributorManufacturers,
  quoteRequests,
  type ManufacturerContact,
  type InsertManufacturerContact,
  type ManufacturerProduct,
  type InsertManufacturerProduct,
  type ManufacturerLiterature,
  type InsertManufacturerLiterature,
  type Distributor,
  type InsertDistributor,
  type DistributorManufacturer,
  type InsertDistributorManufacturer,
  type QuoteRequest,
  type InsertQuoteRequest,
  purchaseOrders,
  purchaseOrderLineItems,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderLineItem,
  type InsertPurchaseOrderLineItem,
  vendorQuotes,
  type VendorQuote,
  type InsertVendorQuote,
  projectCosts,
  type ProjectCost,
  type InsertProjectCost,
  disclaimers,
  disclaimerLinks,
  gasketingCatalog,
  openingGasketing,
  type Disclaimer,
  type InsertDisclaimer,
  type DisclaimerLink,
  type InsertDisclaimerLink,
  type GasketingCatalog,
  type InsertGasketingCatalog,
  type OpeningGasketing,
  type InsertOpeningGasketing,
  keyRecords,
  masterKeySystems,
  lockSets,
  type KeyRecord,
  type InsertKeyRecord,
  type MasterKeySystem,
  type InsertMasterKeySystem,
  type LockSet,
  type InsertLockSet,
  floorPlans,
  doorLocations,
  type FloorPlan,
  type InsertFloorPlan,
  type DoorLocation,
  type InsertDoorLocation,
  leads,
  salesActivities,
  marketingCampaigns,
  marketingLandingPages,
  marketingLeadForms,
  marketingLeads,
  marketingAnalytics,
  testimonials,
  caseStudies,
  blogCategories,
  blogTags,
  blogPosts,
  blogPostTags,
  type Lead,
  type InsertLead,
  type SalesActivity,
  type InsertSalesActivity,
  type MarketingCampaign,
  type InsertMarketingCampaign,
  type MarketingLandingPage,
  type InsertMarketingLandingPage,
  type MarketingLeadForm,
  type InsertMarketingLeadForm,
  type MarketingLead,
  type InsertMarketingLead,
  type MarketingAnalytics,
  type InsertMarketingAnalytics,
  type Testimonial,
  type InsertTestimonial,
  type CaseStudy,
  type InsertCaseStudy,
  type BlogCategory,
  type InsertBlogCategory,
  type BlogTag,
  type InsertBlogTag,
  type BlogPost,
  type InsertBlogPost,
  type BlogPostTag,
  type InsertBlogPostTag,
  userIntegrations,
  type UserIntegration,
  type InsertUserIntegration,
  userOnboarding,
  type UserOnboarding,
  type InsertUserOnboarding,
  accessControlComponents,
  wiringDiagrams,
  diagramComponents,
  diagramConnections,
  diagramAnnotations,
  type AccessControlComponent,
  type InsertAccessControlComponent,
  type WiringDiagram,
  type InsertWiringDiagram,
  type DiagramComponent,
  type InsertDiagramComponent,
  type DiagramConnection,
  type InsertDiagramConnection,
  type DiagramAnnotation,
  type InsertDiagramAnnotation,
  calibrationProfiles,
  type CalibrationProfile,
  type InsertCalibrationProfile,
  lidarScans,
  type LidarScan,
  type InsertLidarScan,
  scanPhotos,
  type ScanPhoto,
  type InsertScanPhoto,
  detectionOverrides,
  type DetectionOverride,
  type InsertDetectionOverride,
  hardwareScans,
  type HardwareScan,
  type InsertHardwareScan,
  arMeasurements,
  type ArMeasurement,
  type InsertArMeasurement,
  scanConfigs,
  scanMetrics,
  type ScanConfig,
  type InsertScanConfig,
  type ScanMetric,
  type InsertScanMetric,
  pdfCatalogImports,
  type PdfCatalogImport,
  type InsertPdfCatalogImport,
  changeOrders,
  changeOrderItems,
  type ChangeOrder,
  type InsertChangeOrder,
  type ChangeOrderItem,
  type InsertChangeOrderItem,
  bugReports,
  type BugReport,
  type InsertBugReport,
  externalServiceConnections,
  type ExternalServiceConnection,
  type InsertExternalServiceConnection,
  linkedExternalResources,
  type LinkedExternalResource,
  type InsertLinkedExternalResource,
  // Phase 0: Foundation tables
  analyticsEvents,
  kpiAggregations,
  featureFlags,
  featureFlagEvaluations,
  integrationProviders,
  organizationIntegrations,
  webhookLogs,
  apiRequestLogs,
  eventBusMessages,
  eventSubscriptions,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type KpiAggregation,
  type InsertKpiAggregation,
  type FeatureFlag,
  type InsertFeatureFlag,
  type FeatureFlagEvaluation,
  type InsertFeatureFlagEvaluation,
  type IntegrationProvider,
  type InsertIntegrationProvider,
  type OrganizationIntegration,
  type InsertOrganizationIntegration,
  type WebhookLog,
  type InsertWebhookLog,
  type ApiRequestLog,
  type InsertApiRequestLog,
  type EventBusMessage,
  type InsertEventBusMessage,
  type EventSubscription,
  type InsertEventSubscription,
  // Workstream 1: Predictions
  predictions,
  predictionFeedback,
  type Prediction,
  type InsertPrediction,
  type PredictionFeedback,
  type InsertPredictionFeedback,
  reportTemplates,
  reportExecutions,
  reportSchedules,
  reportShares,
  type ReportTemplate,
  type InsertReportTemplate,
  type ReportExecution,
  type InsertReportExecution,
  type ReportSchedule,
  type InsertReportSchedule,
  type ReportShare,
  type InsertReportShare,
  // Workstream 1: Competitive Analysis
  competitors,
  competitorProducts,
  competitorPricing,
  projectCompetitors,
  type Competitor,
  type InsertCompetitor,
  type CompetitorProduct,
  type InsertCompetitorProduct,
  type CompetitorPricing,
  type InsertCompetitorPricing,
  type ProjectCompetitor,
  type InsertProjectCompetitor,
  //  Workstream 2: Recommendation Engine
  recommendationRules,
  hardwareCompatibility,
  recommendationLogs,
  type RecommendationRule,
  type InsertRecommendationRule,
  type HardwareCompatibility,
  type InsertHardwareCompatibility,
  type RecommendationLog,
  type InsertRecommendationLog,
  // Roadmap Management
  roadmapMilestones,
  roadmapTasks,
  type RoadmapMilestone,
  type InsertRoadmapMilestone,
  type RoadmapTask,
  type InsertRoadmapTask,
  // Phase 6: Integrations & Ecosystem
  apiKeys,
  apiKeyUsageLogs,
  webhooks,
  webhookDeliveryLogs,
  type ApiKey,
  type InsertApiKey,
  type ApiKeyUsageLog,
  type InsertApiKeyUsageLog,
  type Webhook,
  type InsertWebhook,
  type WebhookDeliveryLog,
  type InsertWebhookDeliveryLog,
  serviceHistory,
  type ServiceHistory,
  type InsertServiceHistory,
  invitationTokens,
  type InvitationToken,
  type InsertInvitationToken,
  passwordResetTokens,
  type PasswordResetToken,
  userSessions,
  type UserSession,
  type InsertUserSession,
  emailVerificationTokens,
  type EmailVerificationToken,
  versionedEntities,
  entityVersions,
  revisionMarks,
  type VersionedEntity,
  type InsertVersionedEntity,
  type EntityVersion,
  type InsertEntityVersion,
  type RevisionMark,
  type InsertRevisionMark,
  type VersionableEntityType,
  // Project Management tables
  projectAssignments,
  procurementItems,
  projectIssues,
  projectMilestones,
  manufacturerOrderForms,
  pmAnalyticsSummary,
  type ProjectAssignment,
  type InsertProjectAssignment,
  type ProcurementItem,
  type InsertProcurementItem,
  type ProjectIssue,
  type InsertProjectIssue,
  type ProjectMilestone,
  type InsertProjectMilestone,
  type ManufacturerOrderForm,
  type InsertManufacturerOrderForm,
  type PMAnalyticsSummary,
  type InsertPMAnalyticsSummary,
} from "@shared/schema";
import { applyDiscount } from "@shared/discountUtils";
import { db } from "./db";
import { DualScanSessionStore } from "./dual-scan-storage";
import type { DualScanSessionData } from "../shared/schemas/dual-scans.schema";
import { encryptToken, decryptToken, isEncrypted } from "./encryption";
import { eq, and, or, desc, asc, sql, gte, lte, isNull, like, inArray, lt, gt, count, ne } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { seedComplianceRules } from "./seed-compliance";
import { seedAccessControlComponents } from "./seed-access-control";
import { seedDoorFrameOptions } from "./seed-door-frame-options";
import { seedIntegrationProviders } from "./seed-integrations";
import { seedReferenceLibrary } from "./seed-reference-library";
import { logger, logError } from "./logger";
import { consumeInvitation } from "./invitation-consumption";

export interface IStorage {
  createDualScanSession(session: DualScanSessionData): Promise<void>;
  getDualScanSession(id: string, organizationId: string): Promise<DualScanSessionData | undefined>;
  dualScanSessionExists(id: string): Promise<boolean>;
  saveDualScanSession(session: DualScanSessionData, organizationId: string): Promise<void>;
  // Local application accounts and membership relationships
  getUser(id: string): Promise<User | undefined>;
  getUserPrimaryMembership(userId: string): Promise<Membership | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getUserByLinkedProvider(providerLink: string): Promise<User | undefined>;
  linkOAuthProvider(userId: string, provider: string, providerUserId: string): Promise<void>;
  
  // Password authentication methods
  getUserByEmail(email: string): Promise<User | undefined>;
  setUserPassword(userId: string, password: string): Promise<void>;
  verifyUserPassword(email: string, password: string): Promise<User | null>;
  createUserWithPassword(email: string, password: string, firstName?: string, lastName?: string): Promise<User>;
  
  // Password reset token methods
  createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: Date }>;
  getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; usedAt: Date | null } | null>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  cleanupExpiredPasswordResetTokens(): Promise<number>;
  
  // Account lockout methods
  incrementFailedLoginAttempts(userId: string): Promise<{ attempts: number; lockedUntil: Date | null }>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<{ locked: boolean; lockedUntil: Date | null; remainingAttempts: number }>;
  
  // Email verification methods
  createEmailVerificationToken(userId: string, email: string): Promise<{ token: string; expiresAt: Date }>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | null>;
  markEmailVerified(userId: string, token: string): Promise<void>;
  resendEmailVerification(userId: string): Promise<{ token: string; expiresAt: Date } | null>;
  
  // User session management methods
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSessions(userId: string): Promise<UserSession[]>;
  updateSessionActivity(sessionId: string): Promise<void>;
  revokeSession(sessionId: string, userId: string): Promise<boolean>;
  revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number>;
  cleanupExpiredSessions(): Promise<number>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization>;
  
  // Role permissions operations
  getRolePermissions(organizationId: string): Promise<Record<string, string[]> | null>;
  saveRolePermissions(organizationId: string, permissions: Record<string, string[]>): Promise<void>;
  resetRolePermissions(organizationId: string, role?: string): Promise<void>;
  
  // Membership operations
  createMembership(membership: InsertMembership): Promise<Membership>;
  getMembership(membershipId: string): Promise<Membership | undefined>;
  getUserMemberships(userId: string): Promise<Membership[]>;
  getOrganizationMemberships(organizationId: string): Promise<Membership[]>;
  getOrganizationMembers(organizationId: string): Promise<any[]>;
  updateMembershipRole(membershipId: string, role: string): Promise<Membership>;
  deleteMembership(membershipId: string): Promise<boolean>;

  // Projects (organization-scoped)
  getProjects(organizationId: string): Promise<Project[]>;
  getProject(id: string, organizationId: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, organizationId: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string, organizationId: string): Promise<boolean>;
  duplicateProject(id: string, organizationId: string, options: { customerId?: string; name: string; quoteType?: string }): Promise<Project>;
  // Project Versioning
  createProjectVersion(projectId: string, versionName: string, userId: string): Promise<ProjectVersion>;
  getProjectVersions(projectId: string): Promise<ProjectVersion[]>;
  restoreProjectVersion(projectId: string, versionId: string): Promise<void>;

  // Door Openings
  getOpenings(): Promise<DoorOpening[]>;
  getOpeningsByOrganization(organizationId: string): Promise<DoorOpening[]>;
  getOpening(id: string): Promise<DoorOpening | undefined>;
  getOpeningsByProject(projectId: string): Promise<DoorOpening[]>;
  createOpening(opening: InsertDoorOpening): Promise<DoorOpening>;
  updateOpening(id: string, organizationId: string, opening: Partial<InsertDoorOpening>): Promise<DoorOpening | undefined>;
  deleteOpening(id: string, organizationId: string): Promise<boolean>;
  duplicateOpening(id: string): Promise<DoorOpening | undefined>;
  getOpeningsByIds(ids: string[], organizationId: string): Promise<DoorOpening[]>;

  // Service History (organization-scoped)
  getServiceHistory(openingId: string, organizationId: string): Promise<ServiceHistory[]>;
  getServiceHistoryById(id: string, organizationId: string): Promise<ServiceHistory | undefined>;
  createServiceHistory(history: InsertServiceHistory): Promise<ServiceHistory>;
  updateServiceHistory(id: string, organizationId: string, updates: Partial<InsertServiceHistory>): Promise<ServiceHistory | undefined>;
  deleteServiceHistory(id: string, organizationId: string): Promise<boolean>;

  // Photos
  getPhotos(): Promise<Photo[]>;
  getPhotosByOrganization(organizationId: string): Promise<Photo[]>;
  getPhoto(id: string): Promise<Photo | undefined>;
  getPhotosByOpening(openingId: string): Promise<Photo[]>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: string, photo: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: string): Promise<boolean>;

  // Calibration Profiles
  getCalibrationProfiles(organizationId: string): Promise<CalibrationProfile[]>;
  getCalibrationProfile(id: string): Promise<CalibrationProfile | undefined>;
  createCalibrationProfile(profile: InsertCalibrationProfile): Promise<CalibrationProfile>;
  updateCalibrationProfile(id: string, profile: Partial<InsertCalibrationProfile>): Promise<CalibrationProfile | undefined>;
  deleteCalibrationProfile(id: string): Promise<boolean>;

  // LiDAR Scans
  getLidarScans(): Promise<LidarScan[]>;
  getLidarScan(id: string): Promise<LidarScan | undefined>;
  getLidarScansByOpening(openingId: string): Promise<LidarScan[]>;
  createLidarScan(scan: InsertLidarScan): Promise<LidarScan>;
  updateLidarScan(id: string, scan: Partial<InsertLidarScan>): Promise<LidarScan | undefined>;
  deleteLidarScan(id: string): Promise<boolean>;

  // Scan Photos
  getScanPhotosByScan(scanId: string): Promise<ScanPhoto[]>;
  getScanPhotosByOpening(openingId: string): Promise<ScanPhoto[]>;
  createScanPhoto(photo: InsertScanPhoto): Promise<ScanPhoto>;
  deleteScanPhoto(id: string): Promise<boolean>;

  // Detection Overrides (organization-scoped learning system)
  createDetectionOverride(override: InsertDetectionOverride): Promise<DetectionOverride>;
  getDetectionOverridesByOpening(openingId: string): Promise<DetectionOverride[]>;
  getDetectionOverridesByOrg(organizationId: string, fieldPath?: string): Promise<DetectionOverride[]>;

  // Hardware Scans (organization-scoped)
  getHardwareScans(organizationId: string): Promise<HardwareScan[]>;
  getHardwareScan(id: string, organizationId: string): Promise<HardwareScan | undefined>;
  getHardwareScansByOpening(openingId: string, organizationId: string): Promise<HardwareScan[]>;
  createHardwareScan(scan: InsertHardwareScan): Promise<HardwareScan>;
  deleteHardwareScan(id: string, organizationId: string): Promise<boolean>;

  // AR Measurements (organization-scoped)
  getArMeasurements(organizationId: string): Promise<ArMeasurement[]>;
  getArMeasurement(id: string, organizationId: string): Promise<ArMeasurement | undefined>;
  getArMeasurementsByOpening(openingId: string, organizationId: string): Promise<ArMeasurement[]>;
  createArMeasurement(measurement: InsertArMeasurement): Promise<ArMeasurement>;
  deleteArMeasurement(id: string, organizationId: string): Promise<boolean>;

  // Guided Scan System (organization-scoped)
  getScanConfig(organizationId: string): Promise<ScanConfig | undefined>;
  upsertScanConfig(config: InsertScanConfig & { organizationId: string }): Promise<ScanConfig>;
  createScanMetric(metric: InsertScanMetric & { organizationId: string, userId: string }): Promise<ScanMetric>;

  // PDF Catalog Imports (organization-scoped)
  getPdfCatalogImports(organizationId: string): Promise<PdfCatalogImport[]>;
  getPdfCatalogImport(id: string, organizationId: string): Promise<PdfCatalogImport | undefined>;
  createPdfCatalogImport(importData: InsertPdfCatalogImport): Promise<PdfCatalogImport>;
  updatePdfCatalogImport(id: string, organizationId: string, updates: Partial<InsertPdfCatalogImport>): Promise<PdfCatalogImport | undefined>;
  deletePdfCatalogImport(id: string, organizationId: string): Promise<boolean>;

  // Additional Door Items (organization-scoped)
  getAdditionalDoorItems(openingId: string, organizationId: string): Promise<AdditionalDoorItem[]>;
  getAdditionalDoorItem(id: string, organizationId: string): Promise<AdditionalDoorItem | undefined>;
  createAdditionalDoorItem(item: InsertAdditionalDoorItem): Promise<AdditionalDoorItem>;
  updateAdditionalDoorItem(id: string, organizationId: string, item: UpdateAdditionalDoorItem): Promise<AdditionalDoorItem | undefined>;
  deleteAdditionalDoorItem(id: string, organizationId: string): Promise<boolean>;

  // Hardware Items
  getHardwareItems(): Promise<HardwareItem[]>;
  getHardwareItemsByOrganization(organizationId: string): Promise<HardwareItem[]>;
  getHardwareItem(id: string): Promise<HardwareItem | undefined>;
  getHardwareItemsByOpening(openingId: string): Promise<HardwareItem[]>;
  createHardwareItem(item: InsertHardwareItem): Promise<HardwareItem>;
  updateHardwareItem(id: string, organizationId: string, item: Partial<InsertHardwareItem>): Promise<HardwareItem | undefined>;
  deleteHardwareItem(id: string, organizationId: string): Promise<boolean>;

  // Hardware Bundles (organization-scoped)
  getHardwareBundles(organizationId: string): Promise<HardwareBundle[]>;
  getHardwareBundle(id: string, organizationId: string): Promise<HardwareBundle | undefined>;
  createHardwareBundle(bundle: InsertHardwareBundle): Promise<HardwareBundle>;
  updateHardwareBundle(id: string, organizationId: string, bundle: Partial<InsertHardwareBundle>): Promise<HardwareBundle | undefined>;
  deleteHardwareBundle(id: string, organizationId: string): Promise<boolean>;
  
  // Bundle Items
  getBundleItems(bundleId?: string): Promise<BundleItem[]>;
  createBundleItem(item: InsertBundleItem): Promise<BundleItem>;
  updateBundleItem(id: string, item: Partial<InsertBundleItem>): Promise<BundleItem | undefined>;
  deleteBundleItem(id: string): Promise<boolean>;

  // BOM Templates - Pre-configured hardware sets
  getBomTemplates(organizationId: string): Promise<BomTemplate[]>;
  getBomTemplate(id: string): Promise<BomTemplate | undefined>;
  getBomTemplateItems(templateId: string): Promise<BomTemplateItem[]>;

  // BOM (Bill of Materials) - AI-generated hardware recommendations (organization-scoped)
  getBomsByOpening(openingId: string, organizationId: string): Promise<Bom[]>;
  getBom(id: string, organizationId: string): Promise<Bom | undefined>;
  createBom(bom: InsertBom): Promise<Bom>;
  updateBom(id: string, organizationId: string, updates: Partial<InsertBom>): Promise<Bom | undefined>;
  deleteBom(id: string, organizationId: string): Promise<boolean>;
  
  // BOM Items
  getBomItems(bomId: string): Promise<BomItem[]>;
  createBomItem(item: InsertBomItem): Promise<BomItem>;
  deleteBomItem(id: string): Promise<boolean>;

  // Catalog Items (organization-scoped)
  getCatalogItems(organizationId: string): Promise<CatalogItem[]>;
  getCatalogItem(id: string, organizationId: string): Promise<CatalogItem | undefined>;
  createCatalogItem(item: InsertCatalogItem): Promise<CatalogItem>;
  updateCatalogItem(id: string, organizationId: string, item: Partial<InsertCatalogItem>): Promise<CatalogItem | undefined>;
  deleteCatalogItem(id: string, organizationId: string): Promise<boolean>;

  // Hardware Cross-Reference
  getHardwareCrossReferences(): Promise<HardwareCrossReference[]>;
  getHardwareCrossReference(id: string): Promise<HardwareCrossReference | undefined>;
  searchCrossReferenceByPart(partNumber: string): Promise<HardwareCrossReference[]>;
  createHardwareCrossReference(item: InsertHardwareCrossReference): Promise<HardwareCrossReference>;
  updateHardwareCrossReference(id: string, item: Partial<InsertHardwareCrossReference>): Promise<HardwareCrossReference | undefined>;
  deleteHardwareCrossReference(id: string): Promise<boolean>;

  // Door Templates (organization-scoped)
  getDoorTemplates(organizationId: string): Promise<DoorTemplate[]>;
  getDoorTemplate(id: string, organizationId: string): Promise<DoorTemplate | undefined>;
  createDoorTemplate(template: InsertDoorTemplate): Promise<DoorTemplate>;
  updateDoorTemplate(id: string, organizationId: string, template: Partial<InsertDoorTemplate>): Promise<DoorTemplate | undefined>;
  deleteDoorTemplate(id: string, organizationId: string): Promise<boolean>;

  // Reference Data
  getDoorReference(): Promise<DoorReference[]>;
  getOptionsLookup(): Promise<OptionsLookup[]>;
  getSurveyFieldReference(): Promise<SurveyFieldReference[]>;
  getHardwareLocationCheat(): Promise<HardwareLocationCheat[]>;
  getEdgeLiteTypesHmma810(): Promise<EdgeLiteTypesHmma810[]>;
  getLiteKits(): Promise<any[]>;
  getGlassTypes(): Promise<any[]>;
  getGlassFireSizes(): Promise<any[]>;
  getPivotPatchHardware(): Promise<any[]>;
  
  // Reference Data Import
  importDoorReference(records: any[]): Promise<void>;
  importOptionsLookup(records: any[]): Promise<void>;
  importSurveyFieldReference(records: any[]): Promise<void>;
  importHardwareLocationCheat(records: any[]): Promise<void>;
  importEdgeLiteTypesHmma810(records: any[]): Promise<void>;
  
  // Compliance
  getComplianceRules(): Promise<ComplianceRule[]>;
  
  // AI Corrections
  createAiCorrection(correction: InsertAiCorrection): Promise<AiCorrection>;
  getAiCorrectionsByOpening(openingId: string): Promise<AiCorrection[]>;
  getRecentAiCorrections(limit?: number): Promise<AiCorrection[]>;
  
  // Customers (organization-scoped)
  getCustomers(organizationId: string): Promise<Customer[]>;
  getCustomer(id: string, organizationId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, organizationId: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string, organizationId: string): Promise<boolean>;
  
  // Customer Locations
  getCustomerLocations(customerId: string): Promise<CustomerLocation[]>;
  getCustomerLocation(id: string): Promise<CustomerLocation | undefined>;
  createCustomerLocation(location: InsertCustomerLocation): Promise<CustomerLocation>;
  updateCustomerLocation(id: string, location: Partial<InsertCustomerLocation>): Promise<CustomerLocation | undefined>;
  deleteCustomerLocation(id: string): Promise<boolean>;
  
  // Customer Product History
  getCustomerProductHistory(customerId: string): Promise<CustomerProductHistory[]>;
  getCustomerProductsByType(customerId: string, productType: string): Promise<CustomerProductHistory[]>;
  getCustomerMostUsedProducts(customerId: string, limit?: number): Promise<CustomerProductHistory[]>;
  createProductHistory(history: InsertCustomerProductHistory): Promise<CustomerProductHistory>;
  updateProductHistory(id: string, history: Partial<InsertCustomerProductHistory>): Promise<CustomerProductHistory | undefined>;
  
  // Manufacturer Contacts (GLOBALLY SHARED - no organization filtering)
  getManufacturerContacts(searchTerm?: string): Promise<ManufacturerContact[]>;
  getManufacturerContact(id: string): Promise<ManufacturerContact | undefined>;
  createManufacturerContact(contact: InsertManufacturerContact, userId: string, organizationId: string): Promise<ManufacturerContact>;
  updateManufacturerContact(id: string, contact: Partial<InsertManufacturerContact>, userId: string, organizationId: string): Promise<ManufacturerContact | undefined>;
  deleteManufacturerContact(id: string): Promise<boolean>;
  findDuplicateManufacturer(name: string, email: string, excludeId?: string): Promise<ManufacturerContact | undefined>;
  
  // Distributors (ORGANIZATION-SCOPED)
  getDistributors(organizationId: string, includeArchived?: boolean): Promise<Distributor[]>;
  getDistributor(id: string, organizationId: string, includeArchived?: boolean): Promise<Distributor | undefined>;
  getDistributorsByIds(distributorIds: string[], organizationId: string, includeArchived?: boolean): Promise<Distributor[]>;
  getPrimaryDistributor(organizationId: string): Promise<Distributor | undefined>;
  createDistributor(distributor: InsertDistributor): Promise<Distributor>;
  updateDistributor(id: string, organizationId: string, updates: Partial<InsertDistributor>): Promise<Distributor | undefined>;
  setPrimaryDistributor(id: string, organizationId: string): Promise<Distributor | undefined>;
  deleteDistributor(id: string, organizationId: string): Promise<{ success: boolean; reason?: string }>; // Soft delete with validation
  
  // Distributor-Manufacturer Relationships (ORGANIZATION-SCOPED)
  getDistributorManufacturers(distributorId: string, organizationId: string): Promise<DistributorManufacturer[]>;
  getDistributorManufacturersByManufacturer(manufacturerName: string, organizationId: string): Promise<DistributorManufacturer[]>;
  getDistributorManufacturerLink(distributorId: string, manufacturerName: string, organizationId: string): Promise<DistributorManufacturer | undefined>;
  createDistributorManufacturer(relationship: InsertDistributorManufacturer): Promise<DistributorManufacturer>;
  deleteDistributorManufacturer(id: string, organizationId: string): Promise<boolean>;
  
  // Manufacturer Products
  getManufacturerProducts(contactId: string): Promise<ManufacturerProduct[]>;
  createManufacturerProduct(product: InsertManufacturerProduct): Promise<ManufacturerProduct>;
  deleteManufacturerProduct(id: string): Promise<boolean>;
  
  // Manufacturer Literature (GLOBALLY VISIBLE - organization tracks uploader)
  getManufacturerLiterature(contactId: string): Promise<ManufacturerLiterature[]>;
  getManufacturerLiteratureByOrg(organizationId: string): Promise<ManufacturerLiterature[]>;
  getManufacturerLiteratureById(id: string): Promise<ManufacturerLiterature | undefined>;
  createManufacturerLiterature(literature: InsertManufacturerLiterature): Promise<ManufacturerLiterature>;
  updateManufacturerLiterature(id: string, literature: Partial<InsertManufacturerLiterature>): Promise<ManufacturerLiterature | undefined>;
  deleteManufacturerLiterature(id: string): Promise<boolean>;
  
  // Quote Requests
  getQuoteRequests(): Promise<QuoteRequest[]>;
  getQuoteRequestsByOrganization(organizationId: string): Promise<QuoteRequest[]>;
  getQuoteRequest(id: string): Promise<QuoteRequest | undefined>;
  getQuoteRequestsByProject(projectId: string): Promise<QuoteRequest[]>;
  createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest>;
  updateQuoteRequest(id: string, request: Partial<InsertQuoteRequest>): Promise<QuoteRequest | undefined>;
  deleteQuoteRequest(id: string): Promise<boolean>;
  
  // Purchase Orders
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  getPurchaseOrdersByProject(projectId: string): Promise<PurchaseOrder[]>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string): Promise<boolean>;
  generateNextPONumber(): Promise<string>;
  
  // Purchase Order Line Items
  getLineItemsByPO(poId: string): Promise<PurchaseOrderLineItem[]>;
  createLineItem(item: InsertPurchaseOrderLineItem): Promise<PurchaseOrderLineItem>;
  updateLineItem(id: string, item: Partial<InsertPurchaseOrderLineItem>): Promise<PurchaseOrderLineItem | undefined>;
  deleteLineItem(id: string): Promise<boolean>;
  
  // Vendor Quotes
  getVendorQuotes(): Promise<VendorQuote[]>;
  getVendorQuote(id: string): Promise<VendorQuote | undefined>;
  getVendorQuotesByProject(projectId: string): Promise<VendorQuote[]>;
  createVendorQuote(quote: InsertVendorQuote): Promise<VendorQuote>;
  updateVendorQuote(id: string, quote: Partial<InsertVendorQuote>): Promise<VendorQuote | undefined>;
  deleteVendorQuote(id: string): Promise<boolean>;
  
  // Project Costs
  getProjectCost(projectId: string): Promise<ProjectCost | undefined>;
  createProjectCost(cost: InsertProjectCost): Promise<ProjectCost>;
  updateProjectCost(projectId: string, cost: Partial<InsertProjectCost>): Promise<ProjectCost | undefined>;
  deleteProjectCost(projectId: string): Promise<boolean>;
  updateProjectHardwareCosts(projectId: string, organizationId: string): Promise<{ updated: number; orphaned: number; total: number; items: Array<{ hardwareItemId: string; openingId: string; status: "verified" | "orphaned"; catalogItemId: string | null }> }>;
  
  // Change Orders
  getChangeOrders(organizationId: string): Promise<ChangeOrder[]>;
  getChangeOrder(id: string, organizationId: string): Promise<ChangeOrder | undefined>;
  getChangeOrdersByProject(projectId: string, organizationId: string): Promise<ChangeOrder[]>;
  createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder>;
  updateChangeOrder(id: string, organizationId: string, changeOrder: Partial<InsertChangeOrder>): Promise<ChangeOrder | undefined>;
  deleteChangeOrder(id: string, organizationId: string): Promise<boolean>;
  generateNextChangeOrderNumber(projectId: string, organizationId: string): Promise<string>;
  
  // Change Order Items
  getChangeOrderItems(changeOrderId: string): Promise<ChangeOrderItem[]>;
  getChangeOrderItem(id: string): Promise<ChangeOrderItem | undefined>;
  createChangeOrderItem(item: InsertChangeOrderItem): Promise<ChangeOrderItem>;
  updateChangeOrderItem(id: string, organizationId: string, item: Partial<InsertChangeOrderItem>): Promise<ChangeOrderItem | undefined>;
  deleteChangeOrderItem(id: string, organizationId: string): Promise<boolean>;
  
  // Disclaimers
  getDisclaimers(): Promise<Disclaimer[]>;
  getDisclaimer(id: string): Promise<Disclaimer | undefined>;
  createDisclaimer(disclaimer: InsertDisclaimer): Promise<Disclaimer>;
  updateDisclaimer(id: string, disclaimer: Partial<InsertDisclaimer>): Promise<Disclaimer | undefined>;
  deleteDisclaimer(id: string): Promise<boolean>;
  
  // Disclaimer Links
  getDisclaimerLinks(): Promise<DisclaimerLink[]>;
  getDisclaimerLinksByEntity(entityType: string, entityId: string): Promise<DisclaimerLink[]>;
  getDisclaimerLinksByDisclaimer(disclaimerId: string): Promise<DisclaimerLink[]>;
  createDisclaimerLink(link: InsertDisclaimerLink): Promise<DisclaimerLink>;
  deleteDisclaimerLink(id: string): Promise<boolean>;
  
  // Gasketing Catalog
  getGasketingCatalog(): Promise<GasketingCatalog[]>;
  getGasketingItem(id: string): Promise<GasketingCatalog | undefined>;
  createGasketingItem(item: InsertGasketingCatalog): Promise<GasketingCatalog>;
  updateGasketingItem(id: string, item: Partial<InsertGasketingCatalog>): Promise<GasketingCatalog | undefined>;
  deleteGasketingItem(id: string): Promise<boolean>;
  
  // Opening Gasketing
  getOpeningGasketing(openingId: string): Promise<OpeningGasketing[]>;
  createOpeningGasketing(item: InsertOpeningGasketing): Promise<OpeningGasketing>;
  deleteOpeningGasketing(id: string): Promise<boolean>;
  
  // Key Records (organization-scoped, free tier)
  getKeyRecords(organizationId: string): Promise<KeyRecord[]>;
  getKeyRecord(id: string, organizationId: string): Promise<KeyRecord | undefined>;
  createKeyRecord(record: InsertKeyRecord): Promise<KeyRecord>;
  updateKeyRecord(id: string, organizationId: string, record: Partial<InsertKeyRecord>): Promise<KeyRecord | undefined>;
  deleteKeyRecord(id: string, organizationId: string): Promise<boolean>;
  
  // Master Key Systems (organization-scoped)
  getMasterKeySystems(organizationId: string): Promise<MasterKeySystem[]>;
  getMasterKeySystem(id: string, organizationId: string): Promise<MasterKeySystem | undefined>;
  createMasterKeySystem(system: InsertMasterKeySystem): Promise<MasterKeySystem>;
  updateMasterKeySystem(id: string, organizationId: string, system: Partial<InsertMasterKeySystem>): Promise<MasterKeySystem | undefined>;
  deleteMasterKeySystem(id: string, organizationId: string): Promise<boolean>;
  
  // Lock Sets (organization-scoped)
  getLockSets(organizationId: string, projectId?: string): Promise<LockSet[]>;
  getLockSet(id: string, organizationId: string): Promise<LockSet | undefined>;
  createLockSet(set: InsertLockSet): Promise<LockSet>;
  updateLockSet(id: string, organizationId: string, set: Partial<InsertLockSet>): Promise<LockSet | undefined>;
  deleteLockSet(id: string, organizationId: string): Promise<boolean>;
  
  // Floor Plans (organization-scoped)
  getFloorPlans(organizationId: string, projectId?: string): Promise<FloorPlan[]>;
  getFloorPlan(id: string, organizationId: string): Promise<FloorPlan | undefined>;
  createFloorPlan(plan: InsertFloorPlan): Promise<FloorPlan>;
  updateFloorPlan(id: string, organizationId: string, plan: Partial<InsertFloorPlan>): Promise<FloorPlan | undefined>;
  deleteFloorPlan(id: string, organizationId: string): Promise<boolean>;
  
  // Door Locations (for mapping openings to floor plans) - organization-scoped via floor plans
  getDoorLocations(floorPlanId: string, organizationId: string): Promise<DoorLocation[]>;
  getDoorLocation(id: string, organizationId: string): Promise<DoorLocation | undefined>;
  getDoorLocationByOpening(openingId: string, organizationId: string): Promise<DoorLocation | undefined>;
  createDoorLocation(location: InsertDoorLocation, organizationId: string): Promise<DoorLocation>;
  updateDoorLocation(id: string, organizationId: string, location: Partial<InsertDoorLocation>): Promise<DoorLocation | undefined>;
  deleteDoorLocation(id: string, organizationId: string): Promise<boolean>;
  
  // Leads & Sales (organization-scoped)
  getLeads(organizationId?: string): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  
  // Sales Activities
  getSalesActivities(leadId: string): Promise<SalesActivity[]>;
  createSalesActivity(activity: InsertSalesActivity): Promise<SalesActivity>;
  deleteSalesActivity(id: string): Promise<boolean>;
  
  // Marketing Campaigns (organization-scoped)
  getMarketingCampaigns(organizationId: string): Promise<MarketingCampaign[]>;
  getMarketingCampaign(id: string, organizationId: string): Promise<MarketingCampaign | undefined>;
  createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign>;
  updateMarketingCampaign(id: string, organizationId: string, campaign: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign | undefined>;
  deleteMarketingCampaign(id: string, organizationId: string): Promise<boolean>;
  
  // Marketing Landing Pages (organization-scoped)
  getMarketingLandingPages(organizationId: string, status?: string): Promise<MarketingLandingPage[]>;
  getMarketingLandingPage(id: string, organizationId: string): Promise<MarketingLandingPage | undefined>;
  getMarketingLandingPagePublic(id: string): Promise<MarketingLandingPage | undefined>;
  getMarketingLandingPageBySlug(slug: string): Promise<MarketingLandingPage | undefined>;
  createMarketingLandingPage(page: InsertMarketingLandingPage): Promise<MarketingLandingPage>;
  updateMarketingLandingPage(id: string, organizationId: string, page: Partial<InsertMarketingLandingPage>): Promise<MarketingLandingPage | undefined>;
  deleteMarketingLandingPage(id: string, organizationId: string): Promise<boolean>;
  incrementLandingPageView(id: string): Promise<void>;
  incrementLandingPageLead(id: string): Promise<void>;
  
  // Marketing Lead Forms (organization-scoped)
  getMarketingLeadForms(organizationId: string): Promise<MarketingLeadForm[]>;
  getMarketingLeadForm(id: string, organizationId: string): Promise<MarketingLeadForm | undefined>;
  getMarketingLeadFormsByPage(landingPageId: string, organizationId: string): Promise<MarketingLeadForm[]>;
  createMarketingLeadForm(form: InsertMarketingLeadForm): Promise<MarketingLeadForm>;
  updateMarketingLeadForm(id: string, organizationId: string, form: Partial<InsertMarketingLeadForm>): Promise<MarketingLeadForm | undefined>;
  deleteMarketingLeadForm(id: string, organizationId: string): Promise<boolean>;
  incrementFormSubmission(id: string): Promise<void>;
  
  // Marketing Leads (organization-scoped)
  getMarketingLeads(organizationId: string, filters?: { status?: string; campaignId?: string }): Promise<MarketingLead[]>;
  getMarketingLead(id: string, organizationId: string): Promise<MarketingLead | undefined>;
  createMarketingLead(lead: InsertMarketingLead): Promise<MarketingLead>;
  updateMarketingLead(id: string, organizationId: string, lead: Partial<InsertMarketingLead>): Promise<MarketingLead | undefined>;
  deleteMarketingLead(id: string, organizationId: string): Promise<boolean>;
  convertMarketingLeadToSalesLead(marketingLeadId: string, organizationId: string): Promise<Lead>;
  
  // Marketing Analytics (organization-scoped)
  createMarketingAnalytics(event: InsertMarketingAnalytics): Promise<MarketingAnalytics>;
  getMarketingAnalytics(organizationId: string, filters?: { eventType?: string; landingPageId?: string; campaignId?: string; startDate?: Date; endDate?: Date }): Promise<MarketingAnalytics[]>;
  getMarketingAnalyticsSummary(organizationId: string, startDate?: Date, endDate?: Date): Promise<any>;

  // Testimonials (public content - organization nullable)
  getTestimonials(filters?: { status?: string; industry?: string; isFeatured?: string }): Promise<Testimonial[]>;
  getTestimonial(id: string): Promise<Testimonial | undefined>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: string, testimonial: Partial<InsertTestimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: string): Promise<boolean>;
  approveTestimonial(id: string, approvedBy: string): Promise<Testimonial | undefined>;

  // Case Studies (public content - organization nullable)
  getCaseStudies(filters?: { status?: string; industry?: string; isFeatured?: string }): Promise<CaseStudy[]>;
  getCaseStudy(id: string): Promise<CaseStudy | undefined>;
  getCaseStudyBySlug(slug: string): Promise<CaseStudy | undefined>;
  createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy>;
  updateCaseStudy(id: string, caseStudy: Partial<InsertCaseStudy>): Promise<CaseStudy | undefined>;
  deleteCaseStudy(id: string): Promise<boolean>;
  approveCaseStudy(id: string, approvedBy: string): Promise<CaseStudy | undefined>;
  incrementCaseStudyView(id: string): Promise<void>;
  incrementCaseStudyDownload(id: string): Promise<void>;

  // Blog Categories (public content - no organization scoping)
  getBlogCategories(filters?: { isActive?: string }): Promise<BlogCategory[]>;
  getBlogCategory(id: string): Promise<BlogCategory | undefined>;
  getBlogCategoryBySlug(slug: string): Promise<BlogCategory | undefined>;
  createBlogCategory(category: InsertBlogCategory): Promise<BlogCategory>;
  updateBlogCategory(id: string, category: Partial<InsertBlogCategory>): Promise<BlogCategory | undefined>;
  deleteBlogCategory(id: string): Promise<boolean>;
  incrementCategoryPostCount(categoryId: string, delta: number): Promise<void>;

  // Blog Tags (public content - no organization scoping)
  getBlogTags(filters?: { limit?: number }): Promise<BlogTag[]>;
  getBlogTag(id: string): Promise<BlogTag | undefined>;
  getBlogTagBySlug(slug: string): Promise<BlogTag | undefined>;
  createBlogTag(tag: InsertBlogTag): Promise<BlogTag>;
  updateBlogTag(id: string, tag: Partial<InsertBlogTag>): Promise<BlogTag | undefined>;
  deleteBlogTag(id: string): Promise<boolean>;
  incrementTagPostCount(tagId: string, delta: number): Promise<void>;

  // Blog Posts (public content - author scoped)
  getBlogPosts(filters?: { status?: string; categoryId?: string; authorId?: string; isFeatured?: string; search?: string; limit?: number; offset?: number }): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: string): Promise<boolean>;
  incrementBlogPostView(id: string): Promise<void>;
  publishBlogPost(id: string): Promise<BlogPost | undefined>;
  archiveBlogPost(id: string): Promise<BlogPost | undefined>;
  getRelatedPosts(postId: string, limit?: number): Promise<BlogPost[]>;
  getBlogPostsByTag(tagId: string, filters?: { status?: string; limit?: number }): Promise<BlogPost[]>;

  // Blog Post Tags (many-to-many relationships)
  getBlogPostTags(postId: string): Promise<BlogPostTag[]>;
  getTagsForPost(postId: string): Promise<BlogTag[]>;
  addTagToPost(postId: string, tagId: string): Promise<BlogPostTag>;
  removeTagFromPost(postId: string, tagId: string): Promise<boolean>;
  setPostTags(postId: string, tagIds: string[]): Promise<void>;

  // Bug Reports (organization-scoped)
  createBugReport(bugData: InsertBugReport): Promise<BugReport>;
  getBugReports(organizationId: string, filters?: any): Promise<BugReport[]>;
  getBugReport(id: string, organizationId: string): Promise<BugReport | undefined>;
  updateBugReport(id: string, organizationId: string, updates: Partial<InsertBugReport>): Promise<BugReport | undefined>;
  deleteBugReport(id: string, organizationId: string): Promise<boolean>;
  
  // External Service Connections (organization-scoped)
  getExternalServiceConnections(organizationId: string): Promise<ExternalServiceConnection[]>;
  getExternalServiceConnection(id: string, organizationId: string): Promise<ExternalServiceConnection | undefined>;
  getExternalServiceConnectionByService(organizationId: string, service: string): Promise<ExternalServiceConnection | undefined>;
  createExternalServiceConnection(connection: InsertExternalServiceConnection): Promise<ExternalServiceConnection>;
  updateExternalServiceConnection(id: string, organizationId: string, updates: Partial<InsertExternalServiceConnection>): Promise<ExternalServiceConnection | undefined>;
  deleteExternalServiceConnection(id: string, organizationId: string): Promise<boolean>;
  
  // Linked External Resources (organization-scoped)
  getLinkedExternalResources(organizationId: string, projectId?: string): Promise<LinkedExternalResource[]>;
  getLinkedExternalResourcesByService(organizationId: string, service: string, projectId?: string): Promise<LinkedExternalResource[]>;
  createLinkedExternalResource(resource: InsertLinkedExternalResource): Promise<LinkedExternalResource>;
  deleteLinkedExternalResource(id: string, organizationId: string): Promise<boolean>;
  
  // ====== PHASE 0: FOUNDATION - ANALYTICS & EVENT TRACKING ======
  // Analytics Events
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsEvents(organizationId: string, filters?: { eventType?: string; startDate?: Date; endDate?: Date }): Promise<AnalyticsEvent[]>;
  
  // KPI Aggregations
  createKpiAggregation(kpi: InsertKpiAggregation): Promise<KpiAggregation>;
  getKpiAggregations(organizationId: string, filters?: { kpiName?: string; periodType?: string }): Promise<KpiAggregation[]>;
  updateKpiAggregation(id: string, organizationId: string, updates: Partial<InsertKpiAggregation>): Promise<KpiAggregation | undefined>;
  
  // ====== PHASE 0: FOUNDATION - FEATURE FLAGS ======
  // Feature Flags
  getFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(flagKey: string): Promise<FeatureFlag | undefined>;
  createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(id: string, updates: Partial<InsertFeatureFlag>): Promise<FeatureFlag | undefined>;
  deleteFeatureFlag(id: string): Promise<boolean>;
  evaluateFeatureFlag(flagKey: string, organizationId: string, userId: string): Promise<boolean>;
  
  // Feature Flag Evaluations
  createFeatureFlagEvaluation(evaluation: InsertFeatureFlagEvaluation): Promise<FeatureFlagEvaluation>;
  getFeatureFlagEvaluations(flagId: string): Promise<FeatureFlagEvaluation[]>;
  
  // ====== PHASE 0: FOUNDATION - INTEGRATION FRAMEWORK ======
  // Integration Providers
  getIntegrationProviders(category?: string): Promise<IntegrationProvider[]>;
  getIntegrationProvider(providerKey: string): Promise<IntegrationProvider | undefined>;
  createIntegrationProvider(provider: InsertIntegrationProvider): Promise<IntegrationProvider>;
  updateIntegrationProvider(id: string, updates: Partial<InsertIntegrationProvider>): Promise<IntegrationProvider | undefined>;
  
  // Organization Integrations
  getOrganizationIntegrations(organizationId: string): Promise<OrganizationIntegration[]>;
  getOrganizationIntegration(id: string, organizationId: string): Promise<OrganizationIntegration | undefined>;
  createOrganizationIntegration(integration: InsertOrganizationIntegration): Promise<OrganizationIntegration>;
  updateOrganizationIntegration(id: string, organizationId: string, updates: Partial<InsertOrganizationIntegration>): Promise<OrganizationIntegration | undefined>;
  deleteOrganizationIntegration(id: string, organizationId: string): Promise<boolean>;
  
  // Webhook Logs
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  getWebhookLogs(integrationId: string, filters?: { status?: string }): Promise<WebhookLog[]>;
  updateWebhookLog(id: string, updates: Partial<InsertWebhookLog>): Promise<WebhookLog | undefined>;
  
  // API Request Logs
  createApiRequestLog(log: InsertApiRequestLog): Promise<ApiRequestLog>;
  getApiRequestLogs(organizationId: string, filters?: { provider?: string; status?: string }): Promise<ApiRequestLog[]>;
  
  // ====== PHASE 0: FOUNDATION - EVENT BUS ======
  // Event Bus Messages
  publishEvent(message: InsertEventBusMessage): Promise<EventBusMessage>;
  getEventBusMessages(filters?: { eventType?: string; status?: string }): Promise<EventBusMessage[]>;
  updateEventBusMessage(id: string, updates: Partial<InsertEventBusMessage>): Promise<EventBusMessage | undefined>;
  
  // Event Subscriptions
  getEventSubscriptions(eventType?: string): Promise<EventSubscription[]>;
  createEventSubscription(subscription: InsertEventSubscription): Promise<EventSubscription>;
  updateEventSubscription(id: string, updates: Partial<InsertEventSubscription>): Promise<EventSubscription | undefined>;
  deleteEventSubscription(id: string): Promise<boolean>;
  
  // ====== WORKSTREAM 1: DATA & INTELLIGENCE PLATFORM ======
  // Predictive Analytics
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  getPredictions(projectId: string): Promise<Prediction[]>;
  getPredictionsByType(projectId: string, type: string): Promise<Prediction[]>;
  updatePredictionActual(id: string, actualValue: number): Promise<Prediction | undefined>;
  generateProjectPredictions(projectId: string, organizationId: string): Promise<Prediction[]>;
  
  // Prediction Feedback
  createPredictionFeedback(feedback: InsertPredictionFeedback): Promise<PredictionFeedback>;
  getPredictionFeedback(predictionId: string): Promise<PredictionFeedback[]>;
  
  // Advanced Reporting
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  getReportTemplate(id: string, organizationId: string): Promise<ReportTemplate | undefined>;
  getReportTemplates(organizationId: string, filters?: { reportType?: string; isTemplate?: string }): Promise<ReportTemplate[]>;
  updateReportTemplate(id: string, organizationId: string, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string, organizationId: string): Promise<boolean>;
  
  // Report Executions
  createReportExecution(execution: InsertReportExecution): Promise<ReportExecution>;
  getReportExecution(id: string, organizationId: string): Promise<ReportExecution | undefined>;
  getReportExecutions(organizationId: string, filters?: { templateId?: string; status?: string }): Promise<ReportExecution[]>;
  updateReportExecution(id: string, updates: Partial<InsertReportExecution>): Promise<ReportExecution | undefined>;
  executeReport(templateId: string, organizationId: string, executedBy: string, parameters?: any): Promise<ReportExecution>;
  
  // Report Schedules
  createReportSchedule(schedule: InsertReportSchedule): Promise<ReportSchedule>;
  getReportSchedule(id: string, organizationId: string): Promise<ReportSchedule | undefined>;
  getReportSchedules(organizationId: string, filters?: { isActive?: string }): Promise<ReportSchedule[]>;
  updateReportSchedule(id: string, organizationId: string, updates: Partial<InsertReportSchedule>): Promise<ReportSchedule | undefined>;
  deleteReportSchedule(id: string, organizationId: string): Promise<boolean>;
  
  // Report Shares
  createReportShare(share: InsertReportShare): Promise<ReportShare>;
  getReportShares(templateId: string, organizationId: string): Promise<ReportShare[]>;
  deleteReportShare(templateId: string, sharedWith: string, organizationId: string): Promise<boolean>;
  
  // Sales Activities
  getSalesActivity(id: string): Promise<SalesActivity | undefined>;

  // Roadmap Management (organization-scoped)
  // Milestones
  createRoadmapMilestone(milestone: InsertRoadmapMilestone): Promise<RoadmapMilestone>;
  getRoadmapMilestone(id: string, organizationId: string): Promise<RoadmapMilestone | undefined>;
  getRoadmapMilestones(organizationId: string): Promise<RoadmapMilestone[]>;
  updateRoadmapMilestone(id: string, organizationId: string, updates: Partial<InsertRoadmapMilestone>): Promise<RoadmapMilestone | undefined>;
  deleteRoadmapMilestone(id: string, organizationId: string): Promise<boolean>;
  
  // Tasks
  createRoadmapTask(task: InsertRoadmapTask): Promise<RoadmapTask>;
  getRoadmapTask(id: string, organizationId: string): Promise<RoadmapTask | undefined>;
  getRoadmapTasksByMilestone(milestoneId: string, organizationId: string): Promise<RoadmapTask[]>;
  getRoadmapTasksByOrganization(organizationId: string): Promise<RoadmapTask[]>;
  updateRoadmapTask(id: string, organizationId: string, updates: Partial<InsertRoadmapTask>): Promise<RoadmapTask | undefined>;
  deleteRoadmapTask(id: string, organizationId: string): Promise<boolean>;
  
  // Bulk import
  importRoadmapFromJSON(jsonData: any, organizationId: string): Promise<{ milestones: number; tasks: number }>;
  
  // API Keys (organization-scoped - Phase 6: Integrations & Ecosystem)
  createApiKey(apiKey: InsertApiKey, keyHash: string, keyPrefix: string): Promise<ApiKey>;
  getApiKey(id: string, organizationId: string): Promise<ApiKey | undefined>;
  getApiKeys(organizationId: string): Promise<ApiKey[]>;
  updateApiKey(id: string, organizationId: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  revokeApiKey(id: string, organizationId: string, revokedBy: string, reason?: string): Promise<ApiKey | undefined>;
  deleteApiKey(id: string, organizationId: string): Promise<boolean>;
  
  // Webhooks (organization-scoped - Phase 6: Integrations & Ecosystem)
  createWebhook(webhook: InsertWebhook, secret: string): Promise<Webhook>;
  getWebhook(id: string, organizationId: string): Promise<Webhook | undefined>;
  getWebhooks(organizationId: string): Promise<Webhook[]>;
  updateWebhook(id: string, organizationId: string, updates: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: string, organizationId: string): Promise<boolean>;
  
  // Invitation Tokens (Beta Tester Invitations)
  createInvitationToken(token: InsertInvitationToken): Promise<InvitationToken>;
  getInvitationToken(id: string): Promise<InvitationToken | undefined>;
  getInvitationTokenByToken(token: string): Promise<InvitationToken | undefined>;
  getInvitationTokens(): Promise<InvitationToken[]>;
  consumeInvitationToken(token: string, userId: string, email?: string | null): Promise<InvitationToken | undefined>;
  revokeInvitationToken(id: string): Promise<boolean>;
  
  // Versioning operations
  createVersionedEntity(entity: InsertVersionedEntity): Promise<VersionedEntity>;
  getVersionedEntity(id: string, organizationId: string): Promise<VersionedEntity | undefined>;
  getVersionedEntityByEntityRef(entityType: VersionableEntityType, entityId: string, organizationId: string): Promise<VersionedEntity | undefined>;
  updateVersionedEntityCurrentVersion(id: string, currentVersionId: string): Promise<VersionedEntity>;

  // Entity Version operations
  createEntityVersion(version: InsertEntityVersion): Promise<EntityVersion>;
  getEntityVersion(id: string): Promise<EntityVersion | undefined>;
  getVersionHistory(versionedEntityId: string, limit?: number, offset?: number): Promise<EntityVersion[]>;
  getLatestVersion(versionedEntityId: string): Promise<EntityVersion | undefined>;
  compareVersions(versionId1: string, versionId2: string): Promise<{ version1: EntityVersion; version2: EntityVersion } | undefined>;

  // Revision Mark operations
  createRevisionMarks(marks: InsertRevisionMark[]): Promise<RevisionMark[]>;
  getRevisionMarks(entityVersionId: string): Promise<RevisionMark[]>;
  getRevisionMarksByCategory(entityVersionId: string, category: string): Promise<RevisionMark[]>;
  deleteRevisionMarks(entityVersionId: string): Promise<boolean>;

  // ====== PROJECT MANAGEMENT TABLES ======
  // Project Assignments (organization-scoped)
  createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  getProjectAssignment(id: string, organizationId: string): Promise<ProjectAssignment | undefined>;
  getProjectAssignmentByProjectId(projectId: string, organizationId: string): Promise<ProjectAssignment | undefined>;
  listProjectAssignments(organizationId: string): Promise<ProjectAssignment[]>;
  updateProjectAssignment(id: string, organizationId: string, updates: Partial<InsertProjectAssignment>): Promise<ProjectAssignment | undefined>;
  deleteProjectAssignment(id: string, organizationId: string): Promise<boolean>;

  // Procurement Items (organization-scoped)
  createProcurementItem(item: InsertProcurementItem): Promise<ProcurementItem>;
  getProcurementItem(id: string, organizationId: string): Promise<ProcurementItem | undefined>;
  listProcurementItems(organizationId: string): Promise<ProcurementItem[]>;
  listProcurementItemsByProject(projectId: string, organizationId: string): Promise<ProcurementItem[]>;
  updateProcurementItem(id: string, organizationId: string, updates: Partial<InsertProcurementItem>): Promise<ProcurementItem | undefined>;
  deleteProcurementItem(id: string, organizationId: string): Promise<boolean>;

  // Project Issues (organization-scoped)
  createProjectIssue(issue: InsertProjectIssue): Promise<ProjectIssue>;
  getProjectIssue(id: string, organizationId: string): Promise<ProjectIssue | undefined>;
  listProjectIssues(organizationId: string): Promise<ProjectIssue[]>;
  listProjectIssuesByProject(projectId: string, organizationId: string): Promise<ProjectIssue[]>;
  updateProjectIssue(id: string, organizationId: string, updates: Partial<InsertProjectIssue>): Promise<ProjectIssue | undefined>;
  deleteProjectIssue(id: string, organizationId: string): Promise<boolean>;

  // Project Milestones (organization-scoped)
  createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone>;
  getProjectMilestone(id: string, organizationId: string): Promise<ProjectMilestone | undefined>;
  listProjectMilestones(organizationId: string): Promise<ProjectMilestone[]>;
  listProjectMilestonesByProject(projectId: string, organizationId: string): Promise<ProjectMilestone[]>;
  updateProjectMilestone(id: string, organizationId: string, updates: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined>;
  deleteProjectMilestone(id: string, organizationId: string): Promise<boolean>;

  getProjectTeamMembers(projectId: string): Promise<User[]>;

  // Manufacturer Order Forms (organization-scoped)
  createManufacturerOrderForm(form: InsertManufacturerOrderForm): Promise<ManufacturerOrderForm>;
  getManufacturerOrderForm(id: string, organizationId: string): Promise<ManufacturerOrderForm | undefined>;
  listManufacturerOrderForms(organizationId: string): Promise<ManufacturerOrderForm[]>;
  listManufacturerOrderFormsByProject(projectId: string, organizationId: string): Promise<ManufacturerOrderForm[]>;
  updateManufacturerOrderForm(id: string, organizationId: string, updates: Partial<InsertManufacturerOrderForm>): Promise<ManufacturerOrderForm | undefined>;
  deleteManufacturerOrderForm(id: string, organizationId: string): Promise<boolean>;

  // PM Analytics Summary (organization-scoped)
  getPMAnalyticsSummary(projectManagerId: string, organizationId: string): Promise<PMAnalyticsSummary | undefined>;
  upsertPMAnalyticsSummary(summary: InsertPMAnalyticsSummary): Promise<PMAnalyticsSummary>;
}

export class DatabaseStorage implements IStorage {
  private readonly dualScans = new DualScanSessionStore(db);
  createDualScanSession = (session: DualScanSessionData) => this.dualScans.create(session);
  getDualScanSession = (id: string, organizationId: string) => this.dualScans.get(id, organizationId);
  dualScanSessionExists = (id: string) => this.dualScans.exists(id);
  saveDualScanSession = (session: DualScanSessionData, organizationId: string) => this.dualScans.save(session, organizationId);
  constructor() {
    // Seed templates on first run (idempotent)
    this.seedTemplates();
    // Seed reference data on first run (idempotent)
    this.seedReferenceData();
    // Seed compliance rules on first run (idempotent)
    seedComplianceRules();
    // Seed access control components on first run (idempotent)
    seedAccessControlComponents();
    // Seed door/frame options catalog on first run (idempotent)
    seedDoorFrameOptions();
    // Seed gasketing catalog on first run (idempotent)
    this.seedGasketingCatalog();
    // Seed integration providers (Phase 0) on first run (idempotent)
    seedIntegrationProviders();
    // Seed industry reference library on first run (idempotent)
    seedReferenceLibrary();
  }

  private async seedReferenceData() {
    try {
      // Check if reference data already exists
      const existing = await db.select().from(doorReference).limit(1);
      if (existing.length > 0) {
        return; // Already seeded
      }

      // Load seed data from JSON file
      const seedPath = path.join(process.cwd(), "attached_assets", "seed.json");
      if (!fs.existsSync(seedPath)) {
        logger.warn("Reference data seed file not found", { seedPath });
        return;
      }

      const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

      // Seed door reference table
      if (seedData.door_reference && seedData.door_reference.length > 0) {
        await db.insert(doorReference).values(
          seedData.door_reference.map((item: any) => ({
            illustration: item.illustration,
            category: item.category,
            subcategory: item.subcategory,
            doorType: item.door_type,
            material: item.material,
            finish: item.finish,
            configuration: item.configuration,
            operation: item.operation,
            frameType: item.frame_type,
            hardware: item.hardware,
            glassType: item.glass_type,
            automationReady: item.automation_ready,
            commonUse: item.common_use,
            notes: item.notes,
            imageReference: item.image_reference,
            dutyLevel: item.duty_level,
            coreType: item.core_type,
            anchorType: item.anchor_type,
            gaugeDoor: item.gauge_door,
            gaugeFrame: item.gauge_frame,
            hardwarePrepType: item.hardware_prep_type,
            reinforcementSpec: item.reinforcement_spec,
            finishStandard: item.finish_standard,
            fireLabel: item.fire_label,
            toleranceGuide: item.tolerance_guide,
            wallTypeAnchorCompatibility: item.wall_type___anchor_compatibility,
            thermalRating: item.thermal_rating,
            constructionTypeHmma810: item.construction_type_hmma_810,
            edgeProfile: item.edge_profile,
            meetingEdgeAstragal: item.meeting_edge___astragal,
            visionLiteType: item.vision_lite_type,
            louverType: item.louver_type,
            hingeType: item.hinge_type,
            closerType: item.closer_type,
            lockType: item.lock_type,
            exitDeviceType: item.exit_device_type,
            stdLockClIn: item.std_lock_cl_in,
            stdPullDeadlockClIn: item.std_pull_deadlock_cl_in,
            hospitalLatchClIn: item.hospital_latch_cl_in,
            standardClearances: item.standard_clearances,
          }))
        );
      }

      // Seed options lookup table
      if (seedData.options_lookup && seedData.options_lookup.length > 0) {
        await db.insert(optionsLookup).values(seedData.options_lookup);
      }

      // Seed survey field reference table
      if (seedData.survey_field_reference && seedData.survey_field_reference.length > 0) {
        await db.insert(surveyFieldReference).values(seedData.survey_field_reference);
      }

      // Seed hardware location cheat table
      if (seedData.hardware_location_cheat && seedData.hardware_location_cheat.length > 0) {
        await db.insert(hardwareLocationCheat).values(
          seedData.hardware_location_cheat.map((item: any) => ({
            item: item.item,
            recommendedCenterlineIn: item.recommended_centerline_in,
          }))
        );
      }

      // Seed edge lite types HMMA 810 table
      if (seedData.edge_lite_types_hmma_810 && seedData.edge_lite_types_hmma_810.length > 0) {
        await db.insert(edgeLiteTypesHmma810).values(
          seedData.edge_lite_types_hmma_810.map((item: any) => ({
            category: item.category,
            examplesOrNotes: item.examples_or_notes,
          }))
        );
      }

      logger.info("Reference data seeded successfully");
    } catch (error) {
      logError(error as Error, { context: 'seed-reference-data' });
    }
  }

  private async seedGasketingCatalog() {
    try {
      // Check if gasketing catalog already exists
      const existing = await db.select().from(gasketingCatalog).limit(1);
      if (existing.length > 0) {
        return; // Already seeded
      }

      // Load seed data from JSON file
      const seedPath = path.join(process.cwd(), "attached_assets", "gasketing-seed.json");
      if (!fs.existsSync(seedPath)) {
        logger.warn("Gasketing catalog seed file not found", { seedPath });
        return;
      }

      const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

      // Seed gasketing catalog table
      if (seedData.gasketing_catalog && seedData.gasketing_catalog.length > 0) {
        await db.insert(gasketingCatalog).values(
          seedData.gasketing_catalog.map((item: any) => ({
            manufacturer: item.manufacturer,
            partNumber: item.partNumber,
            category: item.category,
            productName: item.productName,
            description: item.description,
            material: item.material,
            fireRating: item.fireRating,
            smokeRating: item.smokeRating,
            soundRating: item.soundRating,
            application: item.application,
            doorType: item.doorType,
            dimensions: item.dimensions,
            finish: item.finish,
            listPrice: item.listPrice,
            notes: item.notes,
            isActive: item.isActive,
          }))
        );
        logger.info("Seeded gasketing catalog items", { count: seedData.gasketing_catalog.length });
      }

      logger.info("Gasketing catalog seeded successfully");
    } catch (error) {
      logError(error as Error, { context: 'seed-gasketing-catalog' });
    }
  }

  private async seedTemplates() {
    // Seed with commercial door and frame standards
    const templates: InsertDoorTemplate[] = [
      // Commercial Standard Single Doors (ANSI/SDI A250.8)
      {
        name: "3'0\" × 7'0\" Single - Standard Commercial",
        description: "Standard commercial single door - most common size",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "mortise lock",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "surface mounted",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "3'0\" × 8'0\" Single - High Ceiling",
        description: "Commercial single door for 9-10 ft ceilings",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "36",
        doorHeight: "96",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "mortise lock",
        hingeType: "ball bearing",
        hingeCount: "4",
        closerType: "surface mounted",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "3'6\" × 7'0\" Single - ADA Compliant",
        description: "42\" clear width ADA compliant door",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "42",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "lever handle mortise",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "low energy auto",
        exitDevice: null,
        automationRequired: "yes",
        automationType: "power assist",
        accessControlRequired: "no",
        accessControlType: null,
      },
      // Commercial Double Doors (ANSI/SDI Standards)
      {
        name: "6'0\" × 7'0\" Pair - Standard Commercial",
        description: "Standard commercial double door (2 × 3'0\" leaves)",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "72",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "14 ga steel",
        frameWidth: "6",
        frameDepth: "5.75",
        lockType: "mortise lock",
        hingeType: "heavy duty ball bearing",
        hingeCount: "4",
        closerType: "overhead concealed",
        exitDevice: "rim panic",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "6'0\" × 7'0\" Fire-Rated Pair - 90min",
        description: "90-minute fire rated double door assembly",
        doorType: "double",
        doorMaterial: "hollow metal fire rated",
        doorWidth: "72",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal fire rated",
        frameMaterial: "14 ga steel",
        frameWidth: "6",
        frameDepth: "5.75",
        lockType: "mortise fire exit",
        hingeType: "ball bearing fire rated",
        hingeCount: "4",
        closerType: "surface fire rated",
        exitDevice: "vertical rod panic",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "yes",
        accessControlType: "card reader fire rated",
      },
      {
        name: "8'0\" × 8'0\" Pair - Oversized Commercial",
        description: "Large commercial double door for lobbies",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "96",
        doorHeight: "96",
        doorThickness: "2",
        frameType: "hollow metal",
        frameMaterial: "12 ga steel",
        frameWidth: "8",
        frameDepth: "6",
        lockType: "mortise heavy duty",
        hingeType: "continuous hinge",
        hingeCount: "continuous",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "yes",
        accessControlType: "card reader",
      },
      // Specialty Commercial Doors
      {
        name: "Hospital Patient Room - Standard",
        description: "3'8\" × 7'0\" patient room door with vision panel",
        doorType: "single",
        doorMaterial: "wood core laminate",
        doorWidth: "44",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.75",
        frameDepth: "6",
        lockType: "privacy mortise",
        hingeType: "antiligature ball bearing",
        hingeCount: "3",
        closerType: "overhead hold open",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "yes",
        accessControlType: "card reader with keypad",
      },
      {
        name: "Stairwell Fire Door - 20min",
        description: "20-minute fire rated stairwell door",
        doorType: "single",
        doorMaterial: "hollow metal fire rated",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal fire rated",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "storeroom mortise",
        hingeType: "ball bearing fire rated",
        hingeCount: "3",
        closerType: "surface fire rated",
        exitDevice: "rim panic bar",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "yes",
        accessControlType: "card reader",
      },
      {
        name: "Storefront Entry - Aluminum",
        description: "Aluminum storefront door with narrow stile",
        doorType: "single",
        doorMaterial: "aluminum glass",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "aluminum storefront",
        frameMaterial: "6063-T6 aluminum",
        frameWidth: "2",
        frameDepth: "4.5",
        lockType: "mortise storefront",
        hingeType: "pivot",
        hingeCount: "2",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "Automatic Sliding Entry - Commercial",
        description: "Low energy automatic sliding door (AAADM A156.10)",
        doorType: "sliding",
        doorMaterial: "aluminum glass",
        doorWidth: "72",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "aluminum",
        frameMaterial: "6063-T6 aluminum",
        frameWidth: "6",
        frameDepth: "8",
        lockType: "electromagnetic",
        hingeType: null,
        hingeCount: null,
        closerType: null,
        exitDevice: null,
        automationRequired: "yes",
        automationType: "low energy sliding",
        accessControlRequired: "yes",
        accessControlType: "motion sensor with push button",
      },
      {
        name: "High Traffic Double - Full Lite",
        description: "Full lite aluminum double door for high traffic",
        doorType: "double",
        doorMaterial: "aluminum full lite",
        doorWidth: "72",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "aluminum",
        frameMaterial: "6063-T6 aluminum",
        frameWidth: "6",
        frameDepth: "4.5",
        lockType: "mortise",
        hingeType: "continuous hinge",
        hingeCount: "continuous",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "Vestibule Door - Energy Code",
        description: "Vestibule door meeting energy code requirements",
        doorType: "single",
        doorMaterial: "insulated aluminum",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "2",
        frameType: "thermal break aluminum",
        frameMaterial: "6063-T6 thermal break",
        frameWidth: "4.5",
        frameDepth: "5.25",
        lockType: "mortise",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      // 3'0" Singles with Hardware Variations
      {
        name: "3'0\" × 7'0\" Single - Cylindrical Lock",
        description: "Standard commercial door with cylindrical lockset",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "cylindrical lock",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "surface mounted",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "3'0\" × 7'0\" Single - Exit Device",
        description: "Commercial door with panic exit hardware",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "exit trim",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "surface mounted",
        exitDevice: "rim panic bar",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "3'0\" × 7'0\" Single - Classroom Lock",
        description: "Classroom function mortise lock",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "classroom mortise",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      // 3'6" Singles with Hardware Variations
      {
        name: "3'6\" × 7'0\" Single - Mortise Lock",
        description: "42\" commercial door with mortise lock",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "42",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "mortise lock",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "3'6\" × 7'0\" Single - Cylindrical Lock",
        description: "42\" door with cylindrical lockset",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "42",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "cylindrical lock",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "surface mounted",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "3'6\" × 7'0\" Single - Exit Device",
        description: "42\" door with exit panic hardware",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "42",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "exit trim",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "surface mounted",
        exitDevice: "rim panic bar",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      // 4'0" Singles with Hardware Variations
      {
        name: "4'0\" × 7'0\" Single - Mortise Lock",
        description: "48\" wide commercial door with mortise lock",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "48",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "mortise lock",
        hingeType: "ball bearing heavy duty",
        hingeCount: "3",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "4'0\" × 7'0\" Single - Exit Device",
        description: "48\" door with panic exit hardware",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "48",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "exit trim",
        hingeType: "ball bearing heavy duty",
        hingeCount: "3",
        closerType: "overhead concealed",
        exitDevice: "rim panic bar",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      // 6'0" Pairs with Hardware Variations
      {
        name: "6'0\" × 7'0\" Pair - Cylindrical Lock",
        description: "Double door with cylindrical locks",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "72",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "14 ga steel",
        frameWidth: "6",
        frameDepth: "5.75",
        lockType: "cylindrical lock",
        hingeType: "ball bearing",
        hingeCount: "4",
        closerType: "surface mounted",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "6'0\" × 7'0\" Pair - Vertical Rod Exit",
        description: "Double door with vertical rod panic devices",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "72",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "14 ga steel",
        frameWidth: "6",
        frameDepth: "5.75",
        lockType: "exit trim",
        hingeType: "ball bearing",
        hingeCount: "4",
        closerType: "overhead concealed",
        exitDevice: "vertical rod panic",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      // 7'0" Pairs with Hardware Variations
      {
        name: "7'0\" × 7'0\" Pair - Mortise Lock",
        description: "84\" wide double door with mortise locks",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "84",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "14 ga steel",
        frameWidth: "6.5",
        frameDepth: "5.75",
        lockType: "mortise lock",
        hingeType: "heavy duty ball bearing",
        hingeCount: "4",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "7'0\" × 7'0\" Pair - Exit Devices",
        description: "84\" double door with panic exit hardware",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "84",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "14 ga steel",
        frameWidth: "6.5",
        frameDepth: "5.75",
        lockType: "exit trim",
        hingeType: "heavy duty ball bearing",
        hingeCount: "4",
        closerType: "overhead concealed",
        exitDevice: "rim panic bar",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "7'0\" × 8'0\" Pair - High Ceiling",
        description: "84\" wide × 96\" high double door",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "84",
        doorHeight: "96",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "14 ga steel",
        frameWidth: "6.5",
        frameDepth: "5.75",
        lockType: "mortise lock",
        hingeType: "heavy duty ball bearing",
        hingeCount: "5",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      // 8'0" Pairs with Hardware Variations
      {
        name: "8'0\" × 7'0\" Pair - Mortise Lock",
        description: "96\" wide double door with mortise locks",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "96",
        doorHeight: "84",
        doorThickness: "2",
        frameType: "hollow metal",
        frameMaterial: "12 ga steel",
        frameWidth: "7",
        frameDepth: "6",
        lockType: "mortise lock",
        hingeType: "heavy duty ball bearing",
        hingeCount: "4",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "8'0\" × 7'0\" Pair - Panic Hardware",
        description: "96\" double door with panic exit devices",
        doorType: "double",
        doorMaterial: "hollow metal",
        doorWidth: "96",
        doorHeight: "84",
        doorThickness: "2",
        frameType: "hollow metal",
        frameMaterial: "12 ga steel",
        frameWidth: "7",
        frameDepth: "6",
        lockType: "exit trim",
        hingeType: "heavy duty ball bearing",
        hingeCount: "4",
        closerType: "overhead concealed",
        exitDevice: "vertical rod panic",
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "yes",
        accessControlType: "card reader",
      },
      // Office Suites
      {
        name: "Office Suite Entry - Mortise",
        description: "Office suite entry with mortise lockset",
        doorType: "single",
        doorMaterial: "wood",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "wood",
        frameMaterial: "solid pine",
        frameWidth: "4.625",
        frameDepth: "5.25",
        lockType: "mortise lock",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "Office Suite Entry - Cylindrical",
        description: "Office suite entry with cylindrical lock",
        doorType: "single",
        doorMaterial: "wood",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "wood",
        frameMaterial: "solid pine",
        frameWidth: "4.625",
        frameDepth: "5.25",
        lockType: "cylindrical lock",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      // Storeroom & Service Doors
      {
        name: "Storeroom - Cylindrical Lock",
        description: "Storeroom function cylindrical lock",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "storeroom cylindrical",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "surface mounted",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "Storeroom - Mortise Lock",
        description: "Storeroom function mortise lock",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "storeroom mortise",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "surface mounted",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      // Toilet Rooms
      {
        name: "Toilet Room - Privacy Lock",
        description: "Restroom door with privacy function lock",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "privacy mortise",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "overhead hold open",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "Accessible Toilet Room - ADA",
        description: "ADA compliant restroom door with power assist",
        doorType: "single",
        doorMaterial: "hollow metal",
        doorWidth: "42",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "hollow metal",
        frameMaterial: "16 ga steel",
        frameWidth: "4.625",
        frameDepth: "5.75",
        lockType: "privacy mortise lever",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "low energy auto",
        exitDevice: null,
        automationRequired: "yes",
        automationType: "power assist",
        accessControlRequired: "no",
        accessControlType: null,
      },
      // Conference Rooms
      {
        name: "Conference Room - Passage Lock",
        description: "Conference room with passage function",
        doorType: "single",
        doorMaterial: "wood",
        doorWidth: "36",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "wood",
        frameMaterial: "solid pine",
        frameWidth: "4.625",
        frameDepth: "5.25",
        lockType: "passage mortise",
        hingeType: "ball bearing",
        hingeCount: "3",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
      {
        name: "Large Conference - Double Doors",
        description: "Large conference room double doors",
        doorType: "double",
        doorMaterial: "wood",
        doorWidth: "72",
        doorHeight: "84",
        doorThickness: "1.75",
        frameType: "wood",
        frameMaterial: "solid pine",
        frameWidth: "6",
        frameDepth: "5.25",
        lockType: "passage mortise",
        hingeType: "ball bearing",
        hingeCount: "4",
        closerType: "overhead concealed",
        exitDevice: null,
        automationRequired: "no",
        automationType: null,
        accessControlRequired: "no",
        accessControlType: null,
      },
    ];

    // Only seed if templates table is empty
    const existing = await db.select().from(doorTemplates).limit(1);
    if (existing.length === 0) {
      await db.insert(doorTemplates).values(templates);
    }
  }

  // User operations (IMPORTANT - mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  // Password authentication methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    // Case-insensitive email lookup
    const results = await db.select().from(users).where(sql`lower(${users.email}) = lower(${email})`);
    return results[0];
  }

  async setUserPassword(userId: string, password: string): Promise<void> {
    const bcrypt = await import("bcryptjs");
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async verifyUserPassword(email: string, password: string): Promise<User | null> {
    const bcrypt = await import("bcryptjs");
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return null;
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async createUserWithPassword(email: string, password: string, firstName?: string, lastName?: string): Promise<User> {
    const bcrypt = await import("bcryptjs");
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
    }).returning();
    
    return user;
  }

  // Password reset token methods
  async createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
    
    // Invalidate any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    
    // Create new token
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });
    
    return { token, expiresAt };
  }

  async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; usedAt: Date | null } | null> {
    const results = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    if (results.length === 0) {
      return null;
    }
    const record = results[0];
    return {
      userId: record.userId,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
    };
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async cleanupExpiredPasswordResetTokens(): Promise<number> {
    const result = await db.delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));
    return result.rowCount || 0;
  }

  // ============================================================================
  // ACCOUNT LOCKOUT METHODS
  // ============================================================================
  
  // Configuration constants
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 15;
  private static readonly ATTEMPT_RESET_MINUTES = 15; // Reset counter after this many minutes of no failed attempts
  
  async incrementFailedLoginAttempts(userId: string): Promise<{ attempts: number; lockedUntil: Date | null }> {
    const now = new Date();
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // If last failed attempt was more than ATTEMPT_RESET_MINUTES ago, reset the counter
    const lastFailedAt = user.lastFailedLoginAt;
    const shouldResetCounter = lastFailedAt && 
      (now.getTime() - new Date(lastFailedAt).getTime()) > (DatabaseStorage.ATTEMPT_RESET_MINUTES * 60 * 1000);
    
    const newAttempts = shouldResetCounter ? 1 : (user.failedLoginAttempts || 0) + 1;
    let lockedUntil: Date | null = null;
    
    // Lock account if max attempts reached
    if (newAttempts >= DatabaseStorage.MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(now.getTime() + DatabaseStorage.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }
    
    await db.update(users)
      .set({
        failedLoginAttempts: newAttempts,
        lastFailedLoginAt: now,
        lockoutUntil: lockedUntil,
      })
      .where(eq(users.id, userId));
    
    logger.warn("Failed login attempt recorded", { 
      userId, 
      attempts: newAttempts, 
      lockedUntil: lockedUntil?.toISOString(),
      maxAttempts: DatabaseStorage.MAX_FAILED_ATTEMPTS 
    });
    
    return { attempts: newAttempts, lockedUntil };
  }
  
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await db.update(users)
      .set({
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
      })
      .where(eq(users.id, userId));
    
    logger.info("Failed login attempts reset", { userId });
  }
  
  async isAccountLocked(userId: string): Promise<{ locked: boolean; lockedUntil: Date | null; remainingAttempts: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { locked: false, lockedUntil: null, remainingAttempts: DatabaseStorage.MAX_FAILED_ATTEMPTS };
    }
    
    const now = new Date();
    const lockoutUntil = user.lockoutUntil ? new Date(user.lockoutUntil) : null;
    
    // Check if lockout has expired
    if (lockoutUntil && lockoutUntil <= now) {
      // Lockout expired, reset the counter
      await this.resetFailedLoginAttempts(userId);
      return { locked: false, lockedUntil: null, remainingAttempts: DatabaseStorage.MAX_FAILED_ATTEMPTS };
    }
    
    const locked = lockoutUntil !== null && lockoutUntil > now;
    const remainingAttempts = Math.max(0, DatabaseStorage.MAX_FAILED_ATTEMPTS - (user.failedLoginAttempts || 0));
    
    return { locked, lockedUntil: lockoutUntil, remainingAttempts };
  }

  // ============================================================================
  // EMAIL VERIFICATION METHODS
  // ============================================================================
  
  private static readonly EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
  
  async createEmailVerificationToken(userId: string, email: string): Promise<{ token: string; expiresAt: Date }> {
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + DatabaseStorage.EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Invalidate any existing verification tokens for this user
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
    
    // Create new token
    await db.insert(emailVerificationTokens).values({
      userId,
      token,
      email,
      expiresAt,
    });
    
    // Also store the token on the user record for quick lookup
    await db.update(users)
      .set({
        emailVerificationToken: token,
      })
      .where(eq(users.id, userId));
    
    logger.info("Email verification token created", { userId, email, expiresAt: expiresAt.toISOString() });
    
    return { token, expiresAt };
  }
  
  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
    const results = await db.select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    
    if (results.length === 0) {
      return null;
    }
    
    return results[0];
  }
  
  async markEmailVerified(userId: string, token: string): Promise<void> {
    const now = new Date();
    
    // Update the verification token record
    await db.update(emailVerificationTokens)
      .set({ verifiedAt: now })
      .where(eq(emailVerificationTokens.token, token));
    
    // Update user's email verified status
    await db.update(users)
      .set({
        emailVerifiedAt: now,
        emailVerificationToken: null,
      })
      .where(eq(users.id, userId));
    
    logger.info("Email verified successfully", { userId });
  }
  
  async resendEmailVerification(userId: string): Promise<{ token: string; expiresAt: Date } | null> {
    const user = await this.getUser(userId);
    if (!user || !user.email) {
      return null;
    }
    
    // Don't resend if already verified
    if (user.emailVerifiedAt) {
      return null;
    }
    
    return this.createEmailVerificationToken(userId, user.email);
  }

  // ============================================================================
  // USER SESSION MANAGEMENT METHODS
  // ============================================================================
  
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [created] = await db.insert(userSessions).values(session).returning();
    logger.info("User session created", { 
      userId: session.userId, 
      sessionId: session.sessionId,
      deviceType: session.deviceType,
      rememberMe: session.rememberMe 
    });
    return created;
  }
  
  async getUserSessions(userId: string): Promise<UserSession[]> {
    const now = new Date();
    // Return only active (non-expired) sessions, ordered by most recent activity
    return db.select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        gt(userSessions.expiresAt, now)
      ))
      .orderBy(desc(userSessions.lastActiveAt));
  }
  
  async updateSessionActivity(sessionId: string): Promise<void> {
    await db.update(userSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }
  
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    // Delete the session tracking record
    const result = await db.delete(userSessions)
      .where(and(
        eq(userSessions.sessionId, sessionId),
        eq(userSessions.userId, userId)
      ));
    
    // Also delete from the main sessions table if it exists
    await db.execute(sql`DELETE FROM sessions WHERE sid = ${sessionId}`);
    
    logger.info("Session revoked", { userId, sessionId });
    return (result.rowCount || 0) > 0;
  }
  
  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    // Get all session IDs for this user
    const userSessionList = await db.select({ sessionId: userSessions.sessionId })
      .from(userSessions)
      .where(exceptSessionId 
        ? and(eq(userSessions.userId, userId), ne(userSessions.sessionId, exceptSessionId))
        : eq(userSessions.userId, userId)
      );
    
    // Delete from userSessions
    const deleteResult = await db.delete(userSessions)
      .where(exceptSessionId 
        ? and(eq(userSessions.userId, userId), ne(userSessions.sessionId, exceptSessionId))
        : eq(userSessions.userId, userId)
      );
    
    // Delete from main sessions table
    for (const session of userSessionList) {
      await db.execute(sql`DELETE FROM sessions WHERE sid = ${session.sessionId}`);
    }
    
    const count = deleteResult.rowCount || 0;
    logger.info("All sessions revoked", { userId, count, exceptSessionId });
    return count;
  }
  
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await db.delete(userSessions)
      .where(lt(userSessions.expiresAt, now));
    return result.rowCount || 0;
  }

  async getUserByLinkedProvider(providerLink: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(
      sql`${providerLink} = ANY(${users.linkedProviders})`
    );
    return results[0];
  }

  async linkOAuthProvider(userId: string, provider: string, providerUserId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const existingProviders = (user.linkedProviders as string[]) || [];
    
    const providerLink = `${provider}:${providerUserId}`;
    
    if (!existingProviders.includes(providerLink)) {
      existingProviders.push(providerLink);
      
      await db.update(users)
        .set({
          linkedProviders: existingProviders,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      
      logger.info("OAuth provider linked to existing account", {
        userId,
        provider,
        providerUserId,
      });
    }
  }

  async getUserPrimaryMembership(userId: string): Promise<Membership | undefined> {
    // Priority 1: Look for membership to a master account organization
    // This ensures beta testers with master accounts always use their master org
    const masterMembership = await db
      .select({ membership: memberships })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(
        and(
          eq(memberships.userId, userId),
          or(
            eq(organizations.isMasterAccount, 'yes'),
            eq(organizations.subscriptionTier, 'master')
          )
        )
      )
      .orderBy(asc(memberships.createdAt))
      .limit(1);
    
    if (masterMembership.length > 0) {
      return masterMembership[0].membership;
    }
    
    // Priority 2: Fall back to oldest membership (original behavior)
    const results = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .orderBy(asc(memberships.createdAt))
      .limit(1);
    return results[0];
  }

  // Organization operations
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const results = await db.select().from(organizations).where(eq(organizations.id, id));
    return results[0];
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations)
      .where(eq(organizations.slug, slug)).limit(1);
    return organization;
  }

  // Membership operations
  async createMembership(membership: InsertMembership): Promise<Membership> {
    const [created] = await db.insert(memberships).values(membership).returning();
    return created;
  }

  async getUserMemberships(userId: string): Promise<Membership[]> {
    return await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId));
  }

  async getOrganizationMemberships(organizationId: string): Promise<Membership[]> {
    return await db
      .select()
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId));
  }

  async getOrganizationMembers(organizationId: string) {
    const results = await db
      .select({
        membership: memberships,
        user: users,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.organizationId, organizationId));
    
    return results.map(r => ({
      ...r.membership,
      user: {
        id: r.user.id,
        email: r.user.email,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        profileImageUrl: r.user.profileImageUrl,
      },
    }));
  }

  async getMembership(membershipId: string): Promise<Membership | undefined> {
    const results = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membershipId));
    return results[0];
  }

  async updateMembershipRole(membershipId: string, role: string): Promise<Membership> {
    const [updated] = await db
      .update(memberships)
      .set({ role })
      .where(eq(memberships.id, membershipId))
      .returning();
    return updated;
  }

  async deleteMembership(membershipId: string): Promise<boolean> {
    const result = await db
      .delete(memberships)
      .where(eq(memberships.id, membershipId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updateOrganization(id: string, update: Partial<InsertOrganization>): Promise<Organization> {
    const [updated] = await db
      .update(organizations)
      .set(update)
      .where(eq(organizations.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Organization ${id} not found`);
    }
    return updated;
  }

  async getRolePermissions(organizationId: string): Promise<Record<string, string[]> | null> {
    const [org] = await db
      .select({ rolePermissions: organizations.rolePermissions })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    
    if (!org) {
      return null;
    }
    
    return org.rolePermissions as Record<string, string[]> | null;
  }

  async saveRolePermissions(organizationId: string, permissions: Record<string, string[]>): Promise<void> {
    await db
      .update(organizations)
      .set({ 
        rolePermissions: permissions,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId));
  }

  async resetRolePermissions(organizationId: string, role?: string): Promise<void> {
    if (role) {
      const [org] = await db
        .select({ rolePermissions: organizations.rolePermissions })
        .from(organizations)
        .where(eq(organizations.id, organizationId));
      
      if (org?.rolePermissions) {
        const permissions = org.rolePermissions as Record<string, string[]>;
        delete permissions[role];
        
        const updatedPermissions = Object.keys(permissions).length > 0 ? permissions : null;
        
        await db
          .update(organizations)
          .set({ 
            rolePermissions: updatedPermissions,
            updatedAt: new Date()
          })
          .where(eq(organizations.id, organizationId));
      }
    } else {
      await db
        .update(organizations)
        .set({ 
          rolePermissions: null,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, organizationId));
    }
  }

  // Notification Preferences
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    return await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  async upsertNotificationPreference(
    userId: string,
    channel: string,
    eventType: string,
    isEnabled: string,
    settings?: object
  ): Promise<NotificationPreference> {
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.channel, channel),
          eq(notificationPreferences.eventType, eventType)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({
          isEnabled,
          settings,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(notificationPreferences)
        .values({
          userId,
          channel,
          eventType,
          isEnabled,
          settings,
        })
        .returning();
      return inserted;
    }
  }

  // Projects (organization-scoped)
  async getProjects(organizationId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, organizationId));
  }

  async getProject(id: string, organizationId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.organizationId, organizationId)));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const { organizationId } = insertProject;
    if (!organizationId) {
      throw new Error("Organization ID is required to create a project");
    }
    const [project] = await db.insert(projects).values({ ...insertProject, organizationId }).returning();
    return project;
  }

  async updateProject(id: string, organizationId: string, update: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...update, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ============================================================================
  // PROJECT SNAPSHOT HELPERS - Consolidated duplication/versioning logic
  // ============================================================================

  private extractProjectCopyableFields(project: Project): Omit<InsertProject, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: project.name,
      location: project.location,
      buildingType: project.buildingType,
      status: project.status,
      applicableStandards: project.applicableStandards,
      customerId: project.customerId,
      locationId: project.locationId,
      quoteType: project.quoteType,
      notes: project.notes,
      scopeOfWork: project.scopeOfWork,
      scopePowerByOthers: project.scopePowerByOthers,
      scopeDemolitionByOthers: project.scopeDemolitionByOthers,
      scopePatchingByOthers: project.scopePatchingByOthers,
      scopePaintingByOthers: project.scopePaintingByOthers,
      scopeAsbestosAbatementByOthers: project.scopeAsbestosAbatementByOthers,
      scopeStructuralWorkByOthers: project.scopeStructuralWorkByOthers,
      scopeFireAlarmByOthers: project.scopeFireAlarmByOthers,
      scopeAccessControlByOthers: project.scopeAccessControlByOthers,
      scopeItemsToRemain: project.scopeItemsToRemain,
      scopeItemsToRemove: project.scopeItemsToRemove,
      scopeAdditionalDisclaimers: project.scopeAdditionalDisclaimers,
      organizationId: project.organizationId,
    };
  }

  private async getProjectSnapshot(projectId: string): Promise<{
    project: Project;
    openings: Array<{
      opening: DoorOpening;
      hardware: HardwareItem[];
      photos: Photo[];
    }>;
  }> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
      throw new Error("Project not found");
    }

    const openings = await this.getOpeningsByProject(projectId);
    const openingsWithDetails = await Promise.all(
      openings.map(async (opening) => ({
        opening,
        hardware: await this.getHardwareItemsByOpening(opening.id),
        photos: await this.getPhotosByOpening(opening.id),
      }))
    );

    return { project, openings: openingsWithDetails };
  }

  private async duplicateOpeningWithHardware(
    opening: DoorOpening, 
    newProjectId: string
  ): Promise<DoorOpening> {
    const { id: _openingId, ...openingData } = opening;
    const newOpening = await this.createOpening({
      ...openingData,
      projectId: newProjectId,
    } as InsertDoorOpening);

    const originalHardware = await this.getHardwareItemsByOpening(opening.id);
    for (const hardware of originalHardware) {
      const { id: _hardwareId, createdAt: _createdAt, ...hardwareData } = hardware;
      await this.createHardwareItem({
        ...hardwareData as Omit<InsertHardwareItem, 'openingId'>,
        openingId: newOpening.id,
      });
    }

    return newOpening;
  }

  private async restoreOpeningsFromSnapshot(
    projectId: string,
    openingsData: Array<{ opening: any; hardware: any[] }>
  ): Promise<void> {
    for (const data of openingsData) {
      const newOpening = await this.createOpening({
        projectId,
        ...data.opening,
        id: undefined,
      } as InsertDoorOpening);

      for (const hardware of data.hardware) {
        await this.createHardwareItem({
          openingId: newOpening.id,
          ...hardware,
          id: undefined,
        } as InsertHardwareItem);
      }
    }
  }

  // ============================================================================
  // PROJECT DUPLICATION & VERSIONING
  // ============================================================================

  async duplicateProject(
    id: string, 
    organizationId: string,
    options: { customerId?: string; name: string; quoteType?: string }
  ): Promise<Project> {
    const original = await this.getProject(id, organizationId);
    if (!original) {
      throw new Error("Source project not found");
    }

    const copyableFields = this.extractProjectCopyableFields(original);
    const duplicateData: InsertProject = {
      ...copyableFields,
      name: options.name,
      status: "draft",
      customerId: options.customerId || original.customerId,
      locationId: options.customerId ? null : original.locationId,
      quoteType: options.quoteType || original.quoteType,
    };

    const newProject = await this.createProject(duplicateData);

    const originalOpenings = await this.getOpeningsByProject(id);
    for (const opening of originalOpenings) {
      await this.duplicateOpeningWithHardware(opening, newProject.id);
    }

    return newProject;
  }

  async createProjectVersion(
    projectId: string, 
    versionName: string, 
    userId: string
  ): Promise<ProjectVersion> {
    const snapshot = await this.getProjectSnapshot(projectId);

    const existingVersions = await db.select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId))
      .orderBy(desc(projectVersions.versionNumber));

    const nextVersionNumber = existingVersions.length > 0 
      ? existingVersions[0].versionNumber + 1 
      : 1;

    const [version] = await db.insert(projectVersions).values({
      projectId,
      versionNumber: nextVersionNumber,
      versionName,
      snapshotData: snapshot as any,
      createdBy: userId,
    }).returning();

    return version;
  }

  async getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    return await db.select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId))
      .orderBy(desc(projectVersions.versionNumber));
  }

  async restoreProjectVersion(projectId: string, versionId: string): Promise<void> {
    const [version] = await db.select()
      .from(projectVersions)
      .where(eq(projectVersions.id, versionId))
      .limit(1);

    if (!version) {
      throw new Error("Version not found");
    }

    const snapshot = version.snapshotData as any;
    const organizationId = snapshot.project.organizationId;

    const currentOpenings = await this.getOpeningsByProject(projectId);
    for (const opening of currentOpenings) {
      await this.deleteOpening(opening.id, organizationId);
    }

    const copyableFields = this.extractProjectCopyableFields(snapshot.project);
    await db.update(projects)
      .set({ ...copyableFields, updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    await this.restoreOpeningsFromSnapshot(projectId, snapshot.openings);
  }

  // Door Openings
  async getOpenings(): Promise<DoorOpening[]> {
    return await db.select().from(doorOpenings);
  }

  async getOpeningsByOrganization(organizationId: string): Promise<DoorOpening[]> {
    const orgProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, organizationId));
    const projectIds = orgProjects.map(p => p.id);
    if (projectIds.length === 0) return [];
    return await db.select().from(doorOpenings).where(inArray(doorOpenings.projectId, projectIds));
  }

  async getOpening(id: string): Promise<DoorOpening | undefined> {
    const [opening] = await db.select().from(doorOpenings).where(eq(doorOpenings.id, id));
    return opening || undefined;
  }

  async getOpeningsByProject(projectId: string): Promise<DoorOpening[]> {
    return await db.select().from(doorOpenings).where(eq(doorOpenings.projectId, projectId));
  }

  async createOpening(insertOpening: InsertDoorOpening): Promise<DoorOpening> {
    const [opening] = await db.insert(doorOpenings).values(insertOpening).returning();
    return opening;
  }

  async updateOpening(id: string, organizationId: string, update: Partial<InsertDoorOpening>): Promise<DoorOpening | undefined> {
    // Security: Verify opening belongs to organization via project relationship
    const [existing] = await db
      .select({ id: doorOpenings.id })
      .from(doorOpenings)
      .innerJoin(projects, eq(doorOpenings.projectId, projects.id))
      .where(and(eq(doorOpenings.id, id), eq(projects.organizationId, organizationId)))
      .limit(1);
    
    if (!existing) return undefined;

    const [updated] = await db
      .update(doorOpenings)
      .set(update)
      .where(eq(doorOpenings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOpening(id: string, organizationId: string): Promise<boolean> {
    // Security: Verify opening belongs to organization via project relationship
    const [existing] = await db
      .select({ id: doorOpenings.id })
      .from(doorOpenings)
      .innerJoin(projects, eq(doorOpenings.projectId, projects.id))
      .where(and(eq(doorOpenings.id, id), eq(projects.organizationId, organizationId)))
      .limit(1);
    
    if (!existing) return false;

    const result = await db.delete(doorOpenings).where(eq(doorOpenings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async duplicateOpening(id: string): Promise<DoorOpening | undefined> {
    const original = await this.getOpening(id);
    if (!original) return undefined;

    const projectOpenings = await this.getOpeningsByProject(original.projectId);
    const baseName = original.openingNumber;
    let copyNumber = 1;
    let newName = `${baseName} Copy`;
    
    const existingCopyNames = projectOpenings
      .map(o => o.openingNumber)
      .filter(name => name.startsWith(`${baseName} Copy`));
    
    while (existingCopyNames.includes(newName)) {
      copyNumber++;
      newName = `${baseName} Copy ${copyNumber}`;
    }

    const { id: _, createdAt: __, ...originalData } = original;
    
    const duplicateData: InsertDoorOpening = {
      ...originalData,
      openingNumber: newName,
    };

    return await this.createOpening(duplicateData);
  }

  async getOpeningsByIds(ids: string[], organizationId: string): Promise<DoorOpening[]> {
    if (ids.length === 0) return [];
    // Join through projects to enforce org scoping
    const orgProjects = await db.select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));
    const projectIds = orgProjects.map(p => p.id);
    if (projectIds.length === 0) return [];
    return await db.select().from(doorOpenings)
      .where(and(inArray(doorOpenings.id, ids), inArray(doorOpenings.projectId, projectIds)));
  }

  // Service History
  async getServiceHistory(openingId: string, organizationId: string): Promise<ServiceHistory[]> {
    // Security: Verify opening belongs to organization via project relationship
    const result = await db
      .select({
        serviceHistory: serviceHistory,
      })
      .from(serviceHistory)
      .innerJoin(doorOpenings, eq(serviceHistory.openingId, doorOpenings.id))
      .innerJoin(projects, eq(doorOpenings.projectId, projects.id))
      .where(and(
        eq(serviceHistory.openingId, openingId),
        eq(projects.organizationId, organizationId)
      ))
      .orderBy(desc(serviceHistory.serviceDate));
    
    return result.map(r => r.serviceHistory);
  }

  async getServiceHistoryById(id: string, organizationId: string): Promise<ServiceHistory | undefined> {
    const result = await db
      .select({
        serviceHistory: serviceHistory,
      })
      .from(serviceHistory)
      .where(and(
        eq(serviceHistory.id, id),
        eq(serviceHistory.organizationId, organizationId)
      ))
      .limit(1);
    
    return result[0]?.serviceHistory || undefined;
  }

  async createServiceHistory(history: InsertServiceHistory): Promise<ServiceHistory> {
    const [created] = await db.insert(serviceHistory).values(history).returning();
    return created;
  }

  async updateServiceHistory(id: string, organizationId: string, updates: Partial<InsertServiceHistory>): Promise<ServiceHistory | undefined> {
    // Security: Verify service history belongs to organization
    const existing = await this.getServiceHistoryById(id, organizationId);
    if (!existing) return undefined;

    const [updated] = await db
      .update(serviceHistory)
      .set(updates)
      .where(eq(serviceHistory.id, id))
      .returning();
    
    return updated || undefined;
  }

  async deleteServiceHistory(id: string, organizationId: string): Promise<boolean> {
    // Security: Verify service history belongs to organization
    const existing = await this.getServiceHistoryById(id, organizationId);
    if (!existing) return false;

    const result = await db.delete(serviceHistory).where(eq(serviceHistory.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Photos
  async getPhotos(): Promise<Photo[]> {
    return await db.select().from(photos);
  }

  async getPhotosByOrganization(organizationId: string): Promise<Photo[]> {
    const orgProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, organizationId));
    const projectIds = orgProjects.map(p => p.id);
    if (projectIds.length === 0) return [];

    const projectOpenings = await db.select({ id: doorOpenings.id }).from(doorOpenings).where(inArray(doorOpenings.projectId, projectIds));
    const openingIds = projectOpenings.map(o => o.id);
    if (openingIds.length === 0) return [];

    return await db.select().from(photos).where(inArray(photos.openingId, openingIds));
  }

  async getPhoto(id: string): Promise<Photo | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    return photo || undefined;
  }

  async getPhotosByOpening(openingId: string): Promise<Photo[]> {
    return await db.select().from(photos).where(eq(photos.openingId, openingId));
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const [photo] = await db.insert(photos).values(insertPhoto).returning();
    return photo;
  }

  async updatePhoto(id: string, update: Partial<InsertPhoto>): Promise<Photo | undefined> {
    const [updated] = await db
      .update(photos)
      .set(update)
      .where(eq(photos.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePhoto(id: string): Promise<boolean> {
    const result = await db.delete(photos).where(eq(photos.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Calibration Profiles
  async getCalibrationProfiles(organizationId: string): Promise<CalibrationProfile[]> {
    return await db.select().from(calibrationProfiles).where(eq(calibrationProfiles.organizationId, organizationId));
  }

  async getCalibrationProfile(id: string): Promise<CalibrationProfile | undefined> {
    const [profile] = await db.select().from(calibrationProfiles).where(eq(calibrationProfiles.id, id));
    return profile || undefined;
  }

  async createCalibrationProfile(profile: InsertCalibrationProfile): Promise<CalibrationProfile> {
    const [created] = await db.insert(calibrationProfiles).values(profile).returning();
    return created;
  }

  async updateCalibrationProfile(id: string, update: Partial<InsertCalibrationProfile>): Promise<CalibrationProfile | undefined> {
    const [updated] = await db
      .update(calibrationProfiles)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(calibrationProfiles.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCalibrationProfile(id: string): Promise<boolean> {
    const result = await db.delete(calibrationProfiles).where(eq(calibrationProfiles.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // LiDAR Scans
  async getLidarScans(): Promise<LidarScan[]> {
    return await db.select().from(lidarScans);
  }

  async getLidarScan(id: string): Promise<LidarScan | undefined> {
    const [scan] = await db.select().from(lidarScans).where(eq(lidarScans.id, id));
    return scan || undefined;
  }

  async getLidarScansByOpening(openingId: string): Promise<LidarScan[]> {
    return await db.select().from(lidarScans).where(eq(lidarScans.openingId, openingId));
  }

  async createLidarScan(insertScan: InsertLidarScan): Promise<LidarScan> {
    const [scan] = await db.insert(lidarScans).values(insertScan).returning();
    return scan;
  }

  async updateLidarScan(id: string, update: Partial<InsertLidarScan>): Promise<LidarScan | undefined> {
    const [updated] = await db
      .update(lidarScans)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(lidarScans.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLidarScan(id: string): Promise<boolean> {
    const result = await db.delete(lidarScans).where(eq(lidarScans.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Scan Photos
  async getScanPhotosByScan(scanId: string): Promise<ScanPhoto[]> {
    return await db.select().from(scanPhotos).where(eq(scanPhotos.scanId, scanId));
  }

  async getScanPhotosByOpening(openingId: string): Promise<ScanPhoto[]> {
    return await db.select().from(scanPhotos).where(eq(scanPhotos.openingId, openingId));
  }

  async createScanPhoto(photo: InsertScanPhoto): Promise<ScanPhoto> {
    const [created] = await db.insert(scanPhotos).values(photo).returning();
    return created;
  }

  async deleteScanPhoto(id: string): Promise<boolean> {
    const result = await db.delete(scanPhotos).where(eq(scanPhotos.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Detection Overrides (organization-scoped learning system)
  async createDetectionOverride(override: InsertDetectionOverride): Promise<DetectionOverride> {
    const [created] = await db.insert(detectionOverrides).values(override).returning();
    return created;
  }

  async getDetectionOverridesByOpening(openingId: string): Promise<DetectionOverride[]> {
    return await db.select().from(detectionOverrides).where(eq(detectionOverrides.openingId, openingId));
  }

  async getDetectionOverridesByOrg(organizationId: string, fieldPath?: string): Promise<DetectionOverride[]> {
    if (fieldPath) {
      return await db.select().from(detectionOverrides).where(
        and(eq(detectionOverrides.organizationId, organizationId), eq(detectionOverrides.fieldPath, fieldPath))
      );
    }
    return await db.select().from(detectionOverrides).where(eq(detectionOverrides.organizationId, organizationId));
  }

  // Hardware Scans (organization-scoped)
  async getHardwareScans(organizationId: string): Promise<HardwareScan[]> {
    return await db.select().from(hardwareScans).where(eq(hardwareScans.organizationId, organizationId));
  }

  async getHardwareScan(id: string, organizationId: string): Promise<HardwareScan | undefined> {
    const [scan] = await db
      .select()
      .from(hardwareScans)
      .where(and(eq(hardwareScans.id, id), eq(hardwareScans.organizationId, organizationId)));
    return scan || undefined;
  }

  async getHardwareScansByOpening(openingId: string, organizationId: string): Promise<HardwareScan[]> {
    return await db
      .select()
      .from(hardwareScans)
      .where(and(eq(hardwareScans.openingId, openingId), eq(hardwareScans.organizationId, organizationId)));
  }

  async createHardwareScan(insertScan: InsertHardwareScan): Promise<HardwareScan> {
    const [scan] = await db.insert(hardwareScans).values(insertScan).returning();
    return scan;
  }

  async deleteHardwareScan(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(hardwareScans)
      .where(and(eq(hardwareScans.id, id), eq(hardwareScans.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // AR Measurements
  async getArMeasurements(organizationId: string): Promise<ArMeasurement[]> {
    return await db
      .select()
      .from(arMeasurements)
      .where(eq(arMeasurements.organizationId, organizationId))
      .orderBy(desc(arMeasurements.measuredAt));
  }

  async getArMeasurement(id: string, organizationId: string): Promise<ArMeasurement | undefined> {
    const [measurement] = await db
      .select()
      .from(arMeasurements)
      .where(and(eq(arMeasurements.id, id), eq(arMeasurements.organizationId, organizationId)));
    return measurement || undefined;
  }

  async getArMeasurementsByOpening(openingId: string, organizationId: string): Promise<ArMeasurement[]> {
    return await db
      .select()
      .from(arMeasurements)
      .where(and(
        eq(arMeasurements.openingId, openingId),
        eq(arMeasurements.organizationId, organizationId)
      ))
      .orderBy(desc(arMeasurements.measuredAt));
  }

  async createArMeasurement(insertMeasurement: InsertArMeasurement): Promise<ArMeasurement> {
    const [measurement] = await db.insert(arMeasurements).values(insertMeasurement).returning();
    return measurement;
  }

  async deleteArMeasurement(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(arMeasurements)
      .where(and(eq(arMeasurements.id, id), eq(arMeasurements.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Guided Scan System
  async getScanConfig(organizationId: string): Promise<ScanConfig | undefined> {
    const [config] = await db
      .select()
      .from(scanConfigs)
      .where(eq(scanConfigs.organizationId, organizationId));
    return config;
  }

  async upsertScanConfig(config: InsertScanConfig & { organizationId: string }): Promise<ScanConfig> {
    const existing = await this.getScanConfig(config.organizationId);
    
    if (existing) {
      const [updated] = await db
        .update(scanConfigs)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(scanConfigs.organizationId, config.organizationId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(scanConfigs)
        .values(config)
        .returning();
      return created;
    }
  }

  async createScanMetric(metric: InsertScanMetric & { organizationId: string, userId: string }): Promise<ScanMetric> {
    const [newMetric] = await db
      .insert(scanMetrics)
      .values(metric)
      .returning();
    return newMetric;
  }

  // PDF Catalog Imports
  async getPdfCatalogImports(organizationId: string): Promise<PdfCatalogImport[]> {
    return await db
      .select()
      .from(pdfCatalogImports)
      .where(eq(pdfCatalogImports.organizationId, organizationId))
      .orderBy(desc(pdfCatalogImports.createdAt));
  }

  async getPdfCatalogImport(id: string, organizationId: string): Promise<PdfCatalogImport | undefined> {
    const [importRecord] = await db
      .select()
      .from(pdfCatalogImports)
      .where(and(eq(pdfCatalogImports.id, id), eq(pdfCatalogImports.organizationId, organizationId)));
    return importRecord || undefined;
  }

  async createPdfCatalogImport(insertImport: InsertPdfCatalogImport): Promise<PdfCatalogImport> {
    const [importRecord] = await db.insert(pdfCatalogImports).values(insertImport).returning();
    return importRecord;
  }

  async updatePdfCatalogImport(id: string, organizationId: string, updates: Partial<InsertPdfCatalogImport>): Promise<PdfCatalogImport | undefined> {
    const [importRecord] = await db
      .update(pdfCatalogImports)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(pdfCatalogImports.id, id), eq(pdfCatalogImports.organizationId, organizationId)))
      .returning();
    return importRecord || undefined;
  }

  async deletePdfCatalogImport(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(pdfCatalogImports)
      .where(and(eq(pdfCatalogImports.id, id), eq(pdfCatalogImports.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Hardware Items
  async getHardwareItems(): Promise<HardwareItem[]> {
    return await db.select().from(hardwareItems);
  }

  async getHardwareItemsByOrganization(organizationId: string): Promise<HardwareItem[]> {
    const orgProjects = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.organizationId, organizationId));
    const projectIds = orgProjects.map(p => p.id);
    if (projectIds.length === 0) return [];
    const orgOpenings = await db.select({ id: doorOpenings.id }).from(doorOpenings)
      .where(inArray(doorOpenings.projectId, projectIds));
    const openingIds = orgOpenings.map(o => o.id);
    if (openingIds.length === 0) return [];
    return await db.select().from(hardwareItems).where(inArray(hardwareItems.openingId, openingIds));
  }

  async getHardwareItem(id: string): Promise<HardwareItem | undefined> {
    const [item] = await db.select().from(hardwareItems).where(eq(hardwareItems.id, id));
    return item || undefined;
  }

  async getHardwareItemsByOpening(openingId: string): Promise<HardwareItem[]> {
    return await db.select().from(hardwareItems).where(eq(hardwareItems.openingId, openingId));
  }

  async createHardwareItem(insertItem: InsertHardwareItem): Promise<HardwareItem> {
    const [item] = await db.insert(hardwareItems).values(insertItem).returning();
    return item;
  }

  async updateHardwareItem(id: string, organizationId: string, update: Partial<InsertHardwareItem>): Promise<HardwareItem | undefined> {
    // Security: Verify hardware belongs to organization via opening -> project relationship
    const [existing] = await db
      .select({ id: hardwareItems.id })
      .from(hardwareItems)
      .innerJoin(doorOpenings, eq(hardwareItems.openingId, doorOpenings.id))
      .innerJoin(projects, eq(doorOpenings.projectId, projects.id))
      .where(and(eq(hardwareItems.id, id), eq(projects.organizationId, organizationId)))
      .limit(1);
    
    if (!existing) return undefined;

    const [updated] = await db
      .update(hardwareItems)
      .set(update)
      .where(eq(hardwareItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteHardwareItem(id: string, organizationId: string): Promise<boolean> {
    // Security: Verify hardware belongs to organization via opening -> project relationship
    const [existing] = await db
      .select({ id: hardwareItems.id })
      .from(hardwareItems)
      .innerJoin(doorOpenings, eq(hardwareItems.openingId, doorOpenings.id))
      .innerJoin(projects, eq(doorOpenings.projectId, projects.id))
      .where(and(eq(hardwareItems.id, id), eq(projects.organizationId, organizationId)))
      .limit(1);
    
    if (!existing) return false;

    const result = await db.delete(hardwareItems).where(eq(hardwareItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Additional Door Items (organization-scoped)
  async getAdditionalDoorItems(openingId: string, organizationId: string): Promise<AdditionalDoorItem[]> {
    return await db
      .select()
      .from(additionalDoorItems)
      .where(and(
        eq(additionalDoorItems.openingId, openingId),
        eq(additionalDoorItems.organizationId, organizationId)
      ))
      .orderBy(additionalDoorItems.createdAt);
  }

  async getAdditionalDoorItem(id: string, organizationId: string): Promise<AdditionalDoorItem | undefined> {
    const [item] = await db
      .select()
      .from(additionalDoorItems)
      .where(and(
        eq(additionalDoorItems.id, id),
        eq(additionalDoorItems.organizationId, organizationId)
      ))
      .limit(1);
    return item;
  }

  async createAdditionalDoorItem(insertItem: InsertAdditionalDoorItem): Promise<AdditionalDoorItem> {
    const [item] = await db.insert(additionalDoorItems).values(insertItem).returning();
    return item;
  }

  async updateAdditionalDoorItem(id: string, organizationId: string, update: UpdateAdditionalDoorItem): Promise<AdditionalDoorItem | undefined> {
    // Security: Verify item belongs to organization
    const existing = await this.getAdditionalDoorItem(id, organizationId);
    if (!existing) return undefined;

    // Update only allowed fields (UpdateAdditionalDoorItem excludes id, organizationId, openingId, timestamps)
    const [updated] = await db
      .update(additionalDoorItems)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(additionalDoorItems.id, id))
      .returning();
    return updated;
  }

  async deleteAdditionalDoorItem(id: string, organizationId: string): Promise<boolean> {
    // Security: Verify item belongs to organization
    const existing = await this.getAdditionalDoorItem(id, organizationId);
    if (!existing) return false;

    const result = await db.delete(additionalDoorItems).where(eq(additionalDoorItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Hardware Bundles (organization-scoped)
  async getHardwareBundles(organizationId: string): Promise<HardwareBundle[]> {
    return await db
      .select()
      .from(hardwareBundles)
      .where(eq(hardwareBundles.organizationId, organizationId));
  }

  async getHardwareBundle(id: string, organizationId: string): Promise<HardwareBundle | undefined> {
    const [bundle] = await db
      .select()
      .from(hardwareBundles)
      .where(and(eq(hardwareBundles.id, id), eq(hardwareBundles.organizationId, organizationId)));
    return bundle || undefined;
  }

  async createHardwareBundle(insertBundle: InsertHardwareBundle): Promise<HardwareBundle> {
    const [bundle] = await db.insert(hardwareBundles).values(insertBundle).returning();
    return bundle;
  }

  async updateHardwareBundle(id: string, organizationId: string, update: Partial<InsertHardwareBundle>): Promise<HardwareBundle | undefined> {
    const [updated] = await db
      .update(hardwareBundles)
      .set(update)
      .where(and(eq(hardwareBundles.id, id), eq(hardwareBundles.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteHardwareBundle(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(hardwareBundles)
      .where(and(eq(hardwareBundles.id, id), eq(hardwareBundles.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Bundle Items
  async getBundleItems(bundleId?: string): Promise<BundleItem[]> {
    if (bundleId) {
      return await db.select().from(bundleItems).where(eq(bundleItems.bundleId, bundleId));
    }
    return await db.select().from(bundleItems);
  }

  async createBundleItem(insertItem: InsertBundleItem): Promise<BundleItem> {
    const [item] = await db.insert(bundleItems).values(insertItem).returning();
    return item;
  }

  async updateBundleItem(id: string, update: Partial<InsertBundleItem>): Promise<BundleItem | undefined> {
    const [updated] = await db
      .update(bundleItems)
      .set(update)
      .where(eq(bundleItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBundleItem(id: string): Promise<boolean> {
    const result = await db.delete(bundleItems).where(eq(bundleItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // BOM Templates - Pre-configured hardware sets
  async getBomTemplates(organizationId: string): Promise<BomTemplate[]> {
    // Return both global templates (null organizationId) and organization-specific templates
    return await db
      .select()
      .from(bomTemplates)
      .where(
        or(
          isNull(bomTemplates.organizationId),
          eq(bomTemplates.organizationId, organizationId)
        )
      )
      .orderBy(bomTemplates.name);
  }

  async getBomTemplate(id: string): Promise<BomTemplate | undefined> {
    const [template] = await db
      .select()
      .from(bomTemplates)
      .where(eq(bomTemplates.id, id));
    return template || undefined;
  }

  async getBomTemplateItems(templateId: string): Promise<BomTemplateItem[]> {
    return await db
      .select()
      .from(bomTemplateItems)
      .where(eq(bomTemplateItems.templateId, templateId))
      .orderBy(bomTemplateItems.sortOrder);
  }

  // BOM (Bill of Materials) - AI-generated hardware recommendations (organization-scoped)
  async getBomsByOpening(openingId: string, organizationId: string): Promise<Bom[]> {
    return await db
      .select()
      .from(boms)
      .where(and(eq(boms.openingId, openingId), eq(boms.organizationId, organizationId)))
      .orderBy(desc(boms.createdAt));
  }

  async getBom(id: string, organizationId: string): Promise<Bom | undefined> {
    const [bom] = await db
      .select()
      .from(boms)
      .where(and(eq(boms.id, id), eq(boms.organizationId, organizationId)))
      .limit(1);
    return bom || undefined;
  }

  async createBom(insertBom: InsertBom): Promise<Bom> {
    const [bom] = await db.insert(boms).values(insertBom).returning();
    return bom;
  }

  async updateBom(id: string, organizationId: string, updates: Partial<InsertBom>): Promise<Bom | undefined> {
    const [updated] = await db
      .update(boms)
      .set({...updates, updatedAt: new Date()})
      .where(and(eq(boms.id, id), eq(boms.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteBom(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(boms)
      .where(and(eq(boms.id, id), eq(boms.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // BOM Items
  async getBomItems(bomId: string): Promise<BomItem[]> {
    return await db.select().from(bomItems).where(eq(bomItems.bomId, bomId)).orderBy(bomItems.category);
  }

  async createBomItem(insertItem: InsertBomItem): Promise<BomItem> {
    const [item] = await db.insert(bomItems).values(insertItem).returning();
    return item;
  }

  async deleteBomItem(id: string): Promise<boolean> {
    const result = await db.delete(bomItems).where(eq(bomItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Catalog Items (organization-scoped)
  async getCatalogItems(organizationId: string): Promise<CatalogItem[]> {
    return await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.organizationId, organizationId));
  }

  async getCatalogItem(id: string, organizationId: string): Promise<CatalogItem | undefined> {
    const [item] = await db
      .select()
      .from(catalogItems)
      .where(and(eq(catalogItems.id, id), eq(catalogItems.organizationId, organizationId)));
    return item || undefined;
  }

  async createCatalogItem(insertItem: InsertCatalogItem): Promise<CatalogItem> {
    const [item] = await db.insert(catalogItems).values(insertItem).returning();
    return item;
  }

  async updateCatalogItem(id: string, organizationId: string, update: Partial<InsertCatalogItem>): Promise<CatalogItem | undefined> {
    const [updated] = await db
      .update(catalogItems)
      .set(update)
      .where(and(eq(catalogItems.id, id), eq(catalogItems.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteCatalogItem(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(catalogItems)
      .where(and(eq(catalogItems.id, id), eq(catalogItems.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Hardware Cross-Reference
  async getHardwareCrossReferences(): Promise<HardwareCrossReference[]> {
    return await db.select().from(hardwareCrossReference);
  }

  async getHardwareCrossReference(id: string): Promise<HardwareCrossReference | undefined> {
    const [item] = await db.select().from(hardwareCrossReference).where(eq(hardwareCrossReference.id, id));
    return item || undefined;
  }

  async searchCrossReferenceByPart(partNumber: string): Promise<HardwareCrossReference[]> {
    const { or, ilike } = await import("drizzle-orm");
    return await db.select().from(hardwareCrossReference).where(
      or(
        ilike(hardwareCrossReference.abhPart, `%${partNumber}%`),
        ilike(hardwareCrossReference.trimcoPart, `%${partNumber}%`),
        ilike(hardwareCrossReference.rockPart, `%${partNumber}%`),
        ilike(hardwareCrossReference.otherManufacturerPart, `%${partNumber}%`)
      )
    );
  }

  async createHardwareCrossReference(insertItem: InsertHardwareCrossReference): Promise<HardwareCrossReference> {
    const [item] = await db.insert(hardwareCrossReference).values(insertItem).returning();
    return item;
  }

  async updateHardwareCrossReference(id: string, update: Partial<InsertHardwareCrossReference>): Promise<HardwareCrossReference | undefined> {
    const [updated] = await db
      .update(hardwareCrossReference)
      .set(update)
      .where(eq(hardwareCrossReference.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteHardwareCrossReference(id: string): Promise<boolean> {
    const result = await db.delete(hardwareCrossReference).where(eq(hardwareCrossReference.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Door Templates (organization-scoped)
  async getDoorTemplates(organizationId: string): Promise<DoorTemplate[]> {
    return await db
      .select()
      .from(doorTemplates)
      .where(eq(doorTemplates.organizationId, organizationId));
  }

  async getDoorTemplate(id: string, organizationId: string): Promise<DoorTemplate | undefined> {
    const [template] = await db
      .select()
      .from(doorTemplates)
      .where(and(eq(doorTemplates.id, id), eq(doorTemplates.organizationId, organizationId)));
    return template || undefined;
  }

  async createDoorTemplate(insertTemplate: InsertDoorTemplate): Promise<DoorTemplate> {
    const [template] = await db.insert(doorTemplates).values(insertTemplate).returning();
    return template;
  }

  async updateDoorTemplate(id: string, organizationId: string, update: Partial<InsertDoorTemplate>): Promise<DoorTemplate | undefined> {
    const [updated] = await db
      .update(doorTemplates)
      .set(update)
      .where(and(eq(doorTemplates.id, id), eq(doorTemplates.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteDoorTemplate(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(doorTemplates)
      .where(and(eq(doorTemplates.id, id), eq(doorTemplates.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Reference Data
  async getDoorReference(): Promise<DoorReference[]> {
    return await db.select().from(doorReference);
  }

  async getOptionsLookup(): Promise<OptionsLookup[]> {
    return await db.select().from(optionsLookup);
  }

  async getSurveyFieldReference(): Promise<SurveyFieldReference[]> {
    return await db.select().from(surveyFieldReference);
  }

  async getHardwareLocationCheat(): Promise<HardwareLocationCheat[]> {
    return await db.select().from(hardwareLocationCheat);
  }

  async getEdgeLiteTypesHmma810(): Promise<EdgeLiteTypesHmma810[]> {
    return await db.select().from(edgeLiteTypesHmma810);
  }

  async getLiteKits(): Promise<any[]> {
    return await db.select().from(liteKits);
  }

  async getGlassTypes(): Promise<any[]> {
    return await db.select().from(glassTypes);
  }

  async getGlassFireSizes(): Promise<any[]> {
    return await db.select().from(glassFireSizes);
  }

  async getPivotPatchHardware(): Promise<any[]> {
    return await db.select().from(pivotPatchHardware);
  }

  // Reference Data Import Methods
  async importDoorReference(records: any[]): Promise<void> {
    // Delete existing records
    await db.delete(doorReference);
    
    // Insert new records
    if (records.length > 0) {
      await db.insert(doorReference).values(
        records.map((item: any) => ({
          illustration: item.illustration,
          category: item.category,
          subcategory: item.subcategory,
          doorType: item.door_type,
          material: item.material,
          finish: item.finish,
          configuration: item.configuration,
          operation: item.operation,
          frameType: item.frame_type,
          hardware: item.hardware,
          glassType: item.glass_type,
          automationReady: item.automation_ready,
          commonUse: item.common_use,
          notes: item.notes,
          imageReference: item.image_reference,
          dutyLevel: item.duty_level,
          coreType: item.core_type,
          anchorType: item.anchor_type,
          gaugeDoor: item.gauge_door,
          gaugeFrame: item.gauge_frame,
          hardwarePrepType: item.hardware_prep_type,
          reinforcementSpec: item.reinforcement_spec,
          finishStandard: item.finish_standard,
          fireLabel: item.fire_label,
          toleranceGuide: item.tolerance_guide,
          wallTypeAnchorCompatibility: item.wall_type___anchor_compatibility,
          thermalRating: item.thermal_rating,
          constructionTypeHmma810: item.construction_type_hmma_810,
          edgeProfile: item.edge_profile,
          meetingEdgeAstragal: item.meeting_edge___astragal,
          visionLiteType: item.vision_lite_type,
          louverType: item.louver_type,
          hingeType: item.hinge_type,
          closerType: item.closer_type,
          lockType: item.lock_type,
          exitDeviceType: item.exit_device_type,
          stdLockClIn: item.std_lock_cl_in,
          stdPullDeadlockClIn: item.std_pull_deadlock_cl_in,
          hospitalLatchClIn: item.hospital_latch_cl_in,
          standardClearances: item.standard_clearances,
        }))
      );
    }
  }

  async importOptionsLookup(records: any[]): Promise<void> {
    await db.delete(optionsLookup);
    if (records.length > 0) {
      await db.insert(optionsLookup).values(
        records.map((item: any) => ({
          field: item.field,
          value: item.value,
        }))
      );
    }
  }

  async importSurveyFieldReference(records: any[]): Promise<void> {
    await db.delete(surveyFieldReference);
    if (records.length > 0) {
      await db.insert(surveyFieldReference).values(
        records.map((item: any) => ({
          topic: item.topic,
          guidance: item.guidance,
        }))
      );
    }
  }

  async importHardwareLocationCheat(records: any[]): Promise<void> {
    await db.delete(hardwareLocationCheat);
    if (records.length > 0) {
      await db.insert(hardwareLocationCheat).values(
        records.map((item: any) => ({
          item: item.item,
          recommendedCenterlineIn: item.recommended_centerline_in,
        }))
      );
    }
  }

  async importEdgeLiteTypesHmma810(records: any[]): Promise<void> {
    await db.delete(edgeLiteTypesHmma810);
    if (records.length > 0) {
      await db.insert(edgeLiteTypesHmma810).values(
        records.map((item: any) => ({
          category: item.category,
          examplesOrNotes: item.examples_or_notes,
        }))
      );
    }
  }

  // Compliance
  async getComplianceRules(): Promise<ComplianceRule[]> {
    return await db.select().from(complianceRules);
  }

  // AI Corrections
  async createAiCorrection(correction: InsertAiCorrection): Promise<AiCorrection> {
    const [newCorrection] = await db.insert(aiCorrections).values(correction).returning();
    return newCorrection;
  }

  async getAiCorrectionsByOpening(openingId: string): Promise<AiCorrection[]> {
    return await db.select().from(aiCorrections).where(eq(aiCorrections.openingId, openingId));
  }

  async getRecentAiCorrections(limit: number = 50): Promise<AiCorrection[]> {
    return await db.select().from(aiCorrections).orderBy(aiCorrections.createdAt).limit(limit);
  }

  // Customers (organization-scoped)
  async getCustomers(organizationId: string): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(eq(customers.organizationId, organizationId));
  }

  async getCustomer(id: string, organizationId: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, organizationId: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set(customer)
      .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteCustomer(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Customer Locations
  async getCustomerLocations(customerId: string): Promise<CustomerLocation[]> {
    return await db.select().from(customerLocations).where(eq(customerLocations.customerId, customerId));
  }

  async getCustomerLocation(id: string): Promise<CustomerLocation | undefined> {
    const [location] = await db.select().from(customerLocations).where(eq(customerLocations.id, id));
    return location;
  }

  async createCustomerLocation(location: InsertCustomerLocation): Promise<CustomerLocation> {
    const [newLocation] = await db.insert(customerLocations).values(location).returning();
    return newLocation;
  }

  async updateCustomerLocation(id: string, location: Partial<InsertCustomerLocation>): Promise<CustomerLocation | undefined> {
    const [updated] = await db.update(customerLocations).set(location).where(eq(customerLocations.id, id)).returning();
    return updated;
  }

  async deleteCustomerLocation(id: string): Promise<boolean> {
    const result = await db.delete(customerLocations).where(eq(customerLocations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Customer Product History
  async getCustomerProductHistory(customerId: string): Promise<CustomerProductHistory[]> {
    return await db.select().from(customerProductHistory).where(eq(customerProductHistory.customerId, customerId));
  }

  async getCustomerProductsByType(customerId: string, productType: string): Promise<CustomerProductHistory[]> {
    return await db.select()
      .from(customerProductHistory)
      .where(eq(customerProductHistory.customerId, customerId) && eq(customerProductHistory.productType, productType));
  }

  async getCustomerMostUsedProducts(customerId: string, limit: number = 10): Promise<CustomerProductHistory[]> {
    return await db.select()
      .from(customerProductHistory)
      .where(eq(customerProductHistory.customerId, customerId))
      .orderBy(customerProductHistory.usageCount)
      .limit(limit);
  }

  async createProductHistory(history: InsertCustomerProductHistory): Promise<CustomerProductHistory> {
    const [newHistory] = await db.insert(customerProductHistory).values(history).returning();
    return newHistory;
  }

  async updateProductHistory(id: string, history: Partial<InsertCustomerProductHistory>): Promise<CustomerProductHistory | undefined> {
    const [updated] = await db.update(customerProductHistory).set(history).where(eq(customerProductHistory.id, id)).returning();
    return updated;
  }

  // Manufacturer Contacts (GLOBALLY SHARED - no organization filtering)
  async getManufacturerContacts(searchTerm?: string): Promise<ManufacturerContact[]> {
    let query = db
      .select()
      .from(manufacturerContacts);

    // Apply server-side search if provided
    if (searchTerm && searchTerm.trim()) {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      query = query.where(
        or(
          sql`LOWER(${manufacturerContacts.manufacturerName}) LIKE ${searchPattern}`,
          sql`LOWER(${manufacturerContacts.contactName}) LIKE ${searchPattern}`,
          sql`LOWER(${manufacturerContacts.email}) LIKE ${searchPattern}`,
          sql`LOWER(${manufacturerContacts.phone}) LIKE ${searchPattern}`,
          sql`LOWER(${manufacturerContacts.role}) LIKE ${searchPattern}`
        )
      ) as typeof query;
    }

    return await query.orderBy(manufacturerContacts.manufacturerName);
  }

  async getManufacturerContact(id: string): Promise<ManufacturerContact | undefined> {
    const [contact] = await db
      .select()
      .from(manufacturerContacts)
      .where(eq(manufacturerContacts.id, id));
    return contact || undefined;
  }

  async findDuplicateManufacturer(name: string, email: string, excludeId?: string): Promise<ManufacturerContact | undefined> {
    const normalizedName = name.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();
    
    const conditions = [];
    
    // Check for duplicate name or email
    conditions.push(
      or(
        sql`LOWER(TRIM(${manufacturerContacts.manufacturerName})) = ${normalizedName}`,
        sql`LOWER(TRIM(${manufacturerContacts.email})) = ${normalizedEmail}`
      )
    );
    
    // Exclude the current ID if editing
    if (excludeId) {
      conditions.push(sql`${manufacturerContacts.id} != ${excludeId}`);
    }
    
    const [duplicate] = await db
      .select()
      .from(manufacturerContacts)
      .where(and(...conditions))
      .limit(1);
    
    return duplicate || undefined;
  }

  async createManufacturerContact(contact: InsertManufacturerContact, userId: string, organizationId: string): Promise<ManufacturerContact> {
    const [newContact] = await db.insert(manufacturerContacts).values({
      ...contact,
      lastEditedBy: userId,
      lastEditedByOrg: organizationId,
      version: 1,
    }).returning();
    return newContact;
  }

  async updateManufacturerContact(id: string, contact: Partial<InsertManufacturerContact>, userId: string, organizationId: string): Promise<ManufacturerContact | undefined> {
    // Get current version for optimistic concurrency
    const existing = await this.getManufacturerContact(id);
    if (!existing) {
      return undefined;
    }

    const [updated] = await db
      .update(manufacturerContacts)
      .set({
        ...contact,
        lastEditedBy: userId,
        lastEditedByOrg: organizationId,
        version: (existing.version || 1) + 1,
        updatedAt: new Date(),
      })
      .where(eq(manufacturerContacts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteManufacturerContact(id: string): Promise<boolean> {
    const result = await db
      .delete(manufacturerContacts)
      .where(eq(manufacturerContacts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Manufacturer Products
  async getManufacturerProducts(contactId: string): Promise<ManufacturerProduct[]> {
    return await db.select().from(manufacturerProducts).where(eq(manufacturerProducts.contactId, contactId));
  }

  async createManufacturerProduct(product: InsertManufacturerProduct): Promise<ManufacturerProduct> {
    const [newProduct] = await db.insert(manufacturerProducts).values(product).returning();
    return newProduct;
  }

  async deleteManufacturerProduct(id: string): Promise<boolean> {
    const result = await db.delete(manufacturerProducts).where(eq(manufacturerProducts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Manufacturer Literature (GLOBALLY VISIBLE - organization tracks uploader)
  async getManufacturerLiterature(contactId: string): Promise<ManufacturerLiterature[]> {
    // All orgs can see all literature for any manufacturer
    return await db
      .select()
      .from(manufacturerLiterature)
      .where(eq(manufacturerLiterature.contactId, contactId))
      .orderBy(desc(manufacturerLiterature.uploadedAt));
  }

  async getManufacturerLiteratureByOrg(organizationId: string): Promise<ManufacturerLiterature[]> {
    // Get literature uploaded BY a specific organization
    return await db
      .select()
      .from(manufacturerLiterature)
      .where(eq(manufacturerLiterature.organizationId, organizationId))
      .orderBy(desc(manufacturerLiterature.uploadedAt));
  }

  async getManufacturerLiteratureById(id: string): Promise<ManufacturerLiterature | undefined> {
    // All orgs can access any literature by ID
    const [literature] = await db
      .select()
      .from(manufacturerLiterature)
      .where(eq(manufacturerLiterature.id, id));
    return literature || undefined;
  }

  async createManufacturerLiterature(literature: InsertManufacturerLiterature): Promise<ManufacturerLiterature> {
    const [newLiterature] = await db.insert(manufacturerLiterature).values(literature).returning();
    return newLiterature;
  }

  async updateManufacturerLiterature(id: string, literature: Partial<InsertManufacturerLiterature>): Promise<ManufacturerLiterature | undefined> {
    // Anyone can update literature metadata
    const [updated] = await db
      .update(manufacturerLiterature)
      .set(literature)
      .where(eq(manufacturerLiterature.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteManufacturerLiterature(id: string): Promise<boolean> {
    // Anyone can delete literature
    const result = await db
      .delete(manufacturerLiterature)
      .where(eq(manufacturerLiterature.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ============================================================================
  // DISTRIBUTORS (Organization-scoped)
  // ============================================================================

  async getDistributors(organizationId: string, includeArchived = false): Promise<Distributor[]> {
    const conditions = [eq(distributors.organizationId, organizationId)];
    if (!includeArchived) {
      conditions.push(isNull(distributors.archivedAt));
    }

    return await db
      .select()
      .from(distributors)
      .where(and(...conditions))
      .orderBy(distributors.name);
  }

  async getDistributor(id: string, organizationId: string, includeArchived = false): Promise<Distributor | undefined> {
    const conditions = [
      eq(distributors.id, id),
      eq(distributors.organizationId, organizationId)
    ];
    if (!includeArchived) {
      conditions.push(isNull(distributors.archivedAt));
    }

    const [distributor] = await db
      .select()
      .from(distributors)
      .where(and(...conditions));
    return distributor || undefined;
  }

  async getDistributorsByIds(distributorIds: string[], organizationId: string, includeArchived = false): Promise<Distributor[]> {
    if (distributorIds.length === 0) {
      return [];
    }

    const conditions = [
      inArray(distributors.id, distributorIds),
      eq(distributors.organizationId, organizationId)
    ];
    if (!includeArchived) {
      conditions.push(isNull(distributors.archivedAt));
    }

    return await db
      .select()
      .from(distributors)
      .where(and(...conditions));
  }

  async getPrimaryDistributor(organizationId: string): Promise<Distributor | undefined> {
    const [distributor] = await db
      .select()
      .from(distributors)
      .where(and(
        eq(distributors.organizationId, organizationId),
        eq(distributors.isPrimary, true),
        isNull(distributors.archivedAt)
      ));
    
    return distributor || undefined;
  }

  async createDistributor(distributor: InsertDistributor): Promise<Distributor> {
    const [newDistributor] = await db
      .insert(distributors)
      .values({
        ...distributor,
        isPrimary: distributor.isPrimary ?? false,
      })
      .returning();
    
    return newDistributor;
  }

  async updateDistributor(id: string, organizationId: string, updates: Partial<InsertDistributor>): Promise<Distributor | undefined> {
    // Reject payload organizationId mismatch
    if (updates.organizationId && updates.organizationId !== organizationId) {
      throw new Error('Organization ID mismatch - cannot transfer distributor ownership');
    }

    const [updated] = await db
      .update(distributors)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(distributors.id, id),
        eq(distributors.organizationId, organizationId)
      ))
      .returning();
    
    return updated || undefined;
  }

  async setPrimaryDistributor(id: string, organizationId: string): Promise<Distributor | undefined> {
    // Use transaction to ensure single primary distributor per org
    return await db.transaction(async (tx) => {
      // First, verify the distributor exists, matches the org, and is not archived
      const [target] = await tx
        .select()
        .from(distributors)
        .where(and(
          eq(distributors.id, id),
          eq(distributors.organizationId, organizationId),
          isNull(distributors.archivedAt)
        ));
      
      // If target doesn't exist or is archived, abort without clearing primaries
      if (!target) {
        return undefined;
      }
      
      // If target is already primary, return it without changes
      if (target.isPrimary) {
        return target;
      }
      
      // Clear all other isPrimary flags for this org
      await tx
        .update(distributors)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(and(
          eq(distributors.organizationId, organizationId),
          ne(distributors.id, id)
        ));
      
      // Set new primary
      const [updated] = await tx
        .update(distributors)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(eq(distributors.id, id))
        .returning();
      
      return updated;
    });
  }

  async deleteDistributor(id: string, organizationId: string): Promise<{ success: boolean; reason?: string }> {
    // Check if distributor is referenced by active hardware_items
    const [refCheck] = await db
      .select({ count: count() })
      .from(hardwareItems)
      .where(and(
        eq(hardwareItems.procurementSourceType, 'distributor'),
        eq(hardwareItems.procurementSourceId, id)
      ));
    
    if (refCheck && refCheck.count > 0) {
      return { 
        success: false, 
        reason: 'HARDWARE_ITEMS_REFERENCE' 
      };
    }

    // Perform soft delete (set archivedAt)
    const [archived] = await db
      .update(distributors)
      .set({ 
        archivedAt: new Date(),
        isPrimary: false, // Clear primary flag on archive
      })
      .where(and(
        eq(distributors.id, id),
        eq(distributors.organizationId, organizationId)
      ))
      .returning();
    
    if (!archived) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    // Clean up junction table relationships when archiving
    await db
      .delete(distributorManufacturers)
      .where(and(
        eq(distributorManufacturers.distributorId, id),
        eq(distributorManufacturers.organizationId, organizationId)
      ));

    return { success: true };
  }

  // ============================================================================
  // DISTRIBUTOR-MANUFACTURER RELATIONSHIPS (Organization-scoped)
  // ============================================================================

  async getDistributorManufacturers(distributorId: string, organizationId: string): Promise<DistributorManufacturer[]> {
    return await db
      .select()
      .from(distributorManufacturers)
      .where(and(
        eq(distributorManufacturers.distributorId, distributorId),
        eq(distributorManufacturers.organizationId, organizationId)
      ))
      .orderBy(distributorManufacturers.manufacturerName);
  }

  async getDistributorManufacturersByManufacturer(manufacturerName: string, organizationId: string): Promise<DistributorManufacturer[]> {
    return await db
      .select()
      .from(distributorManufacturers)
      .where(and(
        eq(distributorManufacturers.manufacturerName, manufacturerName),
        eq(distributorManufacturers.organizationId, organizationId)
      ));
  }

  async getDistributorManufacturerLink(distributorId: string, manufacturerName: string, organizationId: string): Promise<DistributorManufacturer | undefined> {
    const [link] = await db
      .select()
      .from(distributorManufacturers)
      .where(and(
        eq(distributorManufacturers.distributorId, distributorId),
        eq(distributorManufacturers.manufacturerName, manufacturerName),
        eq(distributorManufacturers.organizationId, organizationId)
      ));
    
    return link || undefined;
  }

  async createDistributorManufacturer(relationship: InsertDistributorManufacturer): Promise<DistributorManufacturer> {
    const [newRelationship] = await db
      .insert(distributorManufacturers)
      .values(relationship)
      .returning();
    
    return newRelationship;
  }

  async deleteDistributorManufacturer(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(distributorManufacturers)
      .where(and(
        eq(distributorManufacturers.id, id),
        eq(distributorManufacturers.organizationId, organizationId)
      ));
    
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Quote Requests
  async getQuoteRequests(): Promise<QuoteRequest[]> {
    return await db.select().from(quoteRequests);
  }

  async getQuoteRequestsByOrganization(organizationId: string): Promise<QuoteRequest[]> {
    const orgProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, organizationId));
    const projectIds = orgProjects.map(p => p.id);
    if (projectIds.length === 0) return [];
    return await db.select().from(quoteRequests).where(inArray(quoteRequests.projectId, projectIds));
  }

  async getQuoteRequest(id: string): Promise<QuoteRequest | undefined> {
    const [request] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
    return request;
  }

  async getQuoteRequestsByProject(projectId: string): Promise<QuoteRequest[]> {
    return await db.select().from(quoteRequests).where(eq(quoteRequests.projectId, projectId));
  }

  async createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest> {
    const [newRequest] = await db.insert(quoteRequests).values(request).returning();
    return newRequest;
  }

  async updateQuoteRequest(id: string, request: Partial<InsertQuoteRequest>): Promise<QuoteRequest | undefined> {
    const [updated] = await db.update(quoteRequests).set(request).where(eq(quoteRequests.id, id)).returning();
    return updated;
  }

  async deleteQuoteRequest(id: string): Promise<boolean> {
    const result = await db.delete(quoteRequests).where(eq(quoteRequests.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Purchase Orders
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders);
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return po;
  }

  async getPurchaseOrdersByProject(projectId: string): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders).where(eq(purchaseOrders.projectId, projectId));
  }

  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [newPO] = await db.insert(purchaseOrders).values(po).returning();
    return newPO;
  }

  async updatePurchaseOrder(id: string, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const [updated] = await db.update(purchaseOrders).set({ ...po, updatedAt: new Date() }).where(eq(purchaseOrders.id, id)).returning();
    return updated;
  }

  async deletePurchaseOrder(id: string): Promise<boolean> {
    const result = await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async generateNextPONumber(): Promise<string> {
    const year = new Date().getFullYear();
    const pos = await db.select().from(purchaseOrders);
    const yearPOs = pos.filter(po => po.poNumber.startsWith(`PO-${year}-`));
    const nextNum = yearPOs.length + 1;
    return `PO-${year}-${String(nextNum).padStart(3, '0')}`;
  }

  // Purchase Order Line Items
  async getLineItemsByPO(poId: string): Promise<PurchaseOrderLineItem[]> {
    return await db.select().from(purchaseOrderLineItems).where(eq(purchaseOrderLineItems.purchaseOrderId, poId));
  }

  async createLineItem(item: InsertPurchaseOrderLineItem): Promise<PurchaseOrderLineItem> {
    const [newItem] = await db.insert(purchaseOrderLineItems).values(item).returning();
    return newItem;
  }

  async updateLineItem(id: string, item: Partial<InsertPurchaseOrderLineItem>): Promise<PurchaseOrderLineItem | undefined> {
    const [updated] = await db.update(purchaseOrderLineItems).set(item).where(eq(purchaseOrderLineItems.id, id)).returning();
    return updated;
  }

  async deleteLineItem(id: string): Promise<boolean> {
    const result = await db.delete(purchaseOrderLineItems).where(eq(purchaseOrderLineItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Vendor Quotes
  async getVendorQuotes(): Promise<VendorQuote[]> {
    return await db.select().from(vendorQuotes);
  }

  async getVendorQuote(id: string): Promise<VendorQuote | undefined> {
    const [quote] = await db.select().from(vendorQuotes).where(eq(vendorQuotes.id, id));
    return quote;
  }

  async getVendorQuotesByProject(projectId: string): Promise<VendorQuote[]> {
    return await db.select().from(vendorQuotes).where(eq(vendorQuotes.projectId, projectId));
  }

  async createVendorQuote(quote: InsertVendorQuote): Promise<VendorQuote> {
    const [newQuote] = await db.insert(vendorQuotes).values(quote).returning();
    return newQuote;
  }

  async updateVendorQuote(id: string, quote: Partial<InsertVendorQuote>): Promise<VendorQuote | undefined> {
    const [updated] = await db.update(vendorQuotes).set(quote).where(eq(vendorQuotes.id, id)).returning();
    return updated;
  }

  async deleteVendorQuote(id: string): Promise<boolean> {
    const result = await db.delete(vendorQuotes).where(eq(vendorQuotes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Project Costs
  async getProjectCost(projectId: string): Promise<ProjectCost | undefined> {
    const [cost] = await db.select().from(projectCosts).where(eq(projectCosts.projectId, projectId));
    return cost;
  }

  async createProjectCost(cost: InsertProjectCost): Promise<ProjectCost> {
    const [newCost] = await db.insert(projectCosts).values(cost).returning();
    return newCost;
  }

  async updateProjectCost(projectId: string, cost: Partial<InsertProjectCost>): Promise<ProjectCost | undefined> {
    const [updated] = await db.update(projectCosts).set({ ...cost, updatedAt: new Date() }).where(eq(projectCosts.projectId, projectId)).returning();
    return updated;
  }

  async deleteProjectCost(projectId: string): Promise<boolean> {
    const result = await db.delete(projectCosts).where(eq(projectCosts.projectId, projectId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateProjectHardwareCosts(projectId: string, organizationId: string): Promise<{ updated: number; orphaned: number; total: number; items: Array<{ hardwareItemId: string; openingId: string; status: "verified" | "orphaned"; catalogItemId: string | null }> }> {
    const openings = await this.getOpeningsByProject(projectId);
    const resultItems: Array<{ hardwareItemId: string; openingId: string; status: "verified" | "orphaned"; catalogItemId: string | null }> = [];
    let updated = 0;
    let orphaned = 0;

    for (const opening of openings) {
      const hardwareItems = await this.getHardwareItemsByOpening(opening.id);
      for (const item of hardwareItems) {
        if (item.catalogItemId) {
          const catalogItem = await this.getCatalogItem(item.catalogItemId, organizationId);
          if (catalogItem) {
            resultItems.push({ hardwareItemId: item.id, openingId: opening.id, status: "verified", catalogItemId: item.catalogItemId });
            updated++;
          } else {
            resultItems.push({ hardwareItemId: item.id, openingId: opening.id, status: "orphaned", catalogItemId: item.catalogItemId });
            orphaned++;
          }
        } else {
          resultItems.push({ hardwareItemId: item.id, openingId: opening.id, status: "verified", catalogItemId: null });
          updated++;
        }
      }
    }

    return { updated, orphaned, total: updated + orphaned, items: resultItems };
  }

  // Change Orders
  async getChangeOrders(organizationId: string): Promise<ChangeOrder[]> {
    return await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.organizationId, organizationId))
      .orderBy(changeOrders.createdAt);
  }

  async getChangeOrder(id: string, organizationId: string): Promise<ChangeOrder | undefined> {
    const [co] = await db
      .select()
      .from(changeOrders)
      .where(and(eq(changeOrders.id, id), eq(changeOrders.organizationId, organizationId)));
    return co;
  }

  async getChangeOrdersByProject(projectId: string, organizationId: string): Promise<ChangeOrder[]> {
    return await db
      .select()
      .from(changeOrders)
      .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId)))
      .orderBy(changeOrders.createdAt);
  }

  async createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder> {
    const [newCO] = await db.insert(changeOrders).values(changeOrder).returning();
    return newCO;
  }

  async updateChangeOrder(id: string, organizationId: string, update: Partial<InsertChangeOrder>): Promise<ChangeOrder | undefined> {
    const [updated] = await db
      .update(changeOrders)
      .set({ ...update, updatedAt: new Date() })
      .where(and(eq(changeOrders.id, id), eq(changeOrders.organizationId, organizationId)))
      .returning();
    return updated;
  }

  async deleteChangeOrder(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(changeOrders)
      .where(and(eq(changeOrders.id, id), eq(changeOrders.organizationId, organizationId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async generateNextChangeOrderNumber(projectId: string, organizationId: string): Promise<string> {
    const existingCOs = await db
      .select()
      .from(changeOrders)
      .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId)));
    
    const maxNumber = existingCOs.reduce((max, co) => {
      const match = co.changeOrderNumber.match(/CO-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return Math.max(max, num);
      }
      return max;
    }, 0);
    
    return `CO-${String(maxNumber + 1).padStart(3, '0')}`;
  }

  // Change Order Items
  async getChangeOrderItems(changeOrderId: string): Promise<ChangeOrderItem[]> {
    return await db
      .select()
      .from(changeOrderItems)
      .where(eq(changeOrderItems.changeOrderId, changeOrderId))
      .orderBy(changeOrderItems.lineNumber);
  }

  async getChangeOrderItem(id: string): Promise<ChangeOrderItem | undefined> {
    const [item] = await db
      .select()
      .from(changeOrderItems)
      .where(eq(changeOrderItems.id, id));
    return item;
  }

  async createChangeOrderItem(item: InsertChangeOrderItem): Promise<ChangeOrderItem> {
    const [newItem] = await db.insert(changeOrderItems).values(item).returning();
    return newItem;
  }

  async updateChangeOrderItem(id: string, organizationId: string, update: Partial<InsertChangeOrderItem>): Promise<ChangeOrderItem | undefined> {
    // First verify the item exists and its change order belongs to the organization
    const item = await this.getChangeOrderItem(id);
    if (!item) {
      return undefined;
    }
    
    const changeOrder = await this.getChangeOrder(item.changeOrderId, organizationId);
    if (!changeOrder) {
      return undefined; // Item's change order doesn't belong to this organization
    }
    
    // Now perform the update
    const [updated] = await db
      .update(changeOrderItems)
      .set(update)
      .where(eq(changeOrderItems.id, id))
      .returning();
    return updated;
  }

  async deleteChangeOrderItem(id: string, organizationId: string): Promise<boolean> {
    // First verify the item exists and its change order belongs to the organization
    const item = await this.getChangeOrderItem(id);
    if (!item) {
      return false;
    }
    
    const changeOrder = await this.getChangeOrder(item.changeOrderId, organizationId);
    if (!changeOrder) {
      return false; // Item's change order doesn't belong to this organization
    }
    
    // Now perform the delete
    const result = await db.delete(changeOrderItems).where(eq(changeOrderItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Disclaimers
  async getDisclaimers(): Promise<Disclaimer[]> {
    return await db.select().from(disclaimers);
  }

  async getDisclaimer(id: string): Promise<Disclaimer | undefined> {
    const [disclaimer] = await db.select().from(disclaimers).where(eq(disclaimers.id, id));
    return disclaimer;
  }

  async createDisclaimer(disclaimer: InsertDisclaimer): Promise<Disclaimer> {
    const [newDisclaimer] = await db.insert(disclaimers).values(disclaimer).returning();
    return newDisclaimer;
  }

  async updateDisclaimer(id: string, disclaimer: Partial<InsertDisclaimer>): Promise<Disclaimer | undefined> {
    const [updated] = await db.update(disclaimers).set({ ...disclaimer, updatedAt: new Date() }).where(eq(disclaimers.id, id)).returning();
    return updated;
  }

  async deleteDisclaimer(id: string): Promise<boolean> {
    const result = await db.delete(disclaimers).where(eq(disclaimers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Disclaimer Links
  async getDisclaimerLinks(): Promise<DisclaimerLink[]> {
    return await db.select().from(disclaimerLinks);
  }

  async getDisclaimerLinksByEntity(entityType: string, entityId: string): Promise<DisclaimerLink[]> {
    return await db.select().from(disclaimerLinks).where(and(eq(disclaimerLinks.entityType, entityType), eq(disclaimerLinks.entityId, entityId)));
  }

  async getDisclaimerLinksByDisclaimer(disclaimerId: string): Promise<DisclaimerLink[]> {
    return await db.select().from(disclaimerLinks).where(eq(disclaimerLinks.disclaimerId, disclaimerId));
  }

  async createDisclaimerLink(link: InsertDisclaimerLink): Promise<DisclaimerLink> {
    const [newLink] = await db.insert(disclaimerLinks).values(link).returning();
    return newLink;
  }

  async deleteDisclaimerLink(id: string): Promise<boolean> {
    const result = await db.delete(disclaimerLinks).where(eq(disclaimerLinks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Gasketing Catalog
  async getGasketingCatalog(): Promise<GasketingCatalog[]> {
    return await db.select().from(gasketingCatalog);
  }

  async getGasketingItem(id: string): Promise<GasketingCatalog | undefined> {
    const [item] = await db.select().from(gasketingCatalog).where(eq(gasketingCatalog.id, id));
    return item;
  }

  async createGasketingItem(item: InsertGasketingCatalog): Promise<GasketingCatalog> {
    const [newItem] = await db.insert(gasketingCatalog).values(item).returning();
    return newItem;
  }

  async updateGasketingItem(id: string, item: Partial<InsertGasketingCatalog>): Promise<GasketingCatalog | undefined> {
    const [updated] = await db.update(gasketingCatalog).set(item).where(eq(gasketingCatalog.id, id)).returning();
    return updated;
  }

  async deleteGasketingItem(id: string): Promise<boolean> {
    const result = await db.delete(gasketingCatalog).where(eq(gasketingCatalog.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Opening Gasketing
  async getOpeningGasketing(openingId: string): Promise<OpeningGasketing[]> {
    return await db.select().from(openingGasketing).where(eq(openingGasketing.openingId, openingId));
  }

  async createOpeningGasketing(item: InsertOpeningGasketing): Promise<OpeningGasketing> {
    const [newItem] = await db.insert(openingGasketing).values(item).returning();
    return newItem;
  }

  async deleteOpeningGasketing(id: string): Promise<boolean> {
    const result = await db.delete(openingGasketing).where(eq(openingGasketing.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Key Records (organization-scoped, free tier)
  async getKeyRecords(organizationId: string): Promise<KeyRecord[]> {
    return await db
      .select()
      .from(keyRecords)
      .where(eq(keyRecords.organizationId, organizationId));
  }
  
  async getKeyRecord(id: string, organizationId: string): Promise<KeyRecord | undefined> {
    const [record] = await db
      .select()
      .from(keyRecords)
      .where(
        and(
          eq(keyRecords.id, id),
          eq(keyRecords.organizationId, organizationId)
        )
      );
    return record;
  }
  
  async createKeyRecord(record: InsertKeyRecord): Promise<KeyRecord> {
    const [newRecord] = await db.insert(keyRecords).values(record).returning();
    return newRecord;
  }
  
  async updateKeyRecord(id: string, organizationId: string, record: Partial<InsertKeyRecord>): Promise<KeyRecord | undefined> {
    const [updated] = await db
      .update(keyRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(
        and(
          eq(keyRecords.id, id),
          eq(keyRecords.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
  
  async deleteKeyRecord(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(keyRecords)
      .where(
        and(
          eq(keyRecords.id, id),
          eq(keyRecords.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Master Key Systems (organization-scoped)
  async getMasterKeySystems(organizationId: string): Promise<MasterKeySystem[]> {
    return await db
      .select()
      .from(masterKeySystems)
      .where(eq(masterKeySystems.organizationId, organizationId));
  }
  
  async getMasterKeySystem(id: string, organizationId: string): Promise<MasterKeySystem | undefined> {
    const [system] = await db
      .select()
      .from(masterKeySystems)
      .where(
        and(
          eq(masterKeySystems.id, id),
          eq(masterKeySystems.organizationId, organizationId)
        )
      );
    return system;
  }
  
  async createMasterKeySystem(system: InsertMasterKeySystem): Promise<MasterKeySystem> {
    const [newSystem] = await db.insert(masterKeySystems).values(system).returning();
    return newSystem;
  }
  
  async updateMasterKeySystem(id: string, organizationId: string, system: Partial<InsertMasterKeySystem>): Promise<MasterKeySystem | undefined> {
    const [updated] = await db
      .update(masterKeySystems)
      .set(system)
      .where(
        and(
          eq(masterKeySystems.id, id),
          eq(masterKeySystems.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
  
  async deleteMasterKeySystem(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(masterKeySystems)
      .where(
        and(
          eq(masterKeySystems.id, id),
          eq(masterKeySystems.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Lock Sets (organization-scoped)
  async getLockSets(organizationId: string, projectId?: string): Promise<LockSet[]> {
    if (projectId) {
      return await db
        .select()
        .from(lockSets)
        .where(
          and(
            eq(lockSets.organizationId, organizationId),
            eq(lockSets.projectId, projectId)
          )
        );
    }
    return await db
      .select()
      .from(lockSets)
      .where(eq(lockSets.organizationId, organizationId));
  }
  
  async getLockSet(id: string, organizationId: string): Promise<LockSet | undefined> {
    const [set] = await db
      .select()
      .from(lockSets)
      .where(
        and(
          eq(lockSets.id, id),
          eq(lockSets.organizationId, organizationId)
        )
      );
    return set;
  }
  
  async createLockSet(set: InsertLockSet): Promise<LockSet> {
    const [newSet] = await db.insert(lockSets).values(set).returning();
    return newSet;
  }
  
  async updateLockSet(id: string, organizationId: string, set: Partial<InsertLockSet>): Promise<LockSet | undefined> {
    const [updated] = await db
      .update(lockSets)
      .set(set)
      .where(
        and(
          eq(lockSets.id, id),
          eq(lockSets.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
  
  async deleteLockSet(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(lockSets)
      .where(
        and(
          eq(lockSets.id, id),
          eq(lockSets.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Floor Plans (organization-scoped)
  async getFloorPlans(organizationId: string, projectId?: string): Promise<FloorPlan[]> {
    if (projectId) {
      return await db
        .select()
        .from(floorPlans)
        .where(
          and(
            eq(floorPlans.organizationId, organizationId),
            eq(floorPlans.projectId, projectId)
          )
        );
    }
    return await db
      .select()
      .from(floorPlans)
      .where(eq(floorPlans.organizationId, organizationId));
  }
  
  async getFloorPlan(id: string, organizationId: string): Promise<FloorPlan | undefined> {
    const [plan] = await db
      .select()
      .from(floorPlans)
      .where(
        and(
          eq(floorPlans.id, id),
          eq(floorPlans.organizationId, organizationId)
        )
      );
    return plan;
  }
  
  async createFloorPlan(plan: InsertFloorPlan): Promise<FloorPlan> {
    const [newPlan] = await db
      .insert(floorPlans)
      .values(plan)
      .returning();
    return newPlan;
  }
  
  async updateFloorPlan(id: string, organizationId: string, plan: Partial<InsertFloorPlan>): Promise<FloorPlan | undefined> {
    const [updated] = await db
      .update(floorPlans)
      .set(plan)
      .where(
        and(
          eq(floorPlans.id, id),
          eq(floorPlans.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
  
  async deleteFloorPlan(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(floorPlans)
      .where(
        and(
          eq(floorPlans.id, id),
          eq(floorPlans.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Door Locations (for mapping openings to floor plans) - with organization scoping via floor plans
  async getDoorLocations(floorPlanId: string, organizationId: string): Promise<DoorLocation[]> {
    // Verify floor plan belongs to organization first
    const plan = await this.getFloorPlan(floorPlanId, organizationId);
    if (!plan) return [];
    
    return await db
      .select()
      .from(doorLocations)
      .where(eq(doorLocations.floorPlanId, floorPlanId));
  }
  
  async getDoorLocation(id: string, organizationId: string): Promise<DoorLocation | undefined> {
    // Join with floor plans to ensure organization scoping
    const [location] = await db
      .select({
        doorLocation: doorLocations,
      })
      .from(doorLocations)
      .innerJoin(floorPlans, eq(doorLocations.floorPlanId, floorPlans.id))
      .where(
        and(
          eq(doorLocations.id, id),
          eq(floorPlans.organizationId, organizationId)
        )
      );
    return location?.doorLocation;
  }
  
  async getDoorLocationByOpening(openingId: string, organizationId: string): Promise<DoorLocation | undefined> {
    // Join with floor plans to ensure organization scoping
    const [location] = await db
      .select({
        doorLocation: doorLocations,
      })
      .from(doorLocations)
      .innerJoin(floorPlans, eq(doorLocations.floorPlanId, floorPlans.id))
      .where(
        and(
          eq(doorLocations.openingId, openingId),
          eq(floorPlans.organizationId, organizationId)
        )
      );
    return location?.doorLocation;
  }
  
  async createDoorLocation(location: InsertDoorLocation, organizationId: string): Promise<DoorLocation> {
    // Verify floor plan belongs to organization before creating
    const plan = await this.getFloorPlan(location.floorPlanId, organizationId);
    if (!plan) {
      throw new Error("Floor plan not found or access denied");
    }
    
    const [newLocation] = await db
      .insert(doorLocations)
      .values(location)
      .returning();
    return newLocation;
  }
  
  async updateDoorLocation(id: string, organizationId: string, location: Partial<InsertDoorLocation>): Promise<DoorLocation | undefined> {
    // Verify location belongs to organization via floor plan
    const existing = await this.getDoorLocation(id, organizationId);
    if (!existing) return undefined;
    
    const [updated] = await db
      .update(doorLocations)
      .set(location)
      .where(eq(doorLocations.id, id))
      .returning();
    return updated;
  }
  
  async deleteDoorLocation(id: string, organizationId: string): Promise<boolean> {
    // Verify location belongs to organization via floor plan
    const existing = await this.getDoorLocation(id, organizationId);
    if (!existing) return false;
    
    const result = await db
      .delete(doorLocations)
      .where(eq(doorLocations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Leads & Sales
  async getLeads(organizationId?: string): Promise<Lead[]> {
    if (organizationId) {
      return await db
        .select()
        .from(leads)
        .where(eq(leads.organizationId, organizationId));
    }
    // Get all leads (for system-wide view)
    return await db.select().from(leads);
  }
  
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id));
    return lead;
  }
  
  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db
      .insert(leads)
      .values(lead)
      .returning();
    return newLead;
  }
  
  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }
  
  async deleteLead(id: string): Promise<boolean> {
    const result = await db
      .delete(leads)
      .where(eq(leads.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Sales Activities
  async getSalesActivity(id: string): Promise<SalesActivity | undefined> {
    const [activity] = await db
      .select()
      .from(salesActivities)
      .where(eq(salesActivities.id, id));
    return activity;
  }
  
  async getSalesActivities(leadId: string): Promise<SalesActivity[]> {
    return await db
      .select()
      .from(salesActivities)
      .where(eq(salesActivities.leadId, leadId));
  }
  
  async createSalesActivity(activity: InsertSalesActivity): Promise<SalesActivity> {
    const [newActivity] = await db
      .insert(salesActivities)
      .values(activity)
      .returning();
    return newActivity;
  }
  
  async deleteSalesActivity(id: string): Promise<boolean> {
    const result = await db
      .delete(salesActivities)
      .where(eq(salesActivities.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Marketing Campaigns
  async getMarketingCampaigns(organizationId: string): Promise<MarketingCampaign[]> {
    return await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.organizationId, organizationId));
  }
  
  async getMarketingCampaign(id: string, organizationId: string): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(marketingCampaigns)
      .where(
        and(
          eq(marketingCampaigns.id, id),
          eq(marketingCampaigns.organizationId, organizationId)
        )
      );
    return campaign;
  }
  
  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [newCampaign] = await db
      .insert(marketingCampaigns)
      .values(campaign)
      .returning();
    return newCampaign;
  }
  
  async updateMarketingCampaign(id: string, organizationId: string, campaign: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign | undefined> {
    const [updated] = await db
      .update(marketingCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(
        and(
          eq(marketingCampaigns.id, id),
          eq(marketingCampaigns.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
  
  async deleteMarketingCampaign(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(marketingCampaigns)
      .where(
        and(
          eq(marketingCampaigns.id, id),
          eq(marketingCampaigns.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Marketing Landing Pages
  async getMarketingLandingPages(organizationId: string, status?: string): Promise<MarketingLandingPage[]> {
    const conditions = [eq(marketingLandingPages.organizationId, organizationId)];
    if (status) {
      conditions.push(eq(marketingLandingPages.status, status));
    }
    return await db
      .select()
      .from(marketingLandingPages)
      .where(and(...conditions));
  }
  
  async getMarketingLandingPage(id: string, organizationId: string): Promise<MarketingLandingPage | undefined> {
    const [page] = await db
      .select()
      .from(marketingLandingPages)
      .where(
        and(
          eq(marketingLandingPages.id, id),
          eq(marketingLandingPages.organizationId, organizationId)
        )
      );
    return page;
  }
  
  async getMarketingLandingPagePublic(id: string): Promise<MarketingLandingPage | undefined> {
    const [page] = await db
      .select()
      .from(marketingLandingPages)
      .where(eq(marketingLandingPages.id, id));
    return page;
  }
  
  async getMarketingLandingPageBySlug(slug: string): Promise<MarketingLandingPage | undefined> {
    const [page] = await db
      .select()
      .from(marketingLandingPages)
      .where(eq(marketingLandingPages.slug, slug));
    return page;
  }
  
  async createMarketingLandingPage(page: InsertMarketingLandingPage): Promise<MarketingLandingPage> {
    const [newPage] = await db
      .insert(marketingLandingPages)
      .values(page)
      .returning();
    return newPage;
  }
  
  async updateMarketingLandingPage(id: string, organizationId: string, page: Partial<InsertMarketingLandingPage>): Promise<MarketingLandingPage | undefined> {
    const [updated] = await db
      .update(marketingLandingPages)
      .set({ ...page, updatedAt: new Date() })
      .where(
        and(
          eq(marketingLandingPages.id, id),
          eq(marketingLandingPages.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
  
  async deleteMarketingLandingPage(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(marketingLandingPages)
      .where(
        and(
          eq(marketingLandingPages.id, id),
          eq(marketingLandingPages.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async incrementLandingPageView(id: string): Promise<void> {
    await db
      .update(marketingLandingPages)
      .set({ views: sql`${marketingLandingPages.views} + 1` })
      .where(eq(marketingLandingPages.id, id));
  }
  
  async incrementLandingPageLead(id: string): Promise<void> {
    await db
      .update(marketingLandingPages)
      .set({ 
        leads: sql`${marketingLandingPages.leads} + 1`,
        conversionRate: sql`CASE WHEN ${marketingLandingPages.views} > 0 THEN (${marketingLandingPages.leads} + 1)::real / ${marketingLandingPages.views}::real ELSE 0 END`
      })
      .where(eq(marketingLandingPages.id, id));
  }
  
  // Marketing Lead Forms
  async getMarketingLeadForms(organizationId: string): Promise<MarketingLeadForm[]> {
    return await db
      .select()
      .from(marketingLeadForms)
      .where(eq(marketingLeadForms.organizationId, organizationId));
  }
  
  async getMarketingLeadForm(id: string, organizationId: string): Promise<MarketingLeadForm | undefined> {
    const [form] = await db
      .select()
      .from(marketingLeadForms)
      .where(
        and(
          eq(marketingLeadForms.id, id),
          eq(marketingLeadForms.organizationId, organizationId)
        )
      );
    return form;
  }
  
  async getMarketingLeadFormsByPage(landingPageId: string, organizationId: string): Promise<MarketingLeadForm[]> {
    return await db
      .select()
      .from(marketingLeadForms)
      .where(
        and(
          eq(marketingLeadForms.landingPageId, landingPageId),
          eq(marketingLeadForms.organizationId, organizationId)
        )
      );
  }
  
  async createMarketingLeadForm(form: InsertMarketingLeadForm): Promise<MarketingLeadForm> {
    const [newForm] = await db
      .insert(marketingLeadForms)
      .values(form)
      .returning();
    return newForm;
  }
  
  async updateMarketingLeadForm(id: string, organizationId: string, form: Partial<InsertMarketingLeadForm>): Promise<MarketingLeadForm | undefined> {
    const [updated] = await db
      .update(marketingLeadForms)
      .set({ ...form, updatedAt: new Date() })
      .where(
        and(
          eq(marketingLeadForms.id, id),
          eq(marketingLeadForms.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
  
  async deleteMarketingLeadForm(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(marketingLeadForms)
      .where(
        and(
          eq(marketingLeadForms.id, id),
          eq(marketingLeadForms.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async incrementFormSubmission(id: string): Promise<void> {
    await db
      .update(marketingLeadForms)
      .set({ submissions: sql`${marketingLeadForms.submissions} + 1` })
      .where(eq(marketingLeadForms.id, id));
  }
  
  // Marketing Leads
  async getMarketingLeads(organizationId: string, filters?: { status?: string; campaignId?: string }): Promise<MarketingLead[]> {
    const conditions = [eq(marketingLeads.organizationId, organizationId)];
    if (filters?.status) {
      conditions.push(eq(marketingLeads.status, filters.status));
    }
    if (filters?.campaignId) {
      conditions.push(eq(marketingLeads.campaignId, filters.campaignId));
    }
    return await db
      .select()
      .from(marketingLeads)
      .where(and(...conditions))
      .orderBy(desc(marketingLeads.createdAt));
  }
  
  async getMarketingLead(id: string, organizationId: string): Promise<MarketingLead | undefined> {
    const [lead] = await db
      .select()
      .from(marketingLeads)
      .where(
        and(
          eq(marketingLeads.id, id),
          eq(marketingLeads.organizationId, organizationId)
        )
      );
    return lead;
  }
  
  async createMarketingLead(lead: InsertMarketingLead): Promise<MarketingLead> {
    const [newLead] = await db
      .insert(marketingLeads)
      .values(lead)
      .returning();
    return newLead;
  }
  
  async updateMarketingLead(id: string, organizationId: string, lead: Partial<InsertMarketingLead>): Promise<MarketingLead | undefined> {
    const [updated] = await db
      .update(marketingLeads)
      .set({ ...lead, updatedAt: new Date() })
      .where(
        and(
          eq(marketingLeads.id, id),
          eq(marketingLeads.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }
  
  async deleteMarketingLead(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(marketingLeads)
      .where(
        and(
          eq(marketingLeads.id, id),
          eq(marketingLeads.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async convertMarketingLeadToSalesLead(marketingLeadId: string, organizationId: string): Promise<Lead> {
    // Get the marketing lead
    const marketingLead = await this.getMarketingLead(marketingLeadId, organizationId);
    if (!marketingLead) {
      throw new Error("Marketing lead not found");
    }
    
    // Extract data from marketing lead
    const leadData = marketingLead.data as any;
    
    // Create sales lead
    const salesLead = await this.createLead({
      organizationId,
      companyName: leadData.company || leadData.companyName,
      contactName: leadData.name || leadData.contactName,
      email: leadData.email,
      phone: leadData.phone,
      jobTitle: leadData.jobTitle,
      source: marketingLead.source || 'website',
      status: 'new',
      interestedIn: leadData.interestedIn,
      notes: `Converted from marketing lead. Original source: ${marketingLead.source || 'unknown'}`,
    });
    
    // Update marketing lead to mark as converted
    await this.updateMarketingLead(marketingLeadId, organizationId, {
      status: 'converted',
      convertedToLeadId: salesLead.id,
    });
    
    return salesLead;
  }
  
  // Marketing Analytics
  async createMarketingAnalytics(event: InsertMarketingAnalytics): Promise<MarketingAnalytics> {
    const [newEvent] = await db
      .insert(marketingAnalytics)
      .values(event)
      .returning();
    return newEvent;
  }
  
  async getMarketingAnalytics(organizationId: string, filters?: { eventType?: string; landingPageId?: string; campaignId?: string; startDate?: Date; endDate?: Date }): Promise<MarketingAnalytics[]> {
    const conditions = [eq(marketingAnalytics.organizationId, organizationId)];
    
    if (filters?.eventType) {
      conditions.push(eq(marketingAnalytics.eventType, filters.eventType));
    }
    if (filters?.landingPageId) {
      conditions.push(eq(marketingAnalytics.landingPageId, filters.landingPageId));
    }
    if (filters?.campaignId) {
      conditions.push(eq(marketingAnalytics.campaignId, filters.campaignId));
    }
    if (filters?.startDate) {
      conditions.push(gte(marketingAnalytics.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(marketingAnalytics.createdAt, filters.endDate));
    }
    
    return await db
      .select()
      .from(marketingAnalytics)
      .where(and(...conditions))
      .orderBy(desc(marketingAnalytics.createdAt));
  }
  
  async getMarketingAnalyticsSummary(organizationId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // This will return aggregated analytics data for dashboards
    const conditions = [eq(marketingAnalytics.organizationId, organizationId)];
    if (startDate) {
      conditions.push(gte(marketingAnalytics.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(marketingAnalytics.createdAt, endDate));
    }
    
    const events = await db
      .select()
      .from(marketingAnalytics)
      .where(and(...conditions));
    
    // Get landing pages for breakdown
    const pages = await this.getMarketingLandingPages(organizationId);
    const pageMap = new Map(pages.map(p => [p.id, p]));
    
    // Initialize summary
    const summary: any = {
      totalEvents: events.length,
      totalPageViews: 0,
      totalFormSubmissions: 0,
      totalLeads: 0,
      conversionRate: 0,
      byEventType: {},
      byLandingPage: {},
      byCampaign: {},
      trafficSources: {},
      dailyTrends: [],
      landingPageBreakdown: [],
      campaigns: [],
    };
    
    // Track daily data
    const dailyData: any = {};
    
    events.forEach(event => {
      // By event type
      summary.byEventType[event.eventType] = (summary.byEventType[event.eventType] || 0) + 1;
      
      // Count specific event types
      if (event.eventType === 'page_view') summary.totalPageViews++;
      if (event.eventType === 'form_submit') summary.totalFormSubmissions++;
      if (event.eventType === 'lead_captured') summary.totalLeads++;
      
      // By landing page
      if (event.landingPageId) {
        summary.byLandingPage[event.landingPageId] = (summary.byLandingPage[event.landingPageId] || 0) + 1;
      }
      
      // By campaign
      if (event.campaignId) {
        summary.byCampaign[event.campaignId] = (summary.byCampaign[event.campaignId] || 0) + 1;
      }
      
      // Traffic sources from referrer
      if (event.metadata && typeof event.metadata === 'object') {
        const metadata = event.metadata as any;
        let source = 'Direct';
        
        if (metadata.referrer || metadata.referer) {
          const referrer = metadata.referrer || metadata.referer;
          try {
            const url = new URL(referrer);
            const hostname = url.hostname.toLowerCase();
            
            if (hostname.includes('google')) source = 'Google';
            else if (hostname.includes('bing')) source = 'Bing';
            else if (hostname.includes('facebook')) source = 'Facebook';
            else if (hostname.includes('twitter') || hostname.includes('t.co')) source = 'Twitter';
            else if (hostname.includes('linkedin')) source = 'LinkedIn';
            else source = 'Referral';
          } catch {
            source = 'Referral';
          }
        }
        
        summary.trafficSources[source] = (summary.trafficSources[source] || 0) + 1;
      } else {
        summary.trafficSources['Direct'] = (summary.trafficSources['Direct'] || 0) + 1;
      }
      
      // Daily trends
      const dateKey = event.createdAt.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, views: 0, leads: 0 };
      }
      if (event.eventType === 'page_view') dailyData[dateKey].views++;
      if (event.eventType === 'lead_captured') dailyData[dateKey].leads++;
    });
    
    // Calculate conversion rate
    if (summary.totalPageViews > 0) {
      summary.conversionRate = summary.totalLeads / summary.totalPageViews;
    }
    
    // Convert daily data to array and sort
    summary.dailyTrends = Object.values(dailyData).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );
    
    // Landing page breakdown
    summary.landingPageBreakdown = Array.from(pageMap.entries()).map(([id, page]) => {
      const pageViews = events.filter(e => e.landingPageId === id && e.eventType === 'page_view').length;
      const pageLeads = events.filter(e => e.landingPageId === id && e.eventType === 'lead_captured').length;
      
      return {
        slug: page.slug,
        title: page.title,
        views: pageViews,
        leads: pageLeads,
        conversionRate: pageViews > 0 ? pageLeads / pageViews : 0,
      };
    }).filter(p => p.views > 0);
    
    // Campaign ROI - Fetch from real marketing campaigns data
    const campaigns = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.organizationId, organizationId));
    
    summary.campaigns = campaigns.map(campaign => {
      const spent = campaign.budget || 0;
      const revenue = campaign.revenue || 0;
      const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;
      
      return {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        spent,
        revenue,
        roi: Math.round(roi),
        leads: campaign.leadsGenerated || 0,
        conversions: campaign.conversions || 0,
      };
    }).filter(c => c.spent > 0 || c.revenue > 0); // Only show campaigns with financial data
    
    summary.totalCampaignSpend = summary.campaigns.reduce((sum: number, c: any) => sum + c.spent, 0);
    summary.totalCampaignRevenue = summary.campaigns.reduce((sum: number, c: any) => sum + c.revenue, 0);
    summary.averageCampaignROI = summary.campaigns.length > 0
      ? summary.campaigns.reduce((sum: number, c: any) => sum + c.roi, 0) / summary.campaigns.length
      : 0;
    
    return summary;
  }

  // ====================
  // TESTIMONIALS & CASE STUDIES
  // ====================

  // Testimonials
  async getTestimonials(filters?: { status?: string; industry?: string; isFeatured?: string }): Promise<Testimonial[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(testimonials.status, filters.status));
    }
    if (filters?.industry) {
      conditions.push(eq(testimonials.industry, filters.industry));
    }
    if (filters?.isFeatured) {
      conditions.push(eq(testimonials.isFeatured, filters.isFeatured));
    }
    
    return await db
      .select()
      .from(testimonials)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(testimonials.displayOrder), desc(testimonials.createdAt));
  }

  async getTestimonial(id: string): Promise<Testimonial | undefined> {
    const [testimonial] = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, id));
    return testimonial;
  }

  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    const [created] = await db
      .insert(testimonials)
      .values(testimonial)
      .returning();
    return created;
  }

  async updateTestimonial(id: string, testimonial: Partial<InsertTestimonial>): Promise<Testimonial | undefined> {
    const [updated] = await db
      .update(testimonials)
      .set({ ...testimonial, updatedAt: new Date() })
      .where(eq(testimonials.id, id))
      .returning();
    return updated;
  }

  async deleteTestimonial(id: string): Promise<boolean> {
    const result = await db
      .delete(testimonials)
      .where(eq(testimonials.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async approveTestimonial(id: string, approvedBy: string): Promise<Testimonial | undefined> {
    const [updated] = await db
      .update(testimonials)
      .set({
        status: 'published',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(testimonials.id, id))
      .returning();
    return updated;
  }

  // Case Studies
  async getCaseStudies(filters?: { status?: string; industry?: string; isFeatured?: string }): Promise<CaseStudy[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(caseStudies.status, filters.status));
    }
    if (filters?.industry) {
      conditions.push(eq(caseStudies.industry, filters.industry));
    }
    if (filters?.isFeatured) {
      conditions.push(eq(caseStudies.isFeatured, filters.isFeatured));
    }
    
    return await db
      .select()
      .from(caseStudies)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(caseStudies.displayOrder), desc(caseStudies.createdAt));
  }

  async getCaseStudy(id: string): Promise<CaseStudy | undefined> {
    const [caseStudy] = await db
      .select()
      .from(caseStudies)
      .where(eq(caseStudies.id, id));
    return caseStudy;
  }

  async getCaseStudyBySlug(slug: string): Promise<CaseStudy | undefined> {
    const [caseStudy] = await db
      .select()
      .from(caseStudies)
      .where(eq(caseStudies.slug, slug));
    return caseStudy;
  }

  async createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy> {
    const [created] = await db
      .insert(caseStudies)
      .values(caseStudy)
      .returning();
    return created;
  }

  async updateCaseStudy(id: string, caseStudy: Partial<InsertCaseStudy>): Promise<CaseStudy | undefined> {
    const [updated] = await db
      .update(caseStudies)
      .set({ ...caseStudy, updatedAt: new Date() })
      .where(eq(caseStudies.id, id))
      .returning();
    return updated;
  }

  async deleteCaseStudy(id: string): Promise<boolean> {
    const result = await db
      .delete(caseStudies)
      .where(eq(caseStudies.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async approveCaseStudy(id: string, approvedBy: string): Promise<CaseStudy | undefined> {
    const [updated] = await db
      .update(caseStudies)
      .set({
        status: 'published',
        approvedBy,
        approvedAt: new Date(),
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(caseStudies.id, id))
      .returning();
    return updated;
  }

  async incrementCaseStudyView(id: string): Promise<void> {
    await db
      .update(caseStudies)
      .set({ views: sql`${caseStudies.views} + 1` })
      .where(eq(caseStudies.id, id));
  }

  async incrementCaseStudyDownload(id: string): Promise<void> {
    await db
      .update(caseStudies)
      .set({ downloads: sql`${caseStudies.downloads} + 1` })
      .where(eq(caseStudies.id, id));
  }

  // Blog Categories
  async getBlogCategories(filters?: { isActive?: string }): Promise<BlogCategory[]> {
    const conditions = [];
    
    if (filters?.isActive) {
      conditions.push(eq(blogCategories.isActive, filters.isActive));
    }
    
    return await db
      .select()
      .from(blogCategories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(blogCategories.displayOrder, desc(blogCategories.createdAt));
  }

  async getBlogCategory(id: string): Promise<BlogCategory | undefined> {
    const [category] = await db
      .select()
      .from(blogCategories)
      .where(eq(blogCategories.id, id));
    return category;
  }

  async getBlogCategoryBySlug(slug: string): Promise<BlogCategory | undefined> {
    const [category] = await db
      .select()
      .from(blogCategories)
      .where(eq(blogCategories.slug, slug));
    return category;
  }

  async createBlogCategory(category: InsertBlogCategory): Promise<BlogCategory> {
    const [created] = await db
      .insert(blogCategories)
      .values(category)
      .returning();
    return created;
  }

  async updateBlogCategory(id: string, category: Partial<InsertBlogCategory>): Promise<BlogCategory | undefined> {
    const [updated] = await db
      .update(blogCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(blogCategories.id, id))
      .returning();
    return updated;
  }

  async deleteBlogCategory(id: string): Promise<boolean> {
    const result = await db
      .delete(blogCategories)
      .where(eq(blogCategories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementCategoryPostCount(categoryId: string, delta: number): Promise<void> {
    await db
      .update(blogCategories)
      .set({ postCount: sql`${blogCategories.postCount} + ${delta}` })
      .where(eq(blogCategories.id, categoryId));
  }

  // Blog Tags
  async getBlogTags(filters?: { limit?: number }): Promise<BlogTag[]> {
    const query = db
      .select()
      .from(blogTags)
      .orderBy(desc(blogTags.postCount), blogTags.name);
    
    if (filters?.limit) {
      return await query.limit(filters.limit);
    }
    
    return await query;
  }

  async getBlogTag(id: string): Promise<BlogTag | undefined> {
    const [tag] = await db
      .select()
      .from(blogTags)
      .where(eq(blogTags.id, id));
    return tag;
  }

  async getBlogTagBySlug(slug: string): Promise<BlogTag | undefined> {
    const [tag] = await db
      .select()
      .from(blogTags)
      .where(eq(blogTags.slug, slug));
    return tag;
  }

  async createBlogTag(tag: InsertBlogTag): Promise<BlogTag> {
    const [created] = await db
      .insert(blogTags)
      .values(tag)
      .returning();
    return created;
  }

  async updateBlogTag(id: string, tag: Partial<InsertBlogTag>): Promise<BlogTag | undefined> {
    const [updated] = await db
      .update(blogTags)
      .set(tag)
      .where(eq(blogTags.id, id))
      .returning();
    return updated;
  }

  async deleteBlogTag(id: string): Promise<boolean> {
    const result = await db
      .delete(blogTags)
      .where(eq(blogTags.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementTagPostCount(tagId: string, delta: number): Promise<void> {
    await db
      .update(blogTags)
      .set({ postCount: sql`${blogTags.postCount} + ${delta}` })
      .where(eq(blogTags.id, tagId));
  }

  // Blog Posts
  async getBlogPosts(filters?: { 
    status?: string; 
    categoryId?: string; 
    authorId?: string; 
    isFeatured?: string; 
    search?: string; 
    limit?: number; 
    offset?: number;
  }): Promise<BlogPost[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(blogPosts.status, filters.status));
    }
    if (filters?.categoryId) {
      conditions.push(eq(blogPosts.categoryId, filters.categoryId));
    }
    if (filters?.authorId) {
      conditions.push(eq(blogPosts.authorId, filters.authorId));
    }
    if (filters?.isFeatured) {
      conditions.push(eq(blogPosts.isFeatured, filters.isFeatured));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(blogPosts.title, `%${filters.search}%`),
          like(blogPosts.excerpt, `%${filters.search}%`),
          like(blogPosts.content, `%${filters.search}%`)
        )!
      );
    }
    
    const baseQuery = db
      .select()
      .from(blogPosts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
    
    if (filters?.limit && filters?.offset) {
      return await baseQuery.limit(filters.limit).offset(filters.offset);
    } else if (filters?.limit) {
      return await baseQuery.limit(filters.limit);
    } else if (filters?.offset) {
      return await baseQuery.offset(filters.offset);
    }
    
    return await baseQuery;
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id));
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [created] = await db
      .insert(blogPosts)
      .values(post)
      .returning();
    
    // Increment category post count if category is set
    if (created.categoryId) {
      await this.incrementCategoryPostCount(created.categoryId, 1);
    }
    
    return created;
  }

  async updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    // Get existing post to handle category changes
    const existing = await this.getBlogPost(id);
    
    const [updated] = await db
      .update(blogPosts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    
    // Handle category count updates
    if (existing && updated && existing.categoryId !== updated.categoryId) {
      // Decrement old category
      if (existing.categoryId) {
        await this.incrementCategoryPostCount(existing.categoryId, -1);
      }
      // Increment new category
      if (updated.categoryId) {
        await this.incrementCategoryPostCount(updated.categoryId, 1);
      }
    }
    
    return updated;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    // Get post to decrement category count
    const post = await this.getBlogPost(id);
    
    const result = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id));
    
    // Decrement category post count
    if (post && post.categoryId) {
      await this.incrementCategoryPostCount(post.categoryId, -1);
    }
    
    return (result.rowCount ?? 0) > 0;
  }

  async incrementBlogPostView(id: string): Promise<void> {
    await db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.id, id));
  }

  async publishBlogPost(id: string): Promise<BlogPost | undefined> {
    const [updated] = await db
      .update(blogPosts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  async archiveBlogPost(id: string): Promise<BlogPost | undefined> {
    const [updated] = await db
      .update(blogPosts)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  async getRelatedPosts(postId: string, limit: number = 3): Promise<BlogPost[]> {
    // Get the current post to find related posts
    const post = await this.getBlogPost(postId);
    if (!post) return [];
    
    // Find posts in the same category, excluding the current post
    const conditions = [
      eq(blogPosts.status, 'published'),
      ne(blogPosts.id, postId)
    ];
    
    if (post.categoryId) {
      conditions.push(eq(blogPosts.categoryId, post.categoryId));
    }
    
    return await db
      .select()
      .from(blogPosts)
      .where(and(...conditions))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);
  }

  async getBlogPostsByTag(tagId: string, filters?: { status?: string; limit?: number }): Promise<BlogPost[]> {
    // Get post IDs that have this tag
    const postTags = await db
      .select({ postId: blogPostTags.postId })
      .from(blogPostTags)
      .where(eq(blogPostTags.tagId, tagId));
    
    if (postTags.length === 0) return [];
    
    const postIds = postTags.map(pt => pt.postId);
    const conditions = [inArray(blogPosts.id, postIds)];
    
    if (filters?.status) {
      conditions.push(eq(blogPosts.status, filters.status));
    }
    
    const baseQuery = db
      .select()
      .from(blogPosts)
      .where(and(...conditions))
      .orderBy(desc(blogPosts.publishedAt));
    
    if (filters?.limit) {
      return await baseQuery.limit(filters.limit);
    }
    
    return await baseQuery;
  }

  // Blog Post Tags
  async getBlogPostTags(postId: string): Promise<BlogPostTag[]> {
    return await db
      .select()
      .from(blogPostTags)
      .where(eq(blogPostTags.postId, postId));
  }

  async getTagsForPost(postId: string): Promise<BlogTag[]> {
    const postTagsData = await db
      .select({
        tag: blogTags,
      })
      .from(blogPostTags)
      .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
      .where(eq(blogPostTags.postId, postId));
    
    return postTagsData.map(pt => pt.tag);
  }

  async addTagToPost(postId: string, tagId: string): Promise<BlogPostTag> {
    const [created] = await db
      .insert(blogPostTags)
      .values({ postId, tagId })
      .returning();
    
    // Increment tag post count
    await this.incrementTagPostCount(tagId, 1);
    
    return created;
  }

  async removeTagFromPost(postId: string, tagId: string): Promise<boolean> {
    const result = await db
      .delete(blogPostTags)
      .where(
        and(
          eq(blogPostTags.postId, postId),
          eq(blogPostTags.tagId, tagId)
        )
      );
    
    // Decrement tag post count
    await this.incrementTagPostCount(tagId, -1);
    
    return (result.rowCount ?? 0) > 0;
  }

  async setPostTags(postId: string, tagIds: string[]): Promise<void> {
    // Get existing tags
    const existingTags = await this.getBlogPostTags(postId);
    const existingTagIds = existingTags.map(t => t.tagId);
    
    // Find tags to add and remove
    const tagsToAdd = tagIds.filter(id => !existingTagIds.includes(id));
    const tagsToRemove = existingTagIds.filter(id => !tagIds.includes(id));
    
    // Remove old tags
    for (const tagId of tagsToRemove) {
      await this.removeTagFromPost(postId, tagId);
    }
    
    // Add new tags
    for (const tagId of tagsToAdd) {
      await this.addTagToPost(postId, tagId);
    }
  }

  // User Integrations - Personal API connections
  async getUserIntegrations(userId: string): Promise<UserIntegration[]> {
    return await db
      .select()
      .from(userIntegrations)
      .where(eq(userIntegrations.userId, userId));
  }

  async getUserIntegration(userId: string, service: string): Promise<UserIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.service, service)
        )
      );
    
    // Migrate legacy plaintext tokens to encrypted format
    if (integration) {
      let needsUpdate = false;
      const updates: Partial<InsertUserIntegration> = {};
      
      if (integration.atlassianApiToken && !isEncrypted(integration.atlassianApiToken)) {
        updates.atlassianApiToken = encryptToken(integration.atlassianApiToken);
        needsUpdate = true;
      }
      
      if (integration.notionApiKey && !isEncrypted(integration.notionApiKey)) {
        updates.notionApiKey = encryptToken(integration.notionApiKey);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        // Transparently upgrade the integration
        const [updated] = await db
          .update(userIntegrations)
          .set(updates)
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.service, service)
            )
          )
          .returning();
        return updated;
      }
    }
    
    return integration;
  }

  async createUserIntegration(integration: InsertUserIntegration): Promise<UserIntegration> {
    // Encrypt sensitive tokens before storing
    const encryptedIntegration = { ...integration };
    if (encryptedIntegration.atlassianApiToken) {
      encryptedIntegration.atlassianApiToken = encryptToken(encryptedIntegration.atlassianApiToken);
    }
    if (encryptedIntegration.notionApiKey) {
      encryptedIntegration.notionApiKey = encryptToken(encryptedIntegration.notionApiKey);
    }
    
    const [newIntegration] = await db
      .insert(userIntegrations)
      .values(encryptedIntegration)
      .returning();
    return newIntegration;
  }

  async updateUserIntegration(userId: string, service: string, integration: Partial<InsertUserIntegration>): Promise<UserIntegration | undefined> {
    // Encrypt sensitive tokens before storing
    const encryptedIntegration = { ...integration };
    if (encryptedIntegration.atlassianApiToken) {
      encryptedIntegration.atlassianApiToken = encryptToken(encryptedIntegration.atlassianApiToken);
    }
    if (encryptedIntegration.notionApiKey) {
      encryptedIntegration.notionApiKey = encryptToken(encryptedIntegration.notionApiKey);
    }
    
    const [updated] = await db
      .update(userIntegrations)
      .set({ ...encryptedIntegration, updatedAt: new Date() })
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.service, service)
        )
      )
      .returning();
    return updated;
  }

  async deleteUserIntegration(userId: string, service: string): Promise<boolean> {
    const result = await db
      .delete(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.service, service)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // WIRING DIAGRAM METHODS
  // ============================================================================

  async getWiringDiagrams(organizationId: string, projectId?: string, openingId?: string): Promise<WiringDiagram[]> {
    const conditions = [eq(wiringDiagrams.organizationId, organizationId)];
    
    if (projectId) {
      conditions.push(eq(wiringDiagrams.projectId, projectId));
    }
    if (openingId) {
      conditions.push(eq(wiringDiagrams.openingId, openingId));
    }

    return await db
      .select()
      .from(wiringDiagrams)
      .where(and(...conditions));
  }

  async getWiringDiagram(id: string, organizationId: string): Promise<any | undefined> {
    const [diagram] = await db
      .select()
      .from(wiringDiagrams)
      .where(
        and(
          eq(wiringDiagrams.id, id),
          eq(wiringDiagrams.organizationId, organizationId)
        )
      );
    
    if (!diagram) return undefined;

    // Get all components in this diagram
    const components = await db
      .select()
      .from(diagramComponents)
      .where(eq(diagramComponents.diagramId, id));

    // Get all connections in this diagram
    const connections = await db
      .select()
      .from(diagramConnections)
      .where(eq(diagramConnections.diagramId, id));

    // Get all annotations in this diagram
    const annotations = await db
      .select()
      .from(diagramAnnotations)
      .where(eq(diagramAnnotations.diagramId, id));

    return {
      ...diagram,
      components,
      connections,
      annotations,
    };
  }

  async createWiringDiagram(diagram: InsertWiringDiagram): Promise<WiringDiagram> {
    const [newDiagram] = await db
      .insert(wiringDiagrams)
      .values(diagram)
      .returning();
    return newDiagram;
  }

  async updateWiringDiagram(id: string, organizationId: string, diagram: Partial<InsertWiringDiagram>): Promise<WiringDiagram | undefined> {
    const [updated] = await db
      .update(wiringDiagrams)
      .set({ ...diagram, updatedAt: new Date() })
      .where(
        and(
          eq(wiringDiagrams.id, id),
          eq(wiringDiagrams.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }

  async deleteWiringDiagram(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(wiringDiagrams)
      .where(
        and(
          eq(wiringDiagrams.id, id),
          eq(wiringDiagrams.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAccessControlComponents(organizationId?: string): Promise<AccessControlComponent[]> {
    // Get system defaults and organization-specific components
    if (organizationId) {
      return await db
        .select()
        .from(accessControlComponents)
        .where(
          and(
            eq(accessControlComponents.isSystemDefault, "yes"),
            eq(accessControlComponents.organizationId, organizationId)
          )
        );
    } else {
      // Just system defaults
      return await db
        .select()
        .from(accessControlComponents)
        .where(eq(accessControlComponents.isSystemDefault, "yes"));
    }
  }

  async createAccessControlComponent(component: InsertAccessControlComponent): Promise<AccessControlComponent> {
    const [newComponent] = await db
      .insert(accessControlComponents)
      .values(component)
      .returning();
    return newComponent;
  }

  async createDiagramComponent(component: InsertDiagramComponent): Promise<DiagramComponent> {
    const [newComponent] = await db
      .insert(diagramComponents)
      .values(component)
      .returning();
    return newComponent;
  }

  async updateDiagramComponent(id: string, component: Partial<InsertDiagramComponent>): Promise<DiagramComponent | undefined> {
    const [updated] = await db
      .update(diagramComponents)
      .set(component)
      .where(eq(diagramComponents.id, id))
      .returning();
    return updated;
  }

  async deleteDiagramComponent(id: string): Promise<boolean> {
    const result = await db
      .delete(diagramComponents)
      .where(eq(diagramComponents.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createDiagramConnection(connection: InsertDiagramConnection): Promise<DiagramConnection> {
    const [newConnection] = await db
      .insert(diagramConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateDiagramConnection(id: string, connection: Partial<InsertDiagramConnection>): Promise<DiagramConnection | undefined> {
    const [updated] = await db
      .update(diagramConnections)
      .set(connection)
      .where(eq(diagramConnections.id, id))
      .returning();
    return updated;
  }

  async deleteDiagramConnection(id: string): Promise<boolean> {
    const result = await db
      .delete(diagramConnections)
      .where(eq(diagramConnections.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createDiagramAnnotation(annotation: InsertDiagramAnnotation): Promise<DiagramAnnotation> {
    const [newAnnotation] = await db
      .insert(diagramAnnotations)
      .values(annotation)
      .returning();
    return newAnnotation;
  }

  async updateDiagramAnnotation(id: string, annotation: Partial<InsertDiagramAnnotation>): Promise<DiagramAnnotation | undefined> {
    const [updated] = await db
      .update(diagramAnnotations)
      .set(annotation)
      .where(eq(diagramAnnotations.id, id))
      .returning();
    return updated;
  }

  async deleteDiagramAnnotation(id: string): Promise<boolean> {
    const result = await db
      .delete(diagramAnnotations)
      .where(eq(diagramAnnotations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Bug Reporting methods
  async createBugReport(bugData: InsertBugReport): Promise<BugReport> {
    const [newBug] = await db
      .insert(bugReports)
      .values(bugData)
      .returning();
    return newBug;
  }

  async getBugReports(organizationId: string, filters?: any): Promise<BugReport[]> {
    const conditions: any[] = [eq(bugReports.organizationId, organizationId)];
    
    if (filters?.status) conditions.push(eq(bugReports.status, filters.status as string));
    if (filters?.severity) conditions.push(eq(bugReports.severity, filters.severity as string));
    if (filters?.assignedTo) conditions.push(eq(bugReports.assignedTo, filters.assignedTo as string));
    if (filters?.scanId) conditions.push(eq(bugReports.scanId, filters.scanId as string));
    if (filters?.projectId) conditions.push(eq(bugReports.projectId, filters.projectId as string));

    return await db
      .select()
      .from(bugReports)
      .where(and(...conditions))
      .orderBy(desc(bugReports.createdAt));
  }

  async getBugReport(id: string, organizationId: string): Promise<BugReport | undefined> {
    const [bug] = await db
      .select()
      .from(bugReports)
      .where(
        and(
          eq(bugReports.id, id),
          eq(bugReports.organizationId, organizationId)
        )
      );
    return bug;
  }

  async updateBugReport(id: string, organizationId: string, updates: Partial<InsertBugReport>): Promise<BugReport | undefined> {
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };
    
    if (updates.status && (updates.status === "resolved" || updates.status === "closed")) {
      updateData.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(bugReports)
      .set(updateData)
      .where(
        and(
          eq(bugReports.id, id),
          eq(bugReports.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }

  async deleteBugReport(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(bugReports)
      .where(
        and(
          eq(bugReports.id, id),
          eq(bugReports.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // External Service Connections methods
  async getExternalServiceConnections(organizationId: string): Promise<ExternalServiceConnection[]> {
    return await db
      .select()
      .from(externalServiceConnections)
      .where(eq(externalServiceConnections.organizationId, organizationId))
      .orderBy(desc(externalServiceConnections.createdAt));
  }

  async getExternalServiceConnection(id: string, organizationId: string): Promise<ExternalServiceConnection | undefined> {
    const [connection] = await db
      .select()
      .from(externalServiceConnections)
      .where(
        and(
          eq(externalServiceConnections.id, id),
          eq(externalServiceConnections.organizationId, organizationId)
        )
      );
    return connection;
  }

  async getExternalServiceConnectionByService(organizationId: string, service: string): Promise<ExternalServiceConnection | undefined> {
    const [connection] = await db
      .select()
      .from(externalServiceConnections)
      .where(
        and(
          eq(externalServiceConnections.organizationId, organizationId),
          eq(externalServiceConnections.service, service)
        )
      );
    return connection;
  }

  async createExternalServiceConnection(connection: InsertExternalServiceConnection): Promise<ExternalServiceConnection> {
    const [newConnection] = await db
      .insert(externalServiceConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateExternalServiceConnection(id: string, organizationId: string, updates: Partial<InsertExternalServiceConnection>): Promise<ExternalServiceConnection | undefined> {
    const [updated] = await db
      .update(externalServiceConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(externalServiceConnections.id, id),
          eq(externalServiceConnections.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }

  async deleteExternalServiceConnection(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(externalServiceConnections)
      .where(
        and(
          eq(externalServiceConnections.id, id),
          eq(externalServiceConnections.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Linked External Resources methods
  async getLinkedExternalResources(organizationId: string, projectId?: string): Promise<LinkedExternalResource[]> {
    const conditions: any[] = [eq(linkedExternalResources.organizationId, organizationId)];
    if (projectId) {
      conditions.push(eq(linkedExternalResources.projectId, projectId));
    }
    
    return await db
      .select()
      .from(linkedExternalResources)
      .where(and(...conditions))
      .orderBy(desc(linkedExternalResources.createdAt));
  }

  async getLinkedExternalResourcesByService(organizationId: string, service: string, projectId?: string): Promise<LinkedExternalResource[]> {
    const conditions: any[] = [
      eq(linkedExternalResources.organizationId, organizationId),
      eq(linkedExternalResources.service, service),
    ];
    if (projectId) {
      conditions.push(eq(linkedExternalResources.projectId, projectId));
    }
    
    return await db
      .select()
      .from(linkedExternalResources)
      .where(and(...conditions))
      .orderBy(desc(linkedExternalResources.createdAt));
  }

  async createLinkedExternalResource(resource: InsertLinkedExternalResource): Promise<LinkedExternalResource> {
    const [newResource] = await db
      .insert(linkedExternalResources)
      .values(resource)
      .returning();
    return newResource;
  }

  async deleteLinkedExternalResource(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(linkedExternalResources)
      .where(
        and(
          eq(linkedExternalResources.id, id),
          eq(linkedExternalResources.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // PHASE 0: FOUNDATION - ANALYTICS & EVENT TRACKING METHODS
  // ============================================================================

  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [newEvent] = await db
      .insert(analyticsEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async getAnalyticsEvents(
    organizationId: string,
    filters?: { eventType?: string; startDate?: Date; endDate?: Date }
  ): Promise<AnalyticsEvent[]> {
    const conditions: any[] = [eq(analyticsEvents.organizationId, organizationId)];
    
    if (filters?.eventType) {
      conditions.push(eq(analyticsEvents.eventType, filters.eventType));
    }
    if (filters?.startDate) {
      conditions.push(sql`${analyticsEvents.timestamp} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${analyticsEvents.timestamp} <= ${filters.endDate}`);
    }

    return await db
      .select()
      .from(analyticsEvents)
      .where(and(...conditions))
      .orderBy(desc(analyticsEvents.timestamp));
  }

  async createKpiAggregation(kpi: InsertKpiAggregation): Promise<KpiAggregation> {
    const [newKpi] = await db
      .insert(kpiAggregations)
      .values(kpi)
      .returning();
    return newKpi;
  }

  async getKpiAggregations(
    organizationId: string,
    filters?: { kpiName?: string; periodType?: string }
  ): Promise<KpiAggregation[]> {
    const conditions: any[] = [eq(kpiAggregations.organizationId, organizationId)];
    
    if (filters?.kpiName) {
      conditions.push(eq(kpiAggregations.kpiName, filters.kpiName));
    }
    if (filters?.periodType) {
      conditions.push(eq(kpiAggregations.periodType, filters.periodType));
    }

    return await db
      .select()
      .from(kpiAggregations)
      .where(and(...conditions))
      .orderBy(desc(kpiAggregations.periodStart));
  }

  async updateKpiAggregation(
    id: string,
    organizationId: string,
    updates: Partial<InsertKpiAggregation>
  ): Promise<KpiAggregation | undefined> {
    const [updated] = await db
      .update(kpiAggregations)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(kpiAggregations.id, id),
          eq(kpiAggregations.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }

  // ============================================================================
  // PHASE 0: FOUNDATION - FEATURE FLAGS METHODS
  // ============================================================================

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return await db
      .select()
      .from(featureFlags)
      .orderBy(desc(featureFlags.createdAt));
  }

  async getFeatureFlag(flagKey: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.flagKey, flagKey));
    return flag;
  }

  async createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag> {
    const [newFlag] = await db
      .insert(featureFlags)
      .values(flag)
      .returning();
    return newFlag;
  }

  async updateFeatureFlag(id: string, updates: Partial<InsertFeatureFlag>): Promise<FeatureFlag | undefined> {
    const [updated] = await db
      .update(featureFlags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(featureFlags.id, id))
      .returning();
    return updated;
  }

  async deleteFeatureFlag(id: string): Promise<boolean> {
    const result = await db
      .delete(featureFlags)
      .where(eq(featureFlags.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async evaluateFeatureFlag(flagKey: string, organizationId: string, userId: string): Promise<boolean> {
    const flag = await this.getFeatureFlag(flagKey);
    
    // Default to disabled if flag doesn't exist
    if (!flag) {
      return false;
    }

    let isEnabled = false;
    let evaluationContext: any = {
      rolloutPercentage: flag.rolloutPercentage,
      globallyEnabled: flag.isEnabled,
    };

    // Check if globally enabled
    if (flag.isEnabled === "no") {
      evaluationContext.reason = "globally_disabled";
    } else {
      // Check targeting rules
      if (flag.targetingRules) {
        const rules = flag.targetingRules as any;
        
        // Check organization ID targeting
        if (rules.organizationIds && Array.isArray(rules.organizationIds)) {
          if (!rules.organizationIds.includes(organizationId)) {
            evaluationContext.reason = "org_not_targeted";
          }
        }
        
        // Check user ID targeting
        if (rules.userIds && Array.isArray(rules.userIds)) {
          if (!rules.userIds.includes(userId)) {
            evaluationContext.reason = "user_not_targeted";
          }
        }
        
        // Check subscription tier targeting
        if (rules.subscriptionTiers && Array.isArray(rules.subscriptionTiers)) {
          const org = await this.getOrganization(organizationId);
          if (org && !rules.subscriptionTiers.includes(org.subscriptionTier)) {
            evaluationContext.reason = "tier_not_targeted";
            evaluationContext.userTier = org.subscriptionTier;
          }
        }
      }

      // Check rollout percentage (simple hash-based distribution)
      if (!evaluationContext.reason && flag.rolloutPercentage < 100) {
        const hash = Math.abs(this.simpleHash(userId + flagKey));
        const bucket = hash % 100;
        evaluationContext.bucket = bucket;
        
        if (bucket >= flag.rolloutPercentage) {
          evaluationContext.reason = "rollout_percentage";
        } else {
          isEnabled = true;
        }
      } else if (!evaluationContext.reason) {
        // Passed all checks
        isEnabled = true;
        evaluationContext.reason = "enabled";
      }
    }

    // ALWAYS log evaluation regardless of result for analytics
    await this.createFeatureFlagEvaluation({
      flagId: flag.id,
      organizationId,
      userId,
      isEnabled: isEnabled ? "yes" : "no",
      evaluationContext,
    });

    return isEnabled;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  async createFeatureFlagEvaluation(evaluation: InsertFeatureFlagEvaluation): Promise<FeatureFlagEvaluation> {
    const [newEval] = await db
      .insert(featureFlagEvaluations)
      .values(evaluation)
      .returning();
    return newEval;
  }

  async getFeatureFlagEvaluations(flagId: string): Promise<FeatureFlagEvaluation[]> {
    return await db
      .select()
      .from(featureFlagEvaluations)
      .where(eq(featureFlagEvaluations.flagId, flagId))
      .orderBy(desc(featureFlagEvaluations.evaluatedAt));
  }

  // ============================================================================
  // PHASE 0: FOUNDATION - INTEGRATION FRAMEWORK METHODS
  // ============================================================================

  async getIntegrationProviders(category?: string): Promise<IntegrationProvider[]> {
    if (category) {
      return await db
        .select()
        .from(integrationProviders)
        .where(eq(integrationProviders.category, category))
        .orderBy(desc(integrationProviders.isPopular), integrationProviders.name);
    }
    return await db
      .select()
      .from(integrationProviders)
      .orderBy(desc(integrationProviders.isPopular), integrationProviders.name);
  }

  async getIntegrationProvider(providerKey: string): Promise<IntegrationProvider | undefined> {
    const [provider] = await db
      .select()
      .from(integrationProviders)
      .where(eq(integrationProviders.providerKey, providerKey));
    return provider;
  }

  async createIntegrationProvider(provider: InsertIntegrationProvider): Promise<IntegrationProvider> {
    const [newProvider] = await db
      .insert(integrationProviders)
      .values(provider)
      .returning();
    return newProvider;
  }

  async updateIntegrationProvider(
    id: string,
    updates: Partial<InsertIntegrationProvider>
  ): Promise<IntegrationProvider | undefined> {
    const [updated] = await db
      .update(integrationProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(integrationProviders.id, id))
      .returning();
    return updated;
  }

  async getOrganizationIntegrations(organizationId: string): Promise<OrganizationIntegration[]> {
    return await db
      .select()
      .from(organizationIntegrations)
      .where(eq(organizationIntegrations.organizationId, organizationId))
      .orderBy(desc(organizationIntegrations.connectedAt));
  }

  async getOrganizationIntegration(
    id: string,
    organizationId: string
  ): Promise<OrganizationIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(organizationIntegrations)
      .where(
        and(
          eq(organizationIntegrations.id, id),
          eq(organizationIntegrations.organizationId, organizationId)
        )
      );
    return integration;
  }

  async createOrganizationIntegration(
    integration: InsertOrganizationIntegration
  ): Promise<OrganizationIntegration> {
    // Encrypt sensitive tokens before storing
    const dataToInsert: any = { ...integration };
    if (integration.accessToken) {
      dataToInsert.accessToken = encryptToken(integration.accessToken);
    }
    if (integration.refreshToken) {
      dataToInsert.refreshToken = encryptToken(integration.refreshToken);
    }
    if (integration.apiKey) {
      dataToInsert.apiKey = encryptToken(integration.apiKey);
    }

    const [newIntegration] = await db
      .insert(organizationIntegrations)
      .values(dataToInsert)
      .returning();
    return newIntegration;
  }

  async updateOrganizationIntegration(
    id: string,
    organizationId: string,
    updates: Partial<InsertOrganizationIntegration>
  ): Promise<OrganizationIntegration | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    
    // Encrypt sensitive tokens if they're being updated
    if (updates.accessToken) {
      updateData.accessToken = encryptToken(updates.accessToken);
    }
    if (updates.refreshToken) {
      updateData.refreshToken = encryptToken(updates.refreshToken);
    }
    if (updates.apiKey) {
      updateData.apiKey = encryptToken(updates.apiKey);
    }

    const [updated] = await db
      .update(organizationIntegrations)
      .set(updateData)
      .where(
        and(
          eq(organizationIntegrations.id, id),
          eq(organizationIntegrations.organizationId, organizationId)
        )
      )
      .returning();
    return updated;
  }

  async deleteOrganizationIntegration(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(organizationIntegrations)
      .where(
        and(
          eq(organizationIntegrations.id, id),
          eq(organizationIntegrations.organizationId, organizationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const [newLog] = await db
      .insert(webhookLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getWebhookLogs(integrationId: string, filters?: { status?: string }): Promise<WebhookLog[]> {
    const conditions: any[] = [eq(webhookLogs.integrationId, integrationId)];
    
    if (filters?.status) {
      conditions.push(eq(webhookLogs.status, filters.status));
    }

    return await db
      .select()
      .from(webhookLogs)
      .where(and(...conditions))
      .orderBy(desc(webhookLogs.receivedAt));
  }

  async updateWebhookLog(id: string, updates: Partial<InsertWebhookLog>): Promise<WebhookLog | undefined> {
    const [updated] = await db
      .update(webhookLogs)
      .set(updates)
      .where(eq(webhookLogs.id, id))
      .returning();
    return updated;
  }

  async createApiRequestLog(log: InsertApiRequestLog): Promise<ApiRequestLog> {
    const [newLog] = await db
      .insert(apiRequestLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getApiRequestLogs(
    organizationId: string,
    filters?: { provider?: string; status?: string }
  ): Promise<ApiRequestLog[]> {
    const conditions: any[] = [eq(apiRequestLogs.organizationId, organizationId)];
    
    if (filters?.provider) {
      conditions.push(eq(apiRequestLogs.provider, filters.provider));
    }
    if (filters?.status) {
      conditions.push(eq(apiRequestLogs.status, filters.status));
    }

    return await db
      .select()
      .from(apiRequestLogs)
      .where(and(...conditions))
      .orderBy(desc(apiRequestLogs.requestedAt));
  }

  // ============================================================================
  // PHASE 0: FOUNDATION - EVENT BUS METHODS
  // ============================================================================

  async publishEvent(message: InsertEventBusMessage): Promise<EventBusMessage> {
    const [newMessage] = await db
      .insert(eventBusMessages)
      .values(message)
      .returning();
    
    // Note: In a production system, this would trigger async processing
    // For now, we just store the message
    return newMessage;
  }

  async getEventBusMessages(filters?: { eventType?: string; status?: string }): Promise<EventBusMessage[]> {
    const conditions: any[] = [];
    
    if (filters?.eventType) {
      conditions.push(eq(eventBusMessages.eventType, filters.eventType));
    }
    if (filters?.status) {
      conditions.push(eq(eventBusMessages.status, filters.status));
    }

    if (conditions.length === 0) {
      return await db
        .select()
        .from(eventBusMessages)
        .orderBy(desc(eventBusMessages.publishedAt));
    }

    return await db
      .select()
      .from(eventBusMessages)
      .where(and(...conditions))
      .orderBy(desc(eventBusMessages.publishedAt));
  }

  async updateEventBusMessage(id: string, updates: Partial<InsertEventBusMessage>): Promise<EventBusMessage | undefined> {
    const [updated] = await db
      .update(eventBusMessages)
      .set(updates)
      .where(eq(eventBusMessages.id, id))
      .returning();
    return updated;
  }

  async getEventSubscriptions(eventType?: string): Promise<EventSubscription[]> {
    if (eventType) {
      return await db
        .select()
        .from(eventSubscriptions)
        .where(eq(eventSubscriptions.eventType, eventType))
        .orderBy(desc(eventSubscriptions.priority));
    }
    return await db
      .select()
      .from(eventSubscriptions)
      .orderBy(desc(eventSubscriptions.priority));
  }

  async createEventSubscription(subscription: InsertEventSubscription): Promise<EventSubscription> {
    const [newSubscription] = await db
      .insert(eventSubscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async updateEventSubscription(
    id: string,
    updates: Partial<InsertEventSubscription>
  ): Promise<EventSubscription | undefined> {
    const [updated] = await db
      .update(eventSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(eventSubscriptions.id, id))
      .returning();
    return updated;
  }

  async deleteEventSubscription(id: string): Promise<boolean> {
    const result = await db
      .delete(eventSubscriptions)
      .where(eq(eventSubscriptions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // WORKSTREAM 1: DATA & INTELLIGENCE PLATFORM - PREDICTIVE ANALYTICS
  // ============================================================================

  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const [newPrediction] = await db
      .insert(predictions)
      .values(prediction)
      .returning();
    return newPrediction;
  }

  async getPredictions(projectId: string): Promise<Prediction[]> {
    return await db
      .select()
      .from(predictions)
      .where(eq(predictions.projectId, projectId))
      .orderBy(desc(predictions.generatedAt));
  }

  async getPredictionsByType(projectId: string, type: string): Promise<Prediction[]> {
    return await db
      .select()
      .from(predictions)
      .where(and(
        eq(predictions.projectId, projectId),
        eq(predictions.predictionType, type)
      ))
      .orderBy(desc(predictions.generatedAt))
      .limit(1);
  }

  async updatePredictionActual(id: string, actualValue: number): Promise<Prediction | undefined> {
    const prediction = await db.select().from(predictions).where(eq(predictions.id, id)).limit(1);
    if (prediction.length === 0) return undefined;

    const predictedValue = prediction[0].predictedValue || 0;
    
    // Calculate accuracy score safely, handling zero predictions
    let accuracyScore: number;
    if (predictedValue === 0 && actualValue === 0) {
      // Both zero - perfect prediction
      accuracyScore = 1.0;
    } else if (predictedValue === 0) {
      // Predicted zero but actual is non-zero - worst possible accuracy
      accuracyScore = 0.0;
    } else {
      // Normal case - calculate relative error
      accuracyScore = Math.max(0, 1 - Math.abs(actualValue - predictedValue) / Math.abs(predictedValue));
    }

    const [updated] = await db
      .update(predictions)
      .set({
        actualValue,
        accuracyScore,
      })
      .where(eq(predictions.id, id))
      .returning();
    return updated;
  }

  async generateProjectPredictions(projectId: string, organizationId: string): Promise<Prediction[]> {
    // Get project data
    const project = await this.getProject(projectId, organizationId);
    if (!project) return [];

    // Get all door openings for the project
    const openings = await this.getOpeningsByProject(projectId);
    
    // Get hardware items for complexity analysis
    const hardwarePromises = openings.map((opening: DoorOpening) => 
      this.getHardwareItemsByOpening(opening.id)
    );
    const hardwareByOpening = await Promise.all(hardwarePromises);
    const allHardware = hardwareByOpening.flat();

    const predictions: Prediction[] = [];
    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // 1. PROJECT TIMELINE PREDICTION
    const baseLabor = allHardware.reduce((sum: number, item: HardwareItem) => sum + (item.laborHours || 0), 0);
    const complexityMultiplier = this.calculateComplexityMultiplier(openings, allHardware);
    const predictedDays = Math.ceil((baseLabor * complexityMultiplier) / 8); // 8 hours per day

    const timelinePrediction = await this.createPrediction({
      organizationId,
      projectId,
      predictionType: "timeline",
      predictedValue: predictedDays,
      confidenceScore: 0.75,
      predictedDetails: {
        totalOpenings: openings.length,
        totalLaborHours: baseLabor,
        complexityFactor: complexityMultiplier,
        estimatedDays: predictedDays,
      },
      modelVersion: "v1.0",
      inputFeatures: {
        openingCount: openings.length,
        hardwareCount: allHardware.length,
        buildingType: project.buildingType,
      },
      validUntil,
    });
    predictions.push(timelinePrediction);

    // 2. COST PREDICTION (with manufacturer discounts)
    // First, get unique manufacturer names from hardware items
    const manufacturerNames = new Set(
      allHardware
        .map(item => item.manufacturer)
        .filter((name): name is string => !!name)
    );
    
    // Look up manufacturer contacts and their discounts
    const manufacturerDiscounts = new Map<string, string>();
    for (const name of Array.from(manufacturerNames)) {
      const contacts = await db
        .select()
        .from(manufacturerContacts)
        .where(sql`LOWER(TRIM(${manufacturerContacts.manufacturerName})) = ${name.toLowerCase().trim()}`)
        .limit(1);
      
      if (contacts[0]?.discountMultiplier) {
        manufacturerDiscounts.set(name, contacts[0].discountMultiplier);
      }
    }
    
    // Calculate hardware cost with manufacturer and item discounts
    const hardwareCost = allHardware.reduce((sum: number, item: HardwareItem) => {
      const basePrice = item.listPrice || 0;
      const quantity = parseInt(item.quantity || "1");
      
      // Apply item-level discount first
      let price = basePrice * (1 - (item.discountPercent || 0) / 100);
      
      // Then apply manufacturer discount if available
      const mfrDiscount = item.manufacturer ? manufacturerDiscounts.get(item.manufacturer) : null;
      if (mfrDiscount) {
        price = applyDiscount(price, mfrDiscount);
      }
      
      return sum + (price * quantity);
    }, 0);
    
    const laborCost = baseLabor * 75; // $75/hour average
    const materialCost = openings.length * 500; // $500 per opening for door/frame
    const totalCost = hardwareCost + laborCost + materialCost;

    const costPrediction = await this.createPrediction({
      organizationId,
      projectId,
      predictionType: "cost",
      predictedValue: totalCost,
      confidenceScore: 0.80,
      predictedDetails: {
        hardwareCost,
        laborCost,
        materialCost,
        totalCost,
        breakdown: {
          hardware: hardwareCost,
          labor: laborCost,
          materials: materialCost,
        },
      },
      modelVersion: "v1.0",
      inputFeatures: {
        openingCount: openings.length,
        hardwareCount: allHardware.length,
        totalLaborHours: baseLabor,
      },
      validUntil,
    });
    predictions.push(costPrediction);

    // 3. COMPLIANCE RISK PREDICTION
    const riskFactors = this.calculateComplianceRisk(openings, project);
    const riskScore = riskFactors.score;

    const compliancePrediction = await this.createPrediction({
      organizationId,
      projectId,
      predictionType: "compliance_risk",
      predictedValue: riskScore,
      confidenceScore: 0.70,
      predictedDetails: {
        riskScore,
        riskLevel: riskScore > 0.7 ? "high" : riskScore > 0.4 ? "medium" : "low",
        riskFactors: riskFactors.factors,
      },
      modelVersion: "v1.0",
      inputFeatures: {
        buildingType: project.buildingType,
        standards: project.applicableStandards,
        fireRatedCount: riskFactors.fireRatedCount,
      },
      validUntil,
    });
    predictions.push(compliancePrediction);

    // 4. LABOR ESTIMATION
    const laborPrediction = await this.createPrediction({
      organizationId,
      projectId,
      predictionType: "labor",
      predictedValue: baseLabor,
      confidenceScore: 0.85,
      predictedDetails: {
        totalHours: baseLabor,
        averagePerOpening: baseLabor / openings.length,
        estimatedTechnicians: Math.ceil(baseLabor / (predictedDays * 8)),
      },
      modelVersion: "v1.0",
      inputFeatures: {
        openingCount: openings.length,
        hardwareCount: allHardware.length,
      },
      validUntil,
    });
    predictions.push(laborPrediction);

    // 5. MATERIALS PREDICTION
    const materialNeeds = this.predictMaterialNeeds(openings, allHardware);
    
    const materialsPrediction = await this.createPrediction({
      organizationId,
      projectId,
      predictionType: "materials",
      predictedValue: Object.keys(materialNeeds).length,
      confidenceScore: 0.90,
      predictedDetails: materialNeeds,
      modelVersion: "v1.0",
      inputFeatures: {
        openingCount: openings.length,
        uniqueHardwareTypes: new Set(allHardware.map((h: HardwareItem) => h.itemType)).size,
      },
      validUntil,
    });
    predictions.push(materialsPrediction);

    return predictions;
  }

  private calculateComplexityMultiplier(openings: DoorOpening[], hardware: HardwareItem[]): number {
    let multiplier = 1.0;

    // Fire-rated doors increase complexity
    const fireRated = openings.filter((o: DoorOpening) => o.doorFireRating && o.doorFireRating !== "none").length;
    multiplier += (fireRated / openings.length) * 0.3;

    // Automated/access control increases complexity
    const automated = openings.filter((o: DoorOpening) => o.automationType || o.accessControlType).length;
    multiplier += (automated / openings.length) * 0.4;

    // Custom hardware increases complexity
    const custom = hardware.filter(h => h.isCustom === "yes").length;
    multiplier += (custom / hardware.length) * 0.2;

    return multiplier;
  }

  private calculateComplianceRisk(openings: DoorOpening[], project: Project): { score: number; factors: string[]; fireRatedCount: number } {
    const factors: string[] = [];
    let riskScore = 0;

    const fireRatedCount = openings.filter((o: DoorOpening) => o.doorFireRating && o.doorFireRating !== "none").length;
    if (fireRatedCount > 0) {
      riskScore += 0.3;
      factors.push(`${fireRatedCount} fire-rated openings require strict compliance`);
    }

    const accessControl = openings.filter((o: DoorOpening) => o.accessControlType).length;
    if (accessControl > openings.length * 0.3) {
      riskScore += 0.2;
      factors.push("High percentage of access control (ADA/FGI compliance required)");
    }

    if (project.buildingType === "hospital" || project.buildingType === "healthcare") {
      riskScore += 0.3;
      factors.push("Healthcare facility with strict FGI/ADA requirements");
    }

    const standards = project.applicableStandards || [];
    if (standards.includes("ADA") || standards.includes("FGI")) {
      riskScore += 0.2;
      factors.push("ADA/FGI compliance standards apply");
    }

    return { score: Math.min(riskScore, 1.0), factors, fireRatedCount };
  }

  private predictMaterialNeeds(openings: DoorOpening[], hardware: HardwareItem[]): any {
    // Group hardware by type and count
    const materialCounts: Record<string, number> = {};
    
    hardware.forEach(item => {
      const key = `${item.manufacturer || "Generic"} ${item.model || item.description}`;
      materialCounts[key] = (materialCounts[key] || 0) + parseInt(item.quantity || "1");
    });

    // Door materials
    const doorMaterials: Record<string, number> = {};
    openings.forEach(opening => {
      const doorKey = `${opening.doorMaterial || "Standard"} Door ${opening.doorWidth}x${opening.doorHeight}`;
      doorMaterials[doorKey] = (doorMaterials[doorKey] || 0) + 1;
      
      const frameKey = `${opening.frameMaterial || "Standard"} Frame ${opening.frameWidth}x${opening.frameDepth}`;
      doorMaterials[frameKey] = (doorMaterials[frameKey] || 0) + 1;
    });

    return {
      hardware: materialCounts,
      doors: doorMaterials,
      totalUniqueItems: Object.keys(materialCounts).length + Object.keys(doorMaterials).length,
    };
  }

  async createPredictionFeedback(feedback: InsertPredictionFeedback): Promise<PredictionFeedback> {
    const [newFeedback] = await db
      .insert(predictionFeedback)
      .values(feedback)
      .returning();
    return newFeedback;
  }

  async getPredictionFeedback(predictionId: string): Promise<PredictionFeedback[]> {
    return await db
      .select()
      .from(predictionFeedback)
      .where(eq(predictionFeedback.predictionId, predictionId))
      .orderBy(desc(predictionFeedback.createdAt));
  }

  // ====== ADVANCED REPORTING ======
  
  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const [newTemplate] = await db
      .insert(reportTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async getReportTemplate(id: string, organizationId: string): Promise<ReportTemplate | undefined> {
    const [template] = await db
      .select()
      .from(reportTemplates)
      .where(and(
        eq(reportTemplates.id, id),
        eq(reportTemplates.organizationId, organizationId)
      ))
      .limit(1);
    return template;
  }

  async getReportTemplates(organizationId: string, filters?: { reportType?: string; isTemplate?: string }): Promise<ReportTemplate[]> {
    const conditions = [eq(reportTemplates.organizationId, organizationId)];
    
    if (filters?.reportType) {
      conditions.push(eq(reportTemplates.reportType, filters.reportType));
    }
    if (filters?.isTemplate) {
      conditions.push(eq(reportTemplates.isTemplate, filters.isTemplate));
    }
    
    return await db
      .select()
      .from(reportTemplates)
      .where(and(...conditions))
      .orderBy(desc(reportTemplates.createdAt));
  }

  async updateReportTemplate(id: string, organizationId: string, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    const [updated] = await db
      .update(reportTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(reportTemplates.id, id),
        eq(reportTemplates.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteReportTemplate(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(reportTemplates)
      .where(and(
        eq(reportTemplates.id, id),
        eq(reportTemplates.organizationId, organizationId)
      ));
    return true;
  }

  async createReportExecution(execution: InsertReportExecution): Promise<ReportExecution> {
    const [newExecution] = await db
      .insert(reportExecutions)
      .values(execution)
      .returning();
    return newExecution;
  }

  async getReportExecution(id: string, organizationId: string): Promise<ReportExecution | undefined> {
    const [execution] = await db
      .select()
      .from(reportExecutions)
      .where(and(
        eq(reportExecutions.id, id),
        eq(reportExecutions.organizationId, organizationId)
      ))
      .limit(1);
    return execution;
  }

  async getReportExecutions(organizationId: string, filters?: { templateId?: string; status?: string }): Promise<ReportExecution[]> {
    const conditions = [eq(reportExecutions.organizationId, organizationId)];
    
    if (filters?.templateId) {
      conditions.push(eq(reportExecutions.templateId, filters.templateId));
    }
    if (filters?.status) {
      conditions.push(eq(reportExecutions.status, filters.status));
    }
    
    return await db
      .select()
      .from(reportExecutions)
      .where(and(...conditions))
      .orderBy(desc(reportExecutions.executedAt))
      .limit(50);
  }

  async updateReportExecution(id: string, updates: Partial<InsertReportExecution>): Promise<ReportExecution | undefined> {
    const [updated] = await db
      .update(reportExecutions)
      .set(updates)
      .where(eq(reportExecutions.id, id))
      .returning();
    return updated;
  }

  async executeReport(templateId: string, organizationId: string, executedBy: string, parameters?: any): Promise<ReportExecution> {
    const startTime = Date.now();
    
    // Get the report template
    const template = await this.getReportTemplate(templateId, organizationId);
    if (!template) {
      throw new Error(`Report template ${templateId} not found`);
    }

    // Create execution record with pending status
    const execution = await this.createReportExecution({
      organizationId,
      templateId,
      executedBy,
      reportName: template.name,
      parameters,
      status: "running",
    });

    try {
      // Generate report data based on data source and template configuration
      const reportData = await this.generateReportData(template, organizationId, parameters);
      
      const executionTime = Date.now() - startTime;
      
      // Update execution with results
      const updated = await this.updateReportExecution(execution.id, {
        status: "completed",
        resultData: reportData,
        rowCount: Array.isArray(reportData) ? reportData.length : 0,
        executionTimeMs: executionTime,
      });

      // Update template execution count
      await db
        .update(reportTemplates)
        .set({
          executionCount: sql`${reportTemplates.executionCount} + 1`,
          lastExecutedAt: new Date(),
        })
        .where(eq(reportTemplates.id, templateId));

      return updated || execution;
    } catch (error: any) {
      // Update execution with error
      const updated = await this.updateReportExecution(execution.id, {
        status: "failed",
        errorMessage: error.message,
        executionTimeMs: Date.now() - startTime,
      });
      return updated || execution;
    }
  }

  private async generateReportData(template: ReportTemplate, organizationId: string, parameters?: any): Promise<any> {
    // Generate report data based on template configuration
    const { dataSource, metrics, filters, groupBy, sortBy } = template;
    
    // This is a simplified implementation - a full version would have comprehensive querying logic
    let query: any;
    let data: any[] = [];

    switch (dataSource) {
      case "projects":
        data = await db
          .select()
          .from(projects)
          .where(eq(projects.organizationId, organizationId));
        break;
      
      case "openings":
        // Get all openings for organization's projects
        const orgProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, organizationId));
        const projectIds = orgProjects.map(p => p.id);
        if (projectIds.length > 0) {
          data = await db
            .select()
            .from(doorOpenings)
            .where(sql`${doorOpenings.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
        }
        break;
      
      case "hardware":
        // Similar pattern for hardware
        const hardwareProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, organizationId));
        const hwProjectIds = hardwareProjects.map(p => p.id);
        if (hwProjectIds.length > 0) {
          const orgOpenings = await db
            .select({ id: doorOpenings.id })
            .from(doorOpenings)
            .where(sql`${doorOpenings.projectId} IN (${sql.join(hwProjectIds.map(id => sql`${id}`), sql`, `)})`);
          const openingIds = orgOpenings.map(o => o.id);
          if (openingIds.length > 0) {
            data = await db
              .select()
              .from(hardwareItems)
              .where(sql`${hardwareItems.openingId} IN (${sql.join(openingIds.map(id => sql`${id}`), sql`, `)})`);
          }
        }
        break;
      
      case "predictions":
        data = await db
          .select()
          .from(predictions)
          .where(eq(predictions.organizationId, organizationId))
          .orderBy(desc(predictions.generatedAt))
          .limit(100);
        break;
      
      case "analytics":
        data = await db
          .select()
          .from(analyticsEvents)
          .where(eq(analyticsEvents.organizationId, organizationId))
          .orderBy(desc(analyticsEvents.timestamp))
          .limit(1000);
        break;
      
      default:
        throw new Error(`Unsupported data source: ${dataSource}`);
    }

    // Apply filters if provided
    if (filters && Array.isArray(filters)) {
      data = this.applyReportFilters(data, filters);
    }

    // Apply grouping and aggregation if provided
    if (metrics && Array.isArray(metrics)) {
      data = this.applyReportMetrics(data, metrics, groupBy);
    }

    // Apply sorting if provided
    if (sortBy && Array.isArray(sortBy)) {
      data = this.applyReportSorting(data, sortBy);
    }

    return data;
  }

  private applyReportFilters(data: any[], filters: any[]): any[] {
    return data.filter(row => {
      return filters.every(filter => {
        const { field, operator, value } = filter;
        const fieldValue = row[field];
        
        switch (operator) {
          case "equals":
            return fieldValue === value;
          case "not_equals":
            return fieldValue !== value;
          case "contains":
            return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          case "greater_than":
            return Number(fieldValue) > Number(value);
          case "less_than":
            return Number(fieldValue) < Number(value);
          default:
            return true;
        }
      });
    });
  }

  private applyReportMetrics(data: any[], metrics: any[], groupBy?: any): any[] {
    if (!groupBy || !Array.isArray(groupBy) || groupBy.length === 0) {
      // No grouping - just select the specified fields
      return data.map(row => {
        const result: any = {};
        metrics.forEach(metric => {
          const { field, label } = metric;
          result[label || field] = row[field];
        });
        return result;
      });
    }

    // Group data by specified fields
    const grouped: Record<string, any[]> = {};
    data.forEach(row => {
      const key = groupBy.map((field: string) => row[field]).join("||");
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(row);
    });

    // Apply aggregations to each group
    return Object.entries(grouped).map(([key, rows]) => {
      const result: any = {};
      
      // Add grouping fields
      const keyParts = key.split("||");
      groupBy.forEach((field: string, index: number) => {
        result[field] = rows[0][field];
      });

      // Apply metrics with aggregations
      metrics.forEach(metric => {
        const { field, aggregation, label } = metric;
        const targetLabel = label || field;
        
        switch (aggregation) {
          case "count":
            result[targetLabel] = rows.length;
            break;
          case "sum":
            result[targetLabel] = rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
            break;
          case "avg":
            result[targetLabel] = rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0) / rows.length;
            break;
          case "min":
            result[targetLabel] = Math.min(...rows.map(row => Number(row[field]) || 0));
            break;
          case "max":
            result[targetLabel] = Math.max(...rows.map(row => Number(row[field]) || 0));
            break;
          default:
            result[targetLabel] = rows[0][field];
        }
      });

      return result;
    });
  }

  private applyReportSorting(data: any[], sortBy: any[]): any[] {
    return data.sort((a, b) => {
      for (const sort of sortBy) {
        const { field, direction } = sort;
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal === bVal) continue;
        
        const comparison = aVal > bVal ? 1 : -1;
        return direction === "asc" ? comparison : -comparison;
      }
      return 0;
    });
  }

  async createReportSchedule(schedule: InsertReportSchedule): Promise<ReportSchedule> {
    const [newSchedule] = await db
      .insert(reportSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async getReportSchedule(id: string, organizationId: string): Promise<ReportSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(reportSchedules)
      .where(and(
        eq(reportSchedules.id, id),
        eq(reportSchedules.organizationId, organizationId)
      ))
      .limit(1);
    return schedule;
  }

  async getReportSchedules(organizationId: string, filters?: { isActive?: string }): Promise<ReportSchedule[]> {
    const conditions = [eq(reportSchedules.organizationId, organizationId)];
    
    if (filters?.isActive) {
      conditions.push(eq(reportSchedules.isActive, filters.isActive));
    }
    
    return await db
      .select()
      .from(reportSchedules)
      .where(and(...conditions))
      .orderBy(desc(reportSchedules.createdAt));
  }

  async updateReportSchedule(id: string, organizationId: string, updates: Partial<InsertReportSchedule>): Promise<ReportSchedule | undefined> {
    const [updated] = await db
      .update(reportSchedules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(reportSchedules.id, id),
        eq(reportSchedules.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteReportSchedule(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(reportSchedules)
      .where(and(
        eq(reportSchedules.id, id),
        eq(reportSchedules.organizationId, organizationId)
      ));
    return true;
  }

  async createReportShare(share: InsertReportShare): Promise<ReportShare> {
    const [newShare] = await db
      .insert(reportShares)
      .values(share)
      .returning();
    return newShare;
  }

  async getReportShares(templateId: string, organizationId: string): Promise<ReportShare[]> {
    // First verify the template belongs to this organization
    const template = await db
      .select()
      .from(reportTemplates)
      .where(and(
        eq(reportTemplates.id, templateId),
        eq(reportTemplates.organizationId, organizationId)
      ))
      .limit(1);
    
    if (template.length === 0) {
      return []; // Template doesn't exist or doesn't belong to this organization
    }

    return await db
      .select()
      .from(reportShares)
      .where(eq(reportShares.templateId, templateId))
      .orderBy(desc(reportShares.createdAt));
  }

  async deleteReportShare(templateId: string, sharedWith: string, organizationId: string): Promise<boolean> {
    // First verify the template belongs to this organization
    const template = await db
      .select()
      .from(reportTemplates)
      .where(and(
        eq(reportTemplates.id, templateId),
        eq(reportTemplates.organizationId, organizationId)
      ))
      .limit(1);
    
    if (template.length === 0) {
      return false; // Template doesn't exist or doesn't belong to this organization
    }

    const result = await db
      .delete(reportShares)
      .where(and(
        eq(reportShares.templateId, templateId),
        eq(reportShares.sharedWith, sharedWith)
      ));
    return true;
  }

  // ====== PERFORMANCE METRICS ======
  
  async calculatePerformanceMetrics(organizationId: string, startDate: Date, endDate: Date) {
    // 1. Project Completion Rate
    const projectStats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${projects.status} = 'completed')`,
      })
      .from(projects)
      .where(and(
        eq(projects.organizationId, organizationId),
        gte(projects.createdAt, startDate),
        lte(projects.createdAt, endDate)
      ));

    const completionRate = projectStats[0]?.total > 0 
      ? (projectStats[0].completed / projectStats[0].total) * 100 
      : 0;

    // 2. Average Project Duration (days from creation to completion)
    const completedProjects = await db
      .select({
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(
        eq(projects.organizationId, organizationId),
        eq(projects.status, 'completed'),
        gte(projects.createdAt, startDate),
        lte(projects.createdAt, endDate)
      ));

    const avgDuration = completedProjects.length > 0
      ? completedProjects.reduce((sum, p) => {
          const duration = p.updatedAt && p.createdAt 
            ? (p.updatedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            : 0;
          return sum + duration;
        }, 0) / completedProjects.length
      : 0;

    // 3. Survey Efficiency (total openings surveyed)
    const openingsStats = await db
      .select({
        totalOpenings: sql<number>`COUNT(*)`,
        totalProjects: sql<number>`COUNT(DISTINCT ${doorOpenings.projectId})`,
      })
      .from(doorOpenings)
      .innerJoin(projects, eq(doorOpenings.projectId, projects.id))
      .where(and(
        eq(projects.organizationId, organizationId),
        gte(doorOpenings.createdAt, startDate),
        lte(doorOpenings.createdAt, endDate)
      ));

    const openingsPerProject = openingsStats[0]?.totalProjects > 0
      ? openingsStats[0].totalOpenings / openingsStats[0].totalProjects
      : 0;

    // 4. Cost Tracking (projects with cost data)
    const costStats = await db
      .select({
        projectsWithCosts: sql<number>`COUNT(DISTINCT ${projectCosts.projectId})`,
      })
      .from(projectCosts)
      .innerJoin(projects, eq(projectCosts.projectId, projects.id))
      .where(and(
        eq(projects.organizationId, organizationId),
        gte(projectCosts.createdAt, startDate),
        lte(projectCosts.createdAt, endDate)
      ));

    const projectsWithCosts = costStats[0]?.projectsWithCosts || 0;

    // 5. Active Users Count
    const activeUsers = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${memberships.userId})`,
      })
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId));

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      metrics: {
        projectCompletionRate: Math.round(completionRate * 10) / 10,
        avgProjectDuration: Math.round(avgDuration * 10) / 10,
        totalProjects: projectStats[0]?.total || 0,
        completedProjects: projectStats[0]?.completed || 0,
        totalOpenings: openingsStats[0]?.totalOpenings || 0,
        openingsPerProject: Math.round(openingsPerProject * 10) / 10,
        projectsWithCosts,
        activeUsers: activeUsers[0]?.count || 0,
      },
    };
  }

  async getPerformanceTrends(organizationId: string, metricName: string, periodType: 'daily' | 'weekly' | 'monthly', limit: number = 12) {
    return await db
      .select()
      .from(kpiAggregations)
      .where(and(
        eq(kpiAggregations.organizationId, organizationId),
        eq(kpiAggregations.kpiName, metricName),
        eq(kpiAggregations.periodType, periodType)
      ))
      .orderBy(desc(kpiAggregations.periodStart))
      .limit(limit);
  }

  async storePerformanceMetric(
    organizationId: string,
    kpiName: string,
    kpiCategory: string,
    value: number,
    periodType: 'daily' | 'weekly' | 'monthly',
    periodStart: Date,
    periodEnd: Date,
    metadata?: Record<string, any>
  ): Promise<KpiAggregation> {
    const [existing] = await db
      .select()
      .from(kpiAggregations)
      .where(and(
        eq(kpiAggregations.organizationId, organizationId),
        eq(kpiAggregations.kpiName, kpiName),
        eq(kpiAggregations.periodType, periodType),
        eq(kpiAggregations.periodStart, periodStart)
      ))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(kpiAggregations)
        .set({
          value,
          periodEnd,
          metadata,
          updatedAt: new Date(),
        })
        .where(eq(kpiAggregations.id, existing.id))
        .returning();
      return updated;
    } else {
      return await this.createKpiAggregation({
        organizationId,
        kpiName,
        kpiCategory,
        value,
        periodType,
        periodStart,
        periodEnd,
        metadata,
      });
    }
  }

  // ====== COMPETITIVE ANALYSIS ======
  
  // Competitors
  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const [newCompetitor] = await db
      .insert(competitors)
      .values(competitor)
      .returning();
    return newCompetitor;
  }

  async getCompetitors(organizationId: string): Promise<Competitor[]> {
    return await db
      .select()
      .from(competitors)
      .where(eq(competitors.organizationId, organizationId))
      .orderBy(desc(competitors.createdAt));
  }

  async getCompetitor(id: string, organizationId: string): Promise<Competitor | undefined> {
    const [competitor] = await db
      .select()
      .from(competitors)
      .where(and(
        eq(competitors.id, id),
        eq(competitors.organizationId, organizationId)
      ))
      .limit(1);
    return competitor;
  }

  async updateCompetitor(id: string, organizationId: string, updates: Partial<InsertCompetitor>): Promise<Competitor | undefined> {
    const [updated] = await db
      .update(competitors)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(competitors.id, id),
        eq(competitors.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteCompetitor(id: string, organizationId: string): Promise<boolean> {
    await db
      .delete(competitors)
      .where(and(
        eq(competitors.id, id),
        eq(competitors.organizationId, organizationId)
      ));
    return true;
  }

  // Competitor Products
  async createCompetitorProduct(product: InsertCompetitorProduct): Promise<CompetitorProduct> {
    const [newProduct] = await db
      .insert(competitorProducts)
      .values(product)
      .returning();
    return newProduct;
  }

  async getCompetitorProducts(competitorId: string, organizationId: string): Promise<CompetitorProduct[]> {
    return await db
      .select()
      .from(competitorProducts)
      .where(and(
        eq(competitorProducts.competitorId, competitorId),
        eq(competitorProducts.organizationId, organizationId)
      ))
      .orderBy(desc(competitorProducts.createdAt));
  }

  async updateCompetitorProduct(id: string, organizationId: string, updates: Partial<InsertCompetitorProduct>): Promise<CompetitorProduct | undefined> {
    const [updated] = await db
      .update(competitorProducts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(competitorProducts.id, id),
        eq(competitorProducts.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteCompetitorProduct(id: string, organizationId: string): Promise<boolean> {
    await db
      .delete(competitorProducts)
      .where(and(
        eq(competitorProducts.id, id),
        eq(competitorProducts.organizationId, organizationId)
      ));
    return true;
  }

  // Competitor Pricing
  async createCompetitorPricing(pricing: InsertCompetitorPricing): Promise<CompetitorPricing> {
    const [newPricing] = await db
      .insert(competitorPricing)
      .values(pricing)
      .returning();
    return newPricing;
  }

  async getCompetitorPricing(competitorId: string, organizationId: string, limit: number = 100): Promise<CompetitorPricing[]> {
    return await db
      .select()
      .from(competitorPricing)
      .where(and(
        eq(competitorPricing.competitorId, competitorId),
        eq(competitorPricing.organizationId, organizationId)
      ))
      .orderBy(desc(competitorPricing.effectiveDate))
      .limit(limit);
  }

  async getProductPricingHistory(productId: string, organizationId: string, limit: number = 50): Promise<CompetitorPricing[]> {
    return await db
      .select()
      .from(competitorPricing)
      .where(and(
        eq(competitorPricing.productId, productId),
        eq(competitorPricing.organizationId, organizationId)
      ))
      .orderBy(desc(competitorPricing.effectiveDate))
      .limit(limit);
  }

  // Project Competitors (Win/Loss Analysis)
  async createProjectCompetitor(projectCompetitor: InsertProjectCompetitor): Promise<ProjectCompetitor> {
    const [newEntry] = await db
      .insert(projectCompetitors)
      .values(projectCompetitor)
      .returning();
    return newEntry;
  }

  async getProjectCompetitors(projectId: string, organizationId: string): Promise<ProjectCompetitor[]> {
    return await db
      .select()
      .from(projectCompetitors)
      .where(and(
        eq(projectCompetitors.projectId, projectId),
        eq(projectCompetitors.organizationId, organizationId)
      ))
      .orderBy(desc(projectCompetitors.createdAt));
  }

  async getCompetitorProjects(competitorId: string, organizationId: string): Promise<ProjectCompetitor[]> {
    return await db
      .select()
      .from(projectCompetitors)
      .where(and(
        eq(projectCompetitors.competitorId, competitorId),
        eq(projectCompetitors.organizationId, organizationId)
      ))
      .orderBy(desc(projectCompetitors.createdAt));
  }

  async updateProjectCompetitor(id: string, organizationId: string, updates: Partial<InsertProjectCompetitor>): Promise<ProjectCompetitor | undefined> {
    const [updated] = await db
      .update(projectCompetitors)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(projectCompetitors.id, id),
        eq(projectCompetitors.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteProjectCompetitor(id: string, organizationId: string): Promise<boolean> {
    await db
      .delete(projectCompetitors)
      .where(and(
        eq(projectCompetitors.id, id),
        eq(projectCompetitors.organizationId, organizationId)
      ));
    return true;
  }

  // Win/Loss Analytics
  async getWinLossAnalytics(organizationId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(projectCompetitors.organizationId, organizationId)];
    
    if (startDate) {
      conditions.push(gte(projectCompetitors.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(projectCompetitors.createdAt, endDate));
    }

    const results = await db
      .select({
        totalBids: sql<number>`COUNT(*)`,
        won: sql<number>`COUNT(*) FILTER (WHERE ${projectCompetitors.outcome} = 'won')`,
        lost: sql<number>`COUNT(*) FILTER (WHERE ${projectCompetitors.outcome} = 'lost')`,
        ongoing: sql<number>`COUNT(*) FILTER (WHERE ${projectCompetitors.outcome} = 'ongoing')`,
        avgOurQuote: sql<number>`AVG(CAST(${projectCompetitors.ourQuoteAmount} AS NUMERIC))`,
        avgCompetitorQuote: sql<number>`AVG(CAST(${projectCompetitors.competitorQuoteAmount} AS NUMERIC))`,
      })
      .from(projectCompetitors)
      .where(and(...conditions));

    const analytics = results[0];
    
    return {
      totalBids: analytics?.totalBids || 0,
      won: analytics?.won || 0,
      lost: analytics?.lost || 0,
      ongoing: analytics?.ongoing || 0,
      winRate: analytics?.totalBids > 0 ? ((analytics.won / analytics.totalBids) * 100).toFixed(1) : "0.0",
      avgOurQuote: analytics?.avgOurQuote || 0,
      avgCompetitorQuote: analytics?.avgCompetitorQuote || 0,
    };
  }

  // ====== RECOMMENDATION ENGINE (Workstream 2) ======
  
  // Recommendation Rules
  async createRecommendationRule(rule: InsertRecommendationRule): Promise<RecommendationRule> {
    const [newRule] = await db.insert(recommendationRules).values(rule).returning();
    return newRule;
  }

  async getRecommendationRules(organizationId: string | null): Promise<RecommendationRule[]> {
    const conditions = organizationId
      ? [or(eq(recommendationRules.organizationId, organizationId), isNull(recommendationRules.organizationId))]
      : [isNull(recommendationRules.organizationId)];
    
    return await db.select().from(recommendationRules)
      .where(and(...conditions, eq(recommendationRules.isActive, "yes")))
      .orderBy(desc(recommendationRules.priority));
  }

  // Hardware Compatibility
  async createHardwareCompatibility(compat: InsertHardwareCompatibility): Promise<HardwareCompatibility> {
    const [newCompat] = await db.insert(hardwareCompatibility).values(compat).returning();
    return newCompat;
  }

  async getProductCompatibility(productId: string, organizationId: string): Promise<HardwareCompatibility[]> {
    return await db.select().from(hardwareCompatibility)
      .where(and(
        eq(hardwareCompatibility.productId, productId),
        or(eq(hardwareCompatibility.organizationId, organizationId), isNull(hardwareCompatibility.organizationId))
      ));
  }

  // Recommendation Logs
  async createRecommendationLog(log: InsertRecommendationLog): Promise<RecommendationLog> {
    const [newLog] = await db.insert(recommendationLogs).values(log).returning();
    return newLog;
  }

  async getRecommendationLogs(organizationId: string, openingId?: string): Promise<RecommendationLog[]> {
    const conditions = [eq(recommendationLogs.organizationId, organizationId)];
    if (openingId) {
      conditions.push(eq(recommendationLogs.openingId, openingId));
    }
    return await db.select().from(recommendationLogs)
      .where(and(...conditions))
      .orderBy(desc(recommendationLogs.createdAt));
  }

  async updateRecommendationFeedback(logId: string, feedback: { userSelection?: string; feedbackScore?: number; feedbackNotes?: string; wasAccepted?: string }): Promise<RecommendationLog | undefined> {
    const [updated] = await db.update(recommendationLogs)
      .set({ ...feedback, acceptedAt: new Date() })
      .where(eq(recommendationLogs.id, logId))
      .returning();
    return updated;
  }

  // ====== ROADMAP MANAGEMENT ======
  
  // Milestones
  async createRoadmapMilestone(milestone: InsertRoadmapMilestone): Promise<RoadmapMilestone> {
    const [newMilestone] = await db.insert(roadmapMilestones).values(milestone).returning();
    return newMilestone;
  }

  async getRoadmapMilestone(id: string, organizationId: string): Promise<RoadmapMilestone | undefined> {
    const [milestone] = await db.select().from(roadmapMilestones)
      .where(and(
        eq(roadmapMilestones.id, id),
        eq(roadmapMilestones.organizationId, organizationId)
      ));
    return milestone;
  }

  async getRoadmapMilestones(organizationId: string): Promise<RoadmapMilestone[]> {
    return await db.select().from(roadmapMilestones)
      .where(eq(roadmapMilestones.organizationId, organizationId))
      .orderBy(roadmapMilestones.quarter);
  }

  async updateRoadmapMilestone(id: string, organizationId: string, updates: Partial<InsertRoadmapMilestone>): Promise<RoadmapMilestone | undefined> {
    const [updated] = await db.update(roadmapMilestones)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(roadmapMilestones.id, id),
        eq(roadmapMilestones.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteRoadmapMilestone(id: string, organizationId: string): Promise<boolean> {
    const result = await db.delete(roadmapMilestones)
      .where(and(
        eq(roadmapMilestones.id, id),
        eq(roadmapMilestones.organizationId, organizationId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Tasks
  async createRoadmapTask(task: InsertRoadmapTask): Promise<RoadmapTask> {
    const [newTask] = await db.insert(roadmapTasks).values(task).returning();
    return newTask;
  }

  async getRoadmapTask(id: string, organizationId: string): Promise<RoadmapTask | undefined> {
    // SECURITY: Verify task belongs to organization via milestone
    const results = await db.select()
      .from(roadmapTasks)
      .innerJoin(roadmapMilestones, eq(roadmapTasks.milestoneId, roadmapMilestones.id))
      .where(and(
        eq(roadmapTasks.id, id),
        eq(roadmapMilestones.organizationId, organizationId)
      ));
    return results.length > 0 ? results[0].roadmap_tasks : undefined;
  }

  async getRoadmapTasksByMilestone(milestoneId: string, organizationId: string): Promise<RoadmapTask[]> {
    // SECURITY: Verify milestone belongs to organization
    const results = await db.select()
      .from(roadmapTasks)
      .innerJoin(roadmapMilestones, eq(roadmapTasks.milestoneId, roadmapMilestones.id))
      .where(and(
        eq(roadmapTasks.milestoneId, milestoneId),
        eq(roadmapMilestones.organizationId, organizationId)
      ))
      .orderBy(roadmapTasks.taskId);
    return results.map(r => r.roadmap_tasks);
  }

  async getRoadmapTasksByOrganization(organizationId: string): Promise<RoadmapTask[]> {
    return await db.select()
      .from(roadmapTasks)
      .innerJoin(roadmapMilestones, eq(roadmapTasks.milestoneId, roadmapMilestones.id))
      .where(eq(roadmapMilestones.organizationId, organizationId))
      .then(results => results.map(r => r.roadmap_tasks));
  }

  async updateRoadmapTask(id: string, organizationId: string, updates: Partial<InsertRoadmapTask>): Promise<RoadmapTask | undefined> {
    // SECURITY: Verify task belongs to organization before updating
    const task = await this.getRoadmapTask(id, organizationId);
    if (!task) {
      return undefined;
    }
    
    const [updated] = await db.update(roadmapTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roadmapTasks.id, id))
      .returning();
    return updated;
  }

  async deleteRoadmapTask(id: string, organizationId: string): Promise<boolean> {
    // SECURITY: Verify task belongs to organization before deleting
    const task = await this.getRoadmapTask(id, organizationId);
    if (!task) {
      return false;
    }
    
    const result = await db.delete(roadmapTasks)
      .where(eq(roadmapTasks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Bulk import from JSON
  async importRoadmapFromJSON(jsonData: any, organizationId: string): Promise<{ milestones: number; tasks: number }> {
    let milestonesCount = 0;
    let tasksCount = 0;

    // Import milestones and tasks
    for (const milestone of jsonData.milestones || []) {
      // Create milestone
      const [newMilestone] = await db.insert(roadmapMilestones).values({
        organizationId,
        quarter: milestone.quarter,
        theme: milestone.theme,
        status: 'planned',
      }).returning();
      milestonesCount++;

      // Create tasks for this milestone
      for (const task of milestone.tasks || []) {
        await db.insert(roadmapTasks).values({
          milestoneId: newMilestone.id,
          taskId: task.id,
          category: task.category,
          title: task.title,
          priority: task.priority,
          durationWeeks: task.duration_weeks || task.durationWeeks,
          status: 'not_started',
        });
        tasksCount++;
      }
    }

    return { milestones: milestonesCount, tasks: tasksCount };
  }

  // ============================================================================
  // API KEYS & WEBHOOKS (Phase 6: Integrations & Ecosystem)
  // ============================================================================

  async createApiKey(apiKey: InsertApiKey, keyHash: string, keyPrefix: string): Promise<ApiKey> {
    const [newKey] = await db.insert(apiKeys).values({
      ...apiKey,
      keyHash,
      keyPrefix,
    }).returning();
    return newKey;
  }

  async getApiKey(id: string, organizationId: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.id, id),
        eq(apiKeys.organizationId, organizationId)
      ))
      .limit(1);
    return key;
  }

  async getApiKeys(organizationId: string): Promise<ApiKey[]> {
    return db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, organizationId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async updateApiKey(id: string, organizationId: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    // SECURITY: Verify key belongs to organization before updating
    const existing = await this.getApiKey(id, organizationId);
    if (!existing) {
      return undefined;
    }

    const [updated] = await db.update(apiKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return updated;
  }

  async revokeApiKey(id: string, organizationId: string, revokedBy: string, reason?: string): Promise<ApiKey | undefined> {
    // SECURITY: Verify key belongs to organization before revoking
    const existing = await this.getApiKey(id, organizationId);
    if (!existing) {
      return undefined;
    }

    const [revoked] = await db.update(apiKeys)
      .set({
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();
    return revoked;
  }

  async deleteApiKey(id: string, organizationId: string): Promise<boolean> {
    // SECURITY: Verify key belongs to organization before deleting
    const existing = await this.getApiKey(id, organizationId);
    if (!existing) {
      return false;
    }

    const result = await db.delete(apiKeys)
      .where(eq(apiKeys.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Webhooks
  async createWebhook(webhook: InsertWebhook, secret: string): Promise<Webhook> {
    // SECURITY: Encrypt webhook secret at rest
    const { encryptSecret } = await import("./utils/encryption");
    const encryptedSecret = encryptSecret(secret);
    
    const [newWebhook] = await db.insert(webhooks).values({
      ...webhook,
      secret: encryptedSecret,
    }).returning();
    return newWebhook;
  }

  async getWebhook(id: string, organizationId: string): Promise<Webhook | undefined> {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(
        eq(webhooks.id, id),
        eq(webhooks.organizationId, organizationId)
      ))
      .limit(1);
    return webhook;
  }

  async getWebhooks(organizationId: string): Promise<Webhook[]> {
    return db
      .select()
      .from(webhooks)
      .where(eq(webhooks.organizationId, organizationId))
      .orderBy(desc(webhooks.createdAt));
  }

  async updateWebhook(id: string, organizationId: string, updates: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    // SECURITY: Verify webhook belongs to organization before updating
    const existing = await this.getWebhook(id, organizationId);
    if (!existing) {
      return undefined;
    }

    const [updated] = await db.update(webhooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning();
    return updated;
  }

  async updateWebhookStats(
    id: string,
    stats: {
      lastTriggeredAt?: Date;
      successCount?: number;
      failureCount?: number;
      lastSuccess?: Date | null;
      lastFailure?: Date | null;
      lastFailureReason?: string | null;
    }
  ): Promise<Webhook | undefined> {
    const [updated] = await db.update(webhooks)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning();
    return updated;
  }

  async deleteWebhook(id: string, organizationId: string): Promise<boolean> {
    // SECURITY: Verify webhook belongs to organization before deleting
    const existing = await this.getWebhook(id, organizationId);
    if (!existing) {
      return false;
    }

    const result = await db.delete(webhooks)
      .where(eq(webhooks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // INVITATION TOKENS (Beta Tester Invitations)
  // ============================================================================

  async createInvitationToken(tokenData: InsertInvitationToken): Promise<InvitationToken> {
    const [token] = await db.insert(invitationTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getInvitationToken(id: string): Promise<InvitationToken | undefined> {
    const [token] = await db.select()
      .from(invitationTokens)
      .where(eq(invitationTokens.id, id))
      .limit(1);
    return token;
  }

  async getInvitationTokenByToken(token: string): Promise<InvitationToken | undefined> {
    const [result] = await db.select()
      .from(invitationTokens)
      .where(eq(invitationTokens.token, token))
      .limit(1);
    return result;
  }

  async getInvitationTokens(): Promise<InvitationToken[]> {
    return await db.select()
      .from(invitationTokens)
      .orderBy(desc(invitationTokens.createdAt));
  }

  async consumeInvitationToken(token: string, userId: string, email?: string | null): Promise<InvitationToken | undefined> {
    return consumeInvitation(token, userId, email);
  }

  async revokeInvitationToken(id: string): Promise<boolean> {
    const result = await db.update(invitationTokens)
      .set({ status: "revoked" })
      .where(eq(invitationTokens.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // VERSIONING SYSTEM
  // ============================================================================

  // Versioned Entity operations
  async createVersionedEntity(entity: InsertVersionedEntity): Promise<VersionedEntity> {
    const [created] = await db.insert(versionedEntities)
      .values(entity)
      .returning();
    return created;
  }

  async getVersionedEntity(id: string, organizationId: string): Promise<VersionedEntity | undefined> {
    const [entity] = await db.select()
      .from(versionedEntities)
      .where(and(
        eq(versionedEntities.id, id),
        eq(versionedEntities.organizationId, organizationId)
      ))
      .limit(1);
    return entity;
  }

  async getVersionedEntityByEntityRef(
    entityType: VersionableEntityType,
    entityId: string,
    organizationId: string
  ): Promise<VersionedEntity | undefined> {
    const [entity] = await db.select()
      .from(versionedEntities)
      .where(and(
        eq(versionedEntities.entityType, entityType),
        eq(versionedEntities.entityId, entityId),
        eq(versionedEntities.organizationId, organizationId)
      ))
      .limit(1);
    return entity;
  }

  async updateVersionedEntityCurrentVersion(id: string, currentVersionId: string): Promise<VersionedEntity> {
    const [updated] = await db.update(versionedEntities)
      .set({ currentVersionId })
      .where(eq(versionedEntities.id, id))
      .returning();
    return updated;
  }

  // Entity Version operations
  async createEntityVersion(version: InsertEntityVersion): Promise<EntityVersion> {
    const [created] = await db.insert(entityVersions)
      .values(version)
      .returning();
    return created;
  }

  async getEntityVersion(id: string): Promise<EntityVersion | undefined> {
    const [version] = await db.select()
      .from(entityVersions)
      .where(eq(entityVersions.id, id))
      .limit(1);
    return version;
  }

  async getVersionHistory(versionedEntityId: string, limit?: number, offset?: number): Promise<EntityVersion[]> {
    let query = db.select()
      .from(entityVersions)
      .where(eq(entityVersions.versionedEntityId, versionedEntityId))
      .orderBy(desc(entityVersions.versionNumber));
    
    if (limit !== undefined) {
      query = query.limit(limit) as typeof query;
    }
    if (offset !== undefined) {
      query = query.offset(offset) as typeof query;
    }
    
    return query;
  }

  async getLatestVersion(versionedEntityId: string): Promise<EntityVersion | undefined> {
    const [latest] = await db.select()
      .from(entityVersions)
      .where(eq(entityVersions.versionedEntityId, versionedEntityId))
      .orderBy(desc(entityVersions.versionNumber))
      .limit(1);
    return latest;
  }

  async compareVersions(versionId1: string, versionId2: string): Promise<{ version1: EntityVersion; version2: EntityVersion } | undefined> {
    const versions = await db.select()
      .from(entityVersions)
      .where(
        or(
          eq(entityVersions.id, versionId1),
          eq(entityVersions.id, versionId2)
        )
      );
    
    const version1 = versions.find(v => v.id === versionId1);
    const version2 = versions.find(v => v.id === versionId2);
    
    if (!version1 || !version2) {
      return undefined;
    }
    
    return { version1, version2 };
  }

  // Revision Mark operations
  async createRevisionMarks(marks: InsertRevisionMark[]): Promise<RevisionMark[]> {
    if (marks.length === 0) {
      return [];
    }
    
    const created = await db.insert(revisionMarks)
      .values(marks)
      .returning();
    return created;
  }

  async getRevisionMarks(entityVersionId: string): Promise<RevisionMark[]> {
    return db.select()
      .from(revisionMarks)
      .where(eq(revisionMarks.entityVersionId, entityVersionId));
  }

  async getRevisionMarksByCategory(entityVersionId: string, category: string): Promise<RevisionMark[]> {
    return db.select()
      .from(revisionMarks)
      .where(and(
        eq(revisionMarks.entityVersionId, entityVersionId),
        eq(revisionMarks.category, category)
      ));
  }

  async deleteRevisionMarks(entityVersionId: string): Promise<boolean> {
    const result = await db.delete(revisionMarks)
      .where(eq(revisionMarks.entityVersionId, entityVersionId));
    return result.rowCount !== null && result.rowCount >= 0;
  }

  // ============================================================================
  // PROJECT MANAGEMENT - Project Assignments
  // ============================================================================

  async createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [created] = await db.insert(projectAssignments)
      .values(assignment)
      .returning();
    return created;
  }

  async getProjectAssignment(id: string, organizationId: string): Promise<ProjectAssignment | undefined> {
    const [assignment] = await db.select()
      .from(projectAssignments)
      .where(and(
        eq(projectAssignments.id, id),
        eq(projectAssignments.organizationId, organizationId)
      ))
      .limit(1);
    return assignment;
  }

  async getProjectAssignmentByProjectId(projectId: string, organizationId: string): Promise<ProjectAssignment | undefined> {
    const [assignment] = await db.select()
      .from(projectAssignments)
      .where(and(
        eq(projectAssignments.projectId, projectId),
        eq(projectAssignments.organizationId, organizationId)
      ))
      .limit(1);
    return assignment;
  }

  async listProjectAssignments(organizationId: string): Promise<ProjectAssignment[]> {
    return db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.organizationId, organizationId))
      .orderBy(desc(projectAssignments.createdAt));
  }

  async updateProjectAssignment(id: string, organizationId: string, updates: Partial<InsertProjectAssignment>): Promise<ProjectAssignment | undefined> {
    const existing = await this.getProjectAssignment(id, organizationId);
    if (!existing) {
      return undefined;
    }

    const [updated] = await db.update(projectAssignments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectAssignments.id, id))
      .returning();
    return updated;
  }

  async deleteProjectAssignment(id: string, organizationId: string): Promise<boolean> {
    const existing = await this.getProjectAssignment(id, organizationId);
    if (!existing) {
      return false;
    }

    const result = await db.delete(projectAssignments)
      .where(eq(projectAssignments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // PROJECT MANAGEMENT - Procurement Items
  // ============================================================================

  async createProcurementItem(item: InsertProcurementItem): Promise<ProcurementItem> {
    const [created] = await db.insert(procurementItems)
      .values(item)
      .returning();
    return created;
  }

  async getProcurementItem(id: string, organizationId: string): Promise<ProcurementItem | undefined> {
    const [item] = await db.select()
      .from(procurementItems)
      .where(and(
        eq(procurementItems.id, id),
        eq(procurementItems.organizationId, organizationId)
      ))
      .limit(1);
    return item;
  }

  async listProcurementItems(organizationId: string): Promise<ProcurementItem[]> {
    return db.select()
      .from(procurementItems)
      .where(eq(procurementItems.organizationId, organizationId))
      .orderBy(desc(procurementItems.createdAt));
  }

  async listProcurementItemsByProject(projectId: string, organizationId: string): Promise<ProcurementItem[]> {
    return db.select()
      .from(procurementItems)
      .where(and(
        eq(procurementItems.projectId, projectId),
        eq(procurementItems.organizationId, organizationId)
      ))
      .orderBy(desc(procurementItems.createdAt));
  }

  async updateProcurementItem(id: string, organizationId: string, updates: Partial<InsertProcurementItem>): Promise<ProcurementItem | undefined> {
    const existing = await this.getProcurementItem(id, organizationId);
    if (!existing) {
      return undefined;
    }

    const [updated] = await db.update(procurementItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(procurementItems.id, id))
      .returning();
    return updated;
  }

  async deleteProcurementItem(id: string, organizationId: string): Promise<boolean> {
    const existing = await this.getProcurementItem(id, organizationId);
    if (!existing) {
      return false;
    }

    const result = await db.delete(procurementItems)
      .where(eq(procurementItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // PROJECT MANAGEMENT - Project Issues
  // ============================================================================

  async createProjectIssue(issue: InsertProjectIssue): Promise<ProjectIssue> {
    const [created] = await db.insert(projectIssues)
      .values(issue)
      .returning();
    return created;
  }

  async getProjectIssue(id: string, organizationId: string): Promise<ProjectIssue | undefined> {
    const [issue] = await db.select()
      .from(projectIssues)
      .where(and(
        eq(projectIssues.id, id),
        eq(projectIssues.organizationId, organizationId)
      ))
      .limit(1);
    return issue;
  }

  async listProjectIssues(organizationId: string): Promise<ProjectIssue[]> {
    return db.select()
      .from(projectIssues)
      .where(eq(projectIssues.organizationId, organizationId))
      .orderBy(desc(projectIssues.createdAt));
  }

  async listProjectIssuesByProject(projectId: string, organizationId: string): Promise<ProjectIssue[]> {
    return db.select()
      .from(projectIssues)
      .where(and(
        eq(projectIssues.projectId, projectId),
        eq(projectIssues.organizationId, organizationId)
      ))
      .orderBy(desc(projectIssues.createdAt));
  }

  async updateProjectIssue(id: string, organizationId: string, updates: Partial<InsertProjectIssue>): Promise<ProjectIssue | undefined> {
    const existing = await this.getProjectIssue(id, organizationId);
    if (!existing) {
      return undefined;
    }

    const [updated] = await db.update(projectIssues)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectIssues.id, id))
      .returning();
    return updated;
  }

  async deleteProjectIssue(id: string, organizationId: string): Promise<boolean> {
    const existing = await this.getProjectIssue(id, organizationId);
    if (!existing) {
      return false;
    }

    const result = await db.delete(projectIssues)
      .where(eq(projectIssues.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // PROJECT MANAGEMENT - Project Milestones
  // ============================================================================

  async createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone> {
    const [created] = await db.insert(projectMilestones)
      .values(milestone)
      .returning();
    return created;
  }

  async getProjectMilestone(id: string, organizationId: string): Promise<ProjectMilestone | undefined> {
    const [milestone] = await db.select()
      .from(projectMilestones)
      .where(and(
        eq(projectMilestones.id, id),
        eq(projectMilestones.organizationId, organizationId)
      ))
      .limit(1);
    return milestone;
  }

  async listProjectMilestones(organizationId: string): Promise<ProjectMilestone[]> {
    return db.select()
      .from(projectMilestones)
      .where(eq(projectMilestones.organizationId, organizationId))
      .orderBy(asc(projectMilestones.sequenceOrder));
  }

  async listProjectMilestonesByProject(projectId: string, organizationId: string): Promise<ProjectMilestone[]> {
    return db.select()
      .from(projectMilestones)
      .where(and(
        eq(projectMilestones.projectId, projectId),
        eq(projectMilestones.organizationId, organizationId)
      ))
      .orderBy(asc(projectMilestones.sequenceOrder));
  }

  async updateProjectMilestone(id: string, organizationId: string, updates: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined> {
    const existing = await this.getProjectMilestone(id, organizationId);
    if (!existing) {
      return undefined;
    }

    const [updated] = await db.update(projectMilestones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectMilestones.id, id))
      .returning();
    return updated;
  }

  async deleteProjectMilestone(id: string, organizationId: string): Promise<boolean> {
    const existing = await this.getProjectMilestone(id, organizationId);
    if (!existing) {
      return false;
    }

    const result = await db.delete(projectMilestones)
      .where(eq(projectMilestones.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getProjectTeamMembers(projectId: string): Promise<User[]> {
    const assignments = await db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId));
    
    if (assignments.length === 0) return [];
    
    const userIds = assignments.map(a => a.userId).filter((id): id is string => id !== null);
    if (userIds.length === 0) return [];

    return db.select()
      .from(users)
      .where(inArray(users.id, userIds));
  }

  // ============================================================================
  // PROJECT MANAGEMENT - Manufacturer Order Forms
  // ============================================================================

  async createManufacturerOrderForm(form: InsertManufacturerOrderForm): Promise<ManufacturerOrderForm> {
    const [created] = await db.insert(manufacturerOrderForms)
      .values(form)
      .returning();
    return created;
  }

  async getManufacturerOrderForm(id: string, organizationId: string): Promise<ManufacturerOrderForm | undefined> {
    const [form] = await db.select()
      .from(manufacturerOrderForms)
      .where(and(
        eq(manufacturerOrderForms.id, id),
        eq(manufacturerOrderForms.organizationId, organizationId)
      ))
      .limit(1);
    return form;
  }

  async listManufacturerOrderForms(organizationId: string): Promise<ManufacturerOrderForm[]> {
    return db.select()
      .from(manufacturerOrderForms)
      .where(eq(manufacturerOrderForms.organizationId, organizationId))
      .orderBy(desc(manufacturerOrderForms.createdAt));
  }

  async listManufacturerOrderFormsByProject(projectId: string, organizationId: string): Promise<ManufacturerOrderForm[]> {
    return db.select()
      .from(manufacturerOrderForms)
      .where(and(
        eq(manufacturerOrderForms.projectId, projectId),
        eq(manufacturerOrderForms.organizationId, organizationId)
      ))
      .orderBy(desc(manufacturerOrderForms.createdAt));
  }

  async updateManufacturerOrderForm(id: string, organizationId: string, updates: Partial<InsertManufacturerOrderForm>): Promise<ManufacturerOrderForm | undefined> {
    const existing = await this.getManufacturerOrderForm(id, organizationId);
    if (!existing) {
      return undefined;
    }

    const [updated] = await db.update(manufacturerOrderForms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(manufacturerOrderForms.id, id))
      .returning();
    return updated;
  }

  async deleteManufacturerOrderForm(id: string, organizationId: string): Promise<boolean> {
    const existing = await this.getManufacturerOrderForm(id, organizationId);
    if (!existing) {
      return false;
    }

    const result = await db.delete(manufacturerOrderForms)
      .where(eq(manufacturerOrderForms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================================================
  // PROJECT MANAGEMENT - PM Analytics Summary
  // ============================================================================

  async getPMAnalyticsSummary(projectManagerId: string, organizationId: string): Promise<PMAnalyticsSummary | undefined> {
    const [summary] = await db.select()
      .from(pmAnalyticsSummary)
      .where(and(
        eq(pmAnalyticsSummary.projectManagerId, projectManagerId),
        eq(pmAnalyticsSummary.organizationId, organizationId)
      ))
      .limit(1);
    return summary;
  }

  async upsertPMAnalyticsSummary(summary: InsertPMAnalyticsSummary): Promise<PMAnalyticsSummary> {
    const existing = await this.getPMAnalyticsSummary(summary.projectManagerId, summary.organizationId);
    
    if (existing) {
      const [updated] = await db.update(pmAnalyticsSummary)
        .set({ ...summary, calculatedAt: new Date() })
        .where(eq(pmAnalyticsSummary.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(pmAnalyticsSummary)
      .values(summary)
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
export { db };
