import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMilestoneCelebrations } from "@/hooks/use-milestone-celebrations";
import {
  Upload,
  Scan,
  Play,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  RefreshCw,
  FileDown,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  MessageSquare,
  Zap,
  Ruler,
  Target,
  Crosshair,
  Link2,
  Unlink,
  ArrowLeftRight,
  ArrowRightLeft,
  TriangleAlert,
  CircleDot,
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  Lock,
  Fingerprint,
  ArrowUpDown,
  Hash,
  MapPin,
  Info,
  Layers,
  Paintbrush,
  Square,
  AlertTriangle,
  ClipboardCheck,
  ArrowUp,
  Wind,
  Glasses,
  Pencil,
  Check,
  X,
  Brain,
  CheckCircle,
  Circle,
  Camera,
  Box,
  Grid,
  Download,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LidarScan } from "@shared/schema";
import { useOpeningDetail } from "../context";
import DoorElevationView from "@/components/DoorElevationView";
import PrintCalibrationMarkers from "@/components/PrintCalibrationMarkers";
import HardwareComplianceDetails from "@/components/HardwareComplianceDetails";
import type {
  DoorElevationOverlay,
  DoorElevationOverlayHardwareMarker,
  RuleEvaluationResult
} from "@/types/doorElevationOverlay";

const FIELD_OPTIONS: Record<string, string[]> = {
  "materialIdentification.frameMaterial.type": ["Hollow Metal", "Aluminum", "Wood", "FRP", "Stainless Steel", "Bronze"],
  "materialIdentification.doorMaterial.type": ["Hollow Metal", "Solid Core Wood", "FRP", "Aluminum/Glass", "Stainless Steel", "Mineral Core"],
  "materialIdentification.installationMethod.type": ["Welded", "Knock-Down", "Drywall Slip-On", "Masonry", "Press-Fit"],
  "enhancedRevealDetails.frameProfile.type": ["Single Rabbet", "Double Rabbet", "Cased Opening", "Double Egress", "Drywall"],
  "enhancedRevealDetails.stopType.type": ["Integral", "Applied", "Removable", "None"],
  "conditionAssessment.frameCondition.rating": ["Good", "Fair", "Poor", "Replace"],
  "conditionAssessment.doorCondition.rating": ["Good", "Fair", "Poor", "Replace"],
  "conditionAssessment.hardwareCondition.rating": ["Good", "Fair", "Poor", "Replace"],
};

