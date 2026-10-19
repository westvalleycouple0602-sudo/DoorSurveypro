import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, serial, real, integer, boolean, index, uniqueIndex, vector } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// DOMAIN SCHEMA IMPORTS
// ============================================================================
// Re-export all domain schemas for backward compatibility
export * from "./schemas/auth.schema";
export * from "./schemas/projects.schema";
export * from "./schemas/catalog.schema";
export * from "./schemas/portal.schema";

// Import for local use
import { organizations, users, type MembershipRole } from "./schemas/auth.schema";
import { projects, doorOpenings } from "./schemas/projects.schema";

// ============================================================================
// ROLE EXTENSIONS (extends auth.schema.ts definitions)
// ============================================================================
// MEMBERSHIP_ROLES, MembershipRole, memberships, insertMembershipSchema are
// exported from auth.schema.ts. The following are extended utilities.

// Role hierarchy for permission checking (higher number = more permissions)
export const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  owner: 100,
  admin: 80,
  pm_manager: 75,
  manager: 60,
  project_manager: 55,
  engineer: 50,
  sales_rep: 45,
  procurement_officer: 45,
  technician: 40,
  viewer: 10,
};

// Role presets for different business sizes
export const BUSINESS_SIZE_PRESETS = {
  SOLO: {
    label: "Solo Operator",
    description: "One person handling all responsibilities",
    defaultRoles: ["owner", "admin", "project_manager", "engineer", "sales_rep", "technician"] as MembershipRole[],
  },
  SMALL: {
    label: "Small Business",
    description: "2-10 employees with shared responsibilities",
    defaultRoles: ["project_manager", "engineer", "technician"] as MembershipRole[],
  },
  MEDIUM: {
    label: "Medium Business",
    description: "10-50 employees with specialized roles",
    defaultRoles: ["project_manager"] as MembershipRole[],
  },
  LARGE: {
    label: "Large Corporation",
    description: "50+ employees with dedicated departments",
    defaultRoles: ["technician"] as MembershipRole[],
  },
} as const;

// Role descriptions for UI display
export const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  owner: "Full organization control and billing access",
  admin: "Manage users, settings, and organization configuration",
  pm_manager: "Oversight of all project managers with analytics",
  manager: "Approve quotes, manage projects and team",
  project_manager: "Manage projects, procurement, and work assignments",
  engineer: "Review and approve engineering specifications",
  sales_rep: "Handle sales pipeline and proposal delivery",
  procurement_officer: "Manage purchasing and vendor relationships",
  technician: "Conduct field surveys and site assessments",
  viewer: "Read-only access to projects and data",
};

// User Integrations - Personal API credentials for external services
export const userIntegrations = pgTable("user_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  service: varchar("service").notNull(), // jira, confluence, notion
  // Jira/Confluence fields (Atlassian)
  atlassianDomain: text("atlassian_domain"), // e.g., "yourcompany.atlassian.net"
  atlassianEmail: text("atlassian_email"), // User's Atlassian email
  atlassianApiToken: text("atlassian_api_token"), // API token
  // Notion fields
  notionApiKey: text("notion_api_key"), // Notion integration token
  notionDatabaseId: text("notion_database_id"), // Target database ID for projects
  // Common fields
  isActive: text("is_active").notNull().default("yes"), // yes, no
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserIntegrationSchema = createInsertSchema(userIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  service: z.enum(["jira", "confluence", "notion"]),
  isActive: z.enum(["yes", "no"]).default("yes"),
});

export type InsertUserIntegration = z.infer<typeof insertUserIntegrationSchema>;
export type UserIntegration = typeof userIntegrations.$inferSelect;

// Integration Credentials - OAuth tokens for organization-level integrations (QuickBooks, DocuSign, etc.)
// SECURITY: Tokens should be encrypted at rest using application-level encryption
export const integrationCredentials = pgTable("integration_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  service: varchar("service").notNull(), // quickbooks, docusign, slack, google_drive, dropbox, etc.
  // OAuth tokens (should be encrypted at application layer before storage)
  accessToken: text("access_token"), // Encrypted OAuth access token
  refreshToken: text("refresh_token"), // Encrypted OAuth refresh token
  expiresAt: timestamp("expires_at"), // When access token expires
  // Service-specific metadata
  metadata: jsonb("metadata"), // Service-specific data (e.g., realmId for QuickBooks, accountId for DocuSign)
  // Status
  isActive: text("is_active").notNull().default("yes"), // yes, no
  lastSyncedAt: timestamp("last_synced_at"), // Last successful sync/API call
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_integration_credentials_organization_id").on(table.organizationId),
  index("IDX_integration_credentials_service").on(table.service),
]);

export const insertIntegrationCredentialSchema = createInsertSchema(integrationCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  service: z.enum(["quickbooks", "docusign", "slack", "google_drive", "dropbox", "sendgrid", "twilio"]),
  isActive: z.enum(["yes", "no"]).default("yes"),
});

export type InsertIntegrationCredential = z.infer<typeof insertIntegrationCredentialSchema>;
export type IntegrationCredential = typeof integrationCredentials.$inferSelect;

// HubSpot Sync Links - Track bidirectional mappings between local objects and HubSpot CRM objects
// Enables duplicate prevention, update operations, conflict detection, and sync monitoring
export const hubspotSyncLinks = pgTable("hubspot_sync_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  // Local object reference
  localObjectType: varchar("local_object_type", { length: 64 }).notNull(), // "project", "contact", "quote", "opening"
  localObjectId: varchar("local_object_id", { length: 128 }).notNull(), // UUID of local object
  // HubSpot object reference
  hubspotObjectType: varchar("hubspot_object_type", { length: 64 }).notNull(), // "deal", "contact", "company", "note"
  hubspotObjectId: varchar("hubspot_object_id", { length: 64 }).notNull(), // HubSpot CRM object ID
  // Sync metadata
  syncDirection: varchar("sync_direction", { length: 32 }).notNull().default("push"), // "push", "pull", "bidirectional"
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default("synced"), // "pending", "synced", "failed", "conflict"
  lastSyncAt: timestamp("last_sync_at"),
  lastAttemptAt: timestamp("last_attempt_at"),
  lastError: text("last_error"), // Error message from last failed attempt
  // Conflict detection
  lastEtag: varchar("last_etag", { length: 256 }), // HubSpot ETag for change detection
  metadata: jsonb("metadata"), // Flexible storage: lastKnownHash, conflictResolution, etc.
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint: one HubSpot object per local object per org
  uniqueIndex("UQ_hubspot_sync_links_local").on(table.organizationId, table.localObjectType, table.localObjectId),
  // Unique constraint: one local object per HubSpot object per org (prevent duplicates)
  uniqueIndex("UQ_hubspot_sync_links_hubspot").on(table.organizationId, table.hubspotObjectType, table.hubspotObjectId),
  // Query by organization for monitoring
  index("IDX_hubspot_sync_links_organization").on(table.organizationId),
  // Partial index for failed syncs needing retry (only pending/failed statuses)
  index("IDX_hubspot_sync_links_pending").on(table.organizationId, table.syncStatus, table.lastAttemptAt).where(sql`${table.syncStatus} IN ('pending', 'failed')`),
]);

export const insertHubSpotSyncLinkSchema = createInsertSchema(hubspotSyncLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  localObjectType: z.enum(["project", "contact", "quote", "opening"]),
  hubspotObjectType: z.enum(["deal", "contact", "company", "note"]),
  syncDirection: z.enum(["push", "pull", "bidirectional"]).default("push"),
  syncStatus: z.enum(["pending", "synced", "failed", "conflict"]).default("synced"),
});

export type InsertHubSpotSyncLink = z.infer<typeof insertHubSpotSyncLinkSchema>;
export type HubSpotSyncLink = typeof hubspotSyncLinks.$inferSelect;

// HubSpot Sync Events - Audit log of all sync attempts for monitoring and debugging
// Separate from links table to maintain current state while preserving history
export const hubspotSyncEvents = pgTable("hubspot_sync_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkId: varchar("link_id").references(() => hubspotSyncLinks.id, { onDelete: "set null" }), // Nullable for pre-link creation events
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  // Event details
  eventType: varchar("event_type", { length: 64 }).notNull(), // "create", "update", "delete", "conflict"
  syncDirection: varchar("sync_direction", { length: 32 }).notNull(), // "push", "pull"
  outcome: varchar("outcome", { length: 32 }).notNull(), // "success", "failure", "conflict"
  // Object references
  localObjectType: varchar("local_object_type", { length: 64 }).notNull(),
  localObjectId: varchar("local_object_id", { length: 128 }).notNull(),
  hubspotObjectType: varchar("hubspot_object_type", { length: 64 }),
  hubspotObjectId: varchar("hubspot_object_id", { length: 64 }),
  // Error tracking
  errorCode: varchar("error_code", { length: 64 }), // e.g., "RATE_LIMIT", "INVALID_TOKEN", "CONFLICT"
  errorMessage: text("error_message"),
  // Change tracking
  diffSnapshot: jsonb("diff_snapshot"), // Changed fields for audit trail
  metadata: jsonb("metadata"), // Additional context
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_hubspot_sync_events_link").on(table.linkId),
  index("IDX_hubspot_sync_events_organization").on(table.organizationId),
  index("IDX_hubspot_sync_events_outcome").on(table.outcome, table.createdAt),
  index("IDX_hubspot_sync_events_local").on(table.localObjectType, table.localObjectId),
]);

export const insertHubSpotSyncEventSchema = createInsertSchema(hubspotSyncEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  eventType: z.enum(["create", "update", "delete", "conflict"]),
  syncDirection: z.enum(["push", "pull"]),
  outcome: z.enum(["success", "failure", "conflict"]),
  localObjectType: z.enum(["project", "contact", "quote", "opening"]),
  hubspotObjectType: z.enum(["deal", "contact", "company", "note"]).optional(),
});

export type InsertHubSpotSyncEvent = z.infer<typeof insertHubSpotSyncEventSchema>;
export type HubSpotSyncEvent = typeof hubspotSyncEvents.$inferSelect;

// Background Jobs - Track status of BullMQ background jobs for user visibility
export const backgroundJobs = pgTable("background_jobs", {
  id: varchar("id").primaryKey(), // BullMQ job ID
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // User who initiated the job
  jobType: varchar("job_type").notNull(), // hubspot_sync, quickbooks_export, pdf_generation, email_send, etc.
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed
  progress: integer("progress").notNull().default(0), // 0-100 percentage
  // Job data
  inputData: jsonb("input_data"), // Original job parameters
  result: jsonb("result"), // Job output/result data
  error: text("error"), // Error message if failed
  errorStack: text("error_stack"), // Full error stack trace for debugging
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_background_jobs_organization_id").on(table.organizationId),
  index("IDX_background_jobs_user_id").on(table.userId),
  index("IDX_background_jobs_status").on(table.status),
  index("IDX_background_jobs_job_type").on(table.jobType),
]);

export const insertBackgroundJobSchema = createInsertSchema(backgroundJobs).omit({
  createdAt: true,
}).extend({
  status: z.enum(["pending", "processing", "completed", "failed"]).default("pending"),
  jobType: z.string().min(1),
});

export type InsertBackgroundJob = z.infer<typeof insertBackgroundJobSchema>;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;

// Notification Preferences - User preferences for email, SMS, Slack notifications
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel: varchar("channel").notNull(), // email, sms, slack, in_app
  eventType: varchar("event_type").notNull(), // quote_approved, quote_sent, project_updated, compliance_violation, etc.
  isEnabled: text("is_enabled").notNull().default("yes"), // yes, no
  // Channel-specific settings
  settings: jsonb("settings"), // e.g., { "slack_channel": "#quotes", "email_digest": "daily" }
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_notification_preferences_user_id").on(table.userId),
  index("IDX_notification_preferences_channel").on(table.channel),
]);

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  channel: z.enum(["email", "sms", "slack", "in_app"]),
  eventType: z.string().min(1),
  isEnabled: z.enum(["yes", "no"]).default("yes"),
});

export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

// User Onboarding - Track onboarding progress for new users
export const userOnboarding = pgTable("user_onboarding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  
  // Onboarding steps completion
  hasSeenWelcome: text("has_seen_welcome").notNull().default("no"), // yes, no
  hasCreatedOrganization: text("has_created_organization").notNull().default("no"),
  hasCreatedProject: text("has_created_project").notNull().default("no"),
  hasAddedDoorOpening: text("has_added_door_opening").notNull().default("no"),
  hasUploadedPhoto: text("has_uploaded_photo").notNull().default("no"),
  hasGeneratedQuote: text("has_generated_quote").notNull().default("no"),
  hasDismissedTour: text("has_dismissed_tour").notNull().default("no"),
  
  // Feature discovery
  hasViewedCatalog: text("has_viewed_catalog").notNull().default("no"),
  hasUsedAiFeature: text("has_used_ai_feature").notNull().default("no"),
  hasViewedDashboard: text("has_viewed_dashboard").notNull().default("no"),
  
  // Metadata
  completedStepsCount: integer("completed_steps_count").notNull().default(0),
  lastStepCompletedAt: timestamp("last_step_completed_at"),
  tourDismissedAt: timestamp("tour_dismissed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserOnboardingSchema = createInsertSchema(userOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserOnboarding = z.infer<typeof insertUserOnboardingSchema>;
export type UserOnboarding = typeof userOnboarding.$inferSelect;

// ============================================================================
// API KEYS & DEVELOPER ACCESS (Phase 6: Integrations & Ecosystem)
// ============================================================================

// API Keys - Secure API keys for third-party integrations
// SECURITY: API keys are stored as SHA-256 hashes. Plain text keys are only shown once at creation.
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Key identification
  name: text("name").notNull(), // User-friendly name for the key (e.g., "QuickBooks Integration")
  keyHash: text("key_hash").notNull().unique(), // SHA-256 hash of the API key (for verification)
  keyPrefix: varchar("key_prefix", { length: 8 }).notNull(), // First 8 chars of key for identification (e.g., "sk_live_")
  
  // Permissions - Granular scopes for different resources
  scopes: jsonb("scopes").notNull().default(sql`'[]'::jsonb`), // Array of permission scopes
  // Possible scopes: "projects:read", "projects:write", "openings:read", "openings:write", 
  // "photos:read", "photos:write", "quotes:read", "quotes:write", "catalog:read", etc.
  
  // Rate limiting
  rateLimit: integer("rate_limit").notNull().default(1000), // Requests per hour
  rateLimitWindow: varchar("rate_limit_window").notNull().default("hour"), // hour, day, month
  
  // Usage tracking
  lastUsedAt: timestamp("last_used_at"),
  requestCount: integer("request_count").notNull().default(0), // Total requests made with this key
  
  // Security
  expiresAt: timestamp("expires_at"), // Optional expiration date
  revokedAt: timestamp("revoked_at"), // If key was revoked
  revokedBy: varchar("revoked_by").references(() => users.id), // User who revoked the key
  revokedReason: text("revoked_reason"), // Reason for revocation
  
  // IP restrictions (optional)
  allowedIps: jsonb("allowed_ips").default(sql`'[]'::jsonb`), // Array of allowed IP addresses/CIDR blocks
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_api_keys_organization_id").on(table.organizationId),
  index("IDX_api_keys_key_hash").on(table.keyHash),
  index("IDX_api_keys_created_by").on(table.createdBy),
]);

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  keyHash: true, // Generated server-side
  keyPrefix: true, // Generated server-side
  requestCount: true,
  lastUsedAt: true,
  revokedAt: true,
  revokedBy: true,
  revokedReason: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
  rateLimitWindow: z.enum(["hour", "day", "month"]).default("hour"),
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// API Key Usage Logs - Track API key usage for analytics and security
export const apiKeyUsageLogs = pgTable("api_key_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Request details
  method: varchar("method").notNull(), // GET, POST, PUT, DELETE, PATCH
  endpoint: text("endpoint").notNull(), // API endpoint called
  statusCode: integer("status_code").notNull(), // HTTP status code
  responseTime: integer("response_time"), // Response time in milliseconds
  
  // Security tracking
  ipAddress: varchar("ip_address"), // Request IP address
  userAgent: text("user_agent"), // Request user agent
  
  // Error tracking
  errorMessage: text("error_message"), // Error message if request failed
  
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("IDX_api_key_usage_logs_api_key_id").on(table.apiKeyId),
  index("IDX_api_key_usage_logs_organization_id").on(table.organizationId),
  index("IDX_api_key_usage_logs_timestamp").on(table.timestamp),
]);

export const insertApiKeyUsageLogSchema = createInsertSchema(apiKeyUsageLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertApiKeyUsageLog = z.infer<typeof insertApiKeyUsageLogSchema>;
export type ApiKeyUsageLog = typeof apiKeyUsageLogs.$inferSelect;

// Webhooks - Outbound webhook subscriptions for event notifications
export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Webhook configuration
  name: text("name").notNull(), // User-friendly name
  url: text("url").notNull(), // Target URL for webhook delivery
  secret: text("secret").notNull(), // HMAC secret for signature verification
  
  // Event subscriptions
  events: jsonb("events").notNull().default(sql`'[]'::jsonb`), // Array of event types to subscribe to
  // Possible events: "project.created", "project.updated", "project.deleted",
  // "opening.created", "opening.updated", "photo.uploaded", "quote.created", etc.
  
  // Delivery settings
  isActive: text("is_active").notNull().default("yes"), // yes, no
  retryAttempts: integer("retry_attempts").notNull().default(3), // Number of retry attempts on failure
  timeoutSeconds: integer("timeout_seconds").notNull().default(30), // Request timeout in seconds
  
  // Statistics
  lastTriggeredAt: timestamp("last_triggered_at"),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  lastSuccess: timestamp("last_success"),
  lastFailure: timestamp("last_failure"),
  lastFailureReason: text("last_failure_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_webhooks_organization_id").on(table.organizationId),
  index("IDX_webhooks_is_active").on(table.isActive),
]);

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  secret: true, // Generated server-side
  lastTriggeredAt: true,
  successCount: true,
  failureCount: true,
  lastSuccess: true,
  lastFailure: true,
  lastFailureReason: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  events: z.array(z.string()).min(1, "At least one event type is required"),
  isActive: z.enum(["yes", "no"]).default("yes"),
});

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// Webhook Delivery Logs - Track webhook delivery attempts
export const webhookDeliveryLogs = pgTable("webhook_delivery_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Event details
  eventType: varchar("event_type").notNull(), // Event that triggered the webhook
  payload: jsonb("payload").notNull(), // Event payload sent
  
  // Delivery details
  attemptNumber: integer("attempt_number").notNull().default(1), // Retry attempt number
  statusCode: integer("status_code"), // HTTP response status code
  responseTime: integer("response_time"), // Response time in milliseconds
  success: text("success").notNull(), // yes, no
  errorMessage: text("error_message"), // Error message if delivery failed
  
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("IDX_webhook_delivery_logs_webhook_id").on(table.webhookId),
  index("IDX_webhook_delivery_logs_organization_id").on(table.organizationId),
  index("IDX_webhook_delivery_logs_timestamp").on(table.timestamp),
  index("IDX_webhook_delivery_logs_success").on(table.success),
]);

export const insertWebhookDeliveryLogSchema = createInsertSchema(webhookDeliveryLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertWebhookDeliveryLog = z.infer<typeof insertWebhookDeliveryLogSchema>;
export type WebhookDeliveryLog = typeof webhookDeliveryLogs.$inferSelect;

// ============================================================================
// PRODUCT ROADMAP MANAGEMENT
// ============================================================================

// Roadmap Milestones - Quarterly strategic planning milestones
export const roadmapMilestones = pgTable("roadmap_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  quarter: varchar("quarter").notNull(), // Q1 2026, Q2 2026, etc.
  theme: text("theme").notNull(), // Quarter theme/focus
  description: text("description"), // Optional detailed description
  startDate: timestamp("start_date"), // Optional milestone start date
  endDate: timestamp("end_date"), // Optional milestone end date
  status: varchar("status").notNull().default("planned"), // planned, in_progress, completed, postponed
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_roadmap_milestones_organization_id").on(table.organizationId),
  index("IDX_roadmap_milestones_quarter").on(table.quarter),
]);

export const insertRoadmapMilestoneSchema = createInsertSchema(roadmapMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["planned", "in_progress", "completed", "postponed"]).default("planned"),
});

export type InsertRoadmapMilestone = z.infer<typeof insertRoadmapMilestoneSchema>;
export type RoadmapMilestone = typeof roadmapMilestones.$inferSelect;

// Roadmap Tasks - Individual tasks/initiatives within milestones
export const roadmapTasks = pgTable("roadmap_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  milestoneId: varchar("milestone_id").notNull().references(() => roadmapMilestones.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").notNull(), // Q1-01, Q2-03, etc.
  category: varchar("category").notNull(), // Performance, Security, Testing, AI, etc.
  title: text("title").notNull(),
  description: text("description"), // Detailed task description
  priority: varchar("priority").notNull(), // High, Medium, Low
  durationWeeks: integer("duration_weeks"), // Estimated duration in weeks
  status: varchar("status").notNull().default("not_started"), // not_started, in_progress, completed, blocked, postponed
  assignedTo: varchar("assigned_to").references(() => users.id), // Assigned user
  dependencies: text("dependencies").array(), // Array of task IDs this depends on
  notes: text("notes"), // Progress notes, blockers, etc.
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_roadmap_tasks_milestone_id").on(table.milestoneId),
  index("IDX_roadmap_tasks_status").on(table.status),
  index("IDX_roadmap_tasks_assigned_to").on(table.assignedTo),
]);

export const insertRoadmapTaskSchema = createInsertSchema(roadmapTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  category: z.enum(["Performance", "Security", "Testing", "AI", "Analytics", "Mobile", "Database", "QA", "Integrations", "Infrastructure", "Documentation", "Monitoring", "UX", "Deployment", "Compliance", "Marketing", "Product", "Docs"]),
  priority: z.enum(["High", "Medium", "Low"]),
  status: z.enum(["not_started", "in_progress", "completed", "blocked", "postponed"]).default("not_started"),
});

export type InsertRoadmapTask = z.infer<typeof insertRoadmapTaskSchema>;
export type RoadmapTask = typeof roadmapTasks.$inferSelect;

// ============================================================================
// BUSINESS DOMAIN TABLES
// ============================================================================

// Customers - Organizations or companies that own/manage buildings
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Multi-tenant ownership (nullable for migration)
  name: text("name").notNull(), // Company/organization name
  type: text("type"), // hospital-chain, hotel-chain, property-management, government, corporate, other
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  preferredManufacturers: text("preferred_manufacturers").array(), // List of preferred manufacturer names
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_customers_organization_id").on(table.organizationId),
  index("IDX_customers_contact_email").on(table.contactEmail),
]);

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Customer Locations - Multiple locations/facilities for a customer organization
export const customerLocations = pgTable("customer_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  locationName: text("location_name").notNull(), // e.g., "Memorial Hospital - Main Campus"
  address: text("address"), // Street address
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country").default("USA"),
  contactName: text("contact_name"), // Location-specific contact
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  hubspotCompanyId: text("hubspot_company_id"), // HubSpot Company ID for this location
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerLocationSchema = createInsertSchema(customerLocations).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomerLocation = z.infer<typeof insertCustomerLocationSchema>;
export type CustomerLocation = typeof customerLocations.$inferSelect;

// Customer Product History - Track product usage by customer across projects
export const customerProductHistory = pgTable("customer_product_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  productType: text("product_type").notNull(), // hardware, door, frame, automation
  manufacturer: text("manufacturer"),
  model: text("model"),
  catalogItemId: varchar("catalog_item_id"), // Will reference catalogItems.id when populated
  quantity: text("quantity"),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  usageCount: real("usage_count").notNull().default(1), // How many times this product was used
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerProductHistorySchema = createInsertSchema(customerProductHistory).omit({
  id: true,
  usageCount: true,
  createdAt: true,
});

export type InsertCustomerProductHistory = z.infer<typeof insertCustomerProductHistorySchema>;
export type CustomerProductHistory = typeof customerProductHistory.$inferSelect;

// Project Versions - Snapshots of quotes for versioning and history
export const projectVersions = pgTable("project_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(), // Sequential version number (1, 2, 3...)
  versionName: text("version_name"), // Optional: "Initial Quote", "Revised After Meeting", etc.
  snapshotData: jsonb("snapshot_data").notNull(), // Full JSON snapshot of project, openings, hardware at this version
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }), // User who created this version
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_project_versions_project_id").on(table.projectId),
]);

export const insertProjectVersionSchema = createInsertSchema(projectVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectVersion = z.infer<typeof insertProjectVersionSchema>;
export type ProjectVersion = typeof projectVersions.$inferSelect;

// Service History - Track maintenance, repairs, and replacements for installed doors
export const serviceHistory = pgTable("service_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Service Event Details
  serviceType: text("service_type").notNull(), // preventive-maintenance, repair, replacement, inspection, adjustment, emergency, warranty-work
  servicePriority: text("service_priority").notNull().default("normal"), // routine, normal, urgent, emergency
  serviceStatus: text("service_status").notNull().default("scheduled"), // scheduled, in-progress, completed, cancelled
  
  // Scheduling
  scheduledDate: timestamp("scheduled_date"), // When service is scheduled
  serviceDate: timestamp("service_date"), // Actual service date
  completedDate: timestamp("completed_date"), // When work was completed
  
  // Personnel
  performedBy: varchar("performed_by").references(() => users.id, { onDelete: "set null" }), // Technician who performed service
  serviceCompany: text("service_company"), // Company that performed service
  technicianName: text("technician_name"), // Name of technician (if external)
  technicianContact: text("technician_contact"), // Contact info for technician
  
  // Work Performed
  workDescription: text("work_description").notNull(), // Detailed description of work performed
  issuesFound: text("issues_found").array(), // Problems discovered (same as conditionIssues)
  componentsServiced: text("components_serviced").array(), // door, frame, hinges, closer, lock, strike, weatherstripping, automation, access-control
  partsReplaced: jsonb("parts_replaced"), // Array of {part_name, part_number, quantity, cost}
  laborHours: real("labor_hours"), // Hours of labor
  
  // Costs
  laborCost: real("labor_cost"),
  partsCost: real("parts_cost"),
  totalCost: real("total_cost"),
  warrantyWork: text("warranty_work").notNull().default("no"), // yes, no - was this warranty work
  
  // Documentation
  servicePhotos: text("service_photos").array(), // Photo IDs showing work performed
  serviceNotes: text("service_notes"), // Detailed notes about service
  customerSignature: text("customer_signature"), // Customer signature/approval
  workOrderNumber: text("work_order_number"), // Reference work order number
  invoiceNumber: text("invoice_number"), // Invoice reference
  
  // Follow-up
  followUpRequired: text("follow_up_required").default("no"), // yes, no
  followUpDate: timestamp("follow_up_date"), // When to follow up
  followUpNotes: text("follow_up_notes"), // What needs follow-up
  nextServiceDue: timestamp("next_service_due"), // When next service is recommended
  
  // Quality & Compliance
  complianceVerified: text("compliance_verified").default("no"), // yes, no - was code compliance verified
  complianceIssues: text("compliance_issues").array(), // Any compliance issues found
  qualityRating: text("quality_rating"), // excellent, good, acceptable, needs-improvement
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_service_history_opening_id").on(table.openingId),
  index("IDX_service_history_project_id").on(table.projectId),
  index("IDX_service_history_organization_id").on(table.organizationId),
  index("IDX_service_history_service_date").on(table.serviceDate),
  index("IDX_service_history_status").on(table.serviceStatus),
]);

export const insertServiceHistorySchema = createInsertSchema(serviceHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  serviceType: z.enum(["preventive-maintenance", "repair", "replacement", "inspection", "adjustment", "emergency", "warranty-work"]),
  servicePriority: z.enum(["routine", "normal", "urgent", "emergency"]).default("normal"),
  serviceStatus: z.enum(["scheduled", "in-progress", "completed", "cancelled"]).default("scheduled"),
  warrantyWork: z.enum(["yes", "no"]).default("no"),
  followUpRequired: z.enum(["yes", "no"]).default("no"),
  complianceVerified: z.enum(["yes", "no"]).default("no"),
  qualityRating: z.enum(["excellent", "good", "acceptable", "needs-improvement"]).optional(),
});

export const updateServiceHistorySchema = insertServiceHistorySchema.partial().omit({
  openingId: true, // Never allow changing opening association
  projectId: true, // Never allow changing project association
  organizationId: true, // Never allow changing organization
});

export type InsertServiceHistory = z.infer<typeof insertServiceHistorySchema>;
export type UpdateServiceHistory = z.infer<typeof updateServiceHistorySchema>;
export type ServiceHistory = typeof serviceHistory.$inferSelect;

// Photo Types - Required verification photo categories
export const photoTypes = [
  "height-width",              // Always required - height and width measurements
  "jamb-depth",               // Required if frame is selected
  "top-of-door",              // Required if door is selected
  "hinge-measurements",       // Always required - hinge size and measurements
  "door-frame-measurements",  // Required for door replacements
  "locking-hardware",         // Always required - photo of locking hardware
  "edge-of-door",             // Always required - edge of door photo
  "general",                  // Optional - any other photos
] as const;

export type PhotoType = typeof photoTypes[number];

// Photos - Images with annotations and verification types
export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  photoType: text("photo_type").notNull().default("general"),
  annotations: jsonb("annotations"),
  gpsLat: real("gps_lat"),
  gpsLng: real("gps_lng"),
  gpsAccuracy: real("gps_accuracy"),
  gpsSource: text("gps_source"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_photos_opening_id").on(table.openingId),
  index("IDX_photos_opening_captured").on(table.openingId, table.capturedAt),
]);

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  capturedAt: true,
});

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

// Additional Door Items - Non-hardware items (clavos, vinyl wraps, card readers, security film, etc.)
export const additionalDoorItems = pgTable("additional_door_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Item details
  category: varchar("category").notNull(), // decorative, security, access_control, protection, custom
  customCategory: text("custom_category"), // Free-form category label when category is "custom"
  name: text("name").notNull(),
  description: text("description"),
  
  // Quantity and cost
  quantity: integer("quantity").notNull().default(1),
  unitCost: real("unit_cost").default(0), // Cost per unit in dollars (using numeric for currency precision)
  
  // Sourcing and installation
  sku: text("sku"), // Stock keeping unit / product code
  manufacturer: text("manufacturer"),
  supplierName: text("supplier_name"), // Supplier/vendor name
  modelNumber: text("model_number"),
  installNotes: text("install_notes"), // Installation guidance and requirements
  notes: text("notes"), // General notes
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_additional_door_items_opening_id").on(table.openingId),
  index("IDX_additional_door_items_organization_id").on(table.organizationId),
]);

