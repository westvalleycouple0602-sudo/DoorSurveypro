import { apiRequest as fetch } from "@/lib/queryClient";
import { apiRequest } from "../queryClient";

// ============================================================================
// Export Profiles API
// ============================================================================

export interface ExportProfile {
  id: string;
  organizationId: string;
  userId: string | null;
  name: string;
  description: string | null;
  scope: string;
  showLineItems: boolean;
  showLineItemPrices: boolean;
  showLineItemQuantities: boolean;
  showLineItemTotals: boolean;
  showSummaryTotals: boolean;
  groupItemsBy: string;
  showMaterialBreakdown: boolean;
  showLaborBreakdown: boolean;
  taxMode: string;
  showTaxRate: boolean;
  showInternalNotes: boolean;
  showCostBreakdown: boolean;
  showMarginOrMarkup: boolean;
  defaultAlternativeLabel: string | null;
  isDefaultForTenant: boolean;
  templateType: string | null;
  language: string;
  exportBrandingId: string | null;
  includeImages: boolean;
  includeDoorIcons: boolean;
  includeScanSnapshots: boolean;
  includeComplianceSummary: boolean;
  includeInstallTimeline: boolean;
  includeCutSheetSection: boolean;
  includeCostCharts: boolean;
  goodBetterBestMode: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export async function getExportProfiles(): Promise<ExportProfile[]> {
  const response = await apiRequest("GET", "/api/export-profiles");
  return response.json();
}

export async function createExportProfile(data: Partial<ExportProfile>): Promise<ExportProfile> {
  const response = await apiRequest("POST", "/api/export-profiles", data);
  return response.json();
}

export async function updateExportProfile(id: string, data: Partial<ExportProfile>): Promise<ExportProfile> {
  const response = await apiRequest("PATCH", `/api/export-profiles/${id}`, data);
  return response.json();
}

export async function deleteExportProfile(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/export-profiles/${id}`);
}

// ============================================================================
// Project Alternatives API
// ============================================================================

export interface ProjectAlternative {
  id: string;
  projectId: string;
  label: string;
  isPrimary: boolean;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export async function getProjectAlternatives(projectId: string): Promise<ProjectAlternative[]> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/alternatives`);
  return response.json();
}

export async function createProjectAlternative(
  projectId: string,
  data: Partial<ProjectAlternative>
): Promise<ProjectAlternative> {
  const response = await apiRequest("POST", `/api/projects/${projectId}/alternatives`, data);
  return response.json();
}

export async function updateProjectAlternative(
  projectId: string,
  id: string,
  data: Partial<ProjectAlternative>
): Promise<ProjectAlternative> {
  const response = await apiRequest("PATCH", `/api/projects/${projectId}/alternatives/${id}`, data);
  return response.json();
}

export async function deleteProjectAlternative(projectId: string, id: string): Promise<void> {
  await apiRequest("DELETE", `/api/projects/${projectId}/alternatives/${id}`);
}

// ============================================================================
// Export Branding API
// ============================================================================

export interface ExportBranding {
  id: string;
  organizationId: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  headerText: string | null;
  footerText: string | null;
  watermarkText: string | null;
  isDefaultForTenant: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export async function getExportBranding(): Promise<ExportBranding[]> {
  const response = await apiRequest("GET", "/api/export-branding");
  return response.json();
}

export async function createExportBranding(data: Partial<ExportBranding>): Promise<ExportBranding> {
  const response = await apiRequest("POST", "/api/export-branding", data);
  return response.json();
}

export async function updateExportBranding(id: string, data: Partial<ExportBranding>): Promise<ExportBranding> {
  const response = await apiRequest("PATCH", `/api/export-branding/${id}`, data);
  return response.json();
}

export async function deleteExportBranding(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/export-branding/${id}`);
}

// ============================================================================
// Export Generation API
// ============================================================================

export interface ExportOptions {
  projectId: string;
  format?: "pdf" | "html";
  templateType?: string;
  profileId?: string;
  brandingId?: string;
  alternativeId?: string;
  language?: string;
}

export interface ExportHistoryItem {
  id: string;
  organizationId: string;
  userId: string;
  projectId: string | null;
  projectAlternativeId: string | null;
  exportProfileId: string | null;
  format: string;
  templateType: string | null;
  language: string | null;
  deliveredVia: string | null;
  targetEmail: string | null;
  createdAt: Date;
}

export async function generateExport(options: ExportOptions): Promise<Blob> {
  const response = await fetch(`/api/projects/${options.projectId}/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      format: options.format || "pdf",
      templateType: options.templateType,
      profileId: options.profileId,
      brandingId: options.brandingId,
      alternativeId: options.alternativeId,
      language: options.language || "en",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate export");
  }

  return response.blob();
}

export async function getProjectExportHistory(projectId: string): Promise<ExportHistoryItem[]> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/export-history`);
  return response.json();
}

export async function getAllExportHistory(): Promise<ExportHistoryItem[]> {
  const response = await apiRequest("GET", "/api/export-history");
  return response.json();
}
