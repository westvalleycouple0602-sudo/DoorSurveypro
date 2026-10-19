// A/B Test Pricing Variants for DoorSurvey Pro
// This allows testing different pricing strategies without committing to changes

export type PricingVariant = "current" | "optimized";

// Pricing Variant A: Current Pricing (Control)
export const PRICING_VARIANT_CURRENT = {
  starter: {
    priceMonthly: 3900, // $39/month
    priceAnnual: 31200, // $312/year (33% off)
  },
  professional: {
    priceMonthly: 12900, // $129/month
    priceAnnual: 103200, // $1,032/year (33% off)
  },
  enterprise: {
    priceMonthly: 39900, // $399/month
    priceAnnual: 319200, // $3,192/year (33% off)
  },
} as const;

// Pricing Variant B: Optimized Pricing (Test)
// Based on market analysis and value-based pricing assessment
export const PRICING_VARIANT_OPTIMIZED = {
  starter: {
    priceMonthly: 4900, // $49/month (+26% increase)
    priceAnnual: 39200, // $392/year (33% off)
  },
  professional: {
    priceMonthly: 12900, // $129/month (no change - already well-positioned)
    priceAnnual: 103200, // $1,032/year (33% off)
  },
  enterprise: {
    priceMonthly: 49900, // $499/month (+25% increase)
    priceAnnual: 399200, // $3,992/year (33% off)
  },
} as const;

// Add-on pricing (same across all variants)
export const ADDON_PRICING = {
  manufacturerDb: {
    priceMonthly: 4900, // $49/month
    priceAnnual: 39200, // $392/year (33% off)
  },
  aiDiagnostics: {
    priceMonthly: 7900, // $79/month
    priceAnnual: 63200, // $632/year (33% off)
  },
  offlineSyncPack: {
    priceMonthly: 2000, // $20/month
    priceAnnual: 16000, // $160/year (33% off)
  },
} as const;

// Get pricing for a specific variant
export function getPricingVariant(variant: PricingVariant) {
  switch (variant) {
    case "optimized":
      return PRICING_VARIANT_OPTIMIZED;
    case "current":
    default:
      return PRICING_VARIANT_CURRENT;
  }
}

// Default variant (can be changed for A/B testing)
export const DEFAULT_PRICING_VARIANT: PricingVariant = "current";

// A/B Test Configuration
export interface ABTestConfig {
  enabled: boolean;
  variant: PricingVariant;
  // Traffic split (0-100): percentage of users to show optimized pricing
  trafficSplitPercentage: number;
}

// A/B Test settings - modify this to control the test
export const AB_TEST_CONFIG: ABTestConfig = {
  enabled: true, // Set to true to enable A/B testing
  variant: "current", // Default variant when A/B testing is disabled
  trafficSplitPercentage: 20, // 20% of users see optimized pricing (conservative start)
};

// Determine which pricing variant to show for a user
// This uses a simple hash-based assignment for consistent variant selection
export function getPricingVariantForUser(userId?: string, organizationId?: string): PricingVariant {
  if (!AB_TEST_CONFIG.enabled) {
    return AB_TEST_CONFIG.variant;
  }

  // Use organization ID for consistent pricing across an org, fall back to user ID
  const identifier = organizationId || userId || Math.random().toString();
  
  // Simple hash function for consistent assignment
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to percentage (0-100)
  const percentage = Math.abs(hash) % 100;
  
  // Assign variant based on traffic split
  return percentage < AB_TEST_CONFIG.trafficSplitPercentage ? "optimized" : "current";
}

