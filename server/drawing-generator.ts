// ============================================================================
// CAD DRAWING GENERATOR MODULE
// ============================================================================
// Generates professional SVG and DXF drawings from door analysis results
// Used for DoorConfiguratorPro integration and wiring diagram overlays

import { v4 as uuidv4 } from "uuid";

import type {
  DoorAnalysisResult,
  DoorDimensions,
  DoorOrientation,
  DetectedHardware,
  HardwarePosition,
  HardwareType,
  DoorClearances,
  Point2D,
  Point3D,
  DrawingType,
  DrawingFormat,
  DoorDrawingSet,
  GeneratedDrawing,
  DrawingDimensions,
  DrawingAnnotation,
  HardwareSymbol,
  DrawingLayer,
  ExportBundle,
  WiringDiagramOverlay,
  WiringCircuit,
  WiringConnection,
  WiringSymbol,
  WiringAnnotation,
  ScanSide,
  HingeSide,
  SwingDirection,
  ConduitPath
} from "../shared/cad-drawing-types";

import type { Dim } from "../shared/scan-types";

// ============================================================================
// DRAWING OPTIONS INTERFACE
// ============================================================================

export interface DrawingOptions {
  scale: string;
  units: "mm" | "inches";
  showLayers: LayerVisibility;
  titleBlock?: TitleBlockConfig;
  colorScheme: "print-friendly" | "color-coded" | "blueprint";
  lineWeights?: LineWeightConfig;
  dimensionStyle?: DimensionStyleConfig;
  paperSize?: "A4" | "A3" | "letter" | "tabloid" | "custom";
  customPaperSize?: { width: number; height: number };
}

export interface LayerVisibility {
  frame: boolean;
  door: boolean;
  hardware: boolean;
  dimensions: boolean;
  annotations: boolean;
  wiring: boolean;
  clearances: boolean;
  ada: boolean;
}

export interface TitleBlockConfig {
  projectName?: string;
  drawingNumber?: string;
  revision?: string;
  drawnBy?: string;
  checkedBy?: string;
  date?: string;
  companyName?: string;
  companyLogo?: string;
  showScale: boolean;
  showDate: boolean;
}

export interface LineWeightConfig {
  outline: number;
  hidden: number;
  dimension: number;
  centerline: number;
  thin: number;
}

export interface DimensionStyleConfig {
  arrowSize: number;
  textSize: number;
  extensionOffset: number;
  textOffset: number;
  precision: number;
}

export interface OpeningData {
  id: string;
  name: string;
  openingNumber: string;
  location: string;
  projectName?: string;
}

