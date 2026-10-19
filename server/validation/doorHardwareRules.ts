// server/validation/doorHardwareRules.ts
// Enhanced Division 8 (Openings) & Division 28 (Electronic Safety and Security) Compliance Engine
// Supports layered rule architecture with base rules and jurisdiction overlays
// Based on ADA 2010, IBC 2015/2018/2021, NFPA 80, NFPA 101, ICC A117.1, BHMA A156, UL standards

// ====== Core Types ======

export type CodeSource =
  | "ADA_2010"
  | "IBC_2015"
  | "IBC_2018"
  | "IBC_2021"
  | "IFC_2018"
  | "IFC_2021"
  | "NFPA_80"
  | "NFPA_101"
  | "NFPA_72"
  | "NFPA_105"
  | "NFPA_252"
  | "ICC_A117_1"
  | "BHMA_A156_3"
  | "BHMA_A156_4"
  | "BHMA_A156_10"
  | "BHMA_A156_19"
  | "BHMA_A156_25"
  | "BHMA_A156"
  | "UL_10B"
  | "UL_10C"
  | "UL_9"
  | "UL_294"
  | "UL_305"
  | "UL_1034"
  | "UL_1784"
  | "UL_263"
  | "UL_555"
  | "SDI_100"
  | "SDI_117"
  | "ANSI_A250_8"
  | "ASTM_E90"
  | "ASTM_E413"
  | "ASTM_E1408"
  | "ASTM_E2074"
  | "WDMA_IS_7";

// Expanded categories for Division 8 and Division 28 coverage
export type RuleCategory =
  // === Existing Categories (preserved) ===
  | "operable_parts_egress"
  | "accessibility_reach_operability"
  | "fire_door_assembly"
  | "vision_communication"
  | "automatic_operators"
  | "thresholds_clearances"
  | "hinges_pivots_misc"
  | "access_control"
  | "special_locking_arrangements"
  | "signage"
  // === Division 8 - Openings ===
  | "door_leaf_construction"
  | "frame_construction"
  | "glazing_safety_fire"
  | "gasketing_smoke_seals"
  | "closers_operators"
  | "exit_devices"
  | "coordinators_astragals"
  | "specialty_doors"
  // === Phase 2: Fire/Acoustic ===
  | "fire_rated_glazing"
  | "acoustic_ratings"
  | "fire_hardware_ratings"
  | "labeled_hardware"
  | "intumescent_seals"
  | "fire_rated_frames"
  | "smoke_draft_control"
  | "positive_pressure"
  // === Division 28 - Electronic Safety & Security ===
  | "electrified_hardware"
  | "delayed_egress"
  | "controlled_egress"
  | "maglocks"
  | "fire_alarm_interface"
  | "video_surveillance"
  | "intrusion_detection"
  | "area_of_refuge"
  // === Phase 3: Access Control ===
  | "ul_294_access_control"
  | "credential_management"
  | "electric_strikes"
  | "rex_devices"
  | "door_monitoring"
  | "fail_mode_requirements"
  | "emergency_override"
  | "video_intercom";

// Subject types - what entity does the rule apply to?
export type RuleSubject =
  | "hardware"
  | "leaf"
  | "frame"
  | "glazing"
  | "assembly"
  | "electrified"
  | "access_control"
  | "surveillance"
  | "system";

export interface CodeReference {
  source: CodeSource;
  section: string;
  notes?: string;
}

export interface HeightRequirement {
  min_in?: number;
  max_in?: number;
}

export interface DimensionalRequirement {
  threshold_max_height_in?: number;
  max_vertical_clearance_in?: number;
  max_bottom_clearance_in?: number;
  min_clear_width_in?: number;
  max_projection_in?: number;
  min_maneuvering_clearance_in?: number;
}

// NEW: Electrical requirements for electrified hardware
export interface ElectricalRequirement {
  voltage?: { min: number; max: number };
  current_draw_amps?: number;
  fail_mode?: "fail_safe" | "fail_secure";
  backup_power_required?: boolean;
  supervision_required?: boolean;
  fire_alarm_release_required?: boolean;
  sensor_required?: boolean;
}

// NEW: Rating requirements for fire/smoke/acoustic
export interface RatingRequirement {
  fire_rating_minutes?: number;
  smoke_rating?: "S" | "UL1784";
  stc_rating?: number;
  label_match_required?: boolean;
  positive_pressure?: boolean;
}

// NEW: Timing requirements for delayed egress, closers, etc.
export interface TimingRequirement {
  delay_seconds?: { min?: number; max?: number };
  sweep_time_seconds?: { min?: number; max?: number };
  hold_time_seconds?: number;
  closing_force_lbf?: { max: number };
}

// NEW: Swing direction requirements for egress doors
export interface SwingRequirement {
  direction_in_egress_travel?: boolean;  // Door must swing in direction of egress travel
  min_occupant_load_threshold?: number;  // Threshold above which this applies (e.g., 50)
  clear_width_when_open?: number;        // Minimum clear width in inches when door is open
}

export interface RuleFlags {
  single_motion_to_egress?: boolean;
  no_tight_grasp_pinch_twist?: boolean;
  one_hand_operation?: boolean;
  fire_listed_assembly_required?: boolean;
  self_closing_required_for_fire_door?: boolean;
  panic_hardware_required?: boolean;
  fire_exit_hardware_required?: boolean;
  latching_required?: boolean;
  manual_release_required?: boolean;
  signage_required?: boolean;
  audible_alarm_required?: boolean;
  sensor_release_required?: boolean;
  coordinator_required?: boolean;
}

export interface RuleRemediation {
  generic_fix: string;
  preferred_products?: string[];
  cost_impact_estimate?: "low" | "medium" | "high";
}

export interface RuleRequirement {
  height_aff?: HeightRequirement;
  dimensions?: DimensionalRequirement;
  flags?: RuleFlags;
  electrical?: ElectricalRequirement;
  rating?: RatingRequirement;
  timing?: TimingRequirement;
  swing?: SwingRequirement;
}

export interface DoorHardwareRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  subject?: RuleSubject;
  jurisdictions: string[];
  code_references: CodeReference[];
  requirements: RuleRequirement;
  conditions: string[];
  base_of?: string;
  override_of?: string;
  code_edition?: string;
  effective_from_year?: number;
  effective_to_year?: number;
  explanation_template?: string;
  remediation?: RuleRemediation;
  notes?: string;
}

// ====== Rule Set ======

