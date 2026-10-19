import React from "react";
import { Text, Heading } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { WelcomeEmailData, RenderResult } from "@shared/events/notification-events";

export function WelcomeEmail({ userName, organizationName, dashboardUrl }: WelcomeEmailData) {
  return (
    <Layout preview={`Welcome to DoorSurvey Pro, ${userName}!`}>
      <Heading style={heading}>Welcome to DoorSurvey Pro!</Heading>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={paragraph}>
        We're excited to have you on board! You've been added to <strong>{organizationName}</strong> on DoorSurvey Pro, the leading platform for commercial door surveys and estimations.
      </Text>
      <Text style={paragraph}>
        With DoorSurvey Pro, you can:
      </Text>
      <ul style={list}>
        <li style={listItem}>Create detailed door surveys with AI-powered photo analysis</li>
        <li style={listItem}>Generate accurate hardware schedules and estimates</li>
        <li style={listItem}>Ensure building code compliance with real-time validation</li>
        <li style={listItem}>Collaborate with your team on projects</li>
        <li style={listItem}>Export professional reports and proposals</li>
      </ul>
      <Text style={paragraph}>
        Ready to get started? Click the button below to access your dashboard.
      </Text>
      <div style={buttonContainer}>
        <Button href={dashboardUrl}>Go to Dashboard</Button>
      </div>
      <Text style={paragraph}>
        If you have any questions or need assistance, our support team is here to help.
      </Text>
      <Text style={paragraph}>
        Best regards,<br />
        The DoorSurvey Pro Team
      </Text>
    </Layout>
  );
}

export function render(data: WelcomeEmailData): RenderResult {
  return {
    subject: `Welcome to DoorSurvey Pro, ${data.userName}!`,
    html: "", // Will be rendered by render function
    previewText: `Welcome to DoorSurvey Pro, ${data.userName}!`,
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
