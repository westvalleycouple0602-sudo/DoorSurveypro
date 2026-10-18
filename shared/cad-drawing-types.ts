// ============================================================================
// CAD DRAWING GENERATION TYPES
// ============================================================================
// Types for dual-scan LiDAR processing and CAD-style drawing generation
// Used for DoorConfiguratorPro integration and wiring diagram overlays

import type { Dim, Source } from "./scan-types";

// ============================================================================
// DUAL SCAN PROTOCOL TYPES
// ============================================================================

export type DoorState = "open" | "closed";
export type ScanSide = "ingress" | "egress";
export type SwingDirection = "left-hand" | "right-hand" | "left-hand-reverse" | "right-hand-reverse";
export type HingeSide = "left" | "right";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
  width: number;
  height: number;
  depth: number;
}

export interface DetectedPlane {
  id: string;
  normal: Point3D;
  distance: number;
  pointCount: number;
  classification: PlaneClassification;
  bounds: BoundingBox3D;
}

export type PlaneClassification = 
  | "jamb-left"
  | "jamb-right"
  | "head"
  | "sill"
  | "door-leaf"
  | "wall-interior"
  | "wall-exterior"
  | "floor"
  | "threshold"
  | "unknown";

// Individual scan capture
export interface ScanCapture {
  id: string;
  doorState: DoorState;
  capturedAt: Date;
  pointCloudUrl: string;
  photoUrls: string[];
  pointCount: number;
  format: "ply" | "obj" | "json";
  metadata: ScanCaptureMetadata;
}

export interface ScanCaptureMetadata {
  deviceType: string;
  deviceModel?: string;
  scanDurationMs: number;
  ambientLightLux?: number;
  operatorNotes?: string;
  fiducialMarkers?: FiducialMarker[];
}

export interface FiducialMarker {
  id: string;
  position: Point3D;
  type: "checkerboard" | "aruco" | "qr" | "manual";
  confidence: number;
}

// ============================================================================
// DUAL SCAN SESSION
// ============================================================================

export interface DualScanSession {
  id: string;
  openingId: string;
  projectId: string;
  organizationId: string;
  status: DualScanStatus;
  openScan?: ScanCapture;
  closedScanA?: ScanCapture;
  closedScanB?: ScanCapture;
  registrationResult?: ScanRegistrationResult;
  analysisResult?: DoorAnalysisResult;
  drawingSet?: DoorDrawingSet;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type DualScanStatus = 
  | "pending-open"
  | "open-captured"
  | "pending-closed-a"
  | "closed-a-captured"
  | "pending-closed-b"
  | "closed-b-captured"
  | "processing"
  | "completed"
  | "failed";

// Scan registration (aligning open/closed scans)
export interface ScanRegistrationResult {
  transformMatrix: number[][]; // 4x4 transformation matrix
  registrationError: number; // RMS error in mm
  overlapPercentage: number;
  alignedPointCount: number;
  fiducialMatchCount: number;
  confidence: number;
}

// ============================================================================
// DOOR ANALYSIS RESULT
// ============================================================================

export interface MLDetectionStatus {
  status: string;
  confidence: number;
  used: boolean;
}

export interface DoorAnalysisResult {
  dimensions: DoorDimensions;
  orientation: DoorOrientation;
  hardware: DetectedHardware;
  clearances: DoorClearances;
  planes: DetectedPlane[];
  confidence: AnalysisConfidence;
  mlDetection?: MLDetectionStatus;
}

export interface DoorDimensions {
  frameWidth: Dim;
  frameHeight: Dim;
  frameDepth: Dim;
  leafWidth: Dim;
  leafHeight: Dim;
  leafThickness: Dim;
  revealLeft: Dim;
  revealRight: Dim;
  revealTop: Dim;
  stopDepth: Dim;
  wallThickness?: Dim;
}

export interface DoorOrientation {
  hingeSide: HingeSide;
  swingDirection: SwingDirection;
  swingAngle: number; // degrees from closed
  ingressSide: ScanSide;
  egressSide: ScanSide;
  pivotPoint: Point3D;
  swingArc: Point2D[]; // arc path in plan view
}

export interface DetectedHardware {
  hinges: HardwarePosition[];
  lock?: HardwarePosition;
  closer?: HardwarePosition;
  panic?: HardwarePosition;
  kickplate?: HardwarePosition;
  viewer?: HardwarePosition;
  strike?: HardwarePosition;
  weatherStrip?: HardwarePosition[];
  conduit?: ConduitPath[];
  magLock?: HardwarePosition;
  cardReader?: HardwarePosition;
  electricStrike?: HardwarePosition;
}

export interface HardwarePosition {
  type: HardwareType;
  centerPoint: Point3D;
  boundingBox: BoundingBox3D;
  mountingSide: ScanSide;
  heightFromFloor: number; // mm
  distanceFromHingeEdge: number; // mm
  distanceFromLockEdge: number; // mm
  confidence: number;
}

export type HardwareType = 
  | "hinge"
  | "lockset"
  | "deadbolt"
  | "panic-bar"
  | "closer"
  | "kickplate"
  | "viewer"
  | "strike"
  | "astragal"
  | "coordinator"
  | "weatherstrip"
  | "threshold"
  | "conduit"
  | "junction-box"
  | "mag-lock"
  | "card-reader"
  | "electric-strike";

export interface ConduitPath {
  id: string;
  type: "conduit" | "raceway" | "wireway";
  points: Point3D[];
  diameter?: number;
  connected: string[]; // IDs of connected hardware
}

export interface CylinderFitResult {
  axis: Point3D;
  centerPoint: Point3D;
  radius: number;
  length: number;
  inlierCount: number;
  confidence: number;
}

export interface DoorClearances {
  undercut: Dim; // gap at bottom
  hingeGap: Dim;
  lockGap: Dim;
  headGap: Dim;
  adaClearWidth: Dim;
  adaPushSideClear: Dim;
  adaPullSideClear: Dim;
}

export interface AnalysisConfidence {
  overall: number;
  dimensions: number;
  orientation: number;
  hardware: number;
  registration: number;
}

// ============================================================================
// DRAWING GENERATION TYPES
// ============================================================================

export type DrawingType = 
  | "plan-view"
  | "elevation-ingress"
  | "elevation-egress"
  | "section"
  | "isometric-3d"
  | "line-drawing"
  | "wiring-diagram";

export type DrawingFormat = "svg" | "dxf" | "pdf" | "png" | "gltf";

export interface DoorDrawingSet {
  id: string;
  dualScanSessionId: string;
  openingId: string;
  generatedAt: Date;
  drawings: GeneratedDrawing[];
  exportFormats: ExportBundle[];
}

export interface GeneratedDrawing {
  id: string;
  type: DrawingType;
  title: string;
  viewAngle?: number;
  scale: string; // e.g., "1:10", "1/4\" = 1'"
  units: "mm" | "inches";
  svgContent: string;
  dimensions: DrawingDimensions;
  annotations: DrawingAnnotation[];
  hardwareSymbols: HardwareSymbol[];
  layers: DrawingLayer[];
}

export interface DrawingDimensions {
  width: number;
  height: number;
  viewBox: string;
}

export interface DrawingAnnotation {
  id: string;
  type: "dimension" | "label" | "callout" | "note";
  text: string;
  position: Point2D;
  anchorPoints?: Point2D[];
  fontSize: number;
  rotation?: number;
  layer: string;
}

export interface HardwareSymbol {
  id: string;
  hardwareType: HardwareType;
  symbolPath: string; // SVG path data
  position: Point2D;
  rotation: number;
  scale: number;
  label?: string;
  layer: string;
}

export interface DrawingLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  lineWeight: number;
  elements: string[]; // IDs of elements in this layer
}