export const doorHardwareRules: DoorHardwareRule[] = [
  // ============================================================
  // EXISTING RULES (14) - Preserved for backward compatibility
  // ============================================================

  // 1. General operable hardware height (lever/lock/pull)
  {
    id: "hardware_height_general_operable_egress",
    name: "Operable Door Hardware Height (General Egress/Entry)",
    description:
      "Operable hardware used for normal egress/entry (levers, pulls, latches) must be 34 in to 48 in above finished floor on accessible doors.",
    category: "operable_parts_egress",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    effective_from_year: 2010,
    code_references: [
      { source: "ADA_2010", section: "404.2.7", notes: "Accessible doors & gates" },
      { source: "ADA_2010", section: "309.3–309.4", notes: "Operable parts" },
      { source: "IBC_2018", section: "1010", notes: "Door hardware height" },
      { source: "ICC_A117_1", section: "404" }
    ],
    requirements: {
      height_aff: { min_in: 34, max_in: 48 },
      flags: {
        one_hand_operation: true,
        no_tight_grasp_pinch_twist: true
      }
    },
    conditions: [
      "opening.on_accessible_route == true",
      "hardware.role in ['latch','lever','pull','lockset']",
      "hardware.required_for_normal_egress_or_entry == true"
    ],
    explanation_template:
      "Measured hardware height: {{measuredHeight}} in AFF. Required range is 34–48 in AFF for operable door hardware on accessible routes per ADA 2010 and IBC 1010.",
    remediation: {
      generic_fix:
        "Re-locate the primary lockset/lever so the centerline is within 34–48 in AFF, or replace the door with a leaf prepped at the correct height.",
      preferred_products: ["STD-LEVER-ADA-CL38", "PREP-DOOR-38ADA"],
      cost_impact_estimate: "medium"
    },
    notes:
      "Non-required security devices may be outside this range; see the security lock exception rule."
  },

  // 2. Panic / fire exit device height
  {
    id: "panic_device_height",
    name: "Panic / Fire Exit Device Height",
    description:
      "Crossbar or push pad of panic/fire exit devices must be 34 in to 48 in AFF on required egress doors.",
    category: "operable_parts_egress",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010", notes: "Panic and fire exit hardware height" },
      { source: "NFPA_101", section: "7.2.1" },
      { source: "ADA_2010", section: "404.2.7" }
    ],
    requirements: {
      height_aff: { min_in: 34, max_in: 48 },
      flags: {
        single_motion_to_egress: true,
        one_hand_operation: true,
        no_tight_grasp_pinch_twist: true
      }
    },
    conditions: [
      "opening.is_means_of_egress_door == true",
      "hardware.type in ['panic_device','fire_exit_device']",
      "hardware.required_for_egress == true"
    ],
    explanation_template:
      "Panic device centerline measured at {{measuredHeight}} in AFF. Required range is 34–48 in AFF for required egress doors.",
    remediation: {
      generic_fix:
        "Re-mount the exit device so the actuating bar centerline is between 34–48 in AFF, or replace the door with a properly prepped leaf.",
      preferred_products: ["PANIC-36-ADA", "PANIC-48-ADA"],
      cost_impact_estimate: "high"
    }
  },

  // 3. Jurisdiction-specific cap (California example)
  {
    id: "egress_hardware_height_ca_cap",
    name: "Egress Hardware Height – California Cap",
    description:
      "In California, maximum height for egress hardware is reduced to 44 in AFF.",
    category: "operable_parts_egress",
    subject: "hardware",
    jurisdictions: ["US-CA"],
    override_of: "hardware_height_general_operable_egress",
    code_edition: "IBC_2018",
    code_references: [
      {
        source: "IBC_2018",
        section: "1010",
        notes: "Applied with California Building Code amendments"
      }
    ],
    requirements: {
      height_aff: { min_in: 34, max_in: 44 }
    },
    conditions: [
      "opening.jurisdiction == 'US-CA'",
      "opening.is_means_of_egress_door == true",
      "hardware.required_for_egress == true"
    ],
    explanation_template:
      "Measured hardware height: {{measuredHeight}} in AFF. California limits egress hardware to a maximum of 44 in AFF.",
    remediation: {
      generic_fix:
        "Re-locate hardware so centerline does not exceed 44 in AFF in California jurisdictions.",
      cost_impact_estimate: "medium"
    }
  },

  // 4. Security-only locks outside accessible range
  {
    id: "security_lock_height_exception",
    name: "Security-Only Lock Height Exception",
    description:
      "Security-only locks not used for normal operation may be located outside the 34–48 in range.",
    category: "operable_parts_egress",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "ADA_2010", section: "404.2.7", notes: "Exception for security devices" },
      { source: "NFPA_101", section: "7.2.1", notes: "Special locking arrangements" }
    ],
    requirements: {
      flags: {
        single_motion_to_egress: false
      }
    },
    conditions: [
      "hardware.type in ['deadbolt','surface_bolt','top_bolt']",
      "hardware.required_for_normal_egress_or_entry == false",
      "opening.occupant_operation_of_device == false"
    ],
    explanation_template:
      "This device is classified as a security-only lock and is not required for normal egress/entry, so the standard accessible height range does not apply. Confirm it is not relied upon in the egress path.",
    remediation: {
      generic_fix:
        "If occupants must operate this device during normal use, reclassify as primary hardware and relocate within the accessible range.",
      cost_impact_estimate: "low"
    }
  },

  // 5. Viewer height (accessible)
  {
    id: "door_viewer_height_accessible",
    name: "Door Viewer Height (Accessible)",
    description:
      "Accessible door viewers should be mounted around 43 in AFF to be usable from a seated position.",
    category: "vision_communication",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "ADA_2010", section: "404", notes: "Advisory viewer height diagrams" },
      { source: "ICC_A117_1", section: "404" }
    ],
    requirements: {
      height_aff: { min_in: 40, max_in: 45 }
    },
    conditions: [
      "opening.on_accessible_route == true",
      "hardware.type == 'door_viewer'"
    ],
    explanation_template:
      "Door viewer measured at {{measuredHeight}} in AFF. Best practice for accessible viewers is approximately 43 in AFF (acceptable range 40–45 in).",
    remediation: {
      generic_fix:
        "Add or relocate an accessible viewer at approximately 43 in AFF. A higher viewer may be retained as a secondary device.",
      cost_impact_estimate: "low"
    }
  },

  // 6. Vision lite bottom height
  {
    id: "vision_lite_bottom_height",
    name: "Vision Lite Bottom Height (Accessible)",
    description:
      "At least one vision lite bottom must be no more than 43 in AFF for accessible viewing.",
    category: "vision_communication",
    subject: "glazing",
    jurisdictions: ["US"],
    code_references: [
      { source: "ADA_2010", section: "404", notes: "Vision lite accessibility" },
      { source: "ICC_A117_1", section: "404" }
    ],
    requirements: {
      height_aff: { max_in: 43 }
    },
    conditions: [
      "opening.on_accessible_route == true",
      "opening.has_vision_lite == true"
    ],
    explanation_template:
      "Lowest vision lite bottom measured at {{measuredHeight}} in AFF. Required maximum is 43 in AFF for accessible viewing.",
    remediation: {
      generic_fix:
        "Provide at least one lower vision lite with a bottom not more than 43 in AFF, or add a sidelite/glazing panel meeting this height.",
      cost_impact_estimate: "high"
    }
  },

  // 7. Threshold height
  {
    id: "threshold_height_accessible",
    name: "Threshold Height at Accessible Doors",
    description:
      "Thresholds on accessible routes must not exceed 1/2 in height; heights over 1/4 in must be beveled.",
    category: "thresholds_clearances",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "ADA_2010", section: "404.2.5", notes: "Thresholds" },
      { source: "ICC_A117_1", section: "404.2.5" }
    ],
    requirements: {
      dimensions: {
        threshold_max_height_in: 0.5
      }
    },
    conditions: [
      "opening.on_accessible_route == true",
      "opening.has_threshold == true"
    ],
    explanation_template:
      "Threshold height measured at {{thresholdHeight}} in. Maximum allowed is 1/2 in, with beveling required above 1/4 in.",
    remediation: {
      generic_fix:
        "Replace the existing threshold with an ADA-compliant low-profile sill not exceeding 1/2 in, with beveled edges over 1/4 in.",
      cost_impact_estimate: "medium"
    }
  },

  // Door Clear Width at 90° (LiDAR-driven)
  {
    id: "door_clear_width_90deg",
    name: "Door Clear Width at 90°",
    description:
      "Means-of-egress doors must provide the minimum required clear width when opened 90°, typically 32 in clear for most occupancies.",
    category: "thresholds_clearances",
    subject: "assembly",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.1", notes: "Clear width of doors" },
      { source: "ADA_2010", section: "404.2.3", notes: "Clear width" }
    ],
    requirements: {
      dimensions: {
        min_clear_width_in: 32
      }
    },
    conditions: [
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Measured clear width at 90° is {{clearWidthAt90}} in. Required minimum clear width is {{requiredClearWidth}} in for this egress door.",
    remediation: {
      generic_fix:
        "Increase clear width by using a wider door/frame, altering stops or hardware projection, or providing an additional compliant egress door.",
      cost_impact_estimate: "high"
    },
    notes:
      "LiDAR should measure clear opening width between the face of the door (at 90°) and the stop on the latch side. Adjust min_clear_width_in for special occupancies or jurisdictions."
  },

  // 8. Fire door assembly listing
  {
    id: "fire_door_listed_assembly",
    name: "Fire Door Listed Assembly with Compatible Hardware",
    description:
      "Required fire doors must be part of a listed/labeled assembly, including door, frame, and hardware.",
    category: "fire_door_assembly",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.x", notes: "General requirements" },
      { source: "NFPA_101", section: "7.2.1.8" }
    ],
    requirements: {
      flags: {
        fire_listed_assembly_required: true,
        self_closing_required_for_fire_door: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "This opening is required to provide {{requiredRating}} minutes of fire protection. All components (leaf, frame, hinges, latch, closer, glazing) must be part of a listed and labeled fire door assembly.",
    remediation: {
      generic_fix:
        "Verify and document listing labels on leaf and frame, and confirm all hardware components are listed for use on the specified fire rating. Replace non-listed hardware with listed equivalents as needed.",
      cost_impact_estimate: "high"
    }
  },

  // 9. Single motion to egress
  {
    id: "single_motion_to_egress",
    name: "Single Motion to Egress Requirement",
    description:
      "Egress doors must unlatch with a single motion, operable with one hand, without tight grasping, pinching, or twisting.",
    category: "accessibility_reach_operability",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010", notes: "Single releasing operation" },
      { source: "NFPA_101", section: "7.2.1.5" },
      { source: "ADA_2010", section: "404.2.7" }
    ],
    requirements: {
      flags: {
        single_motion_to_egress: true,
        one_hand_operation: true,
        no_tight_grasp_pinch_twist: true
      }
    },
    conditions: [
      "opening.is_means_of_egress_door == true",
      "opening.occupancy_group not in ['detention','healthcare_special_locking','special_amusement']"
    ],
    explanation_template:
      "This door requires more than one action to unlatch or requires tight grasping/pinching/twisting, which is not permitted for typical egress doors.",
    remediation: {
      generic_fix:
        "Reconfigure hardware so that a single lever, panic device, or push pad unlatches the door without requiring tight grasping, pinching, or twisting.",
      cost_impact_estimate: "medium"
    }
  },

  // 10. Automatic operator actuator plate height
  {
    id: "auto_operator_actuator_plate_height",
    name: "Automatic Operator Actuator Plate Height",
    description:
      "Wall-mounted actuator plates for automatic door operators must fall within accessible reach (34–48 in AFF).",
    category: "automatic_operators",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "BHMA_A156", section: "A156.10 / A156.19" },
      { source: "ADA_2010", section: "309" }
    ],
    requirements: {
      height_aff: { min_in: 34, max_in: 48 },
      flags: {
        one_hand_operation: true,
        no_tight_grasp_pinch_twist: true
      }
    },
    conditions: [
      "hardware.type == 'auto_operator_actuator_plate'"
    ],
    explanation_template:
      "Actuator plate measured at {{measuredHeight}} in AFF. Required range for operable parts is 34–48 in AFF.",
    remediation: {
      generic_fix:
        "Relocate the actuator plate so its operable surface is within 34–48 in AFF, and ensure adequate clear floor space for approach.",
      cost_impact_estimate: "low"
    }
  },

  // 11. Fire door clearances
  {
    id: "fire_door_clearances",
    name: "Fire Door Edge and Bottom Clearances",
    description:
      "Clearances at fire door edges must be within NFPA 80 limits (e.g., 1/8 in at vertical edges; specific bottom clearance depending on sill condition).",
    category: "thresholds_clearances",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.8", notes: "Clearances for swinging doors" }
    ],
    requirements: {
      dimensions: {
        max_vertical_clearance_in: 0.125,
        max_bottom_clearance_in: 0.75
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "opening.operation == 'swinging'"
    ],
    explanation_template:
      "Fire door clearances: side/top {{sideClearance}} in (max 1/8 in), bottom {{bottomClearance}} in (max 3/4 in) per NFPA 80.",
    remediation: {
      generic_fix:
        "Adjust door/frame to reduce edge clearances within NFPA 80 limits. May require door replacement or frame modification.",
      cost_impact_estimate: "high"
    }
  },

  // 12. Closer / overhead stop height (permitted high)
  {
    id: "closer_overhead_mounting_height",
    name: "Closer and Overhead Stop Mounting Height",
    description:
      "Overhead closers and stops are typically mounted at the door head and are permitted above normal operable-part height.",
    category: "accessibility_reach_operability",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "ADA_2010", section: "404.2.8", notes: "Closing speed and forces" },
      { source: "BHMA_A156", section: "A156.4", notes: "Door closers – installation dimensions" }
    ],
    requirements: {
      height_aff: { min_in: 78 },
      flags: {
        one_hand_operation: true
      }
    },
    conditions: [
      "hardware.type in ['door_closer','overhead_stop']"
    ],
    explanation_template:
      "Closer/stop mounted at {{measuredHeight}} in AFF. High mounting is acceptable for overhead devices.",
    remediation: {
      generic_fix:
        "Ensure closer is properly sized and adjusted for opening force and closing speed requirements.",
      cost_impact_estimate: "low"
    },
    notes:
      "Main compliance issues for closers are closing time and opening force, not operable-part reach."
  },

  // 13. Fire door self-closing device requirement
  {
    id: "fire_door_self_closing",
    name: "Fire Door Self-Closing Device Required",
    description:
      "Fire-rated doors must be equipped with a self-closing or automatic-closing device.",
    category: "fire_door_assembly",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.1.5", notes: "Self-closing devices for fire doors" },
      { source: "NFPA_101", section: "7.2.1.8", notes: "Closing devices for fire door assemblies" },
      { source: "IBC_2018", section: "716.2", notes: "Fire door assemblies" }
    ],
    requirements: {
      flags: {
        self_closing_required_for_fire_door: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "opening.operation in ['swinging','pivot']"
    ],
    explanation_template:
      "This {{requiredRating}}-minute fire-rated door requires a self-closing device per NFPA 80 and IBC.",
    remediation: {
      generic_fix:
        "Install a listed self-closing device rated for the door weight and size. For held-open applications, add smoke detector/release system.",
      cost_impact_estimate: "medium"
    }
  },

  // 14. Fire door hinge count
  {
    id: "fire_door_hinge_count_spacing",
    name: "Fire Door Hinge Count and Spacing",
    description:
      "Fire-rated swinging doors must have hinges sized and spaced according to NFPA 80 (minimum two hinges up to 60 in, plus one for each additional 30 in).",
    category: "hinges_pivots_misc",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.4.x", notes: "Hinges and pivot hardware for swinging doors" }
    ],
    requirements: {},
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "opening.operation == 'swinging'",
      "hardware.type in ['butt_hinge','continuous_hinge','pivot']"
    ],
    explanation_template:
      "Fire door hinge count check: door height {{doorHeight}} in requires minimum {{requiredHinges}} hinges per NFPA 80.",
    remediation: {
      generic_fix:
        "Add or replace hinges to meet NFPA 80 requirements for the door height and rating.",
      cost_impact_estimate: "medium"
    }
  },

  // ============================================================
  // PHASE 1: LIFE-SAFETY CORE RULES (25-30 new rules)
  // ============================================================

  // === EGRESS LOCKING & DOOR SWING ===

  // 15. Door swing direction for egress
  {
    id: "egress_door_swing_direction",
    name: "Egress Door Swing Direction",
    description:
      "Doors serving rooms or areas with occupant load of 50 or more shall swing in the direction of egress travel.",
    category: "operable_parts_egress",
    subject: "leaf",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    effective_from_year: 2000,
    code_references: [
      { source: "IBC_2018", section: "1010.1.2.1", notes: "Door swing direction" },
      { source: "NFPA_101", section: "7.2.1.4.2", notes: "Swing direction" }
    ],
    requirements: {
      flags: {
        single_motion_to_egress: true
      },
      swing: {
        direction_in_egress_travel: true,
        min_occupant_load_threshold: 50
      }
    },
    conditions: [
      "opening.is_means_of_egress_door == true",
      "opening.room_occupant_load >= 50"
    ],
    explanation_template:
      "This egress door serves an area with occupant load of {{occupantLoad}}. Doors serving 50+ occupants must swing in the direction of egress travel.",
    remediation: {
      generic_fix:
        "Reverse door swing to open in direction of egress. May require frame modification and hardware reconfiguration.",
      cost_impact_estimate: "high"
    }
  },

  // 16. Minimum clear width for egress doors
  {
    id: "egress_door_clear_width",
    name: "Egress Door Minimum Clear Width",
    description:
      "Egress doors must provide minimum 32 in clear width when open 90 degrees. Main exit doors require 36 in.",
    category: "operable_parts_egress",
    subject: "leaf",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.1", notes: "Minimum door width" },
      { source: "ADA_2010", section: "404.2.3", notes: "Clear width" },
      { source: "NFPA_101", section: "7.2.1.2" }
    ],
    requirements: {
      dimensions: {
        min_clear_width_in: 32
      },
      swing: {
        clear_width_when_open: 32  // Minimum for egress doors (36 for main exit)
      }
    },
    conditions: [
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Egress door clear width: {{measuredWidth}} in. Minimum 32 in required (36 in for main exit).",
    remediation: {
      generic_fix:
        "Replace door/frame assembly to achieve minimum clear width, or remove projecting hardware reducing clear opening.",
      cost_impact_estimate: "high"
    }
  },

  // 17. Hardware projection into clear width
  {
    id: "hardware_projection_clear_width",
    name: "Hardware Projection into Clear Width",
    description:
      "Hardware shall not project more than 4 in into the required door clear width when the door is open 90 degrees.",
    category: "operable_parts_egress",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.1.1", notes: "Projections into clear width" },
      { source: "ADA_2010", section: "404.2.3", notes: "Door hardware projections" }
    ],
    requirements: {
      dimensions: {
        max_projection_in: 4
      }
    },
    conditions: [
      "opening.is_means_of_egress_door == true",
      "hardware.mounted_on_door_face == true"
    ],
    explanation_template:
      "Hardware projects {{projection}} in into clear width. Maximum 4 in projection permitted below 34 in AFF.",
    remediation: {
      generic_fix:
        "Replace projecting hardware with lower-profile alternatives, or relocate above 34 in AFF where limited projections are allowed.",
      cost_impact_estimate: "medium"
    }
  },

  // === PANIC AND EXIT DEVICES ===

  // 18. Panic hardware required by occupancy
  {
    id: "panic_hardware_required_occupancy",
    name: "Panic Hardware Required by Occupancy",
    description:
      "Panic hardware is required on egress doors serving Assembly (A) and Educational (E) occupancies with occupant loads exceeding 50.",
    category: "exit_devices",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.10", notes: "Panic and fire exit hardware" },
      { source: "NFPA_101", section: "7.2.1.7", notes: "Panic hardware" }
    ],
    requirements: {
      flags: {
        panic_hardware_required: true,
        single_motion_to_egress: true
      }
    },
    conditions: [
      "opening.occupancy_group in ['A','E']",
      "opening.room_occupant_load > 50",
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Egress door in {{occupancyGroup}} occupancy with {{occupantLoad}} occupants requires panic hardware (UL listed).",
    remediation: {
      generic_fix:
        "Install UL-listed panic hardware (rim, mortise, or surface vertical rod device). For fire doors, use fire exit hardware labeled for the rating.",
      preferred_products: ["PANIC-RIM-UL", "PANIC-CVR-UL"],
      cost_impact_estimate: "high"
    }
  },

  // 19. Fire exit hardware on fire doors
  {
    id: "fire_exit_hardware_required",
    name: "Fire Exit Hardware on Fire-Rated Doors",
    description:
      "Where panic hardware is required on a fire-rated door, it must be fire exit hardware (labeled for fire door use).",
    category: "exit_devices",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.10", notes: "Fire exit hardware" },
      { source: "NFPA_80", section: "6.4.5", notes: "Panic hardware on fire doors" },
      { source: "UL_305", section: "1", notes: "Fire exit hardware listing" }
    ],
    requirements: {
      flags: {
        fire_exit_hardware_required: true,
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "hardware.type == 'panic_device'",
      "opening.panic_hardware_required == true"
    ],
    explanation_template:
      "This {{fireRating}}-minute fire door requires panic hardware. Standard panic hardware must be replaced with fire exit hardware (UL listed for fire doors).",
    remediation: {
      generic_fix:
        "Replace panic device with fire exit hardware carrying both UL panic hardware and UL fire door hardware labels.",
      preferred_products: ["FIRE-EXIT-RIM", "FIRE-EXIT-CVR"],
      cost_impact_estimate: "high"
    }
  },

  // 20. Latching required for fire doors
  {
    id: "fire_door_latching_required",
    name: "Fire Door Positive Latching Required",
    description:
      "Fire doors must be equipped with positive-latching hardware to maintain door in closed position.",
    category: "fire_door_assembly",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "NFPA_80", section: "6.4.4", notes: "Latching hardware" },
      { source: "IBC_2018", section: "716.2.6.1", notes: "Fire door latching" }
    ],
    requirements: {
      flags: {
        latching_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "Fire door requires positive latching hardware. Current configuration: {{hasLatch}}.",
    remediation: {
      generic_fix:
        "Install listed latching hardware (mortise lock, cylindrical lock, or fire exit hardware with latch bolt) compatible with fire rating.",
      cost_impact_estimate: "medium"
    }
  },

  // === DELAYED EGRESS ===

  // 21. Delayed egress lock timing
  {
    id: "delayed_egress_timing",
    name: "Delayed Egress Lock Maximum Delay",
    description:
      "Delayed egress locks shall unlock within 15 seconds (or 30 seconds where approved) after initiation of the releasing mechanism.",
    category: "delayed_egress",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.8", notes: "Delayed egress locking" },
      { source: "NFPA_101", section: "7.2.1.6.1", notes: "Delayed egress locks" }
    ],
    requirements: {
      timing: {
        delay_seconds: { min: 0, max: 15 }
      },
      electrical: {
        fire_alarm_release_required: true
      },
      flags: {
        signage_required: true,
        audible_alarm_required: true
      }
    },
    conditions: [
      "hardware.type == 'delayed_egress_lock'",
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Delayed egress lock delay: {{delaySeconds}} seconds. Maximum 15 seconds permitted (30 seconds only with AHJ approval).",
    remediation: {
      generic_fix:
        "Adjust or replace delayed egress device to comply with 15-second maximum. Verify fire alarm interface, signage, and irreversible action.",
      cost_impact_estimate: "medium"
    }
  },

  // 22. Delayed egress signage requirement
  {
    id: "delayed_egress_signage",
    name: "Delayed Egress Required Signage",
    description:
      "Delayed egress locks require illuminated signage reading 'PUSH UNTIL ALARM SOUNDS. DOOR CAN BE OPENED IN 15 SECONDS.'",
    category: "delayed_egress",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.8", notes: "Delayed egress signage" },
      { source: "NFPA_101", section: "7.2.1.6.1.3", notes: "Sign requirements" }
    ],
    requirements: {
      flags: {
        signage_required: true
      }
    },
    conditions: [
      "hardware.type == 'delayed_egress_lock'",
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Delayed egress door requires illuminated sign stating 'PUSH UNTIL ALARM SOUNDS. DOOR CAN BE OPENED IN 15 SECONDS.' Sign status: {{signagePresent}}.",
    remediation: {
      generic_fix:
        "Install illuminated sign with required text adjacent to the door. Sign must be visible on the egress side.",
      cost_impact_estimate: "low"
    }
  },

  // 23. Delayed egress fire alarm interface
  {
    id: "delayed_egress_fire_alarm_release",
    name: "Delayed Egress Fire Alarm Release",
    description:
      "Delayed egress locks must release immediately upon fire alarm actuation, power failure, or fire sprinkler activation.",
    category: "delayed_egress",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.8", notes: "Automatic release" },
      { source: "NFPA_72", section: "21.9", notes: "Fire alarm interface" }
    ],
    requirements: {
      electrical: {
        fire_alarm_release_required: true,
        fail_mode: "fail_safe"
      }
    },
    conditions: [
      "hardware.type == 'delayed_egress_lock'"
    ],
    explanation_template:
      "Delayed egress lock must release immediately on fire alarm ({{faConnected}}), power failure ({{failMode}}), or sprinkler flow.",
    remediation: {
      generic_fix:
        "Wire delayed egress device to fire alarm system relay. Configure for fail-safe (unlock on power loss). Verify functionality with fire alarm test.",
      cost_impact_estimate: "medium"
    }
  },

  // === CONTROLLED EGRESS (Healthcare) ===

  // 24. Controlled egress in healthcare
  {
    id: "controlled_egress_healthcare",
    name: "Controlled Egress in Healthcare Occupancies",
    description:
      "Controlled egress is permitted in healthcare occupancies where patients require security measures for their safety, with approved clinical staff override.",
    category: "controlled_egress",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.7", notes: "Controlled egress" },
      { source: "NFPA_101", section: "18.2.2.2.5", notes: "Healthcare controlled egress" }
    ],
    requirements: {
      electrical: {
        fire_alarm_release_required: true,
        sensor_required: true,
        fail_mode: "fail_safe"
      },
      flags: {
        sensor_release_required: true
      }
    },
    conditions: [
      "opening.occupancy_group in ['I-2','I-3']",
      "opening.controlled_egress_approved == true"
    ],
    explanation_template:
      "Controlled egress installation in {{occupancyGroup}} occupancy. Requires staff override, sensor detection, and fire alarm release.",
    remediation: {
      generic_fix:
        "Install approved controlled egress system with motion sensor detection (30-sec unlock), manual staff release, and fire alarm interface.",
      cost_impact_estimate: "high"
    }
  },

  // === MAGLOCKS ===

  // 25. Electromagnetic lock sensor requirements
  {
    id: "maglock_sensor_requirements",
    name: "Electromagnetic Lock Sensor Requirements",
    description:
      "Electromagnetic locks on egress doors require a sensor that detects approaching occupants and unlocks the door, or a readily visible/accessible manual release.",
    category: "maglocks",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.9", notes: "Electromagnetic locks" },
      { source: "NFPA_101", section: "7.2.1.5.5", notes: "Electromagnetically locked egress doors" }
    ],
    requirements: {
      electrical: {
        sensor_required: true,
        fail_mode: "fail_safe"
      },
      flags: {
        sensor_release_required: true,
        manual_release_required: true
      }
    },
    conditions: [
      "hardware.type == 'electromagnetic_lock'",
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Electromagnetic lock requires motion sensor ({{sensorPresent}}) for automatic unlock, plus manual release device accessible for egress.",
    remediation: {
      generic_fix:
        "Install motion sensor or touchbar/pushplate for automatic release. Add fire alarm interface for fail-safe operation.",
      cost_impact_estimate: "medium"
    }
  },

  // 26. Maglock manual release device
  {
    id: "maglock_manual_release",
    name: "Electromagnetic Lock Manual Release",
    description:
      "A readily visible, durable manual release device must be provided within 5 feet of secured egress doors with electromagnetic locks.",
    category: "maglocks",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.9", notes: "Manual release for maglocks" },
      { source: "NFPA_101", section: "7.2.1.5.5.3", notes: "Manual release requirements" }
    ],
    requirements: {
      height_aff: { min_in: 40, max_in: 48 },
      flags: {
        manual_release_required: true
      }
    },
    conditions: [
      "hardware.type == 'electromagnetic_lock'",
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Maglock requires visible manual release within 5 feet of door. Device height: {{releaseHeight}} in (required 40–48 in AFF).",
    remediation: {
      generic_fix:
        "Install clearly marked pushbutton or touchbar release device within 5 feet of door, mounted 40–48 in AFF.",
      cost_impact_estimate: "low"
    }
  },

  // 27. Maglock fire alarm release
  {
    id: "maglock_fire_alarm_release",
    name: "Electromagnetic Lock Fire Alarm Release",
    description:
      "Electromagnetic locks must release upon fire alarm actuation and power failure (fail-safe).",
    category: "maglocks",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.9", notes: "Fire alarm release" },
      { source: "NFPA_72", section: "21.9", notes: "Door release function" }
    ],
    requirements: {
      electrical: {
        fire_alarm_release_required: true,
        fail_mode: "fail_safe"
      }
    },
    conditions: [
      "hardware.type == 'electromagnetic_lock'"
    ],
    explanation_template:
      "Maglock fire alarm interface: {{faConnected}}. Fail mode: {{failMode}}. Must unlock on FA actuation and power loss.",
    remediation: {
      generic_fix:
        "Connect maglock power supply to fire alarm relay for automatic release. Verify fail-safe configuration unlocks on power loss.",
      cost_impact_estimate: "medium"
    }
  },

  // === AUTOMATIC OPERATORS (BHMA A156.19) ===

  // 28. Automatic operator safety sensors
  {
    id: "auto_operator_safety_sensors",
    name: "Automatic Operator Safety Sensors",
    description:
      "Power-operated doors must have safety sensors or other protection to prevent entrapment.",
    category: "automatic_operators",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "BHMA_A156_19", section: "4.3", notes: "Safety requirements" },
      { source: "IBC_2018", section: "1010.1.4.2", notes: "Power-operated doors" }
    ],
    requirements: {
      electrical: {
        sensor_required: true
      },
      flags: {
        sensor_release_required: true
      }
    },
    conditions: [
      "hardware.type in ['auto_operator','power_operator']",
      "opening.operation in ['swinging','sliding']"
    ],
    explanation_template:
      "Automatic operator requires presence sensors and entrapment protection per BHMA A156.19. Sensors present: {{sensorsPresent}}.",
    remediation: {
      generic_fix:
        "Install safety sensors (guide rails, presence sensors, or control mats) to prevent entrapment. Test per A156.19 requirements.",
      cost_impact_estimate: "medium"
    }
  },

  // 29. Automatic operator manual breakout
  {
    id: "auto_operator_manual_breakout",
    name: "Automatic Operator Manual Breakout Capability",
    description:
      "Swinging automatic doors serving egress must have breakout capability allowing manual opening with 30 lbf or less when power fails.",
    category: "automatic_operators",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "BHMA_A156_19", section: "4.8", notes: "Breakout requirements" },
      { source: "IBC_2018", section: "1010.1.4.3", notes: "Low-energy doors" }
    ],
    requirements: {
      timing: {
        closing_force_lbf: { max: 30 }
      },
      flags: {
        single_motion_to_egress: true
      }
    },
    conditions: [
      "hardware.type == 'auto_operator'",
      "opening.is_means_of_egress_door == true",
      "opening.operation == 'swinging'"
    ],
    explanation_template:
      "Automatic swinging door on egress requires manual breakout at 30 lbf or less. Measured force: {{breakoutForce}} lbf.",
    remediation: {
      generic_fix:
        "Adjust operator for breakout operation at 30 lbf or less. Install breakaway arms if needed for manual emergency opening.",
      cost_impact_estimate: "medium"
    }
  },

  // 30. Automatic operator closing speed
  {
    id: "auto_operator_closing_speed",
    name: "Automatic Operator Closing Speed",
    description:
      "Power-operated doors must not close faster than 3 seconds from fully open to 3 inches from closed.",
    category: "automatic_operators",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "ADA_2010", section: "404.2.8.1", notes: "Door closing speed" },
      { source: "BHMA_A156_19", section: "4.6", notes: "Speed requirements" }
    ],
    requirements: {
      timing: {
        sweep_time_seconds: { min: 3 }
      }
    },
    conditions: [
      "hardware.type in ['auto_operator','power_operator']"
    ],
    explanation_template:
      "Automatic door closing speed: {{sweepTime}} seconds. Minimum 3 seconds required from 90° open to 3 in from closed.",
    remediation: {
      generic_fix:
        "Adjust operator controller to slow closing speed. Minimum 3 seconds from fully open to nearly closed position.",
      cost_impact_estimate: "low"
    }
  },

  // === FIRE DOOR LABELING AND SIGNAGE ===

  // 31. Fire door label visibility
  {
    id: "fire_door_label_visibility",
    name: "Fire Door Label Requirement",
    description:
      "Fire door assemblies must bear the label of an approved agency indicating the fire protection rating.",
    category: "fire_door_assembly",
    subject: "assembly",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "NFPA_80", section: "5.2", notes: "Labels and markings" },
      { source: "IBC_2018", section: "716.2.6", notes: "Fire door labeling" },
      { source: "UL_10C", section: "1", notes: "Fire door testing and labeling" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      },
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "Fire door requires visible label from approved testing agency. Door label: {{doorLabel}}, Frame label: {{frameLabel}}. Labels must match or exceed required {{fireRating}}-minute rating.",
    remediation: {
      generic_fix:
        "Verify presence of fire door labels on door edge and frame head. Labels must be legible and match required rating. Replace unlabeled assemblies.",
      cost_impact_estimate: "high"
    }
  },

  // 32. Fire door rating matching
  {
    id: "fire_door_rating_matching",
    name: "Fire Door and Frame Rating Matching",
    description:
      "Fire door leaf and frame ratings must be compatible per NFPA 80 Table 4.4.1 (e.g., 90-min door with 90-min frame in 2-hr wall).",
    category: "fire_door_assembly",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.4.1", notes: "Fire protection ratings for openings" },
      { source: "IBC_2018", section: "716.2.1", notes: "Opening protective ratings" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "Wall rating: {{wallRating}} hr. Required door rating: {{doorRatingRequired}} min. Installed door: {{doorRatingActual}} min, frame: {{frameRatingActual}} min.",
    remediation: {
      generic_fix:
        "Replace door or frame to achieve compatible ratings per NFPA 80 Table 4.4.1. Door rating must meet wall opening protection requirements.",
      cost_impact_estimate: "high"
    }
  },

  // 33. Fire door signage (do not block)
  {
    id: "fire_door_keep_closed_signage",
    name: "Fire Door Keep Closed Signage",
    description:
      "Self-closing fire doors without automatic hold-open devices require signage indicating 'FIRE DOOR – KEEP CLOSED'.",
    category: "signage",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.1.4", notes: "Fire door signage" }
    ],
    requirements: {
      flags: {
        signage_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "hardware.has_automatic_hold_open == false"
    ],
    explanation_template:
      "Fire door without hold-open device requires 'FIRE DOOR – KEEP CLOSED' signage. Sign present: {{signagePresent}}.",
    remediation: {
      generic_fix:
        "Install durable 'FIRE DOOR – KEEP CLOSED' sign on or adjacent to the door on both sides.",
      cost_impact_estimate: "low"
    }
  },

  // === SMOKE SEALS AND GASKETING ===

  // 34. Smoke door assembly gasket
  {
    id: "smoke_door_gasketing",
    name: "Smoke Door Gasketing Requirements",
    description:
      "Smoke doors in smoke barriers must be tested and labeled per UL 1784 and maintain maximum 3 cfm/sq ft air leakage.",
    category: "gasketing_smoke_seals",
    subject: "assembly",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "716.2.5", notes: "Smoke door assemblies" },
      { source: "UL_1784", section: "1", notes: "Air leakage test" },
      { source: "NFPA_80", section: "5.3.6", notes: "Smoke labels" }
    ],
    requirements: {
      rating: {
        smoke_rating: "S"
      }
    },
    conditions: [
      "opening.in_smoke_barrier == true"
    ],
    explanation_template:
      "Smoke door in smoke barrier requires 'S' label and UL 1784 tested gasketing. Current gasket status: {{gasketStatus}}. S-label present: {{sLabelPresent}}.",
    remediation: {
      generic_fix:
        "Install listed smoke gasket/seal kit on door edges and meeting stiles. Verify or obtain 'S' label for smoke-rated door assemblies.",
      cost_impact_estimate: "medium"
    }
  },

  // 35. Fire/smoke door positive pressure testing
  {
    id: "fire_door_positive_pressure",
    name: "Fire Door Positive Pressure Rating",
    description:
      "Fire door assemblies in high-rise buildings and critical locations may require positive pressure (PP) fire testing per UL 10C.",
    category: "fire_door_assembly",
    subject: "assembly",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "716.2.6.2", notes: "Positive pressure testing" },
      { source: "UL_10C", section: "1", notes: "Positive pressure fire test" }
    ],
    requirements: {
      rating: {
        positive_pressure: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes >= 60",
      "opening.in_high_rise == true || opening.positive_pressure_required == true"
    ],
    explanation_template:
      "High-rise fire door may require positive pressure (PP) tested assembly. PP test status: {{ppTestStatus}}.",
    remediation: {
      generic_fix:
        "Verify if positive pressure testing is required per local code. Replace assembly with UL 10C positive pressure listed door if needed.",
      cost_impact_estimate: "high"
    }
  },

  // === DOOR CLOSER REQUIREMENTS ===

  // 36. Door closer opening force
  {
    id: "door_closer_opening_force",
    name: "Door Closer Opening Force Maximum",
    description:
      "Interior doors on accessible routes must require no more than 5 lbf to open.",
    category: "closers_operators",
    subject: "hardware",
    jurisdictions: ["US"],
    code_edition: "ADA_2010",
    code_references: [
      { source: "ADA_2010", section: "404.2.9", notes: "Door opening force" },
      { source: "ICC_A117_1", section: "404.2.9", notes: "Opening force" }
    ],
    requirements: {
      timing: {
        closing_force_lbf: { max: 5 }
      }
    },
    conditions: [
      "opening.on_accessible_route == true",
      "opening.door_type == 'interior'",
      "hardware.type == 'door_closer'"
    ],
    explanation_template:
      "Interior door opening force: {{openingForce}} lbf. Maximum 5 lbf required for accessible routes (fire doors excepted per local requirements).",
    remediation: {
      generic_fix:
        "Adjust closer spring power or replace with low-force closer. Exterior doors may have higher limits per local codes.",
      cost_impact_estimate: "low"
    }
  },

  // 37. Door closer sweep time
  {
    id: "door_closer_sweep_time",
    name: "Door Closer Sweep Time",
    description:
      "Door closers must be adjusted so door takes at least 5 seconds to move from 90° open to 12° from latch.",
    category: "closers_operators",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "ADA_2010", section: "404.2.8.1", notes: "Door closing speed" },
      { source: "ICC_A117_1", section: "404.2.8.1", notes: "Closing speed" }
    ],
    requirements: {
      timing: {
        sweep_time_seconds: { min: 5 }
      }
    },
    conditions: [
      "opening.on_accessible_route == true",
      "hardware.type == 'door_closer'"
    ],
    explanation_template:
      "Door closing sweep time: {{sweepTime}} seconds. Minimum 5 seconds required from 90° to 12° from closed.",
    remediation: {
      generic_fix:
        "Adjust closer sweep speed valve to achieve minimum 5-second closing time. Verify with stopwatch test.",
      cost_impact_estimate: "low"
    }
  },

  // === COORDINATORS AND MEETING STILES ===

  // 38. Door coordinator requirement
  {
    id: "door_coordinator_pairs",
    name: "Door Coordinator on Pairs",
    description:
      "Pairs of doors with overlapping astragals or meeting stiles require coordinators to ensure proper closing sequence.",
    category: "coordinators_astragals",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.4.7", notes: "Coordinators and meeting stiles" },
      { source: "IBC_2018", section: "716.2.6.3", notes: "Door pairs" }
    ],
    requirements: {
      flags: {
        coordinator_required: true
      }
    },
    conditions: [
      "opening.is_pair == true",
      "opening.has_overlapping_astragal == true || opening.has_rabbeted_stiles == true"
    ],
    explanation_template:
      "Pair of doors with overlapping meeting stiles requires coordinator for proper closing sequence. Coordinator present: {{hasCoordinator}}.",
    remediation: {
      generic_fix:
        "Install door coordinator to ensure inactive leaf closes before active leaf. For fire doors, use fire-rated coordinator.",
      cost_impact_estimate: "medium"
    }
  },

  // 39. Fire door pair astragal requirements
  {
    id: "fire_door_pair_astragal",
    name: "Fire Door Pair Astragal or Meeting Stile",
    description:
      "Fire-rated door pairs require overlapping astragals or rabbeted meeting stiles to maintain fire resistance.",
    category: "coordinators_astragals",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.4.7", notes: "Door pairs and stiles" },
      { source: "IBC_2018", section: "716.2.3", notes: "Door pair requirements" }
    ],
    requirements: {
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.is_pair == true",
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "Fire-rated door pair requires overlapping astragal or rabbeted stiles to maintain rating. Configuration: {{stileType}}.",
    remediation: {
      generic_fix:
        "Install listed overlapping astragal on active leaf, or replace with rabbeted stile configuration. Include coordinator.",
      cost_impact_estimate: "medium"
    }
  },

  // === ACCESS CONTROL AND SECURITY HARDWARE ===

  // 40. Electric strike fail mode
  {
    id: "electric_strike_fail_mode",
    name: "Electric Strike Fail Mode Selection",
    description:
      "Electric strikes on egress doors must be fail-safe (unlock on power loss) unless specifically approved for fail-secure.",
    category: "electrified_hardware",
    subject: "electrified",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "1010.1.9", notes: "Electrified hardware" },
      { source: "NFPA_101", section: "7.2.1.5.5", notes: "Electrically controlled egress" }
    ],
    requirements: {
      electrical: {
        fail_mode: "fail_safe"
      }
    },
    conditions: [
      "hardware.type == 'electric_strike'",
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Electric strike on egress door. Fail mode: {{failMode}}. Egress doors require fail-safe unless specially approved.",
    remediation: {
      generic_fix:
        "Configure or replace electric strike for fail-safe operation (unlock on power loss). Connect to fire alarm for release.",
      cost_impact_estimate: "medium"
    }
  },

  // 41. Power transfer device requirement
  {
    id: "power_transfer_electrified_hardware",
    name: "Power Transfer for Electrified Hardware",
    description:
      "Electrified door hardware requires listed power transfer devices rated for the door cycle count and electrical load.",
    category: "electrified_hardware",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "BHMA_A156_25", section: "4", notes: "Power transfer devices" },
      { source: "UL_294", section: "1", notes: "Access control system units" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "hardware.is_electrified == true",
      "opening.operation == 'swinging'"
    ],
    explanation_template:
      "Electrified swinging door requires power transfer device. Transfer type: {{transferType}}. Rating: {{cycleRating}} cycles.",
    remediation: {
      generic_fix:
        "Install listed power transfer (EPT, armored door loop, or concealed cable) rated for electrical load and cycle requirements.",
      cost_impact_estimate: "medium"
    }
  },

  // 42. Request-to-exit (REX) device placement
  {
    id: "rex_device_placement",
    name: "Request-to-Exit Device Placement",
    description:
      "Request-to-exit devices must be located to detect occupant approach from the egress side of controlled doors.",
    category: "access_control",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010.1.9", notes: "Access-controlled egress doors" },
      { source: "UL_294", section: "1", notes: "Access control equipment" }
    ],
    requirements: {
      electrical: {
        sensor_required: true
      }
    },
    conditions: [
      "hardware.type in ['rex_sensor','rex_button']",
      "opening.has_access_control == true"
    ],
    explanation_template:
      "REX device must detect approaching occupants for egress. REX type: {{rexType}}, location: {{rexLocation}}.",
    remediation: {
      generic_fix:
        "Install or adjust REX device (PIR, microwave, or pushbutton) to reliably detect occupants approaching from egress side.",
      cost_impact_estimate: "low"
    }
  },

  // 43. Door position switch (DPS) requirement
  {
    id: "door_position_switch",
    name: "Door Position Switch for Access Control",
    description:
      "Access-controlled doors should have door position switches to monitor door status (open/closed).",
    category: "access_control",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "1", notes: "Access control system equipment" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Access-controlled door should have door position switch (DPS). DPS installed: {{dpsPresent}}, monitored: {{dpsMonitored}}.",
    remediation: {
      generic_fix:
        "Install concealed magnetic door position switch in frame/door. Connect to access control panel for door forced/held-open monitoring.",
      cost_impact_estimate: "low"
    }
  },

  // ============================================================
  // PHASE 2: FIRE/ACOUSTIC RULES (22 rules)
  // ============================================================

  // === FIRE-RATED GLAZING REQUIREMENTS ===

  // 44. Fire-rated vision lite maximum size
  {
    id: "fire_glazing_vision_lite_size",
    name: "Fire-Rated Vision Lite Maximum Size",
    description:
      "Vision lites in fire doors must not exceed 100 sq in for doors rated 45 min or greater unless using fire-resistive glazing.",
    category: "fire_rated_glazing",
    subject: "glazing",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "NFPA_80", section: "4.3.3", notes: "Glazing size limits" },
      { source: "IBC_2018", section: "716.2.2.1", notes: "Fire window assemblies" },
      { source: "UL_9", section: "1", notes: "Fire tests of window assemblies" }
    ],
    requirements: {
      rating: {
        fire_rating_minutes: 45,
        label_match_required: true
      },
      dimensions: {
        max_projection_in: 100
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes >= 45",
      "opening.has_vision_lite == true",
      "glazing.type != 'fire_resistive'"
    ],
    explanation_template:
      "Vision lite size: {{liteSize}} sq in. Maximum 100 sq in for {{fireRating}}-minute doors unless fire-resistive glazing used.",
    remediation: {
      generic_fix:
        "Reduce vision lite size to 100 sq in or less, or replace with fire-resistive glazing rated for the required protection period.",
      cost_impact_estimate: "high"
    }
  },

  // 45. Fire-rated glazing temperature rise
  {
    id: "fire_glazing_temperature_rise",
    name: "Fire-Rated Glazing Temperature Rise Limit",
    description:
      "Fire door glazing in certain locations must limit temperature rise to 450°F above ambient at 30 minutes per NFPA 80.",
    category: "fire_rated_glazing",
    subject: "glazing",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.3.3.2", notes: "Temperature rise glazing" },
      { source: "IBC_2018", section: "716.2.2", notes: "Fire-protective glazing" },
      { source: "UL_10C", section: "7.11", notes: "Temperature rise measurement" }
    ],
    requirements: {
      rating: {
        fire_rating_minutes: 45,
        positive_pressure: true
      }
    },
    conditions: [
      "opening.in_exit_enclosure == true || opening.in_exit_passageway == true",
      "opening.required_fire_rating_minutes >= 45"
    ],
    explanation_template:
      "Glazing in exit enclosure requires temperature-rise limiting type. Current glazing: {{glazingType}}, temp-rise rated: {{tempRiseRated}}.",
    remediation: {
      generic_fix:
        "Replace glazing with temperature-rise limiting fire-rated glass (max 450°F rise at 30 min). Verify W-marking on label.",
      cost_impact_estimate: "high"
    }
  },

  // 46. Fire-rated sidelight glazing
  {
    id: "fire_glazing_sidelight",
    name: "Fire-Rated Sidelight Glazing Requirements",
    description:
      "Sidelights adjacent to fire doors must have fire-rated glazing matching or exceeding the door rating.",
    category: "fire_rated_glazing",
    subject: "glazing",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.3.3", notes: "Fixed glazing in fire door assemblies" },
      { source: "IBC_2018", section: "716.2.6.1", notes: "Sidelights" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      }
    },
    conditions: [
      "opening.has_sidelight == true",
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "Sidelight glazing requires {{requiredRating}}-minute rating. Installed rating: {{installedRating}} min.",
    remediation: {
      generic_fix:
        "Replace sidelight glazing with fire-rated glass matching the wall/door assembly rating. Ensure proper labeled frame.",
      cost_impact_estimate: "high"
    }
  },

  // 47. Fire-rated transom glazing
  {
    id: "fire_glazing_transom",
    name: "Fire-Rated Transom Glazing Requirements",
    description:
      "Transoms above fire doors must have fire-rated glazing matching the door rating.",
    category: "fire_rated_glazing",
    subject: "glazing",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.3.3", notes: "Fixed glazing above fire doors" },
      { source: "IBC_2018", section: "716.2.6.2", notes: "Transoms" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      }
    },
    conditions: [
      "opening.has_transom == true",
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "Transom glazing requires {{requiredRating}}-minute rating. Installed rating: {{installedRating}} min.",
    remediation: {
      generic_fix:
        "Replace transom glazing with fire-rated glass matching door assembly rating. Install in listed frame assembly.",
      cost_impact_estimate: "high"
    }
  },

  // 48. Fire-rated glazing labeling
  {
    id: "fire_glazing_label_required",
    name: "Fire-Rated Glazing Label Requirement",
    description:
      "All fire-rated glazing must bear a permanent label from an approved testing agency indicating fire protection rating.",
    category: "fire_rated_glazing",
    subject: "glazing",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "5.2", notes: "Labels and markings" },
      { source: "IBC_2018", section: "716.2.2", notes: "Glazing marking" },
      { source: "UL_9", section: "1", notes: "Fire test marking" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      },
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "opening.has_glazing == true"
    ],
    explanation_template:
      "Fire-rated glazing must have visible label. Label present: {{hasLabel}}, rating: {{labelRating}} min.",
    remediation: {
      generic_fix:
        "Replace unlabeled glazing with properly labeled fire-rated glass. Etched label must show rating and testing agency.",
      cost_impact_estimate: "high"
    }
  },

  // === ACOUSTIC DOOR REQUIREMENTS ===

  // 49. Acoustic door STC rating requirement
  {
    id: "acoustic_door_stc_rating",
    name: "Acoustic Door STC Rating Requirement",
    description:
      "Doors in sound-rated partitions must achieve the specified STC rating per design requirements.",
    category: "acoustic_ratings",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1207", notes: "Sound transmission" },
      { source: "ASTM_E90", section: "1", notes: "Laboratory measurement of airborne sound transmission" },
      { source: "ASTM_E413", section: "1", notes: "Classification for rating sound insulation" }
    ],
    requirements: {
      rating: {
        stc_rating: 30
      }
    },
    conditions: [
      "opening.required_stc_rating > 0"
    ],
    explanation_template:
      "Required STC rating: {{requiredSTC}}. Installed door STC: {{installedSTC}}. Door must meet partition STC requirement.",
    remediation: {
      generic_fix:
        "Replace door with acoustically rated assembly meeting required STC. Consider solid core, seals, and automatic door bottoms.",
      cost_impact_estimate: "high"
    }
  },

  // 50. Acoustic door perimeter seals
  {
    id: "acoustic_door_perimeter_seals",
    name: "Acoustic Door Perimeter Seal Requirement",
    description:
      "Acoustically rated doors must have continuous perimeter seals at jamb, head, and threshold to achieve rated STC.",
    category: "acoustic_ratings",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "ASTM_E90", section: "1", notes: "Sound transmission testing" },
      { source: "WDMA_IS_7", section: "3", notes: "Sound control for architectural openings" }
    ],
    requirements: {
      rating: {
        stc_rating: 30
      }
    },
    conditions: [
      "opening.required_stc_rating >= 30",
      "opening.is_sound_rated == true"
    ],
    explanation_template:
      "Acoustic door requires perimeter seals. Head seal: {{hasHeadSeal}}, jamb seals: {{hasJambSeals}}, threshold seal: {{hasThreshold}}.",
    remediation: {
      generic_fix:
        "Install continuous neoprene or silicone seals at head and jambs. Add automatic door bottom or threshold with seal.",
      cost_impact_estimate: "medium"
    }
  },

  // 51. Acoustic door bottom seal
  {
    id: "acoustic_door_bottom_seal",
    name: "Acoustic Door Bottom Seal",
    description:
      "Sound-rated doors must have automatic door bottoms or surface-mounted seals to close gap at floor.",
    category: "acoustic_ratings",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "WDMA_IS_7", section: "3.2", notes: "Door bottom sealing" },
      { source: "ASTM_E1408", section: "1", notes: "Laboratory test of door sound transmission" }
    ],
    requirements: {
      rating: {
        stc_rating: 25
      }
    },
    conditions: [
      "opening.required_stc_rating >= 25",
      "hardware.type != 'threshold'"
    ],
    explanation_template:
      "Sound-rated door requires bottom seal. Automatic door bottom: {{hasAutoDoorBottom}}, surface seal: {{hasSurfaceSeal}}.",
    remediation: {
      generic_fix:
        "Install automatic door bottom (mortised or surface-mounted) or raised threshold with compression seal.",
      cost_impact_estimate: "medium"
    }
  },

  // === FIRE HARDWARE TEMPERATURE/LABELED REQUIREMENTS ===

  // 52. Fire door hardware listing requirement
  {
    id: "fire_hardware_listing_required",
    name: "Fire Door Hardware Listing Requirement",
    description:
      "All hardware attached to fire-rated door assemblies must be fire-listed and compatible with the door rating.",
    category: "labeled_hardware",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.1.1", notes: "Hardware listing requirements" },
      { source: "IBC_2018", section: "716.2.6", notes: "Fire door hardware" },
      { source: "UL_10C", section: "1", notes: "Fire door hardware testing" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      },
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "Fire door hardware must be listed for fire service. Hardware: {{hardwareType}}, fire-listed: {{isFireListed}}.",
    remediation: {
      generic_fix:
        "Replace non-listed hardware with fire-listed equivalent. Verify compatibility with door label manufacturer's listing.",
      cost_impact_estimate: "medium"
    }
  },

  // 53. Fire door hinge material and bearing
  {
    id: "fire_door_hinge_requirements",
    name: "Fire Door Hinge Material and Bearing Requirements",
    description:
      "Fire-rated doors require steel hinges with steel pins. Bearing type varies by frequency of use.",
    category: "labeled_hardware",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.4.2", notes: "Hinge requirements" },
      { source: "BHMA_A156_3", section: "3", notes: "Hinge grades and materials" }
    ],
    requirements: {
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "hardware.type == 'hinge'"
    ],
    explanation_template:
      "Fire door hinge must be steel with steel pin. Material: {{hingeMaterial}}, pin: {{pinMaterial}}, bearing: {{bearingType}}.",
    remediation: {
      generic_fix:
        "Replace hinges with full-mortise steel hinges with steel pins. Use ball bearing hinges for high-frequency locations.",
      cost_impact_estimate: "medium"
    }
  },

  // 54. Fire exit hardware UL 305 listing
  {
    id: "fire_exit_hardware_ul305",
    name: "Fire Exit Hardware UL 305 Listing",
    description:
      "Panic hardware on fire doors must be UL 305 listed fire exit hardware, not standard UL 305 panic hardware.",
    category: "labeled_hardware",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_305", section: "1", notes: "Panic hardware fire test" },
      { source: "NFPA_80", section: "6.4.5", notes: "Fire exit hardware" },
      { source: "IBC_2018", section: "1010.1.10", notes: "Panic and fire exit hardware" }
    ],
    requirements: {
      flags: {
        fire_exit_hardware_required: true,
        panic_hardware_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "hardware.type == 'panic_device'"
    ],
    explanation_template:
      "Fire door with panic device requires fire exit hardware (UL 305). Device type: {{deviceType}}, fire exit listing: {{hasFireExitListing}}.",
    remediation: {
      generic_fix:
        "Replace standard panic hardware with UL 305 listed fire exit hardware. Verify label shows 'Fire Exit Hardware' marking.",
      cost_impact_estimate: "high"
    }
  },

  // 55. Fire door closer listing
  {
    id: "fire_door_closer_listing",
    name: "Fire Door Closer Fire Listing",
    description:
      "Door closers on fire doors must be UL listed for fire door service and compatible with door label.",
    category: "labeled_hardware",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.4.4", notes: "Self-closing devices" },
      { source: "UL_10C", section: "1", notes: "Fire door closer testing" }
    ],
    requirements: {
      flags: {
        self_closing_required_for_fire_door: true,
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "hardware.type == 'door_closer'"
    ],
    explanation_template:
      "Fire door closer must be fire-listed. Closer model: {{closerModel}}, fire-listed: {{isFireListed}}.",
    remediation: {
      generic_fix:
        "Replace closer with UL listed fire door closer. Verify proper closing speed and latching operation.",
      cost_impact_estimate: "medium"
    }
  },

  // 56. Fire-rated lock/latch requirements
  {
    id: "fire_rated_lock_listing",
    name: "Fire-Rated Lock/Latch Listing",
    description:
      "Locks and latches on fire doors must be fire-listed and meet minimum 3/4-inch latch throw requirement.",
    category: "labeled_hardware",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.4.3", notes: "Latching hardware" },
      { source: "UL_10C", section: "1", notes: "Lock fire testing" }
    ],
    requirements: {
      flags: {
        latching_required: true,
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "hardware.type in ['lock','latch','mortise_lock']"
    ],
    explanation_template:
      "Fire door lock/latch must be fire-listed with min 3/4-inch throw. Latch throw: {{latchThrow}} in, fire-listed: {{isFireListed}}.",
    remediation: {
      generic_fix:
        "Replace with fire-listed mortise or cylindrical lock with minimum 3/4-inch latch throw. Verify positive latching.",
      cost_impact_estimate: "medium"
    }
  },

  // === SMOKE AND DRAFT CONTROL ===

  // 57. Smoke door S-label requirement
  {
    id: "smoke_door_s_label",
    name: "Smoke Door S-Label Requirement",
    description:
      "Doors in smoke barriers and smoke partitions must bear the S-label indicating smoke resistance per UL 1784.",
    category: "smoke_draft_control",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "716.2.3", notes: "Smoke door assemblies" },
      { source: "UL_1784", section: "1", notes: "Air leakage tests" },
      { source: "NFPA_105", section: "4.3", notes: "Smoke door assemblies" }
    ],
    requirements: {
      rating: {
        smoke_rating: "S"
      }
    },
    conditions: [
      "opening.in_smoke_barrier == true || opening.in_smoke_partition == true"
    ],
    explanation_template:
      "Door in smoke barrier requires S-label. S-label present: {{hasSLabel}}, leakage rate: {{leakageRate}} cfm/sq ft.",
    remediation: {
      generic_fix:
        "Replace door assembly with S-labeled smoke door tested per UL 1784. Maximum 3.0 cfm/sq ft air leakage.",
      cost_impact_estimate: "high"
    }
  },

  // 58. Smoke door meeting stile seal
  {
    id: "smoke_door_pair_seals",
    name: "Smoke Door Pair Meeting Stile Seals",
    description:
      "Pairs of smoke doors require overlapping astragals or rabbeted meeting stiles with smoke seals.",
    category: "smoke_draft_control",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_105", section: "4.3.3", notes: "Door pairs" },
      { source: "UL_1784", section: "1", notes: "Paired door testing" }
    ],
    requirements: {
      rating: {
        smoke_rating: "UL1784"
      }
    },
    conditions: [
      "opening.is_pair == true",
      "opening.in_smoke_barrier == true"
    ],
    explanation_template:
      "Smoke door pair requires sealed meeting stiles. Astragal type: {{astragalType}}, sealed: {{hasSeals}}.",
    remediation: {
      generic_fix:
        "Install smoke-rated overlapping astragal with integral seals, or replace with rabbeted stile configuration with smoke gasketing.",
      cost_impact_estimate: "medium"
    }
  },

  // 59. Smoke door head and jamb seals
  {
    id: "smoke_door_perimeter_seals",
    name: "Smoke Door Perimeter Gaskets",
    description:
      "Smoke-rated doors must have continuous gasketing at head and both jambs to meet UL 1784 leakage requirements.",
    category: "smoke_draft_control",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_1784", section: "6", notes: "Gasket requirements" },
      { source: "NFPA_105", section: "4.3.2", notes: "Door gasketing" }
    ],
    requirements: {
      rating: {
        smoke_rating: "UL1784"
      }
    },
    conditions: [
      "opening.smoke_door_required == true"
    ],
    explanation_template:
      "Smoke door requires continuous perimeter gaskets. Head gasket: {{hasHeadGasket}}, jamb gaskets: {{hasJambGaskets}}.",
    remediation: {
      generic_fix:
        "Install continuous smoke seals at head and both jambs. Use neoprene or silicone compression gaskets.",
      cost_impact_estimate: "low"
    }
  },

  // 60. Draft control damper integration
  {
    id: "smoke_door_bottom_seal",
    name: "Smoke Door Bottom Seal Requirement",
    description:
      "Smoke doors must have bottom seals (automatic door bottom or threshold) to prevent smoke passage at floor.",
    category: "smoke_draft_control",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_1784", section: "6", notes: "Bottom seal testing" },
      { source: "NFPA_105", section: "4.3.2.2", notes: "Door bottom sealing" }
    ],
    requirements: {
      rating: {
        smoke_rating: "UL1784"
      }
    },
    conditions: [
      "opening.smoke_door_required == true"
    ],
    explanation_template:
      "Smoke door requires bottom seal. Auto door bottom: {{hasAutoDoorBottom}}, threshold: {{hasThreshold}}.",
    remediation: {
      generic_fix:
        "Install automatic door bottom with smoke seal, or add raised threshold with compression gasket.",
      cost_impact_estimate: "medium"
    }
  },

  // === INTUMESCENT SEALS AND FIRE STOPS ===

  // 61. Intumescent edge seal requirement
  {
    id: "intumescent_edge_seal",
    name: "Intumescent Edge Seal for Fire Doors",
    description:
      "Fire doors with clearances exceeding code limits may require intumescent seals to maintain rating.",
    category: "intumescent_seals",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.8.4", notes: "Clearances and intumescent seals" },
      { source: "UL_10C", section: "1", notes: "Intumescent seal testing" }
    ],
    requirements: {
      rating: {
        fire_rating_minutes: 20
      },
      dimensions: {
        max_vertical_clearance_in: 0.25
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes >= 20",
      "opening.clearance_exceeds_code == true"
    ],
    explanation_template:
      "Fire door with excess clearance may require intumescent seal. Clearance: {{clearance}} in, seal installed: {{hasSeal}}.",
    remediation: {
      generic_fix:
        "Install intumescent fire seal at door edge or frame stop to address excessive clearance. Verify listing compatibility.",
      cost_impact_estimate: "low"
    }
  },

  // 62. Intumescent hinge filler requirement
  {
    id: "intumescent_hinge_filler",
    name: "Intumescent Hinge Filler Requirement",
    description:
      "Fire doors may require intumescent hinge fillers at hinge cutouts to maintain fire rating.",
    category: "intumescent_seals",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "6.4.2.2", notes: "Hinge intumescent protection" },
      { source: "UL_10C", section: "1", notes: "Hinge area fire protection" }
    ],
    requirements: {
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes >= 60",
      "hardware.type == 'hinge'"
    ],
    explanation_template:
      "Fire door hinge locations may require intumescent fillers. Door rating: {{fireRating}} min, fillers installed: {{hasFillers}}.",
    remediation: {
      generic_fix:
        "Install intumescent hinge fillers between hinge leaves and door/frame surfaces per manufacturer's listing.",
      cost_impact_estimate: "low"
    }
  },

  // 63. Fire stop glazing bead
  {
    id: "fire_stop_glazing_bead",
    name: "Fire-Rated Glazing Bead Requirement",
    description:
      "Fire-rated glazing must use fire-rated glazing beads compatible with the glass and door rating.",
    category: "intumescent_seals",
    subject: "glazing",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.3.3", notes: "Glazing installation" },
      { source: "UL_9", section: "1", notes: "Glazing assembly testing" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "opening.has_glazing == true"
    ],
    explanation_template:
      "Fire-rated glazing requires fire-rated glazing beads. Bead type: {{beadType}}, fire-rated: {{isFireRated}}.",
    remediation: {
      generic_fix:
        "Replace glazing beads with fire-rated steel beads compatible with glazing and door manufacturer's listing.",
      cost_impact_estimate: "low"
    }
  },

  // === FIRE-RATED FRAME REQUIREMENTS ===

  // 64. Fire frame anchor spacing
  {
    id: "fire_frame_anchor_spacing",
    name: "Fire Frame Anchor Spacing",
    description:
      "Fire-rated hollow metal frames require anchors at specified intervals per NFPA 80 and SDI standards.",
    category: "fire_rated_frames",
    subject: "frame",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.6.2", notes: "Frame anchoring" },
      { source: "SDI_117", section: "4", notes: "Frame anchor requirements" }
    ],
    requirements: {
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "frame.type == 'hollow_metal'"
    ],
    explanation_template:
      "Fire frame requires anchors at head, jambs, and floor per SDI 117. Anchor spacing: {{anchorSpacing}} in.",
    remediation: {
      generic_fix:
        "Add anchors at specified intervals (typically 24-30 inches) at jambs, and required locations at head and floor.",
      cost_impact_estimate: "medium"
    }
  },

  // 65. Fire frame grout requirement
  {
    id: "fire_frame_grout",
    name: "Fire Frame Grout Fill Requirement",
    description:
      "Hollow metal frames in fire-rated assemblies typically require grout fill to maintain rating.",
    category: "fire_rated_frames",
    subject: "frame",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "4.6.3", notes: "Frame installation" },
      { source: "SDI_117", section: "5", notes: "Grout requirements" }
    ],
    requirements: {
      rating: {
        fire_rating_minutes: 20
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes >= 20",
      "frame.type == 'hollow_metal'"
    ],
    explanation_template:
      "Fire-rated HM frame typically requires grout fill. Grout installed: {{hasGrout}}, type: {{groutType}}.",
    remediation: {
      generic_fix:
        "Fill frame cavities with fire-rated grout per frame manufacturer's installation instructions and fire listing.",
      cost_impact_estimate: "medium"
    }
  },

  // 66. Fire frame label requirement
  {
    id: "fire_frame_label",
    name: "Fire Frame Label Requirement",
    description:
      "Fire-rated frames must bear a permanent label from an approved testing agency indicating the fire rating.",
    category: "fire_rated_frames",
    subject: "frame",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_80", section: "5.2", notes: "Frame labeling" },
      { source: "IBC_2018", section: "716.2.6.1", notes: "Frame marking" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      },
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0"
    ],
    explanation_template:
      "Fire frame requires permanent label. Label present: {{hasLabel}}, rating: {{frameRating}} min.",
    remediation: {
      generic_fix:
        "Replace unlabeled frame with properly labeled fire-rated frame matching door rating requirements.",
      cost_impact_estimate: "high"
    }
  },

  // === POSITIVE PRESSURE REQUIREMENTS ===

  // 67. Positive pressure test requirement
  {
    id: "positive_pressure_test",
    name: "Positive Pressure Fire Test Requirement",
    description:
      "Fire door assemblies in high-rise buildings and certain other locations must meet UL 10C positive pressure test.",
    category: "positive_pressure",
    subject: "assembly",
    jurisdictions: ["US"],
    code_edition: "IBC_2018",
    code_references: [
      { source: "IBC_2018", section: "716.2.1", notes: "Positive pressure testing" },
      { source: "UL_10C", section: "7", notes: "Positive pressure fire test" },
      { source: "NFPA_252", section: "4", notes: "Hose stream requirements" }
    ],
    requirements: {
      rating: {
        positive_pressure: true
      }
    },
    conditions: [
      "opening.in_high_rise == true",
      "opening.required_fire_rating_minutes >= 20"
    ],
    explanation_template:
      "High-rise fire door requires positive pressure (PP) tested assembly. PP test certification: {{hasPPTest}}.",
    remediation: {
      generic_fix:
        "Replace assembly with UL 10C positive pressure tested fire door. Verify frame and hardware are included in listing.",
      cost_impact_estimate: "high"
    }
  },

  // 68. Stairwell door positive pressure
  {
    id: "stairwell_door_positive_pressure",
    name: "Stairwell Door Positive Pressure Requirement",
    description:
      "Doors protecting stairwells in buildings requiring stair pressurization must withstand positive pressure conditions.",
    category: "positive_pressure",
    subject: "assembly",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "909.20", notes: "Stairway pressurization" },
      { source: "UL_10C", section: "7", notes: "Positive pressure requirements" }
    ],
    requirements: {
      rating: {
        positive_pressure: true
      }
    },
    conditions: [
      "opening.protects_stairwell == true",
      "opening.stair_pressurization_required == true"
    ],
    explanation_template:
      "Stairwell with pressurization requires positive pressure rated door. PP assembly: {{isPPRated}}.",
    remediation: {
      generic_fix:
        "Install positive pressure rated fire door assembly. Coordinate with stair pressurization system design.",
      cost_impact_estimate: "high"
    }
  },

  // ============================================================
  // PHASE 3: ACCESS CONTROL RULES (23 rules)
  // ============================================================

  // === UL 294 ELECTRONIC ACCESS CONTROL ===

  // 69. UL 294 listing requirement
  {
    id: "ul294_access_control_listing",
    name: "UL 294 Access Control System Listing",
    description:
      "Electronic access control systems must be UL 294 listed for the intended application.",
    category: "ul_294_access_control",
    subject: "system",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "1", notes: "Access control system units" },
      { source: "IBC_2018", section: "1010.1.9", notes: "Access-controlled egress doors" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Access control system must be UL 294 listed. System: {{systemName}}, UL 294 listed: {{isUL294Listed}}.",
    remediation: {
      generic_fix:
        "Install UL 294 listed access control system. Verify panel, readers, and electrified hardware are all listed.",
      cost_impact_estimate: "medium"
    }
  },

  // 70. Access control backup power
  {
    id: "access_control_backup_power",
    name: "Access Control Backup Power Requirement",
    description:
      "Access control systems must have backup power to maintain security and egress functions during power failure.",
    category: "ul_294_access_control",
    subject: "system",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.9", notes: "Standby power" },
      { source: "NFPA_72", section: "10.6.5", notes: "Secondary power supply" }
    ],
    requirements: {
      electrical: {
        backup_power_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true",
      "system.is_security_critical == true"
    ],
    explanation_template:
      "Access control requires backup power. Battery backup: {{hasBattery}}, duration: {{backupHours}} hours.",
    remediation: {
      generic_fix:
        "Install UPS or battery backup for access control panel. Provide minimum 4 hours standby for security systems.",
      cost_impact_estimate: "medium"
    }
  },

  // 71. Access control supervision
  {
    id: "access_control_supervision",
    name: "Access Control Circuit Supervision",
    description:
      "Access control circuits must be supervised to detect wiring faults, opens, shorts, and grounds.",
    category: "ul_294_access_control",
    subject: "system",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.5", notes: "Circuit supervision" },
      { source: "NFPA_72", section: "12.6", notes: "Supervision requirements" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Access control circuits must be supervised. Lock circuit: {{lockSupervised}}, REX: {{rexSupervised}}, DPS: {{dpsSupervised}}.",
    remediation: {
      generic_fix:
        "Configure access panel for supervised inputs/outputs. Use end-of-line resistors for zone supervision.",
      cost_impact_estimate: "low"
    }
  },

  // 72. Access control tamper protection
  {
    id: "access_control_tamper",
    name: "Access Control Tamper Protection",
    description:
      "Access control equipment must have tamper protection to detect unauthorized access to enclosures and devices.",
    category: "ul_294_access_control",
    subject: "system",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.4", notes: "Tamper protection" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true",
      "system.security_level >= 'medium'"
    ],
    explanation_template:
      "Access control requires tamper protection. Panel tamper: {{hasPanelTamper}}, reader tamper: {{hasReaderTamper}}.",
    remediation: {
      generic_fix:
        "Install tamper switches on panels, readers, and junction boxes. Wire to supervised zone on access panel.",
      cost_impact_estimate: "low"
    }
  },

  // === CREDENTIAL MANAGEMENT ===

  // 73. Card reader placement height
  {
    id: "card_reader_height_ada",
    name: "Card Reader Mounting Height (ADA)",
    description:
      "Card readers and keypads on accessible routes must be mounted 34-48 inches AFF per ADA requirements.",
    category: "credential_management",
    subject: "access_control",
    jurisdictions: ["US"],
    code_references: [
      { source: "ADA_2010", section: "309", notes: "Operable parts" },
      { source: "ICC_A117_1", section: "309.3", notes: "Height requirements" }
    ],
    requirements: {
      height_aff: { min_in: 34, max_in: 48 }
    },
    conditions: [
      "opening.on_accessible_route == true",
      "hardware.type in ['card_reader','keypad']"
    ],
    explanation_template:
      "Card reader height: {{readerHeight}} in AFF. Required: 34-48 in AFF for accessible routes.",
    remediation: {
      generic_fix:
        "Relocate card reader/keypad to 34-48 inches AFF centerline. Ensure forward or side approach clearance.",
      cost_impact_estimate: "low"
    }
  },

  // 74. Credential reader technology
  {
    id: "credential_reader_encryption",
    name: "Credential Reader Security Requirements",
    description:
      "Access control credentials should use encrypted or secure protocols to prevent cloning and replay attacks.",
    category: "credential_management",
    subject: "access_control",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.3", notes: "Credential security" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true",
      "system.security_level >= 'high'"
    ],
    explanation_template:
      "High-security access requires encrypted credentials. Protocol: {{credentialProtocol}}, encrypted: {{isEncrypted}}.",
    remediation: {
      generic_fix:
        "Upgrade to encrypted credential technology (iCLASS SE, Seos, MIFARE DESFire). Replace legacy proximity readers.",
      cost_impact_estimate: "medium"
    }
  },

  // 75. Keypad code requirements
  {
    id: "keypad_code_security",
    name: "Keypad Code Security Requirements",
    description:
      "Keypads for access control should require minimum 4-digit codes with lockout after failed attempts.",
    category: "credential_management",
    subject: "access_control",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.3.2", notes: "Keypad requirements" }
    ],
    requirements: {
      timing: {
        delay_seconds: { min: 30 }
      }
    },
    conditions: [
      "hardware.type == 'keypad'",
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Keypad requires min 4-digit code with lockout. Code length: {{codeLength}}, lockout: {{hasLockout}}.",
    remediation: {
      generic_fix:
        "Configure keypad for minimum 4-digit codes. Enable lockout after 3-5 failed attempts for 30+ seconds.",
      cost_impact_estimate: "low"
    }
  },

  // === ELECTRIC STRIKES AND LATCH REQUIREMENTS ===

  // 76. Electric strike fire rating
  {
    id: "electric_strike_fire_rated",
    name: "Electric Strike Fire Rating Requirement",
    description:
      "Electric strikes on fire-rated doors must be UL listed for fire door service and match door rating.",
    category: "electric_strikes",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_1034", section: "1", notes: "Burglary-resistant electric locking mechanisms" },
      { source: "UL_10C", section: "1", notes: "Fire door hardware" },
      { source: "NFPA_80", section: "6.4.6", notes: "Electrified hardware on fire doors" }
    ],
    requirements: {
      rating: {
        label_match_required: true
      },
      flags: {
        fire_listed_assembly_required: true
      }
    },
    conditions: [
      "opening.required_fire_rating_minutes > 0",
      "hardware.type == 'electric_strike'"
    ],
    explanation_template:
      "Electric strike on fire door must be fire-rated. Strike model: {{strikeModel}}, fire-listed: {{isFireListed}}.",
    remediation: {
      generic_fix:
        "Replace with fire-rated electric strike listed for the door's fire rating. Verify UL 10C listing.",
      cost_impact_estimate: "medium"
    }
  },

  // 77. Electric strike fail-secure authorization
  {
    id: "electric_strike_fail_secure_approval",
    name: "Electric Strike Fail-Secure Special Approval",
    description:
      "Fail-secure electric strikes on egress doors require AHJ approval and compensating measures.",
    category: "electric_strikes",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.11", notes: "Fail-secure locks" },
      { source: "NFPA_101", section: "7.2.1.5.5", notes: "Electrically controlled hardware" }
    ],
    requirements: {
      electrical: {
        fail_mode: "fail_safe"
      },
      flags: {
        manual_release_required: true
      }
    },
    conditions: [
      "hardware.type == 'electric_strike'",
      "hardware.fail_mode == 'fail_secure'",
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Fail-secure strike on egress requires AHJ approval. Manual override: {{hasManualOverride}}, approved: {{hasAHJApproval}}.",
    remediation: {
      generic_fix:
        "Obtain AHJ approval for fail-secure configuration. Add manual release and battery backup for emergency egress.",
      cost_impact_estimate: "medium"
    }
  },

  // 78. Electric latch retraction panic hardware
  {
    id: "elr_panic_hardware",
    name: "Electric Latch Retraction Panic Hardware",
    description:
      "Panic hardware with electric latch retraction must maintain mechanical egress capability at all times.",
    category: "electric_strikes",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_305", section: "1", notes: "Panic hardware with ELR" },
      { source: "IBC_2018", section: "1010.1.10", notes: "Panic hardware" }
    ],
    requirements: {
      flags: {
        single_motion_to_egress: true,
        panic_hardware_required: true
      }
    },
    conditions: [
      "hardware.type == 'panic_device'",
      "hardware.has_electric_latch_retraction == true"
    ],
    explanation_template:
      "ELR panic device must allow mechanical egress. Manual egress: {{manualEgressWorks}}, ELR function: {{elrFunction}}.",
    remediation: {
      generic_fix:
        "Verify panic bar operates mechanically regardless of power state. Test egress function with power disconnected.",
      cost_impact_estimate: "low"
    }
  },

  // === REX DEVICES AND DOOR MONITORING ===

  // 79. REX sensor coverage
  {
    id: "rex_sensor_coverage",
    name: "REX Sensor Detection Coverage",
    description:
      "Request-to-exit sensors must detect all occupants approaching from the egress side of the door.",
    category: "rex_devices",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.8", notes: "REX requirements" },
      { source: "UL_294", section: "4.6", notes: "REX sensor requirements" }
    ],
    requirements: {
      electrical: {
        sensor_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true",
      "hardware.type in ['rex_sensor','rex_pir']"
    ],
    explanation_template:
      "REX must detect all egress approaches. Coverage zone: {{coverageWidth}} in x {{coverageDepth}} in. Adequate: {{isCoverageAdequate}}.",
    remediation: {
      generic_fix:
        "Adjust REX sensor angle and sensitivity for full coverage. Consider dual-technology sensors for wider coverage.",
      cost_impact_estimate: "low"
    }
  },

  // 80. REX shunt timing
  {
    id: "rex_shunt_timing",
    name: "REX Shunt Timing Requirements",
    description:
      "REX devices must provide adequate shunt time for occupants to exit without triggering door forced alarm.",
    category: "rex_devices",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.6.2", notes: "REX timing" }
    ],
    requirements: {
      timing: {
        hold_time_seconds: 30
      }
    },
    conditions: [
      "opening.has_access_control == true",
      "hardware.type in ['rex_sensor','rex_button']"
    ],
    explanation_template:
      "REX shunt time: {{shuntTime}} sec. Must be adequate for egress (typically 5-30 sec based on traffic).",
    remediation: {
      generic_fix:
        "Adjust REX shunt time in access panel programming. Balance security with occupant egress time.",
      cost_impact_estimate: "low"
    }
  },

  // 81. Door position switch type
  {
    id: "dps_type_requirements",
    name: "Door Position Switch Type Requirements",
    description:
      "DPS must be appropriate for the door type and security level - concealed magnetic for high security.",
    category: "door_monitoring",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.7", notes: "Door position indication" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true"
    ],
    explanation_template:
      "DPS type: {{dpsType}}. High-security requires concealed magnetic. Supervised: {{isSupervised}}.",
    remediation: {
      generic_fix:
        "Install concealed magnetic DPS for high-security applications. Use balanced magnetic type for highest security.",
      cost_impact_estimate: "low"
    }
  },

  // 82. Door held-open monitoring
  {
    id: "door_held_open_alarm",
    name: "Door Held-Open Alarm Requirement",
    description:
      "Access-controlled doors should generate held-open alarms after configurable time to prevent propped doors.",
    category: "door_monitoring",
    subject: "system",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.7.2", notes: "Door held-open monitoring" }
    ],
    requirements: {
      timing: {
        hold_time_seconds: 30
      },
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Door held-open alarm configured: {{hasHeldOpenAlarm}}. Time before alarm: {{heldOpenTime}} sec.",
    remediation: {
      generic_fix:
        "Enable door held-open monitoring in access panel. Set appropriate time threshold (typically 30-60 seconds).",
      cost_impact_estimate: "low"
    }
  },

  // 83. Door forced alarm
  {
    id: "door_forced_alarm",
    name: "Door Forced Alarm Requirement",
    description:
      "Access control systems must generate forced-open alarms when door opens without valid REX or access credential.",
    category: "door_monitoring",
    subject: "system",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.7.3", notes: "Door forced detection" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      }
    },
    conditions: [
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Door forced alarm enabled: {{hasForcedAlarm}}. DPS supervised: {{dpsSupervised}}.",
    remediation: {
      generic_fix:
        "Enable door forced monitoring in access panel. Ensure DPS is supervised and wired correctly.",
      cost_impact_estimate: "low"
    }
  },

  // === FAIL MODE REQUIREMENTS ===

  // 84. Fail-safe requirement by occupancy
  {
    id: "fail_safe_assembly_occupancy",
    name: "Fail-Safe Requirement for Assembly Occupancy",
    description:
      "Electrified hardware in Assembly occupancies must be fail-safe to ensure emergency egress.",
    category: "fail_mode_requirements",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010.1.9", notes: "Special locking arrangements" },
      { source: "NFPA_101", section: "7.2.1.5.5", notes: "Electrically controlled hardware" }
    ],
    requirements: {
      electrical: {
        fail_mode: "fail_safe",
        fire_alarm_release_required: true
      }
    },
    conditions: [
      "opening.occupancy_group == 'A'",
      "hardware.is_electrified == true"
    ],
    explanation_template:
      "Assembly occupancy requires fail-safe electrified hardware. Fail mode: {{failMode}}.",
    remediation: {
      generic_fix:
        "Configure or replace electrified hardware for fail-safe operation. Connect to fire alarm for release.",
      cost_impact_estimate: "medium"
    }
  },

  // 85. Healthcare occupancy fail mode
  {
    id: "fail_mode_healthcare",
    name: "Healthcare Occupancy Electrified Hardware",
    description:
      "Healthcare (I) occupancies may use fail-secure in certain locations with approved clinical protocols.",
    category: "fail_mode_requirements",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.7", notes: "Controlled egress in I occupancies" },
      { source: "NFPA_101", section: "7.2.1.6", notes: "Special locking arrangements" }
    ],
    requirements: {
      electrical: {
        fire_alarm_release_required: true,
        supervision_required: true
      },
      flags: {
        manual_release_required: true
      }
    },
    conditions: [
      "opening.occupancy_group == 'I'",
      "hardware.is_electrified == true"
    ],
    explanation_template:
      "Healthcare occupancy electrified hardware. Fail mode: {{failMode}}, clinical protocol: {{hasProtocol}}.",
    remediation: {
      generic_fix:
        "Verify fail mode is appropriate for location. Ensure fire alarm release and staff override capability.",
      cost_impact_estimate: "medium"
    }
  },

  // 86. Detention occupancy special locking
  {
    id: "fail_mode_detention",
    name: "Detention Occupancy Electrified Hardware",
    description:
      "Detention (I-3) occupancies have special locking arrangements with staff release and emergency unlock.",
    category: "fail_mode_requirements",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_101", section: "22.2.11", notes: "Detention special locking" },
      { source: "IBC_2018", section: "408", notes: "Detention facilities" }
    ],
    requirements: {
      electrical: {
        supervision_required: true
      },
      flags: {
        manual_release_required: true
      }
    },
    conditions: [
      "opening.occupancy_group == 'I-3'",
      "hardware.is_electrified == true"
    ],
    explanation_template:
      "Detention occupancy special locking. Staff release: {{hasStaffRelease}}, emergency unlock: {{hasEmergencyUnlock}}.",
    remediation: {
      generic_fix:
        "Verify locking arrangement meets I-3 requirements. Provide staff release and central emergency unlock capability.",
      cost_impact_estimate: "high"
    }
  },

  // === FIRE ALARM INTERFACE ===

  // 87. Fire alarm shunt timing
  {
    id: "fire_alarm_shunt_timing",
    name: "Fire Alarm Door Release Timing",
    description:
      "Electrified hardware must release within code-required time after fire alarm signal (typically instantaneous).",
    category: "fire_alarm_interface",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_72", section: "21.9", notes: "Door release timing" },
      { source: "IBC_2018", section: "1010.1.9.10", notes: "Fire alarm connection" }
    ],
    requirements: {
      electrical: {
        fire_alarm_release_required: true
      },
      timing: {
        delay_seconds: { max: 1 }
      }
    },
    conditions: [
      "hardware.is_electrified == true",
      "hardware.connected_to_fire_alarm == true"
    ],
    explanation_template:
      "Fire alarm release timing: {{releaseTime}} sec. Must be near-instantaneous upon FA signal.",
    remediation: {
      generic_fix:
        "Configure immediate release on fire alarm. Eliminate delays in relay or access panel programming.",
      cost_impact_estimate: "low"
    }
  },

  // 88. Fire alarm release relay type
  {
    id: "fire_alarm_relay_supervised",
    name: "Fire Alarm Release Relay Supervision",
    description:
      "Fire alarm release relays for electrified hardware must be supervised for wiring faults.",
    category: "fire_alarm_interface",
    subject: "system",
    jurisdictions: ["US"],
    code_references: [
      { source: "NFPA_72", section: "21.2.4", notes: "Notification appliance supervision" },
      { source: "IBC_2018", section: "907.6", notes: "Fire alarm installation" }
    ],
    requirements: {
      electrical: {
        supervision_required: true,
        fire_alarm_release_required: true
      }
    },
    conditions: [
      "hardware.is_electrified == true",
      "hardware.connected_to_fire_alarm == true"
    ],
    explanation_template:
      "Fire alarm release circuit supervised: {{isSupervised}}. Relay type: {{relayType}}.",
    remediation: {
      generic_fix:
        "Use supervised relay module for fire alarm door release. Wire per NFPA 72 requirements.",
      cost_impact_estimate: "low"
    }
  },

  // === EMERGENCY OVERRIDE ===

  // 89. Emergency override pushbutton
  {
    id: "emergency_override_button",
    name: "Emergency Override Push Button",
    description:
      "Access-controlled egress doors must have emergency release pushbutton or bar for single-motion egress.",
    category: "emergency_override",
    subject: "electrified",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.8", notes: "Sensor release" },
      { source: "NFPA_101", section: "7.2.1.5.5", notes: "Manual release" }
    ],
    requirements: {
      flags: {
        manual_release_required: true,
        single_motion_to_egress: true
      }
    },
    conditions: [
      "opening.has_access_control == true",
      "opening.is_means_of_egress_door == true"
    ],
    explanation_template:
      "Emergency override for egress. Push bar/button: {{hasEmergencyRelease}}, location: {{releaseLocation}}.",
    remediation: {
      generic_fix:
        "Install manual emergency release button near door on egress side. Label clearly as PUSH TO EXIT.",
      cost_impact_estimate: "low"
    }
  },

  // 90. Emergency release signage
  {
    id: "emergency_release_signage",
    name: "Emergency Release Signage Requirement",
    description:
      "Manual emergency release devices must have signage instructing occupants on operation.",
    category: "emergency_override",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.9", notes: "Signage requirements" },
      { source: "NFPA_101", section: "7.2.1.5.5.2", notes: "Signage" }
    ],
    requirements: {
      flags: {
        signage_required: true
      }
    },
    conditions: [
      "hardware.type == 'emergency_release_button'",
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Emergency release requires signage. Sign present: {{hasSign}}, text: {{signText}}.",
    remediation: {
      generic_fix:
        "Install sign reading 'PUSH TO EXIT' or similar instruction adjacent to release device.",
      cost_impact_estimate: "low"
    }
  },

  // 91. Break glass emergency release
  {
    id: "break_glass_release",
    name: "Break Glass Emergency Release Requirements",
    description:
      "Break glass emergency releases, where permitted, must be clearly labeled and accessible.",
    category: "emergency_override",
    subject: "hardware",
    jurisdictions: ["US"],
    code_references: [
      { source: "IBC_2018", section: "1010.1.9.9", notes: "Manual release" }
    ],
    requirements: {
      height_aff: { min_in: 40, max_in: 48 },
      flags: {
        signage_required: true,
        manual_release_required: true
      }
    },
    conditions: [
      "hardware.type == 'break_glass'",
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Break glass release height: {{height}} in AFF. Clearly labeled: {{hasLabel}}.",
    remediation: {
      generic_fix:
        "Mount break glass device 40-48 in AFF. Label with 'EMERGENCY EXIT - BREAK GLASS' signage.",
      cost_impact_estimate: "low"
    }
  },

  // === VIDEO INTERCOM ===

  // 92. Video intercom integration
  {
    id: "video_intercom_integration",
    name: "Video Intercom Access Control Integration",
    description:
      "Video intercom systems should integrate with access control for visitor management and remote door release.",
    category: "video_intercom",
    subject: "surveillance",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.8", notes: "System integration" }
    ],
    requirements: {
      electrical: {
        backup_power_required: true
      }
    },
    conditions: [
      "opening.has_video_intercom == true",
      "opening.has_access_control == true"
    ],
    explanation_template:
      "Video intercom integration. Remote release capability: {{hasRemoteRelease}}, logging: {{hasLogging}}.",
    remediation: {
      generic_fix:
        "Integrate video intercom with access control for remote door release and visitor event logging.",
      cost_impact_estimate: "medium"
    }
  },

  // 93. Video intercom camera placement
  {
    id: "video_intercom_camera",
    name: "Video Intercom Camera Placement",
    description:
      "Video intercom cameras must provide clear view of visitors for identification before granting access.",
    category: "video_intercom",
    subject: "surveillance",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.8.2", notes: "Video verification" }
    ],
    requirements: {
      height_aff: { min_in: 48, max_in: 60 }
    },
    conditions: [
      "opening.has_video_intercom == true"
    ],
    explanation_template:
      "Video intercom camera height: {{cameraHeight}} in AFF. Field of view covers entry: {{coverageAdequate}}.",
    remediation: {
      generic_fix:
        "Mount camera at 48-60 in AFF facing outward. Adjust angle to capture full face of visitors.",
      cost_impact_estimate: "low"
    }
  },

  // 94. Video intercom ADA compliance
  {
    id: "video_intercom_ada",
    name: "Video Intercom ADA Accessibility",
    description:
      "Video intercom stations on accessible routes must meet reach range and operability requirements.",
    category: "video_intercom",
    subject: "access_control",
    jurisdictions: ["US"],
    code_references: [
      { source: "ADA_2010", section: "309", notes: "Operable parts" },
      { source: "ICC_A117_1", section: "309", notes: "Reach and operability" }
    ],
    requirements: {
      height_aff: { min_in: 34, max_in: 48 },
      flags: {
        one_hand_operation: true,
        no_tight_grasp_pinch_twist: true
      }
    },
    conditions: [
      "opening.on_accessible_route == true",
      "hardware.type == 'video_intercom'"
    ],
    explanation_template:
      "Video intercom controls height: {{controlHeight}} in AFF. One-hand operable: {{oneHandOperable}}.",
    remediation: {
      generic_fix:
        "Mount intercom controls at 34-48 in AFF. Use push buttons, not rotary controls.",
      cost_impact_estimate: "low"
    }
  },

  // 95. Intercom backup power
  {
    id: "video_intercom_backup_power",
    name: "Video Intercom Backup Power",
    description:
      "Entry video intercoms should have backup power to maintain visitor verification during outages.",
    category: "video_intercom",
    subject: "system",
    jurisdictions: ["US"],
    code_references: [
      { source: "UL_294", section: "4.9", notes: "Standby power" }
    ],
    requirements: {
      electrical: {
        backup_power_required: true
      }
    },
    conditions: [
      "opening.has_video_intercom == true",
      "opening.is_main_entry == true"
    ],
    explanation_template:
      "Main entry intercom backup power: {{hasBackupPower}}. Duration: {{backupHours}} hours.",
    remediation: {
      generic_fix:
        "Connect video intercom to UPS or backup battery system. Provide minimum 4 hours standby.",
      cost_impact_estimate: "medium"
    }
  }
];