// Category enum for validation
export const ADDITIONAL_ITEM_CATEGORIES = {
  DECORATIVE: "decorative",
  SECURITY: "security",
  ACCESS_CONTROL: "access_control",
  PROTECTION: "protection",
  CUSTOM: "custom",
} as const;

export type AdditionalItemCategory = typeof ADDITIONAL_ITEM_CATEGORIES[keyof typeof ADDITIONAL_ITEM_CATEGORIES];

export const insertAdditionalDoorItemSchema = createInsertSchema(additionalDoorItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  category: z.enum(["decorative", "security", "access_control", "protection", "custom"]),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.number().min(0).default(0),
});

// Update schema with explicit allowed fields only (excludes id, organizationId, openingId, timestamps)
export const updateAdditionalDoorItemSchema = z.object({
  category: z.enum(["decorative", "security", "access_control", "protection", "custom"]).optional(),
  customCategory: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  unitCost: z.number().min(0).optional(),
  sku: z.string().optional(),
  manufacturer: z.string().optional(),
  supplierName: z.string().optional(),
  modelNumber: z.string().optional(),
  installNotes: z.string().optional(),
  notes: z.string().optional(),
}).strict(); // Reject any fields not explicitly defined

export type InsertAdditionalDoorItem = z.infer<typeof insertAdditionalDoorItemSchema>;
export type UpdateAdditionalDoorItem = z.infer<typeof updateAdditionalDoorItemSchema>;
export type AdditionalDoorItem = typeof additionalDoorItems.$inferSelect;

// Calibration Profiles - Fiducial marker layouts for LiDAR scan accuracy
export const calibrationProfiles = pgTable("calibration_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  markerType: text("marker_type").notNull().default("AprilTag36h11"),
  markerSizeMM: integer("marker_size_mm").notNull().default(75),
  expectedGeometry: jsonb("expected_geometry").notNull(),
  toleranceMM: real("tolerance_mm").notNull().default(2),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCalibrationProfileSchema = createInsertSchema(calibrationProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCalibrationProfile = z.infer<typeof insertCalibrationProfileSchema>;
export type CalibrationProfile = typeof calibrationProfiles.$inferSelect;

// LiDAR Scans - 3D point cloud scans for automated measurement
// Supports standalone scans (no project/opening) that can be linked later for faster surveys
export const lidarScans = pgTable("lidar_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }), // Nullable for standalone scans
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "set null" }), // Nullable for standalone scans
  uploaderId: varchar("uploader_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Service request link (for portal submissions)
  serviceRequestId: varchar("service_request_id"), // Reference to service_requests table
  serviceRequestItemId: varchar("service_request_item_id"), // Reference to service_request_items table
  
  // File metadata
  originalFilename: text("original_filename").notNull(),
  storageKey: text("storage_key").notNull(), // Path in storage system (currently /tmp, future: object storage)
  fileSizeBytes: integer("file_size_bytes").notNull(),
  scanFormat: text("scan_format").notNull(), // ply, obj, json
  captureMethod: text("capture_method").notNull(), // lidarkit, arkit, manual, ios_lidar
  
  // Capture context
  captureNotes: text("capture_notes"), // User notes about the scan
  deviceInfo: text("device_info"), // Device model and OS info
  scanLabel: text("scan_label"), // User-provided label for standalone scans (e.g., "Room 101 Main Door")
  
  // Scan data and results (JSONB for flexibility)
  rawMetadata: jsonb("raw_metadata"), // Raw metadata from scan file
  processedMetrics: jsonb("processed_metrics"), // Calculated measurements: width, height, depth, swing direction
  confidenceScores: jsonb("confidence_scores"), // Confidence metrics for each measurement
  complianceFindings: jsonb("compliance_findings"), // Compliance validation results
  
  // Calibration data
  calibrationProfileId: varchar("calibration_profile_id"),
  calibrationData: jsonb("calibration_data"),
  calibrationStatus: text("calibration_status"),
  calibrationQualityScore: real("calibration_quality_score"),

  // Scan purpose (single, dual-closed, dual-closed-a, dual-closed-b, dual-open)
  scanPurpose: text("scan_purpose").default("single"),
  pairedScanId: varchar("paired_scan_id"),

  // Hardware placement measurements
  hardwareMeasurements: jsonb("hardware_measurements"),

  // Dual-scan reveal/gap analysis results
  revealGapAnalysis: jsonb("reveal_gap_analysis"),

  // Processed 3D model output (generated from raw scan)
  modelStorageKey: text("model_storage_key"),
  modelFormat: text("model_format"), // gltf, usdz, obj
  modelMetadata: jsonb("model_metadata"), // { vertexCount, bounds, fileSize }

  // Wireframe interpretation output (generated from 3D model)
  wireframeStorageKey: text("wireframe_storage_key"),
  wireframeFormat: text("wireframe_format"), // svg, json, gltf
  wireframeMetadata: jsonb("wireframe_metadata"), // { components, dimensions, annotationCount }

  // Preview image (2D snapshot of the 3D model)
  previewImageKey: text("preview_image_key"),

  // Processing state
  processingStatus: text("processing_status").notNull().default("uploaded"), // uploaded, queued, processing, processed, failed
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  
  // Link tracking
  linkedAt: timestamp("linked_at"), // When the scan was linked to a project/opening
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLidarScanSchema = createInsertSchema(lidarScans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  linkedAt: true,
}).extend({
  scanFormat: z.enum(["ply", "obj", "json"]),
  captureMethod: z.enum(["lidarkit", "arkit", "manual", "ios_lidar"]),
  processingStatus: z.enum(["uploaded", "queued", "processing", "processed", "failed"]).default("uploaded"),
  projectId: z.string().nullable().optional(),
  openingId: z.string().nullable().optional(),
  scanLabel: z.string().nullable().optional(),
  calibrationProfileId: z.string().nullable().optional(),
  calibrationData: z.any().nullable().optional(),
  calibrationStatus: z.enum(["uncalibrated", "calibrated", "partial", "failed"]).nullable().optional(),
  calibrationQualityScore: z.number().nullable().optional(),
  scanPurpose: z.enum(["single", "dual-closed", "dual-closed-a", "dual-closed-b", "dual-open"]).default("single").optional(),
  pairedScanId: z.string().nullable().optional(),
  hardwareMeasurements: z.any().nullable().optional(),
  revealGapAnalysis: z.any().nullable().optional(),
  modelStorageKey: z.string().nullable().optional(),
  modelFormat: z.enum(["gltf", "usdz", "obj"]).nullable().optional(),
  modelMetadata: z.any().nullable().optional(),
  wireframeStorageKey: z.string().nullable().optional(),
  wireframeFormat: z.enum(["svg", "json", "gltf"]).nullable().optional(),
  wireframeMetadata: z.any().nullable().optional(),
  previewImageKey: z.string().nullable().optional(),
});

// Scan Photos - Reference photos captured during LiDAR scanning sessions
export const scanPhotos = pgTable("scan_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull().references(() => lidarScans.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "set null" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  uploaderId: varchar("uploader_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  storageKey: text("storage_key").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(), // image/jpeg, image/png, image/heic
  fileSizeBytes: integer("file_size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),

  capturedAt: timestamp("captured_at"),
  sequenceIndex: integer("sequence_index").default(0),
  stitchingGroupId: varchar("stitching_group_id"),
  photoType: text("photo_type").notNull().default("reference"),
  caption: text("caption"),
  cameraPose: jsonb("camera_pose"),
  gpsLat: real("gps_lat"),
  gpsLng: real("gps_lng"),
  gpsAccuracy: real("gps_accuracy"),
  gpsSource: text("gps_source"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScanPhotoSchema = createInsertSchema(scanPhotos).omit({
  id: true,
  createdAt: true,
}).extend({
  photoType: z.enum(["reference", "detail", "hardware", "panorama-segment"]).default("reference"),
  mimeType: z.string(),
  sequenceIndex: z.number().int().min(0).optional(),
  stitchingGroupId: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  cameraPose: z.any().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  openingId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  capturedAt: z.coerce.date().nullable().optional(),
});

export type InsertScanPhoto = z.infer<typeof insertScanPhotoSchema>;
export type ScanPhoto = typeof scanPhotos.$inferSelect;

// Schema for linking a standalone scan to a project/opening
export const linkLidarScanSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  openingId: z.string().min(1, "Opening is required"),
});

export type LinkLidarScanInput = z.infer<typeof linkLidarScanSchema>;

export type InsertLidarScan = z.infer<typeof insertLidarScanSchema>;
export type LidarScan = typeof lidarScans.$inferSelect;

// Detection Overrides — user corrections to automated LiDAR detection results
// Used for learning engine to improve future detection accuracy per organization
export const detectionOverrides = pgTable("detection_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  scanId: varchar("scan_id").references(() => lidarScans.id, { onDelete: "set null" }),
  fieldPath: text("field_path").notNull(), // e.g. "materialIdentification.frameMaterial.type"
  originalValue: jsonb("original_value").notNull(), // The auto-detected value
  correctedValue: jsonb("corrected_value").notNull(), // The user-supplied correction
  originalConfidence: real("original_confidence"), // Confidence of original detection
  context: jsonb("context"), // Contextual features for pattern matching (frameDepth, width, height, etc.)
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_detection_overrides_org").on(table.organizationId),
  index("IDX_detection_overrides_org_field").on(table.organizationId, table.fieldPath),
  index("IDX_detection_overrides_opening").on(table.openingId),
]);

export const insertDetectionOverrideSchema = createInsertSchema(detectionOverrides).omit({
  id: true,
  createdAt: true,
}).extend({
  fieldPath: z.string().min(1),
  originalValue: z.any(),
  correctedValue: z.any(),
  originalConfidence: z.number().min(0).max(1).nullable().optional(),
  context: z.record(z.any()).nullable().optional(),
  scanId: z.string().nullable().optional(),
});

export type InsertDetectionOverride = z.infer<typeof insertDetectionOverrideSchema>;
export type DetectionOverride = typeof detectionOverrides.$inferSelect;

// Hardware Scans - Barcode/Label scanning for hardware identification
export const hardwareScans = pgTable("hardware_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }), // Optional - can scan hardware without project context
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "cascade" }), // Optional - can scan hardware without opening context
  scannedBy: varchar("scanned_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  scanType: text("scan_type").notNull().default("label_scan"), // Always "label_scan" for this feature
  
  // Image storage
  imageUrl: text("image_url").notNull(), // Path to uploaded image
  imageFilename: text("image_filename").notNull(),
  
  // Scan results (JSONB for flexibility)
  decodedTokens: jsonb("decoded_tokens"), // Array of decoded barcode/QR code strings with symbology info
  extractedFields: jsonb("extracted_fields"), // Parsed fields: manufacturer, model, bhmaFunction, finish, series
  normalizedFields: jsonb("normalized_fields"), // Augmented with descriptions and catalog links
  
  // Timestamps
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
});

export const insertHardwareScanSchema = createInsertSchema(hardwareScans).omit({
  id: true,
  scannedAt: true,
}).extend({
  scanType: z.literal("label_scan").default("label_scan"),
});

export type InsertHardwareScan = z.infer<typeof insertHardwareScanSchema>;
export type HardwareScan = typeof hardwareScans.$inferSelect;

// AR Measurements - WebXR-based augmented reality measurements for doors and frames
export const arMeasurements = pgTable("ar_measurements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }), // Optional - can measure without project context
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "cascade" }), // Optional - can measure without opening context
  measuredBy: varchar("measured_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Measurement data
  measurementType: text("measurement_type").notNull(), // door_height, door_width, frame_depth, clear_opening, hinge_location, etc.
  value: real("value").notNull(), // Measured value in inches
  unit: text("unit").notNull().default("inches"), // inches, feet, mm, cm, m
  
  // AR session metadata
  deviceType: text("device_type"), // Device used: iPhone 12 Pro, iPad Pro, Android device name
  hasLidar: text("has_lidar").default("no"), // yes, no - Whether device has LiDAR sensor
  arTechnology: text("ar_technology").notNull().default("webxr"), // webxr, arkit, arcore
  
  // Accuracy and confidence
  confidenceScore: real("confidence_score"), // 0.0 to 1.0 confidence in measurement accuracy
  estimatedError: real("estimated_error"), // Estimated error margin in inches
  
  // Point cloud data (for measurements with multiple points)
  measurementPoints: jsonb("measurement_points"), // Array of 3D points: [{x, y, z}, {x, y, z}]
  anchorPoints: jsonb("anchor_points"), // AR anchor positions for reconstruction
  
  // Environmental context
  lightingCondition: text("lighting_condition"), // good, moderate, poor
  surfaceQuality: text("surface_quality"), // smooth, textured, reflective, damaged
  distanceFromDevice: real("distance_from_device"), // Distance from camera in feet
  
  // Associated media
  arSessionImageUrl: text("ar_session_image_url"), // Screenshot from AR session
  calibrationImageUrl: text("calibration_image_url"), // Reference image for validation
  
  // Notes and validation
  notes: text("notes"),
  verifiedBy: varchar("verified_by").references(() => users.id, { onDelete: "set null" }), // User who verified measurement
  verifiedAt: timestamp("verified_at"),
  validationNotes: text("validation_notes"),
  
  // Timestamps
  measuredAt: timestamp("measured_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertArMeasurementSchema = createInsertSchema(arMeasurements).omit({
  id: true,
  measuredAt: true,
  createdAt: true,
}).extend({
  measurementType: z.string(),
  value: z.number().positive(),
  unit: z.enum(["inches", "feet", "mm", "cm", "m"]).default("inches"),
  hasLidar: z.enum(["yes", "no"]).default("no"),
  arTechnology: z.enum(["webxr", "arkit", "arcore"]).default("webxr"),
});

export type InsertArMeasurement = z.infer<typeof insertArMeasurementSchema>;
export type ArMeasurement = typeof arMeasurements.$inferSelect;

// PDF Catalog Imports - Track PDF uploads and data extraction
export const pdfCatalogImports = pgTable("pdf_catalog_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // File information
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"), // Size in bytes
  fileUrl: text("file_url").notNull(), // Storage URL
  
  // Processing status
  status: text("status").notNull().default("uploaded"), // uploaded, processing, completed, failed
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  errorMessage: text("error_message"),
  
  // Extracted data
  extractedData: jsonb("extracted_data").default(sql`'[]'::jsonb`), // Array of extracted catalog items
  itemCount: integer("item_count").default(0), // Number of items extracted
  
  // Import tracking
  importedAt: timestamp("imported_at"), // When data was imported to catalog
  importedItemCount: integer("imported_item_count").default(0), // How many items were imported
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPdfCatalogImportSchema = createInsertSchema(pdfCatalogImports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  status: z.enum(["uploaded", "processing", "completed", "failed"]).default("uploaded"),
});

export type InsertPdfCatalogImport = z.infer<typeof insertPdfCatalogImportSchema>;
export type PdfCatalogImport = typeof pdfCatalogImports.$inferSelect;

// Hardware Items - Individual hardware items attached to door openings
export const hardwareItems = pgTable("hardware_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // lock, hinge, closer, exit-device, sensor, reader, actuator, push-button, request-to-exit, door-contact, power-supply, automation, access-control-peripheral, misc
  manufacturer: text("manufacturer"),
  model: text("model"),
  description: text("description").notNull(),
  quantity: text("quantity").default("1"),
  location: text("location"), // where on door: top, mid, bottom, etc.
  condition: text("condition"), // existing, replace, new
  notes: text("notes"),
  isCustom: text("is_custom").default("no"), // yes, no - triggers custom quote flow
  customManufacturerId: varchar("custom_manufacturer_id"), // manufacturer for custom items
  
  // Keying information for locks and cylinders
  keyBlank: text("key_blank"), // e.g., "Schlage C", "Best A2", "Medeco M3"
  bittingCode: text("bitting_code"), // Key cut pattern e.g., "35246"
  pinning: text("pinning"), // Pin depths/chamber info
  keySymbol: text("key_symbol"), // What's stamped on the key e.g., "AA-1"
  masterKeySystemId: varchar("master_key_system_id"), // FK to masterKeySystems
  lockSetId: varchar("lock_set_id"), // FK to lockSets
  
  // Construction keying information
  constructionKeyQty: integer("construction_key_qty"), // Number of construction/temporary keys
  permanentKeyQty: integer("permanent_key_qty"), // Number of permanent keys
  keyingRemarks: text("keying_remarks"), // Special keying instructions
  cylinderType: text("cylinder_type"), // mortise, rim, key-in-knob, key-in-lever, interchangeable-core, removable-core
  cylinderBrand: text("cylinder_brand"), // Best, Schlage, Corbin-Russwin, Sargent, Medeco, Mul-T-Lock
  
  // Hardware finish for salesman (BHMA standard finishes)
  finish: text("finish"), // US3, US4, US10, US10B, US14, US15, US19, US26, US26D, US28, US32, US32D
  finishDescription: text("finish_description"), // "Bright Brass", "Satin Chrome", "Oil Rubbed Bronze"
  
  // Pricing and supplier information
  listPrice: real("list_price"), // Manufacturer's list price
  discountPercent: real("discount_percent"), // Negotiated discount
  supplierName: text("supplier_name"), // LEGACY: Distributor or supplier name (deprecated - use procurementSourceType/Id)
  supplierPartNumber: text("supplier_part_number"), // Supplier's SKU/part number
  leadTimeDays: integer("lead_time_days"), // Lead time in days
  
  // Procurement Source (structured replacement for supplierName)
  procurementSourceType: text("procurement_source_type"), // 'manufacturer-direct' | 'distributor' | null (legacy)
  procurementSourceId: varchar("procurement_source_id"), // FK to manufacturerContacts or distributors based on type
  procurementSourceSnapshot: jsonb("procurement_source_snapshot"), // Frozen pricing metadata at time of selection
  
  // Installation information for technicians
  laborHours: real("labor_hours"), // Estimated installation labor hours
  installationSequence: integer("installation_sequence"), // Order of installation (1, 2, 3...)
  prepRequirements: text("prep_requirements"), // Door prep, cutouts, drilling needed
  specialTools: text("special_tools"), // Special tools required for installation
  installationNotes: text("installation_notes"), // Detailed installation instructions
  
  // Warranty and compliance
  warrantyYears: integer("warranty_years"), // Warranty period in years
  warrantyNotes: text("warranty_notes"), // Warranty terms and conditions
  
  // Hardware set designation for scheduling
  hardwareSet: text("hardware_set"), // Set designation e.g., "A1", "B2" for grouping
  
  // International Trade & Landed Cost Compliance
  hsCode: text("hs_code"), // Harmonized System code for tariff classification (e.g., "8301.40")
  countryOfOrigin: text("country_of_origin"), // Country where manufactured (ISO 3166-1 alpha-2, e.g., "US", "CN")
  tariffRatePercent: real("tariff_rate_percent"), // Import tariff rate percentage
  antiDumpingPercent: real("anti_dumping_percent"), // Anti-dumping duty percentage
  otherDutiesPercent: real("other_duties_percent"), // Other customs duties percentage
  shipFromCountry: text("ship_from_country"), // Origin country for shipping (ISO 3166-1 alpha-2)
  shipFromPostal: text("ship_from_postal"), // Origin postal/zip code for freight calculation
  shipToCountry: text("ship_to_country"), // Destination country (ISO 3166-1 alpha-2)
  shipToPostal: text("ship_to_postal"), // Destination postal/zip code
  incoterm: text("incoterm"), // International Commercial Terms (e.g., "FOB", "CIF", "DDP", "EXW")
  baseFreightCost: real("base_freight_cost"), // Base freight cost for this line item
  fuelSurchargePercent: real("fuel_surcharge_percent"), // Fuel surcharge percentage
  accessorialsCost: real("accessorials_cost"), // Accessorial charges (liftgate, inside delivery, etc.)
  insuranceCost: real("insurance_cost"), // Cargo insurance cost allocation
  customsBrokerageCost: real("customs_brokerage_cost"), // Customs clearance fee allocation
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_hardware_items_opening_id").on(table.openingId),
  index("IDX_hardware_items_opening_type").on(table.openingId, table.itemType),
]);

export const insertHardwareItemSchema = createInsertSchema(hardwareItems).omit({
  id: true,
  createdAt: true,
});

export const updateHardwareItemSchema = insertHardwareItemSchema.partial().omit({
  openingId: true, // Never allow updating openingId - maintains data integrity
});

export type InsertHardwareItem = z.infer<typeof insertHardwareItemSchema>;
export type UpdateHardwareItem = z.infer<typeof updateHardwareItemSchema>;
export type HardwareItem = typeof hardwareItems.$inferSelect;

