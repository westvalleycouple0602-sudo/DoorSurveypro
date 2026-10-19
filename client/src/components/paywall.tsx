import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Sparkles, Lock, TrendingUp, X } from "lucide-react";
import { SUBSCRIPTION_TIERS, SUBSCRIPTION_ADDONS, type SubscriptionTier, type SubscriptionAddon } from "@shared/subscriptions";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/rum";
import { useState, useEffect } from "react";

export type PaywallVariant = "fullPage" | "inlineCard" | "banner";
export type UpsellType = "tier" | "addon";

export interface PaywallProps {
  variant: PaywallVariant;
  featureName: string;
  featureDescription: string;
  requiredTier?: SubscriptionTier;
  requiredAddon?: SubscriptionAddon;
  currentTier: SubscriptionTier;
  type: UpsellType;
  onDismiss?: () => void;
  persistDismissal?: boolean; // For banner variant - persist dismissal in localStorage
}

// Helper to get localStorage key for dismissal
function getDismissalKey(featureName: string, variant: PaywallVariant): string {
  return `paywall_dismissed_${variant}_${featureName}`;
}

export function Paywall({
  variant,
  featureName,
  featureDescription,
  requiredTier,
  requiredAddon,
  currentTier,
  type,
  onDismiss,
  persistDismissal = true,
}: PaywallProps) {
  const [, setLocation] = useLocation();
  
  // Check if previously dismissed (for banner variant with persistence)
  const [dismissed, setDismissed] = useState(() => {
    if (variant === "banner" && persistDismissal) {
      try {
        const key = getDismissalKey(featureName, variant);
        return localStorage.getItem(key) === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  // Track when paywall is shown
  useEffect(() => {
    if (!dismissed) {
      trackEvent("paywall_shown", {
        variant,
        featureName,
        type,
        requiredTier,
        requiredAddon,
        currentTier,
      });
    }
  }, [variant, featureName, type, requiredTier, requiredAddon, currentTier, dismissed]);

  const handleUpgrade = () => {
    trackEvent("paywall_upgrade_clicked", {
      variant,
      featureName,
      type,
      requiredTier,
      requiredAddon,
      currentTier,
    });
    setLocation("/billing");
  };

  const handleDismiss = () => {
    trackEvent("paywall_dismissed", {
      variant,
      featureName,
      type,
      requiredTier,
      requiredAddon,
      currentTier,
    });
    setDismissed(true);
    
    // Persist banner dismissals to localStorage if enabled
    if (variant === "banner" && persistDismissal) {
      try {
        const key = getDismissalKey(featureName, variant);
        localStorage.setItem(key, "true");
      } catch {
        // Ignore localStorage errors
      }
    }
    
    onDismiss?.();
  };

  // Hide dismissed paywalls (banner and inlineCard support dismissal)
  if (dismissed && (variant === "banner" || variant === "inlineCard")) {
    return null;
  }

  const tierConfig = requiredTier ? SUBSCRIPTION_TIERS[requiredTier] : null;
  const addonConfig = requiredAddon ? SUBSCRIPTION_ADDONS[requiredAddon] : null;
  const currentTierConfig = SUBSCRIPTION_TIERS[currentTier];

  const features = tierConfig ? [
    tierConfig.features.projectLimit === null && "Unlimited projects",
    tierConfig.features.userLimit === null && "Unlimited team members",
    typeof tierConfig.features.userLimit === 'number' && `${tierConfig.features.userLimit} team members`,
    tierConfig.features.customCatalogs && "Custom product catalogs",
    tierConfig.features.advancedReporting && "Advanced reporting & analytics",
    tierConfig.features.prioritySupport && "Priority support",
    tierConfig.features.apiAccess && "API access for integrations",
    tierConfig.features.aiAudits && "AI diagnostics & audits",
    tierConfig.features.crmSync && "CRM synchronization",
  ].filter(Boolean) : [];

  // Full-page paywall variant
  if (variant === "fullPage") {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="bg-primary/10 rounded-full p-6">
            <Lock className="w-12 h-12 text-primary" data-testid="icon-lock" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold" data-testid="heading-feature-locked">{featureName}</h1>
            <p className="text-muted-foreground text-lg max-w-2xl" data-testid="text-feature-description">
              {featureDescription}
            </p>
          </div>

          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Current Plan</div>
                  <Badge variant="outline" className="text-base px-3 py-1" data-testid="badge-current-tier">
                    {currentTierConfig.name}
                  </Badge>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">
                    {type === "tier" ? "Upgrade To" : "Add Feature"}
                  </div>
                  <Badge className="text-base px-3 py-1 gap-1" data-testid="badge-required-tier">
                    <Sparkles className="w-4 h-4" />
                    {tierConfig?.name || addonConfig?.name}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {type === "tier" && features.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-3">What you'll get:</h4>
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm" data-testid={`feature-item-${index}`}>
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {type === "addon" && addonConfig && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{addonConfig.name}</h4>
                      <p className="text-sm text-muted-foreground">{addonConfig.description}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <div>
                  <div className="text-sm font-medium">
                    {type === "tier" ? "Starting at" : "Add-on Price"}
                  </div>
                  <div className="text-2xl font-bold" data-testid="text-pricing">
                    ${((tierConfig?.priceMonthly || addonConfig?.priceMonthly || 0) / 100).toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                </div>
                {type === "tier" && (
                  <Badge variant="secondary">14-day free trial</Badge>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                className="flex-1"
                data-testid="button-go-back"
              >
                Go Back
              </Button>
              <Button
                onClick={handleUpgrade}
                className="flex-1 gap-2"
                data-testid="button-upgrade-now"
              >
                <Sparkles className="w-4 h-4" />
                {type === "tier" ? "Upgrade Plan" : "Add Feature"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Inline card variant
  if (variant === "inlineCard") {
    return (
      <Card className="border-2 border-primary/20" data-testid="card-paywall-inline">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 rounded-full p-2">
              <Lock className="w-5 h-5 text-primary" data-testid="icon-lock-inline" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg" data-testid="heading-locked-feature">{featureName}</CardTitle>
              <CardDescription data-testid="text-locked-description">{featureDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs" data-testid="badge-current-plan-inline">
                Current: {currentTierConfig.name}
              </Badge>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <Badge className="text-xs gap-1" data-testid="badge-required-plan-inline">
                <Sparkles className="w-3 h-3" />
                {tierConfig?.name || addonConfig?.name}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium" data-testid="text-price-inline">
                ${((tierConfig?.priceMonthly || addonConfig?.priceMonthly || 0) / 100).toFixed(0)}/mo
              </div>
            </div>
          </div>

          {type === "tier" && features.length > 0 && (
            <div className="bg-muted/30 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-2">Includes:</p>
              <ul className="space-y-1">
                {features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-xs" data-testid={`inline-feature-${index}`}>
                    <Check className="w-3 h-3 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
                {features.length > 3 && (
                  <li className="text-xs text-muted-foreground ml-5">
                    +{features.length - 3} more features
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
            data-testid="button-dismiss-inline"
          >
            Maybe Later
          </Button>
          <Button
            size="sm"
            onClick={handleUpgrade}
            className="flex-1 gap-1"
            data-testid="button-upgrade-inline"
          >
            <Sparkles className="w-3 h-3" />
            Upgrade
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Banner variant
  if (variant === "banner") {
    return (
      <Alert className="mb-6 border-primary/50 bg-primary/5" data-testid="alert-paywall-banner">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-primary/10 rounded-full p-2">
              <Lock className="w-4 h-4 text-primary" data-testid="icon-lock-banner" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm" data-testid="heading-banner">{featureName}</div>
              <AlertDescription className="text-xs" data-testid="text-banner-description">
                {featureDescription}
              </AlertDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs" data-testid="badge-price-banner">
              ${((tierConfig?.priceMonthly || addonConfig?.priceMonthly || 0) / 100).toFixed(0)}/mo
            </Badge>
            <Button
              size="sm"
              onClick={handleUpgrade}
              className="gap-1"
              data-testid="button-upgrade-banner"
            >
              <Sparkles className="w-3 h-3" />
              Upgrade
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              data-testid="button-dismiss-banner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
}
