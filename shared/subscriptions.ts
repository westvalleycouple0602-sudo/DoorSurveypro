// Subscription tier definitions and feature limits
// Updated pricing aligned with commercial door surveying industry (October 2025)
// Note: For A/B test pricing variants, see shared/pricing-variants.ts

export type BillingInterval = "monthly" | "annual";

export const TRIAL_DAYS = 14; // 14-day free trial on all paid plans

// Add-on pricing (in cents)
export const SUBSCRIPTION_ADDONS = {
  manufacturerDb: {
    name: "Manufacturer Database Access",
    description: "Extended barcode & hardware data",
    priceMonthly: 4900, // $49/month
    priceAnnual: 39200, // $392/year (33% off)
  },
  aiDiagnostics: {
    name: "Advanced Analytics / AI Diagnostics",
    description: "Track app health & UX signals",
    priceMonthly: 7900, // $79/month
    priceAnnual: 63200, // $632/year (33% off)
  },
  offlineSyncPack: {
    name: "Offline Sync Expansion",
    description: "Add 5 more field devices to a plan",
    priceMonthly: 2000, // $20/month
    priceAnnual: 16000, // $160/year (33% off)
  },
  engineeringReview: {
    name: "Engineering Review",
    description: "Professional quote review workflow with approvals",
    priceMonthly: 9900, // $99/month
    priceAnnual: 79200, // $792/year (33% off)
  },
} as const;

export type SubscriptionAddon = keyof typeof SUBSCRIPTION_ADDONS;

