import React from "react";
import { Text, Heading } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { RenderResult } from "@shared/events/notification-events";

export interface EmailVerificationEmailData {
  userName: string;
  verifyUrl: string;
  expiresInHours: number;
}

export function EmailVerificationEmail({ userName, verifyUrl, expiresInHours }: EmailVerificationEmailData) {
  return (
    <Layout preview={`Verify your DoorSurvey Pro email address`}>
      <Heading style={heading}>Verify Your Email Address</Heading>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={paragraph}>
        Thank you for signing up for DoorSurvey Pro! Please verify your email address
        by clicking the button below.
      </Text>
      <div style={buttonContainer}>
        <Button href={verifyUrl}>Verify Email Address</Button>
      </div>
      <Text style={infoText}>
        This verification link will expire in {expiresInHours} hours. If you didn't create
        an account with DoorSurvey Pro, you can safely ignore this email.
      </Text>
      <Text style={paragraph}>
        Verifying your email helps keep your account secure and ensures you can receive
        important notifications about your projects and team activity.
      </Text>
      <Text style={paragraph}>
        If you're having trouble clicking the button, copy and paste this URL into your browser:
      </Text>
      <Text style={linkText}>{verifyUrl}</Text>
      <Text style={paragraph}>
        Best regards,<br />
        The DoorSurvey Pro Team
      </Text>
    </Layout>
  );
}

export function render(data: EmailVerificationEmailData): RenderResult {
  return {
    subject: "Verify Your DoorSurvey Pro Email Address",
    html: "",
    previewText: "Verify your DoorSurvey Pro email address",
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

const infoText = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "16px 0",
  padding: "12px",
  backgroundColor: "#eff6ff",
  borderRadius: "6px",
  color: "#1e40af",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const linkText = {
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0 0 12px 0",
  color: "#2563eb",
  wordBreak: "break-all" as const,
};
