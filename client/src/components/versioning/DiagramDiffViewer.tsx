import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Move,
  Link2,
  StickyNote,
  Plus,
  Minus,
  Pencil,
  ArrowRight,
  RefreshCw,
  Maximize2,
  Layers,
  Box,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  MoveRight,
  MoveDown,
  MoveUp,
  MoveLeft,
  ArrowUpRight,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface DiagramDiffViewerProps {
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

interface Position {
  x: number;
  y: number;
}

interface Movement {
  deltaX: number;
  deltaY: number;
  direction: string;
}

const DIAGRAM_CATEGORY_TABS = [
  { id: "all", label: "All Changes", filter: null, testId: "tab-all" },
  { id: "components", label: "Components", filter: "components", testId: "tab-components" },
  { id: "connections", label: "Connections", filter: "connections", testId: "tab-connections" },
  { id: "annotations", label: "Annotations", filter: "annotations", testId: "tab-annotations" },
  { id: "position", label: "Positions", filter: "position", testId: "tab-positions" },
] as const;

function formatDiagramPath(path: string): string {
  return path
    .replace(/\[(\d+)\]/g, (_, index) => ` #${parseInt(index) + 1}`)
    .replace(/components/gi, "Component")
    .replace(/connections/gi, "Connection")
    .replace(/annotations/gi, "Annotation")
    .replace(/position/gi, "Position")
    .replace(/\.x$/, " X")
    .replace(/\.y$/, " Y")
    .replace(/\.width$/, " Width")
    .replace(/\.height$/, " Height")
    .replace(/\./g, " → ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatCoordinates(x: number | undefined, y: number | undefined): string {
  if (x === undefined && y === undefined) return "—";
  const xStr = x !== undefined ? x.toFixed(1) : "?";
  const yStr = y !== undefined ? y.toFixed(1) : "?";
  return `(${xStr}, ${yStr})`;
}

function calculateMovement(oldPos: Position | null, newPos: Position | null): Movement | null {
  if (!oldPos || !newPos) return null;
  
  const deltaX = newPos.x - oldPos.x;
  const deltaY = newPos.y - oldPos.y;
  
  const parts: string[] = [];
  if (Math.abs(deltaX) > 0.1) {
    parts.push(`${Math.abs(deltaX).toFixed(1)}px ${deltaX > 0 ? "right" : "left"}`);
  }
  if (Math.abs(deltaY) > 0.1) {
    parts.push(`${Math.abs(deltaY).toFixed(1)}px ${deltaY > 0 ? "down" : "up"}`);
  }
  
  return {
    deltaX,
    deltaY,
    direction: parts.length > 0 ? `Moved ${parts.join(", ")}` : "No movement",
  };
}

function extractPosition(value: any): Position | null {
  if (!value || typeof value !== "object") return null;
  if (typeof value.x === "number" && typeof value.y === "number") {
    return { x: value.x, y: value.y };
  }
  return null;
}

function isPositionChange(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return lowerPath.includes("position") || lowerPath.endsWith(".x") || lowerPath.endsWith(".y");
}

function isConnectionPath(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return lowerPath.includes("connection") || lowerPath.includes("wire") || lowerPath.includes("link");
}

function isAnnotationPath(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return lowerPath.includes("annotation") || lowerPath.includes("note") || lowerPath.includes("label") || lowerPath.includes("callout");
}

function ComponentIcon({ type, className }: { type: string; className?: string }) {
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes("door")) {
    return <Box className={cn("h-4 w-4", className)} />;
  }
  if (lowerType.includes("frame")) {
    return <Maximize2 className={cn("h-4 w-4", className)} />;
  }
  if (lowerType.includes("hardware") || lowerType.includes("lock") || lowerType.includes("hinge")) {
    return <Layers className={cn("h-4 w-4", className)} />;
  }
  if (isConnectionPath(type)) {
    return <Link2 className={cn("h-4 w-4", className)} />;
  }
  if (isAnnotationPath(type)) {
    return <StickyNote className={cn("h-4 w-4", className)} />;
  }
  if (isPositionChange(type)) {
    return <Move className={cn("h-4 w-4", className)} />;
  }
  
  return <Box className={cn("h-4 w-4", className)} />;
}

function MovementArrow({ deltaX, deltaY }: { deltaX: number; deltaY: number }) {
  if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) {
    return null;
  }
  
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  
  return (
    <div className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full">
      <ArrowUpRight
        className="h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform"
        style={{ transform: `rotate(${angle - 45}deg)` }}
      />
    </div>
  );
}

interface PositionChangeProps {
  oldPosition: Position | null;
  newPosition: Position | null;
}

