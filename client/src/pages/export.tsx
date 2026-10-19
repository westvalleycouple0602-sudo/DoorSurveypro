import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import type { Project, DoorOpening, Photo, PhotoType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getRequiredPhotoTypes, getMissingPhotoTypes } from "@shared/photoVerification";

export default function Export() {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { 
    data: projects = [], 
    isLoading,
    isError,
    error: errorObj,
    refetch
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allOpenings = [] } = useQuery<DoorOpening[]>({
    queryKey: ["/api/openings"],
  });

  const { data: allPhotos = [] } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  // Calculate openings with missing photos for each project
  const getProjectValidationStatus = (projectId: string) => {
    const projectOpenings = allOpenings.filter(o => o.projectId === projectId);
    const openingsWithMissingPhotos: string[] = [];

    for (const opening of projectOpenings) {
      const openingPhotos = allPhotos.filter(p => p.openingId === opening.id);
      const uploadedTypes = openingPhotos.map(p => p.photoType as PhotoType);
      const missingTypes = getMissingPhotoTypes(opening, uploadedTypes);
      
      if (missingTypes.length > 0) {
        openingsWithMissingPhotos.push(opening.openingNumber || opening.id);
      }
    }

    return {
      totalOpenings: projectOpenings.length,
      missingCount: openingsWithMissingPhotos.length,
      openingsWithIssues: openingsWithMissingPhotos,
    };
  };

  const toggleProject = (projectId: string) => {
    const newSet = new Set(selectedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setSelectedProjects(newSet);
  };

  const selectAll = () => {
    setSelectedProjects(new Set(projects.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedProjects(new Set());
  };

  const handleExport = async () => {
    if (selectedProjects.size === 0) {
      toast({
        title: "No projects selected",
        description: "Please select at least one project to export",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: Array.from(selectedProjects) }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `door-survey-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export complete",
        description: `Successfully exported ${selectedProjects.size} ${selectedProjects.size === 1 ? "project" : "projects"} to Excel`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to export",
        description: errorMessage.includes("file") || errorMessage.includes("generate")
          ? "Unable to generate Excel file. Please check your data and try again"
          : errorMessage.includes("project") || errorMessage.includes("data")
          ? "Unable to fetch project data for export. Please try again"
          : errorMessage || "Export failed. Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePdfExport = async (projectId: string, projectName: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/export-pdf`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "PDF export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}-survey-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF report downloaded",
        description: `Survey report for "${projectName}" has been saved successfully`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to generate PDF",
        description: errorMessage.includes("template") || errorMessage.includes("format")
          ? "Unable to format PDF report. Please contact support if this persists"
          : errorMessage.includes("opening") || errorMessage.includes("data")
          ? "Missing required survey data. Please ensure the project has door openings"
          : errorMessage || "Unable to create PDF report. Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Export Data</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Export your survey data to Excel for procurement or generate professional PDF reports with schedules
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <CardTitle className="text-base sm:text-lg">Select Projects to Export</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="w-full sm:w-auto text-xs sm:text-sm"
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={projects.length === 0}
                  data-testid="button-select-all"
                >
                  Select All
                </Button>
                <Button
                  className="w-full sm:w-auto text-xs sm:text-sm"
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedProjects.size === 0}
                  data-testid="button-deselect-all"
                >
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <ErrorState
                title="Failed to load projects"
                message={errorObj instanceof Error ? errorObj.message : "Unable to fetch projects for export"}
                error={errorObj as Error}
                onRetry={refetch}
                testId="error-projects"
              />
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <FileSpreadsheet className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">No projects to export</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Create some projects with door openings first
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {projects.map((project) => {
                  const validationStatus = getProjectValidationStatus(project.id);
                  const hasWarnings = validationStatus.missingCount > 0;
                  
                  return (
                    <div
                      key={project.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-md border hover-elevate"
                      data-testid={`row-project-${project.id}`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={selectedProjects.has(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                          data-testid={`checkbox-project-${project.id}`}
                          className="mt-0.5 sm:mt-0 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h4 className="font-medium text-xs sm:text-sm truncate">{project.name}</h4>
                            {hasWarnings && (
                              <Badge 
                                variant="outline" 
                                className="bg-destructive/10 text-destructive border-destructive/20 text-xs shrink-0"
                                data-testid={`badge-warning-${project.id}`}
                              >
                                <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
                                <span className="hidden sm:inline">{validationStatus.missingCount} missing photos</span>
                                <span className="sm:hidden">{validationStatus.missingCount}</span>
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                            <span className="text-xs text-muted-foreground truncate">{project.location}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-xs text-muted-foreground capitalize hidden sm:inline">
                              {project.buildingType}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                            <span
                              className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-md ${
                                project.status === "active"
                                  ? "bg-chart-2/10 text-chart-2"
                                  : project.status === "completed"
                                  ? "bg-chart-3/10 text-chart-3"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {project.status}
                            </span>
                          </div>
                          {hasWarnings && (
                            <p className="text-xs text-destructive mt-2 line-clamp-2">
                              Openings with incomplete photos: {validationStatus.openingsWithIssues.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        className="w-full sm:w-auto text-xs sm:text-sm shrink-0"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePdfExport(project.id, project.name)}
                        data-testid={`button-pdf-${project.id}`}
                      >
                        <FileText className="h-4 w-4 mr-2 shrink-0" />
                        <span className="hidden sm:inline">PDF Report</span>
                        <span className="sm:hidden">PDF</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {projects.length > 0 && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Export Formats</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-md border bg-muted/30">
                <div className="min-w-0">
                  <h4 className="font-medium text-xs sm:text-sm">Microsoft Excel (.xlsx)</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bulk export of selected projects with all door openings, measurements, and specifications
                  </p>
                </div>
                <FileSpreadsheet className="h-6 w-6 sm:h-8 sm:w-8 text-chart-2 shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-md border bg-muted/30">
                <div className="min-w-0">
                  <h4 className="font-medium text-xs sm:text-sm">PDF Survey Report (.pdf)</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Professional report per project with door/frame/hardware schedules and project narrative
                  </p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-chart-3 shrink-0" />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleExport}
                  disabled={selectedProjects.size === 0}
                  data-testid="button-export"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Download className="h-4 w-4 mr-2 shrink-0" />
                  <span className="hidden sm:inline">Export to Excel {selectedProjects.size > 0 ? `(${selectedProjects.size} ${selectedProjects.size === 1 ? "Project" : "Projects"})` : ""}</span>
                  <span className="sm:hidden">Export {selectedProjects.size > 0 ? `(${selectedProjects.size})` : ""}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
