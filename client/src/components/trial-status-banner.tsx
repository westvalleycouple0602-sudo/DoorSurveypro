import { AlertCircle, Clock, Sparkles, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/use-trial-status";
import { Link } from "wouter";

export function TrialStatusBanner() {
  const { data: trialStatus, isLoading, isError, refetch } = useTrialStatus();

  if (isError) {
    return (
      <Alert variant="destructive" data-testid="alert-trial-error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Trial status unavailable</AlertTitle>
        <AlertDescription>
          We couldn’t confirm your trial status. Please try again.
          <Button variant="outline" size="sm" className="ml-3" onClick={() => refetch()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !trialStatus) {
    return null;
  }

  // Don't show banner if no active trial or grace period
  if (!trialStatus.isActive && !trialStatus.isInGracePeriod) {
    return null;
  }

  // Active trial with 3+ days remaining
  if (trialStatus.isActive && trialStatus.daysRemaining && trialStatus.daysRemaining >= 3) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20" data-testid="alert-trial-active">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          {trialStatus.tier} Trial Active
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span data-testid="text-trial-days-remaining">
              {trialStatus.daysRemaining} days remaining
            </span>
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
              Full access
            </Badge>
          </div>
          <Link href="/billing">
            <Button variant="outline" size="sm" data-testid="button-upgrade-now">
              View Plan &amp; Usage
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expiring soon (1-2 days remaining)
  if (trialStatus.isActive && trialStatus.daysRemaining && trialStatus.daysRemaining < 3) {
    return (
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20" data-testid="alert-trial-expiring">
        <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertTitle className="text-orange-900 dark:text-orange-100">
          Trial Ending Soon
        </AlertTitle>
        <AlertDescription className="text-orange-800 dark:text-orange-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span data-testid="text-trial-days-remaining">
              Only {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} left in your {trialStatus.tier} trial
            </span>
          </div>
          <Link href="/billing">
            <Button size="sm" data-testid="button-upgrade-now">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              View Plan &amp; Usage
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Grace period (trial expired, but features still active)
  if (trialStatus.isInGracePeriod) {
    const graceDaysRemaining = trialStatus.gracePeriodEndsAt 
      ? Math.ceil((new Date(trialStatus.gracePeriodEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20" data-testid="alert-grace-period">
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertTitle className="text-red-900 dark:text-red-100">
          Grace Period Active
        </AlertTitle>
        <AlertDescription className="text-red-800 dark:text-red-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span data-testid="text-grace-days-remaining">
              Features will be locked in {graceDaysRemaining} {graceDaysRemaining === 1 ? 'day' : 'days'}
            </span>
          </div>
          <Link href="/billing">
            <Button variant="destructive" size="sm" data-testid="button-upgrade-now">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              View Plan &amp; Usage
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
