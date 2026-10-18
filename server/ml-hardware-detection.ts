/**
 * ML-Powered Hardware Detection Module
 * Uses OpenAI Vision API to detect and classify door hardware from point cloud visualizations
 * 
 * Features:
 * - OpenAI Vision API integration for hardware classification
 * - Rate limiting and timeout handling
 * - Degenerate data protection
 * - Fallback status tracking for consumers
 */

import OpenAI from "openai";
import { logger, logError } from "./logger";
import type {
  Point3D,
  HardwarePosition,
  HardwareType,
  DetectedHardware,
  DetectedPlane,
  BoundingBox3D
} from "../shared/cad-drawing-types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL = "gpt-4o";
const ML_TIMEOUT_MS = 30000;
const MAX_SVG_SIZE_BYTES = 500000;
const MAX_POINTS_FOR_SVG = 3000;
const MIN_BOUNDING_BOX_SIZE = 0.001;

// ============================================================================
// TOKEN BUCKET RATE LIMITER
// ============================================================================

interface TokenBucket {
  tokens: number;
  maxTokens: number;
  refillRatePerSecond: number;
  lastRefillTime: number;
}

interface RateLimitConfig {
  perMinuteLimit: number;
  perHourLimit: number;
  burstLimit: number;
}

interface RateLimitState {
  bucket: TokenBucket;
  minuteCounter: { count: number; resetTime: number };
  hourCounter: { count: number; resetTime: number };
  totalCalls: number;
  rejectedCalls: number;
  lastRejectionReason: string | null;
}

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  perMinuteLimit: 10,
  perHourLimit: 100,
  burstLimit: 3
};

const rateLimitState: RateLimitState = {
  bucket: {
    tokens: RATE_LIMIT_CONFIG.burstLimit,
    maxTokens: RATE_LIMIT_CONFIG.burstLimit,
    refillRatePerSecond: RATE_LIMIT_CONFIG.burstLimit / 60,
    lastRefillTime: Date.now()
  },
  minuteCounter: { count: 0, resetTime: Date.now() + 60000 },
  hourCounter: { count: 0, resetTime: Date.now() + 3600000 },
  totalCalls: 0,
  rejectedCalls: 0,
  lastRejectionReason: null
};

function refillTokenBucket(): void {
  const now = Date.now();
  const elapsedSeconds = (now - rateLimitState.bucket.lastRefillTime) / 1000;
  const tokensToAdd = elapsedSeconds * rateLimitState.bucket.refillRatePerSecond;
  
  rateLimitState.bucket.tokens = Math.min(
    rateLimitState.bucket.maxTokens,
    rateLimitState.bucket.tokens + tokensToAdd
  );
  rateLimitState.bucket.lastRefillTime = now;
}

function resetCountersIfNeeded(): void {
  const now = Date.now();
  
  if (now >= rateLimitState.minuteCounter.resetTime) {
    rateLimitState.minuteCounter.count = 0;
    rateLimitState.minuteCounter.resetTime = now + 60000;
  }
  
  if (now >= rateLimitState.hourCounter.resetTime) {
    rateLimitState.hourCounter.count = 0;
    rateLimitState.hourCounter.resetTime = now + 3600000;
  }
}

interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  waitTimeMs?: number;
  stats: {
    tokensRemaining: number;
    minuteCount: number;
    hourCount: number;
  };
}

