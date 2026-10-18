import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FeatureAnnouncementProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  badge?: string;
  features?: string[];
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  variant?: "default" | "success" | "info";
  className?: string;
  testId?: string;
}

export function FeatureAnnouncement({
  title,
  description,
  icon: Icon = Sparkles,
  badge,
  features,
  actionLabel,
  onAction,
  onDismiss,
  variant = "default",
  className,
  testId = "feature-announcement",
}: FeatureAnnouncementProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const variantStyles = {
    default: "border-primary/20 bg-primary/5",
    success: "border-green-500/20 bg-green-500/5",
    info: "border-blue-500/20 bg-blue-500/5",
  };

  const iconColor = {
    default: "text-primary",
    success: "text-green-600 dark:text-green-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  return (
    <Card className={cn(variantStyles[variant], className)} data-testid={testId}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("rounded-lg p-2 shrink-0", variant === "default" ? "bg-primary/10" : variant === "success" ? "bg-green-500/10" : "bg-blue-500/10")}>
              <Icon className={cn("h-5 w-5", iconColor[variant])} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <CardTitle className="text-lg" data-testid={`${testId}-title`}>
                  {title}
                </CardTitle>
                {badge && (
                  <Badge variant="secondary" className="shrink-0">
                    {badge}
                  </Badge>
                )}
              </div>
              <CardDescription data-testid={`${testId}-description`}>
                {description}
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleDismiss}
              data-testid={`${testId}-dismiss`}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </div>
      </CardHeader>
      {(features || actionLabel) && (
        <CardContent>
          {features && (
            <ul className="space-y-2 mb-4" data-testid={`${testId}-features`}>
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">•</span>
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          )}
          {actionLabel && onAction && (
            <Button onClick={onAction} data-testid={`${testId}-action`}>
              {actionLabel}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
