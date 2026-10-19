import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ProgressIndicatorProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "inline" | "overlay";
  testId?: string;
}

export function ProgressIndicator({
  message = "Loading...",
  size = "md",
  variant = "default",
  testId = "progress-indicator",
}: ProgressIndicatorProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (variant === "overlay") {
    return (
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label={message}
        data-testid={testId}
      >
        <div className="flex flex-col items-center gap-3" role="status">
          <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
          {message && (
            <p className={cn("text-muted-foreground", textSizeClasses[size])} data-testid={`${testId}-message`}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2" role="status" aria-live="polite" aria-busy="true" data-testid={testId}>
        <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
        {message && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])} data-testid={`${testId}-message`}>
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite" aria-busy="true" data-testid={testId}>
      <Loader2 className={cn("animate-spin text-primary mb-3", sizeClasses[size])} />
      {message && (
        <p className={cn("text-muted-foreground", textSizeClasses[size])} data-testid={`${testId}-message`}>
          {message}
        </p>
      )}
    </div>
  );
}