function tryAcquireRateLimitToken(): RateLimitCheckResult {
  refillTokenBucket();
  resetCountersIfNeeded();
  
  const stats = {
    tokensRemaining: Math.floor(rateLimitState.bucket.tokens),
    minuteCount: rateLimitState.minuteCounter.count,
    hourCount: rateLimitState.hourCounter.count
  };
  
  if (rateLimitState.hourCounter.count >= RATE_LIMIT_CONFIG.perHourLimit) {
    const waitTime = rateLimitState.hourCounter.resetTime - Date.now();
    return {
      allowed: false,
      reason: `Hourly limit exceeded (${RATE_LIMIT_CONFIG.perHourLimit}/hour)`,
      waitTimeMs: waitTime,
      stats
    };
  }
  
  if (rateLimitState.minuteCounter.count >= RATE_LIMIT_CONFIG.perMinuteLimit) {
    const waitTime = rateLimitState.minuteCounter.resetTime - Date.now();
    return {
      allowed: false,
      reason: `Minute limit exceeded (${RATE_LIMIT_CONFIG.perMinuteLimit}/minute)`,
      waitTimeMs: waitTime,
      stats
    };
  }
  
  if (rateLimitState.bucket.tokens < 1) {
    const tokensNeeded = 1 - rateLimitState.bucket.tokens;
    const waitTime = (tokensNeeded / rateLimitState.bucket.refillRatePerSecond) * 1000;
    return {
      allowed: false,
      reason: "Burst limit exceeded, throttling",
      waitTimeMs: waitTime,
      stats
    };
  }
  
  rateLimitState.bucket.tokens -= 1;
  rateLimitState.minuteCounter.count += 1;
  rateLimitState.hourCounter.count += 1;
  rateLimitState.totalCalls += 1;
  
  return { 
    allowed: true, 
    stats: {
      tokensRemaining: Math.floor(rateLimitState.bucket.tokens),
      minuteCount: rateLimitState.minuteCounter.count,
      hourCount: rateLimitState.hourCounter.count
    }
  };
}

function recordRateLimitRejection(reason: string, waitTimeMs?: number): void {
  rateLimitState.rejectedCalls += 1;
  rateLimitState.lastRejectionReason = reason;
  
  logger.info("ML rate limit: request rejected", {
    reason,
    waitTimeMs: waitTimeMs ?? null,
    retryAfterSeconds: waitTimeMs ? Math.ceil(waitTimeMs / 1000) : null,
    totalCalls: rateLimitState.totalCalls,
    rejectedCalls: rateLimitState.rejectedCalls,
    tokensRemaining: Math.floor(rateLimitState.bucket.tokens),
    minuteCount: rateLimitState.minuteCounter.count,
    hourCount: rateLimitState.hourCounter.count
  });
}

export function getRateLimitStats(): {
  totalCalls: number;
  rejectedCalls: number;
  tokensRemaining: number;
  minuteCount: number;
  hourCount: number;
  config: RateLimitConfig;
} {
  refillTokenBucket();
  resetCountersIfNeeded();
  
  return {
    totalCalls: rateLimitState.totalCalls,
    rejectedCalls: rateLimitState.rejectedCalls,
    tokensRemaining: Math.floor(rateLimitState.bucket.tokens),
    minuteCount: rateLimitState.minuteCounter.count,
    hourCount: rateLimitState.hourCounter.count,
    config: RATE_LIMIT_CONFIG
  };
}

// ============================================================================
// ML SERVICE CONFIGURATION
// ============================================================================

interface MLServiceConfig {
  enabled: boolean;
  client: OpenAI | null;
  lastCallTime: number;
  errorCount: number;
  maxErrorsBeforeDisable: number;
}

const mlConfig: MLServiceConfig = {
  enabled: false,
  client: null,
  lastCallTime: 0,
  errorCount: 0,
  maxErrorsBeforeDisable: 5
};

function initializeMLClient(): boolean {
  if (mlConfig.client) return true;
  
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  
  if (!apiKey) {
    logger.warn("ML hardware detection: OPENAI_API_KEY not configured");
    mlConfig.enabled = false;
    return false;
  }
  
  try {
    mlConfig.client = new OpenAI({
      baseURL: baseURL || undefined,
      apiKey,
      timeout: ML_TIMEOUT_MS,
    });
    mlConfig.enabled = true;
    logger.info("ML hardware detection: OpenAI client initialized");
    return true;
  } catch (error) {
    logError(error as Error, { context: "ml-client-init" });
    mlConfig.enabled = false;
    return false;
  }
}

function getMLClient(): OpenAI | null {
  if (!mlConfig.enabled && mlConfig.errorCount < mlConfig.maxErrorsBeforeDisable) {
    initializeMLClient();
  }
  return mlConfig.client;
}

