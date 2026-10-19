
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, serial, real, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations } from "./auth.schema";

// ============================================================================
// PROJECT & OPENING TABLES
// ============================================================================

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id"),
  locationId: varchar("location_id"),
  name: text("name").notNull(),
  location: text("location").notNull(),
  buildingType: text("building_type").notNull().default("office"),
  applicableStandards: text("applicable_standards").array(),
  status: text("status").notNull().default("active"),
  quoteType: text("quote_type"),
  notes: text("notes"),
  scopeOfWork: text("scope_of_work"),
  // Existing columns from 0000_complete_longshot.sql, retained in 0001_snapshot.
  // Restore the historical nullable/default contract; do not recreate live data.
  scopePowerByOthers: text("scope_power_by_others").default("no"),
  scopeDemolitionByOthers: text("scope_demolition_by_others").default("no"),
  scopePatchingByOthers: text("scope_patching_by_others").default("no"),
  scopePaintingByOthers: text("scope_painting_by_others").default("no"),
  scopeAsbestosAbatementByOthers: text("scope_asbestos_abatement_by_others").default("no"),
  scopeStructuralWorkByOthers: text("scope_structural_work_by_others").default("no"),
  scopeFireAlarmByOthers: text("scope_fire_alarm_by_others").default("no"),
  scopeAccessControlByOthers: text("scope_access_control_by_others").default("no"),
  scopeItemsToRemain: text("scope_items_to_remain").array(),
  scopeItemsToRemove: text("scope_items_to_remove").array(),
  scopeAdditionalDisclaimers: text("scope_additional_disclaimers"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_projects_organization_id").on(table.organizationId),
  index("IDX_projects_org_updated").on(table.organizationId, table.updatedAt),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  organizationId: z.string().optional(),
  // Keep text-array inputs strict; generated PgArray validation coerces elements.
  scopeItemsToRemain: z.array(z.string()).nullable().optional(),
  scopeItemsToRemove: z.array(z.string()).nullable().optional(),
});

