import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format, isAfter, subDays } from "date-fns";
import {
  History,
  Clock,
  GitBranch,
  ChevronRight,
  Check,
  RotateCcw,
  Eye,
  GitCompare,
  Plus,
  Pencil,
  Minus,
  Star,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { EntityVersion } from "@shared/schema";

interface RevisionHistoryTimelineProps {
  entityType: "quote" | "diagram" | "floor_plan" | "note" | "spec" | "opening";
  entityId: string;
  onVersionSelect?: (version: EntityVersion) => void;
  onCompareVersions?: (version1Id: string, version2Id: string) => void;
  onRestoreVersion?: (versionId: string) => void;
  selectedVersionId?: string;
  className?: string;
}

interface VersionWithDetails extends EntityVersion {
  author?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
  changeStats?: {
    added: number;
    modified: number;
    removed: number;
  };
  categories?: string[];
}

interface VersionHistoryResponse {
  versions: VersionWithDetails[];
  total: number;
  hasMore: boolean;
}

function ChangeBadge({
  type,
  count,
}: {
  type: "added" | "modified" | "removed";
  count: number;
}) {
  if (count === 0) return null;

  const config = {
    added: {
      icon: Plus,
      prefix: "+",
      className: "text-green-600 dark:text-green-400 bg-green-500/10",
    },
    modified: {
      icon: Pencil,
      prefix: "~",
      className: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    },
    removed: {
      icon: Minus,
      prefix: "-",
      className: "text-red-600 dark:text-red-400 bg-red-500/10",
    },
  };

  const { icon: Icon, prefix, className } = config[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium",
        className
      )}
      data-testid={`badge-change-${type}`}
    >
      <Icon className="h-3 w-3" />
      <span>
        {prefix}
        {count}
      </span>
    </span>
  );
}

function CategoryTag({ category }: { category: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground"
      data-testid={`tag-category-${category}`}
    >
      {category}
    </span>
  );
}

