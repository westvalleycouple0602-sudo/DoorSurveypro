// shared/schemas/div28.schema.ts
// Division 28 Zod Schemas for validation

import { z } from "zod";

export const riskLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof riskLevelEnum>;

export const areaTypeEnum = z.enum([
  "PUBLIC",
  "STAFF_ONLY",
  "CRITICAL_CARE",
  "PHARMACY",
  "BEHAVIORAL_HEALTH",
  "IT_DATA_CENTER",
  "ADMIN",
  "OTHER",
]);
export type AreaType = z.infer<typeof areaTypeEnum>;

export const accessControlModeEnum = z.enum([
  "NONE",
  "MECHANICAL_ONLY",
  "BADGE_CARD",
  "PIN_KEYPAD",
  "BADGE_PLUS_PIN",
  "MOBILE_CREDENTIAL",
]);
export type AccessControlMode = z.infer<typeof accessControlModeEnum>;

export const lockdownCoverageEnum = z.enum([
  "NONE",
  "LOCAL_ONLY",
  "ZONE_LOCKDOWN",
  "BUILDING_LOCKDOWN",
]);
export type LockdownCoverage = z.infer<typeof lockdownCoverageEnum>;

export const egressTypeEnum = z.enum([
  "FREE_EGRESS",
  "CONTROLLED_EGRESS",
  "DELAYED_EGRESS",
  "SPECIAL_LOCKING_ARRANGEMENT",
]);
export type EgressType = z.infer<typeof egressTypeEnum>;

export const surveillanceLevelEnum = z.enum([
  "NONE",
  "LOCAL_CAMERA",
  "EXISTING_VIDEO_INTEGRATION",
  "ANALYTICS_READY",
]);
export type SurveillanceLevel = z.infer<typeof surveillanceLevelEnum>;

export const intrusionLevelEnum = z.enum([
  "NONE",
  "DOOR_CONTACT_ONLY",
  "DOOR_PLUS_MOTION",
  "DOOR_PLUS_GLASSBREAK",
]);
export type IntrusionLevel = z.infer<typeof intrusionLevelEnum>;

export const gunDetectionIntentEnum = z.enum(["NONE", "INTERESTED", "REQUIRED"]);
export type GunDetectionIntent = z.infer<typeof gunDetectionIntentEnum>;

export const div28FeatureEnum = z.enum([
  "ACCESS_CONTROL",
  "DOOR_AUTOMATION",
  "CONTROLLED_EGRESS",
  "DELAYED_EGRESS",
  "SURVEILLANCE",
  "INTRUSION_DETECTION",
  "GUN_DETECTION_READY",
  "LOCKDOWN_CONTROL",
]);
export type Div28Feature = z.infer<typeof div28FeatureEnum>;

export const div28SurveyAnswersSchema = z.object({
  openingId: z.string().min(1, "Opening ID is required"),
  areaType: areaTypeEnum,
  riskLevel: riskLevelEnum,
  accessControlMode: accessControlModeEnum,
  requiresAuditTrail: z.boolean(),
  scheduledLockUnlock: z.boolean(),
  egressType: egressTypeEnum,
  unsureAboutEgressCode: z.boolean(),
  heavyOrHighTraffic: z.boolean(),
  adaPriority: z.boolean(),
  infectionControlPriority: z.boolean(),
  surveillanceLevel: surveillanceLevelEnum,
  intrusionLevel: intrusionLevelEnum,
  lockdownCoverage: lockdownCoverageEnum,
  gunDetectionIntent: gunDetectionIntentEnum,
  notes: z.string().optional(),
});
export type Div28SurveyAnswers = z.infer<typeof div28SurveyAnswersSchema>;

export const div28OpportunitySummarySchema = z.object({
  openingId: z.string(),
  score: z.number().min(0).max(100),
  tier: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]),
  recommendedFeatures: z.array(div28FeatureEnum),
  narrativeSummary: z.string(),
  warnings: z.array(z.string()),
});
export type Div28OpportunitySummary = z.infer<typeof div28OpportunitySummarySchema>;

export const div28TaskRoleEnum = z.enum([
  "SALES",
  "ENGINEERING",
  "SECURITY_INTEGRATOR",
  "PROJECT_MANAGER",
]);
export type Div28TaskRole = z.infer<typeof div28TaskRoleEnum>;

export const generatedDiv28TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  openingId: z.string(),
  feature: div28FeatureEnum,
  title: z.string(),
  description: z.string(),
  assigneeRole: div28TaskRoleEnum,
  suggestedDueOffsetDays: z.number(),
});
export type GeneratedDiv28Task = z.infer<typeof generatedDiv28TaskSchema>;

export const proposalTextBlockSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  appliesToFeatures: z.array(div28FeatureEnum),
});
export type ProposalTextBlock = z.infer<typeof proposalTextBlockSchema>;

export const openingProposalPackageSchema = z.object({
  openingId: z.string(),
  summary: z.string(),
  baseOptionText: z.string(),
  upgradeOptions: z.array(proposalTextBlockSchema),
});
export type OpeningProposalPackage = z.infer<typeof openingProposalPackageSchema>;

export const pricingModeEnum = z.enum([
  "LINE_ITEM",
  "OPENING_PACKAGE",
  "PROJECT_SUMMARY",
]);
export type PricingMode = z.infer<typeof pricingModeEnum>;

export const div28ExportModeSchema = z.object({
  mode: z.enum(["NONE", "INLINE", "APPENDIX"]),
  flagAsOptional: z.boolean(),
  showDiv28Disclaimer: z.boolean(),
});
export type Div28ExportMode = z.infer<typeof div28ExportModeSchema>;

export const quoteExportOptionsSchema = z.object({
  pricingMode: pricingModeEnum,
  showTaxes: z.boolean(),
  showLaborBreakout: z.boolean(),
  showOpeningBreakdown: z.boolean(),
  div28: div28ExportModeSchema,
  includeAlternateOption: z.boolean(),
  includeConfidentialTerms: z.boolean(),
});
export type QuoteExportOptions = z.infer<typeof quoteExportOptionsSchema>;

export const defaultDiv28SurveyAnswers = (openingId: string): Div28SurveyAnswers => ({
  openingId,
  areaType: "PUBLIC",
  riskLevel: "LOW",
  accessControlMode: "NONE",
  requiresAuditTrail: false,
  scheduledLockUnlock: false,
  egressType: "FREE_EGRESS",
  unsureAboutEgressCode: false,
  heavyOrHighTraffic: false,
  adaPriority: false,
  infectionControlPriority: false,
  surveillanceLevel: "NONE",
  intrusionLevel: "NONE",
  lockdownCoverage: "NONE",
  gunDetectionIntent: "NONE",
  notes: "",
});

export const defaultQuoteExportOptions: QuoteExportOptions = {
  pricingMode: "OPENING_PACKAGE",
  showTaxes: true,
  showLaborBreakout: true,
  showOpeningBreakdown: true,
  div28: {
    mode: "INLINE",
    flagAsOptional: true,
    showDiv28Disclaimer: true,
  },
  includeAlternateOption: false,
  includeConfidentialTerms: true,
};