// Hardware Bundles - Pre-configured packages of hardware items used together
export const hardwareBundles = pgTable("hardware_bundles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Multi-tenant ownership (nullable for migration)
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // access-control, automation, security, fire-safety, general
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHardwareBundleSchema = createInsertSchema(hardwareBundles).omit({
  id: true,
  createdAt: true,
});

export type InsertHardwareBundle = z.infer<typeof insertHardwareBundleSchema>;
export type HardwareBundle = typeof hardwareBundles.$inferSelect;

// Bundle Items - Hardware item specifications within bundles
export const bundleItems = pgTable("bundle_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bundleId: varchar("bundle_id").notNull().references(() => hardwareBundles.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  description: text("description").notNull(),
  quantity: text("quantity").default("1"),
  location: text("location"),
  condition: text("condition"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBundleItemSchema = createInsertSchema(bundleItems).omit({
  id: true,
  createdAt: true,
});

export type InsertBundleItem = z.infer<typeof insertBundleItemSchema>;
export type BundleItem = typeof bundleItems.$inferSelect;

// BOM (Bill of Materials) - AI-generated hardware recommendations for door openings
export const boms = pgTable("boms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  generatedBy: varchar("generated_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Generation context - what inputs were used to generate this BOM
  context: jsonb("context"), // Store the door opening data snapshot used for generation
  
  // Totals
  totalMsrp: real("total_msrp").default(0), // Sum of all item MSRPs
  itemCount: integer("item_count").default(0), // Number of hardware items
  
  status: text("status").notNull().default("draft"), // draft, approved, ordered
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_boms_opening_id").on(table.openingId),
  index("IDX_boms_organization_id").on(table.organizationId),
]);

export const insertBomSchema = createInsertSchema(boms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBom = z.infer<typeof insertBomSchema>;
export type Bom = typeof boms.$inferSelect;

// BOM Items - Individual hardware items within a BOM
export const bomItems = pgTable("bom_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bomId: varchar("bom_id").notNull().references(() => boms.id, { onDelete: "cascade" }),
  
  // Hardware details
  category: text("category").notNull(), // Lock, Hinge, Closer, Exit Device, etc.
  description: text("description").notNull(),
  family: text("family"), // Product family (e.g., "Schlage ND-Series")
  bhmaFunction: text("bhma_function"), // BHMA function code (e.g., "F86")
  brand: text("brand"), // Manufacturer brand
  sku: text("sku"), // Product SKU/model number
  finish: text("finish"), // Finish code (e.g., "626", "689")
  grade: text("grade"), // Quality grade (e.g., "Grade 1")
  
  quantity: integer("quantity").notNull().default(1),
  msrp: real("msrp"), // Manufacturer's suggested retail price
  
  // Reference to catalog if available
  catalogItemId: integer("catalog_item_id").references(() => hardwareCatalog.id, { onDelete: "set null" }),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_bom_items_bom_id").on(table.bomId),
]);

export const insertBomItemSchema = createInsertSchema(bomItems).omit({
  id: true,
  createdAt: true,
});

export type InsertBomItem = z.infer<typeof insertBomItemSchema>;
export type BomItem = typeof bomItems.$inferSelect;

// Master Key System Manufacturer Types
export const MASTER_KEY_MANUFACTURERS = {
  ALLEGION: "Allegion",
  ASSA_ABLOY: "ASSA ABLOY",
  DORMAKABA: "dormakaba",
  MEDECO: "Medeco",
  BEST: "Best",
  OTHER: "Other",
} as const;

export type MasterKeyManufacturer = typeof MASTER_KEY_MANUFACTURERS[keyof typeof MASTER_KEY_MANUFACTURERS];

// Key Level Types
export const KEY_LEVEL_TYPES = {
  GMK: "GMK",
  MK: "MK",
  SMK: "SMK",
  CHANGE: "CHANGE",
  CONSTRUCTION: "CONSTRUCTION",
  VENDOR: "VENDOR",
  SPECIAL: "SPECIAL",
} as const;

export type KeyLevelType = typeof KEY_LEVEL_TYPES[keyof typeof KEY_LEVEL_TYPES];

// Master Key Systems - Comprehensive hierarchical keying system with visualization support
export const masterKeySystems = pgTable("master_key_systems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  facilityId: varchar("facility_id"),
  name: text("name").notNull(),
  facilityName: text("facility_name").notNull(),
  manufacturer: varchar("manufacturer", { length: 64 }),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_master_key_systems_organization_id").on(table.organizationId),
  index("IDX_master_key_systems_facility_id").on(table.facilityId),
  index("IDX_master_key_systems_project_id").on(table.projectId),
]);

// Master Key System Data Schema (stored in 'data' JSONB column)
export const masterKeySystemDataSchema = z.object({
  keyways: z.array(z.object({
    id: z.string(),
    name: z.string(),
    manufacturer: z.string(),
    notes: z.string().optional(),
  })).default([]),
  nodes: z.array(z.object({
    id: z.string(),
    systemId: z.string(),
    code: z.string(),
    fullName: z.string(),
    levelType: z.string(),
    keywayId: z.string().optional(),
    manufacturer: z.string().optional(),
    bitting: z.string().optional(),
    parentId: z.string().optional(),
    childrenIds: z.array(z.string()),
    notes: z.string().optional(),
  })).default([]),
  doorOpenings: z.array(z.object({
    id: z.string(),
    label: z.string(),
    locationPath: z.string().optional(),
  })).default([]),
  assignments: z.array(z.object({
    id: z.string(),
    keyNodeId: z.string(),
    doorId: z.string(),
  })).default([]),
  brand: z.object({
    orgName: z.string(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string().optional(),
    watermarkText: z.string().optional(),
    footerText: z.string().optional(),
    termsAndConditions: z.string(),
    hideManufacturerNamesOnCustomerView: z.boolean().optional(),
    hideBittingOnCustomerView: z.boolean().optional(),
    hideKeywayOnCustomerView: z.boolean().optional(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MasterKeySystemData = z.infer<typeof masterKeySystemDataSchema>;

export const insertMasterKeySystemSchema = createInsertSchema(masterKeySystems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  manufacturer: z.enum([
    "Allegion", "ASSA ABLOY", "dormakaba", "Medeco", "Best", "Other"
  ]).optional().nullable(),
  data: masterKeySystemDataSchema,
});

export type InsertMasterKeySystem = z.infer<typeof insertMasterKeySystemSchema>;
export type MasterKeySystem = typeof masterKeySystems.$inferSelect;

// Key Records - Individual door key tracking for free tier users
export const keyRecords = pgTable("key_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  doorLabel: text("door_label").notNull(), // Door identifier e.g., "Room 101", "Main Entry"
  location: text("location"), // Location description e.g., "3rd Floor, Building A"
  
  // Key blank information
  keyBlank: text("key_blank"), // e.g., "Schlage C", "Best A2", "Medeco M3"
  keyBlankManufacturer: text("key_blank_manufacturer"), // Manufacturer of the key blank
  
  // Bitting and key details
  bittingCode: text("bitting_code"), // Key cut pattern e.g., "35246"
  keySymbol: text("key_symbol"), // What's stamped on the key e.g., "AA-1"
  pinning: text("pinning"), // Pin depths/chamber info e.g., "5-pin"
  
  // Cylinder information
  cylinderType: text("cylinder_type"), // mortise, rim, key-in-knob, key-in-lever, etc.
  cylinderBrand: text("cylinder_brand"), // Best, Schlage, Corbin-Russwin, Sargent, Medeco
  
  // Key quantities
  constructionKeyQty: integer("construction_key_qty"), // Number of construction/temporary keys
  permanentKeyQty: integer("permanent_key_qty"), // Number of permanent keys
  keyingRemarks: text("keying_remarks"), // Special keying instructions
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_key_records_organization_id").on(table.organizationId),
  index("IDX_key_records_door_label").on(table.doorLabel),
]);

export const insertKeyRecordSchema = createInsertSchema(keyRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateKeyRecordSchema = insertKeyRecordSchema.partial().omit({
  organizationId: true,
});

export type InsertKeyRecord = z.infer<typeof insertKeyRecordSchema>;
export type UpdateKeyRecord = z.infer<typeof updateKeyRecordSchema>;
export type KeyRecord = typeof keyRecords.$inferSelect;

// Lock Sets - Groups of locks with shared keying within a master key system
export const lockSets = pgTable("lock_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }), // Optional project association
  masterKeySystemId: varchar("master_key_system_id").references(() => masterKeySystems.id, { onDelete: "set null" }),
  
  setName: text("set_name").notNull(), // e.g., "3rd Floor East Wing"
  keyingLevel: text("keying_level"), // Grand Master, Master, Sub-Master, Change
  keySymbol: text("key_symbol"), // Key symbol/stamp for this set e.g., "AA-1"
  
  // Keying details
  bittingCode: text("bitting_code"), // Standard bitting for this set
  pinning: text("pinning"), // Pin depths if standardized across set
  
  quantity: integer("quantity").default(1), // Number of locks in this set
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLockSetSchema = createInsertSchema(lockSets).omit({
  id: true,
  createdAt: true,
});

export type InsertLockSet = z.infer<typeof insertLockSetSchema>;
export type LockSet = typeof lockSets.$inferSelect;

// Floor Plans - Blueprint and facility map uploads for location mapping
export const floorPlans = pgTable("floor_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }), // Optional project association
  
  name: text("name").notNull(), // e.g., "1st Floor Plan", "Building A - Level 2"
  description: text("description"),
  building: text("building"), // Building name/number
  floor: text("floor"), // Floor number/name
  
  // Image file stored as base64 or path
  imageData: text("image_data"), // Base64 encoded image (for small files) or file path
  imageMimeType: text("image_mime_type"), // image/png, image/jpeg, application/pdf
  imageFileName: text("image_file_name"), // Original filename
  
  // Scale and measurement information
  scaleRatio: real("scale_ratio"), // Pixels per foot for measurements
  scaleNotes: text("scale_notes"), // How scale was determined
  
  // Dimensions
  imageWidth: integer("image_width"), // Image width in pixels
  imageHeight: integer("image_height"), // Image height in pixels
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFloorPlanSchema = createInsertSchema(floorPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertFloorPlan = z.infer<typeof insertFloorPlanSchema>;
export type FloorPlan = typeof floorPlans.$inferSelect;

// Door Locations - Map door openings to positions on floor plans
export const doorLocations = pgTable("door_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  floorPlanId: varchar("floor_plan_id").notNull().references(() => floorPlans.id, { onDelete: "cascade" }),
  
  // Position on floor plan (pixel coordinates)
  xPosition: integer("x_position").notNull(), // X coordinate in pixels
  yPosition: integer("y_position").notNull(), // Y coordinate in pixels
  
  // Rotation and orientation
  rotation: real("rotation"), // Rotation angle in degrees (0-360)
  swingDirection: text("swing_direction"), // in-left, in-right, out-left, out-right
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDoorLocationSchema = createInsertSchema(doorLocations).omit({
  id: true,
  createdAt: true,
});

export type InsertDoorLocation = z.infer<typeof insertDoorLocationSchema>;
export type DoorLocation = typeof doorLocations.$inferSelect;

// Catalog Items - Product catalog for procurement
export const catalogItems = pgTable("catalog_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Multi-tenant ownership (nullable for migration)
  category: text("category").notNull(), // door, frame, hardware, automation, access-control
  manufacturer: text("manufacturer"),
  model: text("model").notNull(),
  specifications: text("specifications"),
  notes: text("notes"),
  requiresQuote: text("requires_quote").default("yes"), // yes, no - auto-quote for doors/frames, configurable for hardware
  defaultManufacturerContactId: varchar("default_manufacturer_contact_id"), // default manufacturer for quotes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCatalogItemSchema = createInsertSchema(catalogItems).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type CatalogItem = typeof catalogItems.$inferSelect;

// Hardware Cross-Reference - Map equivalent products across manufacturers
export const hardwareCrossReference = pgTable("hardware_cross_reference", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productType: text("product_type").notNull(), // e.g., "Push Plate", "Flush Pull", "Door Pull"
  description: text("description"), // Common description for the cross-referenced items
  
  // Manufacturer part numbers
  trimcoPart: text("trimco_part"),
  rockPart: text("rock_part"),
  abhPart: text("abh_part").notNull(), // ABH is the primary manufacturer
  abhDrawing: text("abh_drawing"), // ABH drawing number
  
  // Additional manufacturers can be added as needed
  otherManufacturerPart: text("other_manufacturer_part"),
  otherManufacturerName: text("other_manufacturer_name"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHardwareCrossReferenceSchema = createInsertSchema(hardwareCrossReference).omit({
  id: true,
  createdAt: true,
});

export type InsertHardwareCrossReference = z.infer<typeof insertHardwareCrossReferenceSchema>;
export type HardwareCrossReference = typeof hardwareCrossReference.$inferSelect;

// Door Templates - Pre-configured door opening templates
export const doorTemplates = pgTable("door_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Multi-tenant ownership (nullable for migration)
  name: text("name").notNull(), // e.g., "Single Door - Office", "Double Fire-Rated"
  description: text("description"),
  
  // Door specifications (pre-filled values)
  doorType: text("door_type"),
  doorMaterial: text("door_material"),
  doorWidth: text("door_width"),
  doorHeight: text("door_height"),
  doorThickness: text("door_thickness"),
  
  // Frame specifications
  frameType: text("frame_type"),
  frameMaterial: text("frame_material"),
  frameWidth: text("frame_width"),
  frameDepth: text("frame_depth"),
  
  // Hardware specifications
  lockType: text("lock_type"),
  hingeType: text("hinge_type"),
  hingeCount: text("hinge_count"),
  closerType: text("closer_type"),
  exitDevice: text("exit_device"),
  
  // Sidelites - Adjacent narrow panels beside the door
  sideliteLeft: text("sidelite_left"),
  sideliteLeftWidth: text("sidelite_left_width"),
  sideliteRight: text("sidelite_right"),
  sideliteRightWidth: text("sidelite_right_width"),
  sideliteGlassType: text("sidelite_glass_type"),
  
  // Transom - Panel above the door
  transomPresent: text("transom_present"),
  transomHeight: text("transom_height"),
  transomWidth: text("transom_width"),
  transomGlassType: text("transom_glass_type"),
  
  // Vision Lite/Light - Glass panel within the door itself
  visionLitePresent: text("vision_lite_present"),
  visionLiteWidth: text("vision_lite_width"),
  visionLiteHeight: text("vision_lite_height"),
  visionLiteLocation: text("vision_lite_location"),
  visionLiteGlassType: text("vision_lite_glass_type"),
  
  // Automation & Access Control
  automationRequired: text("automation_required"),
  automationType: text("automation_type"),
  accessControlRequired: text("access_control_required"),
  accessControlType: text("access_control_type"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDoorTemplateSchema = createInsertSchema(doorTemplates).omit({
  id: true,
  createdAt: true,
});

export type InsertDoorTemplate = z.infer<typeof insertDoorTemplateSchema>;
export type DoorTemplate = typeof doorTemplates.$inferSelect;

// Door Reference - Industry-standard door specifications and technical data
export const doorReference = pgTable("door_reference", {
  id: serial("id").primaryKey(),
  illustration: text("illustration"),
  category: text("category"),
  subcategory: text("subcategory"),
  doorType: text("door_type"),
  material: text("material"),
  finish: text("finish"),
  configuration: text("configuration"),
  operation: text("operation"),
  frameType: text("frame_type"),
  hardware: text("hardware"),
  glassType: text("glass_type"),
  automationReady: text("automation_ready"),
  commonUse: text("common_use"),
  notes: text("notes"),
  imageReference: text("image_reference"),
  dutyLevel: text("duty_level"),
  coreType: text("core_type"),
  anchorType: text("anchor_type"),
  gaugeDoor: text("gauge_door"),
  gaugeFrame: text("gauge_frame"),
  hardwarePrepType: text("hardware_prep_type"),
  reinforcementSpec: text("reinforcement_spec"),
  finishStandard: text("finish_standard"),
  fireLabel: text("fire_label"),
  toleranceGuide: text("tolerance_guide"),
  wallTypeAnchorCompatibility: text("wall_type___anchor_compatibility"),
  thermalRating: text("thermal_rating"),
  constructionTypeHmma810: text("construction_type_hmma_810"),
  edgeProfile: text("edge_profile"),
  meetingEdgeAstragal: text("meeting_edge___astragal"),
  visionLiteType: text("vision_lite_type"),
  louverType: text("louver_type"),
  hingeType: text("hinge_type"),
  closerType: text("closer_type"),
  lockType: text("lock_type"),
  exitDeviceType: text("exit_device_type"),
  stdLockClIn: real("std_lock_cl_in"),
  stdPullDeadlockClIn: real("std_pull_deadlock_cl_in"),
  hospitalLatchClIn: real("hospital_latch_cl_in"),
  standardClearances: text("standard_clearances"),
});

export const insertDoorReferenceSchema = createInsertSchema(doorReference).omit({
  id: true,
});

export type InsertDoorReference = z.infer<typeof insertDoorReferenceSchema>;
export type DoorReference = typeof doorReference.$inferSelect;

// Options Lookup - Dropdown options for various door fields
export const optionsLookup = pgTable("options_lookup", {
  id: serial("id").primaryKey(),
  field: text("field").notNull(),
  value: text("value").notNull(),
});

export const insertOptionsLookupSchema = createInsertSchema(optionsLookup).omit({
  id: true,
});

export type InsertOptionsLookup = z.infer<typeof insertOptionsLookupSchema>;
export type OptionsLookup = typeof optionsLookup.$inferSelect;

// Survey Field Reference - Field survey guidance and best practices
export const surveyFieldReference = pgTable("survey_field_reference", {
  id: serial("id").primaryKey(),
  topic: text("topic"),
  guidance: text("guidance"),
}, (table) => [
  index("IDX_survey_field_reference_topic").on(table.topic),
]);

export const insertSurveyFieldReferenceSchema = createInsertSchema(surveyFieldReference).omit({
  id: true,
});

export type InsertSurveyFieldReference = z.infer<typeof insertSurveyFieldReferenceSchema>;
export type SurveyFieldReference = typeof surveyFieldReference.$inferSelect;

// Hardware Location Cheat - Standard hardware centerline specifications
export const hardwareLocationCheat = pgTable("hardware_location_cheat", {
  id: serial("id").primaryKey(),
  item: text("item"),
  recommendedCenterlineIn: text("recommended_centerline_in"),
}, (table) => [
  index("IDX_hardware_location_cheat_item").on(table.item),
]);

export const insertHardwareLocationCheatSchema = createInsertSchema(hardwareLocationCheat).omit({
  id: true,
});

export type InsertHardwareLocationCheat = z.infer<typeof insertHardwareLocationCheatSchema>;
export type HardwareLocationCheat = typeof hardwareLocationCheat.$inferSelect;

// Edge Lite Types HMMA 810 - Edge profile and lite type standards
export const edgeLiteTypesHmma810 = pgTable("edge_lite_types_hmma_810", {
  id: serial("id").primaryKey(),
  category: text("category"),
  examplesOrNotes: text("examples_or_notes"),
}, (table) => [
  index("IDX_edge_lite_types_category").on(table.category),
]);

export const insertEdgeLiteTypesHmma810Schema = createInsertSchema(edgeLiteTypesHmma810).omit({
  id: true,
});

export type InsertEdgeLiteTypesHmma810 = z.infer<typeof insertEdgeLiteTypesHmma810Schema>;
export type EdgeLiteTypesHmma810 = typeof edgeLiteTypesHmma810.$inferSelect;

// Compliance Rules - Building codes, fire codes, and manufacturing standards
export const complianceRules = pgTable("compliance_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(), // e.g., "IBC-1010.1.1", "NFPA-80-4.2.1"
  codeType: text("code_type").notNull(), // building_code, fire_code, manufacturing_standard, ada_standard
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("warning"), // critical, warning, info
  
  // Rule conditions (JSON structure for flexible rule definition)
  conditions: jsonb("conditions").notNull(), // { field: "doorWidth", operator: ">=", value: "36", unit: "inches" }
  
  // Applicability filters
  buildingTypes: text("building_types").array(), // ["hospital", "office"], null = all types
  doorTypes: text("door_types").array(), // ["fire-rated", "exit"], null = all types
  
  active: text("active").notNull().default("yes"), // yes, no
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertComplianceRuleSchema = createInsertSchema(complianceRules).omit({
  id: true,
  createdAt: true,
});

export type InsertComplianceRule = z.infer<typeof insertComplianceRuleSchema>;
export type ComplianceRule = typeof complianceRules.$inferSelect;

// Compliance Violations - Detected violations for door openings
export const complianceViolations = pgTable("compliance_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  ruleId: varchar("rule_id").notNull().references(() => complianceRules.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("open"), // open, resolved, waived
  resolutionNotes: text("resolution_notes"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertComplianceViolationSchema = createInsertSchema(complianceViolations).omit({
  id: true,
  detectedAt: true,
});

export type InsertComplianceViolation = z.infer<typeof insertComplianceViolationSchema>;
export type ComplianceViolation = typeof complianceViolations.$inferSelect;

// Code Embeddings - RAG vector storage for building code sections (IBC/ADA/NFPA)
// Used for semantic search and citation-backed compliance recommendations
export const codeEmbeddings = pgTable("code_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Content
  chunk: text("chunk").notNull(), // Text chunk from code document
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-3-small
  
  // Metadata for citations
  codeType: text("code_type").notNull(), // IBC, ADA, NFPA, etc.
  section: text("section"), // Section number (e.g., "1010.1.1")
  chapter: text("chapter"), // Chapter title
  page: integer("page"), // Page number in source document
  edition: text("edition"), // Code edition/year (e.g., "2021")
  
  // Additional context
  title: text("title"), // Section title
  category: text("category"), // egress, fire, accessibility, etc.
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // Index for vector similarity search (using cosine distance)
  index("idx_code_embeddings_vector").using("hnsw", table.embedding.op("vector_cosine_ops")),
  index("idx_code_embeddings_type").on(table.codeType),
  index("idx_code_embeddings_category").on(table.category),
]);

export const insertCodeEmbeddingSchema = createInsertSchema(codeEmbeddings).omit({
  id: true,
  createdAt: true,
});

export type InsertCodeEmbedding = z.infer<typeof insertCodeEmbeddingSchema>;
export type CodeEmbedding = typeof codeEmbeddings.$inferSelect;

// Validation Results - US/Canada building code validation results for door openings
export const validationResults = pgTable("validation_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  
  // Validation context
  country: varchar("country").notNull().default("US"), // US, CA
  residential: text("residential").notNull().default("no"), // yes, no
  accessibleRoute: text("accessible_route").notNull().default("yes"), // yes, no
  egressRequired: text("egress_required").notNull().default("yes"), // yes, no
  occupantLoad: integer("occupant_load").default(0), // Building occupant load
  
  // Overall validation status
  totalChecks: integer("total_checks").notNull().default(0),
  failedChecks: integer("failed_checks").notNull().default(0),
  passedChecks: integer("passed_checks").notNull().default(0),
  overallStatus: varchar("overall_status").notNull().default("pending"), // passed, failed, pending
  
  // Detailed results - Array of validation check results
  // Each result: { code: string, passed: boolean, severity: "FAIL" | "WARN" | "INFO", message: string, context: object }
  results: jsonb("results").notNull().default(sql`'[]'::jsonb`),
  
  // Input measurements used for validation
  measurements: jsonb("measurements"), // { clear_opening_in: 32, clear_height_in: 80, threshold_height_in: 0.5, hardware_height_in: 42, gaps_in: {...}, maneuvering: {...} }
  
  // Door configuration used for validation
  doorConfig: jsonb("door_config"), // { type: "swing", operation: "manual", fire_rating_minutes: 90, has_breakout: false, power_fail_safe_open: true }
  
  validatedAt: timestamp("validated_at").notNull().defaultNow(),
});

export const insertValidationResultSchema = createInsertSchema(validationResults).omit({
  id: true,
  validatedAt: true,
}).extend({
  country: z.enum(["US", "CA"]).default("US"),
  residential: z.enum(["yes", "no"]).default("no"),
  accessibleRoute: z.enum(["yes", "no"]).default("yes"),
  egressRequired: z.enum(["yes", "no"]).default("yes"),
  overallStatus: z.enum(["passed", "failed", "pending"]).default("pending"),
});

export type InsertValidationResult = z.infer<typeof insertValidationResultSchema>;
export type ValidationResult = typeof validationResults.$inferSelect;

// AI Corrections - Track user corrections to improve AI accuracy
export const aiCorrections = pgTable("ai_corrections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "cascade" }),
  correctionType: text("correction_type").notNull(), // photo_analysis, measurement_validation, compliance
  originalData: jsonb("original_data").notNull(), // AI-generated data
  correctedData: jsonb("corrected_data").notNull(), // User-corrected data
  context: text("context"), // Additional context about the correction
  insights: jsonb("insights"), // AI-generated insights from the correction
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiCorrectionSchema = createInsertSchema(aiCorrections).omit({
  id: true,
  createdAt: true,
});

export type InsertAiCorrection = z.infer<typeof insertAiCorrectionSchema>;
export type AiCorrection = typeof aiCorrections.$inferSelect;

// Manufacturer Contacts - Contact information for manufacturers (GLOBALLY SHARED)
export const manufacturerContacts = pgTable("manufacturer_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }), // Optional: Track which org created this (nullable for global sharing)
  manufacturerName: text("manufacturer_name").notNull(),
  contactName: text("contact_name").notNull(),
  role: text("role"), // sales, technical, support
  email: text("email").notNull(),
  phone: text("phone"),
  regions: text("regions").array(), // geographic regions served
  notes: text("notes"),
  isPrimary: text("is_primary").default("no"), // yes, no - primary contact for this manufacturer
  metadata: jsonb("metadata"), // additional structured data
  
  // Pricing and discounts
  discountMultiplier: text("discount_multiplier"), // Discount format: decimal (e.g., "0.5") or stacked percentage (e.g., "50/10/5" = 50% off, then 10%, then 5%)
  
  // Audit trail for shared resource
  lastEditedBy: varchar("last_edited_by"), // User ID who last edited
  lastEditedByOrg: varchar("last_edited_by_org"), // Organization ID that last edited
  version: integer("version").notNull().default(1), // Optimistic concurrency control
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_manufacturer_contacts_name").on(table.manufacturerName),
  index("IDX_manufacturer_contacts_email").on(table.email),
]);

export const insertManufacturerContactSchema = createInsertSchema(manufacturerContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  lastEditedBy: true,
  lastEditedByOrg: true,
});

// Discount multiplier validation schema
export const discountMultiplierSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      
      // Check if it's a stacked percentage format (contains "/")
      if (val.includes("/")) {
        const parts = val.split("/");
        return parts.every((part) => {
          const num = parseFloat(part.trim());
          return !isNaN(num) && num >= 0 && num <= 100;
        });
      }
      
      // Check if it's a valid decimal or percentage
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    {
      message: "Discount must be a decimal (0-1), percentage (0-100), or stacked percentage (e.g., 50/10/5)",
    }
  );

export type InsertManufacturerContact = z.infer<typeof insertManufacturerContactSchema>;
export type ManufacturerContact = typeof manufacturerContacts.$inferSelect;

// Distributors/Vendors - Organization-specific vendor relationships with pricing
export const distributors = pgTable("distributors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Company name
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  accountNumber: text("account_number"), // Customer account number with this vendor
  vendorType: text("vendor_type"), // distributor, dealer, supplier, wholesaler
  regions: text("regions").array(), // Geographic regions served
  notes: text("notes"),
  
  // Pricing Configuration
  discountMultiplier: text("discount_multiplier"), // Same format as manufacturers: decimal ("0.7"), percentage ("30"), or stacked ("50/10/5")
  markupPercent: real("markup_percent"), // Additional markup percentage (e.g., 15 = 15% markup)
  flatFee: real("flat_fee"), // Flat fee per order (e.g., $50 processing fee)
  shippingFeeType: text("shipping_fee_type"), // 'percentage', 'flat', 'free'
  shippingFeeAmount: real("shipping_fee_amount"), // Amount based on type
  handlingFee: real("handling_fee"), // Handling fee per order
  minimumOrderAmount: real("minimum_order_amount"), // Minimum order value
  paymentTerms: text("payment_terms"), // NET30, NET60, COD, etc.
  
  // Primary distributor designation (one per org)
  isPrimary: boolean("is_primary").default(false).notNull(),
  
  // Soft delete for data integrity (prevent deletion if referenced in hardware_items)
  archivedAt: timestamp("archived_at"), // Null = active, non-null = archived
  
  metadata: jsonb("metadata"), // Additional structured data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_distributors_org").on(table.organizationId),
  index("IDX_distributors_name").on(table.name),
  index("IDX_distributors_active").on(table.organizationId, table.archivedAt), // For filtering active distributors
]);

export const insertDistributorSchema = createInsertSchema(distributors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  discountMultiplier: discountMultiplierSchema,
});

export type InsertDistributor = z.infer<typeof insertDistributorSchema>;
export type Distributor = typeof distributors.$inferSelect;

// Distributor-Manufacturer Relationships - Track which manufacturers each distributor can source from
export const distributorManufacturers = pgTable("distributor_manufacturers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  distributorId: varchar("distributor_id").notNull().references(() => distributors.id, { onDelete: "cascade" }),
  manufacturerName: text("manufacturer_name").notNull(), // Name of manufacturer this distributor can source from
  isPreferred: text("is_preferred").default("no"), // yes, no - preferred source for this manufacturer
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_dist_mfg_distributor").on(table.distributorId),
  index("IDX_dist_mfg_manufacturer").on(table.manufacturerName),
  // Unique constraint: one relationship per org/distributor/manufacturer combo
  index("UNQ_dist_mfg_combo").on(table.organizationId, table.distributorId, table.manufacturerName),
]);

export const insertDistributorManufacturerSchema = createInsertSchema(distributorManufacturers).omit({
  id: true,
  createdAt: true,
});

export type InsertDistributorManufacturer = z.infer<typeof insertDistributorManufacturerSchema>;
export type DistributorManufacturer = typeof distributorManufacturers.$inferSelect;

// Manufacturer Products - Link manufacturers to catalog items
export const manufacturerProducts = pgTable("manufacturer_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => manufacturerContacts.id, { onDelete: "cascade" }),
  catalogItemId: varchar("catalog_item_id").references(() => catalogItems.id, { onDelete: "cascade" }),
  productType: text("product_type").notNull(), // door, frame, hardware
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertManufacturerProductSchema = createInsertSchema(manufacturerProducts).omit({
  id: true,
  createdAt: true,
});

export type InsertManufacturerProduct = z.infer<typeof insertManufacturerProductSchema>;
export type ManufacturerProduct = typeof manufacturerProducts.$inferSelect;

// Manufacturer Literature - Technical documents like cut sheets, manuals, elevations (GLOBALLY VISIBLE)
// Note: organizationId tracks WHO uploaded the document, but ALL organizations can view all literature
export const manufacturerLiterature = pgTable("manufacturer_literature", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }), // Tracks uploader org (for provenance), not for access control
  contactId: varchar("contact_id").notNull().references(() => manufacturerContacts.id, { onDelete: "cascade" }),
  
  documentType: text("document_type").notNull(), // cut-sheet, installation-manual, elevation, building-requirements, specification, warranty, other
  title: text("title").notNull(),
  description: text("description"),
  
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"), // in bytes
  mimeType: text("mime_type"),
  
  productCatalogItemId: varchar("product_catalog_item_id").references(() => catalogItems.id, { onDelete: "set null" }), // Optional link to specific product
  
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  uploadedBy: text("uploaded_by"), // User email/name who uploaded
}, (table) => [
  index("IDX_manufacturer_literature_contact").on(table.contactId),
  index("IDX_manufacturer_literature_org").on(table.organizationId),
  index("IDX_manufacturer_literature_type").on(table.documentType),
]);

export const insertManufacturerLiteratureSchema = createInsertSchema(manufacturerLiterature).omit({
  id: true,
  uploadedAt: true,
}).extend({
  documentType: z.enum(["cut-sheet", "installation-manual", "elevation", "building-requirements", "specification", "warranty", "other"]),
});

export type InsertManufacturerLiterature = z.infer<typeof insertManufacturerLiteratureSchema>;
export type ManufacturerLiterature = typeof manufacturerLiterature.$inferSelect;

// Quote Requests - Track manufacturer quote requests
export const quoteRequests = pgTable("quote_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "cascade" }),
  hardwareItemId: varchar("hardware_item_id").references(() => hardwareItems.id, { onDelete: "cascade" }),
  manufacturerContactId: varchar("manufacturer_contact_id").notNull().references(() => manufacturerContacts.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("queued"), // queued, sent, acknowledged, ordered, cancelled
  triggerSource: text("trigger_source").notNull().default("manual"), // auto, manual
  payload: jsonb("payload"), // snapshot of opening/hardware data
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  responseNotes: text("response_notes"),
  
  // Engineering Review Process
  reviewStatus: text("review_status").notNull().default("draft"), // draft, pending_review, approved, rejected, needs_revision
  reviewedBy: text("reviewed_by"), // Name or email of engineering reviewer
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"), // Engineering reviewer comments
  submittedForReviewAt: timestamp("submitted_for_review_at"),
  
  // Customer Approval Process
  customerApprovalStatus: text("customer_approval_status").default("pending"), // pending, approved, rejected
  customerApprovedAt: timestamp("customer_approved_at"),
  customerApprovedBy: text("customer_approved_by"), // Email or name of customer approver
  customerApprovalTier: text("customer_approval_tier"), // basic, standard, premium
  customerApprovalNotes: text("customer_approval_notes"),
  
  // Payment Tracking (Stripe Integration)
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, pending, paid, refunded, failed
  paymentIntentId: text("payment_intent_id"), // Stripe Payment Intent ID
  paymentAmount: real("payment_amount"), // Amount in dollars
  paymentCurrency: text("payment_currency").default("usd"),
  paidAt: timestamp("paid_at"),
  paymentNotes: text("payment_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_quote_requests_project_id").on(table.projectId),
  index("IDX_quote_requests_opening_id").on(table.openingId),
  index("IDX_quote_requests_hardware_item_id").on(table.hardwareItemId),
  index("IDX_quote_requests_manufacturer_contact_id").on(table.manufacturerContactId),
  index("IDX_quote_requests_status").on(table.status),
  index("IDX_quote_requests_project_status").on(table.projectId, table.status),
]);

export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({
  id: true,
  createdAt: true,
});

export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;

// Purchase Orders - Formal orders to vendors/manufacturers
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poNumber: text("po_number").notNull().unique(), // e.g., "PO-2025-001"
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  quoteRequestId: varchar("quote_request_id").references(() => quoteRequests.id, { onDelete: "set null" }),
  vendorContactId: varchar("vendor_contact_id").notNull().references(() => manufacturerContacts.id, { onDelete: "restrict" }),
  
  status: text("status").notNull().default("draft"), // draft, sent, acknowledged, ordered, shipped, received, cancelled
  
  // Shipping & Delivery
  shipToName: text("ship_to_name"),
  shipToAddress: text("ship_to_address"),
  shipToCity: text("ship_to_city"),
  shipToState: text("ship_to_state"),
  shipToZip: text("ship_to_zip"),
  shipToAttention: text("ship_to_attention"),
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  shippingMethod: text("shipping_method"), // ground, expedited, will-call
  
  // Payment Terms
  paymentTerms: text("payment_terms").default("Net 30"), // Net 30, Net 60, Due on Receipt, COD
  taxRate: real("tax_rate").default(0), // percentage
  shippingCost: real("shipping_cost").default(0),
  
  // Totals (calculated from line items)
  subtotal: real("subtotal").default(0),
  taxAmount: real("tax_amount").default(0),
  totalAmount: real("total_amount").default(0),
  
  // Notes
  notes: text("notes"), // special instructions
  internalNotes: text("internal_notes"), // not visible on PO
  
  // Tracking
  trackingNumber: text("tracking_number"),
  sentAt: timestamp("sent_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_purchase_orders_project_id").on(table.projectId),
  index("IDX_purchase_orders_quote_request_id").on(table.quoteRequestId),
  index("IDX_purchase_orders_vendor_contact_id").on(table.vendorContactId),
  index("IDX_purchase_orders_status").on(table.status),
  index("IDX_purchase_orders_po_number").on(table.poNumber),
  index("IDX_purchase_orders_project_status").on(table.projectId, table.status),
]);

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Purchase Order Line Items - Individual items on a PO
export const purchaseOrderLineItems = pgTable("purchase_order_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: varchar("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  
  lineNumber: serial("line_number"), // sequential line numbering
  
  // Item Details
  itemType: text("item_type").notNull(), // door, frame, hardware, glass, automation
  description: text("description").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  specifications: text("specifications"), // detailed specs
  
  // Quantity & Pricing
  quantity: real("quantity").notNull().default(1),
  unitOfMeasure: text("unit_of_measure").default("each"), // each, set, pair, sqft
  unitPrice: real("unit_price").notNull().default(0),
  lineTotal: real("line_total").notNull().default(0), // quantity * unitPrice
  
  // Reference
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "set null" }),
  catalogItemId: varchar("catalog_item_id").references(() => catalogItems.id, { onDelete: "set null" }),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseOrderLineItemSchema = createInsertSchema(purchaseOrderLineItems).omit({
  id: true,
  createdAt: true,
  lineNumber: true,
});

export type InsertPurchaseOrderLineItem = z.infer<typeof insertPurchaseOrderLineItemSchema>;
export type PurchaseOrderLineItem = typeof purchaseOrderLineItems.$inferSelect;

// Vendor Quotes - Quote documents received from vendors
export const vendorQuotes = pgTable("vendor_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  quoteRequestId: varchar("quote_request_id").references(() => quoteRequests.id, { onDelete: "set null" }),
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  vendorContactId: varchar("vendor_contact_id").notNull().references(() => manufacturerContacts.id, { onDelete: "restrict" }),
  
  // Quote details
  quoteNumber: text("quote_number"), // Vendor's quote number
  quoteDate: timestamp("quote_date"),
  validUntil: timestamp("valid_until"), // Quote expiration date
  totalAmount: real("total_amount").default(0),
  currency: text("currency").default("USD"),
  
  // File details
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // pdf, xlsx, docx, etc.
  fileSize: real("file_size"), // in bytes
  fileData: text("file_data").notNull(), // base64 encoded file content
  
  // Additional metadata
  description: text("description"), // Brief description of the quote
  notes: text("notes"), // Internal notes
  status: text("status").default("pending"), // pending, accepted, rejected, expired
  
  uploadedBy: text("uploaded_by"), // Name or email of uploader
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVendorQuoteSchema = createInsertSchema(vendorQuotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendorQuote = z.infer<typeof insertVendorQuoteSchema>;
export type VendorQuote = typeof vendorQuotes.$inferSelect;

// Project Costs - Comprehensive cost tracking for projects
export const projectCosts = pgTable("project_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  
  // Cost of Business - Baseline overhead costs applied to every job
  baselineTravelOverhead: real("baseline_travel_overhead").default(0), // Fixed travel cost per job
  baselineProcurementOverhead: real("baseline_procurement_overhead").default(0), // Fixed procurement cost per job
  baselineReviewLaborOverhead: real("baseline_review_labor_overhead").default(0), // Fixed review labor cost per job
  
  // Labor Hours & Rates
  pmHours: real("pm_hours").default(0),
  pmHourlyRate: real("pm_hourly_rate").default(0),
  engineeringHours: real("engineering_hours").default(0),
  engineeringHourlyRate: real("engineering_hourly_rate").default(0),
  surveyHours: real("survey_hours").default(0),
  surveyHourlyRate: real("survey_hourly_rate").default(0),
  
  // Fixed Costs
  overheadCost: real("overhead_cost").default(0),
  travelTime: real("travel_time").default(0), // hours or cost
  travelRate: real("travel_rate").default(0), // hourly rate for travel
  initialVisitCost: real("initial_visit_cost").default(0),
  expeditedCost: real("expedited_cost").default(0),
  subcontractorCost: real("subcontractor_cost").default(0),
  
  // Margins & Adjustments (percentages)
  marginPercent: real("margin_percent").default(0),
  discountPercent: real("discount_percent").default(0),
  surchargePercent: real("surcharge_percent").default(0),
  
  // Fees & Charges
  materialFuelCharge: real("material_fuel_charge").default(0),
  handlingFee: real("handling_fee").default(0),
  programmingTestingLabelingFee: real("programming_testing_labeling_fee").default(0),
  firePreventionInspectionFee: real("fire_prevention_inspection_fee").default(0),
  fireRelabelingInspectionFee: real("fire_relabeling_inspection_fee").default(0),
  disposalFee: real("disposal_fee").default(0),
  
  // Consumable Allowances
  consumableAllowance: real("consumable_allowance").default(0), // shims, sealants, lubricants
  consumableNotes: text("consumable_notes"), // details on consumables
  
  // Enhanced Calculations (Auto-calculated from openings and project data)
  estimatedInstallationHours: real("estimated_installation_hours").default(0), // Total installation time
  hardwareMaterialCost: real("hardware_material_cost").default(0), // Sum of all hardware costs
  hardwareWasteCost: real("hardware_waste_cost").default(0), // Waste allowance for hardware
  
  // Freight/Shipping
  freightBaseCost: real("freight_base_cost").default(0),
  freightFuelSurcharge: real("freight_fuel_surcharge").default(0),
  freightExpedited: real("freight_expedited").default(0),
  freightLiftGate: real("freight_lift_gate").default(0),
  shippingDistance: real("shipping_distance").default(0), // miles
  totalProjectWeight: real("total_project_weight").default(0), // pounds
  customShippingCost: real("custom_shipping_cost"), // Optional: manual override for total shipping cost
  
  // International Trade & Landed Cost (Project-level defaults)
  defaultFuelSurchargePercent: real("default_fuel_surcharge_percent").default(0), // Default fuel surcharge % for line items
  defaultAccessorialsCost: real("default_accessorials_cost").default(0), // Default accessorial charges
  defaultInsuranceCost: real("default_insurance_cost").default(0), // Default cargo insurance cost
  defaultCustomsBrokerageCost: real("default_customs_brokerage_cost").default(0), // Default customs clearance fee
  defaultIncoterm: text("default_incoterm"), // Default International Commercial Terms (FOB, CIF, DDP, EXW)
  totalTariffsCost: real("total_tariffs_cost").default(0), // Auto-calculated: sum of all import tariffs
  totalAntiDumpingCost: real("total_anti_dumping_cost").default(0), // Auto-calculated: sum of anti-dumping duties
  totalOtherDutiesCost: real("total_other_duties_cost").default(0), // Auto-calculated: sum of other customs duties
  totalLandedCost: real("total_landed_cost").default(0), // Auto-calculated: total landed cost including all duties/freight
  
  // Tax
  taxRate: real("tax_rate").default(0), // percentage
  taxableLabor: text("taxable_labor").default("no"), // yes, no - whether labor is taxable
  taxAmount: real("tax_amount").default(0),
  
  // General notes
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectCostSchema = createInsertSchema(projectCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectCost = z.infer<typeof insertProjectCostSchema>;
export type ProjectCost = typeof projectCosts.$inferSelect;

// Lite Kits - Standard hollow metal door lite kit configurations from manufacturers
export const liteKits = pgTable("lite_kits", {
  id: serial("id").primaryKey(),
  kitModel: text("kit_model").notNull().unique(), // L-FRA100, L-GLF100, etc.
  kitType: text("kit_type").notNull(), // Low Profile (steel), Flush Glazed, etc.
  doorMaterials: text("door_materials").notNull(), // Hollow Metal, Wood, Aluminum, etc.
  stdDoorThicknessIn: real("std_door_thickness_in").notNull().default(1.75),
  variableThickness: text("variable_thickness"), // Via option or specify at order
  positivePresurreUL10C: text("positive_pressure_ul10c").default("no"), // yes, no
  maxFireRatingMetalDoor: text("max_fire_rating_metal_door"), // 3 hr, 90 min, etc.
  maxFireRatingWoodDoor: text("max_fire_rating_wood_door"), // 90 min, 60 min, etc.
  smokeSLabelCapable: text("smoke_s_label_capable").default("no"), // yes, no
  adaBottomEdgeMaxIn: real("ada_bottom_edge_max_in").default(43), // Max 43" per ADA
  stdGlazingTape: text("std_glazing_tape"), // L-GT-118, etc.
  intumescentTape: text("intumescent_tape"), // 9800C, etc.
  stcOption: text("stc_option").default("no"), // yes, no
  notesUseCase: text("notes_use_case"), // Hospital, hotel, corridor, etc.
  presetHospital: text("preset_hospital").default("no"), // yes, no
  presetHotel: text("preset_hotel").default("no"), // yes, no
  defaultFinish: text("default_finish"), // GPZ Gray Primer, etc.
  finishNote: text("finish_note"), // Optional colors available
  adderMullionBarEach: real("adder_mullion_bar_each").default(0),
  adderTorxScrewsUpto24x24: real("adder_torx_screws_upto_24x24").default(0),
  adderTorxScrewsOver24x24: real("adder_torx_screws_over_24x24").default(0),
  adderLeadLiningPerPerimeterIn: real("adder_lead_lining_per_perimeter_in").default(0),
  adderStcPerSqft: real("adder_stc_per_sqft").default(0),
  notes: text("notes"),
});

export const insertLiteKitSchema = createInsertSchema(liteKits).omit({
  id: true,
});

export type InsertLiteKit = z.infer<typeof insertLiteKitSchema>;
export type LiteKit = typeof liteKits.$inferSelect;

// Glass Types - Glazing options for vision lites and full glass doors
export const glassTypes = pgTable("glass_types", {
  id: serial("id").primaryKey(),
  glassName: text("glass_name").notNull().unique(), // FireLite NT, Pyran Platinum L, etc.
  thicknessIn: text("thickness_in").notNull(), // 3/16, 7/32, 1/4, etc. (can be range like "3/16, 7/32")
  fireRating: text("fire_rating").notNull(), // 60-90 min, 3 hr, 20 min, 45 min, Non-fire
  maxAreaSqInFor60_90Min: real("max_area_sq_in_for_60_90_min"), // e.g., 100 sq in
  maxAreaSqInFor20_45Min: real("max_area_sq_in_for_20_45_min"), // e.g., 1296 sq in
  safetyStandard: text("safety_standard"), // CPSC Cat I & II, etc.
  stcRating: text("stc_rating"), // STC 30, STC 35, etc.
  gasketing: text("gasketing"), // Butyl/PVC per kit, Intumescent, etc.
  ul10C: text("ul10c"), // Positive pressure rated? yes/no
  notes: text("notes"), // Energy performance, security, behavioral health use, etc.
  presetHospital: text("preset_hospital").default("no"), // yes, no
  presetOffice: text("preset_office").default("no"), // yes, no
  presetHotel: text("preset_hotel").default("no"), // yes, no
});

export const insertGlassTypeSchema = createInsertSchema(glassTypes).omit({
  id: true,
});

export type InsertGlassType = z.infer<typeof insertGlassTypeSchema>;
export type GlassType = typeof glassTypes.$inferSelect;

// Glass Fire Sizes - Valid width/height combinations for fire-rated glass
export const glassFireSizes = pgTable("glass_fire_sizes", {
  id: serial("id").primaryKey(),
  glassType: text("glass_type").notNull(), // FireLite NT, Pyran Platinum F, Pyran Platinum L
  widthIn: real("width_in").notNull(),
  heightIn: real("height_in").notNull(),
  priceUsd: real("price_usd"), // Optional pricing
  notes: text("notes"),
});

export const insertGlassFireSizeSchema = createInsertSchema(glassFireSizes).omit({
  id: true,
});

export type InsertGlassFireSize = z.infer<typeof insertGlassFireSizeSchema>;
export type GlassFireSize = typeof glassFireSizes.$inferSelect;

// Pivot and Patch Hardware - Glass door pivot and patch fitting hardware catalog
export const pivotPatchHardware = pgTable("pivot_patch_hardware", {
  id: serial("id").primaryKey(),
  manufacturer: text("manufacturer").notNull(), // CRL, ASSA ABLOY, Rockwood, Sugatsune, etc.
  partNumber: text("part_number").notNull().unique(), // PH20C, PH21, PH10C, etc.
  role: text("role").notNull(), // TopPatch, BottomPatch, TopPivotInsert, PatchDoorKit, etc.
  glassThicknessMm: text("glass_thickness_mm").array(), // [10, 12], etc.
  offsetMm: real("offset_mm"), // 70, 65, etc.
  maxHeightMm: real("max_height_mm"), // 2591, etc.
  maxWeightKg: real("max_weight_kg"), // 88, 80, etc.
  finish: text("finish").array(), // ['BrushedStainless', 'Polished', 'MatteBlack']
  compatibleParts: text("compatible_parts").array(), // ['PH10C', '1NT403', etc.]
  notes: text("notes"), // Adjustable top patch; ±3° alignment, etc.
  source: text("source"), // https://www.crlaurence.com/, etc.
});

export const insertPivotPatchHardwareSchema = createInsertSchema(pivotPatchHardware).omit({
  id: true,
});

export type InsertPivotPatchHardware = z.infer<typeof insertPivotPatchHardwareSchema>;
export type PivotPatchHardware = typeof pivotPatchHardware.$inferSelect;

// Disclaimers - Disclaimers, addendums, exclusions, and client responsibility statements
export const disclaimers = pgTable("disclaimers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // e.g., "Fire Door Installation Requirements"
  type: text("type").notNull(), // disclaimer, addendum, exclusion, client-responsibility
  content: text("content").notNull(), // The actual text/statement
  category: text("category"), // hardware, safety, installation, compliance, warranty, etc.
  isActive: text("is_active").default("yes"), // yes, no - can be disabled without deleting
  sortOrder: real("sort_order").default(0), // For ordering in proposals
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDisclaimerSchema = createInsertSchema(disclaimers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDisclaimer = z.infer<typeof insertDisclaimerSchema>;
export type Disclaimer = typeof disclaimers.$inferSelect;

// Disclaimer Links - Link disclaimers to hardware items, bundles, catalog items, etc.
export const disclaimerLinks = pgTable("disclaimer_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disclaimerId: varchar("disclaimer_id").notNull().references(() => disclaimers.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // hardware-item, bundle, catalog-item, compliance-rule, safety-requirement
  entityId: varchar("entity_id").notNull(), // ID of the linked entity
  isRequired: text("is_required").default("yes"), // yes, no - whether this disclaimer must be included
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDisclaimerLinkSchema = createInsertSchema(disclaimerLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertDisclaimerLink = z.infer<typeof insertDisclaimerLinkSchema>;
export type DisclaimerLink = typeof disclaimerLinks.$inferSelect;

// Gasketing Catalog - Comprehensive catalog of gasketing products
export const gasketingCatalog = pgTable("gasketing_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manufacturer: text("manufacturer").notNull(), // Pemko, NGP, Reese, Smoke Guard, etc.
  partNumber: text("part_number").notNull(),
  category: text("category").notNull(), // perimeter-seal, threshold-seal, meeting-stile-seal, astragal, smoke-seal, sound-seal, weather-seal, door-bottom
  productName: text("product_name").notNull(),
  description: text("description"),
  material: text("material"), // silicone, neoprene, EPDM, vinyl, aluminum, intumescent
  fireRating: text("fire_rating"), // 20-min, 45-min, 60-min, 90-min, 3-hour
  smokeRating: text("smoke_rating"), // yes, no - UL 1784 smoke seal rating
  soundRating: text("sound_rating"), // STC rating if applicable
  application: text("application"), // frame-mount, door-mount, floor-mount, header-mount
  doorType: text("door_type"), // wood, metal, glass, all - Compatible door types
  dimensions: text("dimensions"), // e.g., "1-1/2" x 84"", "36" length"
  finish: text("finish"), // mill, bronze, dark-bronze, black, aluminum, etc.
  listPrice: real("list_price"),
  notes: text("notes"),
  isActive: text("is_active").default("yes"), // yes, no
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGasketingCatalogSchema = createInsertSchema(gasketingCatalog).omit({
  id: true,
  createdAt: true,
});

export type InsertGasketingCatalog = z.infer<typeof insertGasketingCatalogSchema>;
export type GasketingCatalog = typeof gasketingCatalog.$inferSelect;

// Opening Gasketing - Many-to-many relationship between openings and gasketing items
export const openingGasketing = pgTable("opening_gasketing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  gasketingId: varchar("gasketing_id").notNull().references(() => gasketingCatalog.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull().default(1),
  location: text("location"), // e.g., "head", "jambs", "meeting-stile", "threshold", "perimeter"
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOpeningGasketingSchema = createInsertSchema(openingGasketing).omit({
  id: true,
  createdAt: true,
});

export type InsertOpeningGasketing = z.infer<typeof insertOpeningGasketingSchema>;
export type OpeningGasketing = typeof openingGasketing.$inferSelect;

// ============================================================================
// SALES & MARKETING TABLES
// ============================================================================

// Leads - Potential customers from marketing funnel
// Prelaunch Signups - Waitlist for January 2026 launch with comprehensive funnel tracking
export const prelaunchSignups = pgTable("prelaunch_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  company: text("company"),
  // Enhanced tracking fields for funnel analytics
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referralSource: text("referral_source"), // Direct traffic, organic, social, etc.
  referrer: text("referrer"), // HTTP referrer URL
  // UTM tracking parameters
  utmSource: varchar("utm_source"),
  utmMedium: varchar("utm_medium"),
  utmCampaign: varchar("utm_campaign"),
  utmContent: varchar("utm_content"),
  utmTerm: varchar("utm_term"),
  // Engagement tracking for funnel conversion
  emailOpened: timestamp("email_opened"), // When launch notification was opened
  emailClicked: timestamp("email_clicked"), // When CTA in email was clicked
  trialStarted: timestamp("trial_started"), // When they started trial (post-launch)
  convertedToPaid: timestamp("converted_to_paid"), // When they became paying customer
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Link to user account if created
  notes: text("notes"), // Admin notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_prelaunch_email").on(table.email),
  index("IDX_prelaunch_utm_campaign").on(table.utmCampaign),
  index("IDX_prelaunch_created_at").on(table.createdAt),
]);

export const insertPrelaunchSignupSchema = createInsertSchema(prelaunchSignups).omit({
  id: true,
  createdAt: true,
});

export type InsertPrelaunchSignup = z.infer<typeof insertPrelaunchSignupSchema>;
export type PrelaunchSignup = typeof prelaunchSignups.$inferSelect;

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Which org captured this lead
  companyName: text("company_name"), // Lead's company
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  jobTitle: text("job_title"),
  source: text("source").notNull(), // website, referral, demo-request, pricing-inquiry, contact-form, tradeshow, linkedin, cold-call
  status: text("status").notNull().default("new"), // new, contacted, qualified, proposal, negotiation, won, lost, unqualified
  leadScore: integer("lead_score").default(0), // 0-100 scoring
  estimatedValue: real("estimated_value"), // Potential deal value
  estimatedCloseDate: timestamp("estimated_close_date"),
  companySize: text("company_size"), // 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+
  industry: text("industry"), // commercial-real-estate, healthcare, hospitality, education, government, property-management, construction
  interestedIn: text("interested_in"), // doors-survey, hardware-specification, project-management, full-platform
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  assignedTo: varchar("assigned_to").references(() => users.id), // Sales rep assigned
  convertedToCustomerId: varchar("converted_to_customer_id").references(() => customers.id), // If won, linked customer
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_leads_organization_id").on(table.organizationId),
  index("IDX_leads_status").on(table.status),
  index("IDX_leads_assigned_to").on(table.assignedTo),
  index("IDX_leads_converted_to_customer_id").on(table.convertedToCustomerId),
  index("IDX_leads_org_status").on(table.organizationId, table.status),
]);

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Sales Activities - Track interactions with leads
export const salesActivities = pgTable("sales_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id), // Who performed the activity
  activityType: text("activity_type").notNull(), // call, email, meeting, demo, proposal, note
  subject: text("subject").notNull(),
  description: text("description"),
  outcome: text("outcome"), // successful, unsuccessful, follow-up-needed, no-answer
  nextFollowUp: timestamp("next_follow_up"),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSalesActivitySchema = createInsertSchema(salesActivities).omit({
  id: true,
  createdAt: true,
});

export type InsertSalesActivity = z.infer<typeof insertSalesActivitySchema>;
export type SalesActivity = typeof salesActivities.$inferSelect;

// Marketing Campaigns - Track lead sources and campaigns
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // email, webinar, tradeshow, content, social, ppc, seo
  status: text("status").notNull().default("draft"), // draft, active, paused, completed
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: real("budget"),
  leadsGenerated: integer("leads_generated").default(0),
  conversions: integer("conversions").default(0),
  revenue: real("revenue").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;

// Marketing Landing Pages - Public pages for lead generation
export const marketingLandingPages = pgTable("marketing_landing_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  slug: varchar("slug").notNull().unique(), // URL path: /landing/{slug}
  title: text("title").notNull(),
  headline: text("headline").notNull(),
  subheadline: text("subheadline"),
  heroImageUrl: text("hero_image_url"),
  content: text("content"), // Rich text content
  targetAudience: text("target_audience"), // commercial-real-estate, contractors, property-managers, etc.
  status: text("status").notNull().default("draft"), // draft, published, archived
  
  // SEO
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"),
  
  // Analytics
  views: integer("views").default(0),
  leads: integer("leads").default(0),
  conversionRate: real("conversion_rate").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_landing_pages_slug").on(table.slug),
  index("IDX_landing_pages_status").on(table.status),
]);

export const insertMarketingLandingPageSchema = createInsertSchema(marketingLandingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
  leads: true,
  conversionRate: true,
});

export type InsertMarketingLandingPage = z.infer<typeof insertMarketingLandingPageSchema>;
export type MarketingLandingPage = typeof marketingLandingPages.$inferSelect;

// Marketing Lead Forms - Configurable forms for capturing leads
export const marketingLeadForms = pgTable("marketing_lead_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  landingPageId: varchar("landing_page_id").references(() => marketingLandingPages.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  
  // Form configuration
  fields: jsonb("fields").notNull(), // Array of field configs: [{name, type, label, required, options}]
  submitButtonText: text("submit_button_text").default("Get Started"),
  successMessage: text("success_message").default("Thank you! We'll be in touch soon."),
  redirectUrl: text("redirect_url"), // Optional redirect after submission
  
  // Settings
  requireEmailVerification: text("require_email_verification").default("no"), // yes, no
  autoAssignToUser: varchar("auto_assign_to_user").references(() => users.id), // Auto-assign leads to this user
  
  // Analytics
  submissions: integer("submissions").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketingLeadFormSchema = createInsertSchema(marketingLeadForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submissions: true,
});

export type InsertMarketingLeadForm = z.infer<typeof insertMarketingLeadFormSchema>;
export type MarketingLeadForm = typeof marketingLeadForms.$inferSelect;

// Marketing Leads - Captured leads from forms (before sales qualification)
export const marketingLeads = pgTable("marketing_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  formId: varchar("form_id").references(() => marketingLeadForms.id, { onDelete: "set null" }),
  landingPageId: varchar("landing_page_id").references(() => marketingLandingPages.id, { onDelete: "set null" }),
  campaignId: varchar("campaign_id").references(() => marketingCampaigns.id, { onDelete: "set null" }),
  
  // Lead data (flexible JSON to support different form fields)
  data: jsonb("data").notNull(), // {name, email, phone, company, etc.}
  
  // Tracking
  source: text("source"), // UTM source parameter
  medium: text("medium"), // UTM medium parameter
  campaign: text("campaign"), // UTM campaign parameter
  referrer: text("referrer"), // HTTP referrer
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Status
  status: text("status").notNull().default("new"), // new, contacted, qualified, converted, disqualified
  convertedToLeadId: varchar("converted_to_lead_id").references(() => leads.id), // If qualified and converted to sales lead
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_marketing_leads_organization").on(table.organizationId),
  index("IDX_marketing_leads_status").on(table.status),
  index("IDX_marketing_leads_campaign").on(table.campaignId),
]);

export const insertMarketingLeadSchema = createInsertSchema(marketingLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketingLead = z.infer<typeof insertMarketingLeadSchema>;
export type MarketingLead = typeof marketingLeads.$inferSelect;

// Marketing Analytics - Track events and conversions
export const marketingAnalytics = pgTable("marketing_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // Event details
  eventType: text("event_type").notNull(), // page_view, form_view, form_submit, button_click, video_play, download
  eventCategory: text("event_category"), // marketing, sales, engagement
  eventLabel: text("event_label"), // Descriptive label
  
  // Related entities
  landingPageId: varchar("landing_page_id").references(() => marketingLandingPages.id, { onDelete: "set null" }),
  formId: varchar("form_id").references(() => marketingLeadForms.id, { onDelete: "set null" }),
  leadId: varchar("lead_id").references(() => marketingLeads.id, { onDelete: "set null" }),
  campaignId: varchar("campaign_id").references(() => marketingCampaigns.id, { onDelete: "set null" }),
  
  // Tracking data
  source: text("source"), // UTM source
  medium: text("medium"), // UTM medium
  campaign: text("campaign"), // UTM campaign
  metadata: jsonb("metadata"), // Additional event data
  
  sessionId: text("session_id"), // Browser session identifier
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_analytics_event_type").on(table.eventType),
  index("IDX_analytics_landing_page").on(table.landingPageId),
  index("IDX_analytics_campaign").on(table.campaignId),
  index("IDX_analytics_created_at").on(table.createdAt),
]);

export const insertMarketingAnalyticsSchema = createInsertSchema(marketingAnalytics).omit({
  id: true,
  createdAt: true,
});

export type InsertMarketingAnalytics = z.infer<typeof insertMarketingAnalyticsSchema>;
export type MarketingAnalytics = typeof marketingAnalytics.$inferSelect;

// Customer Testimonials - Customer success quotes and feedback
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }), // Customer's organization (can be null for non-customers)
  
  // Testimonial content
  customerName: text("customer_name").notNull(),
  customerTitle: text("customer_title"), // e.g., "Operations Manager"
  customerCompany: text("customer_company").notNull(),
  customerPhoto: text("customer_photo"), // URL to photo
  companyLogo: text("company_logo"), // URL to company logo
  
  quote: text("quote").notNull(), // The testimonial text
  rating: integer("rating"), // 1-5 stars (optional)
  
  // Context
  projectType: text("project_type"), // e.g., "Commercial Office", "Healthcare Facility"
  industry: text("industry"), // healthcare, education, commercial, government, etc.
  resultsSummary: text("results_summary"), // Brief summary of outcomes achieved
  
  // Display settings
  isFeatured: text("is_featured").default("no"), // yes, no - Show on homepage
  displayOrder: integer("display_order").default(0), // Manual ordering
  status: text("status").notNull().default("draft"), // draft, published, archived
  
  // Metadata
  sourceUrl: text("source_url"), // Link to original review (G2, Google, etc.)
  dateGiven: timestamp("date_given"), // When the testimonial was given
  approvedBy: varchar("approved_by").references(() => users.id), // Who approved for publishing
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_testimonials_status").on(table.status),
  index("IDX_testimonials_featured").on(table.isFeatured),
  index("IDX_testimonials_industry").on(table.industry),
]);

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

// Case Studies - Detailed customer success stories
export const caseStudies = pgTable("case_studies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }), // Customer's organization
  
  // Basic info
  slug: varchar("slug").notNull().unique(), // URL-friendly identifier
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  customerName: text("customer_name").notNull(),
  customerCompany: text("customer_company").notNull(),
  customerTitle: text("customer_title"),
  customerPhoto: text("customer_photo"),
  companyLogo: text("company_logo"),
  
  // Project details
  industry: text("industry"), // healthcare, education, commercial, government, etc.
  projectType: text("project_type"), // e.g., "Hospital Renovation", "New Office Building"
  projectSize: text("project_size"), // e.g., "500 doors", "25 buildings"
  location: text("location"), // City, State
  duration: text("duration"), // e.g., "3 months", "2 weeks"
  
  // Story structure
  challenge: text("challenge").notNull(), // Problem the customer faced
  solution: text("solution").notNull(), // How DoorSurvey Pro solved it
  results: text("results").notNull(), // Outcomes and benefits achieved
  testimonialQuote: text("testimonial_quote"), // Pull quote for emphasis
  
  // Metrics (quantifiable results)
  metrics: jsonb("metrics"), // [{label: "Time Saved", value: "50%"}, {label: "Accuracy Improved", value: "80%"}]
  
  // Media
  heroImage: text("hero_image"), // Main image URL
  galleryImages: jsonb("gallery_images"), // Array of image URLs
  videoUrl: text("video_url"), // YouTube/Vimeo embed
  pdfUrl: text("pdf_url"), // Downloadable PDF version
  
  // Display settings
  isFeatured: text("is_featured").default("no"), // yes, no - Show on homepage
  displayOrder: integer("display_order").default(0),
  status: text("status").notNull().default("draft"), // draft, published, archived
  
  // SEO
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"),
  
  // Analytics
  views: integer("views").default(0),
  downloads: integer("downloads").default(0), // PDF downloads
  
  // Metadata
  publishedAt: timestamp("published_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_case_studies_slug").on(table.slug),
  index("IDX_case_studies_status").on(table.status),
  index("IDX_case_studies_industry").on(table.industry),
  index("IDX_case_studies_featured").on(table.isFeatured),
]);

export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
  downloads: true,
  publishedAt: true,
  approvedAt: true,
});

export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;
export type CaseStudy = typeof caseStudies.$inferSelect;

// ============================================================================
// ACCESS CONTROL WIRING DIAGRAM SYSTEM
// ============================================================================

// Access Control Components - Library of standard access control components
export const accessControlComponents = pgTable("access_control_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // null = system default
  componentType: text("component_type").notNull(), // card-reader, controller, power-supply, mag-lock, electric-strike, automatic-operator, rex-device, door-contact, push-button, keypad, intercom
  manufacturer: text("manufacturer"),
  model: text("model"),
  displayName: text("display_name").notNull(), // Friendly name for diagram
  description: text("description"),
  
  // Visual representation
  iconType: text("icon_type"), // Maps to specific icon (reader, lock, power, etc.)
  width: integer("width").default(80), // Width in pixels for diagram
  height: integer("height").default(60), // Height in pixels for diagram
  color: text("color"), // Optional custom color
  
  // Electrical specifications
  voltage: text("voltage"), // e.g., "12VDC", "24VDC", "120VAC"
  currentDraw: text("current_draw"), // e.g., "150mA", "2.5A"
  wireType: text("wire_type"), // e.g., "18/2", "22/4", "Cat5e", "Cat6"
  
  // Connection points (terminals)
  terminals: jsonb("terminals"), // [{name: "COM", type: "power"}, {name: "NO", type: "signal"}]
  
  notes: text("notes"),
  isSystemDefault: text("is_system_default").default("no"), // yes, no - system-provided defaults
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccessControlComponentSchema = createInsertSchema(accessControlComponents).omit({
  id: true,
  createdAt: true,
});

export type InsertAccessControlComponent = z.infer<typeof insertAccessControlComponentSchema>;
export type AccessControlComponent = typeof accessControlComponents.$inferSelect;

// Wiring Diagrams - Container for access control/automation diagrams
export const wiringDiagrams = pgTable("wiring_diagrams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }), // Optional project link
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "cascade" }), // Optional opening link
  
  name: text("name").notNull(),
  description: text("description"),
  diagramType: text("diagram_type").default("access-control"), // access-control, automation, power, complete-integration
  
  // Canvas settings
  canvasWidth: integer("canvas_width").default(1200),
  canvasHeight: integer("canvas_height").default(800),
  gridSize: integer("grid_size").default(20), // Grid snap size
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWiringDiagramSchema = createInsertSchema(wiringDiagrams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWiringDiagram = z.infer<typeof insertWiringDiagramSchema>;
export type WiringDiagram = typeof wiringDiagrams.$inferSelect;

// Diagram Components - Component instances placed in diagrams
export const diagramComponents = pgTable("diagram_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  diagramId: varchar("diagram_id").notNull().references(() => wiringDiagrams.id, { onDelete: "cascade" }),
  componentId: varchar("component_id").references(() => accessControlComponents.id, { onDelete: "set null" }), // null if custom
  
  // Position on canvas
  xPosition: integer("x_position").notNull(),
  yPosition: integer("y_position").notNull(),
  
  // Override properties (if different from base component)
  displayName: text("display_name"), // Override display name
  customNotes: text("custom_notes"), // Instance-specific notes
  
  // Rotation
  rotation: integer("rotation").default(0), // 0, 90, 180, 270
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDiagramComponentSchema = createInsertSchema(diagramComponents).omit({
  id: true,
  createdAt: true,
});

export type InsertDiagramComponent = z.infer<typeof insertDiagramComponentSchema>;
export type DiagramComponent = typeof diagramComponents.$inferSelect;

// Diagram Connections - Wiring connections between components
export const diagramConnections = pgTable("diagram_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  diagramId: varchar("diagram_id").notNull().references(() => wiringDiagrams.id, { onDelete: "cascade" }),
  fromComponentId: varchar("from_component_id").notNull().references(() => diagramComponents.id, { onDelete: "cascade" }),
  toComponentId: varchar("to_component_id").notNull().references(() => diagramComponents.id, { onDelete: "cascade" }),
  
  // Connection details
  fromTerminal: text("from_terminal"), // Terminal name on source component
  toTerminal: text("to_terminal"), // Terminal name on destination component
  
  // Wire specifications
  wireType: text("wire_type"), // e.g., "18/2", "22/4", "Cat5e"
  wireGauge: text("wire_gauge"), // e.g., "18 AWG", "22 AWG"
  wireColor: text("wire_color"), // e.g., "Red/Black", "Blue/White"
  voltage: text("voltage"), // e.g., "12VDC", "24VDC"
  
  // Visual styling
  lineStyle: text("line_style").default("solid"), // solid, dashed, dotted
  lineColor: text("line_color").default("#374151"), // Default gray
  lineWidth: integer("line_width").default(2),
  
  // Path points for custom routing (optional)
  pathPoints: jsonb("path_points"), // [{x: 100, y: 200}, {x: 150, y: 250}]
  
  label: text("label"), // Optional label on the wire
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDiagramConnectionSchema = createInsertSchema(diagramConnections).omit({
  id: true,
  createdAt: true,
});

export type InsertDiagramConnection = z.infer<typeof insertDiagramConnectionSchema>;
export type DiagramConnection = typeof diagramConnections.$inferSelect;

// Diagram Annotations - Text annotations and responsible party labels
export const diagramAnnotations = pgTable("diagram_annotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  diagramId: varchar("diagram_id").notNull().references(() => wiringDiagrams.id, { onDelete: "cascade" }),
  
  // Position
  xPosition: integer("x_position").notNull(),
  yPosition: integer("y_position").notNull(),
  
  // Content
  annotationType: text("annotation_type").notNull(), // text, responsible-party, callout, warning
  text: text("text").notNull(),
  
  // Responsible party details (when type is responsible-party)
  responsibleParty: text("responsible_party"), // electrician, low-voltage-contractor, gc, door-installer, access-control-vendor, automation-vendor
  
  // Styling
  fontSize: integer("font_size").default(14),
  fontWeight: text("font_weight").default("normal"), // normal, bold
  textColor: text("text_color").default("#1f2937"),
  backgroundColor: text("background_color"), // Optional background
  borderColor: text("border_color"), // Optional border
  
  // Dimensions for box annotations
  width: integer("width"),
  height: integer("height"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDiagramAnnotationSchema = createInsertSchema(diagramAnnotations).omit({
  id: true,
  createdAt: true,
});

export type InsertDiagramAnnotation = z.infer<typeof insertDiagramAnnotationSchema>;
export type DiagramAnnotation = typeof diagramAnnotations.$inferSelect;

// Relations - Define relationships between tables
export const projectsRelations = relations(projects, ({ many }) => ({
  doorOpenings: many(doorOpenings),
}));

export const doorOpeningsRelations = relations(doorOpenings, ({ one, many }) => ({
  project: one(projects, {
    fields: [doorOpenings.projectId],
    references: [projects.id],
  }),
  photos: many(photos),
  violations: many(complianceViolations),
  validationResults: many(validationResults),
  additionalItems: many(additionalDoorItems),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  doorOpening: one(doorOpenings, {
    fields: [photos.openingId],
    references: [doorOpenings.id],
  }),
}));

export const additionalDoorItemsRelations = relations(additionalDoorItems, ({ one }) => ({
  doorOpening: one(doorOpenings, {
    fields: [additionalDoorItems.openingId],
    references: [doorOpenings.id],
  }),
  organization: one(organizations, {
    fields: [additionalDoorItems.organizationId],
    references: [organizations.id],
  }),
}));

export const complianceRulesRelations = relations(complianceRules, ({ many }) => ({
  violations: many(complianceViolations),
}));

export const complianceViolationsRelations = relations(complianceViolations, ({ one }) => ({
  doorOpening: one(doorOpenings, {
    fields: [complianceViolations.openingId],
    references: [doorOpenings.id],
  }),
  rule: one(complianceRules, {
    fields: [complianceViolations.ruleId],
    references: [complianceRules.id],
  }),
}));

export const validationResultsRelations = relations(validationResults, ({ one }) => ({
  doorOpening: one(doorOpenings, {
    fields: [validationResults.openingId],
    references: [doorOpenings.id],
  }),
}));

// Bug Reports - Internal bug tracking and feedback system
export const bugReports = pgTable("bug_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Context
  scanId: varchar("scan_id").references(() => lidarScans.id, { onDelete: "set null" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  page: text("page"), // Which page/component the bug occurred on
  platform: text("platform").notNull(), // web, ios, android, mobile-web
  
  // Bug details
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("new"), // new, acknowledged, in-progress, resolved, closed, wont-fix
  
  // Attachments
  screenshotUrl: text("screenshot_url"), // S3 or local path to screenshot
  logsExcerpt: text("logs_excerpt"), // Last N lines of relevant logs
  
  // Assignment and tracking
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"), // Internal notes from dev team
  
  // Additional metadata
  userAgent: text("user_agent"),
  browserInfo: jsonb("browser_info"), // { browser, version, os, screen resolution }
  extra: jsonb("extra"), // Any additional context data
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertBugReportSchema = createInsertSchema(bugReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;

// External Service Connections - Track Replit connector integrations and settings
export const externalServiceConnections = pgTable("external_service_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // User who connected the service
  
  // Service identification
  service: text("service").notNull(), // jira, confluence, google-calendar, outlook, github
  connectorId: text("connector_id"), // Replit connector ID for reference
  
  // Service-specific settings (JSON for flexibility)
  settings: jsonb("settings"), // { defaultProjectKey, defaultCalendarId, defaultRepo, etc. }
  
  // Connection status
  isEnabled: text("is_enabled").notNull().default("yes"), // yes, no
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_external_services_org").on(table.organizationId),
  index("IDX_external_services_service").on(table.service),
]);

export const insertExternalServiceConnectionSchema = createInsertSchema(externalServiceConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  service: z.enum(["jira", "confluence", "google-calendar", "outlook", "github"]),
  isEnabled: z.enum(["yes", "no"]).default("yes"),
});

export type InsertExternalServiceConnection = z.infer<typeof insertExternalServiceConnectionSchema>;
export type ExternalServiceConnection = typeof externalServiceConnections.$inferSelect;

// Linked External Resources - Track resources created in external services
export const linkedExternalResources = pgTable("linked_external_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  
  // Resource identification
  service: text("service").notNull(), // jira, confluence, google-calendar, outlook, github
  resourceType: text("resource_type").notNull(), // issue, page, event, pr, release
  externalId: text("external_id").notNull(), // External service's ID for this resource
  externalUrl: text("external_url"), // Direct link to the resource
  
  // Resource details
  title: text("title"),
  description: text("description"),
  metadata: jsonb("metadata"), // Additional data from the external service
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_linked_resources_org").on(table.organizationId),
  index("IDX_linked_resources_project").on(table.projectId),
  index("IDX_linked_resources_service").on(table.service),
]);

export const insertLinkedExternalResourceSchema = createInsertSchema(linkedExternalResources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  service: z.enum(["jira", "confluence", "google-calendar", "outlook", "github"]),
  resourceType: z.enum(["issue", "page", "event", "pr", "release", "gist"]),
});

export type InsertLinkedExternalResource = z.infer<typeof insertLinkedExternalResourceSchema>;
export type LinkedExternalResource = typeof linkedExternalResources.$inferSelect;

// ============================================================================
// PARTNER PRICING & CODE MAPPING TABLES
// ============================================================================

// Partner Vendors - Configuration for partner/vendor integrations for price comparison
export const partnerVendors = pgTable("partner_vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // null = system default
  
  // Partner identification
  partnerId: text("partner_id").notNull().unique(), // Unique partner identifier (e.g., "acme", "contoso")
  partnerName: text("partner_name").notNull(), // Display name
  partnerType: text("partner_type").notNull(), // manufacturer, distributor, fabricator
  
  // API/Integration settings
  apiEndpoint: text("api_endpoint"), // Base URL for partner API
  apiKey: text("api_key"), // API key (encrypted in production)
  apiSettings: jsonb("api_settings"), // Additional API configuration
  
  // Status
  isActive: text("is_active").notNull().default("yes"), // yes, no
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_partner_vendors_org").on(table.organizationId),
  index("IDX_partner_vendors_partner_id").on(table.partnerId),
]);

export const insertPartnerVendorSchema = createInsertSchema(partnerVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  partnerType: z.enum(["manufacturer", "distributor", "fabricator"]),
  isActive: z.enum(["yes", "no"]).default("yes"),
});

export type InsertPartnerVendor = z.infer<typeof insertPartnerVendorSchema>;
export type PartnerVendor = typeof partnerVendors.$inferSelect;

// Partner Code Mappings - Map internal codes to partner-specific codes
export const partnerCodeMappings = pgTable("partner_code_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // null = system default
  partnerId: text("partner_id").notNull().references(() => partnerVendors.partnerId, { onDelete: "cascade" }),
  
  // Code mapping
  internalCode: text("internal_code").notNull(), // Internal product/option code
  partnerCode: text("partner_code").notNull(), // Partner's equivalent code
  codeType: text("code_type").notNull(), // hardware, door, frame, finish, option
  
  // Mapping details
  description: text("description"),
  conversionNotes: text("conversion_notes"), // Notes about code conversion quirks
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_code_mappings_org").on(table.organizationId),
  index("IDX_code_mappings_partner").on(table.partnerId),
  index("IDX_code_mappings_internal").on(table.internalCode),
]);

export const insertPartnerCodeMappingSchema = createInsertSchema(partnerCodeMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  codeType: z.enum(["hardware", "door", "frame", "finish", "option"]),
});

export type InsertPartnerCodeMapping = z.infer<typeof insertPartnerCodeMappingSchema>;
export type PartnerCodeMapping = typeof partnerCodeMappings.$inferSelect;

// Price Comparison Cache - Cache pricing results for performance
export const priceComparisonCache = pgTable("price_comparison_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Cache key (hash of partner + items)
  cacheKey: text("cache_key").notNull(),
  partnerId: text("partner_id").notNull(),
  
  // Cached data
  requestData: jsonb("request_data").notNull(), // Original request (partner_id + line items)
  responseData: jsonb("response_data").notNull(), // Pricing response from partner
  
  // Cache metadata
  expiresAt: timestamp("expires_at").notNull(), // TTL expiration
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("UQ_price_cache_org_key").on(table.organizationId, table.cacheKey),
  index("IDX_price_cache_expires").on(table.expiresAt),
]);

export const insertPriceComparisonCacheSchema = createInsertSchema(priceComparisonCache).omit({
  id: true,
  createdAt: true,
});

export type InsertPriceComparisonCache = z.infer<typeof insertPriceComparisonCacheSchema>;
export type PriceComparisonCache = typeof priceComparisonCache.$inferSelect;

// ============================================================================
// DOOR/FRAME OPTIONS CATALOG & VALIDATION
// ============================================================================

// Door/Frame Options - Structured catalog of options for dropdown selection
export const doorFrameOptions = pgTable("door_frame_options", {
  id: serial("id").primaryKey(),
  
  // Hierarchical organization
  appliesTo: text("applies_to").notNull(), // door, frame
  market: text("market").notNull(), // commercial, residential, both
  attributeGroup: text("attribute_group").notNull(), // Material, Core, Fire/Code, Glazing, etc.
  attributeName: text("attribute_name").notNull(), // Door Material, Core Type, Fire Rating, etc.
  
  // Option details
  value: text("value").notNull(), // Display value (e.g., "Hollow Metal 16ga (galvanneal)")
  valueCode: text("value_code").notNull(), // Code for internal/partner mapping (e.g., "HM16G-G90")
  description: text("description"), // Technical description
  compatibility: text("compatibility"), // Compatibility notes
  standardsCodes: text("standards_codes"), // e.g., "ASTM A653; SDI A250; UL 10C"
  
  // Impact metadata
  costImpact: text("cost_impact"), // Low, Medium, High
  leadTimeImpact: text("lead_time_impact"), // Low, Medium, High
  isDefault: text("is_default").default("no"), // yes, no - default selection
  
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_options_applies_to").on(table.appliesTo),
  index("IDX_options_market").on(table.market),
  index("IDX_options_attr_group").on(table.attributeGroup),
  index("IDX_options_value_code").on(table.valueCode),
]);

export const insertDoorFrameOptionSchema = createInsertSchema(doorFrameOptions).omit({
  id: true,
  createdAt: true,
}).extend({
  appliesTo: z.enum(["door", "frame"]),
  market: z.enum(["commercial", "residential", "both"]),
  costImpact: z.enum(["Low", "Medium", "High"]).optional(),
  leadTimeImpact: z.enum(["Low", "Medium", "High"]).optional(),
  isDefault: z.enum(["yes", "no"]).optional(),
});

export type InsertDoorFrameOption = z.infer<typeof insertDoorFrameOptionSchema>;
export type DoorFrameOption = typeof doorFrameOptions.$inferSelect;

// Option Validation Rules - Cross-field validation rules
export const optionValidationRules = pgTable("option_validation_rules", {
  id: serial("id").primaryKey(),
  
  // Rule identification
  ruleId: text("rule_id").notNull().unique(), // e.g., "fire_full_lite_resistive"
  appliesTo: text("applies_to").notNull(), // door, frame
  severity: text("severity").notNull(), // error, warning, info
  
  // Condition (when to trigger)
  whenConditions: jsonb("when_conditions"), // JSON: { attribute_group, attribute_name, value_regex }
  
  // Requirements (what to check)
  requirements: jsonb("requirements"), // JSON: { require_any_of: [...], validate: {...} }
  
  // Messaging
  message: text("message").notNull(), // User-facing validation message
  references: text("references").array(), // e.g., ["NFPA 80", "IBC 716"]
  
  isActive: text("is_active").default("yes"), // yes, no - toggle rules on/off
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_validation_applies_to").on(table.appliesTo),
  index("IDX_validation_active").on(table.isActive),
]);

export const insertOptionValidationRuleSchema = createInsertSchema(optionValidationRules).omit({
  id: true,
  createdAt: true,
}).extend({
  appliesTo: z.enum(["door", "frame"]),
  severity: z.enum(["error", "warning", "info"]),
  isActive: z.enum(["yes", "no"]).optional(),
});

export type InsertOptionValidationRule = z.infer<typeof insertOptionValidationRuleSchema>;
export type OptionValidationRule = typeof optionValidationRules.$inferSelect;

// ============================================================================
// CHANGE ORDERS - Track modifications to sold projects
// ============================================================================

// Change Orders - Main change order tracking
export const changeOrders = pgTable("change_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Identification
  changeOrderNumber: text("change_order_number").notNull(), // e.g., "CO-001", "CO-002"
  title: text("title").notNull(), // Brief description of changes
  description: text("description"), // Detailed explanation of why changes are needed
  
  // Status tracking
  status: text("status").notNull().default("draft"), // draft, pending_review, approved, rejected, cancelled
  
  // Engineering review
  reviewStatus: text("review_status").notNull().default("pending"), // pending, approved, rejected, needs_revision
  reviewedBy: text("reviewed_by"), // Name or email of reviewer
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  // Customer approval
  customerApprovalStatus: text("customer_approval_status").default("pending"), // pending, approved, rejected
  customerApprovedAt: timestamp("customer_approved_at"),
  customerApprovedBy: text("customer_approved_by"),
  customerApprovalNotes: text("customer_approval_notes"),
  
  // Cost impact
  originalCost: real("original_cost").default(0), // Original project cost
  newCost: real("new_cost").default(0), // New total cost after changes
  costDelta: real("cost_delta").default(0), // Difference (can be negative for credits)
  
  // Payment tracking (for additional costs)
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, pending, paid, refunded, failed, not_required
  paymentIntentId: text("payment_intent_id"), // Stripe Payment Intent ID
  paymentAmount: real("payment_amount"), // Amount due (if costDelta > 0)
  paymentCurrency: text("payment_currency").default("usd"),
  paidAt: timestamp("paid_at"),
  paymentNotes: text("payment_notes"),
  
  // Audit trail
  createdBy: text("created_by"), // Name or email of creator
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"), // When change order was fully approved
}, (table) => [
  index("IDX_change_orders_project").on(table.projectId),
  index("IDX_change_orders_org").on(table.organizationId),
  index("IDX_change_orders_status").on(table.status),
]);

export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["draft", "pending_review", "approved", "rejected", "cancelled"]).default("draft"),
  reviewStatus: z.enum(["pending", "approved", "rejected", "needs_revision"]).default("pending"),
  customerApprovalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  paymentStatus: z.enum(["unpaid", "pending", "paid", "refunded", "failed", "not_required"]).default("unpaid"),
});

