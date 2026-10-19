import {
  doorHardwareRules,
  getAllRules,
  getRuleCategories,
  getCodeSources,
  getRulesByCategory,
  findRuleById,
  validateFireRatedGlazing,
  validateAcousticDoor,
  validateFireHardwareListing,
  validateSmokeDoor,
  validateFireFrame,
  validateAccessControlSystem,
  validateElectricStrike,
  validateREXDevice,
  validateDoorMonitoring,
  validateFailMode,
  validateFireAlarmInterface,
  validateEmergencyOverride,
  validateVideoIntercom,
  type DoorHardwareRule,
  type RuleCategory,
} from "../validation/doorHardwareRules";

// Dynamic count tracking for future phase expansions
// Update these minimums when adding new phases - tests verify "at least" these counts
const MINIMUM_PHASE23_RULES = 52; // Phase 2-3 baseline (22 Phase 2 + 30 Phase 3)
const MINIMUM_TOTAL_RULES = 95; // Total baseline including Phase 1
const MINIMUM_CATEGORIES = 42; // Phase 1-3 baseline
const MINIMUM_CODE_SOURCES = 35; // Phase 1-3 baseline

// Phase 2-3 specific rule markers for structural validation
const PHASE2_START_RULE = "fire_glazing_vision_lite_size";
const PHASE3_END_RULE = "video_intercom_backup_power";

