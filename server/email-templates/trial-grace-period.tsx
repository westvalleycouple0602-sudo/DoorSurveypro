import React from "react";
import { Text, Heading } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { TrialGracePeriodData, RenderResult } from "@shared/events/notification-events";

export function TrialGracePeriodEmail({ userName, organizationName, trialTier, gracePeriodEndsAt, daysRemaining, upgradeUrl, contactSalesUrl }: TrialGracePeriodData) {
  const formattedEndDate = new Date(gracePeriodEndsAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Layout preview={`Grace period ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} - Upgrade now`}>
      <Heading style={heading}>⚠️ Grace Period Ending Soon</Heading>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={warningBox}>
        <strong>Urgent:</strong> Your grace period for <strong>{organizationName}</strong> ends in <strong style={highlight}>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> on {formattedEndDate}.
      </Text>
      <Text style={paragraph}>
        You're currently in view-only mode with limited access to your {trialTier} features. Once the grace period ends, your account will be downgraded to the Free plan.
      </Text>
      <Text style={paragraph}>
        <strong>What happens when the grace period ends:</strong>
      </Text>
      <ul style={list}>
        <li style={listItem}>❌ Loss of all {trialTier} tier features and capabilities</li>
        <li style={listItem}>❌ Project limits reduced to Free plan (3 projects maximum)</li>
        <li style={listItem}>❌ Team members limited to 1 user</li>
        <li style={listItem}>❌ Some advanced project data will be archived</li>
        <li style={listItem}>❌ No access to premium support</li>
      </ul>
      <Text style={paragraph}>
        <strong>Don't lose your work!</strong> Upgrade now to maintain full access to your projects, team collaboration, and all the advanced tools you've been using.
      </Text>
      <div style={buttonContainer}>
        <Button href={upgradeUrl}>Upgrade to {trialTier} Now</Button>
      </div>
      <Text style={paragraph}>
        Need help choosing the right plan? Our team is here to help. <a href={contactSalesUrl} style={link}>Contact our sales team</a> to discuss your specific needs or get answers to any questions.
      </Text>
      <Text style={paragraph}>
        We'd love to keep you as a {trialTier} customer! If you're experiencing any issues or have feedback about the platform, please reply to this email - we're here to help.
      </Text>
      <Text style={paragraph}>
        Best regards,<br />
        The DoorSurvey Pro Team
      </Text>
    </Layout>
  );
}

export function render(data: TrialGracePeriodData): RenderResult {
  const daysText = data.daysRemaining === 1 ? 'day' : 'days';
  return {
    subject: `⚠️ Grace period ends in ${data.daysRemaining} ${daysText} - Upgrade now to keep your features`,
    html: "", // Will be rendered by render function
    previewText: `Your grace period ends in ${data.daysRemaining} ${daysText} - Upgrade now`,
  };
}

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  color: "#1e293b",
};

const paragraph = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 12px 0",
  color: "#475569",
};

const warningBox = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 16px 0",
  padding: "16px",
  backgroundColor: "#fee2e2",
  borderLeft: "4px solid #ef4444",
  color: "#991b1b",
};

const list = {
  margin: "0 0 16px 0",
  paddingLeft: "24px",
};

const listItem = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px 0",
  color: "#475569",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const highlight = {
  color: "#dc2626",
  fontWeight: "700",
};
