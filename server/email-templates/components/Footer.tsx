import React from "react";
import { Section, Text, Link, Row, Column } from "@react-email/components";
import { COMPANY_EMAILS } from "@shared/emails";

export function EmailFooter() {
  return (
    <Section style={footer}>
      <Text style={footerText}>
        This is an automated message from DoorSurvey Pro.
      </Text>
      <Text style={footerText}>
        <strong>Need Help?</strong>
      </Text>
      <Row style={linksContainer}>
        <Column style={linkColumn}>
          <Link href={`mailto:${COMPANY_EMAILS.support}`} style={link}>
            Support
          </Link>
        </Column>
        <Column style={linkColumn}>
          <Link href={`mailto:${COMPANY_EMAILS.sales}`} style={link}>
            Sales
          </Link>
        </Column>
        <Column style={linkColumn}>
          <Link href={`mailto:${COMPANY_EMAILS.billing}`} style={link}>
            Billing
          </Link>
        </Column>
      </Row>
      <Text style={footerText}>
        <Link href="https://doorsurveypro.com" style={link}>
          doorsurveypro.com
        </Link>
      </Text>
      <Text style={unsubscribeText}>
        To update your email preferences,{" "}
        <Link href="{{preferences_url}}" style={link}>
          click here
        </Link>
      </Text>
    </Section>
  );
}

const footer = {
  padding: "0 48px",
  color: "#8898aa",
  fontSize: "12px",
};

const footerText = {
  margin: "0 0 10px 0",
  textAlign: "center" as const,
  color: "#8898aa",
  fontSize: "12px",
};

const linksContainer = {
  marginTop: "8px",
  marginBottom: "16px",
};

const linkColumn = {
  textAlign: "center" as const,
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

const unsubscribeText = {
  margin: "20px 0 0 0",
  textAlign: "center" as const,
  color: "#8898aa",
  fontSize: "11px",
};
