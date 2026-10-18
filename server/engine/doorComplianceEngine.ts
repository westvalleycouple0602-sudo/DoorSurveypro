// server/engine/doorComplianceEngine.ts
// Enhanced Door Compliance Engine with context-aware evaluation and confidence scoring

import {
  DoorHardwareRule,
  getEffectiveRulesForJurisdiction,
  RuleCategory,
  CodeReference,
  fillTemplate
} from "../validation/doorHardwareRules";

// ====== Measurement Types ======

export type MeasurementSource = "manual" | "lidar" | "photo_estimate";

export interface HardwareMeasurement {
  hardwareId: string;
  type: string;
  role?: string;
  required_for_normal_egress_or_entry?: boolean;
  required_for_egress?: boolean;
  centerline_height_aff_in?: number;
  threshold_height_in?: number;
  measurement_source?: MeasurementSource;

  /** LiDAR-specific confidence score (0-1) */
  lidar_confidence?: number;
  /** LiDAR bounding box in door coordinate space (normalized 0-1) */
  lidar_bbox_door_space?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DoorOpeningContext {
  openingId: string;
  jurisdiction: string;
  on_accessible_route: boolean;
  is_means_of_egress_door: boolean;
  occupancy_group?: string;
  required_fire_rating_minutes?: number;
  has_threshold?: boolean;
  has_vision_lite?: boolean;
  approach_type?: "front" | "hinge_side" | "latch_side";
  door_height_in?: number;
  door_operation?: string;
  has_closer?: boolean;
  hinge_count?: number;
  side_clearance_in?: number;
  bottom_clearance_in?: number;
  code_edition?: string;
  construction_year?: number;
  metadata?: Record<string, unknown>;
}

export type ViolationSeverity = "info" | "warning" | "life_safety";

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  openingId: string;
  hardwareId?: string;
  passed: boolean;
  severity: ViolationSeverity;
  message: string;
  remediation?: string;
  costImpact?: "low" | "medium" | "high";
  codeReferences: string[];
  confidence: number;
  measurement_source?: MeasurementSource;
  evidence?: string[];
  measuredValue?: number;
  requiredRange?: { min?: number; max?: number };
}

// ====== Confidence Scoring ======

function getConfidenceFromSource(source?: MeasurementSource, lidarConfidence?: number): number {
  let baseConfidence: number;
  switch (source) {
    case "lidar":
      baseConfidence = 0.95;
      if (typeof lidarConfidence === "number") {
        baseConfidence = Math.min(0.99, baseConfidence * lidarConfidence);
      }
      return baseConfidence;
    case "manual": return 0.85;
    case "photo_estimate": return 0.60;
    default: return 0.60;
  }
}

// ====== Rule Applicability Checks ======

function ruleAppliesToHardware(rule: DoorHardwareRule, hw: HardwareMeasurement): boolean {
  const condStr = rule.conditions.join(" ").toLowerCase();

  if (condStr.includes("hardware.type") && hw.type) {
    if (!condStr.includes(hw.type.toLowerCase())) return false;
  }

  if (condStr.includes("hardware.role") && hw.role) {
    if (!condStr.includes(hw.role.toLowerCase())) return false;
  }

  return true;
}

function appliesToOpening(rule: DoorHardwareRule, opening: DoorOpeningContext): boolean {
  const condStr = rule.conditions.join(" ").toLowerCase();

  if (condStr.includes("opening.on_accessible_route") && !opening.on_accessible_route) {
    return false;
  }

  if (condStr.includes("opening.is_means_of_egress_door") && !opening.is_means_of_egress_door) {
    return false;
  }

  if (condStr.includes("opening.required_fire_rating_minutes") && !opening.required_fire_rating_minutes) {
    return false;
  }

  if (condStr.includes("opening.has_vision_lite") && !opening.has_vision_lite) {
    return false;
  }

  if (condStr.includes("opening.has_threshold") && !opening.has_threshold) {
    return false;
  }

  return true;
}

