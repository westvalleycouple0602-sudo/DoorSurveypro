import { useState, useCallback } from "react";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { SUBSCRIPTION_TIERS, type SubscriptionTier, type SubscriptionAddon, canAccessFeature } from "@shared/subscriptions";

export type FeatureKey = keyof typeof SUBSCRIPTION_TIERS.free.features;

export interface UpsellConfig {
  featureName: string;
  featureDescription: string;
  requiredTier?: SubscriptionTier;
  requiredAddon?: SubscriptionAddon;
}

export function useFeatureAccess() {
  const { user } = useAuth();
  const [upsellConfig, setUpsellConfig] = useState<UpsellConfig | null>(null);

  const currentTier = (user?.organization?.subscriptionTier as SubscriptionTier) || "free";
  const activeAddons = ((user?.organization as any)?.activeAddons as SubscriptionAddon[]) || [];

  const hasFeatureAccess = useCallback((
    feature: Exclude<FeatureKey, "projectLimit" | "userLimit" | "barcodeScanLimit">
  ): boolean => {
    // Check if feature is included in tier
    const inTier = canAccessFeature(currentTier, feature);
    
    // For engineeringReview, also check if they have the add-on
    if (!inTier && feature === "engineeringReview") {
      return activeAddons.includes("engineeringReview");
    }
    
    return inTier;
  }, [currentTier, activeAddons]);

  const hasAddon = useCallback((addon: SubscriptionAddon): boolean => {
    return activeAddons.includes(addon);
  }, [activeAddons]);

  const requireFeature = useCallback((
    feature: Exclude<FeatureKey, "projectLimit" | "userLimit" | "barcodeScanLimit">,
    config: Omit<UpsellConfig, 'requiredTier'>
  ): boolean => {
    if (hasFeatureAccess(feature)) {
      return true;
    }

    // Determine which tier unlocks this feature
    const tiers: SubscriptionTier[] = ["starter", "professional", "enterprise"];
    const requiredTier = tiers.find(tier => canAccessFeature(tier, feature)) || "professional";

    setUpsellConfig({
      ...config,
      requiredTier,
    });

    return false;
  }, [hasFeatureAccess]);

  const requireAddon = useCallback((
    addon: SubscriptionAddon,
    config: Omit<UpsellConfig, 'requiredAddon'>
  ): boolean => {
    // Check if user already has the add-on
    if (hasAddon(addon)) {
      return true;
    }

    // Show upsell dialog for the add-on
    setUpsellConfig({
      ...config,
      requiredAddon: addon,
    });

    return false;
  }, [hasAddon]);

  const closeUpsell = useCallback(() => {
    setUpsellConfig(null);
  }, []);

  return {
    currentTier,
    activeAddons,
    hasFeatureAccess,
    hasAddon,
    requireFeature,
    requireAddon,
    upsellConfig,
    closeUpsell,
  };
}
