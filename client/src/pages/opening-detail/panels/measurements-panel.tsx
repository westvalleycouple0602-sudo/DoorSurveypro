import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  Trash2,
  Scan,
  Play,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
} from "lucide-react";
import type { LidarScan } from "@shared/schema";
import type { OpeningScanRecord } from "@shared/scan-types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DoorScanFlow from "@/components/door-scan-flow";
import { useOpeningDetail } from "../context";

export default function MeasurementsPanel() {
  const { opening, project, openingId, lidarScansQuery, scanConfigQuery } = useOpeningDetail();
  const { data: lidarScans = [] } = lidarScansQuery;
  const { data: scanConfig } = scanConfigQuery;
  const { toast } = useToast();

  // LiDAR scan state
  const [lidarFile, setLidarFile] = useState<File | null>(null);
  const [lidarCaptureMethod, setLidarCaptureMethod] = useState<string>("manual");
  const [lidarCaptureNotes, setLidarCaptureNotes] = useState<string>("");
  const [lidarDeviceInfo, setLidarDeviceInfo] = useState<string>("");
  const [selectedScanForProcessing, setSelectedScanForProcessing] = useState<string | null>(null);

  const uploadLidarScan = useMutation({
    mutationFn: async () => {
      if (!lidarFile || !openingId || !opening?.projectId) {
        throw new Error("Missing required data");
      }

      const formData = new FormData();
      formData.append("file", lidarFile);
      formData.append("openingId", openingId);
      formData.append("projectId", opening.projectId);
      formData.append("captureMethod", lidarCaptureMethod);
      if (lidarCaptureNotes) formData.append("captureNotes", lidarCaptureNotes);
      if (lidarDeviceInfo) formData.append("deviceInfo", lidarDeviceInfo);

      const response = await fetch("/api/lidar/scans", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload scan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/lidar-scans`] });
      toast({
        title: "LiDAR scan uploaded",
        description: "Scan has been uploaded successfully. You can now process it.",
      });
      setLidarFile(null);
      setLidarCaptureNotes("");
      setLidarDeviceInfo("");
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
      setSelectedScanForProcessing(null);
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process scan. Please try again.",
        variant: "destructive",
      });
      setSelectedScanForProcessing(null);
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

  return (
    <div className="space-y-6">
      {/* LiDAR Scans Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload LiDAR Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Scan File (PLY, OBJ, or JSON)
            </label>
            <Input
              type="file"
              accept=".ply,.obj,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLidarFile(file);
                }
              }}
              data-testid="input-lidar-file"
            />
            {lidarFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {lidarFile.name} ({(lidarFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
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
            onClick={() => uploadLidarScan.mutate()}
            disabled={!lidarFile || uploadLidarScan.isPending}
            data-testid="button-upload-scan"
          >
            {uploadLidarScan.isPending ? (
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
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Scan History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lidarScans.map((scan) => (
              <Card key={scan.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{scan.originalFilename}</h4>
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
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p>Format: {scan.scanFormat.toUpperCase()} • Capture: {scan.captureMethod}</p>
                      <p>Size: {(scan.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                      {scan.captureNotes && <p>Notes: {scan.captureNotes}</p>}
                      {scan.deviceInfo && <p>Device: {scan.deviceInfo}</p>}
                      <p className="text-xs">
                        Uploaded: {new Date(scan.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {scan.processingStatus === "processed" && scan.processedMetrics != null && (
                      <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
                        <h5 className="font-medium">Processed Measurements</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Width:</span>{" "}
                            <span className="font-medium" data-testid={`text-width-${scan.id}`}>
                              {(scan.processedMetrics as any).width} mm
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Height:</span>{" "}
                            <span className="font-medium" data-testid={`text-height-${scan.id}`}>
                              {(scan.processedMetrics as any).height} mm
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Frame Depth:</span>{" "}
                            <span className="font-medium" data-testid={`text-depth-${scan.id}`}>
                              {(scan.processedMetrics as any).frameDepth} mm
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Swing:</span>{" "}
                            <span className="font-medium" data-testid={`text-swing-${scan.id}`}>
                              {(scan.processedMetrics as any).swingDirection}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Points:</span>{" "}
                            <span className="font-medium">
                              {(scan.processedMetrics as any).pointCount?.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {scan.confidenceScores != null && (
                          <div className="mt-3">
                            <h6 className="text-sm font-medium mb-2">Confidence Scores</h6>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                Overall: {((scan.confidenceScores as any).overall * 100).toFixed(0)}%
                              </div>
                              <div>
                                Width: {((scan.confidenceScores as any).width * 100).toFixed(0)}%
                              </div>
                              <div>
                                Height: {((scan.confidenceScores as any).height * 100).toFixed(0)}%
                              </div>
                              <div>
                                Depth: {((scan.confidenceScores as any).frameDepth * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {scan.processingStatus === "uploaded" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedScanForProcessing(scan.id);
                          processLidarScan.mutate(scan.id);
                        }}
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
                      onClick={() => deleteLidarScan.mutate(scan.id)}
                      disabled={deleteLidarScan.isPending}
                      data-testid={`button-delete-${scan.id}`}
                      title="Delete scan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
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

      {/* Guided Scan Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI-Guided Door Scan Workflow
          </CardTitle>
          <CardDescription>
            Follow the 9-step guided workflow to capture accurate door measurements using your device camera and depth sensors. The system provides real-time quality feedback and ensures data accuracy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!opening || !project || !scanConfig ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {!opening ? "Loading opening data..." : !project ? "Loading project data..." : "Loading scan configuration..."}
              </p>
            </div>
          ) : (
            <DoorScanFlow
              openingId={opening.id}
              thresholds={{
                coveragePct: scanConfig.coverageThreshold,
                confidence: scanConfig.confidenceThreshold,
                minDistM: scanConfig.minDistanceM,
                maxDistM: scanConfig.maxDistanceM,
                maxAngleDeg: scanConfig.maxAngleDeg,
              }}
              onComplete={async (result: OpeningScanRecord) => {
                try {
                  // Build the request payload matching the API schema
                  const requestData: any = {};
                  
                  if (result.leafWidth) {
                    requestData.leafWidth = {
                      valueMm: result.leafWidth.valueMm,
                      sigmaMm: result.leafWidth.sigmaMm,
                      source: "scan" as const,
                      uncertainty: result.leafWidth.sigmaMm,
                    };
                  }
                  
                  if (result.leafHeight) {
                    requestData.leafHeight = {
                      valueMm: result.leafHeight.valueMm,
                      sigmaMm: result.leafHeight.sigmaMm,
                      source: "scan" as const,
                      uncertainty: result.leafHeight.sigmaMm,
                    };
                  }
                  
                  if (result.frameWidthMin) {
                    requestData.frameWidthMin = {
                      valueMm: result.frameWidthMin.valueMm,
                      sigmaMm: result.frameWidthMin.sigmaMm,
                      source: "scan" as const,
                      uncertainty: result.frameWidthMin.sigmaMm,
                    };
                  }
                  
                  if (result.frameHeightMin) {
                    requestData.frameHeightMin = {
                      valueMm: result.frameHeightMin.valueMm,
                      sigmaMm: result.frameHeightMin.sigmaMm,
                      source: "scan" as const,
                      uncertainty: result.frameHeightMin.sigmaMm,
                    };
                  }
                  
                  requestData.coveragePct = result.coveragePct;
                  requestData.qualityScore = result.qualityScore;
                  requestData.confidence = result.confidence;
                  
                  await apiRequest("POST", `/api/openings/${opening.id}/scan-complete`, requestData);
                  
                  // Refetch the opening data to show updated measurements
                  await queryClient.invalidateQueries({ queryKey: [`/api/openings/${opening.id}`] });
                  
                  const widthInches = result.leafWidth ? (result.leafWidth.valueMm / 25.4).toFixed(2) : "0";
                  const heightInches = result.leafHeight ? (result.leafHeight.valueMm / 25.4).toFixed(2) : "0";
                  
                  toast({
                    title: "Scan completed successfully",
                    description: `Door measurements captured: ${widthInches}" × ${heightInches}"`,
                  });
                } catch (error: any) {
                  toast({
                    title: "Error saving scan",
                    description: error.message || "Failed to save scan results",
                    variant: "destructive",
                  });
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
