import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
  isLoading?: boolean;
  iconColor?: string;
  testId?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  isLoading,
  iconColor = "text-chart-1",
  testId
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover-elevate transition-all", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 px-4 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn("rounded-lg bg-primary/10 p-1.5 sm:p-2 shrink-0", iconColor)}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="text-2xl sm:text-3xl font-bold text-foreground" data-testid={testId}>
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1.5 sm:mt-2">
            {trend && (
              <span className={cn(
                "text-[10px] sm:text-xs font-medium",
                trend.positive ? "text-green-600" : "text-red-600"
              )} data-testid={testId ? `${testId}-trend` : undefined}>
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
            )}
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
