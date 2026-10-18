import { ARMeasurementSession, calculateDistance, detectDeviceCapabilities, type DeviceCapabilities, type DepthInfo } from "./ar-measurement";
import type { Dim } from "../../../shared/scan-types";
import * as THREE from "three";

export interface ScanTelemetry {
  distance: number;
  angle: number;
  pointDensity: number;
  frameRate: number;
  driftEstimate: number;
  confidenceMap: Float32Array;
  coverageZones: boolean[];
  timestamp: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export interface PointCloudResult {
  points: Point3D[];
  confidence: number[];
  timestamp: number;
  resolution: { width: number; height: number };
}

export interface ZoneCoverage {
  zoneId: number;
  zoneName: string;
  covered: boolean;
  pointCount: number;
  minRequired: number;
  averageConfidence: number;
}

export interface DoorScanConfig {
  targetDistanceMin: number;
  targetDistanceMax: number;
  targetFrameRate: number;
  minPointDensity: number;
  depthConfidenceThreshold: number;
  gridResolution: { width: number; height: number };
}

export interface DepthPlatformApi {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  capturePhoto: () => Promise<string>;
  ensureScale: () => Promise<{ scaleOk: boolean }>;
  measureBetween: (a: string, b: string) => Promise<Dim>;
  measureEdgeSeries: (edge: string) => Promise<Dim>;
  getQuality: () => Promise<{ coveragePct: number; qualityScore: number; confidence?: number }>;
  
  getTelemetry: () => Promise<ScanTelemetry>;
  capturePointCloud: () => Promise<PointCloudResult>;
  getZoneCoverage: () => boolean[];
  configureForDoorScan: () => Promise<void>;
  getDeviceCapabilities: () => Promise<DeviceCapabilities>;
}

export interface ScanEventCallbacks {
  onTelemetryUpdate?: (telemetry: ScanTelemetry) => void;
  onCoverageChange?: (zones: boolean[]) => void;
  onQualityWarning?: (warning: string) => void;
}

interface LabeledPoint {
  label: string;
  position: THREE.Vector3;
  timestamp: number;
}

interface ZonePointData {
  points: Point3D[];
  lastUpdate: number;
}

const ZONE_NAMES = [
  "Top Left",
  "Top Center Left",
  "Top Center Right",
  "Top Right",
  "Bottom Left",
  "Bottom Center Left",
  "Bottom Center Right",
  "Bottom Right",
];

const DEFAULT_DOOR_SCAN_CONFIG: DoorScanConfig = {
  targetDistanceMin: 1.5,
  targetDistanceMax: 2.0,
  targetFrameRate: 60,
  minPointDensity: 50000,
  depthConfidenceThreshold: 0.7,
  gridResolution: { width: 100, height: 100 },
};

export class WebXRDepthAdapter implements DepthPlatformApi {
  private session: ARMeasurementSession | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private labeledPoints: Map<string, LabeledPoint> = new Map();
  private scaleCalibrated: boolean = false;
  private coveragePct: number = 0;
  private qualityScore: number = 0;
  private confidenceScore: number = 0;

  private deviceCapabilities: DeviceCapabilities | null = null;
  private scanConfig: DoorScanConfig = { ...DEFAULT_DOOR_SCAN_CONFIG };
  private callbacks: ScanEventCallbacks = {};
  
  private zoneData: ZonePointData[] = [];
  private coverageZones: boolean[] = [false, false, false, false, false, false, false, false];
  private telemetry: ScanTelemetry;
  
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private frameTimes: number[] = [];
  private driftAccumulator: THREE.Vector3 = new THREE.Vector3();
  private lastPosition: THREE.Vector3 | null = null;
  
  private depthBuffer: Float32Array | null = null;
  private confidenceBuffer: Float32Array | null = null;
  private telemetryUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks?: ScanEventCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks || {};
    
    this.telemetry = this.createEmptyTelemetry();
    
    this.zoneData = Array(8).fill(null).map(() => ({
      points: [],
      lastUpdate: 0,
    }));
  }

