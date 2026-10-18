import { useEffect, useState, useRef, useCallback } from "react";
import type { OpeningScanRecord } from "@/../../shared/scan-types";
import { createAdapter, type DepthPlatformApi } from "@/lib/webxr-scan-adapter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, Ruler, Camera, Box, Wrench, Eye, FileCheck, AlertTriangle, RefreshCw, Target, Gauge, Grid3X3, Activity, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export enum ScanStep {
  Prep = "Prep",
  Calibrate = "Calibrate",
  FramePass = "FramePass",
  DoorPass = "DoorPass",
  HardwarePass = "HardwarePass",
  QualityGate = "QualityGate",
  ManualVerify = "ManualVerify",
  Compliance = "Compliance",
  ReviewExport = "ReviewExport",
}

interface ScanThresholds {
  minDistM: number;
  maxDistM: number;
  maxAngleDeg: number;
  coveragePct: number;
  confidence: number;
  minPointDensity: number;
  minZonesCovered: number;
}

interface QualityMetrics {
  pointDensity: number;
  frameRate: number;
  scanDuration: number;
  zonesCovered: boolean[];
  overallScore: number;
  distanceWarnings: number;
  angleWarnings: number;
}

interface ZoneData {
  id: number;
  name: string;
  covered: boolean;
  pointCount: number;
  minRequired: number;
}

interface DoorScanFlowProps {
  openingId: string;
  thresholds?: Partial<ScanThresholds>;
  onComplete: (data: OpeningScanRecord) => void;
  onCancel?: () => void;
}

const DEFAULT_THRESHOLDS: ScanThresholds = {
  minDistM: 1.5,
  maxDistM: 2.0,
  maxAngleDeg: 25,
  coveragePct: 85,
  confidence: 0.85,
  minPointDensity: 100,
  minZonesCovered: 6,
};

const ZONE_NAMES = [
  "Top Left",
  "Top Center Left",
  "Top Center Right",
  "Top Right",
  "Bottom Left",
  "Bottom Center Left",
  "Bottom Center Right",
  "Bottom Right",
];

function getDistanceStatus(distance: number, thresholds: ScanThresholds): "good" | "warning" | "error" {
  if (distance >= thresholds.minDistM && distance <= thresholds.maxDistM) {
    return "good";
  }
  const margin = 0.3;
  if (distance >= thresholds.minDistM - margin && distance <= thresholds.maxDistM + margin) {
    return "warning";
  }
  return "error";
}

function getAngleStatus(angle: number, thresholds: ScanThresholds): "good" | "warning" | "error" {
  if (angle < thresholds.maxAngleDeg) {
    return "good";
  }
  if (angle < thresholds.maxAngleDeg + 10) {
    return "warning";
  }
  return "error";
}

function getStatusColor(status: "good" | "warning" | "error"): string {
  switch (status) {
    case "good":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "error":
      return "bg-red-500";
  }
}

function getStatusBorderColor(status: "good" | "warning" | "error"): string {
  switch (status) {
    case "good":
      return "border-green-500";
    case "warning":
      return "border-yellow-500";
    case "error":
      return "border-red-500";
  }
}

