export type Source = "scan" | "operator" | "derived";
export interface Dim { valueMm: number; sigmaMm?: number; source: Source; uncertainty?: number; }
export interface OpeningScanRecord {
  openingId: string;
  frameWidthMin?: Dim; frameHeightMin?: Dim; leafWidth?: Dim; leafHeight?: Dim;
  lockBacksetMm?: Dim; hingeSizeMm?: Dim;
  coveragePct?: number; qualityScore?: number; confidence?: number;
  adaClearWidthMm?: Dim; clrBottom?: Dim; isFireRated?: boolean;
}
export interface QualityThresholds { coveragePct: number; confidence: number; maxAngleDeg: number; minDistM: number; maxDistM: number; }
export const DEFAULT_THRESHOLDS: QualityThresholds = { coveragePct: 80, confidence: 0.8, maxAngleDeg: 25, minDistM: 1.5, maxDistM: 2.0 };
export function meetsQuality(coveragePct: number, confidence: number, t: QualityThresholds): boolean {
  return coveragePct >= t.coveragePct && confidence >= t.confidence;
}
