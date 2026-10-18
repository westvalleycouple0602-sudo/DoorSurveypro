import type { 
  DivisionCode, 
  ProjectPMStatus, 
  ProcurementStatus, 
  IssueType, 
  IssueStatus, 
  IssueSeverity, 
  MilestoneStatus 
} from "../schema";

export type { DivisionCode, ProjectPMStatus, ProcurementStatus, IssueType, IssueStatus, IssueSeverity, MilestoneStatus };

export type ManufacturerId = "ALLEGION" | "ASSA_ABLOY" | "DORMAKABA" | "HAGER" | "OTHER";

export type OrderFieldType = "STRING" | "NUMBER" | "BOOLEAN" | "SELECT" | "MULTISELECT" | "DATE";

export type ValidationSeverity = "INFO" | "WARN" | "ERROR";

export type FieldValidationRuleType = "REQUIRED" | "MATCH_ENUM" | "MATCH_PATTERN" | "CUSTOM";

export interface FieldValidationRule {
  type: FieldValidationRuleType;
  severity: ValidationSeverity;
  message: string;
  allowedValues?: string[];
  pattern?: string;
  customCode?: string;
}

export interface ManufacturerOrderField {
  id: string;
  label: string;
  type: OrderFieldType;
  required: boolean;
  defaultSource?: string;
  options?: string[];
  validations?: FieldValidationRule[];
  divisionTags?: DivisionCode[];
}

export interface ManufacturerOrderFormTemplate {
  id: string;
  manufacturer: ManufacturerId;
  name: string;
  version: string;
  divisions: DivisionCode[];
  fields: ManufacturerOrderField[];
  metadata?: Record<string, any>;
}

export type FieldValidationStatus = "ok" | "missing" | "invalid" | "needs_review";

export interface ManufacturerOrderFieldValue {
  fieldId: string;
  value: any;
  status: FieldValidationStatus;
  messages: string[];
}

export interface ManufacturerOrderFormInstance {
  id: string;
  projectId: string;
  templateId: string;
  manufacturer: ManufacturerId;
  division: DivisionCode;
  procurementItemIds: string[];
  fields: ManufacturerOrderFieldValue[];
  generatedAt: string;
  createdByUserId: string;
}

export type OrderFormPdfMode = "INTERNAL" | "MANUFACTURER";

export interface OrderFormPdfField {
  label: string;
  value: string;
  status: FieldValidationStatus;
  messages: string[];
}

export interface OrderFormPdfItemLine {
  division: string;
  partNumber: string;
  description: string;
  quantity: number;
  manufacturer: string;
}

export interface OrderFormPdfPayload {
  title: string;
  manufacturer: string;
  projectName: string;
  jobNumber: string;
  generatedAt: string;
  headerNotes?: string;
  fields: OrderFormPdfField[];
  items: OrderFormPdfItemLine[];
  footerText?: string;
  mode: OrderFormPdfMode;
}

export interface ManufacturerContact {
  id: ManufacturerId;
  name: string;
  defaultEmail: string;
  divisions: DivisionCode[];
  notes?: string;
}

export interface ProjectContext {
  id: string;
  name: string;
  jobNumber: string;
  customerId?: string;
  facilityId?: string;
}

export interface ProcurementItemContext {
  id: string;
  projectId: string;
  division: DivisionCode;
  manufacturer: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  requiredOnSiteDate?: string;
}

export interface PMDashboardStats {
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  overdueProjects: number;
  totalProcurementItems: number;
  procurementItemsComplete: number;
  procurementRedFlags: number;
  openIssues: number;
  criticalIssues: number;
  upcomingMilestones: number;
  overdueMilestones: number;
}

export interface PMManagerOverview {
  projectManagers: {
    id: string;
    name: string;
    email: string;
    stats: PMDashboardStats;
  }[];
  orgTotals: PMDashboardStats;
}
