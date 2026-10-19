import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  FolderKanban,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Flag,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  Calendar,
  Package,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { useAppUser as useAuth } from "@/hooks/use-app-user";

interface PMAnalytics {
  projectManagerId: string;
  organizationId: string;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  overdueProjects: number;
  totalProcurementItems: number;
  procurementItemsComplete: number;
  procurementRedFlags: number;
  openIssues: number;
  criticalIssues: number;
  upcomingMilestones: number;
  overdueMilestones: number;
  avgProjectDurationDays: number | null;
  calculatedAt: string;
  pmName?: string;
  pmEmail?: string;
}

interface PMManagerOverviewData {
  organizationId: string;
  projectManagers: PMAnalytics[];
  totals: {
    totalActiveProjects: number;
    totalCompletedProjects: number;
    totalOnHoldProjects: number;
    totalOverdueProjects: number;
    totalProcurementItems: number;
    totalProcurementComplete: number;
    totalRedFlags: number;
    totalOpenIssues: number;
    totalCriticalIssues: number;
    totalUpcomingMilestones: number;
    totalOverdueMilestones: number;
  };
  generatedAt: string;
}

type SortField = "activeProjects" | "completedProjects" | "openIssues" | "criticalIssues" | "procurementRedFlags" | "overdueMilestones";
type SortDirection = "asc" | "desc";

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const accessDeniedRoles = ["technician", "viewer", "sales_rep", "procurement_officer", "engineer"];

