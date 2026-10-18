import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { LucideIcon } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
  testId?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  breadcrumbs,
  actions,
  className,
  testId = "page-header",
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)} data-testid={testId}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb data-testid={`${testId}-breadcrumbs`}>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={index} className="contents">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {Icon && (
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-2xl font-semibold text-foreground truncate" data-testid={`${testId}-title`}>
                {title}
              </h1>
              {badge && (
                <Badge variant={badge.variant || "secondary"} data-testid={`${testId}-badge`}>
                  {badge.label}
                </Badge>
              )}
            </div>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-2" data-testid={`${testId}-description`}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0" data-testid={`${testId}-actions`}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
