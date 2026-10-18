// client/src/pages/pm-board.tsx
// Project Management Board Page

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PmBoard } from "@/components/pm/PmBoard";
import { ProcurementChecklistPanel } from "@/components/pm/ProcurementChecklistPanel";
import {
  ArrowLeft,
  Clipboard,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  Kanban,
  AlertTriangle,
} from "lucide-react";
import type { PmTask, ProcurementPackage } from "@shared/projectManagement";

interface PmStats {
  total: number;
  byStatus: {
    notStarted: number;
    inProgress: number;
    hold: number;
    complete: number;
    void: number;
  };
  byDiscipline: {
    div8: number;
    div28: number;
    other: number;
  };
  redFlags: number;
}

export default function PmBoardPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId || "demo-project";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("board");

  const { data: tasks, isLoading: tasksLoading, isError: tasksIsError } = useQuery<{ tasks: PmTask[] }>({
    queryKey: ["/api/pm/projects", projectId, "tasks"],
    enabled: !!projectId,
  });

  const { data: stats, isLoading: statsLoading, isError: statsIsError } = useQuery<PmStats>({
    queryKey: ["/api/pm/projects", projectId, "stats"],
    enabled: !!projectId,
  });

  const { data: procurementData, isLoading: procurementLoading, isError: procurementIsError } = useQuery<{
    totalRedFlags: number;
    linesWithRedFlags: any[];
  }>({
    queryKey: ["/api/procurement/projects", projectId, "red-flags"],
    enabled: !!projectId,
  });

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pm/bootstrap", { projectId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/projects", projectId] });
      toast({
        title: "PM Tasks Initialized",
        description: "Project management tasks have been created for this project.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize PM tasks",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<PmTask> }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/pm/projects/${projectId}/tasks/${taskId}`,
        updates
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/projects", projectId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const handleTaskUpdate = (taskId: string, updates: Partial<PmTask>) => {
    updateTaskMutation.mutate({ taskId, updates });
  };

  const taskList = tasks?.tasks || [];
  const hasNoTasks = !tasksLoading && taskList.length === 0;

  const isError = tasksIsError || statsIsError || procurementIsError;

  if (isError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 max-w-[1600px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/projects")}
            aria-label="Back to projects"
            data-testid="button-back-to-projects"
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <Kanban className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <span className="truncate">PM Board</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Track Division 8 & 28 tasks across project phases
            </p>
          </div>
        </div>
        {hasNoTasks && (
          <Button
            onClick={() => bootstrapMutation.mutate()}
            disabled={bootstrapMutation.isPending}
            data-testid="button-bootstrap-tasks"
            size="sm"
            className="w-full sm:w-auto shrink-0"
          >
            {bootstrapMutation.isPending ? "Initializing..." : "Initialize PM Tasks"}
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                <Clipboard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{stats?.byStatus?.inProgress || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10 shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{stats?.byStatus?.complete || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-500/10 shrink-0">
                <PauseCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{stats?.byStatus?.hold || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">On Hold</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{stats?.redFlags || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Red Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="board" data-testid="tab-pm-board">
            <Kanban className="h-4 w-4 mr-2" />
            Task Board
          </TabsTrigger>
          <TabsTrigger value="procurement" data-testid="tab-procurement">
            <Package className="h-4 w-4 mr-2" />
            Procurement
            {(procurementData?.totalRedFlags || 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {procurementData?.totalRedFlags}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {tasksLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 sm:w-64" />
              <div className="overflow-x-auto -mx-4 px-4 pb-4">
                <div className="flex gap-3 min-w-max lg:grid lg:grid-cols-7 lg:min-w-0">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-[300px] sm:h-[400px] w-[260px] lg:w-auto shrink-0 lg:shrink" />
                  ))}
                </div>
              </div>
            </div>
          ) : hasNoTasks ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Kanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No PM Tasks Yet</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  Initialize project management tasks to track Division 8 and Division 28
                  work across all project phases.
                </p>
                <Button
                  onClick={() => bootstrapMutation.mutate()}
                  disabled={bootstrapMutation.isPending}
                  data-testid="button-initialize-tasks"
                >
                  {bootstrapMutation.isPending ? "Initializing..." : "Initialize PM Tasks"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 pb-4">
              <div className="min-w-max lg:min-w-0">
                <PmBoard
                  tasks={taskList}
                  onTaskUpdate={handleTaskUpdate}
                  isLoading={updateTaskMutation.isPending}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="procurement">
          <ProcurementChecklistPanel
            lines={procurementData?.linesWithRedFlags || []}
            isLoading={procurementLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