describe("Phase 2-3 Door Hardware Rules Engine", () => {
  describe("Rule Architecture Expansion", () => {
    it("should have at least the baseline total rules", () => {
      // Dynamic: allows adding new rules without breaking tests
      expect(doorHardwareRules.length).toBeGreaterThanOrEqual(MINIMUM_TOTAL_RULES);
      console.log(`Current total rule count: ${doorHardwareRules.length}`);
    });

    it("should have all required fields in Phase 2-3 rules", () => {
      // Find Phase 2-3 rules dynamically by looking for known start rule
      const phase2StartIndex = doorHardwareRules.findIndex((r) => r.id === PHASE2_START_RULE);
      const phase23Rules = doorHardwareRules.slice(phase2StartIndex);
      expect(phase23Rules.length).toBeGreaterThanOrEqual(MINIMUM_PHASE23_RULES);
      
      for (const rule of phase23Rules) {
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

    it("should maintain unique rule IDs across all rules", () => {
      const ids = doorHardwareRules.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have Phase 2-3 rules starting at the expected position", () => {
      const phase2Start = doorHardwareRules.findIndex((r) => r.id === PHASE2_START_RULE);
      const phase3End = doorHardwareRules.findIndex((r) => r.id === PHASE3_END_RULE);
      // Phase 2 should start after Phase 1 rules (index 43 = 44th rule)
      expect(phase2Start).toBeGreaterThanOrEqual(43);
      // Phase 3 end should be after Phase 2 start
      expect(phase3End).toBeGreaterThan(phase2Start);
      console.log(`Phase 2 starts at index ${phase2Start}, Phase 3 ends at index ${phase3End}`);
    });
  });

  describe("Extended Category Taxonomy", () => {
    it("should have at least the baseline number of categories", () => {
      const categories = getRuleCategories();
      // Dynamic: allows adding new categories without breaking tests
      expect(categories.length).toBeGreaterThanOrEqual(MINIMUM_CATEGORIES);
      console.log(`Current category count: ${categories.length}`);
    });

    it("should include Phase 2 fire/acoustic categories", () => {
      const categories = getRuleCategories();
      expect(categories).toContain("fire_rated_glazing");
      expect(categories).toContain("acoustic_ratings");
      expect(categories).toContain("labeled_hardware");
      expect(categories).toContain("smoke_draft_control");
      expect(categories).toContain("intumescent_seals");
      expect(categories).toContain("fire_rated_frames");
      expect(categories).toContain("positive_pressure");
    });

    it("should include Phase 3 access control categories", () => {
      const categories = getRuleCategories();
      expect(categories).toContain("ul_294_access_control");
      expect(categories).toContain("credential_management");
      expect(categories).toContain("electric_strikes");
      expect(categories).toContain("rex_devices");
      expect(categories).toContain("door_monitoring");
      expect(categories).toContain("fail_mode_requirements");
      expect(categories).toContain("emergency_override");
      expect(categories).toContain("video_intercom");
    });
  });

  describe("Extended Code Sources", () => {
    it("should have at least the baseline number of code sources", () => {
      const sources = getCodeSources();
      // Dynamic: allows adding new code sources without breaking tests
      expect(sources.length).toBeGreaterThanOrEqual(MINIMUM_CODE_SOURCES);
      console.log(`Current code source count: ${sources.length}`);
    });

    it("should include new Phase 2 acoustic/fire standards", () => {
      const sources = getCodeSources();
      expect(sources).toContain("ASTM_E90");
      expect(sources).toContain("ASTM_E413");
      expect(sources).toContain("ASTM_E1408");
      expect(sources).toContain("NFPA_105");
      expect(sources).toContain("NFPA_252");
      expect(sources).toContain("UL_9");
      expect(sources).toContain("UL_10B");
      expect(sources).toContain("WDMA_IS_7");
    });

    it("should include new Phase 2-3 frame/steel standards", () => {
      const sources = getCodeSources();
      expect(sources).toContain("SDI_117");
      expect(sources).toContain("UL_263");
    });
  });

  // ============================================================
  // PHASE 2 TESTS: Fire-Rated Glazing
  // ============================================================

  describe("Phase 2: Fire-Rated Glazing Validation", () => {
    it("should fail vision lite size exceeding 100 sq in on 45+ min door", () => {
      const results = validateFireRatedGlazing(
        60, // 60-min door
        true, // has vision lite
        150, // 150 sq in - exceeds limit
        "fire_protective",
        true,
        60
      );
      const sizeResult = results.find((r) => r.ruleId === "fire_glazing_vision_lite_size");
      expect(sizeResult).toBeDefined();
      expect(sizeResult?.passed).toBe(false);
      expect(sizeResult?.severity).toBe("FAIL");
    });

    it("should pass vision lite size at 100 sq in or less", () => {
      const results = validateFireRatedGlazing(
        60,
        true,
        100, // exactly at limit
        "fire_protective",
        true,
        60
      );
      const sizeResult = results.find((r) => r.ruleId === "fire_glazing_vision_lite_size");
      expect(sizeResult).toBeDefined();
      expect(sizeResult?.passed).toBe(true);
    });

    it("should allow larger vision lite with fire-resistive glazing", () => {
      const results = validateFireRatedGlazing(
        60,
        true,
        200, // larger size allowed with fire-resistive
        "fire_resistive", // fire-resistive allows larger
        true,
        60
      );
      const sizeResult = results.find((r) => r.ruleId === "fire_glazing_vision_lite_size");
      expect(sizeResult).toBeUndefined(); // Should not generate a failure
    });

    it("should fail missing glazing label on fire door", () => {
      const results = validateFireRatedGlazing(
        45,
        true,
        50,
        "fire_protective",
        false, // no label
        0
      );
      const labelResult = results.find((r) => r.ruleId === "fire_glazing_label_required");
      expect(labelResult).toBeDefined();
      expect(labelResult?.passed).toBe(false);
    });

    it("should pass with proper fire-rated glazing label", () => {
      const results = validateFireRatedGlazing(
        45,
        true,
        50,
        "fire_protective",
        true,
        45 // label matches required
      );
      const labelResult = results.find((r) => r.ruleId === "fire_glazing_label_required");
      expect(labelResult).toBeDefined();
      expect(labelResult?.passed).toBe(true);
    });
  });

  // ============================================================
  // PHASE 2 TESTS: Acoustic Door Requirements
  // ============================================================

  describe("Phase 2: Acoustic Door Validation", () => {
    it("should fail when installed STC is below required", () => {
      const results = validateAcousticDoor(
        45, // required STC 45
        35, // installed STC 35 - not enough
        true,
        true,
        true
      );
      const stcResult = results.find((r) => r.ruleId === "acoustic_door_stc_rating");
      expect(stcResult).toBeDefined();
      expect(stcResult?.passed).toBe(false);
    });

    it("should pass when installed STC meets requirement", () => {
      const results = validateAcousticDoor(
        35,
        40, // installed exceeds required
        true,
        true,
        true
      );
      const stcResult = results.find((r) => r.ruleId === "acoustic_door_stc_rating");
      expect(stcResult).toBeDefined();
      expect(stcResult?.passed).toBe(true);
    });

    it("should warn about missing perimeter seals for STC 30+ doors", () => {
      const results = validateAcousticDoor(
        35,
        35,
        false, // missing head seal
        true,
        true
      );
      const sealResult = results.find((r) => r.ruleId === "acoustic_door_perimeter_seals");
      expect(sealResult).toBeDefined();
      expect(sealResult?.passed).toBe(false);
    });

    it("should pass with complete perimeter sealing", () => {
      const results = validateAcousticDoor(
        35,
        35,
        true,
        true,
        true
      );
      const sealResult = results.find((r) => r.ruleId === "acoustic_door_perimeter_seals");
      expect(sealResult).toBeDefined();
      expect(sealResult?.passed).toBe(true);
    });
  });

  // ============================================================
  // PHASE 2 TESTS: Fire Hardware Listing
  // ============================================================

  describe("Phase 2: Fire Hardware Listing Validation", () => {
    it("should fail non-fire-listed hardware on fire door", () => {
      const results = validateFireHardwareListing(
        60, // 60-min fire door
        "door_closer",
        false, // not fire-listed
        false,
        false
      );
      const listingResult = results.find((r) => r.ruleId === "fire_hardware_listing_required");
      expect(listingResult).toBeDefined();
      expect(listingResult?.passed).toBe(false);
      expect(listingResult?.severity).toBe("FAIL");
    });

    it("should pass fire-listed hardware on fire door", () => {
      const results = validateFireHardwareListing(
        60,
        "door_closer",
        true, // fire-listed
        false,
        false
      );
      const listingResult = results.find((r) => r.ruleId === "fire_hardware_listing_required");
      expect(listingResult).toBeDefined();
      expect(listingResult?.passed).toBe(true);
    });

    it("should fail standard panic device on fire door (requires fire exit hardware)", () => {
      const results = validateFireHardwareListing(
        60,
        "panic_device",
        true,
        true, // is panic device
        false // no fire exit listing
      );
      const fireExitResult = results.find((r) => r.ruleId === "fire_exit_hardware_ul305");
      expect(fireExitResult).toBeDefined();
      expect(fireExitResult?.passed).toBe(false);
    });

    it("should pass UL 305 fire exit hardware on fire door", () => {
      const results = validateFireHardwareListing(
        60,
        "panic_device",
        true,
        true,
        true // has fire exit listing
      );
      const fireExitResult = results.find((r) => r.ruleId === "fire_exit_hardware_ul305");
      expect(fireExitResult).toBeDefined();
      expect(fireExitResult?.passed).toBe(true);
    });
  });

  // ============================================================
  // PHASE 2 TESTS: Smoke Door Requirements
  // ============================================================

  describe("Phase 2: Smoke Door Validation", () => {
    it("should fail smoke door without S-label", () => {
      const results = validateSmokeDoor(
        true, // is smoke door
        false, // no S-label
        2.5,
        true,
        true,
        true,
        false,
        false
      );
      const sLabelResult = results.find((r) => r.ruleId === "smoke_door_s_label");
      expect(sLabelResult).toBeDefined();
      expect(sLabelResult?.passed).toBe(false);
    });

    it("should fail smoke door with excessive air leakage", () => {
      const results = validateSmokeDoor(
        true,
        true, // has S-label
        4.0, // exceeds 3.0 cfm/sq ft limit
        true,
        true,
        true,
        false,
        false
      );
      const sLabelResult = results.find((r) => r.ruleId === "smoke_door_s_label");
      expect(sLabelResult).toBeDefined();
      expect(sLabelResult?.passed).toBe(false);
    });

    it("should pass smoke door with S-label and acceptable leakage", () => {
      const results = validateSmokeDoor(
        true,
        true,
        2.5, // within 3.0 limit
        true,
        true,
        true,
        false,
        false
      );
      const sLabelResult = results.find((r) => r.ruleId === "smoke_door_s_label");
      expect(sLabelResult).toBeDefined();
      expect(sLabelResult?.passed).toBe(true);
    });

    it("should fail smoke door missing perimeter gaskets", () => {
      const results = validateSmokeDoor(
        true,
        true,
        2.0,
        false, // missing head gasket
        true,
        true,
        false,
        false
      );
      const gasketResult = results.find((r) => r.ruleId === "smoke_door_perimeter_seals");
      expect(gasketResult).toBeDefined();
      expect(gasketResult?.passed).toBe(false);
    });

    it("should fail smoke door pair without sealed astragal", () => {
      const results = validateSmokeDoor(
        true,
        true,
        2.0,
        true,
        true,
        true,
        true, // is pair
        false // no astragal seal
      );
      const pairResult = results.find((r) => r.ruleId === "smoke_door_pair_seals");
      expect(pairResult).toBeDefined();
      expect(pairResult?.passed).toBe(false);
    });
  });

  // ============================================================
  // PHASE 2 TESTS: Fire Frame Requirements
  // ============================================================

  describe("Phase 2: Fire Frame Validation", () => {
    it("should fail unlabeled fire frame", () => {
      const results = validateFireFrame(
        60, // required rating
        false, // no frame label
        0,
        true,
        true
      );
      const labelResult = results.find((r) => r.ruleId === "fire_frame_label");
      expect(labelResult).toBeDefined();
      expect(labelResult?.passed).toBe(false);
    });

    it("should fail frame with insufficient rating", () => {
      const results = validateFireFrame(
        90, // required 90-min
        true,
        60, // only 60-min label
        true,
        true
      );
      const labelResult = results.find((r) => r.ruleId === "fire_frame_label");
      expect(labelResult).toBeDefined();
      expect(labelResult?.passed).toBe(false);
    });

    it("should pass properly rated fire frame", () => {
      const results = validateFireFrame(
        60,
        true,
        90, // exceeds required
        true,
        true
      );
      const labelResult = results.find((r) => r.ruleId === "fire_frame_label");
      expect(labelResult).toBeDefined();
      expect(labelResult?.passed).toBe(true);
    });

    it("should warn about HM frame missing grout", () => {
      const results = validateFireFrame(
        60,
        true,
        60,
        true, // hollow metal
        false // no grout
      );
      const groutResult = results.find((r) => r.ruleId === "fire_frame_grout");
      expect(groutResult).toBeDefined();
      expect(groutResult?.passed).toBe(false);
      expect(groutResult?.severity).toBe("WARN");
    });
  });

  // ============================================================
  // PHASE 3 TESTS: UL 294 Access Control
  // ============================================================

  describe("Phase 3: Access Control System Validation", () => {
    it("should validate UL 294 listing requirement", () => {
      const results = validateAccessControlSystem(
        true, // has access control
        false, // not UL 294 listed
        true,
        8,
        true,
        true,
        "medium"
      );
      const ul294Result = results.find((r) => r.ruleId === "ul294_access_control_listing");
      expect(ul294Result).toBeDefined();
      expect(ul294Result?.passed).toBe(false);
    });

    it("should pass UL 294 listed system", () => {
      const results = validateAccessControlSystem(
        true,
        true, // UL 294 listed
        true,
        8,
        true,
        true,
        "medium"
      );
      const ul294Result = results.find((r) => r.ruleId === "ul294_access_control_listing");
      expect(ul294Result).toBeDefined();
      expect(ul294Result?.passed).toBe(true);
    });

    it("should warn about insufficient backup power", () => {
      const results = validateAccessControlSystem(
        true,
        true,
        true,
        2, // only 2 hours, less than 4 required
        true,
        true,
        "medium"
      );
      const backupResult = results.find((r) => r.ruleId === "access_control_backup_power");
      expect(backupResult).toBeDefined();
      expect(backupResult?.passed).toBe(false);
    });

    it("should require tamper protection for medium/high security", () => {
      const results = validateAccessControlSystem(
        true,
        true,
        true,
        8,
        true,
        false, // no tamper protection
        "high"
      );
      const tamperResult = results.find((r) => r.ruleId === "access_control_tamper");
      expect(tamperResult).toBeDefined();
      expect(tamperResult?.passed).toBe(false);
    });

    it("should not require tamper protection for low security", () => {
      const results = validateAccessControlSystem(
        true,
        true,
        true,
        8,
        true,
        false,
        "low" // low security
      );
      const tamperResult = results.find((r) => r.ruleId === "access_control_tamper");
      expect(tamperResult).toBeUndefined(); // Should not generate result for low security
    });
  });

  // ============================================================
  // PHASE 3 TESTS: Electric Strike Requirements
  // ============================================================

  describe("Phase 3: Electric Strike Validation", () => {
    it("should fail non-fire-rated electric strike on fire door", () => {
      const results = validateElectricStrike(
        true, // fire door
        60,
        false, // not fire listed
        "fail_safe",
        true,
        true,
        false
      );
      const fireResult = results.find((r) => r.ruleId === "electric_strike_fire_rated");
      expect(fireResult).toBeDefined();
      expect(fireResult?.passed).toBe(false);
    });

    it("should pass fire-rated electric strike on fire door", () => {
      const results = validateElectricStrike(
        true,
        60,
        true, // fire listed
        "fail_safe",
        true,
        true,
        false
      );
      const fireResult = results.find((r) => r.ruleId === "electric_strike_fire_rated");
      expect(fireResult).toBeDefined();
      expect(fireResult?.passed).toBe(true);
    });

    it("should fail fail-secure on egress without approval", () => {
      const results = validateElectricStrike(
        false,
        0,
        true,
        "fail_secure", // fail-secure
        true, // egress door
        false, // no manual override
        false // no AHJ approval
      );
      const failSecureResult = results.find((r) => r.ruleId === "electric_strike_fail_secure_approval");
      expect(failSecureResult).toBeDefined();
      expect(failSecureResult?.passed).toBe(false);
    });

    it("should pass fail-secure on egress with approval and override", () => {
      const results = validateElectricStrike(
        false,
        0,
        true,
        "fail_secure",
        true,
        true, // has override
        true // has approval
      );
      const failSecureResult = results.find((r) => r.ruleId === "electric_strike_fail_secure_approval");
      expect(failSecureResult).toBeDefined();
      expect(failSecureResult?.passed).toBe(true);
    });
  });

  // ============================================================
  // PHASE 3 TESTS: REX Device Requirements
  // ============================================================

  describe("Phase 3: REX Device Validation", () => {
    it("should warn about inadequate REX sensor coverage", () => {
      const results = validateREXDevice(
        true,
        "pir",
        15,
        false // inadequate coverage
      );
      const coverageResult = results.find((r) => r.ruleId === "rex_sensor_coverage");
      expect(coverageResult).toBeDefined();
      expect(coverageResult?.passed).toBe(false);
    });

    it("should pass REX sensor with adequate coverage", () => {
      const results = validateREXDevice(
        true,
        "dual_tech",
        15,
        true // adequate coverage
      );
      const coverageResult = results.find((r) => r.ruleId === "rex_sensor_coverage");
      expect(coverageResult).toBeDefined();
      expect(coverageResult?.passed).toBe(true);
    });

    it("should not check coverage for button REX", () => {
      const results = validateREXDevice(
        true,
        "button", // button type
        15,
        false
      );
      const coverageResult = results.find((r) => r.ruleId === "rex_sensor_coverage");
      expect(coverageResult).toBeUndefined(); // Coverage check not applicable to buttons
    });

    it("should warn about shunt time too short", () => {
      const results = validateREXDevice(
        true,
        "pir",
        3, // only 3 seconds
        true
      );
      const timingResult = results.find((r) => r.ruleId === "rex_shunt_timing");
      expect(timingResult).toBeDefined();
      expect(timingResult?.passed).toBe(false);
    });

    it("should warn about shunt time too long", () => {
      const results = validateREXDevice(
        true,
        "pir",
        45, // 45 seconds - excessive
        true
      );
      const timingResult = results.find((r) => r.ruleId === "rex_shunt_timing");
      expect(timingResult).toBeDefined();
      expect(timingResult?.passed).toBe(false);
    });

    it("should pass appropriate shunt timing", () => {
      const results = validateREXDevice(
        true,
        "pir",
        15, // 15 seconds - appropriate
        true
      );
      const timingResult = results.find((r) => r.ruleId === "rex_shunt_timing");
      expect(timingResult).toBeDefined();
      expect(timingResult?.passed).toBe(true);
    });
  });

  // ============================================================
  // PHASE 3 TESTS: Door Monitoring
  // ============================================================

  describe("Phase 3: Door Monitoring Validation", () => {
    it("should warn about unsupervised DPS", () => {
      const results = validateDoorMonitoring(
        true,
        false, // not supervised
        true,
        30,
        true
      );
      const dpsResult = results.find((r) => r.ruleId === "dps_type_requirements");
      expect(dpsResult).toBeDefined();
      expect(dpsResult?.passed).toBe(false);
    });

    it("should pass supervised DPS", () => {
      const results = validateDoorMonitoring(
        true,
        true, // supervised
        true,
        30,
        true
      );
      const dpsResult = results.find((r) => r.ruleId === "dps_type_requirements");
      expect(dpsResult).toBeDefined();
      expect(dpsResult?.passed).toBe(true);
    });

    it("should validate held-open alarm timing", () => {
      const results = validateDoorMonitoring(
        true,
        true,
        true,
        150, // 150 seconds - too long
        true
      );
      const heldOpenResult = results.find((r) => r.ruleId === "door_held_open_alarm");
      expect(heldOpenResult).toBeDefined();
      expect(heldOpenResult?.passed).toBe(false);
    });

    it("should warn about missing forced alarm", () => {
      const results = validateDoorMonitoring(
        true,
        true,
        true,
        30,
        false // no forced alarm
      );
      const forcedResult = results.find((r) => r.ruleId === "door_forced_alarm");
      expect(forcedResult).toBeDefined();
      expect(forcedResult?.passed).toBe(false);
    });
  });

  // ============================================================
  // PHASE 3 TESTS: Fail Mode Requirements
  // ============================================================

  describe("Phase 3: Fail Mode Validation", () => {
    it("should fail fail-secure in Assembly occupancy", () => {
      const results = validateFailMode(
        "A", // Assembly
        true,
        "fail_secure", // wrong mode
        true,
        true,
        false
      );
      const assemblyResult = results.find((r) => r.ruleId === "fail_safe_assembly_occupancy");
      expect(assemblyResult).toBeDefined();
      expect(assemblyResult?.passed).toBe(false);
    });

    it("should pass fail-safe in Assembly with FA release", () => {
      const results = validateFailMode(
        "A",
        true,
        "fail_safe",
        true, // FA release
        true,
        false
      );
      const assemblyResult = results.find((r) => r.ruleId === "fail_safe_assembly_occupancy");
      expect(assemblyResult).toBeDefined();
      expect(assemblyResult?.passed).toBe(true);
    });

    it("should require staff release for Healthcare", () => {
      const results = validateFailMode(
        "I", // Healthcare/Institutional
        true,
        "fail_safe",
        true,
        false, // no manual release
        false
      );
      const healthcareResult = results.find((r) => r.ruleId === "fail_mode_healthcare");
      expect(healthcareResult).toBeDefined();
      expect(healthcareResult?.passed).toBe(false);
    });

    it("should require staff release for Detention", () => {
      const results = validateFailMode(
        "I-3", // Detention
        true,
        "fail_safe",
        true,
        false, // no manual release
        false // no staff release
      );
      const detentionResult = results.find((r) => r.ruleId === "fail_mode_detention");
      expect(detentionResult).toBeDefined();
      expect(detentionResult?.passed).toBe(false);
    });
  });

  // ============================================================
  // PHASE 3 TESTS: Fire Alarm Interface
  // ============================================================

  describe("Phase 3: Fire Alarm Interface Validation", () => {
    it("should fail delayed fire alarm release", () => {
      const results = validateFireAlarmInterface(
        true, // electrified
        true, // FA connection
        3, // 3 seconds - too slow
        true
      );
      const timingResult = results.find((r) => r.ruleId === "fire_alarm_shunt_timing");
      expect(timingResult).toBeDefined();
      expect(timingResult?.passed).toBe(false);
    });

    it("should pass instantaneous fire alarm release", () => {
      const results = validateFireAlarmInterface(
        true,
        true,
        0.5, // near-instantaneous
        true
      );
      const timingResult = results.find((r) => r.ruleId === "fire_alarm_shunt_timing");
      expect(timingResult).toBeDefined();
      expect(timingResult?.passed).toBe(true);
    });

    it("should warn about unsupervised relay", () => {
      const results = validateFireAlarmInterface(
        true,
        true,
        0.5,
        false // not supervised
      );
      const relayResult = results.find((r) => r.ruleId === "fire_alarm_relay_supervised");
      expect(relayResult).toBeDefined();
      expect(relayResult?.passed).toBe(false);
    });
  });

  // ============================================================
  // PHASE 3 TESTS: Emergency Override
  // ============================================================

  describe("Phase 3: Emergency Override Validation", () => {
    it("should fail egress door without emergency release", () => {
      const results = validateEmergencyOverride(
        true, // access control
        true, // means of egress
        false, // no emergency release
        "button",
        false,
        42
      );
      const buttonResult = results.find((r) => r.ruleId === "emergency_override_button");
      expect(buttonResult).toBeDefined();
      expect(buttonResult?.passed).toBe(false);
    });

    it("should pass egress door with emergency release", () => {
      const results = validateEmergencyOverride(
        true,
        true,
        true, // has release
        "button",
        true,
        42
      );
      const buttonResult = results.find((r) => r.ruleId === "emergency_override_button");
      expect(buttonResult).toBeDefined();
      expect(buttonResult?.passed).toBe(true);
    });

    it("should warn about missing signage on emergency release", () => {
      const results = validateEmergencyOverride(
        true,
        true,
        true,
        "button",
        false, // no signage
        42
      );
      const signageResult = results.find((r) => r.ruleId === "emergency_release_signage");
      expect(signageResult).toBeDefined();
      expect(signageResult?.passed).toBe(false);
    });

    it("should validate break glass height", () => {
      const results = validateEmergencyOverride(
        true,
        true,
        true,
        "break_glass",
        true,
        60 // too high
      );
      const heightResult = results.find((r) => r.ruleId === "break_glass_release");
      expect(heightResult).toBeDefined();
      expect(heightResult?.passed).toBe(false);
    });
  });

  // ============================================================
  // PHASE 3 TESTS: Video Intercom
  // ============================================================

  describe("Phase 3: Video Intercom Validation", () => {
    it("should validate camera height", () => {
      const results = validateVideoIntercom(
        true,
        true,
        72, // too high for face capture
        40,
        false,
        true,
        false
      );
      const cameraResult = results.find((r) => r.ruleId === "video_intercom_camera");
      expect(cameraResult).toBeDefined();
      expect(cameraResult?.passed).toBe(false);
    });

    it("should pass proper camera height", () => {
      const results = validateVideoIntercom(
        true,
        true,
        54, // good height
        40,
        false,
        true,
        false
      );
      const cameraResult = results.find((r) => r.ruleId === "video_intercom_camera");
      expect(cameraResult).toBeDefined();
      expect(cameraResult?.passed).toBe(true);
    });

    it("should fail ADA non-compliant control height", () => {
      const results = validateVideoIntercom(
        true,
        true,
        54,
        55, // too high for ADA
        true, // accessible
        true,
        false
      );
      const adaResult = results.find((r) => r.ruleId === "video_intercom_ada");
      expect(adaResult).toBeDefined();
      expect(adaResult?.passed).toBe(false);
    });

    it("should pass ADA compliant control height", () => {
      const results = validateVideoIntercom(
        true,
        true,
        54,
        42, // within 34-48 range
        true,
        true,
        false
      );
      const adaResult = results.find((r) => r.ruleId === "video_intercom_ada");
      expect(adaResult).toBeDefined();
      expect(adaResult?.passed).toBe(true);
    });

    it("should warn about main entry without backup power", () => {
      const results = validateVideoIntercom(
        true,
        true,
        54,
        42,
        true,
        false, // no backup power
        true // main entry
      );
      const backupResult = results.find((r) => r.ruleId === "video_intercom_backup_power");
      expect(backupResult).toBeDefined();
      expect(backupResult?.passed).toBe(false);
    });
  });

  // ============================================================
  // RULE LOOKUP TESTS
  // ============================================================

  describe("Phase 2-3 Rule Lookups", () => {
    const phase2RuleIds = [
      "fire_glazing_vision_lite_size",
      "fire_glazing_temperature_rise",
      "fire_glazing_sidelight",
      "fire_glazing_transom",
      "fire_glazing_label_required",
      "acoustic_door_stc_rating",
      "acoustic_door_perimeter_seals",
      "acoustic_door_bottom_seal",
      "fire_hardware_listing_required",
      "fire_door_hinge_requirements",
      "fire_exit_hardware_ul305",
      "fire_door_closer_listing",
      "fire_rated_lock_listing",
      "smoke_door_s_label",
      "smoke_door_pair_seals",
      "smoke_door_perimeter_seals",
      "smoke_door_bottom_seal",
      "intumescent_edge_seal",
      "intumescent_hinge_filler",
      "fire_stop_glazing_bead",
      "fire_frame_anchor_spacing",
      "fire_frame_grout",
      "fire_frame_label",
      "positive_pressure_test",
      "stairwell_door_positive_pressure",
    ];

    const phase3RuleIds = [
      "ul294_access_control_listing",
      "access_control_backup_power",
      "access_control_supervision",
      "access_control_tamper",
      "card_reader_height_ada",
      "credential_reader_encryption",
      "keypad_code_security",
      "electric_strike_fire_rated",
      "electric_strike_fail_secure_approval",
      "elr_panic_hardware",
      "rex_sensor_coverage",
      "rex_shunt_timing",
      "dps_type_requirements",
      "door_held_open_alarm",
      "door_forced_alarm",
      "fail_safe_assembly_occupancy",
      "fail_mode_healthcare",
      "fail_mode_detention",
      "fire_alarm_shunt_timing",
      "fire_alarm_relay_supervised",
      "emergency_override_button",
      "emergency_release_signage",
      "break_glass_release",
      "video_intercom_integration",
      "video_intercom_camera",
      "video_intercom_ada",
      "video_intercom_backup_power",
    ];

    it("should find all 25 Phase 2 rules by ID", () => {
      for (const ruleId of phase2RuleIds) {
        const rule = findRuleById(ruleId);
        expect(rule).toBeDefined();
        expect(rule?.id).toBe(ruleId);
      }
    });

    it("should find all 27 Phase 3 rules by ID", () => {
      for (const ruleId of phase3RuleIds) {
        const rule = findRuleById(ruleId);
        expect(rule).toBeDefined();
        expect(rule?.id).toBe(ruleId);
      }
    });

    it("should return undefined for non-existent rule", () => {
      const rule = findRuleById("non_existent_rule");
      expect(rule).toBeUndefined();
    });
  });

  // ============================================================
  // CATEGORY GROUPING TESTS
  // ============================================================

  describe("Phase 2-3 Category Groupings", () => {
    it("should return fire-rated glazing rules", () => {
      const rules = getRulesByCategory("fire_rated_glazing");
      expect(rules.length).toBe(5);
    });

    it("should return acoustic rating rules", () => {
      const rules = getRulesByCategory("acoustic_ratings");
      expect(rules.length).toBe(3);
    });

    it("should return labeled hardware rules", () => {
      const rules = getRulesByCategory("labeled_hardware");
      expect(rules.length).toBe(5);
    });

    it("should return smoke draft control rules", () => {
      const rules = getRulesByCategory("smoke_draft_control");
      expect(rules.length).toBe(4);
    });

    it("should return UL 294 access control rules", () => {
      const rules = getRulesByCategory("ul_294_access_control");
      expect(rules.length).toBe(4);
    });

    it("should return electric strikes rules", () => {
      const rules = getRulesByCategory("electric_strikes");
      expect(rules.length).toBe(3);
    });

    it("should return REX devices rules", () => {
      const rules = getRulesByCategory("rex_devices");
      expect(rules.length).toBe(2);
    });

    it("should return emergency override rules", () => {
      const rules = getRulesByCategory("emergency_override");
      expect(rules.length).toBe(3);
    });

    it("should return video intercom rules", () => {
      const rules = getRulesByCategory("video_intercom");
      expect(rules.length).toBe(4);
    });
  });
});