// Core subscription tiers with monthly and annual pricing (20% annual discount)
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    features: {
      projectLimit: 3,
      userLimit: 1,
      barcodeScanLimit: 5, // 5 scans/day
      customCatalogs: false,
      apiAccess: false,
      prioritySupport: false,
      advancedReporting: false,
      manufacturerAutoDocs: false,
      liveDistributorPricing: false,
      calendarSync: false,
      aiAudits: false,
      crmSync: false,
      dedicatedSuccessManager: false,
      engineeringReview: false,
      masterKeying: false, // Master Key System for locksmith facility management
    },
  },
  starter: {
    name: "Starter / Solo",
    description: "For independent sales associates & consultants",
    priceMonthly: 3900, // $39/month
    priceAnnual: 31200, // $312/year (33% off)
    features: {
      projectLimit: 5,
      userLimit: 1,
      barcodeScanLimit: 10, // 10 scans/day
      customCatalogs: false,
      apiAccess: false,
      prioritySupport: false,
      advancedReporting: false,
      manufacturerAutoDocs: false,
      liveDistributorPricing: false,
      calendarSync: false,
      aiAudits: false,
      crmSync: false,
      dedicatedSuccessManager: false,
      engineeringReview: false,
      masterKeying: false, // Master Key System for locksmith facility management
    },
  },
  professional: {
    name: "Professional / Team",
    description: "For small to mid-size distributors and GC teams",
    priceMonthly: 12900, // $129/month
    priceAnnual: 103200, // $1,032/year (33% off)
    popular: true, // Most popular tier
    features: {
      projectLimit: null, // unlimited
      userLimit: 10,
      barcodeScanLimit: null, // unlimited
      customCatalogs: true,
      apiAccess: false,
      prioritySupport: true,
      advancedReporting: true,
      manufacturerAutoDocs: true,
      liveDistributorPricing: true,
      calendarSync: true,
      aiAudits: false,
      crmSync: false,
      dedicatedSuccessManager: false,
      engineeringReview: false, // Available as add-on for Professional
      masterKeying: true, // Master Key System for locksmith facility management
    },
  },
  enterprise: {
    name: "Enterprise / Integration",
    description: "For large distributors, nationals, and manufacturers",
    priceMonthly: 39900, // $399/month
    priceAnnual: 319200, // $3,192/year (33% off)
    features: {
      projectLimit: null, // unlimited
      userLimit: null, // unlimited
      barcodeScanLimit: null, // unlimited
      customCatalogs: true,
      apiAccess: true,
      prioritySupport: true,
      advancedReporting: true,
      manufacturerAutoDocs: true,
      liveDistributorPricing: true,
      calendarSync: true,
      aiAudits: true,
      crmSync: true,
      dedicatedSuccessManager: true,
      engineeringReview: true, // Included in Enterprise
      masterKeying: true, // Master Key System for locksmith facility management
    },
  },
  master: {
    name: "Master Account",
    description: "Internal administrative account",
    priceMonthly: 0, // Free forever
    priceAnnual: 0,
    features: {
      projectLimit: null, // unlimited
      userLimit: null, // unlimited
      barcodeScanLimit: null, // unlimited
      customCatalogs: true,
      apiAccess: true,
      prioritySupport: true,
      advancedReporting: true,
      manufacturerAutoDocs: true,
      liveDistributorPricing: true,
      calendarSync: true,
      aiAudits: true,
      crmSync: true,
      dedicatedSuccessManager: true,
      engineeringReview: true, // Full access for master
      masterKeying: true, // Master Key System for locksmith facility management
    },
  },
  // Legacy tier mapping (for backward compatibility with existing "pro" subscriptions)
  pro: {
    name: "Pro (Legacy)",
    description: "Legacy plan - automatically upgraded to Professional",
    priceMonthly: 12900, // Maps to Professional pricing
    priceAnnual: 103200,
    features: {
      projectLimit: null, // unlimited
      userLimit: 10,
      barcodeScanLimit: null, // unlimited
      customCatalogs: true,
      apiAccess: false,
      prioritySupport: true,
      advancedReporting: true,
      manufacturerAutoDocs: true,
      liveDistributorPricing: true,
      calendarSync: true,
      aiAudits: false,
      crmSync: false,
      dedicatedSuccessManager: false,
      engineeringReview: false,
      masterKeying: true, // Master Key System for locksmith facility management
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing" | "incomplete" | "incomplete_expired";

// Feature gate helper to check if an organization can access a feature
export function canAccessFeature(
  tier: SubscriptionTier,
  feature: Exclude<keyof typeof SUBSCRIPTION_TIERS.free.features, "projectLimit" | "userLimit" | "barcodeScanLimit">
): boolean {
  const value = SUBSCRIPTION_TIERS[tier]?.features[feature];
  return typeof value === "boolean" ? value : false;
}

// Usage limit helper to check if an organization can perform an action
export function checkUsageLimit(
  tier: SubscriptionTier,
  limitType: "projectLimit" | "userLimit" | "barcodeScanLimit",
  currentCount: number
): { allowed: boolean; limit: number | null } {
  const limit = SUBSCRIPTION_TIERS[tier]?.features[limitType] ?? null;
  
  if (limit === null) {
    return { allowed: true, limit: null }; // unlimited
  }
  
  return {
    allowed: currentCount < limit,
    limit,
  };
}

// Get tier display information
export function getTierInfo(tier: SubscriptionTier) {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (!tierConfig) {
    return SUBSCRIPTION_TIERS.free;
  }
  return tierConfig;
}

// Get price for tier based on billing interval
export function getTierPrice(tier: SubscriptionTier, interval: BillingInterval): number {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (!tierConfig) return 0;
  return interval === "annual" ? tierConfig.priceAnnual : tierConfig.priceMonthly;
}

// Calculate annual savings percentage (actual discount based on pricing structure)
export function getAnnualSavingsPercent(): number {
  return 33; // 33% off annual billing (pay for 8 months, get 12)
}

// Format price in cents to display string
export function formatPrice(cents: number, interval: BillingInterval = "monthly"): string {
  const dollars = cents / 100;
  const formatted = dollars.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
  return interval === "annual" ? `${formatted}/year` : `${formatted}/month`;
}

// Get tier hierarchy for plan gating (used to check if tier meets minimum requirement)
const TIER_HIERARCHY: SubscriptionTier[] = ["free", "starter", "professional", "enterprise"];

export function meetsMinimumTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  // Master and pro (legacy) always have full access
  if (userTier === "master" || userTier === "pro") return true;
  
  const userIndex = TIER_HIERARCHY.indexOf(userTier);
  const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
  
  // If tier not found in hierarchy, deny access
  if (userIndex === -1 || requiredIndex === -1) return false;
  
  return userIndex >= requiredIndex;
}
