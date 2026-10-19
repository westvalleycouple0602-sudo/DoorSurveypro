import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Lock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface UsageBadgeProps {
  current: number;
  limit: number | null;
  isUnlimited: boolean;
  percentUsed: number;
  resourceName: string;
  className?: string;
}

export function UsageBadge({ 
  current, 
  limit, 
  isUnlimited, 
  percentUsed,
  resourceName,
  className 
}: UsageBadgeProps) {
  if (isUnlimited) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={className} data-testid={`badge-usage-${resourceName}`}>
            {current} {resourceName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Unlimited {resourceName} on your plan</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // At or over limit (100%+)
  if (percentUsed >= 100) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className={className} data-testid={`badge-usage-${resourceName}`}>
            <Lock className="h-3 w-3 mr-1" />
            {current}/{limit} {resourceName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold">Limit Reached</p>
          <p className="text-xs text-muted-foreground">
            Upgrade your plan to create more {resourceName}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Warning level (80-99%)
  if (percentUsed >= 80) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`border-orange-500 text-orange-600 ${className}`} data-testid={`badge-usage-${resourceName}`}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            {current}/{limit} {resourceName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold">Approaching Limit</p>
          <p className="text-xs text-muted-foreground">
            {limit! - current} {resourceName} remaining
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Normal usage (0-79%)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className={className} data-testid={`badge-usage-${resourceName}`}>
          {current}/{limit} {resourceName}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{limit! - current} {resourceName} remaining on your plan</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface UsageAlertProps {
  current: number;
  limit: number | null;
  isUnlimited: boolean;
  percentUsed: number;
  resourceName: string;
  upgradeLink?: string;
}

export function UsageAlert({
  current,
  limit,
  isUnlimited,
  percentUsed,
  resourceName,
  upgradeLink = "/billing"
}: UsageAlertProps) {
  // Don't show alert for unlimited plans
  if (isUnlimited) return null;

  // Don't show alert if usage is below 80%
  if (percentUsed < 80) return null;

  // At or over limit
  if (percentUsed >= 100) {
    return (
      <Alert variant="destructive" data-testid={`alert-usage-limit-${resourceName}`}>
        <Lock className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">
              {resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} Limit Reached
            </p>
            <p className="text-sm">
              You've reached your limit of {limit} {resourceName}. Upgrade your plan to create more.
            </p>
          </div>
          <Link href={upgradeLink}>
            <Button size="sm" data-testid="button-upgrade-plan">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              Upgrade
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Warning level (80-99%)
  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20" data-testid={`alert-usage-warning-${resourceName}`}>
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-orange-600">
            Approaching {resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} Limit
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            You're using {current} of {limit} {resourceName} ({percentUsed}%). 
            {limit! - current} remaining.
          </p>
        </div>
        <Link href={upgradeLink}>
          <Button size="sm" variant="outline" data-testid="button-view-plans">
            View Plans
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
