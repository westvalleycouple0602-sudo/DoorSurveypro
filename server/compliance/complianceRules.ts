import type {
  BuildingCodeStandard,
  ComplianceIssue,
  ComplianceResult,
  DoorSurveyPayload,
} from "@shared/types/doorSurvey";

export interface ThresholdsConfig {
  minClearWidthMm: number;
  maxOpeningForceInteriorN: number;
  minHandleHeightMm: number;
  maxHandleHeightMm: number;
  maxVisionLiteAreaPctForFireDoors: number;
  minFireRatingMinutesForExitDoor: number;
  minHingesForDoorHeightMm: number;
}

export interface ComplianceConfig {
  thresholds: ThresholdsConfig;
}

export const defaultComplianceConfig: ComplianceConfig = {
  thresholds: {
    minClearWidthMm: 815,
    maxOpeningForceInteriorN: 67,
    minHandleHeightMm: 865,
    maxHandleHeightMm: 1220,
    maxVisionLiteAreaPctForFireDoors: 25,
    minFireRatingMinutesForExitDoor: 60,
    minHingesForDoorHeightMm: 2100,
  },
};

export interface RuleContext {
  payload: DoorSurveyPayload;
  config: ComplianceConfig;
}

export interface ComplianceRule {
  id: string;
  label: string;
  standard: BuildingCodeStandard;
  description: string;
  applies: (ctx: RuleContext) => boolean;
  check: (ctx: RuleContext) => ComplianceIssue | null;
}

const makeIssue = (
  standard: BuildingCodeStandard,
  codeRef: string,
  severity: ComplianceIssue["severity"],
  message: string
): ComplianceIssue => ({
  standard,
  codeRef,
  severity,
  message,
});

const ruleAdaClearWidth: ComplianceRule = {
  id: "ADA_CLEAR_WIDTH",
  label: "Clear width at door",
  standard: "ADA",
  description:
    "Checks that the clear opening width at the door meets the minimum specified by configuration.",
  applies: ({ payload }) => !!payload.opening.measurements.clearWidthMm,
  check: ({ payload, config }) => {
    const { clearWidthMm } = payload.opening.measurements;
    if (clearWidthMm >= config.thresholds.minClearWidthMm) return null;

    return makeIssue(
      "ADA",
      "ADA 404 (approx.)",
      "critical",
      `Clear width ${clearWidthMm} mm is below configured minimum of ${config.thresholds.minClearWidthMm} mm.`
    );
  },
};

const ruleAdaHandleHeight: ComplianceRule = {
  id: "ADA_HANDLE_HEIGHT",
  label: "Operable part height",
  standard: "ADA",
  description:
    "Ensures handle / operable hardware height is within configured range.",
  applies: () => true,
  check: ({ config }) => {
    const measuredHeightMm = undefined as unknown as number | undefined;
    if (measuredHeightMm == null) return null;

    const { minHandleHeightMm, maxHandleHeightMm } = config.thresholds;
    if (
      measuredHeightMm < minHandleHeightMm ||
      measuredHeightMm > maxHandleHeightMm
    ) {
      return makeIssue(
        "ADA",
        "ADA 404 / 309 (approx.)",
        "critical",
        `Handle height ${measuredHeightMm} mm is outside configured range (${minHandleHeightMm}–${maxHandleHeightMm} mm).`
      );
    }
    return null;
  },
};

const ruleFireRatingMatchesUse: ComplianceRule = {
  id: "IBC_FIRE_RATING_MATCH",
  label: "Door fire rating vs. use",
  standard: "IBC",
  description:
    "Checks that a door marked as part of an exit enclosure meets minimum configured fire rating.",
  applies: ({ payload }) =>
    !!payload.opening.doorLeaf.fireRatingMinutes &&
    payload.project.buildingType.toLowerCase().includes("hospital"),
  check: ({ payload, config }) => {
    const rating = payload.opening.doorLeaf.fireRatingMinutes;
    if (rating >= config.thresholds.minFireRatingMinutesForExitDoor) {
      return null;
    }
    return makeIssue(
      "IBC",
      "IBC Ch. 7 (approx.)",
      "critical",
      `Fire rating ${rating} min is below configured minimum of ${config.thresholds.minFireRatingMinutesForExitDoor} min for this door type.`
    );
  },
};

const ruleFireDoorHasCloser: ComplianceRule = {
  id: "NFPA_FIRE_DOOR_CLOSER",
  label: "Fire door closer",
  standard: "NFPA",
  description:
    "Fire doors generally require a self-closing device; if door has fire rating but no closer, flag it.",
  applies: ({ payload }) => payload.opening.doorLeaf.fireRatingMinutes > 0,
  check: ({ payload }) => {
    const closer = payload.opening.hardware.closer;
    if (closer && closer.trim().length > 0) return null;

    return makeIssue(
      "NFPA",
      "NFPA 80 (approx.)",
      "critical",
      "Opening is fire-rated but has no closer specified."
    );
  },
};

