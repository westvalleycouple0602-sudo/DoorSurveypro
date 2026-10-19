import {
  doorHardwareRules,
  getAllRules,
  getRuleCategories,
  getCodeSources,
  getRuleSubjects,
  getRulesByCategory,
  getRulesBySubject,
  findRuleById,
  getRulesForJurisdiction,
  getEffectiveRulesForJurisdiction,
  validateHardwareHeight,
  validateFireDoorClearances,
  validateThreshold,
  getFireDoorRequiredFlags,
  getMinHingeCount,
  validateHingeCount,
  validateFireDoorCloser,
  validateDelayedEgress,
  validateMaglock,
  validateAutoOperator,
  validateDoorCloser,
  validatePanicHardware,
  validateEgressDoor,
  validateFireDoorLabeling,
  type DoorHardwareRule,
  type RuleCategory,
  type RuleSubject,
} from "../validation/doorHardwareRules";

// Dynamic count tracking for future phase expansions
// Update these minimums when adding new phases - tests verify "at least" these counts
const MINIMUM_EXPECTED_RULES = 95; // Phase 1-3 baseline
const MINIMUM_EXPECTED_CATEGORIES = 42; // Phase 1-3 baseline
const MINIMUM_EXPECTED_CODE_SOURCES = 35; // Phase 1-3 baseline

