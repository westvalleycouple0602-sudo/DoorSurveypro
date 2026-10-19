// ============================================================================
// NOTIFICATION DEFAULTS - Default opt-in/opt-out settings by category
// ============================================================================

import { NotificationCategory, NotificationEventType } from "@shared/events/notification-events";

/**
 * Default notification preferences by category
 * - Transactional emails (password reset, verification) are always enabled and cannot be disabled
 * - Operational emails (project updates, compliance alerts) are enabled by default
 * - Collaboration emails (invitations, shared projects) are enabled by default
 * - Billing emails (invoices, payments) are enabled by default
 * - Marketing emails (features, newsletters) are disabled by default - require opt-in
 * - Support emails (tickets, responses) are enabled by default
 */
export const CATEGORY_DEFAULTS: Record<NotificationCategory, {
  defaultEnabled: boolean;
  canDisable: boolean;
  description: string;
}> = {
  [NotificationCategory.TRANSACTIONAL]: {
    defaultEnabled: true,
    canDisable: false, // Cannot disable critical authentication emails
    description: "Account security and authentication emails (password resets, email verification)",
  },
  [NotificationCategory.OPERATIONAL]: {
    defaultEnabled: true,
    canDisable: true,
    description: "Project updates, compliance alerts, and system notifications",
  },
  [NotificationCategory.COLLABORATION]: {
    defaultEnabled: true,
    canDisable: true,
    description: "Team invitations, project sharing, and collaboration updates",
  },
  [NotificationCategory.BILLING]: {
    defaultEnabled: true,
    canDisable: false, // Cannot disable billing/payment emails (legal requirement)
    description: "Invoices, payment receipts, and subscription changes",
  },
  [NotificationCategory.MARKETING]: {
    defaultEnabled: false, // Require explicit opt-in for marketing
    canDisable: true,
    description: "Feature announcements, newsletters, and product updates",
  },
  [NotificationCategory.SUPPORT]: {
    defaultEnabled: true,
    canDisable: true,
    description: "Support ticket updates and responses",
  },
};

/**
 * Event-specific overrides for default preferences
 * Use this to override the category default for specific events
 */
export const EVENT_OVERRIDES: Partial<Record<NotificationEventType, {
  defaultEnabled: boolean;
  reason: string;
}>> = {
  // Example: Disable compliance reports by default (user can opt-in)
  "compliance.report": {
    defaultEnabled: false,
    reason: "Daily compliance reports can be overwhelming - users can opt-in if needed",
  },
  
  // Example: Always enable critical compliance alerts
  "compliance.violation-detected": {
    defaultEnabled: true,
    reason: "Critical building code violations must be communicated immediately",
  },
};

/**
 * Rate limiting configuration for notification categories
 * Prevents notification spam by throttling similar notifications
 */
export const RATE_LIMITS: Record<NotificationCategory, {
  maxPerHour: number;
  maxPerDay: number;
}> = {
  [NotificationCategory.TRANSACTIONAL]: {
    maxPerHour: 10,
    maxPerDay: 50,
  },
  [NotificationCategory.OPERATIONAL]: {
    maxPerHour: 20,
    maxPerDay: 100,
  },
  [NotificationCategory.COLLABORATION]: {
    maxPerHour: 15,
    maxPerDay: 75,
  },
  [NotificationCategory.BILLING]: {
    maxPerHour: 5,
    maxPerDay: 20,
  },
  [NotificationCategory.MARKETING]: {
    maxPerHour: 2,
    maxPerDay: 5,
  },
  [NotificationCategory.SUPPORT]: {
    maxPerHour: 10,
    maxPerDay: 50,
  },
};

/**
 * Auto-responder priority configuration
 * Determines which notifications should be sent immediately vs. queued normally
 */
export const HIGH_PRIORITY_EVENTS = new Set<NotificationEventType>([
  "user.password-reset",
  "user.email-verification",
  "compliance.violation-detected",
  "support.ticket-created",
  "quote.approved",
]);