function recordMLError(): void {
  mlConfig.errorCount++;
  if (mlConfig.errorCount >= mlConfig.maxErrorsBeforeDisable) {
    logger.warn("ML hardware detection: Too many errors, disabling service", {
      errorCount: mlConfig.errorCount
    });
    mlConfig.enabled = false;
  }
}

function resetMLErrors(): void {
  mlConfig.errorCount = 0;
}

type MLStatus = "success" | "unavailable" | "render_failed" | "api_error" | "rate_limited" | "timeout";

interface MLHardwareDetectionResult {
  hardwareItems: MLDetectedHardwareItem[];
  confidence: number;
  processingNotes: string[];
  mlStatus?: MLStatus;
}

interface MLDetectedHardwareItem {
  type: HardwareType;
  subType?: string;
  estimatedPosition: {
    x: number;
    y: number;
    z: number;
  };
  heightFromFloor: number;
  distanceFromEdge: number;
  side: "ingress" | "egress";
  confidence: number;
  description: string;
  manufacturer?: string;
  model?: string;
}

interface PointCloudRenderOptions {
  viewAngle: "front" | "back" | "top" | "side-left" | "side-right";
  width: number;
  height: number;
  backgroundColor: string;
  pointColor: string;
  pointSize: number;
  showGrid: boolean;
  showAxes: boolean;
  showDimensions: boolean;
}

const DEFAULT_RENDER_OPTIONS: PointCloudRenderOptions = {
  viewAngle: "front",
  width: 1024,
  height: 768,
  backgroundColor: "#1a1a1a",
  pointColor: "#4a90d9",
  pointSize: 2,
  showGrid: true,
  showAxes: true,
  showDimensions: true
};

/**
 * Validate bounding box for degenerate cases
 */
function validateBoundingBox(boundingBox: BoundingBox3D): { valid: boolean; reason?: string } {
  if (!boundingBox || !boundingBox.min || !boundingBox.max) {
    return { valid: false, reason: "Missing bounding box data" };
  }
  
  const width = boundingBox.max.x - boundingBox.min.x;
  const height = boundingBox.max.y - boundingBox.min.y;
  const depth = boundingBox.max.z - boundingBox.min.z;
  
  if (!isFinite(width) || !isFinite(height) || !isFinite(depth)) {
    return { valid: false, reason: "Non-finite bounding box dimensions" };
  }
  
  if (width < MIN_BOUNDING_BOX_SIZE && height < MIN_BOUNDING_BOX_SIZE && depth < MIN_BOUNDING_BOX_SIZE) {
    return { valid: false, reason: "Bounding box too small (degenerate data)" };
  }
  
  return { valid: true };
}

/**
 * Render point cloud to SVG for visualization
 * Creates an orthographic projection from the specified view angle
 * Includes degenerate data protection and size limits
 */