export interface ExportBundle {
  format: DrawingFormat;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdAt: Date;
}

// ============================================================================
// WIRING DIAGRAM OVERLAY
// ============================================================================

export interface WiringDiagramOverlay {
  id: string;
  drawingId: string;
  circuits: WiringCircuit[];
  connections: WiringConnection[];
  symbols: WiringSymbol[];
  annotations: WiringAnnotation[];
}

export interface WiringCircuit {
  id: string;
  name: string;
  type: "power" | "control" | "communication" | "fire-alarm";
  voltage?: number;
  color: string;
  wireGauge?: string;
  path: Point2D[];
}

export interface WiringConnection {
  id: string;
  circuitId: string;
  fromDevice: string;
  toDevice: string;
  connectionType: "hardwired" | "wireless" | "network";
  terminals?: string[];
}

export interface WiringSymbol {
  id: string;
  deviceType: string;
  symbolPath: string;
  position: Point2D;
  rotation: number;
  label: string;
  specifications?: Record<string, string>;
}

export interface WiringAnnotation {
  id: string;
  type: "wire-label" | "terminal-id" | "voltage" | "note";
  text: string;
  position: Point2D;
}

// ============================================================================
// DOOR CONFIGURATOR PRO EXPORT
// ============================================================================

export interface DoorConfiguratorExport {
  version: string;
  exportedAt: Date;
  opening: OpeningExportData;
  drawings: DrawingExportData[];
  hardware: HardwareExportData[];
  wiringOverlay?: WiringDiagramOverlay;
}

export interface OpeningExportData {
  id: string;
  name: string;
  location: string;
  dimensions: {
    frameWidth: number;
    frameHeight: number;
    frameDepth: number;
    leafWidth: number;
    leafHeight: number;
    leafThickness: number;
  };
  orientation: {
    hingeSide: HingeSide;
    swingDirection: SwingDirection;
    ingressSide: ScanSide;
  };
  clearances: {
    undercut: number;
    adaClearWidth: number;
  };
}

export interface DrawingExportData {
  type: DrawingType;
  format: DrawingFormat;
  scale: string;
  fileContent: string; // base64 or URL
}

