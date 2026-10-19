import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export function FormLoadingOverlay({ 
  isLoading, 
  message = "Saving changes...",
  className 
}: FormLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-50",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="form-loading-overlay"
    >
      <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border shadow-lg">
        <Loader2 
          className="h-8 w-8 animate-spin text-primary" 
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}