export default function PMManagerAnalytics() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sortField, setSortField] = useState<SortField>("activeProjects");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dateRange, setDateRange] = useState<string>("30d");

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<PMManagerOverviewData>({
    queryKey: ["/api/pm-manager-overview"],
    refetchInterval: 60000,
    enabled: user ? !accessDeniedRoles.includes(user.role || "") : false,
  });

  const userRole = user?.role || "";
  const hasAccess = !accessDeniedRoles.includes(userRole);

  const sortedPMs = useMemo(() => {
    if (!data?.projectManagers) return [];
    
    return [...data.projectManagers].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data?.projectManagers, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const projectStatusData = useMemo(() => {
    if (!data?.totals) return [];
    return [
      { name: "Active", value: data.totals.totalActiveProjects },
      { name: "Completed", value: data.totals.totalCompletedProjects },
      { name: "On Hold", value: data.totals.totalOnHoldProjects },
      { name: "Overdue", value: data.totals.totalOverdueProjects },
    ].filter(item => item.value > 0);
  }, [data?.totals]);

  const issuesBySeverityData = useMemo(() => {
    if (!data?.projectManagers) return [];
    const criticalTotal = data.projectManagers.reduce((sum, pm) => sum + pm.criticalIssues, 0);
    const openTotal = data.projectManagers.reduce((sum, pm) => sum + pm.openIssues, 0);
    const nonCriticalOpen = openTotal - criticalTotal;
    
    return [
      { severity: "Critical", count: criticalTotal, fill: 'hsl(var(--chart-1))' },
      { severity: "Open (Non-critical)", count: nonCriticalOpen > 0 ? nonCriticalOpen : 0, fill: 'hsl(var(--chart-2))' },
    ];
  }, [data?.projectManagers]);

  const milestonesTimelineData = useMemo(() => {
    if (!data?.projectManagers) return [];
    const overdue = data.projectManagers.reduce((sum, pm) => sum + pm.overdueMilestones, 0);
    const upcoming = data.projectManagers.reduce((sum, pm) => sum + pm.upcomingMilestones, 0);
    
    const today = new Date();
    return [
      { 
        date: format(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000), "MMM d"),
        completed: Math.round(overdue * 0.3),
        target: Math.round(overdue * 0.5),
      },
      { 
        date: format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), "MMM d"),
        completed: Math.round(overdue * 0.6),
        target: Math.round(overdue * 0.75),
      },
      { 
        date: format(today, "MMM d"),
        completed: overdue,
        target: overdue + upcoming,
      },
      { 
        date: format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), "MMM d"),
        completed: overdue,
        target: overdue + upcoming * 0.5,
      },
      { 
        date: format(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), "MMM d"),
        completed: overdue,
        target: overdue + upcoming,
      },
    ];
  }, [data?.projectManagers]);

  const avgProjectDuration = useMemo(() => {
    if (!data?.projectManagers) return null;
    const durations = data.projectManagers
      .map(pm => pm.avgProjectDurationDays)
      .filter((d): d is number => d !== null);
    
    if (durations.length === 0) return null;
    return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }, [data?.projectManagers]);

  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: "issue" | "milestone" | "procurement";
      description: string;
      timestamp: Date;
      severity?: "low" | "medium" | "high" | "critical";
    }> = [];

    if (data?.projectManagers) {
      data.projectManagers.forEach((pm, idx) => {
        if (pm.criticalIssues > 0) {
          activities.push({
            id: `issue-${pm.projectManagerId}-${idx}`,
            type: "issue",
            description: `${pm.criticalIssues} critical issue(s) need attention`,
            timestamp: new Date(pm.calculatedAt),
            severity: "critical",
          });
        }
        if (pm.overdueMilestones > 0) {
          activities.push({
            id: `milestone-${pm.projectManagerId}-${idx}`,
            type: "milestone",
            description: `${pm.overdueMilestones} milestone(s) overdue`,
            timestamp: new Date(pm.calculatedAt),
          });
        }
        if (pm.procurementRedFlags > 0) {
          activities.push({
            id: `procurement-${pm.projectManagerId}-${idx}`,
            type: "procurement",
            description: `${pm.procurementRedFlags} procurement red flag(s)`,
            timestamp: new Date(pm.calculatedAt),
            severity: "high",
          });
        }
      });
    }

    return activities.slice(0, 10);
  }, [data?.projectManagers]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
      data-testid={`header-sort-${field}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc" 
            ? <ChevronUp className="h-4 w-4" /> 
            : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  if (!hasAccess) {
    return (
      <div className="p-3 sm:p-4 md:p-6">
        <Card className="border-destructive/50" data-testid="card-access-denied">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-destructive/10 mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2" data-testid="text-access-denied-title">
              Access Denied
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4" data-testid="text-access-denied-message">
              This page is only accessible to PM Managers, Administrators, and Organization Owners.
              Please contact your administrator if you believe you should have access.
            </p>
            <Link href="/">
              <Button variant="outline" data-testid="button-go-home">
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="loading-pm-manager-analytics">
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
          title="Failed to load PM Manager analytics"
          message={error instanceof Error ? error.message : "Unable to fetch data. Please try again."}
          error={error as Error}
          onRetry={refetch}
          testId="error-pm-manager-analytics"
          fullPage
        />
      </div>
    );
  }

  const totals = data?.totals || {
    totalActiveProjects: 0,
    totalCompletedProjects: 0,
    totalOnHoldProjects: 0,
    totalOverdueProjects: 0,
    totalProcurementItems: 0,
    totalProcurementComplete: 0,
    totalRedFlags: 0,
    totalOpenIssues: 0,
    totalCriticalIssues: 0,
    totalUpcomingMilestones: 0,
    totalOverdueMilestones: 0,
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-pm-manager-analytics">
      <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3" data-testid="text-pm-manager-title">
            <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 shrink-0 text-primary" />
            Project Management Overview
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 flex items-center gap-2" data-testid="text-pm-manager-subtitle">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            {user?.organization?.name || "Organization"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]" data-testid="select-date-range">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs sm:text-sm"
            data-testid="button-refresh-pm-manager"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <Card data-testid="card-total-active-projects">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Active Projects</p>
                <p className="text-2xl sm:text-3xl font-bold" data-testid="stat-total-active-projects">
                  {totals.totalActiveProjects}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                <FolderKanban className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {totals.totalCompletedProjects} completed
            </p>
          </CardContent>
        </Card>

        <Card className={totals.totalCriticalIssues > 0 ? "border-red-200 dark:border-red-900" : ""} data-testid="card-total-open-issues">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Open Issues</p>
                <p className="text-2xl sm:text-3xl font-bold" data-testid="stat-total-open-issues">
                  {totals.totalOpenIssues}
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center ${
                totals.totalCriticalIssues > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-orange-100 dark:bg-orange-900/30"
              }`}>
                <AlertCircle className={`h-5 w-5 sm:h-6 sm:w-6 ${
                  totals.totalCriticalIssues > 0 ? "text-red-600" : "text-orange-600"
                }`} />
              </div>
            </div>
            {totals.totalCriticalIssues > 0 && (
              <Badge variant="destructive" className="mt-2" data-testid="badge-critical-issues">
                {totals.totalCriticalIssues} Critical
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className={totals.totalRedFlags > 0 ? "border-orange-200 dark:border-orange-900" : ""} data-testid="card-procurement-red-flags">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Red Flags</p>
                <p className={`text-2xl sm:text-3xl font-bold ${totals.totalRedFlags > 0 ? "text-orange-600" : ""}`} data-testid="stat-procurement-red-flags">
                  {totals.totalRedFlags}
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center ${
                totals.totalRedFlags > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-muted"
              }`}>
                <Flag className={`h-5 w-5 sm:h-6 sm:w-6 ${totals.totalRedFlags > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Procurement items
            </p>
          </CardContent>
        </Card>

        <Card className={totals.totalOverdueMilestones > 0 ? "border-red-200 dark:border-red-900" : ""} data-testid="card-overdue-milestones">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Overdue Milestones</p>
                <p className={`text-2xl sm:text-3xl font-bold ${totals.totalOverdueMilestones > 0 ? "text-red-600" : ""}`} data-testid="stat-overdue-milestones">
                  {totals.totalOverdueMilestones}
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center ${
                totals.totalOverdueMilestones > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"
              }`}>
                <Clock className={`h-5 w-5 sm:h-6 sm:w-6 ${totals.totalOverdueMilestones > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {totals.totalUpcomingMilestones} upcoming
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-project-duration">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl sm:text-3xl font-bold" data-testid="stat-avg-project-duration">
                  {avgProjectDuration !== null ? `${avgProjectDuration}d` : "—"}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-muted rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Project completion
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-pm-performance-table">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                PM Performance
              </CardTitle>
              <CardDescription>Click row to view PM's projects</CardDescription>
            </div>
            <Badge variant="outline" data-testid="badge-pm-count">
              {sortedPMs.length} Project Managers
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PM Name</TableHead>
                  <SortableHeader field="activeProjects">Active</SortableHeader>
                  <SortableHeader field="completedProjects">Completed</SortableHeader>
                  <SortableHeader field="openIssues">Open Issues</SortableHeader>
                  <SortableHeader field="criticalIssues">Critical</SortableHeader>
                  <TableHead>Procurement</TableHead>
                  <SortableHeader field="procurementRedFlags">Red Flags</SortableHeader>
                  <SortableHeader field="overdueMilestones">Overdue</SortableHeader>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPMs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No project managers found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPMs.map((pm, idx) => (
                    <TableRow 
                      key={pm.projectManagerId}
                      className="cursor-pointer hover:bg-muted/50"
                      data-testid={`row-pm-${pm.projectManagerId}`}
                    >
                      <TableCell>
                        <div className="font-medium">{pm.pmName || `PM ${idx + 1}`}</div>
                        {pm.pmEmail && (
                          <div className="text-xs text-muted-foreground">{pm.pmEmail}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{pm.activeProjects}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{pm.completedProjects}</span>
                      </TableCell>
                      <TableCell>
                        <span className={pm.openIssues > 5 ? "text-orange-600 font-medium" : ""}>
                          {pm.openIssues}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={pm.criticalIssues > 0 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                          {pm.criticalIssues}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {pm.procurementItemsComplete}/{pm.totalProcurementItems}
                        </span>
                      </TableCell>
                      <TableCell>
                        {pm.procurementRedFlags > 0 ? (
                          <Badge 
                            variant="destructive"
                            className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          >
                            {pm.procurementRedFlags}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pm.overdueMilestones > 0 ? (
                          <Badge variant="destructive">
                            {pm.overdueMilestones}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href="/project-management">
                          <Button variant="ghost" size="sm" data-testid={`button-view-pm-${pm.projectManagerId}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card data-testid="chart-projects-by-status">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-chart-1" />
              Projects by Status
            </CardTitle>
            <CardDescription>Distribution across all PMs</CardDescription>
          </CardHeader>
          <CardContent>
            {projectStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {projectStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                No project data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-issues-by-severity">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-2" />
              Issues by Severity
            </CardTitle>
            <CardDescription>Critical vs other open issues</CardDescription>
          </CardHeader>
          <CardContent>
            {issuesBySeverityData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={issuesBySeverityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="severity" 
                    tick={{ fontSize: 10 }} 
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {issuesBySeverityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                No issue data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-milestones-timeline">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-chart-3" />
              Milestones Timeline
            </CardTitle>
            <CardDescription>Completed vs target over time</CardDescription>
          </CardHeader>
          <CardContent>
            {milestonesTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={milestonesTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="target" 
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))" 
                    fillOpacity={0.2}
                    name="Target"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="hsl(var(--chart-3))" 
                    fill="hsl(var(--chart-3))" 
                    fillOpacity={0.6}
                    name="Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                No milestone data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-activity">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest updates across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className={`p-2 rounded-full shrink-0 ${
                      activity.type === "issue" 
                        ? activity.severity === "critical" 
                          ? "bg-red-100 dark:bg-red-900/30" 
                          : "bg-orange-100 dark:bg-orange-900/30"
                        : activity.type === "milestone"
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "bg-yellow-100 dark:bg-yellow-900/30"
                    }`}>
                      {activity.type === "issue" ? (
                        <AlertCircle className={`h-4 w-4 ${
                          activity.severity === "critical" ? "text-red-600" : "text-orange-600"
                        }`} />
                      ) : activity.type === "milestone" ? (
                        <Clock className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Package className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(activity.timestamp, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    {activity.severity && (
                      <Badge 
                        variant={activity.severity === "critical" ? "destructive" : "outline"}
                        className="shrink-0"
                      >
                        {activity.severity}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No recent activity
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
