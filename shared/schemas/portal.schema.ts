import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, uniqueIndex, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "./auth.schema";
import { projects } from "./projects.schema";
import { customerLocations } from "../schema";

// ============================================================================
// CUSTOMER PORTAL & COLLABORATION TABLES
// ============================================================================

/**
 * Portal Shares - Secure shareable links for client access to projects/quotes
 * Enables clients to view proposals, add comments, and approve quotes
 */
export const portalShares = pgTable("portal_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Share token hash for secure validation (bcrypt)
  // The plaintext token is only shown once during creation
  shareTokenHash: varchar("share_token_hash").notNull().unique(),
  
  // SHA-256 hash for O(1) token lookups (deterministic, not for security)
  shareTokenLookup: varchar("share_token_lookup").notNull().unique(),
  
  // Client information
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientCompany: text("client_company"),
  
  // Access control
  accessLevel: varchar("access_level").notNull().default("view"), // view, comment, approve
  requiresPassword: boolean("requires_password").default(false),
  passwordHash: text("password_hash"), // Bcrypt hash if password protected
  
  // Share settings
  expiresAt: timestamp("expires_at"), // null = never expires
  maxViews: integer("max_views"), // null = unlimited views
  viewCount: integer("view_count").notNull().default(0),
  
  // Approval status
  approvalStatus: varchar("approval_status").default("pending"), // pending, approved, changes_requested, rejected
  approvalFeedback: text("approval_feedback"), // Client's feedback/comments
  approvedAt: timestamp("approved_at"),
  
  // Metadata
  isActive: boolean("is_active").notNull().default(true),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_portal_shares_token_lookup").on(table.shareTokenLookup),
  index("IDX_portal_shares_project").on(table.projectId),
  index("IDX_portal_shares_org_project").on(table.organizationId, table.projectId),
]);

export const insertPortalShareSchema = createInsertSchema(portalShares).omit({
  id: true,
  shareTokenHash: true,
  shareTokenLookup: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Allow plaintext password on create (will be hashed before storage)
  password: z.string().optional(),
});

export type InsertPortalShare = z.infer<typeof insertPortalShareSchema>;
export type PortalShare = typeof portalShares.$inferSelect;

/**
 * Project Comments - Comments and discussions on projects
 * Supports both internal team comments and external client comments
 */
export const projectComments = pgTable("project_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Comment content
  content: text("content").notNull(),
  contentHtml: text("content_html"), // Rendered HTML with mentions highlighted
  
  // Author (can be team member or client via portal)
  authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }), // null if deleted user
  authorType: varchar("author_type").notNull().default("team"), // team, client
  authorName: text("author_name"), // Display name for clients
  authorEmail: text("author_email"), // Email for clients
  
  // Portal context (if comment from client)
  portalShareId: varchar("portal_share_id").references(() => portalShares.id, { onDelete: "set null" }),
  
  // Thread support
  parentCommentId: varchar("parent_comment_id").references((): any => projectComments.id, { onDelete: "cascade" }),
  threadDepth: integer("thread_depth").notNull().default(0), // 0 = root comment
  
  // Comment metadata
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  
  // Attachments
  attachments: jsonb("attachments").default(sql`'[]'::jsonb`), // Array of {url, filename, size, type}
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_project_comments_project").on(table.projectId),
  index("IDX_project_comments_org_project").on(table.organizationId, table.projectId),
  index("IDX_project_comments_author").on(table.authorId),
  index("IDX_project_comments_parent").on(table.parentCommentId),
  index("IDX_project_comments_portal_share").on(table.portalShareId, table.createdAt), // For client comment pagination
  index("IDX_project_comments_created").on(table.createdAt),
]);

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;

/**
 * Comment Mentions - Track @mentions in comments for notifications
 * CRITICAL: organizationId added for cross-tenant protection
 */
export const commentMentions = pgTable("comment_mentions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").notNull().references(() => projectComments.id, { onDelete: "cascade" }),
  mentionedUserId: varchar("mentioned_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Notification tracking
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  notificationSent: boolean("notification_sent").default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_comment_mentions_user").on(table.mentionedUserId),
  index("IDX_comment_mentions_comment").on(table.commentId),
  index("IDX_comment_mentions_unread").on(table.mentionedUserId, table.isRead),
  index("IDX_comment_mentions_org").on(table.organizationId, table.mentionedUserId),
]);

export const insertCommentMentionSchema = createInsertSchema(commentMentions).omit({
  id: true,
  isRead: true,
  readAt: true,
  notificationSent: true,
  createdAt: true,
});

export type InsertCommentMention = z.infer<typeof insertCommentMentionSchema>;
export type CommentMention = typeof commentMentions.$inferSelect;

/**
 * Project Activities - Activity feed tracking all project changes
 * Provides audit trail and real-time updates for team and clients
 */
export const projectActivities = pgTable("project_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Activity details
  activityType: varchar("activity_type").notNull(), // project_created, comment_added, approval_submitted, quote_exported, etc.
  activitySubtype: varchar("activity_subtype"), // For categorization
  
  // Actor (who performed the action)
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorType: varchar("actor_type").notNull().default("team"), // team, client, system
  actorName: text("actor_name"), // Display name
  
  // Activity metadata
  description: text("description").notNull(), // Human-readable description
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // Additional structured data
  
  // Related entities
  relatedEntityType: varchar("related_entity_type"), // comment, quote, opening, etc.
  relatedEntityId: varchar("related_entity_id"),
  
  // Changes tracking (for edits/updates)
  changesBefore: jsonb("changes_before"),
  changesAfter: jsonb("changes_after"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_project_activities_project").on(table.projectId),
  index("IDX_project_activities_org_project").on(table.organizationId, table.projectId),
  index("IDX_project_activities_type").on(table.activityType),
  index("IDX_project_activities_created").on(table.createdAt),
  index("IDX_project_activities_actor").on(table.actorId),
]);

