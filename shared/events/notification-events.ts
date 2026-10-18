// ============================================================================
// NOTIFICATION EVENTS - Strongly typed event contracts for email notifications
// ============================================================================

import type { Project, DoorOpening, User, Organization, Membership } from "@shared/schema";

// Notification Template IDs - Unique identifier for each email template
export enum TemplateId {
  // Authentication & Onboarding
  WELCOME = "welcome",
  EMAIL_VERIFICATION = "email-verification",
  PASSWORD_RESET = "password-reset",
  PASSWORD_CHANGED = "password-changed",
  
  // Team & Collaboration
  TEAM_INVITATION = "team-invitation",
  ROLE_CHANGED = "role-changed",
  MEMBER_ADDED = "member-added",
  MEMBER_REMOVED = "member-removed",
  
  // Projects
  PROJECT_CREATED = "project-created",
  PROJECT_INVITATION = "project-invitation",
  PROJECT_STATUS_UPDATE = "project-status-update",
  PROJECT_COMPLETED = "project-completed",
  PROJECT_ARCHIVED = "project-archived",
  PROJECT_SHARED = "project-shared",
  
  // Compliance & Building Codes
  COMPLIANCE_ALERT = "compliance-alert",
  VIOLATION_DETECTED = "violation-detected",
  VIOLATION_RESOLVED = "violation-resolved",
  COMPLIANCE_REPORT = "compliance-report",
  
  // Quotes & Billing
  QUOTE_REQUESTED = "quote-requested",
  QUOTE_APPROVED = "quote-approved",
  QUOTE_REJECTED = "quote-rejected",
  QUOTE_SENT_TO_CLIENT = "quote-sent-to-client",
  INVOICE_GENERATED = "invoice-generated",
  PAYMENT_RECEIVED = "payment-received",
  SUBSCRIPTION_CHANGED = "subscription-changed",
  TRIAL_EXPIRING = "trial-expiring",
  TRIAL_7DAY_WARNING = "trial-7day-warning",
  TRIAL_1DAY_WARNING = "trial-1day-warning",
  TRIAL_EXPIRED = "trial-expired",
  TRIAL_GRACE_PERIOD = "trial-grace-period",
  
  // Support & Operations
  SUPPORT_TICKET_CREATED = "support-ticket-created",
  SUPPORT_TICKET_RESPONSE = "support-ticket-response",
  SUPPORT_TICKET_RESOLVED = "support-ticket-resolved",
  CONTACT_FORM_RECEIVED = "contact-form-received",
  
  // Marketing & Engagement
  FEATURE_ANNOUNCEMENT = "feature-announcement",
  NEWSLETTER = "newsletter",
  SURVEY_REQUEST = "survey-request",
  
  // System & Alerts
  EXPORT_READY = "export-ready",
  IMPORT_COMPLETED = "import-completed",
  INTEGRATION_FAILED = "integration-failed",
  INTEGRATION_CONNECTED = "integration-connected",
  
  // Comments & Collaboration
  COMMENT_MENTION = "comment-mention",
  COMMENT_REPLY = "comment-reply",
  APPROVAL_REQUESTED = "approval-requested",
  APPROVAL_APPROVED = "approval-approved",
  APPROVAL_REJECTED = "approval-rejected",
  
  // Sales Notifications
  MILESTONE_NOTIFICATION = "milestone-notification",
}

// Notification Event Types - Maps to NATS subjects and database eventType
export type NotificationEventType =
  | "user.welcome"
  | "user.email-verification"
  | "user.password-reset"
  | "user.password-changed"
  | "team.invitation"
  | "team.role-changed"
  | "team.member-added"
  | "team.member-removed"
  | "project.created"
  | "project.invitation"
  | "project.status-update"
  | "project.completed"
  | "project.archived"
  | "project.shared"
  | "compliance.alert"
  | "compliance.violation-detected"
  | "compliance.violation-resolved"
  | "compliance.report"
  | "quote.requested"
  | "quote.approved"
  | "quote.rejected"
  | "quote.sent"
  | "billing.invoice"
  | "billing.payment"
  | "billing.subscription-changed"
  | "billing.trial-expiring"
  | "billing.trial-7day-warning"
  | "billing.trial-1day-warning"
  | "billing.trial-expired"
  | "billing.trial-grace-period"
  | "support.ticket-created"
  | "support.ticket-response"
  | "support.ticket-resolved"
  | "support.contact-form"
  | "marketing.feature-announcement"
  | "marketing.newsletter"
  | "marketing.survey"
  | "system.export-ready"
  | "system.import-completed"
  | "system.integration-failed"
  | "system.integration-connected"
  | "comment.mention"
  | "comment.reply"
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "milestone.completed";

