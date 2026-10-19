export interface CalibrationMarkerDetection {
  markerId: string;
  detectedPosition: { x: number; y: number; z: number };
  expectedPosition: { x: number; y: number; z: number };
  confidence: number;
}

export interface CalibrationCorrectionFactors {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotationDeg: number;
  translationMM: { x: number; y: number; z: number };
  rmsErrorMM: number;
}

export interface CalibrationInput {
  markerDetections: CalibrationMarkerDetection[];
  correctionFactors?: CalibrationCorrectionFactors;
  profileId: string;
}

export interface CalibrationProfile {
  markerType: string;
  markerSizeMM: number;
  expectedGeometry: { topWidth: number; leftHeight: number; [key: string]: number };
  toleranceMM: number;
}

export interface CalibrationResult {
  status: "calibrated" | "partial" | "failed";
  qualityScore: number;
  correctedMetrics: {
    width: number;
    height: number;
    frameDepth: number;
  };
  errorMM: number;
  markersDetected: number;
  markersExpected: number;
  details: string;
}

export interface ProcessedMetricsInput {
  width: number;
  height: number;
  frameDepth: number;
  swingDirection: "left-hand" | "right-hand" | "left-hand-reverse" | "right-hand-reverse" | "unknown";
  pointCount: number;
  units: string;
}

export interface ConfidenceScoresInput {
  overall: number;
  width: number;
  height: number;
  frameDepth: number;
  swingDirection: number;
  pointDensity: number;
}

export interface ManufacturerMatch {
  manufacturer: string;
  series: string;
  model: string;
  size: string;
  type: string;
  grade: string;
  fireRated: boolean;
  confidence: number;
  specifications: Record<string, string>;
}

export interface HardwarePlacement {
  type: string;
  label: string;
  heightFromFloorMM: number;
  heightFromFloorInches: string;
  distanceFromEdgeMM: number;
  distanceFromEdgeInches: string;
  confidence: number;
  source: "measured" | "standard" | "estimated";
  notes: string;
  identifiedType?: string;
  identifiedSize?: string;
  manufacturerMatches?: ManufacturerMatch[];
}

export type HingeWeightClass = "Standard Weight" | "Heavy Weight" | "Extra Heavy Weight";
export type HingeCornerType = "Square" | "5/8\" Radius" | "Rounded";
export type DoorHanding = "Left Hand" | "Right Hand" | "Left Hand Reverse" | "Right Hand Reverse" | "Unknown";
export type HingeMountType = "Full Mortise" | "Half Mortise" | "Full Surface" | "Half Surface" | "Swing Clear" | "Swaged" | "Cam Lift" | "Spring" | "Olive Knuckle" | "Pivot" | "Center Hung" | "Center Pivot" | "Pocket Pivot" | "Architectural Design" | "Invisible" | "Continuous Geared" | "Full Continuous";
export type HingeSecurityFeature = "NRP" | "Security Stud" | "Hospital Tip" | "Safety Stud";

export interface HingeDetailedAnalysis {
  estimatedSize: string;
  estimatedSizeMM: { width: number; height: number };
  estimatedWeight: string;
  doorWeightClass: string;
  hingeWeightClass: HingeWeightClass;
  hingeType: string;
  hingeMountType: HingeMountType;
  hingeMountTypeReason: string;
  isSwaged: boolean;
  swageReason: string;
  bearingType: string;
  recommendedGrade: string;
  fireRatingRequired: boolean;
  count: number;
  countReason: string;
  cornerType: HingeCornerType;
  cornerTypeReason: string;
  handing: DoorHanding;
  handingConfidence: number;
  securityFeatures: HingeSecurityFeature[];
  securityNotes: string;
  electrifiedOption: boolean;
  electrifiedNotes: string;
  hingeClearance: {
    hingeGapMM: number;
    hingeGapInches: string;
    withinSpec: boolean;
    specRangeMM: { min: number; max: number };
    status: "pass" | "marginal" | "fail";
  } | null;
  placements: Array<{
    label: string;
    positionIndex: number;
    heightFromFloorMM: number;
    heightFromFloorInches: string;
    heightFromTopMM: number;
    heightFromTopInches: string;
    distanceFromEdgeMM: number;
    distanceFromEdgeInches: string;
    spacingToNextMM: number | null;
    spacingToNextInches: string | null;
  }>;
  knuckleDimensions: { knuckleLengthMM: number; knuckleDiameterMM: number; leafWidthMM: number };
}

export type ExitDeviceType = "Rim" | "Mortise" | "Surface Vertical Rod" | "Concealed Vertical Rod";
export type ElectricStrikeType = "Standard" | "High Security" | "Fire Rated";
export type MagLockType = "Surface Mount" | "Shear Lock" | "Concealed";
export type AccessControlDeviceType = "Card Reader" | "Keypad" | "Biometric" | "DPS" | "REX" | "Power Supply" | "Electrified Trim" | "Controller";

export interface LockingHardwareAnalysis {
  lockType: "Cylindrical" | "Mortise" | "Exit Device" | "Electrified";
  lockTypeReason: string;
  exitDevice: {
    recommended: boolean;
    type: ExitDeviceType;
    reason: string;
    widthRequirementMet: boolean;
  } | null;
  electricStrike: {
    recommended: boolean;
    type: ElectricStrikeType;
    failMode: "Fail Safe" | "Fail Secure";
    reason: string;
  } | null;
  magneticLock: {
    recommended: boolean;
    type: MagLockType;
    holdingForceLbs: number;
    reason: string;
  } | null;
  electrifiedTrim: {
    recommended: boolean;
    trimType: string;
    reason: string;
  } | null;
}

export interface AccessControlAnalysis {
  recommended: boolean;
  reason: string;
  components: {
    deviceType: AccessControlDeviceType;
    location: string;
    required: boolean;
    notes: string;
  }[];
  powerRequirements: {
    voltage: string;
    current: string;
    backupRequired: boolean;
  };
  wiringNotes: string[];
}

export interface HardwareIdentificationResult {
  placements: HardwarePlacement[];
  hingeAnalysis: HingeDetailedAnalysis;
  locksetAnalysis: {
    estimatedFunction: string;
    estimatedBackset: string;
    estimatedBacksetMM: number;
    boreSize: string;
    boreSizeMM: number;
    faceplateSizeMM: { width: number; height: number };
  };
  closerAnalysis: {
    estimatedSize: string;
    estimatedENSize: number;
    mountType: string;
    recommendedCloserSize: number;
  };
  lockingHardwareAnalysis: LockingHardwareAnalysis;
  accessControlAnalysis: AccessControlAnalysis;
  manufacturerMatches: ManufacturerMatch[];
  summary: {
    totalIdentified: number;
    highConfidenceMatches: number;
    matchedManufacturers: string[];
  };
}

export type FrameMaterialType = "Hollow Metal" | "Aluminum" | "Wood" | "FRP" | "Stainless Steel" | "Bronze" | "Unknown";
export type DoorMaterialType = "Hollow Metal" | "Solid Core Wood" | "FRP" | "Aluminum/Glass" | "Stainless Steel" | "Mineral Core" | "Unknown";
export type InstallationMethodType = "Welded" | "Knock-Down" | "Drywall Slip-On" | "Masonry" | "Press-Fit" | "Unknown";
export type FrameProfileType = "Single Rabbet" | "Double Rabbet" | "Cased Opening" | "Double Egress" | "Drywall" | "Unknown";
export type StopType = "Integral" | "Applied" | "Removable" | "None";
export type VisionKitType = "Full Lite" | "Half Lite" | "Narrow Lite" | "Sidelite" | "Transom" | "Custom";
export type LouverType = "Inverted Y-Blade" | "V-Blade" | "Drainable" | "Sight-Proof" | "Fusible Link Fire" | "Standard";
export type MouldingProfileType = "Casing" | "Backband" | "Stop Bead" | "Glazing Bead" | "Threshold" | "Astragal" | "None";
export type WeatherstripType = "Compression Seal" | "Magnetic" | "Brush" | "Fin" | "Bulb" | "Smoke Seal" | "None";
export type ConditionRating = "Good" | "Fair" | "Poor" | "Replace";
export type UpgradePriority = "Critical" | "High" | "Medium" | "Low";

export const CONFIDENCE_THRESHOLD = 0.5;

export interface MaterialIdentification {
  frameMaterial: {
    type: FrameMaterialType;
    confidence: number;
    evidence: string[];
    gauge?: string;
    finish?: string;
    manualInputRequired: boolean;
  };
  doorMaterial: {
    type: DoorMaterialType;
    confidence: number;
    evidence: string[];
    thickness?: string;
    core?: string;
    manualInputRequired: boolean;
  };
  installationMethod: {
    type: InstallationMethodType;
    confidence: number;
    evidence: string[];
    manualInputRequired: boolean;
  };
  veneerFinish: {
    detected: boolean;
    type: string;
    material: string;
    confidence: number;
    manualInputRequired: boolean;
  };
  color: {
    detected: boolean;
    value: string;
    finish: string;
    confidence: number;
    manualInputRequired: boolean;
  };
}

export interface AccessoryItem {
  type: string;
  subType: string;
  size: { widthMM: number; heightMM: number } | null;
  sizeDescription: string;
  location: string;
  fireRated: boolean;
  glazingType?: string;
  confidence: number;
  notes: string;
  manualInputRequired: boolean;
}

export interface AccessoryDetection {
  visionKits: AccessoryItem[];
  louvers: AccessoryItem[];
  mouldingProfiles: AccessoryItem[];
  weatherstripping: AccessoryItem[];
  smokeSeal: { required: boolean; type: string; reason: string; manualInputRequired: boolean };
  thresholdType: { type: string; reason: string; adaCompliant: boolean; manualInputRequired: boolean };
  manualInputRequired: boolean;
}

export interface EnhancedRevealDetails {
  frameProfile: {
    type: FrameProfileType;
    throatDepthMM: number;
    throatDepthInches: string;
    rabbetDepthMM: number;
    rabbetDepthInches: string;
    reason: string;
    manualInputRequired: boolean;
  };
  stopType: {
    type: StopType;
    reason: string;
    removable: boolean;
    manualInputRequired: boolean;
  };
  glazingBead: {
    required: boolean;
    type: string;
    reason: string;
  };
  perimeterSeal: {
    type: string;
    required: boolean;
    reason: string;
  };
  manualInputRequired: boolean;
}

export interface ComplianceGap {
  code: string;
  section: string;
  requirement: string;
  currentStatus: string;
  severity: UpgradePriority;
  recommendation: string;
}

export interface UpgradeRecommendation {
  component: string;
  currentCondition: ConditionRating;
  issue: string;
  recommendation: string;
  priority: UpgradePriority;
  estimatedImpact: string;
  codeReference?: string;
}

export interface ConditionAssessment {
  frameCondition: { rating: ConditionRating; notes: string[]; manualInputRequired: boolean };
  doorCondition: { rating: ConditionRating; notes: string[]; manualInputRequired: boolean };
  hardwareCondition: { rating: ConditionRating; notes: string[]; manualInputRequired: boolean };
  overallRating: ConditionRating;
  complianceGaps: ComplianceGap[];
  recommendedUpgrades: UpgradeRecommendation[];
  manualInputRequired: boolean;
}

export interface OpeningAnalysisResult {
  hardwareIdentification: HardwareIdentificationResult;
  materialIdentification: MaterialIdentification;
  accessoryDetection: AccessoryDetection;
  enhancedRevealDetails: EnhancedRevealDetails;
  conditionAssessment: ConditionAssessment;
}

export interface HardwareMeasurementResult {
  hinges: HardwarePlacement[];
  strike: HardwarePlacement | null;
  lockset: HardwarePlacement | null;
  closer: HardwarePlacement | null;
  kickplate: HardwarePlacement | null;
  summary: {
    totalDetected: number;
    hingeCount: number;
    hingeSpacingMM: number;
    strikeHeightMM: number;
    locksetHeightMM: number;
  };
}

export interface RevealMeasurement {
  valueMM: number;
  valueInches: string;
  tolerance: string;
}

export interface GapMeasurement {
  valueMM: number;
  valueInches: string;
  withinSpec: boolean;
}

export interface ToleranceFinding {
  field: string;
  valueMM: number;
  specMM: number;
  status: "pass" | "marginal" | "fail";
}

export interface RevealGapResult {
  reveals: {
    left: RevealMeasurement;
    right: RevealMeasurement;
    top: RevealMeasurement;
  };
  gaps: {
    hingeGap: GapMeasurement;
    lockGap: GapMeasurement;
    headGap: GapMeasurement;
    undercut: GapMeasurement;
  };
  tolerances: {
    overallWithinSpec: boolean;
    maxDeviationMM: number;
    findings: ToleranceFinding[];
  };
  doorLeafDimensions: {
    widthMM: number;
    heightMM: number;
    thicknessMM: number;
  };
  confidence: number;
}

export function mmToFractionalInches(mm: number): string {
  const totalInches = mm / 25.4;
  const wholeInches = Math.floor(totalInches);
  const remainder = totalInches - wholeInches;

  const sixteenths = Math.round(remainder * 16);

  if (sixteenths === 0) {
    return `${wholeInches}"`;
  }

  if (sixteenths === 16) {
    return `${wholeInches + 1}"`;
  }

  let numerator = sixteenths;
  let denominator = 16;

  while (numerator % 2 === 0 && denominator > 1) {
    numerator /= 2;
    denominator /= 2;
  }

  if (wholeInches === 0) {
    return `${numerator}/${denominator}"`;
  }

  return `${wholeInches}-${numerator}/${denominator}"`;
}

export function applyCalibrationCorrection(
  metrics: ProcessedMetricsInput,
  calibrationData: CalibrationInput,
  profile: CalibrationProfile
): CalibrationResult {
  const markersDetected = calibrationData.markerDetections.length;
  const markersExpected = Object.keys(profile.expectedGeometry).length;

  let correctedWidth = metrics.width;
  let correctedHeight = metrics.height;
  let correctedFrameDepth = metrics.frameDepth;

  if (calibrationData.correctionFactors) {
    const factors = calibrationData.correctionFactors;
    correctedWidth = metrics.width * factors.scaleX;
    correctedHeight = metrics.height * factors.scaleY;
    correctedFrameDepth = metrics.frameDepth * factors.scaleZ;
  } else if (markersDetected >= 2) {
    let totalDetectedDist = 0;
    let totalExpectedDist = 0;
    let pairCount = 0;

    for (let i = 0; i < markersDetected; i++) {
      for (let j = i + 1; j < markersDetected; j++) {
        const dA = calibrationData.markerDetections[i];
        const dB = calibrationData.markerDetections[j];

        const detDist = Math.sqrt(
          Math.pow(dA.detectedPosition.x - dB.detectedPosition.x, 2) +
          Math.pow(dA.detectedPosition.y - dB.detectedPosition.y, 2) +
          Math.pow(dA.detectedPosition.z - dB.detectedPosition.z, 2)
        );

        const expDist = Math.sqrt(
          Math.pow(dA.expectedPosition.x - dB.expectedPosition.x, 2) +
          Math.pow(dA.expectedPosition.y - dB.expectedPosition.y, 2) +
          Math.pow(dA.expectedPosition.z - dB.expectedPosition.z, 2)
        );

        if (expDist > 0) {
          totalDetectedDist += detDist;
          totalExpectedDist += expDist;
          pairCount++;
        }
      }
    }

    if (pairCount > 0 && totalDetectedDist > 0) {
      const scaleFactor = totalExpectedDist / totalDetectedDist;
      correctedWidth = metrics.width * scaleFactor;
      correctedHeight = metrics.height * scaleFactor;
      correctedFrameDepth = metrics.frameDepth * scaleFactor;
    }
  }

  let sumSquaredError = 0;
  let errorCount = 0;

  if (profile.expectedGeometry.topWidth > 0) {
    const widthError = correctedWidth - profile.expectedGeometry.topWidth;
    sumSquaredError += widthError * widthError;
    errorCount++;
  }

  if (profile.expectedGeometry.leftHeight > 0) {
    const heightError = correctedHeight - profile.expectedGeometry.leftHeight;
    sumSquaredError += heightError * heightError;
    errorCount++;
  }

  for (const key of Object.keys(profile.expectedGeometry)) {
    if (key === "topWidth" || key === "leftHeight") continue;
    const expectedVal = profile.expectedGeometry[key];
    if (expectedVal > 0) {
      const diff = correctedFrameDepth - expectedVal;
      sumSquaredError += diff * diff;
      errorCount++;
    }
  }

  const rmsError = errorCount > 0 ? Math.sqrt(sumSquaredError / errorCount) : 0;

  const qualityScore = Math.max(0, Math.min(1, 1 - (rmsError / profile.toleranceMM)));

  let status: "calibrated" | "partial" | "failed";
  if (qualityScore >= 0.85) {
    status = "calibrated";
  } else if (qualityScore >= 0.5) {
    status = "partial";
  } else {
    status = "failed";
  }

  let details: string;
  if (status === "calibrated") {
    details = `Calibration successful with ${markersDetected} markers. RMS error: ${rmsError.toFixed(2)}mm`;
  } else if (status === "partial") {
    details = `Partial calibration with ${markersDetected} markers. RMS error: ${rmsError.toFixed(2)}mm exceeds ideal threshold`;
  } else {
    details = `Calibration failed. RMS error: ${rmsError.toFixed(2)}mm exceeds tolerance of ${profile.toleranceMM}mm`;
  }

  return {
    status,
    qualityScore,
    correctedMetrics: {
      width: Math.round(correctedWidth * 100) / 100,
      height: Math.round(correctedHeight * 100) / 100,
      frameDepth: Math.round(correctedFrameDepth * 100) / 100,
    },
    errorMM: Math.round(rmsError * 100) / 100,
    markersDetected,
    markersExpected,
    details,
  };
}