export function renderPointCloudToSVG(
  points: Point3D[],
  boundingBox: BoundingBox3D,
  options: Partial<PointCloudRenderOptions> = {}
): { svg: string; valid: boolean; error?: string } {
  const opts = { ...DEFAULT_RENDER_OPTIONS, ...options };
  
  if (!points || points.length === 0) {
    return { svg: "", valid: false, error: "No points to render" };
  }
  
  const bboxValidation = validateBoundingBox(boundingBox);
  if (!bboxValidation.valid) {
    return { svg: "", valid: false, error: bboxValidation.reason };
  }
  
  const sampledForRendering = points.length > MAX_POINTS_FOR_SVG
    ? samplePointsUniform(points, MAX_POINTS_FOR_SVG)
    : points;
  
  const margin = 60;
  const drawWidth = opts.width - margin * 2;
  const drawHeight = opts.height - margin * 2;
  
  const projectedPoints = projectPoints(sampledForRendering, opts.viewAngle, boundingBox);
  
  if (projectedPoints.length === 0) {
    return { svg: "", valid: false, error: "No points after projection" };
  }
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of projectedPoints) {
    if (isFinite(p.x)) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
    }
    if (isFinite(p.y)) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  
  if (!isFinite(rangeX) || !isFinite(rangeY) || (rangeX < MIN_BOUNDING_BOX_SIZE && rangeY < MIN_BOUNDING_BOX_SIZE)) {
    return { svg: "", valid: false, error: "Degenerate projection range" };
  }
  
  const safeRangeX = Math.max(rangeX, MIN_BOUNDING_BOX_SIZE);
  const safeRangeY = Math.max(rangeY, MIN_BOUNDING_BOX_SIZE);
  
  const scaleX = drawWidth / safeRangeX;
  const scaleY = drawHeight / safeRangeY;
  const scale = Math.min(scaleX, scaleY) * 0.9;
  
  if (!isFinite(scale) || scale <= 0) {
    return { svg: "", valid: false, error: "Invalid scale computation" };
  }
  
  const centerX = opts.width / 2;
  const centerY = opts.height / 2;
  const dataCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}">`;
  svg += `<rect width="${opts.width}" height="${opts.height}" fill="${opts.backgroundColor}"/>`;
  
  if (opts.showGrid) {
    svg += renderGrid(opts, scale, centerX, centerY, dataCenter);
  }
  
  if (opts.showAxes) {
    svg += renderAxes(opts, scale, centerX, centerY, dataCenter, boundingBox);
  }
  
  for (const point of projectedPoints) {
    const screenX = centerX + (point.x - dataCenter.x) * scale;
    const screenY = centerY - (point.y - dataCenter.y) * scale;
    
    if (!isFinite(screenX) || !isFinite(screenY)) continue;
    if (screenX < 0 || screenX > opts.width || screenY < 0 || screenY > opts.height) continue;
    
    const depth = point.depth || 0;
    const color = getDepthColor(depth, opts.pointColor);
    
    svg += `<circle cx="${screenX.toFixed(1)}" cy="${screenY.toFixed(1)}" r="${opts.pointSize}" fill="${color}" opacity="0.8"/>`;
  }
  
  if (opts.showDimensions) {
    svg += renderDimensions(opts, scale, centerX, centerY, dataCenter, boundingBox, opts.viewAngle);
  }
  
  svg += renderViewLabel(opts, opts.viewAngle);
  svg += `</svg>`;
  
  if (svg.length > MAX_SVG_SIZE_BYTES) {
    logger.warn("SVG exceeds size limit, truncating points", {
      svgSize: svg.length,
      maxSize: MAX_SVG_SIZE_BYTES
    });
    return renderPointCloudToSVG(
      samplePointsUniform(points, Math.floor(MAX_POINTS_FOR_SVG / 2)),
      boundingBox,
      options
    );
  }
  
  return { svg, valid: true };
}

/**
 * Uniform point sampling for visualization
 */
function samplePointsUniform(points: Point3D[], targetCount: number): Point3D[] {
  if (points.length <= targetCount) return points;
  
  const step = points.length / targetCount;
  const sampled: Point3D[] = [];
  
  for (let i = 0; i < targetCount; i++) {
    sampled.push(points[Math.floor(i * step)]);
  }
  
  return sampled;
}

function projectPoints(
  points: Point3D[], 
  viewAngle: string, 
  boundingBox: BoundingBox3D
): Array<{ x: number; y: number; depth: number }> {
  return points.map(p => {
    switch (viewAngle) {
      case "front":
        return { x: p.x, y: p.y, depth: p.z };
      case "back":
        return { x: -p.x, y: p.y, depth: -p.z };
      case "top":
        return { x: p.x, y: p.z, depth: -p.y };
      case "side-left":
        return { x: p.z, y: p.y, depth: p.x };
      case "side-right":
        return { x: -p.z, y: p.y, depth: -p.x };
      default:
        return { x: p.x, y: p.y, depth: p.z };
    }
  });
}

