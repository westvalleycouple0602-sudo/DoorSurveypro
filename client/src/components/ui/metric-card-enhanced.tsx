import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardEnhancedProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
    direction?: "up" | "down";
  };
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  isLoading?: boolean;
  className?: string;
  testId?: string;
  onClick?: () => void;
}

export function MetricCardEnhanced({
  title,
  value,
  icon: Icon,
  description,
  trend,
  badge,
  isLoading,
  className,
  testId = "metric-card",
  onClick,
}: MetricCardEnhancedProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendDirection = trend?.direction || (trend && trend.value > 0 ? "up" : "down");
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;
  const trendColor = trendDirection === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  return (
    <Card 
      className={cn(
        onClick && "cursor-pointer hover-elevate active-elevate-2 transition-shadow",
        className
      )}
      onClick={onClick}
      data-testid={testId}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {Icon && (
              <div className="shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <h3 className="text-sm font-medium text-muted-foreground truncate" data-testid={`${testId}-title`}>
              {title}
            </h3>
          </div>
          {badge && (
            <Badge variant={badge.variant || "secondary"} className="shrink-0" data-testid={`${testId}-badge`}>
              {badge.label}
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-3xl font-semibold text-foreground" data-testid={`${testId}-value`}>
            {value}
          </p>
          
          {(description || trend) && (
            <div className="flex items-center gap-2 flex-wrap">
              {trend && (
                <div className={cn("flex items-center gap-1 text-sm", trendColor)} data-testid={`${testId}-trend`}>
                  <TrendIcon className="h-3 w-3" />
                  <span className="font-medium">{Math.abs(trend.value)}%</span>
                  <span className="text-muted-foreground">{trend.label}</span>
                </div>
              )}
              {description && !trend && (
                <p className="text-sm text-muted-foreground" data-testid={`${testId}-description`}>
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