export const insertProjectActivitySchema = createInsertSchema(projectActivities).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectActivity = z.infer<typeof insertProjectActivitySchema>;
export type ProjectActivity = typeof projectActivities.$inferSelect;

// ============================================================================
// CLIENT PORTAL - SERVICE REQUEST SYSTEM
// ============================================================================

/**
 * Portal Users - Client and technician users who can submit service requests
 * Separate from internal users, uses magic link authentication
 */
export const portalUsers = pgTable("portal_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // User information
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  company: text("company"),
  
  // Link to customer account (optional)
  customerId: varchar("customer_id"), // References customers table
  customerLocationId: varchar("customer_location_id"), // References customer_locations table
  
  // Role and status
  role: varchar("role").notNull().default("client"), // client, technician
  status: varchar("status").notNull().default("active"), // active, inactive, suspended
  
  // Invitation tracking
  invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "set null" }),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  invitationSentAt: timestamp("invitation_sent_at"), // When last invite email was sent
  invitationAcceptedAt: timestamp("invitation_accepted_at"), // When user first logged in
  
  // Activity tracking
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").notNull().default(0),
  
  // Metadata
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_portal_users_org").on(table.organizationId),
  index("IDX_portal_users_email").on(table.email),
  index("IDX_portal_users_customer").on(table.customerId),
  uniqueIndex("UNQ_portal_users_org_email").on(table.organizationId, table.email),
]);

export const insertPortalUserSchema = createInsertSchema(portalUsers).omit({
  id: true,
  loginCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(["client", "technician"]).default("client"),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

export type InsertPortalUser = z.infer<typeof insertPortalUserSchema>;
export type PortalUser = typeof portalUsers.$inferSelect;

/**
 * Portal Auth Tokens - Magic link tokens for passwordless authentication
 * Short-lived, single-use tokens sent via email
 */
export const portalAuthTokens = pgTable("portal_auth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portalUserId: varchar("portal_user_id").notNull().references(() => portalUsers.id, { onDelete: "cascade" }),
  
  // Token (hashed for security)
  tokenHash: varchar("token_hash").notNull(),
  tokenLookup: varchar("token_lookup").notNull(), // SHA-256 for O(1) lookups
  
  // Expiration and usage
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  isUsed: boolean("is_used").notNull().default(false),
  
  // Security metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_portal_auth_tokens_lookup").on(table.tokenLookup),
  index("IDX_portal_auth_tokens_user").on(table.portalUserId),
  index("IDX_portal_auth_tokens_expires").on(table.expiresAt),
]);

export const insertPortalAuthTokenSchema = createInsertSchema(portalAuthTokens).omit({
  id: true,
  usedAt: true,
  isUsed: true,
  createdAt: true,
});

export type InsertPortalAuthToken = z.infer<typeof insertPortalAuthTokenSchema>;
export type PortalAuthToken = typeof portalAuthTokens.$inferSelect;

/**
 * Service Requests - Main table for client/technician submitted requests
 * Links to customer accounts, projects, quotes, and site surveys
 */
export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Request identification
  requestNumber: varchar("request_number").notNull(), // Auto-generated SR-XXXX
  
  // Submitter information
  portalUserId: varchar("portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  submitterPhone: text("submitter_phone"),
  submitterCompany: text("submitter_company"),
  
  // Work order tracking
  workOrderNumber: text("work_order_number"),
  poNumber: text("po_number"),
  
  // Request details
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority").notNull().default("normal"), // low, normal, high, urgent
  requestType: varchar("request_type").notNull().default("quote"), // quote, repair, inspection, installation
  
  // Location information
  locationName: text("location_name"),
  locationAddress: text("location_address"),
  buildingName: text("building_name"),
  floorLevel: text("floor_level"),
  accessNotes: text("access_notes"),
  
  // Status and triage
  status: varchar("status").notNull().default("new"), // new, triaged, needs_site_visit, quotable, in_progress, quoted, completed, cancelled
  triageDecision: varchar("triage_decision"), // quote, site_visit, needs_info
  triageReason: text("triage_reason"),
  triagedAt: timestamp("triaged_at"),
  triagedBy: varchar("triaged_by").references(() => users.id, { onDelete: "set null" }),
  
  // Assignment
  salesOwnerId: varchar("sales_owner_id").references(() => users.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  
  // Linked entities (nullable until linked)
  linkedProjectId: varchar("linked_project_id").references(() => projects.id, { onDelete: "set null" }),
  linkedQuoteId: varchar("linked_quote_id"), // Reference to quotes table
  linkedSurveyId: varchar("linked_survey_id"), // Reference to site surveys
  linkedAt: timestamp("linked_at"),
  
  // Timestamps
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_service_requests_org").on(table.organizationId),
  index("IDX_service_requests_status").on(table.status),
  index("IDX_service_requests_portal_user").on(table.portalUserId),
  index("IDX_service_requests_sales_owner").on(table.salesOwnerId),
  index("IDX_service_requests_requested").on(table.requestedAt),
  uniqueIndex("UNQ_service_requests_number").on(table.organizationId, table.requestNumber),
]);

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  triagedAt: true,
  assignedAt: true,
  linkedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  requestType: z.enum(["quote", "repair", "inspection", "installation"]).default("quote"),
  status: z.enum(["new", "triaged", "needs_site_visit", "quotable", "in_progress", "quoted", "completed", "cancelled"]).default("new"),
});