  private createEmptyTelemetry(): ScanTelemetry {
    return {
      distance: 0,
      angle: 0,
      pointDensity: 0,
      frameRate: 0,
      driftEstimate: 0,
      confidenceMap: new Float32Array(256 * 192),
      coverageZones: [false, false, false, false, false, false, false, false],
      timestamp: Date.now(),
    };
  }

  async start(): Promise<void> {
    if (!this.canvas) {
      throw new Error("Canvas not initialized");
    }

    this.deviceCapabilities = await detectDeviceCapabilities();

    this.session = new ARMeasurementSession();
    await this.session.initialize(this.canvas);
    
    this.session.setOnDepthDataCallback((depthInfo) => {
      this.processDepthData(depthInfo);
    });
    
    await this.session.start();
    
    this.labeledPoints.clear();
    this.scaleCalibrated = false;
    this.coveragePct = 0;
    this.qualityScore = 0;
    this.confidenceScore = 0;
    this.driftAccumulator.set(0, 0, 0);
    this.lastPosition = null;
    this.frameCount = 0;
    this.frameTimes = [];
    this.lastFrameTime = performance.now();
    
    this.resetZoneData();
    
    this.startTelemetryUpdates();
  }

  private startTelemetryUpdates(): void {
    this.telemetryUpdateInterval = setInterval(() => {
      this.updateTelemetry();
      
      if (this.callbacks.onTelemetryUpdate) {
        this.callbacks.onTelemetryUpdate(this.telemetry);
      }
    }, 100);
  }

  private stopTelemetryUpdates(): void {
    if (this.telemetryUpdateInterval) {
      clearInterval(this.telemetryUpdateInterval);
      this.telemetryUpdateInterval = null;
    }
  }

  private resetZoneData(): void {
    this.zoneData = Array(8).fill(null).map(() => ({
      points: [],
      lastUpdate: 0,
    }));
    this.coverageZones = [false, false, false, false, false, false, false, false];
  }

  private processDepthData(depthInfo: DepthInfo): void {
    if (!depthInfo.data) return;

    const now = performance.now();
    this.frameCount++;
    this.frameTimes.push(now);
    
    while (this.frameTimes.length > 0 && this.frameTimes[0] < now - 1000) {
      this.frameTimes.shift();
    }

    const width = depthInfo.width;
    const height = depthInfo.height;
    
    if (!this.depthBuffer || this.depthBuffer.length !== width * height) {
      this.depthBuffer = new Float32Array(width * height);
      this.confidenceBuffer = new Float32Array(width * height);
    }

    const rawData = depthInfo.data;
    const rawToMeters = depthInfo.rawValueToMeters;

    for (let i = 0; i < rawData.length; i++) {
      const depthValue = rawData[i] * rawToMeters;
      this.depthBuffer[i] = depthValue;
      
      const confidence = this.calculatePixelConfidence(depthValue);
      if (this.confidenceBuffer) {
        this.confidenceBuffer[i] = confidence;
      }
    }

    this.updateZoneCoverage(width, height);
    this.calculateDistanceAndAngle(width, height);
  }

  private calculatePixelConfidence(depth: number): number {
    if (depth <= 0 || depth > 10) return 0;
    
    const inRange = depth >= this.scanConfig.targetDistanceMin && 
                   depth <= this.scanConfig.targetDistanceMax;
    
    if (inRange) return 1.0;
    
    const distFromIdeal = Math.min(
      Math.abs(depth - this.scanConfig.targetDistanceMin),
      Math.abs(depth - this.scanConfig.targetDistanceMax)
    );
    
    return Math.max(0, 1 - (distFromIdeal / 2));
  }