export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type ChangeOrder = typeof changeOrders.$inferSelect;

// Change Order Items - Line items showing what changed
export const changeOrderItems = pgTable("change_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  changeOrderId: varchar("change_order_id").notNull().references(() => changeOrders.id, { onDelete: "cascade" }),
  
  // Item identification
  itemType: text("item_type").notNull(), // opening, hardware, cost_adjustment
  action: text("action").notNull(), // add, remove, modify
  
  // References to original items (if modifying/removing)
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "set null" }),
  hardwareItemId: varchar("hardware_item_id").references(() => hardwareItems.id, { onDelete: "set null" }),
  
  // Snapshot of original data (for modify/remove actions)
  originalData: jsonb("original_data"), // JSON snapshot of original item state
  
  // New data (for add/modify actions)
  newData: jsonb("new_data"), // JSON snapshot of new item state
  
  // Description of changes
  description: text("description").notNull(), // What changed and why
  
  // Cost impact
  costBefore: real("cost_before").default(0), // Cost before change
  costAfter: real("cost_after").default(0), // Cost after change
  costDelta: real("cost_delta").default(0), // Difference
  
  // Line item tracking
  lineNumber: serial("line_number"), // Sequential numbering
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_change_order_items_co").on(table.changeOrderId),
  index("IDX_change_order_items_type").on(table.itemType),
  index("IDX_change_order_items_action").on(table.action),
]);