function VersionSkeleton() {
  return (
    <div className="flex gap-3 relative pb-6">
      <div className="flex flex-col items-center">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="w-0.5 flex-1 mt-2" />
      </div>
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export default function RevisionHistoryTimeline({
  entityType,
  entityId,
  onVersionSelect,
  onCompareVersions,
  onRestoreVersion,
  selectedVersionId,
  className,
}: RevisionHistoryTimelineProps) {
  const [page, setPage] = useState(1);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<string[]>([]);
  const pageSize = 10;

  const { data, isLoading, error } = useQuery<VersionHistoryResponse>({
    queryKey: [
      "/api/versioning/entities",
      entityType,
      entityId,
      "history",
      { page, pageSize },
    ],
  });

  const handleVersionClick = (version: VersionWithDetails) => {
    if (compareMode) {
      setCompareVersions((prev) => {
        if (prev.includes(version.id)) {
          return prev.filter((id) => id !== version.id);
        }
        if (prev.length >= 2) {
          return [prev[1], version.id];
        }
        return [...prev, version.id];
      });
    } else {
      onVersionSelect?.(version);
    }
  };

  const handleCompare = () => {
    if (compareVersions.length === 2 && onCompareVersions) {
      onCompareVersions(compareVersions[0], compareVersions[1]);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    if (compareMode) {
      setCompareVersions([]);
    }
  };

  const formatTimestamp = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const sevenDaysAgo = subDays(new Date(), 7);

    if (isAfter(dateObj, sevenDaysAgo)) {
      return formatDistanceToNow(dateObj, { addSuffix: true });
    }
    return format(dateObj, "MMM d, yyyy 'at' h:mm a");
  };

  const getAuthorInitials = (author: VersionWithDetails["author"]) => {
    if (!author) return "?";
    const first = author.firstName?.[0] || "";
    const last = author.lastName?.[0] || "";
    if (first || last) return `${first}${last}`.toUpperCase();
    return author.email?.[0]?.toUpperCase() || "?";
  };

  const getAuthorName = (author: VersionWithDetails["author"]) => {
    if (!author) return "Unknown";
    const name = `${author.firstName || ""} ${author.lastName || ""}`.trim();
    return name || author.email || "Unknown";
  };

  if (error) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-6">
          <div
            className="text-center text-destructive"
            data-testid="error-message"
          >
            <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load version history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <VersionSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.versions || data.versions.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-center py-8"
            data-testid="empty-state"
          >
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">No versions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Save your first version to start tracking changes
            </p>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-create-version"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create First Version
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)} data-testid="revision-history-timeline">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Version History
            <Badge variant="secondary" className="text-xs">
              {data.total}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={toggleCompareMode}
              data-testid="button-toggle-compare"
            >
              <GitCompare className="h-4 w-4 mr-1" />
              {compareMode ? "Exit Compare" : "Compare"}
            </Button>
          </div>
        </div>
        {compareMode && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md">
            <span className="text-xs text-muted-foreground">
              Select 2 versions to compare
            </span>
            {compareVersions.length === 2 && (
              <Button
                size="sm"
                onClick={handleCompare}
                data-testid="button-compare-versions"
              >
                Compare Selected
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-0">
            {data.versions.map((version, index) => {
              const isFirst = index === 0;
              const isLast = index === data.versions.length - 1;
              const isSelected = selectedVersionId === version.id;
              const isCompareSelected = compareVersions.includes(version.id);

              return (
                <div
                  key={version.id}
                  className={cn(
                    "flex gap-3 relative group transition-colors",
                    "rounded-lg p-2 -ml-2",
                    isSelected && "bg-primary/5 border border-primary/20",
                    isCompareSelected && "bg-blue-500/10 border border-blue-500/30",
                    !isSelected &&
                      !isCompareSelected &&
                      "hover:bg-muted/50"
                  )}
                  data-testid={`version-item-${version.id}`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full border-2 bg-background z-10",
                        isFirst
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      )}
                    >
                      {isFirst ? (
                        <Star className="h-4 w-4 text-primary" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={isFirst ? "default" : "outline"}
                            className="text-xs"
                            data-testid={`badge-version-${version.versionNumber}`}
                          >
                            v{version.versionNumber}
                          </Badge>
                          {isFirst && (
                            <Badge
                              variant="secondary"
                              className="text-xs flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Current
                            </Badge>
                          )}
                          {version.versionName && (
                            <span
                              className="text-sm font-medium truncate"
                              data-testid={`text-version-name-${version.id}`}
                            >
                              {version.versionName}
                            </span>
                          )}
                        </div>

                        {version.changeSummary && (
                          <p
                            className="text-sm text-muted-foreground mt-1 line-clamp-2"
                            data-testid={`text-change-summary-${version.id}`}
                          >
                            {version.changeSummary}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {version.changeStats && (
                            <div
                              className="flex items-center gap-1"
                              data-testid={`stats-${version.id}`}
                            >
                              <ChangeBadge
                                type="added"
                                count={version.changeStats.added}
                              />
                              <ChangeBadge
                                type="modified"
                                count={version.changeStats.modified}
                              />
                              <ChangeBadge
                                type="removed"
                                count={version.changeStats.removed}
                              />
                            </div>
                          )}
                          {version.categories &&
                            version.categories.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {version.categories.slice(0, 3).map((cat) => (
                                  <CategoryTag key={cat} category={cat} />
                                ))}
                                {version.categories.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{version.categories.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {version.author && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-5 w-5">
                                    {version.author.profileImageUrl && (
                                      <AvatarImage
                                        src={version.author.profileImageUrl}
                                      />
                                    )}
                                    <AvatarFallback className="text-xs">
                                      {getAuthorInitials(version.author)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span
                                    className="text-xs text-muted-foreground"
                                    data-testid={`text-author-${version.id}`}
                                  >
                                    {getAuthorName(version.author)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getAuthorName(version.author)}</p>
                                {version.author.email && (
                                  <p className="text-xs text-muted-foreground">
                                    {version.author.email}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="text-xs text-muted-foreground"
                                data-testid={`text-timestamp-${version.id}`}
                              >
                                {formatTimestamp(version.createdAt)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(
                                new Date(version.createdAt),
                                "MMMM d, yyyy 'at' h:mm:ss a"
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex items-center gap-1",
                          "opacity-0 group-hover:opacity-100 transition-opacity",
                          (isSelected || isCompareSelected) && "opacity-100"
                        )}
                        style={{ visibility: "visible" }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleVersionClick(version)}
                              aria-label="View version"
                              data-testid={`button-view-${version.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View this version</TooltipContent>
                        </Tooltip>

                        {!isFirst && onRestoreVersion && (
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label="Restore version"
                                    data-testid={`button-restore-${version.id}`}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Restore this version</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Restore to version {version.versionNumber}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will restore the {entityType} to version{" "}
                                  {version.versionNumber}
                                  {version.versionName &&
                                    ` ("${version.versionName}")`}
                                  . A new version will be created with the
                                  restored content. This action can be undone by
                                  restoring to a previous version.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  data-testid="button-cancel-restore"
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onRestoreVersion(version.id)}
                                  data-testid="button-confirm-restore"
                                >
                                  Restore
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {data.hasMore && (
            <div className="p-4 pt-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPage((p) => p + 1)}
                data-testid="button-load-more"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                Load More
              </Button>
            </div>
          )}

          <div className="p-4 pt-2 text-center">
            <span
              className="text-xs text-muted-foreground"
              data-testid="text-version-count"
            >
              Showing {data.versions.length} of {data.total} versions
            </span>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export { ChangeBadge, RevisionHistoryTimeline };
