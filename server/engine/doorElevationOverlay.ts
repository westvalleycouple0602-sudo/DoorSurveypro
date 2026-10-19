// server/engine/doorElevationOverlay.ts
// Builds overlay models for front-end door elevation visualization

import {
  DoorOpeningContext,
  HardwareMeasurement,
  RuleEvaluationResult
} from "./doorComplianceEngine";

export type OverlayStatus = "pass" | "violation" | "unknown";

export interface DoorElevationOverlayHardwareMarker {
  hardwareId?: string;
  type: string;
  status: OverlayStatus;
  violations: string[];
  /** Normalized bounding box in door coordinate space (0-1), if available from LiDAR */
  bboxDoorSpace?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DoorElevationOverlay {
  openingId: string;
  widthIn?: number;
  heightIn?: number;
  markers: DoorElevationOverlayHardwareMarker[];
}

/**
 * Build an overlay model suitable for a front-end elevation view.
 * - Uses LiDAR bboxDoorSpace if present
 * - Marks hardware as pass/violation/unknown based on rule results
 */
export function buildDoorElevationOverlay(
  opening: DoorOpeningContext,
  hardwareList: HardwareMeasurement[],
  evalResults: RuleEvaluationResult[]
): DoorElevationOverlay {
  const failuresByHardware = new Map<string | undefined, string[]>();

  for (const res of evalResults) {
    if (!res.passed) {
      const hwKey = res.hardwareId;
      if (!failuresByHardware.has(hwKey)) {
        failuresByHardware.set(hwKey, []);
      }
      failuresByHardware.get(hwKey)!.push(res.ruleId);
    }
  }

  const markers: DoorElevationOverlayHardwareMarker[] = hardwareList.map((hw) => {
    const violationRuleIds = failuresByHardware.get(hw.hardwareId) ?? [];
    let status: OverlayStatus = "unknown";

    if (violationRuleIds.length > 0) {
      status = "violation";
    } else if (evalResults.some((r) => r.hardwareId === hw.hardwareId && r.passed)) {
      status = "pass";
    }

    return {
      hardwareId: hw.hardwareId,
      type: hw.type,
      status,
      violations: violationRuleIds,
      bboxDoorSpace: hw.lidar_bbox_door_space
    };
  });

  return {
    openingId: opening.openingId,
    widthIn: (opening.metadata as Record<string, unknown>)?.doorWidthIn as number | undefined,
    heightIn: (opening.metadata as Record<string, unknown>)?.doorHeightIn as number | undefined,
    markers
  };
}