// ====== Helper Functions ======

export function getRulesByCategory(category: RuleCategory): DoorHardwareRule[] {
  return doorHardwareRules.filter((r) => r.category === category);
}

export function getRulesBySubject(subject: RuleSubject): DoorHardwareRule[] {
  return doorHardwareRules.filter((r) => r.subject === subject);
}

export function getRulesForJurisdiction(juris: string): DoorHardwareRule[] {
  return doorHardwareRules.filter(
    (r) =>
      r.jurisdictions.includes(juris) ||
      (juris.startsWith("US-") && r.jurisdictions.includes("US"))
  );
}

export function findRuleById(id: string): DoorHardwareRule | undefined {
  return doorHardwareRules.find((r) => r.id === id);
}

export function getEffectiveRulesForJurisdiction(juris: string): DoorHardwareRule[] {
  const rules = getRulesForJurisdiction(juris);
  const resultMap = new Map<string, DoorHardwareRule>();

  for (const rule of rules) {
    if (rule.override_of) {
      resultMap.set(rule.override_of, rule);
    } else {
      if (!resultMap.has(rule.id)) {
        resultMap.set(rule.id, rule);
      }
    }
  }

  return Array.from(resultMap.values());
}

export function getAllRules(): DoorHardwareRule[] {
  return doorHardwareRules;
}

