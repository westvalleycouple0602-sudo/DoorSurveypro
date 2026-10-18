import React from "react";
import { Text, Heading } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { Trial7DayWarningData, RenderResult } from "@shared/events/notification-events";

export function Trial7DayWarningEmail({ userName, organizationName, trialTier, expiresInDays, expiresAt, upgradeUrl, trialSettingsUrl }: Trial7DayWarningData) {
  const formattedDate = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Layout preview={`Your ${trialTier} trial expires in ${expiresInDays} days`}>
      <Heading style={heading}>Your {trialTier} Trial is Ending Soon</Heading>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={paragraph}>
        Your <strong>{trialTier}</strong> plan trial for <strong>{organizationName}</strong> will expire in <strong style={highlight}>{expiresInDays} days</strong> on {formattedDate}.
      </Text>
      <Text style={paragraph}>
        You've been enjoying these premium features:
      </Text>
      <ul style={list}>
        {trialTier === "Professional" ? (
          <>
            <li style={listItem}>Unlimited projects and team members</li>
            <li style={listItem}>Advanced estimation tools and hardware catalog</li>
            <li style={listItem}>AI-powered photo analysis</li>
            <li style={listItem}>Building code compliance validation</li>
            <li style={listItem}>Professional export templates</li>
          </>
        ) : (
          <>
            <li style={listItem}>Everything in Professional, plus:</li>
            <li style={listItem}>White-label branding and custom exports</li>
            <li style={listItem}>API access for integrations</li>
            <li style={listItem}>Priority support and dedicated account manager</li>
            <li style={listItem}>Advanced analytics and reporting</li>
          </>
        )}
      </ul>
      <Text style={paragraph}>
        Don't lose access to these powerful features! Upgrade now to continue streamlining your door survey workflows.
      </Text>
      <div style={buttonContainer}>
        <Button href={upgradeUrl}>Upgrade to {trialTier}</Button>
      </div>
      <Text style={paragraph}>
        Need more time to decide? <a href={trialSettingsUrl} style={link}>Manage your trial settings</a> or contact our sales team to discuss your options.
      </Text>
      <Text style={paragraph}>
        Best regards,<br />
        The DoorSurvey Pro Team
      </Text>
    </Layout>
  );
}

export function render(data: Trial7DayWarningData): RenderResult {
  return {
    subject: `Your ${data.trialTier} trial expires in ${data.expiresInDays} days`,
    html: "", // Will be rendered by render function
    previewText: `Your ${data.trialTier} trial expires in ${data.expiresInDays} days`,
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
  color: "#ef4444",
  fontWeight: "600",
};
