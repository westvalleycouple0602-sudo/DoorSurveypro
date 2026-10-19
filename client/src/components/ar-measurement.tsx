import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Ruler, X, Check, AlertCircle } from "lucide-react";
import {
  checkARSupport,
  ARMeasurementSession,
  formatMeasurement,
  type ARCapabilities,
  type ARMeasurement,
} from "@/lib/ar-measurement";

interface ARMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeasurementComplete?: (measurements: {
    width?: number;
    height?: number;
    depth?: number;
  }) => void;
}

export function ARMeasurementDialog({
  open,
  onOpenChange,
  onMeasurementComplete,
}: ARMeasurementDialogProps) {
  const [arCapabilities, setArCapabilities] = useState<ARCapabilities | null>(null);
  const [isARActive, setIsARActive] = useState(false);
  const [measurementSession, setMeasurementSession] = useState<ARMeasurementSession | null>(null);
  const [currentMeasurement, setCurrentMeasurement] = useState<ARMeasurement | null>(null);
  const [measurementType, setMeasurementType] = useState<'width' | 'height' | 'depth'>('width');
  const [measurements, setMeasurements] = useState<{
    width?: number;
    height?: number;
    depth?: number;
  }>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function checkSupport() {
      const capabilities = await checkARSupport();
      setArCapabilities(capabilities);
    }
    
    if (open) {
      checkSupport();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (measurementSession) {
        measurementSession.dispose();
      }
    };
  }, [measurementSession]);

  const startAR = async () => {
    if (!canvasRef.current || !arCapabilities?.supported) {
      toast({
        title: "AR not available",
        description: arCapabilities?.message || "AR is not supported on this device",
        variant: "destructive",
      });
      return;
    }

    try {
      const session = new ARMeasurementSession();
      await session.initialize(canvasRef.current);
      await session.start();
      
      setMeasurementSession(session);
      setIsARActive(true);
      
      toast({
        title: "AR started",
        description: "Point your camera at a surface and tap to place measurement points.",
      });
    } catch (error) {
      toast({
        title: "AR failed to start",
        description: error instanceof Error ? error.message : "Failed to start AR session",
        variant: "destructive",
      });
    }
  };

  const stopAR = () => {
    if (measurementSession) {
      measurementSession.end();
      setIsARActive(false);
      setCurrentMeasurement(null);
    }
  };

  const placeMeasurementPoint = () => {
    if (!measurementSession) return;

    const point = measurementSession.placePoint();
    
    if (point) {
      const measurement = measurementSession.getMeasurement('inches');
      
      if (measurement && measurement.distance > 0) {
        setCurrentMeasurement(measurement);
        
        toast({
          title: "Measurement captured",
          description: `Distance: ${formatMeasurement(measurement.distance, 'inches')}`,
        });
      }
    } else {
      toast({
        title: "Point placement failed",
        description: "Please aim at a visible surface to place a measurement point.",
        variant: "destructive",
      });
    }
  };

  const saveMeasurement = () => {
    if (!currentMeasurement) return;

    const roundedDistance = Math.round(currentMeasurement.distance);
    
    setMeasurements(prev => ({
      ...prev,
      [measurementType]: roundedDistance,
    }));

    toast({
      title: `${measurementType.charAt(0).toUpperCase() + measurementType.slice(1)} saved`,
      description: `${formatMeasurement(roundedDistance, 'inches')} recorded`,
    });

    if (measurementSession) {
      measurementSession.clearPoints();
      setCurrentMeasurement(null);
    }
  };

  const completeMeasurement = () => {
    if (onMeasurementComplete) {
      onMeasurementComplete(measurements);
    }
    
    stopAR();
    onOpenChange(false);
    
    toast({
      title: "Measurements complete",
      description: "AR measurements have been applied to the door opening.",
    });
  };

  const clearCurrent = () => {
    if (measurementSession) {
      measurementSession.clearPoints();
      setCurrentMeasurement(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            AR Measurement
          </DialogTitle>
          <DialogDescription>
            Measure door dimensions using augmented reality
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!arCapabilities?.supported && arCapabilities && (
            <Alert variant="destructive" className="mx-6 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{arCapabilities.message}</AlertDescription>
            </Alert>
          )}

          {arCapabilities?.supported && !isARActive && (
            <div className="flex flex-col items-center justify-center p-6 space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium">Ready to measure</h3>
                <p className="text-sm text-muted-foreground">
                  AR measurement uses your camera to accurately measure door dimensions
                </p>
              </div>

              <div className="grid gap-2 w-full max-w-md text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">1</Badge>
                  <span>Start AR and allow camera access</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">2</Badge>
                  <span>Point camera at door and wait for reticle</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">3</Badge>
                  <span>Tap to place two points for each measurement</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">4</Badge>
                  <span>Save width, height, and depth</span>
                </div>
              </div>

              <Button
                onClick={startAR}
                size="lg"
                data-testid="button-start-ar"
              >
                <Ruler className="h-4 w-4 mr-2" />
                Start AR Measurement
              </Button>
            </div>
          )}

          {isARActive && (
            <div className="relative flex-1 bg-black">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              
              <div className="absolute top-4 left-4 right-4 z-10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant={measurementType === 'width' ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setMeasurementType('width')}
                      data-testid="button-measure-width"
                    >
                      Width {measurements.width && `(${measurements.width}")`}
                    </Button>
                    <Button
                      variant={measurementType === 'height' ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setMeasurementType('height')}
                      data-testid="button-measure-height"
                    >
                      Height {measurements.height && `(${measurements.height}")`}
                    </Button>
                    <Button
                      variant={measurementType === 'depth' ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setMeasurementType('depth')}
                      data-testid="button-measure-depth"
                    >
                      Depth {measurements.depth && `(${measurements.depth}")`}
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopAR}
                    data-testid="button-stop-ar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {currentMeasurement && (
                  <div className="bg-background/90 backdrop-blur p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          Current {measurementType}:
                        </div>
                        <div className="text-2xl font-bold">
                          {formatMeasurement(currentMeasurement.distance, 'inches')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearCurrent}
                          data-testid="button-clear-measurement"
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveMeasurement}
                          data-testid="button-save-measurement"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={placeMeasurementPoint}
                  data-testid="button-place-point"
                >
                  Place Point
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4">
          {isARActive && (
            <Button
              onClick={completeMeasurement}
              disabled={!measurements.width && !measurements.height && !measurements.depth}
              data-testid="button-complete-ar"
            >
              Complete Measurement
            </Button>
          )}
          {!isARActive && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