// Notification Categories - Used for preference grouping
export enum NotificationCategory {
  TRANSACTIONAL = "transactional", // Critical emails (password reset, verification)
  OPERATIONAL = "operational",     // Project updates, compliance alerts
  COLLABORATION = "collaboration", // Team invitations, shared projects
  BILLING = "billing",             // Invoices, payments, subscriptions
  MARKETING = "marketing",         // Feature announcements, newsletters
  SUPPORT = "support",             // Support tickets, contact forms
}

// Map event types to categories
export const EVENT_TO_CATEGORY: Record<NotificationEventType, NotificationCategory> = {
  "user.welcome": NotificationCategory.TRANSACTIONAL,
  "user.email-verification": NotificationCategory.TRANSACTIONAL,
  "user.password-reset": NotificationCategory.TRANSACTIONAL,
  "user.password-changed": NotificationCategory.TRANSACTIONAL,
  "team.invitation": NotificationCategory.COLLABORATION,
  "team.role-changed": NotificationCategory.COLLABORATION,
  "team.member-added": NotificationCategory.COLLABORATION,
  "team.member-removed": NotificationCategory.COLLABORATION,
  "project.created": NotificationCategory.OPERATIONAL,
  "project.invitation": NotificationCategory.COLLABORATION,
  "project.status-update": NotificationCategory.OPERATIONAL,
  "project.completed": NotificationCategory.OPERATIONAL,
  "project.archived": NotificationCategory.OPERATIONAL,
  "project.shared": NotificationCategory.COLLABORATION,
  "compliance.alert": NotificationCategory.OPERATIONAL,
  "compliance.violation-detected": NotificationCategory.OPERATIONAL,
  "compliance.violation-resolved": NotificationCategory.OPERATIONAL,
  "compliance.report": NotificationCategory.OPERATIONAL,
  "quote.requested": NotificationCategory.OPERATIONAL,
  "quote.approved": NotificationCategory.OPERATIONAL,
  "quote.rejected": NotificationCategory.OPERATIONAL,
  "quote.sent": NotificationCategory.OPERATIONAL,
  "billing.invoice": NotificationCategory.BILLING,
  "billing.payment": NotificationCategory.BILLING,
  "billing.subscription-changed": NotificationCategory.BILLING,
  "billing.trial-expiring": NotificationCategory.BILLING,
  "billing.trial-7day-warning": NotificationCategory.BILLING,
  "billing.trial-1day-warning": NotificationCategory.BILLING,
  "billing.trial-expired": NotificationCategory.BILLING,
  "billing.trial-grace-period": NotificationCategory.BILLING,
  "support.ticket-created": NotificationCategory.SUPPORT,
  "support.ticket-response": NotificationCategory.SUPPORT,
  "support.ticket-resolved": NotificationCategory.SUPPORT,
  "support.contact-form": NotificationCategory.SUPPORT,
  "marketing.feature-announcement": NotificationCategory.MARKETING,
  "marketing.newsletter": NotificationCategory.MARKETING,
  "marketing.survey": NotificationCategory.MARKETING,
  "system.export-ready": NotificationCategory.OPERATIONAL,
  "system.import-completed": NotificationCategory.OPERATIONAL,
  "system.integration-failed": NotificationCategory.OPERATIONAL,
  "system.integration-connected": NotificationCategory.OPERATIONAL,
  "comment.mention": NotificationCategory.COLLABORATION,
  "comment.reply": NotificationCategory.COLLABORATION,
  "approval.requested": NotificationCategory.COLLABORATION,
  "approval.approved": NotificationCategory.COLLABORATION,
  "approval.rejected": NotificationCategory.COLLABORATION,
  "milestone.completed": NotificationCategory.OPERATIONAL,
};