export const updateProjectSchema = insertProjectSchema.partial().omit({
  organizationId: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const doorOpenings = pgTable("door_openings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  openingNumber: text("opening_number").notNull(),
  location: text("location").notNull(),
  roomNumber: text("room_number"),
  roomName: text("room_name"),
  building: text("building"),
  floor: text("floor"),
  zone: text("zone"),
  doorType: text("door_type"),
  doorMaterial: text("door_material"),
  doorWidth: text("door_width"),
  doorHeight: text("door_height"),
  doorThickness: text("door_thickness"),
  frameType: text("frame_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  frameMaterial: text("frame_material"),
  frameWidth: text("frame_width"),
  frameDepth: text("frame_depth"),
  frameLevelCheck: text("frame_level_check"),
  framePlumbCheck: text("frame_plumb_check"),
  frameSquareCheck: text("frame_square_check"),
  frameStraightnessCheck: text("frame_straightness_check"),
  frameTwistObserved: text("frame_twist_observed"),
  doorSwingCheck: text("door_swing_check"),
  doorDriftObserved: text("door_drift_observed"),
  revealLeft: text("reveal_left"),
  revealRight: text("reveal_right"),
  revealTop: text("reveal_top"),
  undercutGap: text("undercut_gap"),
  revealUniformity: text("reveal_uniformity"),
  revealNotes: text("reveal_notes"),
  lockType: text("lock_type"),
  hingeType: text("hinge_type"),
  hingeCount: text("hinge_count"),
  closerType: text("closer_type"),
  exitDevice: text("exit_device"),
  doorFireRating: text("door_fire_rating"),
  frameFireRating: text("frame_fire_rating"),
  hardwareFireRated: text("hardware_fire_rated"),
  fireRatingNotes: text("fire_rating_notes"),
  racewaysRequired: text("raceways_required"),
  racewaysPresent: text("raceways_present"),
  racewaysNotes: text("raceways_notes"),
  automationRequired: text("automation_required"),
  automationType: text("automation_type"),
  accessControlRequired: text("access_control_required"),
  accessControlType: text("access_control_type"),
  powerRequirements: text("power_requirements").array(),
  powerAvailable: text("power_available"),
  electrifiedHardware: text("electrified_hardware"),
  reuseDoor: text("reuse_door"),
  reuseFrame: text("reuse_frame"),
  reuseHardware: text("reuse_hardware"),
  installationNarrative: text("installation_narrative"),
  componentNotes: text("component_notes"),
  wiringNotes: text("wiring_notes"),
  fieldIssues: text("field_issues"),
  sideliteLeft: text("sidelite_left"),
  sideliteLeftWidth: text("sidelite_left_width"),
  sideliteRight: text("sidelite_right"),
  sideliteRightWidth: text("sidelite_right_width"),
  sideliteGlassType: text("sidelite_glass_type"),
  sideliteThickness: text("sidelite_thickness"),
  sideliteFireRating: text("sidelite_fire_rating"),
  sideliteStcRating: text("sidelite_stc_rating"),
  sideliteVandalResistant: text("sidelite_vandal_resistant"),
  sideliteFireResistant: text("sidelite_fire_resistant"),
  sideliteSpandrelGlazing: text("sidelite_spandrel_glazing"),
  sideliteSolidPanel: text("sidelite_solid_panel"),
  sideliteLeftCalculatedHeight: text("sidelite_left_calculated_height"),
  sideliteRightCalculatedHeight: text("sidelite_right_calculated_height"),
  sideliteCutoutWidth: text("sidelite_cutout_width"),
  sideliteCutoutHeight: text("sidelite_cutout_height"),
  sideliteCalculatedGlassWidth: text("sidelite_calculated_glass_width"),
  sideliteCalculatedGlassHeight: text("sidelite_calculated_glass_height"),
  transomPresent: text("transom_present"),
  transomHeight: text("transom_height"),
  transomWidth: text("transom_width"),
  transomGlassType: text("transom_glass_type"),
  transomThickness: text("transom_thickness"),
  transomFireRating: text("transom_fire_rating"),
  transomStcRating: text("transom_stc_rating"),
  transomVandalResistant: text("transom_vandal_resistant"),
  transomFireResistant: text("transom_fire_resistant"),
  transomSpandrelGlazing: text("transom_spandrel_glazing"),
  transomSolidPanel: text("transom_solid_panel"),
  transomCalculatedGlassWidth: text("transom_calculated_glass_width"),
  transomCutoutWidth: text("transom_cutout_width"),
  transomCutoutHeight: text("transom_cutout_height"),
  transomCalculatedGlassHeight: text("transom_calculated_glass_height"),
  visionLitePresent: text("vision_lite_present"),
  visionLiteWidth: text("vision_lite_width"),
  visionLiteHeight: text("vision_lite_height"),
  visionLiteLocation: text("vision_lite_location"),
  visionLiteGlassType: text("vision_lite_glass_type"),
  visionLiteThickness: text("vision_lite_thickness"),
  visionLiteFireRating: text("vision_lite_fire_rating"),
  visionLiteStcRating: text("vision_lite_stc_rating"),
  visionLiteVandalResistant: text("vision_lite_vandal_resistant"),
  visionLiteFireResistant: text("vision_lite_fire_resistant"),
  visionLiteCutoutWidth: text("vision_lite_cutout_width"),
  visionLiteCutoutHeight: text("vision_lite_cutout_height"),
  visionLiteCalculatedGlassWidth: text("vision_lite_calculated_glass_width"),
  visionLiteCalculatedGlassHeight: text("vision_lite_calculated_glass_height"),
  visionLiteSpandrelGlazing: text("vision_lite_spandrel_glazing"),
  visionLiteSolidPanel: text("vision_lite_solid_panel"),
  doorCoreType: text("door_core_type"),
  doorPressureRating: text("door_pressure_rating"),
  doorStcRating: text("door_stc_rating"),
  doorLeadLined: text("door_lead_lined"),
  integratedHardware: text("integrated_hardware"),
  impactDoor: text("impact_door"),
  barnDoorSliding: text("barn_door_sliding"),
  doorElevation: text("door_elevation"),
  liteKitType: text("lite_kit_type"),
  liteKitId: integer("lite_kit_id"),
  doorFinishType: text("door_finish_type"),
  woodVeneerSpecies: text("wood_veneer_species"),
  woodVeneerCut: text("wood_veneer_cut"),
  woodStainColor: text("wood_stain_color"),
  woodStainManufacturer: text("wood_stain_manufacturer"),
  woodFinishSheen: text("wood_finish_sheen"),
  hpdlLaminatePattern: text("hpdl_laminate_pattern"),
  hpdlLaminateColor: text("hpdl_laminate_color"),
  hpdlLaminateManufacturer: text("hpdl_laminate_manufacturer"),
  hpdlLaminateGrade: text("hpdl_laminate_grade"),
  metalFinishType: text("metal_finish_type"),
  metalPrimerType: text("metal_primer_type"),
  anodizedFinish: text("anodized_finish"),
  powderCoatColor: text("powder_coat_color"),
  powderCoatManufacturer: text("powder_coat_manufacturer"),
  powderCoatFinish: text("powder_coat_finish"),
  glassManufacturer: text("glass_manufacturer"),
  glassNotes: text("glass_notes"),
  doorCutoutWidth: text("door_cutout_width"),
  doorCutoutHeight: text("door_cutout_height"),
  doorGlassType: text("door_glass_type"),
  doorCalculatedGlassWidth: text("door_calculated_glass_width"),
  doorCalculatedGlassHeight: text("door_calculated_glass_height"),
  glazingInstallationType: text("glazing_installation_type"),
  glazingMethod: text("glazing_method"),
  butylTapeRequired: text("butyl_tape_required"),
  butylTapeType: text("butyl_tape_type"),
  glazingTapeSealant: text("glazing_tape_sealant"),
  glazingGaskets: text("glazing_gaskets"),
  glazingStops: text("glazing_stops"),
  glazingBeads: text("glazing_beads"),
  settingBlocks: text("setting_blocks"),
  glazingNotes: text("glazing_notes"),
  wdmaPerformanceDutyLevel: text("wdma_performance_duty_level"),
  wdmaVeneerGrade: text("wdma_veneer_grade"),
  wdmaVeneerPieceMatch: text("wdma_veneer_piece_match"),
  wdmaVeneerFaceMatch: text("wdma_veneer_face_match"),
  wdmaAppearancePairsSetsTran: text("wdma_appearance_pairs_sets_tran"),
  wdmaCoreType: text("wdma_core_type"),
  wdmaHardwareBlocking: text("wdma_hardware_blocking"),
  wdmaHardwareBlockingSpec: text("wdma_hardware_blocking_spec"),
  wdmaCoreEdgeInterface: text("wdma_core_edge_interface"),
  wdmaFireDoorTestMethod: text("wdma_fire_door_test_method"),
  wdmaBulletResistant: text("wdma_bullet_resistant"),
  wdmaElectrostaticShield: text("wdma_electrostatic_shield"),
  wdmaHpdlManufacturer: text("wdma_hpdl_manufacturer"),
  wdmaHpdlThickness: text("wdma_hpdl_thickness"),
  wdmaHpdlPatternColorFinish: text("wdma_hpdl_pattern_color_finish"),
  wdmaLpdlManufacturer: text("wdma_lpdl_manufacturer"),
  wdmaLpdlPatternColor: text("wdma_lpdl_pattern_color"),
  wdmaAestheticGrade: text("wdma_aesthetic_grade"),
  wdmaFactoryMachinedHardware: text("wdma_factory_machined_hardware"),
  wdmaWoodBeadedLites: text("wdma_wood_beaded_lites"),
  wdmaMetalVisionPanels: text("wdma_metal_vision_panels"),
  wdmaFinishSystem: text("wdma_finish_system"),
  wdmaFinishSystemOther: text("wdma_finish_system_other"),
  wdmaFinishApplication: text("wdma_finish_application"),
  gasketingRequired: text("gasketing_required"),
  intumescentSeals: text("intumescent_seals"),
  smokeSeals: text("smoke_seals"),
  perimeterSeals: text("perimeter_seals"),
  meetingStileSeals: text("meeting_stile_seals"),
  astragalType: text("astragal_type"),
  thresholdSeal: text("threshold_seal"),
  automaticDropSeals: text("automatic_drop_seals"),
  gasketingNotes: text("gasketing_notes"),
  coveragePct: integer("coverage_pct"),
  qualityScore: integer("quality_score"),
  confidence: integer("confidence"),
  doorCondition: text("door_condition"),
  frameCondition: text("frame_condition"),
  hardwareCondition: text("hardware_condition"),
  conditionIssues: text("condition_issues").array(),
  conditionNotes: text("condition_notes"),
  conditionAssessmentDate: timestamp("condition_assessment_date"),
  conditionPhotos: text("condition_photos").array(),
  replacementRecommendation: text("replacement_recommendation"),
  replacementJustification: text("replacement_justification"),
  openingStatus: text("opening_status"),
  installationDate: timestamp("installation_date"),
  installedBy: varchar("installed_by"),
  installerCompany: text("installer_company"),
  warrantyStartDate: timestamp("warranty_start_date"),
  warrantyEndDate: timestamp("warranty_end_date"),
  warrantyProvider: text("warranty_provider"),
  warrantyTermsNotes: text("warranty_terms_notes"),
  lastServiceDate: timestamp("last_service_date"),
  nextServiceDue: timestamp("next_service_due"),
  serviceFrequency: text("service_frequency"),
  retirementDate: timestamp("retirement_date"),
  retirementReason: text("retirement_reason"),
}, (table) => [
  index("IDX_door_openings_project_id").on(table.projectId),
]);

export const insertDoorOpeningSchema = createInsertSchema(doorOpenings).omit({
  id: true,
  createdAt: true,
});

export const updateDoorOpeningSchema = insertDoorOpeningSchema.partial().omit({
  projectId: true,
});

export type InsertDoorOpening = z.infer<typeof insertDoorOpeningSchema>;
export type UpdateDoorOpening = z.infer<typeof updateDoorOpeningSchema>;
export type DoorOpening = typeof doorOpenings.$inferSelect;

export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  photoType: text("photo_type").notNull().default("general"),
  annotations: jsonb("annotations"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_photos_opening_id").on(table.openingId),
]);

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  capturedAt: true,
});

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