function samplePointsForVisualization(
  points: Array<{ x: number; y: number; depth: number }>, 
  maxPoints: number
): Array<{ x: number; y: number; depth: number }> {
  if (points.length <= maxPoints) return points;
  
  const step = Math.ceil(points.length / maxPoints);
  const sampled: Array<{ x: number; y: number; depth: number }> = [];
  
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }
  
  return sampled;
}

function getDepthColor(depth: number, baseColor: string): string {
  const normalizedDepth = Math.min(1, Math.max(0, (depth + 1) / 2));
  const brightness = 0.5 + normalizedDepth * 0.5;
  
  const hex = baseColor.replace("#", "");
  const r = Math.round(parseInt(hex.slice(0, 2), 16) * brightness);
  const g = Math.round(parseInt(hex.slice(2, 4), 16) * brightness);
  const b = Math.round(parseInt(hex.slice(4, 6), 16) * brightness);
  
  return `rgb(${r},${g},${b})`;
}

function renderGrid(
  opts: PointCloudRenderOptions,
  scale: number,
  centerX: number,
  centerY: number,
  dataCenter: { x: number; y: number }
): string {
  let svg = "";
  const gridSpacing = 0.1;
  const gridColor = "#333333";
  
  for (let i = -10; i <= 10; i++) {
    const offset = i * gridSpacing * scale;
    
    svg += `<line x1="${centerX + offset}" y1="${opts.height * 0.1}" x2="${centerX + offset}" y2="${opts.height * 0.9}" stroke="${gridColor}" stroke-width="0.5" opacity="0.3"/>`;
    svg += `<line x1="${opts.width * 0.1}" y1="${centerY - offset}" x2="${opts.width * 0.9}" y2="${centerY - offset}" stroke="${gridColor}" stroke-width="0.5" opacity="0.3"/>`;
  }
  
  return svg;
}

function renderAxes(
  opts: PointCloudRenderOptions,
  scale: number,
  centerX: number,
  centerY: number,
  dataCenter: { x: number; y: number },
  boundingBox: BoundingBox3D
): string {
  let svg = "";
  const axisLength = 40;
  
  svg += `<line x1="${centerX}" y1="${centerY}" x2="${centerX + axisLength}" y2="${centerY}" stroke="#ff4444" stroke-width="2"/>`;
  svg += `<text x="${centerX + axisLength + 5}" y="${centerY + 4}" fill="#ff4444" font-size="12">X</text>`;
  
  svg += `<line x1="${centerX}" y1="${centerY}" x2="${centerX}" y2="${centerY - axisLength}" stroke="#44ff44" stroke-width="2"/>`;
  svg += `<text x="${centerX + 5}" y="${centerY - axisLength - 5}" fill="#44ff44" font-size="12">Y</text>`;
  
  return svg;
}

function renderDimensions(
  opts: PointCloudRenderOptions,
  scale: number,
  centerX: number,
  centerY: number,
  dataCenter: { x: number; y: number },
  boundingBox: BoundingBox3D,
  viewAngle: string
): string {
  let svg = "";
  let width: number, height: number;
  
  switch (viewAngle) {
    case "front":
    case "back":
      width = boundingBox.width;
      height = boundingBox.height;
      break;
    case "top":
      width = boundingBox.width;
      height = boundingBox.depth;
      break;
    case "side-left":
    case "side-right":
      width = boundingBox.depth;
      height = boundingBox.height;
      break;
    default:
      width = boundingBox.width;
      height = boundingBox.height;
  }
  
  const widthMm = Math.round(width * 1000);
  const heightMm = Math.round(height * 1000);
  
  svg += `<text x="${opts.width - 10}" y="20" fill="#888888" font-size="11" text-anchor="end">Width: ${widthMm}mm (${(widthMm / 25.4).toFixed(1)}")</text>`;
  svg += `<text x="${opts.width - 10}" y="35" fill="#888888" font-size="11" text-anchor="end">Height: ${heightMm}mm (${(heightMm / 25.4).toFixed(1)}")</text>`;
  
  return svg;
}

