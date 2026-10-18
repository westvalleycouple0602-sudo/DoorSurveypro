import React from "react";
import { Text, Heading, Section } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { ProjectInvitationData, RenderResult } from "@shared/events/notification-events";

export function ProjectInvitationEmail({ 
  inviterName, 
  projectName, 
  projectLocation, 
  projectUrl, 
  organizationName 
}: ProjectInvitationData) {
  return (
    <Layout preview={`${inviterName} invited you to collaborate on ${projectName}`}>
      <Heading style={heading}>Project Collaboration Invitation</Heading>
      <Text style={paragraph}>
        <strong>{inviterName}</strong> has invited you to collaborate on a project in {organizationName}.
      </Text>
      
      <Section style={projectCard}>
        <Text style={projectTitle}>{projectName}</Text>
        <Text style={projectLocationStyle}>{projectLocation}</Text>
      </Section>

      <Text style={paragraph}>
        You now have access to view and edit this project, including:
      </Text>
      <ul style={list}>
        <li style={listItem}>Door openings and specifications</li>
        <li style={listItem}>Hardware schedules and selections</li>
        <li style={listItem}>Cost estimates and quotes</li>
        <li style={listItem}>Compliance validations</li>
      </ul>
      
      <div style={buttonContainer}>
        <Button href={projectUrl}>View Project</Button>
      </div>
      
      <Text style={paragraph}>
        If you have any questions about this project, reach out to {inviterName} or your team administrator.
      </Text>
    </Layout>
  );
}

export function render(data: ProjectInvitationData): RenderResult {
  return {
    subject: `Invitation: ${data.projectName} - ${data.organizationName}`,
    html: "",
    previewText: `${data.inviterName} invited you to collaborate on ${data.projectName}`,
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

const list = {
  margin: "0 0 16px 0",
  paddingLeft: "24px",
};

const listItem = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px 0",
  color: "#475569",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};
