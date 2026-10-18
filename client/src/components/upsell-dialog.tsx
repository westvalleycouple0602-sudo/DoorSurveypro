import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Lock, TrendingUp } from "lucide-react";
import { SUBSCRIPTION_TIERS, SUBSCRIPTION_ADDONS, type SubscriptionTier, type SubscriptionAddon } from "@shared/subscriptions";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/rum";
import { useEffect } from "react";

export type UpsellType = "tier" | "addon";

export interface UpsellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  featureDescription: string;
  requiredTier?: SubscriptionTier;
  requiredAddon?: SubscriptionAddon;
  currentTier: SubscriptionTier;
  type: UpsellType;
}

export function UpsellDialog({
  open,
  onOpenChange,
  featureName,
  featureDescription,
  requiredTier,
  requiredAddon,
  currentTier,
  type,
}: UpsellDialogProps) {
  const [, setLocation] = useLocation();

  // Track when upsell is shown
  useEffect(() => {
    if (open) {
      trackEvent("upsell_shown", {
        featureName,
        type,
        requiredTier,
        requiredAddon,
        currentTier,
      });
    }
  }, [open, featureName, type, requiredTier, requiredAddon, currentTier]);

  const handleUpgrade = () => {
    trackEvent("upsell_clicked", {
      featureName,
      type,
      requiredTier,
      requiredAddon,
      currentTier,
    });
    onOpenChange(false);
    setLocation("/billing");
  };

  const handleDismiss = () => {
    trackEvent("upsell_dismissed", {
      featureName,
      type,
      requiredTier,
      requiredAddon,
      currentTier,
    });
    onOpenChange(false);
  };

  const renderTierUpgrade = () => {
    if (!requiredTier) return null;

    const tierConfig = SUBSCRIPTION_TIERS[requiredTier];
    const currentTierConfig = SUBSCRIPTION_TIERS[currentTier];

    const tierOrder: SubscriptionTier[] = ["free", "starter", "professional", "enterprise"];
    const isDowngrade = tierOrder.indexOf(requiredTier) < tierOrder.indexOf(currentTier);

    if (isDowngrade) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            This feature is available in your current plan.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Current Plan</div>
            <Badge variant="outline" className="text-base px-3 py-1">
              {currentTierConfig.name}
            </Badge>
          </div>
          <TrendingUp className="w-5 h-5 text-primary" />
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Upgrade To</div>
            <Badge className="text-base px-3 py-1 gap-1">
              <Sparkles className="w-4 h-4" />
              {tierConfig.name}
            </Badge>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-3">What you'll get:</h4>
          <ul className="space-y-2">
            {tierConfig.features.projectLimit === null && (
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Unlimited projects</span>
              </li>
            )}
            {tierConfig.features.userLimit && typeof tierConfig.features.userLimit === 'number' && (
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>{tierConfig.features.userLimit} team members</span>
              </li>
            )}
            {tierConfig.features.userLimit === null && (
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Unlimited team members</span>
              </li>
            )}
            {tierConfig.features.customCatalogs && (
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Custom product catalogs</span>
              </li>
            )}
            {tierConfig.features.advancedReporting && (
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Advanced reporting & analytics</span>
              </li>
            )}
            {tierConfig.features.prioritySupport && (
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Priority support</span>
              </li>
            )}
            {tierConfig.features.apiAccess && (
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>API access for integrations</span>
              </li>
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <div>
            <div className="text-sm font-medium">Starting at</div>
            <div className="text-2xl font-bold">
              ${(tierConfig.priceMonthly / 100).toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
          </div>
          <Badge variant="secondary">14-day free trial</Badge>
        </div>
      </div>
    );
  };

  const renderAddonUpgrade = () => {
    if (!requiredAddon) return null;

    const addonConfig = SUBSCRIPTION_ADDONS[requiredAddon];

    return (
      <div className="space-y-4">
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

        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <div>
            <div className="text-sm font-medium">Add-on Price</div>
            <div className="text-2xl font-bold">
              ${(addonConfig.priceMonthly / 100).toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Annual</div>
            <div className="text-sm font-medium text-green-600">
              Save ${((addonConfig.priceMonthly * 12 - addonConfig.priceAnnual) / 100).toFixed(0)}/year
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Add-ons can be purchased with any subscription tier
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-upsell">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-primary/10 rounded-full p-2">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>{featureName}</DialogTitle>
          </div>
          <DialogDescription>{featureDescription}</DialogDescription>
        </DialogHeader>

        {type === "tier" ? renderTierUpgrade() : renderAddonUpgrade()}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleDismiss}
            data-testid="button-cancel-upsell"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            className="gap-2"
            data-testid="button-upgrade-upsell"
          >
            <Sparkles className="w-4 h-4" />
            {type === "tier" ? "Upgrade Plan" : "Add Feature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
