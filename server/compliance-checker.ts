import { db } from "./db";
import { complianceRules, complianceViolations, doorOpenings, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { DoorOpening, ComplianceRule, ComplianceViolation } from "@shared/schema";
import {
  doorHardwareRules,
  validateHardwareHeight,
  validateFireDoorClearances,
  validateThreshold,
  getFireDoorRequiredFlags,
  getMinHingeCount,
  findRuleById,
  getRulesForJurisdiction,
  getRulesByCategory,
  getRulesBySubject,
  getAllRules,
  getRuleCategories,
  getCodeSources,
  getRuleSubjects,
  validateDelayedEgress,
  validateMaglock,
  validateAutoOperator,
  validateDoorCloser,
  validatePanicHardware,
  validateEgressDoor,
  validateFireDoorLabeling,
  validateHingeCount,
  validateFireDoorCloser,
  type DoorHardwareRule,
  type HardwareValidationResult,
  type RuleCategory,
  type RuleSubject,
  type CodeSource,
} from "./validation/doorHardwareRules";

interface RuleCondition {
  field: string;
  operator: string;
  value: string | string[];
  unit?: string;
}

// Result types for comprehensive compliance checking
export interface ComprehensiveComplianceResult {
  // Database-backed violations (stored in complianceViolations table)
  databaseViolations: ComplianceViolation[];
  // Hardware-specific violations (code-based rules, not persisted to DB)
  hardwareViolations: HardwareValidationResult[];
}

export async function checkOpeningCompliance(openingId: string): Promise<ComplianceViolation[]> {
  const result = await checkOpeningComplianceComprehensive(openingId);
  return result.databaseViolations;
}

// New comprehensive compliance check that includes both database and hardware rules
export async function checkOpeningComplianceComprehensive(openingId: string): Promise<ComprehensiveComplianceResult> {
  const opening = await db.query.doorOpenings.findFirst({
    where: eq(doorOpenings.id, openingId),
    with: {
      project: true,
    },
  });

  if (!opening) {
    throw new Error("Door opening not found");
  }

  const allRules = await db.select().from(complianceRules).where(eq(complianceRules.active, "yes"));
  
  const applicableRules = allRules.filter(rule => {
    if (rule.buildingTypes && rule.buildingTypes.length > 0) {
      if (!rule.buildingTypes.includes(opening.project.buildingType)) {
        return false;
      }
    }
    
    if (rule.doorTypes && rule.doorTypes.length > 0) {
      if (!opening.doorType || !rule.doorTypes.some(dt => 
        opening.doorType?.toLowerCase().includes(dt.toLowerCase())
      )) {
        return false;
      }
    }
    
    return true;
  });

  const databaseViolations: ComplianceViolation[] = [];
  const existingViolations = await db.select().from(complianceViolations)
    .where(eq(complianceViolations.openingId, openingId));

  // Evaluate database-defined rules (these have FK-backed rule IDs)
  for (const rule of applicableRules) {
    const violates = evaluateRule(opening, rule);
    
    if (violates) {
      const existingViolation = existingViolations.find(v => v.ruleId === rule.id && v.status === "open");
      
      if (!existingViolation) {
        const [violation] = await db.insert(complianceViolations).values({
          openingId,
          ruleId: rule.id,
          status: "open",
        }).returning();
        
        databaseViolations.push(violation);
      } else {
        databaseViolations.push(existingViolation);
      }
    } else {
      const existingViolation = existingViolations.find(v => v.ruleId === rule.id && v.status === "open");
      if (existingViolation) {
        await db.update(complianceViolations)
          .set({ status: "resolved", resolvedAt: new Date() })
          .where(eq(complianceViolations.id, existingViolation.id));
      }
    }
  }

  // Run hardware-specific compliance checks from doorHardwareRules module
  // Note: These use code-based rule IDs and are NOT stored in the DB due to FK constraints
  // They are returned separately for client-side display
  const hardwareResults = runHardwareComplianceChecks(opening);
  
  // Filter to only FAIL results for hardware violations
  const hardwareViolations = hardwareResults.filter(r => !r.passed && r.severity === "FAIL");

  return {
    databaseViolations,
    hardwareViolations
  };
}

// Map door opening data to hardware compliance context and run checks
function runHardwareComplianceChecks(opening: DoorOpening): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];
  
  // Determine jurisdiction (default to US, check for California)
  const openingWithProject = opening as any;
  const jurisdiction = openingWithProject.project?.state === "CA" ? "US-CA" : "US";
  
  // Determine if on accessible route (check accessibility field or assume if ADA project)
  const isAccessibleRoute = 
    (opening as any).isAccessibleRoute === true ||
    (opening as any).accessibility === "required" ||
    openingWithProject.project?.buildingType?.toLowerCase().includes("healthcare") ||
    openingWithProject.project?.buildingType?.toLowerCase().includes("public");
  
  // Determine if means of egress
  const isMeansOfEgress = 
    (opening as any).isMeansOfEgress === true ||
    (opening as any).isEgressDoor === true ||
    opening.doorType?.toLowerCase().includes("exit") ||
    opening.doorType?.toLowerCase().includes("egress");
  
  // Get door operation type from explicit field or infer from door type
  const doorOperation = ((opening as any).operation || "").toLowerCase();
  const doorTypeStr = (opening.doorType || "").toLowerCase();
  
  // List of non-swinging door types that should never have NFPA 80 hinge/clearance rules applied
  const NON_SWING_TYPES = [
    "sliding", "roll", "roller", "overhead", "coil", "bi-fold", "bifold",
    "accordion", "revolving", "sectional", "garage", "folding", "pocket"
  ];
  
  // Check if explicitly a non-swing type
  const isExplicitlyNonSwing = NON_SWING_TYPES.some(t => 
    doorOperation.includes(t) || doorTypeStr.includes(t)
  );
  
  // Check if swinging door - REQUIRE explicit swing/pivot indicator
  // Do NOT default unknown/blank types to swinging
  const isSwingingDoor = !isExplicitlyNonSwing && (
    doorOperation === "swinging" ||
    doorOperation === "swing" ||
    doorOperation === "pivot" ||
    doorTypeStr.includes("swing") ||
    doorTypeStr.includes("pivot") ||
    doorTypeStr.includes("hinged")
  );
  
  // Parse fire rating (support formats like "90", "90 min", "1.5 hr")
  let fireRatingMinutes = 0;
  const fireRating = (opening as any).fireRating || openingWithProject.fireRating;
  if (fireRating) {
    const ratingStr = String(fireRating).toLowerCase();
    if (ratingStr.includes("hr") || ratingStr.includes("hour")) {
      fireRatingMinutes = parseFloat(ratingStr) * 60;
    } else {
      fireRatingMinutes = parseFloat(ratingStr) || 0;
    }
  }
  
  // Parse measurements from opening data
  const parseInches = (value: any): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const str = String(value);
    // Handle formats: "42", "42\"", "3'6\"", "3'-6\""
    const feetInchMatch = str.match(/(\d+)'[\-]?(\d+)/);
    if (feetInchMatch) {
      return parseInt(feetInchMatch[1]) * 12 + parseInt(feetInchMatch[2]);
    }
    return parseFloat(str) || undefined;
  };
  
  // Determine hardware type from explicit field or infer from context
  const explicitHardwareType = (opening as any).hardwareType;
  let hardwareType: string;
  
  if (explicitHardwareType) {
    // Use explicit hardware type if provided
    hardwareType = String(explicitHardwareType).toLowerCase();
  } else if (doorTypeStr.includes("panic") || doorTypeStr.includes("exit device")) {
    // Infer panic device from door type
    hardwareType = "panic_device";
  } else if (isMeansOfEgress && (doorTypeStr.includes("emergency") || doorTypeStr.includes("egress"))) {
    // Egress doors commonly have panic devices
    hardwareType = "panic_device";
  } else {
    // Default to lever for standard doors
    hardwareType = "lever";
  }
  
  // Hardware height validation
  const hardwareHeight = parseInches((opening as any).hardwareHeight);
  
  if (hardwareHeight !== undefined) {
    const heightResults = validateHardwareHeight(
      hardwareHeight,
      jurisdiction,
      hardwareType,
      isAccessibleRoute ?? false,
      isMeansOfEgress ?? false
    );
    results.push(...heightResults);
  }
  
  // Threshold validation (for accessible routes)
  const thresholdHeight = parseInches((opening as any).thresholdHeight);
  if (thresholdHeight !== undefined && isAccessibleRoute) {
    const thresholdResult = validateThreshold(thresholdHeight, isAccessibleRoute);
    if (thresholdResult) {
      results.push(thresholdResult);
    }
  }
  
  // Fire door clearance validation (only for swinging fire-rated doors)
  if (fireRatingMinutes > 0 && isSwingingDoor) {
    const sideClearance = parseInches((opening as any).sideClearance || (opening as any).frameClearance);
    const bottomClearance = parseInches((opening as any).bottomClearance || (opening as any).undercut);
    
    if (sideClearance !== undefined && bottomClearance !== undefined) {
      const clearanceResults = validateFireDoorClearances(
        sideClearance,
        bottomClearance,
        fireRatingMinutes
      );
      results.push(...clearanceResults);
    }
    
    // Hinge count validation for fire doors
    const doorHeight = parseInches(opening.doorHeight);
    const hingeCount = (opening as any).hingeCount || (opening as any).numberOfHinges;
    
    if (doorHeight !== undefined && hingeCount !== undefined) {
      const requiredHinges = getMinHingeCount(doorHeight, fireRatingMinutes);
      const hingesPassed = hingeCount >= requiredHinges;
      
      const hingeRule = findRuleById("fire_door_hinge_count_spacing");
      if (hingeRule) {
        results.push({
          ruleId: hingeRule.id,
          ruleName: hingeRule.name,
          passed: hingesPassed,
          severity: hingesPassed ? "INFO" : "FAIL",
          message: hingesPassed
            ? `Hinge count (${hingeCount}) meets minimum (${requiredHinges}) for ${doorHeight}" fire door`
            : `Hinge count (${hingeCount}) below minimum (${requiredHinges}) required for ${doorHeight}" fire door per NFPA 80`,
          codeReferences: hingeRule.code_references,
          measuredValue: hingeCount,
          requiredRange: { min: requiredHinges },
          remediation: hingesPassed ? undefined : hingeRule.remediation?.generic_fix,
          costImpact: hingeRule.remediation?.cost_impact_estimate,
          confidence: 0.95
        });
      }
    }
    
    // Fire door assembly requirement checks
    const fireFlags = getFireDoorRequiredFlags(fireRatingMinutes);
    const fireListedRule = findRuleById("fire_door_listed_assembly");
    const selfClosingRule = findRuleById("fire_door_self_closing");
    
    // Check if door has required fire door components
    const hasFireLabel = (opening as any).hasFireLabel || (opening as any).fireLabel;
    const hasSelfCloser = (opening as any).hasSelfCloser || (opening as any).closerType;
    
    // Fire door listed assembly check
    if (fireListedRule && fireFlags.fire_listed_assembly_required) {
      const assemblyPassed = hasFireLabel === true;
      
      if (!assemblyPassed) {
        results.push({
          ruleId: fireListedRule.id,
          ruleName: fireListedRule.name,
          passed: false,
          severity: "FAIL",
          message: `Fire-rated door (${fireRatingMinutes} min) requires listed and labeled fire door assembly per NFPA 80`,
          codeReferences: fireListedRule.code_references,
          remediation: fireListedRule.remediation?.generic_fix,
          costImpact: fireListedRule.remediation?.cost_impact_estimate,
          confidence: 0.95
        });
      }
    }
    
    // Self-closing device check (only for swinging/pivot fire doors)
    if (selfClosingRule && fireFlags.self_closing_required) {
      const closerPassed = hasSelfCloser === true || 
        (typeof hasSelfCloser === "string" && hasSelfCloser.trim() !== "");
      
      if (!closerPassed) {
        results.push({
          ruleId: selfClosingRule.id,
          ruleName: selfClosingRule.name,
          passed: false,
          severity: "FAIL",
          message: `Fire-rated door (${fireRatingMinutes} min) requires self-closing or automatic-closing device per NFPA 80`,
          codeReferences: selfClosingRule.code_references,
          remediation: selfClosingRule.remediation?.generic_fix,
          costImpact: selfClosingRule.remediation?.cost_impact_estimate,
          confidence: 0.95
        });
      }
    }
  }
  
  // Single motion to egress check for egress doors
  if (isMeansOfEgress) {
    const egressRule = findRuleById("single_motion_to_egress");
    const requiresMultipleActions = (opening as any).requiresMultipleActions;
    
    if (egressRule && requiresMultipleActions) {
      results.push({
        ruleId: egressRule.id,
        ruleName: egressRule.name,
        passed: false,
        severity: "FAIL",
        message: "Egress door requires multiple actions to unlatch, violating single-motion requirement per IBC 1010",
        codeReferences: egressRule.code_references
      });
    }
  }
  
  return results;
}

