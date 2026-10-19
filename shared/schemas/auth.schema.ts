
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// AUTHENTICATION & MULTI-TENANCY TABLES
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  passwordHash: text("password_hash"),
  replitUsername: varchar("replit_username"),
  linkedProviders: text("linked_providers").array(),
  authProvider: varchar("auth_provider").default("replit"),
  emailVerifiedAt: timestamp("email_verified_at"),
  emailVerificationToken: text("email_verification_token"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lastFailedLoginAt: timestamp("last_failed_login_at"),
  lockoutUntil: timestamp("lockout_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug").unique(),
  subscriptionTier: varchar("subscription_tier").notNull().default("free"),
  subscriptionStatus: varchar("subscription_status").notNull().default("active"),
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  activeAddons: jsonb("active_addons").default(sql`'[]'::jsonb`),
  trialEndsAt: timestamp("trial_ends_at"),
  trialTier: varchar("trial_tier"),
  gracePeriodEndDate: timestamp("grace_period_end_date"),
  lastDowngradeDate: timestamp("last_downgrade_date"),
  hasTriedProfessional: boolean("has_tried_professional"),
  hasTriedEnterprise: boolean("has_tried_enterprise"),
  trialNotificationsSent: jsonb("trial_notifications_sent").$type<Record<string, string>>(),
  isBetaTester: text("is_beta_tester"),
  currentPeriodEnd: timestamp("current_period_end"),
  projectLimit: integer("project_limit").default(3),
  userLimit: integer("user_limit").default(1),
  logoUrl: text("logo_url"),
  signatureName: text("signature_name"),
  signatureTitle: text("signature_title"),
  signaturePhone: text("signature_phone"),
  signatureEmail: text("signature_email"),
  brandingColor: varchar("branding_color"),
  websiteUrl: text("website_url"),
  proposalContactName: text("proposal_contact_name"),
  proposalContactEmail: text("proposal_contact_email"),
  proposalContactPhone: text("proposal_contact_phone"),
  proposalContactAddress: text("proposal_contact_address"),
  hubspotApiKey: text("hubspot_api_key"),
  hubspotEnabled: text("hubspot_enabled").default("no"),
  isDemo: text("is_demo").default("no"),
  isMasterAccount: text("is_master_account").default("no"),
  rolePermissions: jsonb("role_permissions").$type<Record<string, string[]>>(),
  brandingOnboardingStatus: text("branding_onboarding_status").default("not_started"),
  brandingOnboardingProgress: jsonb("branding_onboarding_progress").$type<Record<string, {
    completed: boolean; updatedAt: string; data: Record<string, unknown>;
  }>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rolePermissions: z.record(z.array(z.string())).nullable().optional(),
  brandingOnboardingProgress: z.record(z.object({
    completed: z.boolean(), updatedAt: z.string(), data: z.record(z.unknown()),
  })).nullable().optional(),
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Role Types for Enterprise/Corporate Accounts
export const MEMBERSHIP_ROLES = {
  OWNER: "owner",                     // Organization owner - full access
  ADMIN: "admin",                     // Administrator - can manage users and settings
  PM_MANAGER: "pm_manager",           // Project Manager Manager - oversight of all PMs with analytics
  MANAGER: "manager",                 // Manager - can approve quotes, manage projects
  PROJECT_MANAGER: "project_manager", // Project Manager - manages projects, procurement, assigns work
  ENGINEER: "engineer",               // Engineer - can review and approve engineering items
  SALES_REP: "sales_rep",             // Sales Representative - receives milestone updates
  PROCUREMENT_OFFICER: "procurement_officer", // Procurement Officer - handles purchasing
  TECHNICIAN: "technician",           // Field technician - can create/edit surveys
  VIEWER: "viewer",                   // Read-only access
} as const;

export type MembershipRole = typeof MEMBERSHIP_ROLES[keyof typeof MEMBERSHIP_ROLES];

export const memberships = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("technician"), // Primary role for backward compatibility
  roles: text("roles").array().default(sql`'{}'::text[]`), // Array of additional roles
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_memberships_user_id").on(table.userId),
  index("IDX_memberships_organization_id").on(table.organizationId),
  uniqueIndex("UNQ_memberships_user_org").on(table.userId, table.organizationId),
]);

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["owner", "admin", "pm_manager", "manager", "project_manager", "engineer", "sales_rep", "procurement_officer", "technician", "viewer"]).default("technician"),
  roles: z.array(z.enum(["owner", "admin", "pm_manager", "manager", "project_manager", "engineer", "sales_rep", "procurement_officer", "technician", "viewer"])).optional().default([]),
});

export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof memberships.$inferSelect;

// ============================================================================
// PASSWORD RESET TOKENS
// ============================================================================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_password_reset_tokens_user_id").on(table.userId),
  index("IDX_password_reset_tokens_token").on(table.token),
]);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ============================================================================
// EMAIL VERIFICATION TOKENS
// ============================================================================

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  email: varchar("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_email_verification_tokens_user_id").on(table.userId),
  index("IDX_email_verification_tokens_token").on(table.token),
]);

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// ============================================================================
// USER SESSIONS (for session management UI)
// ============================================================================

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().unique(),
  deviceType: varchar("device_type"),
  deviceName: varchar("device_name"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  location: varchar("location"),
  rememberMe: boolean("remember_me").default(false),
  lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_user_sessions_user_id").on(table.userId),
  index("IDX_user_sessions_session_id").on(table.sessionId),
  index("IDX_user_sessions_expires_at").on(table.expiresAt),
]);

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// ============================================================================
// INVITATION TOKENS (Beta Tester Invitations)
// ============================================================================

export const invitationTokens = pgTable("invitation_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  email: varchar("email"),
  name: varchar("name"),
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  role: varchar("role").default("technician"),
  status: varchar("status").notNull().default("pending"),
  usedByUserId: varchar("used_by_user_id").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses").default(1),
  useCount: integer("use_count").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_invitation_tokens_token").on(table.token),
  index("IDX_invitation_tokens_email").on(table.email),
  index("IDX_invitation_tokens_organization_id").on(table.organizationId),
]);

export const insertInvitationTokenSchema = createInsertSchema(invitationTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvitationToken = z.infer<typeof insertInvitationTokenSchema>;
export type InvitationToken = typeof invitationTokens.$inferSelect;