export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;

/**
 * Service Request Items - Individual door openings/items within a service request
 * Captures detailed information about each door that needs attention
 */
export const serviceRequestItems = pgTable("service_request_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceRequestId: varchar("service_request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Item identification
  itemNumber: integer("item_number").notNull(), // Sequential within request
  doorLabel: text("door_label"), // User-provided label like "Main Entrance"
  locationHint: text("location_hint"), // "2nd floor, east wing"
  
  // Door basics (simple fields for non-technical users)
  doorType: varchar("door_type"), // single, double, sliding, revolving, overhead
  doorMaterial: varchar("door_material"), // wood, metal, glass, hollow_metal
  approximateSize: text("approximate_size"), // "Standard", "Wide", "Tall", or dimensions
  
  // Current condition
  conditionNotes: text("condition_notes"),
  issueDescription: text("issue_description"),
  urgency: varchar("urgency").default("normal"), // low, normal, high, critical
  
  // Hardware details (JSON for flexibility)
  hardwareDetails: jsonb("hardware_details").default(sql`'{}'::jsonb`),
  // Structure: { lockType, hingeType, closerType, handleType, existingBrands, etc. }
  
  // Access control integration
  accessControlDetails: jsonb("access_control_details").default(sql`'{}'::jsonb`),
  // Structure: { hasAccessControl, systemType, cardReaderType, electricStrike, requestToExit, etc. }
  
  // Attachments and media
  photos: jsonb("photos").default(sql`'[]'::jsonb`), // Array of photo URLs with metadata
  attachments: jsonb("attachments").default(sql`'[]'::jsonb`), // Other documents
  
  // LiDAR/AR scan links
  lidarScanId: varchar("lidar_scan_id"), // Reference to lidar_scans table
  arScanData: jsonb("ar_scan_data"), // AR measurement data from phone
  
  // Linked opening (after triage/survey)
  linkedOpeningId: varchar("linked_opening_id"), // Reference to door_openings table
  
  // Notes and status
  notes: text("notes"),
  status: varchar("status").notNull().default("pending"), // pending, reviewed, needs_info, processed
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_service_request_items_request").on(table.serviceRequestId),
  index("IDX_service_request_items_org").on(table.organizationId),
  index("IDX_service_request_items_lidar").on(table.lidarScanId),
]);

export const insertServiceRequestItemSchema = createInsertSchema(serviceRequestItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  doorType: z.enum(["single", "double", "sliding", "revolving", "overhead", "other"]).optional(),
  doorMaterial: z.enum(["wood", "metal", "glass", "hollow_metal", "fiberglass", "other"]).optional(),
  urgency: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  status: z.enum(["pending", "reviewed", "needs_info", "processed"]).default("pending"),
});

export type InsertServiceRequestItem = z.infer<typeof insertServiceRequestItemSchema>;
export type ServiceRequestItem = typeof serviceRequestItems.$inferSelect;

/**
 * Service Request Notes - Internal notes and communication on requests
 */
export const serviceRequestNotes = pgTable("service_request_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceRequestId: varchar("service_request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Note content
  content: text("content").notNull(),
  noteType: varchar("note_type").notNull().default("internal"), // internal, client_visible, system
  
  // Author
  authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name"),
  isPortalUser: boolean("is_portal_user").notNull().default(false),
  portalUserId: varchar("portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_service_request_notes_request").on(table.serviceRequestId),
  index("IDX_service_request_notes_org").on(table.organizationId),
]);

export const insertServiceRequestNoteSchema = createInsertSchema(serviceRequestNotes).omit({
  id: true,
  createdAt: true,
}).extend({
  noteType: z.enum(["internal", "client_visible", "system"]).default("internal"),
});

export type InsertServiceRequestNote = z.infer<typeof insertServiceRequestNoteSchema>;
export type ServiceRequestNote = typeof serviceRequestNotes.$inferSelect;

// ============================================================================
// CALENDAR INTEGRATIONS & SITE WALK SCHEDULING
// ============================================================================

/**
 * Calendar Integrations - Connect organization calendars (Google/Microsoft 365)
 * Enables availability checking and appointment creation
 */
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Provider information
  provider: varchar("provider", { length: 20 }).notNull(), // "google" | "microsoft"
  accountEmail: text("account_email").notNull(),
  
  // OAuth tokens (encrypted at rest via application layer)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Calendar details
  calendarId: text("calendar_id"), // Specific calendar ID if not default
  calendarName: text("calendar_name"),
  timeZone: text("time_zone").default("America/New_York"),
  
  // Settings
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  syncEnabled: boolean("sync_enabled").notNull().default(true),
  
  // Home/office location for travel time calculation
  homeBaseAddress: text("home_base_address"),
  homeBaseCity: text("home_base_city"),
  homeBaseState: text("home_base_state"),
  homeBaseZip: text("home_base_zip"),
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_calendar_integrations_org").on(table.organizationId),
  index("IDX_calendar_integrations_provider").on(table.organizationId, table.provider),
  uniqueIndex("IDX_calendar_integrations_org_primary").on(table.organizationId, table.isPrimary).where(sql`is_primary = true`),
]);

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  lastSyncAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  provider: z.enum(["google", "microsoft"]),
});