export function getRuleCategories(): RuleCategory[] {
  return [
    "operable_parts_egress",
    "accessibility_reach_operability",
    "fire_door_assembly",
    "vision_communication",
    "automatic_operators",
    "thresholds_clearances",
    "hinges_pivots_misc",
    "access_control",
    "special_locking_arrangements",
    "signage",
    "door_leaf_construction",
    "frame_construction",
    "glazing_safety_fire",
    "gasketing_smoke_seals",
    "closers_operators",
    "exit_devices",
    "coordinators_astragals",
    "specialty_doors",
    "fire_rated_glazing",
    "acoustic_ratings",
    "fire_hardware_ratings",
    "labeled_hardware",
    "intumescent_seals",
    "fire_rated_frames",
    "smoke_draft_control",
    "positive_pressure",
    "electrified_hardware",
    "delayed_egress",
    "controlled_egress",
    "maglocks",
    "fire_alarm_interface",
    "video_surveillance",
    "intrusion_detection",
    "area_of_refuge",
    "ul_294_access_control",
    "credential_management",
    "electric_strikes",
    "rex_devices",
    "door_monitoring",
    "fail_mode_requirements",
    "emergency_override",
    "video_intercom"
  ];
}

export function getCodeSources(): CodeSource[] {
  return [
    "ADA_2010",
    "IBC_2015",
    "IBC_2018",
    "IBC_2021",
    "IFC_2018",
    "IFC_2021",
    "NFPA_80",
    "NFPA_101",
    "NFPA_72",
    "NFPA_105",
    "NFPA_252",
    "ICC_A117_1",
    "BHMA_A156_3",
    "BHMA_A156_4",
    "BHMA_A156_10",
    "BHMA_A156_19",
    "BHMA_A156_25",
    "BHMA_A156",
    "UL_10B",
    "UL_10C",
    "UL_9",
    "UL_294",
    "UL_305",
    "UL_1034",
    "UL_1784",
    "UL_263",
    "UL_555",
    "SDI_100",
    "SDI_117",
    "ANSI_A250_8",
    "ASTM_E90",
    "ASTM_E413",
    "ASTM_E1408",
    "ASTM_E2074",
    "WDMA_IS_7"
  ];
}

