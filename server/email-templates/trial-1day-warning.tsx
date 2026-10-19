import React from "react";
import { Text, Heading } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { Trial1DayWarningData, RenderResult } from "@shared/events/notification-events";

export function Trial1DayWarningEmail({ userName, organizationName, trialTier, expiresInHours, expiresAt, upgradeUrl, trialSettingsUrl }: Trial1DayWarningData) {
  const formattedDate = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  
  const formattedTime = new Date(expiresAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <Layout preview={`Your ${trialTier} trial expires tomorrow`}>
      <Heading style={heading}>⏰ Your {trialTier} Trial Expires Tomorrow</Heading>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={urgentBox}>
        <strong>This is your final reminder:</strong> Your <strong>{trialTier}</strong> plan trial for <strong>{organizationName}</strong> expires in approximately <strong>{expiresInHours} hours</strong> on {formattedDate} at {formattedTime}.
      </Text>
      <Text style={paragraph}>
        After your trial ends, you'll lose access to:
      </Text>
      <ul style={list}>
        {trialTier === "Professional" ? (
          <>
            <li style={listItem}>Unlimited projects and team collaboration</li>
            <li style={listItem}>Advanced hardware catalog and estimation tools</li>
            <li style={listItem}>AI-powered photo analysis</li>
            <li style={listItem}>Real-time building code compliance validation</li>
            <li style={listItem}>Professional export and quote generation</li>
          </>
        ) : (
          <>
            <li style={listItem}>White-label branding and custom templates</li>
            <li style={listItem}>API access for seamless integrations</li>
            <li style={listItem}>Advanced analytics and business intelligence</li>
            <li style={listItem}>Priority support with dedicated account management</li>
            <li style={listItem}>Enterprise-grade security and compliance</li>
          </>
        )}
      </ul>
      <Text style={paragraph}>
        <strong>Don't wait!</strong> Upgrade now to maintain uninterrupted access to all your projects and premium features.
      </Text>
      <div style={buttonContainer}>
        <Button href={upgradeUrl}>Upgrade to {trialTier} Now</Button>
      </div>
      <Text style={paragraph}>
        Questions? <a href={trialSettingsUrl} style={link}>View trial details</a> or reply to this email to speak with our team.
      </Text>
      <Text style={paragraph}>
        Best regards,<br />
        The DoorSurvey Pro Team
      </Text>
    </Layout>
  );
}

export function render(data: Trial1DayWarningData): RenderResult {
  return {
    subject: `⏰ Final Reminder: Your ${data.trialTier} trial expires tomorrow`,
    html: "", // Will be rendered by render function
    previewText: `Your ${data.trialTier} trial expires in ${data.expiresInHours} hours`,
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

const urgentBox = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 16px 0",
  padding: "16px",
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  color: "#78350f",
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
