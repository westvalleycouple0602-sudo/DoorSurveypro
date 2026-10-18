import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow, isPast, isFuture, addDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  Eye,
  FileText,
  Flag,
  Milestone,
  Filter,
  ClipboardCheck,
  Pause,
  Play,
  ExternalLink,
  Building2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import type { 
  Project, 
  ProcurementItem, 
  ProjectIssue, 
  ProjectMilestone,
  ProjectAssignment,
  ManufacturerOrderForm,
} from "@shared/schema";
import { manufacturerDirectory } from "@shared/projectManagement/manufacturerDirectory";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Download } from "lucide-react";
import { 
  PROJECT_PM_STATUS, 
  PROCUREMENT_STATUS,
  ISSUE_SEVERITY,
  ISSUE_STATUS,
  MILESTONE_STATUS,
} from "@shared/schema";

interface PMDashboardData {
  assignments: (ProjectAssignment & { project: Project })[];
  procurementItems: ProcurementItem[];
  issues: ProjectIssue[];
  milestones: ProjectMilestone[];
  stats: {
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
    pendingHandoffProjects: number;
    openIssues: number;
    criticalIssues: number;
    procurementRedFlags: number;
    upcomingMilestones: number;
    overdueMilestones: number;
  };
}

const pmStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending_handoff: { label: "Pending Handoff", variant: "outline", icon: Clock },
  active: { label: "Active", variant: "default", icon: Play },
  on_hold: { label: "On Hold", variant: "secondary", icon: Pause },
  in_review: { label: "In Review", variant: "secondary", icon: Eye },
  closed: { label: "Closed", variant: "outline", icon: CheckCircle },
};

