import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineErrorProps {
  message: string;
  className?: string;
  testId?: string;
}

export function InlineError({ message, className, testId = "inline-error" }: InlineErrorProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20",
        className
      )}
      role="alert"
      aria-live="assertive"
      data-testid={testId}
    >
      <AlertCircle 
        className="h-4 w-4 text-destructive shrink-0 mt-0.5" 
        aria-hidden="true"
      />
      <p className="text-sm text-destructive">
        {message}
      </p>
    </div>
  );
}
