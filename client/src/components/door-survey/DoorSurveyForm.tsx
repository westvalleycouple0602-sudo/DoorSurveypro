import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  MapPin, 
  Ruler, 
  DoorOpen, 
  Frame, 
  Wrench,
  ShieldCheck,
  Camera,
  ClipboardCheck,
  Calculator,
  CheckCircle2,
  Building2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone,
  Globe
} from "lucide-react";
import type {
  DoorSurveyProject,
  DoorOpeningInput,
  BuildingCodeStandard,
  DoorSurveyPayload,
  StepKey,
  ElectronicSecurityDevice,
  ElectronicSecurityDeviceType,
  Div28Assessment,
  JurisdictionDetection,
  AHJInfo,
} from "@shared/types/doorSurvey";
import {
  projectStepSchema,
  mappingStepSchema,
  measurementsStepSchema,
  doorStepSchema,
  frameStepSchema,
  hardwareStepSchema,
  complianceStepSchema,
  evidenceStepSchema,
  engineeringStepSchema,
  quoteStepSchema,
} from "@shared/schemas/doorSurvey.schema";
import { apiRequest } from "@/lib/queryClient";
import type { z } from "zod";

const steps: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: "project", label: "Project Details", icon: Building2 },
  { key: "mapping", label: "Locate Opening", icon: MapPin },
  { key: "frame", label: "Frame Assessment", icon: Frame },
  { key: "measurements", label: "Measurements", icon: Ruler },
  { key: "door", label: "Door Panel", icon: DoorOpen },
  { key: "hardware", label: "Hardware Set (Div 08 & 28)", icon: Wrench },
  { key: "compliance", label: "Code Compliance", icon: ShieldCheck },
  { key: "evidence", label: "Photos & Evidence", icon: Camera },
  { key: "engineering", label: "Engineering Review", icon: ClipboardCheck },
  { key: "quote", label: "Quote Summary", icon: Calculator },
  { key: "review", label: "Review & Save", icon: CheckCircle2 },
];

interface DoorSurveyFormProps {
  projectDefaults?: Partial<DoorSurveyProject>;
  onSubmit: (payload: DoorSurveyPayload) => Promise<void> | void;
  isSubmitting?: boolean;
}

type StepValidationErrors = Record<string, string[]>;

// Helper to map area classification to API format
function mapAreaClassificationToApi(classification: string): string {
  const mapping: Record<string, string> = {
    "public_lobby": "PUBLIC",
    "restricted": "STAFF_ONLY",
    "high_security": "CRITICAL_CARE",
    "emergency_egress": "OTHER",
    "loading_dock": "OTHER",
    "server_room": "IT_DATA_CENTER",
    "pharmacy": "PHARMACY",
    "behavioral_health": "BEHAVIORAL_HEALTH",
  };
  return mapping[classification.toLowerCase()] || "OTHER";
}

// Helper to format area classification for display
function formatAreaClassification(value: string): string {
  const labels: Record<string, string> = {
    "public_lobby": "Public Lobby",
    "restricted": "Restricted Access",
    "high_security": "High Security",
    "emergency_egress": "Emergency Egress",
    "loading_dock": "Loading Dock",
    "server_room": "Server/Data Room",
    "pharmacy": "Pharmacy/Controlled",
    "behavioral_health": "Behavioral Health",
  };
  return labels[value] || value.replace(/_/g, " ");
}

// Helper to format traffic level for display
function formatTrafficLevel(value: string): string {
  const labels: Record<string, string> = {
    "LOW": "Low (under 50/day)",
    "MEDIUM": "Medium (50-200/day)",
    "HIGH": "High (over 200/day)",
  };
  return labels[value] || value;
}

// Helper to format security level for display
function formatSecurityLevel(value: string): string {
  const labels: Record<string, string> = {
    "LOW": "Basic",
    "MEDIUM": "Standard",
    "HIGH": "Enhanced",
    "CRITICAL": "Critical",
  };
  return labels[value] || value;
}

function getStepSchema(stepKey: StepKey) {
  switch (stepKey) {
    case "project":
      return projectStepSchema;
    case "mapping":
      return mappingStepSchema;
    case "measurements":
      return measurementsStepSchema;
    case "door":
      return doorStepSchema;
    case "frame":
      return frameStepSchema;
    case "hardware":
      return hardwareStepSchema;
    case "compliance":
      return complianceStepSchema;
    case "evidence":
      return evidenceStepSchema;
    case "engineering":
      return engineeringStepSchema;
    case "quote":
      return quoteStepSchema;
    case "review":
      return null;
    default:
      return null;
  }
}

function getStepData(stepKey: StepKey, project: DoorSurveyProject, opening: DoorOpeningInput): unknown {
  switch (stepKey) {
    case "project":
      return project;
    case "mapping":
      return {
        doorTag: opening.doorTag,
        openingName: opening.openingName,
        description: opening.description,
        floor: opening.floor,
        spaceName: opening.spaceName,
        openingType: opening.openingType,
        handing: opening.handing,
      };
    case "measurements":
      return opening.measurements;
    case "door":
      return opening.doorLeaf;
    case "frame":
      return opening.frame;
    case "hardware":
      return {
        ...opening.hardware,
        div28Assessment: opening.div28Assessment,
      };
    case "compliance":
      return opening.compliance;
    case "evidence":
      return opening.evidence;
    case "engineering":
      return opening.engineeringReview;
    case "quote":
      return opening.quoteSummary;
    default:
      return null;
  }
}

function validateStep(
  stepKey: StepKey, 
  project: DoorSurveyProject, 
  opening: DoorOpeningInput
): { valid: boolean; errors: StepValidationErrors } {
  const schema = getStepSchema(stepKey);
  if (!schema) {
    return { valid: true, errors: {} };
  }

  const data = getStepData(stepKey, project, opening);
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { valid: true, errors: {} };
  }

  const errors: StepValidationErrors = {};
  for (const error of result.error.errors) {
    const path = error.path.join(".");
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(error.message);
  }
  
  return { valid: false, errors };
}

