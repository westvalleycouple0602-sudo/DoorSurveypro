import React from "react";
import { Text, Heading, Section, Row, Column } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { MilestoneNotificationData, RenderResult } from "@shared/events/notification-events";

export function MilestoneNotificationEmail({ 
  projectName, 
  projectLocation,
  milestoneName, 
  milestoneDescription,
  completionDate, 
  pmName,
  pmEmail,
  nextMilestoneName,
  nextMilestoneTargetDate,
  projectUrl,
  milestoneProgress,
  notes
}: MilestoneNotificationData) {
  const formattedDate = new Date(completionDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedNextDate = nextMilestoneTargetDate 
    ? new Date(nextMilestoneTargetDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Layout preview={`Milestone Completed: ${milestoneName} for ${projectName}`}>
      <Heading style={heading}>Milestone Completed</Heading>
      <Text style={paragraph}>
        Great news! A milestone has been completed for one of your assigned projects.
      </Text>
      
      <Section style={milestoneCard}>
        <Text style={projectTitle}>{projectName}</Text>
        {projectLocation && <Text style={projectLocationStyle}>{projectLocation}</Text>}
        
        <Section style={completedBadge}>
          <Text style={completedBadgeText}>Completed</Text>
        </Section>
        
        <Text style={milestoneNameStyle}>{milestoneName}</Text>
        {milestoneDescription && <Text style={descriptionText}>{milestoneDescription}</Text>}
        
        <Text style={completionText}>Completed on {formattedDate}</Text>
        
        {milestoneProgress && (
          <Section style={progressSection}>
            <Text style={progressLabel}>Project Progress</Text>
            <Section style={progressBar}>
              <Section style={{ ...progressFill, width: `${milestoneProgress.completed}%` }} />
            </Section>
            <Text style={progressText}>
              {milestoneProgress.completed} of {milestoneProgress.total} milestones completed
            </Text>
          </Section>
        )}
        
        {notes && (
          <>
            <Text style={notesLabel}>Notes:</Text>
            <Text style={notesText}>{notes}</Text>
          </>
        )}
      </Section>
      
      {nextMilestoneName && (
        <Section style={nextMilestoneSection}>
          <Text style={nextMilestoneLabel}>Next Milestone</Text>
          <Row style={nextMilestoneRow}>
            <Column>
              <Text style={nextMilestoneNameStyle}>{nextMilestoneName}</Text>
            </Column>
            {formattedNextDate && (
              <Column style={nextMilestoneDateColumn}>
                <Text style={nextMilestoneDateStyle}>Target: {formattedNextDate}</Text>
              </Column>
            )}
          </Row>
        </Section>
      )}
      
      <Section style={pmSection}>
        <Text style={pmLabel}>Project Manager</Text>
        <Text style={pmNameStyle}>{pmName}</Text>
        {pmEmail && <Text style={pmEmailStyle}>{pmEmail}</Text>}
      </Section>
      
      <div style={buttonContainer}>
        <Button href={projectUrl}>View Project</Button>
      </div>
    </Layout>
  );
}

export function render(data: MilestoneNotificationData): RenderResult {
  return {
    subject: `Milestone Completed: ${data.milestoneName} - ${data.projectName}`,
    html: "",
    previewText: `${data.milestoneName} has been completed for ${data.projectName}`,
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

const milestoneCard = {
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

const completedBadge = {
  display: "inline-block",
  backgroundColor: "#dcfce7",
  padding: "4px 12px",
  borderRadius: "16px",
  marginBottom: "12px",
};

const completedBadgeText = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#166534",
  margin: "0",
};

const milestoneNameStyle = {
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
  color: "#1e293b",
};

const descriptionText = {
  fontSize: "14px",
  color: "#475569",
  margin: "0 0 12px 0",
};

const completionText = {
  fontSize: "13px",
  color: "#64748b",
  margin: "12px 0 0 0",
};

const progressSection = {
  marginTop: "16px",
  paddingTop: "16px",
  borderTop: "1px solid #e2e8f0",
};

const progressLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  color: "#94a3b8",
  margin: "0 0 8px 0",
};

const progressBar = {
  height: "8px",
  backgroundColor: "#e2e8f0",
  borderRadius: "4px",
  overflow: "hidden",
};

const progressFill = {
  height: "8px",
  backgroundColor: "#22c55e",
  borderRadius: "4px",
};

const progressText = {
  fontSize: "13px",
  color: "#64748b",
  margin: "8px 0 0 0",
};

const nextMilestoneSection = {
  backgroundColor: "#eff6ff",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
};

const nextMilestoneLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  color: "#3b82f6",
  margin: "0 0 8px 0",
};

const nextMilestoneRow = {
  marginTop: "4px",
};

const nextMilestoneNameStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1e3a8a",
  margin: "0",
};

const nextMilestoneDateColumn = {
  textAlign: "right" as const,
};

const nextMilestoneDateStyle = {
  fontSize: "13px",
  color: "#3b82f6",
  margin: "0",
};

const pmSection = {
  margin: "16px 0",
  padding: "12px",
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
};

const pmLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  color: "#94a3b8",
  margin: "0 0 4px 0",
};

const pmNameStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1e293b",
  margin: "0",
};

const pmEmailStyle = {
  fontSize: "13px",
  color: "#64748b",
  margin: "4px 0 0 0",
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