/**
 * Map event types to template IDs
 * 
 * NOTE: Only events with implemented templates are mapped here.
 * Other events will error until templates are implemented.
 * 
 * Currently implemented: 5 of 37 planned templates
 */
export const EVENT_TO_TEMPLATE: Partial<Record<NotificationEventType, TemplateId>> = {
  // ✅ Implemented Templates (9)
  "user.welcome": TemplateId.WELCOME,
  "project.invitation": TemplateId.PROJECT_INVITATION,
  "project.status-update": TemplateId.PROJECT_STATUS_UPDATE,
  "quote.approved": TemplateId.QUOTE_APPROVED,
  "compliance.alert": TemplateId.COMPLIANCE_ALERT,
  "billing.trial-7day-warning": TemplateId.TRIAL_7DAY_WARNING,
  "billing.trial-1day-warning": TemplateId.TRIAL_1DAY_WARNING,
  "billing.trial-expired": TemplateId.TRIAL_EXPIRED,
  "billing.trial-grace-period": TemplateId.TRIAL_GRACE_PERIOD,
  "comment.mention": TemplateId.COMMENT_MENTION,
  "comment.reply": TemplateId.COMMENT_REPLY,
  "approval.requested": TemplateId.APPROVAL_REQUESTED,
  "approval.approved": TemplateId.APPROVAL_APPROVED,
  "approval.rejected": TemplateId.APPROVAL_REJECTED,
  "milestone.completed": TemplateId.MILESTONE_NOTIFICATION,
  
  // 🚧 TODO: Implement remaining templates incrementally as needed
};

// ============================================================================
// NOTIFICATION ENVELOPE - Standard wrapper for all notification events
// ============================================================================

export interface NotificationActor {
  userId: string;
  email: string | null;
  name: string | null;
}

export interface NotificationTarget {
  userId: string;
  email: string;
  name: string | null;
  language?: string;
}

export interface NotificationContext {
  organizationId: string;
  organizationName: string;
  [key: string]: unknown; // Additional context
}

export interface NotificationEnvelope<TPayload = unknown> {
  eventId: string; // Unique identifier for idempotency
  eventType: NotificationEventType;
  timestamp: Date;
  actor: NotificationActor; // Who triggered the event
  targets: NotificationTarget[]; // Who should receive notifications
  context: NotificationContext; // Organizational context
  payload: TPayload; // Event-specific data
  priority?: "high" | "normal" | "low"; // For queue prioritization
}

// ============================================================================
// TEMPLATE DATA TYPES - Input data for each email template
// ============================================================================

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  organizationName: string;
  verificationUrl?: string;
  dashboardUrl: string;
}

