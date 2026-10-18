import React from "react";
import { Text, Heading, Section } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { ApprovalApprovedData, RenderResult } from "@shared/events/notification-events";

export function ApprovalApprovedEmail({ 
  requesterName,
  approverName, 
  projectName, 
  projectLocation, 
  proposalType,
  totalAmount,
  approvedAt,
  projectUrl,
  organizationName,
  approverComments
}: ApprovalApprovedData) {
  const proposalTypeLabel = {
    "quote": "Quote",
    "change-order": "Change Order",
    "scope-change": "Scope Change"
  }[proposalType];

  return (
    <Layout preview={`${approverName} approved your ${proposalTypeLabel.toLowerCase()} for ${projectName}`}>
      <Heading style={heading}>✓ Approval Granted</Heading>
      <Text style={paragraph}>
        Great news! <strong>{approverName}</strong> has approved your {proposalTypeLabel.toLowerCase()} for <strong>{projectName}</strong>.
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
        <div style={detailRow}>
          <Text style={detailLabel}>Approved By:</Text>
          <Text style={detailValue}>{approverName}</Text>
        </div>
        <div style={detailRow}>
          <Text style={detailLabel}>Approved At:</Text>
          <Text style={detailValue}>{approvedAt.toLocaleString()}</Text>
        </div>
      </Section>

      {approverComments && (
        <Section style={commentsCard}>
          <Text style={commentsLabel}>Approver Comments:</Text>
          <Text style={commentsText}>{approverComments}</Text>
        </Section>
      )}
      
      <div style={buttonContainer}>
        <Button href={projectUrl}>View Project</Button>
      </div>
      
      <Text style={paragraph}>
        You can now proceed with this {proposalTypeLabel.toLowerCase()}. Visit the project page to continue working on it.
      </Text>
    </Layout>
  );
}

export function render(data: ApprovalApprovedData): Omit<RenderResult, "html"> {
  const proposalTypeLabel = {
    "quote": "Quote",
    "change-order": "Change Order",
    "scope-change": "Scope Change"
  }[data.proposalType];

  return {
    subject: `✓ Approved: ${proposalTypeLabel} for ${data.projectName}`,
    previewText: `${data.approverName} approved your ${proposalTypeLabel.toLowerCase()} for ${data.projectName}`,
  };
}

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  color: "#166534",
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
  backgroundColor: "#dcfce7",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #bbf7d0",
  margin: "16px 0",
};

const approvalLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px 0",
  color: "#166534",
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
  color: "#15803d",
};

const detailValue = {
  fontSize: "14px",
  margin: "0",
  color: "#1e293b",
};

const commentsCard = {
  backgroundColor: "#f8fafc",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  margin: "16px 0",
};

const commentsLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
  color: "#64748b",
};

const commentsText = {
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
  color: "#1e293b",
  whiteSpace: "pre-wrap" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};
