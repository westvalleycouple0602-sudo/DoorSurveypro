import { z } from "zod";

export const buildingCodeStandardEnum = z.enum(["ADA", "IBC", "NFPA", "ANSI_SDI", "LOCAL", "DIV08", "DIV28"]);
export type BuildingCodeStandard = z.infer<typeof buildingCodeStandardEnum>;

export const hardwarePieceSchema = z.object({
  type: z.enum([
    "hinge",
    "lockset",
    "exit_device",
    "closer",
    "strike",
    "electric_strike",
    "mag_lock",
    "operator",
    "accessory",
  ]),
  description: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  qty: z.number().int().min(1).optional(),
});

export const electronicSecurityDeviceTypeEnum = z.enum([
  "card_reader",
  "keypad",
  "door_contact",
  "rex_device",
  "request_to_exit_bar",
  "camera",
  "intercom",
  "power_supply",
  "fire_alarm_interface",
  "other",
]);

export const electronicSecurityDeviceSchema = z.object({
  type: electronicSecurityDeviceTypeEnum,
  description: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  qty: z.number().int().min(1).optional(),
  monitored: z.boolean().optional(),
  notes: z.string().optional(),
});

export const evidenceFileSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["photo", "video", "document"]),
  url: z.string().url().or(z.string().length(0)).or(z.string()),
  label: z.string().optional(),
});

export const complianceIssueSchema = z.object({
  standard: buildingCodeStandardEnum,
  codeRef: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
});

export const engineeringConflictSchema = z.object({
  type: z.enum(["hardware", "fire_rating", "egress", "structure", "electrical"]),
  message: z.string(),
});

export const measurementsSchema = z.object({
  roughWidthMm: z.number().min(0),
  roughHeightMm: z.number().min(0),
  clearWidthMm: z.number().min(0),
  headHeightMm: z.number().min(0),
  jambDepthMm: z.number().min(0),
  doorThicknessMm: z.number().min(0),
  sillHeightMm: z.number().min(0).optional(),
});

export const doorLeafSchema = z.object({
  leafType: z.enum(["flush", "full_glass", "half_glass", "narrow_lite"]),
  coreType: z.enum(["solid", "hollow", "mineral", "stc"]),
  fireRatingMinutes: z.number().min(0),
  hasVisionLite: z.boolean(),
  visionLiteDescription: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
});

export const frameSchema = z.object({
  material: z.enum(["hollow_metal", "aluminum", "wood"]),
  profile: z.string(),
  anchorType: z.enum(["existing", "new", "steel"]),
  conditionScore: z.number().int().min(1).max(5),
  fireLabelPresent: z.boolean().optional(),
  fireLabelRating: z.number().min(0).optional(),
  notes: z.string().optional(),
  levelCheck: z.enum(["pass", "fail", "marginal"]).optional(),
  plumbCheck: z.enum(["pass", "fail", "marginal"]).optional(),
  squareCheck: z.enum(["pass", "fail", "marginal"]).optional(),
  straightnessCheck: z.enum(["pass", "fail", "marginal"]).optional(),
  twistObserved: z.boolean().optional(),
  swingCheck: z.enum(["pass", "fail", "marginal"]).optional(),
  driftObserved: z.boolean().optional(),
  revealLeft: z.string().optional(),
  revealRight: z.string().optional(),
  revealTop: z.string().optional(),
  undercutGap: z.string().optional(),
  revealUniformity: z.enum(["uniform", "non_uniform", "not_checked"]).optional(),
  revealNotes: z.string().optional(),
});

export const hardwareSetSchema = z.object({
  hinges: z.array(hardwarePieceSchema),
  lockFunction: z.string(),
  lockset: z.string(),
  exitDevice: z.string().optional(),
  closer: z.string().optional(),
  accessories: z.array(hardwarePieceSchema),
  electrifiedHardware: z.array(hardwarePieceSchema),
  electronicSecurity: z.array(electronicSecurityDeviceSchema).optional(),
});

export const complianceResultSchema = z.object({
  standardsChecked: z.array(buildingCodeStandardEnum),
  passes: z.boolean(),
  issues: z.array(complianceIssueSchema),
  notes: z.string().optional(),
});

export const evidenceSchema = z.object({
  photos: z.array(evidenceFileSchema),
  videos: z.array(evidenceFileSchema),
  documents: z.array(evidenceFileSchema),
});

export const engineeringReviewSchema = z.object({
  status: z.enum(["pending", "approved", "changes_required"]),
  notes: z.string().optional(),
  conflicts: z.array(engineeringConflictSchema),
});

export const quoteSummarySchema = z.object({
  materialCost: z.number().min(0),
  laborCost: z.number().min(0),
  shippingCost: z.number().min(0),
  marginPercent: z.number().min(0).max(100),
  totalPrice: z.number().min(0),
  optionLabel: z.string(),
});

