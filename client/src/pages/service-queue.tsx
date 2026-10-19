import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  MapPin,
  DoorOpen,
  MessageSquare,
  Send,
  Calendar,
  FileText,
  Users,
  ChevronRight,
  Filter,
  Phone,
  Mail,
  Link2,
  Eye,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import type { ServiceRequest, ServiceRequestItem, ServiceRequestNote } from "@shared/schemas/portal.schema";

interface ServiceRequestWithDetails extends ServiceRequest {
  items?: ServiceRequestItem[];
  notes?: ServiceRequestNote[];
  portalUser?: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    company: string | null;
  } | null;
}

interface RequestStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byTriage: Record<string, number>;
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

const triageConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  quotable: { label: "Ready to Quote", icon: CheckCircle, className: "text-green-600" },
  needs_site_visit: { label: "Needs Site Visit", icon: Calendar, className: "text-orange-600" },
  pending: { label: "Pending Triage", icon: Clock, className: "text-gray-500" },
};

export default function ServiceQueue() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithDetails | null>(null);
  const [triageDialogOpen, setTriageDialogOpen] = useState(false);
  const [triageDecision, setTriageDecision] = useState<string>("");
  const [triageReason, setTriageReason] = useState("");

  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorObj, refetch: refetchStats } = useQuery<RequestStats>({
    queryKey: ["/api/service-requests/stats"],
  });

  const { data: requestsData, isLoading: requestsLoading, isError: requestsError, error: requestsErrorObj, refetch } = useQuery<{
    requests: ServiceRequest[];
    total: number;
  }>({
    queryKey: ["/api/service-requests", { status: statusFilter, priority: priorityFilter }],
  });

  const hasError = statsError || requestsError;
  const errorObj = statsErrorObj || requestsErrorObj;

  if (hasError) {
    return (
      <div className="container max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
        <ErrorState
          title="Unable to Load Service Queue"
          message={errorObj instanceof Error ? errorObj.message : "We couldn't load the service queue. Please try again."}
          error={errorObj as Error}
          onRetry={() => {
            refetchStats();
            refetch();
          }}
          testId="error-service-queue"
        />
      </div>
    );
  }

  const triageMutation = useMutation({
    mutationFn: async ({ requestId, data }: { requestId: string; data: any }) => {
      return apiRequest("PATCH", `/api/service-requests/${requestId}/triage`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/stats"] });
      setTriageDialogOpen(false);
      setSelectedRequest(null);
      toast({ title: "Request triaged successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      return apiRequest("PATCH", `/api/service-requests/${requestId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/stats"] });
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleTriage = () => {
    if (!selectedRequest || !triageDecision) return;
    triageMutation.mutate({
      requestId: selectedRequest.id,
      data: {
        triageDecision,
        triageReason: triageReason.trim() || undefined,
      },
    });
  };

  const requests = requestsData?.requests || [];

  const needsAttention = requests.filter(r => 
    r.status === "submitted" && (!r.triageDecision || r.triageDecision === "pending")
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Service Request Queue</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Review and triage incoming service requests from your client portal.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="shrink-0 text-xs sm:text-sm"
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Needs Attention"
          value={needsAttention.length}
          icon={AlertCircle}
          variant="warning"
          loading={statsLoading}
        />
        <StatCard
          title="In Review"
          value={stats?.byStatus?.in_review || 0}
          icon={Eye}
          variant="default"
          loading={statsLoading}
        />
        <StatCard
          title="Ready to Quote"
          value={stats?.byTriage?.quotable || 0}
          icon={CheckCircle}
          variant="success"
          loading={statsLoading}
        />
        <StatCard
          title="Needs Site Visit"
          value={stats?.byTriage?.needs_site_visit || 0}
          icon={Calendar}
          variant="default"
          loading={statsLoading}
        />
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <CardTitle className="text-base sm:text-lg">All Requests</CardTitle>
            <div className="flex items-center gap-2 min-w-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] sm:w-[140px] text-xs sm:text-sm" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px] sm:w-[140px] text-xs sm:text-sm" data-testid="select-priority-filter">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {requestsLoading ? (
            <div className="space-y-2 sm:space-y-3">
              <Skeleton className="h-16 sm:h-20 w-full" />
              <Skeleton className="h-16 sm:h-20 w-full" />
              <Skeleton className="h-16 sm:h-20 w-full" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2">No service requests</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Service requests from your client portal will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  onSelect={() => setSelectedRequest(request)}
                  onTriage={() => {
                    setSelectedRequest(request);
                    setTriageDecision(request.triageDecision || "");
                    setTriageReason(request.triageReason || "");
                    setTriageDialogOpen(true);
                  }}
                  onStatusChange={(status) => {
                    statusMutation.mutate({ requestId: request.id, status });
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={triageDialogOpen} onOpenChange={setTriageDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Triage Request</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedRequest?.requestNumber}: {selectedRequest?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Triage Decision</label>
              <Select value={triageDecision} onValueChange={setTriageDecision}>
                <SelectTrigger className="text-xs sm:text-sm" data-testid="select-triage-decision">
                  <SelectValue placeholder="Select decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotable">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                      <span className="text-xs sm:text-sm">Ready to Quote</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="needs_site_visit">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 shrink-0" />
                      <span className="text-xs sm:text-sm">Needs Site Visit</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 shrink-0" />
                      <span className="text-xs sm:text-sm">Keep Pending</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add notes about this triage decision..."
                value={triageReason}
                onChange={(e) => setTriageReason(e.target.value)}
                className="text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
                data-testid="input-triage-reason"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTriageDialogOpen(false)} className="text-xs sm:text-sm">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTriage}
              disabled={!triageDecision || triageMutation.isPending}
              className="text-xs sm:text-sm"
              data-testid="button-confirm-triage"
            >
              {triageMutation.isPending ? "Saving..." : "Confirm Triage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  variant,
  loading,
}: {
  title: string;
  value: number;
  icon: typeof Clock;
  variant: "default" | "warning" | "success";
  loading: boolean;
}) {
  const variantClasses = {
    default: "bg-card",
    warning: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    success: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
  };

  const iconClasses = {
    default: "text-muted-foreground",
    warning: "text-orange-600",
    success: "text-green-600",
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-10 sm:w-12 mt-1" />
            ) : (
              <p className="text-xl sm:text-2xl font-bold">{value}</p>
            )}
          </div>
          <Icon className={`h-6 w-6 sm:h-8 sm:w-8 shrink-0 ${iconClasses[variant]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function RequestRow({
  request,
  onSelect,
  onTriage,
  onStatusChange,
}: {
  request: ServiceRequest;
  onSelect: () => void;
  onTriage: () => void;
  onStatusChange: (status: string) => void;
}) {
  const statusConf = statusConfig[request.status] || statusConfig.submitted;
  const priorityConf = priorityConfig[request.priority] || priorityConfig.normal;
  const triageConf = triageConfig[request.triageDecision || "pending"];
  const StatusIcon = statusConf.icon;
  const TriageIcon = triageConf.icon;

  const needsAttention = request.status === "submitted" && (!request.triageDecision || request.triageDecision === "pending");

  return (
    <div
      className={`p-3 sm:p-4 rounded-lg border transition-all ${
        needsAttention
          ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
          : "bg-card hover-elevate"
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
            <span className="font-mono text-[10px] sm:text-xs text-muted-foreground shrink-0">
              {request.requestNumber}
            </span>
            <Badge variant={statusConf.variant} className="text-[10px] sm:text-xs shrink-0">
              <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 shrink-0" />
              {statusConf.label}
            </Badge>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${priorityConf.className}`}>
              {priorityConf.label}
            </span>
            {request.triageDecision && (
              <span className={`text-[10px] sm:text-xs flex items-center gap-1 shrink-0 ${triageConf.className}`}>
                <TriageIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                <span className="hidden sm:inline">{triageConf.label}</span>
              </span>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-medium truncate" data-testid={`text-request-title-${request.id}`}>
            {request.title}
          </h3>
          <div className="flex items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 min-w-0">
              <Users className="h-3 w-3 shrink-0" />
              <span className="truncate">{request.submitterName}</span>
            </span>
            {request.submitterCompany && (
              <span className="flex items-center gap-1 min-w-0 hidden sm:flex">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{request.submitterCompany}</span>
              </span>
            )}
            {request.locationName && (
              <span className="flex items-center gap-1 min-w-0 hidden md:flex">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{request.locationName}</span>
              </span>
            )}
            <span className="shrink-0 text-[10px] sm:text-xs">
              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {needsAttention && (
            <Button
              size="sm"
              onClick={onTriage}
              className="text-xs sm:text-sm"
              data-testid={`button-triage-${request.id}`}
            >
              <span className="hidden sm:inline">Triage</span>
              <span className="sm:hidden">Act</span>
            </Button>
          )}
          <Link href={`/service-queue/${request.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" aria-label="View request details">
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
