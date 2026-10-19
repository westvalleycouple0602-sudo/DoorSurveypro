import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, FolderOpen, MapPin, Building2, Copy, Trash2, Search, X, Upload, Filter, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import type { Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackProjectEvent } from "@/lib/project-analytics";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { ProjectCardSkeleton } from "@/components/project-card-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { ProjectFilters, type ProjectFilterState } from "@/components/project-filters";
import { UsageBadge, UsageAlert } from "@/components/usage-badge";
import emptyProjectsIllustration from "@assets/generated_images/empty_state_no_results.png";

interface ProjectUsageStats {
  current: number;
  limit: number | null;
  isUnlimited: boolean;
  percentUsed: number;
  remaining: number | null;
}

export default function Projects() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<ProjectFilterState>({
    status: "all",
    buildingType: "all",
    dateFrom: undefined,
    dateTo: undefined,
  });

  const { data: projects = [], isLoading, isError, error, refetch } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: usageStats, isLoading: usageLoading, isError: usageError, isFetching: usageFetching, refetch: refetchUsage } = useQuery<ProjectUsageStats>({
    queryKey: ["/api/projects/usage"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      trackProjectEvent("project_deleted", { location: "projects" });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Success",
        description: "Project deleted successfully. All associated data has been removed.",
      });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete project",
        description: error.message || "This project may contain data that needs to be archived first.",
        variant: "destructive",
      });
    },
  });

  const [duplicatingProjectId, setDuplicatingProjectId] = useState<string | null>(null);
  
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/projects/${id}/duplicate`);
    },
    onMutate: async (id: string) => {
      // Track which project is being duplicated to disable its button
      setDuplicatingProjectId(id);
    },
    onSuccess: async () => {
      trackProjectEvent("project_duplicated", { location: "projects" });
      try {
        // Invalidate queries and await the usage refetch to complete
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/projects/usage"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] }),
        ]);
        
        // Wait for usage stats to refetch before clearing duplicate state
        // usageFetching will be true during this time, keeping ALL buttons disabled
        await refetchUsage();
        
        toast({
          title: "Success",
          description: "Project duplicated successfully. You can now modify the copy independently.",
        });
      } finally {
        // Always clear duplicating state, even if refetch fails
        setDuplicatingProjectId(null);
      }
    },
    onError: async (error: Error) => {
      try {
        // On error, also refetch usage to ensure we have current limits
        await refetchUsage();
        
        toast({
          title: "Failed to duplicate project",
          description: error.message || "Unable to create a copy. Please verify you have sufficient storage.",
          variant: "destructive",
        });
      } finally {
        // Always clear duplicating state
        setDuplicatingProjectId(null);
      }
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateClick = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    duplicateMutation.mutate(projectId);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete);
    }
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.buildingType !== "all") count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters]);

  // Filter and sort projects with memoization
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        const matchesSearch = (
          project.name.toLowerCase().includes(search) ||
          project.location?.toLowerCase().includes(search) ||
          project.buildingType?.toLowerCase().includes(search) ||
          project.status.toLowerCase().includes(search)
        );
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== "all" && project.status !== filters.status) {
        return false;
      }

      // Building type filter
      if (filters.buildingType !== "all" && project.buildingType !== filters.buildingType) {
        return false;
      }

      // Date range filter
      const projectDate = new Date(project.createdAt);
      if (filters.dateFrom && projectDate < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (projectDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [projects, debouncedSearch, filters]);

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredProjects]);

  // Show error state
  if (isError) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load projects"
            message={error instanceof Error ? error.message : "Unable to fetch projects. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-projects"
            fullPage
          />
        </div>
      </div>
    );
  }

  // Use direct count comparison to avoid rounding issues with percentUsed
  const isAtLimit = usageStats && !usageStats.isUnlimited && usageStats.limit !== null && usageStats.current >= usageStats.limit;
  
  // Disable ALL creation controls while:
  // - Usage is loading (initial or refetch via usageFetching)
  // - Usage query errored
  // - No usage stats loaded
  // - At the limit
  // This prevents race conditions where stale usage data could allow duplicate clicks
  const disableCreation = !usageStats || usageLoading || usageError || usageFetching || isAtLimit;

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Projects</h1>
                {usageStats && (
                  <UsageBadge
                    current={usageStats.current}
                    limit={usageStats.limit}
                    isUnlimited={usageStats.isUnlimited}
                    percentUsed={usageStats.percentUsed}
                    resourceName="projects"
                  />
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Manage your survey projects and door openings
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:shrink-0">
              <Link href="/projects/bulk-import">
                <Button 
                  variant="outline" 
                  data-testid="button-bulk-import-projects" 
                  className="w-full sm:w-auto text-xs sm:text-sm"
                  size="sm"
                  disabled={disableCreation}
                >
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  <span className="truncate">Bulk Import</span>
                </Button>
              </Link>
              <Link href="/projects/new">
                <Button 
                  data-testid="button-new-project" 
                  className="w-full sm:w-auto text-xs sm:text-sm"
                  size="sm"
                  disabled={disableCreation}
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  <span className="truncate">New Project</span>
                </Button>
              </Link>
            </div>
          </div>
          
          {usageStats && (
            <UsageAlert
              current={usageStats.current}
              limit={usageStats.limit}
              isUnlimited={usageStats.isUnlimited}
              percentUsed={usageStats.percentUsed}
              resourceName="projects"
              upgradeLink="/billing"
            />
          )}
          
          {usageError && (
            <Alert variant="destructive" data-testid="alert-usage-error">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Unable to Load Project Limits</p>
                  <p className="text-sm">
                    We couldn't retrieve your subscription limits. Project creation is temporarily disabled.
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => refetchUsage()}
                  data-testid="button-retry-usage-stats"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8"
                data-testid="input-search-projects"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <ProjectFilters
          filters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
        />

        {(searchTerm || activeFilterCount > 0) && !isLoading && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="text-filter-results">
              {filteredProjects.length} result{filteredProjects.length !== 1 ? 's' : ''}
            </Badge>
            {searchTerm && (
              <span className="text-sm text-muted-foreground">for "{searchTerm}"</span>
            )}
            {activeFilterCount > 0 && (
              <span className="text-sm text-muted-foreground">
                with {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Start by creating your first project. You can add door openings, measurements, photos, and generate estimates for procurement."
            actionLabel="Create Your First Project"
            actionHref="/projects/new"
            illustration={emptyProjectsIllustration}
            illustrationAlt="No projects illustration"
          />
        ) : filteredProjects.length === 0 ? (
          activeFilterCount > 0 && !searchTerm ? (
            <EmptyState
              icon={Filter}
              title="No projects match your filters"
              description="Try adjusting or clearing your filters to see more results."
              actionLabel="Clear Filters"
              onAction={() => setFilters({
                status: "all",
                buildingType: "all",
                dateFrom: undefined,
                dateTo: undefined,
              })}
            />
          ) : searchTerm && activeFilterCount === 0 ? (
            <EmptyState
              icon={Search}
              title="No projects found"
              description={`No projects match "${searchTerm}". Try adjusting your search terms.`}
              actionLabel="Clear Search"
              onAction={() => setSearchTerm("")}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="No projects found"
              description={`No projects match "${searchTerm}" with your current filters. Try adjusting your search or clearing filters.`}
              actionLabel="Clear All"
              onAction={() => {
                setSearchTerm("");
                setFilters({
                  status: "all",
                  buildingType: "all",
                  dateFrom: undefined,
                  dateTo: undefined,
                });
              }}
            />
          )
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {sortedProjects.map((project) => (
              <Card key={project.id} className="hover-elevate active-elevate-2 h-full flex flex-col transition-all duration-200" data-testid={`card-project-${project.id}`}>
                <Link href={`/projects/${project.id}`} className="flex-1">
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                    <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                      <CardTitle className="text-sm sm:text-base flex-1 line-clamp-2 leading-tight">{project.name}</CardTitle>
                      <Badge 
                        variant={project.status === "active" ? "default" : "secondary"}
                        className={`text-[10px] sm:text-xs shrink-0 ${
                          project.status === "active"
                            ? "bg-chart-2 text-white"
                            : project.status === "completed"
                            ? "bg-chart-3 text-white"
                            : ""
                        }`}
                      >
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5 sm:space-y-2.5 pb-3 sm:pb-4 px-3 sm:px-6">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                      <span className="capitalize truncate">{project.buildingType}</span>
                    </div>
                    {project.notes && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 pt-0.5 sm:pt-1">
                        {project.notes}
                      </p>
                    )}
                  </CardContent>
                </Link>
                <CardContent className="pt-2 sm:pt-3 mt-auto border-t px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                      onClick={(e) => handleDuplicateClick(e, project.id)}
                      data-testid={`button-duplicate-${project.id}`}
                      disabled={duplicatingProjectId === project.id || disableCreation}
                    >
                      <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 shrink-0" />
                      <span className="truncate">{duplicatingProjectId === project.id ? "Copying..." : "Duplicate"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm h-8 sm:h-9 text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteClick(e, project.id)}
                      data-testid={`button-delete-${project.id}`}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 shrink-0" />
                      <span className="truncate">Delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title="Delete Project"
          description="Are you sure you want to delete this project? All door openings, photos, hardware, and related data will be permanently deleted."
          itemName={projects.find(p => p.id === projectToDelete)?.name}
        />
      </div>
    </div>
  );
}
