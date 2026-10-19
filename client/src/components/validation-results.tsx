import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Play, Clock, Shield, Info, Loader2, BookOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DoorOpening, ValidationResult } from "@shared/schema";

interface ValidationResultsProps {
  opening: DoorOpening;
}

interface ValidationCheck {
  code: string;
  passed: boolean;
  severity: "FAIL" | "WARN" | "INFO";
  message: string;
  context: Record<string, any>;
}

interface ValidationData {
  id: string;
  openingId: string;
  country: string;
  residential: string;
  accessibleRoute: string;
  egressRequired: string;
  occupantLoad: number;
  totalChecks: number;
  failedChecks: number;
  passedChecks: number;
  overallStatus: string;
  results: ValidationCheck[];
  measurements: any;
  doorConfig: any;
  validatedAt: string;
}

export function ValidationResults({ opening }: ValidationResultsProps) {
  const { toast } = useToast();
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationConfig, setValidationConfig] = useState({
    country: "US" as "US" | "CA",
    residential: false,
    accessibleRoute: true,
    egressRequired: true,
    occupantLoad: 0,
    doorType: "swing" as "swing" | "sliding" | "revolving" | "folding" | "other",
    doorOperation: "manual" as "manual" | "automatic",
    measurementUncertainty: 0.125,
    caAllowLegacy800mm: false,
    hasBreakout: false,
    powerFailSafeOpen: false,
    adjacentSwingDoorPresent: false,
    // Additional measurements (override opening values if needed)
    thresholdHeight: "",
    hardwareHeight: "",
    // Gap measurements (5 fields)
    gapTop: "",
    gapLatch: "",
    gapHinge: "",
    gapMeetingStiles: "",
    gapBottom: "",
    // Maneuvering clearances (4 fields)
    maneuverPullDepth: "",
    maneuverPullWidth: "",
    maneuverPushDepth: "",
    maneuverPushWidth: "",
  });

  // Fetch validation history
  const { data: validations = [], isLoading, refetch } = useQuery<ValidationData[]>({
    queryKey: ["/api/openings", opening.id, "validations"],
    enabled: !!opening.id,
  });

  // Run validation mutation
  const runValidation = useMutation({
    mutationFn: async () => {
      // Build comprehensive validation payload
      const payload = {
        country: validationConfig.country,
        residential: validationConfig.residential,
        accessible_route: validationConfig.accessibleRoute,
        egress_required: validationConfig.egressRequired,
        occupant_load: validationConfig.occupantLoad,
        door: {
          type: validationConfig.doorType,
          operation: validationConfig.doorOperation,
          fire_rating_minutes: opening.doorFireRating && opening.doorFireRating !== "none" ? 90 : 0,
          has_breakout: validationConfig.hasBreakout,
          power_fail_safe_open: validationConfig.powerFailSafeOpen,
          adjacent_swing_door_present: validationConfig.adjacentSwingDoorPresent,
        },
        measurements: {
          clear_opening_in: opening.doorWidth ? parseFloat(opening.doorWidth) : undefined,
          clear_height_in: opening.doorHeight ? parseFloat(opening.doorHeight) : undefined,
          threshold_height_in: validationConfig.thresholdHeight 
            ? parseFloat(validationConfig.thresholdHeight) 
            : undefined,
          hardware_height_in: validationConfig.hardwareHeight 
            ? parseFloat(validationConfig.hardwareHeight) 
            : undefined,
          // Gap measurements - match validator schema exactly
          gaps_in: validationConfig.gapTop || validationConfig.gapLatch || validationConfig.gapHinge || 
                   validationConfig.gapMeetingStiles || validationConfig.gapBottom ? {
            top: validationConfig.gapTop ? parseFloat(validationConfig.gapTop) : undefined,
            latch: validationConfig.gapLatch ? parseFloat(validationConfig.gapLatch) : undefined,
            hinge: validationConfig.gapHinge ? parseFloat(validationConfig.gapHinge) : undefined,
            meeting_stiles: validationConfig.gapMeetingStiles ? parseFloat(validationConfig.gapMeetingStiles) : undefined,
            bottom: validationConfig.gapBottom ? parseFloat(validationConfig.gapBottom) : undefined,
          } : undefined,
          // Maneuvering clearances - match validator nested structure
          maneuvering: validationConfig.maneuverPullDepth || validationConfig.maneuverPullWidth ||
                       validationConfig.maneuverPushDepth || validationConfig.maneuverPushWidth ? {
            pull_side: {
              perpendicular_depth_in: validationConfig.maneuverPullDepth ? parseFloat(validationConfig.maneuverPullDepth) : undefined,
              latch_side_in: validationConfig.maneuverPullWidth ? parseFloat(validationConfig.maneuverPullWidth) : undefined,
            },
            push_side: {
              perpendicular_depth_in: validationConfig.maneuverPushDepth ? parseFloat(validationConfig.maneuverPushDepth) : undefined,
              latch_side_in: validationConfig.maneuverPushWidth ? parseFloat(validationConfig.maneuverPushWidth) : undefined,
            },
          } : undefined,
        },
        config: {
          measurement_uncertainty_in: validationConfig.measurementUncertainty,
          ca_allow_legacy_800mm: validationConfig.caAllowLegacy800mm,
        },
      };

      const response = await fetch(`/api/openings/${opening.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Validation complete",
        description: "Building code validation has been completed.",
      });
      refetch();
      setValidationDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Validation failed",
        description: error.message || "Failed to run validation",
        variant: "destructive",
      });
    },
  });

  const latestValidation = validations[0];

  const getSeverityIcon = (severity: "FAIL" | "WARN" | "INFO") => {
    switch (severity) {
      case "FAIL":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "WARN":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "INFO":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
  };

  const getSeverityBadge = (severity: "FAIL" | "WARN" | "INFO") => {
    switch (severity) {
      case "FAIL":
        return <Badge variant="destructive">FAIL</Badge>;
      case "WARN":
        return <Badge className="bg-yellow-600">WARN</Badge>;
      case "INFO":
        return <Badge className="bg-green-600">PASS</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Building Code Validation
              </CardTitle>
              <CardDescription>
                US/Canada building code compliance validation for accessibility, egress, and fire safety
              </CardDescription>
            </div>
            <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-run-validation">
                  <Play className="h-4 w-4 mr-2" />
                  Run Validation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Configure Validation</DialogTitle>
                  <DialogDescription>
                    Set validation parameters for building code compliance
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select
                        value={validationConfig.country}
                        onValueChange={(value: "US" | "CA") => 
                          setValidationConfig({ ...validationConfig, country: value })
                        }
                      >
                        <SelectTrigger data-testid="select-country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States (IBC/ADA)</SelectItem>
                          <SelectItem value="CA">Canada (NBC/OBC)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Door Type</Label>
                      <Select
                        value={validationConfig.doorType}
                        onValueChange={(value: any) => 
                          setValidationConfig({ ...validationConfig, doorType: value })
                        }
                      >
                        <SelectTrigger data-testid="select-door-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="swing">Swing</SelectItem>
                          <SelectItem value="sliding">Sliding</SelectItem>
                          <SelectItem value="revolving">Revolving</SelectItem>
                          <SelectItem value="folding">Folding</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Operation</Label>
                      <Select
                        value={validationConfig.doorOperation}
                        onValueChange={(value: any) => 
                          setValidationConfig({ ...validationConfig, doorOperation: value })
                        }
                      >
                        <SelectTrigger data-testid="select-door-operation">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="automatic">Automatic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Occupant Load</Label>
                      <Input
                        type="number"
                        min="0"
                        value={validationConfig.occupantLoad}
                        onChange={(e) => 
                          setValidationConfig({ ...validationConfig, occupantLoad: parseInt(e.target.value) || 0 })
                        }
                        data-testid="input-occupant-load"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Additional Measurements - Collapsible Sections */}
                  <Accordion type="multiple" className="w-full">
                    {/* Basic Measurements */}
                    <AccordionItem value="basic-measurements">
                      <AccordionTrigger className="text-sm font-medium">
                        Basic Measurements (optional)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="text-xs text-muted-foreground">
                            These measurements override values from the opening record.
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="thresholdHeight" className="text-sm font-normal">Threshold Height (in)</Label>
                              <Input
                                id="thresholdHeight"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 0.375"
                                value={validationConfig.thresholdHeight}
                                onChange={(e) => 
                                  setValidationConfig({ ...validationConfig, thresholdHeight: e.target.value })
                                }
                                data-testid="input-threshold-height"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="hardwareHeight" className="text-sm font-normal">Hardware Height (in)</Label>
                              <Input
                                id="hardwareHeight"
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="e.g., 39.0"
                                value={validationConfig.hardwareHeight}
                                onChange={(e) => 
                                  setValidationConfig({ ...validationConfig, hardwareHeight: e.target.value })
                                }
                                data-testid="input-hardware-height"
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Gap Measurements */}
                    <AccordionItem value="gap-measurements">
                      <AccordionTrigger className="text-sm font-medium">
                        Gap Measurements (optional)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="text-xs text-muted-foreground">
                            Measure gaps around door perimeter. Required for fire door validation.
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="gapTop" className="text-sm font-normal">Top Gap (in)</Label>
                              <Input
                                id="gapTop"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 0.125"
                                value={validationConfig.gapTop}
                                onChange={(e) => 
                                  setValidationConfig({ ...validationConfig, gapTop: e.target.value })
                                }
                                data-testid="input-gap-top"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gapLatch" className="text-sm font-normal">Latch Side Gap (in)</Label>
                              <Input
                                id="gapLatch"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 0.125"
                                value={validationConfig.gapLatch}
                                onChange={(e) => 
                                  setValidationConfig({ ...validationConfig, gapLatch: e.target.value })
                                }
                                data-testid="input-gap-latch"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gapHinge" className="text-sm font-normal">Hinge Side Gap (in)</Label>
                              <Input
                                id="gapHinge"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 0.125"
                                value={validationConfig.gapHinge}
                                onChange={(e) => 
                                  setValidationConfig({ ...validationConfig, gapHinge: e.target.value })
                                }
                                data-testid="input-gap-hinge"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gapBottom" className="text-sm font-normal">Bottom Gap (in)</Label>
                              <Input
                                id="gapBottom"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 0.75"
                                value={validationConfig.gapBottom}
                                onChange={(e) => 
                                  setValidationConfig({ ...validationConfig, gapBottom: e.target.value })
                                }
                                data-testid="input-gap-bottom"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gapMeetingStiles" className="text-sm font-normal">Meeting Stiles Gap (in)</Label>
                              <Input
                                id="gapMeetingStiles"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 0.125"
                                value={validationConfig.gapMeetingStiles}
                                onChange={(e) => 
                                  setValidationConfig({ ...validationConfig, gapMeetingStiles: e.target.value })
                                }
                                data-testid="input-gap-meeting-stiles"
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Maneuvering Clearances */}
                    <AccordionItem value="maneuvering-clearances">
                      <AccordionTrigger className="text-sm font-medium">
                        Maneuvering Clearances (optional)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <p className="text-xs text-muted-foreground">
                            Measure clear floor space on both sides of the door for accessibility compliance.
                          </p>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium mb-2">Pull Side (entering)</Label>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="space-y-2">
                                  <Label htmlFor="maneuverPullDepth" className="text-sm font-normal">Depth (in)</Label>
                                  <Input
                                    id="maneuverPullDepth"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="e.g., 60.0"
                                    value={validationConfig.maneuverPullDepth}
                                    onChange={(e) => 
                                      setValidationConfig({ ...validationConfig, maneuverPullDepth: e.target.value })
                                    }
                                    data-testid="input-maneuver-pull-depth"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="maneuverPullWidth" className="text-sm font-normal">Width (in)</Label>
                                  <Input
                                    id="maneuverPullWidth"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="e.g., 48.0"
                                    value={validationConfig.maneuverPullWidth}
                                    onChange={(e) => 
                                      setValidationConfig({ ...validationConfig, maneuverPullWidth: e.target.value })
                                    }
                                    data-testid="input-maneuver-pull-width"
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium mb-2">Push Side (exiting)</Label>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="space-y-2">
                                  <Label htmlFor="maneuverPushDepth" className="text-sm font-normal">Depth (in)</Label>
                                  <Input
                                    id="maneuverPushDepth"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="e.g., 48.0"
                                    value={validationConfig.maneuverPushDepth}
                                    onChange={(e) => 
                                      setValidationConfig({ ...validationConfig, maneuverPushDepth: e.target.value })
                                    }
                                    data-testid="input-maneuver-push-depth"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="maneuverPushWidth" className="text-sm font-normal">Width (in)</Label>
                                  <Input
                                    id="maneuverPushWidth"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="e.g., 48.0"
                                    value={validationConfig.maneuverPushWidth}
                                    onChange={(e) => 
                                      setValidationConfig({ ...validationConfig, maneuverPushWidth: e.target.value })
                                    }
                                    data-testid="input-maneuver-push-width"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="residential"
                        checked={validationConfig.residential}
                        onCheckedChange={(checked) =>
                          setValidationConfig({ ...validationConfig, residential: checked as boolean })
                        }
                        data-testid="checkbox-residential"
                      />
                      <Label htmlFor="residential">Residential building</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="accessibleRoute"
                        checked={validationConfig.accessibleRoute}
                        onCheckedChange={(checked) =>
                          setValidationConfig({ ...validationConfig, accessibleRoute: checked as boolean })
                        }
                        data-testid="checkbox-accessible-route"
                      />
                      <Label htmlFor="accessibleRoute">On accessible route (ADA/AODA)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="egressRequired"
                        checked={validationConfig.egressRequired}
                        onCheckedChange={(checked) =>
                          setValidationConfig({ ...validationConfig, egressRequired: checked as boolean })
                        }
                        data-testid="checkbox-egress-required"
                      />
                      <Label htmlFor="egressRequired">Required for egress</Label>
                    </div>
                  </div>

                  <Separator />

                  {/* Door-type specific configuration */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Door-Specific Options</Label>
                    
                    {validationConfig.doorType === "sliding" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasBreakout"
                          checked={validationConfig.hasBreakout}
                          onCheckedChange={(checked) =>
                            setValidationConfig({ ...validationConfig, hasBreakout: checked as boolean })
                          }
                          data-testid="checkbox-has-breakout"
                        />
                        <Label htmlFor="hasBreakout" className="font-normal">Has breakout or push-open on failure</Label>
                      </div>
                    )}

                    {validationConfig.doorType === "revolving" && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="adjacentSwingDoor"
                            checked={validationConfig.adjacentSwingDoorPresent}
                            onCheckedChange={(checked) =>
                              setValidationConfig({ ...validationConfig, adjacentSwingDoorPresent: checked as boolean })
                            }
                            data-testid="checkbox-adjacent-swing-door"
                          />
                          <Label htmlFor="adjacentSwingDoor" className="font-normal">Adjacent swing door present</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="revolvingBreakout"
                            checked={validationConfig.hasBreakout}
                            onCheckedChange={(checked) =>
                              setValidationConfig({ ...validationConfig, hasBreakout: checked as boolean })
                            }
                            data-testid="checkbox-revolving-breakout"
                          />
                          <Label htmlFor="revolvingBreakout" className="font-normal">Has breakout/collapse feature</Label>
                        </div>
                      </>
                    )}

                    {validationConfig.doorOperation === "automatic" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="powerFailSafe"
                          checked={validationConfig.powerFailSafeOpen}
                          onCheckedChange={(checked) =>
                            setValidationConfig({ ...validationConfig, powerFailSafeOpen: checked as boolean })
                          }
                          data-testid="checkbox-power-fail-safe"
                        />
                        <Label htmlFor="powerFailSafe" className="font-normal">Fails safe (opens on power loss)</Label>
                      </div>
                    )}

                    {validationConfig.country === "CA" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="caLegacy800mm"
                          checked={validationConfig.caAllowLegacy800mm}
                          onCheckedChange={(checked) =>
                            setValidationConfig({ ...validationConfig, caAllowLegacy800mm: checked as boolean })
                          }
                          data-testid="checkbox-ca-legacy-800mm"
                        />
                        <Label htmlFor="caLegacy800mm" className="font-normal">Allow legacy 800mm (31.5") clear width</Label>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Reference Information */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="reference-info">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Reference Information
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* Measurement Definitions */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Measurement Definitions</h4>
                            <div className="text-xs space-y-1 text-muted-foreground">
                              <p><strong>Clear Opening:</strong> At 90° between face of door and stop; sliding between jambs</p>
                              <p><strong>Clear Height:</strong> Finish floor to underside of stop or header</p>
                              <p><strong>Threshold Height:</strong> Finish floor to top of threshold/ramp</p>
                              <p><strong>Hardware Height:</strong> Centerline of operable hardware</p>
                              <p><strong>Gap - Top:</strong> Top rail to frame stop</p>
                              <p><strong>Gap - Latch:</strong> Latch stile to stop</p>
                              <p><strong>Gap - Hinge:</strong> Hinge stile to stop</p>
                              <p><strong>Gap - Meeting Stiles:</strong> Between leaves (pair doors)</p>
                              <p><strong>Gap - Bottom:</strong> Bottom of door to floor/threshold</p>
                              <p><strong>Maneuvering Clearances:</strong> Clear floor space required on pull/push sides for accessibility compliance</p>
                            </div>
                          </div>

                          <Separator />

                          {/* Code References */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Code References</h4>
                            {validationConfig.country === "US" ? (
                              <div className="text-xs space-y-1 text-muted-foreground">
                                <p><strong>Accessibility:</strong> ADA 404 (clearances, thresholds, hardware height), ANSI A117.1 404</p>
                                <p><strong>Egress:</strong> IBC 1010 (doors, gates)</p>
                                <p><strong>Fire:</strong> NFPA 80 (fire doors)</p>
                              </div>
                            ) : (
                              <div className="text-xs space-y-1 text-muted-foreground">
                                <p><strong>Accessibility:</strong> NBC 3.8 (Barrier-Free Design), CSA B651</p>
                                <p><strong>Egress:</strong> NBC 3.4 (Means of Egress)</p>
                                <p><strong>Fire:</strong> NFPA 80 (adopted provinces), CAN ULC-S104 labels</p>
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Door-Type Specific Notes */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Door-Type Compliance Notes</h4>
                            {validationConfig.doorType === "swing" && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  <strong>Swinging Doors:</strong> Use clear opening at 90°. Check gaps at pull side. Hardware per function set. For pairs, check meeting stile gaps and coordinator if manual closers required.
                                </AlertDescription>
                              </Alert>
                            )}
                            {validationConfig.doorType === "sliding" && (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  <strong>Sliding Doors:</strong> Egress only where occupant load ≤ threshold; breakout/push-open rules apply. Automatic sliding requires fail-safe and emergency egress clear opening.
                                </AlertDescription>
                              </Alert>
                            )}
                            {validationConfig.doorType === "revolving" && (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  <strong>Revolving Doors:</strong> Not permitted on accessible routes; must provide adjacent swinging door. Breakout/collapse feature required for egress.
                                </AlertDescription>
                              </Alert>
                            )}
                            {validationConfig.doorType === "folding" && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  <strong>Folding Doors:</strong> Typically for space-saving and special-use applications. Verify egress requirements and clear opening calculations.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Separator />

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setValidationDialogOpen(false)}
                      data-testid="button-cancel-validation"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => runValidation.mutate()}
                      disabled={runValidation.isPending}
                      data-testid="button-submit-validation"
                    >
                      {runValidation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Validation
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : validations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No validation results yet</p>
              <p className="text-sm">Run building code validation to check compliance</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Latest validation summary */}
              {latestValidation && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {latestValidation.overallStatus === "passed" ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {latestValidation.overallStatus === "passed" ? "Compliant" : "Non-Compliant"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {latestValidation.failedChecks} of {latestValidation.totalChecks} checks failed
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(latestValidation.validatedAt).toLocaleString()}
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline">{latestValidation.country}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Validation checks */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="checks">
                      <AccordionTrigger data-testid="accordion-validation-checks">
                        View {latestValidation.totalChecks} validation checks
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 mt-2">
                          {latestValidation.results.map((check: ValidationCheck, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 border-l-2 pl-3 py-2"
                              style={{
                                borderColor: check.passed
                                  ? "hsl(var(--green-600))"
                                  : check.severity === "FAIL"
                                  ? "hsl(var(--destructive))"
                                  : "hsl(var(--yellow-600))",
                              }}
                              data-testid={`validation-check-${idx}`}
                            >
                              {getSeverityIcon(check.severity)}
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono text-muted-foreground">
                                    {check.code}
                                  </span>
                                  {getSeverityBadge(check.severity)}
                                </div>
                                <p className="text-sm">{check.message}</p>
                                {Object.keys(check.context).length > 0 && (
                                  <details className="text-xs text-muted-foreground mt-1">
                                    <summary className="cursor-pointer hover:underline">
                                      Technical details
                                    </summary>
                                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                      {JSON.stringify(check.context, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}

              {/* Validation history */}
              {validations.length > 1 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Validation History</h3>
                  <div className="space-y-2">
                    {validations.slice(1).map((validation) => (
                      <div
                        key={validation.id}
                        className="flex items-center justify-between border rounded p-2 text-sm"
                        data-testid={`validation-history-${validation.id}`}
                      >
                        <div className="flex items-center gap-2">
                          {validation.overallStatus === "passed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span>
                            {validation.failedChecks}/{validation.totalChecks} failed
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {validation.country}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(validation.validatedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
