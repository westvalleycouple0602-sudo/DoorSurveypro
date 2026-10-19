import { ReactNode, type KeyboardEventHandler } from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/rum";

export interface LockedFeatureProps {
  children: ReactNode;
  locked: boolean;
  onClick: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  tierBadgeText?: string;
  className?: string;
  variant?: "overlay" | "inline" | "disabled";
  featureName?: string; // For analytics tracking
}

/**
 * Wrapper component that shows a lock indicator on premium features
 * and triggers upsell dialog when clicked
 */
export function LockedFeature({
  children,
  locked,
  onClick,
  onKeyDown,
  tierBadgeText,
  className,
  variant = "overlay",
  featureName,
}: LockedFeatureProps) {
  if (!locked) {
    return <>{children}</>;
  }

  if (variant === "disabled") {
    return (
      <div className={cn("relative opacity-60", className)}>
        {children}
        <div role="button" tabIndex={0} aria-label={featureName || "Upgrade to unlock feature"}
          onKeyDown={onKeyDown ?? ((event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          })}
          className="absolute inset-0 cursor-not-allowed" onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          trackEvent("feature_locked_click", {
            featureName: featureName || tierBadgeText || "Unknown Feature",
            requiredTier: tierBadgeText,
            variant: "disabled",
          });
          onClick();
        }} />
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <Button
        variant="outline"
        className={cn("gap-2", className)}
        onClick={(e) => {
          e.preventDefault();
          trackEvent("feature_locked_click", {
            featureName: featureName || tierBadgeText || "Unknown Feature",
            requiredTier: tierBadgeText,
            variant: "inline",
          });
          onClick();
        }}
        data-testid="button-locked-feature"
      >
        <Lock className="w-4 h-4 text-muted-foreground" />
        {children}
        {tierBadgeText && (
          <Badge variant="secondary" className="ml-2">
            {tierBadgeText}
          </Badge>
        )}
      </Button>
    );
  }

  // Overlay variant (default)
  return (
    <div className={cn("relative group", className)}>
      {children}
      <div
        role="button"
        tabIndex={0}
        aria-label={featureName || "Upgrade to unlock feature"}
        onKeyDown={onKeyDown ?? ((event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.currentTarget.click();
          }
        })}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-opacity hover:bg-background/90"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          trackEvent("feature_locked_click", {
            featureName: featureName || tierBadgeText || "Unknown Feature",
            requiredTier: tierBadgeText,
            variant: "overlay",
          });
          onClick();
        }}
        data-testid="overlay-locked-feature"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-primary/10 rounded-full p-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          {tierBadgeText && (
            <Badge variant="secondary">
              {tierBadgeText}
            </Badge>
          )}
          <p className="text-sm text-muted-foreground px-4">
            Click to unlock
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Lock icon badge to indicate premium features
 */
export function LockBadge({ tierText }: { tierText?: string }) {
  return (
    <Badge variant="secondary" className="gap-1">
      <Lock className="w-3 h-3" />
      {tierText || "Premium"}
    </Badge>
  );
}