function evaluateRule(opening: DoorOpening, rule: ComplianceRule): boolean {
  const condition = rule.conditions as unknown as RuleCondition;
  
  if (!condition || !condition.field || !condition.operator) {
    return false;
  }

  const fieldValue = (opening as any)[condition.field];
  
  if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
    if (condition.operator === "required" || condition.operator === "exists") {
      return true;
    }
    return false;
  }

  switch (condition.operator) {
    case ">=":
      return !compareNumeric(fieldValue, condition.value as string, ">=");
    
    case "<=":
      return !compareNumeric(fieldValue, condition.value as string, "<=");
    
    case ">":
      return !compareNumeric(fieldValue, condition.value as string, ">");
    
    case "<":
      return !compareNumeric(fieldValue, condition.value as string, "<");
    
    case "==":
    case "=":
      return String(fieldValue).toLowerCase() !== String(condition.value).toLowerCase();
    
    case "!=":
      return String(fieldValue).toLowerCase() === String(condition.value).toLowerCase();
    
    case "includes":
      return !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
    
    case "in":
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      return !values.some(v => String(fieldValue).toLowerCase().includes(String(v).toLowerCase()));
    
    case "exists":
    case "required":
      return false;
    
    default:
      return false;
  }
}

function parseToInches(value: string): number {
  if (!value) return NaN;
  
  const trimmed = value.trim();
  
  const feetInchesMatch = trimmed.match(/^(\d+)'(\d+(?:\.\d+)?)"?$/);
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1]);
    const inches = parseFloat(feetInchesMatch[2]);
    return feet * 12 + inches;
  }
  
  const feetOnlyMatch = trimmed.match(/^(\d+(?:\.\d+)?)'$/);
  if (feetOnlyMatch) {
    return parseFloat(feetOnlyMatch[1]) * 12;
  }
  
  const inchesMatch = trimmed.match(/^(\d+(?:\.\d+)?)"?$/);
  if (inchesMatch) {
    return parseFloat(inchesMatch[1]);
  }
  
  const plainNumber = parseFloat(trimmed);
  if (!isNaN(plainNumber)) {
    return plainNumber;
  }
  
  return NaN;
}

function compareNumeric(value: string, threshold: string, operator: string): boolean {
  const numValue = parseToInches(value);
  const numThreshold = parseToInches(threshold);
  
  if (isNaN(numValue) || isNaN(numThreshold)) {
    return false;
  }

  switch (operator) {
    case ">=":
      return numValue >= numThreshold;
    case "<=":
      return numValue <= numThreshold;
    case ">":
      return numValue > numThreshold;
    case "<":
      return numValue < numThreshold;
    default:
      return false;
  }
}

export async function getOpeningViolations(openingId: string) {
  const violations = await db.query.complianceViolations.findMany({
    where: eq(complianceViolations.openingId, openingId),
    with: {
      rule: true,
    },
  });

  return violations.filter(v => v.status === "open");
}

export async function getProjectViolations(projectId: string) {
  const openings = await db.select().from(doorOpenings).where(eq(doorOpenings.projectId, projectId));
  const openingIds = openings.map(o => o.id);
  
  const allViolations = [];
  for (const openingId of openingIds) {
    const violations = await getOpeningViolations(openingId);
    allViolations.push(...violations);
  }
  
  return allViolations;
}

export async function resolveViolation(violationId: string, notes?: string) {
  const [violation] = await db.update(complianceViolations)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
      resolutionNotes: notes || null,
    })
    .where(eq(complianceViolations.id, violationId))
    .returning();
  
  return violation;
}

