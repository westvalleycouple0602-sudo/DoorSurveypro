import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Play, Clock, Share2, Plus, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import type { ReportTemplate, ReportExecution, ReportSchedule } from "@shared/schema";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Paywall } from "@/components/paywall";

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { hasFeatureAccess, currentTier } = useFeatureAccess();

  // Check if user has access to Advanced Reporting (advancedReporting feature, Professional+)
  const hasAccess = hasFeatureAccess("advancedReporting");

  // Fetch report templates (only if user has access)
  const { 
    data: templates, 
    isLoading: templatesLoading,
    isError: templatesError,
    error: templatesErrorObj,
    refetch: refetchTemplates
  } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/reports/templates"],
    enabled: hasAccess,
  });

  // Fetch recent executions (only if user has access)
  const { 
    data: executions, 
    isLoading: executionsLoading,
    isError: executionsError,
    error: executionsErrorObj,
    refetch: refetchExecutions
  } = useQuery<ReportExecution[]>({
    queryKey: ["/api/reports/executions"],
    enabled: hasAccess,
  });

  // Fetch schedules (only if user has access)
  const { 
    data: schedules, 
    isLoading: schedulesLoading,
    isError: schedulesError,
    error: schedulesErrorObj,
    refetch: refetchSchedules
  } = useQuery<ReportSchedule[]>({
    queryKey: ["/api/reports/schedules"],
    enabled: hasAccess,
  });

  // Execute report mutation
  const executeReportMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch(`/api/reports/templates/${templateId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: {} }),
      });
      if (!response.ok) throw new Error("Failed to execute report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/reports/executions"] as any);
      toast({
        title: "Report executed",
        description: "Your report has been generated successfully",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to execute report",
        description: errorMessage.includes("timeout")
          ? "Report execution timed out. Try again or reduce the data range"
          : errorMessage || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleExecuteReport = (templateId: string) => {
    executeReportMutation.mutate(templateId);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      running: "secondary",
      failed: "destructive",
      pending: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"} data-testid={`badge-status-${status}`}>{status}</Badge>;
  };

  const getVisualizationIcon = (type: string) => {
    return <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  };

  // Show paywall if user doesn't have access (check is done before queries)
  if (!hasAccess) {
    return (
      <Paywall
        variant="fullPage"
        featureName="Advanced Reporting"
        featureDescription="Create custom reports, schedule automatic delivery, analyze trends, and export data in multiple formats."
        requiredTier="professional"
        currentTier={currentTier}
        type="tier"
      />
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="heading-reports">
            <FileText className="h-6 sm:h-8 w-6 sm:w-8" />
            Advanced Reporting
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Create custom reports, schedule delivery, and analyze your data
          </p>
        </div>
        <Button data-testid="button-create-report" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-reports">
          <TabsTrigger value="templates" className="text-xs sm:text-sm" data-testid="tab-templates">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="hidden xs:inline">Templates</span>
            <span className="xs:hidden">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="executions" className="text-xs sm:text-sm" data-testid="tab-executions">
            <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Execution History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="text-xs sm:text-sm" data-testid="tab-schedules">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Scheduled Reports</span>
            <span className="sm:hidden">Scheduled</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-3 sm:space-y-4">
          {templatesLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground shrink-0" data-testid="loader-templates" />
              <p className="ml-2 sm:ml-3 text-muted-foreground text-sm sm:text-base" role="status" aria-live="polite">Loading templates...</p>
            </div>
          ) : templatesError ? (
            <ErrorState
              title="Failed to load report templates"
              message={templatesErrorObj instanceof Error ? templatesErrorObj.message : "Unable to fetch report templates. Please check your connection and try again."}
              error={templatesErrorObj as Error}
              onRetry={refetchTemplates}
              testId="error-templates"
            />
          ) : templates && templates.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                  <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-1.5 sm:gap-2" data-testid={`text-template-name-${template.id}`}>
                          <span className="shrink-0">{getVisualizationIcon(template.visualizationType)}</span>
                          <span className="truncate">{template.name}</span>
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs sm:text-sm line-clamp-2" data-testid={`text-template-desc-${template.id}`}>
                          {template.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                      <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-type-${template.id}`}>{template.reportType}</Badge>
                      <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-source-${template.id}`}>{template.dataSource}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="flex gap-1.5 sm:gap-2">
                      <Button
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => handleExecuteReport(template.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleExecuteReport(template.id); }}
                        disabled={executeReportMutation.isPending}
                        data-testid={`button-execute-${template.id}`}
                      >
                        {executeReportMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
                            Execute
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="outline" data-testid={`button-share-${template.id}`}>
                        <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex justify-between gap-2">
                        <span>Executions:</span>
                        <span data-testid={`text-exec-count-${template.id}`}>{template.executionCount || 0}</span>
                      </div>
                      {template.lastExecutedAt && (
                        <div className="flex justify-between gap-2 mt-1">
                          <span>Last run:</span>
                          <span data-testid={`text-last-run-${template.id}`}>
                            {new Date(template.lastExecutedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No report templates yet"
              description="Create custom reports to analyze your projects, costs, and performance metrics. Generate insights with powerful data visualization."
              actionLabel="Create Your First Report"
              onAction={() => {}}
              testId="empty-templates"
            />
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-3 sm:space-y-4">
          {executionsLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground shrink-0" data-testid="loader-executions" />
              <p className="ml-2 sm:ml-3 text-muted-foreground text-sm sm:text-base" role="status" aria-live="polite">Loading execution history...</p>
            </div>
          ) : executionsError ? (
            <ErrorState
              title="Failed to load execution history"
              message={executionsErrorObj instanceof Error ? executionsErrorObj.message : "Unable to fetch report execution history. Please try again."}
              error={executionsErrorObj as Error}
              onRetry={refetchExecutions}
              testId="error-executions"
            />
          ) : executions && executions.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {executions.map((execution) => (
                <Card key={execution.id} data-testid={`card-execution-${execution.id}`}>
                  <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base truncate" data-testid={`text-execution-name-${execution.id}`}>
                          {execution.reportName}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs sm:text-sm">
                          <span data-testid={`text-execution-time-${execution.id}`}>
                            {new Date(execution.executedAt).toLocaleString()}
                          </span>
                          {execution.executionTimeMs && (
                            <span className="ml-1.5 sm:ml-2" data-testid={`text-exec-duration-${execution.id}`}>
                              • {execution.executionTimeMs}ms
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <span className="shrink-0">{getStatusBadge(execution.status)}</span>
                    </div>
                  </CardHeader>
                  {execution.rowCount !== null && execution.rowCount !== undefined && (
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span data-testid={`text-row-count-${execution.id}`}>
                          {execution.rowCount} rows
                        </span>
                        {execution.status === "completed" && (
                          <Button size="sm" variant="outline" className="text-xs sm:text-sm" data-testid={`button-view-${execution.id}`}>
                            View Results
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="No execution history"
              description="Report execution history will appear here once you run your first report. Track performance, view results, and monitor completion status."
              testId="empty-executions"
            />
          )}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-3 sm:space-y-4">
          {schedulesLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground shrink-0" data-testid="loader-schedules" />
              <p className="ml-2 sm:ml-3 text-muted-foreground text-sm sm:text-base" role="status" aria-live="polite">Loading scheduled reports...</p>
            </div>
          ) : schedulesError ? (
            <ErrorState
              title="Failed to load scheduled reports"
              message={schedulesErrorObj instanceof Error ? schedulesErrorObj.message : "Unable to fetch scheduled reports. Please try again."}
              error={schedulesErrorObj as Error}
              onRetry={refetchSchedules}
              testId="error-schedules"
            />
          ) : schedules && schedules.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {schedules.map((schedule) => (
                <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`}>
                  <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                    <div className="flex items-start sm:items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base truncate" data-testid={`text-schedule-name-${schedule.id}`}>
                          {schedule.name}
                        </CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Badge variant={schedule.isActive === "yes" ? "default" : "secondary"} className="shrink-0" data-testid={`badge-schedule-status-${schedule.id}`}>
                            {schedule.isActive === "yes" ? "Active" : "Inactive"}
                          </Badge>
                          <span data-testid={`text-schedule-freq-${schedule.id}`}>
                            {schedule.frequency} at {schedule.timeOfDay}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span>Runs: {schedule.runCount || 0}</span>
                      {schedule.nextRunAt && (
                        <span data-testid={`text-next-run-${schedule.id}`}>
                          Next: {new Date(schedule.nextRunAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No scheduled reports"
              description="Schedule reports for automated delivery to your inbox. Set up daily, weekly, or monthly reporting to keep stakeholders informed."
              testId="empty-schedules"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