export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;

/**
 * Availability Blocks - Times when staff are unavailable
 * Supports one-time blocks and recurring patterns
 */
export const availabilityBlocks = pgTable("availability_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Block timing
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  allDay: boolean("all_day").notNull().default(false),
  
  // Description
  reason: text("reason"),
  blockType: varchar("block_type", { length: 30 }).notNull().default("unavailable"), // unavailable, vacation, meeting, lunch
  
  // Recurrence (optional) - RFC 5545 RRULE format
  recurrenceRule: text("recurrence_rule"), // e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  recurrenceEndDate: timestamp("recurrence_end_date"),
  
  // Scope
  appliesToOrgWide: boolean("applies_to_org_wide").notNull().default(false),
  locationId: varchar("location_id").references(() => customerLocations.id, { onDelete: "set null" }), // If specific to a location
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_availability_blocks_org").on(table.organizationId),
  index("IDX_availability_blocks_org_dates").on(table.organizationId, table.startAt, table.endAt),
  index("IDX_availability_blocks_user").on(table.createdByUserId),
  index("IDX_availability_blocks_location").on(table.locationId),
]);

export const insertAvailabilityBlockSchema = createInsertSchema(availabilityBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  blockType: z.enum(["unavailable", "vacation", "meeting", "lunch", "travel", "other"]).default("unavailable"),
});

export type InsertAvailabilityBlock = z.infer<typeof insertAvailabilityBlockSchema>;
export type AvailabilityBlock = typeof availabilityBlocks.$inferSelect;

/**
 * Site Walk Appointments - Scheduled site visits with clients
 * Includes travel time buffer and external calendar sync
 * Now supports multiple appointment types: site_walk, measurement_verification, installation, warranty_repair
 */
export const siteWalkAppointments = pgTable("site_walk_appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Associated entities
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  customerLocationId: varchar("customer_location_id").references(() => customerLocations.id, { onDelete: "set null" }),
  portalUserId: varchar("portal_user_id").references(() => portalUsers.id, { onDelete: "set null" }),
  
  // Appointment Type & Priority
  appointmentType: varchar("appointment_type", { length: 30 }).notNull().default("site_walk"), // site_walk, measurement_verification, installation, warranty_repair
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // normal, urgent
  
  // Trade Coordination (for installations)
  tradeDependencies: jsonb("trade_dependencies").default(sql`'[]'::jsonb`), // Array of trade types: electrician, drywall, paint, flooring, hvac, plumbing
  tradeCoordinationNotes: text("trade_coordination_notes"),
  
  // Assigned Team (multiple team members)
  assignedTeam: jsonb("assigned_team").default(sql`'[]'::jsonb`), // Array of {userId, name, role}
  
  // Scheduling
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  travelMinutes: integer("travel_minutes").default(0),
  travelBufferBefore: integer("travel_buffer_before").default(15), // Minutes before for travel
  
  // Location details (snapshot at booking time)
  locationName: text("location_name"),
  locationAddress: text("location_address"),
  locationCity: text("location_city"),
  locationState: text("location_state"),
  locationZip: text("location_zip"),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("requested"), // requested, pending, confirmed, in_progress, cancelled, completed, no_show
  
  // External calendar sync
  externalEventId: text("external_event_id"),
  externalProvider: varchar("external_provider", { length: 20 }), // "google" | "microsoft"
  calendarIntegrationId: varchar("calendar_integration_id").references(() => calendarIntegrations.id, { onDelete: "set null" }),
  
  // Attendees
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Notes and details
  notes: text("notes"),
  clientNotes: text("client_notes"), // Notes from the client at booking
  internalNotes: text("internal_notes"),
  
  // Confirmation tracking
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: varchar("confirmed_by"), // user or system
  reminderSentAt: timestamp("reminder_sent_at"),
  
  // Completion
  completedAt: timestamp("completed_at"),
  completionNotes: text("completion_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_site_walk_appointments_org").on(table.organizationId),
  index("IDX_site_walk_appointments_org_dates").on(table.organizationId, table.scheduledStart, table.scheduledEnd),
  index("IDX_site_walk_appointments_project").on(table.projectId),
  index("IDX_site_walk_appointments_portal_user").on(table.portalUserId),
  index("IDX_site_walk_appointments_status").on(table.organizationId, table.status),
  index("IDX_site_walk_appointments_external").on(table.externalProvider, table.externalEventId),
  index("IDX_site_walk_appointments_type").on(table.organizationId, table.appointmentType),
]);

export const insertSiteWalkAppointmentSchema = createInsertSchema(siteWalkAppointments).omit({
  id: true,
  confirmedAt: true,
  confirmedBy: true,
  reminderSentAt: true,
  completedAt: true,
  completionNotes: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  appointmentType: z.enum(["site_walk", "measurement_verification", "installation", "warranty_repair"]).default("site_walk"),
  priority: z.enum(["normal", "urgent"]).default("normal"),
  tradeDependencies: z.array(z.string()).optional().default([]),
  tradeCoordinationNotes: z.string().optional(),
  assignedTeam: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    role: z.string().optional(),
  })).optional().default([]),
  status: z.enum(["requested", "pending", "confirmed", "in_progress", "cancelled", "completed", "no_show"]).default("requested"),
  externalProvider: z.enum(["google", "microsoft"]).optional(),
});

