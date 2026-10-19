import React from "react";
import { Text, Heading, Section } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { ComplianceAlertData, RenderResult } from "@shared/events/notification-events";

export function ComplianceAlertEmail({ 
  projectName, 
  violationType, 
  severity, 
  description, 
  affectedOpenings, 
  complianceUrl,
  recommendations 
}: ComplianceAlertData) {
  const severityConfig = {
    critical: {
      emoji: "🚨",
      color: "#dc2626",
      bgColor: "#fee2e2",
      label: "Critical",
    },
    warning: {
      emoji: "⚠️",
      color: "#ea580c",
      bgColor: "#fed7aa",
      label: "Warning",
    },
    info: {
      emoji: "ℹ️",
      color: "#2563eb",
      bgColor: "#dbeafe",
      label: "Info",
    },
  };
  
  const config = severityConfig[severity];

  return (
    <Layout preview={`${config.emoji} Compliance Alert: ${violationType} in ${projectName}`}>
      <Heading style={heading}>Compliance Alert</Heading>
      
      <Section style={{...alertBanner, backgroundColor: config.bgColor}}>
        <Text style={{...alertText, color: config.color}}>
          {config.emoji} {config.label}: {violationType}
        </Text>
      </Section>
      
      <Text style={paragraph}>
        A building code compliance issue has been detected in <strong>{projectName}</strong>.
      </Text>
      
      <Section style={violationCard}>
        <Text style={violationLabel}>Violation Type</Text>
        <Text style={violationTitle}>{violationType}</Text>
        
        <Text style={descriptionLabel}>Description</Text>
        <Text style={descriptionText}>{description}</Text>
        
        <Text style={impactLabel}>Impact</Text>
        <Text style={impactText}>
          {affectedOpenings} {affectedOpenings === 1 ? 'opening' : 'openings'} affected
        </Text>
      </Section>
      
      {recommendations && recommendations.length > 0 && (
        <Section style={recommendationsSection}>
          <Text style={recommendationsTitle}>Recommended Actions</Text>
          <ul style={list}>
            {recommendations.map((rec, index) => (
              <li key={index} style={listItem}>{rec}</li>
            ))}
          </ul>
        </Section>
      )}
      
      <Text style={paragraph}>
        Please review this compliance issue and take appropriate action to ensure your project meets all building code requirements.
      </Text>
      
      <div style={buttonContainer}>
        <Button href={complianceUrl}>Review Compliance Details</Button>
      </div>
      
      <Text style={urgencyNote}>
        {severity === 'critical' && '⚠️ Critical violations must be addressed immediately to proceed with the project.'}
        {severity === 'warning' && 'This warning should be addressed to ensure code compliance.'}
        {severity === 'info' && 'This is informational and should be noted for project documentation.'}
      </Text>
    </Layout>
  );
}

export function render(data: ComplianceAlertData): RenderResult {
  const severityEmoji = {
    critical: "🚨",
    warning: "⚠️",
    info: "ℹ️",
  }[data.severity];
  
  return {
    subject: `${severityEmoji} Compliance Alert: ${data.violationType} - ${data.projectName}`,
    html: "",
    previewText: `${severityEmoji} ${data.severity.toUpperCase()}: ${data.violationType} detected in ${data.projectName}`,
  };
}

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  color: "#1e293b",
};

const alertBanner = {
  padding: "16px",
  borderRadius: "8px",
  textAlign: "center" as const,
  margin: "0 0 20px 0",
};

const alertText = {
  fontSize: "16px",
  fontWeight: "700",
  margin: "0",
};

const paragraph = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 12px 0",
  color: "#475569",
};

const violationCard = {
  backgroundColor: "#f8fafc",
  padding: "20px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  margin: "16px 0",
};

const violationLabel = {
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  color: "#94a3b8",
  margin: "0 0 4px 0",
};

const violationTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e293b",
  margin: "0 0 16px 0",
};

const descriptionLabel = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#64748b",
  margin: "16px 0 8px 0",
};

const descriptionText = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#475569",
  margin: "0 0 16px 0",
};

const impactLabel = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#64748b",
  margin: "0 0 4px 0",
};

const impactText = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#dc2626",
  margin: "0",
};

const recommendationsSection = {
  margin: "20px 0",
};

const recommendationsTitle = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#1e293b",
  margin: "0 0 12px 0",
};

const list = {
  margin: "0",
  paddingLeft: "24px",
};

const listItem = {
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 8px 0",
  color: "#475569",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const urgencyNote = {
  fontSize: "13px",
  fontWeight: "500",
  color: "#64748b",
  padding: "12px",
  backgroundColor: "#fef9c3",
  borderLeft: "4px solid #eab308",
  borderRadius: "4px",
  margin: "20px 0 0 0",
};
