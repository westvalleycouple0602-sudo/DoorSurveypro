import React from "react";
import { Text, Heading, Section } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { CommentMentionData, RenderResult } from "@shared/events/notification-events";

export function CommentMentionEmail({ 
  mentionedUserName,
  authorName, 
  commentText, 
  projectName, 
  projectLocation, 
  commentUrl,
  projectUrl,
  organizationName
}: CommentMentionData) {
  return (
    <Layout preview={`${authorName} mentioned you in a comment on ${projectName}`}>
      <Heading style={heading}>You were mentioned in a comment</Heading>
      <Text style={paragraph}>
        <strong>{authorName}</strong> mentioned you in a comment on <strong>{projectName}</strong>.
      </Text>
      
      <Section style={projectCard}>
        <Text style={projectTitle}>{projectName}</Text>
        <Text style={projectLocationStyle}>{projectLocation}</Text>
      </Section>

      <Section style={commentCard}>
        <Text style={commentLabel}>Comment:</Text>
        <Text style={commentBodyStyle}>{commentText}</Text>
      </Section>
      
      <div style={buttonContainer}>
        <Button href={commentUrl}>View Comment</Button>
      </div>
      
      <div style={secondaryButtonContainer}>
        <a href={projectUrl} style={secondaryLink}>View Full Project</a>
      </div>
    </Layout>
  );
}

export function render(data: CommentMentionData): Omit<RenderResult, "html"> {
  return {
    subject: `${data.authorName} mentioned you in ${data.projectName}`,
    previewText: `${data.authorName} mentioned you in a comment on ${data.projectName}`,
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

const commentCard = {
  backgroundColor: "#fffbeb",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #fef3c7",
  margin: "16px 0",
};

const commentLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
  color: "#92400e",
};

const commentBodyStyle = {
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

const secondaryButtonContainer = {
  textAlign: "center" as const,
  margin: "12px 0",
};

const secondaryLink = {
  color: "#64748b",
  fontSize: "14px",
  textDecoration: "underline",
};
