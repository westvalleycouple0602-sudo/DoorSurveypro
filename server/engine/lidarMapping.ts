// server/engine/lidarMapping.ts
// Maps raw LiDAR scan data from mobile clients to compliance engine inputs

import {
  DoorOpeningContext,
  HardwareMeasurement,
  MeasurementSource
} from "./doorComplianceEngine";

// Raw types sent from the mobile LiDAR client (ARKit/ARCore) to the backend

export type RawLidarHardwareType =
  | "lever"
  | "lockset"
  | "panic_device"
  | "fire_exit_device"
  | "door_viewer"
  | "threshold"
  | "door_closer"
  | "auto_operator_actuator_plate";

export interface RawLidarHardwareDetection {
  id: string;
  type: RawLidarHardwareType;

  /** Centerline height above finished floor in inches, as computed client-side */
  centerlineHeightAffIn?: number;

  /** For thresholds, the max height above finished floor in inches */
  thresholdHeightIn?: number;

  /** Confidence (0-1) that detection & measurement are correct */
  confidence: number;

  /** Optional: bounding box in door coordinate space (normalized 0-1) */
  bboxDoorSpace?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RawLidarOpeningData {
  openingId: string;

  /** Jurisdiction like "US-AZ", "US-CA" */
  jurisdiction: string;

  /** True if surveyed door is on an accessible route */
  onAccessibleRoute: boolean;

  /** True if door is part of a means of egress */
  isMeansOfEgressDoor: boolean;

  /** Fire rating in minutes, if any (0 for non-rated) */
  requiredFireRatingMinutes?: number;

  /** Does LiDAR see a threshold? */
  hasThreshold: boolean;

  /** Does LiDAR see a vision lite (or the user tagged one)? */
  hasVisionLite: boolean;

  /** Clear width at 90° in inches (LiDAR-measured) */
  clearWidthAt90DegIn?: number;

  /** Optional occupancy and extra metadata */
  occupancyGroup?: string;
  metadata?: Record<string, unknown>;

  /** All LiDAR detected hardware on this opening */
  hardwareDetections: RawLidarHardwareDetection[];
}

/**
 * Map LiDAR hardware type to engine hardware type/role.
 * This keeps engine terms stable even if detection labels change.
 */
function mapLidarTypeToHardware(type: RawLidarHardwareType): {
  type: string;
  role?: string;
  required_for_normal_egress_or_entry?: boolean;
  required_for_egress?: boolean;
} {
  switch (type) {
    case "lever":
    case "lockset":
      return {
        type: "lever",
        role: "lockset",
        required_for_normal_egress_or_entry: true,
        required_for_egress: true
      };
    case "panic_device":
    case "fire_exit_device":
      return {
        type: "panic_device",
        role: "egress_device",
        required_for_normal_egress_or_entry: true,
        required_for_egress: true
      };
    case "door_viewer":
      return { type: "door_viewer" };
    case "threshold":
      return { type: "threshold" };
    case "door_closer":
      return { type: "door_closer" };
    case "auto_operator_actuator_plate":
      return {
        type: "auto_operator_actuator_plate",
        required_for_normal_egress_or_entry: true
      };
    default:
      return { type: type as string };
  }
}

/**
 * Convert a RawLidarOpeningData payload into a DoorOpeningContext + HardwareMeasurement[]
 * suitable for the compliance engine.
 */
export function mapRawLidarToEngineInputs(
  raw: RawLidarOpeningData,
  measurementSource: MeasurementSource = "lidar"
): { opening: DoorOpeningContext; hardwareList: HardwareMeasurement[] } {
  const opening: DoorOpeningContext = {
    openingId: raw.openingId,
    jurisdiction: raw.jurisdiction,
    on_accessible_route: raw.onAccessibleRoute,
    is_means_of_egress_door: raw.isMeansOfEgressDoor,
    occupancy_group: raw.occupancyGroup,
    required_fire_rating_minutes: raw.requiredFireRatingMinutes,
    has_threshold: raw.hasThreshold,
    has_vision_lite: raw.hasVisionLite,
    approach_type: "front", // TODO: derive from scan/orientation if available
    metadata: {
      clearWidthAt90DegIn: raw.clearWidthAt90DegIn,
      ...raw.metadata
    }
  };

  const hardwareList: HardwareMeasurement[] = raw.hardwareDetections.map((det) => {
    const mapped = mapLidarTypeToHardware(det.type);

    const hw: HardwareMeasurement = {
      hardwareId: det.id,
      type: mapped.type,
      role: mapped.role,
      required_for_normal_egress_or_entry: mapped.required_for_normal_egress_or_entry,
      required_for_egress: mapped.required_for_egress,
      centerline_height_aff_in: det.centerlineHeightAffIn,
      threshold_height_in: det.thresholdHeightIn,
      measurement_source: measurementSource,
      lidar_confidence: det.confidence,
      lidar_bbox_door_space: det.bboxDoorSpace
    };

    return hw;
  });

  return { opening, hardwareList };
}