function determineHingeCount(doorHeightMM: number, doorWeightLbs: number): { count: number; reason: string } {
  const doorHeightInches = doorHeightMM / 25.4;
  if (doorHeightInches <= 60 && doorWeightLbs <= 100) {
    return { count: 2, reason: "Door ≤60\" tall and ≤100 lbs — 2 hinges per ANSI/BHMA A156.1" };
  }
  if (doorHeightInches > 90 || doorWeightLbs > 400) {
    return { count: 4, reason: `Door ${doorHeightInches > 90 ? '>' + '90" tall' : ''}${doorHeightInches > 90 && doorWeightLbs > 400 ? ' and ' : ''}${doorWeightLbs > 400 ? '>' + '400 lbs' : ''} — 4 hinges per ANSI/BHMA A156.1` };
  }
  return { count: 3, reason: "Standard commercial door — 3 hinges per ANSI/BHMA A156.1" };
}

function determineHingeWeightClass(doorWeightLbs: number, doorWidthMM: number): HingeWeightClass {
  const doorWidthInches = doorWidthMM / 25.4;
  if (doorWeightLbs > 400 || doorWidthInches > 48) return "Extra Heavy Weight";
  if (doorWeightLbs > 200 || doorWidthInches > 36) return "Heavy Weight";
  return "Standard Weight";
}

function determineCornerType(fireRated: boolean, doorApplication: string): { type: HingeCornerType; reason: string } {
  if (fireRated) {
    return { type: "Square", reason: "Square corners required for fire-rated openings per NFPA 80" };
  }
  return { type: "5/8\" Radius", reason: "5/8\" radius corners — standard for commercial non-fire-rated openings" };
}

function determineDoorHanding(swingDirection: string, swingConfidence: number): { handing: DoorHanding; confidence: number } {
  const handingMap: Record<string, DoorHanding> = {
    "left-hand": "Left Hand",
    "right-hand": "Right Hand",
    "left-hand-reverse": "Left Hand Reverse",
    "right-hand-reverse": "Right Hand Reverse",
  };
  const handing = handingMap[swingDirection] || "Unknown";
  return { handing, confidence: handing === "Unknown" ? 0 : swingConfidence };
}

function determineSecurityFeatures(fireRated: boolean, doorWeightLbs: number, isExterior: boolean): { features: HingeSecurityFeature[]; notes: string } {
  const features: HingeSecurityFeature[] = [];
  const notes: string[] = [];

  if (fireRated) {
    features.push("NRP");
    notes.push("NRP (Non-Removable Pin) required for fire-rated openings per NFPA 80");
  }
  if (isExterior || doorWeightLbs > 300) {
    if (!features.includes("NRP")) {
      features.push("NRP");
      notes.push("NRP recommended for exterior/high-traffic openings");
    }
    features.push("Security Stud");
    notes.push("Security studs recommended for tamper resistance");
  }

  return { features, notes: notes.join(". ") || "No special security features required" };
}

function determineElectrifiedOption(isAccessControlled: boolean, doorHeightMM: number): { electrified: boolean; notes: string } {
  if (isAccessControlled) {
    return { electrified: true, notes: "ETW (Electric Through-Wire) hinges recommended for access control wiring — concealed wire path through hinge knuckle" };
  }
  return { electrified: false, notes: "No electrified hinge required — standard hinge sufficient" };
}

function computeHingePlacements(doorHeightMM: number, hingeCount: number, hingeBacksetMM: number): Array<{
  label: string;
  positionIndex: number;
  heightFromFloorMM: number;
  heightFromFloorInches: string;
  heightFromTopMM: number;
  heightFromTopInches: string;
  distanceFromEdgeMM: number;
  distanceFromEdgeInches: string;
  spacingToNextMM: number | null;
  spacingToNextInches: string | null;
}> {
  const topOffset = 178;
  const bottomOffset = 254;
  const topHingeFromFloor = doorHeightMM - topOffset;
  const bottomHingeFromFloor = bottomOffset;

  const positions: number[] = [];
  positions.push(topHingeFromFloor);

  if (hingeCount >= 3) {
    if (hingeCount === 3) {
      positions.push((topHingeFromFloor + bottomHingeFromFloor) / 2);
    } else {
      const spacing = (topHingeFromFloor - bottomHingeFromFloor) / (hingeCount - 1);
      for (let i = 1; i < hingeCount - 1; i++) {
        positions.push(topHingeFromFloor - spacing * i);
      }
    }
  }
  positions.push(bottomHingeFromFloor);

  positions.sort((a, b) => b - a);

  const labels = ["Top Hinge"];
  if (hingeCount === 2) {
    labels.push("Bottom Hinge");
  } else if (hingeCount === 3) {
    labels.push("Middle Hinge", "Bottom Hinge");
  } else {
    for (let i = 1; i < hingeCount - 1; i++) {
      labels.push(`Intermediate Hinge ${i}`);
    }
    labels.push("Bottom Hinge");
  }

  return positions.map((heightFromFloor, idx) => ({
    label: labels[idx],
    positionIndex: idx + 1,
    heightFromFloorMM: Math.round(heightFromFloor),
    heightFromFloorInches: mmToFractionalInches(heightFromFloor),
    heightFromTopMM: Math.round(doorHeightMM - heightFromFloor),
    heightFromTopInches: mmToFractionalInches(doorHeightMM - heightFromFloor),
    distanceFromEdgeMM: hingeBacksetMM,
    distanceFromEdgeInches: mmToFractionalInches(hingeBacksetMM),
    spacingToNextMM: idx < positions.length - 1 ? Math.round(heightFromFloor - positions[idx + 1]) : null,
    spacingToNextInches: idx < positions.length - 1 ? mmToFractionalInches(heightFromFloor - positions[idx + 1]) : null,
  }));
}

function getKnuckleDimensions(hingeSizeMM: { width: number; height: number }): { knuckleLengthMM: number; knuckleDiameterMM: number; leafWidthMM: number } {
  if (hingeSizeMM.width >= 127) {
    return { knuckleLengthMM: 127, knuckleDiameterMM: 16.7, leafWidthMM: 55.2 };
  }
  if (hingeSizeMM.width >= 114) {
    return { knuckleLengthMM: 114, knuckleDiameterMM: 14.3, leafWidthMM: 50 };
  }
  if (hingeSizeMM.width >= 102) {
    return { knuckleLengthMM: 102, knuckleDiameterMM: 12.7, leafWidthMM: 44.5 };
  }
  return { knuckleLengthMM: 89, knuckleDiameterMM: 11.1, leafWidthMM: 39 };
}

export function detectHardwarePlacements(
  metrics: ProcessedMetricsInput,
  confidenceScores: ConfidenceScoresInput
): HardwareMeasurementResult {
  const doorHeight = metrics.height;
  const doorWidth = metrics.width;
  const highConfidence = confidenceScores.overall > 0.85;
  const baseConfidence = highConfidence ? 0.8 : 0.7;

  const doorWeight = estimateDoorWeight(doorWidth, doorHeight, metrics.frameDepth);
  const { count: hingeCount } = determineHingeCount(doorHeight, doorWeight.weightLbs);

  const topOffset = 178;
  const bottomOffset = 254;
  const topHingeFromFloor = doorHeight - topOffset;
  const bottomHingeFromFloor = bottomOffset;
  const hingeBackset = 143;

  const hingePositions: number[] = [topHingeFromFloor];
  if (hingeCount >= 3) {
    if (hingeCount === 3) {
      hingePositions.push((topHingeFromFloor + bottomHingeFromFloor) / 2);
    } else {
      const spacing = (topHingeFromFloor - bottomHingeFromFloor) / (hingeCount - 1);
      for (let i = 1; i < hingeCount - 1; i++) {
        hingePositions.push(topHingeFromFloor - spacing * i);
      }
    }
  }
  hingePositions.push(bottomHingeFromFloor);
  hingePositions.sort((a, b) => b - a);

  const hingeLabels = hingeCount === 2
    ? ["Top Hinge", "Bottom Hinge"]
    : hingeCount === 3
      ? ["Top Hinge", "Middle Hinge", "Bottom Hinge"]
      : ["Top Hinge", ...Array.from({ length: hingeCount - 2 }, (_, i) => `Intermediate Hinge ${i + 1}`), "Bottom Hinge"];

  const hinges: HardwarePlacement[] = hingePositions.map((pos, idx) => ({
    type: "hinge",
    label: hingeLabels[idx],
    heightFromFloorMM: Math.round(pos),
    heightFromFloorInches: mmToFractionalInches(pos),
    distanceFromEdgeMM: hingeBackset,
    distanceFromEdgeInches: mmToFractionalInches(hingeBackset),
    confidence: baseConfidence,
    source: "standard" as const,
    notes: idx === 0 ? "Standard commercial placement, 7\" from top of door"
      : idx === hingePositions.length - 1 ? "Standard commercial placement, 10\" from bottom of door"
      : hingeCount === 3 ? "Centered between top and bottom hinges"
      : `Evenly spaced intermediate hinge (position ${idx + 1} of ${hingeCount})`,
  }));

  const strikeHeightMM = 965;
  const strikeBackset = 70;

  const strike: HardwarePlacement = {
    type: "strike",
    label: "Strike Plate",
    heightFromFloorMM: strikeHeightMM,
    heightFromFloorInches: mmToFractionalInches(strikeHeightMM),
    distanceFromEdgeMM: strikeBackset,
    distanceFromEdgeInches: mmToFractionalInches(strikeBackset),
    confidence: baseConfidence,
    source: "standard",
    notes: "Centered at lockset height, ADA compliant 38\" from floor",
  };

  const locksetHeightMM = 965;

  const lockset: HardwarePlacement = {
    type: "lockset",
    label: "Lockset",
    heightFromFloorMM: locksetHeightMM,
    heightFromFloorInches: mmToFractionalInches(locksetHeightMM),
    distanceFromEdgeMM: strikeBackset,
    distanceFromEdgeInches: mmToFractionalInches(strikeBackset),
    confidence: baseConfidence,
    source: "standard",
    notes: "Standard ADA height, 38\" from floor",
  };

  const closerHeightFromFloor = doorHeight - 51;
  const closerBackset = 38;

  const closer: HardwarePlacement = {
    type: "closer",
    label: "Door Closer",
    heightFromFloorMM: closerHeightFromFloor,
    heightFromFloorInches: mmToFractionalInches(closerHeightFromFloor),
    distanceFromEdgeMM: closerBackset,
    distanceFromEdgeInches: mmToFractionalInches(closerBackset),
    confidence: baseConfidence,
    source: "standard",
    notes: "2\" from top on push side, 1-1/2\" from hinge edge",
  };

  const kickplateHeight = 102;
  const kickplateInset = 25;
  const kickplateWidth = doorWidth - (kickplateInset * 2);

  const kickplate: HardwarePlacement = {
    type: "kickplate",
    label: "Kickplate",
    heightFromFloorMM: kickplateHeight,
    heightFromFloorInches: mmToFractionalInches(kickplateHeight),
    distanceFromEdgeMM: kickplateInset,
    distanceFromEdgeInches: mmToFractionalInches(kickplateInset),
    confidence: baseConfidence,
    source: "standard",
    notes: `4\" from bottom, width ${Math.round(kickplateWidth)}mm (door width minus 1\" each side)`,
  };

  const hingeSpacingMM = topHingeFromFloor - bottomHingeFromFloor;

  return {
    hinges,
    strike,
    lockset,
    closer,
    kickplate,
    summary: {
      totalDetected: 7,
      hingeCount: 3,
      hingeSpacingMM: Math.round(hingeSpacingMM),
      strikeHeightMM,
      locksetHeightMM,
    },
  };
}

interface HingeReferenceSpec {
  manufacturer: string;
  series: string;
  model: string;
  sizeInches: string;
  sizeMM: { width: number; height: number };
  type: string;
  weightClass: HingeWeightClass;
  grade: string;
  bearingType: string;
  cornerType: HingeCornerType;
  fireRated: boolean;
  maxDoorWeightLbs: number;
  maxDoorWidthInches: number;
  nrp: boolean;
  electrified: boolean;
  securityStuds: boolean;
  specifications: Record<string, string>;
}

interface LocksetReferenceSpec {
  manufacturer: string;
  series: string;
  model: string;
  function: string;
  backsetMM: number;
  boreSizeMM: number;
  grade: string;
  fireRated: boolean;
  specifications: Record<string, string>;
}

interface CloserReferenceSpec {
  manufacturer: string;
  series: string;
  model: string;
  enSize: number;
  maxDoorWidthInches: number;
  maxDoorWeightLbs: number;
  mountType: string;
  fireRated: boolean;
  specifications: Record<string, string>;
}

