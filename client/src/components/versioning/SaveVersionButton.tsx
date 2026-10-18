import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { VersioningEntityType } from "./useVersioning";

interface SaveVersionButtonProps {
  entityType: VersioningEntityType;
  entityId: string;
  getSnapshot: () => Record<string, any>;
  onSaved?: (version: any) => void;
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SaveVersionButton({
  entityType,
  entityId,
  getSnapshot,
  onSaved,
  className,
  showLabel = true,
  variant = "outline",
  size = "default",
}: SaveVersionButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [changeSummary, setChangeSummary] = useState("");

  const saveVersionMutation = useMutation({
    mutationFn: async (data: { snapshot: Record<string, any>; versionName?: string; changeSummary?: string }) => {
      const response = await apiRequest("POST", "/api/versioning/versions", {
        entityType,
        entityId,
        ...data,
      });
      if (!response.ok) throw new Error("Failed to save version");
      return response.json();
    },
    onSuccess: (version) => {
      toast({ title: "Version saved", description: `Version ${version.versionNumber} created successfully` });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && 
            key[0] === "/api/versioning/entities" && 
            key[1] === entityType && 
            key[2] === entityId && 
            key[3] === "history";
        },
      });
      onSaved?.(version);
      setDialogOpen(false);
      setVersionName("");
      setChangeSummary("");
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save version", 
        variant: "destructive" 
      });
    },
  });

  const handleQuickSave = () => {
    const snapshot = getSnapshot();
    saveVersionMutation.mutate({ snapshot });
  };

  const handleSaveWithDetails = () => {
    const snapshot = getSnapshot();
    saveVersionMutation.mutate({ 
      snapshot, 
      versionName: versionName.trim() || undefined, 
      changeSummary: changeSummary.trim() || undefined 
    });
  };

  const isSaving = saveVersionMutation.isPending;

  if (size === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="icon"
            onClick={handleQuickSave}
            disabled={isSaving}
            className={className}
            aria-label="Save version"
            data-testid="button-save-version"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Save version</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div className={cn("flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={handleQuickSave}
              disabled={isSaving}
              data-testid="button-save-version"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {showLabel && <span className="ml-1">Save</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Quick save version</p>
          </TooltipContent>
        </Tooltip>
        
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isSaving}
            className="px-2 text-muted-foreground"
            data-testid="button-save-version-details"
          >
            ...
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md" data-testid="dialog-save-version">
        <DialogHeader>
          <DialogTitle>Save Version</DialogTitle>
          <DialogDescription>
            Add optional details to help identify this version later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">Version Name (optional)</Label>
            <Input
              id="version-name"
              placeholder="e.g., After client review"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              disabled={isSaving}
              data-testid="input-version-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="change-summary">Change Summary (optional)</Label>
            <Textarea
              id="change-summary"
              placeholder="Describe the changes in this version..."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              disabled={isSaving}
              rows={3}
              className="resize-none"
              data-testid="textarea-change-summary"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={isSaving}
            data-testid="button-cancel-save"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveWithDetails}
            disabled={isSaving}
            data-testid="button-confirm-save"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SaveVersionButton;
