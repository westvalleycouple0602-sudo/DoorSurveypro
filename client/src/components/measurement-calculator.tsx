import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ruler, Weight, DoorClosed, Box, AlertTriangle, CheckCircle2 } from "lucide-react";
import { calculateDoorWeight } from "@shared/calculators";
import { parseMeasurement } from "@shared/measurement-utils";

interface MeasurementCalculatorProps {
  doorWidth?: string;
  doorHeight?: string;
  doorThickness?: string;
  doorMaterial?: string;
  doorCoreType?: string;
  frameWidth?: string;
  frameDepth?: string;
  frameMaterial?: string;
}

export function MeasurementCalculator({
  doorWidth,
  doorHeight,
  doorThickness,
  doorMaterial,
  doorCoreType,
  frameWidth,
  frameDepth,
  frameMaterial,
}: MeasurementCalculatorProps) {
  // Parse measurements using utility to handle various formats
  const widthParsed = parseMeasurement(doorWidth);
  const heightParsed = parseMeasurement(doorHeight);
  const thicknessParsed = parseMeasurement(doorThickness);
  const frameWidthParsed = parseMeasurement(frameWidth);
  const frameDepthParsed = parseMeasurement(frameDepth);

  const width = widthParsed.isValid ? widthParsed.value : 0;
  const height = heightParsed.isValid ? heightParsed.value : 0;
  const thickness = thicknessParsed.isValid ? thicknessParsed.value : 0;
  const frameWidthValue = frameWidthParsed.isValid ? frameWidthParsed.value : 0;
  const frameDepthValue = frameDepthParsed.isValid ? frameDepthParsed.value : 0;

  const hasDoorDimensions = width > 0 && height > 0;
  const hasFrameDimensions = frameWidthValue > 0 && frameDepthValue > 0;

  // Calculate door weight if we have enough info
  let doorWeight: number | null = null;
  if (hasDoorDimensions && doorMaterial && doorCoreType) {
    try {
      const result = calculateDoorWeight({
        doorWidth: width.toString(),
        doorHeight: height.toString(),
        doorThickness: thickness > 0 ? thickness.toString() : "1.75", // Default thickness
        doorMaterial: doorMaterial,
        doorCoreType: doorCoreType,
      });
      if (result) {
        doorWeight = result.weight;
      }
    } catch (e) {
      // Calculation failed, ignore
    }
  }

  // Calculate area
  const areaInches = width > 0 && height > 0 ? width * height : 0;
  const areaSqFt = areaInches / 144;

  // Determine rough opening size (add frame allowance)
  const roughOpeningWidth = width > 0 && frameWidthValue > 0 
    ? width + (frameWidthValue * 2) + 0.5  // Add 1/2" clearance
    : 0;
  const roughOpeningHeight = height > 0 && frameWidthValue > 0
    ? height + frameWidthValue + 0.5 // Add 1/2" clearance at top
    : 0;

  // Determine if dimensions are within standard ranges
  const isStandardWidth = width >= 24 && width <= 48;
  const isStandardHeight = height >= 78 && height <= 96;

  if (!hasDoorDimensions && !hasFrameDimensions) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Ruler className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">Live Calculations</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Door Measurements */}
        {hasDoorDimensions && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DoorClosed className="h-4 w-4 text-primary" />
              <span>Door Dimensions</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Nominal Size</div>
                <div className="font-mono text-sm font-semibold">
                  {width}" × {height}"
                  {thickness > 0 && ` × ${thickness}"`}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Area</div>
                <div className="font-mono text-sm font-semibold">
                  {areaSqFt.toFixed(2)} sq ft
                </div>
              </div>

              {roughOpeningWidth > 0 && roughOpeningHeight > 0 && (
                <div className="space-y-1 col-span-2">
                  <div className="text-xs text-muted-foreground">Rough Opening (Est.)</div>
                  <div className="font-mono text-sm font-semibold">
                    {roughOpeningWidth.toFixed(1)}" W × {roughOpeningHeight.toFixed(1)}" H
                  </div>
                </div>
              )}
            </div>

            {/* Standards Check */}
            <div className="flex flex-wrap gap-2">
              {isStandardWidth ? (
                <Badge variant="outline" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Standard Width
                </Badge>
              ) : width > 0 && (
                <Badge variant="outline" className="text-xs gap-1 border-warning/50 text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Non-Standard Width
                </Badge>
              )}
              
              {isStandardHeight ? (
                <Badge variant="outline" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Standard Height
                </Badge>
              ) : height > 0 && (
                <Badge variant="outline" className="text-xs gap-1 border-warning/50 text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Non-Standard Height
                </Badge>
              )}
            </div>

            {/* Door Weight */}
            {doorWeight !== null && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Weight className="h-4 w-4 text-primary" />
                  <span>Estimated Weight</span>
                </div>
                <div className="font-mono text-lg font-bold text-primary">
                  {doorWeight.toFixed(0)} lbs
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Based on {doorMaterial} with {doorCoreType} core
                </div>
              </div>
            )}
          </div>
        )}

        {/* Frame Measurements */}
        {hasFrameDimensions && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Box className="h-4 w-4 text-primary" />
              <span>Frame Profile</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Face Width</div>
                <div className="font-mono text-sm font-semibold">
                  {frameWidthValue.toFixed(2).replace(/\.?0+$/, '')}"
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Wall Depth</div>
                <div className="font-mono text-sm font-semibold">
                  {frameDepthValue > 0 ? `${frameDepthValue.toFixed(2).replace(/\.?0+$/, '')}"` : frameDepth || "N/A"}
                </div>
              </div>

              {frameMaterial && (
                <div className="space-y-1 col-span-2">
                  <div className="text-xs text-muted-foreground">Material</div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {frameMaterial}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Helpful Hints */}
        <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
          <div className="font-medium">💡 Quick Tips:</div>
          <ul className="space-y-0.5 pl-4">
            <li>• Standard single door: 36" × 84"</li>
            <li>• ADA minimum clear: 32" width</li>
            <li>• Typical frame depth: 4.75" - 5.75"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