export async function waiveViolation(violationId: string, notes: string) {
  const [violation] = await db.update(complianceViolations)
    .set({
      status: "waived",
      resolutionNotes: notes,
    })
    .where(eq(complianceViolations.id, violationId))
    .returning();
  
  return violation;
}

// Hardware-specific compliance validation using the new rule engine

export interface HardwareComplianceContext {
  // Basic context
  jurisdiction?: string;
  hardwareType?: string;
  hardwareHeightIn?: number;
  isAccessibleRoute?: boolean;
  isMeansOfEgress?: boolean;
  
  // Fire door context
  fireRatingMinutes?: number;
  sideClearanceIn?: number;
  bottomClearanceIn?: number;
  thresholdHeightIn?: number;
  doorHeightIn?: number;
  hingeCount?: number;
  hasCloser?: boolean;
  
  // Fire door labeling
  hasLeafLabel?: boolean;
  hasFrameLabel?: boolean;
  leafRatingMinutes?: number;
  frameRatingMinutes?: number;
  
  // Egress door context
  occupantLoad?: number;
  occupancyGroup?: string;
  swingsInEgressDirection?: boolean;
  clearWidthIn?: number;
  isMainExit?: boolean;
  
  // Panic hardware context
  hasPanicHardware?: boolean;
  hasFireExitHardware?: boolean;
  
