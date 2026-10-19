import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  testId?: string;
  illustration?: string;
  illustrationAlt?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryAction,
  testId = "empty-state",
  illustration,
  illustrationAlt,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed" data-testid={testId}>
      <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6 text-center">
        {illustration ? (
          <img 
            src={illustration} 
            alt={illustrationAlt || title} 
            className="w-full max-w-xs sm:max-w-sm mx-auto mb-6 rounded-lg opacity-90"
            data-testid={`${testId}-illustration`}
          />
        ) : (
          <div className="rounded-full bg-muted p-4 mb-4" aria-hidden="true">
            <Icon className="h-8 w-8 text-muted-foreground" data-testid={`${testId}-icon`} />
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2" data-testid={`${testId}-title`}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md" data-testid={`${testId}-description`}>
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {(actionLabel && (actionHref || onAction)) && (
            actionHref ? (
              <Button asChild data-testid={`${testId}-action`}>
                <a href={actionHref}>{actionLabel}</a>
              </Button>
            ) : (
              <Button onClick={onAction} data-testid={`${testId}-action`}>
                {actionLabel}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button asChild variant="outline" data-testid={`${testId}-secondary-action`}>
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              </Button>
            ) : (
              <Button onClick={secondaryAction.onClick} variant="outline" data-testid={`${testId}-secondary-action`}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