export function getRuleSubjects(): RuleSubject[] {
  return [
    "hardware",
    "leaf",
    "frame",
    "glazing",
    "assembly",
    "electrified",
    "access_control",
    "surveillance",
    "system"
  ];
}

// ====== Validation Result Type ======

export interface HardwareValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: "FAIL" | "WARN" | "INFO";
  message: string;
  codeReferences: CodeReference[];
  measuredValue?: number;
  requiredRange?: { min?: number; max?: number };
  remediation?: string;
  costImpact?: "low" | "medium" | "high";
  confidence?: number;
}

// ====== Template Helper ======

export function fillTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (_, key) => {
    const v = values[key];
    return v !== undefined && v !== null ? String(v) : "";
  });
}

// ====== Validation Functions ======

export function validateHardwareHeight(
  hardwareHeightIn: number,
  jurisdiction: string,
  hardwareType: string,
  isAccessibleRoute: boolean,
  isMeansOfEgress: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];
  const applicableRules = getEffectiveRulesForJurisdiction(jurisdiction);

  for (const rule of applicableRules) {
    if (!rule.requirements.height_aff) continue;

    let applies = false;

    if (rule.id === "hardware_height_general_operable_egress") {
      applies = isAccessibleRoute && ["latch", "lever", "pull", "lockset"].includes(hardwareType);
    } else if (rule.id === "panic_device_height") {
      applies = isMeansOfEgress && ["panic_device", "fire_exit_device"].includes(hardwareType);
    } else if (rule.id === "egress_hardware_height_ca_cap") {
      applies = jurisdiction === "US-CA" && isMeansOfEgress;
    } else if (rule.id === "door_viewer_height_accessible") {
      applies = isAccessibleRoute && hardwareType === "door_viewer";
    } else if (rule.id === "auto_operator_actuator_plate_height") {
      applies = hardwareType === "auto_operator_actuator_plate";
    } else if (rule.id === "closer_overhead_mounting_height") {
      applies = ["door_closer", "overhead_stop"].includes(hardwareType);
    } else if (rule.id === "maglock_manual_release") {
      applies = hardwareType === "maglock_release";
    }

    if (!applies) continue;

    const { min_in, max_in } = rule.requirements.height_aff;
    let passed = true;
    let message = "";

    if (min_in !== undefined && hardwareHeightIn < min_in) {
      passed = false;
      message = fillTemplate(rule.explanation_template || "", { measuredHeight: hardwareHeightIn }) ||
        `${rule.name}: Hardware at ${hardwareHeightIn}" is below minimum ${min_in}"`;
    } else if (max_in !== undefined && hardwareHeightIn > max_in) {
      passed = false;
      message = fillTemplate(rule.explanation_template || "", { measuredHeight: hardwareHeightIn }) ||
        `${rule.name}: Hardware at ${hardwareHeightIn}" exceeds maximum ${max_in}"`;
    } else {
      message = `${rule.name}: Hardware height ${hardwareHeightIn}" complies with ${min_in || 0}"–${max_in || "∞"}" range`;
    }

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      severity: passed ? "INFO" : "FAIL",
      message,
      codeReferences: rule.code_references,
      measuredValue: hardwareHeightIn,
      requiredRange: { min: min_in, max: max_in },
      remediation: passed ? undefined : rule.remediation?.generic_fix,
      costImpact: rule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

export function validateFireDoorClearances(
  sideClearanceIn: number,
  bottomClearanceIn: number,
  fireRatingMinutes: number
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (fireRatingMinutes <= 0) return results;

  const rule = findRuleById("fire_door_clearances");
  if (!rule || !rule.requirements.dimensions) return results;

  const { max_vertical_clearance_in, max_bottom_clearance_in } = rule.requirements.dimensions;

  if (max_vertical_clearance_in !== undefined) {
    const sidePassed = sideClearanceIn <= max_vertical_clearance_in;
    results.push({
      ruleId: rule.id,
      ruleName: `${rule.name} (Side/Top)`,
      passed: sidePassed,
      severity: sidePassed ? "INFO" : "FAIL",
      message: sidePassed
        ? `Side clearance ${sideClearanceIn}" within ${max_vertical_clearance_in}" max`
        : `Side clearance ${sideClearanceIn}" exceeds ${max_vertical_clearance_in}" max per NFPA 80`,
      codeReferences: rule.code_references,
      measuredValue: sideClearanceIn,
      requiredRange: { max: max_vertical_clearance_in },
      remediation: sidePassed ? undefined : rule.remediation?.generic_fix,
      costImpact: rule.remediation?.cost_impact_estimate,
      confidence: 0.85
    });
  }

  if (max_bottom_clearance_in !== undefined) {
    const bottomPassed = bottomClearanceIn <= max_bottom_clearance_in;
    results.push({
      ruleId: rule.id,
      ruleName: `${rule.name} (Bottom)`,
      passed: bottomPassed,
      severity: bottomPassed ? "INFO" : "FAIL",
      message: bottomPassed
        ? `Bottom clearance ${bottomClearanceIn}" within ${max_bottom_clearance_in}" max`
        : `Bottom clearance ${bottomClearanceIn}" exceeds ${max_bottom_clearance_in}" max per NFPA 80`,
      codeReferences: rule.code_references,
      measuredValue: bottomClearanceIn,
      requiredRange: { max: max_bottom_clearance_in },
      remediation: bottomPassed ? undefined : rule.remediation?.generic_fix,
      costImpact: rule.remediation?.cost_impact_estimate,
      confidence: 0.85
    });
  }

  return results;
}

export function validateThreshold(
  thresholdHeightIn: number,
  isAccessibleRoute: boolean
): HardwareValidationResult | null {
  if (!isAccessibleRoute) return null;

  const rule = findRuleById("threshold_height_accessible");
  if (!rule || !rule.requirements.dimensions?.threshold_max_height_in) return null;

  const maxHeight = rule.requirements.dimensions.threshold_max_height_in;
  const passed = thresholdHeightIn <= maxHeight;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed,
    severity: passed ? "INFO" : "FAIL",
    message: passed
      ? `Threshold height ${thresholdHeightIn}" within ${maxHeight}" max per ADA`
      : fillTemplate(rule.explanation_template || "", { thresholdHeight: thresholdHeightIn }),
    codeReferences: rule.code_references,
    measuredValue: thresholdHeightIn,
    requiredRange: { max: maxHeight },
    remediation: passed ? undefined : rule.remediation?.generic_fix,
    costImpact: rule.remediation?.cost_impact_estimate,
    confidence: 0.9
  };
}