function renderViewLabel(opts: PointCloudRenderOptions, viewAngle: string): string {
  const labels: Record<string, string> = {
    "front": "Front View (Ingress)",
    "back": "Back View (Egress)",
    "top": "Top View (Plan)",
    "side-left": "Left Side View",
    "side-right": "Right Side View"
  };
  
  return `<text x="10" y="20" fill="#ffffff" font-size="14" font-weight="bold">${labels[viewAngle] || viewAngle}</text>`;
}

/**
 * Convert SVG to base64 data URL for OpenAI Vision
 */
function svgToBase64DataUrl(svg: string): string {
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Detect hardware using ML/AI vision analysis
 * Renders point cloud from multiple angles and uses GPT-4V to identify hardware
 * Includes rate limiting, timeout handling, and graceful fallback
 */
export async function detectHardwareWithML(
  points: Point3D[],
  boundingBox: BoundingBox3D,
  planes: DetectedPlane[]
): Promise<MLHardwareDetectionResult> {
  const client = getMLClient();
  
  if (!client) {
    return {
      hardwareItems: [],
      confidence: 0,
      processingNotes: ["ML detection unavailable: OpenAI client not configured"],
      mlStatus: "unavailable"
    };
  }
  
  const rateLimitResult = tryAcquireRateLimitToken();
  
  if (!rateLimitResult.allowed) {
    recordRateLimitRejection(
      rateLimitResult.reason || "Unknown rate limit reason",
      rateLimitResult.waitTimeMs
    );
    return {
      hardwareItems: [],
      confidence: 0,
      processingNotes: [`Rate limited: ${rateLimitResult.reason}. Try again in ${Math.ceil((rateLimitResult.waitTimeMs || 0) / 1000)}s`],
      mlStatus: "rate_limited"
    };
  }
  
  mlConfig.lastCallTime = Date.now();
  
  try {
    logger.info("Starting ML hardware detection", { 
      pointCount: points.length,
      planeCount: planes.length,
      rateLimitStats: rateLimitResult.stats
    });

    const frontView = renderPointCloudToSVG(points, boundingBox, { viewAngle: "front" });
    const sideView = renderPointCloudToSVG(points, boundingBox, { viewAngle: "side-left" });
    
    if (!frontView.valid || !sideView.valid) {
      logger.warn("ML detection: SVG rendering failed", {
        frontError: frontView.error,
        sideError: sideView.error
      });
      return {
        hardwareItems: [],
        confidence: 0,
        processingNotes: [`SVG rendering failed: ${frontView.error || sideView.error}`],
        mlStatus: "render_failed"
      };
    }
    
    const frontImageUrl = svgToBase64DataUrl(frontView.svg);
    const sideImageUrl = svgToBase64DataUrl(sideView.svg);

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert commercial door hardware surveyor analyzing LiDAR point cloud visualizations. 
Your task is to identify door hardware from the point cloud data.

Standard commercial door hardware positions:
- Hinges: Typically 3 hinges at 10", 46", and 78" from floor (254mm, 1168mm, 1981mm)
- Lockset/Lever: Typically at 36-40" from floor (914-1016mm), 2.75" backset from edge
- Deadbolt: Typically 6" above lockset (150mm above lockset)
- Door Closer: Top of door, 2-4" from top edge
- Kickplate: Bottom 6-16" of door (152-406mm)
- Push/Pull Bar: 34-48" from floor
- Panic/Exit Device: 34-48" from floor, spans width of door
- Viewer/Peephole: 54-66" from floor (for visibility)
- Threshold: At floor level, spanning door width

Look for:
1. Cylindrical protrusions near edges (hinges)
2. Box-shaped protrusions at ~40" height on lock edge (lockset)
3. Linear hardware near top (closer)
4. Flat rectangular areas near bottom (kickplate)
5. Horizontal bars (exit devices)
6. Point density variations indicating mounted hardware

Respond in JSON format with detected hardware items.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze these LiDAR point cloud views of a commercial door opening. Identify all visible hardware components.

Front View: Shows the door face with hardware positions visible
Side View: Shows the jamb/frame profile and hardware depth

For each detected hardware item, provide:
1. Type (hinge, lockset, deadbolt, closer, kickplate, panic-bar, push-bar, pull-bar, viewer, threshold, strike, junction-box, conduit)
2. Estimated position in the door coordinate system
3. Height from floor in millimeters
4. Distance from nearest edge in millimeters
5. Mounting side (ingress or egress)
6. Confidence level (0-1)
7. Brief description

Return JSON:
{
  "hardwareItems": [
    {
      "type": "hinge",
      "subType": "full-mortise",
      "estimatedPosition": {"x": -0.4, "y": 0.25, "z": 0},
      "heightFromFloor": 254,
      "distanceFromEdge": 50,
      "side": "ingress",
      "confidence": 0.85,
      "description": "Bottom hinge at standard 10 inch position"
    }
  ],
  "confidence": 0.8,
  "processingNotes": ["Good point density around hardware locations"]
}`
            },
            {
              type: "image_url",
              image_url: { url: frontImageUrl }
            },
            {
              type: "image_url",
              image_url: { url: sideImageUrl }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    resetMLErrors();
    
    logger.info("ML hardware detection complete", {
      itemsDetected: result.hardwareItems?.length || 0,
      confidence: result.confidence
    });

    return {
      hardwareItems: result.hardwareItems || [],
      confidence: result.confidence || 0.5,
      processingNotes: result.processingNotes || [],
      mlStatus: "success"
    };
  } catch (error) {
    recordMLError();
    logError(error as Error, { context: "ml-hardware-detection" });
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    let mlStatus: MLStatus = "api_error";
    
    if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
      mlStatus = "timeout";
    } else if (errorMessage.includes("rate") || errorMessage.includes("429")) {
      mlStatus = "rate_limited";
    }
    
    return {
      hardwareItems: [],
      confidence: 0,
      processingNotes: [`ML detection failed: ${errorMessage}`],
      mlStatus
    };
  }
}

/**
 * Convert ML detection results to HardwarePosition format
 */
export function convertMLResultToHardwarePositions(
  mlResult: MLHardwareDetectionResult,
  boundingBox: BoundingBox3D
): DetectedHardware {
  const hinges: HardwarePosition[] = [];
  let lock: HardwarePosition | undefined;
  let closer: HardwarePosition | undefined;
  let kickplate: HardwarePosition | undefined;
  let panic: HardwarePosition | undefined;
  let viewer: HardwarePosition | undefined;
  let strike: HardwarePosition | undefined;
  const conduit: any[] = [];

  for (const item of mlResult.hardwareItems) {
    const position: HardwarePosition = {
      type: item.type,
      centerPoint: {
        x: item.estimatedPosition.x,
        y: item.estimatedPosition.y,
        z: item.estimatedPosition.z
      },
      boundingBox: {
        min: { 
          x: item.estimatedPosition.x - 0.05, 
          y: item.estimatedPosition.y - 0.05, 
          z: item.estimatedPosition.z - 0.05 
        },
        max: { 
          x: item.estimatedPosition.x + 0.05, 
          y: item.estimatedPosition.y + 0.05, 
          z: item.estimatedPosition.z + 0.05 
        },
        width: 0.1,
        height: 0.1,
        depth: 0.1
      },
      mountingSide: item.side,
      heightFromFloor: item.heightFromFloor,
      distanceFromHingeEdge: item.distanceFromEdge,
      distanceFromLockEdge: boundingBox.width * 1000 - item.distanceFromEdge,
      confidence: item.confidence
    };

    switch (item.type) {
      case "hinge":
        hinges.push(position);
        break;
      case "lockset":
      case "deadbolt":
        if (!lock || item.confidence > (lock.confidence || 0)) {
          lock = position;
        }
        break;
      case "closer":
        closer = position;
        break;
      case "kickplate":
        kickplate = position;
        break;
      case "panic-bar":
        panic = position;
        break;
      case "viewer":
        viewer = position;
        break;
      case "strike":
        strike = position;
        break;
    }
  }

  hinges.sort((a, b) => a.heightFromFloor - b.heightFromFloor);

  return {
    hinges,
    lock,
    closer,
    kickplate,
    panic,
    viewer,
    strike,
    conduit
  };
}

export interface HybridDetectionResult {
  hardware: DetectedHardware;
  mlStatus: MLStatus;
  mlConfidence: number;
  processingNotes: string[];
}

/**
 * Enhanced hardware detection combining geometric and ML approaches
 * Returns both the detected hardware and ML status for consumer visibility
 */
export async function detectHardwareHybrid(
  points: Point3D[],
  boundingBox: BoundingBox3D,
  planes: DetectedPlane[],
  geometricHardware: DetectedHardware
): Promise<HybridDetectionResult> {
  try {
    const mlResult = await detectHardwareWithML(points, boundingBox, planes);
    
    if (mlResult.mlStatus !== "success" || mlResult.confidence < 0.3 || mlResult.hardwareItems.length === 0) {
      logger.info("ML detection unavailable or low confidence, using geometric detection only", {
        mlStatus: mlResult.mlStatus,
        confidence: mlResult.confidence
      });
      return {
        hardware: geometricHardware,
        mlStatus: mlResult.mlStatus || "api_error",
        mlConfidence: mlResult.confidence,
        processingNotes: mlResult.processingNotes
      };
    }
    
    const mlHardware = convertMLResultToHardwarePositions(mlResult, boundingBox);
    const mergedHardware = mergeHardwareDetections(geometricHardware, mlHardware);
    
    return {
      hardware: mergedHardware,
      mlStatus: "success",
      mlConfidence: mlResult.confidence,
      processingNotes: mlResult.processingNotes
    };
  } catch (error) {
    logError(error as Error, { context: "hybrid-hardware-detection" });
    return {
      hardware: geometricHardware,
      mlStatus: "api_error",
      mlConfidence: 0,
      processingNotes: ["Hybrid detection failed, using geometric only"]
    };
  }
}

/**
 * Merge geometric and ML hardware detections
 * Prefers higher confidence detections
 */
function mergeHardwareDetections(
  geometric: DetectedHardware,
  ml: DetectedHardware
): DetectedHardware {
  const mergedHinges: HardwarePosition[] = [];
  
  const allHinges = [...geometric.hinges, ...ml.hinges];
  const uniqueHeights = new Set<number>();
  
  for (const hinge of allHinges) {
    const roundedHeight = Math.round(hinge.heightFromFloor / 50) * 50;
    
    const existing = mergedHinges.find(h => 
      Math.abs(Math.round(h.heightFromFloor / 50) * 50 - roundedHeight) < 50
    );
    
    if (!existing) {
      mergedHinges.push(hinge);
      uniqueHeights.add(roundedHeight);
    } else if ((hinge.confidence || 0) > (existing.confidence || 0)) {
      const idx = mergedHinges.indexOf(existing);
      mergedHinges[idx] = hinge;
    }
  }
  
  mergedHinges.sort((a, b) => a.heightFromFloor - b.heightFromFloor);
  
  const selectBest = (geo: HardwarePosition | undefined, mlPos: HardwarePosition | undefined): HardwarePosition | undefined => {
    if (!geo && !mlPos) return undefined;
    if (!geo) return mlPos;
    if (!mlPos) return geo;
    return (mlPos.confidence || 0) > (geo.confidence || 0) ? mlPos : geo;
  };

  return {
    hinges: mergedHinges,
    lock: selectBest(geometric.lock, ml.lock),
    closer: selectBest(geometric.closer, ml.closer),
    kickplate: selectBest(geometric.kickplate, ml.kickplate),
    panic: selectBest(geometric.panic, ml.panic),
    viewer: selectBest(geometric.viewer, ml.viewer),
    strike: selectBest(geometric.strike, ml.strike),
    conduit: [...(geometric.conduit || []), ...(ml.conduit || [])]
  };
}

export {
  MLHardwareDetectionResult,
  MLDetectedHardwareItem,
  PointCloudRenderOptions,
  MLStatus
};
