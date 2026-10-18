// ============================================================================
// SCAN SDK TYPE DEFINITIONS
// ============================================================================
// Types from @doorsurvey/scan-core and @doorsurvey/scan-platform

export type Source = "scan" | "operator" | "derived";

export interface Dim {
  valueMm: number;
  sigmaMm?: number;
  source: Source;
  uncertainty?: number;
}

export interface OpeningScanRecord {
  openingId: string;
  frameWidthMin?: Dim;
  frameHeightMin?: Dim;
  leafWidth?: Dim;
  leafHeight?: Dim;
  lockBacksetMm?: Dim;
  hingeSizeMm?: Dim;
  coveragePct?: number;
  qualityScore?: number;
  confidence?: number;
  adaClearWidthMm?: Dim;
  clrBottom?: Dim;
  isFireRated?: boolean;
}

export interface QualityThresholds {
  coveragePct: number;
  confidence: number;
  maxAngleDeg: number;
  minDistM: number;
  maxDistM: number;
}

export const DEFAULT_THRESHOLDS: QualityThresholds = {
  coveragePct: 80,
  confidence: 0.8,
  maxAngleDeg: 25,
  minDistM: 1.5,
  maxDistM: 2.0,
};

export function meetsQuality(
  coveragePct: number,
  confidence: number,
  t: QualityThresholds
): boolean {
  return coveragePct >= t.coveragePct && confidence >= t.confidence;
}

// Scan permissions
export type ScanPermission =
  | "scan:start"
  | "scan:export"
  | "scan:hardware"
  | "scan:compliance"
  | "scan:voice"
  | "scan:subtitles";

// Scan feature flags
export interface ScanFeatureFlags {
  voice?: boolean;
  subtitles?: boolean;
  dualPass?: boolean;
  heatmap?: boolean;
  arDepth?: boolean;
}

// Scan configuration for organization
export interface ScanConfig {
  id?: string;
  organizationId: string;
  coverageThreshold: number;
  confidenceThreshold: number;
  minDistanceM: number;
  maxDistanceM: number;
  maxAngleDeg: number;
  enableVoice: boolean;
  enableSubtitles: boolean;
  enableDualPass: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Scan metric event
export interface ScanMetric {
  id?: number;
  organizationId: string;
  userId: string;
  openingId?: string;
  eventType: string; // e.g., 'scan.calibrate.start', 'scan.frame.done'
  eventData: Record<string, any>;
  createdAt?: Date;
}

// Offline scan queue entry
export interface OfflineScanEntry {
  id: string;
  scanRecord: OpeningScanRecord;
  projectId: string;
  openingId: string;
  timestamp: number;
  synced: boolean;
}
