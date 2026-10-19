import React from "react";
import { Text, Heading, Section } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { ApprovalRequestedData, RenderResult } from "@shared/events/notification-events";

export function ApprovalRequestedEmail({ 
  approverName,
  requesterName, 
  projectName, 
  projectLocation, 
  proposalType,
  totalAmount,
  approvalUrl,
  projectUrl,
  organizationName,
  dueDate
}: ApprovalRequestedData) {
  const proposalTypeLabel = {
    "quote": "Quote",
    "change-order": "Change Order",
    "scope-change": "Scope Change"
  }[proposalType];

  return (
    <Layout preview={`${requesterName} requested your approval for ${projectName}`}>
      <Heading style={heading}>Approval Required</Heading>
      <Text style={paragraph}>
        <strong>{requesterName}</strong> has requested your approval for a {proposalTypeLabel.toLowerCase()} on <strong>{projectName}</strong>.
      </Text>
      
      <Section style={projectCard}>
        <Text style={projectTitle}>{projectName}</Text>
        <Text style={projectLocationStyle}>{projectLocation}</Text>
      </Section>

      <Section style={approvalCard}>
        <Text style={approvalLabel}>Approval Details:</Text>
        <div style={detailRow}>
          <Text style={detailLabel}>Type:</Text>
          <Text style={detailValue}>{proposalTypeLabel}</Text>
        </div>
        {totalAmount && (
          <div style={detailRow}>
            <Text style={detailLabel}>Amount:</Text>
            <Text style={detailValue}>{totalAmount}</Text>
          </div>
        )}
        {dueDate && (
          <div style={detailRow}>
            <Text style={detailLabel}>Due Date:</Text>
            <Text style={detailValue}>{dueDate.toLocaleDateString()}</Text>
          </div>
        )}
      </Section>
      
      <div style={buttonContainer}>
        <Button href={approvalUrl}>Review & Approve</Button>
      </div>
      
      <Text style={paragraph}>
        Please review the details and approve or reject this {proposalTypeLabel.toLowerCase()} at your earliest convenience.
      </Text>
    </Layout>
  );
}

export function render(data: ApprovalRequestedData): Omit<RenderResult, "html"> {
  const proposalTypeLabel = {
    "quote": "Quote",
    "change-order": "Change Order",
    "scope-change": "Scope Change"
  }[data.proposalType];

  return {
    subject: `Approval Required: ${proposalTypeLabel} for ${data.projectName}`,
    previewText: `${data.requesterName} requested your approval for ${data.projectName}`,
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

const projectCard = {
  backgroundColor: "#f8fafc",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  margin: "16px 0",
};

const projectTitle = {
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 8px 0",
  color: "#1e293b",
};

const projectLocationStyle = {
  fontSize: "14px",
  margin: "0",
  color: "#64748b",
};

const approvalCard = {
  backgroundColor: "#fef3c7",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #fde68a",
  margin: "16px 0",
};

const approvalLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px 0",
  color: "#92400e",
};

const detailRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
};

const detailLabel = {
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
  color: "#78350f",
};

const detailValue = {
  fontSize: "14px",
  margin: "0",
  color: "#1e293b",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};