function isCodeEditionApplicable(rule: DoorHardwareRule, opening: DoorOpeningContext): boolean {
  if (!rule.effective_from_year && !rule.effective_to_year) {
    return true;
  }

  const constructionYear = opening.construction_year || new Date().getFullYear();

  if (rule.effective_from_year && constructionYear < rule.effective_from_year) {
    return false;
  }

  if (rule.effective_to_year && constructionYear > rule.effective_to_year) {
    return false;
  }

  return true;
}

// ====== Severity Determination ======

function determineSeverity(rule: DoorHardwareRule, passed: boolean): ViolationSeverity {
  if (passed) return "info";

  if (rule.category === "fire_door_assembly" || rule.category === "operable_parts_egress") {
    return "life_safety";
  }

  if (rule.category === "accessibility_reach_operability" ||
      rule.category === "thresholds_clearances") {
    return "warning";
  }

  return "warning";
}

// ====== Individual Rule Evaluation ======

function evaluateRule(
  rule: DoorHardwareRule,
  opening: DoorOpeningContext,
  hw: HardwareMeasurement
): RuleEvaluationResult | null {
  if (!appliesToOpening(rule, opening)) return null;
  if (!isCodeEditionApplicable(rule, opening)) return null;
  if (!ruleAppliesToHardware(rule, hw)) return null;

  let passed = true;
  let messages: string[] = [];
  let measuredValue: number | undefined;
  let requiredRange: { min?: number; max?: number } | undefined;
  let baseConfidence = getConfidenceFromSource(hw.measurement_source, hw.lidar_confidence);

  // Check height requirements
  if (rule.requirements.height_aff) {
    const { min_in, max_in } = rule.requirements.height_aff;
    const measured = hw.centerline_height_aff_in;

    if (measured !== undefined) {
      measuredValue = measured;
      requiredRange = { min: min_in, max: max_in };

      if ((min_in !== undefined && measured < min_in) || (max_in !== undefined && measured > max_in)) {
        passed = false;
        messages.push(
          `Measured height ${measured.toFixed(1)} in AFF is outside required range ` +
          `${min_in ?? "-"}–${max_in ?? "-"} in AFF.`
        );
      }
    } else {
      messages.push("No height measurement provided; unable to fully verify.");
      baseConfidence = 0.4;
    }
  }

  // Check threshold height
  if (rule.requirements.dimensions?.threshold_max_height_in !== undefined && opening.has_threshold) {
    const maxTh = rule.requirements.dimensions.threshold_max_height_in;
    const measuredTh = hw.threshold_height_in;

    if (measuredTh !== undefined && maxTh !== undefined && measuredTh > maxTh) {
      passed = false;
      measuredValue = measuredTh;
      requiredRange = { max: maxTh };
      messages.push(
        `Threshold height ${measuredTh.toFixed(2)} in exceeds allowed maximum ${maxTh.toFixed(2)} in.`
      );
    }
  }

  // Check fire door clearances
  if (rule.id === "fire_door_clearances" && opening.required_fire_rating_minutes) {
    const { max_vertical_clearance_in, max_bottom_clearance_in } = rule.requirements.dimensions || {};

    if (max_vertical_clearance_in && opening.side_clearance_in !== undefined) {
      if (opening.side_clearance_in > max_vertical_clearance_in) {
        passed = false;
        messages.push(
          `Side clearance ${opening.side_clearance_in}" exceeds ${max_vertical_clearance_in}" max per NFPA 80`
        );
      }
    }

    if (max_bottom_clearance_in && opening.bottom_clearance_in !== undefined) {
      if (opening.bottom_clearance_in > max_bottom_clearance_in) {
        passed = false;
        messages.push(
          `Bottom clearance ${opening.bottom_clearance_in}" exceeds ${max_bottom_clearance_in}" max per NFPA 80`
        );
      }
    }
  }

  // Check fire door self-closing
  if (rule.id === "fire_door_self_closing" && opening.required_fire_rating_minutes) {
    if (!opening.has_closer) {
      passed = false;
      messages.push("Fire-rated door is missing required self-closing device");
    }
  }

  // Check hinge count for fire doors
  if (rule.id === "fire_door_hinge_count_spacing" && 
      opening.required_fire_rating_minutes && 
      opening.door_height_in) {
    const requiredHinges = opening.door_height_in <= 60 
      ? 2 
      : 2 + Math.ceil((opening.door_height_in - 60) / 30);

    if (opening.hinge_count !== undefined && opening.hinge_count < requiredHinges) {
      passed = false;
      messages.push(
        `Door has ${opening.hinge_count} hinges but requires minimum ${requiredHinges} for ${opening.door_height_in}" door per NFPA 80`
      );
    }
  }

  // Check fire listed assembly
  if (rule.id === "fire_door_listed_assembly" && opening.required_fire_rating_minutes) {
    if (rule.requirements.flags?.fire_listed_assembly_required) {
      messages.push(
        `This ${opening.required_fire_rating_minutes}-minute rated assembly requires listed door, frame, and hardware`
      );
    }
  }

  // Check clear width at 90° (LiDAR-driven)
  const dims = rule.requirements.dimensions;
  if (dims?.min_clear_width_in !== undefined) {
    const requiredClear = dims.min_clear_width_in;
    const clearWidthAt90 = (opening.metadata as Record<string, unknown>)?.clearWidthAt90DegIn as number | undefined;

    if (clearWidthAt90 !== undefined) {
      if (clearWidthAt90 < requiredClear) {
        passed = false;
        measuredValue = clearWidthAt90;
        requiredRange = { min: requiredClear };
        messages.push(
          `Measured clear width at 90° is ${clearWidthAt90.toFixed(1)} in, which is less than required minimum ${requiredClear.toFixed(1)} in.`
        );
      }
    } else if (rule.id === "door_clear_width_90deg") {
      messages.push(
        "No LiDAR-derived clear width at 90° was provided; unable to fully verify door clear width."
      );
      baseConfidence = Math.min(baseConfidence, 0.5);
    }
  }

  const severity = determineSeverity(rule, passed);

  // Build message
  const templateValues: Record<string, unknown> = {
    ruleId: rule.id,
    openingId: opening.openingId,
    hardwareId: hw.hardwareId,
    measuredHeight: hw.centerline_height_aff_in,
    thresholdHeight: hw.threshold_height_in,
    requiredRating: opening.required_fire_rating_minutes,
    doorHeight: opening.door_height_in,
    sideClearance: opening.side_clearance_in,
    bottomClearance: opening.bottom_clearance_in,
    clearWidthAt90: (opening.metadata as Record<string, unknown>)?.clearWidthAt90DegIn,
    requiredClearWidth: dims?.min_clear_width_in
  };

  let message: string;
  if (!passed && rule.explanation_template) {
    message = fillTemplate(rule.explanation_template, templateValues);
    if (messages.length > 0) {
      message += ` ${messages.join(" ")}`;
    }
  } else if (messages.length > 0) {
    message = messages.join(" ");
  } else {
    message = passed 
      ? `${rule.name}: Compliant` 
      : `${rule.name}: Non-compliant`;
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    openingId: opening.openingId,
    hardwareId: hw.hardwareId,
    passed,
    severity,
    message,
    remediation: passed ? undefined : rule.remediation?.generic_fix,
    costImpact: rule.remediation?.cost_impact_estimate,
    codeReferences: rule.code_references.map((cr) => `${cr.source} ${cr.section}`),
    confidence: baseConfidence,
    measurement_source: hw.measurement_source,
    evidence: [],
    measuredValue,
    requiredRange
  };
}

