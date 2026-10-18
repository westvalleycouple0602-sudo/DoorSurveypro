import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessMessageProps {
  message: string;
  className?: string;
  testId?: string;
}

export function SuccessMessage({ message, className, testId = "success-message" }: SuccessMessageProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20",
        className
      )}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      <CheckCircle2 
        className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" 
        aria-hidden="true"
      />
      <p className="text-sm text-emerald-700 dark:text-emerald-300">
        {message}
      </p>
    </div>
  );
}
