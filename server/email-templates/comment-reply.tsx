import React from "react";
import { Text, Heading, Section } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { CommentReplyData, RenderResult } from "@shared/events/notification-events";

export function CommentReplyEmail({ 
  recipientName,
  authorName, 
  replyText,
  originalCommentText, 
  projectName, 
  projectLocation, 
  commentUrl,
  projectUrl,
  organizationName
}: CommentReplyData) {
  return (
    <Layout preview={`${authorName} replied to your comment on ${projectName}`}>
      <Heading style={heading}>New reply to your comment</Heading>
      <Text style={paragraph}>
        <strong>{authorName}</strong> replied to your comment on <strong>{projectName}</strong>.
      </Text>
      
      <Section style={projectCard}>
        <Text style={projectTitle}>{projectName}</Text>
        <Text style={projectLocationStyle}>{projectLocation}</Text>
      </Section>

      <Section style={originalCommentCard}>
        <Text style={commentLabel}>Your Comment:</Text>
        <Text style={commentBodyStyle}>{originalCommentText}</Text>
      </Section>

      <Section style={replyCard}>
        <Text style={commentLabel}>Reply:</Text>
        <Text style={commentBodyStyle}>{replyText}</Text>
      </Section>
      
      <div style={buttonContainer}>
        <Button href={commentUrl}>View Thread</Button>
      </div>
      
      <div style={secondaryButtonContainer}>
        <a href={projectUrl} style={secondaryLink}>View Full Project</a>
      </div>
    </Layout>
  );
}

export function render(data: CommentReplyData): Omit<RenderResult, "html"> {
  return {
    subject: `${data.authorName} replied to your comment on ${data.projectName}`,
    previewText: `${data.authorName} replied to your comment on ${data.projectName}`,
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

const originalCommentCard = {
  backgroundColor: "#f8fafc",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  margin: "16px 0",
};

const replyCard = {
  backgroundColor: "#eff6ff",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #dbeafe",
  margin: "16px 0",
};

const commentLabel = {
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
  color: "#64748b",
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
