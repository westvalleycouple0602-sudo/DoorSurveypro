import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parseISO } from "date-fns";
import {
  DollarSign,
  Package,
  Plus,
  Minus,
  Pencil,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { RevisionMark } from "@shared/schema";

interface QuoteDiffViewerProps {
  versionId1: string;
  versionId2: string;
  onClose?: () => void;
  className?: string;
}

interface DiffResult {
  path: string;
  changeType: "added" | "modified" | "removed";
  previousValue: any;
  newValue: any;
  displayHint: string;
  category: string;
}

interface ComparisonSummary {
  added: number;
  modified: number;
  removed: number;
  totalChanges: number;
}

interface ComparisonResponse {
  version1: {
    id: string;
    versionNumber: number;
    versionName?: string;
  };
  version2: {
    id: string;
    versionNumber: number;
    versionName?: string;
  };
  differences: DiffResult[];
  summary: ComparisonSummary;
}

const CATEGORY_TABS = [
  { id: "all", label: "All Changes", filter: null, testId: "tab-all-changes" },
  { id: "pricing", label: "Pricing", filter: "pricing", testId: "tab-pricing" },
  { id: "hardware", label: "Hardware", filter: "hardware", testId: "tab-hardware" },
  { id: "quantity", label: "Quantities", filter: "quantity", testId: "tab-quantities" },
  { id: "lineItems", label: "Line Items", filter: "lineItems", testId: "tab-line-items" },
] as const;

function formatPath(path: string): string {
  return path
    .replace(/\[(\d+)\]/g, (_, index) => ` ${parseInt(index) + 1}`)
    .replace(/\./g, " - ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/(^|\s)([a-z])/g, (_, space, letter) => space + letter.toUpperCase());
}

function formatValue(value: any, forCurrency = false): string {
  if (value === null || value === undefined) {
    return "—";
  }
  
  if (typeof value === "number") {
    if (forCurrency) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    }
    return value.toLocaleString();
  }
  
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  
  if (typeof value === "string") {
    const dateValue = parseISO(value);
    if (isValid(dateValue) && value.includes("-") && value.length >= 10) {
      return format(dateValue, "MMM d, yyyy");
    }
    return value;
  }
  
  if (Array.isArray(value)) {
    return JSON.stringify(value, null, 2);
  }
  
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  
  return String(value);
}

function isPriceField(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return (
    lowerPath.includes("price") ||
    lowerPath.includes("cost") ||
    lowerPath.includes("amount") ||
    lowerPath.includes("total") ||
    lowerPath.includes("subtotal")
  );
}

function PathLabel({ path }: { path: string }) {
  const formatted = formatPath(path);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="text-sm font-medium text-foreground truncate block max-w-[200px] cursor-help"
          data-testid="path-label"
        >
          {formatted}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs font-mono">{path}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ValueDisplayProps {
  value: any;
  path: string;
  variant?: "added" | "removed" | "neutral";
  className?: string;
}

function ValueDisplay({ value, path, variant = "neutral", className }: ValueDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const isPrice = isPriceField(path);
  const formattedValue = formatValue(value, isPrice);
  const isLongValue = formattedValue.length > 100;
  const displayValue = isLongValue && !expanded 
    ? formattedValue.substring(0, 100) + "..."
    : formattedValue;
  
  const variantStyles = {
    added: "text-green-700 dark:text-green-300",
    removed: "text-red-700 dark:text-red-300 line-through",
    neutral: "text-foreground",
  };
  
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span
        className={cn(
          "text-sm whitespace-pre-wrap break-words",
          variantStyles[variant]
        )}
        data-testid="value-display"
      >
        {isPrice && typeof value === "number" && (
          <DollarSign className="inline h-3 w-3 mr-0.5" />
        )}
        {displayValue}
      </span>
      {isLongValue && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs self-start"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-toggle-value"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show more
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface DiffItemProps {
  diff: DiffResult;
  index: number;
}

function DiffItem({ diff, index }: DiffItemProps) {
  const [expanded, setExpanded] = useState(false);
  
  const config = {
    added: {
      icon: Plus,
      borderClass: "border-l-4 border-l-green-500",
      bgClass: "bg-green-50 dark:bg-green-950/20",
      iconClass: "text-green-600 dark:text-green-400",
      badgeVariant: "outline" as const,
      badgeClass: "border-green-500 text-green-700 dark:text-green-300 bg-green-500/10",
    },
    modified: {
      icon: Pencil,
      borderClass: "border-l-4 border-l-amber-500",
      bgClass: "bg-amber-50 dark:bg-amber-950/20",
      iconClass: "text-amber-600 dark:text-amber-400",
      badgeVariant: "outline" as const,
      badgeClass: "border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/10",
    },
    removed: {
      icon: Minus,
      borderClass: "border-l-4 border-l-red-500",
      bgClass: "bg-red-50 dark:bg-red-950/20",
      iconClass: "text-red-600 dark:text-red-400",
      badgeVariant: "outline" as const,
      badgeClass: "border-red-500 text-red-700 dark:text-red-300 bg-red-500/10",
    },
  };
  
  const { icon: Icon, borderClass, bgClass, iconClass, badgeClass } = config[diff.changeType];
  const hasComplexValue = 
    (diff.previousValue && typeof diff.previousValue === "object") ||
    (diff.newValue && typeof diff.newValue === "object");
  
  return (
    <div
      className={cn(
        "rounded-md p-3 transition-all",
        borderClass,
        bgClass
      )}
      data-testid={`diff-item-${index}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 mt-0.5", iconClass)}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <PathLabel path={diff.path} />
            <Badge className={cn("text-xs", badgeClass)}>
              {diff.changeType}
            </Badge>
            {diff.category && (
              <Badge variant="secondary" className="text-xs">
                {diff.category}
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            {diff.changeType === "added" && (
              <ValueDisplay
                value={diff.newValue}
                path={diff.path}
                variant="added"
              />
            )}
            
            {diff.changeType === "removed" && (
              <ValueDisplay
                value={diff.previousValue}
                path={diff.path}
                variant="removed"
              />
            )}
            
            {diff.changeType === "modified" && (
              <div className="flex items-center gap-2 flex-wrap">
                <ValueDisplay
                  value={diff.previousValue}
                  path={diff.path}
                  variant="removed"
                  className="flex-shrink-0"
                />
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <ValueDisplay
                  value={diff.newValue}
                  path={diff.path}
                  variant="added"
                  className="flex-shrink-0"
                />
              </div>
            )}
          </div>
          
          {hasComplexValue && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-expand-${index}`}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Collapse details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Expand details
                </>
              )}
            </Button>
          )}
          
          {expanded && hasComplexValue && (
            <div className="mt-2 p-2 bg-background/50 rounded text-xs font-mono overflow-x-auto">
              <pre className="whitespace-pre-wrap">
                {diff.changeType === "modified" ? (
                  <>
                    <span className="text-red-600 dark:text-red-400">
                      - {JSON.stringify(diff.previousValue, null, 2)}
                    </span>
                    {"\n"}
                    <span className="text-green-600 dark:text-green-400">
                      + {JSON.stringify(diff.newValue, null, 2)}
                    </span>
                  </>
                ) : diff.changeType === "added" ? (
                  <span className="text-green-600 dark:text-green-400">
                    + {JSON.stringify(diff.newValue, null, 2)}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    - {JSON.stringify(diff.previousValue, null, 2)}
                  </span>
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-md p-3 border-l-4 border-l-muted bg-muted/30">
          <div className="flex items-start gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuoteDiffViewer({
  versionId1,
  versionId2,
  onClose,
  className,
}: QuoteDiffViewerProps) {
  const [activeTab, setActiveTab] = useState("all");
  
  const { data, isLoading, error, refetch, isRefetching } = useQuery<ComparisonResponse>({
    queryKey: ["/api/versioning/compare", versionId1, versionId2],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/versioning/compare", {
        versionId1,
        versionId2,
      });
      return response.json();
    },
    enabled: Boolean(versionId1 && versionId2),
  });
  
  const filteredDifferences = useMemo(() => {
    if (!data?.differences) return [];
    
    const activeFilter = CATEGORY_TABS.find((tab) => tab.id === activeTab)?.filter;
    if (!activeFilter) return data.differences;
    
    return data.differences.filter((diff) => diff.category === activeFilter);
  }, [data?.differences, activeTab]);
  
  const categoryCounts = useMemo(() => {
    if (!data?.differences) return {};
    
    const counts: Record<string, number> = { all: data.differences.length };
    
    for (const diff of data.differences) {
      if (diff.category) {
        counts[diff.category] = (counts[diff.category] || 0) + 1;
      }
    }
    
    return counts;
  }, [data?.differences]);
  
  if (error) {
    return (
      <Card className={cn("", className)} data-testid="quote-diff-viewer">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <h3 className="font-medium text-destructive">Failed to compare versions</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              data-testid="button-retry"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("", className)} data-testid="quote-diff-viewer">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Version Comparison
            {data && (
              <span className="text-muted-foreground font-normal">
                v{data.version1.versionNumber} → v{data.version2.versionNumber}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                data-testid="button-close"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center gap-2 mt-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        ) : data && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge
              className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500"
              data-testid="badge-added-count"
            >
              <Plus className="h-3 w-3 mr-1" />
              {data.summary.added} added
            </Badge>
            <Badge
              className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500"
              data-testid="badge-modified-count"
            >
              <Pencil className="h-3 w-3 mr-1" />
              {data.summary.modified} modified
            </Badge>
            <Badge
              className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500"
              data-testid="badge-removed-count"
            >
              <Minus className="h-3 w-3 mr-1" />
              {data.summary.removed} removed
            </Badge>
            <Badge variant="secondary" data-testid="badge-total-count">
              {data.summary.totalChanges} total changes
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-3 flex-wrap h-auto gap-1">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-xs"
                data-testid={tab.testId}
              >
                {tab.label}
                {categoryCounts[tab.filter || "all"] !== undefined && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-xs"
                  >
                    {categoryCounts[tab.filter || "all"]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {CATEGORY_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <ScrollArea className="h-[400px] pr-3">
                {isLoading ? (
                  <DiffSkeleton />
                ) : filteredDifferences.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <Package className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-sm font-medium">No changes found</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tab.filter
                        ? `No ${tab.label.toLowerCase()} changes between these versions`
                        : "These versions are identical"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDifferences.map((diff, index) => (
                      <DiffItem
                        key={`${diff.path}-${index}`}
                        diff={diff}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default QuoteDiffViewer;
