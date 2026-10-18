export type OverlayStatus = "pass" | "violation" | "unknown";

export type MeasurementSource = "manual" | "lidar" | "photo_estimate";

export type ViolationSeverity = "info" | "warning" | "life_safety";

export interface DoorElevationOverlayHardwareMarker {
  hardwareId?: string;
  type: string;
  status: OverlayStatus;
  violations: string[];
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
