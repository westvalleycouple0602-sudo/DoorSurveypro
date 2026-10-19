import React from "react";
import { Text, Heading } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { TrialExpiredData, RenderResult } from "@shared/events/notification-events";

export function TrialExpiredEmail({ userName, organizationName, trialTier, expiredAt, gracePeriodDays, gracePeriodEndsAt, upgradeUrl, featuresUrl }: TrialExpiredData) {
  const formattedExpiredDate = new Date(expiredAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  
  const formattedGraceEndDate = new Date(gracePeriodEndsAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Layout preview={`Your ${trialTier} trial has expired - Grace period active`}>
      <Heading style={heading}>Your {trialTier} Trial Has Ended</Heading>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={paragraph}>
        Your <strong>{trialTier}</strong> plan trial for <strong>{organizationName}</strong> expired on {formattedExpiredDate}.
      </Text>
      <Text style={graceBox}>
        <strong>Good news!</strong> You have a <strong>{gracePeriodDays}-day grace period</strong> until {formattedGraceEndDate} with limited access to your premium features.
      </Text>
      <Text style={paragraph}>
        <strong>During the grace period:</strong>
      </Text>
      <ul style={list}>
        <li style={listItem}>✓ View-only access to your existing projects and data</li>
        <li style={listItem}>✓ Download exports and reports</li>
        <li style={listItem}>✓ Access to hardware catalogs and compliance libraries</li>
        <li style={listItem}>✗ No new project creation or editing capabilities</li>
        <li style={listItem}>✗ Limited team collaboration features</li>
      </ul>
      <Text style={paragraph}>
        After the grace period ends on {formattedGraceEndDate}, your account will be downgraded to the Free plan, and you'll lose access to:
      </Text>
      <ul style={list}>
        <li style={listItem}>All {trialTier} tier features and tools</li>
        <li style={listItem}>Advanced project data (some data may be archived)</li>
        <li style={listItem}>Premium support and account management</li>
      </ul>
      <Text style={paragraph}>
        <strong>Upgrade today</strong> to continue using all the powerful features that help you complete door surveys faster and more accurately.
      </Text>
      <div style={buttonContainer}>
        <Button href={upgradeUrl}>Upgrade to {trialTier}</Button>
      </div>
      <Text style={paragraph}>
        Want to learn more about what you'll get? <a href={featuresUrl} style={link}>View all {trialTier} features</a> or contact us with questions.
      </Text>
      <Text style={paragraph}>
        Best regards,<br />
        The DoorSurvey Pro Team
      </Text>
    </Layout>
  );
}

export function render(data: TrialExpiredData): RenderResult {
  return {
    subject: `Your ${data.trialTier} trial has expired - ${data.gracePeriodDays}-day grace period active`,
    html: "", // Will be rendered by render function
    previewText: `Your ${data.trialTier} trial expired - You have ${data.gracePeriodDays} days of grace period access`,
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

const graceBox = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 16px 0",
  padding: "16px",
  backgroundColor: "#dbeafe",
  borderLeft: "4px solid #3b82f6",
  color: "#1e40af",
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
