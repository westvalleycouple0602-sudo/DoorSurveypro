import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

interface OnboardingChecklistProps {
  title?: string;
  description?: string;
  steps: OnboardingStep[];
  onDismiss?: () => void;
  className?: string;
  testId?: string;
}

export function OnboardingChecklist({
  title = "Getting Started",
  description = "Complete these steps to get the most out of DoorSurvey Pro",
  steps,
  onDismiss,
  className,
  testId = "onboarding-checklist",
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;
  const allComplete = completedSteps === steps.length;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)} data-testid={testId}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg" data-testid={`${testId}-title`}>
                {title}
              </CardTitle>
              <Badge variant={allComplete ? "default" : "secondary"} data-testid={`${testId}-badge`}>
                {completedSteps} of {steps.length}
              </Badge>
            </div>
            <CardDescription data-testid={`${testId}-description`}>
              {description}
            </CardDescription>
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
              <span className="sr-only">Dismiss checklist</span>
            </Button>
          )}
        </div>
        <div className="pt-2">
          <Progress value={progress} className="h-2" data-testid={`${testId}-progress`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                step.completed ? "bg-muted/50 border-muted" : "bg-background border-border"
              )}
              data-testid={`${testId}-step-${step.id}`}
            >
              <div className="shrink-0 mt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" data-testid={`${testId}-step-${step.id}-completed`} />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-medium text-sm mb-1",
                  step.completed ? "text-muted-foreground line-through" : "text-foreground"
                )} data-testid={`${testId}-step-${step.id}-title`}>
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground" data-testid={`${testId}-step-${step.id}-description`}>
                  {step.description}
                </p>
              </div>
              {!step.completed && (step.actionLabel || step.actionHref) && (
                step.actionHref ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    data-testid={`${testId}-step-${step.id}-action`}
                  >
                    <Link href={step.actionHref}>
                      {step.actionLabel || "Start"}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={step.onAction}
                    data-testid={`${testId}-step-${step.id}-action`}
                  >
                    {step.actionLabel || "Start"}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
        {allComplete && (
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-foreground font-medium">
              All set! You're ready to start using DoorSurvey Pro.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