export const div28AssessmentSchema = z.object({
  enabled: z.boolean(),
  areaClassification: z.string().optional(),
  trafficLevel: z.string().optional(),
  securityLevel: z.string().optional(),
  accessControlNeeded: z.boolean().optional(),
  doorAutomationNeeded: z.boolean().optional(),
  delayedEgressNeeded: z.boolean().optional(),
  surveillanceNeeded: z.boolean().optional(),
  intrusionDetectionNeeded: z.boolean().optional(),
  lockdownControlNeeded: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
  tier: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]).optional(),
  recommendedFeatures: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  proposalSummary: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.enabled) return;
  if (!data.areaClassification) {
    ctx.addIssue({
      code: "custom",
      message: "Area classification is required when assessment is enabled",
      path: ["areaClassification"],
    });
  }
  if (!data.securityLevel) {
    ctx.addIssue({
      code: "custom", 
      message: "Security level is required when assessment is enabled",
      path: ["securityLevel"],
    });
  }
});

export const doorSurveyProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Project name is required"),
  location: z.string().min(1, "Location is required"),
  customerId: z.string().optional(),
  buildingType: z.string().min(1, "Building type is required"),
  quoteType: z.enum(["none", "budget", "proposal", "change_order"]),
  standards: z.array(buildingCodeStandardEnum).min(1, "At least one standard must be selected"),
});

export const doorOpeningInputSchema = z.object({
  id: z.string().optional(),
  doorTag: z.string().min(1, "Door tag is required"),
  floor: z.string().min(1, "Floor is required"),
  spaceName: z.string().min(1, "Space name is required"),
  openingType: z.enum(["single", "pair", "sliding", "folding", "revolving", "other"]),
  handing: z.enum(["RH", "LH", "RHR", "LHR"]),
  measurements: measurementsSchema,
  doorLeaf: doorLeafSchema,
  frame: frameSchema,
  hardware: hardwareSetSchema,
  compliance: complianceResultSchema,
  evidence: evidenceSchema,
  engineeringReview: engineeringReviewSchema,
  quoteSummary: quoteSummarySchema,
  div28Assessment: div28AssessmentSchema.optional(),
});

export const doorSurveyPayloadSchema = z.object({
  project: doorSurveyProjectSchema,
  opening: doorOpeningInputSchema,
});

export const projectStepSchema = doorSurveyProjectSchema;

export const mappingStepSchema = z.object({
  doorTag: z.string().min(1, "Door tag is required"),
  openingName: z.string().optional(),
  description: z.string().optional(),
  floor: z.string().min(1, "Floor is required"),
  spaceName: z.string().min(1, "Space name is required"),
  openingType: z.enum(["single", "pair", "sliding", "folding", "revolving", "other"]),
  handing: z.enum(["RH", "LH", "RHR", "LHR"]),
});

export const measurementsStepSchema = measurementsSchema.extend({
  roughWidthMm: z.number().positive("Rough width must be greater than 0"),
  roughHeightMm: z.number().positive("Rough height must be greater than 0"),
  clearWidthMm: z.number().positive("Clear width must be greater than 0"),
  headHeightMm: z.number().positive("Head height must be greater than 0"),
  jambDepthMm: z.number().positive("Jamb depth must be greater than 0"),
  doorThicknessMm: z.number().positive("Door thickness must be greater than 0"),
});

export const doorStepSchema = doorLeafSchema;

export const frameStepSchema = frameSchema;

export const hardwareStepSchema = hardwareSetSchema.extend({
  div28Assessment: div28AssessmentSchema.optional(),
});

export const complianceStepSchema = complianceResultSchema;

export const evidenceStepSchema = evidenceSchema;

export const engineeringStepSchema = engineeringReviewSchema;

export const quoteStepSchema = quoteSummarySchema;

export type DoorSurveyPayload = z.infer<typeof doorSurveyPayloadSchema>;
export type DoorSurveyProject = z.infer<typeof doorSurveyProjectSchema>;
export type DoorOpeningInput = z.infer<typeof doorOpeningInputSchema>;
export type HardwarePiece = z.infer<typeof hardwarePieceSchema>;
export type EvidenceFile = z.infer<typeof evidenceFileSchema>;
export type ComplianceIssue = z.infer<typeof complianceIssueSchema>;
export type EngineeringConflict = z.infer<typeof engineeringConflictSchema>;
export type ElectronicSecurityDevice = z.infer<typeof electronicSecurityDeviceSchema>;
export type ElectronicSecurityDeviceType = z.infer<typeof electronicSecurityDeviceTypeEnum>;
