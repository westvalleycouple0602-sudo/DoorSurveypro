// Building Code Validation Service
// US & Canada compliance validation for door openings

import {
  getCountryRules,
  MEASUREMENT_TOLERANCE_IN,
  type Country,
  type DoorType,
  type DoorOperation,
  type ValidationSeverity,
} from "./rules";

export interface ValidationCheck {
  code: string;
  passed: boolean;
  severity: ValidationSeverity;
  message: string;
  context: Record<string, any>;
}

export interface DoorMeasurements {
  clear_opening_in?: number;
  clear_height_in?: number;
  threshold_height_in?: number;
  hardware_height_in?: number;
  gaps_in?: {
    top?: number;
    latch?: number;
    hinge?: number;
    meeting_stiles?: number;
    bottom?: number;
  };
  maneuvering?: {
    pull_side?: {
      latch_side_in?: number;
      perpendicular_depth_in?: number;
    };
    push_side?: {
      latch_side_in?: number;
      perpendicular_depth_in?: number;
    };
  };
  clear_opening_in_power_on?: number;
  clear_opening_in_power_off?: number;
  breakout_clear_opening_in?: number;
}

export interface DoorConfig {
  type?: DoorType;
  operation?: DoorOperation;
  fire_rating_minutes?: number;
  has_breakout?: boolean;
  power_fail_safe_open?: boolean;
  adjacent_swing_door_present?: boolean;
}

export interface ValidationPayload {
  country?: Country;
  residential?: boolean;
  accessible_route?: boolean;
  egress_required?: boolean;
  occupant_load?: number;
  door?: DoorConfig;
  measurements?: DoorMeasurements;
  config?: {
    measurement_uncertainty_in?: number;
    ca_allow_legacy_800mm?: boolean;
  };
}

export interface ValidationResult {
  summary: {
    total: number;
    failed: number;
    passed: number;
  };
  results: ValidationCheck[];
}

// Helper: Check if measurement meets minimum requirement (within tolerance)
function withinLower(measured: number, requiredMin: number, tolerance: number): boolean {
  return measured + tolerance >= requiredMin;
}

// Helper: Check if measurement meets maximum requirement (within tolerance)
function withinUpper(measured: number, requiredMax: number, tolerance: number): boolean {
  return measured <= requiredMax + tolerance;
}

// Helper: Add validation check result
function addCheck(
  results: ValidationCheck[],
  passed: boolean,
  code: string,
  message: string,
  severity: ValidationSeverity = "FAIL",
  context: Record<string, any> = {}
): void {
  results.push({
    code,
    passed,
    severity: passed ? "INFO" : severity,
    message,
    context,
  });
}