export const insertChangeOrderItemSchema = createInsertSchema(changeOrderItems).omit({
  id: true,
  createdAt: true,
  lineNumber: true,
}).extend({
  itemType: z.enum(["opening", "hardware", "cost_adjustment"]),
  action: z.enum(["add", "remove", "modify"]),
});

export type InsertChangeOrderItem = z.infer<typeof insertChangeOrderItemSchema>;
export type ChangeOrderItem = typeof changeOrderItems.$inferSelect;

// ============================================================================
// PHASE 0: FOUNDATION - ANALYTICS WAREHOUSE & EVENT TRACKING
// ============================================================================

// Analytics Events - Track all user actions and system events for business intelligence
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Event identification
  eventType: text("event_type").notNull(), // project_created, quote_generated, door_surveyed, payment_completed, etc.
  eventCategory: text("event_category").notNull(), // user_action, system_event, integration_event, error_event
  
  // Event context
  entityType: text("entity_type"), // project, opening, quote, customer, etc.
  entityId: varchar("entity_id"), // ID of the related entity
  
  // Event data
  eventData: jsonb("event_data"), // Additional structured data about the event
  metadata: jsonb("metadata"), // User agent, IP, device type, etc.
  
  // Performance tracking
  duration: integer("duration"), // Time taken in milliseconds (for operations)
  
  // Session tracking
  sessionId: varchar("session_id"),
  
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("IDX_analytics_events_org").on(table.organizationId),
  index("IDX_analytics_events_user").on(table.userId),
  index("IDX_analytics_events_type").on(table.eventType),
  index("IDX_analytics_events_category").on(table.eventCategory),
  index("IDX_analytics_events_timestamp").on(table.timestamp),
  index("IDX_analytics_events_entity").on(table.entityType, table.entityId),
]);

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  timestamp: true,
});

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// KPI Aggregations - Pre-computed metrics for dashboards and reports
export const kpiAggregations = pgTable("kpi_aggregations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // KPI identification
  kpiName: text("kpi_name").notNull(), // projects_created, revenue_generated, surveys_completed, etc.
  kpiCategory: text("kpi_category").notNull(), // sales, operations, customer, financial
  
  // Time period
  periodType: text("period_type").notNull(), // daily, weekly, monthly, quarterly, yearly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Metric values
  value: real("value").notNull(), // The actual metric value
  previousValue: real("previous_value"), // Value from previous period for comparison
  target: real("target"), // Target/goal value
  
  // Additional context
  dimensions: jsonb("dimensions"), // Breakdown by dimensions (e.g., by user, by customer, by product)
  metadata: jsonb("metadata"), // Additional context
  
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_kpi_aggregations_org").on(table.organizationId),
  index("IDX_kpi_aggregations_name").on(table.kpiName),
  index("IDX_kpi_aggregations_period").on(table.periodType, table.periodStart),
  uniqueIndex("IDX_kpi_unique").on(table.organizationId, table.kpiName, table.periodType, table.periodStart),
]);

export const insertKpiAggregationSchema = createInsertSchema(kpiAggregations).omit({
  id: true,
  calculatedAt: true,
  updatedAt: true,
});

export type InsertKpiAggregation = z.infer<typeof insertKpiAggregationSchema>;
export type KpiAggregation = typeof kpiAggregations.$inferSelect;

// ============================================================================
// PHASE 0: FOUNDATION - FEATURE FLAGS & GRADUAL ROLLOUT
// ============================================================================

// Feature Flags - Control feature availability and gradual rollout
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Feature identification
  flagKey: text("flag_key").notNull().unique(), // unique identifier like "ai_quote_generation", "real_time_collaboration"
  name: text("name").notNull(), // Human-readable name
  description: text("description"), // What this feature does
  
  // Rollout control
  isEnabled: text("is_enabled").notNull().default("no"), // yes, no - global kill switch
  rolloutPercentage: integer("rollout_percentage").notNull().default(0), // 0-100, percentage of users to enable for
  
  // Targeting rules
  targetingRules: jsonb("targeting_rules"), // JSON rules for targeting specific users/orgs/tiers
  // Example: { "subscriptionTiers": ["pro", "enterprise"], "organizationIds": ["org-123"], "userIds": ["user-456"] }
  
  // A/B testing
  isAbTest: text("is_ab_test").notNull().default("no"), // yes, no
  abTestVariants: jsonb("ab_test_variants"), // For A/B testing: { "variant_a": {...}, "variant_b": {...} }
  
  // Metadata
  tags: text("tags").array(), // Categories: beta, experimental, premium, deprecated
  ownerTeam: text("owner_team"), // Which team owns this feature
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_feature_flags_key").on(table.flagKey),
  index("IDX_feature_flags_enabled").on(table.isEnabled),
]);

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

// Feature Flag Evaluations - Track which features are enabled for which users
export const featureFlagEvaluations = pgTable("feature_flag_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flagId: varchar("flag_id").notNull().references(() => featureFlags.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  // Evaluation result
  isEnabled: text("is_enabled").notNull(), // yes, no - whether feature was enabled for this user
  variant: text("variant"), // For A/B tests: which variant was assigned
  
  // Context
  evaluationContext: jsonb("evaluation_context"), // Context at time of evaluation
  
  evaluatedAt: timestamp("evaluated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_ff_eval_flag").on(table.flagId),
  index("IDX_ff_eval_org").on(table.organizationId),
  index("IDX_ff_eval_user").on(table.userId),
  index("IDX_ff_eval_timestamp").on(table.evaluatedAt),
]);

export const insertFeatureFlagEvaluationSchema = createInsertSchema(featureFlagEvaluations).omit({
  id: true,
  evaluatedAt: true,
});

export type InsertFeatureFlagEvaluation = z.infer<typeof insertFeatureFlagEvaluationSchema>;
export type FeatureFlagEvaluation = typeof featureFlagEvaluations.$inferSelect;

// ============================================================================
// PHASE 0: FOUNDATION - INTEGRATION FRAMEWORK
// ============================================================================

// Integration Providers - Registry of available external integrations
export const integrationProviders = pgTable("integration_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Provider identification
  providerKey: text("provider_key").notNull().unique(), // quickbooks, xero, asana, monday, twilio, whatsapp, etc.
  name: text("name").notNull(), // Human-readable name
  category: text("category").notNull(), // accounting, project_management, communication, document_storage, crm
  
  // Configuration
  authType: text("auth_type").notNull(), // oauth2, api_key, basic_auth, custom
  baseUrl: text("base_url"), // API base URL
  documentationUrl: text("documentation_url"),
  logoUrl: text("logo_url"),
  
  // OAuth configuration (if applicable)
  oauthConfig: jsonb("oauth_config"), // { "authUrl", "tokenUrl", "scopes", etc. }
  
  // Capabilities
  supportedFeatures: text("supported_features").array(), // sync, webhooks, realtime, etc.
  
  // Status
  isActive: text("is_active").notNull().default("yes"), // yes, no
  isPopular: text("is_popular").notNull().default("no"), // yes, no - for UI sorting
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_integration_providers_key").on(table.providerKey),
  index("IDX_integration_providers_category").on(table.category),
]);

export const insertIntegrationProviderSchema = createInsertSchema(integrationProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIntegrationProvider = z.infer<typeof insertIntegrationProviderSchema>;
export type IntegrationProvider = typeof integrationProviders.$inferSelect;

// Organization Integrations - Track which integrations are connected per organization
export const organizationIntegrations = pgTable("organization_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  providerId: varchar("provider_id").notNull().references(() => integrationProviders.id, { onDelete: "cascade" }),
  
  // Connection details
  status: text("status").notNull().default("connected"), // connected, disconnected, error, pending
  
  // Credentials (encrypted)
  accessToken: text("access_token"), // Encrypted OAuth access token
  refreshToken: text("refresh_token"), // Encrypted OAuth refresh token
  apiKey: text("api_key"), // Encrypted API key (for non-OAuth)
  credentials: jsonb("credentials"), // Other encrypted credentials
  
  // OAuth metadata
  tokenExpiresAt: timestamp("token_expires_at"),
  scopes: text("scopes").array(),
  
  // Sync configuration
  syncEnabled: text("sync_enabled").notNull().default("yes"), // yes, no
  syncFrequency: text("sync_frequency").default("hourly"), // realtime, hourly, daily, manual
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"), // success, failed, partial
  
  // Webhooks
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  
  // Error tracking
  errorCount: integer("error_count").notNull().default(0),
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at"),
  
  // Settings specific to this integration
  settings: jsonb("settings"), // Provider-specific settings
  
  connectedBy: varchar("connected_by").references(() => users.id, { onDelete: "set null" }),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_org_integrations_org").on(table.organizationId),
  index("IDX_org_integrations_provider").on(table.providerId),
  index("IDX_org_integrations_status").on(table.status),
  uniqueIndex("IDX_org_integration_unique").on(table.organizationId, table.providerId),
]);

export const insertOrganizationIntegrationSchema = createInsertSchema(organizationIntegrations).omit({
  id: true,
  connectedAt: true,
  updatedAt: true,
});

export type InsertOrganizationIntegration = z.infer<typeof insertOrganizationIntegrationSchema>;
export type OrganizationIntegration = typeof organizationIntegrations.$inferSelect;

// Webhook Logs - Track incoming webhooks from external services
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => organizationIntegrations.id, { onDelete: "set null" }),
  
  // Request details
  provider: text("provider").notNull(), // quickbooks, stripe, twilio, etc.
  eventType: text("event_type").notNull(), // invoice.paid, message.received, etc.
  
  // Webhook data
  requestHeaders: jsonb("request_headers"),
  requestBody: jsonb("request_body"),
  signature: text("signature"), // For verification
  
  // Processing
  status: text("status").notNull().default("pending"), // pending, processed, failed, ignored
  processedAt: timestamp("processed_at"),
  processingDuration: integer("processing_duration"), // milliseconds
  
  // Error handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Response
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  
  receivedAt: timestamp("received_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_webhook_logs_integration").on(table.integrationId),
  index("IDX_webhook_logs_provider").on(table.provider),
  index("IDX_webhook_logs_status").on(table.status),
  index("IDX_webhook_logs_received").on(table.receivedAt),
]);

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  receivedAt: true,
});

export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;

// API Request Logs - Track outgoing API calls to external services (for debugging and monitoring)
export const apiRequestLogs = pgTable("api_request_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => organizationIntegrations.id, { onDelete: "set null" }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // Request details
  provider: text("provider").notNull(),
  endpoint: text("endpoint").notNull(), // API endpoint called
  method: text("method").notNull(), // GET, POST, PUT, DELETE
  
  // Request/Response
  requestHeaders: jsonb("request_headers"),
  requestBody: jsonb("request_body"),
  responseStatus: integer("response_status"),
  responseBody: jsonb("response_body"),
  
  // Performance
  duration: integer("duration"), // milliseconds
  
  // Status
  status: text("status").notNull(), // success, failed, timeout
  errorMessage: text("error_message"),
  
  // Retry logic
  retryCount: integer("retry_count").notNull().default(0),
  
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_api_logs_integration").on(table.integrationId),
  index("IDX_api_logs_org").on(table.organizationId),
  index("IDX_api_logs_provider").on(table.provider),
  index("IDX_api_logs_status").on(table.status),
  index("IDX_api_logs_requested").on(table.requestedAt),
]);

export const insertApiRequestLogSchema = createInsertSchema(apiRequestLogs).omit({
  id: true,
  requestedAt: true,
});

export type InsertApiRequestLog = z.infer<typeof insertApiRequestLogSchema>;
export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;

// ============================================================================
// PHASE 0: FOUNDATION - MESSAGING BUS & EVENT SYSTEM
// ============================================================================

// Event Bus - Internal event publishing and subscription system
export const eventBusMessages = pgTable("event_bus_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Message identification
  eventType: text("event_type").notNull(), // user.registered, project.created, quote.sent, etc.
  eventCategory: text("event_category").notNull(), // domain_event, integration_event, notification_event
  
  // Message payload
  payload: jsonb("payload").notNull(), // The actual event data
  
  // Context
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type"), // What entity this event relates to
  entityId: varchar("entity_id"),
  
  // Publishing metadata
  publishedBy: text("published_by"), // Service/component that published
  correlationId: varchar("correlation_id"), // For tracking related events
  causationId: varchar("causation_id"), // Event that caused this event
  
  // Status
  status: text("status").notNull().default("pending"), // pending, processing, processed, failed
  processedAt: timestamp("processed_at"),
  
  // Error handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  nextRetryAt: timestamp("next_retry_at"),
  
  publishedAt: timestamp("published_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_event_bus_type").on(table.eventType),
  index("IDX_event_bus_category").on(table.eventCategory),
  index("IDX_event_bus_status").on(table.status),
  index("IDX_event_bus_org").on(table.organizationId),
  index("IDX_event_bus_entity").on(table.entityType, table.entityId),
  index("IDX_event_bus_published").on(table.publishedAt),
  index("IDX_event_bus_correlation").on(table.correlationId),
]);

export const insertEventBusMessageSchema = createInsertSchema(eventBusMessages).omit({
  id: true,
  publishedAt: true,
});

export type InsertEventBusMessage = z.infer<typeof insertEventBusMessageSchema>;
export type EventBusMessage = typeof eventBusMessages.$inferSelect;

// Event Subscriptions - Track which handlers subscribe to which events
export const eventSubscriptions = pgTable("event_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Subscription details
  eventType: text("event_type").notNull(), // Can use wildcards: "project.*", "*.created"
  handlerName: text("handler_name").notNull(), // Name of the handler function/service
  handlerEndpoint: text("handler_endpoint"), // URL or internal endpoint to invoke
  
  // Configuration
  isActive: text("is_active").notNull().default("yes"), // yes, no
  priority: integer("priority").notNull().default(100), // Higher = processes first
  
  // Filtering
  filterRules: jsonb("filter_rules"), // Additional filtering beyond event type
  
  // Error handling
  retryPolicy: text("retry_policy").notNull().default("exponential"), // none, linear, exponential
  maxRetries: integer("max_retries").notNull().default(3),
  
  // Statistics
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  lastProcessedAt: timestamp("last_processed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_event_subs_type").on(table.eventType),
  index("IDX_event_subs_active").on(table.isActive),
  index("IDX_event_subs_priority").on(table.priority),
  uniqueIndex("IDX_event_sub_unique").on(table.eventType, table.handlerName),
]);