export function getFireDoorRequiredFlags(fireRatingMinutes: number): {
  fire_listed_assembly_required: boolean;
  self_closing_required: boolean;
} {
  if (fireRatingMinutes <= 0) {
    return { fire_listed_assembly_required: false, self_closing_required: false };
  }

  const rule = findRuleById("fire_door_listed_assembly");
  return {
    fire_listed_assembly_required: rule?.requirements.flags?.fire_listed_assembly_required || false,
    self_closing_required: rule?.requirements.flags?.self_closing_required_for_fire_door || false
  };
}

export function getRequiredHingeCount(doorHeightIn: number): number {
  if (doorHeightIn <= 60) return 2;
  return 2 + Math.ceil((doorHeightIn - 60) / 30);
}

export function getMinHingeCount(doorHeightIn: number, _fireRatingMinutes?: number): number {
  return getRequiredHingeCount(doorHeightIn);
}

export function validateHingeCount(
  actualHingeCount: number,
  doorHeightIn: number,
  fireRatingMinutes: number
): HardwareValidationResult | null {
  if (fireRatingMinutes <= 0) return null;

  const rule = findRuleById("fire_door_hinge_count_spacing");
  if (!rule) return null;

  const required = getRequiredHingeCount(doorHeightIn);
  const passed = actualHingeCount >= required;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed,
    severity: passed ? "INFO" : "FAIL",
    message: passed
      ? `Hinge count ${actualHingeCount} meets minimum ${required} for ${doorHeightIn}" door`
      : fillTemplate(rule.explanation_template || "", { doorHeight: doorHeightIn, requiredHinges: required }),
    codeReferences: rule.code_references,
    measuredValue: actualHingeCount,
    requiredRange: { min: required },
    remediation: passed ? undefined : rule.remediation?.generic_fix,
    costImpact: rule.remediation?.cost_impact_estimate,
    confidence: 0.95
  };
}

export function validateFireDoorCloser(
  hasCloser: boolean,
  fireRatingMinutes: number
): HardwareValidationResult | null {
  if (fireRatingMinutes <= 0) return null;

  const rule = findRuleById("fire_door_self_closing");
  if (!rule) return null;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: hasCloser,
    severity: hasCloser ? "INFO" : "FAIL",
    message: hasCloser
      ? `Fire door has required self-closing device`
      : fillTemplate(rule.explanation_template || "", { requiredRating: fireRatingMinutes }),
    codeReferences: rule.code_references,
    remediation: hasCloser ? undefined : rule.remediation?.generic_fix,
    costImpact: rule.remediation?.cost_impact_estimate,
    confidence: 0.95
  };
}

// ====== NEW Phase 1 Validation Functions ======

