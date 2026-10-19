import { useState, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, useXRHitTest } from "@react-three/xr";
import * as THREE from "three";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Ruler, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone, 
  Zap,
  Target,
  Save,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Measurement point component
function MeasurementPoints({ points, onPointsChange, captureNext, onCaptureComplete }: any) {
  const lastHitPositionRef = useRef<THREE.Vector3 | null>(null);
  const lastCaptureRef = useRef(0);
  
  // Use proper useXRHitTest API with reference space and getWorldMatrix
  useXRHitTest((results, getWorldMatrix) => {
    // Store the latest hit test result as a world-space vector
    if (results && results.length > 0) {
      const matrix = new THREE.Matrix4();
      const didGetMatrix = getWorldMatrix(matrix, results[0]);
      
      if (didGetMatrix) {
        // Extract position from the transformation matrix
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(matrix);
        lastHitPositionRef.current = position;
      }
    }
  }, 'local-floor'); // Use local-floor for better world surface anchoring

  // Expose a method to capture the current hit position
  useEffect(() => {
    // Only capture if the trigger value changed (not just because points changed)
    if (captureNext > lastCaptureRef.current && lastHitPositionRef.current && points.length < 2) {
      lastCaptureRef.current = captureNext;
      const pos = lastHitPositionRef.current;
      onPointsChange([...points, [pos.x, pos.y, pos.z]]);
      onCaptureComplete();
    }
  }, [captureNext, points, onPointsChange, onCaptureComplete]);

  return (
    <>
      {points.map((point: number[], index: number) => (
        <mesh key={index} position={point as [number, number, number]}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color={index === 0 ? "#3b82f6" : "#10b981"} />
        </mesh>
      ))}
      {points.length === 2 && (
        <line>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...points[0], ...points[1]])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial attach="material" color="#f59e0b" linewidth={2} />
        </line>
      )}
    </>
  );
}