export type InsertSiteWalkAppointment = z.infer<typeof insertSiteWalkAppointmentSchema>;
export type SiteWalkAppointment = typeof siteWalkAppointments.$inferSelect;

/**
 * Travel Time Cache - Cache travel time calculations to reduce API calls
 * Organization-scoped to prevent cross-tenant data leakage
 */
export const travelTimeCache = pgTable("travel_time_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Organization scoping for multi-tenant isolation
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  
  // Origin/destination
  originAddress: text("origin_address").notNull(),
  destinationAddress: text("destination_address").notNull(),
  
  // Calculated values
  durationMinutes: integer("duration_minutes").notNull(),
  distanceMiles: integer("distance_miles"),
  
  // Cache validity
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  
  // Provider used
  provider: varchar("provider", { length: 20 }).default("google"), // google, fallback
}, (table) => [
  index("IDX_travel_time_cache_org_addresses").on(table.organizationId, table.originAddress, table.destinationAddress),
  index("IDX_travel_time_cache_expires").on(table.expiresAt),
]);

export type TravelTimeCache = typeof travelTimeCache.$inferSelect;

// ============================================================================
// RELATIONS
// ============================================================================

export const calendarIntegrationsRelations = relations(calendarIntegrations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [calendarIntegrations.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [calendarIntegrations.createdBy],
    references: [users.id],
  }),
  siteWalkAppointments: many(siteWalkAppointments),
}));

export const availabilityBlocksRelations = relations(availabilityBlocks, ({ one }) => ({
  organization: one(organizations, {
    fields: [availabilityBlocks.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [availabilityBlocks.createdByUserId],
    references: [users.id],
  }),
  customerLocation: one(customerLocations, {
    fields: [availabilityBlocks.locationId],
    references: [customerLocations.id],
  }),
}));

export const siteWalkAppointmentsRelations = relations(siteWalkAppointments, ({ one }) => ({
  organization: one(organizations, {
    fields: [siteWalkAppointments.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [siteWalkAppointments.projectId],
    references: [projects.id],
  }),
  customerLocation: one(customerLocations, {
    fields: [siteWalkAppointments.customerLocationId],
    references: [customerLocations.id],
  }),
  portalUser: one(portalUsers, {
    fields: [siteWalkAppointments.portalUserId],
    references: [portalUsers.id],
  }),
  calendarIntegration: one(calendarIntegrations, {
    fields: [siteWalkAppointments.calendarIntegrationId],
    references: [calendarIntegrations.id],
  }),
  assignedUser: one(users, {
    fields: [siteWalkAppointments.assignedUserId],
    references: [users.id],
  }),
}));

export const portalUsersRelations = relations(portalUsers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [portalUsers.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [portalUsers.invitedBy],
    references: [users.id],
  }),
  authTokens: many(portalAuthTokens),
  serviceRequests: many(serviceRequests),
}));

export const portalAuthTokensRelations = relations(portalAuthTokens, ({ one }) => ({
  portalUser: one(portalUsers, {
    fields: [portalAuthTokens.portalUserId],
    references: [portalUsers.id],
  }),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [serviceRequests.organizationId],
    references: [organizations.id],
  }),
  portalUser: one(portalUsers, {
    fields: [serviceRequests.portalUserId],
    references: [portalUsers.id],
  }),
  salesOwner: one(users, {
    fields: [serviceRequests.salesOwnerId],
    references: [users.id],
  }),
  triagedByUser: one(users, {
    fields: [serviceRequests.triagedBy],
    references: [users.id],
  }),
  linkedProject: one(projects, {
    fields: [serviceRequests.linkedProjectId],
    references: [projects.id],
  }),
  items: many(serviceRequestItems),
  notes: many(serviceRequestNotes),
}));

export const serviceRequestItemsRelations = relations(serviceRequestItems, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [serviceRequestItems.serviceRequestId],
    references: [serviceRequests.id],
  }),
  organization: one(organizations, {
    fields: [serviceRequestItems.organizationId],
    references: [organizations.id],
  }),
}));

export const serviceRequestNotesRelations = relations(serviceRequestNotes, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [serviceRequestNotes.serviceRequestId],
    references: [serviceRequests.id],
  }),
  author: one(users, {
    fields: [serviceRequestNotes.authorId],
    references: [users.id],
  }),
  portalUser: one(portalUsers, {
    fields: [serviceRequestNotes.portalUserId],
    references: [portalUsers.id],
  }),
}));

export const portalSharesRelations = relations(portalShares, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [portalShares.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [portalShares.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [portalShares.createdBy],
    references: [users.id],
  }),
  comments: many(projectComments),
}));

export const projectCommentsRelations = relations(projectComments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projectComments.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [projectComments.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [projectComments.authorId],
    references: [users.id],
  }),
  portalShare: one(portalShares, {
    fields: [projectComments.portalShareId],
    references: [portalShares.id],
  }),
  parentComment: one(projectComments, {
    fields: [projectComments.parentCommentId],
    references: [projectComments.id],
  }),
  replies: many(projectComments),
  mentions: many(commentMentions),
}));

export const commentMentionsRelations = relations(commentMentions, ({ one }) => ({
  comment: one(projectComments, {
    fields: [commentMentions.commentId],
    references: [projectComments.id],
  }),
  mentionedUser: one(users, {
    fields: [commentMentions.mentionedUserId],
    references: [users.id],
  }),
}));