  // Delayed egress context
  delaySeconds?: number;
  hasDelayedEgressSignage?: boolean;
  
  // Maglock context
  hasMaglockSensor?: boolean;
  hasMaglockManualRelease?: boolean;
  maglockReleaseHeightIn?: number;
  
  // Electrified hardware context
  hasFireAlarmInterface?: boolean;
  failMode?: "fail_safe" | "fail_secure";
  
  // Automatic operator context
  hasAutoOperatorSensors?: boolean;
  hasBreakout?: boolean;
  breakoutForceLbf?: number;
  
  // Door closer context
  openingForceLbf?: number;
  sweepTimeSeconds?: number;
}

export function checkHardwareCompliance(context: HardwareComplianceContext): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];
  const jurisdiction = context.jurisdiction || "US";

  // Check hardware height if provided
  if (context.hardwareHeightIn !== undefined && context.hardwareType) {
    const heightResults = validateHardwareHeight(
      context.hardwareHeightIn,
      jurisdiction,
      context.hardwareType,
      context.isAccessibleRoute ?? false,
      context.isMeansOfEgress ?? false
    );
    results.push(...heightResults);
  }

  // Check fire door clearances if applicable
  if (
    context.fireRatingMinutes !== undefined &&
    context.fireRatingMinutes > 0 &&
    context.sideClearanceIn !== undefined &&
    context.bottomClearanceIn !== undefined
  ) {
    const clearanceResults = validateFireDoorClearances(
      context.sideClearanceIn,
      context.bottomClearanceIn,
      context.fireRatingMinutes
    );
    results.push(...clearanceResults);
  }

  // Check threshold height if on accessible route
  if (context.thresholdHeightIn !== undefined && context.isAccessibleRoute) {
    const thresholdResult = validateThreshold(
      context.thresholdHeightIn,
      context.isAccessibleRoute
    );
    if (thresholdResult) {
      results.push(thresholdResult);
    }
  }

  // Check hinge count for fire doors
  if (
    context.fireRatingMinutes !== undefined &&
    context.fireRatingMinutes > 0 &&
    context.doorHeightIn !== undefined &&
    context.hingeCount !== undefined
  ) {
    const hingeResult = validateHingeCount(
      context.hingeCount,
      context.doorHeightIn,
      context.fireRatingMinutes
    );
    if (hingeResult) {
      results.push(hingeResult);
    }
  }

  // Check fire door closer requirement
  if (
    context.fireRatingMinutes !== undefined &&
    context.fireRatingMinutes > 0 &&
    context.hasCloser !== undefined
  ) {
    const closerResult = validateFireDoorCloser(context.hasCloser, context.fireRatingMinutes);
    if (closerResult) {
      results.push(closerResult);
    }
  }

  // Check fire door labeling
  if (
    context.fireRatingMinutes !== undefined &&
    context.fireRatingMinutes > 0 &&
    context.hasLeafLabel !== undefined &&
    context.hasFrameLabel !== undefined
  ) {
    const labelResults = validateFireDoorLabeling(
      context.hasLeafLabel,
      context.hasFrameLabel,
      context.leafRatingMinutes ?? context.fireRatingMinutes,
      context.frameRatingMinutes ?? context.fireRatingMinutes,
      context.fireRatingMinutes
    );
    results.push(...labelResults);
  }

  // Check egress door requirements (swing direction, clear width)
  if (context.isMeansOfEgress && context.occupantLoad !== undefined) {
    const egressResults = validateEgressDoor(
      context.occupantLoad,
      context.swingsInEgressDirection ?? true,
      context.clearWidthIn ?? 36,
      context.isMainExit ?? false
    );
    results.push(...egressResults);
  }

  // Check panic hardware requirements
  if (context.occupancyGroup !== undefined && context.occupantLoad !== undefined) {
    const panicResults = validatePanicHardware(
      context.occupancyGroup,
      context.occupantLoad,
      context.hasPanicHardware ?? false,
      (context.fireRatingMinutes ?? 0) > 0,
      context.hasFireExitHardware ?? false
    );
    results.push(...panicResults);
  }

  // Check delayed egress requirements
  if (context.delaySeconds !== undefined && context.hardwareType === "delayed_egress_lock") {
    const delayedEgressResults = validateDelayedEgress(
      context.delaySeconds,
      context.hasFireAlarmInterface ?? false,
      context.hasDelayedEgressSignage ?? false,
      context.failMode ?? "fail_safe"
    );
    results.push(...delayedEgressResults);
  }

  // Check maglock requirements
  if (context.hardwareType === "electromagnetic_lock" || context.hardwareType === "maglock") {
    const maglockResults = validateMaglock(
      context.hasMaglockSensor ?? false,
      context.hasMaglockManualRelease ?? false,
      context.hasFireAlarmInterface ?? false,
      context.failMode ?? "fail_safe",
      context.maglockReleaseHeightIn
    );
    results.push(...maglockResults);
  }

  // Check automatic operator requirements
  if (context.hardwareType === "auto_operator" || context.hardwareType === "power_operator") {
    const autoOpResults = validateAutoOperator(
      context.hasAutoOperatorSensors ?? false,
      context.hasBreakout ?? false,
      context.breakoutForceLbf ?? 50,
      context.sweepTimeSeconds ?? 3
    );
    results.push(...autoOpResults);
  }

  // Check door closer requirements (opening force, sweep time)
  if (
    context.hardwareType === "door_closer" &&
    context.isAccessibleRoute &&
    (context.openingForceLbf !== undefined || context.sweepTimeSeconds !== undefined)
  ) {
    const closerResults = validateDoorCloser(
      context.openingForceLbf ?? 5,
      context.sweepTimeSeconds ?? 5,
      context.isAccessibleRoute
    );
    results.push(...closerResults);
  }

  // Check fire door assembly requirements (informational)
  if (context.fireRatingMinutes !== undefined && context.fireRatingMinutes > 0) {
    const fireFlags = getFireDoorRequiredFlags(context.fireRatingMinutes);
    const fireRule = findRuleById("fire_door_listed_assembly");
    
    if (fireRule) {
      results.push({
        ruleId: fireRule.id,
        ruleName: fireRule.name,
        passed: true,
        severity: "INFO",
        message: `Fire door (${context.fireRatingMinutes} min) requires: Listed assembly=${fireFlags.fire_listed_assembly_required}, Self-closing=${fireFlags.self_closing_required}`,
        codeReferences: fireRule.code_references
      });
    }
  }

  return results;
}