const HINGE_REFERENCE_DATABASE: HingeReferenceSpec[] = [
  // Full Mortise — Standard Weight
  { manufacturer: "Hager", series: "1200", model: "1279", sizeInches: "4\" x 4\"", sizeMM: { width: 102, height: 102 }, type: "Full Mortise", weightClass: "Standard Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 300, maxDoorWidthInches: 42, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "Standard" } },
  { manufacturer: "McKinney", series: "TA2314", model: "TA2314", sizeInches: "4\" x 4\"", sizeMM: { width: 102, height: 102 }, type: "Full Mortise", weightClass: "Standard Weight", grade: "2", bearingType: "Plain Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 200, maxDoorWidthInches: 36, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Standard" } },
  { manufacturer: "Hager", series: "BB1279", model: "BB1279", sizeInches: "3-1/2\" x 3-1/2\"", sizeMM: { width: 89, height: 89 }, type: "Full Mortise", weightClass: "Standard Weight", grade: "2", bearingType: "Ball Bearing", cornerType: "5/8\" Radius", fireRated: false, maxDoorWeightLbs: 180, maxDoorWidthInches: 36, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "Standard" } },
  { manufacturer: "Stanley", series: "FBB168", model: "FBB168", sizeInches: "3-1/2\" x 3-1/2\"", sizeMM: { width: 89, height: 89 }, type: "Full Mortise", weightClass: "Standard Weight", grade: "2", bearingType: "Ball Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 180, maxDoorWidthInches: 36, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Standard" } },

  // Full Mortise — Heavy Weight
  { manufacturer: "Hager", series: "1100", model: "1191", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "NRP" } },
  { manufacturer: "Hager", series: "1100", model: "1168", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "5/8\" Radius", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "NRP" } },
  { manufacturer: "McKinney", series: "TA2714", model: "TA2714", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP" } },
  { manufacturer: "McKinney", series: "T4A3786", model: "T4A3786", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 450, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: true, specifications: { material: "Stainless Steel", finish: "652", screws: "NRP" } },
  { manufacturer: "Ives", series: "5BB1", model: "5BB1", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP" } },
  { manufacturer: "Stanley", series: "FBB179", model: "FBB179", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP" } },

  // Full Mortise — Extra Heavy Weight
  { manufacturer: "Ives", series: "5BB1HW", model: "5BB1HW", sizeInches: "5\" x 5\"", sizeMM: { width: 127, height: 127 }, type: "Full Mortise", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 60, nrp: true, electrified: false, securityStuds: true, specifications: { material: "Steel", finish: "652", screws: "NRP" } },
  { manufacturer: "Stanley", series: "FBB191", model: "FBB191", sizeInches: "5\" x 5\"", sizeMM: { width: 127, height: 127 }, type: "Full Mortise", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 60, nrp: true, electrified: false, securityStuds: true, specifications: { material: "Steel", finish: "652", screws: "NRP" } },
  { manufacturer: "McKinney", series: "T4A3386", model: "T4A3386", sizeInches: "5\" x 5\"", sizeMM: { width: 127, height: 127 }, type: "Full Mortise", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 60, nrp: true, electrified: false, securityStuds: true, specifications: { material: "Stainless Steel", finish: "652", screws: "NRP" } },
  { manufacturer: "Hager", series: "BB1191", model: "BB1191", sizeInches: "5\" x 5\"", sizeMM: { width: 127, height: 127 }, type: "Full Mortise", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 60, nrp: true, electrified: false, securityStuds: true, specifications: { material: "Steel", finish: "US26D", screws: "NRP" } },

  // Half Mortise
  { manufacturer: "Hager", series: "1250", model: "1250", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Half Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "NRP", mount: "One leaf surface-applied" } },
  { manufacturer: "McKinney", series: "T4A3395", model: "T4A3395", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Half Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", mount: "One leaf surface-applied" } },

  // Full Surface
  { manufacturer: "Hager", series: "1160", model: "1160", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Surface", weightClass: "Standard Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 300, maxDoorWidthInches: 42, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "Standard", mount: "Both leaves surface-applied" } },
  { manufacturer: "Stanley", series: "FBB235", model: "FBB235", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Surface", weightClass: "Standard Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 300, maxDoorWidthInches: 42, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Standard", mount: "Both leaves surface-applied" } },

  // Swing Clear
  { manufacturer: "Hager", series: "1163", model: "1163", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Swing Clear", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 350, maxDoorWidthInches: 42, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "NRP", clearance: "Full 180° swing clear" } },
  { manufacturer: "McKinney", series: "TA2776", model: "TA2776", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Swing Clear", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 350, maxDoorWidthInches: 42, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", clearance: "Full 180° swing clear" } },

  // Spring Hinges
  { manufacturer: "Hager", series: "1250S", model: "1250S", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Spring", weightClass: "Standard Weight", grade: "1", bearingType: "Spring Loaded", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 300, maxDoorWidthInches: 42, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "Standard", springAction: "Adjustable self-closing" } },
  { manufacturer: "Stanley", series: "2060R", model: "2060R", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Spring", weightClass: "Standard Weight", grade: "1", bearingType: "Spring Loaded", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 300, maxDoorWidthInches: 42, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Standard", springAction: "Adjustable self-closing" } },

  // Olive Knuckle
  { manufacturer: "Hager", series: "3951", model: "3951", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Olive Knuckle", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 350, maxDoorWidthInches: 42, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Brass/Bronze", finish: "US26D", screws: "Standard", style: "Decorative olive knuckle" } },
  { manufacturer: "Emtek", series: "96413", model: "96413", sizeInches: "4\" x 4\"", sizeMM: { width: 102, height: 102 }, type: "Olive Knuckle", weightClass: "Standard Weight", grade: "2", bearingType: "Plain Bearing", cornerType: "Rounded", fireRated: false, maxDoorWeightLbs: 250, maxDoorWidthInches: 36, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Solid Brass", finish: "US15", screws: "Standard", style: "Decorative olive knuckle" } },

  // Invisible / Concealed
  { manufacturer: "SOSS", series: "200", model: "218", sizeInches: "4-5/8\" x 1-3/8\"", sizeMM: { width: 117, height: 35 }, type: "Invisible", weightClass: "Standard Weight", grade: "2", bearingType: "Plain Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 200, maxDoorWidthInches: 36, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Zinc Die Cast", finish: "US26D", screws: "Concealed" } },
  { manufacturer: "SOSS", series: "200", model: "220", sizeInches: "4-5/8\" x 1-3/4\"", sizeMM: { width: 117, height: 44 }, type: "Invisible", weightClass: "Heavy Weight", grade: "1", bearingType: "Plain Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Stainless Steel", finish: "US26D", screws: "Concealed" } },
  { manufacturer: "Tectus", series: "TE540", model: "TE540 3D", sizeInches: "Concealed 3D", sizeMM: { width: 160, height: 28 }, type: "Invisible", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "3D Adjustable", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 264, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Zinc Die Cast", finish: "Satin Nickel", screws: "Concealed", adjustment: "3D vertical/lateral/depth" } },

  // Continuous Geared
  { manufacturer: "Select", series: "SL", model: "SL11", sizeInches: "83\" Continuous", sizeMM: { width: 51, height: 2108 }, type: "Continuous Geared", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Geared", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Aluminum", finish: "628", screws: "Through-bolt" } },
  { manufacturer: "Pemko", series: "CFM", model: "CFM83", sizeInches: "83\" Continuous", sizeMM: { width: 57, height: 2108 }, type: "Continuous Geared", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Geared", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 450, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Aluminum", finish: "628", screws: "Through-bolt" } },
  { manufacturer: "Select", series: "SL", model: "SL24", sizeInches: "95\" Continuous", sizeMM: { width: 51, height: 2413 }, type: "Continuous Geared", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Geared", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Aluminum", finish: "628", screws: "Through-bolt" } },

  // Pivot Hinges
  { manufacturer: "Rixson", series: "117", model: "117", sizeInches: "Floor Pivot", sizeMM: { width: 76, height: 127 }, type: "Pivot", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel/Aluminum", finish: "652", screws: "Concealed", mount: "Floor pivot, offset" } },
  { manufacturer: "Rixson", series: "370", model: "370", sizeInches: "Floor Pivot", sizeMM: { width: 76, height: 127 }, type: "Pivot", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 450, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Concealed", mount: "Floor pivot, center hung" } },

  // Electrified Hinges (ETW)
  { manufacturer: "McKinney", series: "ElectroLynx", model: "QC-E2714", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: true, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", wires: "8-wire", connector: "Quick-Connect" } },
  { manufacturer: "Ives", series: "5BB1 ETW", model: "5BB1-ETW8", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: true, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", wires: "8-wire", connector: "Through-wire" } },
  { manufacturer: "Stanley", series: "CECB179", model: "CECB179-66", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: true, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", wires: "4+2 wire", connector: "Concealed electric" } },

  // Swaged Hinges — offset leaf geometry for tighter gap clearance
  { manufacturer: "Hager", series: "1279", model: "BB1279-SW", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Swaged", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "NRP", leafGeometry: "Swaged — offset leaves for reduced gap" } },
  { manufacturer: "McKinney", series: "TA2714", model: "TA2714-SW", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Swaged", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", leafGeometry: "Swaged — offset leaves for reduced gap" } },
  { manufacturer: "Ives", series: "5BB1-SW", model: "5BB1-SW", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Swaged", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", leafGeometry: "Swaged — offset leaves for reduced gap" } },
  { manufacturer: "Stanley", series: "FBB179", model: "FBB179-SW", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Swaged", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", leafGeometry: "Swaged — offset leaves for reduced gap" } },

  // Cam Lift Hinges — gravity-assisted self-closing
  { manufacturer: "Hager", series: "1277", model: "1277-CL", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Cam Lift", weightClass: "Heavy Weight", grade: "1", bearingType: "Cam Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 350, maxDoorWidthInches: 42, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "US26D", screws: "NRP", liftAction: "Gravity-assisted self-closing via cam mechanism" } },
  { manufacturer: "McKinney", series: "CL2714", model: "CL2714", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Cam Lift", weightClass: "Heavy Weight", grade: "1", bearingType: "Cam Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 350, maxDoorWidthInches: 42, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", liftAction: "Gravity-assisted self-closing via cam mechanism" } },
  { manufacturer: "Ives", series: "5BB1-CL", model: "5BB1-CL", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Cam Lift", weightClass: "Heavy Weight", grade: "1", bearingType: "Cam Bearing", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 350, maxDoorWidthInches: 42, nrp: true, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "NRP", liftAction: "Gravity-assisted self-closing via cam mechanism" } },

  // Full Continuous Hinges — full door-height piano-style hinges
  { manufacturer: "Select", series: "SL", model: "SL11-HD", sizeInches: "83\" Full Continuous", sizeMM: { width: 51, height: 2108 }, type: "Full Continuous", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Geared", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Aluminum", finish: "628", screws: "Through-bolt", hingeLength: "Full door height" } },
  { manufacturer: "Pemko", series: "CFM-HD", model: "CFM83-FC", sizeInches: "83\" Full Continuous", sizeMM: { width: 57, height: 2108 }, type: "Full Continuous", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Geared", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 450, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Aluminum", finish: "628", screws: "Through-bolt", hingeLength: "Full door height" } },
  { manufacturer: "Hager", series: "780-112HD", model: "780-112HD", sizeInches: "83\" Full Continuous", sizeMM: { width: 57, height: 2108 }, type: "Full Continuous", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Geared", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Aluminum/Stainless", finish: "628", screws: "Through-bolt", hingeLength: "Full door height, concealed" } },
  { manufacturer: "Select", series: "SL", model: "SL24-FC", sizeInches: "95\" Full Continuous", sizeMM: { width: 51, height: 2413 }, type: "Full Continuous", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Geared", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Aluminum", finish: "628", screws: "Through-bolt", hingeLength: "Full door height — oversized" } },

  // Center Hung Pivots — top and bottom pivot at door center
  { manufacturer: "Rixson", series: "C100", model: "C100", sizeInches: "Center Hung", sizeMM: { width: 76, height: 127 }, type: "Center Hung", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 500, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel/Aluminum", finish: "652", screws: "Concealed", mount: "Center hung — top/bottom pivot at door centerline", pivotType: "Center" } },
  { manufacturer: "Rixson", series: "370", model: "370-CH", sizeInches: "Center Hung", sizeMM: { width: 76, height: 127 }, type: "Center Hung", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 450, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Concealed", mount: "Center hung pivot with hold-open", pivotType: "Center" } },
  { manufacturer: "dormakaba", series: "BTS75V", model: "BTS75V-CH", sizeInches: "Center Hung", sizeMM: { width: 80, height: 130 }, type: "Center Hung", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 550, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Concealed", mount: "Center hung — integral closer action", pivotType: "Center" } },

  // Center Pivot — offset pivot point for asymmetric swing
  { manufacturer: "Rixson", series: "117", model: "117-CP", sizeInches: "Center Pivot", sizeMM: { width: 76, height: 127 }, type: "Center Pivot", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 600, maxDoorWidthInches: 60, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel/Aluminum", finish: "652", screws: "Concealed", mount: "Center pivot — offset for bi-directional swing", pivotType: "Center Offset" } },
  { manufacturer: "Rixson", series: "147", model: "147", sizeInches: "Center Pivot", sizeMM: { width: 76, height: 127 }, type: "Center Pivot", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 500, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Concealed", mount: "Center pivot — frameless glass/metal doors", pivotType: "Center Offset" } },
  { manufacturer: "dormakaba", series: "BTS80", model: "BTS80-CP", sizeInches: "Center Pivot", sizeMM: { width: 80, height: 130 }, type: "Center Pivot", weightClass: "Extra Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 660, maxDoorWidthInches: 60, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Concealed", mount: "Center pivot with integral floor closer", pivotType: "Center Offset" } },

  // Pocket Pivot — concealed in door/frame pocket
  { manufacturer: "Rixson", series: "340", model: "340", sizeInches: "Pocket Pivot", sizeMM: { width: 25, height: 102 }, type: "Pocket Pivot", weightClass: "Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Concealed", mount: "Pocket pivot — recessed into door bottom/top", pivotType: "Pocket Concealed" } },
  { manufacturer: "Rixson", series: "370", model: "370-PP", sizeInches: "Pocket Pivot", sizeMM: { width: 25, height: 102 }, type: "Pocket Pivot", weightClass: "Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 350, maxDoorWidthInches: 42, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Concealed", mount: "Pocket pivot — minimal reveal hardware", pivotType: "Pocket Concealed" } },
  { manufacturer: "dormakaba", series: "BTS75V", model: "BTS75V-PP", sizeInches: "Pocket Pivot", sizeMM: { width: 28, height: 105 }, type: "Pocket Pivot", weightClass: "Heavy Weight", grade: "1", bearingType: "Oil Impregnated", cornerType: "Square", fireRated: true, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Steel", finish: "652", screws: "Concealed", mount: "Pocket pivot — door/frame concealed installation", pivotType: "Pocket Concealed" } },

  // Architectural Design Hinges — decorative/premium for high-end installations
  { manufacturer: "Hager", series: "3951", model: "3951-AD", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Architectural Design", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 350, maxDoorWidthInches: 42, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Solid Brass", finish: "US4", screws: "Decorative head", style: "Steeple tip — ornate architectural profile" } },
  { manufacturer: "Emtek", series: "96313", model: "96313-AD", sizeInches: "4\" x 4\"", sizeMM: { width: 102, height: 102 }, type: "Architectural Design", weightClass: "Standard Weight", grade: "2", bearingType: "Plain Bearing", cornerType: "Rounded", fireRated: false, maxDoorWeightLbs: 250, maxDoorWidthInches: 36, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Solid Brass", finish: "US15A", screws: "Decorative head", style: "Acorn tip — residential/boutique architectural" } },
  { manufacturer: "Hager", series: "1279-DES", model: "1279-WT", sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Architectural Design", weightClass: "Heavy Weight", grade: "1", bearingType: "Ball Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Stainless Steel", finish: "US32D", screws: "Decorative head", style: "Flat button tip — modern minimalist" } },
  { manufacturer: "SOSS", series: "200", model: "220-AD", sizeInches: "4-5/8\" x 1-3/4\"", sizeMM: { width: 117, height: 44 }, type: "Architectural Design", weightClass: "Heavy Weight", grade: "1", bearingType: "Plain Bearing", cornerType: "Square", fireRated: false, maxDoorWeightLbs: 400, maxDoorWidthInches: 48, nrp: false, electrified: false, securityStuds: false, specifications: { material: "Stainless Steel", finish: "US26D", screws: "Concealed", style: "Invisible architectural — concealed for clean lines" } },
];

const LOCKSET_REFERENCE_DATABASE: LocksetReferenceSpec[] = [
  { manufacturer: "Schlage", series: "ND", model: "ND80PD", function: "Storeroom", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "C123", cylinder: "6-pin", trim: "Rhodes" } },
  { manufacturer: "Schlage", series: "ND", model: "ND50PD", function: "Entry/Office", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "C123", cylinder: "6-pin", trim: "Rhodes" } },
  { manufacturer: "Schlage", series: "ND", model: "ND70PD", function: "Classroom", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "C123", cylinder: "6-pin", trim: "Rhodes" } },
  { manufacturer: "Schlage", series: "L", model: "L9080", function: "Storeroom", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "C123", cylinder: "6-pin", trim: "Mortise" } },
  { manufacturer: "BEST", series: "9K", model: "9K37D", function: "Storeroom", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "Interchangeable Core", cylinder: "7-pin", trim: "Lever" } },
  { manufacturer: "BEST", series: "9K", model: "9K30L", function: "Privacy", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "N/A", cylinder: "Thumbturn", trim: "Lever" } },
  { manufacturer: "Sargent", series: "10", model: "10G38", function: "Classroom", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "LA", cylinder: "6-pin", trim: "Lever" } },
  { manufacturer: "Sargent", series: "8200", model: "8270", function: "Storeroom", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "LA", cylinder: "6-pin", trim: "Mortise" } },
  { manufacturer: "Yale", series: "AU", model: "AU5307LN", function: "Entry", backsetMM: 70, boreSizeMM: 54, grade: "2", fireRated: true, specifications: { keyway: "Yale 8", cylinder: "6-pin", trim: "Augusta Lever" } },
  { manufacturer: "Corbin Russwin", series: "CL3300", model: "CL3355", function: "Classroom", backsetMM: 70, boreSizeMM: 54, grade: "1", fireRated: true, specifications: { keyway: "D1", cylinder: "6-pin", trim: "Lever" } },
];

const CLOSER_REFERENCE_DATABASE: CloserReferenceSpec[] = [
  { manufacturer: "LCN", series: "4040XP", model: "4040XP", enSize: 5, maxDoorWidthInches: 48, maxDoorWeightLbs: 400, mountType: "Surface", fireRated: true, specifications: { arm: "Regular", backcheck: "Yes", delayedAction: "Optional" } },
  { manufacturer: "LCN", series: "4040XP", model: "4040XP-CUSH", enSize: 5, maxDoorWidthInches: 48, maxDoorWeightLbs: 400, mountType: "Surface", fireRated: true, specifications: { arm: "CUSH-N-STOP", backcheck: "Yes", delayedAction: "Optional" } },
  { manufacturer: "LCN", series: "4111", model: "4111", enSize: 4, maxDoorWidthInches: 42, maxDoorWeightLbs: 300, mountType: "Surface", fireRated: true, specifications: { arm: "Regular", backcheck: "Optional", delayedAction: "No" } },
  { manufacturer: "Norton", series: "7500", model: "7500", enSize: 5, maxDoorWidthInches: 48, maxDoorWeightLbs: 400, mountType: "Surface", fireRated: true, specifications: { arm: "Regular", backcheck: "Yes", delayedAction: "Optional" } },
  { manufacturer: "Norton", series: "8000", model: "8501", enSize: 5, maxDoorWidthInches: 48, maxDoorWeightLbs: 400, mountType: "Surface", fireRated: true, specifications: { arm: "Regular/Hold-Open", backcheck: "Yes", delayedAction: "Optional" } },
  { manufacturer: "Sargent", series: "351", model: "351", enSize: 4, maxDoorWidthInches: 42, maxDoorWeightLbs: 300, mountType: "Surface", fireRated: true, specifications: { arm: "Regular", backcheck: "No", delayedAction: "No" } },
  { manufacturer: "Sargent", series: "281", model: "281", enSize: 5, maxDoorWidthInches: 48, maxDoorWeightLbs: 400, mountType: "Surface", fireRated: true, specifications: { arm: "Regular", backcheck: "Yes", delayedAction: "Optional" } },
  { manufacturer: "dormakaba", series: "8600", model: "8616", enSize: 5, maxDoorWidthInches: 48, maxDoorWeightLbs: 400, mountType: "Surface", fireRated: true, specifications: { arm: "Regular", backcheck: "Yes", delayedAction: "Optional" } },
  { manufacturer: "YALE", series: "4400", model: "4400", enSize: 5, maxDoorWidthInches: 48, maxDoorWeightLbs: 400, mountType: "Surface", fireRated: true, specifications: { arm: "Regular", backcheck: "Yes", delayedAction: "Optional" } },
];

interface ExitDeviceReferenceSpec {
  manufacturer: string;
  series: string;
  model: string;
  type: ExitDeviceType;
  maxDoorWidthInches: number;
  maxDoorWeightLbs: number;
  fireRated: boolean;
  grade: string;
  specifications: Record<string, string>;
}

interface ElectricStrikeReferenceSpec {
  manufacturer: string;
  series: string;
  model: string;
  type: ElectricStrikeType;
  failMode: "Fail Safe" | "Fail Secure" | "Switchable";
  voltage: string;
  lipLengthInches: number;
  fireRated: boolean;
  specifications: Record<string, string>;
}

interface MagLockReferenceSpec {
  manufacturer: string;
  series: string;
  model: string;
  type: MagLockType;
  holdingForceLbs: number;
  voltage: string;
  fireRated: boolean;
  specifications: Record<string, string>;
}

interface AccessControlReferenceSpec {
  manufacturer: string;
  series: string;
  model: string;
  deviceType: AccessControlDeviceType;
  technology: string;
  mounting: string;
  specifications: Record<string, string>;
}

