// shared/projectManagement/procurementTypes.ts
// Procurement types for manufacturer order management

export type ManufacturerDomain =
  | "ALLEGION"
  | "ASSA_ABLOY"
  | "DORMAKABA"
  | "STANLEY"
  | "HAGER"
  | "OTHER";

export type ProcurementPackageStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "RELEASED_TO_MANUFACTURER"
  | "ON_HOLD"
  | "REVISE_AND_RESUBMIT"
  | "CLOSED";

export interface ProcurementLine {
  id: string;
  openingId?: string | null;
  hardwareSetId?: string | null;
  manufacturer: ManufacturerDomain;
  manufacturerPart: string;
  description: string;
  quantity: number;
  uom: string;
  voltage?: string | null;
  finish?: string | null;
  handing?: string | null;
  fireRating?: string | null;
  notes?: string | null;
  redFlags: string[];
}

export interface ProcurementPackage {
  id: string;
  projectId: string;
  manufacturer: ManufacturerDomain;
  status: ProcurementPackageStatus;
  contactName?: string | null;
  contactEmail?: string | null;
  contactNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  lines: ProcurementLine[];
}

export interface HardwareLineInput {
  openingId: string;
  hardwareSetId: string;
  manufacturer: ManufacturerDomain;
  manufacturerPart: string;
  description: string;
  quantity: number;
  uom?: string;
  voltage?: string | null;
  finish?: string | null;
  handing?: string | null;
  fireRating?: string | null;
}

export const MANUFACTURER_LABELS: Record<ManufacturerDomain, string> = {
  ALLEGION: "Allegion",
  ASSA_ABLOY: "ASSA ABLOY",
  DORMAKABA: "dormakaba",
  STANLEY: "Stanley",
  HAGER: "Hager",
  OTHER: "Other",
};

export const PROCUREMENT_STATUS_LABELS: Record<ProcurementPackageStatus, string> = {
  DRAFT: "Draft",
  READY_FOR_REVIEW: "Ready for Review",
  RELEASED_TO_MANUFACTURER: "Released",
  ON_HOLD: "On Hold",
  REVISE_AND_RESUBMIT: "Revise & Resubmit",
  CLOSED: "Closed",
};
