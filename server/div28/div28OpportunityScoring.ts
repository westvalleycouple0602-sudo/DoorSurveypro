// server/div28/div28OpportunityScoring.ts
// Division 28 Opportunity Scoring Algorithm

import type {
  Div28SurveyAnswers,
  Div28OpportunitySummary,
  Div28Feature,
  RiskLevel,
} from "@shared/types/div28";

const RISK_MULTIPLIERS: Record<RiskLevel, number> = {
  LOW: 0.6,
  MEDIUM: 0.9,
  HIGH: 1.1,
  CRITICAL: 1.3,
};

const FEATURE_WEIGHTS: Partial<Record<Div28Feature, number>> = {
  ACCESS_CONTROL: 20,
  DOOR_AUTOMATION: 10,
  CONTROLLED_EGRESS: 12,
  DELAYED_EGRESS: 14,
  SURVEILLANCE: 10,
  INTRUSION_DETECTION: 10,
  GUN_DETECTION_READY: 18,
  LOCKDOWN_CONTROL: 14,
};

function determineRecommendedFeatures(survey: Div28SurveyAnswers): Div28Feature[] {
  const features: Div28Feature[] = [];

  if (survey.accessControlMode !== "NONE" && survey.accessControlMode !== "MECHANICAL_ONLY") {
    features.push("ACCESS_CONTROL");
  }

  if (survey.heavyOrHighTraffic || survey.adaPriority || survey.infectionControlPriority) {
    features.push("DOOR_AUTOMATION");
  }

  if (survey.egressType === "CONTROLLED_EGRESS") {
    features.push("CONTROLLED_EGRESS");
  }
  if (survey.egressType === "DELAYED_EGRESS") {
    features.push("DELAYED_EGRESS");
  }

  if (survey.surveillanceLevel !== "NONE") {
    features.push("SURVEILLANCE");
  }

  if (survey.intrusionLevel !== "NONE") {
    features.push("INTRUSION_DETECTION");
  }

  if (survey.gunDetectionIntent === "INTERESTED" || survey.gunDetectionIntent === "REQUIRED") {
    features.push("GUN_DETECTION_READY");
  }

  if (survey.lockdownCoverage !== "NONE") {
    features.push("LOCKDOWN_CONTROL");
  }

  return features;
}

function calculateRawScore(features: Div28Feature[]): number {
  let score = 0;
  for (const feature of features) {
    score += FEATURE_WEIGHTS[feature] ?? 0;
  }
  return score;
}

function buildNarrativeSummary(survey: Div28SurveyAnswers, features: Div28Feature[]): string {
  if (features.length === 0) {
    return "This opening does not require significant Division 28 electronic security components based on the survey responses.";
  }

  const parts: string[] = [];

  parts.push(`This ${survey.areaType.toLowerCase().replace(/_/g, " ")} opening`);
  parts.push(`has a ${survey.riskLevel.toLowerCase()} risk profile.`);

  if (features.includes("ACCESS_CONTROL")) {
    parts.push(`Electronic access control (${survey.accessControlMode.replace(/_/g, " ").toLowerCase()}) is recommended.`);
  }

  if (features.includes("DOOR_AUTOMATION")) {
    const reasons: string[] = [];
    if (survey.heavyOrHighTraffic) reasons.push("high traffic");
    if (survey.adaPriority) reasons.push("ADA priority");
    if (survey.infectionControlPriority) reasons.push("infection control");
    parts.push(`Door automation is recommended due to ${reasons.join(", ")}.`);
  }

  if (features.includes("CONTROLLED_EGRESS") || features.includes("DELAYED_EGRESS")) {
    parts.push(`Special egress requirements (${survey.egressType.replace(/_/g, " ").toLowerCase()}) apply to this opening.`);
  }

  if (features.includes("SURVEILLANCE")) {
    parts.push(`Video surveillance (${survey.surveillanceLevel.replace(/_/g, " ").toLowerCase()}) is specified.`);
  }

  if (features.includes("INTRUSION_DETECTION")) {
    parts.push(`Intrusion detection (${survey.intrusionLevel.replace(/_/g, " ").toLowerCase()}) is recommended.`);
  }

  if (features.includes("GUN_DETECTION_READY")) {
    parts.push(`Threat/gun detection capability is ${survey.gunDetectionIntent === "REQUIRED" ? "required" : "of interest"}.`);
  }

  if (features.includes("LOCKDOWN_CONTROL")) {
    parts.push(`This opening is part of a ${survey.lockdownCoverage.replace(/_/g, " ").toLowerCase()} lockdown protocol.`);
  }

  return parts.join(" ");
}

function buildWarnings(survey: Div28SurveyAnswers): string[] {
  const warnings: string[] = [];

  if (survey.unsureAboutEgressCode) {
    warnings.push("Egress code requirements are uncertain – engineering review recommended.");
  }

  if (survey.riskLevel === "CRITICAL" && survey.accessControlMode === "NONE") {
    warnings.push("Critical risk area with no access control specified – review security requirements.");
  }

  if (survey.gunDetectionIntent === "REQUIRED" && survey.surveillanceLevel === "NONE") {
    warnings.push("Gun detection required but no surveillance specified – camera coverage may be needed.");
  }

  if (survey.lockdownCoverage !== "NONE" && survey.accessControlMode === "MECHANICAL_ONLY") {
    warnings.push("Lockdown coverage specified but only mechanical locking – electronic control may be required.");
  }

  return warnings;
}

function determineTier(score: number): "NONE" | "LOW" | "MEDIUM" | "HIGH" {
  if (score === 0) return "NONE";
  if (score < 25) return "LOW";
  if (score < 50) return "MEDIUM";
  return "HIGH";
}

export function computeDiv28Opportunity(survey: Div28SurveyAnswers): Div28OpportunitySummary {
  const features = determineRecommendedFeatures(survey);
  const rawScore = calculateRawScore(features);
  const multiplier = RISK_MULTIPLIERS[survey.riskLevel] ?? 1;
  const adjustedScore = Math.min(Math.round(rawScore * multiplier), 100);
  const tier = determineTier(adjustedScore);

  return {
    openingId: survey.openingId,
    score: adjustedScore,
    tier,
    recommendedFeatures: features,
    narrativeSummary: buildNarrativeSummary(survey, features),
    warnings: buildWarnings(survey),
  };
}
