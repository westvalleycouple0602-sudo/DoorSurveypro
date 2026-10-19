import React from "react";
import { Text, Heading } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { RenderResult } from "@shared/events/notification-events";

export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function PasswordResetEmail({ userName, resetUrl, expiresInMinutes }: PasswordResetEmailData) {
  return (
    <Layout preview={`Reset your DoorSurvey Pro password`}>
      <Heading style={heading}>Reset Your Password</Heading>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={paragraph}>
        We received a request to reset the password for your DoorSurvey Pro account.
        Click the button below to create a new password.
      </Text>
      <div style={buttonContainer}>
        <Button href={resetUrl}>Reset Password</Button>
      </div>
      <Text style={warningText}>
        This link will expire in {expiresInMinutes} minutes. If you didn't request a password reset,
        you can safely ignore this email. Your password will remain unchanged.
      </Text>
      <Text style={paragraph}>
        For security reasons, this password reset link can only be used once.
        If you need to reset your password again, please request a new link.
      </Text>
      <Text style={paragraph}>
        If you're having trouble clicking the button, copy and paste this URL into your browser:
      </Text>
      <Text style={linkText}>{resetUrl}</Text>
      <Text style={paragraph}>
        Best regards,<br />
        The DoorSurvey Pro Team
      </Text>
    </Layout>
  );
}

export function render(data: PasswordResetEmailData): RenderResult {
  return {
    subject: "Reset Your DoorSurvey Pro Password",
    html: "",
    previewText: "Reset your DoorSurvey Pro password",
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

const warningText = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "16px 0",
  padding: "12px",
  backgroundColor: "#fef3c7",
  borderRadius: "6px",
  color: "#92400e",
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
