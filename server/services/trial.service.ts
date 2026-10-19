import { db } from "../db";
import { organizations } from "@shared/schemas/auth.schema";
import { and, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { logger } from "../logger";
import { evaluateTrialEligibility, evaluateTrialStatus, shouldExpireTrial } from "./trial-policy";

export interface TrialEligibility {
  eligible: boolean;
  reason?: string;
  availableTiers: string[];
  recommendedTier?: string;
}

export interface TrialConfig {
  tier: "professional" | "enterprise";
  durationDays?: number;
}

export interface TrialStatus {
  isActive: boolean;
  tier?: string;
  endsAt?: Date;
  daysRemaining?: number;
  totalDays?: number; // Total trial duration in days (14 for Professional, 7 for Enterprise)
  isInGracePeriod: boolean;
  gracePeriodEndsAt?: Date;
  organizationChanged?: boolean;
}

// Trial duration configurations
const TRIAL_CONFIGS: Record<string, number> = {
  professional: 14, // 14-day Professional trial
  enterprise: 7,    // 7-day Enterprise trial
};

const GRACE_PERIOD_DAYS = 7; // 7-day grace period after payment failure

/**
 * Clear trial-related fields when upgrading subscription tier
 * This ensures clean state with no residual trial indicators
 * Should be called when:
 * - Upgrading to a paid tier
 * - Converting trial to paid subscription
 * - Upgrading to master account
 */
export async function clearTrialStatusOnUpgrade(
  organizationId: string,
  newTier: string,
  newStatus: "active" | "trialing" = "active"
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      subscriptionTier: newTier,
      subscriptionStatus: newStatus,
      updatedAt: new Date(),
    };

    // Only clear trial fields if upgrading to active (not starting a new trial)
    if (newStatus === "active") {
      updateData.trialEndsAt = null;
      updateData.gracePeriodEndDate = null;
      updateData.trialTier = null;
      updateData.trialNotificationsSent = {};
    }

    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, organizationId));

    logger.info("Cleared trial status on upgrade", {
      organizationId,
      newTier,
      newStatus,
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to clear trial status on upgrade", {
      error,
      organizationId,
      newTier,
    });
    return {
      success: false,
      error: "Failed to clear trial status",
    };
  }
}

/**
 * Check if an organization is eligible for a trial
 */
export async function checkTrialEligibility(
  organizationId: string
): Promise<TrialEligibility> {
  try {
    const org = await db
      .select({
        subscriptionTier: organizations.subscriptionTier,
        subscriptionStatus: organizations.subscriptionStatus,
        stripeSubscriptionId: organizations.stripeSubscriptionId,
        trialEndsAt: organizations.trialEndsAt,
        trialTier: organizations.trialTier,
        gracePeriodEndDate: organizations.gracePeriodEndDate,
        hasTriedProfessional: organizations.hasTriedProfessional,
        hasTriedEnterprise: organizations.hasTriedEnterprise,
        lastDowngradeDate: organizations.lastDowngradeDate,
        isMasterAccount: organizations.isMasterAccount,
        isBetaTester: organizations.isBetaTester,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org || org.length === 0) {
      throw new Error("Organization not found");
    }

    return evaluateTrialEligibility(org[0]);
  } catch (error) {
    logger.error("Failed to check trial eligibility", { errorMessage: error instanceof Error ? error.message : String(error), organizationId });
    throw error;
  }
}

/**
 * Activate a trial for an organization
 */
export async function activateTrial(
  organizationId: string,
  config: TrialConfig
): Promise<{ success: boolean; error?: string; trialEndsAt?: Date }> {
  try {
    // First check eligibility
    const eligibility = await checkTrialEligibility(organizationId);

    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason || "Not eligible for trial",
      };
    }

    if (!eligibility.availableTiers.includes(config.tier)) {
      return {
        success: false,
        error: `${config.tier} trial is not available. Available tiers: ${eligibility.availableTiers.join(", ")}`,
      };
    }

    // Calculate trial end date
    const trialEndsAt = new Date();
    const durationDays = TRIAL_CONFIGS[config.tier] || config.durationDays || 14;
    trialEndsAt.setDate(trialEndsAt.getDate() + durationDays);

    // Mark this tier as tried and activate the trial
    const updateData: any = {
      subscriptionTier: config.tier,
      subscriptionStatus: "trialing",
      trialEndsAt,
      trialTier: config.tier,
      gracePeriodEndDate: null,
      trialNotificationsSent: {},
      updatedAt: new Date(),
    };

    // Mark the appropriate tier flag as used
    if (config.tier === "professional") {
      updateData.hasTriedProfessional = true;
    } else if (config.tier === "enterprise") {
      updateData.hasTriedEnterprise = true;
    }

    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, organizationId));

    logger.info("Trial activated", {
      organizationId,
      tier: config.tier,
      durationDays,
      trialEndsAt,
    });

    return {
      success: true,
      trialEndsAt,
    };
  } catch (error) {
    logger.error("Failed to activate trial", { errorMessage: error instanceof Error ? error.message : String(error), organizationId, config });
    throw error;
  }
}

