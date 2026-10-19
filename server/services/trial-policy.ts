export const TRIAL_CONFIGS: Record<string, number> = { professional: 14, enterprise: 7 };
const DAY_MS = 86_400_000;

export interface TrialRecord {
  subscriptionTier: string;
  subscriptionStatus: string;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  trialTier: string | null;
  gracePeriodEndDate: Date | null;
  isMasterAccount: string | null;
  isBetaTester: string | null;
  hasTriedProfessional?: boolean | null;
  hasTriedEnterprise?: boolean | null;
}

export interface TrialStatus {
  isActive: boolean;
  tier?: string;
  endsAt?: Date;
  daysRemaining?: number;
  totalDays?: number;
  isInGracePeriod: boolean;
  gracePeriodEndsAt?: Date;
}

export interface TrialEligibility {
  eligible: boolean;
  reason?: string;
  availableTiers: string[];
  recommendedTier?: string;
}

function time(date: Date | null): number | undefined {
  if (!date) return undefined;
  const value = new Date(date).getTime();
  if (!Number.isFinite(value)) throw new Error("Invalid stored trial date");
  return value;
}

export function isProtectedAccount(org: TrialRecord): boolean {
  return org.isMasterAccount === "yes" || org.isBetaTester === "yes";
}

export function isCurrentTrial(org: TrialRecord): boolean {
  return !isProtectedAccount(org) &&
    (org.stripeSubscriptionId === null || org.stripeSubscriptionId === "") &&
    (org.trialTier === "professional" || org.trialTier === "enterprise") &&
    org.subscriptionTier === org.trialTier &&
    ["trialing", "past_due"].includes(org.subscriptionStatus);
}

export function evaluateTrialStatus(org: TrialRecord, now = new Date()): TrialStatus {
  const inactive = { isActive: false, isInGracePeriod: false };
  if (!isCurrentTrial(org)) return inactive;
  const end = time(org.trialEndsAt);
  const grace = time(org.gracePeriodEndDate);
  const tier = org.trialTier || org.subscriptionTier;
  if (org.subscriptionStatus === "trialing" && end !== undefined && end > now.getTime()) {
    return {
      isActive: true, isInGracePeriod: false, tier,
      endsAt: new Date(end),
      daysRemaining: Math.ceil((end - now.getTime()) / DAY_MS),
      totalDays: TRIAL_CONFIGS[tier] || 14,
    };
  }
  if (grace !== undefined && grace > now.getTime()) {
    return { isActive: false, isInGracePeriod: true, gracePeriodEndsAt: new Date(grace), tier };
  }
  return inactive;
}

export function shouldExpireTrial(org: TrialRecord, now = new Date()): boolean {
  if (!isCurrentTrial(org)) return false;
  const end = time(org.trialEndsAt);
  const grace = time(org.gracePeriodEndDate);
  return end !== undefined && end <= now.getTime() && (grace === undefined || grace <= now.getTime());
}

export function evaluateTrialEligibility(org: TrialRecord, now = new Date()): TrialEligibility {
  const denied = (reason: string): TrialEligibility => ({ eligible: false, reason, availableTiers: [] });
  if (isProtectedAccount(org)) return denied("This account already has full access and does not need a trial.");
  if (org.stripeSubscriptionId) return denied("Already on a paid subscription");
  const status = evaluateTrialStatus(org, now);
  if (status.isActive) return denied(`Already in an active ${status.tier} trial`);
  if (status.isInGracePeriod) return denied("A grace period is still active.");
  if (!["free", "starter"].includes(org.subscriptionTier) && !shouldExpireTrial(org, now)) return denied("Already on a paid subscription");
  const availableTiers = [
    ...(!org.hasTriedProfessional && org.trialTier !== "professional" ? ["professional"] : []),
    ...(!org.hasTriedEnterprise && org.trialTier !== "enterprise" ? ["enterprise"] : []),
  ];
  if (!availableTiers.length) return denied("You have already used all available trials.");
  return { eligible: true, availableTiers, recommendedTier: availableTiers[0] };
}