describe("Phase 1 Door Hardware Rules Engine", () => {
  describe("Rule Architecture", () => {
    it("should have at least the baseline number of rules", () => {
      // Dynamic: allows adding new rules without breaking tests
      expect(doorHardwareRules.length).toBeGreaterThanOrEqual(MINIMUM_EXPECTED_RULES);
      // Log actual count for documentation purposes
      console.log(`Current rule count: ${doorHardwareRules.length}`);
    });

    it("should have all required fields in each rule", () => {
      for (const rule of doorHardwareRules) {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.jurisdictions).toBeDefined();
        expect(rule.code_references).toBeDefined();
        expect(rule.requirements).toBeDefined();
        expect(rule.conditions).toBeDefined();
      }
    });

    it("should have unique rule IDs", () => {
      const ids = doorHardwareRules.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Category Taxonomy", () => {
    it("should have at least the baseline number of categories", () => {
      const categories = getRuleCategories();
      // Dynamic: allows adding new categories without breaking tests
      expect(categories.length).toBeGreaterThanOrEqual(MINIMUM_EXPECTED_CATEGORIES);
      console.log(`Current category count: ${categories.length}`);
    });

    it("should include new Phase 1 categories", () => {
      const categories = getRuleCategories();
      expect(categories).toContain("delayed_egress");
      expect(categories).toContain("controlled_egress");
      expect(categories).toContain("maglocks");
      expect(categories).toContain("electrified_hardware");
      expect(categories).toContain("exit_devices");
      expect(categories).toContain("gasketing_smoke_seals");
      expect(categories).toContain("closers_operators");
      expect(categories).toContain("coordinators_astragals");
    });

    it("should return rules by category", () => {
      const exitDeviceRules = getRulesByCategory("exit_devices");
      expect(exitDeviceRules.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Code Sources", () => {
    it("should have at least the baseline number of code sources", () => {
      const sources = getCodeSources();
      // Dynamic: allows adding new code sources without breaking tests
      expect(sources.length).toBeGreaterThanOrEqual(MINIMUM_EXPECTED_CODE_SOURCES);
      console.log(`Current code source count: ${sources.length}`);
    });

    it("should include new UL and BHMA standards", () => {
      const sources = getCodeSources();
      expect(sources).toContain("UL_294");
      expect(sources).toContain("UL_1034");
      expect(sources).toContain("UL_1784");
      expect(sources).toContain("BHMA_A156_19");
      expect(sources).toContain("BHMA_A156_25");
      expect(sources).toContain("NFPA_72");
    });
  });

  describe("Rule Subjects", () => {
    it("should return 9 rule subjects", () => {
      const subjects = getRuleSubjects();
      expect(subjects.length).toBe(9);
    });

    it("should include all subject types", () => {
      const subjects = getRuleSubjects();
      expect(subjects).toContain("hardware");
      expect(subjects).toContain("leaf");
      expect(subjects).toContain("frame");
      expect(subjects).toContain("glazing");
      expect(subjects).toContain("assembly");
      expect(subjects).toContain("electrified");
      expect(subjects).toContain("access_control");
    });

    it("should return rules by subject", () => {
      const electrifiedRules = getRulesBySubject("electrified");
      expect(electrifiedRules.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Original Hardware Height Validation", () => {
    it("should pass for lever at 42 inches on accessible route", () => {
      const results = validateHardwareHeight(42, "US", "lever", true, false);
      expect(results.length).toBeGreaterThan(0);
      const leverResult = results.find((r) =>
        r.ruleId === "hardware_height_general_operable_egress"
      );
      expect(leverResult?.passed).toBe(true);
    });

    it("should fail for lever below 34 inches on accessible route", () => {
      const results = validateHardwareHeight(32, "US", "lever", true, false);
      const leverResult = results.find((r) =>
        r.ruleId === "hardware_height_general_operable_egress"
      );
      expect(leverResult?.passed).toBe(false);
      expect(leverResult?.severity).toBe("FAIL");
    });

    it("should apply California cap (44 in max) for CA jurisdiction", () => {
      const results = validateHardwareHeight(46, "US-CA", "lever", true, true);
      const caResult = results.find((r) =>
        r.ruleId === "egress_hardware_height_ca_cap"
      );
      expect(caResult?.passed).toBe(false);
    });

    it("should pass panic device at 42 inches for egress door", () => {
      const results = validateHardwareHeight(
        42,
        "US",
        "panic_device",
        true,
        true
      );
      const panicResult = results.find((r) => r.ruleId === "panic_device_height");
      expect(panicResult?.passed).toBe(true);
    });
  });

  describe("Fire Door Clearance Validation", () => {
    it("should pass fire door with clearances within limits", () => {
      const results = validateFireDoorClearances(0.1, 0.5, 90);
      expect(results.length).toBe(2);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("should fail fire door with excessive side clearance", () => {
      const results = validateFireDoorClearances(0.25, 0.5, 90);
      const sideResult = results.find((r) =>
        r.ruleName.includes("Side/Top")
      );
      expect(sideResult?.passed).toBe(false);
    });

    it("should fail fire door with excessive bottom clearance", () => {
      const results = validateFireDoorClearances(0.1, 1.0, 90);
      const bottomResult = results.find((r) =>
        r.ruleName.endsWith("(Bottom)")
      );
      expect(bottomResult?.passed).toBe(false);
    });
  });

  describe("Threshold Validation", () => {
    it("should pass threshold at 0.25 inches on accessible route", () => {
      const result = validateThreshold(0.25, true);
      expect(result?.passed).toBe(true);
    });

    it("should fail threshold at 0.75 inches on accessible route", () => {
      const result = validateThreshold(0.75, true);
      expect(result?.passed).toBe(false);
    });

    it("should return null for non-accessible routes", () => {
      const result = validateThreshold(0.75, false);
      expect(result).toBeNull();
    });
  });

  describe("Fire Door Hinge Count Validation", () => {
    it("should require 2 hinges for 60-inch fire door", () => {
      expect(getMinHingeCount(60)).toBe(2);
    });

    it("should require 3 hinges for 84-inch fire door", () => {
      expect(getMinHingeCount(84)).toBe(3);
    });

    it("should require 4 hinges for 96-inch fire door", () => {
      expect(getMinHingeCount(96)).toBe(4);
    });

    it("should pass with sufficient hinges", () => {
      const result = validateHingeCount(3, 84, 90);
      expect(result?.passed).toBe(true);
    });

    it("should fail with insufficient hinges", () => {
      const result = validateHingeCount(2, 84, 90);
      expect(result?.passed).toBe(false);
    });
  });

  describe("Fire Door Closer Validation", () => {
    it("should pass fire door with closer", () => {
      const result = validateFireDoorCloser(true, 90);
      expect(result?.passed).toBe(true);
    });

    it("should fail fire door without closer", () => {
      const result = validateFireDoorCloser(false, 90);
      expect(result?.passed).toBe(false);
    });

    it("should return null for non-fire doors", () => {
      const result = validateFireDoorCloser(false, 0);
      expect(result).toBeNull();
    });
  });

  describe("Phase 1: Delayed Egress Validation", () => {
    it("should pass compliant delayed egress configuration", () => {
      const results = validateDelayedEgress(15, true, true, "fail_safe");
      expect(results.length).toBe(3);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("should fail delayed egress with excessive delay", () => {
      const results = validateDelayedEgress(20, true, true, "fail_safe");
      const timingResult = results.find((r) =>
        r.ruleId === "delayed_egress_timing"
      );
      expect(timingResult?.passed).toBe(false);
    });

    it("should fail delayed egress without signage", () => {
      const results = validateDelayedEgress(15, true, false, "fail_safe");
      const signageResult = results.find((r) =>
        r.ruleId === "delayed_egress_signage"
      );
      expect(signageResult?.passed).toBe(false);
    });

    it("should fail delayed egress without fire alarm interface", () => {
      const results = validateDelayedEgress(15, false, true, "fail_safe");
      const faResult = results.find((r) =>
        r.ruleId === "delayed_egress_fire_alarm_release"
      );
      expect(faResult?.passed).toBe(false);
    });

    it("should fail delayed egress configured as fail-secure", () => {
      const results = validateDelayedEgress(15, true, true, "fail_secure");
      const faResult = results.find((r) =>
        r.ruleId === "delayed_egress_fire_alarm_release"
      );
      expect(faResult?.passed).toBe(false);
    });
  });

  describe("Phase 1: Maglock Validation", () => {
    it("should pass compliant maglock configuration", () => {
      const results = validateMaglock(true, true, true, "fail_safe", 44);
      expect(results.length).toBe(3);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("should fail maglock without sensor or manual release", () => {
      const results = validateMaglock(false, false, true, "fail_safe", 44);
      const sensorResult = results.find((r) =>
        r.ruleId === "maglock_sensor_requirements"
      );
      expect(sensorResult?.passed).toBe(false);
    });

    it("should pass maglock with manual release even without sensor", () => {
      const results = validateMaglock(false, true, true, "fail_safe", 44);
      const sensorResult = results.find((r) =>
        r.ruleId === "maglock_sensor_requirements"
      );
      expect(sensorResult?.passed).toBe(true);
    });

    it("should fail maglock with release at incorrect height", () => {
      const results = validateMaglock(true, true, true, "fail_safe", 36);
      const releaseResult = results.find((r) =>
        r.ruleId === "maglock_manual_release"
      );
      expect(releaseResult?.passed).toBe(false);
    });

    it("should fail maglock not connected to fire alarm", () => {
      const results = validateMaglock(true, true, false, "fail_safe", 44);
      const faResult = results.find((r) =>
        r.ruleId === "maglock_fire_alarm_release"
      );
      expect(faResult?.passed).toBe(false);
    });

    it("should fail maglock configured as fail-secure", () => {
      const results = validateMaglock(true, true, true, "fail_secure", 44);
      const faResult = results.find((r) =>
        r.ruleId === "maglock_fire_alarm_release"
      );
      expect(faResult?.passed).toBe(false);
    });
  });

  describe("Phase 1: Automatic Operator Validation", () => {
    it("should pass compliant automatic operator configuration", () => {
      const results = validateAutoOperator(true, true, 25, 4);
      expect(results.length).toBe(3);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("should fail automatic operator without safety sensors", () => {
      const results = validateAutoOperator(false, true, 25, 4);
      const sensorResult = results.find((r) =>
        r.ruleId === "auto_operator_safety_sensors"
      );
      expect(sensorResult?.passed).toBe(false);
    });

    it("should fail automatic operator with excessive breakout force", () => {
      const results = validateAutoOperator(true, true, 35, 4);
      const breakoutResult = results.find((r) =>
        r.ruleId === "auto_operator_manual_breakout"
      );
      expect(breakoutResult?.passed).toBe(false);
    });

    it("should fail automatic operator with fast closing speed", () => {
      const results = validateAutoOperator(true, true, 25, 2);
      const speedResult = results.find((r) =>
        r.ruleId === "auto_operator_closing_speed"
      );
      expect(speedResult?.passed).toBe(false);
    });

    it("should fail automatic operator without breakout capability", () => {
      const results = validateAutoOperator(true, false, 25, 4);
      const breakoutResult = results.find((r) =>
        r.ruleId === "auto_operator_manual_breakout"
      );
      expect(breakoutResult?.passed).toBe(false);
    });
  });

  describe("Phase 1: Door Closer Validation", () => {
    it("should pass compliant door closer on accessible route", () => {
      const results = validateDoorCloser(4, 6, true);
      expect(results.length).toBe(2);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("should fail door closer with excessive opening force", () => {
      const results = validateDoorCloser(7, 6, true);
      const forceResult = results.find((r) =>
        r.ruleId === "door_closer_opening_force"
      );
      expect(forceResult?.passed).toBe(false);
    });

    it("should fail door closer with fast sweep time", () => {
      const results = validateDoorCloser(4, 3, true);
      const sweepResult = results.find((r) =>
        r.ruleId === "door_closer_sweep_time"
      );
      expect(sweepResult?.passed).toBe(false);
    });

    it("should return empty array for non-accessible routes", () => {
      const results = validateDoorCloser(7, 3, false);
      expect(results.length).toBe(0);
    });
  });

  describe("Phase 1: Panic Hardware Validation", () => {
    it("should require panic hardware for Assembly occupancy >50", () => {
      const results = validatePanicHardware("A", 100, false, false, false);
      const panicResult = results.find((r) =>
        r.ruleId === "panic_hardware_required_occupancy"
      );
      expect(panicResult?.passed).toBe(false);
    });

    it("should pass when panic hardware installed as required", () => {
      const results = validatePanicHardware("A", 100, true, false, false);
      const panicResult = results.find((r) =>
        r.ruleId === "panic_hardware_required_occupancy"
      );
      expect(panicResult?.passed).toBe(true);
    });

    it("should not require panic hardware for <50 occupants", () => {
      const results = validatePanicHardware("A", 40, false, false, false);
      const panicResult = results.find((r) =>
        r.ruleId === "panic_hardware_required_occupancy"
      );
      expect(panicResult?.passed).toBe(true);
    });

    it("should require fire exit hardware on fire door with panic", () => {
      const results = validatePanicHardware("A", 100, true, true, false);
      const fireExitResult = results.find((r) =>
        r.ruleId === "fire_exit_hardware_required"
      );
      expect(fireExitResult?.passed).toBe(false);
    });

    it("should pass with fire exit hardware on fire door", () => {
      const results = validatePanicHardware("A", 100, true, true, true);
      const fireExitResult = results.find((r) =>
        r.ruleId === "fire_exit_hardware_required"
      );
      expect(fireExitResult?.passed).toBe(true);
    });

    it("should require panic hardware for Educational occupancy >50", () => {
      const results = validatePanicHardware("E", 75, false, false, false);
      const panicResult = results.find((r) =>
        r.ruleId === "panic_hardware_required_occupancy"
      );
      expect(panicResult?.passed).toBe(false);
    });
  });

  describe("Phase 1: Egress Door Validation", () => {
    it("should require door to swing in egress direction for >50 occupants", () => {
      const results = validateEgressDoor(100, false, 36, false);
      const swingResult = results.find((r) =>
        r.ruleId === "egress_door_swing_direction"
      );
      expect(swingResult?.passed).toBe(false);
    });

    it("should pass when door swings in egress direction", () => {
      const results = validateEgressDoor(100, true, 36, false);
      const swingResult = results.find((r) =>
        r.ruleId === "egress_door_swing_direction"
      );
      expect(swingResult?.passed).toBe(true);
    });

    it("should not check swing direction for <50 occupants", () => {
      const results = validateEgressDoor(40, false, 36, false);
      const swingResult = results.find((r) =>
        r.ruleId === "egress_door_swing_direction"
      );
      expect(swingResult).toBeUndefined();
    });

    it("should require 36 inch minimum for main exit", () => {
      const results = validateEgressDoor(100, true, 34, true);
      const widthResult = results.find((r) =>
        r.ruleId === "egress_door_clear_width"
      );
      expect(widthResult?.passed).toBe(false);
    });

    it("should require 32 inch minimum for non-main exit", () => {
      const results = validateEgressDoor(100, true, 32, false);
      const widthResult = results.find((r) =>
        r.ruleId === "egress_door_clear_width"
      );
      expect(widthResult?.passed).toBe(true);
    });
  });

  describe("Phase 1: Fire Door Labeling Validation", () => {
    it("should pass with proper labels and matching ratings", () => {
      const results = validateFireDoorLabeling(true, true, 90, 90, 90);
      expect(results.length).toBe(2);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("should fail with missing door leaf label", () => {
      const results = validateFireDoorLabeling(false, true, 90, 90, 90);
      const labelResult = results.find((r) =>
        r.ruleId === "fire_door_label_visibility"
      );
      expect(labelResult?.passed).toBe(false);
    });

    it("should fail with missing frame label", () => {
      const results = validateFireDoorLabeling(true, false, 90, 90, 90);
      const labelResult = results.find((r) =>
        r.ruleId === "fire_door_label_visibility"
      );
      expect(labelResult?.passed).toBe(false);
    });

    it("should fail with insufficient door rating", () => {
      const results = validateFireDoorLabeling(true, true, 60, 90, 90);
      const matchResult = results.find((r) =>
        r.ruleId === "fire_door_rating_matching"
      );
      expect(matchResult?.passed).toBe(false);
    });

    it("should fail with insufficient frame rating", () => {
      const results = validateFireDoorLabeling(true, true, 90, 60, 90);
      const matchResult = results.find((r) =>
        r.ruleId === "fire_door_rating_matching"
      );
      expect(matchResult?.passed).toBe(false);
    });
  });

  describe("Fire Door Required Flags", () => {
    it("should require fire listing and self-closing for fire doors", () => {
      const flags = getFireDoorRequiredFlags(90);
      expect(flags.fire_listed_assembly_required).toBe(true);
      expect(flags.self_closing_required).toBe(true);
    });

    it("should not require fire listing for non-fire doors", () => {
      const flags = getFireDoorRequiredFlags(0);
      expect(flags.fire_listed_assembly_required).toBe(false);
      expect(flags.self_closing_required).toBe(false);
    });
  });

  describe("Jurisdiction Overlay System", () => {
    it("should return US rules for US jurisdiction", () => {
      const rules = getRulesForJurisdiction("US");
      expect(rules.length).toBeGreaterThan(0);
    });

    it("should return US rules for US-CA jurisdiction (inheritance)", () => {
      const rules = getRulesForJurisdiction("US-CA");
      expect(rules.length).toBeGreaterThan(0);
    });

    it("should apply California override for US-CA", () => {
      const effectiveRules = getEffectiveRulesForJurisdiction("US-CA");
      const caRule = effectiveRules.find((r) =>
        r.id === "egress_hardware_height_ca_cap"
      );
      expect(caRule).toBeDefined();
    });
  });

  describe("Rule Lookup", () => {
    it("should find rule by ID", () => {
      const rule = findRuleById("delayed_egress_timing");
      expect(rule).toBeDefined();
      expect(rule?.name).toBe("Delayed Egress Lock Maximum Delay");
    });

    it("should return undefined for unknown rule ID", () => {
      const rule = findRuleById("nonexistent_rule");
      expect(rule).toBeUndefined();
    });
  });

  describe("Remediation Guidance", () => {
    it("should have remediation guidance for violation rules", () => {
      const criticalRules = doorHardwareRules.filter((r) =>
        r.category === "delayed_egress" ||
        r.category === "maglocks" ||
        r.category === "exit_devices"
      );

      for (const rule of criticalRules) {
        expect(rule.remediation?.generic_fix).toBeDefined();
        expect(rule.remediation?.cost_impact_estimate).toBeDefined();
      }
    });
  });

  describe("Enhanced Requirement Types", () => {
    it("should have electrical requirements on electrified hardware rules", () => {
      const maglockRule = findRuleById("maglock_fire_alarm_release");
      expect(maglockRule?.requirements.electrical?.fail_mode).toBe("fail_safe");
      expect(maglockRule?.requirements.electrical?.fire_alarm_release_required).toBe(true);
    });

    it("should have timing requirements on delayed egress rules", () => {
      const delayRule = findRuleById("delayed_egress_timing");
      expect(delayRule?.requirements.timing?.delay_seconds?.max).toBe(15);
    });

    it("should have rating requirements on fire door rules", () => {
      const smokeRule = findRuleById("smoke_door_gasketing");
      expect(smokeRule?.requirements.rating?.smoke_rating).toBe("S");
    });

    it("should have dimensional requirements on egress rules", () => {
      const widthRule = findRuleById("egress_door_clear_width");
      expect(widthRule?.requirements.dimensions?.min_clear_width_in).toBe(32);
    });
  });

  describe("Confidence Scoring", () => {
    it("should include confidence scores in validation results", () => {
      const results = validateDelayedEgress(15, true, true, "fail_safe");
      for (const result of results) {
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
        expect(result.confidence).toBeLessThanOrEqual(1.0);
      }
    });

    it("should include confidence scores in hardware height results", () => {
      const results = validateHardwareHeight(42, "US", "lever", true, false);
      for (const result of results) {
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      }
    });
  });

  describe("Swing Requirements", () => {
    it("should have swing requirements on egress swing direction rule", () => {
      const swingRule = findRuleById("egress_door_swing_direction");
      expect(swingRule?.requirements.swing).toBeDefined();
      expect(swingRule?.requirements.swing?.direction_in_egress_travel).toBe(true);
      expect(swingRule?.requirements.swing?.min_occupant_load_threshold).toBe(50);
    });

    it("should have swing requirements on clear width rule", () => {
      const widthRule = findRuleById("egress_door_clear_width");
      expect(widthRule?.requirements.swing).toBeDefined();
      expect(widthRule?.requirements.swing?.clear_width_when_open).toBe(32);
    });

    it("should use swing threshold from rule in validation", () => {
      const results = validateEgressDoor(50, false, 36, false);
      const swingResult = results.find((r) =>
        r.ruleId === "egress_door_swing_direction"
      );
      expect(swingResult).toBeDefined();
      expect(swingResult?.passed).toBe(false);
    });

    it("should not apply swing validation below threshold", () => {
      const results = validateEgressDoor(49, false, 36, false);
      const swingResult = results.find((r) =>
        r.ruleId === "egress_door_swing_direction"
      );
      expect(swingResult).toBeUndefined();
    });

    it("should use swing clear width from rule", () => {
      const results = validateEgressDoor(30, true, 31, false);
      const widthResult = results.find((r) =>
        r.ruleId === "egress_door_clear_width"
      );
      expect(widthResult?.passed).toBe(false);
      expect(widthResult?.requiredRange?.min).toBe(32);
    });
  });
});
