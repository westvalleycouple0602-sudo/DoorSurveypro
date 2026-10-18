import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AutosaveIndicator } from "@/components/autosave-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, FileText, Scan, Ruler, Loader2 } from "lucide-react";
import { insertDoorOpeningSchema, type InsertDoorOpening, type DoorTemplate } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { ARMeasurementDialog } from "@/components/ar-measurement";
import { calculateDoorWeight, calculateGlassSizes, type GlassSizeResult } from "@shared/calculators";
import { DoorFrameOptionsSelector } from "@/components/door-frame-options-selector";
import { DoorFrameValidationMessages } from "@/components/door-frame-validation-messages";
import { MeasurementCalculator } from "@/components/measurement-calculator";
import { DimensionInput } from "@/components/dimension-input";
import { DoorTypeSelector } from "@/components/door-type-selector";
import { DoorConditionSelector } from "@/components/door-condition-selector";
import { COMMON_DOOR_WIDTHS, COMMON_DOOR_HEIGHTS, COMMON_DOOR_THICKNESS, COMMON_FRAME_WIDTHS } from "@shared/measurement-utils";

export default function NewOpening() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [arDialogOpen, setArDialogOpen] = useState(false);
  const [glassCalculations, setGlassCalculations] = useState<GlassSizeResult | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);
  const draftKey = `new-opening-draft-${projectId}`;

  const { data: templates = [], isLoading: templatesLoading, isError: templatesError, error: templatesErrorObj, refetch: refetchTemplates } = useQuery<DoorTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm<InsertDoorOpening>({
    resolver: zodResolver(insertDoorOpeningSchema),
    defaultValues: {
      projectId: projectId || "",
      openingNumber: "",
      location: "",
      doorType: "",
      doorMaterial: "",
      doorWidth: "",
      doorHeight: "",
      doorThickness: "",
      doorCoreType: "",
      doorPressureRating: "",
      doorStcRating: "",
      doorLeadLined: "no",
      integratedHardware: "no",
      impactDoor: "no",
      barnDoorSliding: "no",
      frameType: "",
      frameMaterial: "",
      frameWidth: "",
      frameDepth: "",
      lockType: "",
      hingeType: "",
      hingeCount: "",
      closerType: "",
      exitDevice: "",
      doorFireRating: "",
      frameFireRating: "",
      hardwareFireRated: "no",
      fireRatingNotes: "",
      racewaysRequired: "no",
      racewaysPresent: "no",
      racewaysNotes: "",
      automationRequired: "no",
      automationType: "",
      powerRequirements: [],
      powerAvailable: "no",
      electrifiedHardware: "no",
      accessControlRequired: "no",
      accessControlType: "",
      reuseDoor: "no",
      reuseFrame: "no",
      reuseHardware: "no",
      sideliteLeft: "no",
      sideliteLeftWidth: "",
      sideliteRight: "no",
      sideliteRightWidth: "",
      sideliteGlassType: "",
      transomPresent: "no",
      transomHeight: "",
      transomWidth: "",
      transomGlassType: "",
      doorElevation: "",
      liteKitType: "",
      liteKitId: undefined,
      doorFinishType: "",
      woodVeneerSpecies: "",
      woodVeneerCut: "",
      woodStainColor: "",
      woodStainManufacturer: "",
      woodFinishSheen: "",
      wdmaPerformanceDutyLevel: "",
      wdmaVeneerGrade: "",
      wdmaVeneerPieceMatch: "",
      wdmaVeneerFaceMatch: "",
      wdmaAppearancePairsSetsTran: "",
      wdmaCoreType: "",
      wdmaHardwareBlocking: "",
      wdmaHardwareBlockingSpec: "",
      wdmaCoreEdgeInterface: "",
      wdmaFireDoorTestMethod: "",
      wdmaBulletResistant: "no",
      wdmaElectrostaticShield: "no",
      wdmaHpdlManufacturer: "",
      wdmaHpdlThickness: "",
      wdmaHpdlPatternColorFinish: "",
      wdmaLpdlManufacturer: "",
      wdmaLpdlPatternColor: "",
      wdmaAestheticGrade: "",
      wdmaFactoryMachinedHardware: "no",
      wdmaWoodBeadedLites: "no",
      wdmaMetalVisionPanels: "no",
      wdmaFinishSystem: "",
      wdmaFinishSystemOther: "",
      wdmaFinishApplication: "",
      hpdlLaminatePattern: "",
      hpdlLaminateColor: "",
      hpdlLaminateManufacturer: "",
      hpdlLaminateGrade: "",
      metalFinishType: "",
      metalPrimerType: "",
      anodizedFinish: "",
      powderCoatColor: "",
      powderCoatManufacturer: "",
      powderCoatFinish: "",
      visionLitePresent: "no",
      visionLiteWidth: "",
      visionLiteHeight: "",
      visionLiteLocation: "",
      visionLiteGlassType: "",
      visionLiteThickness: "",
      visionLiteFireRating: "",
      visionLiteStcRating: "",
      visionLiteVandalResistant: "no",
      visionLiteFireResistant: "no",
      visionLiteCutoutWidth: "",
      visionLiteCutoutHeight: "",
      visionLiteCalculatedGlassWidth: "",
      visionLiteCalculatedGlassHeight: "",
      sideliteThickness: "",
      sideliteFireRating: "",
      sideliteStcRating: "",
      sideliteVandalResistant: "no",
      sideliteFireResistant: "no",
      sideliteSpandrelGlazing: "no",
      sideliteSolidPanel: "no",
      sideliteLeftCalculatedHeight: "",
      sideliteRightCalculatedHeight: "",
      transomThickness: "",
      transomFireRating: "",
      transomStcRating: "",
      transomVandalResistant: "no",
      transomFireResistant: "no",
      transomSpandrelGlazing: "no",
      transomSolidPanel: "no",
      transomCalculatedGlassWidth: "",
      glassManufacturer: "",
      glassNotes: "",
      glazingInstallationType: "",
      glazingMethod: "",
      butylTapeRequired: "no",
      butylTapeType: "",
      glazingTapeSealant: "",
      glazingGaskets: "",
      glazingStops: "",
      glazingBeads: "",
      settingBlocks: "",
      glazingNotes: "",
      notes: "",
      doorCondition: undefined,
      frameCondition: undefined,
      hardwareCondition: undefined,
      conditionIssues: [],
      conditionNotes: "",
      conditionAssessmentDate: undefined,
      replacementRecommendation: "",
      replacementJustification: "",
    },
  });

  // On mount, check for a saved draft and offer to restore it
  useEffect(() => {
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsed = JSON.parse(draft);
        toast({
          title: "Draft found",
          description: "You have an unsaved draft for this opening.",
          action: (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                form.reset({ ...form.getValues(), ...parsed });
                toast({ title: "Draft restored", description: "Your previous draft has been restored." });
              }}
              data-testid="button-restore-draft"
            >
              Restore
            </Button>
          ) as any,
        });
      }
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft to localStorage whenever form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(values));
      } catch {
        // ignore storage errors
      }
    });
    return () => subscription.unsubscribe();
  }, [form, draftKey]);

  const applyTemplate = useCallback((template: DoorTemplate) => {
    form.setValue("doorType", template.doorType || "");
    form.setValue("doorMaterial", template.doorMaterial || "");
    form.setValue("doorWidth", template.doorWidth || "");
    form.setValue("doorHeight", template.doorHeight || "");
    form.setValue("doorThickness", template.doorThickness || "");
    form.setValue("frameType", template.frameType || "");
    form.setValue("frameMaterial", template.frameMaterial || "");
    form.setValue("frameWidth", template.frameWidth || "");
    form.setValue("frameDepth", template.frameDepth || "");
    form.setValue("lockType", template.lockType || "");
    form.setValue("hingeType", template.hingeType || "");
    form.setValue("hingeCount", template.hingeCount || "");
    form.setValue("closerType", template.closerType || "");
    form.setValue("exitDevice", template.exitDevice || "");
    form.setValue("automationRequired", template.automationRequired || "no");
    form.setValue("automationType", template.automationType || "");
    form.setValue("accessControlRequired", template.accessControlRequired || "no");
    form.setValue("accessControlType", template.accessControlType || "");
    form.setValue("sideliteLeft", template.sideliteLeft || "no");
    form.setValue("sideliteLeftWidth", template.sideliteLeftWidth || "");
    form.setValue("sideliteRight", template.sideliteRight || "no");
    form.setValue("sideliteRightWidth", template.sideliteRightWidth || "");
    form.setValue("sideliteGlassType", template.sideliteGlassType || "");
    form.setValue("transomPresent", template.transomPresent || "no");
    form.setValue("transomHeight", template.transomHeight || "");
    form.setValue("transomWidth", template.transomWidth || "");
    form.setValue("transomGlassType", template.transomGlassType || "");
    form.setValue("visionLitePresent", template.visionLitePresent || "no");
    form.setValue("visionLiteWidth", template.visionLiteWidth || "");
    form.setValue("visionLiteHeight", template.visionLiteHeight || "");
    form.setValue("visionLiteLocation", template.visionLiteLocation || "");
    form.setValue("visionLiteGlassType", template.visionLiteGlassType || "");
    
    toast({
      title: "Template applied",
      description: `${template.name} configuration loaded.`,
    });
    
    // Scroll to form section after template is applied
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [form, toast]);

  const handleARMeasurement = useCallback((measurements: {
    width?: number;
    height?: number;
    depth?: number;
  }) => {
    if (measurements.width) {
      form.setValue("doorWidth", measurements.width.toString());
    }
    if (measurements.height) {
      form.setValue("doorHeight", measurements.height.toString());
    }
    if (measurements.depth) {
      form.setValue("doorThickness", measurements.depth.toString());
    }
    
    toast({
      title: "AR measurements applied",
      description: "Door dimensions have been captured from AR measurement.",
    });
  }, [form, toast]);

  // Calculate glass sizes when relevant fields change
  useEffect(() => {
    const subscription = form.watch((values) => {
      const glassSizes = calculateGlassSizes({
        visionLiteWidth: values.visionLiteWidth,
        visionLiteHeight: values.visionLiteHeight,
        visionLiteCutoutWidth: values.visionLiteCutoutWidth,
        visionLiteCutoutHeight: values.visionLiteCutoutHeight,
        sideliteLeftWidth: values.sideliteLeftWidth,
        sideliteRightWidth: values.sideliteRightWidth,
        doorHeight: values.doorHeight,
        transomWidth: values.transomWidth,
        transomHeight: values.transomHeight,
      });
      setGlassCalculations(glassSizes);
      
      // Auto-fill calculated glass sizes (using setValue with shouldValidate/shouldDirty false to prevent loops)
      if (glassSizes.visionLite) {
        const calcWidth = glassSizes.visionLite.glassWidth.toString();
        const calcHeight = glassSizes.visionLite.glassHeight.toString();
        if (values.visionLiteCalculatedGlassWidth !== calcWidth) {
          form.setValue("visionLiteCalculatedGlassWidth", calcWidth, { shouldValidate: false, shouldDirty: false });
        }
        if (values.visionLiteCalculatedGlassHeight !== calcHeight) {
          form.setValue("visionLiteCalculatedGlassHeight", calcHeight, { shouldValidate: false, shouldDirty: false });
        }
      }
      if (glassSizes.sideliteLeft) {
        const calcHeight = glassSizes.sideliteLeft.glassHeight.toString();
        if (values.sideliteLeftCalculatedHeight !== calcHeight) {
          form.setValue("sideliteLeftCalculatedHeight", calcHeight, { shouldValidate: false, shouldDirty: false });
        }
      }
      if (glassSizes.sideliteRight) {
        const calcHeight = glassSizes.sideliteRight.glassHeight.toString();
        if (values.sideliteRightCalculatedHeight !== calcHeight) {
          form.setValue("sideliteRightCalculatedHeight", calcHeight, { shouldValidate: false, shouldDirty: false });
        }
      }
      if (glassSizes.transom) {
        const calcWidth = glassSizes.transom.glassWidth.toString();
        if (values.transomCalculatedGlassWidth !== calcWidth) {
          form.setValue("transomCalculatedGlassWidth", calcWidth, { shouldValidate: false, shouldDirty: false });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const createOpening = useMutation({
    mutationFn: async (data: InsertDoorOpening) => {
      const res = await apiRequest("POST", "/api/openings", data);
      return await res.json();
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: () => {
      setSaveStatus("saved");
      setLastSaved(new Date());
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/openings`] });
      queryClient.invalidateQueries({ queryKey: ["/api/openings"] });
      toast({
        title: "Success",
        description: "Door opening created successfully. You can now add hardware specifications and photos.",
      });
      setLocation(`/projects/${projectId}`);
    },
    onError: (error: Error) => {
      setSaveStatus("error");
      toast({
        title: "Failed to create door opening",
        description: error.message || "Unable to save door opening. Please verify all required measurements and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = useCallback((data: InsertDoorOpening) => {
    createOpening.mutate(data);
  }, [createOpening]);

  const watchedDoorWidth = form.watch("doorWidth");
  const watchedDoorHeight = form.watch("doorHeight");
  const watchedDoorThickness = form.watch("doorThickness");
  const watchedDoorMaterial = form.watch("doorMaterial");
  const watchedDoorType = form.watch("doorType");
  const watchedDoorLeadLined = form.watch("doorLeadLined");
  const watchedImpactDoor = form.watch("impactDoor");
  const watchedDoorCoreType = form.watch("doorCoreType");
  const watchedFrameWidth = form.watch("frameWidth");
  const watchedFrameDepth = form.watch("frameDepth");
  const watchedFrameMaterial = form.watch("frameMaterial");

  const doorWeight = useMemo(() => calculateDoorWeight({
    doorWidth: watchedDoorWidth,
    doorHeight: watchedDoorHeight,
    doorThickness: watchedDoorThickness,
    doorMaterial: watchedDoorMaterial,
    doorType: watchedDoorType,
    doorLeadLined: watchedDoorLeadLined,
    impactDoor: watchedImpactDoor,
    doorCoreType: watchedDoorCoreType,
  }), [watchedDoorWidth, watchedDoorHeight, watchedDoorThickness, watchedDoorMaterial, watchedDoorType, watchedDoorLeadLined, watchedImpactDoor, watchedDoorCoreType]);

  const handleNavigateBack = useCallback(() => {
    setLocation(`/projects/${projectId}`);
  }, [setLocation, projectId]);

  const handleNavigateCancel = useCallback(() => {
    setLocation(`/projects/${projectId}`);
  }, [setLocation, projectId]);

  const handleOpenARDialog = useCallback(() => {
    setArDialogOpen(true);
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
        <div className="grid lg:grid-cols-[1fr,320px] gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNavigateBack}
                aria-label="Go back"
                data-testid="button-back"
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-semibold text-foreground">New Door Opening</h1>
                  <AutosaveIndicator status={saveStatus} lastSaved={lastSaved} />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Add measurements and specifications for a door opening
                </p>
              </div>
            </div>

            {templatesError ? (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span>Quick Start with Templates</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Templates temporarily unavailable - you can create your opening using the form below
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <ErrorState
                    title="Template list unavailable"
                    message={templatesErrorObj instanceof Error ? templatesErrorObj.message : "Unable to load door templates. You can still create this opening manually - all the same fields are available in the form below."}
                    error={templatesErrorObj as Error}
                    onRetry={refetchTemplates}
                    testId="error-templates"
                  />
                </CardContent>
              </Card>
            ) : templatesLoading ? (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span>Quick Start with Templates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Loading templates...</span>
                  </div>
                </CardContent>
              </Card>
            ) : templates.length > 0 && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span>Quick Start with Templates</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Apply a pre-configured template to speed up data entry
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto flex-col items-start p-3 sm:p-4 hover-elevate active-elevate-2"
                    onClick={() => applyTemplate(template)}
                    data-testid={`button-template-${template.id}`}
                  >
                    <div className="font-medium text-xs sm:text-sm">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-muted-foreground mt-1 text-left">
                        {template.description}
                      </div>
                    )}
                    <div className="flex gap-1 sm:gap-2 mt-2 flex-wrap">
                      {template.doorType && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {template.doorType}
                        </Badge>
                      )}
                      {template.doorWidth && template.doorHeight && (
                        <Badge variant="secondary" className="text-xs font-mono shrink-0">
                          {template.doorWidth}" × {template.doorHeight}"
                        </Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
            )}

            <div ref={formRef}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                  <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="openingNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 101" data-testid="input-opening-number" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location/Room</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Entrance, Room 204" data-testid="input-location" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="frame" className="w-full">
              <TabsList className="inline-flex h-auto w-full overflow-x-auto overflow-y-hidden flex-nowrap justify-start gap-1 p-1">
                <TabsTrigger value="frame" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Frame</TabsTrigger>
                <TabsTrigger value="door" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Door</TabsTrigger>
                <TabsTrigger value="hardware" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Hardware</TabsTrigger>
                <TabsTrigger value="gasketing" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Gasketing</TabsTrigger>
                <TabsTrigger value="fire" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Fire & Safety</TabsTrigger>
                <TabsTrigger value="glass" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Glass</TabsTrigger>
                <TabsTrigger value="automation" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Automation</TabsTrigger>
                <TabsTrigger value="reuse" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-reuse">Reuse</TabsTrigger>
              </TabsList>

              <TabsContent value="frame" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Frame Specifications</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="frameType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frame Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frame-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="hollow_metal">Hollow Metal</SelectItem>
                                <SelectItem value="wood">Wood</SelectItem>
                                <SelectItem value="aluminum">Aluminum</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="frameMaterial"
                        render={({ field }) => (
                          <DoorFrameOptionsSelector
                            appliesTo="frame"
                            market="commercial"
                            attributeGroup="Material"
                            attributeName="Frame Material"
                            value={field.value || ""}
                            onChange={field.onChange}
                            label="Material"
                            description="Hollow metal, stainless, or wood jamb options"
                            testId="input-frame-material"
                          />
                        )}
                      />
                    </div>

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="frameWidth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width (inches)</FormLabel>
                            <FormControl>
                              <DimensionInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="4.5"
                                testId="input-frame-width"
                                showCommonSizes={true}
                                commonSizes={COMMON_FRAME_WIDTHS}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="frameDepth"
                        render={({ field }) => (
                          <DoorFrameOptionsSelector
                            appliesTo="frame"
                            market="commercial"
                            attributeGroup="Dimension"
                            attributeName="Throat (Wall) Depth"
                            value={field.value || ""}
                            onChange={field.onChange}
                            label="Depth (Throat)"
                            description="Frame depth for wall thickness"
                            testId="input-frame-depth"
                          />
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <DoorFrameValidationMessages
                  formValues={form.watch()}
                  appliesTo="frame"
                />

                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Frame Condition Assessment</CardTitle>
                    <CardDescription>Field survey assessment per standard door frame inspection guidelines</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                    <p className="text-sm font-medium text-muted-foreground">Field Assessment</p>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="frameLevelCheck"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Level Check</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frame-level-check">
                                  <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pass">Pass</SelectItem>
                                <SelectItem value="fail">Fail</SelectItem>
                                <SelectItem value="marginal">Marginal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Header and floor level</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="framePlumbCheck"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plumb Check</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frame-plumb-check">
                                  <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pass">Pass</SelectItem>
                                <SelectItem value="fail">Fail</SelectItem>
                                <SelectItem value="marginal">Marginal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Each jamb plumb assessment</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="frameSquareCheck"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Square Check</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frame-square-check">
                                  <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pass">Pass</SelectItem>
                                <SelectItem value="fail">Fail</SelectItem>
                                <SelectItem value="marginal">Marginal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Diagonal measurement check</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="frameStraightnessCheck"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Straightness</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frame-straightness-check">
                                  <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pass">Pass</SelectItem>
                                <SelectItem value="fail">Fail</SelectItem>
                                <SelectItem value="marginal">Marginal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Header and jamb straightness</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="frameTwistObserved"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Twist Observed</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frame-twist-observed">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="doorSwingCheck"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Door Swing</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-door-swing-check">
                                  <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pass">Pass</SelectItem>
                                <SelectItem value="fail">Fail</SelectItem>
                                <SelectItem value="marginal">Marginal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Verify door swings correctly</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="doorDriftObserved"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Drift Observed</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-door-drift-observed">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Door drifts open or closed</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="my-4" />

                    <p className="text-sm font-medium text-muted-foreground">Reveal Measurements</p>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="revealLeft"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Left Reveal</FormLabel>
                            <FormControl>
                              <Input placeholder='e.g., 3/16"' data-testid="input-reveal-left" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="revealRight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Right Reveal</FormLabel>
                            <FormControl>
                              <Input placeholder='e.g., 3/16"' data-testid="input-reveal-right" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="revealTop"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Top Reveal</FormLabel>
                            <FormControl>
                              <Input placeholder='e.g., 1/8"' data-testid="input-reveal-top" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="undercutGap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Undercut Gap</FormLabel>
                            <FormControl>
                              <Input placeholder='e.g., 3/4"' data-testid="input-undercut-gap" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="revealUniformity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reveal Uniformity</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-reveal-uniformity">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="uniform">Uniform</SelectItem>
                                <SelectItem value="non_uniform">Non-Uniform</SelectItem>
                                <SelectItem value="not_checked">Not Checked</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="revealNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reveal Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes about reveal measurements" data-testid="textarea-reveal-notes" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="door" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base sm:text-lg">Door Specifications</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setArDialogOpen(true)}
                        data-testid="button-ar-measure"
                        className="text-xs sm:text-sm shrink-0"
                      >
                        <Scan className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                        AR Measure
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                    <FormField
                      control={form.control}
                      name="doorType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Door Type</FormLabel>
                          <FormControl>
                            <DoorTypeSelector
                              value={field.value || ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="doorMaterial"
                        render={({ field }) => (
                          <DoorFrameOptionsSelector
                            appliesTo="door"
                            market="commercial"
                            attributeGroup="Material"
                            attributeName="Door Material"
                            value={field.value || ""}
                            onChange={field.onChange}
                            label="Material"
                            testId="select-door-material"
                          />
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="doorElevation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Door Elevation</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === "flush") {
                                  form.setValue("liteKitType", "");
                                  form.setValue("liteKitId", undefined);
                                }
                              }} 
                              defaultValue={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-door-elevation">
                                  <SelectValue placeholder="Select elevation" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="flush">Flush (No Glass)</SelectItem>
                                <SelectItem value="narrow_lite">Narrow Lite</SelectItem>
                                <SelectItem value="half_glass">Half Glass</SelectItem>
                                <SelectItem value="full_glass">Full Glass</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Glass configuration in the door
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {form.watch("doorElevation") && form.watch("doorElevation") !== "flush" && (
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 p-4 border rounded-lg bg-muted/30">
                        <div className="sm:col-span-2">
                          <p className="text-sm font-medium mb-2">Vision Lite Kit Options</p>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="liteKitType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kit Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-lite-kit-type">
                                    <SelectValue placeholder="Select kit type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="integral">Integral Frame</SelectItem>
                                  <SelectItem value="applied">Applied Frame</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Integral: Built into door. Applied: Surface-mounted
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="sm:col-span-2 text-sm text-muted-foreground">
                          <p>After saving, you can select a specific lite kit from the catalog on the opening detail page.</p>
                        </div>
                      </div>
                    )}
                    
                    {form.watch("doorMaterial") && (
                      <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Door Finish Specifications</p>
                          <p className="text-xs text-muted-foreground">Select finish type and specifications for ordering</p>
                        </div>
                        
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="doorFinishType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Finish Type</FormLabel>
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    // Clear finish-specific fields when type changes
                                    if (!value.includes("stain") && !value.includes("natural")) {
                                      form.setValue("woodVeneerSpecies", "");
                                      form.setValue("woodVeneerCut", "");
                                      form.setValue("woodStainColor", "");
                                      form.setValue("woodStainManufacturer", "");
                                      form.setValue("woodFinishSheen", "");
                                    }
                                    if (value !== "HPDL-laminate") {
                                      form.setValue("hpdlLaminatePattern", "");
                                      form.setValue("hpdlLaminateColor", "");
                                      form.setValue("hpdlLaminateManufacturer", "");
                                      form.setValue("hpdlLaminateGrade", "");
                                    }
                                    if (value !== "powder-coat") {
                                      form.setValue("powderCoatColor", "");
                                      form.setValue("powderCoatManufacturer", "");
                                      form.setValue("powderCoatFinish", "");
                                    }
                                  }} 
                                  defaultValue={field.value || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-door-finish-type">
                                      <SelectValue placeholder="Select finish type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {form.watch("doorMaterial") === "wood" && (
                                      <>
                                        <SelectItem value="natural-clear">Natural/Clear Finish</SelectItem>
                                        <SelectItem value="stained">Stained</SelectItem>
                                        <SelectItem value="painted">Painted</SelectItem>
                                        <SelectItem value="HPDL-laminate">HPDL Laminate</SelectItem>
                                      </>
                                    )}
                                    {(form.watch("doorMaterial") === "metal" || form.watch("doorMaterial") === "composite") && (
                                      <>
                                        <SelectItem value="factory-prime">Factory Prime</SelectItem>
                                        <SelectItem value="powder-coat">Powder Coat</SelectItem>
                                      </>
                                    )}
                                    {form.watch("doorMaterial") === "aluminum" && (
                                      <>
                                        <SelectItem value="anodized">Anodized</SelectItem>
                                        <SelectItem value="powder-coat">Powder Coat</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Wood Finish Options */}
                        {form.watch("doorMaterial") === "wood" && (form.watch("doorFinishType") === "natural-clear" || form.watch("doorFinishType") === "stained") && (
                          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <div className="sm:col-span-2">
                              <p className="text-xs font-medium text-muted-foreground">Wood Veneer Specifications</p>
                            </div>
                            
                            <FormField
                              control={form.control}
                              name="woodVeneerSpecies"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Veneer Species</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-wood-veneer-species">
                                        <SelectValue placeholder="Select species" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="red-oak">Red Oak</SelectItem>
                                      <SelectItem value="white-oak">White Oak</SelectItem>
                                      <SelectItem value="maple">Maple</SelectItem>
                                      <SelectItem value="cherry">Cherry</SelectItem>
                                      <SelectItem value="walnut">Walnut</SelectItem>
                                      <SelectItem value="birch">Birch</SelectItem>
                                      <SelectItem value="ash">Ash</SelectItem>
                                      <SelectItem value="mahogany">Mahogany</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="woodVeneerCut"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Veneer Cut</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-wood-veneer-cut">
                                        <SelectValue placeholder="Select cut" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="plain-sliced">Plain Sliced</SelectItem>
                                      <SelectItem value="quarter-sliced">Quarter Sliced</SelectItem>
                                      <SelectItem value="rift-cut">Rift Cut</SelectItem>
                                      <SelectItem value="rotary">Rotary</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {form.watch("doorFinishType") === "stained" && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="woodStainColor"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Stain Color</FormLabel>
                                      <FormControl>
                                        <Input type="text" placeholder="e.g., Medium Oak, Dark Walnut" data-testid="input-wood-stain-color" {...field} value={field.value || ""} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="woodStainManufacturer"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Stain Manufacturer</FormLabel>
                                      <FormControl>
                                        <Input type="text" placeholder="e.g., Minwax, Varathane" data-testid="input-wood-stain-manufacturer" {...field} value={field.value || ""} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                            
                            <FormField
                              control={form.control}
                              name="woodFinishSheen"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Finish Sheen</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-wood-finish-sheen">
                                        <SelectValue placeholder="Select sheen" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="matte">Matte</SelectItem>
                                      <SelectItem value="satin">Satin</SelectItem>
                                      <SelectItem value="semi-gloss">Semi-Gloss</SelectItem>
                                      <SelectItem value="gloss">Gloss</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        {/* WDMA Wood Door Specifications (I.S. 1A-2004) */}
                        {form.watch("doorMaterial") === "wood" && (
                          <Card className="border-primary/20">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">WDMA Wood Door Specifications</CardTitle>
                              <CardDescription className="text-xs">
                                Professional-grade specifications per WDMA I.S. 1A-2004 Guide for Architectural/Commercial Flush Wood Doors
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              
                              {/* Performance & Veneer Requirements */}
                              <div className="space-y-4">
                                <div className="text-sm font-medium text-muted-foreground">Performance & Veneer Face Requirements</div>
                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                                  <FormField
                                    control={form.control}
                                    name="wdmaPerformanceDutyLevel"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Performance Duty Level</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-performance-duty-level">
                                              <SelectValue placeholder="Select level" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="extra-heavy-duty">Extra Heavy Duty</SelectItem>
                                            <SelectItem value="heavy-duty">Heavy Duty</SelectItem>
                                            <SelectItem value="standard-duty">Standard Duty</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaVeneerGrade"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Veneer Grade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-veneer-grade">
                                              <SelectValue placeholder="Select grade" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="AA">AA (Premium)</SelectItem>
                                            <SelectItem value="A">A (Custom)</SelectItem>
                                            <SelectItem value="B">B (Standard)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaAestheticGrade"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Aesthetic Grade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-aesthetic-grade">
                                              <SelectValue placeholder="Select grade" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="premium">Premium</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                                  <FormField
                                    control={form.control}
                                    name="wdmaVeneerPieceMatch"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Veneer Piece Match</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-veneer-piece-match">
                                              <SelectValue placeholder="Select match" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="book">Book Match</SelectItem>
                                            <SelectItem value="slip">Slip Match</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaVeneerFaceMatch"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Veneer Face Match</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-veneer-face-match">
                                              <SelectValue placeholder="Select match" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="running">Running Match</SelectItem>
                                            <SelectItem value="balance">Balance Match</SelectItem>
                                            <SelectItem value="center">Center Match</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaAppearancePairsSetsTran"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Pairs/Sets/Transoms</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-appearance-pairs">
                                              <SelectValue placeholder="Select appearance" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="matched">Matched</SelectItem>
                                            <SelectItem value="not-matched">Not Matched</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormDescription className="text-xs">
                                          Visual matching for multiple doors
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              
                              {/* Core Type & Construction */}
                              <div className="space-y-4">
                                <div className="text-sm font-medium text-muted-foreground">Core Construction</div>
                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                                  <FormField
                                    control={form.control}
                                    name="wdmaCoreType"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>WDMA Core Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-core-type">
                                              <SelectValue placeholder="Select core" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="PC">PC - Particleboard</SelectItem>
                                            <SelectItem value="SLC">SLC - Stave Lumber Core</SelectItem>
                                            <SelectItem value="SCLC">SCLC - Structural Composite Lumber</SelectItem>
                                            <SelectItem value="FD">FD - Fire Resistant Composite</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaCoreEdgeInterface"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Core/Edge Interface</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-core-edge-interface">
                                              <SelectValue placeholder="Select interface" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="bonded">Bonded</SelectItem>
                                            <SelectItem value="non-bonded">Non-Bonded</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaHardwareBlocking"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Hardware Blocking</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-hardware-blocking">
                                              <SelectValue placeholder="Select blocking" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="high-density-blocking">High Density Blocking</SelectItem>
                                            <SelectItem value="hardware-reinforcement-blocking">Hardware Reinforcement</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                {form.watch("wdmaHardwareBlocking") && form.watch("wdmaHardwareBlocking") !== "none" && (
                                  <FormField
                                    control={form.control}
                                    name="wdmaHardwareBlockingSpec"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Blocking Specifications</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="text" 
                                            placeholder="e.g., Refer to sections C-10 to C-14" 
                                            data-testid="input-wdma-hardware-blocking-spec" 
                                            {...field} 
                                            value={field.value || ""} 
                                          />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                          Reference to blocking requirements or specifications
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>
                              
                              {/* Fire & Special Function Doors */}
                              {form.watch("doorFireRating") && form.watch("doorFireRating") !== "none" && (
                                <div className="space-y-4">
                                  <div className="text-sm font-medium text-muted-foreground">Fire Door Requirements</div>
                                  <FormField
                                    control={form.control}
                                    name="wdmaFireDoorTestMethod"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Fire Door Test Method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-fire-door-test-method">
                                              <SelectValue placeholder="Select test method" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="UBC-7-2-1994-neutral">UBC 7-2-1994 (Neutral Pressure)</SelectItem>
                                            <SelectItem value="UBC-7-2-1997-positive">UBC 7-2-1997 (Positive Pressure)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              )}
                              
                              <div className="space-y-4">
                                <div className="text-sm font-medium text-muted-foreground">Special Function Doors</div>
                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name="wdmaBulletResistant"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                                        <div className="space-y-0.5">
                                          <FormLabel>Bullet Resistant</FormLabel>
                                          <FormDescription className="text-xs">
                                            Ballistic protection rating required
                                          </FormDescription>
                                        </div>
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value === "yes"}
                                            onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                            data-testid="checkbox-wdma-bullet-resistant"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaElectrostaticShield"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                                        <div className="space-y-0.5">
                                          <FormLabel>Electrostatic Shield</FormLabel>
                                          <FormDescription className="text-xs">
                                            EMI/RFI shielding protection
                                          </FormDescription>
                                        </div>
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value === "yes"}
                                            onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                            data-testid="checkbox-wdma-electrostatic-shield"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              
                              {/* Machining & Detail Requirements */}
                              <div className="space-y-4">
                                <div className="text-sm font-medium text-muted-foreground">Machining & Detail Requirements</div>
                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                                  <FormField
                                    control={form.control}
                                    name="wdmaFactoryMachinedHardware"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                                        <div className="space-y-0.5">
                                          <FormLabel>Factory Machined</FormLabel>
                                          <FormDescription className="text-xs">
                                            Machined for hardware
                                          </FormDescription>
                                        </div>
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value === "yes"}
                                            onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                            data-testid="checkbox-wdma-factory-machined"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaWoodBeadedLites"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                                        <div className="space-y-0.5">
                                          <FormLabel>Wood Beaded Lites</FormLabel>
                                          <FormDescription className="text-xs">
                                            Traditional wood molding
                                          </FormDescription>
                                        </div>
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value === "yes"}
                                            onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                            data-testid="checkbox-wdma-wood-beaded-lites"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="wdmaMetalVisionPanels"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                                        <div className="space-y-0.5">
                                          <FormLabel>Metal Vision Panels</FormLabel>
                                          <FormDescription className="text-xs">
                                            Metal framed lite kits
                                          </FormDescription>
                                        </div>
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value === "yes"}
                                            onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                            data-testid="checkbox-wdma-metal-vision-panels"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              
                              {/* Finish System Requirements */}
                              <div className="space-y-4">
                                <div className="text-sm font-medium text-muted-foreground">Finish System Requirements</div>
                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name="wdmaFinishSystem"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Finish System</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-wdma-finish-system">
                                              <SelectValue placeholder="Select system" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="TR-6/OP-6">TR-6/OP-6 (Standard)</SelectItem>
                                            <SelectItem value="other">Other (Specify)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormDescription className="text-xs">
                                          Standard finish system specification
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  {form.watch("wdmaFinishSystem") === "other" && (
                                    <FormField
                                      control={form.control}
                                      name="wdmaFinishSystemOther"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Specify Finish System</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="text" 
                                              placeholder="Enter finish system specification" 
                                              data-testid="input-wdma-finish-system-other" 
                                              {...field} 
                                              value={field.value || ""} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                </div>
                                
                                <FormField
                                  control={form.control}
                                  name="wdmaFinishApplication"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Finish Application Method</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="text" 
                                          placeholder="e.g., Factory applied, field applied, spray, brush" 
                                          data-testid="input-wdma-finish-application" 
                                          {...field} 
                                          value={field.value || ""} 
                                        />
                                      </FormControl>
                                      <FormDescription className="text-xs">
                                        Method and location of finish application
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              {/* HPDL/LPDL Face Requirements */}
                              {(form.watch("doorFinishType") === "HPDL-laminate" || form.watch("hpdlLaminateManufacturer")) && (
                                <div className="space-y-4">
                                  <div className="text-sm font-medium text-muted-foreground">HPDL Face Requirements</div>
                                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                                    <FormField
                                      control={form.control}
                                      name="wdmaHpdlManufacturer"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>HPDL Manufacturer</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="text" 
                                              placeholder="e.g., Wilsonart, Formica" 
                                              data-testid="input-wdma-hpdl-manufacturer" 
                                              {...field} 
                                              value={field.value || ""} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="wdmaHpdlThickness"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>HPDL Thickness</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="text" 
                                              placeholder='e.g., 0.048", 0.060"' 
                                              data-testid="input-wdma-hpdl-thickness" 
                                              {...field} 
                                              value={field.value || ""} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="wdmaHpdlPatternColorFinish"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Pattern/Color/Finish</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="text" 
                                              placeholder="Complete specification" 
                                              data-testid="input-wdma-hpdl-pattern-color-finish" 
                                              {...field} 
                                              value={field.value || ""} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  
                                  <div className="text-sm font-medium text-muted-foreground mt-4">LPDL Face Requirements</div>
                                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                                    <FormField
                                      control={form.control}
                                      name="wdmaLpdlManufacturer"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>LPDL Manufacturer</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="text" 
                                              placeholder="Low pressure laminate manufacturer" 
                                              data-testid="input-wdma-lpdl-manufacturer" 
                                              {...field} 
                                              value={field.value || ""} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="wdmaLpdlPatternColor"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>LPDL Pattern/Color</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="text" 
                                              placeholder="Pattern and color specification" 
                                              data-testid="input-wdma-lpdl-pattern-color" 
                                              {...field} 
                                              value={field.value || ""} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* HPDL Laminate Options */}
                        {form.watch("doorMaterial") === "wood" && form.watch("doorFinishType") === "HPDL-laminate" && (
                          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <div className="sm:col-span-2">
                              <p className="text-xs font-medium text-muted-foreground">HPDL Laminate Specifications</p>
                            </div>
                            
                            <FormField
                              control={form.control}
                              name="hpdlLaminateManufacturer"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Manufacturer</FormLabel>
                                  <FormControl>
                                    <Input type="text" placeholder="e.g., Wilsonart, Formica" data-testid="input-hpdl-manufacturer" {...field} value={field.value || ""} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="hpdlLaminateGrade"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Laminate Grade</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-hpdl-grade">
                                        <SelectValue placeholder="Select grade" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="HGS">HGS (High Grade Special)</SelectItem>
                                      <SelectItem value="HGP">HGP (High Grade Premium)</SelectItem>
                                      <SelectItem value="CLS">CLS (Cabinet Liner Sheet)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="hpdlLaminatePattern"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pattern/Design</FormLabel>
                                  <FormControl>
                                    <Input type="text" placeholder="Pattern name or code" data-testid="input-hpdl-pattern" {...field} value={field.value || ""} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="hpdlLaminateColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Color</FormLabel>
                                  <FormControl>
                                    <Input type="text" placeholder="Color name or code" data-testid="input-hpdl-color" {...field} value={field.value || ""} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        {/* Metal/Aluminum Primer Options */}
                        {(form.watch("doorMaterial") === "metal" || form.watch("doorMaterial") === "composite") && form.watch("doorFinishType") === "factory-prime" && (
                          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <FormField
                              control={form.control}
                              name="metalPrimerType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Primer/Finish Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-metal-primer-type">
                                        <SelectValue placeholder="Select primer type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="A40">A40 (Bonderite/Iron Phosphate)</SelectItem>
                                      <SelectItem value="A60">A60 (Galvannealed)</SelectItem>
                                      <SelectItem value="G90">G90 (Hot-Dip Galvanized)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Standard metal finishing specifications
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        {/* Anodized Finish Options */}
                        {form.watch("doorMaterial") === "aluminum" && form.watch("doorFinishType") === "anodized" && (
                          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <FormField
                              control={form.control}
                              name="anodizedFinish"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Anodized Finish</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-anodized-finish">
                                        <SelectValue placeholder="Select finish" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="clear">Clear</SelectItem>
                                      <SelectItem value="bronze">Bronze</SelectItem>
                                      <SelectItem value="black">Black</SelectItem>
                                      <SelectItem value="champagne">Champagne</SelectItem>
                                      <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        {/* Powder Coat Options */}
                        {((form.watch("doorMaterial") === "metal" || form.watch("doorMaterial") === "aluminum" || form.watch("doorMaterial") === "composite") && form.watch("doorFinishType") === "powder-coat") && (
                          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pl-4 border-l-2 border-primary/20">
                            <div className="sm:col-span-2">
                              <p className="text-xs font-medium text-muted-foreground">Powder Coat Specifications</p>
                            </div>
                            
                            <FormField
                              control={form.control}
                              name="powderCoatColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Color</FormLabel>
                                  <FormControl>
                                    <Input type="text" placeholder="Color name or RAL/Pantone code" data-testid="input-powder-coat-color" {...field} value={field.value || ""} />
                                  </FormControl>
                                  <FormDescription>
                                    Enter RAL, Pantone, or custom color name
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="powderCoatFinish"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Finish Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-powder-coat-finish">
                                        <SelectValue placeholder="Select finish" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="smooth">Smooth</SelectItem>
                                      <SelectItem value="textured">Textured</SelectItem>
                                      <SelectItem value="metallic">Metallic</SelectItem>
                                      <SelectItem value="matte">Matte</SelectItem>
                                      <SelectItem value="gloss">Gloss</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="powderCoatManufacturer"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Manufacturer</FormLabel>
                                  <FormControl>
                                    <Input type="text" placeholder="Powder coat manufacturer" data-testid="input-powder-coat-manufacturer" {...field} value={field.value || ""} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Door validation messages - contextual feedback */}
                    <DoorFrameValidationMessages
                      formValues={form.watch()}
                      appliesTo="door"
                    />

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="doorWidth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width (inches)</FormLabel>
                            <FormControl>
                              <DimensionInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="36"
                                testId="input-door-width"
                                showCommonSizes={true}
                                commonSizes={COMMON_DOOR_WIDTHS}
                              />
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
                            <FormLabel>Height (inches)</FormLabel>
                            <FormControl>
                              <DimensionInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="80"
                                testId="input-door-height"
                                showCommonSizes={true}
                                commonSizes={COMMON_DOOR_HEIGHTS}
                              />
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
                            <FormLabel>Thickness (inches)</FormLabel>
                            <FormControl>
                              <DimensionInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="1.75"
                                testId="input-door-thickness"
                                showCommonSizes={true}
                                commonSizes={COMMON_DOOR_THICKNESS}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="doorCoreType"
                        render={({ field }) => (
                          <DoorFrameOptionsSelector
                            appliesTo="door"
                            market="commercial"
                            attributeGroup="Core"
                            attributeName="Core Type"
                            value={field.value || ""}
                            onChange={field.onChange}
                            label="Core Type"
                            description="Lightweight or steel stiffened core options"
                            testId="select-core-type"
                          />
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="doorPressureRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pressure Rating (optional)</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="e.g., 130 mph, Miami-Dade" data-testid="input-pressure-rating" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>Wind/hurricane pressure rating</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="doorStcRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>STC Rating (optional)</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="e.g., STC-30, STC-45, STC-50" data-testid="input-stc-rating" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>Sound Transmission Class rating</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="doorLeadLined"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Lead Lined</FormLabel>
                              <FormDescription>
                                For radiation shielding (medical/dental)
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                data-testid="checkbox-lead-lined"
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked ? "yes" : "no");
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="integratedHardware"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Integrated Hardware</FormLabel>
                              <FormDescription>
                                Flush pulls, recessed hardware
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                data-testid="checkbox-integrated-hardware"
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked ? "yes" : "no");
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="impactDoor"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Impact Resistant</FormLabel>
                              <FormDescription>
                                Hurricane, security, or high-traffic
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                data-testid="checkbox-impact-door"
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked ? "yes" : "no");
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="barnDoorSliding"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Barn/Sliding Door</FormLabel>
                              <FormDescription>
                                Sliding door system or barn door
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                data-testid="checkbox-barn-sliding"
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked ? "yes" : "no");
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {doorWeight && (
                  <Card data-testid="card-door-weight-calculator">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
                        <Ruler className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                        <span>Door Weight Calculator</span>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Estimated weight based on door dimensions and material
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold font-mono" data-testid="text-door-weight">
                          {doorWeight.weight}
                        </div>
                        <div className="text-muted-foreground">lbs</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div className="font-mono" data-testid="text-weight-formula">
                          {doorWeight.calculation}
                        </div>
                      </div>
                      {doorWeight.notes.length > 0 && (
                        <div className="space-y-1">
                          {doorWeight.notes.map((note, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              • {note}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="hardware" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Hardware Specifications</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="lockType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lock Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Cylindrical, Mortise" data-testid="input-lock-type" {...field} value={field.value || ""} />
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
                            <FormLabel>Hinge Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Ball bearing, Spring" data-testid="input-hinge-type" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="hingeCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Hinges</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="3" data-testid="input-hinge-count" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="closerType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Door Closer</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Surface mounted, Concealed" data-testid="input-closer-type" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="exitDevice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exit Device</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Panic bar, Push bar" data-testid="input-exit-device" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gasketing" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Gasketing & Seals</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Fire and smoke seals required for hospitals, healthcare facilities, and fire-rated assemblies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                    <FormField
                      control={form.control}
                      name="gasketingRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Gasketing Required</FormLabel>
                            <FormDescription>
                              Fire/smoke seals needed for code compliance or smoke containment
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value === "yes"}
                              onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                              data-testid="checkbox-gasketing-required"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="intumescentSeals"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Intumescent Seals</FormLabel>
                              <FormDescription className="text-xs">
                                Expands when exposed to heat
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                data-testid="checkbox-intumescent-seals"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smokeSeals"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Smoke Seals</FormLabel>
                              <FormDescription className="text-xs">
                                Smoke containment seals
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                data-testid="checkbox-smoke-seals"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="perimeterSeals"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Perimeter Seals</FormLabel>
                              <FormDescription className="text-xs">
                                Head and jamb seals
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                data-testid="checkbox-perimeter-seals"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="meetingStileSeals"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Meeting Stile Seals</FormLabel>
                              <FormDescription className="text-xs">
                                For double doors
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                data-testid="checkbox-meeting-stile-seals"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="thresholdSeal"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Threshold Seal</FormLabel>
                              <FormDescription className="text-xs">
                                Bottom seal at threshold
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                data-testid="checkbox-threshold-seal"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="automaticDropSeals"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Automatic Drop Seals</FormLabel>
                              <FormDescription className="text-xs">
                                Motorized bottom seals
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value === "yes"}
                                onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                                data-testid="checkbox-automatic-drop-seals"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="astragalType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Astragal Type (Double Doors)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-astragal-type">
                                <SelectValue placeholder="Select astragal type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="fixed">Fixed Astragal</SelectItem>
                              <SelectItem value="removable">Removable Astragal</SelectItem>
                              <SelectItem value="overlapping">Overlapping Astragal</SelectItem>
                              <SelectItem value="flush">Flush Astragal</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Vertical seal between double door leaves
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gasketingNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gasketing Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Installation requirements, manufacturer specifications, compliance notes..." 
                              className="min-h-24"
                              data-testid="textarea-gasketing-notes"
                              {...field} 
                              value={field.value || ""} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fire" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Fire Rating & Compliance</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Fire ratings must match across door, frame, and hardware for code compliance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="doorFireRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Door Fire Rating</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-door-fire-rating">
                                  <SelectValue placeholder="Select rating" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None / Not Rated</SelectItem>
                                <SelectItem value="20-min">20 Minute</SelectItem>
                                <SelectItem value="45-min">45 Minute</SelectItem>
                                <SelectItem value="60-min">60 Minute</SelectItem>
                                <SelectItem value="90-min">90 Minute</SelectItem>
                                <SelectItem value="120-min">120 Minute (2 Hour)</SelectItem>
                                <SelectItem value="3-hour">3 Hour</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="frameFireRating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frame Fire Rating</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frame-fire-rating">
                                  <SelectValue placeholder="Select rating" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None / Not Rated</SelectItem>
                                <SelectItem value="20-min">20 Minute</SelectItem>
                                <SelectItem value="45-min">45 Minute</SelectItem>
                                <SelectItem value="60-min">60 Minute</SelectItem>
                                <SelectItem value="90-min">90 Minute</SelectItem>
                                <SelectItem value="120-min">120 Minute (2 Hour)</SelectItem>
                                <SelectItem value="3-hour">3 Hour</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="hardwareFireRated"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Fire-Rated Hardware</FormLabel>
                            <FormDescription>
                              All hardware (hinges, locks, closers, exit devices) must be fire-rated when frame is rated
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value === "yes"}
                              onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                              data-testid="checkbox-hardware-fire-rated"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fireRatingNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fire Rating Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Note observed fire rating labels on existing doors/frames..."
                              className="min-h-[80px]"
                              data-testid="textarea-fire-rating-notes"
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            For existing doors/frames, document observed UL/WHI labels and ratings
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Electrical Raceways & Conduit</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Required for electrified hardware, automation, and access control systems
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="racewaysRequired"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Raceways Required</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-raceways-required">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select "yes" if automation or access control needs new conduit
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="racewaysPresent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Existing Raceways Present</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-raceways-present">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Are conduits already available at this opening?
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="racewaysNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Raceway/Conduit Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Document conduit routing, wire types, power sources..."
                              className="min-h-[80px]"
                              data-testid="textarea-raceways-notes"
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Note conduit paths, existing infrastructure, or installation requirements
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="glass" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Glass & Opening Components</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Specify sidelites, transoms, and vision lites with glass dimensions and specifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Vision Lite (Glass in Door)</h3>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="visionLitePresent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vision Lite Present</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-vision-lite-present">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vision Lite Location</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-vision-lite-location">
                                    <SelectValue placeholder="Select location" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="top">Top</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="bottom">Bottom</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteCutoutWidth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cutout Width (inches)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 12" data-testid="input-vision-lite-cutout-width" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormDescription>
                                Actual cutout size in door
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteCutoutHeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cutout Height (inches)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 24" data-testid="input-vision-lite-cutout-height" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormDescription>
                                Actual cutout size in door
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteWidth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vision Lite Width (inches)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 12" data-testid="input-vision-lite-width" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteHeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vision Lite Height (inches)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 24" data-testid="input-vision-lite-height" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteGlassType"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Vision Lite Glass Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Clear, Wire, Laminated" data-testid="input-vision-lite-glass-type" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteThickness"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Glass Thickness</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-vision-lite-thickness">
                                    <SelectValue placeholder="Select thickness" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1/8">1/8"</SelectItem>
                                  <SelectItem value="1/4">1/4"</SelectItem>
                                  <SelectItem value="3/8">3/8"</SelectItem>
                                  <SelectItem value="1/2">1/2"</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteFireRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fire Rating</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-vision-lite-fire-rating">
                                    <SelectValue placeholder="Select rating" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="non-fire">Non-Fire</SelectItem>
                                  <SelectItem value="20-min">20-min</SelectItem>
                                  <SelectItem value="45-min">45-min</SelectItem>
                                  <SelectItem value="60-min">60-min</SelectItem>
                                  <SelectItem value="90-min">90-min</SelectItem>
                                  <SelectItem value="3-hr">3-hr</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteStcRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>STC Rating</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., STC-45" data-testid="input-vision-lite-stc-rating" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormDescription>
                                Sound Transmission Class rating
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteVandalResistant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vandal Resistant</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-vision-lite-vandal-resistant">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="visionLiteFireResistant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fire Resistant</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-vision-lite-fire-resistant">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {glassCalculations?.visionLite && (
                          <div className="sm:col-span-2 p-4 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-2">Calculated Glass Size</p>
                            <div className="flex gap-2">
                              <Badge variant="secondary" data-testid="badge-vision-lite-calc-width">
                                Width: {glassCalculations.visionLite.glassWidth}"
                              </Badge>
                              <Badge variant="secondary" data-testid="badge-vision-lite-calc-height">
                                Height: {glassCalculations.visionLite.glassHeight}"
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Sidelites</h3>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="sideliteLeft"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Left Sidelite</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sidelite-left">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteLeftWidth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Left Sidelite Width (inches)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 12" data-testid="input-sidelite-left-width" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteRight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Right Sidelite</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sidelite-right">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteRightWidth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Right Sidelite Width (inches)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 12" data-testid="input-sidelite-right-width" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteGlassType"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Sidelite Glass Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Clear, Frosted, Laminated" data-testid="input-sidelite-glass-type" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteThickness"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Glass Thickness</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sidelite-thickness">
                                    <SelectValue placeholder="Select thickness" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1/8">1/8"</SelectItem>
                                  <SelectItem value="1/4">1/4"</SelectItem>
                                  <SelectItem value="3/8">3/8"</SelectItem>
                                  <SelectItem value="1/2">1/2"</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteFireRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fire Rating</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sidelite-fire-rating">
                                    <SelectValue placeholder="Select rating" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="non-fire">Non-Fire</SelectItem>
                                  <SelectItem value="20-min">20-min</SelectItem>
                                  <SelectItem value="45-min">45-min</SelectItem>
                                  <SelectItem value="60-min">60-min</SelectItem>
                                  <SelectItem value="90-min">90-min</SelectItem>
                                  <SelectItem value="3-hr">3-hr</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteStcRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>STC Rating</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., STC-45" data-testid="input-sidelite-stc-rating" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormDescription>
                                Sound Transmission Class rating
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteVandalResistant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vandal Resistant</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sidelite-vandal-resistant">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteFireResistant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fire Resistant</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sidelite-fire-resistant">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteSpandrelGlazing"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Spandrel Glazing</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sidelite-spandrel-glazing">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Opaque glazing option
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sideliteSolidPanel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Solid Panel</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-sidelite-solid-panel">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Solid infill instead of glass
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {(glassCalculations?.sideliteLeft || glassCalculations?.sideliteRight) && (
                          <div className="sm:col-span-2 p-4 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-2">Calculated Glass Heights</p>
                            <div className="flex gap-2">
                              {glassCalculations.sideliteLeft && (
                                <Badge variant="secondary" data-testid="badge-sidelite-left-calc-height">
                                  Left: {glassCalculations.sideliteLeft.glassHeight}"
                                </Badge>
                              )}
                              {glassCalculations.sideliteRight && (
                                <Badge variant="secondary" data-testid="badge-sidelite-right-calc-height">
                                  Right: {glassCalculations.sideliteRight.glassHeight}"
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Transom</h3>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="transomPresent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transom Present</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-transom-present">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomHeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transom Height (inches)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 12" data-testid="input-transom-height" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomWidth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transom Width (inches)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 36" data-testid="input-transom-width" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomGlassType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transom Glass Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Clear, Frosted" data-testid="input-transom-glass-type" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomThickness"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Glass Thickness</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-transom-thickness">
                                    <SelectValue placeholder="Select thickness" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1/8">1/8"</SelectItem>
                                  <SelectItem value="1/4">1/4"</SelectItem>
                                  <SelectItem value="3/8">3/8"</SelectItem>
                                  <SelectItem value="1/2">1/2"</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomFireRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fire Rating</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-transom-fire-rating">
                                    <SelectValue placeholder="Select rating" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="non-fire">Non-Fire</SelectItem>
                                  <SelectItem value="20-min">20-min</SelectItem>
                                  <SelectItem value="45-min">45-min</SelectItem>
                                  <SelectItem value="60-min">60-min</SelectItem>
                                  <SelectItem value="90-min">90-min</SelectItem>
                                  <SelectItem value="3-hr">3-hr</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomStcRating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>STC Rating</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., STC-45" data-testid="input-transom-stc-rating" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormDescription>
                                Sound Transmission Class rating
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomVandalResistant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vandal Resistant</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-transom-vandal-resistant">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomFireResistant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fire Resistant</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-transom-fire-resistant">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomSpandrelGlazing"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Spandrel Glazing</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-transom-spandrel-glazing">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Opaque glazing option
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="transomSolidPanel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Solid Panel</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-transom-solid-panel">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Solid infill instead of glass
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {glassCalculations?.transom && (
                          <div className="sm:col-span-2 p-4 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-2">Calculated Glass Width</p>
                            <Badge variant="secondary" data-testid="badge-transom-calc-width">
                              Width: {glassCalculations.transom.glassWidth}"
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Overall Glass Configuration</h3>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="glassManufacturer"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Glass Manufacturer</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Pilkington, AGC, Saint-Gobain" data-testid="input-glass-manufacturer" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="glassNotes"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Glass Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Additional glass specifications, certifications, or installation requirements..."
                                  className="min-h-[80px]"
                                  data-testid="textarea-glass-notes"
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Note any special glass requirements, certifications, or installation details
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Glazing Installation Specifications</h3>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="glazingInstallationType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Installation Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-glazing-installation-type">
                                    <SelectValue placeholder="Select installation type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="integral">Integral (Factory Glazed)</SelectItem>
                                  <SelectItem value="metal-frame-kit">Metal Frame Kit</SelectItem>
                                  <SelectItem value="retrofit-kit">Retrofit Kit</SelectItem>
                                  <SelectItem value="field-glazed">Field Glazed</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                How glass will be installed
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="glazingMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Glazing Method</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-glazing-method">
                                    <SelectValue placeholder="Select glazing method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="wet">Wet Glazing (Sealant)</SelectItem>
                                  <SelectItem value="dry">Dry Glazing (Gaskets)</SelectItem>
                                  <SelectItem value="structural">Structural Glazing</SelectItem>
                                  <SelectItem value="hybrid">Hybrid (Wet & Dry)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Primary glazing method
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="butylTapeRequired"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Butyl Tape Required</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "no"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-butyl-tape-required">
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Butyl tape for glazing seal
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch("butylTapeRequired") === "yes" && (
                          <FormField
                            control={form.control}
                            name="butylTapeType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Butyl Tape Type/Brand</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder='e.g., Tremco 440, 1/4" x 1/8"' 
                                    data-testid="input-butyl-tape-type"
                                    {...field} 
                                    value={field.value || ""} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Specify tape brand and size
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="glazingTapeSealant"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Additional Tapes & Sealants</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., Dow Corning 795, Tremco Spectrem 1, Pecora 890" 
                                  data-testid="input-glazing-tape-sealant"
                                  {...field} 
                                  value={field.value || ""} 
                                />
                              </FormControl>
                              <FormDescription>
                                Other sealants, tapes, or adhesives required
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="glazingGaskets"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Glazing Gaskets</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., EPDM compression, silicone wedge" 
                                  data-testid="input-glazing-gaskets"
                                  {...field} 
                                  value={field.value || ""} 
                                />
                              </FormControl>
                              <FormDescription>
                                Gasket material and type
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="glazingStops"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Glazing Stops</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., extruded aluminum, snap-in vinyl" 
                                  data-testid="input-glazing-stops"
                                  {...field} 
                                  value={field.value || ""} 
                                />
                              </FormControl>
                              <FormDescription>
                                Stop material and profile
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="glazingBeads"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Glazing Beads</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., aluminum snap-in, removable" 
                                  data-testid="input-glazing-beads"
                                  {...field} 
                                  value={field.value || ""} 
                                />
                              </FormControl>
                              <FormDescription>
                                Bead specifications
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="settingBlocks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Setting Blocks</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder='e.g., neoprene 1/4", EPDM edge blocks' 
                                  data-testid="input-setting-blocks"
                                  {...field} 
                                  value={field.value || ""} 
                                />
                              </FormControl>
                              <FormDescription>
                                Block material and size
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="glazingNotes"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Glazing Installation Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Special installation requirements, procedures, or precautions..."
                                  className="min-h-[80px]"
                                  data-testid="textarea-glazing-notes"
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Document specific installation methods, special requirements, or field conditions
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {glassCalculations && (
                  <Card>
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">Glass Calculations Summary</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Automatically calculated glass sizes based on cutout dimensions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                      {glassCalculations.visionLite && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Vision Lite</h4>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" data-testid="badge-calc-vision-lite-width">
                              Glass Width: {glassCalculations.visionLite.glassWidth}"
                            </Badge>
                            <Badge variant="outline" data-testid="badge-calc-vision-lite-height">
                              Glass Height: {glassCalculations.visionLite.glassHeight}"
                            </Badge>
                          </div>
                        </div>
                      )}

                      {glassCalculations.sideliteLeft && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Left Sidelite</h4>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" data-testid="badge-calc-sidelite-left-height">
                              Glass Height: {glassCalculations.sideliteLeft.glassHeight}"
                            </Badge>
                          </div>
                        </div>
                      )}

                      {glassCalculations.sideliteRight && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Right Sidelite</h4>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" data-testid="badge-calc-sidelite-right-height">
                              Glass Height: {glassCalculations.sideliteRight.glassHeight}"
                            </Badge>
                          </div>
                        </div>
                      )}

                      {glassCalculations.transom && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Transom</h4>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" data-testid="badge-calc-transom-width">
                              Glass Width: {glassCalculations.transom.glassWidth}"
                            </Badge>
                          </div>
                        </div>
                      )}

                      {!glassCalculations.visionLite && !glassCalculations.sideliteLeft && !glassCalculations.sideliteRight && !glassCalculations.transom && (
                        <p className="text-sm text-muted-foreground" data-testid="text-no-glass-calculations">
                          No glass calculations available. Enter cutout dimensions to see calculated glass sizes.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="automation" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Automation & Access Control</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Configure automatic door operators, power requirements, and access control
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="automationRequired"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Automation Required?</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-automation-required">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="automationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Automation Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-automation-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="high-energy-sliding">High Energy Sliding Door</SelectItem>
                                <SelectItem value="low-energy-automatic">Low Energy Automatic Operator</SelectItem>
                                <SelectItem value="swing-operator">Swing Operator</SelectItem>
                                <SelectItem value="folding-operator">Folding Operator</SelectItem>
                                <SelectItem value="revolving">Revolving Door</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select the type of automatic door operator
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <FormLabel>Power Requirements</FormLabel>
                        <FormDescription className="mb-3">
                          Select all power types required for automation and electrified hardware
                        </FormDescription>
                        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="powerRequirements"
                            render={({ field }) => {
                              const currentValue = field.value || [];
                              return (
                                <>
                                  {['120V AC', '277V AC', '24V DC', 'Low Voltage Control', 'Power over Ethernet (PoE)'].map((powerType) => (
                                    <FormItem
                                      key={powerType}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={currentValue.includes(powerType)}
                                          onCheckedChange={(checked) => {
                                            const newValue = checked
                                              ? [...currentValue, powerType]
                                              : currentValue.filter((val) => val !== powerType);
                                            field.onChange(newValue);
                                          }}
                                          data-testid={`checkbox-power-${powerType.toLowerCase().replace(/\s+/g, '-')}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {powerType}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                                </>
                              );
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="powerAvailable"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value === "yes"}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked ? "yes" : "no");
                                  }}
                                  data-testid="checkbox-power-available"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Power Already at Opening</FormLabel>
                                <FormDescription>
                                  Check if power is already available at this location
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="electrifiedHardware"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value === "yes"}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked ? "yes" : "no");
                                  }}
                                  data-testid="checkbox-electrified-hardware"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Electrified Hardware</FormLabel>
                                <FormDescription>
                                  Electric strikes, mag locks, or powered hinges
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="accessControlRequired"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Access Control Required?</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-access-control-required">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accessControlType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Access Control Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Card reader, Keypad, Biometric" data-testid="input-access-control-type" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormDescription>
                                Only if access control is required
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reuse" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Component Reuse</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Indicate which existing components will be reused vs. replaced
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                    <FormField
                      control={form.control}
                      name="reuseDoor"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value === "yes"}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? "yes" : "no");
                              }}
                              data-testid="checkbox-reuse-door"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Reuse Existing Door</FormLabel>
                            <FormDescription>
                              Check if the existing door will be reused (not replaced)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reuseFrame"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value === "yes"}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? "yes" : "no");
                              }}
                              data-testid="checkbox-reuse-frame"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Reuse Existing Frame</FormLabel>
                            <FormDescription>
                              Check if the existing frame will be reused (not replaced)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reuseHardware"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value === "yes"}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? "yes" : "no");
                              }}
                              data-testid="checkbox-reuse-hardware"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Reuse Existing Hardware</FormLabel>
                            <FormDescription>
                              Check if existing hardware (locks, hinges, closers) will be reused
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Condition Assessment Section */}
                <DoorConditionSelector control={form.control} />
              </TabsContent>
            </Tabs>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional observations, requirements, or special considerations..."
                          className="min-h-24 text-sm sm:text-base"
                          data-testid="input-notes"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNavigateCancel}
                data-testid="button-cancel"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createOpening.isPending}
                data-testid="button-submit"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {createOpening.isPending ? "Adding..." : "Add Door Opening"}
              </Button>
                </div>
                </form>
              </Form>
            </div>
          </div>

          {/* Measurement Calculator Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              <MeasurementCalculator
                doorWidth={watchedDoorWidth || undefined}
                doorHeight={watchedDoorHeight || undefined}
                doorThickness={watchedDoorThickness || undefined}
                doorMaterial={watchedDoorMaterial || undefined}
                doorCoreType={watchedDoorCoreType || undefined}
                frameWidth={watchedFrameWidth || undefined}
                frameDepth={watchedFrameDepth || undefined}
                frameMaterial={watchedFrameMaterial || undefined}
              />
            </div>
          </div>
        </div>

        <ARMeasurementDialog
          open={arDialogOpen}
          onOpenChange={setArDialogOpen}
          onMeasurementComplete={handleARMeasurement}
        />
      </div>
    </div>
  );
}
