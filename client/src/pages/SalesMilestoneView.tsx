import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Milestone,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  RefreshCw,
  ChevronRight,
  Calendar,
  Filter,
  Play,
  Pause,
  XCircle,
  Eye,
} from "lucide-react";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { ErrorState } from "@/components/error-state";
import type { 
  Project, 
  ProjectMilestone,
  ProjectAssignment,
} from "@shared/schema";

interface SalesProjectData {
  assignments: (ProjectAssignment & { project: Project })[];
  milestones: ProjectMilestone[];
}

const pmStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending_handoff: { label: "Pending Handoff", variant: "outline", icon: Clock },
  active: { label: "Active", variant: "default", icon: Play },
  on_hold: { label: "On Hold", variant: "secondary", icon: Pause },
  in_review: { label: "In Review", variant: "secondary", icon: Eye },
  closed: { label: "Closed", variant: "outline", icon: CheckCircle },
};

const milestoneStatusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  not_started: { label: "Not Started", className: "text-muted-foreground", icon: Clock },
  in_progress: { label: "In Progress", className: "text-blue-600 dark:text-blue-400", icon: Play },
  completed: { label: "Completed", className: "text-green-600 dark:text-green-400", icon: CheckCircle },
  overdue: { label: "Overdue", className: "text-red-600 dark:text-red-400", icon: AlertCircle },
  blocked: { label: "Blocked", className: "text-orange-600 dark:text-orange-400", icon: XCircle },
};