export const insertEventSubscriptionSchema = createInsertSchema(eventSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEventSubscription = z.infer<typeof insertEventSubscriptionSchema>;
export type EventSubscription = typeof eventSubscriptions.$inferSelect;

// ============================================================================
// WORKSTREAM 1: DATA & INTELLIGENCE PLATFORM
// ============================================================================

// Predictive Analytics - Store predictions and forecasts for projects
export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  predictionType: text("prediction_type").notNull(), // timeline, cost, compliance_risk, labor, materials
  
  // Prediction results
  predictedValue: real("predicted_value"), // Numeric prediction (days, dollars, score)
  confidenceScore: real("confidence_score"), // 0.0-1.0 confidence level
  predictedDetails: jsonb("predicted_details"), // Detailed breakdown of prediction
  
  // Model information
  modelVersion: text("model_version").notNull().default("v1.0"),
  inputFeatures: jsonb("input_features"), // Features used for prediction
  
  // Accuracy tracking
  actualValue: real("actual_value"), // Actual result (once known)
  accuracyScore: real("accuracy_score"), // How accurate was the prediction
  
  // Metadata
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  validUntil: timestamp("valid_until"), // Prediction expiration
  notes: text("notes"),
}, (table) => [
  index("IDX_predictions_organization_id").on(table.organizationId),
  index("IDX_predictions_project_id").on(table.projectId),
  index("IDX_predictions_type").on(table.predictionType),
]);

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  generatedAt: true,
}).extend({
  predictionType: z.enum(["timeline", "cost", "compliance_risk", "labor", "materials"]),
  confidenceScore: z.number().min(0).max(1).optional(),
});

export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

// Prediction Feedback - User feedback on prediction accuracy
export const predictionFeedback = pgTable("prediction_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  predictionId: varchar("prediction_id").notNull().references(() => predictions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  wasAccurate: text("was_accurate").notNull(), // yes, no
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_prediction_feedback_prediction_id").on(table.predictionId),
]);

export const insertPredictionFeedbackSchema = createInsertSchema(predictionFeedback).omit({
  id: true,
  createdAt: true,
}).extend({
  rating: z.number().int().min(1).max(5),
  wasAccurate: z.enum(["yes", "no"]),
});

export type InsertPredictionFeedback = z.infer<typeof insertPredictionFeedbackSchema>;
export type PredictionFeedback = typeof predictionFeedback.$inferSelect;

// Advanced Reporting - Custom report builder and templates
export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  
  // Report definition
  name: text("name").notNull(),
  description: text("description"),
  reportType: text("report_type").notNull(), // custom, project_summary, cost_analysis, compliance, hardware_schedule, material_labor, performance
  isTemplate: text("is_template").notNull().default("no"), // yes = pre-built template, no = user custom report
  
  // Data configuration
  dataSource: text("data_source").notNull(), // projects, openings, hardware, costs, predictions, analytics
  metrics: jsonb("metrics").notNull(), // Array of metric definitions: { field, aggregation, label }
  filters: jsonb("filters"), // Filter conditions: { field, operator, value }
  groupBy: jsonb("group_by"), // Grouping fields
  sortBy: jsonb("sort_by"), // Sorting configuration
  
  // Visualization
  visualizationType: text("visualization_type").notNull().default("table"), // table, bar_chart, line_chart, pie_chart, area_chart
  chartConfig: jsonb("chart_config"), // Chart-specific configuration
  
  // Export settings
  exportFormats: jsonb("export_formats").notNull().default('["pdf","excel","csv"]'), // Supported export formats
  
  // Sharing & permissions
  isPublic: text("is_public").notNull().default("no"), // yes, no - Share with entire org
  shareWith: jsonb("share_with"), // Array of user IDs to share with
  
  // Usage statistics
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_report_templates_org_id").on(table.organizationId),
  index("IDX_report_templates_type").on(table.reportType),
  index("IDX_report_templates_created_by").on(table.createdBy),
]);

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  reportType: z.enum(["custom", "project_summary", "cost_analysis", "compliance", "hardware_schedule", "material_labor", "performance"]),
  dataSource: z.enum(["projects", "openings", "hardware", "costs", "predictions", "analytics"]),
  visualizationType: z.enum(["table", "bar_chart", "line_chart", "pie_chart", "area_chart"]),
  isTemplate: z.enum(["yes", "no"]),
  isPublic: z.enum(["yes", "no"]),
});

export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;

// Report Executions - Track report runs and results
export const reportExecutions = pgTable("report_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").references(() => reportTemplates.id, { onDelete: "set null" }),
  executedBy: varchar("executed_by").notNull().references(() => users.id),
  
  // Execution details
  reportName: text("report_name").notNull(), // Snapshot of report name at execution time
  parameters: jsonb("parameters"), // Runtime parameters (filters, date ranges)
  
  // Results
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  resultData: jsonb("result_data"), // Cached result data
  rowCount: integer("row_count"),
  executionTimeMs: integer("execution_time_ms"), // Execution duration in milliseconds
  
  // Error handling
  errorMessage: text("error_message"),
  
  // Export tracking
  exportedFormats: jsonb("exported_formats"), // Array of formats this execution was exported to
  exportUrls: jsonb("export_urls"), // URLs to exported files (if stored)
  
  executedAt: timestamp("executed_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_report_executions_org_id").on(table.organizationId),
  index("IDX_report_executions_template_id").on(table.templateId),
  index("IDX_report_executions_status").on(table.status),
  index("IDX_report_executions_executed_at").on(table.executedAt),
]);

export const insertReportExecutionSchema = createInsertSchema(reportExecutions).omit({
  id: true,
  executedAt: true,
}).extend({
  status: z.enum(["pending", "running", "completed", "failed"]),
});

export type InsertReportExecution = z.infer<typeof insertReportExecutionSchema>;
export type ReportExecution = typeof reportExecutions.$inferSelect;

// Report Schedules - Automated report delivery
export const reportSchedules = pgTable("report_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => reportTemplates.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  
  // Schedule configuration
  name: text("name").notNull(),
  isActive: text("is_active").notNull().default("yes"), // yes, no
  frequency: text("frequency").notNull(), // daily, weekly, monthly, quarterly
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly schedules
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly schedules
  timeOfDay: text("time_of_day").notNull().default("09:00"), // HH:MM format
  timezone: text("timezone").notNull().default("America/New_York"),
  
  // Delivery settings
  deliveryMethod: text("delivery_method").notNull().default("email"), // email, webhook
  recipients: jsonb("recipients").notNull(), // Array of email addresses
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  exportFormat: text("export_format").notNull().default("pdf"), // pdf, excel, csv
  
  // Execution tracking
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  runCount: integer("run_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_report_schedules_org_id").on(table.organizationId),
  index("IDX_report_schedules_template_id").on(table.templateId),
  index("IDX_report_schedules_next_run").on(table.nextRunAt),
  index("IDX_report_schedules_active").on(table.isActive),
]);

export const insertReportScheduleSchema = createInsertSchema(reportSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  deliveryMethod: z.enum(["email", "webhook"]),
  exportFormat: z.enum(["pdf", "excel", "csv"]),
  isActive: z.enum(["yes", "no"]),
});

export type InsertReportSchedule = z.infer<typeof insertReportScheduleSchema>;
export type ReportSchedule = typeof reportSchedules.$inferSelect;

// Report Shares - Share reports with team members
export const reportShares = pgTable("report_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => reportTemplates.id, { onDelete: "cascade" }),
  sharedBy: varchar("shared_by").notNull().references(() => users.id),
  sharedWith: varchar("shared_with").notNull().references(() => users.id),
  
  // Permissions
  canEdit: text("can_edit").notNull().default("no"), // yes, no
  canDelete: text("can_delete").notNull().default("no"), // yes, no
  canShare: text("can_share").notNull().default("no"), // yes, no
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_report_shares_template_id").on(table.templateId),
  index("IDX_report_shares_shared_with").on(table.sharedWith),
  uniqueIndex("IDX_report_share_unique").on(table.templateId, table.sharedWith),
]);

export const insertReportShareSchema = createInsertSchema(reportShares).omit({
  id: true,
  createdAt: true,
}).extend({
  canEdit: z.enum(["yes", "no"]),
  canDelete: z.enum(["yes", "no"]),
  canShare: z.enum(["yes", "no"]),
});

export type InsertReportShare = z.infer<typeof insertReportShareSchema>;
export type ReportShare = typeof reportShares.$inferSelect;

// ============================================================================
// WORKSTREAM 1: COMPETITIVE ANALYSIS
// ============================================================================

// Competitors - Track competitor companies for market intelligence
export const competitors = pgTable("competitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id),
  
  // Company information
  companyName: text("company_name").notNull(),
  website: text("website"),
  industry: text("industry"), // manufacturer, distributor, installer, general_contractor
  marketSegment: text("market_segment"), // commercial, residential, industrial
  headcount: integer("headcount"),
  annualRevenue: text("annual_revenue"),
  headquarters: text("headquarters"),
  territories: jsonb("territories"),
  
  // Contact information
  primaryContact: text("primary_contact"),
  phone: text("phone"),
  email: text("email"),
  
  // Competitive positioning
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  marketShare: text("market_share"),
  competitiveAdvantage: text("competitive_advantage"),
  
  // Notes and intelligence
  notes: text("notes"),
  metadata: jsonb("metadata"),
  
  isActive: text("is_active").notNull().default("yes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_competitors_org_id").on(table.organizationId),
  index("IDX_competitors_industry").on(table.industry),
]);

export const insertCompetitorSchema = createInsertSchema(competitors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isActive: z.enum(["yes", "no"]).default("yes"),
});

export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Competitor = typeof competitors.$inferSelect;

// Competitor Products - Product catalog for competitive analysis
export const competitorProducts = pgTable("competitor_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id").notNull().references(() => competitors.id, { onDelete: "cascade" }),
  
  // Product information
  productName: text("product_name").notNull(),
  productCode: text("product_code"),
  category: text("category"),
  description: text("description"),
  specifications: jsonb("specifications"),
  features: jsonb("features"),
  
  // Pricing
  listPrice: text("list_price"),
  currency: text("currency").notNull().default("USD"),
  priceEffectiveDate: timestamp("price_effective_date"),
  
  // Competitive analysis
  quality: text("quality"),
  marketPosition: text("market_position"),
  advantages: text("advantages"),
  disadvantages: text("disadvantages"),
  
  // Metadata
  dataSource: text("data_source"),
  lastVerified: timestamp("last_verified"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  
  isActive: text("is_active").notNull().default("yes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_competitor_products_org_id").on(table.organizationId),
  index("IDX_competitor_products_competitor_id").on(table.competitorId),
  index("IDX_competitor_products_category").on(table.category),
]);

export const insertCompetitorProductSchema = createInsertSchema(competitorProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isActive: z.enum(["yes", "no"]).default("yes"),
});

export type InsertCompetitorProduct = z.infer<typeof insertCompetitorProductSchema>;
export type CompetitorProduct = typeof competitorProducts.$inferSelect;

// Competitor Pricing - Historical pricing data for trend analysis
export const competitorPricing = pgTable("competitor_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id").notNull().references(() => competitors.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => competitorProducts.id, { onDelete: "cascade" }),
  
  // Pricing snapshot
  productName: text("product_name").notNull(),
  price: text("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  priceType: text("price_type").notNull(),
  quantity: integer("quantity"),
  
  // Context
  source: text("source"),
  projectId: varchar("project_id").references(() => projects.id),
  region: text("region"),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  
  // Analysis
  priceChange: text("price_change"),
  marketPosition: text("market_position"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  
  recordedBy: varchar("recorded_by").references(() => users.id),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_competitor_pricing_org_id").on(table.organizationId),
  index("IDX_competitor_pricing_competitor_id").on(table.competitorId),
  index("IDX_competitor_pricing_product_id").on(table.productId),
  index("IDX_competitor_pricing_effective_date").on(table.effectiveDate),
]);

export const insertCompetitorPricingSchema = createInsertSchema(competitorPricing).omit({
  id: true,
  recordedAt: true,
});

export type InsertCompetitorPricing = z.infer<typeof insertCompetitorPricingSchema>;
export type CompetitorPricing = typeof competitorPricing.$inferSelect;

// Project Competitors - Win/loss analysis tracking
export const projectCompetitors = pgTable("project_competitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id").notNull().references(() => competitors.id, { onDelete: "cascade" }),
  
  // Competition details
  competitionType: text("competition_type").notNull(),
  outcome: text("outcome"),
  
  // Competitive pricing
  competitorQuoteAmount: text("competitor_quote_amount"),
  ourQuoteAmount: text("our_quote_amount"),
  priceDifference: text("price_difference"),
  priceDifferencePercent: text("price_difference_percent"),
  
  // Win/loss analysis
  winFactors: jsonb("win_factors"),
  lossFactors: jsonb("loss_factors"),
  keyDifferentiators: text("key_differentiators"),
  customerFeedback: text("customer_feedback"),
  lessonsLearned: text("lessons_learned"),
  
  // Timing
  bidDate: timestamp("bid_date"),
  awardDate: timestamp("award_date"),
  decisionDate: timestamp("decision_date"),
  
  // Analysis
  competitiveStrength: text("competitive_strength"),
  recommendations: text("recommendations"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  
  recordedBy: varchar("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_project_competitors_org_id").on(table.organizationId),
  index("IDX_project_competitors_project_id").on(table.projectId),
  index("IDX_project_competitors_competitor_id").on(table.competitorId),
  index("IDX_project_competitors_outcome").on(table.outcome),
  uniqueIndex("IDX_project_competitor_unique").on(table.projectId, table.competitorId),
]);

export const insertProjectCompetitorSchema = createInsertSchema(projectCompetitors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectCompetitor = z.infer<typeof insertProjectCompetitorSchema>;
export type ProjectCompetitor = typeof projectCompetitors.$inferSelect;

// Update schemas that omit immutable fields
// Update schemas - explicitly allow only mutable fields
export const updateCompetitorSchema = z.object({
  companyName: z.string(),
  website: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  marketSegment: z.string().optional().nullable(),
  headcount: z.number().optional().nullable(),
  annualRevenue: z.string().optional().nullable(),
  headquarters: z.string().optional().nullable(),
  territories: z.any().optional().nullable(),
  primaryContact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  strengths: z.string().optional().nullable(),
  weaknesses: z.string().optional().nullable(),
  marketShare: z.string().optional().nullable(),
  competitiveAdvantage: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
  isActive: z.enum(["yes", "no"]).optional(),
}).partial();

export const updateCompetitorProductSchema = z.object({
  productName: z.string(),
  productCode: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  specifications: z.any().optional().nullable(),
  features: z.any().optional().nullable(),
  listPrice: z.string().optional().nullable(),
  currency: z.string().optional(),
  priceEffectiveDate: z.date().optional().nullable(),
  quality: z.string().optional().nullable(),
  marketPosition: z.string().optional().nullable(),
  advantages: z.string().optional().nullable(),
  disadvantages: z.string().optional().nullable(),
  dataSource: z.string().optional().nullable(),
  lastVerified: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
  isActive: z.enum(["yes", "no"]).optional(),
}).partial();

export const updateProjectCompetitorSchema = z.object({
  competitionType: z.string(),
  outcome: z.string().optional().nullable(),
  competitorQuoteAmount: z.string().optional().nullable(),
  ourQuoteAmount: z.string().optional().nullable(),
  priceDifference: z.string().optional().nullable(),
  priceDifferencePercent: z.string().optional().nullable(),
  winFactors: z.any().optional().nullable(),
  lossFactors: z.any().optional().nullable(),
  keyDifferentiators: z.string().optional().nullable(),
  customerFeedback: z.string().optional().nullable(),
  lessonsLearned: z.string().optional().nullable(),
  bidDate: z.date().optional().nullable(),
  awardDate: z.date().optional().nullable(),
  decisionDate: z.date().optional().nullable(),
  competitiveStrength: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
}).partial();

// ============================================================================
// WORKSTREAM 2: AI & AUTOMATION - HARDWARE RECOMMENDATION ENGINE
// ============================================================================

// Recommendation Rules - ML-based scoring rules for hardware selection
export const recommendationRules = pgTable("recommendation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // Rule identification
  ruleName: text("rule_name").notNull(),
  ruleType: text("rule_type").notNull(), // compatibility, compliance, optimization, preference
  priority: integer("priority").notNull().default(50), // 0-100, higher = more important
  
  // Conditions (when this rule applies)
  conditions: jsonb("conditions").notNull(), // {buildingType: "office", trafficLevel: "high"}
  
  // Recommendation logic
  recommendedCategories: text("recommended_categories").array(), // ["closer", "lock", "hinge"]
  requiredFeatures: jsonb("required_features"), // {fireRating: "90min", grade: 1}
  excludedProducts: text("excluded_products").array(), // Product IDs to exclude
  
  // Scoring weights
  scoreWeight: integer("score_weight").notNull().default(10), // Impact on final score
  scoringFactors: jsonb("scoring_factors"), // {cost: 0.3, performance: 0.5, compliance: 0.2}
  
  // Compliance mapping
  relatedCodes: text("related_codes").array(), // ["IBC 1010.1.9", "ADA 404.2.3"]
  complianceRequired: text("compliance_required").notNull().default("no"), // yes, no
  
  // Metadata
  description: text("description"),
  isActive: text("is_active").notNull().default("yes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_rec_rules_org").on(table.organizationId),
  index("IDX_rec_rules_type").on(table.ruleType),
  index("IDX_rec_rules_active").on(table.isActive),
]);

export const insertRecommendationRuleSchema = createInsertSchema(recommendationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecommendationRule = z.infer<typeof insertRecommendationRuleSchema>;
export type RecommendationRule = typeof recommendationRules.$inferSelect;

// Hardware Compatibility Matrix - Track which products work together
export const hardwareCompatibility = pgTable("hardware_compatibility", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // Primary product
  productId: varchar("product_id").notNull(),
  productCategory: text("product_category").notNull(), // door, frame, closer, lock, hinge
  
  // Compatible products
  compatibleWithId: varchar("compatible_with_id").notNull(),
  compatibleCategory: text("compatible_category").notNull(),
  
  // Compatibility details
  compatibilityType: text("compatibility_type").notNull(), // required, recommended, compatible, incompatible
  compatibilityScore: integer("compatibility_score").notNull().default(100), // 0-100
  
  // Constraints
  conditions: jsonb("conditions"), // {doorWidth: ">36in", fireRating: "90min"}
  warnings: text("warnings").array(), // ["Requires additional prep", "May void warranty"]
  
  // Documentation
  notes: text("notes"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_compat_org").on(table.organizationId),
  index("IDX_compat_product").on(table.productId),
  index("IDX_compat_with").on(table.compatibleWithId),
  index("IDX_compat_type").on(table.compatibilityType),
]);

export const insertHardwareCompatibilitySchema = createInsertSchema(hardwareCompatibility).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHardwareCompatibility = z.infer<typeof insertHardwareCompatibilitySchema>;
export type HardwareCompatibility = typeof hardwareCompatibility.$inferSelect;

// Recommendation Logs - Track recommendations made and their outcomes
export const recommendationLogs = pgTable("recommendation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Context
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "set null" }),
  
  // Input parameters
  inputParameters: jsonb("input_parameters").notNull(), // All factors used for recommendation
  
  // Recommendations generated
  recommendations: jsonb("recommendations").notNull(), // Array of recommended products with scores
  topRecommendation: varchar("top_recommendation"),
  recommendationScore: integer("recommendation_score"), // 0-100
  
  // Applied rules
  appliedRules: text("applied_rules").array(), // Rule IDs that contributed
  scoringBreakdown: jsonb("scoring_breakdown"), // Detailed score calculation
  
  // User action
  userSelection: varchar("user_selection"), // Product ID user actually selected
  selectionReason: text("selection_reason"),
  feedbackScore: integer("feedback_score"), // 1-5 rating
  feedbackNotes: text("feedback_notes"),
  
  // ML training
  wasAccepted: text("was_accepted"), // yes, no, modified
  acceptedAt: timestamp("accepted_at"),
  
  // Metadata
  recommendedBy: varchar("recommended_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_rec_logs_org").on(table.organizationId),
  index("IDX_rec_logs_project").on(table.projectId),
  index("IDX_rec_logs_opening").on(table.openingId),
  index("IDX_rec_logs_accepted").on(table.wasAccepted),
]);

export const insertRecommendationLogSchema = createInsertSchema(recommendationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertRecommendationLog = z.infer<typeof insertRecommendationLogSchema>;
export type RecommendationLog = typeof recommendationLogs.$inferSelect;

// ============================================================================
// INDUSTRY REFERENCE LIBRARY TABLES
// ============================================================================

// Hollow Metal Materials Reference - Industry-standard material specifications
export const hmMaterials = pgTable("hm_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  materialId: varchar("material_id").notNull().unique(), // A40, A60, G90, CRS
  name: text("name").notNull(), // Galvannealed A40, Galvannealed A60, etc.
  isDefault: text("is_default").default("no"), // yes, no
  corrosionResistanceRank: integer("corrosion_resistance_rank"), // 1-3 ranking
  paintAdhesion: text("paint_adhesion"), // High, Moderate, Low
  notes: text("notes"),
  sourceRef: text("source_ref"), // HM101_Doors, HM101_Frames, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHmMaterialSchema = createInsertSchema(hmMaterials).omit({
  id: true,
  createdAt: true,
});

export type InsertHmMaterial = z.infer<typeof insertHmMaterialSchema>;
export type HmMaterial = typeof hmMaterials.$inferSelect;

