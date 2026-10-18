import type { DetectionOverride } from "@shared/schema";

export interface LearnedAdjustment {
  suggestedValue: any;
  confidenceBoost: number;
  sampleCount: number;
  matchRatio: number;
  applied: boolean;
}

const MIN_SAMPLES = 3;
const MATCH_THRESHOLD = 0.6;
const MAX_CONFIDENCE_BOOST = 0.35;

export function computeLearnedAdjustments(
  overrides: DetectionOverride[],
  fieldPath: string,
  currentContext?: Record<string, any>
): LearnedAdjustment | null {
  const fieldOverrides = overrides.filter(o => o.fieldPath === fieldPath);

  if (fieldOverrides.length < MIN_SAMPLES) {
    return null;
  }

  const contextMatches = currentContext
    ? fieldOverrides.filter(o => matchesContext(o.context as Record<string, any> | null, currentContext))
    : fieldOverrides;

  if (contextMatches.length < MIN_SAMPLES) {
    return null;
  }

  const valueCounts = new Map<string, number>();
  for (const override of contextMatches) {
    const key = JSON.stringify(override.correctedValue);
    valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
  }

  let topValue: string | null = null;
  let topCount = 0;
  valueCounts.forEach((cnt, value) => {
    if (cnt > topCount) {
      topCount = cnt;
      topValue = value;
    }
  });

  if (!topValue) return null;

  const matchRatio = topCount / contextMatches.length;

  if (matchRatio < MATCH_THRESHOLD) {
    return null;
  }

  const confidenceBoost = Math.min(
    matchRatio * (Math.log2(contextMatches.length + 1) / 10) + 0.1,
    MAX_CONFIDENCE_BOOST
  );

  return {
    suggestedValue: JSON.parse(topValue),
    confidenceBoost,
    sampleCount: contextMatches.length,
    matchRatio,
    applied: false,
  };
}

function matchesContext(
  overrideContext: Record<string, any> | null,
  currentContext: Record<string, any>
): boolean {
  if (!overrideContext) return true;

  const numericTolerance = 0.15;

  for (const [key, overrideVal] of Object.entries(overrideContext)) {
    const currentVal = currentContext[key];
    if (currentVal === undefined) continue;

    if (typeof overrideVal === "number" && typeof currentVal === "number") {
      const diff = Math.abs(overrideVal - currentVal);
      const maxVal = Math.max(Math.abs(overrideVal), Math.abs(currentVal), 1);
      if (diff / maxVal > numericTolerance) return false;
    } else if (typeof overrideVal === "string" && typeof currentVal === "string") {
      if (overrideVal.toLowerCase() !== currentVal.toLowerCase()) return false;
    }
  }

  return true;
}

export interface AppliedLearning {
  fieldPath: string;
  originalValue: any;
  learnedValue: any;
  confidenceBoost: number;
  sampleCount: number;
  matchRatio: number;
}

export function applyLearningToAnalysis(
  analysis: any,
  overrides: DetectionOverride[]
): { updatedAnalysis: any; appliedLearning: AppliedLearning[] } {
  const appliedLearning: AppliedLearning[] = [];
  const updated = JSON.parse(JSON.stringify(analysis));

  const currentContext = buildContextFromAnalysis(updated);

  const fieldsToLearn = [
    "materialIdentification.frameMaterial.type",
    "materialIdentification.doorMaterial.type",
    "materialIdentification.installationMethod.type",
    "materialIdentification.veneerFinish.type",
    "materialIdentification.color.value",
    "enhancedRevealDetails.frameProfile.type",
    "enhancedRevealDetails.stopType.type",
    "conditionAssessment.frameCondition.rating",
    "conditionAssessment.doorCondition.rating",
    "conditionAssessment.hardwareCondition.rating",
  ];

  for (const fieldPath of fieldsToLearn) {
    const current = getNestedValue(updated, fieldPath);
    const parentPath = fieldPath.substring(0, fieldPath.lastIndexOf("."));
    const parent = getNestedValue(updated, parentPath);

    if (!parent || !parent.manualInputRequired) continue;

    const adjustment = computeLearnedAdjustments(overrides, fieldPath, currentContext);
    if (!adjustment) continue;

    setNestedValue(updated, fieldPath, adjustment.suggestedValue);

    const confidencePath = parentPath + ".confidence";
    const currentConfidence = getNestedValue(updated, confidencePath);
    if (typeof currentConfidence === "number") {
      setNestedValue(updated, confidencePath, Math.min(currentConfidence + adjustment.confidenceBoost, 0.95));
    }

    if (adjustment.matchRatio >= 0.7 && adjustment.sampleCount >= 5) {
      setNestedValue(updated, parentPath + ".manualInputRequired", false);
    }

    setNestedValue(updated, parentPath + ".learnedAdjustment", true);

    appliedLearning.push({
      fieldPath,
      originalValue: current,
      learnedValue: adjustment.suggestedValue,
      confidenceBoost: adjustment.confidenceBoost,
      sampleCount: adjustment.sampleCount,
      matchRatio: adjustment.matchRatio,
    });
  }

  return { updatedAnalysis: updated, appliedLearning };
}

function buildContextFromAnalysis(analysis: any): Record<string, any> {
  const ctx: Record<string, any> = {};

  if (analysis.materialIdentification) {
    const mat = analysis.materialIdentification;
    if (mat.frameMaterial?.type) ctx.frameMaterialType = mat.frameMaterial.type;
    if (mat.doorMaterial?.type) ctx.doorMaterialType = mat.doorMaterial.type;
  }

  if (analysis.enhancedRevealDetails?.frameProfile) {
    const fp = analysis.enhancedRevealDetails.frameProfile;
    if (fp.throatDepthMM) ctx.throatDepthMM = fp.throatDepthMM;
    if (fp.rabbetDepthMM) ctx.rabbetDepthMM = fp.rabbetDepthMM;
  }

  return ctx;
}

function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] == null) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

export function buildOverrideContext(
  metrics: { width?: number; height?: number; frameDepth?: number },
  materialHints?: { frameMaterial?: string; doorMaterial?: string; installation?: string }
): Record<string, any> {
  const ctx: Record<string, any> = {};
  if (metrics.width) ctx.widthMM = metrics.width;
  if (metrics.height) ctx.heightMM = metrics.height;
  if (metrics.frameDepth) ctx.frameDepthMM = metrics.frameDepth;
  if (materialHints?.frameMaterial) ctx.frameMaterialHint = materialHints.frameMaterial;
  if (materialHints?.doorMaterial) ctx.doorMaterialHint = materialHints.doorMaterial;
  if (materialHints?.installation) ctx.installationHint = materialHints.installation;
  return ctx;
}
