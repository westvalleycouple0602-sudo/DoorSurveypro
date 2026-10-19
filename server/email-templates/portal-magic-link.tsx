import { Text, Heading } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { RenderResult } from "@shared/events/notification-events";

export interface PortalMagicLinkEmailData {
  userName?: string;
  email: string;
  magicLink: string;
  expiresInMinutes: number;
}

export function PortalMagicLinkEmail({ userName, email, magicLink, expiresInMinutes }: PortalMagicLinkEmailData) {
  const displayName = userName || email.split("@")[0];
  
  return (
    <Layout preview="Sign in to DoorSurvey Pro Client Portal">
      <Heading style={heading}>Sign In to Client Portal</Heading>
      <Text style={paragraph}>Hi {displayName},</Text>
      <Text style={paragraph}>
        Click the button below to sign in to your DoorSurvey Pro Client Portal account.
        This link is valid for {expiresInMinutes} minutes.
      </Text>
      <div style={buttonContainer}>
        <Button href={magicLink}>Sign In to Portal</Button>
      </div>
      <Text style={infoText}>
        Use the portal to submit service requests, track their progress, and communicate
        with our team about your door hardware needs.
      </Text>
      <Text style={warningText}>
        This link will expire in {expiresInMinutes} minutes. If you didn't request this sign-in link,
        you can safely ignore this email.
      </Text>
      <Text style={paragraph}>
        If you're having trouble clicking the button, copy and paste this URL into your browser:
      </Text>
      <Text style={linkText}>{magicLink}</Text>
      <Text style={paragraph}>
        Best regards,<br />
        The DoorSurvey Pro Team
      </Text>
    </Layout>
  );
}

export function render(data: PortalMagicLinkEmailData): RenderResult {
  return {
    subject: "Sign In to DoorSurvey Pro Client Portal",
    html: "",
    previewText: "Sign in to submit service requests and track your orders",
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
