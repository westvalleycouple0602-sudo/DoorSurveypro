import { apiRequest as fetch } from "@/lib/queryClient";
import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw, Bug } from 'lucide-react';
import { Link } from 'wouter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Enhanced error boundary caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Send to Sentry with React context
    Sentry.withScope((scope) => {
      scope.setContext('react', {
        componentStack: errorInfo.componentStack,
      });
      scope.setContext('browser', {
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
      Sentry.captureException(error);
    });

    // Send to backend error reporting endpoint
    fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch((err) => {
      console.error('Failed to report error to server:', err);
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4 bg-background"
          role="alert"
          aria-live="assertive"
        >
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle 
                    className="h-6 w-6 text-destructive" 
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <CardTitle className="text-2xl">Something went wrong</CardTitle>
                  <CardDescription className="mt-1">
                    An unexpected error occurred. Our team has been notified.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && this.props.showDetails !== false && (
                <div 
                  className="p-4 rounded-lg bg-muted text-sm"
                  role="region"
                  aria-label="Error details"
                >
                  <p className="font-semibold mb-2">Error Details:</p>
                  <p className="text-muted-foreground font-mono break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="flex-1"
                  data-testid="button-error-reset"
                  aria-label="Try to recover from error"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-error-reload"
                  aria-label="Reload the page"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reload Page
                </Button>
                <Link href="/" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full"
                    data-testid="button-error-home"
                    aria-label="Go to homepage"
                  >
                    <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                    Go Home
                  </Button>
                </Link>
              </div>

              <div className="pt-2 border-t">
                <Link href="/bug-report">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    data-testid="button-error-report"
                  >
                    <Bug className="h-3 w-3 mr-2" aria-hidden="true" />
                    Report this issue
                  </Button>
                </Link>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold mb-2 hover:text-primary transition-colors">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="p-4 rounded-lg bg-muted text-xs overflow-auto max-h-96 mt-2">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <>
                      <summary className="cursor-pointer text-sm font-semibold mb-2 mt-4 hover:text-primary transition-colors">
                        Component Stack (Development Only)
                      </summary>
                      <pre className="p-4 rounded-lg bg-muted text-xs overflow-auto max-h-96 mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
