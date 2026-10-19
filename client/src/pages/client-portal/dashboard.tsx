import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  LogOut,
  ChevronRight,
  FileText,
  Folder,
  DoorOpen,
  Printer,
  Download,
  Wrench,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServiceRequest } from "@shared/schemas/portal.schema";

interface PortalUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  role: string;
  organizationId: string;
  organizationName: string;
  lastLoginAt: string | null;
  customerId: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  summary: {
    totalOpenings: number;
    statusCounts: Record<string, number>;
    lastUpdated: string;
  };
}

interface MyProjectsResponse {
  serviceRequests: Array<{
    id: string;
    requestNumber: string;
    title: string;
    status: string;
    priority: string;
    triageDecision: string | null;
    createdAt: string;
    linkedProjectId: string | null;
  }>;
  projects: ProjectSummary[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  new: { label: "Draft", variant: "outline", icon: FileText },
  submitted: { label: "Submitted", variant: "secondary", icon: Clock },
  in_review: { label: "In Review", variant: "secondary", icon: Clock },
  quoted: { label: "Quote Ready", variant: "default", icon: CheckCircle },
  scheduled: { label: "Visit Scheduled", variant: "default", icon: Clock },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: AlertCircle },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  normal: { label: "Normal", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export default function ClientPortalDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("requests");
  const { toast } = useToast();

  const { data: user, isLoading: userLoading, error: userError } = useQuery<PortalUser>({
    queryKey: ["/api/portal/auth/me"],
  });

  const { data: requests, isLoading: requestsLoading, isError: requestsError } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/portal/requests"],
    enabled: !!user,
  });

  const { data: projectsData, isLoading: projectsLoading, isError: projectsError } = useQuery<MyProjectsResponse>({
    queryKey: ["/api/portal/my-projects"],
    enabled: !!user,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/portal/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/client-portal/login");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message,
      });
    },
  });

  const isTechnician = user?.role === "technician";

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userError || !user || requestsError || projectsError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Failed to load portal information</h2>
          <p className="text-muted-foreground">There was an error connecting to the server. Please try again.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-refresh">
          Refresh Page
        </Button>
      </div>
    );
  }

  const activeRequests = requests?.filter(r => !["completed", "cancelled"].includes(r.status)) || [];
  const completedRequests = requests?.filter(r => ["completed", "cancelled"].includes(r.status)) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-base sm:text-lg truncate" data-testid="text-org-name">
                {user.organizationName}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Service Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline truncate max-w-[150px]">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') logoutMutation.mutate(); }}
              aria-label="Log out"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl">Welcome back, {user.name.split(" ")[0]}</CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  {isTechnician 
                    ? "Submit quote requests or track your submissions."
                    : "View your projects, submit requests, or track progress."
                  }
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {isTechnician && (
                  <Link href="/client-portal/technician-quote">
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-technician-quote">
                      <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      Request Quote
                    </Button>
                  </Link>
                )}
                <Link href="/client-portal/schedule">
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-schedule-site-walk">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    <span className="hidden xs:inline">Schedule</span> Site Walk
                  </Button>
                </Link>
                <Link href="/client-portal/new-request">
                  <Button size="sm" className="text-xs sm:text-sm" data-testid="button-new-request">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    New Request
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests" data-testid="tab-requests" className="text-xs sm:text-sm">
              <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="projects" data-testid="tab-projects" className="text-xs sm:text-sm">
              <Folder className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
              Projects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
            <section>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <h2 className="font-semibold text-base sm:text-lg">Active Requests</h2>
                {activeRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    {activeRequests.length}
                  </Badge>
                )}
              </div>

              {requestsLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  <Skeleton className="h-20 sm:h-24 w-full" />
                  <Skeleton className="h-20 sm:h-24 w-full" />
                </div>
              ) : activeRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 sm:py-12 text-center">
                    <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <h3 className="font-medium mb-2 text-sm sm:text-base">No active requests</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                      Submit a new service request to get started.
                    </p>
                    <Link href="/client-portal/new-request">
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-new-request-empty">
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                        New Request
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {activeRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </section>

            {completedRequests.length > 0 && (
              <>
                <Separator />
                <section>
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    <h2 className="font-semibold text-base sm:text-lg">Past Requests</h2>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {completedRequests.slice(0, 5).map((request) => (
                      <RequestCard key={request.id} request={request} compact />
                    ))}
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
            <section>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <h2 className="font-semibold text-base sm:text-lg">Your Projects</h2>
                {projectsData?.projects && projectsData.projects.length > 0 && (
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    {projectsData.projects.length}
                  </Badge>
                )}
              </div>

              {projectsLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  <Skeleton className="h-28 sm:h-32 w-full" />
                  <Skeleton className="h-28 sm:h-32 w-full" />
                </div>
              ) : !projectsData?.projects || projectsData.projects.length === 0 ? (
                <Card>
                  <CardContent className="py-8 sm:py-12 text-center">
                    <Folder className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <h3 className="font-medium mb-2 text-sm sm:text-base">No projects yet</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Projects linked to your account will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {projectsData.projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function RequestCard({ request, compact = false }: { request: ServiceRequest; compact?: boolean }) {
  const config = statusConfig[request.status] || statusConfig.new;
  const priorityConf = priorityConfig[request.priority] || priorityConfig.normal;
  const StatusIcon = config.icon;

  return (
    <Link href={`/client-portal/requests/${request.id}`}>
      <Card className="hover-elevate cursor-pointer transition-all">
        <CardContent className={compact ? "p-3 sm:py-3 sm:px-4" : "p-3 sm:p-4"}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <span className="font-mono text-[10px] sm:text-xs text-muted-foreground">
                  {request.requestNumber}
                </span>
                <Badge variant={config.variant} className="text-[10px] sm:text-xs shrink-0">
                  <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  {config.label}
                </Badge>
                {request.priority !== "normal" && (
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${priorityConf.className}`}>
                    {priorityConf.label}
                  </span>
                )}
              </div>
              <h3 className="font-medium truncate text-sm sm:text-base" data-testid={`text-request-title-${request.id}`}>
                {request.title}
              </h3>
              {!compact && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-muted-foreground">
                  {request.locationName && (
                    <span className="truncate max-w-[150px] sm:max-w-none">{request.locationName}</span>
                  )}
                  <span className="shrink-0">
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const projectStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  on_hold: { label: "On Hold", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

function ProjectCard({ project }: { project: ProjectSummary }) {
  const statusConf = projectStatusConfig[project.status] || projectStatusConfig.active;
  const completedCount = project.summary.statusCounts["completed"] || 0;
  const progressPercent = project.summary.totalOpenings > 0 
    ? Math.round((completedCount / project.summary.totalOpenings) * 100)
    : 0;

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`/client-portal/projects/${project.id}/report`, "_blank");
  };

  return (
    <Link href={`/client-portal/projects/${project.id}`}>
      <Card className="hover-elevate cursor-pointer transition-all">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <h3 className="font-medium truncate text-sm sm:text-base" data-testid={`text-project-name-${project.id}`}>
                  {project.name}
                </h3>
                <Badge variant={statusConf.variant} className="text-[10px] sm:text-xs shrink-0">
                  {statusConf.label}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                <span className="flex items-center gap-1">
                  <DoorOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  {project.summary.totalOpenings} openings
                </span>
                <span className="text-[10px] sm:text-xs">
                  Updated {formatDistanceToNow(new Date(project.summary.lastUpdated), { addSuffix: true })}
                </span>
              </div>

              {project.summary.totalOpenings > 0 && (
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5 sm:h-2" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrint}
                aria-label="Print project"
                data-testid={`button-print-project-${project.id}`}
              >
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
