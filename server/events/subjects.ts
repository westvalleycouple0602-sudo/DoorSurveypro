// ============================================================================
// NATS SUBJECTS - Event subject definitions for pub/sub messaging
// ============================================================================

/**
 * NATS subject naming convention:
 * notifications.{channel}.{action}
 * 
 * Examples:
 * - notifications.email.requested
 * - notifications.sms.requested
 * - notifications.slack.requested
 */

export const NATS_SUBJECTS = {
  // Email notifications
  EMAIL_NOTIFICATION_REQUESTED: "notifications.email.requested",
  EMAIL_NOTIFICATION_SENT: "notifications.email.sent",
  EMAIL_NOTIFICATION_FAILED: "notifications.email.failed",
  EMAIL_BOUNCE: "notifications.email.bounced",
  EMAIL_COMPLAINT: "notifications.email.complained",
  
  // SMS notifications (future)
  SMS_NOTIFICATION_REQUESTED: "notifications.sms.requested",
  SMS_NOTIFICATION_SENT: "notifications.sms.sent",
  SMS_NOTIFICATION_FAILED: "notifications.sms.failed",
  
  // Slack notifications (future)
  SLACK_NOTIFICATION_REQUESTED: "notifications.slack.requested",
  SLACK_NOTIFICATION_SENT: "notifications.slack.sent",
  SLACK_NOTIFICATION_FAILED: "notifications.slack.failed",
  
  // In-app notifications (future)
  IN_APP_NOTIFICATION_CREATED: "notifications.in-app.created",
  IN_APP_NOTIFICATION_READ: "notifications.in-app.read",
} as const;

export type NatsSubject = typeof NATS_SUBJECTS[keyof typeof NATS_SUBJECTS];
