import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Camera,
  Wrench,
  FileText,
  Copy,
  Trash2,
  Scan,
  Package,
  Shield,
  Activity,
  Layers,
  DoorOpen,
  Ruler,
  DoorClosed,
  SquareDashed,
  Loader2,
  Save,
  PanelTop,
  ClipboardList,
} from "lucide-react";
import type {
  DoorOpening,
  Project,
  Photo,
  HardwareItem,
  HardwareBundle,
  ManufacturerContact,
  QuoteRequest,
  ComplianceViolation,
  ComplianceRule,
  LidarScan,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RecentItemsService } from "@/lib/recent-items";
import { DoorDiagram } from "@/components/door-diagram";
import { ErrorState } from "@/components/error-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OpeningDetailProvider, type ScanConfig } from "./context";
import { LazyPanel, createLazyPanel } from "./lazy-panel";

const PhotosPanel = createLazyPanel(() => import("./panels/photos-panel"));
const HardwarePanel = createLazyPanel(() => import("./panels/hardware-panel"));
const MeasurementsPanel = createLazyPanel(() => import("./panels/measurements-panel"));
const LidarPanel = createLazyPanel(() => import("./panels/lidar-panel"));
const GuidedScanPanel = createLazyPanel(() => import("./panels/guided-scan-panel"));
const ValidationPanel = createLazyPanel(() => import("./panels/validation-panel"));
const BomPanel = createLazyPanel(() => import("./panels/bom-panel"));
const FactoryOrderPanel = createLazyPanel(() => import("./panels/factory-order-panel"));

