// Feature gates and usage limits middleware for subscription tiers
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { getOrganizationContext } from "./clerkAuth";
import { db } from "./db";
import { memberships, hardwareScans } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { 
  SUBSCRIPTION_TIERS, 
  checkUsageLimit, 
  canAccessFeature,
  type SubscriptionTier 
} from "@shared/subscriptions";

/**
 * Middleware to check if organization can create a project based on tier limits
 */
export async function checkProjectLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Bypass check in development mode for mock organizations
    if (process.env.NODE_ENV === 'development' && orgContext.organizationId === 'dev-org-001') {
      return next();
    }

    const organization = await storage.getOrganization(orgContext.organizationId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Bypass check for master accounts
    if (organization.isMasterAccount === "yes" || organization.subscriptionTier === "master") {
      return next();
    }

    // Bypass check for beta testers (have unlimited enterprise access)
    if (organization.isBetaTester === "yes") {
      return next();
    }

    // Get current project count
    const projects = await storage.getProjects(organization.id);
    const currentCount = projects.length;

    // Check limit
    const { allowed, limit } = checkUsageLimit(
      organization.subscriptionTier as SubscriptionTier,
      "projectLimit",
      currentCount
    );

    if (!allowed) {
      return res.status(403).json({
        error: "Project limit reached",
        message: `Your ${organization.subscriptionTier} plan allows ${limit} projects. Upgrade to create more.`,
        limit,
        current: currentCount,
        tier: organization.subscriptionTier,
      });
    }

    next();
  } catch (error) {
    console.error("Project limit check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Middleware to check if organization can invite users based on tier limits
 */
export async function checkUserLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Bypass check in development mode for mock organizations
    if (process.env.NODE_ENV === 'development' && orgContext.organizationId === 'dev-org-001') {
      return next();
    }

    const organization = await storage.getOrganization(orgContext.organizationId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Bypass check for master accounts
    if (organization.isMasterAccount === "yes" || organization.subscriptionTier === "master") {
      return next();
    }

    // Bypass check for beta testers (have unlimited enterprise access)
    if (organization.isBetaTester === "yes") {
      return next();
    }

    // Get current user count from database (not storage)
    // CRITICAL: Must query database to match /api/team/usage and actual membership state
    const teamMemberships = await db
      .select()
      .from(memberships)
      .where(eq(memberships.organizationId, organization.id));
    const currentCount = teamMemberships.length;

    // Check limit
    const { allowed, limit } = checkUsageLimit(
      organization.subscriptionTier as SubscriptionTier,
      "userLimit",
      currentCount
    );

    if (!allowed) {
      return res.status(403).json({
        error: "User limit reached",
        message: `Your ${organization.subscriptionTier} plan allows ${limit} users. Upgrade to add more.`,
        limit,
        current: currentCount,
        tier: organization.subscriptionTier,
      });
    }

    next();
  } catch (error) {
    console.error("User limit check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Middleware to check if organization can scan barcodes based on daily tier limits
 * Limits reset at midnight UTC
 */
export async function checkBarcodeScanLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Bypass check in development mode for mock organizations
    if (process.env.NODE_ENV === 'development' && orgContext.organizationId === 'dev-org-001') {
      return next();
    }

    const organization = await storage.getOrganization(orgContext.organizationId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Bypass check for master accounts
    if (organization.isMasterAccount === "yes" || organization.subscriptionTier === "master") {
      return next();
    }

    // Bypass check for beta testers (have unlimited enterprise access)
    if (organization.isBetaTester === "yes") {
      return next();
    }

    // Get today's scan count from database
    // Calculate start of today in UTC
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const todayScans = await db
      .select()
      .from(hardwareScans)
      .where(
        and(
          eq(hardwareScans.organizationId, organization.id),
          gte(hardwareScans.scannedAt, todayStart)
        )
      );
    
    const currentCount = todayScans.length;

    // Check limit
    const { allowed, limit } = checkUsageLimit(
      organization.subscriptionTier as SubscriptionTier,
      "barcodeScanLimit",
      currentCount
    );

    if (!allowed) {
      // Calculate when the limit resets (next UTC midnight)
      const tomorrow = new Date(todayStart);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      
      return res.status(403).json({
        error: "Barcode scan limit reached",
        message: `Your ${organization.subscriptionTier} plan allows ${limit} scans per day. Limit resets at midnight UTC.`,
        limit,
        current: currentCount,
        tier: organization.subscriptionTier,
        resetsAt: tomorrow.toISOString(),
      });
    }

    next();
  } catch (error) {
    console.error("Barcode scan limit check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Middleware factory to check feature access (including add-on support)
 */
export function requireFeature(feature: "customCatalogs" | "apiAccess" | "prioritySupport" | "advancedReporting" | "engineeringReview" | "aiAudits" | "crmSync") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Bypass check in development mode for mock organizations
      // EXCEPT for engineeringReview which should be properly tested even in dev
      const shouldBypass = process.env.NODE_ENV === 'development' && 
                           orgContext.organizationId === 'dev-org-001' &&
                           feature !== 'engineeringReview';
      
      if (shouldBypass) {
        return next();
      }

      const organization = await storage.getOrganization(orgContext.organizationId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Bypass check for master accounts - they have access to all features
      if (organization.isMasterAccount === "yes" || organization.subscriptionTier === "master") {
        return next();
      }

      // Bypass check for beta testers - they have access to all enterprise features
      if (organization.isBetaTester === "yes") {
        return next();
      }

      // Check if organization is in an active trial or grace period
      const now = new Date();
      const isInTrial = 
        organization.subscriptionStatus === "trialing" &&
        organization.trialEndsAt !== null &&
        new Date(organization.trialEndsAt) > now;
      
      const isInGracePeriod =
        organization.gracePeriodEndDate !== null &&
        new Date(organization.gracePeriodEndDate) > now;

      // Determine effective tier (trial tier or subscription tier)
      const effectiveTier = (isInTrial || isInGracePeriod)
        ? (organization.trialTier || organization.subscriptionTier)
        : organization.subscriptionTier;

      // Check if feature is included in tier
      let hasAccess = canAccessFeature(
        effectiveTier as SubscriptionTier,
        feature
      );

      // For engineeringReview, also check if they have the add-on
      if (!hasAccess && feature === "engineeringReview") {
        const activeAddons = (organization.activeAddons as string[]) || [];
        hasAccess = activeAddons.includes("engineeringReview");
      }

      if (!hasAccess) {
        const tierInfo = SUBSCRIPTION_TIERS[organization.subscriptionTier as SubscriptionTier];
        
        // Provide different messages for add-on vs tier-locked features
        let message = `This feature requires a higher plan. Your current plan: ${tierInfo?.name || "Free"}`;
        if (feature === "engineeringReview") {
          message = `Engineering Review requires the Enterprise plan or Engineering Review add-on. Your current plan: ${tierInfo?.name || "Free"}`;
        }
        
        return res.status(403).json({
          error: "Feature not available",
          message,
          feature,
          tier: organization.subscriptionTier,
          addonAvailable: feature === "engineeringReview",
        });
      }

      next();
    } catch (error) {
      console.error("Feature gate check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

/**
 * Helper to get organization tier info for response enrichment
 */
export async function enrichWithTierInfo(req: Request): Promise<{
  tier: SubscriptionTier;
  limits: {
    projects: { current: number; limit: number | null };
    users: { current: number; limit: number | null };
  };
  features: {
    customCatalogs: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    advancedReporting: boolean;
  };
} | null> {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) return null;

    const organization = await storage.getOrganization(orgContext.organizationId);
    if (!organization) return null;

    const tier = organization.subscriptionTier as SubscriptionTier;
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    const projects = await storage.getProjects(organization.id);
    const memberships = await storage.getOrganizationMemberships(organization.id);

    return {
      tier,
      limits: {
        projects: {
          current: projects.length,
          limit: tierConfig.features.projectLimit,
        },
        users: {
          current: memberships.length,
          limit: tierConfig.features.userLimit,
        },
      },
      features: {
        customCatalogs: tierConfig.features.customCatalogs,
        apiAccess: tierConfig.features.apiAccess,
        prioritySupport: tierConfig.features.prioritySupport,
        advancedReporting: tierConfig.features.advancedReporting,
      },
    };
  } catch (error) {
    console.error("Tier info enrichment error:", error);
    return null;
  }
}