function PositionChange({ oldPosition, newPosition }: PositionChangeProps) {
  const movement = calculateMovement(oldPosition, newPosition);
  
  if (!movement) return null;
  
  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
      <MovementArrow deltaX={movement.deltaX} deltaY={movement.deltaY} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-red-600 dark:text-red-400 font-mono">
            {formatCoordinates(oldPosition?.x, oldPosition?.y)}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-green-600 dark:text-green-400 font-mono">
            {formatCoordinates(newPosition?.x, newPosition?.y)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{movement.direction}</p>
      </div>
    </div>
  );
}

interface ConnectionChangeProps {
  previousValue: any;
  newValue: any;
  changeType: "added" | "modified" | "removed";
}

function ConnectionChange({ previousValue, newValue, changeType }: ConnectionChangeProps) {
  const getEndpoints = (value: any) => {
    if (!value || typeof value !== "object") return { from: "?", to: "?" };
    return {
      from: value.fromId || value.sourceId || value.startId || "?",
      to: value.toId || value.targetId || value.endId || "?",
    };
  };
  
  const oldEndpoints = previousValue ? getEndpoints(previousValue) : null;
  const newEndpoints = newValue ? getEndpoints(newValue) : null;
  
  return (
    <div className="flex flex-col gap-2 p-2 bg-muted/50 rounded-md">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">Connection</span>
      </div>
      
      <div className="flex items-center gap-3">
        {changeType === "removed" && oldEndpoints && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-xs">
              <span className="font-mono text-red-700 dark:text-red-300">{oldEndpoints.from}</span>
              <span className="border-t border-dashed border-red-400 w-4" />
              <span className="font-mono text-red-700 dark:text-red-300">{oldEndpoints.to}</span>
            </div>
          </div>
        )}
        
        {changeType === "added" && newEndpoints && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-xs">
              <span className="font-mono text-green-700 dark:text-green-300">{newEndpoints.from}</span>
              <span className="border-t-2 border-solid border-green-400 w-4" />
              <span className="font-mono text-green-700 dark:text-green-300">{newEndpoints.to}</span>
            </div>
          </div>
        )}
        
        {changeType === "modified" && oldEndpoints && newEndpoints && (
          <>
            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-xs line-through">
              <span className="font-mono text-red-700 dark:text-red-300">{oldEndpoints.from}</span>
              <span className="border-t border-dashed border-red-400 w-4" />
              <span className="font-mono text-red-700 dark:text-red-300">{oldEndpoints.to}</span>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-xs">
              <span className="font-mono text-green-700 dark:text-green-300">{newEndpoints.from}</span>
              <span className="border-t-2 border-solid border-green-400 w-4" />
              <span className="font-mono text-green-700 dark:text-green-300">{newEndpoints.to}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PathLabel({ path }: { path: string }) {
  const formatted = formatDiagramPath(path);
  
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

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return "—";
  }
  
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  
  if (typeof value === "string") {
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

interface ValueDisplayProps {
  value: any;
  variant?: "added" | "removed" | "neutral";
  className?: string;
}

function ValueDisplay({ value, variant = "neutral", className }: ValueDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const formattedValue = formatValue(value);
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

interface DiagramDiffItemProps {
  diff: DiffResult;
  index: number;
}

function DiagramDiffItem({ diff, index }: DiagramDiffItemProps) {
  const [expanded, setExpanded] = useState(false);
  
  const config = {
    added: {
      icon: Plus,
      borderClass: "border-l-4 border-l-green-500",
      bgClass: "bg-green-50 dark:bg-green-950/20",
      iconClass: "text-green-600 dark:text-green-400",
      badgeClass: "border-green-500 text-green-700 dark:text-green-300 bg-green-500/10",
    },
    modified: {
      icon: Pencil,
      borderClass: "border-l-4 border-l-amber-500",
      bgClass: "bg-amber-50 dark:bg-amber-950/20",
      iconClass: "text-amber-600 dark:text-amber-400",
      badgeClass: "border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/10",
    },
    removed: {
      icon: Minus,
      borderClass: "border-l-4 border-l-red-500",
      bgClass: "bg-red-50 dark:bg-red-950/20",
      iconClass: "text-red-600 dark:text-red-400",
      badgeClass: "border-red-500 text-red-700 dark:text-red-300 bg-red-500/10",
    },
  };
  
  const { icon: Icon, borderClass, bgClass, iconClass, badgeClass } = config[diff.changeType];
  const hasComplexValue = 
    (diff.previousValue && typeof diff.previousValue === "object") ||
    (diff.newValue && typeof diff.newValue === "object");
  
  const showPositionChange = isPositionChange(diff.path) && diff.changeType === "modified";
  const showConnectionChange = isConnectionPath(diff.path);
  
  const oldPosition = extractPosition(diff.previousValue);
  const newPosition = extractPosition(diff.newValue);
  
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
          <ComponentIcon type={diff.path} className={iconClass} />
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
          
          <div className="space-y-2">
            {showPositionChange && oldPosition && newPosition ? (
              <PositionChange oldPosition={oldPosition} newPosition={newPosition} />
            ) : showConnectionChange ? (
              <ConnectionChange
                previousValue={diff.previousValue}
                newValue={diff.newValue}
                changeType={diff.changeType}
              />
            ) : (
              <>
                {diff.changeType === "added" && (
                  <ValueDisplay value={diff.newValue} variant="added" />
                )}
                
                {diff.changeType === "removed" && (
                  <ValueDisplay value={diff.previousValue} variant="removed" />
                )}
                
                {diff.changeType === "modified" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <ValueDisplay
                      value={diff.previousValue}
                      variant="removed"
                      className="flex-shrink-0"
                    />
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <ValueDisplay
                      value={diff.newValue}
                      variant="added"
                      className="flex-shrink-0"
                    />
                  </div>
                )}
              </>
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

export function DiagramDiffViewer({
  versionId1,
  versionId2,
  onClose,
  className,
}: DiagramDiffViewerProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [showOverlay, setShowOverlay] = useState(false);
  const [sideBySide, setSideBySide] = useState(false);
  
  const { data, isLoading, error, refetch, isRefetching } = useQuery<ComparisonResponse>({
    queryKey: ["/api/versioning/compare", "diagram", versionId1, versionId2],
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
    
    const activeFilter = DIAGRAM_CATEGORY_TABS.find((tab) => tab.id === activeTab)?.filter;
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
      <Card className={cn("", className)} data-testid="diagram-diff-viewer">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <h3 className="font-medium text-destructive">Failed to compare diagram versions</h3>
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
    <Card className={cn("", className)} data-testid="diagram-diff-viewer">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Diagram Comparison
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
          <>
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
            
            <div className="flex items-center gap-4 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id="overlay-toggle"
                  checked={showOverlay}
                  onCheckedChange={setShowOverlay}
                  data-testid="toggle-overlay"
                />
                <Label htmlFor="overlay-toggle" className="text-sm cursor-pointer">
                  Show Overlay
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="side-by-side-toggle"
                  checked={sideBySide}
                  onCheckedChange={setSideBySide}
                  data-testid="toggle-side-by-side"
                />
                <Label htmlFor="side-by-side-toggle" className="text-sm cursor-pointer">
                  Side by Side
                </Label>
              </div>
            </div>
          </>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {showOverlay && data && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/30">
            <div className={cn(
              "grid gap-4",
              sideBySide ? "grid-cols-2" : "grid-cols-1"
            )}>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Version {data.version1.versionNumber}
                  {data.version1.versionName && ` - ${data.version1.versionName}`}
                </p>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center border-2 border-dashed border-red-300 dark:border-red-700">
                  <div className="text-center text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Before</p>
                  </div>
                </div>
              </div>
              {sideBySide && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Version {data.version2.versionNumber}
                    {data.version2.versionName && ` - ${data.version2.versionName}`}
                  </p>
                  <div className="aspect-video bg-muted rounded-md flex items-center justify-center border-2 border-dashed border-green-300 dark:border-green-700">
                    <div className="text-center text-muted-foreground">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">After</p>
                    </div>
                  </div>
                </div>
              )}
              {!sideBySide && (
                <div className="text-xs text-muted-foreground text-center">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500/50" /> Removed
                  </span>
                  <span className="mx-2">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500/50" /> Added
                  </span>
                  <span className="mx-2">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500/50" /> Modified
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-3 flex-wrap h-auto gap-1">
            {DIAGRAM_CATEGORY_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-xs"
                data-testid={tab.testId}
              >
                {tab.id === "components" && <Box className="h-3 w-3 mr-1" />}
                {tab.id === "connections" && <Link2 className="h-3 w-3 mr-1" />}
                {tab.id === "annotations" && <StickyNote className="h-3 w-3 mr-1" />}
                {tab.id === "position" && <Move className="h-3 w-3 mr-1" />}
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
          
          {DIAGRAM_CATEGORY_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <ScrollArea className="h-[400px] pr-3">
                {isLoading ? (
                  <DiffSkeleton />
                ) : filteredDifferences.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <Layers className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-sm font-medium">No changes found</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tab.filter
                        ? `No ${tab.label.toLowerCase()} changes between these versions`
                        : "These diagram versions are identical"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDifferences.map((diff, index) => (
                      <DiagramDiffItem
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

export default DiagramDiffViewer;