export function validateDoorOpening(payload: ValidationPayload): ValidationResult {
  const country: Country = payload.country || "US";
  const residential = payload.residential ?? false;
  const accessible = payload.accessible_route ?? true;
  const egress = payload.egress_required ?? true;
  const door = payload.door || {};
  const meas = payload.measurements || {};
  const tolerance = payload.config?.measurement_uncertainty_in ?? MEASUREMENT_TOLERANCE_IN;
  
  const rules = getCountryRules(country);
  const results: ValidationCheck[] = [];

  // ============================================================================
  // CLEAR WIDTH VALIDATION
  // ============================================================================
  if (accessible || egress) {
    let minClearOpening: number;
    
    if (country === "CA") {
      minClearOpening = rules.accessibility.min_clear_opening_in;
      // Allow legacy 800mm (31.5") if configured
      if (payload.config?.ca_allow_legacy_800mm && rules.accessibility.legacy_min_clear_opening_in) {
        minClearOpening = Math.min(minClearOpening, rules.accessibility.legacy_min_clear_opening_in);
      }
    } else {
      // US: Use the greater of accessibility or egress requirements
      minClearOpening = Math.max(
        rules.accessibility.min_clear_opening_in,
        rules.egress.min_clear_opening_in
      );
    }

    const measuredWidth = meas.clear_opening_in ?? 0;
    const passed = withinLower(measuredWidth, minClearOpening, tolerance);
    
    addCheck(
      results,
      passed,
      "CLEAR_WIDTH",
      `Clear opening ${measuredWidth.toFixed(2)}" ≥ required ${minClearOpening.toFixed(2)}" (±${tolerance.toFixed(2)}")`,
      "FAIL",
      {
        measured_in: measuredWidth,
        required_min_in: minClearOpening,
        tolerance_in: tolerance,
      }
    );
  }

  // ============================================================================
  // CLEAR HEIGHT VALIDATION
  // ============================================================================
  let minHeight = rules.egress.min_clear_height_in;
  
  // US residential exception
  if (residential && country === "US" && egress && rules.egress.residential_min_clear_height_in) {
    minHeight = Math.min(minHeight, rules.egress.residential_min_clear_height_in);
  }

  const measuredHeight = meas.clear_height_in ?? 0;
  const heightPassed = withinLower(measuredHeight, minHeight, tolerance);
  
  addCheck(
    results,
    heightPassed,
    "CLEAR_HEIGHT",
    `Clear height ${measuredHeight.toFixed(2)}" ≥ required ${minHeight.toFixed(2)}"`,
    "FAIL",
    {
      measured_in: measuredHeight,
      required_min_in: minHeight,
      tolerance_in: tolerance,
    }
  );

  // ============================================================================
  // THRESHOLD VALIDATION
  // ============================================================================
  const thresholdReq = accessible
    ? rules.accessibility.threshold_max_in
    : rules.sliding_egress.threshold_max_in;
  
  const thresholdMeas = meas.threshold_height_in ?? 0;
  const thresholdPassed = withinUpper(thresholdMeas, thresholdReq, tolerance);
  
  addCheck(
    results,
    thresholdPassed,
    "THRESHOLD",
    `Threshold ${thresholdMeas.toFixed(2)}" ≤ max ${thresholdReq.toFixed(2)}"`,
    "FAIL",
    {
      measured_in: thresholdMeas,
      required_max_in: thresholdReq,
      tolerance_in: tolerance,
    }
  );

  // ============================================================================
  // HARDWARE HEIGHT VALIDATION
  // ============================================================================
  const hardwareHeight = meas.hardware_height_in ?? 0;
  
  if (hardwareHeight > 0) {
    const [hMin, hMax] = rules.accessibility.hardware_height_in_range;
    const hwPassed = withinLower(hardwareHeight, hMin, tolerance) && withinUpper(hardwareHeight, hMax, tolerance);
    
    addCheck(
      results,
      hwPassed,
      "HARDWARE_HEIGHT",
      `Hardware height ${hardwareHeight.toFixed(2)}" within ${hMin.toFixed(0)}"–${hMax.toFixed(0)}"`,
      "FAIL",
      {
        measured_in: hardwareHeight,
        required_range_in: [hMin, hMax],
        tolerance_in: tolerance,
      }
    );
  } else {
    addCheck(
      results,
      true,
      "HARDWARE_HEIGHT",
      "Hardware height not provided; skipping",
      "INFO",
      {}
    );
  }

  // ============================================================================
  // GAP VALIDATION (Fire-rated vs Non-fire)
  // ============================================================================
  const fireRating = door.fire_rating_minutes ?? 0;
  const gapRules = fireRating > 0 ? rules.fire_door_gaps_in : rules.non_fire_swing_gaps_in;
  const gaps = meas.gaps_in || {};

  const gapChecks: Array<[string, keyof typeof gapRules, string]> = [
    ["top", "top_max", "Top"],
    ["latch", "sides_max", "Latch"],
    ["hinge", "sides_max", "Hinge"],
    ["meeting_stiles", "meeting_stiles_max", "Meeting stiles"],
    ["bottom", "bottom_max", "Bottom"],
  ];

  for (const [key, ruleKey, label] of gapChecks) {
    if (gaps[key as keyof typeof gaps] !== undefined && gaps[key as keyof typeof gaps] !== null) {
      const gapValue = gaps[key as keyof typeof gaps]!;
      const reqMax = gapRules[ruleKey];
      const gapPassed = withinUpper(gapValue, reqMax, tolerance);
      const sev: ValidationSeverity = fireRating > 0 ? "FAIL" : "WARN";
      
      addCheck(
        results,
        gapPassed,
        `GAP_${key.toUpperCase()}`,
        `${label} gap ${gapValue.toFixed(3)}" ≤ max ${reqMax.toFixed(3)}"`,
        sev,
        {
          measured_in: gapValue,
          required_max_in: reqMax,
          tolerance_in: tolerance,
        }
      );
    }
  }

  // ============================================================================
  // MANEUVERING CLEARANCES VALIDATION
  // ============================================================================
  const maneuver = meas.maneuvering;
  
  if (accessible && maneuver) {
    const needPull = rules.accessibility.maneuvering_clearances_in.pull_side;
    const needPush = rules.accessibility.maneuvering_clearances_in.push_side;

    for (const [side, need] of [["pull_side", needPull], ["push_side", needPush]] as const) {
      const have = maneuver[side] || {};
      
      for (const [dim, minVal] of Object.entries(need)) {
        const measVal = have[dim as keyof typeof have] ?? 0;
        const manPassed = withinLower(measVal, minVal, tolerance);
        
        addCheck(
          results,
          manPassed,
          `MANEUVER_${side.toUpperCase()}_${dim.toUpperCase()}`,
          `${side} ${dim.replace(/_/g, " ")} ${measVal.toFixed(1)}" ≥ ${minVal.toFixed(1)}"`,
          "FAIL",
          {
            measured_in: measVal,
            required_min_in: minVal,
            tolerance_in: tolerance,
          }
        );
      }
    }
  }

  // ============================================================================
  // DOOR TYPE SPECIFIC VALIDATIONS
  // ============================================================================
  const doorType = (door.type || "swing").toLowerCase() as DoorType;
  const operation = (door.operation || "manual").toLowerCase() as DoorOperation;
  const occupantLoad = payload.occupant_load ?? 0;

  // SLIDING DOOR VALIDATION
  if (doorType === "sliding") {
    // Manual sliding egress occupant load check
    if (operation === "manual" && egress && occupantLoad > rules.sliding_egress.manual_allowed_if_occupant_load_lte) {
      addCheck(
        results,
        false,
        "SLIDING_MANUAL_EGRESS_OCCUPANT_LOAD",
        `Manual sliding door used for egress serving ${occupantLoad} occupants exceeds allowed ${rules.sliding_egress.manual_allowed_if_occupant_load_lte}`,
        "FAIL",
        { occupant_load: occupantLoad }
      );
    }

    // Breakout requirement
    if (egress && rules.sliding_egress.requires_breakout_or_push_open) {
      const hasBreakout = door.has_breakout ?? false;
      addCheck(
        results,
        hasBreakout,
        "SLIDING_BREAKOUT",
        "Sliding egress door must have breakout or be push-open on failure",
        "FAIL",
        { has_breakout: hasBreakout }
      );
    }

    // Emergency clear opening
    const emerMin = rules.sliding_egress.min_emergency_clear_opening_in;
    const measEmer = meas.clear_opening_in ?? 0;
    const emerPassed = withinLower(measEmer, emerMin, tolerance);
    
    addCheck(
      results,
      emerPassed,
      "SLIDING_EMERGENCY_CLEAR",
      `Emergency clear opening ${measEmer.toFixed(2)}" ≥ ${emerMin.toFixed(2)}"`,
      "FAIL",
      {
        measured_in: measEmer,
        required_min_in: emerMin,
        tolerance_in: tolerance,
      }
    );
  }

  // REVOLVING DOOR VALIDATION
  if (doorType === "revolving") {
    // Accessible route prohibition
    if (accessible && rules.revolving.not_accessible_route) {
      addCheck(
        results,
        false,
        "REVOLVING_ACCESSIBLE_ROUTE",
        "Revolving doors are not permitted on accessible routes; provide adjacent swinging/sliding door",
        "FAIL",
        {}
      );
    }

    // Adjacent swing door requirement
    const adjSwing = door.adjacent_swing_door_present ?? false;
    addCheck(
      results,
      adjSwing,
      "REVOLVING_ADJACENT_SWING",
      "Adjacent swinging door present for egress and accessibility",
      "FAIL",
      { adjacent_swing_door_present: adjSwing }
    );

    // Breakout feature
    if (door.has_breakout !== undefined) {
      const hasBreakout = door.has_breakout ?? false;
      addCheck(
        results,
        hasBreakout,
        "REVOLVING_BREAKOUT_PRESENT",
        "Revolving door provides breakout/collapse feature",
        "FAIL",
        { has_breakout: hasBreakout }
      );
    }

    // Breakout clear opening
    const minBreakout = rules.revolving.min_breakout_clear_opening_in;
    const measBreakout = meas.breakout_clear_opening_in ?? meas.clear_opening_in ?? 0;
    
    if (measBreakout > 0) {
      const breakoutPassed = withinLower(measBreakout, minBreakout, tolerance);
      addCheck(
        results,
        breakoutPassed,
        "REVOLVING_BREAKOUT_CLEAR",
        `Breakout clear opening ${measBreakout.toFixed(2)}" ≥ ${minBreakout.toFixed(2)}"`,
        "FAIL",
        {
          measured_in: measBreakout,
          required_min_in: minBreakout,
          tolerance_in: tolerance,
        }
      );
    }
  }

  // AUTOMATIC DOOR VALIDATION
  if (operation === "automatic") {
    // Fail-safe requirement
    const failSafe = door.power_fail_safe_open ?? false;
    
    if (rules.automatic_doors.requires_fail_safe && egress) {
      addCheck(
        results,
        failSafe,
        "AUTO_FAIL_SAFE",
        "Automatic door must fail safe for egress (opens or is push-openable on power loss)",
        "FAIL",
        { power_fail_safe_open: failSafe }
      );
    }

    // Clear opening when powered
    const clearOn = meas.clear_opening_in_power_on ?? meas.clear_opening_in ?? 0;
    const reqOn = rules.automatic_doors.min_clear_opening_in_power_on;
    
    addCheck(
      results,
      withinLower(clearOn, reqOn, tolerance),
      "AUTO_CLEAR_ON",
      `Powered clear opening ${clearOn.toFixed(2)}" ≥ ${reqOn.toFixed(2)}"`,
      "FAIL",
      { measured_in: clearOn, required_min_in: reqOn }
    );

    // Clear opening when unpowered
    const clearOff = meas.clear_opening_in_power_off ?? meas.clear_opening_in ?? 0;
    const reqOff = rules.automatic_doors.min_clear_opening_in_power_off;
    
    addCheck(
      results,
      withinLower(clearOff, reqOff, tolerance),
      "AUTO_CLEAR_OFF",
      `Power-off clear opening ${clearOff.toFixed(2)}" ≥ ${reqOff.toFixed(2)}"`,
      "FAIL",
      { measured_in: clearOff, required_min_in: reqOff }
    );
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  const failed = results.filter((r) => !r.passed && (r.severity === "FAIL" || r.severity === "WARN"));
  const passed = results.filter((r) => r.passed);

  return {
    summary: {
      total: results.length,
      failed: failed.length,
      passed: passed.length,
    },
    results,
  };
}
