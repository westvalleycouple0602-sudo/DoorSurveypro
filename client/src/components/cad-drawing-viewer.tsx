import { useState, useRef, useCallback, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Printer,
  Layers,
  Cable,
  Eye,
  EyeOff,
  ChevronDown,
  Ruler,
  Wrench,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  DoorDrawingSet,
  DoorAnalysisResult,
  DrawingType,
  GeneratedDrawing,
  DrawingLayer,
  DrawingFormat,
} from "@shared/cad-drawing-types";

interface CADDrawingViewerOptions {
  defaultViewType?: DrawingType;
  showWiringOverlay?: boolean;
  showInfoPanel?: boolean;
  showControls?: boolean;
  allowExport?: boolean;
  allowPrint?: boolean;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
}

interface CADDrawingViewerProps {
  drawingSet: DoorDrawingSet;
  analysisResult: DoorAnalysisResult;
  options?: CADDrawingViewerOptions;
  onExport?: (format: DrawingFormat) => void;
  className?: string;
}

const VIEW_TYPE_LABELS: Record<DrawingType, string> = {
  "plan-view": "Plan",
  "elevation-ingress": "Ingress Elevation",
  "elevation-egress": "Egress Elevation",
  section: "Section",
  "isometric-3d": "Isometric",
  "line-drawing": "Line Drawing",
  "wiring-diagram": "Wiring Diagram",
};

const DEFAULT_OPTIONS: CADDrawingViewerOptions = {
  defaultViewType: "plan-view",
  showWiringOverlay: false,
  showInfoPanel: true,
  showControls: true,
  allowExport: true,
  allowPrint: true,
  minZoom: 25,
  maxZoom: 400,
  defaultZoom: 100,
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.7) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getConfidenceBadgeVariant(confidence: number): "default" | "secondary" | "destructive" {
  if (confidence >= 0.9) return "default";
  if (confidence >= 0.7) return "secondary";
  return "destructive";
}

function formatDimension(dim: { valueMm: number; source?: string }, displayUnit: string = "mm"): string {
  return `${dim.valueMm.toFixed(1)} ${displayUnit}`;
}