const EXIT_DEVICE_REFERENCE_DATABASE: ExitDeviceReferenceSpec[] = [
  { manufacturer: "Von Duprin", series: "98/99", model: "9927EO", type: "Surface Vertical Rod", maxDoorWidthInches: 48, maxDoorWeightLbs: 500, fireRated: true, grade: "1", specifications: { finish: "US26D", dogging: "Hex key", trim: "Optional lever", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "Von Duprin", series: "98/99", model: "9947EO", type: "Concealed Vertical Rod", maxDoorWidthInches: 48, maxDoorWeightLbs: 500, fireRated: true, grade: "1", specifications: { finish: "US26D", dogging: "Hex key", trim: "Optional lever", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "Von Duprin", series: "98/99", model: "99EO", type: "Rim", maxDoorWidthInches: 48, maxDoorWeightLbs: 500, fireRated: true, grade: "1", specifications: { finish: "US26D", dogging: "Hex key", trim: "Optional lever", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "Von Duprin", series: "33A/35A", model: "33A-EO", type: "Rim", maxDoorWidthInches: 36, maxDoorWeightLbs: 300, fireRated: true, grade: "1", specifications: { finish: "US28", dogging: "Key", trim: "Optional", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "Sargent", series: "80", model: "8888F", type: "Rim", maxDoorWidthInches: 48, maxDoorWeightLbs: 500, fireRated: true, grade: "1", specifications: { finish: "US32D", dogging: "Hex key", trim: "ET trim", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "Sargent", series: "80", model: "8810F", type: "Mortise", maxDoorWidthInches: 48, maxDoorWeightLbs: 500, fireRated: true, grade: "1", specifications: { finish: "US32D", dogging: "Hex key", trim: "ET trim", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "Precision", series: "2000", model: "2108", type: "Rim", maxDoorWidthInches: 48, maxDoorWeightLbs: 400, fireRated: true, grade: "1", specifications: { finish: "US28", dogging: "Hex key", trim: "Apex", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "Precision", series: "2000", model: "2208", type: "Surface Vertical Rod", maxDoorWidthInches: 48, maxDoorWeightLbs: 400, fireRated: true, grade: "1", specifications: { finish: "US28", dogging: "Hex key", trim: "Apex", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "dormakaba", series: "8500", model: "8510", type: "Rim", maxDoorWidthInches: 48, maxDoorWeightLbs: 500, fireRated: true, grade: "1", specifications: { finish: "US32D", dogging: "Key", trim: "P lever", compliance: "ANSI/BHMA A156.3 Grade 1" } },
  { manufacturer: "YALE", series: "7000", model: "7100", type: "Rim", maxDoorWidthInches: 48, maxDoorWeightLbs: 500, fireRated: true, grade: "1", specifications: { finish: "US32D", dogging: "Hex key", trim: "Optional", compliance: "ANSI/BHMA A156.3 Grade 1" } },
];

const ELECTRIC_STRIKE_REFERENCE_DATABASE: ElectricStrikeReferenceSpec[] = [
  { manufacturer: "HES", series: "9600", model: "9600-12/24D-630", type: "High Security", failMode: "Switchable", voltage: "12/24V DC", lipLengthInches: 1.25, fireRated: true, specifications: { latchBolt: "3/4\" throw", current: "0.28A @ 24VDC", monitoring: "Latch bolt monitor", cutout: "4-7/8\" x 1-1/4\"" } },
  { manufacturer: "HES", series: "1006", model: "1006-12/24D-630", type: "Standard", failMode: "Switchable", voltage: "12/24V DC", lipLengthInches: 1.0, fireRated: false, specifications: { latchBolt: "5/8\" throw", current: "0.24A @ 24VDC", monitoring: "Optional", cutout: "4-7/8\" x 1-1/4\"" } },
  { manufacturer: "HES", series: "5000", model: "5000C-12/24D-630", type: "Standard", failMode: "Switchable", voltage: "12/24V DC", lipLengthInches: 1.25, fireRated: false, specifications: { latchBolt: "3/4\" throw", current: "0.16A @ 24VDC", monitoring: "Optional", cutout: "4-7/8\" x 1-1/4\"" } },
  { manufacturer: "HES", series: "9500", model: "9500-12/24D-630", type: "Fire Rated", failMode: "Fail Secure", voltage: "12/24V DC", lipLengthInches: 1.25, fireRated: true, specifications: { latchBolt: "3/4\" throw", current: "0.25A @ 24VDC", monitoring: "Latch bolt monitor", cutout: "4-7/8\" x 1-1/4\"", fireLabel: "UL 10C 3-hr" } },
  { manufacturer: "Securitron", series: "UNL", model: "UNL-24", type: "High Security", failMode: "Fail Secure", voltage: "24V DC", lipLengthInches: 1.25, fireRated: true, specifications: { latchBolt: "3/4\" throw", current: "0.34A @ 24VDC", monitoring: "Built-in", cutout: "4-7/8\" x 1-1/4\"" } },
  { manufacturer: "Trine", series: "3000", model: "3478", type: "Standard", failMode: "Switchable", voltage: "12/24V DC", lipLengthInches: 1.0, fireRated: false, specifications: { latchBolt: "5/8\" throw", current: "0.22A @ 24VDC", monitoring: "Optional", cutout: "4-7/8\" x 1-1/4\"" } },
  { manufacturer: "Adams Rite", series: "7100", model: "7100-310-628", type: "Standard", failMode: "Fail Secure", voltage: "12/24V DC", lipLengthInches: 1.125, fireRated: false, specifications: { latchBolt: "5/8\" throw", current: "0.18A @ 24VDC", monitoring: "Optional", cutout: "4-7/8\" x 1-1/4\"" } },
  { manufacturer: "Von Duprin", series: "6000", model: "6211-FS", type: "High Security", failMode: "Fail Safe", voltage: "24V DC", lipLengthInches: 1.25, fireRated: true, specifications: { latchBolt: "3/4\" throw", current: "0.32A @ 24VDC", monitoring: "Built-in", cutout: "4-7/8\" x 1-1/4\"" } },
];

const MAG_LOCK_REFERENCE_DATABASE: MagLockReferenceSpec[] = [
  { manufacturer: "Securitron", series: "M62", model: "M62B", type: "Surface Mount", holdingForceLbs: 1200, voltage: "12/24V DC", fireRated: false, specifications: { current: "0.50A @ 24VDC", dimensions: "10-1/2\" x 1-11/16\" x 1-5/8\"", monitoring: "Bond sensor", finish: "US28" } },
  { manufacturer: "Securitron", series: "M82", model: "M82B", type: "Surface Mount", holdingForceLbs: 1800, voltage: "12/24V DC", fireRated: false, specifications: { current: "0.55A @ 24VDC", dimensions: "16-1/2\" x 1-11/16\" x 1-5/8\"", monitoring: "Bond sensor", finish: "US28" } },
  { manufacturer: "Securitron", series: "M32", model: "M32", type: "Surface Mount", holdingForceLbs: 600, voltage: "12/24V DC", fireRated: false, specifications: { current: "0.24A @ 24VDC", dimensions: "6-1/2\" x 1-11/16\" x 1-5/8\"", monitoring: "Bond sensor", finish: "US28" } },
  { manufacturer: "dormakaba", series: "EML", model: "EML-1200", type: "Surface Mount", holdingForceLbs: 1200, voltage: "12/24V DC", fireRated: false, specifications: { current: "0.48A @ 24VDC", dimensions: "10-5/8\" x 1-3/4\"", monitoring: "Door position", finish: "US28" } },
  { manufacturer: "Securitron", series: "SLM", model: "SLM-62B", type: "Shear Lock", holdingForceLbs: 2000, voltage: "12/24V DC", fireRated: false, specifications: { current: "0.60A @ 24VDC", dimensions: "11\" x 2\" x 1-5/8\"", monitoring: "Bond sensor", finish: "US28", mount: "Mortise shear" } },
  { manufacturer: "Dortronics", series: "1130", model: "1130xUD", type: "Surface Mount", holdingForceLbs: 1200, voltage: "12/24V DC", fireRated: false, specifications: { current: "0.45A @ 24VDC", dimensions: "10\" x 1-3/4\"", monitoring: "Optional", finish: "US28" } },
  { manufacturer: "Schlage", series: "M490", model: "M490", type: "Surface Mount", holdingForceLbs: 1500, voltage: "12/24V DC", fireRated: false, specifications: { current: "0.52A @ 24VDC", dimensions: "11\" x 2\" x 1-5/8\"", monitoring: "Built-in", finish: "US28" } },
  { manufacturer: "Securitron", series: "ECL", model: "ECL-230", type: "Concealed", holdingForceLbs: 600, voltage: "12/24V DC", fireRated: false, specifications: { current: "0.30A @ 24VDC", dimensions: "9\" x 1\" x 1\"", monitoring: "Bond sensor", finish: "Concealed", mount: "Mortise concealed" } },
];

const ACCESS_CONTROL_REFERENCE_DATABASE: AccessControlReferenceSpec[] = [
  { manufacturer: "HID", series: "iCLASS SE", model: "R40", deviceType: "Card Reader", technology: "Multi-technology (iCLASS/SEOS/Prox)", mounting: "Mullion", specifications: { protocol: "Wiegand/OSDP", power: "5-16V DC", current: "150mA", ip: "IP55", dimensions: "5.6\" x 1.7\"" } },
  { manufacturer: "HID", series: "iCLASS SE", model: "R10", deviceType: "Card Reader", technology: "Multi-technology (iCLASS/SEOS)", mounting: "Mullion", specifications: { protocol: "Wiegand/OSDP", power: "5-16V DC", current: "100mA", ip: "IP55", dimensions: "4.8\" x 1.4\"" } },
  { manufacturer: "HID", series: "Signo", model: "40K", deviceType: "Card Reader", technology: "Multi-technology (Mobile/SEOS/iCLASS)", mounting: "Mullion", specifications: { protocol: "Wiegand/OSDP", power: "5-16V DC", current: "200mA", ip: "IP55", dimensions: "5.6\" x 1.7\"", bluetooth: "BLE" } },
  { manufacturer: "HID", series: "Signo", model: "40NKS", deviceType: "Keypad", technology: "Multi-technology + keypad", mounting: "Wall", specifications: { protocol: "Wiegand/OSDP", power: "5-16V DC", current: "200mA", ip: "IP55", dimensions: "6.2\" x 3.1\"", keypad: "Capacitive touch" } },
  { manufacturer: "Allegion", series: "aptiQ", model: "MT15", deviceType: "Card Reader", technology: "Multi-technology (MIFARE/DESFire/HID)", mounting: "Mullion", specifications: { protocol: "Wiegand/OSDP", power: "5-16V DC", current: "120mA", ip: "IP55", dimensions: "5.0\" x 1.5\"" } },
  { manufacturer: "dormakaba", series: "91 00", model: "9120", deviceType: "Card Reader", technology: "Multi-technology (LEGIC/MIFARE)", mounting: "Mullion", specifications: { protocol: "Wiegand/OSDP", power: "5-16V DC", current: "130mA", ip: "IP55", dimensions: "5.2\" x 1.6\"" } },
  { manufacturer: "Suprema", series: "BioEntry", model: "W2", deviceType: "Biometric", technology: "Fingerprint + Card", mounting: "Wall", specifications: { protocol: "Wiegand/OSDP/RS-485", power: "12V DC", current: "500mA", ip: "IP67", dimensions: "5.5\" x 2.4\"", sensor: "Optical fingerprint" } },
  { manufacturer: "Suprema", series: "FaceStation", model: "F2", deviceType: "Biometric", technology: "Facial Recognition + Card", mounting: "Wall", specifications: { protocol: "Wiegand/OSDP/RS-485", power: "12V DC", current: "1.2A", ip: "IK08", dimensions: "6.7\" x 3.5\"", sensor: "IR + visible camera" } },
  { manufacturer: "Securitron", series: "DPS", model: "DPS-M", deviceType: "DPS", technology: "Magnetic reed switch", mounting: "Concealed mortise", specifications: { type: "SPDT", gap: "1/2\" max", dimensions: "1-1/8\" x 3/8\"", wiring: "2-conductor" } },
  { manufacturer: "Securitron", series: "DPS", model: "DPS-S", deviceType: "DPS", technology: "Magnetic reed switch", mounting: "Surface mount", specifications: { type: "SPDT", gap: "3/4\" max", dimensions: "2-1/2\" x 3/4\"", wiring: "2-conductor" } },
  { manufacturer: "Securitron", series: "REX", model: "XMS", deviceType: "REX", technology: "Passive infrared", mounting: "Wall", specifications: { range: "48\" radius", pattern: "Curtain/Wide", power: "12/24V DC", current: "50mA", dimensions: "4\" x 2.5\"" } },
  { manufacturer: "Bosch", series: "ISC", model: "ISC-BPR2-W12", deviceType: "REX", technology: "Passive infrared", mounting: "Wall/Ceiling", specifications: { range: "40' x 60'", pattern: "Wide angle", power: "12V DC", current: "30mA", dimensions: "4.3\" x 2.5\"" } },
  { manufacturer: "Altronix", series: "SMP", model: "SMP5PM", deviceType: "Power Supply", technology: "Regulated DC", mounting: "Wall box", specifications: { output: "12/24V DC selectable", current: "4A continuous", battery: "7Ah backup", enclosure: "16\" x 12\" x 4\"", fused: "Yes" } },
  { manufacturer: "Altronix", series: "AL", model: "AL600ULACM", deviceType: "Power Supply", technology: "Regulated DC", mounting: "Wall box", specifications: { output: "12/24V DC selectable", current: "6A continuous", battery: "12Ah backup", enclosure: "17\" x 14\" x 4.5\"", fused: "PTC resettable" } },
  { manufacturer: "Von Duprin", series: "EPT", model: "EPT-10", deviceType: "Electrified Trim", technology: "Electric latch retraction", mounting: "Exit device trim", specifications: { power: "24V DC", current: "2.8A inrush", dutyCycle: "Continuous", compatibility: "98/99 series" } },
  { manufacturer: "Sargent", series: "ET", model: "ET-8800", deviceType: "Electrified Trim", technology: "Electric latch retraction", mounting: "Exit device trim", specifications: { power: "24V DC", current: "2.5A inrush", dutyCycle: "Continuous", compatibility: "80 series" } },
  { manufacturer: "Mercury Security", series: "EP", model: "EP1502", deviceType: "Controller", technology: "2-door controller", mounting: "Wall box", specifications: { doors: "2", inputs: "8 supervised", outputs: "4 relay", protocol: "TCP/IP", power: "12V DC" } },
  { manufacturer: "ASSA ABLOY", series: "Aperio", model: "AH20", deviceType: "Card Reader", technology: "Wireless lock hub", mounting: "Wall", specifications: { protocol: "Aperio wireless", doors: "Up to 64", power: "PoE", dimensions: "7\" x 5\" x 2\"" } },
];

function determineLockingHardware(
  doorWidthMM: number,
  doorHeightMM: number,
  doorWeightLbs: number,
  fireRatingRequired: boolean,
  isExterior: boolean,
  isAccessControlled: boolean,
  isExitDevice: boolean,
  isMagLock: boolean,
): LockingHardwareAnalysis {
  const doorWidthInches = doorWidthMM / 25.4;

  let lockType: LockingHardwareAnalysis["lockType"] = "Cylindrical";
  let lockTypeReason = "Standard cylindrical lockset for interior commercial door";

  if (isExitDevice || (doorWidthInches >= 36 && fireRatingRequired)) {
    lockType = "Exit Device";
    lockTypeReason = isExitDevice
      ? "Exit device specified — panic hardware required per IBC/NFPA Life Safety"
      : "Exit device recommended for fire-rated opening ≥ 36\" per NFPA 101";
  } else if (doorWeightLbs > 400 || (fireRatingRequired && isExterior)) {
    lockType = "Mortise";
    lockTypeReason = "Mortise lockset recommended for heavy-duty or fire-rated exterior openings";
  } else if (isAccessControlled) {
    lockType = "Electrified";
    lockTypeReason = "Electrified lockset required for access-controlled opening";
  }

  let exitDevice: LockingHardwareAnalysis["exitDevice"] = null;
  if (lockType === "Exit Device" || isExitDevice) {
    let exitType: ExitDeviceType = "Rim";
    let exitReason = "Standard rim exit device for single-leaf door";
    if (fireRatingRequired && doorWidthInches >= 36) {
      exitType = "Surface Vertical Rod";
      exitReason = "Surface vertical rod required for fire-rated pair/wide opening";
    } else if (doorWeightLbs > 400) {
      exitType = "Concealed Vertical Rod";
      exitReason = "Concealed vertical rod for heavy door with clean aesthetic";
    }

    exitDevice = {
      recommended: true,
      type: exitType,
      reason: exitReason,
      widthRequirementMet: doorWidthInches >= 28,
    };
  }

  let electricStrike: LockingHardwareAnalysis["electricStrike"] = null;
  if (isAccessControlled && lockType !== "Exit Device") {
    const strikeType: ElectricStrikeType = fireRatingRequired ? "Fire Rated" : "Standard";
    const failMode: "Fail Safe" | "Fail Secure" = isExterior ? "Fail Secure" : "Fail Safe";
    electricStrike = {
      recommended: true,
      type: strikeType,
      failMode,
      reason: `${failMode} electric strike for access-controlled ${isExterior ? "exterior" : "interior"} opening${fireRatingRequired ? " (fire-rated)" : ""}`,
    };
  }

  let magneticLock: LockingHardwareAnalysis["magneticLock"] = null;
  if (isMagLock || (isAccessControlled && lockType !== "Exit Device" && isExterior)) {
    const holdingForce = doorWeightLbs > 300 ? 1200 : 600;
    const magType: MagLockType = doorWeightLbs > 400 ? "Shear Lock" : "Surface Mount";
    magneticLock = {
      recommended: true,
      type: magType,
      holdingForceLbs: holdingForce,
      reason: isMagLock
        ? `Magnetic lock specified — ${holdingForce} lbs holding force for ${doorWeightLbs} lb door`
        : `Magnetic lock recommended for exterior access-controlled opening — ${holdingForce} lbs holding force`,
    };
  }

  let electrifiedTrim: LockingHardwareAnalysis["electrifiedTrim"] = null;
  if (lockType === "Exit Device" && isAccessControlled) {
    electrifiedTrim = {
      recommended: true,
      trimType: "Electric Latch Retraction",
      reason: "Electrified trim required for access-controlled exit device — enables remote unlocking",
    };
  }

  return { lockType, lockTypeReason, exitDevice, electricStrike, magneticLock, electrifiedTrim };
}

function determineAccessControlComponents(
  isAccessControlled: boolean,
  isExterior: boolean,
  lockingAnalysis: LockingHardwareAnalysis,
  fireRatingRequired: boolean,
): AccessControlAnalysis {
  if (!isAccessControlled) {
    return {
      recommended: false,
      reason: "Access control not specified for this opening",
      components: [],
      powerRequirements: { voltage: "N/A", current: "N/A", backupRequired: false },
      wiringNotes: [],
    };
  }

  const components: AccessControlAnalysis["components"] = [];

  components.push({
    deviceType: "Card Reader",
    location: "Secure side (exterior/corridor)",
    required: true,
    notes: "Multi-technology reader for credential flexibility — mount at 48\" AFF per ADA",
  });

  if (isExterior) {
    components.push({
      deviceType: "Keypad",
      location: "Secure side — adjacent to reader",
      required: false,
      notes: "Backup PIN entry for lost credentials — vandal-resistant for exterior use",
    });
  }

  components.push({
    deviceType: "REX",
    location: "Protected side (interior)",
    required: true,
    notes: "Request-to-exit sensor at door header — free egress per NFPA 101",
  });

  components.push({
    deviceType: "DPS",
    location: "Door frame — hinge side top",
    required: true,
    notes: "Door position switch for forced-entry and held-open monitoring",
  });

  if (lockingAnalysis.exitDevice?.recommended || lockingAnalysis.electricStrike?.recommended || lockingAnalysis.magneticLock?.recommended) {
    components.push({
      deviceType: "Power Supply",
      location: "Electrical closet or above-ceiling near opening",
      required: true,
      notes: "Filtered/regulated power supply with battery backup for electrified hardware",
    });
  }

  if (lockingAnalysis.electrifiedTrim?.recommended) {
    components.push({
      deviceType: "Electrified Trim",
      location: "Exit device — secure side",
      required: true,
      notes: lockingAnalysis.electrifiedTrim.reason,
    });
  }

  components.push({
    deviceType: "Controller",
    location: "MDF/IDF or above-ceiling",
    required: true,
    notes: "Access control panel/controller — networked to head-end server",
  });

  const totalCurrentMA = 500 + (lockingAnalysis.electricStrike?.recommended ? 340 : 0) + (lockingAnalysis.magneticLock?.recommended ? 550 : 0);
  const voltage = "12/24V DC";

  const wiringNotes: string[] = [];
  wiringNotes.push("Reader cable: 6-conductor shielded (Wiegand) or 4-conductor (OSDP/RS-485)");
  wiringNotes.push("DPS cable: 2-conductor 22 AWG shielded");
  wiringNotes.push("REX cable: 4-conductor 22 AWG");
  if (lockingAnalysis.electricStrike?.recommended) {
    wiringNotes.push("Electric strike: 2-conductor 18 AWG from power supply");
  }
  if (lockingAnalysis.magneticLock?.recommended) {
    wiringNotes.push("Mag lock: 2-conductor 16 AWG from power supply — conduit required");
  }
  if (lockingAnalysis.electrifiedTrim?.recommended) {
    wiringNotes.push("Electrified trim: Power transfer hinge (ETW) or door cord — 18 AWG");
  }
  if (fireRatingRequired) {
    wiringNotes.push("Fire-rated opening: All wiring must maintain fire barrier integrity per NFPA 80");
  }

  return {
    recommended: true,
    reason: `Access control system required for ${isExterior ? "exterior" : "interior"} controlled opening`,
    components,
    powerRequirements: {
      voltage,
      current: `${(totalCurrentMA / 1000).toFixed(2)}A minimum`,
      backupRequired: true,
    },
    wiringNotes,
  };
}

function estimateDoorWeight(widthMM: number, heightMM: number, frameDepth: number): { weightLbs: number; weightClass: string } {
  const widthInches = widthMM / 25.4;
  const heightInches = heightMM / 25.4;
  const thicknessInches = frameDepth > 50 ? frameDepth / 25.4 : 1.75;
  const areaSqFt = (widthInches * heightInches) / 144;
  const weightPerSqFt = thicknessInches > 2 ? 8 : 6.5;
  const weightLbs = Math.round(areaSqFt * weightPerSqFt);

  let weightClass: string;
  if (weightLbs <= 200) weightClass = "Light Duty (up to 200 lbs)";
  else if (weightLbs <= 400) weightClass = "Standard Duty (up to 400 lbs)";
  else weightClass = "Heavy Duty (400+ lbs)";

  return { weightLbs, weightClass };
}

function determineHingeSize(doorWidthMM: number, doorHeightMM: number, doorWeightLbs: number): { sizeInches: string; sizeMM: { width: number; height: number }; type: string } {
  const doorWidthInches = doorWidthMM / 25.4;
  const doorHeightInches = doorHeightMM / 25.4;

  if (doorHeightInches > 84 || doorWeightLbs > 450) {
    return { sizeInches: "5\" x 5\"", sizeMM: { width: 127, height: 127 }, type: "Full Mortise Heavy Weight" };
  }
  if (doorWidthInches > 42 || doorWeightLbs > 300) {
    return { sizeInches: "4-1/2\" x 4-1/2\"", sizeMM: { width: 114, height: 114 }, type: "Full Mortise Standard Weight" };
  }
  if (doorWidthInches <= 32 && doorWeightLbs <= 150) {
    return { sizeInches: "3-1/2\" x 3-1/2\"", sizeMM: { width: 89, height: 89 }, type: "Full Mortise Light Weight" };
  }
  return { sizeInches: "4\" x 4\"", sizeMM: { width: 102, height: 102 }, type: "Full Mortise Standard Weight" };
}

function determineCloserSize(doorWidthMM: number, doorWeightLbs: number): { enSize: number; closerSize: number } {
  const doorWidthInches = doorWidthMM / 25.4;
  if (doorWidthInches <= 24) return { enSize: 1, closerSize: 1 };
  if (doorWidthInches <= 30) return { enSize: 2, closerSize: 2 };
  if (doorWidthInches <= 36) return { enSize: 3, closerSize: 3 };
  if (doorWidthInches <= 42) return { enSize: 4, closerSize: 4 };
  if (doorWidthInches <= 48) return { enSize: 5, closerSize: 5 };
  return { enSize: 6, closerSize: 6 };
}

function determineHingeMountType(
  doorWeightLbs: number,
  doorHeightMM: number,
  doorWidthMM: number,
  fireRatingRequired: boolean,
  isExterior: boolean,
  isAccessControlled: boolean,
  isSwingClearRequired: boolean,
  isCamLiftRequired: boolean,
  isHighFrequency: boolean,
  isCenterHung: boolean = false,
  isCenterPivot: boolean = false,
  isPocketPivot: boolean = false,
  isArchitecturalDesign: boolean = false,
): { mountType: HingeMountType; mountTypeReason: string; isSwaged: boolean; swageReason: string } {
  const doorHeightInches = doorHeightMM / 25.4;
  const doorWidthInches = doorWidthMM / 25.4;

  let isSwaged = false;
  let swageReason = "Standard (non-swaged) leaf geometry";

  if (doorWeightLbs > 250 || doorWidthInches > 36 || fireRatingRequired) {
    isSwaged = true;
    swageReason = doorWeightLbs > 250
      ? `Swaged leaves recommended for door weight ${doorWeightLbs} lbs — reduces friction and binding`
      : fireRatingRequired
        ? "Swaged leaves required for fire-rated openings per NFPA 80 to ensure proper gap clearance"
        : `Swaged leaves recommended for ${doorWidthInches}\" wide door — improves alignment and reduces drag`;
  }

  if (isCenterHung) {
    return {
      mountType: "Center Hung",
      mountTypeReason: "Center hung pivot specified — top and bottom pivots at door centerline for bi-directional swing, common in storefront and entrance applications",
      isSwaged: false,
      swageReason: "Not applicable for pivot-type hardware",
    };
  }

  if (isCenterPivot) {
    return {
      mountType: "Center Pivot",
      mountTypeReason: "Center pivot specified — offset pivot point provides asymmetric swing arc, ideal for high-traffic entrances and large/heavy doors requiring floor closer integration",
      isSwaged: false,
      swageReason: "Not applicable for pivot-type hardware",
    };
  }

  if (isPocketPivot) {
    return {
      mountType: "Pocket Pivot",
      mountTypeReason: "Pocket pivot specified — concealed in door bottom/top pocket for minimal visible hardware, clean sightlines while maintaining fire-rated compliance",
      isSwaged: false,
      swageReason: "Not applicable for pivot-type hardware",
    };
  }

  if (isArchitecturalDesign) {
    return {
      mountType: "Architectural Design",
      mountTypeReason: "Architectural design hinge specified — decorative/premium hardware with ornate tips and specialty finishes for high-end commercial or heritage installations",
      isSwaged: false,
      swageReason: "Not applicable for architectural design hinges",
    };
  }

  if (doorHeightInches >= 84 && isHighFrequency) {
    return {
      mountType: "Full Continuous",
      mountTypeReason: `Full continuous hinge recommended for ${doorHeightInches}\" high-frequency door — distributes stress across full height, eliminates hinge sag`,
      isSwaged: false,
      swageReason: "Not applicable for continuous hinges",
    };
  }

  if (doorHeightInches >= 96 || doorWeightLbs > 500) {
    return {
      mountType: "Full Continuous",
      mountTypeReason: `Full continuous hinge required for ${doorHeightInches > 96 ? doorHeightInches + '\" tall' : doorWeightLbs + ' lb'} door — individual butt hinges cannot support this application`,
      isSwaged: false,
      swageReason: "Not applicable for continuous hinges",
    };
  }

  if (isSwingClearRequired) {
    return {
      mountType: "Swing Clear",
      mountTypeReason: "Swing clear hinge required for full 180° door clearance — provides maximum clear opening width per ADA requirements",
      isSwaged,
      swageReason,
    };
  }

  if (isCamLiftRequired || (isExterior && doorWeightLbs > 200)) {
    return {
      mountType: "Cam Lift",
      mountTypeReason: isCamLiftRequired
        ? "Cam lift hinge specified — provides gravity-assisted self-closing action without a door closer"
        : `Cam lift hinge recommended for ${doorWeightLbs} lb exterior door — gravity-assisted closing reduces wear on closer`,
      isSwaged,
      swageReason,
    };
  }

  return {
    mountType: "Full Mortise",
    mountTypeReason: "Full mortise — standard commercial mount type, mortised into both door and frame for flush installation",
    isSwaged,
    swageReason,
  };
}

export function identifyHardware(
  metrics: ProcessedMetricsInput,
  confidenceScores: ConfidenceScoresInput,
  existingPlacements?: HardwareMeasurementResult,
  options?: { isExterior?: boolean; isAccessControlled?: boolean; revealData?: RevealGapResult | null; isSwingClearRequired?: boolean; isCamLiftRequired?: boolean; isHighFrequency?: boolean; isCenterHung?: boolean; isCenterPivot?: boolean; isPocketPivot?: boolean; isArchitecturalDesign?: boolean; isExitDevice?: boolean; isMagLock?: boolean; hasAccessControl?: boolean }
): HardwareIdentificationResult {
  const placements = existingPlacements || detectHardwarePlacements(metrics, confidenceScores);
  const doorWeight = estimateDoorWeight(metrics.width, metrics.height, metrics.frameDepth);
  const hingeSize = determineHingeSize(metrics.width, metrics.height, doorWeight.weightLbs);
  const closerSpec = determineCloserSize(metrics.width, doorWeight.weightLbs);
  const allManufacturerMatches: ManufacturerMatch[] = [];

  const fireRatingRequired = metrics.height > 2032;
  const hingeWeightClass = determineHingeWeightClass(doorWeight.weightLbs, metrics.width);
  const { count: hingeCount, reason: hingeCountReason } = determineHingeCount(metrics.height, doorWeight.weightLbs);
  const corner = determineCornerType(fireRatingRequired, "commercial");
  const handing = determineDoorHanding(metrics.swingDirection, confidenceScores.swingDirection);
  const security = determineSecurityFeatures(fireRatingRequired, doorWeight.weightLbs, options?.isExterior ?? false);
  const electrified = determineElectrifiedOption(options?.isAccessControlled ?? false, metrics.height);
  const mountTypeResult = determineHingeMountType(
    doorWeight.weightLbs,
    metrics.height,
    metrics.width,
    fireRatingRequired,
    options?.isExterior ?? false,
    options?.isAccessControlled ?? false,
    options?.isSwingClearRequired ?? false,
    options?.isCamLiftRequired ?? false,
    options?.isHighFrequency ?? false,
    options?.isCenterHung ?? false,
    options?.isCenterPivot ?? false,
    options?.isPocketPivot ?? false,
    options?.isArchitecturalDesign ?? false,
  );
  const hingeBacksetMM = 143;
  const hingePlacementDetails = computeHingePlacements(metrics.height, hingeCount, hingeBacksetMM);
  const knuckleDims = getKnuckleDimensions(hingeSize.sizeMM);

  let hingeClearance: HingeDetailedAnalysis["hingeClearance"] = null;
  if (options?.revealData) {
    const hingeGapMM = options.revealData.gaps.hingeGap.valueMM;
    const withinSpec = hingeGapMM >= 1.6 && hingeGapMM <= 4.8;
    let status: "pass" | "marginal" | "fail";
    if (withinSpec) {
      status = Math.abs(hingeGapMM - 3.2) <= 0.8 ? "pass" : "marginal";
    } else {
      status = "fail";
    }
    hingeClearance = {
      hingeGapMM: Math.round(hingeGapMM * 100) / 100,
      hingeGapInches: mmToFractionalInches(hingeGapMM),
      withinSpec,
      specRangeMM: { min: 1.6, max: 4.8 },
      status,
    };
  }

  const PIVOT_TYPES: HingeMountType[] = ["Pivot", "Center Hung", "Center Pivot", "Pocket Pivot"];
  const NON_STANDARD_SIZE_TYPES: HingeMountType[] = ["Continuous Geared", "Full Continuous", ...PIVOT_TYPES];

  const identifiedHinges = placements.hinges.map(h => {
    const matchedHinges = HINGE_REFERENCE_DATABASE.filter(ref =>
      ref.maxDoorWeightLbs >= doorWeight.weightLbs &&
      ref.maxDoorWidthInches >= (metrics.width / 25.4) &&
      (NON_STANDARD_SIZE_TYPES.includes(ref.type as HingeMountType) || ref.type === "Architectural Design" || Math.abs(ref.sizeMM.width - hingeSize.sizeMM.width) <= 15)
    );

    const matches: ManufacturerMatch[] = matchedHinges.map(ref => {
      let confidence = 0.5;

      if (!NON_STANDARD_SIZE_TYPES.includes(ref.type as HingeMountType) && ref.type !== "Architectural Design") {
        if (Math.abs(ref.sizeMM.width - hingeSize.sizeMM.width) <= 3) confidence += 0.15;
        else if (Math.abs(ref.sizeMM.width - hingeSize.sizeMM.width) <= 10) confidence += 0.08;
      }

      if (ref.weightClass === hingeWeightClass) confidence += 0.1;
      else if (
        (ref.weightClass === "Heavy Weight" && hingeWeightClass === "Standard Weight") ||
        (ref.weightClass === "Extra Heavy Weight" && hingeWeightClass === "Heavy Weight")
      ) confidence += 0.05;

      if (ref.maxDoorWeightLbs >= doorWeight.weightLbs * 1.2) confidence += 0.03;
      if (ref.fireRated && fireRatingRequired) confidence += 0.08;
      else if (ref.fireRated) confidence += 0.03;

      if (ref.bearingType === "Ball Bearing") confidence += 0.04;
      if (ref.cornerType === corner.type) confidence += 0.05;
      if (ref.nrp && security.features.includes("NRP")) confidence += 0.04;
      if (ref.electrified && electrified.electrified) confidence += 0.06;
      if (ref.securityStuds && security.features.includes("Security Stud")) confidence += 0.03;

      if (ref.type === mountTypeResult.mountType) confidence += 0.08;
      else if (ref.type === "Swaged" && mountTypeResult.isSwaged) confidence += 0.06;
      else if (ref.type === "Full Continuous" && mountTypeResult.mountType === "Continuous Geared") confidence += 0.04;
      else if (ref.type === "Continuous Geared" && mountTypeResult.mountType === "Full Continuous") confidence += 0.04;
      else if (PIVOT_TYPES.includes(ref.type as HingeMountType) && PIVOT_TYPES.includes(mountTypeResult.mountType)) confidence += 0.05;
      else if (ref.type === "Architectural Design" && mountTypeResult.mountType === "Olive Knuckle") confidence += 0.04;
      else if (ref.type === "Architectural Design" && mountTypeResult.mountType === "Invisible") confidence += 0.04;

      confidence = Math.min(confidence, 0.95);

      const specs: Record<string, string> = {
        ...ref.specifications,
        bearing: ref.bearingType,
        maxWeight: `${ref.maxDoorWeightLbs} lbs`,
        weightClass: ref.weightClass,
        corners: ref.cornerType,
      };
      if (ref.nrp) specs.nrp = "Yes";
      if (ref.electrified) specs.electrified = "ETW";
      if (ref.securityStuds) specs.securityStuds = "Yes";

      return {
        manufacturer: ref.manufacturer,
        series: ref.series,
        model: ref.model,
        size: ref.sizeInches,
        type: ref.type,
        grade: `Grade ${ref.grade}`,
        fireRated: ref.fireRated,
        confidence: Math.round(confidence * 100) / 100,
        specifications: specs,
      };
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 8);

    allManufacturerMatches.push(...matches);

    return {
      ...h,
      identifiedType: hingeSize.type,
      identifiedSize: hingeSize.sizeInches,
      manufacturerMatches: matches,
    };
  });

  const locksetBacksetMM = 70;
  const locksetBoreMM = 54;

  const matchedLocksets = LOCKSET_REFERENCE_DATABASE.filter(ref =>
    Math.abs(ref.backsetMM - locksetBacksetMM) <= 5
  );

  const locksetMatches: ManufacturerMatch[] = matchedLocksets.map(ref => {
    let confidence = 0.55;
    if (Math.abs(ref.backsetMM - locksetBacksetMM) <= 1) confidence += 0.15;
    if (ref.fireRated) confidence += 0.05;
    if (ref.grade === "1") confidence += 0.1;
    confidence = Math.min(confidence, 0.95);

    return {
      manufacturer: ref.manufacturer,
      series: ref.series,
      model: ref.model,
      size: `${ref.backsetMM}mm backset`,
      type: ref.function,
      grade: `Grade ${ref.grade}`,
      fireRated: ref.fireRated,
      confidence: Math.round(confidence * 100) / 100,
      specifications: ref.specifications,
    };
  }).sort((a, b) => b.confidence - a.confidence).slice(0, 5);

  allManufacturerMatches.push(...locksetMatches);

  let identifiedLockset = placements.lockset ? { ...placements.lockset } : null;
  if (identifiedLockset) {
    identifiedLockset.identifiedType = "Cylindrical/Mortise Lockset";
    identifiedLockset.identifiedSize = `${locksetBacksetMM}mm (2-3/4\") backset`;
    identifiedLockset.manufacturerMatches = locksetMatches;
  }

  const matchedClosers = CLOSER_REFERENCE_DATABASE.filter(ref =>
    ref.enSize >= closerSpec.enSize - 1 && ref.enSize <= closerSpec.enSize + 1 &&
    ref.maxDoorWidthInches >= (metrics.width / 25.4)
  );

  const closerMatches: ManufacturerMatch[] = matchedClosers.map(ref => {
    let confidence = 0.55;
    if (ref.enSize === closerSpec.enSize) confidence += 0.2;
    else confidence += 0.05;
    if (ref.fireRated) confidence += 0.05;
    if (ref.maxDoorWeightLbs >= doorWeight.weightLbs) confidence += 0.05;
    confidence = Math.min(confidence, 0.95);

    return {
      manufacturer: ref.manufacturer,
      series: ref.series,
      model: ref.model,
      size: `EN ${ref.enSize}`,
      type: ref.mountType,
      grade: ref.fireRated ? "Fire Rated" : "Standard",
      fireRated: ref.fireRated,
      confidence: Math.round(confidence * 100) / 100,
      specifications: ref.specifications,
    };
  }).sort((a, b) => b.confidence - a.confidence).slice(0, 5);

  allManufacturerMatches.push(...closerMatches);

  let identifiedCloser = placements.closer ? { ...placements.closer } : null;
  if (identifiedCloser) {
    identifiedCloser.identifiedType = "Surface Mounted Closer";
    identifiedCloser.identifiedSize = `Size ${closerSpec.closerSize} (EN ${closerSpec.enSize})`;
    identifiedCloser.manufacturerMatches = closerMatches;
  }

  const effectiveAccessControlled = options?.isAccessControlled ?? options?.hasAccessControl ?? false;
  const effectiveExitDevice = options?.isExitDevice ?? false;
  const effectiveMagLock = options?.isMagLock ?? false;

  const lockingAnalysis = determineLockingHardware(
    metrics.width,
    metrics.height,
    doorWeight.weightLbs,
    fireRatingRequired,
    options?.isExterior ?? false,
    effectiveAccessControlled,
    effectiveExitDevice,
    effectiveMagLock,
  );

  const accessControlAnalysis = determineAccessControlComponents(
    effectiveAccessControlled,
    options?.isExterior ?? false,
    lockingAnalysis,
    fireRatingRequired,
  );

  if (lockingAnalysis.exitDevice?.recommended) {
    const matchedExitDevices = EXIT_DEVICE_REFERENCE_DATABASE.filter(ref =>
      ref.maxDoorWidthInches >= (metrics.width / 25.4) &&
      ref.maxDoorWeightLbs >= doorWeight.weightLbs
    );

    const exitDeviceMatches: ManufacturerMatch[] = matchedExitDevices.map(ref => {
      let confidence = 0.5;
      if (ref.type === lockingAnalysis.exitDevice!.type) confidence += 0.2;
      else confidence += 0.05;
      if (ref.fireRated && fireRatingRequired) confidence += 0.1;
      if (ref.grade === "1") confidence += 0.05;
      if (ref.maxDoorWeightLbs >= doorWeight.weightLbs * 1.2) confidence += 0.03;
      confidence = Math.min(confidence, 0.95);

      return {
        manufacturer: ref.manufacturer,
        series: ref.series,
        model: ref.model,
        size: `${ref.maxDoorWidthInches}\" max`,
        type: `Exit Device — ${ref.type}`,
        grade: `Grade ${ref.grade}`,
        fireRated: ref.fireRated,
        confidence: Math.round(confidence * 100) / 100,
        specifications: ref.specifications,
      };
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 5);

    allManufacturerMatches.push(...exitDeviceMatches);
  }

  if (lockingAnalysis.electricStrike?.recommended) {
    const matchedStrikes = ELECTRIC_STRIKE_REFERENCE_DATABASE.filter(ref =>
      (ref.failMode === lockingAnalysis.electricStrike!.failMode || ref.failMode === "Switchable")
    );

    const strikeMatches: ManufacturerMatch[] = matchedStrikes.map(ref => {
      let confidence = 0.5;
      if (ref.type === lockingAnalysis.electricStrike!.type) confidence += 0.15;
      if (ref.failMode === lockingAnalysis.electricStrike!.failMode) confidence += 0.1;
      else if (ref.failMode === "Switchable") confidence += 0.08;
      if (ref.fireRated && fireRatingRequired) confidence += 0.1;
      confidence = Math.min(confidence, 0.95);

      return {
        manufacturer: ref.manufacturer,
        series: ref.series,
        model: ref.model,
        size: `${ref.lipLengthInches}\" lip`,
        type: `Electric Strike — ${ref.type}`,
        grade: ref.failMode,
        fireRated: ref.fireRated,
        confidence: Math.round(confidence * 100) / 100,
        specifications: { ...ref.specifications, voltage: ref.voltage, failMode: ref.failMode },
      };
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 5);

    allManufacturerMatches.push(...strikeMatches);
  }

  if (lockingAnalysis.magneticLock?.recommended) {
    const matchedMagLocks = MAG_LOCK_REFERENCE_DATABASE.filter(ref =>
      ref.holdingForceLbs >= lockingAnalysis.magneticLock!.holdingForceLbs * 0.8
    );

    const magLockMatches: ManufacturerMatch[] = matchedMagLocks.map(ref => {
      let confidence = 0.5;
      if (ref.type === lockingAnalysis.magneticLock!.type) confidence += 0.15;
      if (Math.abs(ref.holdingForceLbs - lockingAnalysis.magneticLock!.holdingForceLbs) <= 200) confidence += 0.1;
      else if (ref.holdingForceLbs >= lockingAnalysis.magneticLock!.holdingForceLbs) confidence += 0.05;
      confidence = Math.min(confidence, 0.95);

      return {
        manufacturer: ref.manufacturer,
        series: ref.series,
        model: ref.model,
        size: `${ref.holdingForceLbs} lbs`,
        type: `Mag Lock — ${ref.type}`,
        grade: ref.voltage,
        fireRated: ref.fireRated,
        confidence: Math.round(confidence * 100) / 100,
        specifications: ref.specifications,
      };
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 5);

    allManufacturerMatches.push(...magLockMatches);
  }

  if (accessControlAnalysis.recommended) {
    const acMatches: ManufacturerMatch[] = ACCESS_CONTROL_REFERENCE_DATABASE
      .filter(ref => {
        if (ref.deviceType === "Card Reader" || ref.deviceType === "REX" || ref.deviceType === "DPS" || ref.deviceType === "Power Supply" || ref.deviceType === "Controller") return true;
        if (ref.deviceType === "Keypad" && options?.isExterior) return true;
        if (ref.deviceType === "Biometric") return true;
        if (ref.deviceType === "Electrified Trim" && lockingAnalysis.electrifiedTrim?.recommended) return true;
        return false;
      })
      .map(ref => {
        let confidence = 0.55;
        if (ref.deviceType === "Card Reader") confidence += 0.15;
        else if (ref.deviceType === "Power Supply") confidence += 0.1;
        else if (ref.deviceType === "Controller") confidence += 0.1;
        else if (ref.deviceType === "DPS" || ref.deviceType === "REX") confidence += 0.08;
        if (ref.specifications?.protocol?.includes("OSDP")) confidence += 0.03;
        confidence = Math.min(confidence, 0.95);

        return {
          manufacturer: ref.manufacturer,
          series: ref.series,
          model: ref.model,
          size: ref.mounting,
          type: `Access Control — ${ref.deviceType}`,
          grade: ref.technology,
          fireRated: false,
          confidence: Math.round(confidence * 100) / 100,
          specifications: ref.specifications,
        };
      })
      .sort((a, b) => b.confidence - a.confidence).slice(0, 10);

    allManufacturerMatches.push(...acMatches);
  }

  const uniqueManufacturers = Array.from(new Set(allManufacturerMatches.map(m => m.manufacturer)));

  const recommendedBearing = hingeWeightClass === "Standard Weight" ? "Plain Bearing" : "Ball Bearing";
  const recommendedGrade = hingeWeightClass === "Standard Weight" && !fireRatingRequired ? "Grade 2" : "Grade 1";

  const totalIdentified = identifiedHinges.length + (identifiedLockset ? 1 : 0) + (identifiedCloser ? 1 : 0)
    + (lockingAnalysis.exitDevice?.recommended ? 1 : 0)
    + (lockingAnalysis.electricStrike?.recommended ? 1 : 0)
    + (lockingAnalysis.magneticLock?.recommended ? 1 : 0)
    + accessControlAnalysis.components.filter(c => c.required).length;

  return {
    placements: identifiedHinges,
    hingeAnalysis: {
      estimatedSize: hingeSize.sizeInches,
      estimatedSizeMM: hingeSize.sizeMM,
      estimatedWeight: `${doorWeight.weightLbs} lbs`,
      doorWeightClass: doorWeight.weightClass,
      hingeWeightClass,
      hingeType: hingeSize.type,
      hingeMountType: mountTypeResult.mountType,
      hingeMountTypeReason: mountTypeResult.mountTypeReason,
      isSwaged: mountTypeResult.isSwaged,
      swageReason: mountTypeResult.swageReason,
      bearingType: recommendedBearing,
      recommendedGrade,
      fireRatingRequired,
      count: hingeCount,
      countReason: hingeCountReason,
      cornerType: corner.type,
      cornerTypeReason: corner.reason,
      handing: handing.handing,
      handingConfidence: handing.confidence,
      securityFeatures: security.features,
      securityNotes: security.notes,
      electrifiedOption: electrified.electrified,
      electrifiedNotes: electrified.notes,
      hingeClearance,
      placements: hingePlacementDetails,
      knuckleDimensions: knuckleDims,
    },
    locksetAnalysis: {
      estimatedFunction: "Storeroom (F86) / Classroom (F84)",
      estimatedBackset: `2-3/4\" (${locksetBacksetMM}mm)`,
      estimatedBacksetMM: locksetBacksetMM,
      boreSize: `2-1/8\" (${locksetBoreMM}mm)`,
      boreSizeMM: locksetBoreMM,
      faceplateSizeMM: { width: 25, height: 203 },
    },
    closerAnalysis: {
      estimatedSize: `Size ${closerSpec.closerSize}`,
      estimatedENSize: closerSpec.enSize,
      mountType: "Surface, Regular Arm",
      recommendedCloserSize: closerSpec.closerSize,
    },
    lockingHardwareAnalysis: lockingAnalysis,
    accessControlAnalysis,
    manufacturerMatches: allManufacturerMatches.sort((a, b) => b.confidence - a.confidence).slice(0, 25),
    summary: {
      totalIdentified,
      highConfidenceMatches: allManufacturerMatches.filter(m => m.confidence >= 0.75).length,
      matchedManufacturers: uniqueManufacturers,
    },
  };
}

export function analyzeDualScanReveals(
  closedMetrics: ProcessedMetricsInput,
  openMetrics: ProcessedMetricsInput | null,
  closedConfidence: ConfidenceScoresInput,
  openConfidence: ConfidenceScoresInput | null
): RevealGapResult {
  const frameWidth = closedMetrics.width;
  const frameHeight = closedMetrics.height;
  const frameDepth = closedMetrics.frameDepth;

  let leafWidth: number;
  let leafHeight: number;
  let leafThickness: number;
  let leftReveal: number;
  let rightReveal: number;
  let topReveal: number;
  let undercutGap: number;
  let hingeGap: number;
  let lockGap: number;
  let headGap: number;

  if (openMetrics) {
    leftReveal = (frameWidth - (openMetrics.width || frameWidth)) / 2;
    rightReveal = leftReveal;

    if (leftReveal <= 0) {
      leftReveal = 3.2;
      rightReveal = 3.2;
    }

    headGap = 3.2;
    undercutGap = 19;
    topReveal = headGap;

    leafWidth = frameWidth - leftReveal - rightReveal;
    leafHeight = frameHeight - topReveal - undercutGap;

    const depthDiff = Math.abs(frameDepth - openMetrics.frameDepth);
    leafThickness = depthDiff > 10 ? depthDiff : 44.5;

    hingeGap = leftReveal;
    lockGap = rightReveal;
  } else {
    hingeGap = 3.2;
    lockGap = 3.2;
    headGap = 3.2;
    undercutGap = 19;

    leftReveal = 3.2;
    rightReveal = 3.2;
    topReveal = headGap;

    leafWidth = frameWidth - 6.4;
    leafHeight = frameHeight - 3.2 - 19;
    leafThickness = 44.5;
  }

  const hingeGapWithinSpec = hingeGap >= 1.6 && hingeGap <= 4.8;
  const lockGapWithinSpec = lockGap >= 1.6 && lockGap <= 6.4;
  const headGapWithinSpec = headGap >= 1.6 && headGap <= 4.8;
  const undercutWithinSpec = undercutGap >= 12.7 && undercutGap <= 25.4;

  const findings: ToleranceFinding[] = [];

  const addFinding = (field: string, valueMM: number, specMM: number, minMM: number, maxMM: number) => {
    let status: "pass" | "marginal" | "fail";
    const deviation = Math.abs(valueMM - specMM);
    const range = maxMM - minMM;

    if (valueMM >= minMM && valueMM <= maxMM) {
      if (deviation <= range * 0.25) {
        status = "pass";
      } else {
        status = "marginal";
      }
    } else {
      status = "fail";
    }

    findings.push({ field, valueMM: Math.round(valueMM * 100) / 100, specMM, status });
  };

  addFinding("hingeGap", hingeGap, 3.2, 1.6, 4.8);
  addFinding("lockGap", lockGap, 3.2, 1.6, 6.4);
  addFinding("headGap", headGap, 3.2, 1.6, 4.8);
  addFinding("undercut", undercutGap, 19, 12.7, 25.4);

  const overallWithinSpec = hingeGapWithinSpec && lockGapWithinSpec && headGapWithinSpec && undercutWithinSpec;

  const deviations = [
    Math.abs(hingeGap - 3.2),
    Math.abs(lockGap - 3.2),
    Math.abs(headGap - 3.2),
    Math.abs(undercutGap - 19),
  ];
  const maxDeviationMM = Math.max(...deviations);

  const toleranceForReveal = (valueMM: number): string => {
    if (valueMM >= 2.4 && valueMM <= 4.8) return "within tolerance";
    if (valueMM >= 1.6 && valueMM <= 6.4) return "marginal";
    return "out of tolerance";
  };

  let confidence: number;
  if (openMetrics && openConfidence) {
    confidence = (closedConfidence.overall + openConfidence.overall) / 2;
  } else {
    confidence = closedConfidence.overall * 0.7;
  }

  return {
    reveals: {
      left: {
        valueMM: Math.round(leftReveal * 100) / 100,
        valueInches: mmToFractionalInches(leftReveal),
        tolerance: toleranceForReveal(leftReveal),
      },
      right: {
        valueMM: Math.round(rightReveal * 100) / 100,
        valueInches: mmToFractionalInches(rightReveal),
        tolerance: toleranceForReveal(rightReveal),
      },
      top: {
        valueMM: Math.round(topReveal * 100) / 100,
        valueInches: mmToFractionalInches(topReveal),
        tolerance: toleranceForReveal(topReveal),
      },
    },
    gaps: {
      hingeGap: {
        valueMM: Math.round(hingeGap * 100) / 100,
        valueInches: mmToFractionalInches(hingeGap),
        withinSpec: hingeGapWithinSpec,
      },
      lockGap: {
        valueMM: Math.round(lockGap * 100) / 100,
        valueInches: mmToFractionalInches(lockGap),
        withinSpec: lockGapWithinSpec,
      },
      headGap: {
        valueMM: Math.round(headGap * 100) / 100,
        valueInches: mmToFractionalInches(headGap),
        withinSpec: headGapWithinSpec,
      },
      undercut: {
        valueMM: Math.round(undercutGap * 100) / 100,
        valueInches: mmToFractionalInches(undercutGap),
        withinSpec: undercutWithinSpec,
      },
    },
    tolerances: {
      overallWithinSpec,
      maxDeviationMM: Math.round(maxDeviationMM * 100) / 100,
      findings,
    },
    doorLeafDimensions: {
      widthMM: Math.round(leafWidth * 100) / 100,
      heightMM: Math.round(leafHeight * 100) / 100,
      thicknessMM: Math.round(leafThickness * 100) / 100,
    },
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

interface VisionKitSpec {
  type: VisionKitType;
  widthMM: number;
  heightMM: number;
  description: string;
  fireRated: boolean;
  glazingType: string;
}

const VISION_KIT_REFERENCE: VisionKitSpec[] = [
  { type: "Full Lite", widthMM: 559, heightMM: 1626, description: "Full height glass panel — maximum visibility", fireRated: true, glazingType: "Tempered Safety Glass" },
  { type: "Half Lite", widthMM: 559, heightMM: 813, description: "Upper half glass panel — standard commercial", fireRated: true, glazingType: "Tempered Safety Glass" },
  { type: "Narrow Lite", widthMM: 152, heightMM: 1626, description: "Narrow vertical glass strip — corridor/office", fireRated: true, glazingType: "Wired Glass" },
  { type: "Narrow Lite", widthMM: 76, heightMM: 1067, description: "Slim vision panel — limited visibility", fireRated: true, glazingType: "Wired Glass" },
  { type: "Sidelite", widthMM: 305, heightMM: 2032, description: "Adjacent frame-mounted glass panel", fireRated: false, glazingType: "Tempered Safety Glass" },
  { type: "Transom", widthMM: 914, heightMM: 305, description: "Horizontal glass panel above door", fireRated: false, glazingType: "Tempered Safety Glass" },
];

interface LouverSpec {
  type: LouverType;
  widthMM: number;
  heightMM: number;
  freeAreaPercent: number;
  fireRated: boolean;
  description: string;
}

const LOUVER_REFERENCE: LouverSpec[] = [
  { type: "Inverted Y-Blade", widthMM: 610, heightMM: 610, freeAreaPercent: 50, fireRated: false, description: "24\"x24\" standard ventilation louver" },
  { type: "Inverted Y-Blade", widthMM: 457, heightMM: 457, freeAreaPercent: 50, fireRated: false, description: "18\"x18\" compact ventilation louver" },
  { type: "V-Blade", widthMM: 610, heightMM: 610, freeAreaPercent: 45, fireRated: false, description: "24\"x24\" V-blade louver — weather resistant" },
  { type: "Drainable", widthMM: 610, heightMM: 610, freeAreaPercent: 40, fireRated: false, description: "24\"x24\" drainable louver — exterior/wet areas" },
  { type: "Sight-Proof", widthMM: 457, heightMM: 457, freeAreaPercent: 35, fireRated: false, description: "18\"x18\" sight-proof — privacy with airflow" },
  { type: "Fusible Link Fire", widthMM: 610, heightMM: 610, freeAreaPercent: 50, fireRated: true, description: "24\"x24\" fire-rated louver with fusible link — NFPA 80 compliant" },
  { type: "Fusible Link Fire", widthMM: 457, heightMM: 457, freeAreaPercent: 50, fireRated: true, description: "18\"x18\" fire-rated louver with fusible link" },
];

interface MouldingSpec {
  type: MouldingProfileType;
  material: string;
  widthMM: number;
  depthMM: number;
  description: string;
}

const MOULDING_REFERENCE: MouldingSpec[] = [
  { type: "Casing", material: "Steel", widthMM: 57, depthMM: 13, description: "2-1/4\" steel casing — flush with wall surface" },
  { type: "Casing", material: "Aluminum", widthMM: 76, depthMM: 10, description: "3\" aluminum casing — concealed fastener" },
  { type: "Backband", material: "Steel", widthMM: 25, depthMM: 19, description: "1\" backband — decorative frame trim overlay" },
  { type: "Stop Bead", material: "Steel", widthMM: 16, depthMM: 13, description: "5/8\" stop bead — applied door stop" },
  { type: "Glazing Bead", material: "Steel", widthMM: 10, depthMM: 10, description: "3/8\" glazing bead — lite kit retention" },
  { type: "Glazing Bead", material: "Aluminum", widthMM: 13, depthMM: 10, description: "1/2\" aluminum glazing bead — snap-in" },
  { type: "Threshold", material: "Aluminum", widthMM: 127, depthMM: 13, description: "5\" aluminum saddle threshold — ADA compliant" },
  { type: "Threshold", material: "Bronze", widthMM: 127, depthMM: 10, description: "5\" bronze threshold — high-traffic" },
  { type: "Astragal", material: "Steel", widthMM: 38, depthMM: 19, description: "1-1/2\" overlapping astragal — pair doors" },
];

export interface OpeningAnalysisOptions {
  isExterior?: boolean;
  isAccessControlled?: boolean;
  revealData?: RevealGapResult | null;
  isSwingClearRequired?: boolean;
  isCamLiftRequired?: boolean;
  isHighFrequency?: boolean;
  isCenterHung?: boolean;
  isCenterPivot?: boolean;
  isPocketPivot?: boolean;
  isArchitecturalDesign?: boolean;
  isExitDevice?: boolean;
  isMagLock?: boolean;
  hasAccessControl?: boolean;
  frameMaterialHint?: FrameMaterialType;
  doorMaterialHint?: DoorMaterialType;
  installationHint?: InstallationMethodType;
  hasVisionKit?: boolean;
  visionKitType?: VisionKitType;
  hasLouver?: boolean;
  louverType?: LouverType;
  finishHint?: string;
  colorHint?: string;
  occupancyType?: string;
  fireRating?: string;
  isPairDoor?: boolean;
  conditionAge?: number;
  existingHardwareAge?: number;
}

function determineFrameMaterial(
  metrics: ProcessedMetricsInput,
  fireRatingRequired: boolean,
  options: OpeningAnalysisOptions
): MaterialIdentification["frameMaterial"] {
  if (options.frameMaterialHint && options.frameMaterialHint !== "Unknown") {
    return {
      type: options.frameMaterialHint,
      confidence: 0.95,
      evidence: [`User specified: ${options.frameMaterialHint}`],
      gauge: options.frameMaterialHint === "Hollow Metal" ? (fireRatingRequired ? "16 gauge" : "18 gauge") : undefined,
      finish: options.finishHint || (options.frameMaterialHint === "Hollow Metal" ? "Prime Painted" : "Mill Finish"),
      manualInputRequired: false,
    };
  }

  const evidence: string[] = [];
  let type: FrameMaterialType = "Hollow Metal";
  let confidence = 0.6;
  const frameDepthInches = metrics.frameDepth / 25.4;

  if (fireRatingRequired) {
    type = "Hollow Metal";
    evidence.push("Fire-rated opening requires non-combustible frame material per NFPA 80");
    confidence += 0.15;
  }

  if (frameDepthInches >= 4.75 && frameDepthInches <= 8.75) {
    evidence.push(`Frame depth ${frameDepthInches.toFixed(1)}\" consistent with standard hollow metal frame profiles`);
    confidence += 0.05;
  } else if (frameDepthInches >= 1.5 && frameDepthInches <= 2.5) {
    type = "Aluminum";
    evidence.push(`Frame depth ${frameDepthInches.toFixed(1)}\" suggests aluminum storefront frame`);
    confidence += 0.1;
  }

  if (options.isExterior) {
    evidence.push("Exterior location favors hollow metal or aluminum for weather resistance");
    if (type === "Hollow Metal") confidence += 0.05;
  }

  const finalConfidence = Math.min(confidence, 0.95);
  const manualInputRequired = finalConfidence < CONFIDENCE_THRESHOLD;
  if (manualInputRequired) {
    type = "Unknown";
    evidence.push("Low confidence detection — manual verification required");
  }

  const gauge = type === "Hollow Metal" ? (fireRatingRequired ? "16 gauge" : "18 gauge") : undefined;
  const finish = options.finishHint || (type === "Hollow Metal" ? "Prime Painted" : type === "Aluminum" ? "Clear Anodized" : "Factory Finish");

  return { type, confidence: finalConfidence, evidence, gauge, finish, manualInputRequired };
}

function determineDoorMaterial(
  metrics: ProcessedMetricsInput,
  doorWeightLbs: number,
  fireRatingRequired: boolean,
  options: OpeningAnalysisOptions
): MaterialIdentification["doorMaterial"] {
  if (options.doorMaterialHint && options.doorMaterialHint !== "Unknown") {
    return {
      type: options.doorMaterialHint,
      confidence: 0.95,
      evidence: [`User specified: ${options.doorMaterialHint}`],
      thickness: `${Math.round(metrics.frameDepth * 0.28)}mm (${mmToFractionalInches(metrics.frameDepth * 0.28)})`,
      core: options.doorMaterialHint === "Hollow Metal" ? "Honeycomb" : options.doorMaterialHint === "Solid Core Wood" ? "Particleboard" : undefined,
      manualInputRequired: false,
    };
  }

  const evidence: string[] = [];
  let type: DoorMaterialType = "Hollow Metal";
  let confidence = 0.55;
  let core: string | undefined;
  const doorWidthInches = metrics.width / 25.4;
  const doorHeightInches = metrics.height / 25.4;

  const lbsPerSqFt = doorWeightLbs / ((doorWidthInches * doorHeightInches) / 144);

  if (lbsPerSqFt >= 6) {
    type = "Hollow Metal";
    core = "Polystyrene";
    evidence.push(`Weight density ${lbsPerSqFt.toFixed(1)} lbs/sqft consistent with hollow metal construction`);
    confidence += 0.1;
    if (fireRatingRequired) {
      core = "Mineral Core";
      evidence.push("Fire-rated application requires mineral core fill per UL 10C");
      confidence += 0.08;
    }
  } else if (lbsPerSqFt >= 3.5 && lbsPerSqFt < 6) {
    type = "Solid Core Wood";
    core = "Particleboard";
    evidence.push(`Weight density ${lbsPerSqFt.toFixed(1)} lbs/sqft consistent with solid core wood`);
    confidence += 0.08;
    if (fireRatingRequired) {
      core = "Mineral Core";
      evidence.push("Fire-rated wood door requires mineral core per UL certification");
    }
  } else if (lbsPerSqFt < 3.5) {
    type = "FRP";
    evidence.push(`Low weight density ${lbsPerSqFt.toFixed(1)} lbs/sqft suggests FRP or composite`);
    confidence += 0.05;
  }

  if (options.isExterior && type === "Solid Core Wood") {
    evidence.push("Exterior wood doors require weather-resistant veneer or FRP skin");
  }

  const finalConfidence = Math.min(confidence, 0.95);
  const manualInputRequired = finalConfidence < CONFIDENCE_THRESHOLD;
  if (manualInputRequired) {
    type = "Unknown";
    evidence.push("Low confidence detection — manual verification required");
  }

  const doorThicknessMM = 44.45;
  const thickness = `${Math.round(doorThicknessMM)}mm (1-3/4\")`;

  return { type, confidence: finalConfidence, evidence, thickness, core, manualInputRequired };
}

function determineInstallationMethod(
  metrics: ProcessedMetricsInput,
  frameMaterial: FrameMaterialType,
  fireRatingRequired: boolean,
  options: OpeningAnalysisOptions
): MaterialIdentification["installationMethod"] {
  if (options.installationHint && options.installationHint !== "Unknown") {
    return {
      type: options.installationHint,
      confidence: 0.95,
      evidence: [`User specified: ${options.installationHint}`],
      manualInputRequired: false,
    };
  }

  const evidence: string[] = [];
  let type: InstallationMethodType = "Welded";
  let confidence = 0.55;

  if (frameMaterial === "Unknown") {
    type = "Unknown";
    confidence = 0.2;
    evidence.push("Frame material unknown — cannot reliably determine installation method");
  } else if (frameMaterial === "Hollow Metal") {
    if (fireRatingRequired) {
      type = "Welded";
      evidence.push("Fire-rated hollow metal frames typically require welded construction per NFPA 80 for structural integrity");
      confidence += 0.15;
    } else {
      type = "Knock-Down";
      evidence.push("Non-fire-rated hollow metal frames commonly use knock-down (KD) assembly for field installation flexibility");
      confidence += 0.1;
    }
  } else if (frameMaterial === "Aluminum") {
    type = "Press-Fit";
    evidence.push("Aluminum storefront frames use press-fit or screw-assembled construction");
    confidence += 0.1;
  } else if (frameMaterial === "Wood") {
    type = "Knock-Down";
    evidence.push("Wood frames use field-assembled (knock-down) installation");
    confidence += 0.08;
  }

  const frameDepthInches = metrics.frameDepth / 25.4;
  if (frameDepthInches >= 4.5 && frameDepthInches <= 5.0) {
    evidence.push(`Frame depth ${frameDepthInches.toFixed(1)}\" matches standard drywall partition depth`);
    if (!fireRatingRequired && frameMaterial === "Hollow Metal") {
      type = "Drywall Slip-On";
      evidence.push("Drywall partition depth suggests slip-on frame installation");
      confidence += 0.08;
    }
  }

  const finalConfidence = Math.min(confidence, 0.95);
  const manualInputRequired = finalConfidence < CONFIDENCE_THRESHOLD;
  if (manualInputRequired && type !== "Unknown") {
    type = "Unknown";
    evidence.push("Low confidence detection — manual verification required");
  }

  return { type, confidence: finalConfidence, evidence, manualInputRequired };
}

function detectAccessories(
  metrics: ProcessedMetricsInput,
  doorWeightLbs: number,
  fireRatingRequired: boolean,
  options: OpeningAnalysisOptions
): AccessoryDetection {
  const visionKits: AccessoryItem[] = [];
  const louvers: AccessoryItem[] = [];
  const mouldingProfiles: AccessoryItem[] = [];
  const weatherstripping: AccessoryItem[] = [];

  if (options.hasVisionKit) {
    const preferredType = options.visionKitType || "Half Lite";
    const matchedKit = VISION_KIT_REFERENCE.find(v => v.type === preferredType) || VISION_KIT_REFERENCE[1];

    const kitFireRated = fireRatingRequired ? true : matchedKit.fireRated;
    const glazing = fireRatingRequired ? "Fire-Rated Wired Glass" : matchedKit.glazingType;

    const vkConfidence = 0.85;
    visionKits.push({
      type: "Vision Kit",
      subType: matchedKit.type,
      size: { widthMM: matchedKit.widthMM, heightMM: matchedKit.heightMM },
      sizeDescription: `${Math.round(matchedKit.widthMM / 25.4)}\" x ${Math.round(matchedKit.heightMM / 25.4)}\"`,
      location: matchedKit.type === "Transom" ? "Above door in frame" : "Centered in door leaf",
      fireRated: kitFireRated,
      glazingType: glazing,
      confidence: vkConfidence,
      notes: matchedKit.description,
      manualInputRequired: vkConfidence < CONFIDENCE_THRESHOLD,
    });

    if (visionKits.length > 0) {
      const glazingBead = MOULDING_REFERENCE.find(m => m.type === "Glazing Bead");
      if (glazingBead) {
        const gbConfidence = 0.8;
        mouldingProfiles.push({
          type: "Moulding",
          subType: "Glazing Bead",
          size: { widthMM: glazingBead.widthMM, heightMM: glazingBead.depthMM },
          sizeDescription: `${glazingBead.widthMM}mm x ${glazingBead.depthMM}mm`,
          location: "Perimeter of vision lite",
          fireRated: fireRatingRequired,
          confidence: gbConfidence,
          notes: glazingBead.description,
          manualInputRequired: gbConfidence < CONFIDENCE_THRESHOLD,
        });
      }
    }
  }

  if (options.hasLouver) {
    const preferredType = options.louverType || (fireRatingRequired ? "Fusible Link Fire" : "Inverted Y-Blade");
    const matchedLouver = LOUVER_REFERENCE.find(l => l.type === preferredType) || LOUVER_REFERENCE[0];

    const lvConfidence = 0.8;
    louvers.push({
      type: "Louver",
      subType: matchedLouver.type,
      size: { widthMM: matchedLouver.widthMM, heightMM: matchedLouver.heightMM },
      sizeDescription: `${Math.round(matchedLouver.widthMM / 25.4)}\" x ${Math.round(matchedLouver.heightMM / 25.4)}\"`,
      location: "Lower third of door leaf",
      fireRated: matchedLouver.fireRated,
      confidence: lvConfidence,
      notes: `${matchedLouver.description} — ${matchedLouver.freeAreaPercent}% free area`,
      manualInputRequired: lvConfidence < CONFIDENCE_THRESHOLD,
    });
  }

  if (options.isExterior) {
    const threshold = MOULDING_REFERENCE.find(m => m.type === "Threshold" && m.material === "Aluminum");
    if (threshold) {
      const thConfidence = 0.75;
      mouldingProfiles.push({
        type: "Moulding",
        subType: "Threshold",
        size: { widthMM: threshold.widthMM, heightMM: threshold.depthMM },
        sizeDescription: `${Math.round(threshold.widthMM / 25.4)}\" wide x ${threshold.depthMM}mm high`,
        location: "Floor at door opening base",
        fireRated: false,
        confidence: thConfidence,
        notes: `${threshold.description} — maximum 1/2\" height for ADA compliance`,
        manualInputRequired: thConfidence < CONFIDENCE_THRESHOLD,
      });
    }

    const wsConfidence = 0.7;
    weatherstripping.push({
      type: "Weatherstrip",
      subType: "Compression Seal",
      size: null,
      sizeDescription: "Full perimeter — head, jambs, and meeting stile",
      location: "Frame rabbet perimeter",
      fireRated: false,
      confidence: wsConfidence,
      notes: "Exterior opening requires perimeter weatherstripping for thermal and moisture performance",
      manualInputRequired: wsConfidence < CONFIDENCE_THRESHOLD,
    });
  }

  if (options.isPairDoor) {
    const astragal = MOULDING_REFERENCE.find(m => m.type === "Astragal");
    if (astragal) {
      const asConfidence = 0.8;
      mouldingProfiles.push({
        type: "Moulding",
        subType: "Astragal",
        size: { widthMM: astragal.widthMM, heightMM: astragal.depthMM },
        sizeDescription: `${astragal.widthMM}mm x ${astragal.depthMM}mm`,
        location: "Active leaf meeting stile — overlapping inactive leaf",
        fireRated: fireRatingRequired,
        confidence: asConfidence,
        notes: astragal.description,
        manualInputRequired: asConfidence < CONFIDENCE_THRESHOLD,
      });
    }
  }

  const smokeSealRequired = fireRatingRequired;
  const smokeSeal = {
    required: smokeSealRequired,
    type: smokeSealRequired ? "Intumescent Smoke Seal" : "None",
    reason: smokeSealRequired
      ? "Fire-rated door requires intumescent smoke seal at head, jambs, and meeting stile per NFPA 80 / IBC 716"
      : "Smoke seal not required for non-rated opening",
    manualInputRequired: false,
  };

  const thresholdType = {
    type: options.isExterior ? "Saddle Threshold" : (fireRatingRequired ? "Fire-Rated Threshold" : "None"),
    reason: options.isExterior
      ? "Exterior opening requires ADA-compliant saddle threshold with maximum 1/2\" height"
      : fireRatingRequired
        ? "Fire-rated opening requires threshold to maintain required undercut gap per NFPA 80"
        : "Interior non-rated opening — threshold optional per design requirements",
    adaCompliant: true,
    manualInputRequired: false,
  };

  const lowConfidenceItems = [...visionKits, ...louvers, ...mouldingProfiles, ...weatherstripping].filter(item => item.confidence < CONFIDENCE_THRESHOLD);
  const manualInputRequired = lowConfidenceItems.length > 0;

  return { visionKits, louvers, mouldingProfiles, weatherstripping, smokeSeal, thresholdType, manualInputRequired };
}

function determineEnhancedRevealDetails(
  metrics: ProcessedMetricsInput,
  fireRatingRequired: boolean,
  frameMaterial: FrameMaterialType,
  options: OpeningAnalysisOptions
): EnhancedRevealDetails {
  const frameDepthInches = metrics.frameDepth / 25.4;
  const throatDepthMM = metrics.frameDepth;

  let profileType: FrameProfileType = "Single Rabbet";
  let profileReason = "Standard single rabbet profile — single stop for single-acting swing";

  if (options.isPairDoor) {
    profileType = "Double Rabbet";
    profileReason = "Pair door opening requires double rabbet profile to accommodate two door leaves with opposing stops";
  } else if (frameDepthInches >= 4.5 && frameDepthInches <= 5.0 && frameMaterial === "Hollow Metal" && !fireRatingRequired) {
    profileType = "Drywall";
    profileReason = `Frame depth ${frameDepthInches.toFixed(1)}\" matches drywall partition — wrap-around drywall profile`;
  }

  const rabbetDepthMM = frameMaterial === "Hollow Metal" ? 12.7 : frameMaterial === "Aluminum" ? 9.5 : 12.7;

  let stopTypeValue: StopType = "Integral";
  let stopReason = "Integral stop — formed as part of frame profile for maximum security and fire performance";
  let removable = false;

  if (frameMaterial === "Wood") {
    stopTypeValue = "Applied";
    stopReason = "Applied stop — nailed or screwed to wood frame rabbets";
    removable = true;
  } else if (!fireRatingRequired && frameMaterial === "Hollow Metal") {
    stopTypeValue = "Integral";
    stopReason = "Integral stop formed in hollow metal frame — standard commercial construction";
  }

  const glazingBeadRequired = options.hasVisionKit || false;
  const glazingBead = {
    required: glazingBeadRequired,
    type: glazingBeadRequired ? (fireRatingRequired ? "Fire-Rated Snap-In Glazing Bead" : "Standard Snap-In Glazing Bead") : "N/A",
    reason: glazingBeadRequired
      ? "Vision lite requires glazing bead retention system for glass panel security"
      : "No vision lite — glazing bead not required",
  };

  const perimeterSealRequired = fireRatingRequired || options.isExterior || false;
  const perimeterSeal = {
    type: fireRatingRequired ? "Intumescent + Smoke Gasket" : options.isExterior ? "EPDM Weatherseal" : "None",
    required: perimeterSealRequired,
    reason: fireRatingRequired
      ? "Fire-rated opening requires intumescent seal and smoke gasket at frame perimeter per NFPA 80"
      : options.isExterior
        ? "Exterior opening requires EPDM perimeter seal for weather and thermal performance"
        : "Interior non-rated opening — perimeter seal optional",
  };

  const frameProfileManual = frameMaterial === "Unknown";
  const stopTypeManual = frameMaterial === "Unknown";
  const overallManual = frameProfileManual || stopTypeManual;

  return {
    frameProfile: {
      type: frameProfileManual ? "Unknown" as FrameProfileType : profileType,
      throatDepthMM: Math.round(throatDepthMM * 100) / 100,
      throatDepthInches: mmToFractionalInches(throatDepthMM),
      rabbetDepthMM: Math.round(rabbetDepthMM * 100) / 100,
      rabbetDepthInches: mmToFractionalInches(rabbetDepthMM),
      reason: frameProfileManual ? "Frame material unknown — frame profile requires manual verification" : profileReason,
      manualInputRequired: frameProfileManual,
    },
    stopType: { type: stopTypeManual ? "None" as StopType : stopTypeValue, reason: stopTypeManual ? "Frame material unknown — stop type requires manual verification" : stopReason, removable, manualInputRequired: stopTypeManual },
    glazingBead,
    perimeterSeal,
    manualInputRequired: overallManual,
  };
}

function assessCondition(
  metrics: ProcessedMetricsInput,
  doorWeightLbs: number,
  fireRatingRequired: boolean,
  frameMaterial: FrameMaterialType,
  doorMaterial: DoorMaterialType,
  revealData: RevealGapResult | null,
  options: OpeningAnalysisOptions
): ConditionAssessment {
  const complianceGaps: ComplianceGap[] = [];
  const recommendedUpgrades: UpgradeRecommendation[] = [];
  const frameNotes: string[] = [];
  const doorNotes: string[] = [];
  const hwNotes: string[] = [];

  let frameRating = "Good" as ConditionRating;
  let doorRating = "Good" as ConditionRating;
  let hwRating = "Good" as ConditionRating;

  const doorHeightInches = metrics.height / 25.4;
  const doorWidthInches = metrics.width / 25.4;

  if (revealData) {
    const { tolerances, gaps, reveals } = revealData;

    if (!tolerances.overallWithinSpec) {
      const failCount = tolerances.findings.filter(f => f.status === "fail").length;
      if (failCount >= 2) {
        frameRating = "Poor";
        frameNotes.push(`${failCount} tolerance measurements out of specification — potential frame distortion or settlement`);
      } else {
        frameRating = "Fair";
        frameNotes.push("Minor tolerance deviations detected — monitoring recommended");
      }
    }

    if (!gaps.hingeGap.withinSpec || !gaps.lockGap.withinSpec) {
      complianceGaps.push({
        code: "NFPA 80",
        section: "6.3.1.7",
        requirement: "Clearance between door and frame shall not exceed 1/8\" (3.2mm) ± 1/16\" along hinge and lock edges",
        currentStatus: `Hinge gap: ${gaps.hingeGap.valueMM}mm, Lock gap: ${gaps.lockGap.valueMM}mm`,
        severity: fireRatingRequired ? "Critical" : "Medium",
        recommendation: fireRatingRequired
          ? "Fire-rated door gaps exceed NFPA 80 limits — rehang door or replace frame to restore fire-rating"
          : "Gaps exceed recommended tolerances — adjust hardware or replace weatherstripping",
      });
    }

    if (!gaps.undercut.withinSpec) {
      complianceGaps.push({
        code: "NFPA 80",
        section: "6.3.1.7",
        requirement: "Maximum undercut for fire-rated doors: 3/4\" (19mm)",
        currentStatus: `Undercut: ${gaps.undercut.valueMM}mm (${gaps.undercut.valueInches})`,
        severity: fireRatingRequired ? "Critical" : "Low",
        recommendation: "Excessive undercut may require door bottom seal or replacement to maintain fire rating",
      });
    }

    const leftRevealMM = reveals.left.valueMM;
    const rightRevealMM = reveals.right.valueMM;
    const revealDiff = Math.abs(leftRevealMM - rightRevealMM);
    if (revealDiff > 3.2) {
      frameNotes.push(`Reveal asymmetry: ${revealDiff.toFixed(1)}mm difference between hinge and lock sides — possible frame racking`);
      if (revealDiff > 6.4) {
        frameRating = "Poor";
        recommendedUpgrades.push({
          component: "Frame",
          currentCondition: "Poor",
          issue: `Reveal asymmetry of ${revealDiff.toFixed(1)}mm exceeds 1/4\" tolerance`,
          recommendation: "Frame realignment or replacement required to restore proper clearances and hardware operation",
          priority: "High",
          estimatedImpact: "Restores proper door operation, hardware function, and fire-rating compliance",
          codeReference: "NFPA 80 Section 6.3",
        });
      }
    }
  }

  if (fireRatingRequired) {
    if (frameMaterial === "Wood") {
      complianceGaps.push({
        code: "IBC",
        section: "716.5.3",
        requirement: "Fire-rated door assemblies require non-combustible or rated frames",
        currentStatus: `Current frame material: ${frameMaterial}`,
        severity: "Critical",
        recommendation: "Replace wood frame with fire-rated hollow metal frame to achieve required fire rating",
      });
    }

    if (doorMaterial === "FRP") {
      complianceGaps.push({
        code: "UL 10C",
        section: "Requirements",
        requirement: "Door leaf must be tested and labeled as fire-rated assembly",
        currentStatus: `Current door material: ${doorMaterial} — verify fire-rating label`,
        severity: "High",
        recommendation: "Verify FRP door carries appropriate UL fire-rating label or replace with certified fire-rated assembly",
      });
    }
  }

  if (doorWidthInches < 32 && !options.isPairDoor) {
    complianceGaps.push({
      code: "ADA/ANSI A117.1",
      section: "404.2.3",
      requirement: "Minimum clear opening width: 32\" (when door open 90°)",
      currentStatus: `Door width: ${doorWidthInches.toFixed(1)}\" — may not provide 32\" clear width`,
      severity: "High",
      recommendation: "Replace with wider door or modify frame to achieve 32\" minimum clear opening per ADA requirements",
    });
  }

  if (doorHeightInches < 80) {
    complianceGaps.push({
      code: "IBC",
      section: "1010.1.1",
      requirement: "Minimum door height: 80\" (6'-8\")",
      currentStatus: `Door height: ${doorHeightInches.toFixed(1)}\"`,
      severity: "High",
      recommendation: "Door does not meet minimum height requirement — may require enlargement or variance",
    });
  }

  if (options.isExterior && doorMaterial === "Solid Core Wood" && !(options.finishHint?.toLowerCase().includes("frp") || options.finishHint?.toLowerCase().includes("fiberglass"))) {
    recommendedUpgrades.push({
      component: "Door Leaf",
      currentCondition: "Fair",
      issue: "Solid core wood door in exterior application without weather-resistant veneer",
      recommendation: "Apply FRP skin overlay, exterior-grade veneer, or replace with hollow metal/FRP door for weather resistance",
      priority: "Medium",
      estimatedImpact: "Extends door service life, prevents moisture damage, delamination, and warping",
    });
  }

  if (options.isHighFrequency && doorWeightLbs > 300) {
    recommendedUpgrades.push({
      component: "Hinges",
      currentCondition: "Fair",
      issue: `High-frequency opening with ${doorWeightLbs} lb door — accelerated hinge wear expected`,
      recommendation: "Upgrade to full continuous hinge for even load distribution and elimination of hinge sag",
      priority: "High",
      estimatedImpact: "Reduces maintenance frequency, prevents door sagging and binding, extends service life by 5-10 years",
      codeReference: "ANSI/BHMA A156.26",
    });
  }

  if (options.conditionAge && options.conditionAge > 20) {
    recommendedUpgrades.push({
      component: "Closer",
      currentCondition: "Poor",
      issue: `Opening age estimated at ${options.conditionAge} years — closer likely past service life`,
      recommendation: "Replace closer with current ANSI/BHMA A156.4 Grade 1 unit for reliable operation and code compliance",
      priority: "Medium",
      estimatedImpact: "Restores consistent closing speed, latching, and ADA-compliant opening force",
    });
  }

  if (options.existingHardwareAge && options.existingHardwareAge > 15) {
    hwRating = "Fair";
    hwNotes.push(`Hardware age ~${options.existingHardwareAge} years — approaching end of typical service life`);
    recommendedUpgrades.push({
      component: "Lockset",
      currentCondition: "Fair",
      issue: `Lockset age ~${options.existingHardwareAge} years — mechanical wear likely affecting function`,
      recommendation: "Replace with current ANSI/BHMA A156.2 Grade 1 lockset matching existing function and backset",
      priority: "Medium",
      estimatedImpact: "Restores reliable latching, improves key operation, and ensures ADA-compliant lever force",
    });
  }

  if (options.isAccessControlled && !options.hasAccessControl) {
    recommendedUpgrades.push({
      component: "Access Control",
      currentCondition: "Fair",
      issue: "Opening designated for access control but no electronic security components detected",
      recommendation: "Add card reader, electric strike or mag lock, request-to-exit sensor, and door position switch",
      priority: "High",
      estimatedImpact: "Enables electronic access control per security requirements",
      codeReference: "NFPA 101 7.2.1.5.5",
    });
  }

  if (frameNotes.length === 0) frameNotes.push("Frame appears within normal tolerances based on scan data");
  if (doorNotes.length === 0) doorNotes.push("Door leaf dimensions within standard commercial specifications");
  if (hwNotes.length === 0) hwNotes.push("Hardware positions consistent with industry standard placements");

  const frameManual = frameMaterial === "Unknown" || !revealData;
  const doorManual = doorMaterial === "Unknown";
  const hwManual = !revealData && !options.existingHardwareAge;

  if (frameManual) {
    frameRating = "Good";
    frameNotes.push("Frame material unknown — condition rating requires on-site verification");
  }
  if (doorManual) {
    doorRating = "Good";
    doorNotes.push("Door material unknown — condition rating requires on-site verification");
  }

  const overallRating: ConditionRating =
    frameRating === "Replace" || doorRating === "Replace" || hwRating === "Replace" ? "Replace" :
    frameRating === "Poor" || doorRating === "Poor" || hwRating === "Poor" ? "Poor" :
    frameRating === "Fair" || doorRating === "Fair" || hwRating === "Fair" ? "Fair" : "Good";

  const manualInputRequired = frameManual || doorManual || hwManual;

  return {
    frameCondition: { rating: frameRating, notes: frameNotes, manualInputRequired: frameManual },
    doorCondition: { rating: doorRating, notes: doorNotes, manualInputRequired: doorManual },
    hardwareCondition: { rating: hwRating, notes: hwNotes, manualInputRequired: hwManual },
    overallRating,
    complianceGaps,
    recommendedUpgrades,
    manualInputRequired,
  };
}

export function analyzeOpening(
  metrics: ProcessedMetricsInput,
  confidenceScores: ConfidenceScoresInput,
  existingPlacements?: HardwareMeasurementResult,
  options?: OpeningAnalysisOptions
): OpeningAnalysisResult {
  const opts: OpeningAnalysisOptions = options || {};

  const hardwareIdentification = identifyHardware(metrics, confidenceScores, existingPlacements, {
    isExterior: opts.isExterior,
    isAccessControlled: opts.isAccessControlled,
    revealData: opts.revealData,
    isSwingClearRequired: opts.isSwingClearRequired,
    isCamLiftRequired: opts.isCamLiftRequired,
    isHighFrequency: opts.isHighFrequency,
    isCenterHung: opts.isCenterHung,
    isCenterPivot: opts.isCenterPivot,
    isPocketPivot: opts.isPocketPivot,
    isArchitecturalDesign: opts.isArchitecturalDesign,
    isExitDevice: opts.isExitDevice,
    isMagLock: opts.isMagLock,
    hasAccessControl: opts.hasAccessControl,
  });

  const doorWeight = estimateDoorWeight(metrics.width, metrics.height, metrics.frameDepth);
  const fireRatingRequired = metrics.height > 2032;

  const frameMat = determineFrameMaterial(metrics, fireRatingRequired, opts);
  const doorMat = determineDoorMaterial(metrics, doorWeight.weightLbs, fireRatingRequired, opts);
  const installMethod = determineInstallationMethod(metrics, frameMat.type, fireRatingRequired, opts);

  const veneerFinishConfidence = opts.finishHint ? 0.85 : 0.4;
  const veneerFinish = {
    detected: !!(opts.finishHint),
    type: veneerFinishConfidence < CONFIDENCE_THRESHOLD && !opts.finishHint ? "Unknown" : (opts.finishHint || "Standard Factory"),
    material: frameMat.type === "Unknown" ? "Unknown" : frameMat.type === "Hollow Metal" ? "Powder Coat" : frameMat.type === "Wood" ? "Wood Veneer" : "Factory Applied",
    confidence: veneerFinishConfidence,
    manualInputRequired: veneerFinishConfidence < CONFIDENCE_THRESHOLD,
  };

  const colorConfidence = opts.colorHint ? 0.9 : 0.3;
  const color = {
    detected: !!(opts.colorHint),
    value: colorConfidence < CONFIDENCE_THRESHOLD && !opts.colorHint ? "Unknown" : (opts.colorHint || "Prime Coat (Field Paint Required)"),
    finish: frameMat.type === "Unknown" ? "Unknown" : frameMat.type === "Hollow Metal" ? "Baked Enamel" : frameMat.type === "Aluminum" ? "Anodized" : "Field Applied",
    confidence: colorConfidence,
    manualInputRequired: colorConfidence < CONFIDENCE_THRESHOLD,
  };

  const materialIdentification: MaterialIdentification = {
    frameMaterial: frameMat,
    doorMaterial: doorMat,
    installationMethod: installMethod,
    veneerFinish,
    color,
  };

  const accessoryDetection = detectAccessories(metrics, doorWeight.weightLbs, fireRatingRequired, opts);
  const enhancedRevealDetails = determineEnhancedRevealDetails(metrics, fireRatingRequired, frameMat.type, opts);
  const conditionAssessment = assessCondition(
    metrics, doorWeight.weightLbs, fireRatingRequired, frameMat.type, doorMat.type, opts.revealData || null, opts
  );

  return {
    hardwareIdentification,
    materialIdentification,
    accessoryDetection,
    enhancedRevealDetails,
    conditionAssessment,
  };
}