export default function ArMeasurementsPage() {
  const { toast } = useToast();
  const [isXRSupported, setIsXRSupported] = useState<boolean | null>(null);
  const [hasLidar, setHasLidar] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<number[][]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [measurementType, setMeasurementType] = useState("door_height");
  const [notes, setNotes] = useState("");
  const [currentMeasurement, setCurrentMeasurement] = useState<number | null>(null);
  const [captureNextPoint, setCaptureNextPoint] = useState(0); // Increment to trigger capture

  // Check for WebXR and LiDAR support
  useEffect(() => {
    const checkXRSupport = async () => {
      if ('xr' in navigator) {
        try {
          const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
          setIsXRSupported(supported);
          
          // Check for LiDAR (available on iPhone 12 Pro+ and iPad Pro 2020+)
          const userAgent = navigator.userAgent;
          const hasLidarDevice = /iPhone1[2-9]|iPhone[2-9][0-9]|iPad/.test(userAgent);
          setHasLidar(hasLidarDevice);
        } catch (error) {
          setIsXRSupported(false);
        }
      } else {
        setIsXRSupported(false);
      }
    };
    
    checkXRSupport();
  }, []);

  // Calculate distance between two points
  const calculateDistance = (point1: number[], point2: number[]) => {
    const dx = point2[0] - point1[0];
    const dy = point2[1] - point1[1];
    const dz = point2[2] - point1[2];
    const distanceMeters = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const distanceInches = distanceMeters * 39.3701; // Convert meters to inches
    return distanceInches;
  };

  // Handle measurement completion
  useEffect(() => {
    if (measurementPoints.length === 2) {
      const distance = calculateDistance(measurementPoints[0], measurementPoints[1]);
      setCurrentMeasurement(distance);
    }
  }, [measurementPoints]);

  // Save measurement mutation
  const saveMeasurementMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/ar-measurements", data);
    },
    onSuccess: () => {
      toast({
        title: "Measurement Saved",
        description: "AR measurement saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ar-measurements"] });
      resetMeasurement();
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Unable to save measurement",
        variant: "destructive",
      });
    },
  });

  // Get measurement history
  const { data: measurementHistory } = useQuery<any[]>({
    queryKey: ["/api/ar-measurements"],
  });

  const handleSaveMeasurement = () => {
    if (!currentMeasurement || measurementPoints.length !== 2) {
      toast({
        title: "No Measurement",
        description: "Please complete a measurement first",
        variant: "destructive",
      });
      return;
    }

    const deviceType = navigator.userAgent;
    const arTechnology = 'xr' in navigator ? 'webxr' : 'unknown';

    saveMeasurementMutation.mutate({
      measurementType,
      value: currentMeasurement,
      unit: "inches",
      hasLidar: hasLidar ? "yes" : "no",
      arTechnology,
      deviceType,
      confidenceScore: hasLidar ? 0.95 : 0.85,
      estimatedError: hasLidar ? 0.1 : 0.5,
      measurementPoints,
      notes,
    });
  };

  const resetMeasurement = () => {
    setMeasurementPoints([]);
    setCurrentMeasurement(null);
    setNotes("");
    setCaptureNextPoint(0);
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4" data-testid="page-ar-measurements">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="heading-ar-measurements">
          <Ruler className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
          AR Measurements
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Measure doors and frames using augmented reality
        </p>
      </div>

      {/* HTTPS Requirement Notice */}
      {typeof window !== 'undefined' && window.location.protocol !== 'https:' && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20" data-testid="alert-https-required">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
          <AlertTitle className="text-blue-900 dark:text-blue-100 text-sm sm:text-base">HTTPS Required for AR Features</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <p className="mb-2 text-xs sm:text-sm">
              WebXR AR requires a secure HTTPS connection to access your device's camera and sensors for privacy and security.
            </p>
            <p className="text-xs sm:text-sm">
              <strong>To use AR measurements:</strong> Publish your app and access it using its HTTPS URL.
              Development preview URLs may not support AR features due to security restrictions.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Device Capability Check */}
      {isXRSupported === null && (
        <Alert>
          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <AlertTitle className="text-sm sm:text-base">Checking Device Capabilities</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            Detecting WebXR AR support on your device...
          </AlertDescription>
        </Alert>
      )}

      {isXRSupported === false && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <AlertTitle className="text-sm sm:text-base">AR Not Supported</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            Your device or browser doesn't support WebXR AR. Try using a modern mobile browser on iOS (Safari) or Android (Chrome).
            AR measurement requires: iOS 14.5+ with ARKit or Android 7.0+ with ARCore.
          </AlertDescription>
        </Alert>
      )}

      {isXRSupported && (
        <>
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Device Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-3">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs sm:text-sm text-muted-foreground">WebXR AR Support</span>
                <Badge variant="default" className="shrink-0 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                  Supported
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs sm:text-sm text-muted-foreground">LiDAR Sensor</span>
                <Badge variant={hasLidar ? "default" : "secondary"} className="shrink-0 text-xs">
                  {hasLidar ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1 shrink-0" /> Available</>
                  ) : (
                    <>Camera-based</>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs sm:text-sm text-muted-foreground">Expected Accuracy</span>
                <span className="text-xs sm:text-sm font-medium shrink-0">
                  ±{hasLidar ? "0.1" : "0.5"}" ({hasLidar ? "High" : "Standard"})
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 xl:grid-cols-2">
            {/* AR Measurement Interface */}
            <Card data-testid="card-ar-interface">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  AR Measurement Tool
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Click "Capture Point" buttons to place start and end measurement points
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-3 sm:space-y-4">
                {/* Point Capture Controls */}
                <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs sm:text-sm font-medium">
                      {measurementPoints.length === 0 && "Ready to capture start point"}
                      {measurementPoints.length === 1 && "Ready to capture end point"}
                      {measurementPoints.length === 2 && "Measurement complete"}
                    </span>
                    <Badge variant={measurementPoints.length === 2 ? "default" : "secondary"} className="shrink-0 text-xs">
                      {measurementPoints.length}/2 Points
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCaptureNextPoint(prev => prev + 1)}
                      disabled={measurementPoints.length >= 2}
                      className="flex-1 text-xs sm:text-sm"
                      size="sm"
                      data-testid="button-capture-point"
                    >
                      <Target className="h-4 w-4 mr-2 shrink-0" />
                      {measurementPoints.length === 0 ? "Capture Start Point" : "Capture End Point"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Point your device at the surface and tap "Capture Point" when ready
                  </p>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="measurement-type" className="text-xs sm:text-sm">Measurement Type</Label>
                  <Select value={measurementType} onValueChange={setMeasurementType}>
                    <SelectTrigger id="measurement-type" data-testid="select-measurement-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="door_height">Door Height</SelectItem>
                      <SelectItem value="door_width">Door Width</SelectItem>
                      <SelectItem value="frame_depth">Frame Depth</SelectItem>
                      <SelectItem value="clear_opening">Clear Opening</SelectItem>
                      <SelectItem value="hinge_location">Hinge Location</SelectItem>
                      <SelectItem value="hardware_height">Hardware Height</SelectItem>
                      <SelectItem value="custom">Custom Measurement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {currentMeasurement !== null && (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                    <AlertTitle className="text-green-900 dark:text-green-100 text-sm sm:text-base">
                      Measurement Complete
                    </AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      <span className="text-xl sm:text-2xl font-bold block mt-2">
                        {currentMeasurement.toFixed(2)}"
                      </span>
                      <span className="text-xs sm:text-sm block mt-1">
                        ({(currentMeasurement / 12).toFixed(2)} feet)
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="notes" className="text-xs sm:text-sm">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    data-testid="input-measurement-notes"
                    placeholder="Add notes about this measurement..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveMeasurement}
                    disabled={!currentMeasurement || saveMeasurementMutation.isPending}
                    className="flex-1 text-xs sm:text-sm"
                    size="sm"
                    data-testid="button-save-measurement"
                  >
                    <Save className="h-4 w-4 mr-2 shrink-0" />
                    Save Measurement
                  </Button>
                  <Button
                    onClick={resetMeasurement}
                    variant="outline"
                    disabled={measurementPoints.length === 0}
                    size="sm"
                    data-testid="button-reset-measurement"
                  >
                    <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                </div>

                {/* AR Enter Button */}
                <Button
                  variant="default"
                  size="default"
                  className="w-full text-xs sm:text-sm"
                  data-testid="button-enter-ar"
                  disabled
                >
                  <Camera className="h-4 w-4 mr-2 shrink-0" />
                  Enter AR Mode (Coming Soon)
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  AR mode requires HTTPS and device permissions
                </p>
              </CardContent>
            </Card>

            {/* Measurement History */}
            <Card data-testid="card-measurement-history">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base">Recent Measurements</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  History of AR measurements
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {!measurementHistory || measurementHistory.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <Ruler className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-xs sm:text-sm">No measurements yet</p>
                    <p className="text-xs mt-1">Start measuring in AR to build your history</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {measurementHistory.slice(0, 10).map((measurement: any) => (
                      <div
                        key={measurement.id}
                        className="p-2 sm:p-3 border rounded-lg space-y-1 sm:space-y-2 hover-elevate"
                        data-testid={`measurement-${measurement.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="font-medium text-xs sm:text-sm truncate">
                            {measurement.measurementType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {measurement.value.toFixed(2)} {measurement.unit}
                          </Badge>
                        </div>
                        {measurement.notes && (
                          <p className="text-xs text-muted-foreground truncate">{measurement.notes}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>Confidence: {((measurement.confidenceScore || 0) * 100).toFixed(0)}%</span>
                          {measurement.hasLidar === "yes" && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              <Zap className="h-2.5 w-2.5 mr-1 shrink-0" />
                              LiDAR
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