export function CADDrawingViewer({
  drawingSet,
  analysisResult,
  options: userOptions,
  onExport,
  className,
}: CADDrawingViewerProps) {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  const [activeViewType, setActiveViewType] = useState<DrawingType>(
    options.defaultViewType || "plan-view"
  );
  const [zoom, setZoom] = useState(options.defaultZoom || 100);
  const [showWiringOverlay, setShowWiringOverlay] = useState(
    options.showWiringOverlay || false
  );
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const viewerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeDrawing = drawingSet.drawings.find(
    (d) => d.type === activeViewType
  );

  const availableViewTypes = drawingSet.drawings.map((d) => d.type);

  useEffect(() => {
    if (activeDrawing?.layers) {
      const initialVisibility: Record<string, boolean> = {};
      activeDrawing.layers.forEach((layer) => {
        initialVisibility[layer.id] = layer.visible;
      });
      setLayerVisibility(initialVisibility);
    }
  }, [activeDrawing]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 25, options.maxZoom || 400));
  }, [options.maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 25, options.minZoom || 25));
  }, [options.minZoom]);

  const handleFitToView = useCallback(() => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleZoomChange = useCallback((value: number[]) => {
    setZoom(value[0]);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        setIsPanning(true);
        setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      }
    },
    [panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPanOffset({
          x: e.clientX - startPan.x,
          y: e.clientY - startPan.y,
        });
      }
    },
    [isPanning, startPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setZoom((prev) =>
          Math.min(
            Math.max(prev + delta, options.minZoom || 25),
            options.maxZoom || 400
          )
        );
      }
    },
    [options.minZoom, options.maxZoom]
  );

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  }, []);

  const handleExport = useCallback(
    (format: DrawingFormat) => {
      if (onExport) {
        onExport(format);
      } else {
        const exportBundle = drawingSet.exportFormats.find(
          (e) => e.format === format
        );
        if (exportBundle) {
          const link = document.createElement("a");
          link.href = exportBundle.fileUrl;
          link.download = exportBundle.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    },
    [onExport, drawingSet.exportFormats]
  );

  const handlePrint = useCallback(() => {
    if (contentRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${activeDrawing?.title || "CAD Drawing"}</title>
              <style>
                body { margin: 0; padding: 20px; }
                svg { max-width: 100%; height: auto; }
                .header { text-align: center; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${activeDrawing?.title || "CAD Drawing"}</h1>
                <p>Scale: ${activeDrawing?.scale || "N/A"}</p>
              </div>
              ${contentRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }, [activeDrawing]);

  const getHardwareCount = useCallback(() => {
    const hardware = analysisResult.hardware;
    let count = 0;
    count += hardware.hinges?.length || 0;
    if (hardware.lock) count++;
    if (hardware.closer) count++;
    if (hardware.panic) count++;
    if (hardware.kickplate) count++;
    if (hardware.viewer) count++;
    if (hardware.strike) count++;
    count += hardware.weatherStrip?.length || 0;
    count += hardware.conduit?.length || 0;
    return count;
  }, [analysisResult.hardware]);

  const getSvgWithLayerVisibility = useCallback(() => {
    if (!activeDrawing) return "";

    let svgContent = activeDrawing.svgContent;

    if (showWiringOverlay && activeViewType !== "wiring-diagram") {
      const wiringDrawing = drawingSet.drawings.find(
        (d) => d.type === "wiring-diagram"
      );
      if (wiringDrawing) {
        svgContent = svgContent.replace(
          "</svg>",
          `<g class="wiring-overlay" opacity="0.7">${wiringDrawing.svgContent}</g></svg>`
        );
      }
    }

    return svgContent;
  }, [activeDrawing, showWiringOverlay, activeViewType, drawingSet.drawings]);

  if (!activeDrawing && drawingSet.drawings.length > 0) {
    setActiveViewType(drawingSet.drawings[0].type);
  }

  return (
    <Card
      className={cn("flex flex-col h-full", className)}
      data-testid="cad-drawing-viewer"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg" data-testid="viewer-title">
            {activeDrawing?.title || "CAD Drawing Viewer"}
          </CardTitle>
          {activeDrawing && (
            <Badge variant="outline" data-testid="drawing-scale">
              Scale: {activeDrawing.scale}
            </Badge>
          )}
        </div>

        {options.showControls && (
          <div className="flex items-center gap-2">
            {options.allowExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-export"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleExport("svg")}
                    data-testid="menu-item-export-svg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport("dxf")}
                    data-testid="menu-item-export-dxf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download DXF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport("pdf")}
                    data-testid="menu-item-export-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {options.allowPrint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrint}
                    aria-label="Print drawing"
                    data-testid="button-print"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print Drawing</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <Tabs
          value={activeViewType}
          onValueChange={(value) => setActiveViewType(value as DrawingType)}
          className="w-full"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList
              className="flex-wrap h-auto gap-1"
              data-testid="view-type-tabs"
            >
              {availableViewTypes.map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="text-xs"
                  data-testid={`tab-${type}`}
                >
                  {VIEW_TYPE_LABELS[type]}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="wiring-overlay"
                  checked={showWiringOverlay}
                  onCheckedChange={setShowWiringOverlay}
                  data-testid="switch-wiring-overlay"
                />
                <Label
                  htmlFor="wiring-overlay"
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  <Cable className="h-4 w-4" />
                  Wiring
                </Label>
              </div>

              {activeDrawing?.layers && activeDrawing.layers.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="button-layers"
                    >
                      <Layers className="h-4 w-4 mr-1" />
                      Layers
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Layer Visibility</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {activeDrawing.layers.map((layer) => (
                      <DropdownMenuItem
                        key={layer.id}
                        onClick={() => toggleLayerVisibility(layer.id)}
                        className="flex items-center justify-between"
                        data-testid={`layer-toggle-${layer.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: layer.color }}
                          />
                          {layer.name}
                        </span>
                        {layerVisibility[layer.id] !== false ? (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 border-t pt-3">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= (options.minZoom || 25)}
                    aria-label="Zoom out"
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>

              <div className="w-32">
                <Slider
                  value={[zoom]}
                  min={options.minZoom || 25}
                  max={options.maxZoom || 400}
                  step={5}
                  onValueChange={handleZoomChange}
                  data-testid="slider-zoom"
                />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoom >= (options.maxZoom || 400)}
                    aria-label="Zoom in"
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>

              <span
                className="text-sm text-muted-foreground min-w-[4rem] text-center"
                data-testid="zoom-level"
              >
                {zoom}%
              </span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFitToView}
                  aria-label="Fit to view"
                  data-testid="button-fit-to-view"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to View</TooltipContent>
            </Tooltip>
          </div>

          {availableViewTypes.map((type) => (
            <TabsContent
              key={type}
              value={type}
              className="flex-1 mt-4"
              data-testid={`content-${type}`}
            >
              <div className="flex gap-4 h-full">
                <div
                  ref={viewerRef}
                  className={cn(
                    "flex-1 relative overflow-hidden rounded-md border bg-muted/30",
                    "dark:bg-muted/10",
                    isPanning ? "cursor-grabbing" : "cursor-grab"
                  )}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onWheel={handleWheel}
                  data-testid="drawing-canvas"
                  style={{ minHeight: "400px" }}
                >
                  <div
                    ref={contentRef}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                      transformOrigin: "center center",
                      transition: isPanning ? "none" : "transform 0.1s ease-out",
                    }}
                    data-testid="drawing-content"
                  >
                    {activeDrawing ? (
                      <div
                        className={cn(
                          "drawing-container",
                          "[&_svg]:max-w-full [&_svg]:h-auto",
                          "[&_svg_text]:fill-foreground",
                          "[&_svg_line]:stroke-foreground",
                          "[&_svg_path]:stroke-foreground",
                          "[&_svg_rect]:stroke-foreground",
                          "[&_svg_circle]:stroke-foreground",
                          "[&_svg_polygon]:stroke-foreground",
                          "dark:[&_svg_text]:fill-foreground",
                          "dark:[&_svg_line]:stroke-foreground"
                        )}
                        dangerouslySetInnerHTML={{
                          __html: getSvgWithLayerVisibility(),
                        }}
                        data-testid="svg-container"
                      />
                    ) : (
                      <div className="text-muted-foreground text-center p-8">
                        <p>No drawing available for this view type</p>
                      </div>
                    )}
                  </div>
                </div>

                {options.showInfoPanel && (
                  <div
                    className="w-64 shrink-0 space-y-4"
                    data-testid="info-panel"
                  >
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          Dimensions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-0 pb-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Frame Width
                          </span>
                          <span
                            className="font-mono"
                            data-testid="dim-frame-width"
                          >
                            {formatDimension(analysisResult.dimensions.frameWidth)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Frame Height
                          </span>
                          <span
                            className="font-mono"
                            data-testid="dim-frame-height"
                          >
                            {formatDimension(analysisResult.dimensions.frameHeight)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Leaf Width
                          </span>
                          <span
                            className="font-mono"
                            data-testid="dim-leaf-width"
                          >
                            {formatDimension(analysisResult.dimensions.leafWidth)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Leaf Height
                          </span>
                          <span
                            className="font-mono"
                            data-testid="dim-leaf-height"
                          >
                            {formatDimension(analysisResult.dimensions.leafHeight)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Units
                          </span>
                          <Badge
                            variant="secondary"
                            data-testid="measurement-units"
                          >
                            {activeDrawing?.units || "mm"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Hardware
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-0 pb-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Total Items
                          </span>
                          <Badge
                            variant="outline"
                            data-testid="hardware-count"
                          >
                            {getHardwareCount()}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Hinges
                          </span>
                          <span className="font-mono">
                            {analysisResult.hardware.hinges?.length || 0}
                          </span>
                        </div>
                        {analysisResult.hardware.lock && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Lock</span>
                            <Badge variant="secondary" className="text-xs">
                              {analysisResult.hardware.lock.type}
                            </Badge>
                          </div>
                        )}
                        {analysisResult.hardware.closer && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Closer
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              Present
                            </Badge>
                          </div>
                        )}
                        {analysisResult.hardware.conduit &&
                          analysisResult.hardware.conduit.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Conduit Paths
                              </span>
                              <span className="font-mono">
                                {analysisResult.hardware.conduit.length}
                              </span>
                            </div>
                          )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Confidence
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-0 pb-3 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Overall
                          </span>
                          <Badge
                            variant={getConfidenceBadgeVariant(
                              analysisResult.confidence.overall
                            )}
                            data-testid="confidence-overall"
                          >
                            {(analysisResult.confidence.overall * 100).toFixed(
                              0
                            )}
                            %
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Dimensions
                          </span>
                          <span
                            className={cn(
                              "font-mono text-xs",
                              getConfidenceColor(
                                analysisResult.confidence.dimensions
                              )
                            )}
                            data-testid="confidence-dimensions"
                          >
                            {(
                              analysisResult.confidence.dimensions * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Orientation
                          </span>
                          <span
                            className={cn(
                              "font-mono text-xs",
                              getConfidenceColor(
                                analysisResult.confidence.orientation
                              )
                            )}
                            data-testid="confidence-orientation"
                          >
                            {(
                              analysisResult.confidence.orientation * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Hardware
                          </span>
                          <span
                            className={cn(
                              "font-mono text-xs",
                              getConfidenceColor(
                                analysisResult.confidence.hardware
                              )
                            )}
                            data-testid="confidence-hardware"
                          >
                            {(analysisResult.confidence.hardware * 100).toFixed(
                              0
                            )}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Registration
                          </span>
                          <span
                            className={cn(
                              "font-mono text-xs",
                              getConfidenceColor(
                                analysisResult.confidence.registration
                              )
                            )}
                            data-testid="confidence-registration"
                          >
                            {(
                              analysisResult.confidence.registration * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export type { CADDrawingViewerProps, CADDrawingViewerOptions };
