import React from "react";
import { Text, Heading, Section, Row, Column } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { ProjectStatusUpdateData, RenderResult } from "@shared/events/notification-events";

export function ProjectStatusUpdateEmail({ 
  projectName, 
  projectLocation, 
  previousStatus, 
  newStatus, 
  updatedBy, 
  projectUrl,
  notes
}: ProjectStatusUpdateData) {
  return (
    <Layout preview={`Project status updated: ${projectName} is now ${newStatus}`}>
      <Heading style={heading}>Project Status Update</Heading>
      <Text style={paragraph}>
        The status of <strong>{projectName}</strong> has been updated.
      </Text>
      
      <Section style={statusCard}>
        <Text style={projectTitle}>{projectName}</Text>
        <Text style={projectLocationStyle}>{projectLocation}</Text>
        
        <Row style={statusRow}>
          <Column style={statusColumn}>
            <Text style={statusLabel}>Previous Status</Text>
            <Text style={statusValue}>{previousStatus}</Text>
          </Column>
          <Column style={arrowColumn}>
            <Text style={arrow}>→</Text>
          </Column>
          <Column style={statusColumn}>
            <Text style={statusLabel}>New Status</Text>
            <Text style={statusValueNew}>{newStatus}</Text>
          </Column>
        </Row>
        
        <Text style={updatedByText}>Updated by {updatedBy}</Text>
        
        {notes && (
          <>
            <Text style={notesLabel}>Notes:</Text>
            <Text style={notesText}>{notes}</Text>
          </>
        )}
      </Section>
      
      <div style={buttonContainer}>
        <Button href={projectUrl}>View Project</Button>
      </div>
    </Layout>
  );
}

export function render(data: ProjectStatusUpdateData): RenderResult {
  return {
    subject: `Status Update: ${data.projectName} - ${data.newStatus}`,
    html: "",
    previewText: `${data.projectName} status changed to ${data.newStatus}`,
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

const statusCard = {
  backgroundColor: "#f8fafc",
  padding: "20px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  margin: "16px 0",
};

const projectTitle = {
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 4px 0",
  color: "#1e293b",
};

const projectLocationStyle = {
  fontSize: "14px",
  margin: "0 0 16px 0",
  color: "#64748b",
};

const statusRow = {
  marginTop: "16px",
  marginBottom: "16px",
};

const statusColumn = {
  textAlign: "center" as const,
};

const arrowColumn = {
  textAlign: "center" as const,
  width: "60px",
};

const arrow = {
  fontSize: "24px",
  color: "#94a3b8",
  margin: "16px 0",
};

const statusLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  color: "#94a3b8",
  margin: "0 0 8px 0",
};

const statusValue = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#64748b",
  margin: "0",
};

const statusValueNew = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#2563eb",
  margin: "0",
};

const updatedByText = {
  fontSize: "13px",
  color: "#64748b",
  margin: "16px 0 0 0",
  fontStyle: "italic" as const,
};

const notesLabel = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  margin: "16px 0 8px 0",
};

const notesText = {
  fontSize: "14px",
  color: "#475569",
  backgroundColor: "#ffffff",
  padding: "12px",
  borderRadius: "4px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};
