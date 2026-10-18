import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Save, 
  Plus, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  CheckSquare, 
  ListChecks,
  Package,
  Recycle,
  Loader2
} from "lucide-react";
import type { Project } from "@shared/schema";

export default function ScopeOfWork() {
  const [, params] = useRoute("/projects/:id/scope-of-work");
  const projectId = params?.id;
  const { toast } = useToast();

  const [newItemToRemain, setNewItemToRemain] = useState("");
  const [newItemToRemove, setNewItemToRemove] = useState("");

  const { data: project, isLoading, isError, error, refetch } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const [formData, setFormData] = useState<Partial<Project>>({});

  // Initialize form data when project loads
  useEffect(() => {
    if (project) {
      setFormData({
        scopeOfWork: project.scopeOfWork || "",
        scopePowerByOthers: project.scopePowerByOthers || "no",
        scopeDemolitionByOthers: project.scopeDemolitionByOthers || "no",
        scopePatchingByOthers: project.scopePatchingByOthers || "no",
        scopePaintingByOthers: project.scopePaintingByOthers || "no",
        scopeAsbestosAbatementByOthers: project.scopeAsbestosAbatementByOthers || "no",
        scopeStructuralWorkByOthers: project.scopeStructuralWorkByOthers || "no",
        scopeFireAlarmByOthers: project.scopeFireAlarmByOthers || "no",
        scopeAccessControlByOthers: project.scopeAccessControlByOthers || "no",
        scopeItemsToRemain: project.scopeItemsToRemain || [],
        scopeItemsToRemove: project.scopeItemsToRemove || [],
        scopeAdditionalDisclaimers: project.scopeAdditionalDisclaimers || "",
      });
    }
  }, [project]);

  const updateProject = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({
        title: "Success",
        description: "Scope of work updated successfully. Changes are now reflected in project documentation.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update scope of work",
        description: error.message || "Unable to save changes. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProject.mutate(formData);
  };

  const toggleDisclaimer = (field: keyof Project) => {
    const currentValue = formData[field] as string;
    setFormData({
      ...formData,
      [field]: currentValue === "yes" ? "no" : "yes",
    });
  };

  const addItemToRemain = () => {
    if (!newItemToRemain.trim()) return;
    setFormData({
      ...formData,
      scopeItemsToRemain: [...(formData.scopeItemsToRemain || []), newItemToRemain.trim()],
    });
    setNewItemToRemain("");
  };

  const removeItemToRemain = (index: number) => {
    setFormData({
      ...formData,
      scopeItemsToRemain: formData.scopeItemsToRemain?.filter((_, i) => i !== index) || [],
    });
  };

  const addItemToRemove = () => {
    if (!newItemToRemove.trim()) return;
    setFormData({
      ...formData,
      scopeItemsToRemove: [...(formData.scopeItemsToRemove || []), newItemToRemove.trim()],
    });
    setNewItemToRemove("");
  };

  const removeItemToRemove = (index: number) => {
    setFormData({
      ...formData,
      scopeItemsToRemove: formData.scopeItemsToRemove?.filter((_, i) => i !== index) || [],
    });
  };

  // Show error state
  if (isError) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load scope of work"
            message={error instanceof Error ? error.message : "Unable to fetch project scope of work. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-scope-of-work"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground" data-testid="loading-state">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-2 sm:mb-3" />
          <p className="text-xs sm:text-sm">Loading scope of work...</p>
        </div>
        <Skeleton className="h-10 sm:h-12 w-full sm:w-96" />
        <Skeleton className="h-64 sm:h-96 w-full" />
      </div>
    );
  }

  const disclaimers = [
    {
      key: "scopePowerByOthers",
      label: "Electrical power work by others",
      icon: AlertTriangle,
    },
    {
      key: "scopeDemolitionByOthers",
      label: "Demolition work by others",
      icon: AlertTriangle,
    },
    {
      key: "scopePatchingByOthers",
      label: "Wall/ceiling patching by others",
      icon: AlertTriangle,
    },
    {
      key: "scopePaintingByOthers",
      label: "Painting/finishing by others",
      icon: AlertTriangle,
    },
    {
      key: "scopeAsbestosAbatementByOthers",
      label: "Asbestos abatement by others",
      icon: AlertTriangle,
    },
    {
      key: "scopeStructuralWorkByOthers",
      label: "Structural modifications by others",
      icon: AlertTriangle,
    },
    {
      key: "scopeFireAlarmByOthers",
      label: "Fire alarm integration by others",
      icon: AlertTriangle,
    },
    {
      key: "scopeAccessControlByOthers",
      label: "Access control system by others",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="container mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Scope of Work</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {project?.name} - Define project scope, disclaimers, and item tracking for PDFs and quotes
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateProject.isPending}
          data-testid="button-save-scope"
          className="w-full sm:w-auto text-xs sm:text-sm"
          size="sm"
        >
          {updateProject.isPending ? (
            <>
              <Loader2 className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* Scope Description */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Scope of Work Description
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Detailed description of the work to be performed - will be included in PDF exports and quotes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <Textarea
              value={formData.scopeOfWork || ""}
              onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
              placeholder="Enter detailed scope of work description...&#10;&#10;Example:&#10;- Remove existing doors and hardware&#10;- Install new fire-rated doors and frames&#10;- Install ADA-compliant hardware&#10;- Test all openings for proper operation&#10;- Provide warranty documentation"
              rows={12}
              className="font-mono text-xs sm:text-sm"
              data-testid="input-scope-description"
            />
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
              <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Work by Others Disclaimers
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Check items that will be performed by others (not included in this scope)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {disclaimers.map(({ key, label, icon: Icon }) => (
                <div 
                  key={key} 
                  className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-md border hover-elevate cursor-pointer min-w-0"
                  onClick={() => toggleDisclaimer(key as keyof Project)}
                  data-testid={`disclaimer-${key}`}
                >
                  <Checkbox
                    checked={formData[key as keyof Project] === "yes"}
                    onCheckedChange={() => toggleDisclaimer(key as keyof Project)}
                    className="shrink-0"
                  />
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                  <Label className="cursor-pointer flex-1 text-xs sm:text-sm min-w-0 truncate">{label}</Label>
                  {formData[key as keyof Project] === "yes" && (
                    <Badge variant="secondary" className="shrink-0 text-xs">By Others</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Disclaimers */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
              <ListChecks className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Additional Disclaimers
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Any additional custom disclaimers or exclusions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <Textarea
              value={formData.scopeAdditionalDisclaimers || ""}
              onChange={(e) => setFormData({ ...formData, scopeAdditionalDisclaimers: e.target.value })}
              placeholder="Enter any additional disclaimers...&#10;&#10;Example:&#10;- Pricing valid for 30 days&#10;- Lead times subject to change&#10;- Site access coordination required"
              rows={6}
              className="font-mono text-xs sm:text-sm"
              data-testid="input-additional-disclaimers"
            />
          </CardContent>
        </Card>

        {/* Items to Remain */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Items to Remain Intact
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Existing items that will stay in place and not be touched during installation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newItemToRemain}
                onChange={(e) => setNewItemToRemain(e.target.value)}
                placeholder="e.g., Existing door closer, Door frame"
                onKeyPress={(e) => e.key === "Enter" && addItemToRemain()}
                data-testid="input-item-to-remain"
                className="flex-1 text-xs sm:text-sm"
              />
              <Button onClick={addItemToRemain} data-testid="button-add-item-remain" className="w-full sm:w-auto" size="sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              </Button>
            </div>

            {formData.scopeItemsToRemain && formData.scopeItemsToRemain.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {formData.scopeItemsToRemain.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2 sm:p-3 border rounded-md min-w-0"
                    data-testid={`item-remain-${index}`}
                  >
                    <span className="text-xs sm:text-sm truncate min-w-0">{item}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemToRemain(index)}
                      data-testid={`button-remove-remain-${index}`}
                      className="shrink-0 h-7 w-7 sm:h-8 sm:w-8"
                      aria-label="Remove item from remain list"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-muted-foreground" data-testid="empty-items-remain">
                <Package className="h-10 w-10 sm:h-12 sm:w-12 mb-2 sm:mb-3 opacity-50" />
                <p className="text-xs sm:text-sm text-center">
                  No items to remain. Add items that should not be touched during installation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items to Remove/Reuse */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
              <Recycle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Items to Remove (Reusable)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Items that will be removed during installation but can be reused elsewhere in the project
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newItemToRemove}
                onChange={(e) => setNewItemToRemove(e.target.value)}
                placeholder="e.g., Hardware set #3, Hinges"
                onKeyPress={(e) => e.key === "Enter" && addItemToRemove()}
                data-testid="input-item-to-remove"
                className="flex-1 text-xs sm:text-sm"
              />
              <Button onClick={addItemToRemove} data-testid="button-add-item-remove" className="w-full sm:w-auto" size="sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              </Button>
            </div>

            {formData.scopeItemsToRemove && formData.scopeItemsToRemove.length > 0 ? (
              <div className="space-y-1.5 sm:space-y-2">
                {formData.scopeItemsToRemove.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2 sm:p-3 border rounded-md min-w-0"
                    data-testid={`item-remove-${index}`}
                  >
                    <span className="text-xs sm:text-sm truncate min-w-0">{item}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemToRemove(index)}
                      data-testid={`button-remove-item-${index}`}
                      className="shrink-0 h-7 w-7 sm:h-8 sm:w-8"
                      aria-label="Remove item from remove list"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-muted-foreground" data-testid="empty-items-remove">
                <Recycle className="h-10 w-10 sm:h-12 sm:w-12 mb-2 sm:mb-3 opacity-50" />
                <p className="text-xs sm:text-sm text-center">
                  No items to remove. Add items that will be removed but can be reused.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button at Bottom */}
      <div className="flex justify-end pt-3 sm:pt-4">
        <Button 
          onClick={handleSave} 
          disabled={updateProject.isPending}
          size="sm"
          data-testid="button-save-scope-bottom"
          className="w-full sm:w-auto text-xs sm:text-sm"
        >
          {updateProject.isPending ? (
            <>
              <Loader2 className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
