import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  icon?: ReactNode;
  validate?: () => boolean | Promise<boolean>;
}

interface FormWizardProps {
  steps: WizardStep[];
  onComplete: () => void | Promise<void>;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
}

export function FormWizard({ steps, onComplete, isSubmitting, title, description }: FormWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = async () => {
    const currentStepData = steps[currentStep];
    
    // Validate current step if validation function exists
    if (currentStepData.validate) {
      const isValid = await currentStepData.validate();
      if (!isValid) return;
    }

    // Mark current step as completed
    setCompletedSteps(prev => new Set(prev).add(currentStep));

    if (isLastStep) {
      await onComplete();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow clicking on any previous step or the next immediate step
    if (stepIndex <= currentStep || completedSteps.has(stepIndex - 1)) {
      setCurrentStep(stepIndex);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {(title || description) && (
        <div>
          {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Step {currentStep + 1} of {steps.length}</span>
              <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" data-testid="wizard-progress" />
          </div>
        </CardContent>
      </Card>

      {/* Step Indicators */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const isAccessible = index <= currentStep || completedSteps.has(index - 1);

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(index)}
              disabled={!isAccessible}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg transition-all min-w-[120px] flex-1",
                "hover-elevate active-elevate-2",
                isActive && "bg-primary/10 border-2 border-primary",
                !isActive && !isCompleted && "border border-border",
                isCompleted && !isActive && "bg-muted border border-border",
                !isAccessible && "opacity-50 cursor-not-allowed"
              )}
              data-testid={`wizard-step-${index}`}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                isActive && "bg-primary text-primary-foreground",
                isCompleted && !isActive && "bg-green-600 text-white",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <div className="text-center">
                <div className={cn(
                  "text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {steps[currentStep].icon && (
              <div className="p-2 bg-primary/10 rounded-lg">
                {steps[currentStep].icon}
              </div>
            )}
            <div>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              {steps[currentStep].description && (
                <CardDescription className="mt-1">{steps[currentStep].description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {steps[currentStep].content}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep || isSubmitting}
          data-testid="wizard-button-previous"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="text-sm text-muted-foreground">
          {completedSteps.size} of {steps.length} steps completed
        </div>

        <Button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          data-testid="wizard-button-next"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : isLastStep ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Complete
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