// ============================================================================
// DIVISION 28 ASSESSMENT TABLE
// ============================================================================

export const div28Assessments = pgTable("div28_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  openingId: varchar("opening_id").notNull().references(() => doorOpenings.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Survey Input Data
  areaClassification: text("area_classification"),
  trafficLevel: text("traffic_level"),
  securityLevel: text("security_level"),
  occupancyType: text("occupancy_type"),
  isFireRated: text("is_fire_rated").default("no"),
  isExitPath: text("is_exit_path").default("no"),
  
  // Feature Flags
  accessControlNeeded: text("access_control_needed").default("no"),
  doorAutomationNeeded: text("door_automation_needed").default("no"),
  delayedEgressNeeded: text("delayed_egress_needed").default("no"),
  controlledEgressNeeded: text("controlled_egress_needed").default("no"),
  surveillanceNeeded: text("surveillance_needed").default("no"),
  intrusionDetectionNeeded: text("intrusion_detection_needed").default("no"),
  gunDetectionReady: text("gun_detection_ready").default("no"),
  lockdownControlNeeded: text("lockdown_control_needed").default("no"),
  
  // Computed Scoring Results
  opportunityScore: integer("opportunity_score"),
  opportunityTier: text("opportunity_tier"), // NONE, LOW, MEDIUM, HIGH
  recommendedFeatures: text("recommended_features").array(),
  warnings: text("warnings").array(),
  
  // Proposal Output
  proposalSummary: text("proposal_summary"),
  baseOptionText: text("base_option_text"),
  upgradeOptions: jsonb("upgrade_options"), // Array of upgrade proposals
  
  // PM Tasks Generated
  pmTasks: jsonb("pm_tasks"), // Array of task objects
  
  // Notes and Comments
  notes: text("notes"),
  
  // Audit
  assessedBy: varchar("assessed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_div28_assessments_opening_id").on(table.openingId),
  index("IDX_div28_assessments_project_id").on(table.projectId),
]);

export const insertDiv28AssessmentSchema = createInsertSchema(div28Assessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDiv28AssessmentSchema = insertDiv28AssessmentSchema.partial();

export type InsertDiv28Assessment = z.infer<typeof insertDiv28AssessmentSchema>;
export type UpdateDiv28Assessment = z.infer<typeof updateDiv28AssessmentSchema>;
export type Div28Assessment = typeof div28Assessments.$inferSelect;