export const projectActivitiesRelations = relations(projectActivities, ({ one }) => ({
  organization: one(organizations, {
    fields: [projectActivities.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [projectActivities.projectId],
    references: [projects.id],
  }),
  actor: one(users, {
    fields: [projectActivities.actorId],
    references: [users.id],
  }),
}));

// ============================================================================
// QUOTE DELIVERY & CONFIRMATION SYSTEM
// ============================================================================

/**
 * Quotes - Customer-facing quotations with delivery and approval tracking
 * Supports email, portal, and DocuSign delivery channels
 */
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id"),
  
  // Quote identification
  quoteNumber: varchar("quote_number").notNull(),
  version: integer("version").notNull().default(1),
  
  // Status tracking
  status: varchar("status").notNull().default("draft"), // draft, sent, viewed, approved, rejected, expired, superseded
  
  // Pricing
  subtotal: integer("subtotal").notNull().default(0), // in cents
  taxRate: integer("tax_rate").default(0), // basis points (e.g., 825 = 8.25%)
  taxAmount: integer("tax_amount").default(0), // in cents
  total: integer("total").notNull().default(0), // in cents
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  
  // Validity
  validDays: integer("valid_days").default(30),
  expiresAt: timestamp("expires_at"),
  
  // Delivery configuration
  sentVia: varchar("sent_via"), // email, portal, docusign
  portalShareId: varchar("portal_share_id").references(() => portalShares.id),
  docusignEnvelopeId: varchar("docusign_envelope_id"),
  pdfUrl: text("pdf_url"),
  
  // Approval tracking
  approvalMethod: varchar("approval_method"), // portal, docusign, pdf_link
  
  // Customer info (denormalized for quote)
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerCompany: text("customer_company"),
  
  // Quote content
  introduction: text("introduction"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  
  // Confirmation link for PDF/email approval
  confirmationToken: varchar("confirmation_token"),
  confirmationTokenExpiresAt: timestamp("confirmation_token_expires_at"),
  
  // Timestamps
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_quotes_org").on(table.organizationId),
  index("IDX_quotes_project").on(table.projectId),
  index("IDX_quotes_status").on(table.organizationId, table.status),
  index("IDX_quotes_customer").on(table.customerId),
  uniqueIndex("UNQ_quotes_number").on(table.organizationId, table.quoteNumber),
]);

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  portalShareId: true,
  docusignEnvelopeId: true,
  pdfUrl: true,
  approvalMethod: true,
  sentAt: true,
  viewedAt: true,
  approvedAt: true,
  rejectedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["draft", "sent", "viewed", "approved", "rejected", "expired", "superseded"]).default("draft"),
  sentVia: z.enum(["email", "portal", "docusign"]).optional(),
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

/**
 * Quote Line Items - Individual items in a quote
 */
export const quoteLineItems = pgTable("quote_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Item details
  category: varchar("category"), // door, frame, hardware, labor, other
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0), // in cents
  totalPrice: integer("total_price").notNull().default(0), // in cents
  
  // Reference to door opening if applicable
  doorOpeningId: varchar("door_opening_id"),
  
  // Option group reference (for configurable items)
  optionGroupId: varchar("option_group_id"),
  
  // Flags
  isRequired: boolean("is_required").notNull().default(true),
  isOptional: boolean("is_optional").notNull().default(false),
  customerCanRemove: boolean("customer_can_remove").notNull().default(false),
  
  // Display
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_quote_line_items_quote").on(table.quoteId),
  index("IDX_quote_line_items_org").on(table.organizationId),
]);

export const insertQuoteLineItemSchema = createInsertSchema(quoteLineItems).omit({
  id: true,
  createdAt: true,
});

export type InsertQuoteLineItem = z.infer<typeof insertQuoteLineItemSchema>;
export type QuoteLineItem = typeof quoteLineItems.$inferSelect;

/**
 * Quote Option Groups - Configurable option categories (finish, texture, color, etc.)
 */
export const quoteOptionGroups = pgTable("quote_option_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Group details
  name: text("name").notNull(), // e.g., "Door Finish", "Frame Texture", "Hardware Style"
  description: text("description"),
  category: varchar("category"), // finish, texture, color, hardware, other
  
  // Selection rules
  selectionType: varchar("selection_type").notNull().default("single"), // single, multi
  isRequired: boolean("is_required").notNull().default(true),
  minSelections: integer("min_selections").default(1),
  maxSelections: integer("max_selections"),
  
  // Reference to line item(s) this applies to
  appliesToLineItemIds: text("applies_to_line_item_ids").array(),
  
  // Display
  sortOrder: integer("sort_order").default(0),
  helpText: text("help_text"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_quote_option_groups_quote").on(table.quoteId),
]);

export const insertQuoteOptionGroupSchema = createInsertSchema(quoteOptionGroups).omit({
  id: true,
  createdAt: true,
}).extend({
  selectionType: z.enum(["single", "multi"]).default("single"),
});

export type InsertQuoteOptionGroup = z.infer<typeof insertQuoteOptionGroupSchema>;
export type QuoteOptionGroup = typeof quoteOptionGroups.$inferSelect;

/**
 * Quote Options - Individual options within an option group
 */
export const quoteOptions = pgTable("quote_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  optionGroupId: varchar("option_group_id").notNull().references(() => quoteOptionGroups.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Option details
  label: text("label").notNull(),
  value: text("value").notNull(), // Internal code/SKU
  description: text("description"),
  
  // Pricing impact
  priceAdjustment: integer("price_adjustment").default(0), // in cents, can be negative
  priceAdjustmentType: varchar("price_adjustment_type").default("fixed"), // fixed, percentage
  
  // Visual
  imageUrl: text("image_url"),
  swatchColor: varchar("swatch_color", { length: 7 }), // hex color
  
  // Flags
  isDefault: boolean("is_default").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  
  // Display
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_quote_options_group").on(table.optionGroupId),
]);

