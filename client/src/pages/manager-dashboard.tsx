import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Building2,
  TrendingUp,
  TrendingDown,
  Users,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
  Inbox,
  Eye,
  Calendar,
  FileText,
  X,
  Bell,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";

interface SubmissionRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  priority: string;
  triageDecision: string | null;
  submitterName: string;
  submitterCompany: string | null;
  salesOwner: { id: string; name: string } | null;
  itemCount: number;
  requestedAt: string;
  triagedAt: string | null;
  completedAt: string | null;
  warningLevel: "none" | "warning" | "critical";
  warningMessage: string;
  hoursSinceSubmission: number;
}

interface ManagerSummary {
  summary: {
    total: number;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    warningCounts: Record<string, number>;
    trend: {
      thisWeek: number;
      lastWeek: number;
      change: number;
    };
  };
  requests: SubmissionRequest[];
}

interface FollowUpAlert {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  priority: string;
  alertType: "no_response" | "no_owner" | "stale";
  alertMessage: string;
  hoursSinceSubmission: number;
  submitterName: string;
  submitterCompany: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  new: { label: "Draft", variant: "outline", icon: FileText },
  submitted: { label: "Submitted", variant: "secondary", icon: Clock },
  in_review: { label: "In Review", variant: "secondary", icon: Eye },
  quoted: { label: "Quoted", variant: "default", icon: CheckCircle },
  scheduled: { label: "Scheduled", variant: "default", icon: Calendar },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: X },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  normal: { label: "Normal", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export default function ManagerDashboard() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [warningFilter, setWarningFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<ManagerSummary>({
    queryKey: ["/api/manager/submissions-summary"],
    refetchInterval: 60000,
  });

  const { data: alerts } = useQuery<{ alerts: FollowUpAlert[] }>({
    queryKey: ["/api/manager/follow-up-alerts"],
    refetchInterval: 60000,
  });

  if (isError) {
    return (
      <div className="container max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
        <ErrorState
          title="Unable to Load Dashboard"
          message={error instanceof Error ? error.message : "We couldn't load the manager dashboard. Please try again."}
          error={error as Error}
          onRetry={() => refetch()}
          testId="error-manager-dashboard"
        />
      </div>
    );
  }

  const filteredRequests = data?.requests.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (warningFilter !== "all" && r.warningLevel !== warningFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.requestNumber.toLowerCase().includes(term) ||
        r.title.toLowerCase().includes(term) ||
        r.submitterName.toLowerCase().includes(term) ||
        (r.submitterCompany?.toLowerCase() || "").includes(term)
      );
    }
    return true;
  }) || [];

  const needsAttention = data?.requests.filter(r => r.warningLevel !== "none") || [];
  const criticalCount = data?.summary.warningCounts.critical || 0;
  const warningCount = data?.summary.warningCounts.warning || 0;

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
        </div>
        <Skeleton className="h-48 sm:h-64" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 shrink-0 text-primary" />
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Monitor all portal submissions and follow-up status
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') refetch(); }}
          disabled={isRefetching}
          className="text-xs sm:text-sm"
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-2xl sm:text-3xl font-bold">{data?.summary.total || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                <Inbox className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm">
              {(data?.summary.trend.change ?? 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-red-500" />
              )}
              <span className={(data?.summary.trend.change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                {(data?.summary.trend.change ?? 0) >= 0 ? "+" : ""}{data?.summary.trend.change ?? 0}
              </span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className={criticalCount > 0 ? "border-red-200 dark:border-red-900" : ""}>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center ${criticalCount > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                <AlertCircle className={`h-5 w-5 sm:h-6 sm:w-6 ${criticalCount > 0 ? "text-red-600" : "text-gray-400"}`} />
              </div>
            </div>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
              {criticalCount > 0 ? "Require immediate attention" : "No critical issues"}
            </p>
          </CardContent>
        </Card>

        <Card className={warningCount > 0 ? "border-orange-200 dark:border-orange-900" : ""}>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">{warningCount}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center ${warningCount > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                <AlertTriangle className={`h-5 w-5 sm:h-6 sm:w-6 ${warningCount > 0 ? "text-orange-600" : "text-gray-400"}`} />
              </div>
            </div>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
              {warningCount > 0 ? "Need follow-up soon" : "All on track"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl sm:text-3xl font-bold">{data?.summary.trend.thisWeek || 0}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
              New submissions this week
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" data-testid="tab-overview" className="text-xs sm:text-sm">
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden xs:inline">Overview</span>
            <span className="xs:hidden">View</span>
          </TabsTrigger>
          <TabsTrigger value="attention" data-testid="tab-attention" className="text-xs sm:text-sm">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Needs Attention</span>
            <span className="sm:hidden">Alerts</span>
            {needsAttention.length > 0 && (
              <Badge variant="destructive" className="ml-1 sm:ml-2 shrink-0 text-xs">
                {needsAttention.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all" className="text-xs sm:text-sm">
            <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">All Submissions</span>
            <span className="sm:hidden">All</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
                {Object.entries(data?.summary.statusCounts || {}).map(([status, count]) => {
                  const config = statusConfig[status];
                  const total = data?.summary.total || 1;
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={status} className="flex items-center gap-2 sm:gap-4">
                      <div className="w-20 sm:w-24 text-xs sm:text-sm">
                        <Badge variant={config?.variant || "secondary"} className="text-xs shrink-0">
                          {config?.label || status}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground w-8 sm:w-12 text-right shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg">Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
                {Object.entries(data?.summary.priorityCounts || {}).map(([priority, count]) => {
                  const config = priorityConfig[priority];
                  const total = data?.summary.total || 1;
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={priority} className="flex items-center gap-2 sm:gap-4">
                      <div className="w-20 sm:w-24">
                        <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shrink-0 ${config?.className || ""}`}>
                          {config?.label || priority}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground w-8 sm:w-12 text-right shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {alerts && alerts.alerts.length > 0 && (
            <Card className="border-orange-200 dark:border-orange-900">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-orange-600" />
                  Recent Alerts
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Submissions that need follow-up
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="space-y-2 sm:space-y-3">
                  {alerts.alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg bg-muted/50"
                    >
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-orange-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs sm:text-sm">{alert.requestNumber}</span>
                          <span className="font-medium text-sm sm:text-base truncate">{alert.title}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{alert.alertMessage}</p>
                      </div>
                      <Link href={`/service-queue?request=${alert.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs sm:text-sm shrink-0">
                          View
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 shrink-0" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attention" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-orange-600" />
                Submissions Needing Attention
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                These submissions have warnings or are overdue for follow-up
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {needsAttention.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="font-medium text-sm sm:text-base mb-2">All Clear!</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    No submissions require immediate attention.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px] sm:max-h-[500px]">
                  <div className="space-y-2 sm:space-y-3">
                    {needsAttention.map((request) => (
                      <RequestRow key={request.id} request={request} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg">All Submissions</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Complete list of all service requests
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-7 sm:pl-9 w-32 sm:w-48 h-8 sm:h-9 text-xs sm:text-sm"
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-28 sm:w-36 h-8 sm:h-9 text-xs sm:text-sm" data-testid="select-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={warningFilter} onValueChange={setWarningFilter}>
                    <SelectTrigger className="w-28 sm:w-36 h-8 sm:h-9 text-xs sm:text-sm" data-testid="select-warning">
                      <SelectValue placeholder="Warning" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Warnings</SelectItem>
                      <SelectItem value="critical">Critical Only</SelectItem>
                      <SelectItem value="warning">Warnings Only</SelectItem>
                      <SelectItem value="none">No Warnings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Inbox className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="font-medium text-sm sm:text-base mb-2">No submissions found</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Try adjusting your filters.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px] sm:max-h-[500px]">
                  <div className="space-y-2 sm:space-y-3">
                    {filteredRequests.map((request) => (
                      <RequestRow key={request.id} request={request} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequestRow({ request }: { request: SubmissionRequest }) {
  const config = statusConfig[request.status] || statusConfig.submitted;
  const priorityConf = priorityConfig[request.priority] || priorityConfig.normal;
  const StatusIcon = config.icon;

  return (
    <Link href={`/service-queue?request=${request.id}`}>
      <div className={`flex items-center gap-2 sm:gap-4 p-2 sm:p-3 md:p-4 rounded-lg hover-elevate cursor-pointer transition-all ${
        request.warningLevel === "critical" 
          ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900" 
          : request.warningLevel === "warning"
          ? "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900"
          : "bg-muted/50"
      }`}>
        {request.warningLevel === "critical" ? (
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-red-600" />
        ) : request.warningLevel === "warning" ? (
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-orange-600" />
        ) : (
          <StatusIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">
              {request.requestNumber}
            </span>
            <Badge variant={config.variant} className="text-xs shrink-0">
              {config.label}
            </Badge>
            {request.priority !== "normal" && (
              <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${priorityConf.className}`}>
                {priorityConf.label}
              </span>
            )}
          </div>
          <h3 className="font-medium text-sm sm:text-base truncate" data-testid={`text-request-title-${request.id}`}>
            {request.title}
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span className="truncate">{request.submitterName}</span>
            {request.submitterCompany && (
              <span className="text-xs hidden sm:inline">• {request.submitterCompany}</span>
            )}
            <span className="text-xs">
              {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
            </span>
          </div>
          {request.warningMessage && (
            <p className={`text-xs mt-1 truncate ${
              request.warningLevel === "critical" ? "text-red-600" : "text-orange-600"
            }`}>
              {request.warningMessage}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {request.salesOwner && (
            <div className="text-right text-xs sm:text-sm hidden sm:block">
              <p className="text-xs text-muted-foreground">Assigned to</p>
              <p className="font-medium">{request.salesOwner.name}</p>
            </div>
          )}
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}
