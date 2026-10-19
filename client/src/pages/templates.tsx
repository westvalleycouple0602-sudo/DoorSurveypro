import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, Trash2, Eye, Loader2 } from "lucide-react";
import { insertDoorTemplateSchema, type InsertDoorTemplate, type DoorTemplate } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";

export default function Templates() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DoorTemplate | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  const { data: templates = [], isLoading, isError, error, refetch } = useQuery<DoorTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm<InsertDoorTemplate>({
    resolver: zodResolver(insertDoorTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      doorType: "",
      doorMaterial: "",
      doorWidth: "",
      doorHeight: "",
      doorThickness: "",
      frameType: "",
      frameMaterial: "",
      frameWidth: "",
      frameDepth: "",
      lockType: "",
      hingeType: "",
      hingeCount: "",
      closerType: "",
      exitDevice: "",
      automationRequired: "no",
      automationType: "",
      accessControlRequired: "no",
      accessControlType: "",
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (data: InsertDoorTemplate) => {
      const res = await apiRequest("POST", "/api/templates", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Success",
        description: "Door template created successfully. It's now available for use when creating new door openings.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
        description: error.message || "Unable to save template. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Success",
        description: "Door template deleted successfully. It has been removed from your organization.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete template",
        description: error.message || "Unable to remove template. It may be in use by existing projects or door openings.",
        variant: "destructive",
      });
    },
  });

  // Show error state
  if (isError) {
    return (
      <div className="h-full overflow-auto">
        <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6">
          <ErrorState
            title="Failed to load door templates"
            message={error instanceof Error ? error.message : "Unable to fetch template data. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-templates"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
          {/* Page header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 sm:h-8 w-40 sm:w-48" />
              <Skeleton className="h-4 w-56 sm:w-64" />
            </div>
            <Skeleton className="h-9 w-full sm:w-36" />
          </div>
          {/* Template cards skeleton */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 sm:h-6 w-3/4" />
                  <Skeleton className="h-3 sm:h-4 w-1/2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between gap-2">
                    <Skeleton className="h-3 sm:h-4 w-20" />
                    <Skeleton className="h-3 sm:h-4 w-24" />
                  </div>
                  <div className="flex justify-between gap-2">
                    <Skeleton className="h-3 sm:h-4 w-24" />
                    <Skeleton className="h-3 sm:h-4 w-20" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 sm:h-9 flex-1" />
                  <Skeleton className="h-8 sm:h-9 w-8 sm:w-9" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Door Templates</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Pre-configured door specifications for faster data entry
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-template" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Create Door Template</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a reusable template for common door configurations
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createTemplate.mutate(data))} className="space-y-3 sm:space-y-4">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-xs sm:text-sm">Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Standard Office Single Door" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-xs sm:text-sm">Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Template description" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doorType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Door Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="pair">Pair</SelectItem>
                              <SelectItem value="sliding">Sliding</SelectItem>
                              <SelectItem value="folding">Folding</SelectItem>
                              <SelectItem value="revolving">Revolving</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doorMaterial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Door Material</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Wood, Metal" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doorWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Door Width (inches)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 36" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doorHeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Door Height (inches)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 80" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doorThickness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Door Thickness (inches)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1.75" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="frameType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Frame Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Hollow Metal" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lockType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Lock Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Cylindrical" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hingeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Hinge Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Standard" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
                    <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto text-xs sm:text-sm">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={createTemplate.isPending} className="w-full sm:w-auto text-xs sm:text-sm">
                      {createTemplate.isPending ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <p className="text-xs sm:text-sm text-muted-foreground">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="p-4 sm:pt-6">
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-3 sm:mb-4 shrink-0" />
                <h3 className="text-base sm:text-lg font-medium mb-2">No templates yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md">
                  Create reusable templates for common door configurations to speed up data entry
                </p>
                <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="button-create-first-template" className="text-xs sm:text-sm">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                  Create First Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} data-testid={`card-template-${template.id}`}>
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">{template.name}</CardTitle>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => deleteTemplate.mutate(template.id)}
                      aria-label="Delete template"
                      data-testid={`button-delete-${template.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-2 sm:space-y-3">
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {template.doorType && (
                      <Badge variant="secondary" className="text-xs capitalize shrink-0">
                        {template.doorType}
                      </Badge>
                    )}
                    {template.doorMaterial && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {template.doorMaterial}
                      </Badge>
                    )}
                    {template.doorWidth && template.doorHeight && (
                      <Badge variant="secondary" className="text-xs font-mono shrink-0">
                        {template.doorWidth}" × {template.doorHeight}"
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    {template.frameType && <div>Frame: {template.frameType}</div>}
                    {template.lockType && <div>Lock: {template.lockType}</div>}
                    {template.automationRequired === "yes" && (
                      <div className="text-chart-2">✓ Automation Required</div>
                    )}
                    {template.accessControlRequired === "yes" && (
                      <div className="text-chart-3">✓ Access Control</div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-xs sm:text-sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setViewDetailsOpen(true);
                    }}
                    data-testid={`button-view-details-${template.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2 shrink-0" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Template Details Dialog */}
        <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{selectedTemplate?.name}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {selectedTemplate?.description || "Complete template specifications"}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="space-y-4 sm:space-y-6">
                {/* Door Specifications */}
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Door Specifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    {selectedTemplate.doorType && (
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <span className="ml-2 font-medium capitalize">{selectedTemplate.doorType}</span>
                      </div>
                    )}
                    {selectedTemplate.doorMaterial && (
                      <div>
                        <span className="text-muted-foreground">Material:</span>
                        <span className="ml-2 font-medium">{selectedTemplate.doorMaterial}</span>
                      </div>
                    )}
                    {selectedTemplate.doorWidth && (
                      <div>
                        <span className="text-muted-foreground">Width:</span>
                        <span className="ml-2 font-mono">{selectedTemplate.doorWidth}"</span>
                      </div>
                    )}
                    {selectedTemplate.doorHeight && (
                      <div>
                        <span className="text-muted-foreground">Height:</span>
                        <span className="ml-2 font-mono">{selectedTemplate.doorHeight}"</span>
                      </div>
                    )}
                    {selectedTemplate.doorThickness && (
                      <div>
                        <span className="text-muted-foreground">Thickness:</span>
                        <span className="ml-2 font-mono">{selectedTemplate.doorThickness}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Frame Specifications */}
                {(selectedTemplate.frameType || selectedTemplate.frameMaterial || selectedTemplate.frameWidth || selectedTemplate.frameDepth) && (
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Frame Specifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      {selectedTemplate.frameType && (
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.frameType}</span>
                        </div>
                      )}
                      {selectedTemplate.frameMaterial && (
                        <div>
                          <span className="text-muted-foreground">Material:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.frameMaterial}</span>
                        </div>
                      )}
                      {selectedTemplate.frameWidth && (
                        <div>
                          <span className="text-muted-foreground">Width:</span>
                          <span className="ml-2 font-mono">{selectedTemplate.frameWidth}"</span>
                        </div>
                      )}
                      {selectedTemplate.frameDepth && (
                        <div>
                          <span className="text-muted-foreground">Depth:</span>
                          <span className="ml-2 font-mono">{selectedTemplate.frameDepth}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hardware Specifications */}
                {(selectedTemplate.lockType || selectedTemplate.hingeType || selectedTemplate.hingeCount || selectedTemplate.closerType || selectedTemplate.exitDevice) && (
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Hardware Specifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      {selectedTemplate.lockType && (
                        <div>
                          <span className="text-muted-foreground">Lock:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.lockType}</span>
                        </div>
                      )}
                      {selectedTemplate.hingeType && (
                        <div>
                          <span className="text-muted-foreground">Hinges:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.hingeType}</span>
                        </div>
                      )}
                      {selectedTemplate.hingeCount && (
                        <div>
                          <span className="text-muted-foreground">Hinge Count:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.hingeCount}</span>
                        </div>
                      )}
                      {selectedTemplate.closerType && (
                        <div>
                          <span className="text-muted-foreground">Closer:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.closerType}</span>
                        </div>
                      )}
                      {selectedTemplate.exitDevice && (
                        <div>
                          <span className="text-muted-foreground">Exit Device:</span>
                          <span className="ml-2 font-medium">{selectedTemplate.exitDevice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Automation & Access Control */}
                {(selectedTemplate.automationRequired === "yes" || selectedTemplate.accessControlRequired === "yes") && (
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Special Requirements</h3>
                    <div className="space-y-2">
                      {selectedTemplate.automationRequired === "yes" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-chart-2 text-xs shrink-0">Automation Required</Badge>
                          {selectedTemplate.automationType && (
                            <span className="text-xs sm:text-sm text-muted-foreground">({selectedTemplate.automationType})</span>
                          )}
                        </div>
                      )}
                      {selectedTemplate.accessControlRequired === "yes" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-chart-3 text-xs shrink-0">Access Control Required</Badge>
                          {selectedTemplate.accessControlType && (
                            <span className="text-xs sm:text-sm text-muted-foreground">({selectedTemplate.accessControlType})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
                  <Button variant="outline" size="sm" onClick={() => setViewDetailsOpen(false)} className="w-full sm:w-auto text-xs sm:text-sm">
                    Close
                  </Button>
                  <Button 
                    size="sm"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                    onClick={() => {
                      toast({
                        title: "Template Ready",
                        description: "Navigate to a project and create a new door opening to apply this template.",
                      });
                      setViewDetailsOpen(false);
                    }}
                    data-testid="button-use-template"
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