// Hollow Metal Frames Reference - Frame gauge specifications
export const hmFrames = pgTable("hm_frames", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  frameId: varchar("frame_id").notNull().unique(), // STD16, STD14, STD12, SPC18, SPC20
  gauge: integer("gauge").notNull(), // 16, 14, 12, 18, 20
  description: text("description").notNull(),
  notes: text("notes"),
  sourceRef: text("source_ref"), // HM101_Frames
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHmFrameSchema = createInsertSchema(hmFrames).omit({
  id: true,
  createdAt: true,
});

export type InsertHmFrame = z.infer<typeof insertHmFrameSchema>;
export type HmFrame = typeof hmFrames.$inferSelect;

// Fire Ratings Reference - UL fire rating specifications
export const fireRatings = pgTable("fire_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fireId: varchar("fire_id").notNull().unique(), // MIN20, MIN45, MIN60, MIN90, MIN180
  minutes: integer("minutes").notNull(), // 20, 45, 60, 90, 180
  label: text("label").notNull(), // 20-minute, 45-minute, etc.
  notes: text("notes"),
  appliesTo: text("applies_to"), // doors, frames, borrowed lights
  sourceRef: text("source_ref"), // HM201_FireDoors, HM201_FireFrames
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFireRatingSchema = createInsertSchema(fireRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertFireRating = z.infer<typeof insertFireRatingSchema>;
export type FireRating = typeof fireRatings.$inferSelect;

// Fire Labels Reference - UL label types and requirements
export const fireLabels = pgTable("fire_labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  labelId: varchar("label_id").notNull().unique(), // MYLAR, METAL, SMOKE_S
  type: text("type").notNull(), // Mylar, Metal, Smoke indicator
  visibilityRule: text("visibility_rule"),
  relocationNotes: text("relocation_notes"),
  sourceRef: text("source_ref"), // HM201_FireDoors
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFireLabelSchema = createInsertSchema(fireLabels).omit({
  id: true,
  createdAt: true,
});

export type InsertFireLabel = z.infer<typeof insertFireLabelSchema>;
export type FireLabel = typeof fireLabels.$inferSelect;

// Electrified Hardware Reference - Power transfer and locking modes
export const electrifiedHardware = pgTable("electrified_hardware", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hwId: varchar("hw_id").notNull().unique(), // FAIL_SAFE, FAIL_SECURE, RACEWAY, EPT10
  category: text("category").notNull(), // Locking mode, Power transfer
  name: text("name").notNull(),
  definition: text("definition"),
  commonUse: text("common_use"),
  notes: text("notes"),
  sourceRef: text("source_ref"), // HM201_Electrified
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertElectrifiedHardwareSchema = createInsertSchema(electrifiedHardware).omit({
  id: true,
  createdAt: true,
});

export type InsertElectrifiedHardware = z.infer<typeof insertElectrifiedHardwareSchema>;
export type ElectrifiedHardware = typeof electrifiedHardware.$inferSelect;

// Ordering Guidelines Reference - Best practices and requirements
export const orderingGuidelines = pgTable("ordering_guidelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guidelineId: varchar("guideline_id").notNull().unique(), // SELF_CLOSE, SELF_LATCH, LABEL_VIS, etc.
  topic: text("topic").notNull(), // Fire Door Basics, Labels, Frames, Electrified Preps
  rule: text("rule").notNull(),
  methodExamples: text("method_examples"),
  sourceRef: text("source_ref"), // HM201_FireDoors, HM201_FireFrames, HM201_Electrified
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderingGuidelineSchema = createInsertSchema(orderingGuidelines).omit({
  id: true,
  createdAt: true,
});

export type InsertOrderingGuideline = z.infer<typeof insertOrderingGuidelineSchema>;
export type OrderingGuideline = typeof orderingGuidelines.$inferSelect;

// Raceways and EPTs Reference - Power transfer specifications
export const racewaysAndEpts = pgTable("raceways_and_epts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eptId: varchar("ept_id").notNull().unique(), // RW_DOOR_STD
  appliesTo: text("applies_to").notNull(), // door, frame
  diameterIn: real("diameter_in"), // 0.5
  installedByDefault: text("installed_by_default"), // Yes/No when certain conditions met
  framePolicy: text("frame_policy"),
  molexPasses: text("molex_passes"), // yes, no
  sourceRef: text("source_ref"), // HM201_Electrified
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRacewayAndEptSchema = createInsertSchema(racewaysAndEpts).omit({
  id: true,
  createdAt: true,
});

export type InsertRacewayAndEpt = z.infer<typeof insertRacewayAndEptSchema>;
export type RacewayAndEpt = typeof racewaysAndEpts.$inferSelect;

// Door Reference Library - Comprehensive door/frame/hardware specifications
export const doorReferenceLibrary = pgTable("door_reference_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  illustration: text("illustration"), // Human-readable label
  category: text("category"), // Hollow Metal, Wood, Aluminum, Glass
  subcategory: text("subcategory"),
  doorType: text("door_type"),
  material: text("material"), // Steel, Aluminum, Wood, Glass
  finish: text("finish"),
  configuration: text("configuration"), // Single, Double, Sidelight
  operation: text("operation"), // Swing, Sliding, Folding, Revolving
  frameType: text("frame_type"),
  hardware: text("hardware"),
  glassType: text("glass_type"),
  automationReady: text("automation_ready"), // yes, no, optional
  commonUse: text("common_use"),
  notes: text("notes"),
  imageUrl: text("image_url"), // Optional reference image
  sourceRef: text("source_ref"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_door_ref_category").on(table.category),
  index("IDX_door_ref_material").on(table.material),
  index("IDX_door_ref_operation").on(table.operation),
]);

export const insertDoorReferenceLibrarySchema = createInsertSchema(doorReferenceLibrary).omit({
  id: true,
  createdAt: true,
});

export type InsertDoorReferenceLibrary = z.infer<typeof insertDoorReferenceLibrarySchema>;
export type DoorReferenceLibrary = typeof doorReferenceLibrary.$inferSelect;

// ============================================================================
// BLOG & CONTENT MANAGEMENT SYSTEM (Phase 8: Marketing & Growth)
// ============================================================================

// Blog Categories - Organize blog content by topic
export const blogCategories = pgTable("blog_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Category identification
  name: text("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  
  // Display
  color: varchar("color"), // Hex color for category badge
  icon: varchar("icon"), // Lucide icon name
  displayOrder: integer("display_order").default(0),
  
  // Visibility
  isActive: text("is_active").notNull().default("yes"), // yes, no
  
  // Metadata
  postCount: integer("post_count").notNull().default(0), // Denormalized for performance
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_blog_categories_slug").on(table.slug),
  index("IDX_blog_categories_active").on(table.isActive),
]);

export const insertBlogCategorySchema = createInsertSchema(blogCategories).omit({
  id: true,
  postCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;
export type BlogCategory = typeof blogCategories.$inferSelect;

// Blog Tags - Flexible tagging system for content discovery
export const blogTags = pgTable("blog_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Tag identification
  name: text("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  
  // Metadata
  postCount: integer("post_count").notNull().default(0), // Denormalized for performance
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_blog_tags_slug").on(table.slug),
]);

export const insertBlogTagSchema = createInsertSchema(blogTags).omit({
  id: true,
  postCount: true,
  createdAt: true,
});

export type InsertBlogTag = z.infer<typeof insertBlogTagSchema>;
export type BlogTag = typeof blogTags.$inferSelect;

// Blog Posts - Main content with full SEO support
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Content
  title: text("title").notNull(),
  slug: varchar("slug").notNull().unique(),
  excerpt: text("excerpt"), // Short summary for listings
  content: text("content").notNull(), // Full Markdown/HTML content
  
  // Media
  featuredImage: text("featured_image"), // Hero image URL
  featuredImageAlt: text("featured_image_alt"), // Accessibility alt text
  
  // Relationships
  categoryId: varchar("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Publishing workflow
  status: varchar("status").notNull().default("draft"), // draft, published, archived
  publishedAt: timestamp("published_at"),
  scheduledFor: timestamp("scheduled_for"), // For scheduled publishing
  
  // SEO Optimization
  metaTitle: text("meta_title"), // Custom title tag (defaults to title)
  metaDescription: text("meta_description"), // Meta description for search engines
  ogTitle: text("og_title"), // Open Graph title (social sharing)
  ogDescription: text("og_description"), // Open Graph description
  ogImage: text("og_image"), // Open Graph image URL
  twitterCard: varchar("twitter_card").default("summary_large_image"), // summary, summary_large_image
  canonicalUrl: text("canonical_url"), // Canonical URL for duplicate content
  keywords: text("keywords").array(), // SEO keywords
  
  // Engagement & Analytics
  viewCount: integer("view_count").notNull().default(0),
  readTimeMinutes: integer("read_time_minutes"), // Estimated reading time
  isFeatured: text("is_featured").notNull().default("no"), // yes, no - Featured on homepage
  allowComments: text("allow_comments").notNull().default("yes"), // yes, no
  
  // Content flags
  isExternal: text("is_external").notNull().default("no"), // yes, no - External link instead of full post
  externalUrl: text("external_url"), // URL if isExternal="yes"
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_blog_posts_slug").on(table.slug),
  index("IDX_blog_posts_status").on(table.status),
  index("IDX_blog_posts_category").on(table.categoryId),
  index("IDX_blog_posts_author").on(table.authorId),
  index("IDX_blog_posts_published").on(table.publishedAt),
  index("IDX_blog_posts_featured").on(table.isFeatured),
]);

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  isFeatured: z.enum(["yes", "no"]).default("no"),
  isExternal: z.enum(["yes", "no"]).default("no"),
  allowComments: z.enum(["yes", "no"]).default("yes"),
  twitterCard: z.enum(["summary", "summary_large_image"]).default("summary_large_image"),
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Blog Post Tags - Many-to-many relationship
export const blogPostTags = pgTable("blog_post_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => blogTags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_blog_post_tags_post").on(table.postId),
  index("IDX_blog_post_tags_tag").on(table.tagId),
]);

export const insertBlogPostTagSchema = createInsertSchema(blogPostTags).omit({
  id: true,
  createdAt: true,
});

export type InsertBlogPostTag = z.infer<typeof insertBlogPostTagSchema>;
export type BlogPostTag = typeof blogPostTags.$inferSelect;

// ============================================================================
// HARDWARE CATALOG - Reference database of door hardware products
// ============================================================================

// Hardware Catalog - Comprehensive database of door hardware products from multiple manufacturers
// Note: This is different from hardwareItems table which stores project-specific hardware instances
export const hardwareCatalog = pgTable("hardware_catalog", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // Access Control Readers & Keypads, Locks, Hinges, Door Closers, Exit Devices, etc.
  subtype: text("subtype"), // Specific subtype within category
  brand: text("brand"), // Manufacturer brand
  model: text("model"), // Model number/identifier
  nomenclature: text("nomenclature"), // Standard nomenclature
  grade: text("grade"), // Quality/performance grade
  bhmaStandard: text("bhma_standard"), // BHMA standard (e.g., A156.4)
  bhmaCertified: text("bhma_certified"), // yes, no - Whether BHMA certified
  msrp: real("msrp"), // Manufacturer's suggested retail price
  typicalPrice: real("typical_price"), // Typical/average market price
  material: text("material"), // Construction material
  finishOptions: text("finish_options"), // Available finish options
  dimensions: text("dimensions"), // Product dimensions
  doorThickness: text("door_thickness"), // Compatible door thickness
  power: text("power"), // Power requirements (for electronic items)
  features: text("features"), // Key features and capabilities
  use: text("use"), // Intended use/application
  fireRating: text("fire_rating"), // Fire rating certification
  adaCompliant: text("ada_compliant"), // ADA compliance notes
  crossRef: text("cross_ref"), // Cross-reference to equivalent products
  notes: text("notes"), // Additional notes and guidance
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_hardware_catalog_category").on(table.category),
  index("IDX_hardware_catalog_brand").on(table.brand),
]);

export const insertHardwareCatalogSchema = createInsertSchema(hardwareCatalog).omit({
  id: true,
  createdAt: true,
});

export type InsertHardwareCatalog = z.infer<typeof insertHardwareCatalogSchema>;
export type HardwareCatalog = typeof hardwareCatalog.$inferSelect;

// BHMA Finishes - Standard finish codes and descriptions
export const bhmaFinishes = pgTable("bhma_finishes", {
  codeUs: text("code_us").primaryKey(), // US finish code (e.g., "US3", "US26D")
  codeBhma: text("code_bhma"), // BHMA code equivalent
  description: text("description"), // Finish description (e.g., "Bright Brass", "Satin Chrome")
});

export const insertBhmaFinishSchema = createInsertSchema(bhmaFinishes);

export type InsertBhmaFinish = z.infer<typeof insertBhmaFinishSchema>;
export type BhmaFinish = typeof bhmaFinishes.$inferSelect;

// Lock Functions - Standard lock function types and their applications
export const lockFunctions = pgTable("lock_functions", {
  id: serial("id").primaryKey(),
  category: text("category"), // Function category
  function: text("function"), // Function code/type
  typicalUse: text("typical_use"), // Where this function is typically used
  notes: text("notes"), // Additional guidance
});

export const insertLockFunctionSchema = createInsertSchema(lockFunctions).omit({
  id: true,
});

export type InsertLockFunction = z.infer<typeof insertLockFunctionSchema>;
export type LockFunction = typeof lockFunctions.$inferSelect;

// Function Catalog - Brand-specific function codes and mappings
export const functionCatalog = pgTable("function_catalog", {
  id: serial("id").primaryKey(),
  brand: text("brand"), // Lock manufacturer brand
  family: text("family"), // Product family/series
  functionCode: text("function_code"), // Brand-specific function code
  name: text("name"), // Function name
  description: text("description"), // Detailed description
  verified: text("verified").default("no"), // yes, no - Whether verified against current catalog
});

export const insertFunctionCatalogSchema = createInsertSchema(functionCatalog).omit({
  id: true,
});

export type InsertFunctionCatalog = z.infer<typeof insertFunctionCatalogSchema>;
export type FunctionCatalog = typeof functionCatalog.$inferSelect;

// Code Rules - Building code compliance rules for hardware selection
export const codeRules = pgTable("code_rules", {
  ruleId: text("rule_id").primaryKey(), // Unique rule identifier
  category: text("category"), // Rule category (e.g., "egress", "accessibility", "fire")
  condition: text("condition"), // Condition/requirement description
  jurisdiction: text("jurisdiction"), // Applicable jurisdiction (US, CA, specific states)
  severity: text("severity"), // critical, warning, info
  guidance: text("guidance"), // Compliance guidance
});

export const insertCodeRuleSchema = createInsertSchema(codeRules);

export type InsertCodeRule = z.infer<typeof insertCodeRuleSchema>;
export type CodeRule = typeof codeRules.$inferSelect;

// AHJ Variations - Authority Having Jurisdiction variations by state/region
export const ahjVariations = pgTable("ahj_variations", {
  id: serial("id").primaryKey(),
  state: text("state"), // State/province code
  codeEdition: text("code_edition"), // Code edition/version
  ruleId: text("rule_id").references(() => codeRules.ruleId), // Reference to base rule
  override: text("override"), // Override or modification to base rule
  notes: text("notes"), // Additional jurisdiction-specific notes
});

export const insertAhjVariationSchema = createInsertSchema(ahjVariations).omit({
  id: true,
});

export type InsertAhjVariation = z.infer<typeof insertAhjVariationSchema>;
export type AhjVariation = typeof ahjVariations.$inferSelect;

// ============================================================================
// BOM TEMPLATES - Pre-configured hardware sets
// ============================================================================

// BOM Templates - Header information for hardware set templates
export const bomTemplates = pgTable("bom_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // null = global/system template
  name: text("name").notNull(), // Template name (e.g., STD_HM_PAIR_QEL)
  description: text("description"), // Template description
  category: text("category"), // Template category for grouping
  isActive: text("is_active").notNull().default("yes"), // yes, no
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_bom_templates_organization_id").on(table.organizationId),
  index("IDX_bom_templates_name").on(table.name),
]);

export const insertBomTemplateSchema = createInsertSchema(bomTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBomTemplate = z.infer<typeof insertBomTemplateSchema>;
export type BomTemplate = typeof bomTemplates.$inferSelect;

// BOM Template Items - Individual hardware items within a template
export const bomTemplateItems = pgTable("bom_template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => bomTemplates.id, { onDelete: "cascade" }),
  itemCategory: text("item_category"), // Exit Device, Operator, Vision Lite/Glazing, Accessories, etc.
  manufacturer: text("manufacturer"), // Manufacturer/brand
  modelNumber: text("model_number"), // Model number
  description: text("description"), // Item description
  quantity: real("quantity"), // Quantity needed
  sizeSpec: text("size_spec"), // Size specification
  finish: text("finish"), // Finish code (e.g., 626 (US26D))
  handing: text("handing"), // Handing (LHR, RHR, Pair, etc.)
  fireRating: text("fire_rating"), // Fire/smoke rating
  notes: text("notes"), // Installation notes, accessories, etc.
  sortOrder: integer("sort_order").default(0), // Display order
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_bom_template_items_template_id").on(table.templateId),
]);

export const insertBomTemplateItemSchema = createInsertSchema(bomTemplateItems).omit({
  id: true,
  createdAt: true,
});

export type InsertBomTemplateItem = z.infer<typeof insertBomTemplateItemSchema>;
export type BomTemplateItem = typeof bomTemplateItems.$inferSelect;

// ============================================================================
// GUIDED SCAN SYSTEM
// ============================================================================

// Scan Configurations - Per-organization scan quality thresholds and flags
export const scanConfigs = pgTable("scan_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }).unique(),
  measurementSystem: varchar("measurement_system", { length: 20 }).notNull().default("imperial"), // imperial or metric
  coverageThreshold: integer("coverage_threshold").notNull().default(85), // Minimum scan coverage percentage (0-100)
  confidenceThreshold: real("confidence_threshold").notNull().default(0.85), // Minimum confidence score (0-1)
  minDistanceM: real("min_distance_m").notNull().default(1.5), // Minimum device distance in meters
  maxDistanceM: real("max_distance_m").notNull().default(2.0), // Maximum device distance in meters
  maxAngleDeg: integer("max_angle_deg").notNull().default(25), // Maximum angle deviation in degrees
  enableVoice: boolean("enable_voice").notNull().default(false), // Voice guidance (disabled per user request)
  enableSubtitles: boolean("enable_subtitles").notNull().default(true), // On-screen subtitles
  enableDualPass: boolean("enable_dual_pass").notNull().default(true), // Separate frame and door passes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_scan_configs_organization_id").on(table.organizationId),
]);

export const insertScanConfigSchema = createInsertSchema(scanConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScanConfig = z.infer<typeof insertScanConfigSchema>;
export type ScanConfig = typeof scanConfigs.$inferSelect;

// Scan Metrics - Telemetry for scan workflow analytics
export const scanMetrics = pgTable("scan_metrics", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  openingId: varchar("opening_id").references(() => doorOpenings.id, { onDelete: "cascade" }), // Optional - scan may not be linked to opening yet
  eventType: varchar("event_type", { length: 100 }).notNull(), // e.g., 'scan.calibrate.start', 'scan.frame.done', 'scan.quality.pass'
  eventData: jsonb("event_data"), // Event-specific data (widthMm, heightMm, duration, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_scan_metrics_organization_id").on(table.organizationId),
  index("IDX_scan_metrics_user_id").on(table.userId),
  index("IDX_scan_metrics_opening_id").on(table.openingId),
  index("IDX_scan_metrics_event_type").on(table.eventType),
  index("IDX_scan_metrics_created_at").on(table.createdAt),
]);

export const insertScanMetricSchema = createInsertSchema(scanMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertScanMetric = z.infer<typeof insertScanMetricSchema>;
export type ScanMetric = typeof scanMetrics.$inferSelect;

// ============================================================================
// ADVANCED SEARCH & FILTERING SYSTEM (PHASE 6)
// ============================================================================

// Search History - Track user search queries for suggestions and analytics
export const searchHistory = pgTable("search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(), // The search query text
  entityTypes: jsonb("entity_types").default(sql`'[]'::jsonb`), // Array of entity types searched: ["projects", "openings", "hardware"]
  filters: jsonb("filters"), // Applied filters as JSON object
  resultCount: integer("result_count").notNull().default(0), // Number of results returned
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_search_history_organization_id").on(table.organizationId),
  index("IDX_search_history_user_id").on(table.userId),
  index("IDX_search_history_created_at").on(table.createdAt),
]);

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;

// Saved Searches - User-saved search queries and filters
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // User-defined name for the saved search
  description: text("description"), // Optional description
  query: text("query"), // The search query text (can be empty for filter-only searches)
  entityTypes: jsonb("entity_types").notNull().default(sql`'["projects"]'::jsonb`), // Entity types to search
  filters: jsonb("filters").notNull().default(sql`'{}'::jsonb`), // Filter configuration as JSON
  isGlobal: boolean("is_global").notNull().default(false), // If true, visible to all org users
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_saved_searches_organization_id").on(table.organizationId),
  index("IDX_saved_searches_user_id").on(table.userId),
  index("IDX_saved_searches_is_global").on(table.isGlobal),
]);

export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;

// ============================================================================
// FLOOR PLANS & VISUAL DOCUMENTATION
// ============================================================================
// Note: Floor plans table already exists at line 1563 - see above for schema

// Opening Files - File attachments for openings (photos, PDFs, etc.)
export const openingFiles = pgTable("opening_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  
  kind: varchar("kind", { length: 32 }).notNull(), // photo, drawing, spec, installation-guide, warranty, compliance-cert
  name: text("name").notNull(), // Original filename
  url: text("url").notNull(), // Storage URL (S3, R2, or object storage)
  thumbUrl: text("thumb_url"), // Thumbnail URL for images
  fileSize: integer("file_size"), // File size in bytes
  mimeType: varchar("mime_type", { length: 100 }), // MIME type
  
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOpeningFileSchema = createInsertSchema(openingFiles).omit({
  id: true,
  createdAt: true,
});

export type InsertOpeningFile = z.infer<typeof insertOpeningFileSchema>;
export type OpeningFile = typeof openingFiles.$inferSelect;

// Hardware Sets - Reusable hardware collections/templates
export const hardwareSets = pgTable("hardware_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  label: text("label").notNull(), // e.g., "Standard Office Door Set", "High Security Set"
  description: text("description"), // Detailed description
  category: varchar("category", { length: 50 }), // office, entry, exit, high-security, etc.
  
  // Hardware items in this set
  // Array of: {bhma: string, name: string, manufacturer?: string, model?: string, grade?: string, qty?: number, notes?: string}
  items: jsonb("items").default(sql`'[]'::jsonb`).notNull(),
  
  // Template usage
  isTemplate: boolean("is_template").default(false), // Whether this is an organization template
  baseCost: real("base_cost"), // Estimated total cost for this hardware set
  
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHardwareSetSchema = createInsertSchema(hardwareSets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHardwareSet = z.infer<typeof insertHardwareSetSchema>;
export type HardwareSet = typeof hardwareSets.$inferSelect;

// Audit Logs - Compliance and security tracking for all API requests
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(), // Not FK to allow orphaned logs
  userId: varchar("user_id").notNull(), // Not FK to preserve log integrity
  
  // Request details
  method: varchar("method", { length: 8 }).notNull(), // GET, POST, PATCH, DELETE
  path: varchar("path", { length: 512 }).notNull(), // Request path
  status: integer("status").notNull(), // HTTP status code
  
  // Client details
  ip: varchar("ip", { length: 64 }), // Client IP address
  userAgent: text("user_agent"), // User agent string
  
  // Timing and metadata
  responseTimeMs: integer("response_time_ms"), // Response time in milliseconds
  extra: jsonb("extra"), // Additional context (error details, important changes, etc.)
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================================================
// QUOTE EXPORT & VERSIONING SYSTEM
// ============================================================================

// Export Branding - Custom branding for tenant exports
export const exportBranding = pgTable("export_branding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  accentColor: text("accent_color"),
  
  headerText: text("header_text"),
  footerText: text("footer_text"),
  watermarkText: text("watermark_text"),
  
  isDefaultForTenant: boolean("is_default_for_tenant").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_export_branding_organization_id").on(table.organizationId),
]);

export const insertExportBrandingSchema = createInsertSchema(exportBranding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExportBranding = z.infer<typeof insertExportBrandingSchema>;
export type ExportBranding = typeof exportBranding.$inferSelect;

// Export Profiles - Configurable export templates
export const exportProfiles = pgTable("export_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  name: text("name").notNull(),
  description: text("description"),
  
  scope: text("scope").notNull().default("both"), // internal, client, both
  
  // Line item visibility controls
  showLineItems: boolean("show_line_items").notNull().default(true),
  showLineItemPrices: boolean("show_line_item_prices").notNull().default(true),
  showLineItemQuantities: boolean("show_line_item_quantities").notNull().default(true),
  showLineItemTotals: boolean("show_line_item_totals").notNull().default(true),
  
  showSummaryTotals: boolean("show_summary_totals").notNull().default(true),
  groupItemsBy: text("group_items_by").notNull().default("none"), // none, door, location, type
  
  // Breakdown toggles
  showMaterialBreakdown: boolean("show_material_breakdown").notNull().default(true),
  showLaborBreakdown: boolean("show_labor_breakdown").notNull().default(true),
  
  // Tax configuration
  taxMode: text("tax_mode").notNull().default("include_tax"), // include_tax, exclude_tax, show_separately
  showTaxRate: boolean("show_tax_rate").notNull().default(true),
  
  // Internal/cost information
  showInternalNotes: boolean("show_internal_notes").notNull().default(false),
  showCostBreakdown: boolean("show_cost_breakdown").notNull().default(true),
  showMarginOrMarkup: boolean("show_margin_or_markup").notNull().default(false),
  
  defaultAlternativeLabel: text("default_alternative_label"),
  isDefaultForTenant: boolean("is_default_for_tenant").notNull().default(false),
  
  // Template and language
  templateType: text("template_type"), // proposal, installer_packet, submittal, summary_quote, cut_sheet, change_order
  language: text("language").notNull().default("en"), // en, es, fr-CA
  exportBrandingId: varchar("export_branding_id"),
  
  // Visual content inclusion
  includeImages: boolean("include_images").notNull().default(false),
  includeDoorIcons: boolean("include_door_icons").notNull().default(false),
  includeScanSnapshots: boolean("include_scan_snapshots").notNull().default(false),
  
  // Additional sections
  includeComplianceSummary: boolean("include_compliance_summary").notNull().default(false),
  includeInstallTimeline: boolean("include_install_timeline").notNull().default(false),
  includeCutSheetSection: boolean("include_cut_sheet_section").notNull().default(false),
  includeCostCharts: boolean("include_cost_charts").notNull().default(false),
  
  // Special modes
  goodBetterBestMode: boolean("good_better_best_mode").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_export_profiles_organization_id").on(table.organizationId),
]);

export const insertExportProfileSchema = createInsertSchema(exportProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExportProfile = z.infer<typeof insertExportProfileSchema>;
export type ExportProfile = typeof exportProfiles.$inferSelect;

// Project Alternatives - Multiple quote options for export (Good/Better/Best)
// Note: Different from projectVersions which stores historical snapshots
export const projectAlternatives = pgTable("project_alternatives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // e.g., "Standard Package", "Premium Package", "Value Option"
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_project_alternatives_project_id").on(table.projectId),
]);

export const insertProjectAlternativeSchema = createInsertSchema(projectAlternatives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectAlternative = z.infer<typeof insertProjectAlternativeSchema>;
export type ProjectAlternative = typeof projectAlternatives.$inferSelect;

// Export History - Audit trail for all exports
export const exportHistory = pgTable("export_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  projectAlternativeId: varchar("project_alternative_id").references(() => projectAlternatives.id, { onDelete: "set null" }),
  exportProfileId: varchar("export_profile_id").references(() => exportProfiles.id, { onDelete: "set null" }),
  
  format: text("format").notNull(), // pdf, html
  templateType: text("template_type"), // proposal, installer_packet, submittal, etc.
  language: text("language"), // en, es, fr-CA
  
  deliveredVia: text("delivered_via"), // download, email
  targetEmail: text("target_email"),
  
  entityVersionId: varchar("entity_version_id").references(() => entityVersions.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_export_history_organization_id").on(table.organizationId),
  index("IDX_export_history_project_id").on(table.projectId),
  index("IDX_export_history_user_id").on(table.userId),
  index("IDX_export_history_created_at").on(table.createdAt),
  index("IDX_export_history_entity_version_id").on(table.entityVersionId),
]);

export const insertExportHistorySchema = createInsertSchema(exportHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertExportHistory = z.infer<typeof insertExportHistorySchema>;
export type ExportHistory = typeof exportHistory.$inferSelect;

// ============================================================================
// VERSIONING SYSTEM - Tracking revisions across quotes, diagrams, and review content
// ============================================================================

// Entity type enum for versioning
export const VERSIONABLE_ENTITY_TYPES = {
  QUOTE: "quote",
  DIAGRAM: "diagram",
  FLOOR_PLAN: "floor_plan",
  NOTE: "note",
  SPEC: "spec",
  OPENING: "opening",
} as const;

export type VersionableEntityType = typeof VERSIONABLE_ENTITY_TYPES[keyof typeof VERSIONABLE_ENTITY_TYPES];

// Change type enum for revision marks
export const REVISION_CHANGE_TYPES = {
  ADDED: "added",
  MODIFIED: "modified",
  REMOVED: "removed",
} as const;

export type RevisionChangeType = typeof REVISION_CHANGE_TYPES[keyof typeof REVISION_CHANGE_TYPES];

// Versioned Entities - Unified tracker for versionable entities
export const versionedEntities = pgTable("versioned_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // quote, diagram, floor_plan, note, spec, opening
  entityId: varchar("entity_id").notNull(), // The ID of the actual entity being versioned
  currentVersionId: varchar("current_version_id"), // References entityVersions.id (nullable, forward reference)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_versioned_entities_entity_type_entity_id").on(table.entityType, table.entityId),
  index("IDX_versioned_entities_organization_id").on(table.organizationId),
  index("IDX_versioned_entities_project_id").on(table.projectId),
]);

export const insertVersionedEntitySchema = createInsertSchema(versionedEntities).omit({
  id: true,
  createdAt: true,
}).extend({
  entityType: z.enum(["quote", "diagram", "floor_plan", "note", "spec", "opening"]),
});

export type InsertVersionedEntity = z.infer<typeof insertVersionedEntitySchema>;
export type VersionedEntity = typeof versionedEntities.$inferSelect;

// Entity Versions - Stores individual version snapshots
export const entityVersions = pgTable("entity_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  versionedEntityId: varchar("versioned_entity_id").notNull().references(() => versionedEntities.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(), // Sequential: 1, 2, 3...
  parentVersionId: varchar("parent_version_id"), // Nullable, self-reference for branching
  versionName: text("version_name"), // Optional human-readable name like "After Client Review"
  changeSummary: text("change_summary"), // Brief description of what changed
  snapshot: jsonb("snapshot").notNull(), // Full JSON snapshot of entity state at this version
  diffMeta: jsonb("diff_meta"), // Precomputed diff metadata for fast UI rendering
  thumbnailUrl: text("thumbnail_url"), // Optional preview thumbnail for diagrams
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_entity_versions_versioned_entity_version").on(table.versionedEntityId, table.versionNumber),
  index("IDX_entity_versions_parent_version_id").on(table.parentVersionId),
  index("IDX_entity_versions_created_by").on(table.createdBy),
]);

export const insertEntityVersionSchema = createInsertSchema(entityVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertEntityVersion = z.infer<typeof insertEntityVersionSchema>;
export type EntityVersion = typeof entityVersions.$inferSelect;

// Revision Marks - Precomputed diff markers for visual highlighting
export const revisionMarks = pgTable("revision_marks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityVersionId: varchar("entity_version_id").notNull().references(() => entityVersions.id, { onDelete: "cascade" }),
  path: text("path").notNull(), // JSON path or field identifier, e.g., "lineItems[0].quantity" or "components.door-123"
  changeType: text("change_type").notNull(), // added, modified, removed
  previousValue: jsonb("previous_value"), // Value before change
  newValue: jsonb("new_value"), // Value after change
  displayHint: text("display_hint"), // Color hint: 'green', 'amber', 'red', or severity level
  category: text("category"), // Grouping like 'pricing', 'hardware', 'dimensions', 'position'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_revision_marks_entity_version_id").on(table.entityVersionId),
  index("IDX_revision_marks_change_type").on(table.changeType),
  index("IDX_revision_marks_category").on(table.category),
]);

export const insertRevisionMarkSchema = createInsertSchema(revisionMarks).omit({
  id: true,
  createdAt: true,
}).extend({
  changeType: z.enum(["added", "modified", "removed"]),
});

export type InsertRevisionMark = z.infer<typeof insertRevisionMarkSchema>;
export type RevisionMark = typeof revisionMarks.$inferSelect;

// ============================================================================
// PROJECT MANAGEMENT - PM, Sales, Procurement System
// ============================================================================

// Division Codes for construction - 08 (Openings) and 28 (Electronic Safety & Security)
export const DIVISION_CODES = {
  DIV08: "08",  // Division 8 - Openings
  DIV28: "28",  // Division 28 - Electronic Safety & Security
} as const;

export type DivisionCode = typeof DIVISION_CODES[keyof typeof DIVISION_CODES];

// Project Status for PM workflow
export const PROJECT_PM_STATUS = {
  PENDING_HANDOFF: "pending_handoff",
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  IN_REVIEW: "in_review",
  CLOSED: "closed",
} as const;

export type ProjectPMStatus = typeof PROJECT_PM_STATUS[keyof typeof PROJECT_PM_STATUS];

// Procurement Status workflow
export const PROCUREMENT_STATUS = {
  NOT_STARTED: "not_started",
  PENDING_INFO: "pending_info",
  READY_FOR_PO: "ready_for_po",
  PO_SENT: "po_sent",
  ACKNOWLEDGED: "acknowledged",
  PARTIAL_SHIPMENT: "partial_shipment",
  COMPLETE: "complete",
  ON_HOLD: "on_hold",
} as const;

export type ProcurementStatus = typeof PROCUREMENT_STATUS[keyof typeof PROCUREMENT_STATUS];

// Project Assignments - Track PM, Sales, Procurement officer assignments per project
export const projectAssignments = pgTable("project_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Role assignments
  projectManagerId: varchar("project_manager_id").references(() => users.id, { onDelete: "set null" }),
  pmManagerId: varchar("pm_manager_id").references(() => users.id, { onDelete: "set null" }),
  salesRepId: varchar("sales_rep_id").references(() => users.id, { onDelete: "set null" }),
  procurementOfficerId: varchar("procurement_officer_id").references(() => users.id, { onDelete: "set null" }),
  engineerReviewerId: varchar("engineer_reviewer_id").references(() => users.id, { onDelete: "set null" }),
  
  // PM workflow status
  pmStatus: varchar("pm_status", { length: 32 }).notNull().default("pending_handoff"),
  divisions: jsonb("divisions").$type<string[]>().notNull().default(["08"]),
  
  // Job tracking
  jobNumber: varchar("job_number", { length: 64 }),
  estimatedStartDate: timestamp("estimated_start_date"),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  
  // Notes
  handoffNotes: text("handoff_notes"),
  internalNotes: text("internal_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_project_assignments_organization_id").on(table.organizationId),
  index("IDX_project_assignments_project_id").on(table.projectId),
  index("IDX_project_assignments_pm_id").on(table.projectManagerId),
  index("IDX_project_assignments_sales_rep_id").on(table.salesRepId),
  index("IDX_project_assignments_pm_manager_id").on(table.pmManagerId),
]);

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  pmStatus: z.enum(["pending_handoff", "active", "on_hold", "in_review", "closed"]).default("pending_handoff"),
  divisions: z.array(z.enum(["08", "28"])).default(["08"]),
});

export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;
export type ProjectAssignment = typeof projectAssignments.$inferSelect;

// Procurement Items - Track items for procurement with manufacturer and PO info
export const procurementItems = pgTable("procurement_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  scopePackageId: varchar("scope_package_id"),
  
  // Division and manufacturer
  division: varchar("division", { length: 4 }).notNull().default("08"),
  manufacturer: text("manufacturer").notNull(),
  manufacturerId: varchar("manufacturer_id", { length: 32 }), // ALLEGION, ASSA_ABLOY, etc.
  
  // Item details
  partNumber: varchar("part_number", { length: 128 }).notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: real("unit_price"),
  totalPrice: real("total_price"),
  
  // Related openings
  openingIds: jsonb("opening_ids").$type<string[]>().default([]),
  
  // Schedule
  requiredOnSiteDate: timestamp("required_on_site_date"),
  expectedShipDate: timestamp("expected_ship_date"),
  actualShipDate: timestamp("actual_ship_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  
  // Supplier and PO
  supplierName: text("supplier_name"),
  supplierContactEmail: text("supplier_contact_email"),
  poNumber: varchar("po_number", { length: 64 }),
  poDate: timestamp("po_date"),
  acknowledgmentNumber: varchar("acknowledgment_number", { length: 64 }),
  trackingNumber: varchar("tracking_number", { length: 128 }),
  
  // Status and flags
  status: varchar("status", { length: 32 }).notNull().default("not_started"),
  redFlag: boolean("red_flag").notNull().default(false),
  redFlagReason: text("red_flag_reason"),
  
  // Audit
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_procurement_items_organization_id").on(table.organizationId),
  index("IDX_procurement_items_project_id").on(table.projectId),
  index("IDX_procurement_items_manufacturer").on(table.manufacturer),
  index("IDX_procurement_items_status").on(table.status),
  index("IDX_procurement_items_red_flag").on(table.redFlag),
]);

export const insertProcurementItemSchema = createInsertSchema(procurementItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  division: z.enum(["08", "28"]).default("08"),
  status: z.enum(["not_started", "pending_info", "ready_for_po", "po_sent", "acknowledged", "partial_shipment", "complete", "on_hold"]).default("not_started"),
});

export type InsertProcurementItem = z.infer<typeof insertProcurementItemSchema>;
export type ProcurementItem = typeof procurementItems.$inferSelect;

// Project Issue Types
export const ISSUE_TYPES = {
  MISSING_INFO: "missing_info",
  CONFLICTING_INFO: "conflicting_info",
  SCHEDULE_RISK: "schedule_risk",
  SCOPE_GAP: "scope_gap",
  CODE_COMPLIANCE: "code_compliance",
  COORDINATION: "coordination",
  RFI: "rfi",
} as const;

export type IssueType = typeof ISSUE_TYPES[keyof typeof ISSUE_TYPES];

export const ISSUE_STATUS = {
  OPEN: "open",
  IN_REVIEW: "in_review",
  PENDING_RESPONSE: "pending_response",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type IssueStatus = typeof ISSUE_STATUS[keyof typeof ISSUE_STATUS];

export const ISSUE_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type IssueSeverity = typeof ISSUE_SEVERITY[keyof typeof ISSUE_SEVERITY];

// Project Issues - Track issues, RFIs, and coordination items
export const projectIssues = pgTable("project_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  scopePackageId: varchar("scope_package_id"),
  
  // Related entities
  relatedOpeningId: varchar("related_opening_id").references(() => doorOpenings.id, { onDelete: "set null" }),
  relatedDocumentId: varchar("related_document_id"),
  relatedProcurementItemId: varchar("related_procurement_item_id"),
  
  // Issue details
  type: varchar("type", { length: 32 }).notNull(),
  division: varchar("division", { length: 8 }).notNull().default("08"), // 08, 28, or MIXED
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 16 }).notNull().default("medium"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  
  // Resolution
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: "set null" }),
  
  // Assignment and tracking
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_project_issues_organization_id").on(table.organizationId),
  index("IDX_project_issues_project_id").on(table.projectId),
  index("IDX_project_issues_status").on(table.status),
  index("IDX_project_issues_severity").on(table.severity),
  index("IDX_project_issues_assigned_to").on(table.assignedToUserId),
]);