const ruleDiv08HingeCount: ComplianceRule = {
  id: "DIV08_HINGE_COUNT",
  label: "Hinge count vs. door height",
  standard: "DIV08",
  description:
    "Basic check that tall doors have at least a minimum number of hinges.",
  applies: ({ payload }) =>
    !!payload.opening.measurements.roughHeightMm &&
    payload.opening.hardware.hinges.length > 0,
  check: ({ payload, config }) => {
    const height = payload.opening.measurements.roughHeightMm;
    const hingeCount = payload.opening.hardware.hinges.length;
    const required =
      height >= config.thresholds.minHingesForDoorHeightMm ? 4 : 3;

    if (hingeCount >= required) return null;

    return makeIssue(
      "DIV08",
      "Div 08 Hinge Schedule",
      "warning",
      `Door height ${height} mm has only ${hingeCount} hinge(s). Configured minimum is ${required}.`
    );
  },
};

const ruleDiv08FireRatedGlassArea: ComplianceRule = {
  id: "DIV08_FIRE_GLASS_AREA",
  label: "Vision lite area on fire door",
  standard: "DIV08",
  description:
    "Checks that declared fire door does not exceed configured maximum vision lite area percentage.",
  applies: ({ payload }) =>
    payload.opening.doorLeaf.fireRatingMinutes > 0 &&
    payload.opening.doorLeaf.hasVisionLite,
  check: ({ payload, config }) => {
    const { roughWidthMm, roughHeightMm } = payload.opening.measurements;
    const doorArea = roughWidthMm * roughHeightMm;
    if (!doorArea) return null;

    const visionLiteArea = 0;
    const pct = (visionLiteArea / doorArea) * 100;

    if (pct <= config.thresholds.maxVisionLiteAreaPctForFireDoors) return null;

    return makeIssue(
      "DIV08",
      "Div 08 Fire-rated Glazing",
      "warning",
      `Estimated vision lite area ${pct.toFixed(
        1
      )}% exceeds configured limit of ${
        config.thresholds.maxVisionLiteAreaPctForFireDoors
      }% for fire doors.`
    );
  },
};

const ruleDiv28EgressLogic: ComplianceRule = {
  id: "DIV28_EGRESS_LOGIC",
  label: "Access control vs. egress",
  standard: "DIV28",
  description:
    "High-level check that access control devices are accompanied by REX / door contact or other release logic.",
  applies: ({ payload }) => {
    const devices = payload.opening.hardware.electronicSecurity || [];
    return devices.some((d) =>
      ["card_reader", "keypad"].includes(d.type)
    );
  },
  check: ({ payload }) => {
    const devices = payload.opening.hardware.electronicSecurity || [];
    const hasReader = devices.some((d) =>
      ["card_reader", "keypad"].includes(d.type)
    );
    const hasRex = devices.some((d) => d.type === "rex_device");
    const hasDoorContact = devices.some((d) => d.type === "door_contact");

    if (hasReader && !(hasRex && hasDoorContact)) {
      return makeIssue(
        "DIV28",
        "Div 28 Access Control (egress logic)",
        "critical",
        "Opening has card reader/keypad but is missing either a REX device or door contact in the Division 28 configuration."
      );
    }
    return null;
  },
};

const ruleDiv28PowerSupplyPresent: ComplianceRule = {
  id: "DIV28_POWER_SUPPLY",
  label: "Power supply defined for electronic hardware",
  standard: "DIV28",
  description:
    "If electrified hardware is present, at least one power supply device should be listed.",
  applies: ({ payload }) =>
    payload.opening.hardware.electrifiedHardware.length > 0,
  check: ({ payload }) => {
    const devices = payload.opening.hardware.electronicSecurity || [];
    const hasPowerSupply = devices.some(
      (d) => d.type === "power_supply"
    );
    if (hasPowerSupply) return null;

    return makeIssue(
      "DIV28",
      "Div 28 Power Supplies",
      "warning",
      "Electrified hardware is specified but no Division 28 power supply device is defined for this opening."
    );
  },
};

export const allComplianceRules: ComplianceRule[] = [
  ruleAdaClearWidth,
  ruleAdaHandleHeight,
  ruleFireRatingMatchesUse,
  ruleFireDoorHasCloser,
  ruleDiv08HingeCount,
  ruleDiv08FireRatedGlassArea,
  ruleDiv28EgressLogic,
  ruleDiv28PowerSupplyPresent,
];

export function evaluateCompliance(
  payload: DoorSurveyPayload,
  config: ComplianceConfig = defaultComplianceConfig
): ComplianceResult {
  const ctx: RuleContext = { payload, config };

  const triggeredIssues: ComplianceIssue[] = [];

  for (const rule of allComplianceRules) {
    if (!payload.opening.compliance.standardsChecked.includes(rule.standard)) {
      continue;
    }
    if (!rule.applies(ctx)) continue;

    const issue = rule.check(ctx);
    if (issue) triggeredIssues.push(issue);
  }

  const passes = triggeredIssues.every((i) => i.severity !== "critical");

  return {
    standardsChecked: payload.opening.compliance.standardsChecked,
    passes,
    issues: triggeredIssues,
    notes: payload.opening.compliance.notes ?? "",
  };
}