  private updateZoneCoverage(width: number, height: number): void {
    if (!this.depthBuffer || !this.confidenceBuffer) return;

    const zoneWidth = width / 4;
    const zoneHeight = height / 2;
    const minPointsPerZone = Math.floor((zoneWidth * zoneHeight) * 0.3);

    const previousZones = [...this.coverageZones];
    
    for (let zoneY = 0; zoneY < 2; zoneY++) {
      for (let zoneX = 0; zoneX < 4; zoneX++) {
        const zoneIndex = zoneY * 4 + zoneX;
        let validPoints = 0;
        let totalConfidence = 0;

        for (let y = Math.floor(zoneY * zoneHeight); y < Math.floor((zoneY + 1) * zoneHeight); y++) {
          for (let x = Math.floor(zoneX * zoneWidth); x < Math.floor((zoneX + 1) * zoneWidth); x++) {
            const idx = y * width + x;
            if (this.confidenceBuffer[idx] >= this.scanConfig.depthConfidenceThreshold) {
              validPoints++;
              totalConfidence += this.confidenceBuffer[idx];
            }
          }
        }

        const isCovered = validPoints >= minPointsPerZone;
        this.coverageZones[zoneIndex] = isCovered || this.coverageZones[zoneIndex];
        
        if (isCovered) {
          this.zoneData[zoneIndex].lastUpdate = Date.now();
        }
      }
    }

    const zonesChanged = previousZones.some((val, idx) => val !== this.coverageZones[idx]);
    if (zonesChanged && this.callbacks.onCoverageChange) {
      this.callbacks.onCoverageChange([...this.coverageZones]);
    }
  }

