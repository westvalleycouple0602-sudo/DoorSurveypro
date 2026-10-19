import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Circle, ArrowRight, Play, X,
  Building2, Users, Palette, DoorOpen, FileSpreadsheet,
  Sparkles, Rocket, ChevronRight, Plug
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  detailedDescription?: string;
  icon: React.ReactNode;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  completed: boolean;
  optional?: boolean;
}

interface GettingStartedWizardProps {
  onComplete?: () => void;
  showAsDialog?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const WIZARD_STORAGE_KEY = "doorsurvey-getting-started";

export function useGettingStartedProgress() {
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (stored) {
      try {
        setProgress(JSON.parse(stored));
      } catch {
        setProgress({});
      }
    }
  }, []);

  const markComplete = (stepId: string) => {
    const updated = { ...progress, [stepId]: true };
    setProgress(updated);
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(updated));
  };

  const resetProgress = () => {
    setProgress({});
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  };

  return { progress, markComplete, resetProgress };
}

export function GettingStartedWizard({
  onComplete,
  showAsDialog = false,
  isOpen = true,
  onOpenChange,
}: GettingStartedWizardProps) {
  const { progress, markComplete } = useGettingStartedProgress();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  const steps: WizardStep[] = [
    {
      id: "organization",
      title: "Set Up Your Organization",
      description: "Configure your company name, logo, and basic settings",
      detailedDescription: "Add your company details, upload your logo, and customize branding colors. This information appears on your quotes and reports.",
      icon: <Building2 className="h-5 w-5" />,
      actionLabel: "Configure Organization",
      actionHref: "/branding",
      completed: progress["organization"] || false,
    },
    {
      id: "team",
      title: "Invite Your Team",
      description: "Add team members and assign roles",
      detailedDescription: "Invite surveyors, estimators, and project managers to collaborate. Assign appropriate permissions for each role.",
      icon: <Users className="h-5 w-5" />,
      actionLabel: "Invite Members",
      actionHref: "/team",
      completed: progress["team"] || false,
      optional: true,
    },
    {
      id: "integrations",
      title: "Connect Your Tools",
      description: "Link HubSpot and other business tools",
      detailedDescription: "Connect your CRM, payment processor, and productivity tools to automate workflows and sync data across platforms.",
      icon: <Plug className="h-5 w-5" />,
      actionLabel: "Configure Integrations",
      actionHref: "/integrations",
      completed: progress["integrations"] || false,
      optional: true,
    },
    {
      id: "branding",
      title: "Customize Branding",
      description: "Set up your quote templates and export styling",
      detailedDescription: "Design professional quote templates with your brand colors and customize how your exports look.",
      icon: <Palette className="h-5 w-5" />,
      actionLabel: "Customize Templates",
      actionHref: "/templates",
      completed: progress["branding"] || false,
      optional: true,
    },
    {
      id: "first-project",
      title: "Create Your First Project",
      description: "Start a new project and capture door data",
      detailedDescription: "Create a project, add building information, and start surveying doors. Our wizard guides you through every step.",
      icon: <DoorOpen className="h-5 w-5" />,
      actionLabel: "Create Project",
      actionHref: "/projects/new",
      completed: progress["first-project"] || false,
    },
    {
      id: "first-report",
      title: "Generate a Report",
      description: "Export a hardware schedule or quote",
      detailedDescription: "Once you've added doors to your project, generate your first hardware schedule or customer quote.",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      actionLabel: "View Reports",
      actionHref: "/reports",
      completed: progress["first-report"] || false,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const requiredSteps = steps.filter((s) => !s.optional);
  const requiredComplete = requiredSteps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const isComplete = requiredComplete === requiredSteps.length;

  const handleStepAction = (step: WizardStep) => {
    if (step.actionHref) {
      markComplete(step.id);
      setLocation(step.actionHref);
    } else if (step.onAction) {
      step.onAction();
      markComplete(step.id);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onOpenChange?.(false);
    if (isComplete) {
      toast({
        title: "Setup Complete!",
        description: "You're all set to start using DoorSurvey Pro. Explore the features and create your first project.",
      });
      onComplete?.();
    }
  };

  if (dismissed && !showAsDialog) return null;

  const content = (
    <div className="space-y-6" data-testid="getting-started-wizard">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-semibold" data-testid="wizard-title">
          Welcome to DoorSurvey Pro
        </h2>
        <p className="text-muted-foreground">
          Complete these steps to set up your account and start surveying
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Setup Progress</span>
          <Badge variant={isComplete ? "default" : "secondary"}>
            {completedCount} of {steps.length} complete
          </Badge>
        </div>
        <Progress value={progressPercent} className="h-2" data-testid="wizard-progress" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border transition-colors",
              step.completed
                ? "bg-muted/30 border-muted"
                : "bg-card border-border hover-elevate cursor-pointer"
            )}
            onClick={() => !step.completed && handleStepAction(step)}
            data-testid={`wizard-step-${step.id}`}
          >
            {/* Step Number/Check */}
            <div className="shrink-0 mt-0.5">
              {step.completed ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {step.icon}
                <h4
                  className={cn(
                    "font-medium",
                    step.completed && "text-muted-foreground"
                  )}
                  data-testid={`text-step-title-${step.id}`}
                >
                  {step.title}
                </h4>
                {step.optional && (
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>

            {/* Action Button */}
            {!step.completed && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStepAction(step);
                }}
                data-testid={`wizard-action-${step.id}`}
              >
                {step.actionLabel}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-600 dark:text-green-400">
              Setup Complete!
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            You're all set to start using DoorSurvey Pro. Need help? Check out our{" "}
            <Link href="/help" className="text-primary hover:underline">
              Help Center
            </Link>
            .
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          data-testid="wizard-dismiss"
        >
          {isComplete ? "Close" : "Skip for now"}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            data-testid="wizard-help-link"
          >
            <Link href="/help">
              View Help Center
            </Link>
          </Button>
          <Button
            size="sm"
            asChild
            data-testid="wizard-tour-link"
          >
            <Link href="/?tour=true">
              <Play className="h-4 w-4 mr-2" />
              Take Product Tour
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  if (showAsDialog) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-getting-started">
          <DialogHeader className="sr-only">
            <DialogTitle>Getting Started</DialogTitle>
            <DialogDescription>Set up your DoorSurvey Pro account</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6">{content}</CardContent>
    </Card>
  );
}

export function GettingStartedCard({ className }: { className?: string }) {
  const { progress } = useGettingStartedProgress();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`${WIZARD_STORAGE_KEY}-dismissed`);
    setDismissed(stored === "true");
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(`${WIZARD_STORAGE_KEY}-dismissed`, "true");
  };

  const stepCount = 6;
  const completedCount = Object.values(progress).filter(Boolean).length;
  const progressPercent = (completedCount / stepCount) * 100;

  if (dismissed || completedCount === stepCount) return null;

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)} data-testid="getting-started-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Getting Started</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{stepCount}
              </Badge>
            </div>
            <CardDescription>
              Complete the setup to unlock all features
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
            aria-label="Dismiss getting started"
            data-testid="dismiss-getting-started"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {stepCount - completedCount} steps remaining
          </p>
          <Button size="sm" asChild data-testid="button-continue-setup">
            <Link href="/onboarding/getting-started">
              Continue Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
