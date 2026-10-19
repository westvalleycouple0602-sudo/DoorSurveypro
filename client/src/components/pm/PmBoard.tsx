// client/src/components/pm/PmBoard.tsx
// PM Task Board Component - Kanban-style board for project management tasks

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Filter,
  Shield,
} from "lucide-react";
import type {
  PmTask,
  PmPhase,
  PmTaskStatus,
  PmFeatureTag,
} from "@shared/projectManagement";

export interface PmBoardProps {
  tasks: PmTask[];
  onTaskUpdate?: (taskId: string, updates: Partial<PmTask>) => void;
  isLoading?: boolean;
}

const COLUMNS: { id: PmPhase; label: string }[] = [
  { id: "PRE_CONTRACT", label: "Pre-Contract" },
  { id: "CONTRACT_EXECUTED", label: "Contract" },
  { id: "SUBMITTALS", label: "Submittals" },
  { id: "PROCUREMENT", label: "Procurement" },
  { id: "INSTALLATION", label: "Installation" },
  { id: "PUNCH", label: "Punch" },
  { id: "CLOSEOUT", label: "Closeout" },
];

const STATUS_COLORS: Record<PmTaskStatus, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  HOLD: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  COMPLETE: "bg-green-500/10 text-green-600 dark:text-green-400",
  VOID: "bg-muted text-muted-foreground line-through",
};

const DISCIPLINE_COLORS: Record<string, string> = {
  DIV8: "bg-primary/10 text-primary",
  DIV28: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  STRUCTURAL: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  ELECTRICAL: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  GENERAL: "bg-muted text-muted-foreground",
  OTHER: "bg-muted text-muted-foreground",
};

export function PmBoard({ tasks, onTaskUpdate, isLoading }: PmBoardProps) {
  const [selectedTask, setSelectedTask] = useState<PmTask | null>(null);
  const [filterDiscipline, setFilterDiscipline] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  const filteredTasks = tasks.filter((task) => {
    if (filterDiscipline !== "all" && task.discipline !== filterDiscipline) {
      return false;
    }
    if (filterStatus !== "all" && task.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const byColumn: Record<PmPhase, PmTask[]> = {
    PRE_CONTRACT: [],
    CONTRACT_EXECUTED: [],
    SUBMITTALS: [],
    PROCUREMENT: [],
    INSTALLATION: [],
    PUNCH: [],
    CLOSEOUT: [],
  };

  for (const t of filteredTasks) {
    if (byColumn[t.phase]) {
      byColumn[t.phase].push(t);
    }
  }

  const handleStatusChange = (taskId: string, newStatus: PmTaskStatus) => {
    if (onTaskUpdate) {
      onTaskUpdate(taskId, { status: newStatus });
      toast({
        title: "Task Updated",
        description: `Status changed to ${newStatus.replace(/_/g, " ").toLowerCase()}`,
      });
    }
    setSelectedTask(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
            <SelectTrigger className="w-[140px]" data-testid="select-discipline-filter">
              <SelectValue placeholder="Discipline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disciplines</SelectItem>
              <SelectItem value="DIV8">Division 8</SelectItem>
              <SelectItem value="DIV28">Division 28</SelectItem>
              <SelectItem value="ELECTRICAL">Electrical</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETE">Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-7 md:grid-cols-4 sm:grid-cols-2">
        {COLUMNS.map((col) => (
          <Card key={col.id} className="flex flex-col max-h-[500px]">
            <CardHeader className="py-2 px-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold">{col.label}</CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {byColumn[col.id].length}
                </Badge>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              <CardContent className="p-2 space-y-2">
                {byColumn[col.id].map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className={`w-full text-left rounded-md border p-2 bg-card hover-elevate transition-colors ${
                      task.redFlag ? "border-destructive" : "border-border"
                    }`}
                    data-testid={`pm-task-${task.id}`}
                  >
                    <div className="flex justify-between gap-1 items-start">
                      <span className="text-xs font-medium line-clamp-2">
                        {task.title}
                      </span>
                      {task.redFlag && (
                        <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${DISCIPLINE_COLORS[task.discipline] || ""}`}
                      >
                        {task.discipline}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${STATUS_COLORS[task.status] || ""}`}
                      >
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {task.assigneeName && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{task.assigneeName}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{task.dueDate}</span>
                      </div>
                    )}
                  </button>
                ))}
                {byColumn[col.id].length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No tasks
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTask?.redFlag && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              {selectedTask?.title}
            </DialogTitle>
            <DialogDescription>{selectedTask?.description}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={DISCIPLINE_COLORS[selectedTask.discipline] || ""}>
                  {selectedTask.discipline}
                </Badge>
                <Badge className={STATUS_COLORS[selectedTask.status] || ""}>
                  {selectedTask.status.replace(/_/g, " ")}
                </Badge>
                {selectedTask.featureTags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    {tag.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select
                  value={selectedTask.status}
                  onValueChange={(val) =>
                    handleStatusChange(selectedTask.id, val as PmTaskStatus)
                  }
                >
                  <SelectTrigger data-testid="select-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETE">Complete</SelectItem>
                    <SelectItem value="VOID">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Phase:</span>
                  <p className="font-medium">{selectedTask.phase.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{selectedTask.type.replace(/_/g, " ")}</p>
                </div>
                {selectedTask.assigneeName && (
                  <div>
                    <span className="text-muted-foreground">Assignee:</span>
                    <p className="font-medium">{selectedTask.assigneeName}</p>
                  </div>
                )}
                {selectedTask.dueDate && (
                  <div>
                    <span className="text-muted-foreground">Due Date:</span>
                    <p className="font-medium">{selectedTask.dueDate}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                  data-testid="button-close-task-dialog"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