/**
 * Get current trial status for an organization
 * Auto-downgrades expired trials if necessary
 */
export async function getTrialStatus(
  organizationId: string
): Promise<TrialStatus> {
  try {
    const org = await db
      .select({
        subscriptionTier: organizations.subscriptionTier,
        subscriptionStatus: organizations.subscriptionStatus,
        stripeSubscriptionId: organizations.stripeSubscriptionId,
        trialEndsAt: organizations.trialEndsAt,
        trialTier: organizations.trialTier,
        gracePeriodEndDate: organizations.gracePeriodEndDate,
        isMasterAccount: organizations.isMasterAccount,
        isBetaTester: organizations.isBetaTester,
        version: sql<string>`${organizations}.xmin::text`,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org || org.length === 0) {
      throw new Error("Organization not found");
    }

    const orgData = org[0];
    const now = new Date();

    if (shouldExpireTrial(orgData, now)) {
      logger.info("Auto-downgrading expired trial", {
        organizationId,
        subscriptionStatus: orgData.subscriptionStatus,
        trialEndsAt: orgData.trialEndsAt,
        gracePeriodEndDate: orgData.gracePeriodEndDate,
      });

      const result = await downgradeToFree(organizationId, orgData);
      if (!result.success) throw new Error(result.error || "Failed to expire trial");
      return { isActive: false, isInGracePeriod: false, organizationChanged: true };
    }

    return evaluateTrialStatus(orgData, now);
  } catch (error) {
    logger.error("Failed to get trial status", { errorMessage: error instanceof Error ? error.message : String(error), organizationId });
    throw error;
  }
}

/**
 * Start grace period after payment failure
 */
export async function startGracePeriod(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const gracePeriodEndDate = new Date();
    gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + GRACE_PERIOD_DAYS);

    await db
      .update(organizations)
      .set({
        gracePeriodEndDate,
        subscriptionStatus: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    logger.info("Grace period started", {
      organizationId,
      gracePeriodEndDate,
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error("Failed to start grace period", { error, organizationId });
    return {
      success: false,
      error: "Failed to start grace period",
    };
  }
}

/**
 * Downgrade organization to Free tier after trial/grace period expiration
 */
export async function downgradeToFree(
  organizationId: string,
  expected?: { subscriptionTier: string; subscriptionStatus: string; version: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const changed = await db
      .update(organizations)
      .set({
        subscriptionTier: "free",
        subscriptionStatus: "active",
        trialEndsAt: null,
        gracePeriodEndDate: null,
        lastDowngradeDate: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(organizations.id, organizationId),
        or(isNull(organizations.isMasterAccount), ne(organizations.isMasterAccount, "yes")),
        or(isNull(organizations.isBetaTester), ne(organizations.isBetaTester, "yes")),
        inArray(organizations.subscriptionStatus, ["trialing", "past_due"]),
        or(isNull(organizations.stripeSubscriptionId), eq(organizations.stripeSubscriptionId, "")),
        inArray(organizations.trialTier, ["professional", "enterprise"]),
        eq(organizations.subscriptionTier, organizations.trialTier),
        isNotNull(organizations.trialEndsAt),
        ...(expected ? [
          eq(organizations.subscriptionTier, expected.subscriptionTier),
          eq(organizations.subscriptionStatus, expected.subscriptionStatus),
          sql`${organizations}.xmin::text = ${expected.version}`,
        ] : []),
      ))
      .returning({ id: organizations.id });
    if (changed.length === 0) {
      return { success: false, error: "Trial state changed or this account cannot be downgraded; please retry." };
    }

    logger.info("Organization downgraded to Free tier", {
      organizationId,
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error("Failed to downgrade organization", { errorMessage: error instanceof Error ? error.message : String(error), organizationId });
    return {
      success: false,
      error: "Failed to downgrade organization",
    };
  }
}
