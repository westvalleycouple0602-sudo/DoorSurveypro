// Building Code Validation Rules - US & Canada
// Ported from Python validation service

export const VALIDATION_RULES_VERSION = "2025-11-03";

export const MEASUREMENT_TOLERANCE_IN = 0.125; // ±1/8 inch measurement uncertainty

export type Country = "US" | "CA";
export type DoorType = "swing" | "sliding" | "revolving" | "folding" | "other";
export type DoorOperation = "manual" | "automatic";
export type ValidationSeverity = "FAIL" | "WARN" | "INFO";

export interface AccessibilityRules {
  min_clear_opening_in: number;
  legacy_min_clear_opening_in?: number;
  min_clear_height_in: number;
  threshold_max_in: number;
  hardware_height_in_range: [number, number];
  maneuvering_clearances_in: {
    pull_side: {
      latch_side_in: number;
      perpendicular_depth_in: number;
    };
    push_side: {
      latch_side_in: number;
      perpendicular_depth_in: number;
    };
  };
}

export interface EgressRules {
  min_clear_opening_in: number;
  min_clear_height_in: number;
  residential_min_clear_height_in?: number;
}

export interface GapRules {
  sides_max: number;
  top_max: number;
  meeting_stiles_max: number;
  bottom_max: number;
}

export interface AutomaticDoorRules {
  requires_fail_safe: boolean;
  min_clear_opening_in_power_on: number;
  min_clear_opening_in_power_off: number;
  dual_height_activators?: boolean;
}

export interface SlidingEgressRules {
  manual_allowed_if_occupant_load_lte: number;
  automatic_allowed: boolean;
  requires_breakout_or_push_open: boolean;
  min_emergency_clear_opening_in: number;
  threshold_max_in: number;
}

export interface RevolvingRules {
  not_accessible_route: boolean;
  requires_adjacent_swing_door: boolean;
  max_exit_capacity_fraction?: number;
  min_breakout_clear_opening_in: number;
}

export interface ForcesAndSpeedsRules {
  manual_interior_force_lbf_max: number;
  closer_time_sec_min_90_to_12?: number; // US: 90° to 12°
  closer_time_sec_min_70_to_3in?: number; // CA: 70° to 3"
}

export interface CountryRules {
  accessibility: AccessibilityRules;
  egress: EgressRules;
  fire_door_gaps_in: GapRules;
  non_fire_swing_gaps_in: GapRules;
  automatic_doors: AutomaticDoorRules;
  sliding_egress: SlidingEgressRules;
  revolving: RevolvingRules;
  forces_and_speeds: ForcesAndSpeedsRules;
}

// US Building Codes (IBC, ADA/ADAAG, NFPA 80, NFPA 101)
export const US_RULES: CountryRules = {
  accessibility: {
    min_clear_opening_in: 32.0, // ADA 404.2.3
    min_clear_height_in: 80.0, // ADA 404.2.5
    threshold_max_in: 0.5, // ADA 404.2.5 (max 1/2")
    hardware_height_in_range: [34.0, 48.0], // ADA 404.2.7 (34" - 48")
    maneuvering_clearances_in: {
      pull_side: {
        latch_side_in: 18.0, // ADA 404.2.4.1 (min 18")
        perpendicular_depth_in: 60.0, // ADA 404.2.4.1 (min 60")
      },
      push_side: {
        latch_side_in: 12.0, // ADA 404.2.4.2 (min 12")
        perpendicular_depth_in: 48.0, // ADA 404.2.4.2 (min 48")
      },
    },
  },
  egress: {
    min_clear_opening_in: 32.0, // IBC 1010.1.1 (min 32")
    min_clear_height_in: 80.0, // IBC 1010.1.1 (min 6'8")
    residential_min_clear_height_in: 78.0, // IRC R311.4.1 (min 6'6")
  },
  fire_door_gaps_in: {
    sides_max: 0.125, // NFPA 80 Table 4.8.4 (max 1/8")
    top_max: 0.125, // NFPA 80 Table 4.8.4 (max 1/8")
    meeting_stiles_max: 0.125, // NFPA 80 Table 4.8.4 (max 1/8")
    bottom_max: 0.75, // NFPA 80 Table 4.8.4 (max 3/4")
  },
  non_fire_swing_gaps_in: {
    sides_max: 0.125, // SDI-100 (max 1/8")
    top_max: 0.125, // SDI-100 (max 1/8")
    bottom_max: 0.75, // SDI-100 (max 3/4")
    meeting_stiles_max: 0.1875, // SDI-100 (max 3/16")
  },
  automatic_doors: {
    requires_fail_safe: true, // IBC 1010.1.4.2
    min_clear_opening_in_power_on: 32.0,
    min_clear_opening_in_power_off: 32.0,
  },
  sliding_egress: {
    manual_allowed_if_occupant_load_lte: 10, // IBC 1010.2.1
    automatic_allowed: true,
    requires_breakout_or_push_open: true, // IBC 1010.2.1.1
    min_emergency_clear_opening_in: 32.0,
    threshold_max_in: 0.5,
  },
  revolving: {
    not_accessible_route: true, // ADA 404.2.2 (not permitted on accessible routes)
    requires_adjacent_swing_door: true, // IBC 1010.3.1
    max_exit_capacity_fraction: 0.5, // IBC 1010.3.1 (max 50% of exit capacity)
    min_breakout_clear_opening_in: 36.0, // IBC 1010.3.1 (min 36")
  },
  forces_and_speeds: {
    manual_interior_force_lbf_max: 5.0, // ADA 404.2.9 (max 5 lbf)
    closer_time_sec_min_90_to_12: 5.0, // ADA 404.2.8.1 (min 5 seconds from 90° to 12°)
  },
};

