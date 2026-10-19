// ============================================================================
// EMAIL TEMPLATE REGISTRY - Central registry for all email templates
// ============================================================================

import React from "react";
import { render as renderWelcome, WelcomeEmail } from "./welcome.js";
import { render as renderProjectInvitation, ProjectInvitationEmail } from "./project-invitation.js";
import { render as renderProjectStatusUpdate, ProjectStatusUpdateEmail } from "./project-status-update.js";
import { render as renderQuoteApproved, QuoteApprovedEmail } from "./quote-approved.js";
import { render as renderComplianceAlert, ComplianceAlertEmail } from "./compliance-alert.js";
import { render as renderTrial7DayWarning, Trial7DayWarningEmail } from "./trial-7day-warning.js";
import { render as renderTrial1DayWarning, Trial1DayWarningEmail } from "./trial-1day-warning.js";
import { render as renderTrialExpired, TrialExpiredEmail } from "./trial-expired.js";
import { render as renderTrialGracePeriod, TrialGracePeriodEmail } from "./trial-grace-period.js";
import { render as renderCommentMention, CommentMentionEmail } from "./comment-mention.js";
import { render as renderCommentReply, CommentReplyEmail } from "./comment-reply.js";
import { render as renderApprovalRequested, ApprovalRequestedEmail } from "./approval-requested.js";
import { render as renderApprovalApproved, ApprovalApprovedEmail } from "./approval-approved.js";
import { render as renderApprovalRejected, ApprovalRejectedEmail } from "./approval-rejected.js";
import { render as renderMilestoneNotification, MilestoneNotificationEmail } from "./milestone-notification.js";

import { renderAsync } from "@react-email/render";
import {
  TemplateId,
  type RenderResult,
  type RenderOptions,
  type TemplateRenderer,
  type WelcomeEmailData,
  type ProjectInvitationData,
  type ProjectStatusUpdateData,
  type QuoteApprovedData,
  type ComplianceAlertData,
  type Trial7DayWarningData,
  type Trial1DayWarningData,
  type TrialExpiredData,
  type TrialGracePeriodData,
  type CommentMentionData,
  type CommentReplyData,
  type ApprovalRequestedData,
  type ApprovalApprovedData,
  type ApprovalRejectedData,
  type MilestoneNotificationData,
} from "@shared/events/notification-events";

// ============================================================================
// TEMPLATE RENDERER IMPLEMENTATIONS
// ============================================================================

async function renderWelcomeTemplate(
  data: WelcomeEmailData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderWelcome(data);
  const html = await renderAsync(React.createElement(WelcomeEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderProjectInvitationTemplate(
  data: ProjectInvitationData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderProjectInvitation(data);
  const html = await renderAsync(React.createElement(ProjectInvitationEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderProjectStatusUpdateTemplate(
  data: ProjectStatusUpdateData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderProjectStatusUpdate(data);
  const html = await renderAsync(React.createElement(ProjectStatusUpdateEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderQuoteApprovedTemplate(
  data: QuoteApprovedData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderQuoteApproved(data);
  const html = await renderAsync(React.createElement(QuoteApprovedEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderComplianceAlertTemplate(
  data: ComplianceAlertData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderComplianceAlert(data);
  const html = await renderAsync(React.createElement(ComplianceAlertEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderTrial7DayWarningTemplate(
  data: Trial7DayWarningData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderTrial7DayWarning(data);
  const html = await renderAsync(React.createElement(Trial7DayWarningEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderTrial1DayWarningTemplate(
  data: Trial1DayWarningData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderTrial1DayWarning(data);
  const html = await renderAsync(React.createElement(Trial1DayWarningEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderTrialExpiredTemplate(
  data: TrialExpiredData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderTrialExpired(data);
  const html = await renderAsync(React.createElement(TrialExpiredEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderTrialGracePeriodTemplate(
  data: TrialGracePeriodData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderTrialGracePeriod(data);
  const html = await renderAsync(React.createElement(TrialGracePeriodEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderCommentMentionTemplate(
  data: CommentMentionData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderCommentMention(data);
  const html = await renderAsync(React.createElement(CommentMentionEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderCommentReplyTemplate(
  data: CommentReplyData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderCommentReply(data);
  const html = await renderAsync(React.createElement(CommentReplyEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderApprovalRequestedTemplate(
  data: ApprovalRequestedData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderApprovalRequested(data);
  const html = await renderAsync(React.createElement(ApprovalRequestedEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderApprovalApprovedTemplate(
  data: ApprovalApprovedData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderApprovalApproved(data);
  const html = await renderAsync(React.createElement(ApprovalApprovedEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderApprovalRejectedTemplate(
  data: ApprovalRejectedData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderApprovalRejected(data);
  const html = await renderAsync(React.createElement(ApprovalRejectedEmail, data));
  
  return {
    ...result,
    html,
  };
}

async function renderMilestoneNotificationTemplate(
  data: MilestoneNotificationData,
  options?: RenderOptions
): Promise<RenderResult> {
  const result = renderMilestoneNotification(data);
  const html = await renderAsync(React.createElement(MilestoneNotificationEmail, data));
  
  return {
    ...result,
    html,
  };
}

// ============================================================================
// TEMPLATE REGISTRY - Maps template IDs to their renderers
// ============================================================================

export const emailTemplates: Record<string, (data: any, options?: RenderOptions) => Promise<RenderResult>> = {
  [TemplateId.WELCOME]: renderWelcomeTemplate,
  [TemplateId.PROJECT_INVITATION]: renderProjectInvitationTemplate,
  [TemplateId.PROJECT_STATUS_UPDATE]: renderProjectStatusUpdateTemplate,
  [TemplateId.QUOTE_APPROVED]: renderQuoteApprovedTemplate,
  [TemplateId.COMPLIANCE_ALERT]: renderComplianceAlertTemplate,
  [TemplateId.TRIAL_7DAY_WARNING]: renderTrial7DayWarningTemplate,
  [TemplateId.TRIAL_1DAY_WARNING]: renderTrial1DayWarningTemplate,
  [TemplateId.TRIAL_EXPIRED]: renderTrialExpiredTemplate,
  [TemplateId.TRIAL_GRACE_PERIOD]: renderTrialGracePeriodTemplate,
  [TemplateId.COMMENT_MENTION]: renderCommentMentionTemplate,
  [TemplateId.COMMENT_REPLY]: renderCommentReplyTemplate,
  [TemplateId.APPROVAL_REQUESTED]: renderApprovalRequestedTemplate,
  [TemplateId.APPROVAL_APPROVED]: renderApprovalApprovedTemplate,
  [TemplateId.APPROVAL_REJECTED]: renderApprovalRejectedTemplate,
  [TemplateId.MILESTONE_NOTIFICATION]: renderMilestoneNotificationTemplate,
};

/**
 * Render an email template by ID
 * @param templateId - The template identifier
 * @param data - Template-specific data
 * @param options - Rendering options (language, timezone)
 * @returns Rendered email with HTML, subject, and preview text
 */
export async function renderEmailTemplate<TData = any>(
  templateId: TemplateId | string,
  data: TData,
  options?: RenderOptions
): Promise<RenderResult> {
  const renderer = emailTemplates[templateId];
  
  if (!renderer) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  return renderer(data, options);
}

/**
 * Check if a template exists
 */
export function hasTemplate(templateId: TemplateId | string): boolean {
  return templateId in emailTemplates;
}

/**
 * Get all available template IDs
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(emailTemplates);
}
