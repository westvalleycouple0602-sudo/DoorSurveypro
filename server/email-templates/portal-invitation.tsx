import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PortalInvitationEmailProps {
  recipientName: string;
  inviterName: string;
  organizationName: string;
  magicLink: string;
  customMessage?: string;
  customerName?: string;
}

export function PortalInvitationEmail({
  recipientName,
  inviterName,
  organizationName,
  magicLink,
  customMessage,
  customerName,
}: PortalInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to the {organizationName} Client Portal</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Client Portal Invitation</Heading>
          
          <Text style={paragraph}>
            Hello {recipientName},
          </Text>
          
          <Text style={paragraph}>
            {inviterName} from {organizationName} has invited you to access the Client Portal
            {customerName ? ` for ${customerName}` : ""}.
          </Text>
          
          {customMessage && (
            <Section style={messageBox}>
              <Text style={messageText}>{customMessage}</Text>
            </Section>
          )}
          
          <Text style={paragraph}>
            The Client Portal allows you to:
          </Text>
          
          <Section style={featureList}>
            <Text style={featureItem}>View your active projects and work in progress</Text>
            <Text style={featureItem}>Track status updates and project milestones</Text>
            <Text style={featureItem}>Access door opening history and specifications</Text>
            <Text style={featureItem}>Submit new service requests</Text>
            <Text style={featureItem}>Print and export reports</Text>
          </Section>
          
          <Section style={buttonContainer}>
            <Button style={button} href={magicLink}>
              Accept Invitation & Access Portal
            </Button>
          </Section>
          
          <Text style={helpText}>
            This invitation link will expire in 7 days. If you need a new link, 
            please contact {organizationName}.
          </Text>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            If you didn't expect this invitation or have questions, please contact {organizationName} directly.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const heading = {
  color: "#1e293b",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const messageBox = {
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  padding: "16px",
  margin: "16px 0",
};

const messageText = {
  color: "#475569",
  fontSize: "15px",
  lineHeight: "22px",
  fontStyle: "italic" as const,
  margin: 0,
};

const featureList = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "16px 0 24px",
};

const featureItem = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
  paddingLeft: "16px",
  position: "relative" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const helpText = {
  color: "#64748b",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "16px 0",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footer = {
  color: "#94a3b8",
  fontSize: "12px",
  textAlign: "center" as const,
};

export default PortalInvitationEmail;
