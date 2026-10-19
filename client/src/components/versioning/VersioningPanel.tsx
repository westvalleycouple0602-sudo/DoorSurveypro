import { useQuery } from "@tanstack/react-query";
import { GitBranch, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SaveVersionButton } from "./SaveVersionButton";
import { VersionHistoryButton } from "./VersionHistoryButton";
import { QuoteDiffViewer } from "./QuoteDiffViewer";
import { DiagramDiffViewer } from "./DiagramDiffViewer";
import { useVersioning, type VersioningEntityType } from "./useVersioning";
import type { EntityVersion } from "@shared/schema";

interface VersioningPanelProps {
  entityType: VersioningEntityType;
  entityId: string;
  getSnapshot: () => Record<string, any>;
  onVersionSelect?: (version: EntityVersion) => void;
  onVersionRestored?: () => void;
  className?: string;
  compact?: boolean;
}

interface VersionHistoryResponse {
  versions: EntityVersion[];
  total: number;
  hasMore: boolean;
}

function CurrentVersionBadge({ 
  entityType, 
  entityId,
  isLoading,
  versionNumber,
}: { 
  entityType: VersioningEntityType;
  entityId: string;
  isLoading: boolean;
  versionNumber?: number;
}) {
  if (isLoading) {
    return <Skeleton className="h-5 w-16" />;
  }

  if (!versionNumber) {
    return (
      <Badge variant="outline" className="text-muted-foreground" data-testid="badge-no-version">
        No versions
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" data-testid="badge-current-version">
      v{versionNumber}
    </Badge>
  );
}

export function VersioningPanel({
  entityType,
  entityId,
  getSnapshot,
  onVersionSelect,
  onVersionRestored,
  className,
  compact = false,
}: VersioningPanelProps) {
  const {
    isComparing,
    compareVersionIds,
    startCompare,
    stopCompare,
    restoreVersion,
    isRestoring,
  } = useVersioning({
    entityType,
    entityId,
    onVersionSaved: () => {
    },
  });

  const { data: historyData, isLoading } = useQuery<VersionHistoryResponse>({
    queryKey: ["/api/versioning/entities", entityType, entityId, "history", { page: 1, pageSize: 1 }],
    enabled: Boolean(entityId),
  });

  const currentVersion = historyData?.versions?.[0];
  const versionCount = historyData?.total ?? 0;

  const handleVersionSelect = (version: EntityVersion) => {
    onVersionSelect?.(version);
  };

  const handleCompare = (version1Id: string, version2Id: string) => {
    startCompare(version1Id, version2Id);
  };

  const handleRestore = (versionId: string) => {
    restoreVersion(versionId);
    onVersionRestored?.();
  };

  const renderDiffViewer = () => {
    if (!isComparing || !compareVersionIds) return null;

    const DiffViewer = entityType === "quote" ? QuoteDiffViewer : DiagramDiffViewer;

    return (
      <div className="mt-4" data-testid="diff-viewer-container">
        <DiffViewer
          versionId1={compareVersionIds[0]}
          versionId2={compareVersionIds[1]}
          onClose={stopCompare}
        />
      </div>
    );
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)} data-testid="versioning-panel-compact">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <CurrentVersionBadge
            entityType={entityType}
            entityId={entityId}
            isLoading={isLoading}
            versionNumber={currentVersion?.versionNumber}
          />
        </div>
        
        <Separator orientation="vertical" className="h-4" />
        
        <SaveVersionButton
          entityType={entityType}
          entityId={entityId}
          getSnapshot={getSnapshot}
          size="sm"
          showLabel={false}
        />
        
        <VersionHistoryButton
          entityType={entityType}
          entityId={entityId}
          onVersionSelect={handleVersionSelect}
          onCompare={handleCompare}
          onRestore={handleRestore}
          size="icon"
          variant="ghost"
        />
        
        {isRestoring && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <Card className={className} data-testid="versioning-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            Version Control
          </CardTitle>
          <div className="flex items-center gap-2">
            <CurrentVersionBadge
              entityType={entityType}
              entityId={entityId}
              isLoading={isLoading}
              versionNumber={currentVersion?.versionNumber}
            />
            {versionCount > 0 && (
              <Badge variant="outline" className="text-xs" data-testid="badge-version-count">
                {versionCount} version{versionCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <SaveVersionButton
            entityType={entityType}
            entityId={entityId}
            getSnapshot={getSnapshot}
            size="default"
          />
          
          <VersionHistoryButton
            entityType={entityType}
            entityId={entityId}
            onVersionSelect={handleVersionSelect}
            onCompare={handleCompare}
            onRestore={handleRestore}
            size="default"
          />
        </div>
        
        {currentVersion?.versionName && (
          <div className="flex items-center gap-2 text-sm" data-testid="current-version-info">
            <span className="text-muted-foreground">Current:</span>
            <span className="font-medium">{currentVersion.versionName}</span>
          </div>
        )}
        
        {isComparing && compareVersionIds && (
          <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Comparing</Badge>
              <span className="text-muted-foreground">
                Version {compareVersionIds[0].slice(0, 8)} vs {compareVersionIds[1].slice(0, 8)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopCompare}
              data-testid="button-stop-compare"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {isRestoring && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Restoring version...</span>
          </div>
        )}
        
        {renderDiffViewer()}
      </CardContent>
    </Card>
  );
}

export default VersioningPanel;
