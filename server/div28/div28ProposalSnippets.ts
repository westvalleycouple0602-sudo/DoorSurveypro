// server/div28/div28ProposalSnippets.ts
// Division 28 Proposal Text Generation

import { v4 as uuidv4 } from "uuid";
import type {
  Div28Feature,
  Div28OpportunitySummary,
  OpeningProposalPackage,
  ProposalTextBlock,
} from "@shared/types/div28";

interface ProposalTemplate {
  feature: Div28Feature;
  title: string;
  bodyTemplate: string;
}

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    feature: "ACCESS_CONTROL",
    title: "Electronic Access Control",
    bodyTemplate:
      "We recommend electronic access control for this opening to provide secure, auditable entry. This includes an electronic credential reader (card, fob, or mobile), electric strike or electrified lock hardware, and connection to the building's access control system. Benefits include centralized credential management, audit trail, and remote lock/unlock capability.",
  },
  {
    feature: "DOOR_AUTOMATION",
    title: "Automatic Door Operator",
    bodyTemplate:
      "An automatic door operator is recommended for this opening to improve accessibility, reduce touchpoints, and accommodate high-traffic flow. Options include low-energy swing operators (ADA compliant) or full-power operators for heavy use. Activation can be via push plate, motion sensor, or access control integration.",
  },
  {
    feature: "CONTROLLED_EGRESS",
    title: "Controlled Egress System",
    bodyTemplate:
      "This opening requires controlled egress to manage exit from secure areas while maintaining life safety compliance. The system includes integration with the access control system, fire alarm release, and appropriate signage. AHJ approval is required.",
  },
  {
    feature: "DELAYED_EGRESS",
    title: "Delayed Egress Device",
    bodyTemplate:
      "A delayed egress device is specified for this opening per code requirements. The device provides an audible alarm and 15-30 second delay before unlocking (per NFPA 101 / IBC). Fire alarm integration for immediate release and proper signage are included.",
  },
  {
    feature: "SURVEILLANCE",
    title: "Video Surveillance Integration",
    bodyTemplate:
      "Video surveillance at this opening is recommended for security monitoring and incident documentation. Options include a dedicated camera at the door, integration with existing video management systems, or AI-enabled analytics for threat detection and people counting.",
  },
  {
    feature: "INTRUSION_DETECTION",
    title: "Intrusion Detection Devices",
    bodyTemplate:
      "Intrusion detection is recommended for this opening to monitor unauthorized access. Devices include door position contacts (open/close monitoring), motion detectors, and/or glassbreak sensors. Integration with the building's intrusion alarm panel is included.",
  },
  {
    feature: "GUN_DETECTION_READY",
    title: "Threat/Gun Detection Readiness",
    bodyTemplate:
      "Based on security requirements, we recommend evaluating AI-powered threat detection solutions for this area. These systems use video analytics to identify potential weapons or threatening behavior, enabling rapid lockdown response. Camera placement and access control integration will be coordinated.",
  },
  {
    feature: "LOCKDOWN_CONTROL",
    title: "Lockdown Integration",
    bodyTemplate:
      "This opening is included in the building's lockdown protocol. The door hardware will be configured to respond to lockdown commands (immediate lock, deny egress if safe, or other configured behavior). Integration with the lockdown controller and notification systems is included.",
  },
];

const TEMPLATE_MAP = new Map<Div28Feature, ProposalTemplate>(
  PROPOSAL_TEMPLATES.map((t) => [t.feature, t])
);

export function buildOpeningProposalPackage(
  openingId: string,
  openingLabel: string,
  opportunity: Div28OpportunitySummary | null
): OpeningProposalPackage {
  if (!opportunity || opportunity.recommendedFeatures.length === 0) {
    return {
      openingId,
      summary: `${openingLabel}: No Division 28 electronic security upgrades recommended based on the survey responses.`,
      baseOptionText:
        "The base option includes Division 8 door, frame, and hardware as specified. No additional Division 28 electronic security components are included.",
      upgradeOptions: [],
    };
  }

  const upgradeBlocks: ProposalTextBlock[] = [];

  for (const feature of opportunity.recommendedFeatures) {
    const template = TEMPLATE_MAP.get(feature);
    if (!template) continue;

    upgradeBlocks.push({
      id: uuidv4(),
      title: template.title,
      body: template.bodyTemplate,
      appliesToFeatures: [feature],
    });
  }

  const tierDescriptions: Record<string, string> = {
    LOW: "basic",
    MEDIUM: "moderate",
    HIGH: "significant",
  };

  const summary = `${openingLabel}: ${tierDescriptions[opportunity.tier] || "moderate"} Division 28 opportunity identified (score: ${opportunity.score}). ${opportunity.recommendedFeatures.length} electronic security feature${opportunity.recommendedFeatures.length !== 1 ? "s" : ""} recommended.`;

  const baseOptionText =
    "The base option includes Division 8 door, frame, and hardware as specified. Division 28 electronic security components listed below are optional upgrades that can be added to enhance security and accessibility.";

  return {
    openingId,
    summary,
    baseOptionText,
    upgradeOptions: upgradeBlocks,
  };
}

export function getProposalTemplates(): ProposalTemplate[] {
  return PROPOSAL_TEMPLATES;
}
