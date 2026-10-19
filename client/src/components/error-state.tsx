import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, WifiOff, AlertCircle, Lock, FileQuestion, ServerCrash } from "lucide-react";
import { categorizeError } from "@/lib/error-utils";
import { COMPANY_EMAILS } from "@shared/emails";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  testId?: string;
  fullPage?: boolean;
}

export function ErrorState({
  title,
  message,
  error,
  onRetry,
  testId = "error-state",
  fullPage = false,
}: ErrorStateProps) {
  // Use enhanced error categorization if available
  const enhancedError = error ? categorizeError(error) : null;
  
  const displayTitle = title || enhancedError?.title || "Something went wrong";
  const displayMessage = message || enhancedError?.message || error?.message || "An unexpected error occurred. Please try again.";
  const displayAction = enhancedError?.action;
  const canRetry = enhancedError?.canRetry ?? (onRetry !== undefined);

  // Select appropriate icon based on error category
  const IconComponent = enhancedError ? {
    network: WifiOff,
    validation: AlertCircle,
    permission: Lock,
    notFound: FileQuestion,
    server: ServerCrash,
    unknown: AlertTriangle,
  }[enhancedError.category] : AlertTriangle;

  const iconColor = enhancedError?.category === 'validation' ? 'text-yellow-500' : 'text-destructive';
  const bgColor = enhancedError?.category === 'validation' ? 'bg-yellow-500/10' : 'bg-destructive/10';
  const borderColor = enhancedError?.category === 'validation' ? 'border-yellow-500/50' : 'border-destructive/50';

  const content = (
    <Card className={borderColor} data-testid={testId}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className={`p-3 rounded-full ${bgColor} mb-4`}>
          <IconComponent
            className={`h-8 w-8 ${iconColor}`}
            data-testid={`${testId}-icon`}
            aria-hidden="true"
          />
        </div>
        <h3
          className="text-lg font-semibold mb-2"
          data-testid={`${testId}-title`}
        >
          {displayTitle}
        </h3>
        <p
          className="text-sm text-muted-foreground max-w-md mb-2"
          data-testid={`${testId}-message`}
        >
          {displayMessage}
        </p>
        {displayAction && (
          <Badge variant="outline" className="mb-6 mt-2">
            {displayAction}
          </Badge>
        )}
        {canRetry && onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            data-testid={`${testId}-retry`}
            aria-label="Retry loading data"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        {enhancedError?.category === 'server' && (
          <p className="text-xs text-muted-foreground mt-4 max-w-md">
            If this problem persists, please contact our support team at{" "}
            <a href={`mailto:${COMPANY_EMAILS.techSupport}`} className="text-muted-foreground hover:underline">
              {COMPANY_EMAILS.techSupport}
            </a>
          </p>
        )}
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