export interface HardwareExportData {
  id: string;
  type: HardwareType;
  mountingSide: ScanSide;
  position: {
    heightFromFloor: number;
    distanceFromHingeEdge: number;
    distanceFromLockEdge: number;
  };
  manufacturer?: string;
  model?: string;
  sku?: string;
}

// ============================================================================
// PROTOCOL STEP DEFINITIONS
// ============================================================================

export interface DualScanProtocolStep {
  id: string;
  order: number;
  name: string;
  description: string;
  instruction: string;
  doorState: DoorState;
  requiredCaptures: string[];
  validationRules: ValidationRule[];
  tips: string[];
  warningConditions: string[];
}

export interface ValidationRule {
  id: string;
  type: "coverage" | "quality" | "alignment" | "hardware-visible";
  threshold: number;
  errorMessage: string;
}

export const DUAL_SCAN_PROTOCOL_STEPS: DualScanProtocolStep[] = [
  {
    id: "prepare",
    order: 1,
    name: "Preparation",
    description: "Prepare the door opening for scanning",
    instruction: "Ensure the area is well-lit and clear of obstructions. Position yourself 4-6 feet from the door.",
    doorState: "closed",
    requiredCaptures: [],
    validationRules: [],
    tips: [
      "Remove any temporary items blocking the door",
      "Turn on all available lights",
      "Note any hardware that may be obscured"
    ],
    warningConditions: ["Low light conditions may affect scan quality"]
  },
  {
    id: "closed-front",
    order: 2,
    name: "Closed Door - Front View",
    description: "Capture the door in closed position from the ingress side",
    instruction: "Stand facing the door from the side people enter. Ensure the entire frame and door are visible.",
    doorState: "closed",
    requiredCaptures: ["frame-full", "hardware-visible"],
    validationRules: [
      { id: "coverage-80", type: "coverage", threshold: 80, errorMessage: "Insufficient coverage - scan more of the frame" },
      { id: "quality-0.7", type: "quality", threshold: 0.7, errorMessage: "Low scan quality - move closer or improve lighting" }
    ],
    tips: [
      "Capture the full frame including head, jambs, and sill",
      "Ensure all visible hardware is captured",
      "Mark or note the hinge side"
    ],
    warningConditions: ["Hardware may be obscured on the back side"]
  },
  {
    id: "closed-back",
    order: 3,
    name: "Closed Door - Back View",
    description: "Capture the door in closed position from the egress side",
    instruction: "Move to the opposite side of the door (egress side). Capture the frame and door from this angle.",
    doorState: "closed",
    requiredCaptures: ["frame-reverse", "hardware-egress"],
    validationRules: [
      { id: "coverage-80", type: "coverage", threshold: 80, errorMessage: "Insufficient coverage from egress side" }
    ],
    tips: [
      "Note any differences in hardware placement",
      "Capture panic bar or push plate if present",
      "Ensure frame reveals are visible"
    ],
    warningConditions: []
  },
  {
    id: "open-90",
    order: 4,
    name: "Open Door - 90 Degrees",
    description: "Open the door to approximately 90 degrees and capture",
    instruction: "Open the door to a 90-degree angle. Scan to capture the door leaf thickness and swing clearance.",
    doorState: "open",
    requiredCaptures: ["door-leaf", "swing-arc", "hinges-visible"],
    validationRules: [
      { id: "alignment", type: "alignment", threshold: 0.85, errorMessage: "Scans not properly aligned - ensure same reference points visible" },
      { id: "hinge-visible", type: "hardware-visible", threshold: 1, errorMessage: "Hinges must be visible in open door scan" }
    ],
    tips: [
      "The door leaf edge and thickness should be clearly visible",
      "Capture the hinge knuckles",
      "Note the swing direction relative to hinges"
    ],
    warningConditions: ["Door may move during scan - secure if possible"]
  },
  {
    id: "hardware-detail",
    order: 5,
    name: "Hardware Details",
    description: "Capture close-up scans of hardware positions",
    instruction: "Capture detailed scans of lock, closer, hinges, and any electronic hardware for wiring diagram generation.",
    doorState: "open",
    requiredCaptures: ["lock-detail", "closer-detail", "conduit-paths"],
    validationRules: [],
    tips: [
      "Capture any visible conduit or wire paths",
      "Note junction box locations",
      "Record hardware model numbers if visible"
    ],
    warningConditions: []
  },
  {
    id: "verification",
    order: 6,
    name: "Verification",
    description: "Review and verify scan quality",
    instruction: "Review the captured scans. Verify coverage, quality, and that all required elements are visible.",
    doorState: "closed",
    requiredCaptures: [],
    validationRules: [
      { id: "final-coverage", type: "coverage", threshold: 90, errorMessage: "Final coverage below threshold" },
      { id: "final-quality", type: "quality", threshold: 0.8, errorMessage: "Final quality below threshold" }
    ],
    tips: [
      "Check that both sides of the door are captured",
      "Verify swing direction can be determined",
      "Confirm hardware positions are clear"
    ],
    warningConditions: []
  }
];