export default function SalesMilestoneView() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<SalesProjectData>({
    queryKey: ["/api/sales/projects-milestones"],
    refetchInterval: 60000,
  });

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const filteredAssignments = useMemo(() => {
    let assignments = data?.assignments || [];
    
    if (statusFilter !== "all") {
      assignments = assignments.filter(a => a.pmStatus === statusFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      assignments = assignments.filter(a => 
        a.project?.name?.toLowerCase().includes(term) ||
        a.jobNumber?.toLowerCase().includes(term) ||
        a.project?.location?.toLowerCase().includes(term)
      );
    }
    
    return assignments;
  }, [data?.assignments, statusFilter, searchTerm]);

  const getMilestonesForProject = (projectId: string) => {
    return (data?.milestones || [])
      .filter(m => m.projectId === projectId)
      .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));
  };

  const getProjectProgress = (projectId: string) => {
    const milestones = getMilestonesForProject(projectId);
    if (milestones.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = milestones.filter(m => m.status === "completed").length;
    return {
      completed,
      total: milestones.length,
      percent: Math.round((completed / milestones.length) * 100),
    };
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view milestone tracking.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const allowedRoles = ["sales_rep", "admin", "owner"];
  if (user.role && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page is only accessible to sales representatives, administrators, and owners.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
        </div>
        <Skeleton className="h-48 sm:h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load milestone data"
        message={error instanceof Error ? error.message : "An error occurred"}
        onRetry={() => refetch()}
      />
    );
  }

  const stats = {
    totalProjects: filteredAssignments.length,
    activeProjects: filteredAssignments.filter(a => a.pmStatus === "active").length,
    completedMilestones: (data?.milestones || []).filter(m => m.status === "completed").length,
    totalMilestones: (data?.milestones || []).length,
    overdueMilestones: (data?.milestones || []).filter(m => 
      m.status !== "completed" && m.targetDate && isPast(new Date(m.targetDate))
    ).length,
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
            <Milestone className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 shrink-0 text-primary" />
            Sales Milestone Tracker
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Track project milestones for your assigned projects
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="text-xs sm:text-sm"
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Projects</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="text-total-projects">{stats.totalProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="text-active-projects">{stats.activeProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="text-completed-milestones">
              {stats.completedMilestones}/{stats.totalMilestones}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span className="text-xs text-muted-foreground">Overdue</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-red-600" data-testid="text-overdue-milestones">
              {stats.overdueMilestones}
            </p>
          </CardContent>
        </Card>
        <Card className="hidden xl:block">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Milestone className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Progress</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1" data-testid="text-overall-progress">
              {stats.totalMilestones > 0 ? Math.round((stats.completedMilestones / stats.totalMilestones) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base sm:text-lg">Project Milestones</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 sm:pl-8 h-8 sm:h-9 w-40 sm:w-48 text-xs sm:text-sm"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 sm:h-9 w-32 sm:w-36 text-xs sm:text-sm" data-testid="select-status-filter">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(pmStatusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Milestone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No projects found</p>
              <p className="text-xs mt-1">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "No projects are assigned to you yet"}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {filteredAssignments.map((assignment) => {
                  const project = assignment.project;
                  const milestones = getMilestonesForProject(assignment.projectId);
                  const progress = getProjectProgress(assignment.projectId);
                  const isExpanded = expandedProjects.has(assignment.projectId);
                  const statusInfo = pmStatusConfig[assignment.pmStatus || ""] || pmStatusConfig.pending_handoff;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <Card key={assignment.id} className="overflow-hidden" data-testid={`card-project-${assignment.projectId}`}>
                      <div 
                        className="p-3 sm:p-4 cursor-pointer hover-elevate transition-colors"
                        onClick={() => toggleProject(assignment.projectId)}
                        data-testid={`button-toggle-project-${assignment.projectId}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm sm:text-base truncate">
                                {project?.name || "Unnamed Project"}
                              </h3>
                              <Badge variant={statusInfo.variant} className="text-xs shrink-0">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {assignment.jobNumber && (
                                <span>Job: {assignment.jobNumber}</span>
                              )}
                              {project?.location && (
                                <span className="truncate max-w-[200px]">{project.location}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-muted-foreground">Milestones</p>
                              <p className="text-sm font-medium">{progress.completed}/{progress.total}</p>
                            </div>
                            <div className="w-16 sm:w-24">
                              <Progress value={progress.percent} className="h-2" />
                              <p className="text-xs text-muted-foreground text-right mt-0.5">{progress.percent}%</p>
                            </div>
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-muted/30">
                          {milestones.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                              No milestones defined for this project
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="text-xs">Milestone</TableHead>
                                  <TableHead className="text-xs hidden sm:table-cell">Target Date</TableHead>
                                  <TableHead className="text-xs hidden md:table-cell">Completed</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                  <TableHead className="text-xs text-right">Progress</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {milestones.map((milestone) => {
                                  const statusConfig = milestoneStatusConfig[milestone.status || "not_started"] || milestoneStatusConfig.not_started;
                                  const StatusIcon = statusConfig.icon;
                                  const isOverdue = milestone.status !== "completed" && 
                                    milestone.targetDate && 
                                    isPast(new Date(milestone.targetDate));

                                  return (
                                    <TableRow 
                                      key={milestone.id}
                                      className="hover:bg-muted/50"
                                      data-testid={`row-milestone-${milestone.id}`}
                                    >
                                      <TableCell className="font-medium text-xs sm:text-sm">
                                        <div>
                                          <p className="truncate max-w-[150px] sm:max-w-none">{milestone.name}</p>
                                          {milestone.description && (
                                            <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[250px]">
                                              {milestone.description}
                                            </p>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-xs hidden sm:table-cell">
                                        {milestone.targetDate ? (
                                          <div className={isOverdue ? "text-red-600" : ""}>
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              {format(new Date(milestone.targetDate), "MMM d, yyyy")}
                                            </div>
                                            {isOverdue && (
                                              <span className="text-xs">
                                                {formatDistanceToNow(new Date(milestone.targetDate), { addSuffix: true })}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-xs hidden md:table-cell">
                                        {milestone.actualCompletionDate ? (
                                          <span className="text-green-600">
                                            {format(new Date(milestone.actualCompletionDate), "MMM d, yyyy")}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className={`flex items-center gap-1 text-xs ${statusConfig.className}`}>
                                          <StatusIcon className="h-3 w-3" />
                                          <span>{statusConfig.label}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Progress 
                                            value={milestone.percentComplete || 0} 
                                            className="w-12 sm:w-16 h-1.5" 
                                          />
                                          <span className="text-xs text-muted-foreground w-8 text-right">
                                            {milestone.percentComplete || 0}%
                                          </span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                          <div className="p-3 border-t flex justify-end">
                            <Link href={`/projects/${assignment.projectId}`}>
                              <Button variant="outline" size="sm" className="text-xs" data-testid={`button-view-project-${assignment.projectId}`}>
                                View Project Details
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