const procurementStatusConfig: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  pending_info: { label: "Pending Info", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  ready_for_po: { label: "Ready for PO", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  po_sent: { label: "PO Sent", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  acknowledged: { label: "Acknowledged", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  partial_shipment: { label: "Partial Ship", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  complete: { label: "Complete", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  on_hold: { label: "On Hold", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

const issueSeverityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const issueStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Open", variant: "destructive" },
  in_review: { label: "In Review", variant: "secondary" },
  pending_response: { label: "Pending Response", variant: "outline" },
  resolved: { label: "Resolved", variant: "default" },
  closed: { label: "Closed", variant: "outline" },
};

const milestoneStatusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  not_started: { label: "Not Started", className: "text-gray-500", icon: Clock },
  in_progress: { label: "In Progress", className: "text-blue-500", icon: Play },
  completed: { label: "Completed", className: "text-green-500", icon: CheckCircle },
  overdue: { label: "Overdue", className: "text-red-500", icon: AlertCircle },
  blocked: { label: "Blocked", className: "text-orange-500", icon: XCircle },
};

export default function ProjectManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("all");
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>("all");
  const [issuesExpanded, setIssuesExpanded] = useState(true);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<PMDashboardData>({
    queryKey: ["/api/pm/dashboard"],
    refetchInterval: 60000,
  });

  const markMilestoneComplete = useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await apiRequest("PATCH", `/api/pm/milestones/${milestoneId}`, {
        status: "completed",
        actualCompletionDate: new Date().toISOString(),
        percentComplete: 100,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/dashboard"] });
      toast({
        title: "Milestone Completed",
        description: "The milestone has been marked as complete.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update milestone",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const resolveIssue = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await apiRequest("PATCH", `/api/pm/issues/${issueId}`, {
        status: "resolved",
        resolvedAt: new Date().toISOString(),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/dashboard"] });
      toast({
        title: "Issue Resolved",
        description: "The issue has been marked as resolved.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to resolve issue",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const stats = data?.stats || {
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    pendingHandoffProjects: 0,
    openIssues: 0,
    criticalIssues: 0,
    procurementRedFlags: 0,
    upcomingMilestones: 0,
    overdueMilestones: 0,
  };

  const filteredProjects = useMemo(() => {
    let projects = data?.assignments || [];
    
    if (statusFilter !== "all") {
      projects = projects.filter(a => a.pmStatus === statusFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      projects = projects.filter(a => 
        a.project?.name?.toLowerCase().includes(term) ||
        a.jobNumber?.toLowerCase().includes(term)
      );
    }
    
    return projects;
  }, [data?.assignments, statusFilter, searchTerm]);

  const filteredIssues = useMemo(() => {
    let issues = data?.issues || [];
    
    if (issueTypeFilter !== "all") {
      issues = issues.filter(i => i.type === issueTypeFilter);
    }
    
    if (issueStatusFilter !== "all") {
      issues = issues.filter(i => i.status === issueStatusFilter);
    }
    
    return issues;
  }, [data?.issues, issueTypeFilter, issueStatusFilter]);

  const calculateMilestoneProgress = (projectId: string) => {
    const projectMilestones = data?.milestones?.filter(m => m.projectId === projectId) || [];
    if (projectMilestones.length === 0) return 0;
    const completed = projectMilestones.filter(m => m.status === "completed").length;
    return Math.round((completed / projectMilestones.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={`stat-skel-${i}`} className="h-28 sm:h-32" />
          ))}
        </div>
        <Skeleton className="h-64 sm:h-96" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 sm:p-4 md:p-6">
        <ErrorState
          title="Failed to load project management dashboard"
          message={error instanceof Error ? error.message : "Unable to fetch data. Please try again."}
          error={error as Error}
          onRetry={refetch}
          testId="error-pm-dashboard"
          fullPage
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3" data-testid="text-pm-title">
            <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 shrink-0 text-primary" />
            Project Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1" data-testid="text-pm-subtitle">
            Track projects, procurement, issues, and milestones
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="text-xs sm:text-sm"
          data-testid="button-refresh-pm"
        >
          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <Card data-testid="card-active-projects">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Active Projects</p>
                <p className="text-2xl sm:text-3xl font-bold" data-testid="stat-active-projects">{stats.activeProjects}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                <FolderKanban className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.pendingHandoffProjects} pending handoff
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-projects">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600" data-testid="stat-completed-projects">{stats.completedProjects}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.onHoldProjects} on hold
            </p>
          </CardContent>
        </Card>

        <Card className={stats.criticalIssues > 0 ? "border-red-200 dark:border-red-900" : ""} data-testid="card-open-issues">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Open Issues</p>
                <p className="text-2xl sm:text-3xl font-bold" data-testid="stat-open-issues">{stats.openIssues}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center ${stats.criticalIssues > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                <AlertTriangle className={`h-5 w-5 sm:h-6 sm:w-6 ${stats.criticalIssues > 0 ? "text-red-600" : "text-orange-600"}`} />
              </div>
            </div>
            {stats.criticalIssues > 0 && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium" data-testid="stat-critical-issues">
                {stats.criticalIssues} critical
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={stats.procurementRedFlags > 0 ? "border-red-200 dark:border-red-900" : ""} data-testid="card-procurement-flags">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Procurement Flags</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600" data-testid="stat-procurement-flags">{stats.procurementRedFlags}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center ${stats.procurementRedFlags > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                <Flag className={`h-5 w-5 sm:h-6 sm:w-6 ${stats.procurementRedFlags > 0 ? "text-red-600" : "text-gray-400"}`} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Items needing attention
            </p>
          </CardContent>
        </Card>

        <Card className={stats.overdueMilestones > 0 ? "border-orange-200 dark:border-orange-900" : ""} data-testid="card-milestones">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Milestones</p>
                <p className="text-2xl sm:text-3xl font-bold" data-testid="stat-upcoming-milestones">{stats.upcomingMilestones}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center ${stats.overdueMilestones > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                <Milestone className={`h-5 w-5 sm:h-6 sm:w-6 ${stats.overdueMilestones > 0 ? "text-orange-600" : "text-blue-600"}`} />
              </div>
            </div>
            {stats.overdueMilestones > 0 && (
              <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium" data-testid="stat-overdue-milestones">
                {stats.overdueMilestones} overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="text-xs sm:text-sm">
            <LayoutDashboard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects" className="text-xs sm:text-sm">
            <FolderKanban className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">My Projects</span>
            <span className="sm:hidden">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="procurement" data-testid="tab-procurement" className="text-xs sm:text-sm">
            <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            Procurement
          </TabsTrigger>
          <TabsTrigger value="issues" data-testid="tab-issues" className="text-xs sm:text-sm">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            Issues
            {stats.openIssues > 0 && (
              <Badge variant="destructive" className="ml-1 sm:ml-2 shrink-0 text-xs">
                {stats.openIssues}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="milestones" data-testid="tab-milestones" className="text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="order-forms" data-testid="tab-order-forms" className="text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Order Forms</span>
            <span className="sm:hidden">Forms</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Recent Projects
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your most recent project assignments</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <ScrollArea className="h-64 sm:h-80">
                  <div className="space-y-3">
                    {(data?.assignments || []).slice(0, 5).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-2 sm:p-3 rounded-lg border hover-elevate"
                        data-testid={`project-item-${assignment.id}`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm truncate">{assignment.project?.name || "Unnamed Project"}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {assignment.jobNumber || "No job number"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={pmStatusConfig[assignment.pmStatus]?.variant || "secondary"} className="text-xs">
                            {pmStatusConfig[assignment.pmStatus]?.label || assignment.pmStatus}
                          </Badge>
                          <Link href={`/projects/${assignment.projectId}`}>
                            <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" aria-label="View project details" data-testid={`button-view-project-${assignment.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                    {(!data?.assignments || data.assignments.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No projects assigned yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                  Recent Issues
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <ScrollArea className="h-64 sm:h-80">
                  <div className="space-y-3">
                    {(data?.issues || []).filter(i => i.status !== "closed" && i.status !== "resolved").slice(0, 5).map((issue) => (
                      <div
                        key={issue.id}
                        className="flex items-start justify-between p-2 sm:p-3 rounded-lg border hover-elevate"
                        data-testid={`issue-item-${issue.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${issueSeverityConfig[issue.severity]?.className || ""}`}>
                              {issueSeverityConfig[issue.severity]?.label || issue.severity}
                            </span>
                            <Badge variant={issueStatusConfig[issue.status]?.variant || "secondary"} className="text-xs">
                              {issueStatusConfig[issue.status]?.label || issue.status}
                            </Badge>
                          </div>
                          <p className="font-medium text-xs sm:text-sm truncate">{issue.title}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{issue.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-xs ml-2"
                          onClick={() => resolveIssue.mutate(issue.id)}
                          disabled={resolveIssue.isPending}
                          data-testid={`button-resolve-issue-${issue.id}`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    ))}
                    {(!data?.issues || data.issues.filter(i => i.status !== "closed" && i.status !== "resolved").length === 0) && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No open issues
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                Upcoming Milestones
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Milestones due in the next 14 days</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="space-y-3">
                {(data?.milestones || [])
                  .filter(m => m.status !== "completed" && m.targetDate)
                  .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())
                  .slice(0, 5)
                  .map((milestone) => {
                    const isOverdue = milestone.targetDate && isPast(new Date(milestone.targetDate));
                    const MilestoneIcon = milestoneStatusConfig[milestone.status]?.icon || Clock;
                    
                    return (
                      <div
                        key={milestone.id}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border hover-elevate ${isOverdue ? "border-red-200 dark:border-red-900" : ""}`}
                        data-testid={`milestone-item-${milestone.id}`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg flex items-center justify-center ${isOverdue ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                            <MilestoneIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${milestoneStatusConfig[milestone.status]?.className || "text-blue-500"}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm truncate">{milestone.name}</p>
                            <p className={`text-[10px] sm:text-xs ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                              {milestone.targetDate ? (isOverdue ? "Overdue: " : "Due: ") + format(new Date(milestone.targetDate), "MMM d, yyyy") : "No target date"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 sm:w-24">
                            <Progress value={milestone.percentComplete} className="h-1.5 sm:h-2" />
                            <p className="text-[10px] text-muted-foreground text-center mt-0.5">{milestone.percentComplete}%</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => markMilestoneComplete.mutate(milestone.id)}
                            disabled={markMilestoneComplete.isPending}
                            data-testid={`button-complete-milestone-${milestone.id}`}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Complete</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                {(!data?.milestones || data.milestones.filter(m => m.status !== "completed").length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No upcoming milestones
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4 sm:mt-6 space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg">My Projects</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Projects assigned to you as Project Manager</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-sm w-full sm:w-48"
                      data-testid="input-search-projects"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-40" data-testid="select-status-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending_handoff">Pending Handoff</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <ScrollArea className="h-[400px] sm:h-[500px]">
                <div className="space-y-3">
                  {filteredProjects.map((assignment) => {
                    const progress = calculateMilestoneProgress(assignment.projectId);
                    
                    return (
                      <div
                        key={assignment.id}
                        className="p-3 sm:p-4 rounded-lg border hover-elevate"
                        data-testid={`project-card-${assignment.id}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm sm:text-base truncate">{assignment.project?.name || "Unnamed Project"}</p>
                              <Badge variant={pmStatusConfig[assignment.pmStatus]?.variant || "secondary"} className="text-xs shrink-0">
                                {pmStatusConfig[assignment.pmStatus]?.label || assignment.pmStatus}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Job #{assignment.jobNumber || "N/A"} • {assignment.project?.location || "No location"}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Link href={`/projects/${assignment.projectId}`}>
                              <Button size="sm" variant="outline" className="text-xs" data-testid={`button-view-details-${assignment.id}`}>
                                <Eye className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">View Details</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                            </Link>
                            <Link href={`/purchase-orders?projectId=${assignment.projectId}`}>
                              <Button size="sm" variant="outline" className="text-xs" data-testid={`button-manage-procurement-${assignment.id}`}>
                                <Package className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Procurement</span>
                                <span className="sm:hidden">PO</span>
                              </Button>
                            </Link>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Milestone Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        {assignment.estimatedCompletionDate && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Est. Completion: {format(new Date(assignment.estimatedCompletionDate), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No projects found</p>
                      <p className="text-xs mt-1">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement" className="mt-4 sm:mt-6 space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Procurement Tracking
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Track all procurement items across your projects</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-3 md:p-6 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs min-w-[100px]">Part Number</TableHead>
                      <TableHead className="text-xs min-w-[150px]">Description</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Manufacturer</TableHead>
                      <TableHead className="text-xs text-center w-16">Qty</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Status</TableHead>
                      <TableHead className="text-xs w-12 text-center">Flag</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Required Date</TableHead>
                      <TableHead className="text-xs w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.procurementItems || []).map((item) => (
                      <TableRow key={item.id} className={item.redFlag ? "bg-red-50 dark:bg-red-950/20" : ""} data-testid={`procurement-row-${item.id}`}>
                        <TableCell className="font-mono text-xs">{item.partNumber}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={item.description}>{item.description}</TableCell>
                        <TableCell className="text-xs">{item.manufacturer}</TableCell>
                        <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${procurementStatusConfig[item.status]?.className || ""}`}>
                            {procurementStatusConfig[item.status]?.label || item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.redFlag && (
                            <Flag className="h-4 w-4 text-red-500 mx-auto" data-testid={`flag-${item.id}`} />
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.requiredOnSiteDate ? format(new Date(item.requiredOnSiteDate), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <Link href={`/purchase-orders/new?itemId=${item.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" data-testid={`button-order-form-${item.id}`}>
                              <FileText className="h-3 w-3 mr-1" />
                              Order
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(!data?.procurementItems || data.procurementItems.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No procurement items</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="mt-4 sm:mt-6 space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                    Issues Summary
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Track and resolve project issues</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-40" data-testid="select-issue-type">
                      <SelectValue placeholder="Filter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="missing_info">Missing Info</SelectItem>
                      <SelectItem value="conflicting_info">Conflicting Info</SelectItem>
                      <SelectItem value="schedule_risk">Schedule Risk</SelectItem>
                      <SelectItem value="scope_gap">Scope Gap</SelectItem>
                      <SelectItem value="code_compliance">Code Compliance</SelectItem>
                      <SelectItem value="coordination">Coordination</SelectItem>
                      <SelectItem value="rfi">RFI</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={issueStatusFilter} onValueChange={setIssueStatusFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-40" data-testid="select-issue-status">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="pending_response">Pending Response</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <Collapsible open={issuesExpanded} onOpenChange={setIssuesExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between mb-3" data-testid="button-toggle-issues">
                    <span className="text-sm font-medium">{filteredIssues.length} issues</span>
                    {issuesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {filteredIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`p-3 sm:p-4 rounded-lg border hover-elevate ${issue.severity === "critical" ? "border-red-200 dark:border-red-900" : ""}`}
                          data-testid={`issue-card-${issue.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${issueSeverityConfig[issue.severity]?.className || ""}`}>
                                  {issueSeverityConfig[issue.severity]?.label || issue.severity}
                                </span>
                                <Badge variant={issueStatusConfig[issue.status]?.variant || "secondary"} className="text-xs">
                                  {issueStatusConfig[issue.status]?.label || issue.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground capitalize">{issue.type.replace(/_/g, " ")}</span>
                              </div>
                              <h4 className="font-semibold text-sm mb-1">{issue.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">{issue.description}</p>
                              {issue.dueDate && (
                                <p className={`text-xs mt-2 ${isPast(new Date(issue.dueDate)) ? "text-red-500" : "text-muted-foreground"}`}>
                                  Due: {format(new Date(issue.dueDate), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              {issue.status !== "resolved" && issue.status !== "closed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => resolveIssue.mutate(issue.id)}
                                  disabled={resolveIssue.isPending}
                                  data-testid={`button-resolve-${issue.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolve
                                </Button>
                              )}
                              <Link href={`/projects/${issue.projectId}`}>
                                <Button size="sm" variant="ghost" className="text-xs w-full" data-testid={`button-view-issue-project-${issue.id}`}>
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Project
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredIssues.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No issues found</p>
                          <p className="text-xs mt-1">All clear!</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 sm:mt-6 space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                Milestones Timeline
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Track project milestones and progress</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <ScrollArea className="h-[500px]">
                <div className="relative">
                  <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4 sm:space-y-6">
                    {(data?.milestones || [])
                      .sort((a, b) => {
                        if (!a.targetDate) return 1;
                        if (!b.targetDate) return -1;
                        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
                      })
                      .map((milestone, index) => {
                        const isOverdue = milestone.targetDate && milestone.status !== "completed" && isPast(new Date(milestone.targetDate));
                        const isCompleted = milestone.status === "completed";
                        const MilestoneIcon = milestoneStatusConfig[milestone.status]?.icon || Clock;
                        
                        return (
                          <div key={milestone.id} className="relative pl-10 sm:pl-14" data-testid={`milestone-timeline-${milestone.id}`}>
                            <div className={`absolute left-2 sm:left-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                              isCompleted ? "bg-green-100 dark:bg-green-900/30" :
                              isOverdue ? "bg-red-100 dark:bg-red-900/30" :
                              "bg-blue-100 dark:bg-blue-900/30"
                            }`}>
                              <MilestoneIcon className={`h-3 w-3 sm:h-4 sm:w-4 ${milestoneStatusConfig[milestone.status]?.className || "text-blue-500"}`} />
                            </div>
                            
                            <div className={`p-3 sm:p-4 rounded-lg border hover-elevate ${
                              isOverdue ? "border-red-200 dark:border-red-900" :
                              isCompleted ? "border-green-200 dark:border-green-900" : ""
                            }`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-sm">{milestone.name}</h4>
                                    {milestone.category && (
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {milestone.category}
                                      </Badge>
                                    )}
                                  </div>
                                  {milestone.description && (
                                    <p className="text-xs text-muted-foreground mb-2">{milestone.description}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <span className={isOverdue ? "text-red-500" : "text-muted-foreground"}>
                                      {milestone.targetDate ? (
                                        isOverdue ? `Overdue: ${format(new Date(milestone.targetDate), "MMM d, yyyy")}` :
                                        `Target: ${format(new Date(milestone.targetDate), "MMM d, yyyy")}`
                                      ) : "No target date"}
                                    </span>
                                    {milestone.actualCompletionDate && (
                                      <span className="text-green-600">
                                        Completed: {format(new Date(milestone.actualCompletionDate), "MMM d, yyyy")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className="text-xs font-medium">{milestone.percentComplete}%</p>
                                    <Progress value={milestone.percentComplete} className="h-1.5 w-16 sm:w-20" />
                                  </div>
                                  {!isCompleted && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => markMilestoneComplete.mutate(milestone.id)}
                                      disabled={markMilestoneComplete.isPending}
                                      data-testid={`button-mark-complete-${milestone.id}`}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Complete
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {(!data?.milestones || data.milestones.length === 0) && (
                      <div className="text-center py-12 text-muted-foreground pl-10 sm:pl-14">
                        <Milestone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No milestones yet</p>
                        <p className="text-xs mt-1">Milestones will appear here once added to projects</p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="order-forms" className="mt-4 sm:mt-6 space-y-4">
          <OrderFormsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderFormsPanel() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");

  const { data: orderForms = [], isLoading, isError, error, refetch } = useQuery<ManufacturerOrderForm[]>({
    queryKey: ["/api/manufacturer-order-forms"],
  });

  if (isError) {
    return (
      <ErrorState
        title="Failed to load order forms"
        message={error instanceof Error ? error.message : "Unable to fetch data."}
        error={error as Error}
        onRetry={refetch}
        testId="error-order-forms"
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Manufacturer Order Forms
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Generate and track order forms for procurement</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-order-form">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">New Order Form</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={`of-skel-${i}`} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ) : orderForms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No order forms generated yet</p>
              <p className="text-xs mt-1 mb-4">Create order forms to send procurement requests to manufacturers</p>
              <Button variant="outline" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-order-form-empty">
                <Plus className="h-4 w-4 mr-2" />
                Generate Order Form
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orderForms.map((form) => (
                <Card key={form.id} className="hover-elevate" data-testid={`card-order-form-${form.id}`}>
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm sm:text-base">{form.manufacturer}</CardTitle>
                      <Badge variant="outline" className="text-xs">Div {form.division}</Badge>
                    </div>
                    <CardDescription className="text-xs">Template: {form.templateId}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{(form.procurementItemIds as string[] || []).length} items included</p>
                      {form.createdAt && (
                        <p>Created: {format(new Date(form.createdAt), "MMM d, yyyy")}</p>
                      )}
                      {form.submittedAt && (
                        <p className="text-green-600 dark:text-green-400">
                          Submitted: {format(new Date(form.submittedAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <div className="p-3 sm:p-4 pt-0 flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs flex-1" data-testid={`button-view-order-form-${form.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs flex-1" data-testid={`button-download-order-form-${form.id}`}>
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Order Form</DialogTitle>
            <DialogDescription>
              Create a new manufacturer order form
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Manufacturer</label>
              <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                <SelectTrigger data-testid="select-order-form-manufacturer">
                  <SelectValue placeholder="Choose manufacturer..." />
                </SelectTrigger>
                <SelectContent>
                  {manufacturerDirectory.map((mfr) => (
                    <SelectItem key={mfr.id} value={mfr.id}>
                      {mfr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template</label>
              <Select disabled={!selectedManufacturer}>
                <SelectTrigger data-testid="select-order-form-template">
                  <SelectValue placeholder="Choose template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Order Form</SelectItem>
                  <SelectItem value="hardware">Hardware Schedule</SelectItem>
                  <SelectItem value="electrified">Electrified Hardware</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              The order form will include all eligible procurement items for the selected manufacturer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!selectedManufacturer} data-testid="button-generate-order-form">
              Generate Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