export const insertQuoteOptionSchema = createInsertSchema(quoteOptions).omit({
  id: true,
  createdAt: true,
}).extend({
  priceAdjustmentType: z.enum(["fixed", "percentage"]).default("fixed"),
});

export type InsertQuoteOption = z.infer<typeof insertQuoteOptionSchema>;
export type QuoteOption = typeof quoteOptions.$inferSelect;

/**
 * Quote Selections - Customer's option selections
 */
export const quoteSelections = pgTable("quote_selections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  optionGroupId: varchar("option_group_id").notNull().references(() => quoteOptionGroups.id, { onDelete: "cascade" }),
  optionId: varchar("option_id").notNull().references(() => quoteOptions.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Who made the selection
  portalUserId: varchar("portal_user_id").references(() => portalUsers.id),
  userId: varchar("user_id").references(() => users.id),
  
  // Selection details
  quantity: integer("quantity").default(1),
  notes: text("notes"),
  
  selectedAt: timestamp("selected_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_quote_selections_quote").on(table.quoteId),
  index("IDX_quote_selections_option").on(table.optionId),
  uniqueIndex("UNQ_quote_selections_quote_option").on(table.quoteId, table.optionId),
]);

export const insertQuoteSelectionSchema = createInsertSchema(quoteSelections).omit({
  id: true,
  selectedAt: true,
});

export type InsertQuoteSelection = z.infer<typeof insertQuoteSelectionSchema>;
export type QuoteSelection = typeof quoteSelections.$inferSelect;

/**
 * Quote Delivery Events - Track delivery attempts and status
 */
export const quoteDeliveryEvents = pgTable("quote_delivery_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Delivery details
  channel: varchar("channel").notNull(), // email, portal, docusign, pdf_link
  status: varchar("status").notNull(), // queued, sent, delivered, failed, opened, bounced
  
  // Recipient info
  recipientEmail: text("recipient_email"),
  recipientName: text("recipient_name"),
  
  // Channel-specific details
  emailMessageId: text("email_message_id"),
  docusignEnvelopeId: text("docusign_envelope_id"),
  portalShareId: varchar("portal_share_id"),
  
  // Additional details
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  errorMessage: text("error_message"),
  
  // Actor
  sentBy: varchar("sent_by").references(() => users.id),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_quote_delivery_events_quote").on(table.quoteId),
  index("IDX_quote_delivery_events_status").on(table.status),
]);

export const insertQuoteDeliveryEventSchema = createInsertSchema(quoteDeliveryEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  channel: z.enum(["email", "portal", "docusign", "pdf_link"]),
  status: z.enum(["queued", "sent", "delivered", "failed", "opened", "bounced"]),
});

export type InsertQuoteDeliveryEvent = z.infer<typeof insertQuoteDeliveryEventSchema>;
export type QuoteDeliveryEvent = typeof quoteDeliveryEvents.$inferSelect;

/**
 * Quote Approvals - Customer approval/rejection records
 */
export const quoteApprovals = pgTable("quote_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Approval decision
  decision: varchar("decision").notNull(), // approved, rejected
  
  // Approver info
  approverEmail: text("approver_email").notNull(),
  approverName: text("approver_name").notNull(),
  approverTitle: text("approver_title"),
  approverCompany: text("approver_company"),
  portalUserId: varchar("portal_user_id").references(() => portalUsers.id),
  
  // Approval method
  method: varchar("method").notNull(), // portal, docusign, pdf_link
  
  // Signature info
  signatureType: varchar("signature_type"), // typed, drawn, docusign
  signatureData: text("signature_data"), // base64 for drawn, text for typed
  docusignEnvelopeId: text("docusign_envelope_id"),
  
  // Comments
  comments: text("comments"),
  rejectionReason: text("rejection_reason"),
  
  // Security tracking
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Timestamps
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_quote_approvals_quote").on(table.quoteId),
  index("IDX_quote_approvals_decision").on(table.decision),
]);

export const insertQuoteApprovalSchema = createInsertSchema(quoteApprovals).omit({
  id: true,
  signedAt: true,
  createdAt: true,
}).extend({
  decision: z.enum(["approved", "rejected"]),
  method: z.enum(["portal", "docusign", "pdf_link"]),
  signatureType: z.enum(["typed", "drawn", "docusign"]).optional(),
});

export type InsertQuoteApproval = z.infer<typeof insertQuoteApprovalSchema>;
export type QuoteApproval = typeof quoteApprovals.$inferSelect;

/**
 * Portal Quotes View State - Track when portal users view quotes
 */
export const portalQuotesViewState = pgTable("portal_quotes_view_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  portalUserId: varchar("portal_user_id").notNull().references(() => portalUsers.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // View tracking
  firstViewedAt: timestamp("first_viewed_at").notNull(),
  lastViewedAt: timestamp("last_viewed_at").notNull(),
  viewCount: integer("view_count").notNull().default(1),
  
  // Selection progress tracking
  selectionsStartedAt: timestamp("selections_started_at"),
  selectionsCompletedAt: timestamp("selections_completed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_portal_quotes_view_quote").on(table.quoteId),
  index("IDX_portal_quotes_view_user").on(table.portalUserId),
  uniqueIndex("UNQ_portal_quotes_view").on(table.quoteId, table.portalUserId),
]);