export interface EmailVerificationData {
  userName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export interface PasswordResetData {
  userName: string;
  resetUrl: string;
  expiresInHours: number;
  ipAddress?: string;
}

export interface PasswordChangedData {
  userName: string;
  changedAt: Date;
  ipAddress?: string;
}

export interface TeamInvitationData {
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  role: string;
  invitationUrl: string;
  expiresInDays: number;
}

export interface RoleChangedData {
  userName: string;
  previousRole: string;
  newRole: string;
  organizationName: string;
  changedBy: string;
}

export interface ProjectInvitationData {
  inviterName: string;
  projectName: string;
  projectLocation: string;
  projectUrl: string;
  organizationName: string;
}

export interface ProjectStatusUpdateData {
  projectName: string;
  projectLocation: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: string;
  projectUrl: string;
  notes?: string;
}

export interface QuoteApprovedData {
  quoteName: string;
  projectName: string;
  approvedBy: string;
  approvedAt: Date;
  totalAmount: number;
  currency: string;
  quoteUrl: string;
}

export interface ComplianceAlertData {
  projectName: string;
  violationType: string;
  severity: "critical" | "warning" | "info";
  description: string;
  affectedOpenings: number;
  complianceUrl: string;
  recommendations?: string[];
}

export interface SupportTicketCreatedData {
  ticketNumber: string;
  subject: string;
  priority: "high" | "medium" | "low";
  ticketUrl: string;
  estimatedResponseTime: string;
}

export interface ContactFormReceivedData {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  receivedAt: Date;
}

// Trial Notifications
export interface Trial7DayWarningData {
  userName: string;
  organizationName: string;
  trialTier: string; // "Professional" or "Enterprise"
  expiresInDays: number; // Should be 7
  expiresAt: Date;
  upgradeUrl: string;
  trialSettingsUrl: string;
}

export interface Trial1DayWarningData {
  userName: string;
  organizationName: string;
  trialTier: string; // "Professional" or "Enterprise"
  expiresInHours: number; // Should be ~24
  expiresAt: Date;
  upgradeUrl: string;
  trialSettingsUrl: string;
}

export interface TrialExpiredData {
  userName: string;
  organizationName: string;
  trialTier: string; // "Professional" or "Enterprise"
  expiredAt: Date;
  gracePeriodDays: number; // Should be 3
  gracePeriodEndsAt: Date;
  upgradeUrl: string;
  featuresUrl: string;
}

export interface TrialGracePeriodData {
  userName: string;
  organizationName: string;
  trialTier: string; // "Professional" or "Enterprise"
  gracePeriodEndsAt: Date;
  daysRemaining: number;
  upgradeUrl: string;
  contactSalesUrl: string;
}

// Comments & Collaboration
export interface CommentMentionData {
  mentionedUserName: string;
  authorName: string;
  commentText: string;
  projectName: string;
  projectLocation: string;
  commentUrl: string;
  projectUrl: string;
  organizationName: string;
}

export interface CommentReplyData {
  recipientName: string;
  authorName: string;
  replyText: string;
  originalCommentText: string;
  projectName: string;
  projectLocation: string;
  commentUrl: string;
  projectUrl: string;
  organizationName: string;
}

export interface ApprovalRequestedData {
  approverName: string;
  requesterName: string;
  projectName: string;
  projectLocation: string;
  proposalType: "quote" | "change-order" | "scope-change";
  totalAmount?: string;
  approvalUrl: string;
  projectUrl: string;
  organizationName: string;
  dueDate?: Date;
}

export interface ApprovalApprovedData {
  requesterName: string;
  approverName: string;
  projectName: string;
  projectLocation: string;
  proposalType: "quote" | "change-order" | "scope-change";
  totalAmount?: string;
  approvedAt: Date;
  projectUrl: string;
  organizationName: string;
  approverComments?: string;
}

export interface ApprovalRejectedData {
  requesterName: string;
  approverName: string;
  projectName: string;
  projectLocation: string;
  proposalType: "quote" | "change-order" | "scope-change";
  totalAmount?: string;
  rejectedAt: Date;
  projectUrl: string;
  organizationName: string;
  rejectionReason?: string;
}

// Milestone Notifications (Sales Rep Updates)
export interface MilestoneNotificationData {
  projectName: string;
  projectLocation?: string;
  milestoneName: string;
  milestoneDescription?: string;
  completionDate: Date;
  pmName: string;
  pmEmail?: string;
  nextMilestoneName?: string;
  nextMilestoneTargetDate?: Date;
  projectUrl: string;
  milestoneProgress?: {
    completed: number;
    total: number;
  };
  notes?: string;
  organizationName: string;
}

// ============================================================================
// RENDER RESULT - Output from template rendering
// ============================================================================

export interface RenderResult {
  html: string;
  text?: string; // Plain text version
  subject: string;
  previewText?: string; // Email preview text (first line)
}

// ============================================================================
// TEMPLATE RENDERER - Function signature for template renderers
// ============================================================================

export interface RenderOptions {
  language?: string;
  timezone?: string;
}

export type TemplateRenderer<TData> = (
  data: TData,
  options?: RenderOptions
) => RenderResult;