  private calculateDistanceAndAngle(width: number, height: number): void {
    if (!this.depthBuffer) return;

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const sampleRadius = 5;

    let totalDepth = 0;
    let count = 0;

    for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
      for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = y * width + x;
          const depth = this.depthBuffer[idx];
          if (depth > 0 && depth < 10) {
            totalDepth += depth;
            count++;
          }
        }
      }
    }

    if (count > 0) {
      this.telemetry.distance = totalDepth / count;
    }

    const leftIdx = centerY * width + Math.floor(width * 0.25);
    const rightIdx = centerY * width + Math.floor(width * 0.75);
    const topIdx = Math.floor(height * 0.25) * width + centerX;
    const bottomIdx = Math.floor(height * 0.75) * width + centerX;

    const leftDepth = this.depthBuffer[leftIdx] || 0;
    const rightDepth = this.depthBuffer[rightIdx] || 0;
    const topDepth = this.depthBuffer[topIdx] || 0;
    const bottomDepth = this.depthBuffer[bottomIdx] || 0;

    const horizontalAngle = Math.atan2(rightDepth - leftDepth, width * 0.5 * 0.001) * (180 / Math.PI);
    const verticalAngle = Math.atan2(bottomDepth - topDepth, height * 0.5 * 0.001) * (180 / Math.PI);
    
    this.telemetry.angle = Math.sqrt(horizontalAngle ** 2 + verticalAngle ** 2);

    const distanceStatus = this.telemetry.distance >= this.scanConfig.targetDistanceMin &&
                          this.telemetry.distance <= this.scanConfig.targetDistanceMax;
    const angleStatus = Math.abs(this.telemetry.angle) < 25;

    if (!distanceStatus && this.callbacks.onQualityWarning) {
      const direction = this.telemetry.distance < this.scanConfig.targetDistanceMin ? "back" : "closer";
      this.callbacks.onQualityWarning(`Move ${direction} - current distance: ${this.telemetry.distance.toFixed(2)}m`);
    }

    if (!angleStatus && this.callbacks.onQualityWarning) {
      this.callbacks.onQualityWarning(`Adjust angle - current: ${this.telemetry.angle.toFixed(1)}°`);
    }
  }

  private updateTelemetry(): void {
    const now = performance.now();
    
    this.telemetry.frameRate = this.frameTimes.length;
    
    const totalPoints = this.zoneData.reduce((sum, zone) => sum + zone.points.length, 0);
    this.telemetry.pointDensity = totalPoints;
    
    this.telemetry.coverageZones = [...this.coverageZones];
    
    if (this.confidenceBuffer) {
      if (this.telemetry.confidenceMap.length !== this.confidenceBuffer.length) {
        this.telemetry.confidenceMap = new Float32Array(this.confidenceBuffer.length);
      }
      this.telemetry.confidenceMap.set(this.confidenceBuffer);
    }
    
    this.telemetry.driftEstimate = this.driftAccumulator.length() * 1000;
    
    this.telemetry.timestamp = Date.now();
  }

  async stop(): Promise<void> {
    this.stopTelemetryUpdates();
    
    if (this.session) {
      this.session.end();
      this.session = null;
    }
    this.labeledPoints.clear();
    this.depthBuffer = null;
    this.confidenceBuffer = null;
  }

  async capturePhoto(): Promise<string> {
    if (!this.canvas) {
      throw new Error("Canvas not initialized");
    }

    return new Promise((resolve, reject) => {
      try {
        this.canvas!.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to capture photo"));
            return;
          }
          
          const url = URL.createObjectURL(blob);
          resolve(url);
        }, "image/png");
      } catch (error) {
        reject(error);
      }
    });
  }

  async ensureScale(): Promise<{ scaleOk: boolean }> {
    if (!this.session) {
      return { scaleOk: false };
    }

    this.scaleCalibrated = true;
    return { scaleOk: true };
  }

  async measureBetween(a: string, b: string): Promise<Dim> {
    if (!this.session) {
      throw new Error("AR session not started");
    }

    const pointA = this.labeledPoints.get(a);
    const pointB = this.labeledPoints.get(b);

    if (!pointA || !pointB) {
      const point = this.session.placePoint();
      if (!point) {
        throw new Error(`Failed to place point for ${!pointA ? a : b}`);
      }

      const labeledPoint: LabeledPoint = {
        label: !pointA ? a : b,
        position: point.position,
        timestamp: point.timestamp,
      };

      this.labeledPoints.set(labeledPoint.label, labeledPoint);

      if (!pointA || !pointB) {
        const defaultValueMm = 914;
        return {
          valueMm: defaultValueMm,
          source: "scan" as const,
          uncertainty: 5,
        };
      }
    }

    const distanceMeters = pointA.position.distanceTo(pointB.position);
    const distanceMm = distanceMeters * 1000;
    
    const uncertainty = this.calculateUncertainty(distanceMeters);
    
    this.updateQualityMetrics();

    return {
      valueMm: Math.round(distanceMm),
      source: "scan" as const,
      uncertainty: Math.round(uncertainty),
    };
  }

  async measureEdgeSeries(edge: string): Promise<Dim> {
    if (!this.session) {
      throw new Error("AR session not started");
    }

    const startLabel = `${edge}_start`;
    const endLabel = `${edge}_end`;
    
    return this.measureBetween(startLabel, endLabel);
  }

  async getQuality(): Promise<{ coveragePct: number; qualityScore: number; confidence?: number }> {
    return {
      coveragePct: this.coveragePct,
      qualityScore: this.qualityScore,
      confidence: this.confidenceScore,
    };
  }

  async getTelemetry(): Promise<ScanTelemetry> {
    return { ...this.telemetry };
  }

  async capturePointCloud(): Promise<PointCloudResult> {
    const gridWidth = this.scanConfig.gridResolution.width;
    const gridHeight = this.scanConfig.gridResolution.height;
    
    const points: Point3D[] = [];
    const confidenceValues: number[] = [];

    if (!this.depthBuffer || !this.confidenceBuffer) {
      return {
        points: [],
        confidence: [],
        timestamp: Date.now(),
        resolution: { width: gridWidth, height: gridHeight },
      };
    }

    const depthWidth = this.session?.getDepthInfo()?.width || 256;
    const depthHeight = this.session?.getDepthInfo()?.height || 192;

    const focalLengthX = depthWidth * 0.8;
    const focalLengthY = depthHeight * 0.8;
    const principalX = depthWidth / 2;
    const principalY = depthHeight / 2;

    const stepX = depthWidth / gridWidth;
    const stepY = depthHeight / gridHeight;

    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const pixelX = Math.floor(gx * stepX + stepX / 2);
        const pixelY = Math.floor(gy * stepY + stepY / 2);
        const idx = pixelY * depthWidth + pixelX;

        if (idx >= 0 && idx < this.depthBuffer.length) {
          const depth = this.depthBuffer[idx];
          const confidence = this.confidenceBuffer[idx];

          if (depth > 0 && depth < 10 && confidence >= this.scanConfig.depthConfidenceThreshold) {
            const x = ((pixelX - principalX) / focalLengthX) * depth;
            const y = ((pixelY - principalY) / focalLengthY) * depth;
            const z = depth;

            points.push({ x, y, z, confidence });
            confidenceValues.push(confidence);
          }
        }
      }
    }

    return {
      points,
      confidence: confidenceValues,
      timestamp: Date.now(),
      resolution: { width: gridWidth, height: gridHeight },
    };
  }

  getZoneCoverage(): boolean[] {
    return [...this.coverageZones];
  }

  getDetailedZoneCoverage(): ZoneCoverage[] {
    return this.coverageZones.map((covered, index) => {
      const zonePoints = this.zoneData[index]?.points || [];
      const avgConfidence = zonePoints.length > 0
        ? zonePoints.reduce((sum, p) => sum + p.confidence, 0) / zonePoints.length
        : 0;

      return {
        zoneId: index,
        zoneName: ZONE_NAMES[index],
        covered,
        pointCount: zonePoints.length,
        minRequired: Math.floor(this.scanConfig.minPointDensity / 8),
        averageConfidence: avgConfidence,
      };
    });
  }

  async configureForDoorScan(): Promise<void> {
    const capabilities = await detectDeviceCapabilities();
    this.deviceCapabilities = capabilities;

    this.scanConfig = {
      targetDistanceMin: 1.5,
      targetDistanceMax: 2.0,
      targetFrameRate: capabilities.hasLiDAR ? 60 : 30,
      minPointDensity: 50000,
      depthConfidenceThreshold: 0.7,
      gridResolution: capabilities.hasLiDAR 
        ? { width: 150, height: 150 }
        : { width: 100, height: 100 },
    };

    this.resetZoneData();
  }

  async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    if (!this.deviceCapabilities) {
      this.deviceCapabilities = await detectDeviceCapabilities();
    }
    return this.deviceCapabilities;
  }

  setCallbacks(callbacks: ScanEventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  getUncoveredZones(): number[] {
    return this.coverageZones
      .map((covered, index) => ({ covered, index }))
      .filter(z => !z.covered)
      .map(z => z.index);
  }

  getCoveragePercentage(): number {
    const coveredCount = this.coverageZones.filter(Boolean).length;
    return (coveredCount / 8) * 100;
  }

  private calculateUncertainty(distanceMeters: number): number {
    const baseUncertainty = this.deviceCapabilities?.hasLiDAR ? 1 : 2;
    const distanceFactor = distanceMeters > 2.0 ? distanceMeters * 1.5 : 1.0;
    const calibrationFactor = this.scaleCalibrated ? 1.0 : 1.5;
    
    return baseUncertainty * distanceFactor * calibrationFactor;
  }

  private updateQualityMetrics(): void {
    const pointCount = this.labeledPoints.size;
    const coveredZones = this.coverageZones.filter(Boolean).length;
    
    this.coveragePct = Math.min(100, (coveredZones / 8) * 100);
    
    const baseQuality = this.deviceCapabilities?.hasLiDAR ? 0.90 : 0.70;
    this.qualityScore = this.scaleCalibrated ? baseQuality : baseQuality - 0.15;
    
    if (pointCount >= 4) {
      this.qualityScore = Math.min(0.98, this.qualityScore + 0.02 * (pointCount - 4));
    }
    
    const baseConfidence = this.deviceCapabilities?.hasLiDAR ? 0.95 : 0.75;
    this.confidenceScore = this.scaleCalibrated ? baseConfidence : baseConfidence - 0.15;
    if (coveredZones >= 6) {
      this.confidenceScore = Math.min(0.99, this.confidenceScore + 0.01 * (coveredZones - 6));
    }
  }

  dispose(): void {
    this.stopTelemetryUpdates();
    
    if (this.session) {
      this.session.dispose();
      this.session = null;
    }
    this.labeledPoints.clear();
    this.canvas = null;
    this.depthBuffer = null;
    this.confidenceBuffer = null;
    this.deviceCapabilities = null;
    this.resetZoneData();
  }
}

export interface AdapterFactoryOpts {
  preferNative?: boolean;
  callbacks?: ScanEventCallbacks;
}

export function createAdapter(
  canvas: HTMLCanvasElement,
  opts: AdapterFactoryOpts = {}
): DepthPlatformApi {
  return new WebXRDepthAdapter(canvas, opts.callbacks);
}

export { detectDeviceCapabilities };
export type { DeviceCapabilities };
