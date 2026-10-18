import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Activity, Users, FolderOpen, DoorOpen, DollarSign, CheckCircle2 } from "lucide-react";
import { ErrorState } from "@/components/error-state";

export default function PerformanceMetricsPage() {
  const [period, setPeriod] = useState("30");

  // Fetch performance summary
  const { 
    data: summary, 
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErrorObj,
    refetch: refetchSummary
  } = useQuery<any>({
    queryKey: ["/api/performance/summary"],
  });

  // Fetch current metrics with period
  const { 
    data: metrics, 
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsErrorObj,
    refetch: refetchMetrics
  } = useQuery<any>({
    queryKey: [`/api/performance/metrics/current?period=${period}`],
    enabled: !!period,
  });

  const formatChange = (value: number) => {
    if (value > 0) return `+${value.toFixed(1)}`;
    return value.toFixed(1);
  };

  const getChangeVariant = (value: number, reverse: boolean = false): "default" | "secondary" | "destructive" => {
    if (value === 0) return "secondary";
    const isPositive = reverse ? value < 0 : value > 0;
    return isPositive ? "default" : "destructive";
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  if (summaryLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="loading-metrics">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load performance summary"
          message={summaryErrorObj instanceof Error ? summaryErrorObj.message : "Unable to fetch performance summary data"}
          error={summaryErrorObj as Error}
          onRetry={refetchSummary}
          testId="error-summary"
        />
      </div>
    );
  }

  if (metricsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load performance metrics"
          message={metricsErrorObj instanceof Error ? metricsErrorObj.message : "Unable to fetch current performance metrics"}
          error={metricsErrorObj as Error}
          onRetry={refetchMetrics}
          testId="error-metrics"
        />
      </div>
    );
  }

  const current = summary?.current || metrics;
  const changes = summary?.changes || {};

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-performance-metrics">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="heading-performance">
            <Activity className="h-6 sm:h-8 w-6 sm:w-8" />
            Performance Metrics
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Track key performance indicators and business metrics
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
          <TabsTrigger value="efficiency" data-testid="tab-efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Project Completion Rate */}
            <Card data-testid="card-completion-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-completion-rate">
                  {current?.metrics?.projectCompletionRate?.toFixed(1)}%
                </div>
                {changes.projectCompletionRate !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    {getTrendIcon(changes.projectCompletionRate)}
                    <Badge variant={getChangeVariant(changes.projectCompletionRate)} className="text-xs">
                      {formatChange(changes.projectCompletionRate)}%
                    </Badge>
                    <span>from previous period</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Average Project Duration */}
            <Card data-testid="card-avg-duration">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-avg-duration">
                  {current?.metrics?.avgProjectDuration?.toFixed(1)} days
                </div>
                {changes.avgProjectDuration !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    {getTrendIcon(-changes.avgProjectDuration)}
                    <Badge variant={getChangeVariant(changes.avgProjectDuration, true)} className="text-xs">
                      {formatChange(changes.avgProjectDuration)} days
                    </Badge>
                    <span>from previous period</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Projects */}
            <Card data-testid="card-total-projects">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-projects">
                  {current?.metrics?.totalProjects || 0}
                </div>
                {changes.totalProjects !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    {getTrendIcon(changes.totalProjects)}
                    <Badge variant={getChangeVariant(changes.totalProjects)} className="text-xs">
                      {formatChange(changes.totalProjects)}
                    </Badge>
                    <span>from previous period</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card data-testid="card-active-users">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-active-users">
                  {current?.metrics?.activeUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Organization members
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <Card data-testid="card-completed-projects">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-completed-projects">
                  {current?.metrics?.completedProjects || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {current?.metrics?.totalProjects || 0} total
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-openings">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Openings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-openings">
                  {current?.metrics?.totalOpenings || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg {current?.metrics?.openingsPerProject?.toFixed(1) || 0} per project
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-projects-with-costs">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cost Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-projects-with-costs">
                  {current?.metrics?.projectsWithCosts || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Projects with cost data
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Performance</CardTitle>
              <CardDescription>
                Detailed metrics for project completion and efficiency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {current?.metrics?.projectCompletionRate?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${current?.metrics?.projectCompletionRate || 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Duration</span>
                    <span className="text-sm text-muted-foreground">
                      {current?.metrics?.avgProjectDuration?.toFixed(1)} days
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Time from project creation to completion
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="grid gap-4 md:grid-cols-3 text-center">
                  <div>
                    <div className="text-2xl font-bold">{current?.metrics?.totalProjects || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Projects</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{current?.metrics?.completedProjects || 0}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {(current?.metrics?.totalProjects || 0) - (current?.metrics?.completedProjects || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Survey Efficiency</CardTitle>
              <CardDescription>
                Metrics for door opening surveys and productivity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-3xl font-bold">{current?.metrics?.totalOpenings || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Openings Surveyed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{current?.metrics?.openingsPerProject?.toFixed(1) || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">Avg Openings per Project</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>
                Organization member activity and collaboration metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">{current?.metrics?.activeUsers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">Active Team Members</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total organization members with access to the platform
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
