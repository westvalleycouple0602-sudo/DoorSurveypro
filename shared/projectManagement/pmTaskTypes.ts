// shared/projectManagement/pmTaskTypes.ts
// PM Task Types for Division 8 and Division 28 project management

export type PmPhase =
  | "PRE_CONTRACT"
  | "CONTRACT_EXECUTED"
  | "SUBMITTALS"
  | "PROCUREMENT"
  | "INSTALLATION"
  | "PUNCH"
  | "CLOSEOUT";

export type PmDiscipline =
  | "DIV8"
  | "DIV28"
  | "STRUCTURAL"
  | "ELECTRICAL"
  | "GENERAL"
  | "OTHER";

export type PmTaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "HOLD"
  | "COMPLETE"
  | "VOID";

export type PmTaskType =
  | "CHECKLIST"
  | "DOCUMENT"
  | "RFI"
  | "SUBMITTAL"
  | "MEETING_NOTE"
  | "CHANGE_ORDER"
  | "PROCUREMENT"
  | "FIELD_ISSUE";

export type PmFeatureTag =
  | "ACCESS_CONTROL"
  | "AUTOMATIC_OPERATORS"
  | "CONTROLLED_EGRESS"
  | "DELAYED_EGRESS"
  | "CAMERA_SURVEILLANCE"
  | "INTRUSION"
  | "LOCKDOWN"
  | "NETWORK_IT"
  | "FIRE_ALARM_INTEGRATION"
  | "CLOUD_LICENSES"
  | "POWER_SUPPLIES"
  | "COMMISSIONING"
  | "TRAINING"
  | "KEYING_CONFIDENTIALITY"
  | "GENERAL_SECURITY";

export interface PmTask {
  id: string;
  projectId: string;
  openingId?: string | null;
  phase: PmPhase;
  discipline: PmDiscipline;
  type: PmTaskType;
  title: string;
  description?: string | null;
  status: PmTaskStatus;
  assigneeName?: string | null;
  assigneeRole?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  redFlag: boolean;
  featureTags?: PmFeatureTag[];
}

export interface PmTimelineMilestone {
  id: string;
  projectId: string;
  label: string;
  phase: PmPhase;
  targetDate?: string | null;
  completedDate?: string | null;
}

export interface PmTaskTemplate {
  id: string;
  phase: PmPhase;
  discipline: PmDiscipline;
  type: PmTaskType;
  title: string;
  description: string;
  defaultRedFlag: boolean;
  featureTags?: PmFeatureTag[];
}

export const PM_PHASE_LABELS: Record<PmPhase, string> = {
  PRE_CONTRACT: "Pre-Contract",
  CONTRACT_EXECUTED: "Contract",
  SUBMITTALS: "Submittals",
  PROCUREMENT: "Procurement",
  INSTALLATION: "Installation",
  PUNCH: "Punch",
  CLOSEOUT: "Closeout",
};

export const PM_DISCIPLINE_LABELS: Record<PmDiscipline, string> = {
  DIV8: "Division 8",
  DIV28: "Division 28",
  STRUCTURAL: "Structural",
  ELECTRICAL: "Electrical",
  GENERAL: "General",
  OTHER: "Other",
};

export const PM_STATUS_LABELS: Record<PmTaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  HOLD: "On Hold",
  COMPLETE: "Complete",
  VOID: "Void",
};

export const PM_FEATURE_TAG_LABELS: Record<PmFeatureTag, string> = {
  ACCESS_CONTROL: "Access Control",
  AUTOMATIC_OPERATORS: "Automatic Operators",
  CONTROLLED_EGRESS: "Controlled Egress",
  DELAYED_EGRESS: "Delayed Egress",
  CAMERA_SURVEILLANCE: "Camera/Surveillance",
  INTRUSION: "Intrusion Detection",
  LOCKDOWN: "Lockdown",
  NETWORK_IT: "Network/IT",
  FIRE_ALARM_INTEGRATION: "Fire Alarm Integration",
  CLOUD_LICENSES: "Cloud Licenses",
  POWER_SUPPLIES: "Power Supplies",
  COMMISSIONING: "Commissioning",
  TRAINING: "Training",
  KEYING_CONFIDENTIALITY: "Keying Confidentiality",
  GENERAL_SECURITY: "General Security",
};