// Get all hardware rules for display/reference
export function getAllHardwareRules(): DoorHardwareRule[] {
  return doorHardwareRules;
}

// Get rules by category for UI filtering
export function getHardwareRulesByCategory(category: RuleCategory): DoorHardwareRule[] {
  return getRulesByCategory(category);
}

// Get rules for a specific jurisdiction
export function getHardwareRulesForJurisdiction(jurisdiction: string): DoorHardwareRule[] {
  return getRulesForJurisdiction(jurisdiction);
}

// Get rules by subject (hardware, leaf, frame, assembly, electrified, etc.)
export function getHardwareRulesBySubject(subject: RuleSubject): DoorHardwareRule[] {
  return getRulesBySubject(subject);
}

// Get all available rule categories
export function getAvailableRuleCategories(): RuleCategory[] {
  return getRuleCategories();
}

// Get all available code sources
export function getAvailableCodeSources(): CodeSource[] {
  return getCodeSources();
}

// Get all available rule subjects
export function getAvailableRuleSubjects(): RuleSubject[] {
  return getRuleSubjects();
}

// Re-export types for use by routes
export type { HardwareValidationResult, DoorHardwareRule, RuleCategory, RuleSubject, CodeSource };

// Re-export individual validation functions for direct use
export {
  validateDelayedEgress,
  validateMaglock,
  validateAutoOperator,
  validateDoorCloser,
  validatePanicHardware,
  validateEgressDoor,
  validateFireDoorLabeling,
  validateHingeCount,
  validateFireDoorCloser,
};
