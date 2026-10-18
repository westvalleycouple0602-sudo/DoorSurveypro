// shared/types/div28.ts
// Division 28 Electronic Safety & Security Types

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AreaType =
  | "PUBLIC"
  | "STAFF_ONLY"
  | "CRITICAL_CARE"
  | "PHARMACY"
  | "BEHAVIORAL_HEALTH"
  | "IT_DATA_CENTER"
  | "ADMIN"
  | "OTHER";

export type AccessControlMode =
  | "NONE"
  | "MECHANICAL_ONLY"
  | "BADGE_CARD"
  | "PIN_KEYPAD"
  | "BADGE_PLUS_PIN"
  | "MOBILE_CREDENTIAL";

export type LockdownCoverage =
  | "NONE"
  | "LOCAL_ONLY"
  | "ZONE_LOCKDOWN"
  | "BUILDING_LOCKDOWN";

export type EgressType =
  | "FREE_EGRESS"
  | "CONTROLLED_EGRESS"
  | "DELAYED_EGRESS"
  | "SPECIAL_LOCKING_ARRANGEMENT";

export type SurveillanceLevel =
  | "NONE"
  | "LOCAL_CAMERA"
  | "EXISTING_VIDEO_INTEGRATION"
  | "ANALYTICS_READY";

export type IntrusionLevel =
  | "NONE"
  | "DOOR_CONTACT_ONLY"
  | "DOOR_PLUS_MOTION"
  | "DOOR_PLUS_GLASSBREAK";

export type GunDetectionIntent = "NONE" | "INTERESTED" | "REQUIRED";

export type Div28Feature =
  | "ACCESS_CONTROL"
  | "DOOR_AUTOMATION"
  | "CONTROLLED_EGRESS"
  | "DELAYED_EGRESS"
  | "SURVEILLANCE"
  | "INTRUSION_DETECTION"
  | "GUN_DETECTION_READY"
  | "LOCKDOWN_CONTROL";

export interface Div28SurveyAnswers {
  openingId: string;
  areaType: AreaType;
  riskLevel: RiskLevel;
  accessControlMode: AccessControlMode;
  requiresAuditTrail: boolean;
  scheduledLockUnlock: boolean;
  egressType: EgressType;
  unsureAboutEgressCode: boolean;
  heavyOrHighTraffic: boolean;
  adaPriority: boolean;
  infectionControlPriority: boolean;
  surveillanceLevel: SurveillanceLevel;
  intrusionLevel: IntrusionLevel;
  lockdownCoverage: LockdownCoverage;
  gunDetectionIntent: GunDetectionIntent;
  notes?: string;
}

export interface Div28OpportunitySummary {
  openingId: string;
  score: number;
  tier: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  recommendedFeatures: Div28Feature[];
  narrativeSummary: string;
  warnings: string[];
}

export type Div28TaskRole =
  | "SALES"
  | "ENGINEERING"
  | "SECURITY_INTEGRATOR"
  | "PROJECT_MANAGER";

export interface Div28TaskTemplate {
  id: string;
  feature: Div28Feature;
  title: string;
  description: string;
  defaultAssigneeRole: Div28TaskRole;
  suggestedDueOffsetDays: number;
}

export interface GeneratedDiv28Task {
  id: string;
  projectId: string;
  openingId: string;
  feature: Div28Feature;
  title: string;
  description: string;
  assigneeRole: Div28TaskRole;
  suggestedDueOffsetDays: number;
}

export interface ProposalTextBlock {
  id: string;
  title: string;
  body: string;
  appliesToFeatures: Div28Feature[];
}

export interface OpeningProposalPackage {
  openingId: string;
  summary: string;
  baseOptionText: string;
  upgradeOptions: ProposalTextBlock[];
}

export type FormFieldType = "select" | "boolean" | "textarea";

export interface Div28FormFieldOption {
  value: string;
  label: string;
}

export interface Div28FormField {
  id: keyof Div28SurveyAnswers;
  label: string;
  type: FormFieldType;
  helpText?: string;
  options?: Div28FormFieldOption[];
}

export interface Div28FormSection {
  id: string;
  title: string;
  description?: string;
  fields: Div28FormField[];
}

export type PricingMode =
  | "LINE_ITEM"
  | "OPENING_PACKAGE"
  | "PROJECT_SUMMARY";

export interface Div28ExportMode {
  mode: "NONE" | "INLINE" | "APPENDIX";
  flagAsOptional: boolean;
  showDiv28Disclaimer: boolean;
}

export interface QuoteExportOptions {
  pricingMode: PricingMode;
  showTaxes: boolean;
  showLaborBreakout: boolean;
  showOpeningBreakdown: boolean;
  div28: Div28ExportMode;
  includeAlternateOption: boolean;
  includeConfidentialTerms: boolean;
}

export interface AlternatePricingAdjustment {
  percentDelta: number;
  label: string;
  notes?: string;
}

export interface AlternateOptionText {
  heading: string;
  bodyPlain: string;
  bodyMarkdown: string;
}

export interface RenderedProposalText {
  plainText: string;
  markdown: string;
  html: string;
}
