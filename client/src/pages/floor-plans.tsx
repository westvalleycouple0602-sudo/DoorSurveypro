import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Upload, MapPin, Trash2, ArrowLeft, Image as ImageIcon, Loader2 } from "lucide-react";
import type { Project, FloorPlan, InsertFloorPlan } from "@shared/schema";
import { FloorPlanViewer } from "@/components/floor-plan-viewer";

export default function FloorPlans() {
  // Support both standalone (/floor-plans) and project-specific (/projects/:id/floor-plans) routes
  const [, projectSpecificParams] = useRoute("/projects/:id/floor-plans");
  const [standaloneMatch] = useRoute("/floor-plans");
  const projectId = projectSpecificParams?.id;
  const isStandaloneMode = standaloneMatch && !projectId;
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    building: "",
    floor: "",
    imageData: "",
    imageMimeType: "",
    imageFileName: "",
  });

  const { 
    data: project, 
    isLoading: loadingProject,
    isError: projectError,
    error: projectErrorObj,
    refetch: refetchProject
  } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { 
    data: floorPlans = [], 
    isLoading: loadingPlans,
    isError: plansError,
    error: plansErrorObj,
    refetch: refetchPlans
  } = useQuery<FloorPlan[]>({
    queryKey: [`/api/floor-plans?projectId=${projectId}`],
    enabled: !!projectId,
  });

  const createPlan = useMutation({
    mutationFn: async (data: Omit<InsertFloorPlan, 'organizationId'>) => {
      const res = await apiRequest("POST", "/api/floor-plans", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Creation failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/floor-plans?projectId=${projectId}`] });
      toast({
        title: "Floor plan created",
        description: "Blueprint has been uploaded successfully and is ready to view",
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to create floor plan",
        description: errorMessage.includes("size") || errorMessage.includes("large")
          ? "Image file is too large. Please use an image under 10MB"
          : errorMessage.includes("format") || errorMessage.includes("type")
          ? "Invalid image format. Please use PNG, JPEG, or similar formats"
          : errorMessage || "Unable to create floor plan. Please try again",
        variant: "destructive",
      });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/floor-plans/${id}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Deletion failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/floor-plans?projectId=${projectId}`] });
      toast({
        title: "Floor plan deleted",
        description: "Blueprint has been removed successfully from project",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to delete floor plan",
        description: errorMessage.includes("not found") || errorMessage.includes("exist")
          ? "Floor plan not found. It may have been already deleted"
          : errorMessage || "Unable to delete floor plan. Please try again",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPEG, WebP, GIF, or SVG image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData({
        ...formData,
        imageData: base64,
        imageMimeType: file.type,
        imageFileName: file.name,
      });
    };
    reader.onerror = () => {
      toast({
        title: "Failed to load image",
        description: "Unable to read file. Please try a different image",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.imageData) {
      toast({
        title: "Missing required fields",
        description: "Please provide a name and upload an image.",
        variant: "destructive",
      });
      return;
    }

    createPlan.mutate({
      ...formData,
      projectId,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      building: "",
      floor: "",
      imageData: "",
      imageMimeType: "",
      imageFileName: "",
    });
  };

  const isLoading = loadingProject || loadingPlans;

  // Show standalone mode message if no project selected
  if (isStandaloneMode) {
    return (
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Card data-testid="card-project-selector">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Floor Plans
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Upload and manage facility blueprints and floor plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Floor plans are organized by project. Please select a project to view or upload floor plans.
              </p>
              <Button asChild size="sm" data-testid="button-go-to-projects" className="text-xs sm:text-sm">
                <Link href="/projects">
                  View Projects
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6" data-testid="loading-floor-plans">
        <Skeleton className="h-10 sm:h-12 w-64 sm:w-96" />
        <Skeleton className="h-64 sm:h-96 w-full" />
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load project"
          message={projectErrorObj instanceof Error ? projectErrorObj.message : "Unable to fetch project details"}
          error={projectErrorObj as Error}
          onRetry={refetchProject}
          testId="error-project"
        />
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load floor plans"
          message={plansErrorObj instanceof Error ? plansErrorObj.message : "Unable to fetch floor plans for this project"}
          error={plansErrorObj as Error}
          onRetry={refetchPlans}
          testId="error-plans"
        />
      </div>
    );
  }

  // If a floor plan is selected, show the viewer
  if (selectedFloorPlanId) {
    const selectedPlan = floorPlans.find((p) => p.id === selectedFloorPlanId);
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6" data-testid="page-floor-plan-viewer">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedFloorPlanId(null)}
            aria-label="Back to floor plans"
            data-testid="button-back-to-floor-plans"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate" data-testid="heading-floor-plan-viewer">
              {selectedPlan?.name ?? "Floor Plan"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {project?.name} - Interactive floor plan viewer
            </p>
          </div>
        </div>
        <FloorPlanViewer
          floorPlanId={selectedFloorPlanId}
          onOpeningSelect={(openingId) => navigate(`/openings/${openingId}`)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6" data-testid="page-floor-plans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="heading-floor-plans">Floor Plans</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {project?.name} - Upload and manage facility blueprints and maps
          </p>
        </div>
        <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm shrink-0" onClick={() => setDialogOpen(true)} data-testid="button-add-floor-plan">
          <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          Upload Floor Plan
        </Button>
      </div>

      {floorPlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-3 sm:px-6">
            <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2">No floor plans yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4">
              Upload blueprints or facility maps to visualize door locations
            </p>
            <Button size="sm" className="text-xs sm:text-sm" onClick={() => setDialogOpen(true)}>
              <Upload className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Upload First Floor Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {floorPlans.map((plan) => (
            <Card
              key={plan.id}
              data-testid={`card-floor-plan-${plan.id}`}
              className="cursor-pointer hover-elevate"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedFloorPlanId(plan.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedFloorPlanId(plan.id);
              }}
            >
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
                  <span className="truncate min-w-0">{plan.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-7 w-7 sm:h-8 sm:w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlan.mutate(plan.id);
                    }}
                    aria-label="Delete floor plan"
                    data-testid={`button-delete-${plan.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </CardTitle>
                {plan.description && (
                  <CardDescription className="text-xs sm:text-sm">{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {plan.imageData && (
                  <div
                    className="relative aspect-video bg-muted rounded-md overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={plan.imageData}
                      alt={plan.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs backdrop-blur-sm bg-background/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(plan.imageData!);
                        }}
                        data-testid={`button-preview-image-${plan.id}`}
                      >
                        Preview Image
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  {plan.building && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Building:</span>
                      <span className="font-medium truncate">{plan.building}</span>
                    </div>
                  )}
                  {plan.floor && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Floor:</span>
                      <span className="font-medium truncate">{plan.floor}</span>
                    </div>
                  )}
                  {plan.imageFileName && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">File:</span>
                      <span className="font-medium text-[10px] sm:text-xs truncate">{plan.imageFileName}</span>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFloorPlanId(plan.id);
                  }}
                  data-testid={`button-open-viewer-${plan.id}`}
                >
                  <MapPin className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  Open Interactive Viewer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Upload Floor Plan</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Upload a blueprint or facility map image to visualize door locations
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs sm:text-sm">Floor Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 1st Floor Plan, Building A - Level 2"
                data-testid="input-plan-name"
                className="text-sm"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
                data-testid="input-plan-description"
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="building" className="text-xs sm:text-sm">Building</Label>
                <Input
                  id="building"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  placeholder="e.g., Main Building"
                  data-testid="input-plan-building"
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="floor" className="text-xs sm:text-sm">Floor</Label>
                <Input
                  id="floor"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  placeholder="e.g., 1, 2, Basement"
                  data-testid="input-plan-floor"
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="image" className="text-xs sm:text-sm">Blueprint Image *</Label>
              <div className="mt-1.5 sm:mt-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  data-testid="input-plan-image"
                  className="text-xs sm:text-sm"
                  required
                />
              </div>
              {formData.imageData && (
                <div className="mt-3 sm:mt-4 relative aspect-video bg-muted rounded-md overflow-hidden">
                  <img
                    src={formData.imageData}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm w-full sm:w-auto"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs sm:text-sm w-full sm:w-auto" disabled={createPlan.isPending} data-testid="button-save-floor-plan">
                {createPlan.isPending ? "Uploading..." : "Upload Floor Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Floor Plan Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-full overflow-auto">
              <img
                src={selectedImage}
                alt="Floor Plan"
                className="w-full h-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