// ====== Main Evaluation Function ======

export function evaluateOpeningAgainstRules(
  opening: DoorOpeningContext,
  hardwareList: HardwareMeasurement[]
): RuleEvaluationResult[] {
  const rules = getEffectiveRulesForJurisdiction(opening.jurisdiction);
  const results: RuleEvaluationResult[] = [];

  for (const rule of rules) {
    const applicableHardware = hardwareList.length > 0 
      ? hardwareList 
      : [{ hardwareId: "opening-level" } as HardwareMeasurement];

    for (const hw of applicableHardware) {
      const evalResult = evaluateRule(rule, opening, hw);
      if (evalResult) {
        results.push(evalResult);
      }
    }
  }

  return results;
}

// ====== Summary Functions ======

export function summarizeViolations(results: RuleEvaluationResult[]): {
  total: number;
  passed: number;
  failed: number;
  lifeSafety: number;
  warnings: number;
  info: number;
  averageConfidence: number;
} {
  const failed = results.filter(r => !r.passed);
  const passed = results.filter(r => r.passed);

  const lifeSafety = failed.filter(r => r.severity === "life_safety").length;
  const warnings = failed.filter(r => r.severity === "warning").length;
  const info = failed.filter(r => r.severity === "info").length;

  const avgConfidence = results.length > 0
    ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    : 0;

  return {
    total: results.length,
    passed: passed.length,
    failed: failed.length,
    lifeSafety,
    warnings,
    info,
    averageConfidence: Math.round(avgConfidence * 100) / 100
  };
}

