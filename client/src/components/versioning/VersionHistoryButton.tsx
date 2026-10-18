import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RevisionHistoryTimeline } from "./RevisionHistoryTimeline";
import type { VersioningEntityType } from "./useVersioning";
import type { EntityVersion } from "@shared/schema";

interface VersionHistoryButtonProps {
  entityType: VersioningEntityType;
  entityId: string;
  onVersionSelect?: (version: EntityVersion) => void;
  onCompare?: (version1Id: string, version2Id: string) => void;
  onRestore?: (versionId: string) => void;
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  sheetSide?: "left" | "right" | "top" | "bottom";
}

interface VersionHistoryResponse {
  versions: EntityVersion[];
  total: number;
  hasMore: boolean;
}

export function VersionHistoryButton({
  entityType,
  entityId,
  onVersionSelect,
  onCompare,
  onRestore,
  className,
  showLabel = true,
  variant = "outline",
  size = "default",
  sheetSide = "right",
}: VersionHistoryButtonProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: historyData, isLoading } = useQuery<VersionHistoryResponse>({
    queryKey: ["/api/versioning/entities", entityType, entityId, "history", { page: 1, pageSize: 1 }],
    enabled: Boolean(entityId),
  });

  const versionCount = historyData?.total ?? 0;

  const handleVersionSelect = (version: EntityVersion) => {
    onVersionSelect?.(version);
  };

  const handleCompare = (version1Id: string, version2Id: string) => {
    onCompare?.(version1Id, version2Id);
    setSheetOpen(false);
  };

  const handleRestore = (versionId: string) => {
    onRestore?.(versionId);
  };

  const buttonContent = (
    <>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <History className="h-4 w-4" />
      )}
      {showLabel && size !== "icon" && <span className="ml-1">History</span>}
      {versionCount > 0 && size !== "icon" && (
        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
          {versionCount}
        </Badge>
      )}
    </>
  );

  if (size === "icon") {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                variant={variant}
                size="icon"
                className={cn("relative", className)}
                aria-label="View version history"
                data-testid="button-view-history"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <History className="h-4 w-4" />
                )}
                {versionCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                  >
                    {versionCount > 99 ? "99+" : versionCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>View version history ({versionCount} versions)</p>
          </TooltipContent>
        </Tooltip>
        
        <SheetContent side={sheetSide} className="w-full sm:max-w-lg" data-testid="sheet-version-history">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
            <SheetDescription>
              View and manage versions of this {entityType.replace("_", " ")}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-4 -mx-6">
            <RevisionHistoryTimeline
              entityType={entityType}
              entityId={entityId}
              onVersionSelect={handleVersionSelect}
              onCompareVersions={handleCompare}
              onRestoreVersion={handleRestore}
              className="border-0 shadow-none"
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          data-testid="button-view-history"
        >
          {buttonContent}
        </Button>
      </SheetTrigger>
      
      <SheetContent side={sheetSide} className="w-full sm:max-w-lg" data-testid="sheet-version-history">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </SheetTitle>
          <SheetDescription>
            View and manage versions of this {entityType.replace("_", " ")}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-4 -mx-6">
          <RevisionHistoryTimeline
            entityType={entityType}
            entityId={entityId}
            onVersionSelect={handleVersionSelect}
            onCompareVersions={handleCompare}
            onRestoreVersion={handleRestore}
            className="border-0 shadow-none"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default VersionHistoryButton;