export interface WiringData {
  circuits: WiringCircuit[];
  connections: WiringConnection[];
  symbols: WiringSymbol[];
  annotations: WiringAnnotation[];
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_OPTIONS: DrawingOptions = {
  scale: "1:10",
  units: "mm",
  showLayers: {
    frame: true,
    door: true,
    hardware: true,
    dimensions: true,
    annotations: true,
    wiring: false,
    clearances: true,
    ada: true
  },
  colorScheme: "print-friendly",
  lineWeights: {
    outline: 0.7,
    hidden: 0.35,
    dimension: 0.25,
    centerline: 0.25,
    thin: 0.18
  },
  dimensionStyle: {
    arrowSize: 3,
    textSize: 10,
    extensionOffset: 2,
    textOffset: 3,
    precision: 1
  },
  paperSize: "A3"
};

const COLOR_SCHEMES = {
  "print-friendly": {
    frame: "#000000",
    door: "#000000",
    hardware: "#333333",
    dimension: "#000000",
    annotation: "#666666",
    centerline: "#999999",
    hidden: "#AAAAAA",
    clearance: "#0066CC",
    ada: "#006600",
    wiring: {
      power: "#FF0000",
      control: "#0000FF",
      communication: "#00FF00",
      "fire-alarm": "#FF6600"
    }
  },
  "color-coded": {
    frame: "#2C3E50",
    door: "#34495E",
    hardware: "#E74C3C",
    dimension: "#2980B9",
    annotation: "#8E44AD",
    centerline: "#BDC3C7",
    hidden: "#95A5A6",
    clearance: "#3498DB",
    ada: "#27AE60",
    wiring: {
      power: "#E74C3C",
      control: "#3498DB",
      communication: "#2ECC71",
      "fire-alarm": "#E67E22"
    }
  },
  "blueprint": {
    frame: "#FFFFFF",
    door: "#FFFFFF",
    hardware: "#CCCCFF",
    dimension: "#FFFFFF",
    annotation: "#AAAAFF",
    centerline: "#6666AA",
    hidden: "#666699",
    clearance: "#88AAFF",
    ada: "#88FFAA",
    wiring: {
      power: "#FF8888",
      control: "#8888FF",
      communication: "#88FF88",
      "fire-alarm": "#FFAA66"
    }
  }
};

// ============================================================================
// HARDWARE SYMBOL DEFINITIONS
// ============================================================================

const HARDWARE_SYMBOLS: Record<string, { path: string; width: number; height: number }> = {
  hinge: {
    path: "M0,0 L8,0 L8,4 L4,4 L4,16 L8,16 L8,20 L0,20 L0,16 L4,16 L4,4 L0,4 Z M4,8 A2,2 0 1,1 4.01,8",
    width: 8,
    height: 20
  },
  lockset: {
    path: "M6,0 A6,6 0 1,0 6.01,0 M6,3 A3,3 0 1,0 6.01,3 M4,6 L8,6 M6,8 L6,12 M3,12 L9,12 L9,18 L3,18 Z",
    width: 12,
    height: 18
  },
  deadbolt: {
    path: "M0,4 L12,4 L12,16 L0,16 Z M3,7 L9,7 L9,13 L3,13 Z M6,10 A1.5,1.5 0 1,0 6.01,10",
    width: 12,
    height: 20
  },
  closer: {
    path: "M0,0 L40,0 L40,12 L0,12 Z M4,4 L12,4 L12,8 L4,8 Z M28,6 A4,4 0 1,0 28.01,6 M36,4 L36,8",
    width: 40,
    height: 12
  },
  "panic-bar": {
    path: "M0,8 L100,8 L100,16 L0,16 Z M10,0 L10,24 M90,0 L90,24 M50,4 L50,20 M30,12 L70,12",
    width: 100,
    height: 24
  },
  kickplate: {
    path: "M0,0 L80,0 L80,30 L0,30 Z M4,4 L76,4 L76,26 L4,26 Z",
    width: 80,
    height: 30
  },
  viewer: {
    path: "M8,8 A8,8 0 1,0 8.01,8 M8,4 A4,4 0 1,0 8.01,4",
    width: 16,
    height: 16
  },
  strike: {
    path: "M0,0 L10,0 L10,30 L0,30 Z M2,10 L8,10 L8,20 L2,20 Z",
    width: 10,
    height: 30
  },
  threshold: {
    path: "M0,0 L100,0 L100,4 L0,4 Z M0,4 L100,4 L102,8 L-2,8 Z",
    width: 100,
    height: 8
  },
  "junction-box": {
    path: "M0,0 L20,0 L20,20 L0,20 Z M5,5 L15,5 L15,15 L5,15 Z M10,0 L10,5 M0,10 L5,10 M10,15 L10,20 M15,10 L20,10",
    width: 20,
    height: 20
  },
  conduit: {
    path: "M0,2 A2,2 0 0,1 4,2 L4,18 A2,2 0 0,1 0,18 Z",
    width: 4,
    height: 20
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function dimToValue(dim: Dim, units: "mm" | "inches"): number {
  if (units === "inches") {
    return dim.valueMm / 25.4;
  }
  return dim.valueMm;
}

function formatDimension(value: number, units: "mm" | "inches", precision: number = 1): string {
  const formatted = value.toFixed(precision);
  return units === "mm" ? `${formatted}` : `${formatted}"`;
}

function parseScale(scale: string): number {
  if (scale.includes(":")) {
    const [a, b] = scale.split(":").map(Number);
    return a / b;
  }
  if (scale.includes("=")) {
    const parts = scale.split("=");
    const left = parseFloat(parts[0].replace(/[^0-9.]/g, ""));
    const right = parseFloat(parts[1].replace(/[^0-9.]/g, ""));
    return left / (right * 12);
  }
  return 0.1;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function point2DToString(p: Point2D): string {
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}

function calculateArcPoints(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments: number = 32
): Point2D[] {
  const points: Point2D[] = [];
  const angleStep = (endAngle - startAngle) / segments;
  
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (i * angleStep);
    const rad = angle * Math.PI / 180;
    points.push({
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad)
    });
  }
  
  return points;
}

// ============================================================================
// SVG GENERATION HELPERS
// ============================================================================

function createSvgHeader(
  width: number,
  height: number,
  viewBox: string,
  colorScheme: "print-friendly" | "color-coded" | "blueprint"
): string {
  const bgColor = colorScheme === "blueprint" ? "#1a3a5c" : "#FFFFFF";
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" 
     height="${height}" 
     viewBox="${viewBox}">
  <defs>
    <style>
      .frame { stroke: ${COLOR_SCHEMES[colorScheme].frame}; fill: none; }
      .door { stroke: ${COLOR_SCHEMES[colorScheme].door}; fill: none; }
      .hardware { stroke: ${COLOR_SCHEMES[colorScheme].hardware}; fill: ${COLOR_SCHEMES[colorScheme].hardware}; }
      .dimension { stroke: ${COLOR_SCHEMES[colorScheme].dimension}; fill: none; }
      .dimension-text { fill: ${COLOR_SCHEMES[colorScheme].dimension}; font-family: Arial, sans-serif; }
      .annotation { fill: ${COLOR_SCHEMES[colorScheme].annotation}; font-family: Arial, sans-serif; }
      .centerline { stroke: ${COLOR_SCHEMES[colorScheme].centerline}; stroke-dasharray: 10,3,2,3; }
      .hidden { stroke: ${COLOR_SCHEMES[colorScheme].hidden}; stroke-dasharray: 5,3; }
      .clearance { stroke: ${COLOR_SCHEMES[colorScheme].clearance}; stroke-dasharray: 8,4; }
      .ada { stroke: ${COLOR_SCHEMES[colorScheme].ada}; fill: none; }
      .title-text { fill: ${COLOR_SCHEMES[colorScheme].frame}; font-family: Arial, sans-serif; font-weight: bold; }
    </style>
    <marker id="arrow-start" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
      <polygon points="10 0, 10 7, 0 3.5" fill="${COLOR_SCHEMES[colorScheme].dimension}" />
    </marker>
    <marker id="arrow-end" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${COLOR_SCHEMES[colorScheme].dimension}" />
    </marker>
    ${Object.entries(HARDWARE_SYMBOLS).map(([type, symbol]) => `
    <symbol id="symbol-${type}" viewBox="0 0 ${symbol.width} ${symbol.height}">
      <path d="${symbol.path}" class="hardware" />
    </symbol>`).join('')}
  </defs>
  <rect width="100%" height="100%" fill="${bgColor}" />
`;
}

function createSvgFooter(): string {
  return `</svg>`;
}

function createLayer(id: string, name: string, visible: boolean = true): string {
  return `<g id="layer-${id}" data-layer-name="${name}" ${visible ? '' : 'visibility="hidden"'}>`;
}

function closeLayer(): string {
  return `</g>`;
}

function createDimensionLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  text: string,
  textSize: number,
  offset: number,
  lineWeight: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / length * offset;
  const perpY = dx / length * offset;
  
  const extX1 = x1 + perpX;
  const extY1 = y1 + perpY;
  const extX2 = x2 + perpX;
  const extY2 = y2 + perpY;
  
  const midX = (extX1 + extX2) / 2;
  const midY = (extY1 + extY2) / 2;
  
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const textAngle = angle > 90 || angle < -90 ? angle + 180 : angle;
  
  return `
    <line x1="${x1}" y1="${y1}" x2="${extX1}" y2="${extY1}" class="dimension" stroke-width="${lineWeight}" />
    <line x1="${x2}" y1="${y2}" x2="${extX2}" y2="${extY2}" class="dimension" stroke-width="${lineWeight}" />
    <line x1="${extX1}" y1="${extY1}" x2="${extX2}" y2="${extY2}" class="dimension" stroke-width="${lineWeight}" 
          marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
    <text x="${midX}" y="${midY - 2}" class="dimension-text" font-size="${textSize}" 
          text-anchor="middle" transform="rotate(${textAngle} ${midX} ${midY})">${escapeXml(text)}</text>
  `;
}

function createHardwareSymbol(
  type: HardwareType,
  x: number,
  y: number,
  rotation: number,
  scale: number,
  label?: string
): string {
  const symbol = HARDWARE_SYMBOLS[type];
  if (!symbol) return '';
  
  const transform = `translate(${x - symbol.width * scale / 2}, ${y - symbol.height * scale / 2}) rotate(${rotation} ${symbol.width * scale / 2} ${symbol.height * scale / 2}) scale(${scale})`;
  
  return `
    <use xlink:href="#symbol-${type}" transform="${transform}" />
    ${label ? `<text x="${x}" y="${y + symbol.height * scale / 2 + 12}" class="annotation" font-size="9" text-anchor="middle">${escapeXml(label)}</text>` : ''}
  `;
}

function createTitleBlock(
  x: number,
  y: number,
  width: number,
  height: number,
  config: TitleBlockConfig,
  drawingTitle: string,
  scale: string,
  units: string
): string {
  const lineHeight = 14;
  let currentY = y + 15;
  
  let content = `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#000000" stroke-width="1" />
    <line x1="${x}" y1="${y + 40}" x2="${x + width}" y2="${y + 40}" stroke="#000000" stroke-width="0.5" />
  `;
  
  if (config.companyName) {
    content += `<text x="${x + width / 2}" y="${currentY}" class="title-text" font-size="14" text-anchor="middle">${escapeXml(config.companyName)}</text>`;
    currentY += lineHeight + 5;
  }
  
  content += `<text x="${x + width / 2}" y="${currentY + 10}" class="title-text" font-size="12" text-anchor="middle">${escapeXml(drawingTitle)}</text>`;
  
  const infoY = y + 50;
  const colWidth = width / 4;
  
  if (config.projectName) {
    content += `
      <text x="${x + 5}" y="${infoY}" class="annotation" font-size="8">Project:</text>
      <text x="${x + 5}" y="${infoY + 10}" class="dimension-text" font-size="9">${escapeXml(config.projectName)}</text>
    `;
  }
  
  if (config.drawingNumber) {
    content += `
      <text x="${x + colWidth}" y="${infoY}" class="annotation" font-size="8">Dwg No:</text>
      <text x="${x + colWidth}" y="${infoY + 10}" class="dimension-text" font-size="9">${escapeXml(config.drawingNumber)}</text>
    `;
  }
  
  if (config.showScale) {
    content += `
      <text x="${x + colWidth * 2}" y="${infoY}" class="annotation" font-size="8">Scale:</text>
      <text x="${x + colWidth * 2}" y="${infoY + 10}" class="dimension-text" font-size="9">${escapeXml(scale)} (${units})</text>
    `;
  }
  
  if (config.revision) {
    content += `
      <text x="${x + colWidth * 3}" y="${infoY}" class="annotation" font-size="8">Rev:</text>
      <text x="${x + colWidth * 3}" y="${infoY + 10}" class="dimension-text" font-size="9">${escapeXml(config.revision)}</text>
    `;
  }
  
  if (config.showDate && config.date) {
    content += `<text x="${x + width - 5}" y="${y + height - 5}" class="annotation" font-size="8" text-anchor="end">${escapeXml(config.date)}</text>`;
  }
  
  return content;
}

// ============================================================================
// DXF GENERATION
// ============================================================================

function createDxfHeader(): string {
  return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
0
LAYER
2
FRAME
70
0
62
7
6
CONTINUOUS
0
LAYER
2
DOOR
70
0
62
7
6
CONTINUOUS
0
LAYER
2
HARDWARE
70
0
62
1
6
CONTINUOUS
0
LAYER
2
DIMENSIONS
70
0
62
3
6
CONTINUOUS
0
LAYER
2
ANNOTATIONS
70
0
62
5
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;
}

function createDxfFooter(): string {
  return `0
ENDSEC
0
EOF
`;
}

function createDxfLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  layer: string
): string {
  return `0
LINE
8
${layer}
10
${x1.toFixed(4)}
20
${y1.toFixed(4)}
11
${x2.toFixed(4)}
21
${y2.toFixed(4)}
`;
}

function createDxfCircle(
  cx: number,
  cy: number,
  radius: number,
  layer: string
): string {
  return `0
CIRCLE
8
${layer}
10
${cx.toFixed(4)}
20
${cy.toFixed(4)}
40
${radius.toFixed(4)}
`;
}

function createDxfArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  layer: string
): string {
  return `0
ARC
8
${layer}
10
${cx.toFixed(4)}
20
${cy.toFixed(4)}
40
${radius.toFixed(4)}
50
${startAngle.toFixed(4)}
51
${endAngle.toFixed(4)}
`;
}

function createDxfText(
  x: number,
  y: number,
  height: number,
  text: string,
  layer: string,
  rotation: number = 0
): string {
  return `0
TEXT
8
${layer}
10
${x.toFixed(4)}
20
${y.toFixed(4)}
40
${height.toFixed(4)}
1
${text}
50
${rotation.toFixed(4)}
`;
}

function createDxfPolyline(
  points: Point2D[],
  layer: string,
  closed: boolean = false
): string {
  if (points.length < 2) return '';
  
  let dxf = `0
LWPOLYLINE
8
${layer}
90
${points.length}
70
${closed ? 1 : 0}
`;
  
  for (const point of points) {
    dxf += `10
${point.x.toFixed(4)}
20
${point.y.toFixed(4)}
`;
  }
  
  return dxf;
}

// ============================================================================
// MAIN DRAWING GENERATION FUNCTIONS
// ============================================================================

export function generateDoorDrawingSet(
  analysisResult: DoorAnalysisResult,
  openingData: OpeningData,
  options: Partial<DrawingOptions> = {}
): DoorDrawingSet {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const drawings: GeneratedDrawing[] = [];
  const id = uuidv4();
  
  drawings.push(generatePlanView(analysisResult, opts));
  drawings.push(generateElevationView(analysisResult, "ingress", opts));
  drawings.push(generateElevationView(analysisResult, "egress", opts));
  drawings.push(generateSectionView(analysisResult, opts));
  drawings.push(generateIsometricView(analysisResult, opts));
  drawings.push(generateLineDrawing(analysisResult, opts));
  
  return {
    id,
    dualScanSessionId: uuidv4(),
    openingId: openingData.id,
    generatedAt: new Date(),
    drawings,
    exportFormats: []
  };
}

export function generatePlanView(
  analysisResult: DoorAnalysisResult,
  options: Partial<DrawingOptions> = {}
): GeneratedDrawing {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { dimensions, orientation, hardware, clearances } = analysisResult;
  
  const scale = parseScale(opts.scale);
  const frameWidth = dimToValue(dimensions.frameWidth, opts.units);
  const frameDepth = dimToValue(dimensions.frameDepth, opts.units);
  const leafWidth = dimToValue(dimensions.leafWidth, opts.units);
  const leafThickness = dimToValue(dimensions.leafThickness, opts.units);
  
  const margin = 80;
  const drawingWidth = (frameWidth + 100) * scale + margin * 2;
  const drawingHeight = (frameDepth + leafWidth + 100) * scale + margin * 2;
  const viewBox = `0 0 ${drawingWidth} ${drawingHeight}`;
  
  const offsetX = margin + 50 * scale;
  const offsetY = margin + 50 * scale;
  
  const scaledFrameWidth = frameWidth * scale;
  const scaledFrameDepth = frameDepth * scale;
  const scaledLeafWidth = leafWidth * scale;
  const scaledLeafThickness = leafThickness * scale;
  
  let svg = createSvgHeader(drawingWidth, drawingHeight, viewBox, opts.colorScheme);
  
  const layers: DrawingLayer[] = [];
  const annotations: DrawingAnnotation[] = [];
  const hardwareSymbols: HardwareSymbol[] = [];
  
  if (opts.showLayers.frame) {
    svg += createLayer("frame", "Frame");
    layers.push({ id: "frame", name: "Frame", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].frame, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    svg += `<rect x="${offsetX}" y="${offsetY}" width="${scaledFrameWidth}" height="${scaledFrameDepth}" class="frame" stroke-width="${opts.lineWeights!.outline}" />`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.door) {
    svg += createLayer("door", "Door");
    layers.push({ id: "door", name: "Door", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].door, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    const hingeSide = orientation.hingeSide;
    const hingeX = hingeSide === "left" ? offsetX : offsetX + scaledFrameWidth - scaledLeafThickness;
    const doorY = offsetY + scaledFrameDepth;
    
    svg += `<rect x="${hingeX}" y="${doorY}" width="${scaledLeafThickness}" height="${scaledLeafWidth}" class="door" stroke-width="${opts.lineWeights!.outline}" fill="none" />`;
    
    const pivotX = hingeSide === "left" ? hingeX : hingeX + scaledLeafThickness;
    const pivotY = doorY;
    
    const swingArc = calculateArcPoints(pivotX, pivotY, scaledLeafWidth, 0, 90, 24);
    const arcPath = `M ${point2DToString(swingArc[0])} ` + swingArc.slice(1).map(p => `L ${point2DToString(p)}`).join(' ');
    
    svg += `<path d="${arcPath}" class="door" stroke-width="${opts.lineWeights!.thin}" stroke-dasharray="5,3" fill="none" />`;
    
    const closedDoorX = hingeSide === "left" ? hingeX : hingeX + scaledLeafThickness - scaledLeafWidth;
    svg += `<line x1="${closedDoorX}" y1="${pivotY}" x2="${closedDoorX + scaledLeafWidth}" y2="${pivotY}" class="door" stroke-width="${opts.lineWeights!.hidden}" stroke-dasharray="8,4" />`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.hardware && hardware.hinges.length > 0) {
    svg += createLayer("hardware", "Hardware");
    layers.push({ id: "hardware", name: "Hardware", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].hardware, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    const hingeSide = orientation.hingeSide;
    const hingeX = hingeSide === "left" ? offsetX + 5 * scale : offsetX + scaledFrameWidth - 5 * scale;
    
    hardware.hinges.forEach((hinge, idx) => {
      const hingeY = offsetY + scaledFrameDepth / 2;
      svg += `<circle cx="${hingeX}" cy="${hingeY - (idx - 1) * 15 * scale}" r="${4 * scale}" class="hardware" fill="${COLOR_SCHEMES[opts.colorScheme].hardware}" />`;
      
      hardwareSymbols.push({
        id: uuidv4(),
        hardwareType: "hinge",
        symbolPath: HARDWARE_SYMBOLS.hinge.path,
        position: { x: hingeX, y: hingeY - (idx - 1) * 15 * scale },
        rotation: 0,
        scale: scale,
        layer: "hardware"
      });
    });
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.dimensions) {
    svg += createLayer("dimensions", "Dimensions");
    layers.push({ id: "dimensions", name: "Dimensions", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].dimension, lineWeight: opts.lineWeights!.dimension, elements: [] });
    
    svg += createDimensionLine(
      offsetX, offsetY - 30,
      offsetX + scaledFrameWidth, offsetY - 30,
      formatDimension(frameWidth, opts.units, opts.dimensionStyle!.precision),
      opts.dimensionStyle!.textSize,
      15,
      opts.lineWeights!.dimension
    );
    
    annotations.push({
      id: uuidv4(),
      type: "dimension",
      text: formatDimension(frameWidth, opts.units),
      position: { x: offsetX + scaledFrameWidth / 2, y: offsetY - 40 },
      fontSize: opts.dimensionStyle!.textSize,
      layer: "dimensions"
    });
    
    svg += createDimensionLine(
      offsetX - 30, offsetY,
      offsetX - 30, offsetY + scaledFrameDepth,
      formatDimension(frameDepth, opts.units, opts.dimensionStyle!.precision),
      opts.dimensionStyle!.textSize,
      15,
      opts.lineWeights!.dimension
    );
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.annotations) {
    svg += createLayer("annotations", "Annotations");
    layers.push({ id: "annotations", name: "Annotations", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].annotation, lineWeight: opts.lineWeights!.thin, elements: [] });
    
    svg += `<text x="${offsetX + scaledFrameWidth / 2}" y="${drawingHeight - 20}" class="title-text" font-size="14" text-anchor="middle">PLAN VIEW</text>`;
    svg += `<text x="${offsetX + scaledFrameWidth / 2}" y="${drawingHeight - 5}" class="annotation" font-size="10" text-anchor="middle">Scale: ${opts.scale} | Swing: ${orientation.swingDirection}</text>`;
    
    svg += closeLayer();
  }
  
  if (opts.titleBlock) {
    svg += createTitleBlock(
      drawingWidth - 210, drawingHeight - 80,
      200, 70,
      opts.titleBlock,
      "PLAN VIEW",
      opts.scale,
      opts.units
    );
  }
  
  svg += createSvgFooter();
  
  return {
    id: uuidv4(),
    type: "plan-view",
    title: "Plan View - Door Opening",
    scale: opts.scale,
    units: opts.units,
    svgContent: svg,
    dimensions: { width: drawingWidth, height: drawingHeight, viewBox },
    annotations,
    hardwareSymbols,
    layers
  };
}

export function generateElevationView(
  analysisResult: DoorAnalysisResult,
  side: "ingress" | "egress",
  options: Partial<DrawingOptions> = {}
): GeneratedDrawing {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { dimensions, orientation, hardware, clearances } = analysisResult;
  
  const scale = parseScale(opts.scale);
  const frameWidth = dimToValue(dimensions.frameWidth, opts.units);
  const frameHeight = dimToValue(dimensions.frameHeight, opts.units);
  const leafWidth = dimToValue(dimensions.leafWidth, opts.units);
  const leafHeight = dimToValue(dimensions.leafHeight, opts.units);
  
  const margin = 80;
  const drawingWidth = (frameWidth + 150) * scale + margin * 2;
  const drawingHeight = (frameHeight + 100) * scale + margin * 2;
  const viewBox = `0 0 ${drawingWidth} ${drawingHeight}`;
  
  const offsetX = margin + 75 * scale;
  const offsetY = margin;
  
  const scaledFrameWidth = frameWidth * scale;
  const scaledFrameHeight = frameHeight * scale;
  const scaledLeafWidth = leafWidth * scale;
  const scaledLeafHeight = leafHeight * scale;
  
  let svg = createSvgHeader(drawingWidth, drawingHeight, viewBox, opts.colorScheme);
  
  const layers: DrawingLayer[] = [];
  const annotations: DrawingAnnotation[] = [];
  const hardwareSymbols: HardwareSymbol[] = [];
  
  if (opts.showLayers.frame) {
    svg += createLayer("frame", "Frame");
    layers.push({ id: "frame", name: "Frame", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].frame, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    svg += `<rect x="${offsetX}" y="${offsetY}" width="${scaledFrameWidth}" height="${scaledFrameHeight}" class="frame" stroke-width="${opts.lineWeights!.outline}" />`;
    
    const frameThickness = 5 * scale;
    svg += `<rect x="${offsetX}" y="${offsetY}" width="${frameThickness}" height="${scaledFrameHeight}" class="frame" stroke-width="${opts.lineWeights!.thin}" fill="${opts.colorScheme === 'blueprint' ? '#2a4a6c' : '#f0f0f0'}" />`;
    svg += `<rect x="${offsetX + scaledFrameWidth - frameThickness}" y="${offsetY}" width="${frameThickness}" height="${scaledFrameHeight}" class="frame" stroke-width="${opts.lineWeights!.thin}" fill="${opts.colorScheme === 'blueprint' ? '#2a4a6c' : '#f0f0f0'}" />`;
    svg += `<rect x="${offsetX}" y="${offsetY}" width="${scaledFrameWidth}" height="${frameThickness}" class="frame" stroke-width="${opts.lineWeights!.thin}" fill="${opts.colorScheme === 'blueprint' ? '#2a4a6c' : '#f0f0f0'}" />`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.door) {
    svg += createLayer("door", "Door");
    layers.push({ id: "door", name: "Door", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].door, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    const doorX = offsetX + (scaledFrameWidth - scaledLeafWidth) / 2;
    const doorY = offsetY + scaledFrameHeight - scaledLeafHeight;
    
    svg += `<rect x="${doorX}" y="${doorY}" width="${scaledLeafWidth}" height="${scaledLeafHeight}" class="door" stroke-width="${opts.lineWeights!.outline}" fill="none" />`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.hardware) {
    svg += createLayer("hardware", "Hardware");
    layers.push({ id: "hardware", name: "Hardware", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].hardware, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    const doorX = offsetX + (scaledFrameWidth - scaledLeafWidth) / 2;
    const doorY = offsetY + scaledFrameHeight - scaledLeafHeight;
    const hingeSide = orientation.hingeSide;
    const hingeX = hingeSide === "left" ? doorX : doorX + scaledLeafWidth;
    
    hardware.hinges.forEach((hinge, idx) => {
      const hingeY = doorY + hinge.heightFromFloor * scale / (opts.units === "mm" ? 1 : 25.4);
      svg += createHardwareSymbol("hinge", hingeX, hingeY, hingeSide === "left" ? 0 : 180, scale);
      
      hardwareSymbols.push({
        id: uuidv4(),
        hardwareType: "hinge",
        symbolPath: HARDWARE_SYMBOLS.hinge.path,
        position: { x: hingeX, y: hingeY },
        rotation: hingeSide === "left" ? 0 : 180,
        scale: scale,
        layer: "hardware"
      });
    });
    
    if (hardware.lock) {
      const lockX = hingeSide === "left" ? doorX + scaledLeafWidth - 15 * scale : doorX + 15 * scale;
      const lockY = offsetY + scaledFrameHeight - hardware.lock.heightFromFloor * scale / (opts.units === "mm" ? 1 : 25.4);
      svg += createHardwareSymbol("lockset", lockX, lockY, 0, scale, "Lock");
      
      hardwareSymbols.push({
        id: uuidv4(),
        hardwareType: "lockset",
        symbolPath: HARDWARE_SYMBOLS.lockset.path,
        position: { x: lockX, y: lockY },
        rotation: 0,
        scale: scale,
        label: "Lock",
        layer: "hardware"
      });
    }
    
    if (hardware.closer) {
      const closerX = doorX + scaledLeafWidth / 2;
      const closerY = doorY + 20 * scale;
      svg += createHardwareSymbol("closer", closerX, closerY, 0, scale * 0.5, "Closer");
      
      hardwareSymbols.push({
        id: uuidv4(),
        hardwareType: "closer",
        symbolPath: HARDWARE_SYMBOLS.closer.path,
        position: { x: closerX, y: closerY },
        rotation: 0,
        scale: scale * 0.5,
        label: "Closer",
        layer: "hardware"
      });
    }
    
    if (hardware.panic) {
      const panicX = doorX + scaledLeafWidth / 2;
      const panicY = offsetY + scaledFrameHeight - hardware.panic.heightFromFloor * scale / (opts.units === "mm" ? 1 : 25.4);
      svg += createHardwareSymbol("panic-bar", panicX, panicY, 0, scale * 0.8, "Panic Bar");
      
      hardwareSymbols.push({
        id: uuidv4(),
        hardwareType: "panic-bar",
        symbolPath: HARDWARE_SYMBOLS["panic-bar"].path,
        position: { x: panicX, y: panicY },
        rotation: 0,
        scale: scale * 0.8,
        label: "Panic Bar",
        layer: "hardware"
      });
    }
    
    if (hardware.kickplate) {
      const kickX = doorX + scaledLeafWidth / 2;
      const kickY = offsetY + scaledFrameHeight - 15 * scale;
      svg += createHardwareSymbol("kickplate", kickX, kickY, 0, scale * 0.6, "Kickplate");
      
      hardwareSymbols.push({
        id: uuidv4(),
        hardwareType: "kickplate",
        symbolPath: HARDWARE_SYMBOLS.kickplate.path,
        position: { x: kickX, y: kickY },
        rotation: 0,
        scale: scale * 0.6,
        label: "Kickplate",
        layer: "hardware"
      });
    }
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.dimensions) {
    svg += createLayer("dimensions", "Dimensions");
    layers.push({ id: "dimensions", name: "Dimensions", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].dimension, lineWeight: opts.lineWeights!.dimension, elements: [] });
    
    svg += createDimensionLine(
      offsetX, offsetY + scaledFrameHeight + 30,
      offsetX + scaledFrameWidth, offsetY + scaledFrameHeight + 30,
      formatDimension(frameWidth, opts.units, opts.dimensionStyle!.precision),
      opts.dimensionStyle!.textSize,
      15,
      opts.lineWeights!.dimension
    );
    
    svg += createDimensionLine(
      offsetX - 40, offsetY,
      offsetX - 40, offsetY + scaledFrameHeight,
      formatDimension(frameHeight, opts.units, opts.dimensionStyle!.precision),
      opts.dimensionStyle!.textSize,
      20,
      opts.lineWeights!.dimension
    );
    
    if (hardware.lock) {
      const lockHeight = hardware.lock.heightFromFloor / (opts.units === "mm" ? 1 : 25.4);
      svg += createDimensionLine(
        offsetX + scaledFrameWidth + 20, offsetY + scaledFrameHeight,
        offsetX + scaledFrameWidth + 20, offsetY + scaledFrameHeight - lockHeight * scale,
        formatDimension(lockHeight, opts.units, opts.dimensionStyle!.precision),
        opts.dimensionStyle!.textSize - 1,
        10,
        opts.lineWeights!.dimension
      );
    }
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.clearances) {
    svg += createLayer("clearances", "Clearances");
    layers.push({ id: "clearances", name: "Clearances", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].clearance, lineWeight: opts.lineWeights!.thin, elements: [] });
    
    const undercut = dimToValue(clearances.undercut, opts.units);
    svg += `<line x1="${offsetX + 10 * scale}" y1="${offsetY + scaledFrameHeight}" x2="${offsetX + scaledFrameWidth - 10 * scale}" y2="${offsetY + scaledFrameHeight}" class="clearance" stroke-width="${opts.lineWeights!.thin}" />`;
    svg += `<text x="${offsetX + scaledFrameWidth / 2}" y="${offsetY + scaledFrameHeight + 12}" class="annotation" font-size="8" text-anchor="middle">Undercut: ${formatDimension(undercut, opts.units)}</text>`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.ada) {
    svg += createLayer("ada", "ADA Compliance");
    layers.push({ id: "ada", name: "ADA Compliance", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].ada, lineWeight: opts.lineWeights!.thin, elements: [] });
    
    const adaClearWidth = dimToValue(clearances.adaClearWidth, opts.units);
    svg += `<line x1="${offsetX}" y1="${offsetY + scaledFrameHeight + 50}" x2="${offsetX + adaClearWidth * scale}" y2="${offsetY + scaledFrameHeight + 50}" class="ada" stroke-width="${opts.lineWeights!.outline}" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />`;
    svg += `<text x="${offsetX + adaClearWidth * scale / 2}" y="${offsetY + scaledFrameHeight + 65}" class="annotation" font-size="9" text-anchor="middle" fill="${COLOR_SCHEMES[opts.colorScheme].ada}">ADA Clear: ${formatDimension(adaClearWidth, opts.units)}</text>`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.annotations) {
    svg += createLayer("annotations", "Annotations");
    layers.push({ id: "annotations", name: "Annotations", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].annotation, lineWeight: opts.lineWeights!.thin, elements: [] });
    
    const viewTitle = side === "ingress" ? "ELEVATION - INGRESS SIDE" : "ELEVATION - EGRESS SIDE";
    svg += `<text x="${offsetX + scaledFrameWidth / 2}" y="${20}" class="title-text" font-size="14" text-anchor="middle">${viewTitle}</text>`;
    svg += `<text x="${offsetX + scaledFrameWidth / 2}" y="${35}" class="annotation" font-size="10" text-anchor="middle">Scale: ${opts.scale} | Hinge Side: ${orientation.hingeSide}</text>`;
    
    svg += closeLayer();
  }
  
  if (opts.titleBlock) {
    svg += createTitleBlock(
      drawingWidth - 210, drawingHeight - 80,
      200, 70,
      opts.titleBlock,
      side === "ingress" ? "ELEVATION - INGRESS" : "ELEVATION - EGRESS",
      opts.scale,
      opts.units
    );
  }
  
  svg += createSvgFooter();
  
  return {
    id: uuidv4(),
    type: side === "ingress" ? "elevation-ingress" : "elevation-egress",
    title: `Elevation View - ${side === "ingress" ? "Ingress" : "Egress"} Side`,
    scale: opts.scale,
    units: opts.units,
    svgContent: svg,
    dimensions: { width: drawingWidth, height: drawingHeight, viewBox },
    annotations,
    hardwareSymbols,
    layers
  };
}

export function generateSectionView(
  analysisResult: DoorAnalysisResult,
  options: Partial<DrawingOptions> = {}
): GeneratedDrawing {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { dimensions, orientation, clearances } = analysisResult;
  
  const scale = parseScale(opts.scale) * 2;
  const frameDepth = dimToValue(dimensions.frameDepth, opts.units);
  const frameHeight = dimToValue(dimensions.frameHeight, opts.units);
  const leafThickness = dimToValue(dimensions.leafThickness, opts.units);
  const stopDepth = dimToValue(dimensions.stopDepth, opts.units);
  const wallThickness = dimensions.wallThickness ? dimToValue(dimensions.wallThickness, opts.units) : frameDepth * 1.2;
  
  const margin = 60;
  const drawingWidth = (wallThickness + 100) * scale + margin * 2;
  const drawingHeight = 250;
  const viewBox = `0 0 ${drawingWidth} ${drawingHeight}`;
  
  const offsetX = margin + 50 * scale;
  const offsetY = 50;
  const sectionHeight = 150;
  
  const scaledFrameDepth = frameDepth * scale;
  const scaledLeafThickness = leafThickness * scale;
  const scaledStopDepth = stopDepth * scale;
  const scaledWallThickness = wallThickness * scale;
  
  let svg = createSvgHeader(drawingWidth, drawingHeight, viewBox, opts.colorScheme);
  
  const layers: DrawingLayer[] = [];
  const annotations: DrawingAnnotation[] = [];
  
  svg += createLayer("wall", "Wall");
  layers.push({ id: "wall", name: "Wall", visible: true, locked: false, color: "#CCCCCC", lineWeight: opts.lineWeights!.outline, elements: [] });
  
  svg += `<rect x="${offsetX - 20 * scale}" y="${offsetY}" width="${scaledWallThickness + 40 * scale}" height="${sectionHeight}" fill="${opts.colorScheme === 'blueprint' ? '#2a4a6c' : '#e0e0e0'}" stroke="${COLOR_SCHEMES[opts.colorScheme].frame}" stroke-width="${opts.lineWeights!.outline}" />`;
  
  svg += closeLayer();
  
  if (opts.showLayers.frame) {
    svg += createLayer("frame", "Frame");
    layers.push({ id: "frame", name: "Frame", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].frame, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    const frameX = offsetX;
    svg += `<rect x="${frameX}" y="${offsetY + 10}" width="${scaledFrameDepth}" height="${sectionHeight - 20}" fill="none" stroke="${COLOR_SCHEMES[opts.colorScheme].frame}" stroke-width="${opts.lineWeights!.outline}" />`;
    
    svg += `<line x1="${frameX + scaledStopDepth}" y1="${offsetY + 30}" x2="${frameX + scaledStopDepth}" y2="${offsetY + sectionHeight - 30}" stroke="${COLOR_SCHEMES[opts.colorScheme].frame}" stroke-width="${opts.lineWeights!.thin}" />`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.door) {
    svg += createLayer("door", "Door");
    layers.push({ id: "door", name: "Door", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].door, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    const doorX = offsetX + scaledStopDepth + 3 * scale;
    svg += `<rect x="${doorX}" y="${offsetY + 40}" width="${scaledLeafThickness}" height="${sectionHeight - 80}" fill="${opts.colorScheme === 'blueprint' ? '#3a5a7c' : '#f5f5f5'}" stroke="${COLOR_SCHEMES[opts.colorScheme].door}" stroke-width="${opts.lineWeights!.outline}" />`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.dimensions) {
    svg += createLayer("dimensions", "Dimensions");
    layers.push({ id: "dimensions", name: "Dimensions", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].dimension, lineWeight: opts.lineWeights!.dimension, elements: [] });
    
    svg += createDimensionLine(
      offsetX, offsetY + sectionHeight + 20,
      offsetX + scaledFrameDepth, offsetY + sectionHeight + 20,
      formatDimension(frameDepth, opts.units, opts.dimensionStyle!.precision),
      opts.dimensionStyle!.textSize,
      10,
      opts.lineWeights!.dimension
    );
    
    svg += createDimensionLine(
      offsetX + scaledStopDepth + 3 * scale, offsetY + sectionHeight + 40,
      offsetX + scaledStopDepth + 3 * scale + scaledLeafThickness, offsetY + sectionHeight + 40,
      formatDimension(leafThickness, opts.units, opts.dimensionStyle!.precision),
      opts.dimensionStyle!.textSize - 1,
      8,
      opts.lineWeights!.dimension
    );
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.annotations) {
    svg += createLayer("annotations", "Annotations");
    layers.push({ id: "annotations", name: "Annotations", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].annotation, lineWeight: opts.lineWeights!.thin, elements: [] });
    
    svg += `<text x="${drawingWidth / 2}" y="${20}" class="title-text" font-size="14" text-anchor="middle">SECTION VIEW - JAMB DETAIL</text>`;
    svg += `<text x="${drawingWidth / 2}" y="${35}" class="annotation" font-size="10" text-anchor="middle">Scale: ${opts.scale}</text>`;
    
    svg += `<text x="${offsetX + scaledStopDepth / 2}" y="${offsetY + sectionHeight / 2}" class="annotation" font-size="8" text-anchor="middle" transform="rotate(-90 ${offsetX + scaledStopDepth / 2} ${offsetY + sectionHeight / 2})">Stop</text>`;
    
    svg += closeLayer();
  }
  
  if (opts.titleBlock) {
    svg += createTitleBlock(
      drawingWidth - 160, drawingHeight - 60,
      150, 50,
      opts.titleBlock,
      "SECTION - JAMB",
      opts.scale,
      opts.units
    );
  }
  
  svg += createSvgFooter();
  
  return {
    id: uuidv4(),
    type: "section",
    title: "Section View - Jamb Detail",
    scale: opts.scale,
    units: opts.units,
    svgContent: svg,
    dimensions: { width: drawingWidth, height: drawingHeight, viewBox },
    annotations,
    hardwareSymbols: [],
    layers
  };
}

export function generateIsometricView(
  analysisResult: DoorAnalysisResult,
  options: Partial<DrawingOptions> = {}
): GeneratedDrawing {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { dimensions, orientation, hardware } = analysisResult;
  
  const scale = parseScale(opts.scale);
  const frameWidth = dimToValue(dimensions.frameWidth, opts.units);
  const frameHeight = dimToValue(dimensions.frameHeight, opts.units);
  const frameDepth = dimToValue(dimensions.frameDepth, opts.units);
  const leafWidth = dimToValue(dimensions.leafWidth, opts.units);
  const leafHeight = dimToValue(dimensions.leafHeight, opts.units);
  const leafThickness = dimToValue(dimensions.leafThickness, opts.units);
  
  const isoAngle = 30 * Math.PI / 180;
  const cosA = Math.cos(isoAngle);
  const sinA = Math.sin(isoAngle);
  
  function isoProject(x: number, y: number, z: number): Point2D {
    return {
      x: (x - z) * cosA * scale + 300,
      y: (x + z) * sinA * scale - y * scale + 400
    };
  }
  
  const drawingWidth = 600;
  const drawingHeight = 500;
  const viewBox = `0 0 ${drawingWidth} ${drawingHeight}`;
  
  let svg = createSvgHeader(drawingWidth, drawingHeight, viewBox, opts.colorScheme);
  
  const layers: DrawingLayer[] = [];
  const annotations: DrawingAnnotation[] = [];
  const hardwareSymbols: HardwareSymbol[] = [];
  
  if (opts.showLayers.frame) {
    svg += createLayer("frame", "Frame");
    layers.push({ id: "frame", name: "Frame", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].frame, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    const frameVerts = [
      isoProject(0, 0, 0),
      isoProject(frameWidth, 0, 0),
      isoProject(frameWidth, 0, frameDepth),
      isoProject(0, 0, frameDepth),
      isoProject(0, frameHeight, 0),
      isoProject(frameWidth, frameHeight, 0),
      isoProject(frameWidth, frameHeight, frameDepth),
      isoProject(0, frameHeight, frameDepth)
    ];
    
    const frameEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    
    frameEdges.forEach(([a, b]) => {
      svg += `<line x1="${frameVerts[a].x}" y1="${frameVerts[a].y}" x2="${frameVerts[b].x}" y2="${frameVerts[b].y}" class="frame" stroke-width="${opts.lineWeights!.outline}" />`;
    });
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.door) {
    svg += createLayer("door", "Door");
    layers.push({ id: "door", name: "Door", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].door, lineWeight: opts.lineWeights!.outline, elements: [] });
    
    const doorAngle = orientation.swingAngle * Math.PI / 180;
    const hingeSide = orientation.hingeSide;
    
    const doorOffset = (frameWidth - leafWidth) / 2;
    const doorZ = frameDepth / 2 - leafThickness / 2;
    
    let doorVerts: Point2D[];
    
    if (hingeSide === "left") {
      doorVerts = [
        isoProject(doorOffset, 0, doorZ),
        isoProject(doorOffset + leafWidth * Math.cos(doorAngle), 0, doorZ - leafWidth * Math.sin(doorAngle)),
        isoProject(doorOffset + leafWidth * Math.cos(doorAngle), leafHeight, doorZ - leafWidth * Math.sin(doorAngle)),
        isoProject(doorOffset, leafHeight, doorZ)
      ];
    } else {
      doorVerts = [
        isoProject(doorOffset + leafWidth, 0, doorZ),
        isoProject(doorOffset + leafWidth - leafWidth * Math.cos(doorAngle), 0, doorZ - leafWidth * Math.sin(doorAngle)),
        isoProject(doorOffset + leafWidth - leafWidth * Math.cos(doorAngle), leafHeight, doorZ - leafWidth * Math.sin(doorAngle)),
        isoProject(doorOffset + leafWidth, leafHeight, doorZ)
      ];
    }
    
    const doorPath = `M ${point2DToString(doorVerts[0])} L ${point2DToString(doorVerts[1])} L ${point2DToString(doorVerts[2])} L ${point2DToString(doorVerts[3])} Z`;
    svg += `<path d="${doorPath}" class="door" stroke-width="${opts.lineWeights!.outline}" fill="${opts.colorScheme === 'blueprint' ? '#3a5a7c' : '#f5f5f5'}" fill-opacity="0.7" />`;
    
    svg += closeLayer();
  }
  
  if (opts.showLayers.annotations) {
    svg += createLayer("annotations", "Annotations");
    layers.push({ id: "annotations", name: "Annotations", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].annotation, lineWeight: opts.lineWeights!.thin, elements: [] });
    
    svg += `<text x="${drawingWidth / 2}" y="${30}" class="title-text" font-size="14" text-anchor="middle">ISOMETRIC VIEW</text>`;
    svg += `<text x="${drawingWidth / 2}" y="${45}" class="annotation" font-size="10" text-anchor="middle">30° Isometric Projection | Scale: ${opts.scale}</text>`;
    
    const originProj = isoProject(0, 0, 0);
    svg += `<line x1="${originProj.x}" y1="${originProj.y}" x2="${originProj.x + 50}" y2="${originProj.y}" stroke="${COLOR_SCHEMES[opts.colorScheme].dimension}" stroke-width="1" marker-end="url(#arrow-end)" />`;
    svg += `<text x="${originProj.x + 55}" y="${originProj.y + 4}" class="annotation" font-size="8">X</text>`;
    
    svg += `<line x1="${originProj.x}" y1="${originProj.y}" x2="${originProj.x}" y2="${originProj.y - 50}" stroke="${COLOR_SCHEMES[opts.colorScheme].dimension}" stroke-width="1" marker-end="url(#arrow-end)" />`;
    svg += `<text x="${originProj.x - 4}" y="${originProj.y - 55}" class="annotation" font-size="8">Y</text>`;
    
    svg += `<line x1="${originProj.x}" y1="${originProj.y}" x2="${originProj.x - 40}" y2="${originProj.y + 23}" stroke="${COLOR_SCHEMES[opts.colorScheme].dimension}" stroke-width="1" marker-end="url(#arrow-end)" />`;
    svg += `<text x="${originProj.x - 50}" y="${originProj.y + 30}" class="annotation" font-size="8">Z</text>`;
    
    svg += closeLayer();
  }
  
  if (opts.titleBlock) {
    svg += createTitleBlock(
      drawingWidth - 210, drawingHeight - 80,
      200, 70,
      opts.titleBlock,
      "ISOMETRIC VIEW",
      opts.scale,
      opts.units
    );
  }
  
  svg += createSvgFooter();
  
  return {
    id: uuidv4(),
    type: "isometric-3d",
    title: "Isometric View - 3D Projection",
    viewAngle: 30,
    scale: opts.scale,
    units: opts.units,
    svgContent: svg,
    dimensions: { width: drawingWidth, height: drawingHeight, viewBox },
    annotations,
    hardwareSymbols,
    layers
  };
}

export function generateLineDrawing(
  analysisResult: DoorAnalysisResult,
  options: Partial<DrawingOptions> = {}
): GeneratedDrawing {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { dimensions, orientation, hardware } = analysisResult;
  
  const scale = parseScale(opts.scale);
  const frameWidth = dimToValue(dimensions.frameWidth, opts.units);
  const frameHeight = dimToValue(dimensions.frameHeight, opts.units);
  const leafWidth = dimToValue(dimensions.leafWidth, opts.units);
  const leafHeight = dimToValue(dimensions.leafHeight, opts.units);
  
  const margin = 40;
  const drawingWidth = frameWidth * scale + margin * 2;
  const drawingHeight = frameHeight * scale + margin * 2;
  const viewBox = `0 0 ${drawingWidth} ${drawingHeight}`;
  
  const offsetX = margin;
  const offsetY = margin;
  
  const scaledFrameWidth = frameWidth * scale;
  const scaledFrameHeight = frameHeight * scale;
  const scaledLeafWidth = leafWidth * scale;
  const scaledLeafHeight = leafHeight * scale;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${drawingWidth}" height="${drawingHeight}" viewBox="${viewBox}">
  <style>
    .line { stroke: #000000; stroke-width: 1; fill: none; }
    .thin { stroke: #666666; stroke-width: 0.5; fill: none; }
  </style>
`;
  
  svg += `<rect x="${offsetX}" y="${offsetY}" width="${scaledFrameWidth}" height="${scaledFrameHeight}" class="line" />`;
  
  const doorX = offsetX + (scaledFrameWidth - scaledLeafWidth) / 2;
  const doorY = offsetY + scaledFrameHeight - scaledLeafHeight;
  svg += `<rect x="${doorX}" y="${doorY}" width="${scaledLeafWidth}" height="${scaledLeafHeight}" class="line" />`;
  
  const hingeSide = orientation.hingeSide;
  hardware.hinges.forEach((hinge, idx) => {
    const hingeX = hingeSide === "left" ? doorX + 2 : doorX + scaledLeafWidth - 6;
    const hingeY = doorY + (hinge.heightFromFloor * scale / (opts.units === "mm" ? 1 : 25.4));
    svg += `<rect x="${hingeX}" y="${hingeY - 4}" width="4" height="8" class="line" />`;
  });
  
  if (hardware.lock) {
    const lockX = hingeSide === "left" ? doorX + scaledLeafWidth - 10 : doorX + 6;
    const lockY = doorY + scaledLeafHeight - (hardware.lock.heightFromFloor * scale / (opts.units === "mm" ? 1 : 25.4));
    svg += `<circle cx="${lockX}" cy="${lockY}" r="4" class="line" />`;
  }
  
  svg += `</svg>`;
  
  return {
    id: uuidv4(),
    type: "line-drawing",
    title: "Simplified Line Drawing",
    scale: opts.scale,
    units: opts.units,
    svgContent: svg,
    dimensions: { width: drawingWidth, height: drawingHeight, viewBox },
    annotations: [],
    hardwareSymbols: [],
    layers: [{ id: "all", name: "All Elements", visible: true, locked: false, color: "#000000", lineWeight: 1, elements: [] }]
  };
}

export function generateWiringDiagramOverlay(
  analysisResult: DoorAnalysisResult,
  wiringData: WiringData,
  options: Partial<DrawingOptions> = {}
): GeneratedDrawing {
  const opts = { ...DEFAULT_OPTIONS, ...options, showLayers: { ...DEFAULT_OPTIONS.showLayers, wiring: true } };
  const { dimensions, hardware } = analysisResult;
  
  const scale = parseScale(opts.scale);
  const frameWidth = dimToValue(dimensions.frameWidth, opts.units);
  const frameHeight = dimToValue(dimensions.frameHeight, opts.units);
  
  const margin = 80;
  const drawingWidth = frameWidth * scale + margin * 2 + 200;
  const drawingHeight = frameHeight * scale + margin * 2;
  const viewBox = `0 0 ${drawingWidth} ${drawingHeight}`;
  
  const offsetX = margin;
  const offsetY = margin;
  
  const scaledFrameWidth = frameWidth * scale;
  const scaledFrameHeight = frameHeight * scale;
  
  let svg = createSvgHeader(drawingWidth, drawingHeight, viewBox, opts.colorScheme);
  
  const layers: DrawingLayer[] = [];
  const annotations: DrawingAnnotation[] = [];
  
  svg += createLayer("frame-outline", "Frame Outline");
  layers.push({ id: "frame-outline", name: "Frame Outline", visible: true, locked: true, color: "#CCCCCC", lineWeight: 0.5, elements: [] });
  
  svg += `<rect x="${offsetX}" y="${offsetY}" width="${scaledFrameWidth}" height="${scaledFrameHeight}" fill="none" stroke="#CCCCCC" stroke-width="0.5" stroke-dasharray="5,5" />`;
  
  svg += closeLayer();
  
  svg += createLayer("wiring", "Wiring");
  layers.push({ id: "wiring", name: "Wiring", visible: true, locked: false, color: "#0000FF", lineWeight: 1, elements: [] });
  
  const wiringColors = COLOR_SCHEMES[opts.colorScheme].wiring;
  
  wiringData.circuits.forEach(circuit => {
    if (circuit.path.length < 2) return;
    
    const color = wiringColors[circuit.type] || "#0000FF";
    const pathD = `M ${circuit.path.map(p => `${p.x * scale + offsetX},${offsetY + scaledFrameHeight - p.y * scale}`).join(' L ')}`;
    
    svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
    
    if (circuit.name) {
      const midIndex = Math.floor(circuit.path.length / 2);
      const midPoint = circuit.path[midIndex];
      svg += `<text x="${midPoint.x * scale + offsetX}" y="${offsetY + scaledFrameHeight - midPoint.y * scale - 8}" class="annotation" font-size="8" fill="${color}">${escapeXml(circuit.name)}</text>`;
    }
  });
  
  wiringData.symbols.forEach(symbol => {
    const x = symbol.position.x * scale + offsetX;
    const y = offsetY + scaledFrameHeight - symbol.position.y * scale;
    
    svg += `<g transform="translate(${x - 10}, ${y - 10}) rotate(${symbol.rotation} 10 10)">`;
    svg += `<rect width="20" height="20" fill="white" stroke="#333333" stroke-width="1" />`;
    svg += `<text x="10" y="14" font-size="8" text-anchor="middle" fill="#333333">${escapeXml(symbol.deviceType.substring(0, 2).toUpperCase())}</text>`;
    svg += `</g>`;
    
    if (symbol.label) {
      svg += `<text x="${x}" y="${y + 18}" class="annotation" font-size="8" text-anchor="middle">${escapeXml(symbol.label)}</text>`;
    }
  });
  
  svg += closeLayer();
  
  svg += createLayer("wiring-annotations", "Wiring Annotations");
  layers.push({ id: "wiring-annotations", name: "Wiring Annotations", visible: true, locked: false, color: "#666666", lineWeight: 0.5, elements: [] });
  
  wiringData.annotations.forEach(annotation => {
    const x = annotation.position.x * scale + offsetX;
    const y = offsetY + scaledFrameHeight - annotation.position.y * scale;
    
    svg += `<text x="${x}" y="${y}" class="annotation" font-size="9">${escapeXml(annotation.text)}</text>`;
  });
  
  const legendX = offsetX + scaledFrameWidth + 30;
  const legendY = offsetY + 20;
  
  svg += `<text x="${legendX}" y="${legendY}" class="title-text" font-size="11">WIRING LEGEND</text>`;
  svg += `<line x1="${legendX}" y1="${legendY + 5}" x2="${legendX + 100}" y2="${legendY + 5}" stroke="#000000" stroke-width="0.5" />`;
  
  let legendItemY = legendY + 25;
  Object.entries(wiringColors).forEach(([type, color]) => {
    svg += `<line x1="${legendX}" y1="${legendItemY}" x2="${legendX + 30}" y2="${legendItemY}" stroke="${color}" stroke-width="2" />`;
    svg += `<text x="${legendX + 35}" y="${legendItemY + 4}" class="annotation" font-size="9">${type.replace("-", " ").toUpperCase()}</text>`;
    legendItemY += 18;
  });
  
  svg += closeLayer();
  
  if (opts.showLayers.annotations) {
    svg += createLayer("title", "Title");
    layers.push({ id: "title", name: "Title", visible: true, locked: false, color: COLOR_SCHEMES[opts.colorScheme].annotation, lineWeight: 0.5, elements: [] });
    
    svg += `<text x="${offsetX + scaledFrameWidth / 2}" y="${25}" class="title-text" font-size="14" text-anchor="middle">WIRING DIAGRAM OVERLAY</text>`;
    svg += `<text x="${offsetX + scaledFrameWidth / 2}" y="${40}" class="annotation" font-size="10" text-anchor="middle">Electrical Connection Layout</text>`;
    
    svg += closeLayer();
  }
  
  if (opts.titleBlock) {
    svg += createTitleBlock(
      drawingWidth - 210, drawingHeight - 80,
      200, 70,
      opts.titleBlock,
      "WIRING DIAGRAM",
      opts.scale,
      opts.units
    );
  }
  
  svg += createSvgFooter();
  
  return {
    id: uuidv4(),
    type: "wiring-diagram",
    title: "Wiring Diagram Overlay",
    scale: opts.scale,
    units: opts.units,
    svgContent: svg,
    dimensions: { width: drawingWidth, height: drawingHeight, viewBox },
    annotations,
    hardwareSymbols: [],
    layers
  };
}

// ============================================================================
// DXF EXPORT FUNCTIONS
// ============================================================================

export function exportToDxf(
  drawing: GeneratedDrawing,
  options: Partial<DrawingOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  let dxf = createDxfHeader();
  
  const svgContent = drawing.svgContent;
  
  const lineRegex = /<line[^>]*x1="([^"]*)"[^>]*y1="([^"]*)"[^>]*x2="([^"]*)"[^>]*y2="([^"]*)"[^>]*>/g;
  let match;
  while ((match = lineRegex.exec(svgContent)) !== null) {
    const [, x1, y1, x2, y2] = match;
    dxf += createDxfLine(
      parseFloat(x1),
      drawing.dimensions.height - parseFloat(y1),
      parseFloat(x2),
      drawing.dimensions.height - parseFloat(y2),
      "FRAME"
    );
  }
  
  const rectRegex = /<rect[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*width="([^"]*)"[^>]*height="([^"]*)"[^>]*>/g;
  while ((match = rectRegex.exec(svgContent)) !== null) {
    const [, x, y, width, height] = match;
    const px = parseFloat(x);
    const py = drawing.dimensions.height - parseFloat(y);
    const pw = parseFloat(width);
    const ph = parseFloat(height);
    
    dxf += createDxfLine(px, py, px + pw, py, "FRAME");
    dxf += createDxfLine(px + pw, py, px + pw, py - ph, "FRAME");
    dxf += createDxfLine(px + pw, py - ph, px, py - ph, "FRAME");
    dxf += createDxfLine(px, py - ph, px, py, "FRAME");
  }
  
  const circleRegex = /<circle[^>]*cx="([^"]*)"[^>]*cy="([^"]*)"[^>]*r="([^"]*)"[^>]*>/g;
  while ((match = circleRegex.exec(svgContent)) !== null) {
    const [, cx, cy, r] = match;
    dxf += createDxfCircle(
      parseFloat(cx),
      drawing.dimensions.height - parseFloat(cy),
      parseFloat(r),
      "HARDWARE"
    );
  }
  
  drawing.annotations.forEach(annotation => {
    if (annotation.type === "dimension" || annotation.type === "label") {
      dxf += createDxfText(
        annotation.position.x,
        drawing.dimensions.height - annotation.position.y,
        annotation.fontSize,
        annotation.text,
        annotation.type === "dimension" ? "DIMENSIONS" : "ANNOTATIONS",
        annotation.rotation || 0
      );
    }
  });
  
  dxf += createDxfFooter();
  
  return dxf;
}

export function exportDrawingSetToDxf(
  drawingSet: DoorDrawingSet,
  options: Partial<DrawingOptions> = {}
): { fileName: string; content: string }[] {
  const results: { fileName: string; content: string }[] = [];
  
  drawingSet.drawings.forEach(drawing => {
    const dxfContent = exportToDxf(drawing, options);
    const fileName = `${drawing.type.replace(/-/g, "_")}_${drawingSet.openingId}.dxf`;
    results.push({ fileName, content: dxfContent });
  });
  
  return results;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  HARDWARE_SYMBOLS,
  COLOR_SCHEMES,
  DEFAULT_OPTIONS,
  dimToValue,
  formatDimension,
  parseScale,
  uuidv4 as generateUUID
};