// Pricing comparison analysis
export function getPricingComparison() {
  return {
    starter: {
      current: PRICING_VARIANT_CURRENT.starter,
      optimized: PRICING_VARIANT_OPTIMIZED.starter,
      monthlyIncrease: PRICING_VARIANT_OPTIMIZED.starter.priceMonthly - PRICING_VARIANT_CURRENT.starter.priceMonthly,
      percentIncrease: ((PRICING_VARIANT_OPTIMIZED.starter.priceMonthly - PRICING_VARIANT_CURRENT.starter.priceMonthly) / PRICING_VARIANT_CURRENT.starter.priceMonthly * 100).toFixed(1),
    },
    professional: {
      current: PRICING_VARIANT_CURRENT.professional,
      optimized: PRICING_VARIANT_OPTIMIZED.professional,
      monthlyIncrease: PRICING_VARIANT_OPTIMIZED.professional.priceMonthly - PRICING_VARIANT_CURRENT.professional.priceMonthly,
      percentIncrease: ((PRICING_VARIANT_OPTIMIZED.professional.priceMonthly - PRICING_VARIANT_CURRENT.professional.priceMonthly) / PRICING_VARIANT_CURRENT.professional.priceMonthly * 100).toFixed(1),
    },
    enterprise: {
      current: PRICING_VARIANT_CURRENT.enterprise,
      optimized: PRICING_VARIANT_OPTIMIZED.enterprise,
      monthlyIncrease: PRICING_VARIANT_OPTIMIZED.enterprise.priceMonthly - PRICING_VARIANT_CURRENT.enterprise.priceMonthly,
      percentIncrease: ((PRICING_VARIANT_OPTIMIZED.enterprise.priceMonthly - PRICING_VARIANT_CURRENT.enterprise.priceMonthly) / PRICING_VARIANT_CURRENT.enterprise.priceMonthly * 100).toFixed(1),
    },
  };
}

// Format pricing variant for display
export function formatPricingVariant(variant: PricingVariant): string {
  return variant === "optimized" ? "Optimized Pricing" : "Current Pricing";
}

// Revenue impact calculator
export interface RevenueImpact {
  tier: string;
  customersCount: number;
  currentMRR: number;
  optimizedMRR: number;
  monthlyIncrease: number;
  annualIncrease: number;
}

export function calculateRevenueImpact(
  starterCount: number,
  professionalCount: number,
  enterpriseCount: number
): RevenueImpact[] {
  const impacts: RevenueImpact[] = [];

  // Starter tier impact
  if (starterCount > 0) {
    const currentMRR = (PRICING_VARIANT_CURRENT.starter.priceMonthly / 100) * starterCount;
    const optimizedMRR = (PRICING_VARIANT_OPTIMIZED.starter.priceMonthly / 100) * starterCount;
    impacts.push({
      tier: "Starter",
      customersCount: starterCount,
      currentMRR,
      optimizedMRR,
      monthlyIncrease: optimizedMRR - currentMRR,
      annualIncrease: (optimizedMRR - currentMRR) * 12,
    });
  }

  // Professional tier impact (no change)
  if (professionalCount > 0) {
    const currentMRR = (PRICING_VARIANT_CURRENT.professional.priceMonthly / 100) * professionalCount;
    const optimizedMRR = (PRICING_VARIANT_OPTIMIZED.professional.priceMonthly / 100) * professionalCount;
    impacts.push({
      tier: "Professional",
      customersCount: professionalCount,
      currentMRR,
      optimizedMRR,
      monthlyIncrease: optimizedMRR - currentMRR,
      annualIncrease: (optimizedMRR - currentMRR) * 12,
    });
  }

  // Enterprise tier impact
  if (enterpriseCount > 0) {
    const currentMRR = (PRICING_VARIANT_CURRENT.enterprise.priceMonthly / 100) * enterpriseCount;
    const optimizedMRR = (PRICING_VARIANT_OPTIMIZED.enterprise.priceMonthly / 100) * enterpriseCount;
    impacts.push({
      tier: "Enterprise",
      customersCount: enterpriseCount,
      currentMRR,
      optimizedMRR,
      monthlyIncrease: optimizedMRR - currentMRR,
      annualIncrease: (optimizedMRR - currentMRR) * 12,
    });
  }

  return impacts;
}
