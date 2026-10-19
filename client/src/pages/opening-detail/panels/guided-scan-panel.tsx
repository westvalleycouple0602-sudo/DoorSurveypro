import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";
import type { OpeningScanRecord } from "@shared/scan-types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DoorScanFlow from "@/components/door-scan-flow";
import { useOpeningDetail } from "../context";

export default function GuidedScanPanel() {
  const { opening, project, scanConfigQuery } = useOpeningDetail();
  const { data: scanConfig } = scanConfigQuery;
  const { toast } = useToast();

  return (
    <div className="space-y-6">
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
