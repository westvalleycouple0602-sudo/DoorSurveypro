import { Text, Heading, Hr } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Button } from "./components/Button.js";
import type { RenderResult } from "@shared/events/notification-events";

export interface ServiceRequestSubmittedEmailData {
  recipientName: string;
  requestNumber: string;
  requestTitle: string;
  submitterName: string;
  submitterEmail: string;
  submitterCompany?: string;
  locationName?: string;
  locationAddress?: string;
  priority: string;
  itemCount: number;
  hasPhotos: boolean;
  hasScans: boolean;
  triageDecision: string;
  queueUrl: string;
}

export function ServiceRequestSubmittedEmail({
  recipientName,
  requestNumber,
  requestTitle,
  submitterName,
  submitterEmail,
  submitterCompany,
  locationName,
  locationAddress,
  priority,
  itemCount,
  hasPhotos,
  hasScans,
  triageDecision,
  queueUrl,
}: ServiceRequestSubmittedEmailData) {
  const priorityLabel = {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  }[priority] || priority;

  const triageLabel = {
    quotable: "Ready to Quote",
    needs_site_visit: "Needs Site Visit",
    pending: "Pending Review",
  }[triageDecision] || triageDecision;

  const triageColor = {
    quotable: "#16a34a",
    needs_site_visit: "#ea580c",
    pending: "#6b7280",
  }[triageDecision] || "#6b7280";

  return (
    <Layout preview={`New service request ${requestNumber} from ${submitterName}`}>
      <Heading style={heading}>New Service Request</Heading>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        A new service request has been submitted through the client portal and requires your attention.
      </Text>
      
      <div style={detailsBox}>
        <Text style={detailsHeading}>Request Details</Text>
        <table style={detailsTable}>
          <tbody>
            <tr>
              <td style={labelCell}>Request #:</td>
              <td style={valueCell}><strong>{requestNumber}</strong></td>
            </tr>
            <tr>
              <td style={labelCell}>Title:</td>
              <td style={valueCell}>{requestTitle}</td>
            </tr>
            <tr>
              <td style={labelCell}>Priority:</td>
              <td style={valueCell}>
                <span style={{ 
                  ...priorityBadge, 
                  backgroundColor: priority === "urgent" ? "#fef2f2" : 
                                   priority === "high" ? "#fff7ed" : "#f0f9ff",
                  color: priority === "urgent" ? "#dc2626" : 
                         priority === "high" ? "#ea580c" : "#2563eb"
                }}>
                  {priorityLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style={labelCell}>Auto-Triage:</td>
              <td style={valueCell}>
                <span style={{ ...triageBadge, color: triageColor }}>{triageLabel}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Hr style={divider} />

      <div style={detailsBox}>
        <Text style={detailsHeading}>Submitter Information</Text>
        <table style={detailsTable}>
          <tbody>
            <tr>
              <td style={labelCell}>Name:</td>
              <td style={valueCell}>{submitterName}</td>
            </tr>
            <tr>
              <td style={labelCell}>Email:</td>
              <td style={valueCell}>{submitterEmail}</td>
            </tr>
            {submitterCompany && (
              <tr>
                <td style={labelCell}>Company:</td>
                <td style={valueCell}>{submitterCompany}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(locationName || locationAddress) && (
        <>
          <Hr style={divider} />
          <div style={detailsBox}>
            <Text style={detailsHeading}>Location</Text>
            <table style={detailsTable}>
              <tbody>
                {locationName && (
                  <tr>
                    <td style={labelCell}>Site Name:</td>
                    <td style={valueCell}>{locationName}</td>
                  </tr>
                )}
                {locationAddress && (
                  <tr>
                    <td style={labelCell}>Address:</td>
                    <td style={valueCell}>{locationAddress}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Hr style={divider} />

      <div style={summaryBox}>
        <Text style={summaryText}>
          <strong>{itemCount}</strong> door item{itemCount !== 1 ? "s" : ""} included
          {hasPhotos && " | Photos attached"}
          {hasScans && " | LiDAR scans included"}
        </Text>
      </div>

      <div style={buttonContainer}>
        <Button href={queueUrl}>View in Service Queue</Button>
      </div>

      <Text style={paragraph}>
        Best regards,<br />
        DoorSurvey Pro System
      </Text>
    </Layout>
  );
}

export function render(data: ServiceRequestSubmittedEmailData): RenderResult {
  return {
    subject: `New Service Request ${data.requestNumber} - ${data.triageDecision === "quotable" ? "Ready to Quote" : "Needs Review"}`,
    html: "",
    previewText: `New request from ${data.submitterName}: ${data.requestTitle}`,
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

const detailsBox = {
  margin: "16px 0",
};

const detailsHeading = {
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px 0",
  color: "#1e293b",
};

const detailsTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const labelCell = {
  fontSize: "14px",
  color: "#64748b",
  padding: "4px 12px 4px 0",
  verticalAlign: "top" as const,
  width: "100px",
};

const valueCell = {
  fontSize: "14px",
  color: "#1e293b",
  padding: "4px 0",
  verticalAlign: "top" as const,
};

const priorityBadge = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: "500",
};

const triageBadge = {
  fontWeight: "600",
  fontSize: "14px",
};

const divider = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "16px 0",
};

const summaryBox = {
  backgroundColor: "#f8fafc",
  padding: "12px",
  borderRadius: "6px",
  margin: "16px 0",
};

const summaryText = {
  fontSize: "14px",
  color: "#475569",
  margin: 0,
  textAlign: "center" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};
