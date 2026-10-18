import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  testId?: string;
  fullPage?: boolean;
}

export function LoadingState({
  message = "Loading...",
  testId = "loading-state",
  fullPage = false,
}: LoadingStateProps) {
  const content = (
    <Card data-testid={testId}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2
          className="h-8 w-8 animate-spin text-primary mb-3"
          data-testid={`${testId}-spinner`}
          aria-hidden="true"
        />
        <p
          className="text-sm text-muted-foreground"
          data-testid={`${testId}-message`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      </CardContent>
    </Card>
  );

  if (fullPage) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {content}
      </div>
    );
  }

  return content;
}
