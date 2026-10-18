import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  Folder,
  DoorOpen,
  MapPin,
  Printer,
  Download,
  Clock,
  Activity,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  customerName?: string;
  locationName?: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
}

interface DoorOpening {
  id: string;
  openingNumber: string;
  floor?: string;
  room?: string;
  doorType?: string;
  location: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userName?: string;
}

interface ProjectDetailResponse {
  project: ProjectDetail;
  summary: {
    totalOpenings: number;
    statusCounts: Record<string, number>;
    completedPercentage: number;
  };
  openings: DoorOpening[];
  recentActivity: ActivityItem[];
}

const projectStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  on_hold: { label: "On Hold", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const activityIcons: Record<string, typeof Activity> = {
  created: FileText,
  updated: Activity,
  completed: CheckCircle,
  issue: AlertCircle,
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading, error, isError } = useQuery<ProjectDetailResponse>({
    queryKey: ["/api/portal/projects", id],
    enabled: !!id,
  });

  const handlePrint = () => {
    window.open(`/client-portal/projects/${id}/report`, "_blank");
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`/api/portal/projects/${id}/export-pdf`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${data?.project.name || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Exported",
        description: "Your project report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="font-semibold text-lg mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => setLocation("/client-portal")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, summary, openings, recentActivity } = data;
  const statusConf = projectStatusConfig[project.status] || projectStatusConfig.active;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/client-portal")}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLocation("/client-portal"); }}
            aria-label="Back to portal"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Folder className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-lg truncate" data-testid="text-project-name">
                {project.name}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant={statusConf.variant} className="text-xs">
                  {statusConf.label}
                </Badge>
                {project.customerName && (
                  <span className="text-sm text-muted-foreground truncate">
                    {project.customerName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <DoorOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalOpenings}</p>
                  <p className="text-sm text-muted-foreground">Door Openings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.completedPercentage}%</p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {(project.locationName || project.address) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {project.locationName && (
                  <p className="font-medium">{project.locationName}</p>
                )}
                {project.address && (
                  <p className="text-muted-foreground">{project.address}</p>
                )}
                {(project.city || project.state) && (
                  <p className="text-muted-foreground">
                    {[project.city, project.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DoorOpen className="h-5 w-5" />
                  Door Openings
                </CardTitle>
                <CardDescription>
                  All doors in this project
                </CardDescription>
              </div>
              <Badge variant="secondary">{openings.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {openings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DoorOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No door openings recorded yet</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {openings.map((opening) => (
                    <div
                      key={opening.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="w-8 h-8 bg-background rounded flex items-center justify-center text-sm font-mono font-medium">
                        {opening.openingNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{opening.location}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {opening.floor && <span>Floor: {opening.floor}</span>}
                          {opening.room && <span>Room: {opening.room}</span>}
                          {opening.doorType && <span>{opening.doorType}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(opening.createdAt), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const Icon = activityIcons[activity.type] || Activity;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {activity.userName && <span>{activity.userName}</span>}
                          <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