// Canada Building Codes (NBC, OBC, AODA)
export const CA_RULES: CountryRules = {
  accessibility: {
    min_clear_opening_in: 33.5, // OBC 3.8.3.3 (min 850mm = 33.5")
    legacy_min_clear_opening_in: 31.5, // OBC legacy (min 800mm = 31.5")
    min_clear_height_in: 78.0, // OBC 3.8.3.3 (min 1980mm = 78")
    threshold_max_in: 0.5, // OBC 3.8.3.7 (max 13mm = 0.5")
    hardware_height_in_range: [35.0, 43.0], // OBC 3.8.3.11 (900-1100mm = 35.4"-43.3", rounded)
    maneuvering_clearances_in: {
      pull_side: {
        latch_side_in: 24.0, // OBC 3.8.3.4 (min 600mm = 23.6", rounded to 24")
        perpendicular_depth_in: 59.0, // OBC 3.8.3.4 (min 1500mm = 59")
      },
      push_side: {
        latch_side_in: 12.0, // OBC 3.8.3.4 (min 300mm = 11.8", rounded to 12")
        perpendicular_depth_in: 48.0, // OBC 3.8.3.4 (min 1220mm = 48")
      },
    },
  },
  egress: {
    min_clear_opening_in: 32.0, // NBC 3.3.1.3 (min 810mm = 31.9", rounded to 32")
    min_clear_height_in: 78.0, // NBC 3.3.1.3 (min 1980mm = 78")
  },
  fire_door_gaps_in: {
    sides_max: 0.125, // CAN/ULC-S104 (max 3mm = 0.12", rounded to 1/8")
    top_max: 0.125, // CAN/ULC-S104 (max 3mm = 0.12", rounded to 1/8")
    meeting_stiles_max: 0.125, // CAN/ULC-S104 (max 3mm = 0.12", rounded to 1/8")
    bottom_max: 0.75, // CAN/ULC-S104 (max 19mm = 0.75")
  },
  non_fire_swing_gaps_in: {
    sides_max: 0.125,
    top_max: 0.125,
    bottom_max: 0.75,
    meeting_stiles_max: 0.1875,
  },
  automatic_doors: {
    requires_fail_safe: true,
    min_clear_opening_in_power_on: 32.0,
    min_clear_opening_in_power_off: 32.0,
    dual_height_activators: true, // OBC requires dual-height activation
  },
  sliding_egress: {
    manual_allowed_if_occupant_load_lte: 10, // NBC similar to IBC
    automatic_allowed: true,
    requires_breakout_or_push_open: true,
    min_emergency_clear_opening_in: 32.0,
    threshold_max_in: 0.5,
  },
  revolving: {
    not_accessible_route: true, // AODA similar to ADA
    requires_adjacent_swing_door: true, // NBC 3.3.1.10
    min_breakout_clear_opening_in: 36.0, // NBC 3.3.1.10 (min 900mm = 35.4", rounded to 36")
  },
  forces_and_speeds: {
    manual_interior_force_lbf_max: 5.0, // OBC 3.8.3.10 (max 22N ≈ 5 lbf)
    closer_time_sec_min_70_to_3in: 3.0, // OBC 3.8.3.9 (min 3 seconds from 70° to 3" from latch)
  },
};

export const RULES_BY_COUNTRY: Record<Country, CountryRules> = {
  US: US_RULES,
  CA: CA_RULES,
};

export function getCountryRules(country: Country): CountryRules {
  return RULES_BY_COUNTRY[country];
}