export default function OpeningDetailShell() {
  const { openingId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [technicianNotes, setTechnicianNotes] = useState({
    installationNarrative: "",
    componentNotes: "",
    wiringNotes: "",
    fieldIssues: "",
  });

  const openingQuery = useQuery<DoorOpening>({
    queryKey: [`/api/openings/${openingId}`],
  });

  const { data: opening, isLoading, isError, error } = openingQuery;

  const projectQuery = useQuery<Project>({
    queryKey: [`/api/projects/${opening?.projectId}`],
    enabled: !!opening?.projectId,
  });

  const { data: project } = projectQuery;

  const photosQuery = useQuery<Photo[]>({
    queryKey: [`/api/openings/${openingId}/photos`],
  });

  const { data: photos = [] } = photosQuery;

  const hardwareQuery = useQuery<HardwareItem[]>({
    queryKey: [`/api/openings/${openingId}/hardware`],
  });

  const { data: hardwareItems = [] } = hardwareQuery;

  const bundlesQuery = useQuery<HardwareBundle[]>({
    queryKey: ["/api/bundles"],
  });

  const { data: bundles = [] } = bundlesQuery;

  const manufacturersQuery = useQuery<ManufacturerContact[]>({
    queryKey: ["/api/manufacturers"],
  });

  const { data: manufacturers = [] } = manufacturersQuery;

  const quoteRequestsQuery = useQuery<QuoteRequest[]>({
    queryKey: [`/api/projects/${opening?.projectId}/quote-requests`],
    enabled: !!opening?.projectId,
  });

  const { data: quoteRequests = [] } = quoteRequestsQuery;

  const violationsQuery = useQuery<(ComplianceViolation & { rule: ComplianceRule })[]>({
    queryKey: [`/api/openings/${openingId}/violations`],
  });

  const { data: violations = [] } = violationsQuery;

  const lidarScansQuery = useQuery<LidarScan[]>({
    queryKey: [`/api/openings/${openingId}/lidar-scans`],
  });

  const { data: lidarScans = [] } = lidarScansQuery;

  const scanConfigQuery = useQuery<ScanConfig>({
    queryKey: [`/api/organizations/${project?.organizationId}/scan-config`],
    enabled: !!project?.organizationId,
  });

  useEffect(() => {
    if (opening && project) {
      RecentItemsService.addRecentItem({
        id: opening.id,
        type: "opening",
        title: opening.openingNumber || `Opening ${opening.id.slice(0, 8)}`,
        subtitle: project.name,
        url: `/projects/${project.id}/openings/${opening.id}`,
      });
    }
  }, [opening, project]);

  useEffect(() => {
    if (opening) {
      setTechnicianNotes({
        installationNarrative: opening.installationNarrative || "",
        componentNotes: opening.componentNotes || "",
        wiringNotes: opening.wiringNotes || "",
        fieldIssues: opening.fieldIssues || "",
      });
    }
  }, [opening]);

  const updateOpening = useMutation({
    mutationFn: async (data: Partial<DoorOpening>): Promise<DoorOpening> => {
      const response = await apiRequest("PATCH", `/api/openings/${openingId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}`] });
      toast({
        title: "Opening updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update opening. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteOpening = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/openings/${openingId}`);
    },
    onSuccess: () => {
      if (opening?.projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${opening.projectId}/openings`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${opening.projectId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/openings"] });
      toast({
        title: "Opening deleted",
        description: "The door opening has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      if (opening?.projectId) {
        setLocation(`/projects/${opening.projectId}`);
      } else {
        setLocation("/projects");
      }
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete opening. Please try again.",
        variant: "destructive",
      });
    },
  });

  const duplicateOpening = useMutation({
    mutationFn: async (): Promise<DoorOpening> => {
      const response = await apiRequest("POST", `/api/openings/${openingId}/duplicate`);
      return await response.json();
    },
    onSuccess: (data: DoorOpening) => {
      toast({
        title: "Opening duplicated",
        description: "A copy of the opening has been created.",
      });
      if (opening?.projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${opening.projectId}/openings`] });
      }
      setLocation(`/openings/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Duplication failed",
        description: "Failed to duplicate opening. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveTechnicianNotes = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/openings/${openingId}`, technicianNotes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}`] });
      toast({
        title: "Installer notes saved",
        description: "Technician documentation has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Failed to save installer notes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadLidarScan = useMutation({
    mutationFn: async (): Promise<void> => {
      throw new Error("Not implemented in shell - use panel implementation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/lidar-scans`] });
      toast({
        title: "LiDAR scan uploaded",
        description: "Scan has been uploaded successfully. You can now process it.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload scan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const processLidarScan = useMutation({
    mutationFn: async (scanId: string) => {
      return await apiRequest("POST", `/api/lidar/scans/${scanId}/process`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/lidar-scans`] });
      toast({
        title: "Processing complete",
        description: "LiDAR scan has been processed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process scan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteLidarScan = useMutation({
    mutationFn: async (scanId: string) => {
      return await apiRequest("DELETE", `/api/lidar/scans/${scanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/lidar-scans`] });
      toast({
        title: "Scan deleted",
        description: "LiDAR scan has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete scan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const refetchAll = async () => {
    await Promise.all([
      openingQuery.refetch(),
      projectQuery.refetch(),
      photosQuery.refetch(),
      hardwareQuery.refetch(),
      bundlesQuery.refetch(),
      manufacturersQuery.refetch(),
      quoteRequestsQuery.refetch(),
      violationsQuery.refetch(),
      lidarScansQuery.refetch(),
      scanConfigQuery.refetch(),
    ]);
  };

  if (isError) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load opening details"
            message={error instanceof Error ? error.message : "Unable to fetch door opening details. Please check your connection and try again."}
            error={error as Error}
            onRetry={openingQuery.refetch}
            testId="error-opening-detail"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Loading opening...</p>
      </div>
    );
  }

  if (!opening) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Opening not found</p>
      </div>
    );
  }

  const contextValue = {
    opening,
    project,
    openingId: openingId!,
    openingQuery,
    projectQuery,
    photosQuery,
    hardwareQuery,
    bundlesQuery,
    manufacturersQuery,
    quoteRequestsQuery,
    lidarScansQuery,
    scanConfigQuery,
    updateOpening,
    deleteOpening,
    duplicateOpening,
    uploadLidarScan,
    processLidarScan,
    deleteLidarScan,
    refetchAll,
  };

  return (
    <OpeningDetailProvider value={contextValue}>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${opening.projectId}`}>
              <Button variant="ghost" size="icon" data-testid="button-back" aria-label="Go back to project">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground">
                Opening {opening.openingNumber}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {project?.name} - {opening.location}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => duplicateOpening.mutate()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') duplicateOpening.mutate(); }}
              data-testid="button-duplicate-opening"
              disabled={duplicateOpening.isPending}
            >
              {duplicateOpening.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDeleteDialogOpen(true); }}
              data-testid="button-delete-opening"
              disabled={deleteOpening.isPending}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          <Tabs defaultValue="specifications" className="w-full">
            <TabsList>
              <TabsTrigger value="specifications" data-testid="tab-specifications">
                <DoorOpen className="w-4 h-4 mr-1" />
                Specifications
              </TabsTrigger>
              <TabsTrigger value="photos" data-testid="tab-photos">
                <Camera className="w-4 h-4 mr-1" />
                Photos {photos.length > 0 && `(${photos.length})`}
              </TabsTrigger>
              <TabsTrigger value="hardware" data-testid="tab-hardware">
                <Wrench className="w-4 h-4 mr-1" />
                Hardware {hardwareItems.length > 0 && `(${hardwareItems.length})`}
              </TabsTrigger>
              <TabsTrigger value="lidar-scans" data-testid="tab-lidar">
                <Scan className="w-4 h-4 mr-1" />
                LiDAR Scans {lidarScans.length > 0 && `(${lidarScans.length})`}
              </TabsTrigger>
              <TabsTrigger value="guided-scan" data-testid="tab-guided-scan">
                <Activity className="w-4 h-4 mr-1" />
                Guided Scan
              </TabsTrigger>
              <TabsTrigger value="validation" data-testid="tab-validation">
                <Shield className="w-4 h-4 mr-1" />
                Validation
              </TabsTrigger>
              <TabsTrigger value="bom" data-testid="tab-bom">
                <Package className="w-4 h-4 mr-1" />
                BOM
              </TabsTrigger>
              <TabsTrigger value="technician-notes" data-testid="tab-installer-notes">
                <FileText className="w-4 h-4 mr-1" />
                Installer Notes
              </TabsTrigger>
              <TabsTrigger value="factory-order" data-testid="tab-factory-order">
                <ClipboardList className="w-4 h-4 mr-1" />
                Factory Order
              </TabsTrigger>
            </TabsList>

            <TabsContent value="specifications" className="space-y-6">
              {violations.length > 0 && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="destructive">{violations.length}</Badge>
                      Compliance Violations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {violations.map((violation) => (
                      <div key={violation.id} className="border-l-4 border-l-destructive pl-4 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-destructive">
                                {violation.rule.code}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {violation.rule.severity}
                              </Badge>
                            </div>
                            <div className="font-medium">{violation.rule.title}</div>
                            <p className="text-sm text-muted-foreground">
                              {violation.rule.description}
                            </p>
                            {violation.rule.notes && (
                              <p className="text-xs text-muted-foreground italic mt-2">
                                Note: {violation.rule.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-sm text-muted-foreground">
                      Review these violations and make necessary corrections. Visit the Compliance page to resolve or waive violations.
                    </div>
                  </CardContent>
                </Card>
              )}

              {(opening.doorWidth || opening.doorHeight || opening.sideliteLeft === "yes" || opening.sideliteRight === "yes" || opening.transomPresent === "yes" || opening.visionLitePresent === "yes") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SquareDashed className="h-5 w-5" />
                      Opening Diagram
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DoorDiagram opening={opening} />
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DoorClosed className="h-5 w-5" />
                    Door Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {opening.doorType && (
                    <div>
                      <div className="text-xs text-muted-foreground">Type</div>
                      <div className="text-sm capitalize">{opening.doorType}</div>
                    </div>
                  )}
                  {opening.doorMaterial && (
                    <div>
                      <div className="text-xs text-muted-foreground">Material</div>
                      <div className="text-sm capitalize">{opening.doorMaterial}</div>
                    </div>
                  )}
                  {opening.doorWidth && (
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        Width
                      </div>
                      <div className="text-sm font-mono">{opening.doorWidth}"</div>
                    </div>
                  )}
                  {opening.doorHeight && (
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        Height
                      </div>
                      <div className="text-sm font-mono">{opening.doorHeight}"</div>
                    </div>
                  )}
                  {opening.doorThickness && (
                    <div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        Thickness
                      </div>
                      <div className="text-sm font-mono">{opening.doorThickness}"</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {opening.doorFinishType && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Door Finish Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Finish Type</div>
                      <div className="text-sm capitalize font-medium">{opening.doorFinishType.replace(/-/g, ' ')}</div>
                    </div>
                    {opening.woodVeneerSpecies && (
                      <div>
                        <div className="text-xs text-muted-foreground">Veneer Species</div>
                        <div className="text-sm capitalize">{opening.woodVeneerSpecies.replace(/-/g, ' ')}</div>
                      </div>
                    )}
                    {opening.powderCoatColor && (
                      <div>
                        <div className="text-xs text-muted-foreground">Powder Coat Color</div>
                        <div className="text-sm">{opening.powderCoatColor}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {opening.frameType && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PanelTop className="h-5 w-5" />
                      Frame Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Frame Type</div>
                      <div className="text-sm capitalize">{opening.frameType.replace(/-/g, ' ')}</div>
                    </div>
                    {opening.frameMaterial && (
                      <div>
                        <div className="text-xs text-muted-foreground">Material</div>
                        <div className="text-sm capitalize">{opening.frameMaterial}</div>
                      </div>
                    )}
                    {opening.frameDepth && (
                      <div>
                        <div className="text-xs text-muted-foreground">Depth</div>
                        <div className="text-sm font-mono">{opening.frameDepth}"</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="photos" className="space-y-6">
              <LazyPanel component={PhotosPanel} />
            </TabsContent>

            <TabsContent value="hardware" className="space-y-6">
              <LazyPanel component={HardwarePanel} />
            </TabsContent>

            <TabsContent value="lidar-scans" className="space-y-6">
              <LazyPanel component={LidarPanel} />
            </TabsContent>

            <TabsContent value="guided-scan" className="space-y-6">
              <LazyPanel component={GuidedScanPanel} />
            </TabsContent>

            <TabsContent value="validation" className="space-y-6">
              <LazyPanel component={ValidationPanel} />
            </TabsContent>

            <TabsContent value="bom" className="space-y-6">
              <LazyPanel component={BomPanel} />
            </TabsContent>

            <TabsContent value="factory-order" className="space-y-6">
              <LazyPanel component={FactoryOrderPanel} />
            </TabsContent>

            <TabsContent value="technician-notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Installer Documentation
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    These notes will appear on a separate PDF page for the installer, including installation details, component diagrams, wiring information, and field insights.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="installation-narrative" className="text-sm font-medium">Installation Narrative</Label>
                    <p className="text-xs text-muted-foreground">
                      Describe what is being installed and the installation process
                    </p>
                    <Textarea
                      id="installation-narrative"
                      value={technicianNotes.installationNarrative}
                      onChange={(e) => setTechnicianNotes(prev => ({ ...prev, installationNarrative: e.target.value }))}
                      placeholder="e.g., Installing a new hollow metal door with electric strike and card reader access control..."
                      rows={4}
                      data-testid="input-installation-narrative"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="component-notes" className="text-sm font-medium">Component Details</Label>
                    <p className="text-xs text-muted-foreground">
                      List specific components, parts, and their locations
                    </p>
                    <Textarea
                      id="component-notes"
                      value={technicianNotes.componentNotes}
                      onChange={(e) => setTechnicianNotes(prev => ({ ...prev, componentNotes: e.target.value }))}
                      placeholder="e.g., Door closer: LCN 4040XP mounted on top rail, electric strike: HES 9500 series mortised in frame..."
                      rows={4}
                      data-testid="input-component-notes"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wiring-notes" className="text-sm font-medium">Wiring & Power Requirements</Label>
                    <p className="text-xs text-muted-foreground">
                      Document power sources, wire runs, and electrical connections
                    </p>
                    <Textarea
                      id="wiring-notes"
                      value={technicianNotes.wiringNotes}
                      onChange={(e) => setTechnicianNotes(prev => ({ ...prev, wiringNotes: e.target.value }))}
                      placeholder="e.g., 12V DC power supply in ceiling above door, 18/6 wire run to strike, request electrician for power drop..."
                      rows={4}
                      data-testid="input-wiring-notes"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="field-issues" className="text-sm font-medium">Field Issues & Resolutions</Label>
                    <p className="text-xs text-muted-foreground">
                      Note any obstacles, modifications, or special considerations encountered
                    </p>
                    <Textarea
                      id="field-issues"
                      value={technicianNotes.fieldIssues}
                      onChange={(e) => setTechnicianNotes(prev => ({ ...prev, fieldIssues: e.target.value }))}
                      placeholder="e.g., Wall not plumb - shimmed frame 1/4 inch, low ceiling required surface mount closer..."
                      rows={4}
                      data-testid="input-field-issues"
                    />
                  </div>

                  <Button
                    onClick={() => saveTechnicianNotes.mutate()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') saveTechnicianNotes.mutate(); }}
                    disabled={saveTechnicianNotes.isPending}
                    className="w-full"
                    data-testid="button-save-installer-notes"
                  >
                    {saveTechnicianNotes.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Installer Notes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>What is Being Installed vs. Reused</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Door</div>
                    <Badge variant={opening.reuseDoor === "yes" ? "secondary" : "default"}>
                      {opening.reuseDoor === "yes" ? "Reusing Existing" : "Installing New"}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Frame</div>
                    <Badge variant={opening.reuseFrame === "yes" ? "secondary" : "default"}>
                      {opening.reuseFrame === "yes" ? "Reusing Existing" : "Installing New"}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Hardware</div>
                    <Badge variant={opening.reuseHardware === "yes" ? "secondary" : "default"}>
                      {opening.reuseHardware === "yes" ? "Reusing Existing" : "Installing New"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Opening</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this opening? This action cannot be undone.
                All associated photos, hardware, and scans will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteOpening.mutate()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') deleteOpening.mutate(); }}
                disabled={deleteOpening.isPending}
                className="bg-destructive"
                data-testid="button-confirm-delete"
              >
                {deleteOpening.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Opening"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </OpeningDetailProvider>
  );
}
