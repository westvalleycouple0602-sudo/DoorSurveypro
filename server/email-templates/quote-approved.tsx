import React from "react";
import { Text, Heading, Section, Row, Column } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { QuoteApprovedData, RenderResult } from "@shared/events/notification-events";

export function QuoteApprovedEmail({ 
  quoteName, 
  projectName, 
  approvedBy, 
  approvedAt, 
  totalAmount, 
  currency, 
  quoteUrl 
}: QuoteApprovedData) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(totalAmount);
  
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(approvedAt));

  return (
    <Layout preview={`Quote approved: ${quoteName} for ${formattedAmount}`}>
      <Heading style={heading}>Quote Approved ✓</Heading>
      <Section style={successBanner}>
        <Text style={successText}>Your quote has been approved!</Text>
      </Section>
      
      <Text style={paragraph}>
        Great news! The quote for <strong>{projectName}</strong> has been approved.
      </Text>
      
      <Section style={quoteCard}>
        <Text style={quoteTitle}>{quoteName}</Text>
        
        <Row style={infoRow}>
          <Column style={labelColumn}>
            <Text style={label}>Project</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{projectName}</Text>
          </Column>
        </Row>
        
        <Row style={infoRow}>
          <Column style={labelColumn}>
            <Text style={label}>Total Amount</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={amountValue}>{formattedAmount}</Text>
          </Column>
        </Row>
        
        <Row style={infoRow}>
          <Column style={labelColumn}>
            <Text style={label}>Approved By</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{approvedBy}</Text>
          </Column>
        </Row>
        
        <Row style={infoRow}>
          <Column style={labelColumn}>
            <Text style={label}>Approved Date</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{formattedDate}</Text>
          </Column>
        </Row>
      </Section>
      
      <Text style={paragraph}>
        You can now proceed with the next steps for this project. View the complete quote details and download supporting documents.
      </Text>
      
      <div style={buttonContainer}>
        <Button href={quoteUrl}>View Quote Details</Button>
      </div>
    </Layout>
  );
}

export function render(data: QuoteApprovedData): RenderResult {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency || 'USD',
  }).format(data.totalAmount);
  
  return {
    subject: `Quote Approved: ${data.quoteName} - ${formattedAmount}`,
    html: "",
    previewText: `Your quote for ${data.projectName} has been approved!`,
  };
}

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  color: "#1e293b",
};

const successBanner = {
  backgroundColor: "#dcfce7",
  padding: "16px",
  borderRadius: "8px",
  textAlign: "center" as const,
  margin: "0 0 20px 0",
};

const successText = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#166534",
  margin: "0",
};

const paragraph = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 12px 0",
  color: "#475569",
};

const quoteCard = {
  backgroundColor: "#f8fafc",
  padding: "20px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  margin: "16px 0",
};

const quoteTitle = {
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px 0",
  color: "#1e293b",
  paddingBottom: "12px",
  borderBottom: "1px solid #e2e8f0",
};

const infoRow = {
  marginBottom: "12px",
};

const labelColumn = {
  width: "140px",
};

const valueColumn = {};

const label = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#64748b",
  margin: "0",
};

const value = {
  fontSize: "14px",
  color: "#1e293b",
  margin: "0",
};

const amountValue = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#2563eb",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};