function OverrideField({
  fieldPath,
  currentValue,
  confidence,
  manualInputRequired,
  learnedAdjustment,
  openingId,
  scanId,
  onOverrideSubmitted,
}: {
  fieldPath: string;
  currentValue: string;
  confidence?: number;
  manualInputRequired: boolean;
  learnedAdjustment?: boolean;
  openingId: string;
  scanId?: string;
  onOverrideSubmitted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selectedValue, setSelectedValue] = useState(currentValue);
  const { toast } = useToast();
  const options = FIELD_OPTIONS[fieldPath];

  const overrideMutation = useMutation({
    mutationFn: async (data: { fieldPath: string; originalValue: any; correctedValue: any; originalConfidence?: number; scanId?: string }) => {
      const res = await apiRequest("POST", `/api/openings/${openingId}/detection-overrides`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Override saved", description: "Your correction has been recorded and will improve future detections." });
      setEditing(false);
      onOverrideSubmitted();
    },
    onError: (err: any) => {
      toast({ title: "Failed to save override", description: err.message, variant: "destructive" });
    },
  });

  if (editing && options) {
    return (
      <div className="flex items-center gap-1" data-testid={`override-edit-${fieldPath}`}>
        <Select value={selectedValue} onValueChange={setSelectedValue}>
          <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]" data-testid={`select-override-${fieldPath}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          disabled={overrideMutation.isPending || selectedValue === currentValue}
          onClick={() => overrideMutation.mutate({
            fieldPath,
            originalValue: currentValue,
            correctedValue: selectedValue,
            originalConfidence: confidence,
            scanId,
          })}
          aria-label="Confirm override"
          data-testid={`button-confirm-override-${fieldPath}`}
        >
          {overrideMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(false); setSelectedValue(currentValue); }} aria-label="Cancel override" data-testid={`button-cancel-override-${fieldPath}`}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (editing && !options) {
    return (
      <div className="flex items-center gap-1" data-testid={`override-edit-${fieldPath}`}>
        <Input
          className="h-7 text-xs w-auto min-w-[120px]"
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          data-testid={`input-override-${fieldPath}`}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          disabled={overrideMutation.isPending || !selectedValue || selectedValue === currentValue}
          onClick={() => overrideMutation.mutate({
            fieldPath,
            originalValue: currentValue,
            correctedValue: selectedValue,
            originalConfidence: confidence,
            scanId,
          })}
          aria-label="Confirm override"
          data-testid={`button-confirm-override-${fieldPath}`}
        >
          {overrideMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(false); setSelectedValue(currentValue); }} aria-label="Cancel override" data-testid={`button-cancel-override-${fieldPath}`}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {learnedAdjustment && (
        <Badge variant="outline" className="text-xs" data-testid={`badge-learned-${fieldPath}`}>
          <Brain className="h-3 w-3 mr-1" />Learned
        </Badge>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5"
        onClick={() => setEditing(true)}
        title="Override this detection"
        aria-label="Override this detection"
        data-testid={`button-override-${fieldPath}`}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface ProcessedMetricsDisplayProps {
  metrics: Record<string, unknown>;
  scores: Record<string, number> | null;
  scanId: string;
}

interface ProcessedMetrics {
  width?: number;
  height?: number;
  frameDepth?: number;
  swingDirection?: string;
  pointCount?: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface OverlayVisibility {
  hardwareMarkers: boolean;
  violations: boolean;
  passes: boolean;
}

const ACCEPTED_FILE_TYPES = [".ply", ".obj", ".json"];
const MAX_FILE_SIZE_MB = 100;

const ProcessedMetricsDisplay = memo(function ProcessedMetricsDisplay({ 
  metrics, 
  scores, 
  scanId 
}: ProcessedMetricsDisplayProps) {
  const m = metrics as ProcessedMetrics;
  const formatPercent = (val: number) => `${(val * 100).toFixed(0)}%`;
  
  return (
    <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
      <h5 className="font-medium">Processed Measurements</h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Width:</span>{" "}
          <span className="font-medium" data-testid={`text-width-${scanId}`}>
            {m.width ?? '-'} mm
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Height:</span>{" "}
          <span className="font-medium" data-testid={`text-height-${scanId}`}>
            {m.height ?? '-'} mm
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Frame Depth:</span>{" "}
          <span className="font-medium" data-testid={`text-depth-${scanId}`}>
            {m.frameDepth ?? '-'} mm
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Swing:</span>{" "}
          <span className="font-medium" data-testid={`text-swing-${scanId}`}>
            {m.swingDirection ?? '-'}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Points:</span>{" "}
          <span className="font-medium">
            {m.pointCount?.toLocaleString() ?? '-'}
          </span>
        </div>
      </div>

      {scores && (
        <div className="mt-3">
          <h6 className="text-sm font-medium mb-2">Confidence Scores</h6>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>Overall: {formatPercent(scores.overall)}</div>
            <div>Width: {formatPercent(scores.width)}</div>
            <div>Height: {formatPercent(scores.height)}</div>
            <div>Depth: {formatPercent(scores.frameDepth)}</div>
          </div>
        </div>
      )}
    </div>
  );
});

interface ComplianceApiResponse {
  overlay: DoorElevationOverlay;
  violations: RuleEvaluationResult[];
  passes: RuleEvaluationResult[];
}

interface OverlayControlsProps {
  visibility: OverlayVisibility;
  onToggle: (key: keyof OverlayVisibility) => void;
}

const OverlayControls = memo(function OverlayControls({ visibility, onToggle }: OverlayControlsProps) {
  return (
    <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-md">
      <div className="flex items-center gap-2">
        <Switch
          id="toggle-hardware"
          checked={visibility.hardwareMarkers}
          onCheckedChange={() => onToggle("hardwareMarkers")}
          data-testid="switch-toggle-hardware"
        />
        <Label htmlFor="toggle-hardware" className="text-sm cursor-pointer">
          Hardware Markers
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="toggle-violations"
          checked={visibility.violations}
          onCheckedChange={() => onToggle("violations")}
          data-testid="switch-toggle-violations"
        />
        <Label htmlFor="toggle-violations" className="text-sm cursor-pointer text-destructive">
          Violations
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="toggle-passes"
          checked={visibility.passes}
          onCheckedChange={() => onToggle("passes")}
          data-testid="switch-toggle-passes"
        />
        <Label htmlFor="toggle-passes" className="text-sm cursor-pointer text-green-600 dark:text-green-400">
          Passes
        </Label>
      </div>
    </div>
  );
});

const LidarComplianceVisualization = memo(function LidarComplianceVisualization({ 
  openingId 
}: { 
  openingId: string 
}) {
  const { toast } = useToast();
  const [selectedMarker, setSelectedMarker] = useState<DoorElevationOverlayHardwareMarker | null>(null);
  const [overlayVisibility, setOverlayVisibility] = useState<OverlayVisibility>({
    hardwareMarkers: true,
    violations: true,
    passes: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  const complianceQuery = useQuery<ComplianceApiResponse>({
    queryKey: ['/api/openings', openingId, 'lidar-compliance'],
    enabled: !!openingId,
    staleTime: 30000,
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/openings', openingId, 'lidar-compliance'] });
  }, [openingId]);

  const handleMarkerClick = useCallback((marker: DoorElevationOverlayHardwareMarker) => {
    setSelectedMarker(marker);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  const handleToggleVisibility = useCallback((key: keyof OverlayVisibility) => {
    setOverlayVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/openings/${openingId}/compliance-report`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${openingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF exported",
        description: "Compliance report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [openingId, toast]);

  const allEvaluations = useMemo(() => {
    if (!complianceQuery.data) return [];
    return [...complianceQuery.data.violations, ...complianceQuery.data.passes];
  }, [complianceQuery.data]);

  const filteredOverlay = useMemo(() => {
    if (!complianceQuery.data?.overlay) return null;
    const overlay = complianceQuery.data.overlay;
    
    return {
      ...overlay,
      markers: overlayVisibility.hardwareMarkers ? overlay.markers : [],
    };
  }, [complianceQuery.data?.overlay, overlayVisibility.hardwareMarkers]);

  const filteredViolations = useMemo(() => {
    if (!overlayVisibility.violations) return [];
    return complianceQuery.data?.violations || [];
  }, [complianceQuery.data?.violations, overlayVisibility.violations]);

  const filteredPasses = useMemo(() => {
    if (!overlayVisibility.passes) return [];
    return complianceQuery.data?.passes || [];
  }, [complianceQuery.data?.passes, overlayVisibility.passes]);

  if (complianceQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Loading compliance analysis...</p>
        </CardContent>
      </Card>
    );
  }

  if (complianceQuery.isError || !complianceQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No LiDAR compliance data available for this opening.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload and process a LiDAR scan to see compliance results.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { violations, passes } = complianceQuery.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            LiDAR Compliance Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting}
              data-testid="button-export-pdf"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Export PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              data-testid="button-refresh-compliance"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <OverlayControls 
          visibility={overlayVisibility} 
          onToggle={handleToggleVisibility}
        />

        <div className="flex gap-3 flex-wrap">
          {violations.length > 0 && (
            <Badge variant="destructive" data-testid="badge-violations-count">
              {violations.length} Violation{violations.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {passes.length > 0 && (
            <Badge variant="default" className="bg-green-600" data-testid="badge-passes-count">
              {passes.length} Pass{passes.length !== 1 ? 'es' : ''}
            </Badge>
          )}
        </div>

        {filteredOverlay && (
          <div className="border rounded-lg p-4 bg-background">
            <DoorElevationView
              overlay={filteredOverlay}
              onMarkerClick={handleMarkerClick}
            />
          </div>
        )}

        {selectedMarker && (
          <HardwareComplianceDetails
            marker={selectedMarker}
            evaluations={allEvaluations}
            onClose={handleCloseDetails}
          />
        )}

        {(filteredViolations.length > 0 || filteredPasses.length > 0) && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Compliance Summary</h4>
            <div className="grid gap-2">
              {filteredViolations.map((v, idx) => (
                <div 
                  key={`v-${idx}`} 
                  className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm"
                  data-testid={`violation-item-${idx}`}
                >
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{v.ruleName}</span>
                      {v.remediation && (
                        <p className="text-muted-foreground text-xs mt-1">{v.remediation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredPasses.slice(0, 5).map((p, idx) => (
                <div 
                  key={`p-${idx}`} 
                  className="p-2 bg-green-500/10 border border-green-500/30 rounded-md text-sm flex items-center gap-2"
                  data-testid={`pass-item-${idx}`}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <span>{p.ruleName}</span>
                </div>
              ))}
              {filteredPasses.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  + {filteredPasses.length - 5} more passing rules
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  isUploading: boolean;
  accept: string;
}

const DragDropUpload = memo(function DragDropUpload({
  onFileSelect,
  selectedFile,
  isUploading,
  accept,
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (ACCEPTED_FILE_TYPES.includes(ext)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragging 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        }
        ${isUploading ? 'pointer-events-none opacity-50' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      data-testid="dropzone-lidar-upload"
      role="button"
      tabIndex={0}
      aria-label="Drop files here or click to upload"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-lidar-file"
      />
      
      <div className="flex flex-col items-center gap-3">
        <div className={`
          p-4 rounded-full 
          ${isDragging ? 'bg-primary/10' : 'bg-muted'}
        `}>
          <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        
        {selectedFile ? (
          <div className="space-y-1">
            <p className="font-medium text-sm">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <>
            <p className="font-medium">
              {isDragging ? 'Drop file here' : 'Drag and drop your scan file'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PLY, OBJ, and JSON files (max {MAX_FILE_SIZE_MB}MB)
            </p>
          </>
        )}
      </div>
    </div>
  );
});

export default function LidarPanel() {
  const { toast } = useToast();
  const { celebrate } = useMilestoneCelebrations();
  const {
    opening,
    project,
    lidarScansQuery,
    processLidarScan,
    deleteLidarScan,
  } = useOpeningDetail();

  const lidarScans = lidarScansQuery.data ?? [];
  const [lidarFile, setLidarFile] = useState<File | null>(null);
  const [lidarCaptureMethod, setLidarCaptureMethod] = useState<string>("manual");
  const [lidarCaptureNotes, setLidarCaptureNotes] = useState<string>("");
  const [lidarDeviceInfo, setLidarDeviceInfo] = useState<string>("");
  const [lidarScanLabel, setLidarScanLabel] = useState<string>("");
  const [selectedScanForProcessing, setSelectedScanForProcessing] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showHardwareDetails, setShowHardwareDetails] = useState(false);
  const [showRevealDetails, setShowRevealDetails] = useState(false);
  const [showHardwareId, setShowHardwareId] = useState<string | null>(null);
  const [hwIdExpandedType, setHwIdExpandedType] = useState<string | null>(null);
  const [lidarScanPurpose, setLidarScanPurpose] = useState("single");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoType, setPhotoType] = useState<string>("reference");


  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const uploadLidarScanMutation = useMutation({
    mutationFn: async () => {
      if (!lidarFile || !opening?.id || !project?.id) {
        throw new Error("Missing required data for upload");
      }

      if (lidarFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE_MB}MB`);
      }

      const formData = new FormData();
      formData.append("file", lidarFile);
      formData.append("openingId", opening.id);
      formData.append("projectId", project.id);
      formData.append("captureMethod", lidarCaptureMethod);
      formData.append('scanPurpose', lidarScanPurpose);
      if (lidarScanLabel) formData.append("scanLabel", lidarScanLabel);
      if (lidarCaptureNotes) formData.append("captureNotes", lidarCaptureNotes);
      if (lidarDeviceInfo) formData.append("deviceInfo", lidarDeviceInfo);

      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setUploadProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({ success: true });
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', '/api/lidar/scans');
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/openings', opening?.id, 'lidar-scans'] });
      setLidarFile(null);
      setLidarScanLabel("");
      setLidarCaptureNotes("");
      setLidarDeviceInfo("");
      setUploadProgress(null);
      toast({
        title: "LiDAR scan uploaded",
        description: "Scan has been uploaded successfully. You can now process it.",
      });
      celebrate("first-scan");
    },
    onError: (error: any) => {
      setUploadProgress(null);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload scan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const applyAssessmentMutation = useMutation({
    mutationFn: async () => {
      if (!opening?.id) throw new Error("No opening");
      return await apiRequest("POST", `/api/openings/${opening.id}/apply-lidar-assessment`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/openings', opening?.id] });
      toast({
        title: "Frame assessment updated",
        description: "LiDAR scan data has been applied to the frame assessment fields.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to apply assessment",
        description: error.message || "Could not apply LiDAR data to frame assessment.",
        variant: "destructive",
      });
    },
  });

  const detectHardwareMutation = useMutation({
    mutationFn: async () => {
      const processedScan = lidarScans.find(s => s.processingStatus === 'processed');
      if (!processedScan) throw new Error("No processed scan available");
      return await apiRequest("POST", `/api/lidar/scans/${processedScan.id}/detect-hardware`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lidar/scans'] });
      if (opening?.id) queryClient.invalidateQueries({ queryKey: ['/api/openings', opening.id, 'lidar-scans'] });
      toast({ title: "Hardware placement detected", description: "Standard hardware positions have been calculated based on door dimensions." });
    },
    onError: (error: Error) => {
      toast({ title: "Detection failed", description: error.message, variant: "destructive" });
    },
  });

  const calibrateScanMutation = useMutation({
    mutationFn: async () => {
      const processedScan = lidarScans.find(s => s.processingStatus === 'processed');
      if (!processedScan) throw new Error("No processed scan available");
      return await apiRequest("POST", `/api/lidar/scans/${processedScan.id}/calibrate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lidar/scans'] });
      if (opening?.id) queryClient.invalidateQueries({ queryKey: ['/api/openings', opening.id, 'lidar-scans'] });
      toast({ title: "Calibration applied", description: "Scan measurements have been corrected using the calibration profile." });
    },
    onError: (error: Error) => {
      toast({ title: "Calibration failed", description: error.message, variant: "destructive" });
    },
  });

  const pairScansMutation = useMutation({
    mutationFn: async ({ closedScanId, openScanId }: { closedScanId: string; openScanId: string }) => {
      return await apiRequest("POST", `/api/lidar/scans/${closedScanId}/pair/${openScanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lidar/scans'] });
      if (opening?.id) queryClient.invalidateQueries({ queryKey: ['/api/openings', opening.id, 'lidar-scans'] });
      toast({ title: "Scans paired", description: "Open and closed door scans have been linked for reveal analysis." });
    },
    onError: (error: Error) => {
      toast({ title: "Pairing failed", description: error.message, variant: "destructive" });
    },
  });

  const analyzeRevealsMutation = useMutation({
    mutationFn: async (scanId: string) => {
      return await apiRequest("POST", `/api/lidar/scans/${scanId}/analyze-reveals`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lidar/scans'] });
      if (opening?.id) queryClient.invalidateQueries({ queryKey: ['/api/openings', opening.id, 'lidar-scans'] });
      toast({ title: "Reveal analysis complete", description: "Door reveals, gaps and tolerances have been calculated." });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const latestProcessedScan = useMemo(() => {
    return lidarScans.filter(s => s.processingStatus === 'processed').sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0] || null;
  }, [lidarScans]);

  const hardwareData = useMemo(() => {
    if (!latestProcessedScan?.hardwareMeasurements) return null;
    return latestProcessedScan.hardwareMeasurements as any;
  }, [latestProcessedScan]);

  const revealData = useMemo(() => {
    if (!latestProcessedScan?.revealGapAnalysis) return null;
    return latestProcessedScan.revealGapAnalysis as any;
  }, [latestProcessedScan]);

  const hardwareIdQuery = useQuery<any>({
    queryKey: ['/api/openings', opening?.id, 'hardware-identification'],
    enabled: !!opening?.id && !!latestProcessedScan,
  });

  const dualScanStatusQuery = useQuery<any>({
    queryKey: ['/api/openings', opening?.id, 'dual-scan-status'],
    enabled: !!opening?.id,
  });

  const photoTargetScan = latestProcessedScan || (lidarScans.length > 0 ? lidarScans[lidarScans.length - 1] : null);
  const scanPhotosQuery = useQuery<any[]>({
    queryKey: ['/api/lidar/scans', photoTargetScan?.id, 'photos'],
    enabled: !!photoTargetScan?.id,
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ scanId, files, type }: { scanId: string; files: File[]; type: string }) => {
      const formData = new FormData();
      files.forEach(f => formData.append("photos", f));
      formData.append("photoType", type);
      const res = await fetch(`/api/lidar/scans/${scanId}/photos`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      setPhotoFiles([]);
      if (latestProcessedScan?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/lidar/scans', latestProcessedScan.id, 'photos'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/openings', opening?.id, 'dual-scan-status'] });
      toast({ title: "Photos uploaded", description: "Reference photos have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const pairedScan = useMemo(() => {
    if (!latestProcessedScan?.pairedScanId) return null;
    return lidarScans.find(s => s.id === latestProcessedScan.pairedScanId) || null;
  }, [latestProcessedScan, lidarScans]);

  const processedScans = useMemo(() => {
    return lidarScans.filter(s => s.processingStatus === 'processed');
  }, [lidarScans]);

  const hasProcessedScans = useMemo(
    () => lidarScans.some(scan => scan.processingStatus === "processed"),
    [lidarScans]
  );

  useEffect(() => {
    if (processLidarScan.isSuccess && opening) {
      queryClient.invalidateQueries({ queryKey: ['/api/openings', opening.id, 'lidar-compliance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/openings', opening.id, 'lidar-scans'] });
    }
  }, [processLidarScan.isSuccess, opening]);

  const handleFileSelect = useCallback((file: File) => {
    setLidarFile(file);
  }, []);

  const handleUpload = useCallback(() => {
    if (!lidarFile) {
      toast({
        title: "No file selected",
        description: "Please select a LiDAR scan file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Please connect to the internet to upload scans.",
        variant: "destructive",
      });
      return;
    }

    uploadLidarScanMutation.mutate();
  }, [lidarFile, isOnline, uploadLidarScanMutation, toast]);

  const handleProcess = useCallback((scanId: string) => {
    setSelectedScanForProcessing(scanId);
    processLidarScan.mutate(scanId);
  }, [processLidarScan]);

  const handleDelete = useCallback((scanId: string) => {
    deleteLidarScan.mutate(scanId);
  }, [deleteLidarScan]);

  return (
    <div className="space-y-6">
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-sm">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <span className="text-amber-700 dark:text-amber-400">
            You're offline. Scans will be queued for upload when you reconnect.
          </span>
        </div>
      )}

      {hasProcessedScans && opening && (
        <LidarComplianceVisualization openingId={opening.id} />
      )}

      {hasProcessedScans && opening && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Ruler className="h-4 w-4" />
                LiDAR Frame Assessment
              </CardTitle>
              <Button
                variant="default"
                size="sm"
                onClick={() => applyAssessmentMutation.mutate()}
                disabled={applyAssessmentMutation.isPending}
                data-testid="button-apply-lidar-assessment"
              >
                {applyAssessmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Apply to Frame Assessment
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Auto-populate frame condition assessment fields (level, plumb, square, straightness, reveals) using data from the most recent processed LiDAR scan. Existing values will be overwritten.
            </p>
          </CardContent>
        </Card>
      )}

      {hasProcessedScans && opening && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4" />
                Calibration
              </CardTitle>
              <div className="flex items-center gap-2">
                {latestProcessedScan?.calibrationStatus && (
                  <Badge variant={
                    latestProcessedScan.calibrationStatus === 'calibrated' ? 'default' :
                    latestProcessedScan.calibrationStatus === 'partial' ? 'secondary' : 'destructive'
                  } data-testid="badge-calibration-status">
                    {latestProcessedScan.calibrationStatus === 'calibrated' ? 'Calibrated' :
                     latestProcessedScan.calibrationStatus === 'partial' ? 'Partial' :
                     latestProcessedScan.calibrationStatus === 'failed' ? 'Failed' : 'Uncalibrated'}
                  </Badge>
                )}
                <PrintCalibrationMarkers />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => calibrateScanMutation.mutate()}
                  disabled={calibrateScanMutation.isPending || !latestProcessedScan}
                  data-testid="button-calibrate-scan"
                >
                  {calibrateScanMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-1" />
                      Calibrate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {latestProcessedScan?.calibrationQualityScore != null ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quality Score</span>
                  <span className="font-medium">{(latestProcessedScan.calibrationQualityScore * 100).toFixed(0)}%</span>
                </div>
                <Progress value={latestProcessedScan.calibrationQualityScore * 100} className="h-2" data-testid="progress-calibration-quality" />
                {(latestProcessedScan.calibrationData as any)?.details && (
                  <p className="text-xs text-muted-foreground">{(latestProcessedScan.calibrationData as any).details}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Apply fiducial marker calibration to improve measurement accuracy. Uses AprilTag markers placed on the door frame as ground-truth reference points for sub-millimeter precision.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {hasProcessedScans && opening && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Crosshair className="h-4 w-4" />
                Hardware Placement
              </CardTitle>
              <div className="flex items-center gap-2">
                {hardwareData && (
                  <Badge variant="secondary" data-testid="badge-hardware-count">
                    {hardwareData.summary?.totalDetected || 0} items
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => detectHardwareMutation.mutate()}
                  disabled={detectHardwareMutation.isPending || !latestProcessedScan || (dualScanStatusQuery.data && !dualScanStatusQuery.data.dualScanComplete)}
                  data-testid="button-detect-hardware"
                >
                  {detectHardwareMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Crosshair className="h-4 w-4 mr-1" />
                      Detect
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hardwareData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Hinges</span>
                    <p className="font-medium" data-testid="text-hinge-count">{hardwareData.summary?.hingeCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Hinge Spacing</span>
                    <p className="font-medium" data-testid="text-hinge-spacing">{hardwareData.summary?.hingeSpacingMM ? `${hardwareData.summary.hingeSpacingMM.toFixed(0)}mm` : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Strike Height</span>
                    <p className="font-medium" data-testid="text-strike-height">{hardwareData.summary?.strikeHeightMM ? `${hardwareData.summary.strikeHeightMM.toFixed(0)}mm` : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Lockset Height</span>
                    <p className="font-medium" data-testid="text-lockset-height">{hardwareData.summary?.locksetHeightMM ? `${hardwareData.summary.locksetHeightMM.toFixed(0)}mm` : '—'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowHardwareDetails(!showHardwareDetails)}
                  data-testid="button-toggle-hardware-details"
                >
                  {showHardwareDetails ? 'Hide Details' : 'Show All Placements'}
                </Button>
                {showHardwareDetails && (
                  <div className="space-y-2 pt-2 border-t">
                    {hardwareData.hinges?.map((h: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50" data-testid={`text-hardware-hinge-${i}`}>
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3 w-3 text-muted-foreground" />
                          <span>{h.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{h.heightFromFloorInches} from floor</span>
                          <Badge variant="outline" className="text-xs">{h.source}</Badge>
                        </div>
                      </div>
                    ))}
                    {hardwareData.strike && (
                      <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50" data-testid="text-hardware-strike">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3 w-3 text-muted-foreground" />
                          <span>{hardwareData.strike.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{hardwareData.strike.heightFromFloorInches} from floor</span>
                          <Badge variant="outline" className="text-xs">{hardwareData.strike.source}</Badge>
                        </div>
                      </div>
                    )}
                    {hardwareData.lockset && (
                      <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50" data-testid="text-hardware-lockset">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3 w-3 text-muted-foreground" />
                          <span>{hardwareData.lockset.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{hardwareData.lockset.heightFromFloorInches} from floor</span>
                          <Badge variant="outline" className="text-xs">{hardwareData.lockset.source}</Badge>
                        </div>
                      </div>
                    )}
                    {hardwareData.closer && (
                      <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50" data-testid="text-hardware-closer">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3 w-3 text-muted-foreground" />
                          <span>{hardwareData.closer.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{hardwareData.closer.heightFromFloorInches} from top</span>
                          <Badge variant="outline" className="text-xs">{hardwareData.closer.source}</Badge>
                        </div>
                      </div>
                    )}
                    {hardwareData.kickplate && (
                      <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50" data-testid="text-hardware-kickplate">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3 w-3 text-muted-foreground" />
                          <span>{hardwareData.kickplate.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{hardwareData.kickplate.heightFromFloorInches} from bottom</span>
                          <Badge variant="outline" className="text-xs">{hardwareData.kickplate.source}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Detect and measure hinge placements, strike positions, lockset heights and closer locations. Uses door dimensions to calculate standard hardware positions per industry specifications.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {dualScanStatusQuery.data && (
        <Card data-testid="card-dual-scan-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4" />
              Three-Scan Requirement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  {dualScanStatusQuery.data.scans.open?.count > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Door Open Scan</span>
                </div>
                {dualScanStatusQuery.data.scans.open?.count > 0 ? (
                  <Badge variant="default" className="text-xs">Uploaded</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  {dualScanStatusQuery.data.scans.closedA?.count > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Door Closed - Side A</span>
                </div>
                {dualScanStatusQuery.data.scans.closedA?.count > 0 ? (
                  <Badge variant="default" className="text-xs">Uploaded</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  {dualScanStatusQuery.data.scans.closedB?.count > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Door Closed - Side B</span>
                </div>
                {dualScanStatusQuery.data.scans.closedB?.count > 0 ? (
                  <Badge variant="default" className="text-xs">Uploaded</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span>Reference Photos</span>
                </div>
                <Badge variant="outline" className="text-xs">{dualScanStatusQuery.data.totalPhotos} photos</Badge>
              </div>
              {!dualScanStatusQuery.data.dualScanComplete && (
                <div className="bg-muted rounded-md p-3 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  All three scans are required before hardware identification can proceed: one with the door open (both sides visible), and two with the door closed from opposite sides (Side A and Side B).
                </div>
              )}
              {dualScanStatusQuery.data.dualScanComplete && (
                <div className="bg-muted rounded-md p-3 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 inline mr-1 text-green-500" />
                  All three scans uploaded. Hardware identification is available.
                </div>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <span className="text-muted-foreground">3D Model</span>
                <Badge variant={dualScanStatusQuery.data.hasModel ? "default" : "outline"} className="text-xs">
                  {dualScanStatusQuery.data.hasModel ? "Generated" : "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <span className="text-muted-foreground">Wireframe</span>
                <Badge variant={dualScanStatusQuery.data.hasWireframe ? "default" : "outline"} className="text-xs">
                  {dualScanStatusQuery.data.hasWireframe ? "Generated" : "Pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {lidarScans.length > 0 && (
        <Card data-testid="card-scan-photos">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4" />
              Scan Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Capture Reference Photos
                </label>
                <p className="text-xs text-muted-foreground">
                  Take photos during scanning to document hardware, conditions, and surroundings for reference.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    className="text-xs"
                    onChange={(e) => {
                      if (e.target.files) setPhotoFiles(Array.from(e.target.files));
                    }}
                    data-testid="input-scan-photos"
                  />
                  <Select value={photoType} onValueChange={setPhotoType}>
                    <SelectTrigger className="w-auto min-w-[140px]" data-testid="select-photo-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reference">Reference</SelectItem>
                      <SelectItem value="detail">Detail Close-up</SelectItem>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="panorama-segment">Panorama Segment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {photoFiles.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{photoFiles.length} photo{photoFiles.length !== 1 ? "s" : ""} selected</Badge>
                    <Button
                      size="sm"
                      onClick={() => {
                        const targetScan = latestProcessedScan || lidarScans[lidarScans.length - 1];
                        if (targetScan) {
                          uploadPhotosMutation.mutate({ scanId: targetScan.id, files: photoFiles, type: photoType });
                        }
                      }}
                      disabled={uploadPhotosMutation.isPending}
                      data-testid="button-upload-photos"
                    >
                      {uploadPhotosMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                      Upload Photos
                    </Button>
                  </div>
                )}
              </div>

              {scanPhotosQuery.data && scanPhotosQuery.data.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Captured Photos ({scanPhotosQuery.data.length})</span>
                  <div className="grid grid-cols-3 gap-2">
                    {scanPhotosQuery.data.map((photo: any) => (
                      <div key={photo.id} className="relative group rounded-md overflow-hidden border" data-testid={`photo-${photo.id}`}>
                        <img
                          src={`/api/lidar/scans/${photo.scanId}/photos/${photo.id}/download`}
                          alt={photo.originalFilename}
                          className="w-full h-24 object-cover"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                          <span className="text-[10px] text-white truncate block">{photo.originalFilename}</span>
                        </div>
                        <Badge variant="outline" className="absolute top-1 right-1 text-[10px] bg-background/80">{photo.photoType}</Badge>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const panoramaPhotos = scanPhotosQuery.data.filter((p: any) => p.photoType === "panorama-segment");
                    if (panoramaPhotos.length >= 2) {
                      return (
                        <div className="bg-muted rounded-md p-2 text-xs text-muted-foreground flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {panoramaPhotos.length} panorama segments available for stitching
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {latestProcessedScan && (latestProcessedScan.modelStorageKey || latestProcessedScan.wireframeStorageKey || latestProcessedScan.previewImageKey) && (
        <Card data-testid="card-3d-model-wireframe">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Box className="h-4 w-4" />
              3D Model & Wireframe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="model" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="model" data-testid="tab-3d-model">
                  <Box className="h-3 w-3 mr-1" />3D Model
                </TabsTrigger>
                <TabsTrigger value="wireframe" data-testid="tab-wireframe">
                  <Grid className="h-3 w-3 mr-1" />Wireframe
                </TabsTrigger>
                <TabsTrigger value="preview" data-testid="tab-preview">
                  <Eye className="h-3 w-3 mr-1" />Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="model" className="mt-3">
                {latestProcessedScan.modelStorageKey ? (
                  <div className="space-y-2">
                    <div className="bg-muted rounded-md p-8 flex flex-col items-center justify-center text-center">
                      <Box className="h-12 w-12 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">3D Model Available</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Format: {(latestProcessedScan.modelFormat || "gltf").toUpperCase()}
                      </span>
                      {(latestProcessedScan.modelMetadata as any)?.vertexCount && (
                        <span className="text-xs text-muted-foreground">
                          {((latestProcessedScan.modelMetadata as any).vertexCount).toLocaleString()} vertices
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      data-testid="button-download-model"
                      onClick={() => window.open(`/api/lidar/scans/${latestProcessedScan.id}/download?asset=model`, '_blank')}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download 3D Model ({(latestProcessedScan.modelFormat || "gltf").toUpperCase()})
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-6 flex flex-col items-center justify-center text-center">
                    <Box className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">3D model will be generated after scan processing</span>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="wireframe" className="mt-3">
                {latestProcessedScan.wireframeStorageKey ? (
                  <div className="space-y-2">
                    <div className="bg-muted rounded-md p-8 flex flex-col items-center justify-center text-center">
                      <Grid className="h-12 w-12 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">Wireframe Interpretation</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Format: {(latestProcessedScan.wireframeFormat || "svg").toUpperCase()}
                      </span>
                      {(latestProcessedScan.wireframeMetadata as any)?.components && (
                        <span className="text-xs text-muted-foreground">
                          {(latestProcessedScan.wireframeMetadata as any).components} components detected
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      data-testid="button-download-wireframe"
                      onClick={() => window.open(`/api/lidar/scans/${latestProcessedScan.id}/download?asset=wireframe`, '_blank')}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download Wireframe ({(latestProcessedScan.wireframeFormat || "svg").toUpperCase()})
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-6 flex flex-col items-center justify-center text-center">
                    <Grid className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Wireframe will be generated after scan processing</span>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                {latestProcessedScan.previewImageKey ? (
                  <div className="rounded-md overflow-hidden border">
                    <img
                      src={`/api/lidar/scans/${latestProcessedScan.id}/download?asset=preview`}
                      alt="3D model preview"
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-6 flex flex-col items-center justify-center text-center">
                    <Eye className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Preview image will be generated after processing</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {hasProcessedScans && opening && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="h-4 w-4" />
                Hardware Identification
              </CardTitle>
              <div className="flex items-center gap-2">
                {hardwareIdQuery.data?.identification && (
                  <Badge variant="secondary" data-testid="badge-hw-id-matches">
                    {hardwareIdQuery.data.identification.summary?.highConfidenceMatches || 0} matches
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => hardwareIdQuery.refetch()}
                  disabled={hardwareIdQuery.isLoading || (dualScanStatusQuery.data && !dualScanStatusQuery.data.dualScanComplete)}
                  data-testid="button-identify-hardware"
                >
                  {hardwareIdQuery.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-1" />
                      Identify
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hardwareIdQuery.data?.identification ? (() => {
              const id = hardwareIdQuery.data.identification;
              const ha = id.hingeAnalysis;
              return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Door Weight</span>
                    <p className="font-medium" data-testid="text-door-weight">{ha?.estimatedWeight}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Weight Class</span>
                    <p className="font-medium" data-testid="text-weight-class">{ha?.doorWeightClass}</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-3">
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Hinge Analysis</span>
                    <Badge variant="secondary" className="text-xs" data-testid="badge-hinge-count">
                      {ha?.count || 3} hinges
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Hinge Size</span>
                      <p className="font-medium" data-testid="text-hinge-size">{ha?.estimatedSize}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Mount Type</span>
                      <p className="font-medium" data-testid="text-hinge-mount">{ha?.hingeMountType || ha?.hingeType}</p>
                      {ha?.hingeMountTypeReason && (
                        <p className="text-xs text-muted-foreground leading-snug" data-testid="text-hinge-mount-reason">{ha.hingeMountTypeReason}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Weight Class</span>
                      <p className="font-medium" data-testid="text-hinge-weight-class">{ha?.hingeWeightClass}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Bearing</span>
                      <p className="font-medium" data-testid="text-hinge-bearing">{ha?.bearingType}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Corner Type</span>
                      <p className="font-medium" data-testid="text-hinge-corner">{ha?.cornerType}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Grade</span>
                      <p className="font-medium" data-testid="text-hinge-grade">{ha?.recommendedGrade}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Handing</span>
                      <p className="font-medium" data-testid="text-hinge-handing">
                        {ha?.handing}
                        {ha?.handingConfidence > 0 && (
                          <span className="text-muted-foreground ml-1">({Math.round((ha.handingConfidence || 0) * 100)}%)</span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Count Reason</span>
                      <p className="font-medium text-xs leading-snug" data-testid="text-hinge-count-reason">{ha?.countReason}</p>
                    </div>
                  </div>

                  {ha?.fireRatingRequired && (
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-destructive/10 text-sm" data-testid="text-hinge-fire-required">
                      <Shield className="h-4 w-4 text-destructive shrink-0" />
                      <span>Fire-rated hinges required — {ha.cornerTypeReason}</span>
                    </div>
                  )}

                  {ha?.isSwaged && (
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-primary/10 text-sm" data-testid="text-hinge-swaged">
                      <ArrowRightLeft className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <span className="font-medium">Swaged Hinge Leaves</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{ha.swageReason}</p>
                      </div>
                    </div>
                  )}

                  {(ha?.securityFeatures?.length > 0) && (
                    <div className="mt-3 space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Security Features</span>
                      <div className="flex flex-wrap gap-1">
                        {ha.securityFeatures.map((feat: string) => (
                          <Badge key={feat} variant="outline" className="text-xs" data-testid={`badge-security-${feat.toLowerCase().replace(/\s+/g, '-')}`}>
                            <Lock className="h-3 w-3 mr-1" />
                            {feat}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid="text-security-notes">{ha.securityNotes}</p>
                    </div>
                  )}

                  {ha?.electrifiedOption && (
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-primary/10 text-sm" data-testid="text-hinge-electrified">
                      <Zap className="h-4 w-4 text-primary shrink-0" />
                      <span>{ha.electrifiedNotes}</span>
                    </div>
                  )}

                  {ha?.hingeClearance && (
                    <div className="mt-3 space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Hinge Clearance</span>
                      <div className="flex items-center gap-2 text-sm" data-testid="text-hinge-clearance">
                        <Badge 
                          variant={ha.hingeClearance.status === 'pass' ? 'default' : ha.hingeClearance.status === 'marginal' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {ha.hingeClearance.status === 'pass' ? 'Pass' : ha.hingeClearance.status === 'marginal' ? 'Marginal' : 'Fail'}
                        </Badge>
                        <span>{ha.hingeClearance.hingeGapMM}mm ({ha.hingeClearance.hingeGapInches})</span>
                        <span className="text-muted-foreground">spec: {ha.hingeClearance.specRangeMM.min}–{ha.hingeClearance.specRangeMM.max}mm</span>
                      </div>
                    </div>
                  )}

                  {ha?.knuckleDimensions && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-md bg-muted/50 space-y-0.5">
                        <span className="text-muted-foreground">Knuckle Length</span>
                        <p className="font-medium" data-testid="text-knuckle-length">{ha.knuckleDimensions.knuckleLengthMM}mm</p>
                      </div>
                      <div className="p-2 rounded-md bg-muted/50 space-y-0.5">
                        <span className="text-muted-foreground">Knuckle Diameter</span>
                        <p className="font-medium" data-testid="text-knuckle-diameter">{ha.knuckleDimensions.knuckleDiameterMM}mm</p>
                      </div>
                      <div className="p-2 rounded-md bg-muted/50 space-y-0.5">
                        <span className="text-muted-foreground">Leaf Width</span>
                        <p className="font-medium" data-testid="text-leaf-width">{ha.knuckleDimensions.leafWidthMM}mm</p>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setShowHardwareId(showHardwareId === 'placements' ? null : 'placements')}
                    data-testid="button-toggle-hinge-placements"
                  >
                    {showHardwareId === 'placements' ? 'Hide Hinge Positions' : 'Show Hinge Positions'}
                  </Button>

                  {showHardwareId === 'placements' && ha?.placements && (
                    <div className="space-y-1 pt-2">
                      {ha.placements.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30" data-testid={`text-hinge-position-${idx}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium">{p.label}</span>
                              <span className="text-muted-foreground ml-1">#{p.positionIndex}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2 text-right">
                            <span>{p.heightFromFloorInches} from floor</span>
                            <span className="text-muted-foreground">{p.heightFromTopInches} from top</span>
                            {p.spacingToNextInches && (
                              <span className="text-muted-foreground">↕ {p.spacingToNextInches} to next</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Closer Size</span>
                      <p className="font-medium" data-testid="text-closer-size">{id.closerAnalysis?.estimatedSize}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Lockset Backset</span>
                      <p className="font-medium" data-testid="text-lockset-backset">{id.locksetAnalysis?.estimatedBackset}</p>
                    </div>
                  </div>
                </div>

                {id.lockingHardwareAnalysis && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Locking Hardware</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Lock Type</span>
                        <p className="font-medium" data-testid="text-lock-type">{id.lockingHardwareAnalysis.lockType}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Reason</span>
                        <p className="text-xs text-muted-foreground" data-testid="text-lock-type-reason">{id.lockingHardwareAnalysis.lockTypeReason}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {id.lockingHardwareAnalysis.exitDevice?.recommended && (
                        <Badge variant="outline" className="text-xs" data-testid="badge-exit-device">
                          Exit Device — {id.lockingHardwareAnalysis.exitDevice.type}
                        </Badge>
                      )}
                      {id.lockingHardwareAnalysis.electricStrike?.recommended && (
                        <Badge variant="outline" className="text-xs" data-testid="badge-electric-strike">
                          Electric Strike — {id.lockingHardwareAnalysis.electricStrike.failMode}
                        </Badge>
                      )}
                      {id.lockingHardwareAnalysis.magneticLock?.recommended && (
                        <Badge variant="outline" className="text-xs" data-testid="badge-mag-lock">
                          Mag Lock — {id.lockingHardwareAnalysis.magneticLock.holdingForceLbs} lbs
                        </Badge>
                      )}
                      {id.lockingHardwareAnalysis.electrifiedTrim?.recommended && (
                        <Badge variant="outline" className="text-xs" data-testid="badge-elec-trim">
                          {id.lockingHardwareAnalysis.electrifiedTrim.trimType}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {id.accessControlAnalysis?.recommended && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Access Control</span>
                    </div>
                    <div className="space-y-1">
                      {id.accessControlAnalysis.components.map((comp: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-md bg-muted/30" data-testid={`text-ac-component-${idx}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant={comp.required ? 'default' : 'secondary'} className="text-xs shrink-0">
                              {comp.deviceType}
                            </Badge>
                            <span className="text-muted-foreground truncate">{comp.location}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs space-y-1 mt-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Zap className="h-3 w-3 shrink-0" />
                        <span>Power: {id.accessControlAnalysis.powerRequirements.voltage} / {id.accessControlAnalysis.powerRequirements.current}</span>
                        {id.accessControlAnalysis.powerRequirements.backupRequired && (
                          <Badge variant="outline" className="text-xs">Battery Backup</Badge>
                        )}
                      </div>
                    </div>
                    {id.accessControlAnalysis.wiringNotes?.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setShowHardwareId(showHardwareId === 'wiring' ? null : 'wiring')}
                        data-testid="button-toggle-wiring-notes"
                      >
                        {showHardwareId === 'wiring' ? 'Hide Wiring Notes' : 'Show Wiring Notes'}
                      </Button>
                    )}
                    {showHardwareId === 'wiring' && (
                      <div className="space-y-1 text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                        {id.accessControlAnalysis.wiringNotes.map((note: string, idx: number) => (
                          <p key={idx} data-testid={`text-wiring-note-${idx}`}>{note}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {id.summary?.matchedManufacturers?.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground font-medium">Matched Manufacturers</span>
                    <div className="flex flex-wrap gap-1">
                      {id.summary.matchedManufacturers.map((mfr: string) => (
                        <Badge key={mfr} variant="outline" className="text-xs" data-testid={`badge-manufacturer-${mfr.toLowerCase().replace(/\s+/g, '-')}`}>
                          <Building2 className="h-3 w-3 mr-1" />
                          {mfr}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowHardwareId(showHardwareId === 'matches' ? null : 'matches')}
                  data-testid="button-toggle-hw-id-details"
                >
                  {showHardwareId === 'matches' ? 'Hide Manufacturer Matches' : 'Show Manufacturer Matches'}
                </Button>

                {showHardwareId === 'matches' && (
                  <div className="space-y-3 pt-2 border-t">
                    {[
                      { key: 'hinge', label: 'Hinge Matches', icon: CircleDot },
                      { key: 'lockset', label: 'Lockset Matches', icon: CircleDot },
                      { key: 'closer', label: 'Closer Matches', icon: CircleDot },
                      { key: 'exitDevice', label: 'Exit Device Matches', icon: Lock },
                      { key: 'electricStrike', label: 'Electric Strike Matches', icon: Zap },
                      { key: 'magLock', label: 'Mag Lock Matches', icon: Lock },
                      { key: 'accessControl', label: 'Access Control Matches', icon: Fingerprint },
                    ].map(({ key, label, icon: Icon }) => {
                      const allMatches = id.manufacturerMatches || [];
                      const HINGE_TYPES = ['Full Mortise', 'Half Mortise', 'Full Surface', 'Half Surface', 'Swing Clear', 'Swaged', 'Cam Lift', 'Spring', 'Olive Knuckle', 'Pivot', 'Center Hung', 'Center Pivot', 'Pocket Pivot', 'Architectural Design', 'Invisible', 'Continuous Geared', 'Full Continuous'];
                      const LOCKSET_TYPES = ['Storeroom', 'Entry/Office', 'Classroom', 'Entry', 'Privacy'];
                      let matches: any[];
                      if (key === 'hinge') {
                        matches = allMatches.filter((m: any) => HINGE_TYPES.includes(m.type));
                      } else if (key === 'lockset') {
                        matches = allMatches.filter((m: any) => LOCKSET_TYPES.includes(m.type));
                      } else if (key === 'closer') {
                        matches = allMatches.filter((m: any) => m.type === 'Surface');
                      } else if (key === 'exitDevice') {
                        matches = allMatches.filter((m: any) => m.type?.startsWith('Exit Device'));
                      } else if (key === 'electricStrike') {
                        matches = allMatches.filter((m: any) => m.type?.startsWith('Electric Strike'));
                      } else if (key === 'magLock') {
                        matches = allMatches.filter((m: any) => m.type?.startsWith('Mag Lock'));
                      } else if (key === 'accessControl') {
                        matches = allMatches.filter((m: any) => m.type?.startsWith('Access Control'));
                      } else {
                        matches = [];
                      }

                      if (matches.length === 0) return null;

                      const isExpanded = hwIdExpandedType === key;

                      return (
                        <div key={key} className="space-y-1">
                          <button
                            className="flex items-center gap-2 w-full text-left text-xs font-medium p-2 rounded-md bg-muted/50 hover-elevate"
                            onClick={() => setHwIdExpandedType(isExpanded ? null : key)}
                            data-testid={`button-expand-${key}-matches`}
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <Icon className="h-3 w-3 text-muted-foreground" />
                            <span>{label}</span>
                            <Badge variant="secondary" className="ml-auto text-xs">{matches.length}</Badge>
                          </button>
                          {isExpanded && (
                            <div className="space-y-1 pl-4">
                              {matches.slice(0, 8).map((match: any, idx: number) => (
                                <div key={idx} className="flex items-start justify-between text-xs p-2 rounded-md bg-muted/30" data-testid={`text-${key}-match-${idx}`}>
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="font-medium truncate">{match.manufacturer} {match.series}</div>
                                    <div className="text-muted-foreground">{match.model} — {match.size}</div>
                                    <div className="text-muted-foreground">
                                      {match.grade}
                                      {match.fireRated && ' · Fire Rated'}
                                      {match.specifications?.weightClass && ` · ${match.specifications.weightClass}`}
                                      {match.specifications?.corners && ` · ${match.specifications.corners}`}
                                    </div>
                                    {(match.specifications?.nrp || match.specifications?.electrified || match.specifications?.securityStuds || match.specifications?.leafGeometry || match.specifications?.liftAction || match.specifications?.hingeLength || match.specifications?.pivotType || match.specifications?.style || match.specifications?.failMode || match.specifications?.voltage || match.specifications?.dogging || match.specifications?.monitoring || match.specifications?.protocol || match.specifications?.sensor) && (
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {match.specifications.nrp && <Badge variant="outline" className="text-xs">NRP</Badge>}
                                        {match.specifications.electrified && <Badge variant="outline" className="text-xs">ETW</Badge>}
                                        {match.specifications.securityStuds && <Badge variant="outline" className="text-xs">Security Studs</Badge>}
                                        {match.specifications.leafGeometry && <Badge variant="outline" className="text-xs">Swaged</Badge>}
                                        {match.specifications.liftAction && <Badge variant="outline" className="text-xs">Cam Lift</Badge>}
                                        {match.specifications.hingeLength && <Badge variant="outline" className="text-xs">Full Continuous</Badge>}
                                        {match.specifications.pivotType && <Badge variant="outline" className="text-xs">{match.specifications.pivotType}</Badge>}
                                        {match.specifications.style && <Badge variant="outline" className="text-xs">{match.specifications.style.split(' — ')[0]}</Badge>}
                                        {match.specifications.failMode && <Badge variant="outline" className="text-xs">{match.specifications.failMode}</Badge>}
                                        {match.specifications.voltage && <Badge variant="outline" className="text-xs">{match.specifications.voltage}</Badge>}
                                        {match.specifications.dogging && <Badge variant="outline" className="text-xs">Dogging: {match.specifications.dogging}</Badge>}
                                        {match.specifications.monitoring && match.specifications.monitoring !== 'Optional' && <Badge variant="outline" className="text-xs">{match.specifications.monitoring}</Badge>}
                                        {match.specifications.protocol && <Badge variant="outline" className="text-xs">{match.specifications.protocol}</Badge>}
                                        {match.specifications.sensor && <Badge variant="outline" className="text-xs">{match.specifications.sensor}</Badge>}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                    <Badge
                                      variant={match.confidence >= 0.8 ? 'default' : match.confidence >= 0.65 ? 'secondary' : 'outline'}
                                      className="text-xs"
                                    >
                                      {Math.round(match.confidence * 100)}%
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })() : hardwareIdQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Identifying hardware from scan dimensions...
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cross-reference detected hardware positions against manufacturer catalogs to identify matching products from Hager, McKinney, Schlage, LCN, and other major brands.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {hasProcessedScans && hardwareIdQuery.data?.materialIdentification && (() => {
        const mat = hardwareIdQuery.data.materialIdentification;
        const acc = hardwareIdQuery.data.accessoryDetection;
        const rev = hardwareIdQuery.data.enhancedRevealDetails;
        const appliedLearning: any[] = hardwareIdQuery.data.appliedLearning || [];
        const currentScanId = hardwareIdQuery.data.scanId;
        const currentOpeningId = opening?.id || "";
        const handleOverrideSubmitted = () => {
          queryClient.invalidateQueries({ queryKey: ['/api/openings', opening?.id, 'hardware-identification'] });
        };
        const isFieldLearned = (fp: string) => appliedLearning.some((l: any) => l.fieldPath === fp);
        const ManualTag = ({ show }: { show: boolean }) => show ? (
          <Badge variant="destructive" className="text-xs" data-testid="badge-manual-input">
            <AlertTriangle className="h-3 w-3 mr-1" />Manual Input Required
          </Badge>
        ) : null;
        const UnknownValue = ({ value, manual, testId }: { value: string; manual: boolean; testId?: string }) => (
          <p className={`font-medium ${manual ? "text-muted-foreground italic" : ""}`} data-testid={testId}>
            {value}{manual && value !== "Unknown" ? "" : ""}
          </p>
        );
        const anyManualRequired = mat.frameMaterial.manualInputRequired || mat.doorMaterial.manualInputRequired ||
          mat.installationMethod.manualInputRequired || mat.veneerFinish.manualInputRequired || mat.color.manualInputRequired;
        return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4" />
                Material Identification
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {anyManualRequired && (
                  <Badge variant="destructive" className="text-xs" data-testid="badge-manual-required-summary">
                    <AlertTriangle className="h-3 w-3 mr-1" />Manual Input Needed
                  </Badge>
                )}
                <Badge variant="secondary" data-testid="badge-frame-material">
                  {mat.frameMaterial.type}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                    Frame Material
                    <ManualTag show={mat.frameMaterial.manualInputRequired} />
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <UnknownValue value={mat.frameMaterial.type} manual={mat.frameMaterial.manualInputRequired} testId="text-frame-material" />
                    <OverrideField
                      fieldPath="materialIdentification.frameMaterial.type"
                      currentValue={mat.frameMaterial.type}
                      confidence={mat.frameMaterial.confidence}
                      manualInputRequired={mat.frameMaterial.manualInputRequired}
                      learnedAdjustment={isFieldLearned("materialIdentification.frameMaterial.type")}
                      openingId={currentOpeningId}
                      scanId={currentScanId}
                      onOverrideSubmitted={handleOverrideSubmitted}
                    />
                  </div>
                  {mat.frameMaterial.gauge && (
                    <p className="text-xs text-muted-foreground">{mat.frameMaterial.gauge}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                    Door Material
                    <ManualTag show={mat.doorMaterial.manualInputRequired} />
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <UnknownValue value={mat.doorMaterial.type} manual={mat.doorMaterial.manualInputRequired} testId="text-door-material" />
                    <OverrideField
                      fieldPath="materialIdentification.doorMaterial.type"
                      currentValue={mat.doorMaterial.type}
                      confidence={mat.doorMaterial.confidence}
                      manualInputRequired={mat.doorMaterial.manualInputRequired}
                      learnedAdjustment={isFieldLearned("materialIdentification.doorMaterial.type")}
                      openingId={currentOpeningId}
                      scanId={currentScanId}
                      onOverrideSubmitted={handleOverrideSubmitted}
                    />
                  </div>
                  {mat.doorMaterial.core && (
                    <p className="text-xs text-muted-foreground">Core: {mat.doorMaterial.core}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                    Installation Method
                    <ManualTag show={mat.installationMethod.manualInputRequired} />
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <UnknownValue value={mat.installationMethod.type} manual={mat.installationMethod.manualInputRequired} testId="text-installation-method" />
                    <OverrideField
                      fieldPath="materialIdentification.installationMethod.type"
                      currentValue={mat.installationMethod.type}
                      confidence={mat.installationMethod.confidence}
                      manualInputRequired={mat.installationMethod.manualInputRequired}
                      learnedAdjustment={isFieldLearned("materialIdentification.installationMethod.type")}
                      openingId={currentOpeningId}
                      scanId={currentScanId}
                      onOverrideSubmitted={handleOverrideSubmitted}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Door Thickness</span>
                  <p className="font-medium" data-testid="text-door-thickness">{mat.doorMaterial.thickness || "1-3/4\""}</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                      <Paintbrush className="h-3 w-3" /> Finish / Veneer
                      <ManualTag show={mat.veneerFinish.manualInputRequired} />
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <UnknownValue value={mat.veneerFinish.type} manual={mat.veneerFinish.manualInputRequired} testId="text-finish" />
                      <OverrideField
                        fieldPath="materialIdentification.veneerFinish.type"
                        currentValue={mat.veneerFinish.type}
                        confidence={mat.veneerFinish.confidence}
                        manualInputRequired={mat.veneerFinish.manualInputRequired}
                        learnedAdjustment={isFieldLearned("materialIdentification.veneerFinish.type")}
                        openingId={currentOpeningId}
                        scanId={currentScanId}
                        onOverrideSubmitted={handleOverrideSubmitted}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{mat.veneerFinish.material}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                      Color
                      <ManualTag show={mat.color.manualInputRequired} />
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <UnknownValue value={mat.color.value} manual={mat.color.manualInputRequired} testId="text-color" />
                      <OverrideField
                        fieldPath="materialIdentification.color.value"
                        currentValue={mat.color.value}
                        confidence={mat.color.confidence}
                        manualInputRequired={mat.color.manualInputRequired}
                        learnedAdjustment={isFieldLearned("materialIdentification.color.value")}
                        openingId={currentOpeningId}
                        scanId={currentScanId}
                        onOverrideSubmitted={handleOverrideSubmitted}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{mat.color.finish}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Confidence Evidence</span>
                <div className="flex flex-wrap gap-1">
                  {mat.frameMaterial.evidence.map((e: string, i: number) => (
                    <Badge key={`f-${i}`} variant="outline" className="text-xs" data-testid={`badge-frame-evidence-${i}`}>{e}</Badge>
                  ))}
                  {mat.doorMaterial.evidence.map((e: string, i: number) => (
                    <Badge key={`d-${i}`} variant="outline" className="text-xs" data-testid={`badge-door-evidence-${i}`}>{e}</Badge>
                  ))}
                </div>
              </div>

              {rev && (
                <div className="border-t pt-3">
                  <span className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
                    Frame & Reveal Details
                    {rev.manualInputRequired && (
                      <Badge variant="destructive" className="text-xs" data-testid="badge-reveal-manual">
                        <AlertTriangle className="h-3 w-3 mr-1" />Manual Input Needed
                      </Badge>
                    )}
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                        Frame Profile
                        <ManualTag show={rev.frameProfile.manualInputRequired} />
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <UnknownValue value={rev.frameProfile.type} manual={rev.frameProfile.manualInputRequired} testId="text-frame-profile" />
                        <OverrideField
                          fieldPath="enhancedRevealDetails.frameProfile.type"
                          currentValue={rev.frameProfile.type}
                          confidence={rev.frameProfile.confidence}
                          manualInputRequired={rev.frameProfile.manualInputRequired}
                          learnedAdjustment={isFieldLearned("enhancedRevealDetails.frameProfile.type")}
                          openingId={currentOpeningId}
                          scanId={currentScanId}
                          onOverrideSubmitted={handleOverrideSubmitted}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Throat: {rev.frameProfile.throatDepthInches}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                        Stop Type
                        <ManualTag show={rev.stopType.manualInputRequired} />
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <UnknownValue value={rev.stopType.type} manual={rev.stopType.manualInputRequired} testId="text-stop-type" />
                        <OverrideField
                          fieldPath="enhancedRevealDetails.stopType.type"
                          currentValue={rev.stopType.type}
                          confidence={rev.stopType.confidence}
                          manualInputRequired={rev.stopType.manualInputRequired}
                          learnedAdjustment={isFieldLearned("enhancedRevealDetails.stopType.type")}
                          openingId={currentOpeningId}
                          scanId={currentScanId}
                          onOverrideSubmitted={handleOverrideSubmitted}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{rev.stopType.removable ? "Removable" : "Fixed"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Rabbet Depth</span>
                      <p className="font-medium">{rev.frameProfile.rabbetDepthInches}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Perimeter Seal</span>
                      <p className="font-medium" data-testid="text-perimeter-seal">{rev.perimeterSeal.type}</p>
                    </div>
                  </div>
                  {rev.glazingBead.required && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs" data-testid="badge-glazing-bead">
                        {rev.glazingBead.type}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {acc && (acc.visionKits.length > 0 || acc.louvers.length > 0 || acc.mouldingProfiles.length > 0 || acc.weatherstripping.length > 0) && (
                <div className="border-t pt-3">
                  <span className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
                    Accessories & Components
                    {acc.manualInputRequired && (
                      <Badge variant="destructive" className="text-xs" data-testid="badge-accessories-manual">
                        <AlertTriangle className="h-3 w-3 mr-1" />Manual Input Needed
                      </Badge>
                    )}
                  </span>
                  <div className="space-y-2">
                    {acc.visionKits.map((vk: any, i: number) => (
                      <div key={`vk-${i}`} className={`flex items-start justify-between text-xs p-2 rounded-md bg-muted/30 ${vk.manualInputRequired ? "border border-destructive/30" : ""}`} data-testid={`text-vision-kit-${i}`}>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-medium flex items-center gap-1 flex-wrap">
                            <Glasses className="h-3 w-3 shrink-0" />
                            {vk.subType} Vision Kit
                            {vk.manualInputRequired && <ManualTag show={true} />}
                          </div>
                          <div className="text-muted-foreground">{vk.sizeDescription} — {vk.location}</div>
                          {vk.glazingType && <div className="text-muted-foreground">Glazing: {vk.glazingType}</div>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          {vk.fireRated && <Badge variant="destructive" className="text-xs">Fire Rated</Badge>}
                          <Badge variant={vk.confidence >= 0.8 ? 'default' : vk.manualInputRequired ? 'destructive' : 'secondary'} className="text-xs">{Math.round(vk.confidence * 100)}%</Badge>
                        </div>
                      </div>
                    ))}
                    {acc.louvers.map((lv: any, i: number) => (
                      <div key={`lv-${i}`} className={`flex items-start justify-between text-xs p-2 rounded-md bg-muted/30 ${lv.manualInputRequired ? "border border-destructive/30" : ""}`} data-testid={`text-louver-${i}`}>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-medium flex items-center gap-1 flex-wrap">
                            <Wind className="h-3 w-3 shrink-0" />
                            {lv.subType} Louver
                            {lv.manualInputRequired && <ManualTag show={true} />}
                          </div>
                          <div className="text-muted-foreground">{lv.sizeDescription} — {lv.location}</div>
                          <div className="text-muted-foreground">{lv.notes}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          {lv.fireRated && <Badge variant="destructive" className="text-xs">Fire Rated</Badge>}
                          <Badge variant={lv.confidence >= 0.8 ? 'default' : lv.manualInputRequired ? 'destructive' : 'secondary'} className="text-xs">{Math.round(lv.confidence * 100)}%</Badge>
                        </div>
                      </div>
                    ))}
                    {acc.mouldingProfiles.map((mp: any, i: number) => (
                      <div key={`mp-${i}`} className={`flex items-start justify-between text-xs p-2 rounded-md bg-muted/30 ${mp.manualInputRequired ? "border border-destructive/30" : ""}`} data-testid={`text-moulding-${i}`}>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-medium flex items-center gap-1 flex-wrap">
                            {mp.subType}
                            {mp.manualInputRequired && <ManualTag show={true} />}
                          </div>
                          <div className="text-muted-foreground">{mp.sizeDescription} — {mp.location}</div>
                        </div>
                        <Badge variant={mp.manualInputRequired ? 'destructive' : 'secondary'} className="text-xs">{Math.round(mp.confidence * 100)}%</Badge>
                      </div>
                    ))}
                    {acc.weatherstripping.map((ws: any, i: number) => (
                      <div key={`ws-${i}`} className={`flex items-start justify-between text-xs p-2 rounded-md bg-muted/30 ${ws.manualInputRequired ? "border border-destructive/30" : ""}`} data-testid={`text-weatherstrip-${i}`}>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-medium flex items-center gap-1 flex-wrap">
                            {ws.subType} Weatherstripping
                            {ws.manualInputRequired && <ManualTag show={true} />}
                          </div>
                          <div className="text-muted-foreground">{ws.sizeDescription}</div>
                          <div className="text-muted-foreground">{ws.notes}</div>
                        </div>
                        <Badge variant={ws.manualInputRequired ? 'destructive' : 'secondary'} className="text-xs">{Math.round(ws.confidence * 100)}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {acc && (
                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Smoke Seal</span>
                      <div className="flex items-center gap-1">
                        {acc.smokeSeal.required ? (
                          <Badge variant="destructive" className="text-xs" data-testid="badge-smoke-seal">{acc.smokeSeal.type}</Badge>
                        ) : (
                          <span className="text-sm font-medium" data-testid="text-smoke-seal">Not Required</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Threshold</span>
                      <p className="font-medium text-sm" data-testid="text-threshold">{acc.thresholdType.type}</p>
                      {acc.thresholdType.adaCompliant && <p className="text-xs text-muted-foreground">ADA Compliant</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        );
      })()}

      {hasProcessedScans && hardwareIdQuery.data?.conditionAssessment && (() => {
        const cond = hardwareIdQuery.data.conditionAssessment;
        const condAppliedLearning: any[] = hardwareIdQuery.data.appliedLearning || [];
        const condOpeningId = opening?.id || "";
        const condScanId = hardwareIdQuery.data.scanId;
        const condOverrideSubmitted = () => {
          queryClient.invalidateQueries({ queryKey: ['/api/openings', opening?.id, 'hardware-identification'] });
        };
        const isCondFieldLearned = (fp: string) => condAppliedLearning.some((l: any) => l.fieldPath === fp);
        const ratingColor = (r: string) => r === 'Good' ? 'default' : r === 'Fair' ? 'secondary' : 'destructive';
        return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardCheck className="h-4 w-4" />
                Condition Assessment
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {cond.manualInputRequired && (
                  <Badge variant="destructive" className="text-xs" data-testid="badge-condition-manual">
                    <AlertTriangle className="h-3 w-3 mr-1" />Manual Input Needed
                  </Badge>
                )}
                <Badge variant={ratingColor(cond.overallRating)} data-testid="badge-overall-condition">
                  {cond.overallRating}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                    Frame
                    {cond.frameCondition.manualInputRequired && (
                      <Badge variant="destructive" className="text-xs" data-testid="badge-frame-cond-manual">
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant={ratingColor(cond.frameCondition.rating)} className={`text-xs ${cond.frameCondition.manualInputRequired ? "opacity-60" : ""}`} data-testid="badge-frame-condition">
                      {cond.frameCondition.rating}{cond.frameCondition.manualInputRequired ? " *" : ""}
                    </Badge>
                    <OverrideField
                      fieldPath="conditionAssessment.frameCondition.rating"
                      currentValue={cond.frameCondition.rating}
                      confidence={cond.frameCondition.confidence}
                      manualInputRequired={cond.frameCondition.manualInputRequired}
                      learnedAdjustment={isCondFieldLearned("conditionAssessment.frameCondition.rating")}
                      openingId={condOpeningId}
                      scanId={condScanId}
                      onOverrideSubmitted={condOverrideSubmitted}
                    />
                  </div>
                  {cond.frameCondition.notes.map((n: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">{n}</p>
                  ))}
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                    Door
                    {cond.doorCondition.manualInputRequired && (
                      <Badge variant="destructive" className="text-xs" data-testid="badge-door-cond-manual">
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant={ratingColor(cond.doorCondition.rating)} className={`text-xs ${cond.doorCondition.manualInputRequired ? "opacity-60" : ""}`} data-testid="badge-door-condition">
                      {cond.doorCondition.rating}{cond.doorCondition.manualInputRequired ? " *" : ""}
                    </Badge>
                    <OverrideField
                      fieldPath="conditionAssessment.doorCondition.rating"
                      currentValue={cond.doorCondition.rating}
                      confidence={cond.doorCondition.confidence}
                      manualInputRequired={cond.doorCondition.manualInputRequired}
                      learnedAdjustment={isCondFieldLearned("conditionAssessment.doorCondition.rating")}
                      openingId={condOpeningId}
                      scanId={condScanId}
                      onOverrideSubmitted={condOverrideSubmitted}
                    />
                  </div>
                  {cond.doorCondition.notes.map((n: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">{n}</p>
                  ))}
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 flex-wrap">
                    Hardware
                    {cond.hardwareCondition.manualInputRequired && (
                      <Badge variant="destructive" className="text-xs" data-testid="badge-hw-cond-manual">
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant={ratingColor(cond.hardwareCondition.rating)} className={`text-xs ${cond.hardwareCondition.manualInputRequired ? "opacity-60" : ""}`} data-testid="badge-hw-condition">
                      {cond.hardwareCondition.rating}{cond.hardwareCondition.manualInputRequired ? " *" : ""}
                    </Badge>
                    <OverrideField
                      fieldPath="conditionAssessment.hardwareCondition.rating"
                      currentValue={cond.hardwareCondition.rating}
                      confidence={cond.hardwareCondition.confidence}
                      manualInputRequired={cond.hardwareCondition.manualInputRequired}
                      learnedAdjustment={isCondFieldLearned("conditionAssessment.hardwareCondition.rating")}
                      openingId={condOpeningId}
                      scanId={condScanId}
                      onOverrideSubmitted={condOverrideSubmitted}
                    />
                  </div>
                  {cond.hardwareCondition.notes.map((n: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">{n}</p>
                  ))}
                </div>
              </div>

              {cond.complianceGaps.length > 0 && (
                <div className="border-t pt-3">
                  <span className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Compliance Gaps ({cond.complianceGaps.length})
                  </span>
                  <div className="space-y-2">
                    {cond.complianceGaps.map((gap: any, i: number) => (
                      <div key={i} className="text-xs p-2 rounded-md bg-muted/30 space-y-1" data-testid={`text-compliance-gap-${i}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{gap.code} {gap.section}</span>
                          <Badge variant={gap.severity === 'Critical' ? 'destructive' : gap.severity === 'High' ? 'destructive' : 'secondary'} className="text-xs">
                            {gap.severity}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{gap.requirement}</p>
                        <p className="text-muted-foreground">Current: {gap.currentStatus}</p>
                        <p>{gap.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cond.recommendedUpgrades.length > 0 && (
                <div className="border-t pt-3">
                  <span className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" /> Recommended Upgrades ({cond.recommendedUpgrades.length})
                  </span>
                  <div className="space-y-2">
                    {cond.recommendedUpgrades.map((upgrade: any, i: number) => (
                      <div key={i} className="text-xs p-2 rounded-md bg-muted/30 space-y-1" data-testid={`text-upgrade-${i}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{upgrade.component}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant={ratingColor(upgrade.currentCondition)} className="text-xs">{upgrade.currentCondition}</Badge>
                            <Badge variant={upgrade.priority === 'Critical' || upgrade.priority === 'High' ? 'destructive' : 'secondary'} className="text-xs">
                              {upgrade.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{upgrade.issue}</p>
                        <p>{upgrade.recommendation}</p>
                        <p className="text-muted-foreground">Impact: {upgrade.estimatedImpact}</p>
                        {upgrade.codeReference && <p className="text-muted-foreground">Ref: {upgrade.codeReference}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cond.complianceGaps.length === 0 && cond.recommendedUpgrades.length === 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    No compliance gaps or upgrade recommendations identified
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        );
      })()}

      {hasProcessedScans && opening && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ArrowLeftRight className="h-4 w-4" />
                Reveal & Gap Analysis
              </CardTitle>
              {revealData && (
                <Badge 
                  variant={revealData.tolerances?.overallWithinSpec ? 'default' : 'destructive'}
                  data-testid="badge-reveal-status"
                >
                  {revealData.tolerances?.overallWithinSpec ? 'Within Spec' : 'Out of Spec'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {processedScans.length >= 2 && !pairedScan && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pair a closed-door scan with an open-door scan to measure reveals, gaps and door leaf dimensions.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {processedScans.map((scan) => (
                    <div key={scan.id} className="text-xs p-2 rounded-md bg-muted/50 flex items-center gap-2">
                      <CircleDot className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{scan.scanLabel || scan.originalFilename}</span>
                      <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                        {scan.scanPurpose === 'dual-closed' ? 'Closed' :
                         scan.scanPurpose === 'dual-closed-a' ? 'Closed A' :
                         scan.scanPurpose === 'dual-closed-b' ? 'Closed B' :
                         scan.scanPurpose === 'dual-open' ? 'Open' : 'Single'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={(val) => {
                    const parts = val.split('|');
                    if (parts.length === 2) {
                      pairScansMutation.mutate({ closedScanId: parts[0], openScanId: parts[1] });
                    }
                  }}>
                    <SelectTrigger data-testid="select-pair-scans" className="flex-1">
                      <SelectValue placeholder="Select pair..." />
                    </SelectTrigger>
                    <SelectContent>
                      {processedScans.map((closedScan, ci) => 
                        processedScans.filter((_, oi) => oi !== ci).map(openScan => (
                          <SelectItem key={`${closedScan.id}|${openScan.id}`} value={`${closedScan.id}|${openScan.id}`}>
                            {(closedScan.scanLabel || closedScan.originalFilename).substring(0, 15)} (closed) + {(openScan.scanLabel || openScan.originalFilename).substring(0, 15)} (open)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {pairedScan && !revealData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">Closed</Badge>
                  <span className="truncate text-muted-foreground">{latestProcessedScan?.scanLabel || latestProcessedScan?.originalFilename}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">Open</Badge>
                  <span className="truncate text-muted-foreground">{pairedScan.scanLabel || pairedScan.originalFilename}</span>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => latestProcessedScan && analyzeRevealsMutation.mutate(latestProcessedScan.id)}
                  disabled={analyzeRevealsMutation.isPending}
                  data-testid="button-analyze-reveals"
                >
                  {analyzeRevealsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Analyze Reveals & Gaps
                    </>
                  )}
                </Button>
              </div>
            )}

            {revealData && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reveals</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Left</p>
                      <p className="font-medium text-sm" data-testid="text-reveal-left">{revealData.reveals?.left?.valueInches || '—'}</p>
                      <p className="text-xs text-muted-foreground">{revealData.reveals?.left?.valueMM?.toFixed(1)}mm</p>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Top</p>
                      <p className="font-medium text-sm" data-testid="text-reveal-top">{revealData.reveals?.top?.valueInches || '—'}</p>
                      <p className="text-xs text-muted-foreground">{revealData.reveals?.top?.valueMM?.toFixed(1)}mm</p>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Right</p>
                      <p className="font-medium text-sm" data-testid="text-reveal-right">{revealData.reveals?.right?.valueInches || '—'}</p>
                      <p className="text-xs text-muted-foreground">{revealData.reveals?.right?.valueMM?.toFixed(1)}mm</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gaps & Clearances</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {revealData.gaps && Object.entries(revealData.gaps).map(([key, gap]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between p-2 rounded-md bg-muted/50" data-testid={`text-gap-${key}`}>
                        <span className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{gap.valueInches}</span>
                          {gap.withinSpec ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <TriangleAlert className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {revealData.doorLeafDimensions && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Door Leaf</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">Width</p>
                        <p className="font-medium" data-testid="text-leaf-width">{revealData.doorLeafDimensions.widthMM?.toFixed(0)}mm</p>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">Height</p>
                        <p className="font-medium" data-testid="text-leaf-height">{revealData.doorLeafDimensions.heightMM?.toFixed(0)}mm</p>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">Thickness</p>
                        <p className="font-medium" data-testid="text-leaf-thickness">{revealData.doorLeafDimensions.thicknessMM?.toFixed(1)}mm</p>
                      </div>
                    </div>
                  </div>
                )}

                {revealData.tolerances?.findings?.length > 0 && (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowRevealDetails(!showRevealDetails)}
                      data-testid="button-toggle-reveal-details"
                    >
                      {showRevealDetails ? 'Hide Tolerance Details' : 'Show Tolerance Details'}
                    </Button>
                    {showRevealDetails && (
                      <div className="space-y-1 pt-2 border-t">
                        {revealData.tolerances.findings.map((f: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50" data-testid={`text-tolerance-finding-${i}`}>
                            <span className="capitalize">{f.field.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <div className="flex items-center gap-2">
                              <span>{f.valueMM?.toFixed(1)}mm / {f.specMM?.toFixed(1)}mm spec</span>
                              <Badge variant={f.status === 'pass' ? 'default' : f.status === 'marginal' ? 'secondary' : 'destructive'} className="text-xs" data-testid={`badge-tolerance-status-${i}`}>
                                {f.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {processedScans.length < 2 && !revealData && (
              <p className="text-sm text-muted-foreground">
                Upload three scans to measure reveals, gaps and tolerances: one with the door open (capturing both sides), and two with the door closed from opposite sides (Side A and Side B). This enables precise measurement of door leaf dimensions, edge clearances, and complete hardware assessment.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload LiDAR Scan
            {isOnline ? (
              <Cloud className="h-4 w-4 text-green-500 ml-auto" />
            ) : (
              <CloudOff className="h-4 w-4 text-amber-500 ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DragDropUpload
            onFileSelect={handleFileSelect}
            selectedFile={lidarFile}
            isUploading={uploadLidarScanMutation.isPending}
            accept={ACCEPTED_FILE_TYPES.join(',')}
          />

          {uploadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress.percentage}%</span>
              </div>
              <Progress 
                value={uploadProgress.percentage} 
                className="h-2"
                data-testid="progress-upload"
              />
              <p className="text-xs text-muted-foreground">
                {(uploadProgress.loaded / 1024 / 1024).toFixed(1)} MB of{" "}
                {(uploadProgress.total / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Scan Label (Optional)
            </label>
            <Input
              value={lidarScanLabel}
              onChange={(e) => setLidarScanLabel(e.target.value)}
              placeholder="e.g., Main entrance front scan"
              data-testid="input-scan-label"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Capture Method
            </label>
            <Select
              value={lidarCaptureMethod}
              onValueChange={setLidarCaptureMethod}
            >
              <SelectTrigger data-testid="select-capture-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="lidarkit">LiDARKit</SelectItem>
                <SelectItem value="arkit">ARKit</SelectItem>
                <SelectItem value="ios_lidar">iOS LiDAR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Scan Purpose
            </label>
            <Select
              value={lidarScanPurpose}
              onValueChange={setLidarScanPurpose}
            >
              <SelectTrigger data-testid="select-scan-purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Scan</SelectItem>
                <SelectItem value="dual-open">Door Open (Both Sides)</SelectItem>
                <SelectItem value="dual-closed-a">Door Closed - Side A</SelectItem>
                <SelectItem value="dual-closed-b">Door Closed - Side B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Device Info (Optional)
            </label>
            <Input
              value={lidarDeviceInfo}
              onChange={(e) => setLidarDeviceInfo(e.target.value)}
              placeholder="e.g., iPhone 13 Pro, iOS 15.4"
              data-testid="input-device-info"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Capture Notes (Optional)
            </label>
            <Textarea
              value={lidarCaptureNotes}
              onChange={(e) => setLidarCaptureNotes(e.target.value)}
              placeholder="Add any notes about this scan..."
              rows={3}
              data-testid="textarea-capture-notes"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={!lidarFile || uploadLidarScanMutation.isPending}
            className="w-full"
            data-testid="button-upload-scan"
          >
            {uploadLidarScanMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Scan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {lidarScans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Scan History ({lidarScans.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {lidarScans.some(s => s.processingStatus === 'uploaded' || s.processingStatus === 'failed') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      lidarScans
                        .filter(s => s.processingStatus === 'uploaded' || s.processingStatus === 'failed')
                        .forEach(s => handleProcess(s.id));
                    }}
                    disabled={processLidarScan.isPending}
                    data-testid="button-reprocess-all"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reprocess
                  </Button>
                )}
                {lidarScans.filter(s => s.processingStatus === 'processed').length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCompareMode(!compareMode)}
                    data-testid="button-toggle-compare"
                  >
                    {compareMode ? 'Exit Compare' : 'Compare Scans'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lidarScans.map((scan, index) => (
              <div key={scan.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full shrink-0 mt-1.5 ${
                    scan.processingStatus === 'processed' ? 'bg-green-500' :
                    scan.processingStatus === 'processing' ? 'bg-blue-500 animate-pulse' :
                    scan.processingStatus === 'failed' ? 'bg-red-500' :
                    'bg-muted-foreground/30'
                  }`} />
                  {index < lidarScans.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {compareMode && scan.processingStatus === 'processed' && (
                            <input
                              type="checkbox"
                              checked={compareSelection.includes(scan.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCompareSelection(prev => prev.length < 2 ? [...prev, scan.id] : prev);
                                } else {
                                  setCompareSelection(prev => prev.filter(id => id !== scan.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-input"
                              data-testid={`checkbox-compare-${scan.id}`}
                            />
                          )}
                          <h4 className="font-medium truncate">
                            {scan.scanLabel || scan.originalFilename}
                          </h4>
                          {scan.processingStatus === "uploaded" && (
                            <Badge variant="secondary" data-testid={`badge-status-${scan.id}`}>
                              <Clock className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          )}
                          {scan.processingStatus === "processing" && (
                            <Badge variant="default" data-testid={`badge-status-${scan.id}`}>
                              <Clock className="w-3 h-3 mr-1 animate-spin" />
                              Processing
                            </Badge>
                          )}
                          {scan.processingStatus === "processed" && (
                            <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${scan.id}`}>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Processed
                            </Badge>
                          )}
                          {scan.processingStatus === "failed" && (
                            <Badge variant="destructive" data-testid={`badge-status-${scan.id}`}>
                              <XCircle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                          {(() => {
                            if (scan.processingStatus !== "processed" || !scan.confidenceScores) return null;
                            const scores = scan.confidenceScores as Record<string, number>;
                            if (scores.overall == null) return null;
                            return (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-confidence-${scan.id}`}>
                                {(scores.overall * 100).toFixed(0)}% confidence
                              </Badge>
                            );
                          })()}
                        </div>

                        {scan.scanLabel && scan.scanLabel !== scan.originalFilename && (
                          <p className="text-xs text-muted-foreground">{scan.originalFilename}</p>
                        )}

                        <div className="text-sm text-muted-foreground">
                          <p>Format: {scan.scanFormat.toUpperCase()} • Capture: {scan.captureMethod}</p>
                          <p>Size: {(scan.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                          {scan.captureNotes && <p>Notes: {scan.captureNotes}</p>}
                          {scan.deviceInfo && <p>Device: {scan.deviceInfo}</p>}
                          <p className="text-xs">
                            Uploaded: {new Date(scan.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {scan.processingStatus === "processed" && scan.processedMetrics ? (
                          <ProcessedMetricsDisplay 
                            metrics={scan.processedMetrics as Record<string, any>} 
                            scores={scan.confidenceScores as Record<string, number> | null}
                            scanId={scan.id}
                          />
                        ) : null}
                      </div>

                      <div className="flex gap-2 ml-4">
                        {scan.processingStatus === "uploaded" && (
                          <Button
                            size="sm"
                            onClick={() => handleProcess(scan.id)}
                            disabled={processLidarScan.isPending && selectedScanForProcessing === scan.id}
                            data-testid={`button-process-${scan.id}`}
                            title="Process scan"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(scan.id)}
                          disabled={deleteLidarScan.isPending}
                          data-testid={`button-delete-${scan.id}`}
                          title="Delete scan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ))}

            {compareMode && compareSelection.length === 2 && (() => {
              const scan1 = lidarScans.find(s => s.id === compareSelection[0]);
              const scan2 = lidarScans.find(s => s.id === compareSelection[1]);
              if (!scan1?.processedMetrics || !scan2?.processedMetrics) return null;
              const m1 = scan1.processedMetrics as any;
              const m2 = scan2.processedMetrics as any;

              return (
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Scan Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Metric</th>
                            <th className="text-right py-2 px-4 font-medium truncate max-w-[120px]">{scan1.scanLabel || scan1.originalFilename}</th>
                            <th className="text-right py-2 px-4 font-medium truncate max-w-[120px]">{scan2.scanLabel || scan2.originalFilename}</th>
                            <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Diff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Width', v1: m1.width, v2: m2.width, unit: 'mm' },
                            { label: 'Height', v1: m1.height, v2: m2.height, unit: 'mm' },
                            { label: 'Frame Depth', v1: m1.frameDepth, v2: m2.frameDepth, unit: 'mm' },
                          ].filter(r => r.v1 != null || r.v2 != null).map((row) => {
                            const diff = (row.v1 != null && row.v2 != null) ? Math.abs(row.v1 - row.v2) : null;
                            return (
                              <tr key={row.label} className="border-b last:border-b-0">
                                <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                                <td className="py-2 px-4 text-right font-mono">{row.v1 != null ? `${row.v1} ${row.unit}` : '-'}</td>
                                <td className="py-2 px-4 text-right font-mono">{row.v2 != null ? `${row.v2} ${row.unit}` : '-'}</td>
                                <td className={`py-2 pl-4 text-right font-mono ${diff != null && diff > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                  {diff != null ? `${diff.toFixed(1)} ${row.unit}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {lidarScans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Scan className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No LiDAR scans yet</h3>
            <p className="text-muted-foreground">
              Upload a point cloud scan to automatically measure this opening.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
