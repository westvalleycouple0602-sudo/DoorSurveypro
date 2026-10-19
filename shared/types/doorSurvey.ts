// shared/types/doorSurvey.ts
// Door Survey Types for DoorSurvey Pro multi-step workflow

export type BuildingCodeStandard = "ADA" | "IBC" | "NFPA" | "ANSI_SDI" | "LOCAL" | "DIV08" | "DIV28";

export interface AHJInfo {
  name: string;
  type: "Building Department" | "Fire Marshal" | "Code Enforcement" | "Planning & Development" | "Construction Services";
  phone: string;
  website: string;
  address?: string;
}

export interface JurisdictionDetection {
  state: string | null;
  stateName: string | null;
  city: string | null;
  confidence: "high" | "medium" | "low";
  jurisdictionCode: string;
  ibcEdition: string;
  localCodeName: string | null;
  localAmendments: string[];
  autoDetectedStandards: BuildingCodeStandard[];
  userOverridden: boolean;
  ahj?: AHJInfo;
}

export interface DoorSurveyProject {
  id?: string;
  name: string;
  location: string;
  customerId?: string;
  buildingType: string;
  quoteType: "none" | "budget" | "proposal" | "change_order";
  standards: BuildingCodeStandard[];
  jurisdiction?: JurisdictionDetection;
}

export interface Measurements {
  roughWidthMm: number;
  roughHeightMm: number;
  clearWidthMm: number;
  headHeightMm: number;
  jambDepthMm: number;
  doorThicknessMm: number;
  sillHeightMm?: number;
}

export type OpeningType =
  | "single"
  | "pair"
  | "sliding"
  | "folding"
  | "revolving"
  | "other";

export type Handing = "RH" | "LH" | "RHR" | "LHR";

export interface DoorLeaf {
  leafType: "flush" | "full_glass" | "half_glass" | "narrow_lite";
  coreType: "solid" | "hollow" | "mineral" | "stc";
  fireRatingMinutes: number;
  hasVisionLite: boolean;
  visionLiteDescription?: string;
  manufacturer?: string;
  model?: string;
}

export interface Frame {
  material: "hollow_metal" | "aluminum" | "wood";
  profile: string;
  anchorType: "existing" | "new" | "steel";
  conditionScore: 1 | 2 | 3 | 4 | 5;
  fireLabelPresent?: boolean;
  fireLabelRating?: number;
  notes?: string;
  levelCheck?: "pass" | "fail" | "marginal";
  plumbCheck?: "pass" | "fail" | "marginal";
  squareCheck?: "pass" | "fail" | "marginal";
  straightnessCheck?: "pass" | "fail" | "marginal";
  twistObserved?: boolean;
  swingCheck?: "pass" | "fail" | "marginal";
  driftObserved?: boolean;
  revealLeft?: string;
  revealRight?: string;
  revealTop?: string;
  undercutGap?: string;
  revealUniformity?: "uniform" | "non_uniform" | "not_checked";
  revealNotes?: string;
}

export interface HardwarePiece {
  type:
    | "hinge"
    | "lockset"
    | "exit_device"
    | "closer"
    | "strike"
    | "electric_strike"
    | "mag_lock"
    | "operator"
    | "accessory";
  description: string;
  manufacturer?: string;
  model?: string;
  qty?: number;
}

export type ElectronicSecurityDeviceType =
  | "card_reader"
  | "keypad"
  | "door_contact"
  | "rex_device"
  | "request_to_exit_bar"
  | "camera"
  | "intercom"
  | "power_supply"
  | "fire_alarm_interface"
  | "other";

export interface ElectronicSecurityDevice {
  type: ElectronicSecurityDeviceType;
  description: string;
  manufacturer?: string;
  model?: string;
  qty?: number;
  monitored?: boolean;
  notes?: string;
}

export interface HardwareSet {
  hinges: HardwarePiece[];
  lockFunction: string;
  lockset: string;
  exitDevice?: string;
  closer?: string;
  accessories: HardwarePiece[];
  electrifiedHardware: HardwarePiece[];
  electronicSecurity?: ElectronicSecurityDevice[];
}

export interface ComplianceIssue {
  standard: BuildingCodeStandard;
  codeRef: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface ComplianceResult {
  standardsChecked: BuildingCodeStandard[];
  passes: boolean;
  issues: ComplianceIssue[];
  notes?: string;
}

export interface EvidenceFile {
  id?: string;
  type: "photo" | "video" | "document";
  url: string;
  label?: string;
}

export interface Evidence {
  photos: EvidenceFile[];
  videos: EvidenceFile[];
  documents: EvidenceFile[];
}

export interface EngineeringConflict {
  type: "hardware" | "fire_rating" | "egress" | "structure" | "electrical";
  message: string;
}

export interface EngineeringReview {
  status: "pending" | "approved" | "changes_required";
  notes?: string;
  conflicts: EngineeringConflict[];
}

export interface QuoteSummary {
  materialCost: number;
  laborCost: number;
  shippingCost: number;
  marginPercent: number;
  totalPrice: number;
  optionLabel: string;
}

// Division 28 Assessment integrated into door survey
export interface Div28Assessment {
  enabled: boolean;
  areaClassification?: string;
  trafficLevel?: string;
  securityLevel?: string;
  accessControlNeeded?: boolean;
  doorAutomationNeeded?: boolean;
  delayedEgressNeeded?: boolean;
  surveillanceNeeded?: boolean;
  intrusionDetectionNeeded?: boolean;
  lockdownControlNeeded?: boolean;
  score?: number;
  tier?: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  recommendedFeatures?: string[];
  warnings?: string[];
  proposalSummary?: string;
}

export interface DoorOpeningInput {
  id?: string;
  doorTag: string;
  openingName?: string;
  description?: string;
  floor: string;
  spaceName: string;
  openingType: OpeningType;
  handing: Handing;
  measurements: Measurements;
  doorLeaf: DoorLeaf;
  frame: Frame;
  hardware: HardwareSet;
  compliance: ComplianceResult;
  evidence: Evidence;
  engineeringReview: EngineeringReview;
  quoteSummary: QuoteSummary;
  div28Assessment?: Div28Assessment;
}

export interface DoorSurveyPayload {
  project: DoorSurveyProject;
  opening: DoorOpeningInput;
}

export type StepKey =
  | "project"
  | "mapping"
  | "measurements"
  | "door"
  | "frame"
  | "hardware"
  | "compliance"
  | "evidence"
  | "engineering"
  | "quote"
  | "review";

export interface WorkflowStep {
  key: StepKey;
  label: string;
  description?: string;
  fields: string[];
}

export interface DoorSurveyWorkflow {
  id: string;
  name: string;
  version: number;
  steps: WorkflowStep[];
}