export const insertProjectIssueSchema = createInsertSchema(projectIssues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(["missing_info", "conflicting_info", "schedule_risk", "scope_gap", "code_compliance", "coordination", "rfi"]),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["open", "in_review", "pending_response", "resolved", "closed"]).default("open"),
});

export type InsertProjectIssue = z.infer<typeof insertProjectIssueSchema>;
export type ProjectIssue = typeof projectIssues.$inferSelect;

// Milestone Status
export const MILESTONE_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  OVERDUE: "overdue",
  BLOCKED: "blocked",
} as const;

export type MilestoneStatus = typeof MILESTONE_STATUS[keyof typeof MILESTONE_STATUS];

// Project Milestones - Track project milestones for sales updates
export const projectMilestones = pgTable("project_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Milestone info
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 32 }), // engineering, procurement, installation, closeout
  sequenceOrder: integer("sequence_order").notNull().default(0),
  
  // Dates
  targetDate: timestamp("target_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  
  // Status and tracking
  status: varchar("status", { length: 32 }).notNull().default("not_started"),
  percentComplete: integer("percent_complete").notNull().default(0),
  
  // Notifications
  notifySalesOnComplete: boolean("notify_sales_on_complete").notNull().default(true),
  lastNotifiedAt: timestamp("last_notified_at"),
  
  // Notes
  notes: text("notes"),
  completedBy: varchar("completed_by").references(() => users.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_project_milestones_organization_id").on(table.organizationId),
  index("IDX_project_milestones_project_id").on(table.projectId),
  index("IDX_project_milestones_status").on(table.status),
  index("IDX_project_milestones_target_date").on(table.targetDate),
]);

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["not_started", "in_progress", "completed", "overdue", "blocked"]).default("not_started"),
});

export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;

// Manufacturer Order Form Instances - Generated order forms for procurement
export const manufacturerOrderForms = pgTable("manufacturer_order_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Template reference
  templateId: varchar("template_id", { length: 64 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 32 }).notNull(), // ALLEGION, ASSA_ABLOY, etc.
  division: varchar("division", { length: 4 }).notNull().default("08"),
  
  // Associated items
  procurementItemIds: jsonb("procurement_item_ids").$type<string[]>().notNull().default([]),
  
  // Form data
  fields: jsonb("fields").$type<{
    fieldId: string;
    value: any;
    status: "ok" | "missing" | "invalid" | "needs_review";
    messages: string[];
  }[]>().notNull().default([]),
  
  // Generated PDF
  pdfUrl: text("pdf_url"),
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  
  // Submission tracking
  submittedAt: timestamp("submitted_at"),
  submittedTo: text("submitted_to"),
  submissionMode: varchar("submission_mode", { length: 16 }), // internal, manufacturer
  
  // Audit
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_manufacturer_order_forms_organization_id").on(table.organizationId),
  index("IDX_manufacturer_order_forms_project_id").on(table.projectId),
  index("IDX_manufacturer_order_forms_manufacturer").on(table.manufacturer),
]);

export const insertManufacturerOrderFormSchema = createInsertSchema(manufacturerOrderForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManufacturerOrderForm = z.infer<typeof insertManufacturerOrderFormSchema>;
export type ManufacturerOrderForm = typeof manufacturerOrderForms.$inferSelect;

// PM Analytics Summary - Cached analytics for PM Manager dashboard
export const pmAnalyticsSummary = pgTable("pm_analytics_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectManagerId: varchar("project_manager_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Counts
  activeProjects: integer("active_projects").notNull().default(0),
  completedProjects: integer("completed_projects").notNull().default(0),
  onHoldProjects: integer("on_hold_projects").notNull().default(0),
  overdueProjects: integer("overdue_projects").notNull().default(0),
  
  // Procurement stats
  totalProcurementItems: integer("total_procurement_items").notNull().default(0),
  procurementItemsComplete: integer("procurement_items_complete").notNull().default(0),
  procurementRedFlags: integer("procurement_red_flags").notNull().default(0),
  
  // Issue stats
  openIssues: integer("open_issues").notNull().default(0),
  criticalIssues: integer("critical_issues").notNull().default(0),
  
  // Milestone stats
  upcomingMilestones: integer("upcoming_milestones").notNull().default(0),
  overdueMilestones: integer("overdue_milestones").notNull().default(0),
  
  // Timing
  avgProjectDurationDays: real("avg_project_duration_days"),
  
  // Cache control
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_pm_analytics_summary_organization_id").on(table.organizationId),
  index("IDX_pm_analytics_summary_pm_id").on(table.projectManagerId),
]);

export const insertPMAnalyticsSummarySchema = createInsertSchema(pmAnalyticsSummary).omit({
  id: true,
  calculatedAt: true,
});

export type InsertPMAnalyticsSummary = z.infer<typeof insertPMAnalyticsSummarySchema>;
export type PMAnalyticsSummary = typeof pmAnalyticsSummary.$inferSelect;

// ============================================================================
// HR ONBOARDING SYSTEM
// ============================================================================

// HR Integration Providers - Supported HR software systems
export const HR_INTEGRATION_PROVIDERS = [
  "bamboohr",
  "workday",
  "adp",
  "gusto",
  "paylocity",
  "rippling",
  "namely",
  "zenefits",
  "paycom",
  "ultipro",
  "custom_api",
] as const;

export type HRIntegrationProvider = typeof HR_INTEGRATION_PROVIDERS[number];

// HR Onboarding Plan Templates
export const hrOnboardingPlans = pgTable("hr_onboarding_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Plan details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false), // Default plan for new employees
  isActive: boolean("is_active").notNull().default(true),
  
  // Target roles - which roles this plan applies to
  targetRoles: text("target_roles").array().notNull().default([]), // Empty = all roles
  
  // Duration settings
  estimatedDurationDays: integer("estimated_duration_days").notNull().default(30),
  
  // Template metadata
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_hr_onboarding_plans_organization_id").on(table.organizationId),
]);

export const insertHROnboardingPlanSchema = createInsertSchema(hrOnboardingPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHROnboardingPlan = z.infer<typeof insertHROnboardingPlanSchema>;
export type HROnboardingPlan = typeof hrOnboardingPlans.$inferSelect;

// HR Onboarding Steps - Individual tasks within a plan
export const hrOnboardingSteps = pgTable("hr_onboarding_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => hrOnboardingPlans.id, { onDelete: "cascade" }),
  
  // Step details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  instructions: text("instructions"), // Detailed instructions for completing this step
  
  // Step configuration
  stepOrder: integer("step_order").notNull().default(0),
  category: varchar("category", { length: 64 }).notNull().default("general"), // general, software, training, compliance, equipment, hr_paperwork
  isRequired: boolean("is_required").notNull().default(true),
  
  // Timing
  dueDaysAfterStart: integer("due_days_after_start"), // Days after onboarding starts
  estimatedMinutes: integer("estimated_minutes"), // Estimated time to complete
  
  // Dependencies
  dependsOnStepId: varchar("depends_on_step_id").references((): any => hrOnboardingSteps.id, { onDelete: "set null" }),
  
  // Assignee configuration
  assignToRole: varchar("assign_to_role", { length: 64 }), // Role that should complete this step
  assignToUserId: varchar("assign_to_user_id").references(() => users.id, { onDelete: "set null" }), // Specific user
  isSelfAssigned: boolean("is_self_assigned").notNull().default(false), // Employee completes themselves
  
  // Resources
  resourceUrls: jsonb("resource_urls").$type<{ title: string; url: string; }[]>().default([]),
  attachmentIds: text("attachment_ids").array().default([]), // File attachment IDs
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_hr_onboarding_steps_plan_id").on(table.planId),
  index("IDX_hr_onboarding_steps_order").on(table.planId, table.stepOrder),
]);

export const insertHROnboardingStepSchema = createInsertSchema(hrOnboardingSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  category: z.enum(["general", "software", "training", "compliance", "equipment", "hr_paperwork"]).default("general"),
});

export type InsertHROnboardingStep = z.infer<typeof insertHROnboardingStepSchema>;
export type HROnboardingStep = typeof hrOnboardingSteps.$inferSelect;

// HR Employee Onboarding - Track individual employee onboarding progress
export const hrEmployeeOnboarding = pgTable("hr_employee_onboarding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeUserId: varchar("employee_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => hrOnboardingPlans.id, { onDelete: "restrict" }),
  
  // Status
  status: varchar("status", { length: 32 }).notNull().default("not_started"), // not_started, in_progress, completed, paused
  
  // Timing
  startDate: timestamp("start_date").notNull(),
  targetCompletionDate: timestamp("target_completion_date"),
  completedAt: timestamp("completed_at"),
  
  // Progress tracking
  totalSteps: integer("total_steps").notNull().default(0),
  completedSteps: integer("completed_steps").notNull().default(0),
  
  // HR Integration - external employee ID from HR software
  externalEmployeeId: varchar("external_employee_id", { length: 128 }),
  externalSource: varchar("external_source", { length: 64 }), // bamboohr, workday, etc.
  
  // Buddy/Mentor assignment
  buddyUserId: varchar("buddy_user_id").references(() => users.id, { onDelete: "set null" }),
  managerUserId: varchar("manager_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Notes
  notes: text("notes"),
  
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_hr_employee_onboarding_organization_id").on(table.organizationId),
  index("IDX_hr_employee_onboarding_employee_id").on(table.employeeUserId),
  index("IDX_hr_employee_onboarding_status").on(table.status),
  uniqueIndex("UQ_hr_employee_onboarding_employee_plan").on(table.employeeUserId, table.planId),
]);

export const insertHREmployeeOnboardingSchema = createInsertSchema(hrEmployeeOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["not_started", "in_progress", "completed", "paused"]).default("not_started"),
});

export type InsertHREmployeeOnboarding = z.infer<typeof insertHREmployeeOnboardingSchema>;
export type HREmployeeOnboarding = typeof hrEmployeeOnboarding.$inferSelect;

// HR Onboarding Step Progress - Track completion of individual steps
export const hrOnboardingStepProgress = pgTable("hr_onboarding_step_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeOnboardingId: varchar("employee_onboarding_id").notNull().references(() => hrEmployeeOnboarding.id, { onDelete: "cascade" }),
  stepId: varchar("step_id").notNull().references(() => hrOnboardingSteps.id, { onDelete: "cascade" }),
  
  // Status
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, in_progress, completed, skipped, blocked
  
  // Assignment
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Timing
  dueDate: timestamp("due_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Completion details
  completedByUserId: varchar("completed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  completionNotes: text("completion_notes"),
  
  // Verification (for compliance steps)
  requiresVerification: boolean("requires_verification").notNull().default(false),
  verifiedByUserId: varchar("verified_by_user_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_hr_onboarding_step_progress_onboarding_id").on(table.employeeOnboardingId),
  index("IDX_hr_onboarding_step_progress_status").on(table.status),
  uniqueIndex("UQ_hr_onboarding_step_progress_step").on(table.employeeOnboardingId, table.stepId),
]);

export const insertHROnboardingStepProgressSchema = createInsertSchema(hrOnboardingStepProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["pending", "in_progress", "completed", "skipped", "blocked"]).default("pending"),
});

export type InsertHROnboardingStepProgress = z.infer<typeof insertHROnboardingStepProgressSchema>;
export type HROnboardingStepProgress = typeof hrOnboardingStepProgress.$inferSelect;

// HR Integration Credentials - Store API credentials for HR software connections
export const hrIntegrationCredentials = pgTable("hr_integration_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Provider info
  provider: varchar("provider", { length: 64 }).notNull(), // bamboohr, workday, adp, gusto, etc.
  displayName: varchar("display_name", { length: 255 }), // Custom name for this connection
  
  // API credentials (encrypted at application layer)
  apiKey: text("api_key"), // For API key-based auth (BambooHR, etc.)
  apiSecret: text("api_secret"), // For secret key auth
  accessToken: text("access_token"), // For OAuth
  refreshToken: text("refresh_token"), // For OAuth refresh
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Provider-specific configuration
  subdomain: varchar("subdomain", { length: 128 }), // e.g., "company" for company.bamboohr.com
  companyId: varchar("company_id", { length: 128 }), // Company ID in HR system
  baseUrl: text("base_url"), // Custom API URL for on-prem or custom instances
  
  // Sync settings
  syncEnabled: boolean("sync_enabled").notNull().default(true),
  syncFrequency: varchar("sync_frequency", { length: 32 }).notNull().default("daily"), // realtime, hourly, daily, weekly, manual
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status", { length: 32 }), // success, failed, partial
  lastSyncError: text("last_sync_error"),
  
  // Field mapping configuration
  fieldMappings: jsonb("field_mappings").$type<{
    hrField: string;
    localField: string;
    transform?: string;
  }[]>().default([]),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  connectionStatus: varchar("connection_status", { length: 32 }).notNull().default("pending"), // pending, connected, error, disconnected
  
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_hr_integration_credentials_organization_id").on(table.organizationId),
  index("IDX_hr_integration_credentials_provider").on(table.provider),
  uniqueIndex("UQ_hr_integration_credentials_org_provider").on(table.organizationId, table.provider),
]);

export const insertHRIntegrationCredentialSchema = createInsertSchema(hrIntegrationCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  provider: z.enum(HR_INTEGRATION_PROVIDERS),
  syncFrequency: z.enum(["realtime", "hourly", "daily", "weekly", "manual"]).default("daily"),
  connectionStatus: z.enum(["pending", "connected", "error", "disconnected"]).default("pending"),
});

export type InsertHRIntegrationCredential = z.infer<typeof insertHRIntegrationCredentialSchema>;
export type HRIntegrationCredential = typeof hrIntegrationCredentials.$inferSelect;

// HR Employee Import Jobs - Track bulk imports from HR systems
export const hrEmployeeImportJobs = pgTable("hr_employee_import_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  integrationId: varchar("integration_id").references(() => hrIntegrationCredentials.id, { onDelete: "set null" }),
  
  // Job details
  source: varchar("source", { length: 64 }).notNull(), // csv_upload, api_sync, manual
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, processing, completed, failed, cancelled
  
  // Progress
  totalRecords: integer("total_records").notNull().default(0),
  processedRecords: integer("processed_records").notNull().default(0),
  successfulImports: integer("successful_imports").notNull().default(0),
  failedImports: integer("failed_imports").notNull().default(0),
  skippedDuplicates: integer("skipped_duplicates").notNull().default(0),
  
  // Error tracking
  errors: jsonb("errors").$type<{
    row?: number;
    field?: string;
    value?: string;
    message: string;
  }[]>().default([]),
  
  // File reference (for CSV uploads)
  sourceFileName: varchar("source_file_name", { length: 255 }),
  sourceFileUrl: text("source_file_url"),
  
  // Default onboarding assignment
  defaultPlanId: varchar("default_plan_id").references(() => hrOnboardingPlans.id, { onDelete: "set null" }),
  defaultStartDate: timestamp("default_start_date"),
  
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_hr_employee_import_jobs_organization_id").on(table.organizationId),
  index("IDX_hr_employee_import_jobs_status").on(table.status),
]);

export const insertHREmployeeImportJobSchema = createInsertSchema(hrEmployeeImportJobs).omit({
  id: true,
  createdAt: true,
}).extend({
  source: z.enum(["csv_upload", "api_sync", "manual"]),
  status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]).default("pending"),
});

export type InsertHREmployeeImportJob = z.infer<typeof insertHREmployeeImportJobSchema>;
export type HREmployeeImportJob = typeof hrEmployeeImportJobs.$inferSelect;

// HR Sync Log - Detailed log of HR system synchronization events
export const hrSyncLogs = pgTable("hr_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  integrationId: varchar("integration_id").notNull().references(() => hrIntegrationCredentials.id, { onDelete: "cascade" }),
  
  // Event details
  eventType: varchar("event_type", { length: 64 }).notNull(), // employee_sync, full_sync, webhook, manual_trigger
  direction: varchar("direction", { length: 16 }).notNull().default("pull"), // pull, push
  
  // Results
  status: varchar("status", { length: 32 }).notNull(), // success, partial, failed
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsCreated: integer("records_created").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsDeleted: integer("records_deleted").notNull().default(0),
  recordsFailed: integer("records_failed").notNull().default(0),
  
  // Error info
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  
  // Request/Response data (sanitized, no PII)
  requestSummary: jsonb("request_summary"),
  responseSummary: jsonb("response_summary"),
  
  // Duration
  durationMs: integer("duration_ms"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_hr_sync_logs_organization_id").on(table.organizationId),
  index("IDX_hr_sync_logs_integration_id").on(table.integrationId),
  index("IDX_hr_sync_logs_created_at").on(table.createdAt),
]);

export const insertHRSyncLogSchema = createInsertSchema(hrSyncLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertHRSyncLog = z.infer<typeof insertHRSyncLogSchema>;
export type HRSyncLog = typeof hrSyncLogs.$inferSelect;

// ============================================================================
// CORPORATE JOB TITLES & ROLE MAPPINGS
// ============================================================================

// Department categories for Division 8 & 28 companies
export const DEPARTMENT_CATEGORIES = [
  "executive",
  "operations",
  "sales",
  "engineering",
  "field_services",
  "purchasing",
  "administrative",
  "finance",
  "human_resources",
  "it",
  "quality_assurance",
] as const;

export type DepartmentCategory = typeof DEPARTMENT_CATEGORIES[number];

// Industry specializations
export const INDUSTRY_SPECIALIZATIONS = [
  "div_8_openings",          // Division 8 - Doors, frames, hardware
  "div_28_electronic",       // Division 28 - Electronic safety & security
  "div_8_28_combined",       // Both divisions
  "general",                 // General commercial construction
] as const;

export type IndustrySpecialization = typeof INDUSTRY_SPECIALIZATIONS[number];

// Corporate Job Title Templates - Predefined industry-standard titles
export const corporateJobTitles = pgTable("corporate_job_titles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // null = system template
  
  // Job title details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  departmentCategory: varchar("department_category", { length: 64 }).notNull(),
  industrySpecialization: varchar("industry_specialization", { length: 64 }).notNull().default("general"),
  
  // Role mappings - which application roles this job title grants
  assignedRoles: text("assigned_roles").array().notNull().default([]),
  primaryRole: varchar("primary_role", { length: 64 }).notNull(), // The main/default role
  
  // Permission overrides (optional custom permissions beyond role defaults)
  additionalPermissions: text("additional_permissions").array().notNull().default([]),
  restrictedPermissions: text("restricted_permissions").array().notNull().default([]),
  
  // Job title hierarchy
  hierarchyLevel: integer("hierarchy_level").notNull().default(50), // 100 = highest (C-suite), 10 = lowest (entry)
  reportsToTitleId: varchar("reports_to_title_id").references((): any => corporateJobTitles.id, { onDelete: "set null" }),
  
  // Display settings
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isSystemTemplate: boolean("is_system_template").notNull().default(false), // True = predefined template
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_corporate_job_titles_organization_id").on(table.organizationId),
  index("IDX_corporate_job_titles_department").on(table.departmentCategory),
  index("IDX_corporate_job_titles_industry").on(table.industrySpecialization),
  index("IDX_corporate_job_titles_hierarchy").on(table.hierarchyLevel),
]);

export const insertCorporateJobTitleSchema = createInsertSchema(corporateJobTitles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  departmentCategory: z.enum(DEPARTMENT_CATEGORIES),
  industrySpecialization: z.enum(INDUSTRY_SPECIALIZATIONS).default("general"),
  hierarchyLevel: z.number().min(10).max(100).default(50),
});

export type InsertCorporateJobTitle = z.infer<typeof insertCorporateJobTitleSchema>;
export type CorporateJobTitle = typeof corporateJobTitles.$inferSelect;

// User Job Title Assignment - Maps users to corporate job titles
export const userJobTitleAssignments = pgTable("user_job_title_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobTitleId: varchar("job_title_id").notNull().references(() => corporateJobTitles.id, { onDelete: "cascade" }),
  
  // Assignment details
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  endDate: timestamp("end_date"), // null = current assignment
  
  // Custom overrides for this specific assignment
  customTitle: varchar("custom_title", { length: 255 }), // Override display title if different
  customPermissions: text("custom_permissions").array().notNull().default([]),
  
  // Manager/reporting relationship
  reportsToUserId: varchar("reports_to_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(true), // Primary job title for user
  
  // Assignment metadata
  assignedBy: varchar("assigned_by").references(() => users.id, { onDelete: "set null" }),
  assignmentReason: text("assignment_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_user_job_assignments_organization_id").on(table.organizationId),
  index("IDX_user_job_assignments_user_id").on(table.userId),
  index("IDX_user_job_assignments_job_title_id").on(table.jobTitleId),
  index("IDX_user_job_assignments_reports_to").on(table.reportsToUserId),
]);

export const insertUserJobTitleAssignmentSchema = createInsertSchema(userJobTitleAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserJobTitleAssignment = z.infer<typeof insertUserJobTitleAssignmentSchema>;
export type UserJobTitleAssignment = typeof userJobTitleAssignments.$inferSelect;

// ============================================================================
// HR EMPLOYEE QUICK INVITE SYSTEM
// ============================================================================

// Invite Status - tracks the lifecycle of employee invitations
export const HR_INVITE_STATUS = {
  PENDING: "pending",           // Invite created but not sent
  INVITED: "invited",           // Email invitation sent
  LINK_CLICKED: "link_clicked", // User clicked setup link
  SETUP_STARTED: "setup_started", // User started account setup
  ACTIVE: "active",             // Account fully activated
  EXPIRED: "expired",           // Invite expired without activation
  CANCELLED: "cancelled",       // Invite manually cancelled
} as const;

export type HRInviteStatus = typeof HR_INVITE_STATUS[keyof typeof HR_INVITE_STATUS];

// Quick Employee Invites - Fast account creation with email links
export const hrEmployeeInvites = pgTable("hr_employee_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Employee details
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 128 }).notNull(),
  lastName: varchar("last_name", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  
  // Role assignment
  primaryRole: varchar("primary_role", { length: 64 }).notNull().default("technician"),
  additionalRoles: text("additional_roles").array().notNull().default([]),
  jobTitleId: varchar("job_title_id").references(() => corporateJobTitles.id, { onDelete: "set null" }),
  department: varchar("department", { length: 128 }),
  
  // Onboarding assignment
  onboardingPlanId: varchar("onboarding_plan_id").references(() => hrOnboardingPlans.id, { onDelete: "set null" }),
  
  // Status tracking
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  
  // Setup token for password creation
  setupToken: text("setup_token").unique(),
  setupTokenExpiresAt: timestamp("setup_token_expires_at"),
  setupTokenUsedAt: timestamp("setup_token_used_at"),
  
  // Email tracking
  lastEmailSentAt: timestamp("last_email_sent_at"),
  emailSendCount: integer("email_send_count").notNull().default(0),
  
  // Created user reference (after account is set up)
  createdUserId: varchar("created_user_id").references(() => users.id, { onDelete: "set null" }),
  accountCreatedAt: timestamp("account_created_at"),
  lastLoginAt: timestamp("last_login_at"),
  
  // Manager assignment for new hire
  reportsToUserId: varchar("reports_to_user_id").references(() => users.id, { onDelete: "set null" }),
  buddyUserId: varchar("buddy_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Invite metadata
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  inviteMessage: text("invite_message"),
  expiresAt: timestamp("expires_at"), // Overall invite expiration
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_hr_employee_invites_organization_id").on(table.organizationId),
  index("IDX_hr_employee_invites_email").on(table.email),
  index("IDX_hr_employee_invites_status").on(table.status),
  index("IDX_hr_employee_invites_setup_token").on(table.setupToken),
  uniqueIndex("UQ_hr_employee_invites_org_email").on(table.organizationId, table.email),
]);

export const insertHREmployeeInviteSchema = createInsertSchema(hrEmployeeInvites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required").max(128),
  lastName: z.string().min(1, "Last name is required").max(128),
  primaryRole: z.enum(["owner", "admin", "pm_manager", "manager", "project_manager", "engineer", "sales_rep", "procurement_officer", "technician", "viewer"]).default("technician"),
  additionalRoles: z.array(z.string()).default([]),
  status: z.enum(["pending", "invited", "link_clicked", "setup_started", "active", "expired", "cancelled"]).default("pending"),
});

export type InsertHREmployeeInvite = z.infer<typeof insertHREmployeeInviteSchema>;
export type HREmployeeInvite = typeof hrEmployeeInvites.$inferSelect;

// ============================================================================
// EMAIL TEMPLATES - Organization-specific email templates with role-based access
// ============================================================================

// Email Template Categories
export const EMAIL_TEMPLATE_CATEGORIES = [
  "new_customer",
  "sales_followup", 
  "scheduling",
  "proposal",
  "prospecting",
  "reminder",
  "customer_service",
  "procurement",
  "closeout",
  "surveyor",
  "estimator",
  "engineer",
  "project_management",
  "admin",
  "onboarding",
  "system"
] as const;

export type EmailTemplateCategory = typeof EMAIL_TEMPLATE_CATEGORIES[number];

// Role-to-category mapping for default visibility
export const ROLE_TEMPLATE_CATEGORIES: Record<string, EmailTemplateCategory[]> = {
  owner: EMAIL_TEMPLATE_CATEGORIES.slice(), // All categories
  admin: EMAIL_TEMPLATE_CATEGORIES.slice(), // All categories
  pm_manager: ["new_customer", "sales_followup", "scheduling", "proposal", "reminder", "closeout", "project_management"],
  manager: ["new_customer", "sales_followup", "scheduling", "proposal", "reminder", "closeout", "project_management"],
  project_manager: ["scheduling", "proposal", "reminder", "closeout", "project_management", "procurement"],
  engineer: ["proposal", "engineer", "reminder"],
  sales_rep: ["new_customer", "sales_followup", "prospecting", "proposal", "scheduling"],
  procurement_officer: ["procurement", "reminder"],
  technician: ["scheduling", "surveyor", "reminder"],
  surveyor: ["scheduling", "surveyor", "reminder"],
  estimator: ["proposal", "estimator", "reminder"],
  viewer: [], // No template access
};

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // Template identification
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull(), // URL-friendly identifier
  description: text("description"),
  
  // Category and type
  category: varchar("category", { length: 64 }).notNull(), // new_customer, sales_followup, scheduling, etc.
  subcategory: varchar("subcategory", { length: 64 }), // e.g., "quote-followup-1" within sales_followup
  
  // Email content
  subject: varchar("subject", { length: 512 }).notNull(),
  htmlContent: text("html_content").notNull(),
  markdownContent: text("markdown_content"),
  plainTextContent: text("plain_text_content"),
  
  // Template variables (for merge fields)
  variables: jsonb("variables").$type<string[]>(), // ["FirstName", "ProjectName", "Date", etc.]
  
  // Role access control
  allowedRoles: text("allowed_roles").array().notNull().default(sql`ARRAY[]::text[]`), // Roles that can use this template
  
  // Workflow integration (HubSpot-style)
  triggerType: varchar("trigger_type", { length: 64 }), // "contact_property_change", "deal_stage_change", "custom_event", etc.
  triggerDetails: jsonb("trigger_details"), // Specific trigger configuration
  lifecycleStage: varchar("lifecycle_stage", { length: 64 }), // Lead, Customer, Opportunity, etc.
  
  // Status and versioning
  isActive: boolean("is_active").notNull().default(true),
  isSystem: boolean("is_system").notNull().default(false), // System templates cannot be deleted
  version: integer("version").notNull().default(1),
  
  // Metadata
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").notNull().default(0),
  
  // Audit
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_email_templates_organization_id").on(table.organizationId),
  index("IDX_email_templates_category").on(table.category),
  index("IDX_email_templates_slug").on(table.slug),
  index("IDX_email_templates_is_active").on(table.isActive),
  uniqueIndex("UQ_email_templates_org_slug").on(table.organizationId, table.slug),
]);

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
  lastUsedAt: true,
}).extend({
  name: z.string().min(1, "Template name is required").max(256),
  slug: z.string().min(1, "Slug is required").max(128).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  category: z.enum(EMAIL_TEMPLATE_CATEGORIES),
  subject: z.string().min(1, "Subject is required").max(512),
  htmlContent: z.string().min(1, "HTML content is required"),
  allowedRoles: z.array(z.string()).default([]),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  version: z.number().int().positive().default(1),
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Email Template Usage Log - Track when templates are sent
export const emailTemplateUsageLogs = pgTable("email_template_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => emailTemplates.id, { onDelete: "cascade" }),
  
  // Who sent it
  sentBy: varchar("sent_by").references(() => users.id, { onDelete: "set null" }),
  
  // Recipient info
  recipientEmail: varchar("recipient_email", { length: 256 }).notNull(),
  recipientName: varchar("recipient_name", { length: 256 }),
  
  // Context
  relatedEntityType: varchar("related_entity_type", { length: 64 }), // project, lead, quote, etc.
  relatedEntityId: varchar("related_entity_id", { length: 128 }),
  
  // Template snapshot (in case template is updated later)
  subjectSnapshot: varchar("subject_snapshot", { length: 512 }),
  variablesUsed: jsonb("variables_used"), // The actual values used
  
  // Delivery status
  status: varchar("status", { length: 32 }).notNull().default("sent"), // sent, delivered, opened, clicked, bounced, failed
  
  // Timestamps
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
}, (table) => [
  index("IDX_email_template_usage_logs_organization_id").on(table.organizationId),
  index("IDX_email_template_usage_logs_template_id").on(table.templateId),
  index("IDX_email_template_usage_logs_sent_by").on(table.sentBy),
  index("IDX_email_template_usage_logs_sent_at").on(table.sentAt),
]);

export const insertEmailTemplateUsageLogSchema = createInsertSchema(emailTemplateUsageLogs).omit({
  id: true,
  sentAt: true,
}).extend({
  recipientEmail: z.string().email("Valid email is required"),
  status: z.enum(["sent", "delivered", "opened", "clicked", "bounced", "failed"]).default("sent"),
});

export type InsertEmailTemplateUsageLog = z.infer<typeof insertEmailTemplateUsageLogSchema>;
export type EmailTemplateUsageLog = typeof emailTemplateUsageLogs.$inferSelect;