export function DoorSurveyForm({
  projectDefaults,
  onSubmit,
  isSubmitting = false,
}: DoorSurveyFormProps) {
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepErrors, setStepErrors] = useState<StepValidationErrors>({});
  const [attemptedNavigation, setAttemptedNavigation] = useState(false);

  const [project, setProject] = useState<DoorSurveyProject>({
    id: undefined,
    name: "",
    location: "",
    buildingType: "Office Building",
    customerId: undefined,
    quoteType: "none",
    standards: ["ADA", "IBC"],
    ...projectDefaults,
  });

  const [opening, setOpening] = useState<DoorOpeningInput>({
    doorTag: "",
    openingName: "",
    description: "",
    floor: "",
    spaceName: "",
    openingType: "single",
    handing: "RH",
    measurements: {
      roughWidthMm: 0,
      roughHeightMm: 0,
      clearWidthMm: 0,
      headHeightMm: 0,
      jambDepthMm: 0,
      doorThicknessMm: 0,
      sillHeightMm: 0,
    },
    doorLeaf: {
      leafType: "flush",
      coreType: "solid",
      fireRatingMinutes: 0,
      hasVisionLite: false,
      visionLiteDescription: "",
      manufacturer: "",
      model: "",
    },
    frame: {
      material: "hollow_metal",
      profile: "5-3/4",
      anchorType: "existing",
      conditionScore: 3,
      fireLabelPresent: false,
      fireLabelRating: 0,
      notes: "",
    },
    hardware: {
      hinges: [],
      lockFunction: "",
      lockset: "",
      exitDevice: "",
      closer: "",
      accessories: [],
      electrifiedHardware: [],
      electronicSecurity: [],
    },
    compliance: {
      standardsChecked: ["ADA", "IBC"],
      passes: true,
      issues: [],
      notes: "",
    },
    evidence: {
      photos: [],
      videos: [],
      documents: [],
    },
    engineeringReview: {
      status: "pending",
      notes: "",
      conflicts: [],
    },
    quoteSummary: {
      materialCost: 0,
      laborCost: 0,
      shippingCost: 0,
      marginPercent: 35,
      totalPrice: 0,
      optionLabel: "Base",
    },
    div28Assessment: {
      enabled: false,
    },
  });

  const current = steps[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  const currentValidation = useMemo(() => {
    return validateStep(current.key, project, opening);
  }, [current.key, project, opening]);

  const goNext = () => {
    setAttemptedNavigation(true);
    const validation = validateStep(current.key, project, opening);
    
    if (!validation.valid) {
      setStepErrors(validation.errors);
      return;
    }
    
    setStepErrors({});
    setAttemptedNavigation(false);
    setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    setStepErrors({});
    setAttemptedNavigation(false);
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
  };

  const goToStep = (index: number) => {
    if (index < currentStepIndex) {
      setStepErrors({});
      setAttemptedNavigation(false);
      setCurrentStepIndex(index);
    } else if (index > currentStepIndex) {
      setAttemptedNavigation(true);
      const validation = validateStep(current.key, project, opening);
      if (!validation.valid) {
        setStepErrors(validation.errors);
        return;
      }
      setStepErrors({});
      setAttemptedNavigation(false);
      setCurrentStepIndex(index);
    }
  };

  const handleSubmit = async () => {
    let finalOpening = { ...opening };
    
    // Validate Div28 assessment if enabled
    if (opening.div28Assessment?.enabled) {
      if (!opening.div28Assessment.areaClassification || !opening.div28Assessment.securityLevel) {
        toast({
          title: "Div28 Assessment Incomplete",
          description: "Please select area classification and security level to complete the assessment.",
          variant: "destructive",
        });
        return;
      }
      
      // Compute Div28 score before submitting
      try {
        const surveyAnswers = {
          openingId: opening.doorTag || opening.id || "new",
          areaType: mapAreaClassificationToApi(opening.div28Assessment.areaClassification),
          riskLevel: opening.div28Assessment.securityLevel.toUpperCase(),
          accessControlMode: opening.div28Assessment.accessControlNeeded ? "BADGE_CARD" : "NONE",
          requiresAuditTrail: opening.div28Assessment.accessControlNeeded || false,
          scheduledLockUnlock: false,
          egressType: opening.div28Assessment.delayedEgressNeeded ? "DELAYED_EGRESS" : "FREE_EGRESS",
          unsureAboutEgressCode: false,
          heavyOrHighTraffic: opening.div28Assessment.trafficLevel === "high",
          adaPriority: opening.div28Assessment.doorAutomationNeeded || false,
          infectionControlPriority: false,
          surveillanceLevel: opening.div28Assessment.surveillanceNeeded ? "LOCAL_CAMERA" : "NONE",
          intrusionLevel: opening.div28Assessment.intrusionDetectionNeeded ? "DOOR_CONTACT_ONLY" : "NONE",
          lockdownCoverage: opening.div28Assessment.lockdownControlNeeded ? "ZONE_LOCKDOWN" : "NONE",
          gunDetectionIntent: "NONE",
        };
        
        const response = await fetch("/api/div28/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(surveyAnswers),
          credentials: "include",
        });
        
        if (response.ok) {
          const opportunityResult = await response.json();
          finalOpening = {
            ...finalOpening,
            div28Assessment: {
              ...finalOpening.div28Assessment!,
              score: opportunityResult.score,
              tier: opportunityResult.tier,
              recommendedFeatures: opportunityResult.recommendedFeatures,
              warnings: opportunityResult.warnings,
              proposalSummary: opportunityResult.narrativeSummary,
            },
          };
        } else {
          toast({
            title: "Div28 Scoring Failed",
            description: "Could not compute opportunity score. Assessment will be saved without scoring metrics.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Div28 Scoring Unavailable",
          description: "Could not compute opportunity score. Assessment will be saved without scoring metrics.",
          variant: "destructive",
        });
      }
    }
    
    const payload: DoorSurveyPayload = {
      project,
      opening: finalOpening,
    };
    await onSubmit(payload);
  };
  
  const hasErrors = Object.keys(stepErrors).length > 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl">New Door Survey</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Step {currentStepIndex + 1} of {steps.length}: <span className="hidden sm:inline">{current.label}</span><span className="sm:hidden">{current.label.split(" ")[0]}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isComplete = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <button
                    key={step.key}
                    onClick={() => goToStep(index)}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center h-6 w-6 sm:h-8 sm:w-8 rounded-full transition-colors shrink-0 ${
                      isComplete
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground hover-elevate"
                    } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    data-testid={`step-indicator-${step.key}`}
                    title={step.label}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <Progress value={progressPercent} className="mt-3 sm:mt-4 h-1.5 sm:h-2" data-testid="progress-survey" />
        </CardHeader>
      </Card>

      {hasErrors && attemptedNavigation && (
        <Alert variant="destructive" data-testid="alert-validation-errors">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the following errors before proceeding:
            <ul className="list-disc list-inside mt-2">
              {Object.entries(stepErrors).map(([field, messages]) => (
                <li key={field}>
                  <span className="font-medium">{field}:</span> {messages.join(", ")}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-3 sm:p-6 pt-4 sm:pt-6">
          {current.key === "project" && (
            <ProjectStep project={project} onChange={setProject} errors={stepErrors} />
          )}

          {current.key === "mapping" && (
            <MappingStep opening={opening} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "measurements" && (
            <MeasurementsStep opening={opening} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "door" && (
            <DoorStep opening={opening} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "frame" && (
            <FrameStep opening={opening} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "hardware" && (
            <HardwareStep opening={opening} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "compliance" && (
            <ComplianceStep opening={opening} project={project} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "evidence" && (
            <EvidenceStep opening={opening} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "engineering" && (
            <EngineeringStep opening={opening} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "quote" && (
            <QuoteStep opening={opening} onChange={setOpening} errors={stepErrors} />
          )}

          {current.key === "review" && (
            <ReviewStep project={project} opening={opening} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goBack}
          disabled={currentStepIndex === 0 || isSubmitting}
          data-testid="button-back"
          className="text-xs sm:text-sm"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
          Back
        </Button>

        {current.key !== "review" ? (
          <Button 
            type="button" 
            size="sm"
            onClick={goNext} 
            disabled={isSubmitting}
            data-testid="button-next"
            className="text-xs sm:text-sm"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1 sm:ml-2 shrink-0" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-save-survey"
            className="text-xs sm:text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0 animate-spin" />
                <span className="hidden sm:inline">Saving...</span><span className="sm:hidden">Save</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline">Save Survey</span><span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

interface StepProps {
  opening: DoorOpeningInput;
  onChange: (next: DoorOpeningInput) => void;
  errors?: StepValidationErrors;
}

interface ProjectStepProps {
  project: DoorSurveyProject;
  onChange: (next: DoorSurveyProject) => void;
  errors?: StepValidationErrors;
}

function FieldError({ field, errors }: { field: string; errors?: StepValidationErrors }) {
  if (!errors || !errors[field]) return null;
  return (
    <p className="text-sm text-destructive mt-1" data-testid={`error-${field}`}>
      {errors[field].join(", ")}
    </p>
  );
}

function ProjectStep({ project, onChange, errors }: ProjectStepProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const lastLookupRef = useRef<string>("");
  const { toast } = useToast();

  const toggleStandard = (std: BuildingCodeStandard) => {
    const exists = project.standards.includes(std);
    const next = {
      ...project,
      standards: exists
        ? project.standards.filter((s) => s !== std)
        : [...project.standards, std],
      jurisdiction: project.jurisdiction
        ? { ...project.jurisdiction, userOverridden: true }
        : undefined,
    };
    onChange(next);
  };

  const lookupJurisdiction = useCallback(async (address: string) => {
    if (!address || address.length < 3 || address === lastLookupRef.current) return;
    lastLookupRef.current = address;
    setIsDetecting(true);

    try {
      const response = await apiRequest("POST", "/api/jurisdictions/lookup", {
        address,
        buildingType: project.buildingType,
      });

      const data = await response.json();

      if (data.parsed.confidence === "low") return;

      const detection: JurisdictionDetection = {
        state: data.parsed.state,
        stateName: data.parsed.stateName,
        city: data.parsed.city,
        confidence: data.parsed.confidence,
        jurisdictionCode: data.jurisdiction.code,
        ibcEdition: data.jurisdiction.ibcEdition,
        localCodeName: data.jurisdiction.localCodeName,
        localAmendments: data.jurisdiction.localAmendments || [],
        autoDetectedStandards: data.applicableStandards as BuildingCodeStandard[],
        userOverridden: false,
        ahj: data.ahj || undefined,
      };

      const hadUserOverride = project.jurisdiction?.userOverridden;
      const newStandards = hadUserOverride ? project.standards : detection.autoDetectedStandards;

      onChange({
        ...project,
        standards: newStandards,
        jurisdiction: hadUserOverride ? { ...detection, userOverridden: true } : detection,
      });

      if (!hadUserOverride) {
        toast({
          title: "Jurisdiction Detected",
          description: `${data.parsed.stateName || data.parsed.state}${data.parsed.city ? ` (${data.parsed.city})` : ""} — ${detection.autoDetectedStandards.length} standards auto-applied`,
        });
      }
    } catch {
    } finally {
      setIsDetecting(false);
    }
  }, [project.buildingType, project.jurisdiction?.userOverridden, onChange, toast]);

  const resetToAutoDetected = useCallback(() => {
    if (project.jurisdiction) {
      onChange({
        ...project,
        standards: project.jurisdiction.autoDetectedStandards,
        jurisdiction: { ...project.jurisdiction, userOverridden: false },
      });
    }
  }, [project, onChange]);

  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          value={project.name}
          onChange={(e) => onChange({ ...project, name: e.target.value })}
          placeholder="Memorial Hospital Renovation"
          data-testid="input-project-name"
          className={errors?.name ? "border-destructive" : ""}
        />
        <FieldError field="name" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-location">
          Location
          {isDetecting && (
            <Loader2 className="inline-block ml-1.5 h-3 w-3 animate-spin" />
          )}
        </Label>
        <Input
          id="project-location"
          value={project.location}
          onChange={(e) => onChange({ ...project, location: e.target.value })}
          onBlur={(e) => lookupJurisdiction(e.target.value)}
          placeholder="123 Main St, San Francisco, CA 94102"
          data-testid="input-project-location"
          className={errors?.location ? "border-destructive" : ""}
        />
        <FieldError field="location" errors={errors} />
        {project.jurisdiction && project.jurisdiction.confidence !== "low" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-jurisdiction-detected">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>
              {project.jurisdiction.stateName || project.jurisdiction.state}
              {project.jurisdiction.city ? ` — ${project.jurisdiction.city}` : ""}
              {project.jurisdiction.localCodeName ? ` (${project.jurisdiction.localCodeName})` : ""}
            </span>
            {project.jurisdiction.confidence === "medium" && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">estimated</Badge>
            )}
          </div>
        )}
        {project.jurisdiction?.ahj && (
          <Card className="mt-2" data-testid="card-ahj-info">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">Authority Having Jurisdiction (AHJ)</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" data-testid="text-ahj-name">{project.jurisdiction.ahj.name}</span>
                    <Badge variant="secondary" className="text-[10px]" data-testid="badge-ahj-type">{project.jurisdiction.ahj.type}</Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <a href={`tel:${project.jurisdiction.ahj.phone}`} className="flex items-center gap-1 text-muted-foreground hover:underline" data-testid="link-ahj-phone">
                      <Phone className="h-3 w-3" />
                      {project.jurisdiction.ahj.phone}
                    </a>
                    <a href={project.jurisdiction.ahj.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:underline" data-testid="link-ahj-website">
                      <Globe className="h-3 w-3" />
                      Website
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="building-type">Building Type</Label>
        <Select
          value={project.buildingType}
          onValueChange={(value) => {
            onChange({ ...project, buildingType: value });
            if (project.location) {
              lastLookupRef.current = "";
              setTimeout(() => lookupJurisdiction(project.location), 100);
            }
          }}
        >
          <SelectTrigger id="building-type" data-testid="select-building-type">
            <SelectValue placeholder="Select building type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Hospital">Hospital</SelectItem>
            <SelectItem value="Office Building">Office Building</SelectItem>
            <SelectItem value="School">School</SelectItem>
            <SelectItem value="Retail">Retail</SelectItem>
            <SelectItem value="Multi-Family">Multi-Family</SelectItem>
            <SelectItem value="Industrial">Industrial</SelectItem>
            <SelectItem value="Government">Government</SelectItem>
            <SelectItem value="Hotel">Hotel</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="buildingType" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="quote-type">Quote Type</Label>
        <Select
          value={project.quoteType}
          onValueChange={(value) =>
            onChange({
              ...project,
              quoteType: value as DoorSurveyProject["quoteType"],
            })
          }
        >
          <SelectTrigger id="quote-type" data-testid="select-quote-type">
            <SelectValue placeholder="Select quote type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="change_order">Change Order</SelectItem>
            <SelectItem value="aftermarket">Aftermarket / Pre-Existing</SelectItem>
            <SelectItem value="tenant_improvement">Tenant Improvement</SelectItem>
            <SelectItem value="new_construction">New Construction</SelectItem>
            <SelectItem value="hardware_only">Hardware Only</SelectItem>
            <SelectItem value="automation_only">Automation Only</SelectItem>
            <SelectItem value="repair">Repair</SelectItem>
            <SelectItem value="rough_order_magnitude">Rough Order of Magnitude</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="quoteType" errors={errors} />
      </div>

      <div className="sm:col-span-2 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="text-sm">Applicable Standards</Label>
          {project.jurisdiction?.userOverridden && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetToAutoDetected}
              data-testid="button-reset-standards"
              className="text-xs h-auto py-0.5"
            >
              Reset to auto-detected
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {(["ADA", "IBC", "NFPA", "ANSI_SDI", "LOCAL", "DIV08", "DIV28"] as BuildingCodeStandard[]).map(
            (std) => (
              <Badge
                key={std}
                variant={project.standards.includes(std) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleStandard(std)}
                data-testid={`badge-standard-${std}`}
              >
                {std === "ANSI_SDI" ? "ANSI/SDI" : std}
              </Badge>
            )
          )}
        </div>
        <FieldError field="standards" errors={errors} />
        {project.jurisdiction && !project.jurisdiction.userOverridden && project.jurisdiction.confidence !== "low" && (
          <p className="text-xs text-muted-foreground" data-testid="text-standards-auto">
            Standards auto-selected based on {project.jurisdiction.stateName || project.jurisdiction.state} jurisdiction
          </p>
        )}
      </div>
    </div>
  );
}

function MappingStep({ opening, onChange, errors }: StepProps) {
  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="door-tag">Door Tag / Number</Label>
        <Input
          id="door-tag"
          value={opening.doorTag}
          onChange={(e) => onChange({ ...opening, doorTag: e.target.value })}
          placeholder="101A"
          data-testid="input-door-tag"
          className={errors?.doorTag ? "border-destructive" : ""}
        />
        <FieldError field="doorTag" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="opening-name">Opening Name (Optional)</Label>
        <Input
          id="opening-name"
          value={opening.openingName || ""}
          onChange={(e) => onChange({ ...opening, openingName: e.target.value })}
          placeholder="Main Entry Door"
          data-testid="input-opening-name"
        />
      </div>

      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="opening-description">Description (Optional)</Label>
        <Input
          id="opening-description"
          value={opening.description || ""}
          onChange={(e) => onChange({ ...opening, description: e.target.value })}
          placeholder="Primary entrance to lobby area"
          data-testid="input-opening-description"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="floor">Floor</Label>
        <Input
          id="floor"
          value={opening.floor}
          onChange={(e) => onChange({ ...opening, floor: e.target.value })}
          placeholder="Level 1"
          data-testid="input-floor"
          className={errors?.floor ? "border-destructive" : ""}
        />
        <FieldError field="floor" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="space-name">Space / Room</Label>
        <Input
          id="space-name"
          value={opening.spaceName}
          onChange={(e) => onChange({ ...opening, spaceName: e.target.value })}
          placeholder="Corridor 1"
          data-testid="input-space-name"
          className={errors?.spaceName ? "border-destructive" : ""}
        />
        <FieldError field="spaceName" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="opening-type">Opening Type</Label>
        <Select
          value={opening.openingType}
          onValueChange={(value) =>
            onChange({
              ...opening,
              openingType: value as DoorOpeningInput["openingType"],
            })
          }
        >
          <SelectTrigger id="opening-type" data-testid="select-opening-type">
            <SelectValue placeholder="Select opening type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single Swing</SelectItem>
            <SelectItem value="pair">Pair</SelectItem>
            <SelectItem value="sliding">Sliding</SelectItem>
            <SelectItem value="folding">Folding</SelectItem>
            <SelectItem value="revolving">Revolving</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="openingType" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="handing">Handing</Label>
        <Select
          value={opening.handing}
          onValueChange={(value) =>
            onChange({
              ...opening,
              handing: value as DoorOpeningInput["handing"],
            })
          }
        >
          <SelectTrigger id="handing" data-testid="select-handing">
            <SelectValue placeholder="Select handing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RH">RH (Right Hand)</SelectItem>
            <SelectItem value="LH">LH (Left Hand)</SelectItem>
            <SelectItem value="RHR">RHR (Right Hand Reverse)</SelectItem>
            <SelectItem value="LHR">LHR (Left Hand Reverse)</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="handing" errors={errors} />
      </div>
    </div>
  );
}

function MeasurementsStep({ opening, onChange, errors }: StepProps) {
  const m = opening.measurements;
  const update = (field: keyof typeof m, value: number) => {
    onChange({ ...opening, measurements: { ...m, [field]: value } });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-xs sm:text-sm text-muted-foreground">
        Enter dimensions in millimeters (mm). Use AR/LiDAR for accurate measurements.
      </p>
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="rough-width">Rough Width (mm)</Label>
          <Input
            id="rough-width"
            type="number"
            value={m.roughWidthMm || ""}
            onChange={(e) => update("roughWidthMm", Number(e.target.value))}
            data-testid="input-rough-width"
            className={errors?.roughWidthMm ? "border-destructive" : ""}
          />
          <FieldError field="roughWidthMm" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rough-height">Rough Height (mm)</Label>
          <Input
            id="rough-height"
            type="number"
            value={m.roughHeightMm || ""}
            onChange={(e) => update("roughHeightMm", Number(e.target.value))}
            data-testid="input-rough-height"
            className={errors?.roughHeightMm ? "border-destructive" : ""}
          />
          <FieldError field="roughHeightMm" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clear-width">Clear Width (mm)</Label>
          <Input
            id="clear-width"
            type="number"
            value={m.clearWidthMm || ""}
            onChange={(e) => update("clearWidthMm", Number(e.target.value))}
            data-testid="input-clear-width"
            className={errors?.clearWidthMm ? "border-destructive" : ""}
          />
          <FieldError field="clearWidthMm" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="head-height">Head Height (mm)</Label>
          <Input
            id="head-height"
            type="number"
            value={m.headHeightMm || ""}
            onChange={(e) => update("headHeightMm", Number(e.target.value))}
            data-testid="input-head-height"
            className={errors?.headHeightMm ? "border-destructive" : ""}
          />
          <FieldError field="headHeightMm" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jamb-depth">Jamb Depth (mm)</Label>
          <Input
            id="jamb-depth"
            type="number"
            value={m.jambDepthMm || ""}
            onChange={(e) => update("jambDepthMm", Number(e.target.value))}
            data-testid="input-jamb-depth"
            className={errors?.jambDepthMm ? "border-destructive" : ""}
          />
          <FieldError field="jambDepthMm" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="door-thickness">Door Thickness (mm)</Label>
          <Input
            id="door-thickness"
            type="number"
            value={m.doorThicknessMm || ""}
            onChange={(e) => update("doorThicknessMm", Number(e.target.value))}
            data-testid="input-door-thickness"
            className={errors?.doorThicknessMm ? "border-destructive" : ""}
          />
          <FieldError field="doorThicknessMm" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sill-height">Sill Height (mm)</Label>
          <Input
            id="sill-height"
            type="number"
            value={m.sillHeightMm || ""}
            onChange={(e) => update("sillHeightMm", Number(e.target.value))}
            placeholder="Optional"
            data-testid="input-sill-height"
          />
          <FieldError field="sillHeightMm" errors={errors} />
        </div>
      </div>
    </div>
  );
}

function DoorStep({ opening, onChange, errors }: StepProps) {
  const dl = opening.doorLeaf;

  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="leaf-type">Door Type</Label>
        <Select
          value={dl.leafType}
          onValueChange={(value) =>
            onChange({
              ...opening,
              doorLeaf: { ...dl, leafType: value as typeof dl.leafType },
            })
          }
        >
          <SelectTrigger id="leaf-type" data-testid="select-leaf-type">
            <SelectValue placeholder="Select door type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flush">Flush</SelectItem>
            <SelectItem value="full_glass">Full Glass</SelectItem>
            <SelectItem value="half_glass">Half Glass</SelectItem>
            <SelectItem value="narrow_lite">Narrow Lite</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="leafType" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="core-type">Core Type</Label>
        <Select
          value={dl.coreType}
          onValueChange={(value) =>
            onChange({
              ...opening,
              doorLeaf: { ...dl, coreType: value as typeof dl.coreType },
            })
          }
        >
          <SelectTrigger id="core-type" data-testid="select-core-type">
            <SelectValue placeholder="Select core type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid Core</SelectItem>
            <SelectItem value="hollow">Hollow Core</SelectItem>
            <SelectItem value="mineral">Mineral Core</SelectItem>
            <SelectItem value="stc">STC Rated</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="coreType" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fire-rating">Fire Rating (minutes)</Label>
        <Select
          value={String(dl.fireRatingMinutes)}
          onValueChange={(value) =>
            onChange({
              ...opening,
              doorLeaf: { ...dl, fireRatingMinutes: Number(value) },
            })
          }
        >
          <SelectTrigger id="fire-rating" data-testid="select-fire-rating">
            <SelectValue placeholder="Select fire rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Non-Rated</SelectItem>
            <SelectItem value="20">20 Minutes</SelectItem>
            <SelectItem value="45">45 Minutes</SelectItem>
            <SelectItem value="60">60 Minutes</SelectItem>
            <SelectItem value="90">90 Minutes</SelectItem>
            <SelectItem value="180">180 Minutes</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="fireRatingMinutes" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="manufacturer">Manufacturer</Label>
        <Input
          id="manufacturer"
          value={dl.manufacturer || ""}
          onChange={(e) =>
            onChange({
              ...opening,
              doorLeaf: { ...dl, manufacturer: e.target.value },
            })
          }
          placeholder="e.g., Ceco, Steelcraft"
          data-testid="input-door-manufacturer"
        />
        <FieldError field="manufacturer" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          value={dl.model || ""}
          onChange={(e) =>
            onChange({
              ...opening,
              doorLeaf: { ...dl, model: e.target.value },
            })
          }
          placeholder="Model number"
          data-testid="input-door-model"
        />
        <FieldError field="model" errors={errors} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="has-vision-lite">Has Vision Lite</Label>
          <Switch
            id="has-vision-lite"
            checked={dl.hasVisionLite}
            onCheckedChange={(checked) =>
              onChange({
                ...opening,
                doorLeaf: { ...dl, hasVisionLite: checked },
              })
            }
            data-testid="switch-has-vision-lite"
          />
        </div>
      </div>

      {dl.hasVisionLite && (
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="vision-lite-desc">Vision Lite Description</Label>
          <Input
            id="vision-lite-desc"
            value={dl.visionLiteDescription || ""}
            onChange={(e) =>
              onChange({
                ...opening,
                doorLeaf: { ...dl, visionLiteDescription: e.target.value },
              })
            }
            placeholder="Size, type, fire rating"
            data-testid="input-vision-lite-desc"
          />
          <FieldError field="visionLiteDescription" errors={errors} />
        </div>
      )}
    </div>
  );
}

function FrameStep({ opening, onChange, errors }: StepProps) {
  const f = opening.frame;

  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="frame-material">Frame Material</Label>
        <Select
          value={f.material}
          onValueChange={(value) =>
            onChange({
              ...opening,
              frame: { ...f, material: value as typeof f.material },
            })
          }
        >
          <SelectTrigger id="frame-material" data-testid="select-frame-material">
            <SelectValue placeholder="Select frame material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hollow_metal">Hollow Metal</SelectItem>
            <SelectItem value="aluminum">Aluminum</SelectItem>
            <SelectItem value="wood">Wood</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="material" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="frame-profile">Profile Size</Label>
        <Select
          value={f.profile}
          onValueChange={(value) =>
            onChange({
              ...opening,
              frame: { ...f, profile: value },
            })
          }
        >
          <SelectTrigger id="frame-profile" data-testid="select-frame-profile">
            <SelectValue placeholder="Select profile size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4-3/4">4-3/4"</SelectItem>
            <SelectItem value="5-3/4">5-3/4"</SelectItem>
            <SelectItem value="6-3/4">6-3/4"</SelectItem>
            <SelectItem value="7-3/4">7-3/4"</SelectItem>
            <SelectItem value="8-3/4">8-3/4"</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="profile" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="anchor-type">Anchor Type</Label>
        <Select
          value={f.anchorType}
          onValueChange={(value) =>
            onChange({
              ...opening,
              frame: { ...f, anchorType: value as typeof f.anchorType },
            })
          }
        >
          <SelectTrigger id="anchor-type" data-testid="select-anchor-type">
            <SelectValue placeholder="Select anchor type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="existing">Existing</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="steel">Steel Clip</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="anchorType" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition-score">Condition Score (1-5)</Label>
        <Select
          value={String(f.conditionScore)}
          onValueChange={(value) =>
            onChange({
              ...opening,
              frame: { ...f, conditionScore: Number(value) as typeof f.conditionScore },
            })
          }
        >
          <SelectTrigger id="condition-score" data-testid="select-condition-score">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 - Poor (Replace)</SelectItem>
            <SelectItem value="2">2 - Fair (Major Repair)</SelectItem>
            <SelectItem value="3">3 - Average (Minor Repair)</SelectItem>
            <SelectItem value="4">4 - Good (Minimal Repair)</SelectItem>
            <SelectItem value="5">5 - Excellent (As-Is)</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="conditionScore" errors={errors} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="fire-label-present">Fire Label Present?</Label>
          <Switch
            id="fire-label-present"
            checked={f.fireLabelPresent || false}
            onCheckedChange={(checked) =>
              onChange({
                ...opening,
                frame: { ...f, fireLabelPresent: checked },
              })
            }
            data-testid="switch-fire-label-present"
          />
        </div>
      </div>

      {f.fireLabelPresent && (
        <div className="space-y-2">
          <Label htmlFor="fire-label-rating">Fire Label Rating (minutes)</Label>
          <Select
            value={String(f.fireLabelRating || 0)}
            onValueChange={(value) =>
              onChange({
                ...opening,
                frame: { ...f, fireLabelRating: Number(value) },
              })
            }
          >
            <SelectTrigger id="fire-label-rating" data-testid="select-fire-label-rating">
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 Minutes</SelectItem>
              <SelectItem value="45">45 Minutes</SelectItem>
              <SelectItem value="60">60 Minutes</SelectItem>
              <SelectItem value="90">90 Minutes</SelectItem>
              <SelectItem value="180">180 Minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="frame-notes">Notes</Label>
        <Textarea
          id="frame-notes"
          value={f.notes || ""}
          onChange={(e) =>
            onChange({
              ...opening,
              frame: { ...f, notes: e.target.value },
            })
          }
          placeholder="Special conditions, damage, modifications needed..."
          data-testid="textarea-frame-notes"
        />
        <FieldError field="notes" errors={errors} />
      </div>

      <div className="sm:col-span-2">
        <Separator className="my-3 sm:my-4" />
        <h3 className="text-sm font-semibold mb-3 sm:mb-4">Field Assessment</h3>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="frame-level-check">Level Check</Label>
            <Select
              value={f.levelCheck || ""}
              onValueChange={(value) =>
                onChange({ ...opening, frame: { ...f, levelCheck: value as any } })
              }
            >
              <SelectTrigger id="frame-level-check" data-testid="select-frame-level-check">
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="marginal">Marginal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Header and floor level assessment</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frame-plumb-check">Plumb Check</Label>
            <Select
              value={f.plumbCheck || ""}
              onValueChange={(value) =>
                onChange({ ...opening, frame: { ...f, plumbCheck: value as any } })
              }
            >
              <SelectTrigger id="frame-plumb-check" data-testid="select-frame-plumb-check">
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="marginal">Marginal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Jamb plumb assessment using level/laser</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frame-square-check">Square Check</Label>
            <Select
              value={f.squareCheck || ""}
              onValueChange={(value) =>
                onChange({ ...opening, frame: { ...f, squareCheck: value as any } })
              }
            >
              <SelectTrigger id="frame-square-check" data-testid="select-frame-square-check">
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="marginal">Marginal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">3-point diagonal measurement check</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frame-straightness-check">Straightness Check</Label>
            <Select
              value={f.straightnessCheck || ""}
              onValueChange={(value) =>
                onChange({ ...opening, frame: { ...f, straightnessCheck: value as any } })
              }
            >
              <SelectTrigger id="frame-straightness-check" data-testid="select-frame-straightness-check">
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="marginal">Marginal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Header and jamb straightness</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="frame-twist">Twist Observed</Label>
              <Switch
                id="frame-twist"
                checked={f.twistObserved || false}
                onCheckedChange={(checked) =>
                  onChange({ ...opening, frame: { ...f, twistObserved: checked } })
                }
                data-testid="switch-frame-twist"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frame-door-swing">Door Swing</Label>
            <Select
              value={f.swingCheck || ""}
              onValueChange={(value) =>
                onChange({ ...opening, frame: { ...f, swingCheck: value as "pass" | "fail" | "marginal" } })
              }
            >
              <SelectTrigger id="frame-door-swing" data-testid="select-frame-door-swing">
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="marginal">Marginal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Verify door swings correctly</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="frame-drift">Drift Observed</Label>
              <Switch
                id="frame-drift"
                checked={f.driftObserved || false}
                onCheckedChange={(checked) =>
                  onChange({ ...opening, frame: { ...f, driftObserved: checked } })
                }
                data-testid="switch-frame-drift"
              />
            </div>
            <p className="text-xs text-muted-foreground">Door drifts open or closed</p>
          </div>
        </div>

        <Separator className="my-3 sm:my-4" />
        <h4 className="text-sm font-medium mb-3 sm:mb-4">Reveal Measurements</h4>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="reveal-left">Left Reveal</Label>
            <Input
              id="reveal-left"
              value={f.revealLeft || ""}
              onChange={(e) =>
                onChange({ ...opening, frame: { ...f, revealLeft: e.target.value } })
              }
              placeholder="e.g. 3/16&quot;"
              data-testid="input-frame-reveal-left"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reveal-right">Right Reveal</Label>
            <Input
              id="reveal-right"
              value={f.revealRight || ""}
              onChange={(e) =>
                onChange({ ...opening, frame: { ...f, revealRight: e.target.value } })
              }
              placeholder="e.g. 3/16&quot;"
              data-testid="input-frame-reveal-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reveal-top">Top Reveal</Label>
            <Input
              id="reveal-top"
              value={f.revealTop || ""}
              onChange={(e) =>
                onChange({ ...opening, frame: { ...f, revealTop: e.target.value } })
              }
              placeholder="e.g. 1/8&quot;"
              data-testid="input-frame-reveal-top"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="undercut-gap">Undercut Gap</Label>
            <Input
              id="undercut-gap"
              value={f.undercutGap || ""}
              onChange={(e) =>
                onChange({ ...opening, frame: { ...f, undercutGap: e.target.value } })
              }
              placeholder="e.g. 3/4&quot;"
              data-testid="input-frame-undercut-gap"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reveal-uniformity">Reveal Uniformity</Label>
            <Select
              value={f.revealUniformity || ""}
              onValueChange={(value) =>
                onChange({ ...opening, frame: { ...f, revealUniformity: value as any } })
              }
            >
              <SelectTrigger id="reveal-uniformity" data-testid="select-frame-reveal-uniformity">
                <SelectValue placeholder="Select uniformity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uniform">Uniform</SelectItem>
                <SelectItem value="non_uniform">Non-Uniform</SelectItem>
                <SelectItem value="not_checked">Not Checked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 space-y-2">
            <Label htmlFor="reveal-notes">Reveal Notes</Label>
            <Textarea
              id="reveal-notes"
              value={f.revealNotes || ""}
              onChange={(e) =>
                onChange({ ...opening, frame: { ...f, revealNotes: e.target.value } })
              }
              placeholder="Notes about reveal conditions..."
              data-testid="textarea-frame-reveal-notes"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const DEVICE_TYPE_LABELS: Record<ElectronicSecurityDeviceType, string> = {
  card_reader: "Card Reader",
  keypad: "Keypad",
  door_contact: "Door Contact",
  rex_device: "REX Device",
  request_to_exit_bar: "Request-to-Exit Bar",
  camera: "Camera",
  intercom: "Intercom",
  power_supply: "Power Supply",
  fire_alarm_interface: "Fire Alarm Interface",
  other: "Other",
};

const DEVICE_TYPES: ElectronicSecurityDeviceType[] = [
  "card_reader",
  "keypad",
  "door_contact",
  "rex_device",
  "request_to_exit_bar",
  "camera",
  "intercom",
  "power_supply",
  "fire_alarm_interface",
  "other",
];

const HINGE_TYPES = ["BB", "FBB", "NRP", "Spring", "Pivot", "Continuous"] as const;
const HINGE_FINISHES = ["US26D", "US3", "US10B", "US4", "US32D", "652", "628", "630"] as const;

interface HingePiece {
  type: string;
  finish: string;
  qty: number;
  description?: string;
}

function HardwareStep({ opening, onChange, errors }: StepProps) {
  const hw = opening.hardware;
  const electronicSecurity = hw.electronicSecurity || [];
  const hinges = hw.hinges || [];

  const addHinge = () => {
    const newHinge: HingePiece = {
      type: "hinge",
      finish: "US26D",
      qty: 3,
      description: "4-1/2\" x 4-1/2\" Ball Bearing",
    };
    onChange({
      ...opening,
      hardware: {
        ...hw,
        hinges: [...hinges, { type: "hinge", description: newHinge.description || "", qty: newHinge.qty }],
      },
    });
  };

  const removeHinge = (index: number) => {
    const updated = hinges.filter((_, i) => i !== index);
    onChange({
      ...opening,
      hardware: { ...hw, hinges: updated },
    });
  };

  const updateHinge = (index: number, updates: Partial<typeof hinges[0]>) => {
    const updated = hinges.map((hinge, i) =>
      i === index ? { ...hinge, ...updates } : hinge
    );
    onChange({
      ...opening,
      hardware: { ...hw, hinges: updated },
    });
  };

  const addDevice = () => {
    const newDevice: ElectronicSecurityDevice = {
      type: "card_reader",
      description: "",
      qty: 1,
      monitored: false,
    };
    onChange({
      ...opening,
      hardware: {
        ...hw,
        electronicSecurity: [...electronicSecurity, newDevice],
      },
    });
  };

  const removeDevice = (index: number) => {
    const updated = electronicSecurity.filter((_, i) => i !== index);
    onChange({
      ...opening,
      hardware: { ...hw, electronicSecurity: updated },
    });
  };

  const updateDevice = (index: number, updates: Partial<ElectronicSecurityDevice>) => {
    const updated = electronicSecurity.map((device, i) =>
      i === index ? { ...device, ...updates } : device
    );
    onChange({
      ...opening,
      hardware: { ...hw, electronicSecurity: updated },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <div>
          <h4 className="text-base sm:text-lg font-semibold">Hinges</h4>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Add hinges for this opening (typically 3 hinges for standard doors, 4 for heavy/tall doors).
          </p>
        </div>

        {hinges.map((hinge, index) => (
          <Card key={index} data-testid={`card-hinge-${index}`}>
            <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor={`hinge-type-${index}`}>Hinge Type</Label>
                  <Select
                    value={hinge.description?.split(" ")[0] || "BB"}
                    onValueChange={(value) => {
                      const size = hinge.description?.match(/\d+-\d+\/\d+"/)?.[0] || '4-1/2"';
                      updateHinge(index, { description: `${value} ${size} Hinge` });
                    }}
                  >
                    <SelectTrigger id={`hinge-type-${index}`} data-testid={`select-hinge-type-${index}`}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {HINGE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "BB" ? "Ball Bearing" : 
                           type === "FBB" ? "Full Mortise BB" :
                           type === "NRP" ? "Non-Removable Pin" :
                           type === "Spring" ? "Spring Hinge" :
                           type === "Pivot" ? "Pivot Hinge" :
                           "Continuous Hinge"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`hinge-desc-${index}`}>Description</Label>
                  <Input
                    id={`hinge-desc-${index}`}
                    value={hinge.description || ""}
                    onChange={(e) => updateHinge(index, { description: e.target.value })}
                    placeholder='e.g., 4-1/2" x 4-1/2" BB'
                    data-testid={`input-hinge-desc-${index}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`hinge-qty-${index}`}>Qty</Label>
                  <Input
                    id={`hinge-qty-${index}`}
                    type="number"
                    min={1}
                    value={hinge.qty || 3}
                    onChange={(e) => updateHinge(index, { qty: Number(e.target.value) || 3 })}
                    data-testid={`input-hinge-qty-${index}`}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeHinge(index)}
                    data-testid={`button-remove-hinge-${index}`}
                    className="text-xs sm:text-sm"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHinge}
          data-testid="button-add-hinge"
          className="text-xs sm:text-sm"
        >
          + Add Hinge
        </Button>
      </div>

      <Separator />

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lock-function">Lock Function</Label>
          <Select
            value={hw.lockFunction}
            onValueChange={(value) =>
              onChange({
                ...opening,
                hardware: { ...hw, lockFunction: value },
              })
            }
          >
            <SelectTrigger id="lock-function" data-testid="select-lock-function">
              <SelectValue placeholder="Select lock function" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="F01">F01 - Passage</SelectItem>
              <SelectItem value="F02">F02 - Privacy</SelectItem>
              <SelectItem value="F05">F05 - Entry</SelectItem>
              <SelectItem value="F07">F07 - Classroom</SelectItem>
              <SelectItem value="F08">F08 - Storeroom</SelectItem>
              <SelectItem value="F09">F09 - Hotel/Motel</SelectItem>
              <SelectItem value="F10">F10 - Vestibule</SelectItem>
              <SelectItem value="F13">F13 - Inst. Privacy</SelectItem>
              <SelectItem value="F40">F40 - Office Lock</SelectItem>
            </SelectContent>
          </Select>
          <FieldError field="lockFunction" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lockset">Lockset</Label>
          <Input
            id="lockset"
            value={hw.lockset}
            onChange={(e) =>
              onChange({
                ...opening,
                hardware: { ...hw, lockset: e.target.value },
              })
            }
            placeholder="e.g., Schlage ND80PD"
            data-testid="input-lockset"
          />
          <FieldError field="lockset" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exit-device">Exit Device</Label>
          <Input
            id="exit-device"
            value={hw.exitDevice || ""}
            onChange={(e) =>
              onChange({
                ...opening,
                hardware: { ...hw, exitDevice: e.target.value },
              })
            }
            placeholder="e.g., Von Duprin 98-NL"
            data-testid="input-exit-device"
          />
          <FieldError field="exitDevice" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="closer">Door Closer</Label>
          <Input
            id="closer"
            value={hw.closer || ""}
            onChange={(e) =>
              onChange({
                ...opening,
                hardware: { ...hw, closer: e.target.value },
              })
            }
            placeholder="e.g., LCN 4040XP"
            data-testid="input-closer"
          />
          <FieldError field="closer" errors={errors} />
        </div>
      </div>

      <Separator />

      <div className="space-y-3 sm:space-y-4">
        <div>
          <h4 className="text-base sm:text-lg font-semibold">Division 28 - Electronic Safety & Security</h4>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            <span className="hidden sm:inline">Add electronic security devices such as card readers, keypads, door contacts, REX devices, cameras, intercoms, and other access control equipment.</span>
            <span className="sm:hidden">Add electronic security devices for this opening.</span>
          </p>
        </div>

        {electronicSecurity.map((device, index) => (
          <Card key={index} data-testid={`card-device-${index}`}>
            <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor={`device-type-${index}`}>Device Type</Label>
                  <Select
                    value={device.type}
                    onValueChange={(value) =>
                      updateDevice(index, { type: value as ElectronicSecurityDeviceType })
                    }
                  >
                    <SelectTrigger
                      id={`device-type-${index}`}
                      data-testid={`select-device-type-${index}`}
                    >
                      <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {DEVICE_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`device-description-${index}`}>Description</Label>
                  <Input
                    id={`device-description-${index}`}
                    value={device.description}
                    onChange={(e) => updateDevice(index, { description: e.target.value })}
                    placeholder="Device description"
                    data-testid={`input-device-description-${index}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`device-qty-${index}`}>Qty</Label>
                  <Input
                    id={`device-qty-${index}`}
                    type="number"
                    min={1}
                    value={device.qty || 1}
                    onChange={(e) => updateDevice(index, { qty: Number(e.target.value) || 1 })}
                    data-testid={`input-device-qty-${index}`}
                  />
                </div>

                <div className="flex items-end gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`device-monitored-${index}`}
                      checked={device.monitored || false}
                      onCheckedChange={(checked) => updateDevice(index, { monitored: checked })}
                      data-testid={`switch-device-monitored-${index}`}
                    />
                    <Label htmlFor={`device-monitored-${index}`} className="text-xs sm:text-sm">
                      Monitored
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDevice(index)}
                    data-testid={`button-remove-device-${index}`}
                    className="text-xs sm:text-sm"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDevice}
          data-testid="button-add-div28-device"
          className="text-xs sm:text-sm"
        >
          + Add <span className="hidden sm:inline">Division 28 </span>Device
        </Button>
      </div>

      <Separator />

      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base sm:text-lg font-semibold">Div 28 Opportunity Assessment</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Enable to assess security opportunities and generate proposal text
            </p>
          </div>
          <Switch
            id="div28-enabled"
            checked={opening.div28Assessment?.enabled || false}
            onCheckedChange={(checked) =>
              onChange({
                ...opening,
                div28Assessment: { ...opening.div28Assessment, enabled: checked },
              })
            }
            data-testid="switch-div28-enabled"
          />
        </div>

        {opening.div28Assessment?.enabled && (
          <Card>
            <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 space-y-4">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="area-classification">Area Classification</Label>
                  <Select
                    value={opening.div28Assessment?.areaClassification || ""}
                    onValueChange={(value) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, areaClassification: value },
                      })
                    }
                  >
                    <SelectTrigger id="area-classification" data-testid="select-area-classification">
                      <SelectValue placeholder="Select area type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public_lobby">Public Lobby</SelectItem>
                      <SelectItem value="restricted">Restricted Access</SelectItem>
                      <SelectItem value="high_security">High Security</SelectItem>
                      <SelectItem value="emergency_egress">Emergency Egress</SelectItem>
                      <SelectItem value="loading_dock">Loading Dock</SelectItem>
                      <SelectItem value="server_room">Server/Data Room</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy/Controlled</SelectItem>
                      <SelectItem value="behavioral_health">Behavioral Health</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="traffic-level">Traffic Level</Label>
                  <Select
                    value={opening.div28Assessment?.trafficLevel || ""}
                    onValueChange={(value) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, trafficLevel: value },
                      })
                    }
                  >
                    <SelectTrigger id="traffic-level" data-testid="select-traffic-level">
                      <SelectValue placeholder="Select traffic level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low (under 50/day)</SelectItem>
                      <SelectItem value="MEDIUM">Medium (50-200/day)</SelectItem>
                      <SelectItem value="HIGH">High (over 200/day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security-level">Security Level</Label>
                  <Select
                    value={opening.div28Assessment?.securityLevel || ""}
                    onValueChange={(value) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, securityLevel: value },
                      })
                    }
                  >
                    <SelectTrigger id="security-level" data-testid="select-security-level">
                      <SelectValue placeholder="Select security level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Basic</SelectItem>
                      <SelectItem value="MEDIUM">Standard</SelectItem>
                      <SelectItem value="HIGH">Enhanced</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="access-control-needed"
                    checked={opening.div28Assessment?.accessControlNeeded || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, accessControlNeeded: checked },
                      })
                    }
                    data-testid="switch-access-control"
                  />
                  <Label htmlFor="access-control-needed" className="text-sm">Access Control</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="door-automation-needed"
                    checked={opening.div28Assessment?.doorAutomationNeeded || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, doorAutomationNeeded: checked },
                      })
                    }
                    data-testid="switch-door-automation"
                  />
                  <Label htmlFor="door-automation-needed" className="text-sm">Door Automation</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="delayed-egress-needed"
                    checked={opening.div28Assessment?.delayedEgressNeeded || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, delayedEgressNeeded: checked },
                      })
                    }
                    data-testid="switch-delayed-egress"
                  />
                  <Label htmlFor="delayed-egress-needed" className="text-sm">Delayed Egress</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="surveillance-needed"
                    checked={opening.div28Assessment?.surveillanceNeeded || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, surveillanceNeeded: checked },
                      })
                    }
                    data-testid="switch-surveillance"
                  />
                  <Label htmlFor="surveillance-needed" className="text-sm">Surveillance</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="intrusion-detection-needed"
                    checked={opening.div28Assessment?.intrusionDetectionNeeded || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, intrusionDetectionNeeded: checked },
                      })
                    }
                    data-testid="switch-intrusion"
                  />
                  <Label htmlFor="intrusion-detection-needed" className="text-sm">Intrusion Detection</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="lockdown-control-needed"
                    checked={opening.div28Assessment?.lockdownControlNeeded || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...opening,
                        div28Assessment: { ...opening.div28Assessment, enabled: true, lockdownControlNeeded: checked },
                      })
                    }
                    data-testid="switch-lockdown"
                  />
                  <Label htmlFor="lockdown-control-needed" className="text-sm">Lockdown Control</Label>
                </div>
              </div>

              {opening.div28Assessment?.score !== undefined && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Opportunity Score</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{opening.div28Assessment.score}</span>
                      <Badge variant={opening.div28Assessment.tier === "HIGH" ? "default" : "secondary"}>
                        {opening.div28Assessment.tier}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface ComplianceStepProps extends StepProps {
  project: DoorSurveyProject;
}

const ALL_STANDARDS: BuildingCodeStandard[] = ["ADA", "IBC", "NFPA", "ANSI_SDI", "LOCAL", "DIV08", "DIV28"];

const STANDARD_LABELS: Record<BuildingCodeStandard, string> = {
  ADA: "ADA",
  IBC: "IBC",
  NFPA: "NFPA",
  ANSI_SDI: "ANSI/SDI",
  LOCAL: "LOCAL",
  DIV08: "DIV08",
  DIV28: "DIV28",
};

interface AIComplianceResult {
  summary: string;
  violations: Array<{
    ruleId: string;
    severity: "critical" | "warning" | "info";
    description: string;
    citation?: string;
    recommendation?: string;
  }>;
  compliantAreas: string[];
  missingInputs: string[];
  citations: string[];
  ragResults?: Array<{
    codeType: string;
    section: string;
    title: string;
    chunk: string;
    similarity: number;
    page?: number;
  }>;
}

function ComplianceStep({ opening, project, onChange, errors }: ComplianceStepProps) {
  const c = opening.compliance;
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<AIComplianceResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleStandard = (std: BuildingCodeStandard) => {
    const exists = c.standardsChecked.includes(std);
    const updatedStandards = exists
      ? c.standardsChecked.filter((s) => s !== std)
      : [...c.standardsChecked, std];
    onChange({
      ...opening,
      compliance: { ...c, standardsChecked: updatedStandards },
    });
  };

  const runAiComplianceCheck = async () => {
    setIsAiChecking(true);
    setAiError(null);

    try {
      const response = await fetch("/api/compliance/check-with-citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opening: {
            id: opening.doorTag,
            fireRating: opening.doorLeaf.fireRatingMinutes,
            clearWidth: opening.measurements.clearWidthMm,
            roughWidth: opening.measurements.roughWidthMm,
            roughHeight: opening.measurements.roughHeightMm,
            doorThickness: opening.measurements.doorThicknessMm,
            openingType: opening.openingType,
            handing: opening.handing,
            hardware: opening.hardware,
            adaRequired: project.standards.includes("ADA"),
            buildingType: project.buildingType,
          },
          query: `Check compliance for ${opening.openingType} door with ${opening.doorLeaf.fireRatingMinutes} minute fire rating, clear width ${opening.measurements.clearWidthMm}mm`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Compliance check failed: ${response.statusText}`);
      }

      const result: AIComplianceResult = await response.json();
      setAiResult(result);

      const criticalCount = result.violations.filter(v => v.severity === "critical").length;
      const warningCount = result.violations.filter(v => v.severity === "warning").length;

      const issues = result.violations.map(v => ({
        standard: v.ruleId.split("-")[0] as BuildingCodeStandard,
        codeRef: v.ruleId,
        message: v.description,
        severity: v.severity,
      }));

      onChange({
        ...opening,
        compliance: {
          ...c,
          passes: criticalCount === 0,
          issues: issues as any,
          notes: c.notes + (c.notes ? "\n\n" : "") + `AI Compliance Check: ${result.summary}`,
        },
      });

      toast({
        title: criticalCount === 0 ? "Compliance Check Passed" : "Compliance Issues Found",
        description: criticalCount === 0 
          ? `${result.compliantAreas.length} areas verified compliant`
          : `${criticalCount} critical, ${warningCount} warning issues found`,
        variant: criticalCount > 0 ? "destructive" : "default",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setAiError(message);
      toast({
        title: "AI Compliance Check Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAiChecking(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {project.jurisdiction && project.jurisdiction.confidence !== "low" && (
        <Card data-testid="card-jurisdiction-info">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" data-testid="text-jurisdiction-state">
                    {project.jurisdiction.stateName || project.jurisdiction.state}
                    {project.jurisdiction.city ? ` — ${project.jurisdiction.city}` : ""}
                  </span>
                  <Badge variant="outline" className="text-xs" data-testid="badge-jurisdiction-code">
                    {project.jurisdiction.jurisdictionCode}
                  </Badge>
                  <Badge variant="secondary" className="text-xs" data-testid="badge-ibc-edition">
                    IBC {project.jurisdiction.ibcEdition}
                  </Badge>
                  {project.jurisdiction.localCodeName && (
                    <Badge variant="secondary" className="text-xs" data-testid="badge-local-code">
                      {project.jurisdiction.localCodeName}
                    </Badge>
                  )}
                </div>
                {project.jurisdiction.localAmendments.length > 0 && (
                  <div className="text-xs text-muted-foreground" data-testid="text-amendments">
                    Key amendments: {project.jurisdiction.localAmendments.slice(0, 3).join(" | ")}
                    {project.jurisdiction.localAmendments.length > 3 && ` (+${project.jurisdiction.localAmendments.length - 3} more)`}
                  </div>
                )}
                {project.jurisdiction.userOverridden && (
                  <p className="text-xs text-amber-600">Standards manually adjusted from auto-detected defaults</p>
                )}
                {project.jurisdiction.ahj && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-compliance-ahj">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span>AHJ: {project.jurisdiction.ahj.name} &bull; {project.jurisdiction.ahj.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 p-3 sm:p-4 rounded-lg bg-muted flex-1 min-w-0">
          {c.passes ? (
            <>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
              <span className="font-medium text-green-600 text-sm sm:text-base">Compliance Check Passed</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
              <span className="font-medium text-amber-600 text-sm sm:text-base">Compliance Issues Found</span>
            </>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={runAiComplianceCheck}
          disabled={isAiChecking}
          data-testid="button-run-ai-compliance"
          className="text-xs sm:text-sm shrink-0"
        >
          {isAiChecking ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin shrink-0" />
              Checking...
            </>
          ) : (
            <><span className="hidden sm:inline">Run AI Compliance </span>Check</>
          )}
        </Button>
      </div>

      {aiError && (
        <div className="p-4 rounded-lg border border-destructive bg-destructive/10 text-destructive" data-testid="ai-compliance-error">
          <p className="text-sm font-medium">AI Check Error: {aiError}</p>
        </div>
      )}

      {aiResult && (
        <Card data-testid="card-ai-compliance-result">
          <CardContent className="pt-4 space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">AI Assessment Summary</h4>
              <p className="mt-1" data-testid="text-ai-summary">{aiResult.summary}</p>
            </div>

            {aiResult.compliantAreas.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Compliant Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {aiResult.compliantAreas.map((area, idx) => (
                    <Badge key={idx} variant="outline" className="text-green-600 border-green-600" data-testid={`badge-compliant-${idx}`}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {aiResult.missingInputs.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Missing Information</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {aiResult.missingInputs.map((input, idx) => (
                    <li key={idx} data-testid={`text-missing-${idx}`}>{input}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult.ragResults && aiResult.ragResults.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Referenced Code Sections</h4>
                <div className="space-y-2">
                  {aiResult.ragResults.slice(0, 3).map((rag, idx) => (
                    <div key={idx} className="text-sm p-2 rounded bg-muted" data-testid={`rag-result-${idx}`}>
                      <span className="font-medium">{rag.codeType} {rag.section}</span>
                      <span className="text-muted-foreground ml-2">({Math.round(rag.similarity * 100)}% match)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label className="text-sm">Toggle Standards to Check</Label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {ALL_STANDARDS.map((std) => (
            <Button
              key={std}
              type="button"
              variant={c.standardsChecked.includes(std) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStandard(std)}
              data-testid={`button-toggle-${std}`}
              className="text-xs sm:text-sm"
            >
              {STANDARD_LABELS[std]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Standards Checked</Label>
        <div className="flex flex-wrap gap-2">
          {c.standardsChecked.map((std) => (
            <Badge key={std} variant="secondary" data-testid={`badge-checked-${std}`}>
              {STANDARD_LABELS[std]}
            </Badge>
          ))}
        </div>
      </div>

      {c.issues.length > 0 && (
        <div className="space-y-2">
          <Label>Issues</Label>
          <div className="space-y-2">
            {c.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  issue.severity === "critical"
                    ? "border-destructive bg-destructive/10"
                    : issue.severity === "warning"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                    : "border-muted bg-muted"
                }`}
                data-testid={`compliance-issue-${idx}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={issue.severity === "critical" ? "destructive" : "outline"}>
                    {issue.standard}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{issue.codeRef}</span>
                </div>
                <p className="text-sm">{issue.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="compliance-notes">Notes</Label>
        <Textarea
          id="compliance-notes"
          value={c.notes || ""}
          onChange={(e) =>
            onChange({
              ...opening,
              compliance: { ...c, notes: e.target.value },
            })
          }
          placeholder="Additional compliance notes or exceptions..."
          data-testid="textarea-compliance-notes"
        />
        <FieldError field="notes" errors={errors} />
      </div>
    </div>
  );
}

function EvidenceStep({ opening, onChange, errors }: StepProps) {
  const e = opening.evidence;

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-xs sm:text-sm text-muted-foreground">
        Capture photos and documents for engineering review and record keeping.
      </p>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-dashed">
          <CardContent className="p-4 sm:pt-6">
            <div className="text-center space-y-2">
              <Camera className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground" />
              <p className="font-medium text-sm sm:text-base">Photos</p>
              <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-photo-count">
                {e.photos.length} photos captured
              </p>
              <Button variant="outline" size="sm" data-testid="button-add-photo" className="text-xs sm:text-sm">
                Add Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="p-4 sm:pt-6">
            <div className="text-center space-y-2">
              <Camera className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground" />
              <p className="font-medium text-sm sm:text-base">Videos</p>
              <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-video-count">
                {e.videos.length} videos captured
              </p>
              <Button variant="outline" size="sm" data-testid="button-add-video" className="text-xs sm:text-sm">
                Add Video
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="p-4 sm:pt-6">
            <div className="text-center space-y-2">
              <ClipboardCheck className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground" />
              <p className="font-medium text-sm sm:text-base">Documents</p>
              <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-document-count">
                {e.documents.length} documents attached
              </p>
              <Button variant="outline" size="sm" data-testid="button-add-document" className="text-xs sm:text-sm">
                Add Document
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EngineeringStep({ opening, onChange, errors }: StepProps) {
  const er = opening.engineeringReview;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="space-y-2">
        <Label htmlFor="review-status">Review Status</Label>
        <Select
          value={er.status}
          onValueChange={(value) =>
            onChange({
              ...opening,
              engineeringReview: { ...er, status: value as typeof er.status },
            })
          }
        >
          <SelectTrigger id="review-status" data-testid="select-review-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="changes_required">Changes Required</SelectItem>
          </SelectContent>
        </Select>
        <FieldError field="status" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="engineering-notes">Engineering Notes</Label>
        <Textarea
          id="engineering-notes"
          value={er.notes || ""}
          onChange={(e) =>
            onChange({
              ...opening,
              engineeringReview: { ...er, notes: e.target.value },
            })
          }
          placeholder="Notes for engineering team..."
          data-testid="textarea-engineering-notes"
        />
        <FieldError field="notes" errors={errors} />
      </div>

      {er.conflicts.length > 0 && (
        <div className="space-y-2">
          <Label>Identified Conflicts</Label>
          <div className="space-y-2">
            {er.conflicts.map((conflict, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                data-testid={`engineering-conflict-${idx}`}
              >
                <Badge variant="outline" className="mb-2">
                  {conflict.type}
                </Badge>
                <p className="text-sm">{conflict.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuoteStep({ opening, onChange, errors }: StepProps) {
  const qs = opening.quoteSummary;

  const calculateTotal = () => {
    const subtotal = qs.materialCost + qs.laborCost + qs.shippingCost;
    const margin = subtotal * (qs.marginPercent / 100);
    return subtotal + margin;
  };

  const updateAndRecalculate = (field: keyof typeof qs, value: number | string) => {
    const updated = { ...qs, [field]: value };
    const subtotal = updated.materialCost + updated.laborCost + updated.shippingCost;
    const margin = subtotal * (updated.marginPercent / 100);
    updated.totalPrice = subtotal + margin;
    onChange({
      ...opening,
      quoteSummary: updated,
    });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="material-cost">Material Cost ($)</Label>
          <Input
            id="material-cost"
            type="number"
            value={qs.materialCost || ""}
            onChange={(e) => updateAndRecalculate("materialCost", Number(e.target.value))}
            data-testid="input-material-cost"
            className={errors?.materialCost ? "border-destructive" : ""}
          />
          <FieldError field="materialCost" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="labor-cost">Labor Cost ($)</Label>
          <Input
            id="labor-cost"
            type="number"
            value={qs.laborCost || ""}
            onChange={(e) => updateAndRecalculate("laborCost", Number(e.target.value))}
            data-testid="input-labor-cost"
            className={errors?.laborCost ? "border-destructive" : ""}
          />
          <FieldError field="laborCost" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shipping-cost">Shipping Cost ($)</Label>
          <Input
            id="shipping-cost"
            type="number"
            value={qs.shippingCost || ""}
            onChange={(e) => updateAndRecalculate("shippingCost", Number(e.target.value))}
            data-testid="input-shipping-cost"
            className={errors?.shippingCost ? "border-destructive" : ""}
          />
          <FieldError field="shippingCost" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="margin-percent">Margin (%)</Label>
          <Input
            id="margin-percent"
            type="number"
            value={qs.marginPercent || ""}
            onChange={(e) => updateAndRecalculate("marginPercent", Number(e.target.value))}
            data-testid="input-margin-percent"
            className={errors?.marginPercent ? "border-destructive" : ""}
          />
          <FieldError field="marginPercent" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="option-label">Option Label</Label>
          <Select
            value={qs.optionLabel}
            onValueChange={(value) =>
              onChange({
                ...opening,
                quoteSummary: { ...qs, optionLabel: value },
              })
            }
          >
            <SelectTrigger id="option-label" data-testid="select-option-label">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Base">Base</SelectItem>
              <SelectItem value="Option A">Option A</SelectItem>
              <SelectItem value="Option B">Option B</SelectItem>
              <SelectItem value="Premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <FieldError field="optionLabel" errors={errors} />
        </div>
      </div>

      <Separator />

      <div className="flex justify-between items-center p-3 sm:p-4 bg-muted rounded-lg">
        <span className="text-base sm:text-lg font-medium">Total Price</span>
        <span className="text-xl sm:text-2xl font-bold" data-testid="text-total-price">
          ${calculateTotal().toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

interface ReviewStepProps {
  project: DoorSurveyProject;
  opening: DoorOpeningInput;
}

function ReviewStep({ project, opening }: ReviewStepProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const payload = {
        project,
        opening,
      };

      const response = await fetch("/api/door-surveys/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `door-survey-${opening.doorTag || "report"}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF Exported",
        description: "Door survey report has been downloaded successfully.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Export Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h3 className="text-base sm:text-lg font-semibold">Project Details</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isExporting}
          data-testid="button-export-pdf"
          className="text-xs sm:text-sm shrink-0"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin shrink-0" />
              Exporting...
            </>
          ) : (
            <>Export<span className="hidden sm:inline"> to PDF</span></>
          )}
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="text-sm" data-testid="review-project-name">
          <span className="text-muted-foreground">Name:</span> {project.name || "—"}
        </div>
        <div className="text-sm" data-testid="review-project-location">
          <span className="text-muted-foreground">Location:</span> {project.location || "—"}
        </div>
        <div className="text-sm" data-testid="review-building-type">
          <span className="text-muted-foreground">Building Type:</span> {project.buildingType}
        </div>
        <div className="text-sm" data-testid="review-standards">
          <span className="text-muted-foreground">Standards:</span>{" "}
          {project.standards.join(", ")}
        </div>
        {project.jurisdiction && project.jurisdiction.confidence !== "low" && (
          <div className="text-sm" data-testid="review-jurisdiction">
            <span className="text-muted-foreground">Jurisdiction:</span>{" "}
            {project.jurisdiction.stateName || project.jurisdiction.state}
            {project.jurisdiction.city ? ` (${project.jurisdiction.city})` : ""}{" "}
            — IBC {project.jurisdiction.ibcEdition}
            {project.jurisdiction.localCodeName ? ` / ${project.jurisdiction.localCodeName}` : ""}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Opening Details</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="text-sm" data-testid="review-door-tag">
            <span className="text-muted-foreground">Door Tag:</span> {opening.doorTag || "—"}
          </div>
          {opening.openingName && (
            <div className="text-sm" data-testid="review-opening-name">
              <span className="text-muted-foreground">Opening Name:</span> {opening.openingName}
            </div>
          )}
          {opening.description && (
            <div className="text-sm sm:col-span-2" data-testid="review-description">
              <span className="text-muted-foreground">Description:</span> {opening.description}
            </div>
          )}
          <div className="text-sm" data-testid="review-location">
            <span className="text-muted-foreground">Location:</span>{" "}
            {opening.floor} - {opening.spaceName}
          </div>
          <div className="text-sm" data-testid="review-opening-type">
            <span className="text-muted-foreground">Type:</span> {opening.openingType} ({opening.handing})
          </div>
          <div className="text-sm" data-testid="review-fire-rating">
            <span className="text-muted-foreground">Fire Rating:</span>{" "}
            {opening.doorLeaf.fireRatingMinutes > 0
              ? `${opening.doorLeaf.fireRatingMinutes} min`
              : "Non-Rated"}
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Measurements</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="text-sm" data-testid="review-rough-width">
            <span className="text-muted-foreground">Rough Width:</span>{" "}
            {opening.measurements.roughWidthMm} mm
          </div>
          <div className="text-sm" data-testid="review-rough-height">
            <span className="text-muted-foreground">Rough Height:</span>{" "}
            {opening.measurements.roughHeightMm} mm
          </div>
          <div className="text-sm" data-testid="review-clear-width">
            <span className="text-muted-foreground">Clear Width:</span>{" "}
            {opening.measurements.clearWidthMm} mm
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Quote Summary</h3>
        <div className="p-3 sm:p-4 bg-muted rounded-lg">
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 text-xs sm:text-sm">
            <div data-testid="review-material-cost">
              <span className="text-muted-foreground">Materials:</span>{" "}
              ${opening.quoteSummary.materialCost.toLocaleString()}
            </div>
            <div data-testid="review-labor-cost">
              <span className="text-muted-foreground">Labor:</span>{" "}
              ${opening.quoteSummary.laborCost.toLocaleString()}
            </div>
            <div data-testid="review-shipping-cost">
              <span className="text-muted-foreground">Shipping:</span>{" "}
              ${opening.quoteSummary.shippingCost.toLocaleString()}
            </div>
            <div className="font-bold" data-testid="review-total-price">
              <span className="text-muted-foreground">Total:</span>{" "}
              ${opening.quoteSummary.totalPrice.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-2 p-3 sm:p-4 rounded-lg bg-muted" data-testid="review-compliance-status">
        {opening.compliance.passes ? (
          <>
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
            <span className="text-green-600 text-sm sm:text-base">All compliance checks passed</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
            <span className="text-amber-600 text-sm sm:text-base">
              {opening.compliance.issues.length} compliance issue(s) found
            </span>
          </>
        )}
      </div>

      {opening.div28Assessment?.enabled && (
        <>
          <Separator />
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Division 28 Opportunity Assessment</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {opening.div28Assessment.areaClassification && (
                <div className="text-sm" data-testid="review-div28-area">
                  <span className="text-muted-foreground">Area:</span> {formatAreaClassification(opening.div28Assessment.areaClassification)}
                </div>
              )}
              {opening.div28Assessment.trafficLevel && (
                <div className="text-sm" data-testid="review-div28-traffic">
                  <span className="text-muted-foreground">Traffic:</span> {formatTrafficLevel(opening.div28Assessment.trafficLevel)}
                </div>
              )}
              {opening.div28Assessment.securityLevel && (
                <div className="text-sm" data-testid="review-div28-security">
                  <span className="text-muted-foreground">Security Level:</span> {formatSecurityLevel(opening.div28Assessment.securityLevel)}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {opening.div28Assessment.accessControlNeeded && (
                <Badge variant="secondary" data-testid="badge-access-control">Access Control</Badge>
              )}
              {opening.div28Assessment.doorAutomationNeeded && (
                <Badge variant="secondary" data-testid="badge-door-automation">Door Automation</Badge>
              )}
              {opening.div28Assessment.delayedEgressNeeded && (
                <Badge variant="secondary" data-testid="badge-delayed-egress">Delayed Egress</Badge>
              )}
              {opening.div28Assessment.surveillanceNeeded && (
                <Badge variant="secondary" data-testid="badge-surveillance">Surveillance</Badge>
              )}
              {opening.div28Assessment.intrusionDetectionNeeded && (
                <Badge variant="secondary" data-testid="badge-intrusion">Intrusion Detection</Badge>
              )}
              {opening.div28Assessment.lockdownControlNeeded && (
                <Badge variant="secondary" data-testid="badge-lockdown">Lockdown Control</Badge>
              )}
            </div>
            {opening.div28Assessment.score !== undefined && (
              <div className="p-3 rounded-lg bg-muted/50 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Opportunity Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" data-testid="review-div28-score">{opening.div28Assessment.score}</span>
                    <Badge variant={opening.div28Assessment.tier === "HIGH" ? "default" : "secondary"} data-testid="review-div28-tier">
                      {opening.div28Assessment.tier}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