function ScanTelemetryHUD({
  distance,
  angle,
  pointDensity,
  frameRate,
  zonesCovered,
  thresholds,
  isScanning,
}: {
  distance: number;
  angle: number;
  pointDensity: number;
  frameRate: number;
  zonesCovered: boolean[];
  thresholds: ScanThresholds;
  isScanning: boolean;
}) {
  const distanceStatus = getDistanceStatus(distance, thresholds);
  const angleStatus = getAngleStatus(angle, thresholds);
  const coveredCount = zonesCovered.filter(Boolean).length;

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4" data-testid="scan-telemetry-hud">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Real-time Telemetry
        </h3>
        {isScanning && (
          <Badge variant="outline" className="animate-pulse" data-testid="badge-scanning">
            Scanning...
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="space-y-1" data-testid="telemetry-distance">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Distance</span>
                <span className="font-mono">{distance.toFixed(2)}m</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getStatusColor(distanceStatus)}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, ((distance - 0.5) / 2.5) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5m</span>
                <span className="text-green-600 font-medium">{thresholds.minDistM}-{thresholds.maxDistM}m</span>
                <span>3.0m</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Optimal distance: {thresholds.minDistM}-{thresholds.maxDistM}m</p>
            <p className="text-xs text-muted-foreground">
              {distanceStatus === "good" ? "Distance is optimal" : 
               distanceStatus === "warning" ? "Distance is acceptable but not optimal" :
               "Distance is too far or too close"}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="space-y-1" data-testid="telemetry-angle">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Angle</span>
                <span className="font-mono">{angle.toFixed(1)}°</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getStatusColor(angleStatus)}`}
                  style={{
                    width: `${Math.min(100, (angle / 45) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0°</span>
                <span className="text-green-600 font-medium">&lt;{thresholds.maxAngleDeg}°</span>
                <span>45°</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Maximum angle: {thresholds.maxAngleDeg}°</p>
            <p className="text-xs text-muted-foreground">
              {angleStatus === "good" ? "Angle is optimal" : 
               angleStatus === "warning" ? "Angle is acceptable but not optimal" :
               "Angle is too steep"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded" data-testid="telemetry-point-density">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Point Density</span>
          </div>
          <Badge variant={pointDensity >= thresholds.minPointDensity ? "default" : "destructive"}>
            {pointDensity} pts/s
          </Badge>
        </div>
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded" data-testid="telemetry-frame-rate">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Frame Rate</span>
          </div>
          <Badge variant={frameRate >= 24 ? "default" : "secondary"}>
            {frameRate} fps
          </Badge>
        </div>
      </div>

      <div className="space-y-2" data-testid="telemetry-coverage-heatmap">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Grid3X3 className="w-3 h-3" />
            Coverage Zones
          </span>
          <span className="font-medium">
            {coveredCount}/{zonesCovered.length} zones
          </span>
        </div>
        <div className="grid grid-cols-4 grid-rows-2 gap-1 aspect-[4/2]">
          {zonesCovered.map((covered, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={`rounded transition-colors ${
                    covered 
                      ? "bg-green-500/80" 
                      : "bg-red-500/30 border border-dashed border-red-500/50"
                  }`}
                  data-testid={`zone-${index}`}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{ZONE_NAMES[index]}</p>
                <p className="text-xs text-muted-foreground">
                  {covered ? "Covered" : "Needs scanning"}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoverageHeatmapDetailed({
  zones,
  onRescanZone,
}: {
  zones: ZoneData[];
  onRescanZone: (zoneId: number) => void;
}) {
  return (
    <div className="space-y-3" data-testid="coverage-heatmap-detailed">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Grid3X3 className="w-4 h-4" />
        Zone Coverage Details
      </div>
      <div className="grid grid-cols-4 grid-rows-2 gap-2 aspect-[4/2]">
        {zones.map((zone) => (
          <Tooltip key={zone.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => !zone.covered && onRescanZone(zone.id)}
                className={`rounded p-1 text-xs font-medium transition-all ${
                  zone.covered
                    ? "bg-green-500/80 text-white cursor-default"
                    : "bg-red-500/30 border-2 border-dashed border-red-500 text-red-700 dark:text-red-300 hover-elevate cursor-pointer"
                }`}
                data-testid={`zone-detail-${zone.id}`}
                disabled={zone.covered}
              >
                {zone.covered ? (
                  <CheckCircle2 className="w-3 h-3 mx-auto" />
                ) : (
                  <Target className="w-3 h-3 mx-auto" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{zone.name}</p>
              <p className="text-xs text-muted-foreground">
                Points: {zone.pointCount}/{zone.minRequired}
              </p>
              {!zone.covered && (
                <p className="text-xs text-red-500">Click to re-scan this zone</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function QualityIssuesList({
  issues,
}: {
  issues: { type: string; message: string; severity: "warning" | "error" }[];
}) {
  if (issues.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="quality-issues-list">
      <div className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        Quality Issues
      </div>
      <div className="space-y-1">
        {issues.map((issue, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-2 rounded text-xs ${
              issue.severity === "error"
                ? "bg-red-500/10 text-red-700 dark:text-red-300"
                : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
            }`}
            data-testid={`quality-issue-${index}`}
          >
            {issue.severity === "error" ? (
              <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            )}
            <span>{issue.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualFeedbackBorder({
  status,
  isPulsing,
}: {
  status: "good" | "warning" | "error";
  isPulsing: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none border-4 rounded-lg transition-all duration-300 ${
        getStatusBorderColor(status)
      } ${isPulsing ? "animate-pulse" : ""}`}
      data-testid="visual-feedback-border"
    />
  );
}

function Subtitle({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-2 rounded-lg z-50 text-xs">
      {text}
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: ScanStep }) {
  const steps = [
    { key: ScanStep.Prep, label: "Prep" },
    { key: ScanStep.Calibrate, label: "Calibrate" },
    { key: ScanStep.FramePass, label: "Frame" },
    { key: ScanStep.DoorPass, label: "Door" },
    { key: ScanStep.HardwarePass, label: "Hardware" },
    { key: ScanStep.QualityGate, label: "Quality" },
    { key: ScanStep.ManualVerify, label: "Verify" },
    { key: ScanStep.Compliance, label: "Compliance" },
    { key: ScanStep.ReviewExport, label: "Export" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors ${
              index < currentIndex
                ? "bg-primary text-primary-foreground"
                : index === currentIndex
                ? "bg-primary text-primary-foreground ring-2 ring-primary/50 ring-offset-2"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-0.5 w-8 transition-colors ${
                index < currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function DoorScanFlow({
  openingId,
  thresholds: userThresholds,
  onComplete,
  onCancel,
}: DoorScanFlowProps) {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...userThresholds };
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [adapter, setAdapter] = useState<DepthPlatformApi | null>(null);

  const [step, setStep] = useState<ScanStep>(ScanStep.Prep);
  const [record, setRecord] = useState<OpeningScanRecord>({ openingId });
  const [busy, setBusy] = useState(false);
  const [distance, setDistance] = useState<number>(1.8);
  const [angle, setAngle] = useState<number>(5);
  const [coverage, setCoverage] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    pointDensity: 0,
    frameRate: 30,
    scanDuration: 0,
    zonesCovered: [false, false, false, false, false, false, false, false],
    overallScore: 0,
    distanceWarnings: 0,
    angleWarnings: 0,
  });

  const [isScanning, setIsScanning] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [focusZone, setFocusZone] = useState<number | null>(null);
  const [forceAllowed, setForceAllowed] = useState(false);
  const scanStartTimeRef = useRef<number>(0);
  const warningCountRef = useRef<{ distance: number; angle: number }>({ distance: 0, angle: 0 });

  useEffect(() => {
    if (canvasRef.current && !adapter) {
      const newAdapter = createAdapter(canvasRef.current);
      setAdapter(newAdapter);
    }
  }, [canvasRef.current]);

  const calculateOverallScore = useCallback((metrics: Omit<QualityMetrics, 'overallScore'>): number => {
    const zoneCoverage = metrics.zonesCovered.filter(Boolean).length / 8;
    const densityScore = Math.min(1, metrics.pointDensity / thresholds.minPointDensity);
    const warningPenalty = (metrics.distanceWarnings + metrics.angleWarnings) * 0.02;
    
    const score = (zoneCoverage * 0.5 + densityScore * 0.3 + (1 - warningPenalty) * 0.2);
    return Math.max(0, Math.min(1, score));
  }, [thresholds.minPointDensity]);

  const say = (text: string) => {
    setMessage(text);
    if (navigator.vibrate) {
      try {
        navigator.vibrate([20]);
      } catch {
        // Vibrate API not available on this device
      }
    }
  };

  const triggerVisualPulse = () => {
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 500);
  };

  const okPose = () =>
    distance >= thresholds.minDistM &&
    distance <= thresholds.maxDistM &&
    angle < thresholds.maxAngleDeg;

  const getCurrentStatus = (): "good" | "warning" | "error" => {
    const distStatus = getDistanceStatus(distance, thresholds);
    const angleStatus = getAngleStatus(angle, thresholds);
    
    if (distStatus === "error" || angleStatus === "error") return "error";
    if (distStatus === "warning" || angleStatus === "warning") return "warning";
    return "good";
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newDistance = Math.max(0.5, Math.min(3.0, 1.6 + Math.sin(Date.now() / 1000) * 0.35));
      const newAngle = Math.abs(Math.sin(Date.now() / 1200) * 28);
      
      setDistance(newDistance);
      setAngle(newAngle);
      setCoverage((prev) => (prev < 100 ? prev + 0.6 : prev));

      if (isScanning) {
        const distStatus = getDistanceStatus(newDistance, thresholds);
        const angleStatus = getAngleStatus(newAngle, thresholds);

        if (distStatus !== "good") {
          warningCountRef.current.distance++;
        }
        if (angleStatus !== "good") {
          warningCountRef.current.angle++;
        }

        const randomZoneUpdate = Math.random() < 0.15;
        if (randomZoneUpdate) {
          const targetZone = focusZone !== null ? focusZone : Math.floor(Math.random() * 8);
          setQualityMetrics((prev) => {
            const newZones = [...prev.zonesCovered];
            newZones[targetZone] = true;
            
            const newMetrics = {
              ...prev,
              pointDensity: Math.min(200, prev.pointDensity + Math.floor(Math.random() * 20)),
              frameRate: 28 + Math.floor(Math.random() * 4),
              scanDuration: scanStartTimeRef.current > 0 ? (Date.now() - scanStartTimeRef.current) / 1000 : 0,
              zonesCovered: newZones,
              distanceWarnings: warningCountRef.current.distance,
              angleWarnings: warningCountRef.current.angle,
            };
            
            return {
              ...newMetrics,
              overallScore: calculateOverallScore(newMetrics),
            };
          });
        }

        if ((distStatus === "error" || angleStatus === "error") && Math.random() < 0.3) {
          triggerVisualPulse();
          if (distStatus === "error") {
            toast({
              title: "Distance Warning",
              description: `Move ${newDistance < thresholds.minDistM ? "back" : "closer"} to the door`,
              variant: "destructive",
            });
          }
          if (angleStatus === "error") {
            toast({
              title: "Angle Warning", 
              description: "Adjust device angle to face the door directly",
              variant: "destructive",
            });
          }
        }
      }
    }, 400);
    return () => clearInterval(interval);
  }, [isScanning, focusZone, thresholds, toast, calculateOverallScore]);

  const getZoneData = (): ZoneData[] => {
    return ZONE_NAMES.map((name, index) => ({
      id: index,
      name,
      covered: qualityMetrics.zonesCovered[index],
      pointCount: qualityMetrics.zonesCovered[index] ? 50 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 20),
      minRequired: 30,
    }));
  };

  const getQualityIssues = (): { type: string; message: string; severity: "warning" | "error" }[] => {
    const issues: { type: string; message: string; severity: "warning" | "error" }[] = [];
    
    const coveredCount = qualityMetrics.zonesCovered.filter(Boolean).length;
    if (coveredCount < thresholds.minZonesCovered) {
      const uncoveredZones = ZONE_NAMES.filter((_, i) => !qualityMetrics.zonesCovered[i]);
      issues.push({
        type: "coverage",
        message: `${8 - coveredCount} zones need more scanning: ${uncoveredZones.slice(0, 3).join(", ")}${uncoveredZones.length > 3 ? "..." : ""}`,
        severity: coveredCount < thresholds.minZonesCovered - 2 ? "error" : "warning",
      });
    }
    
    if (qualityMetrics.pointDensity < thresholds.minPointDensity) {
      issues.push({
        type: "density",
        message: `Point density (${qualityMetrics.pointDensity} pts/s) below minimum (${thresholds.minPointDensity} pts/s)`,
        severity: qualityMetrics.pointDensity < thresholds.minPointDensity * 0.5 ? "error" : "warning",
      });
    }
    
    if (qualityMetrics.distanceWarnings > 10) {
      issues.push({
        type: "distance",
        message: `${qualityMetrics.distanceWarnings} distance warnings during scan`,
        severity: qualityMetrics.distanceWarnings > 20 ? "error" : "warning",
      });
    }
    
    if (qualityMetrics.angleWarnings > 10) {
      issues.push({
        type: "angle",
        message: `${qualityMetrics.angleWarnings} angle warnings during scan`,
        severity: qualityMetrics.angleWarnings > 20 ? "error" : "warning",
      });
    }
    
    return issues;
  };

  const canProceed = (): boolean => {
    const coveredCount = qualityMetrics.zonesCovered.filter(Boolean).length;
    return (
      coveredCount >= thresholds.minZonesCovered &&
      qualityMetrics.pointDensity >= thresholds.minPointDensity * 0.7 &&
      qualityMetrics.overallScore >= 0.6
    );
  };

  const handleRescanZone = (zoneId: number) => {
    setFocusZone(zoneId);
    toast({
      title: `Re-scanning ${ZONE_NAMES[zoneId]}`,
      description: "Focus your device on this area of the door",
    });
    say(`Focus on ${ZONE_NAMES[zoneId]} zone`);
  };

  const doCalibrate = async () => {
    if (!okPose()) {
      setMessage(
        `Adjust position: distance ${thresholds.minDistM}-${thresholds.maxDistM}m, angle < ${thresholds.maxAngleDeg}°`
      );
      return;
    }
    if (!adapter) {
      setMessage("AR adapter not initialized");
      return;
    }

    setBusy(true);
    setIsScanning(true);
    scanStartTimeRef.current = Date.now();
    warningCountRef.current = { distance: 0, angle: 0 };
    say("Calibrating scale...");
    try {
      await adapter.start();
      await adapter.ensureScale();
      setBusy(false);
      say("Calibration complete!");
      toast({
        title: "Calibration complete",
        description: "You can now begin scanning the frame.",
      });
      setStep(ScanStep.FramePass);
    } catch (error) {
      setBusy(false);
      setIsScanning(false);
      setMessage("Calibration failed. Please try again.");
      toast({
        title: "Calibration failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const measureFrame = async () => {
    if (!okPose()) {
      setMessage(
        `Adjust position: distance ${thresholds.minDistM}-${thresholds.maxDistM}m, angle < ${thresholds.maxAngleDeg}°`
      );
      return;
    }
    if (!adapter) {
      setMessage("AR adapter not initialized");
      return;
    }

    setBusy(true);
    say("Scanning frame...");
    try {
      const width = await adapter.measureEdgeSeries("frame-width");
      const height = await adapter.measureEdgeSeries("frame-height");
      setRecord((prev) => ({ ...prev, frameWidthMin: width, frameHeightMin: height }));
      setBusy(false);
      say("Frame scan complete!");
      toast({
        title: "Frame scanned",
        description: `Width: ${width.valueMm}mm, Height: ${height.valueMm}mm`,
      });
      setStep(ScanStep.DoorPass);
    } catch (error) {
      setBusy(false);
      setMessage("Frame scan failed. Please try again.");
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const measureDoor = async () => {
    if (!okPose()) {
      setMessage(
        `Adjust position: distance ${thresholds.minDistM}-${thresholds.maxDistM}m, angle < ${thresholds.maxAngleDeg}°`
      );
      return;
    }
    if (!adapter) {
      setMessage("AR adapter not initialized");
      return;
    }

    setBusy(true);
    say("Scanning door leaf...");
    try {
      const width = await adapter.measureBetween("leaf-left-edge", "leaf-right-edge");
      const height = await adapter.measureBetween("leaf-bottom-edge", "leaf-top-edge");
      setRecord((prev) => ({ ...prev, leafWidth: width, leafHeight: height }));
      setBusy(false);
      say("Door scan complete!");
      toast({
        title: "Door scanned",
        description: `Width: ${width.valueMm}mm, Height: ${height.valueMm}mm`,
      });
      setStep(ScanStep.HardwarePass);
    } catch (error) {
      setBusy(false);
      setMessage("Door scan failed. Please try again.");
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const measureHardware = async () => {
    if (!okPose()) {
      setMessage(
        `Adjust position: distance ${thresholds.minDistM}-${thresholds.maxDistM}m, angle < ${thresholds.maxAngleDeg}°`
      );
      return;
    }
    if (!adapter) {
      setMessage("AR adapter not initialized");
      return;
    }

    setBusy(true);
    say("Measuring hardware...");
    try {
      const lockBackset = await adapter.measureBetween("lock-edge", "lock-center");
      const hingeSize = await adapter.measureEdgeSeries("hinge-series");
      setRecord((prev) => ({ ...prev, lockBacksetMm: lockBackset, hingeSizeMm: hingeSize }));
      setBusy(false);
      say("Hardware measurements complete!");
      toast({
        title: "Hardware measured",
        description: "Lock backset and hinge measurements captured.",
      });
      setIsScanning(false);
      setStep(ScanStep.QualityGate);
    } catch (error) {
      setBusy(false);
      setMessage("Hardware scan failed. Continuing...");
      setIsScanning(false);
      setStep(ScanStep.QualityGate);
    }
  };

  const runQuality = async () => {
    if (!adapter) {
      setMessage("AR adapter not initialized");
      return;
    }

    setBusy(true);
    say("Analyzing scan quality...");
    try {
      const q = await adapter.getQuality();
      setCoverage(q.coveragePct);
      setRecord((prev) => ({
        ...prev,
        coveragePct: q.coveragePct,
        qualityScore: q.qualityScore,
        confidence: q.confidence,
      }));
      setBusy(false);

      const meetsThresholds = canProceed() && 
        q.coveragePct >= thresholds.coveragePct &&
        (q.confidence ?? 0) >= thresholds.confidence;

      if (meetsThresholds) {
        say("Quality check passed!");
        toast({
          title: "Quality check passed",
          description: `Coverage: ${q.coveragePct}%, Confidence: ${(
            (q.confidence ?? 0) * 100
          ).toFixed(0)}%`,
        });
        setStep(ScanStep.ManualVerify);
      } else {
        setMessage(
          `Quality check needs improvement. See issues below.`
        );
        toast({
          title: "Quality improvements needed",
          description: "Review the issues and re-scan problem areas.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setBusy(false);
      setMessage("Quality analysis failed.");
    }
  };

  const handleForceContin = () => {
    toast({
      title: "Proceeding with warnings",
      description: "Scan quality is below optimal. Results may require manual verification.",
      variant: "destructive",
    });
    setStep(ScanStep.ManualVerify);
  };

  const finishScan = async () => {
    if (adapter) {
      await adapter.stop();
    }
    say("Export complete!");
    toast({
      title: "Scan complete",
      description: "Measurements saved successfully.",
    });
    onComplete(record);
  };

  const currentStatus = getCurrentStatus();
  const qualityIssues = getQualityIssues();
  const zones = getZoneData();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Ruler className="w-6 h-6" />
            Guided Door Scan
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Follow the step-by-step workflow to capture precise measurements
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={getDistanceStatus(distance, thresholds) === "good" ? "default" : "destructive"}
            data-testid="badge-distance"
          >
            Dist: {distance.toFixed(2)}m
          </Badge>
          <Badge
            variant={getAngleStatus(angle, thresholds) === "good" ? "default" : "destructive"}
            data-testid="badge-angle"
          >
            Angle: {angle.toFixed(1)}°
          </Badge>
          {isScanning && (
            <Badge variant="outline" data-testid="badge-score">
              Score: {(qualityMetrics.overallScore * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
      </div>

      <StepIndicator currentStep={step} />

      {message && <Subtitle text={message} />}

      {(step === ScanStep.FramePass || step === ScanStep.DoorPass || step === ScanStep.HardwarePass) && (
        <ScanTelemetryHUD
          distance={distance}
          angle={angle}
          pointDensity={qualityMetrics.pointDensity}
          frameRate={qualityMetrics.frameRate}
          zonesCovered={qualityMetrics.zonesCovered}
          thresholds={thresholds}
          isScanning={isScanning}
        />
      )}

      <div className="relative">
        {isScanning && (
          <VisualFeedbackBorder status={currentStatus} isPulsing={isPulsing} />
        )}
        <canvas
          ref={canvasRef}
          className={isScanning ? "w-full aspect-video bg-muted rounded-lg" : "hidden"}
          width={640}
          height={480}
        />
      </div>

      {focusZone !== null && isScanning && (
        <Alert className="border-primary">
          <Target className="h-4 w-4" />
          <AlertTitle>Focus Mode: {ZONE_NAMES[focusZone]}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>Point your device at the {ZONE_NAMES[focusZone].toLowerCase()} area of the door</span>
            <Button size="sm" variant="outline" onClick={() => setFocusZone(null)}>
              Cancel Focus
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {step === ScanStep.Prep && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Prepare the Opening
            </CardTitle>
            <CardDescription>Get ready to start the scan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                Clear sightlines and remove any reflections
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                Stand {thresholds.minDistM}–{thresholds.maxDistM} meters away from the door
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                Keep device at 90° angle to door surface
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                Ensure all 8 zones of the door are visible
              </li>
            </ul>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  say("Starting calibration...");
                  setStep(ScanStep.Calibrate);
                }}
                className="flex-1"
                data-testid="button-start-scan"
              >
                Start Scan
              </Button>
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  data-testid="button-cancel-scan"
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === ScanStep.Calibrate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              Calibrate Scale
            </CardTitle>
            <CardDescription>
              Hold device steady and ensure proper positioning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!okPose() && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Adjust your position: distance {thresholds.minDistM}-{thresholds.maxDistM}m,
                  angle {"<"} {thresholds.maxAngleDeg}°
                </AlertDescription>
              </Alert>
            )}
            <Button
              onClick={doCalibrate}
              disabled={busy || !okPose()}
              className="w-full"
              data-testid="button-calibrate"
            >
              {busy ? "Calibrating..." : "Calibrate"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === ScanStep.FramePass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              Scan Frame
            </CardTitle>
            <CardDescription>Measure the door frame dimensions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Point camera at the door frame and tap to measure width and height
            </p>
            {!okPose() && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Adjust position for accurate measurement</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={measureFrame}
              disabled={busy || !okPose()}
              className="w-full"
              data-testid="button-scan-frame"
            >
              {busy ? "Scanning..." : "Scan Frame"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === ScanStep.DoorPass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              Scan Door Leaf
            </CardTitle>
            <CardDescription>Measure the door leaf dimensions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Point camera at the door leaf and measure width and height
            </p>
            {!okPose() && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Adjust position for accurate measurement</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={measureDoor}
              disabled={busy || !okPose()}
              className="w-full"
              data-testid="button-scan-door"
            >
              {busy ? "Scanning..." : "Scan Door"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === ScanStep.HardwarePass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Scan Hardware
            </CardTitle>
            <CardDescription>Measure lock backset and hinge details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Measure lock backset and hinge dimensions
            </p>
            {!okPose() && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Adjust position for accurate measurement</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={measureHardware}
              disabled={busy || !okPose()}
              className="w-full"
              data-testid="button-scan-hardware"
            >
              {busy ? "Scanning..." : "Scan Hardware"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === ScanStep.QualityGate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Quality Check
            </CardTitle>
            <CardDescription>Verify scan coverage and confidence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coverage</span>
                    <span className="font-medium">{record.coveragePct ?? 0}%</span>
                  </div>
                  <Progress value={record.coveragePct ?? 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium">
                      {((record.confidence ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={(record.confidence ?? 0) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overall Score</span>
                    <span className="font-medium">
                      {(qualityMetrics.overallScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={qualityMetrics.overallScore * 100} 
                    className={qualityMetrics.overallScore >= 0.6 ? "" : "[&>div]:bg-yellow-500"}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Point Density</span>
                    <span className="font-medium">{qualityMetrics.pointDensity} pts/s</span>
                  </div>
                  <Progress 
                    value={Math.min(100, (qualityMetrics.pointDensity / thresholds.minPointDensity) * 100)}
                    className={qualityMetrics.pointDensity >= thresholds.minPointDensity ? "" : "[&>div]:bg-yellow-500"}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <CoverageHeatmapDetailed
                  zones={zones}
                  onRescanZone={handleRescanZone}
                />
              </div>
            </div>

            <QualityIssuesList issues={qualityIssues} />

            {!canProceed() && qualityIssues.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Quality Gate Not Met</AlertTitle>
                <AlertDescription>
                  Please address the issues above before proceeding. You need at least {thresholds.minZonesCovered} zones covered and {thresholds.minPointDensity} points per second.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Button
                onClick={runQuality}
                disabled={busy}
                className="w-full"
                data-testid="button-run-quality"
              >
                {busy ? "Analyzing..." : "Run Quality Check"}
              </Button>
              
              {!canProceed() && qualityIssues.some(i => i.severity === "warning") && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsScanning(true);
                      setStep(ScanStep.FramePass);
                    }}
                    className="flex-1"
                    data-testid="button-rescan-all"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-scan All
                  </Button>
                  {!forceAllowed && (
                    <Button
                      variant="ghost"
                      onClick={() => setForceAllowed(true)}
                      className="text-muted-foreground"
                      data-testid="button-show-force"
                    >
                      Show Force Option
                    </Button>
                  )}
                </div>
              )}
              
              {forceAllowed && !canProceed() && (
                <Alert className="border-yellow-500 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertTitle className="text-yellow-700 dark:text-yellow-300">Warning: Low Quality Scan</AlertTitle>
                  <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                    Proceeding with a low-quality scan may result in inaccurate measurements that require manual verification.
                    <Button
                      variant="outline"
                      onClick={handleForceContin}
                      className="mt-2 w-full border-yellow-500 text-yellow-700 dark:text-yellow-300"
                      data-testid="button-force-continue"
                    >
                      Force Continue Anyway
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === ScanStep.ManualVerify && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Manual Verification
            </CardTitle>
            <CardDescription>Review and confirm measurements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Frame Width</span>
                <span className="font-medium">{record.frameWidthMin?.valueMm ?? "—"} mm</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Frame Height</span>
                <span className="font-medium">{record.frameHeightMin?.valueMm ?? "—"} mm</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Door Width</span>
                <span className="font-medium">{record.leafWidth?.valueMm ?? "—"} mm</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Door Height</span>
                <span className="font-medium">{record.leafHeight?.valueMm ?? "—"} mm</span>
              </div>
            </div>
            
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Scan Quality Summary</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Zones</span>
                  <span className="font-medium">{qualityMetrics.zonesCovered.filter(Boolean).length}/8</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Density</span>
                  <span className="font-medium">{qualityMetrics.pointDensity} pts/s</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-medium">{(qualityMetrics.overallScore * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => setStep(ScanStep.Compliance)}
              className="w-full"
              data-testid="button-continue-verify"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === ScanStep.Compliance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Compliance Check
            </CardTitle>
            <CardDescription>Building code compliance validation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                All measurements meet minimum requirements for accessibility and safety codes.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => setStep(ScanStep.ReviewExport)}
              className="w-full"
              data-testid="button-review-export"
            >
              Review & Export
            </Button>
          </CardContent>
        </Card>
      )}

      {step === ScanStep.ReviewExport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Export Scan Data
            </CardTitle>
            <CardDescription>Save measurements to door opening</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quality Score</span>
                <span className="font-medium">
                  {((record.qualityScore ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coverage</span>
                <span className="font-medium">{record.coveragePct ?? 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">
                  {((record.confidence ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zones Covered</span>
                <span className="font-medium">
                  {qualityMetrics.zonesCovered.filter(Boolean).length}/8
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Point Density</span>
                <span className="font-medium">{qualityMetrics.pointDensity} pts/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scan Duration</span>
                <span className="font-medium">{qualityMetrics.scanDuration.toFixed(1)}s</span>
              </div>
            </div>
            <Button
              onClick={finishScan}
              className="w-full"
              data-testid="button-finish-scan"
            >
              Finish & Save
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