export function getViolationsByCategory(
  results: RuleEvaluationResult[]
): Record<string, RuleEvaluationResult[]> {
  const byCategory: Record<string, RuleEvaluationResult[]> = {};
  const failed = results.filter(r => !r.passed);

  for (const result of failed) {
    const category = result.ruleId.split("_").slice(0, 2).join("_");
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(result);
  }

  return byCategory;
}

export function generateRemediationSummary(
  results: RuleEvaluationResult[]
): {
  lowCost: RuleEvaluationResult[];
  mediumCost: RuleEvaluationResult[];
  highCost: RuleEvaluationResult[];
  totalEstimatedEffort: string;
} {
  const failed = results.filter(r => !r.passed && r.remediation);

  const lowCost = failed.filter(r => r.costImpact === "low");
  const mediumCost = failed.filter(r => r.costImpact === "medium");
  const highCost = failed.filter(r => r.costImpact === "high");

  let effort = "minimal";
  if (highCost.length > 2 || (highCost.length > 0 && mediumCost.length > 3)) {
    effort = "significant";
  } else if (mediumCost.length > 2 || highCost.length > 0) {
    effort = "moderate";
  } else if (lowCost.length > 3) {
    effort = "light";
  }

  return {
    lowCost,
    mediumCost,
    highCost,
    totalEstimatedEffort: effort
  };
}

// ====== Temporal Compliance Check ======

export function checkGrandfatheredStatus(
  opening: DoorOpeningContext,
  results: RuleEvaluationResult[]
): {
  potentiallyGrandfathered: RuleEvaluationResult[];
  currentCodeViolations: RuleEvaluationResult[];
} {
  const currentYear = new Date().getFullYear();
  const constructionYear = opening.construction_year;

  if (!constructionYear) {
    return {
      potentiallyGrandfathered: [],
      currentCodeViolations: results.filter(r => !r.passed)
    };
  }

  const potentiallyGrandfathered: RuleEvaluationResult[] = [];
  const currentCodeViolations: RuleEvaluationResult[] = [];

  for (const result of results.filter(r => !r.passed)) {
    const codeYear = parseInt(result.codeReferences[0]?.match(/\d{4}/)?.[0] || "2010", 10);
    
    if (constructionYear < codeYear) {
      potentiallyGrandfathered.push(result);
    } else {
      currentCodeViolations.push(result);
    }
  }

  return { potentiallyGrandfathered, currentCodeViolations };
}
