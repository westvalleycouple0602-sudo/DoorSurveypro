import React from "react";
import { Text, Heading, Section } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { ApprovalRejectedData, RenderResult } from "@shared/events/notification-events";

export function ApprovalRejectedEmail({ 
  requesterName,
  approverName, 
  projectName, 
  projectLocation, 
  proposalType,
  totalAmount,
  rejectedAt,
  projectUrl,
  organizationName,
  rejectionReason
}: ApprovalRejectedData) {
  const proposalTypeLabel = {
    "quote": "Quote",
    "change-order": "Change Order",
    "scope-change": "Scope Change"
  }[proposalType];

  return (
    <Layout preview={`${approverName} provided feedback on your ${proposalTypeLabel.toLowerCase()} for ${projectName}`}>
      <Heading style={heading}>Approval Feedback Required</Heading>
      <Text style={paragraph}>
        <strong>{approverName}</strong> has provided feedback on your {proposalTypeLabel.toLowerCase()} for <strong>{projectName}</strong> and requested changes.
      </Text>
      
      <Section style={projectCard}>
        <Text style={projectTitle}>{projectName}</Text>
        <Text style={projectLocationStyle}>{projectLocation}</Text>
      </Section>

      <Section style={rejectionCard}>
        <Text style={rejectionLabel}>Feedback Details:</Text>
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
          <Text style={detailLabel}>Reviewed By:</Text>
          <Text style={detailValue}>{approverName}</Text>
        </div>
        <div style={detailRow}>
          <Text style={detailLabel}>Reviewed At:</Text>
          <Text style={detailValue}>{rejectedAt.toLocaleString()}</Text>
        </div>
      </Section>

      {rejectionReason && (
        <Section style={reasonCard}>
          <Text style={reasonLabel}>Feedback & Requested Changes:</Text>
          <Text style={reasonText}>{rejectionReason}</Text>
        </Section>
      )}
      
      <div style={buttonContainer}>
        <Button href={projectUrl}>Review & Update</Button>
      </div>
      
      <Text style={paragraph}>
        Please review the feedback and make the necessary changes to your {proposalTypeLabel.toLowerCase()}. Once updated, you can resubmit for approval.
      </Text>
    </Layout>
  );
}

export function render(data: ApprovalRejectedData): Omit<RenderResult, "html"> {
  const proposalTypeLabel = {
    "quote": "Quote",
    "change-order": "Change Order",
    "scope-change": "Scope Change"
  }[data.proposalType];

  return {
    subject: `Feedback Required: ${proposalTypeLabel} for ${data.projectName}`,
    previewText: `${data.approverName} provided feedback on your ${proposalTypeLabel.toLowerCase()} for ${data.projectName}`,
  };
}

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  color: "#b45309",
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

const rejectionCard = {
  backgroundColor: "#fef3c7",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #fde68a",
  margin: "16px 0",
};

const rejectionLabel = {
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

const reasonCard = {
  backgroundColor: "#fef2f2",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #fecaca",
  margin: "16px 0",
};

const reasonLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
  color: "#991b1b",
};

const reasonText = {
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