export function validateDelayedEgress(
  delaySeconds: number,
  hasFireAlarmInterface: boolean,
  hasSignage: boolean,
  failMode: "fail_safe" | "fail_secure"
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // Check timing
  const timingRule = findRuleById("delayed_egress_timing");
  if (timingRule) {
    const maxDelay = timingRule.requirements.timing?.delay_seconds?.max || 15;
    const timingPassed = delaySeconds <= maxDelay;
    results.push({
      ruleId: timingRule.id,
      ruleName: timingRule.name,
      passed: timingPassed,
      severity: timingPassed ? "INFO" : "FAIL",
      message: timingPassed
        ? `Delayed egress delay ${delaySeconds}s within ${maxDelay}s maximum`
        : `Delayed egress delay ${delaySeconds}s exceeds ${maxDelay}s maximum`,
      codeReferences: timingRule.code_references,
      measuredValue: delaySeconds,
      requiredRange: { max: maxDelay },
      remediation: timingPassed ? undefined : timingRule.remediation?.generic_fix,
      costImpact: timingRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Check signage
  const signageRule = findRuleById("delayed_egress_signage");
  if (signageRule) {
    results.push({
      ruleId: signageRule.id,
      ruleName: signageRule.name,
      passed: hasSignage,
      severity: hasSignage ? "INFO" : "FAIL",
      message: hasSignage
        ? `Required delayed egress signage is present`
        : `Missing required 'PUSH UNTIL ALARM SOUNDS' signage`,
      codeReferences: signageRule.code_references,
      remediation: hasSignage ? undefined : signageRule.remediation?.generic_fix,
      costImpact: signageRule.remediation?.cost_impact_estimate,
      confidence: 0.95
    });
  }

  // Check fire alarm interface
  const faRule = findRuleById("delayed_egress_fire_alarm_release");
  if (faRule) {
    const faAndFailSafe = hasFireAlarmInterface && failMode === "fail_safe";
    results.push({
      ruleId: faRule.id,
      ruleName: faRule.name,
      passed: faAndFailSafe,
      severity: faAndFailSafe ? "INFO" : "FAIL",
      message: faAndFailSafe
        ? `Fire alarm interface and fail-safe mode configured correctly`
        : `Missing fire alarm interface or not configured for fail-safe operation`,
      codeReferences: faRule.code_references,
      remediation: faAndFailSafe ? undefined : faRule.remediation?.generic_fix,
      costImpact: faRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

export function validateMaglock(
  hasSensor: boolean,
  hasManualRelease: boolean,
  hasFireAlarmInterface: boolean,
  failMode: "fail_safe" | "fail_secure",
  releaseHeightIn?: number
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // Check sensor requirements
  const sensorRule = findRuleById("maglock_sensor_requirements");
  if (sensorRule) {
    const sensorPassed = hasSensor || hasManualRelease;
    results.push({
      ruleId: sensorRule.id,
      ruleName: sensorRule.name,
      passed: sensorPassed,
      severity: sensorPassed ? "INFO" : "FAIL",
      message: sensorPassed
        ? `Maglock has required sensor or manual release`
        : `Maglock missing required motion sensor and/or manual release`,
      codeReferences: sensorRule.code_references,
      remediation: sensorPassed ? undefined : sensorRule.remediation?.generic_fix,
      costImpact: sensorRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Check manual release
  const releaseRule = findRuleById("maglock_manual_release");
  if (releaseRule && releaseHeightIn !== undefined) {
    const minH = releaseRule.requirements.height_aff?.min_in || 40;
    const maxH = releaseRule.requirements.height_aff?.max_in || 48;
    const heightPassed = releaseHeightIn >= minH && releaseHeightIn <= maxH;
    results.push({
      ruleId: releaseRule.id,
      ruleName: releaseRule.name,
      passed: hasManualRelease && heightPassed,
      severity: hasManualRelease && heightPassed ? "INFO" : "FAIL",
      message: hasManualRelease && heightPassed
        ? `Manual release at ${releaseHeightIn}" within ${minH}–${maxH}" range`
        : `Manual release missing or at incorrect height (${releaseHeightIn}")`,
      codeReferences: releaseRule.code_references,
      measuredValue: releaseHeightIn,
      requiredRange: { min: minH, max: maxH },
      remediation: hasManualRelease && heightPassed ? undefined : releaseRule.remediation?.generic_fix,
      costImpact: releaseRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Check fire alarm interface
  const faRule = findRuleById("maglock_fire_alarm_release");
  if (faRule) {
    const faAndFailSafe = hasFireAlarmInterface && failMode === "fail_safe";
    results.push({
      ruleId: faRule.id,
      ruleName: faRule.name,
      passed: faAndFailSafe,
      severity: faAndFailSafe ? "INFO" : "FAIL",
      message: faAndFailSafe
        ? `Maglock fire alarm interface and fail-safe mode configured`
        : `Maglock not connected to fire alarm or not fail-safe`,
      codeReferences: faRule.code_references,
      remediation: faAndFailSafe ? undefined : faRule.remediation?.generic_fix,
      costImpact: faRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

export function validateAutoOperator(
  hasSensors: boolean,
  hasBreakout: boolean,
  breakoutForceLbf: number,
  sweepTimeSeconds: number
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // Safety sensors
  const sensorRule = findRuleById("auto_operator_safety_sensors");
  if (sensorRule) {
    results.push({
      ruleId: sensorRule.id,
      ruleName: sensorRule.name,
      passed: hasSensors,
      severity: hasSensors ? "INFO" : "FAIL",
      message: hasSensors
        ? `Automatic operator has required safety sensors`
        : `Missing entrapment protection sensors per BHMA A156.19`,
      codeReferences: sensorRule.code_references,
      remediation: hasSensors ? undefined : sensorRule.remediation?.generic_fix,
      costImpact: sensorRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Manual breakout
  const breakoutRule = findRuleById("auto_operator_manual_breakout");
  if (breakoutRule) {
    const maxForce = breakoutRule.requirements.timing?.closing_force_lbf?.max || 30;
    const breakoutPassed = hasBreakout && breakoutForceLbf <= maxForce;
    results.push({
      ruleId: breakoutRule.id,
      ruleName: breakoutRule.name,
      passed: breakoutPassed,
      severity: breakoutPassed ? "INFO" : "FAIL",
      message: breakoutPassed
        ? `Manual breakout at ${breakoutForceLbf} lbf within ${maxForce} lbf limit`
        : `Breakout force ${breakoutForceLbf} lbf exceeds ${maxForce} lbf maximum or breakout unavailable`,
      codeReferences: breakoutRule.code_references,
      measuredValue: breakoutForceLbf,
      requiredRange: { max: maxForce },
      remediation: breakoutPassed ? undefined : breakoutRule.remediation?.generic_fix,
      costImpact: breakoutRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Closing speed
  const speedRule = findRuleById("auto_operator_closing_speed");
  if (speedRule) {
    const minSweep = speedRule.requirements.timing?.sweep_time_seconds?.min || 3;
    const speedPassed = sweepTimeSeconds >= minSweep;
    results.push({
      ruleId: speedRule.id,
      ruleName: speedRule.name,
      passed: speedPassed,
      severity: speedPassed ? "INFO" : "FAIL",
      message: speedPassed
        ? `Closing speed ${sweepTimeSeconds}s meets ${minSweep}s minimum`
        : `Closing speed ${sweepTimeSeconds}s faster than ${minSweep}s minimum`,
      codeReferences: speedRule.code_references,
      measuredValue: sweepTimeSeconds,
      requiredRange: { min: minSweep },
      remediation: speedPassed ? undefined : speedRule.remediation?.generic_fix,
      costImpact: speedRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

export function validateDoorCloser(
  openingForceLbf: number,
  sweepTimeSeconds: number,
  isAccessibleRoute: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (!isAccessibleRoute) return results;

  // Opening force
  const forceRule = findRuleById("door_closer_opening_force");
  if (forceRule) {
    const maxForce = forceRule.requirements.timing?.closing_force_lbf?.max || 5;
    const forcePassed = openingForceLbf <= maxForce;
    results.push({
      ruleId: forceRule.id,
      ruleName: forceRule.name,
      passed: forcePassed,
      severity: forcePassed ? "INFO" : "FAIL",
      message: forcePassed
        ? `Opening force ${openingForceLbf} lbf within ${maxForce} lbf maximum`
        : `Opening force ${openingForceLbf} lbf exceeds ${maxForce} lbf maximum per ADA`,
      codeReferences: forceRule.code_references,
      measuredValue: openingForceLbf,
      requiredRange: { max: maxForce },
      remediation: forcePassed ? undefined : forceRule.remediation?.generic_fix,
      costImpact: forceRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Sweep time
  const sweepRule = findRuleById("door_closer_sweep_time");
  if (sweepRule) {
    const minSweep = sweepRule.requirements.timing?.sweep_time_seconds?.min || 5;
    const sweepPassed = sweepTimeSeconds >= minSweep;
    results.push({
      ruleId: sweepRule.id,
      ruleName: sweepRule.name,
      passed: sweepPassed,
      severity: sweepPassed ? "INFO" : "FAIL",
      message: sweepPassed
        ? `Sweep time ${sweepTimeSeconds}s meets ${minSweep}s minimum`
        : `Sweep time ${sweepTimeSeconds}s faster than ${minSweep}s minimum`,
      codeReferences: sweepRule.code_references,
      measuredValue: sweepTimeSeconds,
      requiredRange: { min: minSweep },
      remediation: sweepPassed ? undefined : sweepRule.remediation?.generic_fix,
      costImpact: sweepRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

export function validatePanicHardware(
  occupancyGroup: string,
  occupantLoad: number,
  hasPanicHardware: boolean,
  isFireDoor: boolean,
  hasFireExitHardware: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // Check if panic hardware is required
  const panicRule = findRuleById("panic_hardware_required_occupancy");
  if (panicRule) {
    const requiresPanic = ["A", "E"].includes(occupancyGroup) && occupantLoad > 50;
    const panicPassed = !requiresPanic || hasPanicHardware;
    results.push({
      ruleId: panicRule.id,
      ruleName: panicRule.name,
      passed: panicPassed,
      severity: panicPassed ? "INFO" : "FAIL",
      message: panicPassed
        ? requiresPanic ? `Panic hardware installed as required for ${occupancyGroup} occupancy` : `Panic hardware not required for this occupancy/load`
        : `Panic hardware required for ${occupancyGroup} occupancy with ${occupantLoad} occupants`,
      codeReferences: panicRule.code_references,
      remediation: panicPassed ? undefined : panicRule.remediation?.generic_fix,
      costImpact: panicRule.remediation?.cost_impact_estimate,
      confidence: 0.95
    });
  }

  // Check fire exit hardware if fire door with panic
  if (isFireDoor && hasPanicHardware) {
    const fireExitRule = findRuleById("fire_exit_hardware_required");
    if (fireExitRule) {
      results.push({
        ruleId: fireExitRule.id,
        ruleName: fireExitRule.name,
        passed: hasFireExitHardware,
        severity: hasFireExitHardware ? "INFO" : "FAIL",
        message: hasFireExitHardware
          ? `Fire exit hardware installed on fire-rated door`
          : `Fire door with panic hardware requires fire exit hardware (not standard panic)`,
        codeReferences: fireExitRule.code_references,
        remediation: hasFireExitHardware ? undefined : fireExitRule.remediation?.generic_fix,
        costImpact: fireExitRule.remediation?.cost_impact_estimate,
        confidence: 0.95
      });
    }
  }

  return results;
}

export function validateEgressDoor(
  occupantLoad: number,
  swingsInEgressDirection: boolean,
  clearWidthIn: number,
  isMainExit: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // Swing direction - use swing requirements from rule
  const swingRule = findRuleById("egress_door_swing_direction");
  if (swingRule) {
    const swingReq = swingRule.requirements.swing;
    const occupantThreshold = swingReq?.min_occupant_load_threshold ?? 50;
    const requiresEgressDirection = swingReq?.direction_in_egress_travel ?? true;
    
    if (occupantLoad >= occupantThreshold && requiresEgressDirection) {
      results.push({
        ruleId: swingRule.id,
        ruleName: swingRule.name,
        passed: swingsInEgressDirection,
        severity: swingsInEgressDirection ? "INFO" : "FAIL",
        message: swingsInEgressDirection
          ? `Door swings in direction of egress as required for ${occupantLoad} occupants`
          : `Door must swing in direction of egress for ${occupantLoad} occupants (threshold: ${occupantThreshold})`,
        codeReferences: swingRule.code_references,
        remediation: swingsInEgressDirection ? undefined : swingRule.remediation?.generic_fix,
        costImpact: swingRule.remediation?.cost_impact_estimate,
        confidence: 0.95
      });
    }
  }

  // Clear width - use both dimensions and swing requirements from rule
  const widthRule = findRuleById("egress_door_clear_width");
  if (widthRule) {
    // Main exit requires 36", others use swing or dimensions requirement
    const baseMinWidth = widthRule.requirements.swing?.clear_width_when_open ?? 
                         widthRule.requirements.dimensions?.min_clear_width_in ?? 32;
    const minWidth = isMainExit ? 36 : baseMinWidth;
    const widthPassed = clearWidthIn >= minWidth;
    results.push({
      ruleId: widthRule.id,
      ruleName: widthRule.name,
      passed: widthPassed,
      severity: widthPassed ? "INFO" : "FAIL",
      message: widthPassed
        ? `Clear width ${clearWidthIn}" meets ${minWidth}" minimum`
        : `Clear width ${clearWidthIn}" below ${minWidth}" minimum ${isMainExit ? "(main exit)" : ""}`,
      codeReferences: widthRule.code_references,
      measuredValue: clearWidthIn,
      requiredRange: { min: minWidth },
      remediation: widthPassed ? undefined : widthRule.remediation?.generic_fix,
      costImpact: widthRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

export function validateFireDoorLabeling(
  hasLeafLabel: boolean,
  hasFrameLabel: boolean,
  leafRatingMinutes: number,
  frameRatingMinutes: number,
  requiredRatingMinutes: number
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // Label presence
  const labelRule = findRuleById("fire_door_label_visibility");
  if (labelRule) {
    const labelsPresent = hasLeafLabel && hasFrameLabel;
    results.push({
      ruleId: labelRule.id,
      ruleName: labelRule.name,
      passed: labelsPresent,
      severity: labelsPresent ? "INFO" : "FAIL",
      message: labelsPresent
        ? `Fire door and frame labels present and visible`
        : `Missing fire door label (leaf: ${hasLeafLabel}, frame: ${hasFrameLabel})`,
      codeReferences: labelRule.code_references,
      remediation: labelsPresent ? undefined : labelRule.remediation?.generic_fix,
      costImpact: labelRule.remediation?.cost_impact_estimate,
      confidence: 0.95
    });
  }

  // Rating matching
  const matchRule = findRuleById("fire_door_rating_matching");
  if (matchRule && hasLeafLabel && hasFrameLabel) {
    const ratingsPassed = leafRatingMinutes >= requiredRatingMinutes && frameRatingMinutes >= requiredRatingMinutes;
    results.push({
      ruleId: matchRule.id,
      ruleName: matchRule.name,
      passed: ratingsPassed,
      severity: ratingsPassed ? "INFO" : "FAIL",
      message: ratingsPassed
        ? `Door (${leafRatingMinutes} min) and frame (${frameRatingMinutes} min) meet required ${requiredRatingMinutes} min rating`
        : `Door (${leafRatingMinutes} min) or frame (${frameRatingMinutes} min) below required ${requiredRatingMinutes} min`,
      codeReferences: matchRule.code_references,
      remediation: ratingsPassed ? undefined : matchRule.remediation?.generic_fix,
      costImpact: matchRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

// ====== Phase 2 Validation Functions (Fire/Acoustic) ======

export function validateFireRatedGlazing(
  fireRatingMinutes: number,
  hasVisionLite: boolean,
  visionLiteSizeSqIn: number,
  glazingType: "fire_protective" | "fire_resistive" | "standard",
  hasLabel: boolean,
  labelRatingMinutes: number
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // Vision lite size (rule 44)
  if (hasVisionLite && fireRatingMinutes >= 45 && glazingType !== "fire_resistive") {
    const sizeRule = findRuleById("fire_glazing_vision_lite_size");
    if (sizeRule) {
      const maxSize = 100; // sq in per NFPA 80
      const sizePassed = visionLiteSizeSqIn <= maxSize;
      results.push({
        ruleId: sizeRule.id,
        ruleName: sizeRule.name,
        passed: sizePassed,
        severity: sizePassed ? "INFO" : "FAIL",
        message: sizePassed
          ? `Vision lite size ${visionLiteSizeSqIn} sq in within ${maxSize} sq in limit`
          : `Vision lite ${visionLiteSizeSqIn} sq in exceeds ${maxSize} sq in limit for ${fireRatingMinutes}-min door`,
        codeReferences: sizeRule.code_references,
        measuredValue: visionLiteSizeSqIn,
        requiredRange: { max: maxSize },
        remediation: sizePassed ? undefined : sizeRule.remediation?.generic_fix,
        costImpact: sizeRule.remediation?.cost_impact_estimate,
        confidence: 0.9
      });
    }
  }

  // Glazing label (rule 48)
  if (fireRatingMinutes > 0) {
    const labelRule = findRuleById("fire_glazing_label_required");
    if (labelRule) {
      const labelPassed = hasLabel && labelRatingMinutes >= fireRatingMinutes;
      results.push({
        ruleId: labelRule.id,
        ruleName: labelRule.name,
        passed: labelPassed,
        severity: labelPassed ? "INFO" : "FAIL",
        message: labelPassed
          ? `Fire-rated glazing label present with ${labelRatingMinutes}-min rating`
          : hasLabel
            ? `Glazing label rating ${labelRatingMinutes} min below required ${fireRatingMinutes} min`
            : `Fire-rated glazing requires visible label`,
        codeReferences: labelRule.code_references,
        remediation: labelPassed ? undefined : labelRule.remediation?.generic_fix,
        costImpact: labelRule.remediation?.cost_impact_estimate,
        confidence: 0.9
      });
    }
  }

  return results;
}

export function validateAcousticDoor(
  requiredStcRating: number,
  installedStcRating: number,
  hasHeadSeal: boolean,
  hasJambSeals: boolean,
  hasBottomSeal: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // STC rating requirement (rule 49)
  if (requiredStcRating > 0) {
    const stcRule = findRuleById("acoustic_door_stc_rating");
    if (stcRule) {
      const stcPassed = installedStcRating >= requiredStcRating;
      results.push({
        ruleId: stcRule.id,
        ruleName: stcRule.name,
        passed: stcPassed,
        severity: stcPassed ? "INFO" : "FAIL",
        message: stcPassed
          ? `Installed STC ${installedStcRating} meets required STC ${requiredStcRating}`
          : `Installed STC ${installedStcRating} below required STC ${requiredStcRating}`,
        codeReferences: stcRule.code_references,
        measuredValue: installedStcRating,
        requiredRange: { min: requiredStcRating },
        remediation: stcPassed ? undefined : stcRule.remediation?.generic_fix,
        costImpact: stcRule.remediation?.cost_impact_estimate,
        confidence: 0.85
      });
    }
  }

  // Perimeter seals (rule 50)
  if (requiredStcRating >= 30) {
    const sealRule = findRuleById("acoustic_door_perimeter_seals");
    if (sealRule) {
      const sealsComplete = hasHeadSeal && hasJambSeals && hasBottomSeal;
      results.push({
        ruleId: sealRule.id,
        ruleName: sealRule.name,
        passed: sealsComplete,
        severity: sealsComplete ? "INFO" : "WARN",
        message: sealsComplete
          ? `Acoustic door has complete perimeter sealing`
          : `Missing acoustic seals - head: ${hasHeadSeal}, jambs: ${hasJambSeals}, bottom: ${hasBottomSeal}`,
        codeReferences: sealRule.code_references,
        remediation: sealsComplete ? undefined : sealRule.remediation?.generic_fix,
        costImpact: sealRule.remediation?.cost_impact_estimate,
        confidence: 0.85
      });
    }
  }

  return results;
}

export function validateFireHardwareListing(
  fireRatingMinutes: number,
  hardwareType: string,
  isFireListed: boolean,
  isPanicDevice: boolean,
  hasFireExitListing: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // General hardware listing (rule 52)
  if (fireRatingMinutes > 0) {
    const listingRule = findRuleById("fire_hardware_listing_required");
    if (listingRule) {
      results.push({
        ruleId: listingRule.id,
        ruleName: listingRule.name,
        passed: isFireListed,
        severity: isFireListed ? "INFO" : "FAIL",
        message: isFireListed
          ? `${hardwareType} is fire-listed for ${fireRatingMinutes}-min door service`
          : `${hardwareType} on fire door must be fire-listed`,
        codeReferences: listingRule.code_references,
        remediation: isFireListed ? undefined : listingRule.remediation?.generic_fix,
        costImpact: listingRule.remediation?.cost_impact_estimate,
        confidence: 0.95
      });
    }
  }

  // Fire exit hardware (rule 54)
  if (fireRatingMinutes > 0 && isPanicDevice) {
    const fireExitRule = findRuleById("fire_exit_hardware_ul305");
    if (fireExitRule) {
      results.push({
        ruleId: fireExitRule.id,
        ruleName: fireExitRule.name,
        passed: hasFireExitListing,
        severity: hasFireExitListing ? "INFO" : "FAIL",
        message: hasFireExitListing
          ? `Panic device has UL 305 fire exit hardware listing`
          : `Fire door requires UL 305 fire exit hardware, not standard panic device`,
        codeReferences: fireExitRule.code_references,
        remediation: hasFireExitListing ? undefined : fireExitRule.remediation?.generic_fix,
        costImpact: fireExitRule.remediation?.cost_impact_estimate,
        confidence: 0.95
      });
    }
  }

  return results;
}

export function validateSmokeDoor(
  isSmokeDoor: boolean,
  hasSLabel: boolean,
  airLeakageCfm: number,
  hasHeadGasket: boolean,
  hasJambGaskets: boolean,
  hasBottomSeal: boolean,
  isPair: boolean,
  hasAstragalSeal: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (!isSmokeDoor) return results;

  // S-Label requirement (rule 57)
  const sLabelRule = findRuleById("smoke_door_s_label");
  if (sLabelRule) {
    const leakagePassed = hasSLabel && airLeakageCfm <= 3.0;
    results.push({
      ruleId: sLabelRule.id,
      ruleName: sLabelRule.name,
      passed: leakagePassed,
      severity: leakagePassed ? "INFO" : "FAIL",
      message: leakagePassed
        ? `Smoke door has S-label with ${airLeakageCfm} cfm/sq ft leakage`
        : hasSLabel
          ? `Air leakage ${airLeakageCfm} cfm/sq ft exceeds 3.0 cfm/sq ft limit`
          : `Smoke door requires S-label (UL 1784 tested)`,
      codeReferences: sLabelRule.code_references,
      measuredValue: airLeakageCfm,
      requiredRange: { max: 3.0 },
      remediation: leakagePassed ? undefined : sLabelRule.remediation?.generic_fix,
      costImpact: sLabelRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Perimeter gaskets (rule 59)
  const gasketRule = findRuleById("smoke_door_perimeter_seals");
  if (gasketRule) {
    const gasketsComplete = hasHeadGasket && hasJambGaskets;
    results.push({
      ruleId: gasketRule.id,
      ruleName: gasketRule.name,
      passed: gasketsComplete,
      severity: gasketsComplete ? "INFO" : "FAIL",
      message: gasketsComplete
        ? `Smoke door has continuous perimeter gaskets`
        : `Missing smoke gaskets - head: ${hasHeadGasket}, jambs: ${hasJambGaskets}`,
      codeReferences: gasketRule.code_references,
      remediation: gasketsComplete ? undefined : gasketRule.remediation?.generic_fix,
      costImpact: gasketRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Bottom seal (rule 60)
  const bottomRule = findRuleById("smoke_door_bottom_seal");
  if (bottomRule) {
    results.push({
      ruleId: bottomRule.id,
      ruleName: bottomRule.name,
      passed: hasBottomSeal,
      severity: hasBottomSeal ? "INFO" : "FAIL",
      message: hasBottomSeal
        ? `Smoke door has bottom seal installed`
        : `Smoke door requires bottom seal (auto door bottom or threshold)`,
      codeReferences: bottomRule.code_references,
      remediation: hasBottomSeal ? undefined : bottomRule.remediation?.generic_fix,
      costImpact: bottomRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Pair meeting stile seal (rule 58)
  if (isPair) {
    const pairRule = findRuleById("smoke_door_pair_seals");
    if (pairRule) {
      results.push({
        ruleId: pairRule.id,
        ruleName: pairRule.name,
        passed: hasAstragalSeal,
        severity: hasAstragalSeal ? "INFO" : "FAIL",
        message: hasAstragalSeal
          ? `Smoke door pair has sealed meeting stiles`
          : `Smoke door pair requires sealed astragal or rabbeted stiles`,
        codeReferences: pairRule.code_references,
        remediation: hasAstragalSeal ? undefined : pairRule.remediation?.generic_fix,
        costImpact: pairRule.remediation?.cost_impact_estimate,
        confidence: 0.9
      });
    }
  }

  return results;
}

export function validateFireFrame(
  fireRatingMinutes: number,
  hasFrameLabel: boolean,
  frameRatingMinutes: number,
  isHollowMetal: boolean,
  hasGrout: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (fireRatingMinutes <= 0) return results;

  // Frame label (rule 66)
  const labelRule = findRuleById("fire_frame_label");
  if (labelRule) {
    const labelPassed = hasFrameLabel && frameRatingMinutes >= fireRatingMinutes;
    results.push({
      ruleId: labelRule.id,
      ruleName: labelRule.name,
      passed: labelPassed,
      severity: labelPassed ? "INFO" : "FAIL",
      message: labelPassed
        ? `Fire frame labeled at ${frameRatingMinutes}-min rating`
        : hasFrameLabel
          ? `Frame rating ${frameRatingMinutes} min below required ${fireRatingMinutes} min`
          : `Fire-rated frame requires permanent label`,
      codeReferences: labelRule.code_references,
      remediation: labelPassed ? undefined : labelRule.remediation?.generic_fix,
      costImpact: labelRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Frame grout (rule 65)
  if (isHollowMetal && fireRatingMinutes >= 20) {
    const groutRule = findRuleById("fire_frame_grout");
    if (groutRule) {
      results.push({
        ruleId: groutRule.id,
        ruleName: groutRule.name,
        passed: hasGrout,
        severity: hasGrout ? "INFO" : "WARN",
        message: hasGrout
          ? `Fire-rated HM frame has grout fill`
          : `Fire-rated HM frame typically requires grout fill`,
        codeReferences: groutRule.code_references,
        remediation: hasGrout ? undefined : groutRule.remediation?.generic_fix,
        costImpact: groutRule.remediation?.cost_impact_estimate,
        confidence: 0.85
      });
    }
  }

  return results;
}

// ====== Phase 3 Validation Functions (Access Control) ======

export function validateAccessControlSystem(
  hasAccessControl: boolean,
  isUL294Listed: boolean,
  hasBackupPower: boolean,
  backupHours: number,
  isSupervised: boolean,
  hasTamperProtection: boolean,
  securityLevel: "low" | "medium" | "high"
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (!hasAccessControl) return results;

  // UL 294 listing (rule 69)
  const ul294Rule = findRuleById("ul294_access_control_listing");
  if (ul294Rule) {
    results.push({
      ruleId: ul294Rule.id,
      ruleName: ul294Rule.name,
      passed: isUL294Listed,
      severity: isUL294Listed ? "INFO" : "WARN",
      message: isUL294Listed
        ? `Access control system is UL 294 listed`
        : `Access control system should be UL 294 listed`,
      codeReferences: ul294Rule.code_references,
      remediation: isUL294Listed ? undefined : ul294Rule.remediation?.generic_fix,
      costImpact: ul294Rule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Backup power (rule 70)
  const backupRule = findRuleById("access_control_backup_power");
  if (backupRule) {
    const backupPassed = hasBackupPower && backupHours >= 4;
    results.push({
      ruleId: backupRule.id,
      ruleName: backupRule.name,
      passed: backupPassed,
      severity: backupPassed ? "INFO" : "WARN",
      message: backupPassed
        ? `Access control has ${backupHours} hours backup power`
        : hasBackupPower
          ? `Backup power ${backupHours} hours below recommended 4 hours`
          : `Access control should have backup power`,
      codeReferences: backupRule.code_references,
      measuredValue: backupHours,
      requiredRange: { min: 4 },
      remediation: backupPassed ? undefined : backupRule.remediation?.generic_fix,
      costImpact: backupRule.remediation?.cost_impact_estimate,
      confidence: 0.85
    });
  }

  // Supervision (rule 71)
  const supervisionRule = findRuleById("access_control_supervision");
  if (supervisionRule) {
    results.push({
      ruleId: supervisionRule.id,
      ruleName: supervisionRule.name,
      passed: isSupervised,
      severity: isSupervised ? "INFO" : "WARN",
      message: isSupervised
        ? `Access control circuits are supervised`
        : `Access control circuits should be supervised for fault detection`,
      codeReferences: supervisionRule.code_references,
      remediation: isSupervised ? undefined : supervisionRule.remediation?.generic_fix,
      costImpact: supervisionRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  // Tamper protection (rule 72)
  if (securityLevel !== "low") {
    const tamperRule = findRuleById("access_control_tamper");
    if (tamperRule) {
      results.push({
        ruleId: tamperRule.id,
        ruleName: tamperRule.name,
        passed: hasTamperProtection,
        severity: hasTamperProtection ? "INFO" : "WARN",
        message: hasTamperProtection
          ? `Access control has tamper protection`
          : `${securityLevel}-security access control should have tamper protection`,
        codeReferences: tamperRule.code_references,
        remediation: hasTamperProtection ? undefined : tamperRule.remediation?.generic_fix,
        costImpact: tamperRule.remediation?.cost_impact_estimate,
        confidence: 0.85
      });
    }
  }

  return results;
}

export function validateElectricStrike(
  isFireDoor: boolean,
  fireRatingMinutes: number,
  isFireListed: boolean,
  failMode: "fail_safe" | "fail_secure",
  isMeansOfEgress: boolean,
  hasManualOverride: boolean,
  hasAHJApproval: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // Fire rating (rule 76)
  if (isFireDoor && fireRatingMinutes > 0) {
    const fireRule = findRuleById("electric_strike_fire_rated");
    if (fireRule) {
      results.push({
        ruleId: fireRule.id,
        ruleName: fireRule.name,
        passed: isFireListed,
        severity: isFireListed ? "INFO" : "FAIL",
        message: isFireListed
          ? `Electric strike is fire-rated for ${fireRatingMinutes}-min door`
          : `Electric strike on fire door must be fire-rated`,
        codeReferences: fireRule.code_references,
        remediation: isFireListed ? undefined : fireRule.remediation?.generic_fix,
        costImpact: fireRule.remediation?.cost_impact_estimate,
        confidence: 0.95
      });
    }
  }

  // Fail mode on egress (rule 77)
  if (isMeansOfEgress && failMode === "fail_secure") {
    const failSecureRule = findRuleById("electric_strike_fail_secure_approval");
    if (failSecureRule) {
      const approved = hasAHJApproval && hasManualOverride;
      results.push({
        ruleId: failSecureRule.id,
        ruleName: failSecureRule.name,
        passed: approved,
        severity: approved ? "WARN" : "FAIL",
        message: approved
          ? `Fail-secure on egress approved with manual override`
          : `Fail-secure on egress requires AHJ approval and manual override`,
        codeReferences: failSecureRule.code_references,
        remediation: approved ? undefined : failSecureRule.remediation?.generic_fix,
        costImpact: failSecureRule.remediation?.cost_impact_estimate,
        confidence: 0.95
      });
    }
  }

  return results;
}

export function validateREXDevice(
  hasREX: boolean,
  rexType: "pir" | "microwave" | "button" | "dual_tech",
  shuntTimeSeconds: number,
  coverageAdequate: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (!hasREX) return results;

  // REX coverage (rule 79)
  const coverageRule = findRuleById("rex_sensor_coverage");
  if (coverageRule && rexType !== "button") {
    results.push({
      ruleId: coverageRule.id,
      ruleName: coverageRule.name,
      passed: coverageAdequate,
      severity: coverageAdequate ? "INFO" : "WARN",
      message: coverageAdequate
        ? `REX ${rexType} sensor provides adequate coverage`
        : `REX ${rexType} sensor coverage may be insufficient`,
      codeReferences: coverageRule.code_references,
      remediation: coverageAdequate ? undefined : coverageRule.remediation?.generic_fix,
      costImpact: coverageRule.remediation?.cost_impact_estimate,
      confidence: 0.85
    });
  }

  // Shunt timing (rule 80)
  const timingRule = findRuleById("rex_shunt_timing");
  if (timingRule) {
    const timingPassed = shuntTimeSeconds >= 5 && shuntTimeSeconds <= 30;
    results.push({
      ruleId: timingRule.id,
      ruleName: timingRule.name,
      passed: timingPassed,
      severity: timingPassed ? "INFO" : "WARN",
      message: timingPassed
        ? `REX shunt time ${shuntTimeSeconds}s is appropriate`
        : shuntTimeSeconds < 5
          ? `REX shunt time ${shuntTimeSeconds}s may be too short for egress`
          : `REX shunt time ${shuntTimeSeconds}s may be excessive for security`,
      codeReferences: timingRule.code_references,
      measuredValue: shuntTimeSeconds,
      requiredRange: { min: 5, max: 30 },
      remediation: timingPassed ? undefined : timingRule.remediation?.generic_fix,
      costImpact: timingRule.remediation?.cost_impact_estimate,
      confidence: 0.85
    });
  }

  return results;
}

export function validateDoorMonitoring(
  hasDPS: boolean,
  isSupervised: boolean,
  hasHeldOpenAlarm: boolean,
  heldOpenTimeSeconds: number,
  hasForcedAlarm: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  // DPS type (rule 81)
  const dpsRule = findRuleById("dps_type_requirements");
  if (dpsRule && hasDPS) {
    results.push({
      ruleId: dpsRule.id,
      ruleName: dpsRule.name,
      passed: isSupervised,
      severity: isSupervised ? "INFO" : "WARN",
      message: isSupervised
        ? `Door position switch is supervised`
        : `DPS should be supervised for security applications`,
      codeReferences: dpsRule.code_references,
      remediation: isSupervised ? undefined : dpsRule.remediation?.generic_fix,
      costImpact: dpsRule.remediation?.cost_impact_estimate,
      confidence: 0.85
    });
  }

  // Held-open alarm (rule 82)
  const heldOpenRule = findRuleById("door_held_open_alarm");
  if (heldOpenRule) {
    const heldOpenPassed = hasHeldOpenAlarm && heldOpenTimeSeconds >= 15 && heldOpenTimeSeconds <= 120;
    results.push({
      ruleId: heldOpenRule.id,
      ruleName: heldOpenRule.name,
      passed: heldOpenPassed,
      severity: heldOpenPassed ? "INFO" : "WARN",
      message: heldOpenPassed
        ? `Door held-open alarm configured at ${heldOpenTimeSeconds}s`
        : hasHeldOpenAlarm
          ? `Held-open time ${heldOpenTimeSeconds}s outside typical 15-120s range`
          : `Door held-open monitoring should be enabled`,
      codeReferences: heldOpenRule.code_references,
      measuredValue: heldOpenTimeSeconds,
      remediation: heldOpenPassed ? undefined : heldOpenRule.remediation?.generic_fix,
      costImpact: heldOpenRule.remediation?.cost_impact_estimate,
      confidence: 0.85
    });
  }

  // Forced alarm (rule 83)
  const forcedRule = findRuleById("door_forced_alarm");
  if (forcedRule) {
    results.push({
      ruleId: forcedRule.id,
      ruleName: forcedRule.name,
      passed: hasForcedAlarm,
      severity: hasForcedAlarm ? "INFO" : "WARN",
      message: hasForcedAlarm
        ? `Door forced alarm is enabled`
        : `Door forced alarm should be enabled for security`,
      codeReferences: forcedRule.code_references,
      remediation: hasForcedAlarm ? undefined : forcedRule.remediation?.generic_fix,
      costImpact: forcedRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

export function validateFailMode(
  occupancyGroup: string,
  isElectrified: boolean,
  failMode: "fail_safe" | "fail_secure",
  hasFireAlarmRelease: boolean,
  hasManualRelease: boolean,
  hasStaffRelease: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (!isElectrified) return results;

  // Assembly occupancy (rule 84)
  if (occupancyGroup === "A") {
    const assemblyRule = findRuleById("fail_safe_assembly_occupancy");
    if (assemblyRule) {
      const passed = failMode === "fail_safe" && hasFireAlarmRelease;
      results.push({
        ruleId: assemblyRule.id,
        ruleName: assemblyRule.name,
        passed,
        severity: passed ? "INFO" : "FAIL",
        message: passed
          ? `Assembly occupancy electrified hardware is fail-safe with FA release`
          : failMode !== "fail_safe"
            ? `Assembly occupancy requires fail-safe electrified hardware`
            : `Assembly occupancy requires fire alarm release`,
        codeReferences: assemblyRule.code_references,
        remediation: passed ? undefined : assemblyRule.remediation?.generic_fix,
        costImpact: assemblyRule.remediation?.cost_impact_estimate,
        confidence: 0.95
      });
    }
  }

  // Healthcare occupancy (rule 85)
  if (occupancyGroup === "I") {
    const healthcareRule = findRuleById("fail_mode_healthcare");
    if (healthcareRule) {
      const passed = hasFireAlarmRelease && hasManualRelease;
      results.push({
        ruleId: healthcareRule.id,
        ruleName: healthcareRule.name,
        passed,
        severity: passed ? "INFO" : "WARN",
        message: passed
          ? `Healthcare occupancy has FA release and manual override`
          : `Healthcare occupancy electrified hardware needs FA release and staff override`,
        codeReferences: healthcareRule.code_references,
        remediation: passed ? undefined : healthcareRule.remediation?.generic_fix,
        costImpact: healthcareRule.remediation?.cost_impact_estimate,
        confidence: 0.9
      });
    }
  }

  // Detention occupancy (rule 86)
  if (occupancyGroup === "I-3") {
    const detentionRule = findRuleById("fail_mode_detention");
    if (detentionRule) {
      const passed = hasStaffRelease && hasManualRelease;
      results.push({
        ruleId: detentionRule.id,
        ruleName: detentionRule.name,
        passed,
        severity: passed ? "INFO" : "FAIL",
        message: passed
          ? `Detention occupancy has staff and emergency release`
          : `Detention occupancy requires staff and emergency unlock capability`,
        codeReferences: detentionRule.code_references,
        remediation: passed ? undefined : detentionRule.remediation?.generic_fix,
        costImpact: detentionRule.remediation?.cost_impact_estimate,
        confidence: 0.95
      });
    }
  }

  return results;
}

export function validateFireAlarmInterface(
  isElectrified: boolean,
  hasFireAlarmConnection: boolean,
  releaseTimeSeconds: number,
  isRelaySupervised: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (!isElectrified || !hasFireAlarmConnection) return results;

  // Release timing (rule 87)
  const timingRule = findRuleById("fire_alarm_shunt_timing");
  if (timingRule) {
    const timingPassed = releaseTimeSeconds <= 1;
    results.push({
      ruleId: timingRule.id,
      ruleName: timingRule.name,
      passed: timingPassed,
      severity: timingPassed ? "INFO" : "FAIL",
      message: timingPassed
        ? `Fire alarm release is near-instantaneous (${releaseTimeSeconds}s)`
        : `Fire alarm release time ${releaseTimeSeconds}s must be immediate (≤1s)`,
      codeReferences: timingRule.code_references,
      measuredValue: releaseTimeSeconds,
      requiredRange: { max: 1 },
      remediation: timingPassed ? undefined : timingRule.remediation?.generic_fix,
      costImpact: timingRule.remediation?.cost_impact_estimate,
      confidence: 0.95
    });
  }

  // Relay supervision (rule 88)
  const relayRule = findRuleById("fire_alarm_relay_supervised");
  if (relayRule) {
    results.push({
      ruleId: relayRule.id,
      ruleName: relayRule.name,
      passed: isRelaySupervised,
      severity: isRelaySupervised ? "INFO" : "WARN",
      message: isRelaySupervised
        ? `Fire alarm release relay is supervised`
        : `Fire alarm release relay should be supervised per NFPA 72`,
      codeReferences: relayRule.code_references,
      remediation: isRelaySupervised ? undefined : relayRule.remediation?.generic_fix,
      costImpact: relayRule.remediation?.cost_impact_estimate,
      confidence: 0.9
    });
  }

  return results;
}

export function validateEmergencyOverride(
  hasAccessControl: boolean,
  isMeansOfEgress: boolean,
  hasEmergencyRelease: boolean,
  releaseType: "button" | "bar" | "break_glass",
  hasSignage: boolean,
  releaseHeightIn: number
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (!hasAccessControl || !isMeansOfEgress) return results;

  // Emergency release button (rule 89)
  const buttonRule = findRuleById("emergency_override_button");
  if (buttonRule) {
    results.push({
      ruleId: buttonRule.id,
      ruleName: buttonRule.name,
      passed: hasEmergencyRelease,
      severity: hasEmergencyRelease ? "INFO" : "FAIL",
      message: hasEmergencyRelease
        ? `Emergency ${releaseType} release is installed`
        : `Access-controlled egress door requires emergency release`,
      codeReferences: buttonRule.code_references,
      remediation: hasEmergencyRelease ? undefined : buttonRule.remediation?.generic_fix,
      costImpact: buttonRule.remediation?.cost_impact_estimate,
      confidence: 0.95
    });
  }

  // Emergency release signage (rule 90)
  if (hasEmergencyRelease) {
    const signageRule = findRuleById("emergency_release_signage");
    if (signageRule) {
      results.push({
        ruleId: signageRule.id,
        ruleName: signageRule.name,
        passed: hasSignage,
        severity: hasSignage ? "INFO" : "WARN",
        message: hasSignage
          ? `Emergency release has instructional signage`
          : `Emergency release should have 'PUSH TO EXIT' or similar signage`,
        codeReferences: signageRule.code_references,
        remediation: hasSignage ? undefined : signageRule.remediation?.generic_fix,
        costImpact: signageRule.remediation?.cost_impact_estimate,
        confidence: 0.9
      });
    }
  }

  // Break glass height (rule 91)
  if (releaseType === "break_glass") {
    const breakGlassRule = findRuleById("break_glass_release");
    if (breakGlassRule) {
      const heightPassed = releaseHeightIn >= 40 && releaseHeightIn <= 48;
      results.push({
        ruleId: breakGlassRule.id,
        ruleName: breakGlassRule.name,
        passed: heightPassed,
        severity: heightPassed ? "INFO" : "WARN",
        message: heightPassed
          ? `Break glass at ${releaseHeightIn}" AFF within 40-48" range`
          : `Break glass at ${releaseHeightIn}" AFF outside 40-48" recommended range`,
        codeReferences: breakGlassRule.code_references,
        measuredValue: releaseHeightIn,
        requiredRange: { min: 40, max: 48 },
        remediation: heightPassed ? undefined : breakGlassRule.remediation?.generic_fix,
        costImpact: breakGlassRule.remediation?.cost_impact_estimate,
        confidence: 0.85
      });
    }
  }

  return results;
}

export function validateVideoIntercom(
  hasVideoIntercom: boolean,
  hasRemoteRelease: boolean,
  cameraHeightIn: number,
  controlHeightIn: number,
  isAccessible: boolean,
  hasBackupPower: boolean,
  isMainEntry: boolean
): HardwareValidationResult[] {
  const results: HardwareValidationResult[] = [];

  if (!hasVideoIntercom) return results;

  // Camera placement (rule 93)
  const cameraRule = findRuleById("video_intercom_camera");
  if (cameraRule) {
    const cameraPassed = cameraHeightIn >= 48 && cameraHeightIn <= 60;
    results.push({
      ruleId: cameraRule.id,
      ruleName: cameraRule.name,
      passed: cameraPassed,
      severity: cameraPassed ? "INFO" : "WARN",
      message: cameraPassed
        ? `Video intercom camera at ${cameraHeightIn}" AFF provides good face capture`
        : `Camera at ${cameraHeightIn}" AFF may not capture visitor faces (48-60" recommended)`,
      codeReferences: cameraRule.code_references,
      measuredValue: cameraHeightIn,
      requiredRange: { min: 48, max: 60 },
      remediation: cameraPassed ? undefined : cameraRule.remediation?.generic_fix,
      costImpact: cameraRule.remediation?.cost_impact_estimate,
      confidence: 0.85
    });
  }

  // ADA compliance (rule 94)
  if (isAccessible) {
    const adaRule = findRuleById("video_intercom_ada");
    if (adaRule) {
      const adaPassed = controlHeightIn >= 34 && controlHeightIn <= 48;
      results.push({
        ruleId: adaRule.id,
        ruleName: adaRule.name,
        passed: adaPassed,
        severity: adaPassed ? "INFO" : "FAIL",
        message: adaPassed
          ? `Video intercom controls at ${controlHeightIn}" AFF meet ADA requirements`
          : `Controls at ${controlHeightIn}" AFF outside ADA 34-48" range`,
        codeReferences: adaRule.code_references,
        measuredValue: controlHeightIn,
        requiredRange: { min: 34, max: 48 },
        remediation: adaPassed ? undefined : adaRule.remediation?.generic_fix,
        costImpact: adaRule.remediation?.cost_impact_estimate,
        confidence: 0.9
      });
    }
  }

  // Backup power for main entry (rule 95)
  if (isMainEntry) {
    const backupRule = findRuleById("video_intercom_backup_power");
    if (backupRule) {
      results.push({
        ruleId: backupRule.id,
        ruleName: backupRule.name,
        passed: hasBackupPower,
        severity: hasBackupPower ? "INFO" : "WARN",
        message: hasBackupPower
          ? `Main entry video intercom has backup power`
          : `Main entry video intercom should have backup power`,
        codeReferences: backupRule.code_references,
        remediation: hasBackupPower ? undefined : backupRule.remediation?.generic_fix,
        costImpact: backupRule.remediation?.cost_impact_estimate,
        confidence: 0.85
      });
    }
  }

  return results;
}