export const insertPortalQuotesViewStateSchema = createInsertSchema(portalQuotesViewState).omit({
  id: true,
  createdAt: true,
});

export type InsertPortalQuotesViewState = z.infer<typeof insertPortalQuotesViewStateSchema>;
export type PortalQuotesViewState = typeof portalQuotesViewState.$inferSelect;

/**
 * Quote Comments - Customer/team comments on quotes
 */
export const quoteComments = pgTable("quote_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Comment details
  content: text("content").notNull(),
  
  // Author
  authorType: varchar("author_type").notNull().default("team"), // team, client
  authorId: varchar("author_id").references(() => users.id),
  portalUserId: varchar("portal_user_id").references(() => portalUsers.id),
  authorName: text("author_name"),
  
  // Reference to specific line item or option group
  relatedLineItemId: varchar("related_line_item_id").references(() => quoteLineItems.id),
  relatedOptionGroupId: varchar("related_option_group_id").references(() => quoteOptionGroups.id),
  
  // Threading
  parentCommentId: varchar("parent_comment_id"),
  
  // Flags
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_quote_comments_quote").on(table.quoteId),
  index("IDX_quote_comments_author").on(table.authorId),
  index("IDX_quote_comments_portal_user").on(table.portalUserId),
]);

export const insertQuoteCommentSchema = createInsertSchema(quoteComments).omit({
  id: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  authorType: z.enum(["team", "client"]).default("team"),
});

export type InsertQuoteComment = z.infer<typeof insertQuoteCommentSchema>;
export type QuoteComment = typeof quoteComments.$inferSelect;

// ============================================================================
// QUOTE RELATIONS
// ============================================================================

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [quotes.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
  portalShare: one(portalShares, {
    fields: [quotes.portalShareId],
    references: [portalShares.id],
  }),
  createdByUser: one(users, {
    fields: [quotes.createdBy],
    references: [users.id],
  }),
  lineItems: many(quoteLineItems),
  optionGroups: many(quoteOptionGroups),
  selections: many(quoteSelections),
  deliveryEvents: many(quoteDeliveryEvents),
  approvals: many(quoteApprovals),
  comments: many(quoteComments),
}));

export const quoteLineItemsRelations = relations(quoteLineItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteLineItems.quoteId],
    references: [quotes.id],
  }),
  organization: one(organizations, {
    fields: [quoteLineItems.organizationId],
    references: [organizations.id],
  }),
}));

export const quoteOptionGroupsRelations = relations(quoteOptionGroups, ({ one, many }) => ({
  quote: one(quotes, {
    fields: [quoteOptionGroups.quoteId],
    references: [quotes.id],
  }),
  organization: one(organizations, {
    fields: [quoteOptionGroups.organizationId],
    references: [organizations.id],
  }),
  options: many(quoteOptions),
  selections: many(quoteSelections),
}));

export const quoteOptionsRelations = relations(quoteOptions, ({ one }) => ({
  optionGroup: one(quoteOptionGroups, {
    fields: [quoteOptions.optionGroupId],
    references: [quoteOptionGroups.id],
  }),
  organization: one(organizations, {
    fields: [quoteOptions.organizationId],
    references: [organizations.id],
  }),
}));

export const quoteSelectionsRelations = relations(quoteSelections, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteSelections.quoteId],
    references: [quotes.id],
  }),
  optionGroup: one(quoteOptionGroups, {
    fields: [quoteSelections.optionGroupId],
    references: [quoteOptionGroups.id],
  }),
  option: one(quoteOptions, {
    fields: [quoteSelections.optionId],
    references: [quoteOptions.id],
  }),
  portalUser: one(portalUsers, {
    fields: [quoteSelections.portalUserId],
    references: [portalUsers.id],
  }),
  user: one(users, {
    fields: [quoteSelections.userId],
    references: [users.id],
  }),
}));

export const quoteDeliveryEventsRelations = relations(quoteDeliveryEvents, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteDeliveryEvents.quoteId],
    references: [quotes.id],
  }),
  organization: one(organizations, {
    fields: [quoteDeliveryEvents.organizationId],
    references: [organizations.id],
  }),
  sentByUser: one(users, {
    fields: [quoteDeliveryEvents.sentBy],
    references: [users.id],
  }),
}));

export const quoteApprovalsRelations = relations(quoteApprovals, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteApprovals.quoteId],
    references: [quotes.id],
  }),
  organization: one(organizations, {
    fields: [quoteApprovals.organizationId],
    references: [organizations.id],
  }),
  portalUser: one(portalUsers, {
    fields: [quoteApprovals.portalUserId],
    references: [portalUsers.id],
  }),
}));

export const quoteCommentsRelations = relations(quoteComments, ({ one, many }) => ({
  quote: one(quotes, {
    fields: [quoteComments.quoteId],
    references: [quotes.id],
  }),
  organization: one(organizations, {
    fields: [quoteComments.organizationId],
    references: [organizations.id],
  }),
  author: one(users, {
    fields: [quoteComments.authorId],
    references: [users.id],
  }),
  portalUser: one(portalUsers, {
    fields: [quoteComments.portalUserId],
    references: [portalUsers.id],
  }),
  parentComment: one(quoteComments, {
    fields: [quoteComments.parentCommentId],
    references: [quoteComments.id],
  }),
  replies: many(quoteComments),
}));
