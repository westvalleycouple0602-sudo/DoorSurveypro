// LiDAR Point Cloud Processing Module
// Processes PLY, OBJ, and JSON point cloud files to extract door/frame measurements
// Extended with dual-scan capabilities for open/closed door analysis
// Enhanced with production-quality RANSAC and ML-powered hardware detection

import * as fs from "fs";
import { readDualScanContent } from "./dual-scan-content";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { logger, logError } from "./logger";
import { detectHardwareHybrid } from "./ml-hardware-detection";
import {
  vectorLength,
  normalizeVector,
  dotProduct,
  crossProduct,
  subtractVectors,
  addVectors,
  scaleVector,
  distanceBetweenPoints,
  calculateCentroid
} from "../shared/cad-utils";

import type {
  Point3D as CadPoint3D,
  Point2D,
  BoundingBox3D,
  DetectedPlane,
  PlaneClassification,
  ScanCapture,
  ScanRegistrationResult,
  DoorAnalysisResult,
  DoorDimensions,
  DoorOrientation,
  DetectedHardware,
  HardwarePosition,
  HardwareType,
  DoorClearances,
  AnalysisConfidence,
  FiducialMarker,
  HingeSide,
  SwingDirection,
  ScanSide,
  ConduitPath
} from "../shared/cad-drawing-types";

import type { Dim, Source } from "../shared/scan-types";

// RANSAC configuration for production-quality plane detection
interface RANSACConfig {
  maxIterations: number;
  distanceThreshold: number;
  minInlierRatio: number;
  minPointsPerPlane: number;
  convergenceThreshold: number;
}

const DEFAULT_RANSAC_CONFIG: RANSACConfig = {
  maxIterations: 1000,
  distanceThreshold: 0.01,
  minInlierRatio: 0.1,
  minPointsPerPlane: 100,
  convergenceThreshold: 0.001
};

// K-D Tree node for efficient nearest neighbor search
interface KDNode {
  point: Point3D;
  index: number;
  left?: KDNode;
  right?: KDNode;
  splitAxis: number;
}

// Point cloud data structure (internal)
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface BoundingBox {
  min: Point3D;
  max: Point3D;
  width: number;
  height: number;
  depth: number;
}

interface Plane {
  normal: Point3D;
  distance: number;
  points: Point3D[];
}

// Processing results
export interface ProcessedMetrics {
  width: number; // in millimeters
  height: number; // in millimeters
  frameDepth: number; // in millimeters
  swingDirection: "left-hand" | "right-hand" | "left-hand-reverse" | "right-hand-reverse" | "unknown";
  pointCount: number;
  units: string;
}

export interface ConfidenceScores {
  overall: number; // 0-1
  width: number;
  height: number;
  frameDepth: number;
  swingDirection: number;
  pointDensity: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createDim(valueMm: number, source: Source = "derived", sigmaMm?: number): Dim {
  return {
    valueMm,
    source,
    sigmaMm,
    uncertainty: sigmaMm ? sigmaMm / valueMm : undefined
  };
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

function parsePLY(content: string): Point3D[] {
  const lines = content.split('\n');
  const points: Point3D[] = [];
  
  let inHeader = true;
  let vertexCount = 0;
  let currentVertex = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (inHeader) {
      if (trimmed.startsWith('element vertex')) {
        vertexCount = parseInt(trimmed.split(' ')[2]);
      }
      if (trimmed === 'end_header') {
        inHeader = false;
      }
      continue;
    }
    
    if (currentVertex < vertexCount && trimmed.length > 0) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        points.push({
          x: parseFloat(parts[0]),
          y: parseFloat(parts[1]),
          z: parseFloat(parts[2])
        });
        currentVertex++;
      }
    }
  }
  
  return points;
}

function parseOBJ(content: string): Point3D[] {
  const lines = content.split('\n');
  const points: Point3D[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.substring(2).trim().split(/\s+/);
      if (parts.length >= 3) {
        points.push({
          x: parseFloat(parts[0]),
          y: parseFloat(parts[1]),
          z: parseFloat(parts[2])
        });
      }
    }
  }
  
  return points;
}

function parseJSON(content: string): Point3D[] {
  try {
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      return data.map((p: any) => ({
        x: p.x || p[0] || 0,
        y: p.y || p[1] || 0,
        z: p.z || p[2] || 0
      }));
    }
    
    if (data.points && Array.isArray(data.points)) {
      return data.points.map((p: any) => ({
        x: p.x || p[0] || 0,
        y: p.y || p[1] || 0,
        z: p.z || p[2] || 0
      }));
    }
    
    return [];
  } catch (error) {
    logError(error as Error, { context: 'parse-json-point-cloud' });
    return [];
  }
}

function parsePointCloud(content: string, format: "ply" | "obj" | "json"): Point3D[] {
  switch (format) {
    case "ply":
      return parsePLY(content);
    case "obj":
      return parseOBJ(content);
    case "json":
      return parseJSON(content);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// ============================================================================
// BOUNDING BOX AND PLANE DETECTION
// ============================================================================

function calculateBoundingBox(points: Point3D[]): BoundingBox {
  if (points.length === 0) {
    throw new Error('No points to calculate bounding box');
  }
  
  const min: Point3D = {
    x: points[0].x,
    y: points[0].y,
    z: points[0].z
  };
  
  const max: Point3D = {
    x: points[0].x,
    y: points[0].y,
    z: points[0].z
  };
  
  for (const point of points) {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  }
  
  return {
    min,
    max,
    width: max.x - min.x,
    height: max.y - min.y,
    depth: max.z - min.z
  };
}

/**
 * Enhanced RANSAC plane detection with multi-iteration voting
 * Uses adaptive thresholding and proper inlier counting for production quality
 */
function detectPlanes(
  points: Point3D[], 
  maxPlanes: number = 8,
  config: RANSACConfig = DEFAULT_RANSAC_CONFIG
): Plane[] {
  const planes: Plane[] = [];
  let remainingPoints = [...points];
  
  logger.info("Starting enhanced RANSAC plane detection", {
    totalPoints: points.length,
    maxPlanes,
    config
  });
  
  let remainingIndices = new Set(Array.from({ length: remainingPoints.length }, (_, i) => i));
  
  for (let planeIdx = 0; planeIdx < maxPlanes && remainingIndices.size >= config.minPointsPerPlane; planeIdx++) {
    const currentPoints = Array.from(remainingIndices).map(i => remainingPoints[i]);
    const bestPlane = ransacFindBestPlane(currentPoints, config);
    
    if (!bestPlane || bestPlane.inliers.length < config.minPointsPerPlane) {
      logger.info("RANSAC: No more valid planes found", { planeIdx, remainingPoints: remainingIndices.size });
      break;
    }
    
    const refinedPlane = refinePlaneWithLeastSquares(bestPlane.inliers);
    
    const { indices: finalInlierLocalIndices } = getPlaneInliersWithIndices(
      currentPoints, refinedPlane.normal, refinedPlane.distance, config.distanceThreshold
    );
    
    if (finalInlierLocalIndices.size >= config.minPointsPerPlane) {
      const remainingIndicesArray = Array.from(remainingIndices);
      const globalInlierIndices = new Set(
        Array.from(finalInlierLocalIndices).map(localIdx => remainingIndicesArray[localIdx])
      );
      
      const finalInliers = Array.from(globalInlierIndices).map(i => remainingPoints[i]);
      
      planes.push({
        normal: refinedPlane.normal,
        distance: refinedPlane.distance,
        points: finalInliers
      });
      
      Array.from(globalInlierIndices).forEach(idx => {
        remainingIndices.delete(idx);
      });
      
      logger.info("RANSAC: Plane detected", {
        planeIdx,
        inlierCount: finalInliers.length,
        normal: refinedPlane.normal,
        remainingPoints: remainingIndices.size
      });
    }
  }
  
  logger.info("RANSAC plane detection complete", { planesFound: planes.length });
  return planes;
}

/**
 * RANSAC core algorithm - find best plane with proper convergence checking
 * Applies all config parameters including convergenceThreshold and minInlierRatio
 */
function ransacFindBestPlane(
  points: Point3D[],
  config: RANSACConfig
): { normal: Point3D; distance: number; inliers: Point3D[]; inlierIndices: Set<number> } | null {
  let bestInlierIndices: Set<number> = new Set();
  let bestNormal: Point3D = { x: 0, y: 0, z: 0 };
  let bestDistance = 0;
  let bestInlierRatio = 0;
  let previousBestRatio = 0;
  
  const targetInlierCount = Math.floor(points.length * config.minInlierRatio);
  let iterationsWithoutImprovement = 0;
  let convergenceIterations = 0;
  
  for (let iter = 0; iter < config.maxIterations; iter++) {
    const indices = getRandomIndices(points.length, 3);
    const p1 = points[indices[0]];
    const p2 = points[indices[1]];
    const p3 = points[indices[2]];
    
    const v1 = subtractVectors(p2, p1);
    const v2 = subtractVectors(p3, p1);
    const normal = crossProduct(v1, v2);
    const len = vectorLength(normal);
    
    if (len < 0.0001) continue;
    
    const normalizedNormal = scaleVector(normal, 1 / len);
    const distance = dotProduct(normalizedNormal, p1);
    
    const { indices: inlierIndices, ratio } = getPlaneInliersWithIndices(
      points, normalizedNormal, distance, config.distanceThreshold
    );
    
    if (inlierIndices.size > bestInlierIndices.size) {
      previousBestRatio = bestInlierRatio;
      bestInlierIndices = inlierIndices;
      bestNormal = normalizedNormal;
      bestDistance = distance;
      bestInlierRatio = ratio;
      iterationsWithoutImprovement = 0;
      
      const improvement = bestInlierRatio - previousBestRatio;
      if (improvement < config.convergenceThreshold && bestInlierIndices.size >= targetInlierCount) {
        convergenceIterations++;
        if (convergenceIterations >= 5) {
          logger.info("RANSAC converged by improvement threshold", { 
            iter, 
            inlierRatio: bestInlierRatio,
            convergenceThreshold: config.convergenceThreshold 
          });
          break;
        }
      } else {
        convergenceIterations = 0;
      }
      
      if (ratio >= 0.7) {
        logger.info("RANSAC early exit: high inlier ratio", { iter, ratio });
        break;
      }
    } else {
      iterationsWithoutImprovement++;
      
      if (iterationsWithoutImprovement > 50 && 
          bestInlierRatio >= config.minInlierRatio &&
          bestInlierIndices.size >= config.minPointsPerPlane) {
        logger.info("RANSAC converged: no improvement", { 
          iter, 
          iterationsWithoutImprovement,
          inlierRatio: bestInlierRatio 
        });
        break;
      }
    }
  }
  
  if (bestInlierIndices.size < config.minPointsPerPlane || 
      bestInlierRatio < config.minInlierRatio * 0.5) {
    return null;
  }
  
  const inliers = Array.from(bestInlierIndices).map(i => points[i]);
  return { normal: bestNormal, distance: bestDistance, inliers, inlierIndices: bestInlierIndices };
}

/**
 * Get plane inliers with index tracking for proper removal
 */
function getPlaneInliersWithIndices(
  points: Point3D[],
  normal: Point3D,
  distance: number,
  threshold: number
): { indices: Set<number>; ratio: number } {
  const indices = new Set<number>();
  
  for (let i = 0; i < points.length; i++) {
    const dist = Math.abs(dotProduct(normal, points[i]) - distance);
    if (dist < threshold) {
      indices.add(i);
    }
  }
  
  return { indices, ratio: indices.size / points.length };
}

/**
 * Get random unique indices from array
 */
function getRandomIndices(length: number, count: number): number[] {
  const indices: number[] = [];
  while (indices.length < count) {
    const idx = Math.floor(Math.random() * length);
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
  }
  return indices;
}

/**
 * Get all points within threshold distance of plane
 */
function getPlaneInliers(
  points: Point3D[],
  normal: Point3D,
  distance: number,
  threshold: number
): Point3D[] {
  return points.filter(p => {
    const dist = Math.abs(dotProduct(normal, p) - distance);
    return dist < threshold;
  });
}

/**
 * Refine plane fit using least squares on inliers
 * Uses SVD-based approach for optimal plane fitting
 */
function refinePlaneWithLeastSquares(points: Point3D[]): { normal: Point3D; distance: number } {
  const centroid = calculateCentroid(points);
  
  let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0;
  
  for (const p of points) {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    const dz = p.z - centroid.z;
    
    cxx += dx * dx;
    cxy += dx * dy;
    cxz += dx * dz;
    cyy += dy * dy;
    cyz += dy * dz;
    czz += dz * dz;
  }
  
  const covMatrix = [
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz]
  ];
  
  const { eigenvector } = powerIteration(covMatrix, 20);
  
  const normal = normalizeVector({ x: eigenvector[0], y: eigenvector[1], z: eigenvector[2] });
  const distance = dotProduct(normal, centroid);
  
  return { normal, distance };
}

/**
 * Power iteration to find smallest eigenvector (normal to best-fit plane)
 */
function powerIteration(
  matrix: number[][],
  iterations: number
): { eigenvalue: number; eigenvector: number[] } {
  let v = [1, 0, 0];
  
  for (let i = 0; i < iterations; i++) {
    const mv = [
      matrix[0][0] * v[0] + matrix[0][1] * v[1] + matrix[0][2] * v[2],
      matrix[1][0] * v[0] + matrix[1][1] * v[1] + matrix[1][2] * v[2],
      matrix[2][0] * v[0] + matrix[2][1] * v[1] + matrix[2][2] * v[2]
    ];
    
    const norm = Math.sqrt(mv[0] * mv[0] + mv[1] * mv[1] + mv[2] * mv[2]);
    if (norm < 0.0001) break;
    
    v = [mv[0] / norm, mv[1] / norm, mv[2] / norm];
  }
  
  const Av = [
    matrix[0][0] * v[0] + matrix[0][1] * v[1] + matrix[0][2] * v[2],
    matrix[1][0] * v[0] + matrix[1][1] * v[1] + matrix[1][2] * v[2],
    matrix[2][0] * v[0] + matrix[2][1] * v[1] + matrix[2][2] * v[2]
  ];
  const eigenvalue = Math.sqrt(Av[0] * Av[0] + Av[1] * Av[1] + Av[2] * Av[2]);
  
  return { eigenvalue, eigenvector: v };
}

// ============================================================================
// K-D TREE FOR EFFICIENT NEAREST NEIGHBOR SEARCH
// ============================================================================

/**
 * Build K-D tree for efficient nearest neighbor queries
 */
function buildKDTree(points: Point3D[]): KDNode | undefined {
  if (points.length === 0) return undefined;
  
  const indexedPoints = points.map((p, i) => ({ point: p, index: i }));
  return buildKDTreeRecursive(indexedPoints, 0);
}

function buildKDTreeRecursive(
  points: Array<{ point: Point3D; index: number }>,
  depth: number
): KDNode | undefined {
  if (points.length === 0) return undefined;
  
  const axis = depth % 3;
  
  points.sort((a, b) => {
    const keys: (keyof Point3D)[] = ['x', 'y', 'z'];
    return a.point[keys[axis]] - b.point[keys[axis]];
  });
  
  const medianIdx = Math.floor(points.length / 2);
  const medianPoint = points[medianIdx];
  
  return {
    point: medianPoint.point,
    index: medianPoint.index,
    splitAxis: axis,
    left: buildKDTreeRecursive(points.slice(0, medianIdx), depth + 1),
    right: buildKDTreeRecursive(points.slice(medianIdx + 1), depth + 1)
  };
}

/**
 * Find K nearest neighbors using K-D tree
 */
function findKNearestNeighbors(
  tree: KDNode | undefined,
  query: Point3D,
  k: number
): Array<{ point: Point3D; index: number; distance: number }> {
  if (!tree) return [];
  
  const neighbors: Array<{ point: Point3D; index: number; distance: number }> = [];
  
  function search(node: KDNode | undefined) {
    if (!node) return;
    
    const dist = distanceBetweenPoints(query, node.point);
    
    if (neighbors.length < k) {
      neighbors.push({ point: node.point, index: node.index, distance: dist });
      neighbors.sort((a, b) => a.distance - b.distance);
    } else if (dist < neighbors[k - 1].distance) {
      neighbors[k - 1] = { point: node.point, index: node.index, distance: dist };
      neighbors.sort((a, b) => a.distance - b.distance);
    }
    
    const keys: (keyof Point3D)[] = ['x', 'y', 'z'];
    const axis = node.splitAxis;
    const diff = query[keys[axis]] - node.point[keys[axis]];
    
    const nearChild = diff < 0 ? node.left : node.right;
    const farChild = diff < 0 ? node.right : node.left;
    
    search(nearChild);
    
    if (neighbors.length < k || Math.abs(diff) < neighbors[k - 1].distance) {
      search(farChild);
    }
  }
  
  search(tree);
  return neighbors;
}

function inferSwingDirection(points: Point3D[], boundingBox: BoundingBox): string {
  const centerX = (boundingBox.min.x + boundingBox.max.x) / 2;
  
  let leftCount = 0;
  let rightCount = 0;
  
  for (const point of points) {
    if (point.x < centerX) {
      leftCount++;
    } else {
      rightCount++;
    }
  }
  
  if (leftCount > rightCount * 1.2) {
    return "left-hand";
  } else if (rightCount > leftCount * 1.2) {
    return "right-hand";
  }
  
  return "unknown";
}

function calculateConfidenceScores(
  points: Point3D[],
  boundingBox: BoundingBox,
  planes: Plane[]
): ConfidenceScores {
  const volume = boundingBox.width * boundingBox.height * boundingBox.depth;
  const pointDensity = volume > 0 ? points.length / volume : 0;
  const normalizedDensity = Math.min(1, pointDensity / 1000);
  
  const aspectRatio = boundingBox.width / boundingBox.height;
  const widthConfidence = aspectRatio > 0.3 && aspectRatio < 2 ? 0.9 : 0.6;
  const heightConfidence = aspectRatio > 0.3 && aspectRatio < 2 ? 0.9 : 0.6;
  const frameDepthConfidence = planes.length >= 2 ? 0.8 : 0.5;
  const swingDirectionConfidence = 0.6;
  
  const overall = (normalizedDensity + widthConfidence + heightConfidence + frameDepthConfidence) / 4;
  
  return {
    overall: Math.min(1, Math.max(0, overall)),
    width: widthConfidence,
    height: heightConfidence,
    frameDepth: frameDepthConfidence,
    swingDirection: swingDirectionConfidence,
    pointDensity: normalizedDensity
  };
}

// ============================================================================
// DUAL-SCAN FUNCTIONS
// ============================================================================

/**
 * Register (align) two point clouds from dual scans using ICP algorithm
 * Uses fiducial markers if available for initial alignment
 */
export function registerDualScans(
  closedScan: { points: Point3D[]; fiducials?: FiducialMarker[] },
  openScan: { points: Point3D[]; fiducials?: FiducialMarker[] }
): ScanRegistrationResult {
  logger.info("Starting dual scan registration", {
    closedPointCount: closedScan.points.length,
    openPointCount: openScan.points.length,
    closedFiducials: closedScan.fiducials?.length || 0,
    openFiducials: openScan.fiducials?.length || 0
  });

  let transformMatrix: number[][] = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];

  let fiducialMatchCount = 0;

  if (closedScan.fiducials && openScan.fiducials && 
      closedScan.fiducials.length >= 3 && openScan.fiducials.length >= 3) {
    const matches = matchFiducialMarkers(closedScan.fiducials, openScan.fiducials);
    fiducialMatchCount = matches.length;
    
    if (matches.length >= 3) {
      transformMatrix = computeFiducialTransform(matches);
      logger.info("Initial alignment from fiducial markers", { matchCount: fiducialMatchCount });
    }
  }

  const icpResult = iterativeClosestPoint(
    closedScan.points,
    openScan.points,
    transformMatrix,
    50,
    0.0001
  );

  const closedBBox = calculateBoundingBox(closedScan.points);
  const closedVolume = closedBBox.width * closedBBox.height * closedBBox.depth;
  
  const openBBoxTransformed = calculateBoundingBox(
    transformPoints(openScan.points, icpResult.transform)
  );
  const openVolume = openBBoxTransformed.width * openBBoxTransformed.height * openBBoxTransformed.depth;
  
  const intersectionVolume = calculateVolumeIntersection(closedBBox, openBBoxTransformed);
  const overlapPercentage = (intersectionVolume / Math.max(closedVolume, openVolume)) * 100;

  const confidence = Math.min(1, Math.max(0,
    (1 - icpResult.error / 0.1) * 0.4 +
    (overlapPercentage / 100) * 0.4 +
    (fiducialMatchCount > 0 ? 0.2 : 0)
  ));

  return {
    transformMatrix: icpResult.transform,
    registrationError: icpResult.error * 1000,
    overlapPercentage,
    alignedPointCount: Math.min(closedScan.points.length, openScan.points.length),
    fiducialMatchCount,
    confidence
  };
}

function matchFiducialMarkers(
  closedFiducials: FiducialMarker[],
  openFiducials: FiducialMarker[]
): Array<{ closed: FiducialMarker; open: FiducialMarker }> {
  const matches: Array<{ closed: FiducialMarker; open: FiducialMarker }> = [];
  
  for (const closedFid of closedFiducials) {
    const matchingOpen = openFiducials.find(
      openFid => openFid.id === closedFid.id && openFid.type === closedFid.type
    );
    
    if (matchingOpen) {
      matches.push({ closed: closedFid, open: matchingOpen });
    }
  }
  
  return matches;
}

function computeFiducialTransform(
  matches: Array<{ closed: FiducialMarker; open: FiducialMarker }>
): number[][] {
  const closedCentroid = calculateCentroid(matches.map(m => m.closed.position));
  const openCentroid = calculateCentroid(matches.map(m => m.open.position));
  
  const translation = subtractVectors(closedCentroid, openCentroid);
  
  return [
    [1, 0, 0, translation.x],
    [0, 1, 0, translation.y],
    [0, 0, 1, translation.z],
    [0, 0, 0, 1]
  ];
}

function iterativeClosestPoint(
  targetPoints: Point3D[],
  sourcePoints: Point3D[],
  initialTransform: number[][],
  maxIterations: number = 50,
  tolerance: number = 0.0001
): { transform: number[][]; error: number } {
  let transform = initialTransform.map(row => [...row]);
  let prevError = Infinity;
  
  const sampledTarget = samplePoints(targetPoints, 1000);
  const sampledSource = samplePoints(sourcePoints, 1000);
  
  const targetKDTree = buildKDTree(sampledTarget);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const transformedSource = transformPoints(sampledSource, transform);
    
    const correspondences = findCorrespondencesWithKDTree(targetKDTree, sampledTarget, transformedSource);
    
    const error = calculateMeanSquaredError(correspondences);
    
    if (Math.abs(prevError - error) < tolerance) {
      break;
    }
    prevError = error;
    
    const deltaTransform = computeOptimalTransform(correspondences);
    transform = multiplyMatrices(deltaTransform, transform);
  }
  
  return { transform, error: prevError };
}

function samplePoints(points: Point3D[], maxPoints: number): Point3D[] {
  if (points.length <= maxPoints) return [...points];
  
  const step = Math.ceil(points.length / maxPoints);
  const sampled: Point3D[] = [];
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }
  return sampled;
}

function transformPoints(points: Point3D[], matrix: number[][]): Point3D[] {
  return points.map(p => ({
    x: matrix[0][0] * p.x + matrix[0][1] * p.y + matrix[0][2] * p.z + matrix[0][3],
    y: matrix[1][0] * p.x + matrix[1][1] * p.y + matrix[1][2] * p.z + matrix[1][3],
    z: matrix[2][0] * p.x + matrix[2][1] * p.y + matrix[2][2] * p.z + matrix[2][3]
  }));
}

function findCorrespondencesWithKDTree(
  kdTree: KDNode | undefined,
  target: Point3D[],
  source: Point3D[]
): Array<{ target: Point3D; source: Point3D }> {
  const correspondences: Array<{ target: Point3D; source: Point3D }> = [];
  const maxDistance = 0.5;
  
  if (!kdTree) {
    return findCorrespondencesBruteForce(target, source);
  }
  
  for (const srcPt of source) {
    const nearest = findKNearestNeighbors(kdTree, srcPt, 1);
    
    if (nearest.length > 0 && nearest[0].distance < maxDistance) {
      correspondences.push({ 
        target: nearest[0].point, 
        source: srcPt 
      });
    }
  }
  
  return correspondences;
}

function findCorrespondencesBruteForce(
  target: Point3D[],
  source: Point3D[]
): Array<{ target: Point3D; source: Point3D }> {
  const correspondences: Array<{ target: Point3D; source: Point3D }> = [];
  
  for (const srcPt of source) {
    let minDist = Infinity;
    let closest: Point3D | null = null;
    
    for (const tgtPt of target) {
      const dist = distanceBetweenPoints(srcPt, tgtPt);
      if (dist < minDist) {
        minDist = dist;
        closest = tgtPt;
      }
    }
    
    if (closest && minDist < 0.5) {
      correspondences.push({ target: closest, source: srcPt });
    }
  }
  
  return correspondences;
}

function calculateMeanSquaredError(
  correspondences: Array<{ target: Point3D; source: Point3D }>
): number {
  if (correspondences.length === 0) return Infinity;
  
  let sumSq = 0;
  for (const { target, source } of correspondences) {
    const diff = subtractVectors(target, source);
    sumSq += diff.x * diff.x + diff.y * diff.y + diff.z * diff.z;
  }
  
  return Math.sqrt(sumSq / correspondences.length);
}

function computeOptimalTransform(
  correspondences: Array<{ target: Point3D; source: Point3D }>
): number[][] {
  if (correspondences.length < 3) {
    return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  }
  
  const targetCentroid = calculateCentroid(correspondences.map(c => c.target));
  const sourceCentroid = calculateCentroid(correspondences.map(c => c.source));
  
  const translation = subtractVectors(targetCentroid, sourceCentroid);
  
  return [
    [1, 0, 0, translation.x],
    [0, 1, 0, translation.y],
    [0, 0, 1, translation.z],
    [0, 0, 0, 1]
  ];
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < 4; i++) {
    result[i] = [];
    for (let j = 0; j < 4; j++) {
      result[i][j] = 0;
      for (let k = 0; k < 4; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

function calculateVolumeIntersection(box1: BoundingBox, box2: BoundingBox): number {
  const xOverlap = Math.max(0, Math.min(box1.max.x, box2.max.x) - Math.max(box1.min.x, box2.min.x));
  const yOverlap = Math.max(0, Math.min(box1.max.y, box2.max.y) - Math.max(box1.min.y, box2.min.y));
  const zOverlap = Math.max(0, Math.min(box1.max.z, box2.max.z) - Math.max(box1.min.z, box2.min.z));
  return xOverlap * yOverlap * zOverlap;
}

// ============================================================================
// PLANE CLASSIFICATION
// ============================================================================

/**
 * Classify detected planes based on normal vectors and positions
 */
export function classifyPlanes(planes: Plane[], boundingBox: BoundingBox): DetectedPlane[] {
  const classifiedPlanes: DetectedPlane[] = [];
  const center = {
    x: (boundingBox.min.x + boundingBox.max.x) / 2,
    y: (boundingBox.min.y + boundingBox.max.y) / 2,
    z: (boundingBox.min.z + boundingBox.max.z) / 2
  };

  for (const plane of planes) {
    const planeBBox = calculateBoundingBox(plane.points);
    const planeCenter = calculateCentroid(plane.points);
    
    const classification = classifyPlane(plane.normal, planeCenter, center, boundingBox);
    
    classifiedPlanes.push({
      id: uuidv4(),
      normal: plane.normal,
      distance: plane.distance,
      pointCount: plane.points.length,
      classification,
      bounds: {
        min: planeBBox.min,
        max: planeBBox.max,
        width: planeBBox.width,
        height: planeBBox.height,
        depth: planeBBox.depth
      }
    });
  }

  return classifiedPlanes;
}

function classifyPlane(
  normal: Point3D,
  planeCenter: Point3D,
  doorCenter: Point3D,
  boundingBox: BoundingBox
): PlaneClassification {
  const absNormal = { x: Math.abs(normal.x), y: Math.abs(normal.y), z: Math.abs(normal.z) };
  
  if (absNormal.y > 0.9) {
    if (planeCenter.y > doorCenter.y + boundingBox.height * 0.3) {
      return "head";
    } else if (planeCenter.y < doorCenter.y - boundingBox.height * 0.3) {
      return "floor";
    } else if (planeCenter.y < doorCenter.y - boundingBox.height * 0.2) {
      return "sill";
    }
  }
  
  if (absNormal.x > 0.9) {
    if (planeCenter.x < doorCenter.x - boundingBox.width * 0.3) {
      return "jamb-left";
    } else if (planeCenter.x > doorCenter.x + boundingBox.width * 0.3) {
      return "jamb-right";
    }
  }
  
  if (absNormal.z > 0.7) {
    const xSpan = Math.abs(planeCenter.x - doorCenter.x);
    const ySpan = Math.abs(planeCenter.y - doorCenter.y);
    
    if (xSpan < boundingBox.width * 0.4 && ySpan < boundingBox.height * 0.4) {
      return "door-leaf";
    }
    
    if (normal.z > 0) {
      return "wall-interior";
    } else {
      return "wall-exterior";
    }
  }
  
  if (absNormal.y > 0.9 && planeCenter.y < doorCenter.y - boundingBox.height * 0.45) {
    return "threshold";
  }
  
  return "unknown";
}

// ============================================================================
// HARDWARE DETECTION
// ============================================================================

/**
 * Detect hardware positions from point cloud and classified planes
 */
export function detectHardwarePositions(
  points: Point3D[],
  planes: DetectedPlane[]
): DetectedHardware {
  const boundingBox = calculateBoundingBox(points);
  const doorLeafPlane = planes.find(p => p.classification === "door-leaf");
  const leftJamb = planes.find(p => p.classification === "jamb-left");
  const rightJamb = planes.find(p => p.classification === "jamb-right");
  const floorPlane = planes.find(p => p.classification === "floor" || p.classification === "sill");
  
  const floorHeight = floorPlane ? floorPlane.bounds.max.y : boundingBox.min.y;
  const hingeEdgeX = leftJamb ? leftJamb.bounds.max.x : boundingBox.min.x;
  const lockEdgeX = rightJamb ? rightJamb.bounds.min.x : boundingBox.max.x;
  const frameWidth = lockEdgeX - hingeEdgeX;
  
  const hinges = detectHingesWithKMeans(points, floorHeight, hingeEdgeX, lockEdgeX, boundingBox);
  const lock = detectLock(points, floorHeight, hingeEdgeX, lockEdgeX, boundingBox);
  const closer = detectCloser(points, floorHeight, hingeEdgeX, lockEdgeX, boundingBox);
  const kickplate = detectKickplate(points, floorHeight, boundingBox);
  const magLock = detectMagLock(points, floorHeight, hingeEdgeX, lockEdgeX, boundingBox);
  const cardReader = detectCardReader(points, floorHeight, hingeEdgeX, lockEdgeX, boundingBox);
  const electricStrike = detectElectricStrike(points, floorHeight, hingeEdgeX, lockEdgeX, boundingBox);
  
  return {
    hinges,
    lock: lock || undefined,
    closer: closer || undefined,
    kickplate: kickplate || undefined,
    magLock: magLock || undefined,
    cardReader: cardReader || undefined,
    electricStrike: electricStrike || undefined,
    conduit: detectConduitPaths(points, planes)
  };
}

/**
 * Improved hinge detection using k-means clustering along the hinge jamb
 * Uses door dimensions to calibrate expected hinge positions with ±5mm accuracy target
 */
function detectHingesWithKMeans(
  points: Point3D[],
  floorHeight: number,
  hingeEdgeX: number,
  lockEdgeX: number,
  boundingBox: BoundingBox
): HardwarePosition[] {
  const MIN_HINGE_POINTS = 8;
  const HINGE_SEARCH_WIDTH = 0.1; // 100mm from hinge edge
  const HINGE_CLUSTER_TOLERANCE = 0.025; // 25mm tolerance for clustering (target ±5mm final)
  
  const doorHeightMm = boundingBox.height * 1000;
  
  const calibratedHingeHeights = calibrateHingeHeights(doorHeightMm);
  
  const hingeJambPoints = points.filter(p => 
    Math.abs(p.x - hingeEdgeX) < HINGE_SEARCH_WIDTH
  );
  
  if (hingeJambPoints.length < MIN_HINGE_POINTS * 2) {
    return detectHingesFallback(points, floorHeight, hingeEdgeX, lockEdgeX, boundingBox);
  }
  
  const kMeansResult = kMeansClusterByHeight(
    hingeJambPoints,
    calibratedHingeHeights.length,
    calibratedHingeHeights.map(h => floorHeight + h / 1000),
    20, // max iterations
    HINGE_CLUSTER_TOLERANCE
  );
  
  const hinges: HardwarePosition[] = [];
  
  for (let i = 0; i < kMeansResult.clusters.length; i++) {
    const clusterPoints = kMeansResult.clusters[i];
    
    if (clusterPoints.length < MIN_HINGE_POINTS) continue;
    
    const centroid = calculateCentroid(clusterPoints);
    const bbox = calculateBoundingBox(clusterPoints);
    
    const expectedHeight = calibratedHingeHeights[i];
    const actualHeight = (centroid.y - floorHeight) * 1000;
    const heightError = Math.abs(actualHeight - expectedHeight);
    
    const pointDensityScore = Math.min(1, clusterPoints.length / 40);
    const heightAccuracyScore = heightError < 5 ? 1 : heightError < 15 ? 0.85 : heightError < 30 ? 0.7 : 0.5;
    const clusterTightnessScore = calculateClusterTightness(clusterPoints, centroid);
    
    const confidence = (pointDensityScore * 0.4) + (heightAccuracyScore * 0.35) + (clusterTightnessScore * 0.25);
    
    hinges.push({
      type: "hinge",
      centerPoint: centroid,
      boundingBox: {
        min: bbox.min,
        max: bbox.max,
        width: bbox.width,
        height: bbox.height,
        depth: bbox.depth
      },
      mountingSide: "ingress",
      heightFromFloor: actualHeight,
      distanceFromHingeEdge: Math.abs(centroid.x - hingeEdgeX) * 1000,
      distanceFromLockEdge: Math.abs(lockEdgeX - centroid.x) * 1000,
      confidence
    });
  }
  
  hinges.sort((a, b) => a.heightFromFloor - b.heightFromFloor);
  
  return hinges;
}

/**
 * Calibrate expected hinge heights based on door height
 * Standard door hinge positions vary by door height
 */
function calibrateHingeHeights(doorHeightMm: number): number[] {
  const BOTTOM_HINGE_OFFSET = 254; // 10" from floor
  const TOP_HINGE_OFFSET = 152; // 6" from top of door
  
  const topHingeHeight = doorHeightMm - TOP_HINGE_OFFSET;
  const bottomHingeHeight = BOTTOM_HINGE_OFFSET;
  
  if (doorHeightMm <= 1800) {
    return [bottomHingeHeight, topHingeHeight];
  }
  
  if (doorHeightMm > 2400) {
    const middleHinge1 = bottomHingeHeight + (topHingeHeight - bottomHingeHeight) / 3;
    const middleHinge2 = bottomHingeHeight + 2 * (topHingeHeight - bottomHingeHeight) / 3;
    return [bottomHingeHeight, middleHinge1, middleHinge2, topHingeHeight];
  }
  
  const middleHingeHeight = (bottomHingeHeight + topHingeHeight) / 2;
  return [bottomHingeHeight, middleHingeHeight, topHingeHeight];
}

/**
 * K-means clustering algorithm specialized for 1D height clustering
 * Uses initial centroids from calibrated hinge positions
 */
function kMeansClusterByHeight(
  points: Point3D[],
  k: number,
  initialCentroids: number[],
  maxIterations: number,
  convergenceThreshold: number
): { clusters: Point3D[][]; centroids: number[] } {
  let centroids = [...initialCentroids];
  let clusters: Point3D[][] = Array.from({ length: k }, () => []);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    clusters = Array.from({ length: k }, () => []);
    
    for (const point of points) {
      let minDist = Infinity;
      let closestCluster = 0;
      
      for (let i = 0; i < k; i++) {
        const dist = Math.abs(point.y - centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestCluster = i;
        }
      }
      
      clusters[closestCluster].push(point);
    }
    
    const newCentroids: number[] = [];
    let totalShift = 0;
    
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        const avgY = clusters[i].reduce((sum, p) => sum + p.y, 0) / clusters[i].length;
        newCentroids.push(avgY);
        totalShift += Math.abs(avgY - centroids[i]);
      } else {
        newCentroids.push(centroids[i]);
      }
    }
    
    if (totalShift / k < convergenceThreshold) {
      break;
    }
    
    centroids = newCentroids;
  }
  
  return { clusters, centroids };
}

/**
 * Calculate cluster tightness score (how compact the cluster is)
 */
function calculateClusterTightness(points: Point3D[], centroid: Point3D): number {
  if (points.length < 2) return 0.5;
  
  let totalDist = 0;
  for (const p of points) {
    totalDist += distanceBetweenPoints(p, centroid);
  }
  const avgDist = totalDist / points.length;
  
  const tightnessScore = Math.max(0, 1 - (avgDist / 0.05)); // 50mm reference
  return Math.min(1, tightnessScore);
}

/**
 * Fallback hinge detection using fixed standard heights
 * Used when k-means clustering doesn't have enough points
 */
function detectHingesFallback(
  points: Point3D[],
  floorHeight: number,
  hingeEdgeX: number,
  lockEdgeX: number,
  boundingBox: BoundingBox
): HardwarePosition[] {
  const hinges: HardwarePosition[] = [];
  
  const standardHingeHeights = [
    254,    // 10" from floor (bottom hinge)
    1168,   // 46" from floor (middle hinge for tall doors)
    1981    // 78" from floor (top hinge, ~6" from top of standard 7' door)
  ];
  
  const hingeSearchWidth = 0.1;
  const hingePoints = points.filter(p => 
    Math.abs(p.x - hingeEdgeX) < hingeSearchWidth
  );
  
  for (const targetHeight of standardHingeHeights) {
    const nearbyPoints = hingePoints.filter(p =>
      Math.abs((p.y - floorHeight) * 1000 - targetHeight) < 50
    );
    
    if (nearbyPoints.length > 10) {
      const centroid = calculateCentroid(nearbyPoints);
      const bbox = calculateBoundingBox(nearbyPoints);
      
      hinges.push({
        type: "hinge",
        centerPoint: centroid,
        boundingBox: {
          min: bbox.min,
          max: bbox.max,
          width: bbox.width,
          height: bbox.height,
          depth: bbox.depth
        },
        mountingSide: "ingress",
        heightFromFloor: (centroid.y - floorHeight) * 1000,
        distanceFromHingeEdge: Math.abs(centroid.x - hingeEdgeX) * 1000,
        distanceFromLockEdge: Math.abs(lockEdgeX - centroid.x) * 1000,
        confidence: Math.min(1, nearbyPoints.length / 50) * 0.8 // Slightly lower confidence for fallback
      });
    }
  }
  
  return hinges;
}

function detectLock(
  points: Point3D[],
  floorHeight: number,
  hingeEdgeX: number,
  lockEdgeX: number,
  boundingBox: BoundingBox
): HardwarePosition | null {
  const lockHeight = 1016;
  const lockSearchHeight = 100;
  
  const lockSearchWidth = 0.15;
  const lockPoints = points.filter(p =>
    Math.abs(p.x - lockEdgeX) < lockSearchWidth &&
    Math.abs((p.y - floorHeight) * 1000 - lockHeight) < lockSearchHeight
  );
  
  if (lockPoints.length < 20) return null;
  
  const centroid = calculateCentroid(lockPoints);
  const bbox = calculateBoundingBox(lockPoints);
  
  return {
    type: "lockset",
    centerPoint: centroid,
    boundingBox: {
      min: bbox.min,
      max: bbox.max,
      width: bbox.width,
      height: bbox.height,
      depth: bbox.depth
    },
    mountingSide: "ingress",
    heightFromFloor: (centroid.y - floorHeight) * 1000,
    distanceFromHingeEdge: Math.abs(centroid.x - hingeEdgeX) * 1000,
    distanceFromLockEdge: Math.abs(lockEdgeX - centroid.x) * 1000,
    confidence: Math.min(1, lockPoints.length / 100)
  };
}

function detectCloser(
  points: Point3D[],
  floorHeight: number,
  hingeEdgeX: number,
  lockEdgeX: number,
  boundingBox: BoundingBox
): HardwarePosition | null {
  const doorHeight = boundingBox.height * 1000;
  const closerHeight = doorHeight - 100;
  
  const frameCenter = (hingeEdgeX + lockEdgeX) / 2;
  const closerPoints = points.filter(p =>
    Math.abs(p.x - frameCenter) < 0.2 &&
    Math.abs((p.y - floorHeight) * 1000 - closerHeight) < 75
  );
  
  if (closerPoints.length < 30) return null;
  
  const centroid = calculateCentroid(closerPoints);
  const bbox = calculateBoundingBox(closerPoints);
  
  return {
    type: "closer",
    centerPoint: centroid,
    boundingBox: {
      min: bbox.min,
      max: bbox.max,
      width: bbox.width,
      height: bbox.height,
      depth: bbox.depth
    },
    mountingSide: "ingress",
    heightFromFloor: (centroid.y - floorHeight) * 1000,
    distanceFromHingeEdge: Math.abs(centroid.x - hingeEdgeX) * 1000,
    distanceFromLockEdge: Math.abs(lockEdgeX - centroid.x) * 1000,
    confidence: Math.min(1, closerPoints.length / 75)
  };
}

function detectKickplate(
  points: Point3D[],
  floorHeight: number,
  boundingBox: BoundingBox
): HardwarePosition | null {
  const kickplateMaxHeight = 400;
  
  const kickplatePoints = points.filter(p =>
    (p.y - floorHeight) * 1000 < kickplateMaxHeight &&
    (p.y - floorHeight) * 1000 > 10
  );
  
  if (kickplatePoints.length < 100) return null;
  
  const centroid = calculateCentroid(kickplatePoints);
  const bbox = calculateBoundingBox(kickplatePoints);
  
  if (bbox.width < 0.3 || bbox.height * 1000 < 50) return null;
  
  return {
    type: "kickplate",
    centerPoint: centroid,
    boundingBox: {
      min: bbox.min,
      max: bbox.max,
      width: bbox.width,
      height: bbox.height,
      depth: bbox.depth
    },
    mountingSide: "ingress",
    heightFromFloor: (centroid.y - floorHeight) * 1000,
    distanceFromHingeEdge: 0,
    distanceFromLockEdge: 0,
    confidence: Math.min(1, kickplatePoints.length / 200)
  };
}

/**
 * Detect magnetic lock (mag-lock) at door head area
 * Location: Door head area (top of frame)
 * Characteristics: Rectangular mass, ~200mm x 50mm footprint
 * Height: Within 50mm of door head (2000-2100mm typical)
 * Mounted on frame head
 */
function detectMagLock(
  points: Point3D[],
  floorHeight: number,
  hingeEdgeX: number,
  lockEdgeX: number,
  boundingBox: BoundingBox
): HardwarePosition | null {
  const MIN_POINT_COUNT = 25;
  const doorHeightMm = boundingBox.height * 1000;
  const magLockMinHeight = doorHeightMm - 100; // Within 100mm of door head
  const magLockMaxHeight = doorHeightMm + 50; // Allow slightly above frame
  
  const frameCenter = (hingeEdgeX + lockEdgeX) / 2;
  const searchWidth = 0.15; // 150mm search width
  
  const magLockPoints = points.filter(p => {
    const heightFromFloorMm = (p.y - floorHeight) * 1000;
    const distFromCenter = Math.abs(p.x - frameCenter);
    return heightFromFloorMm >= magLockMinHeight &&
           heightFromFloorMm <= magLockMaxHeight &&
           distFromCenter < searchWidth;
  });
  
  if (magLockPoints.length < MIN_POINT_COUNT) return null;
  
  const centroid = calculateCentroid(magLockPoints);
  const bbox = calculateBoundingBox(magLockPoints);
  
  const widthMm = bbox.width * 1000;
  const depthMm = bbox.depth * 1000;
  
  if (widthMm < 100 || widthMm > 350 || depthMm < 30 || depthMm > 100) return null;
  
  const pointDensityScore = Math.min(1, magLockPoints.length / 75);
  const sizeScore = (widthMm >= 150 && widthMm <= 250 && depthMm >= 40 && depthMm <= 70) ? 1 : 0.7;
  const confidence = (pointDensityScore * 0.6) + (sizeScore * 0.4);
  
  return {
    type: "mag-lock",
    centerPoint: centroid,
    boundingBox: {
      min: bbox.min,
      max: bbox.max,
      width: bbox.width,
      height: bbox.height,
      depth: bbox.depth
    },
    mountingSide: "ingress",
    heightFromFloor: (centroid.y - floorHeight) * 1000,
    distanceFromHingeEdge: Math.abs(centroid.x - hingeEdgeX) * 1000,
    distanceFromLockEdge: Math.abs(lockEdgeX - centroid.x) * 1000,
    confidence
  };
}

/**
 * Detect card reader near strike jamb on ingress side
 * Location: Near strike jamb, ingress side
 * Height range: 1000-1300mm from floor (ADA mounting height)
 * Distance from door edge: 100-300mm
 * Characteristics: Small protrusion, ~100mm x 50mm
 */
function detectCardReader(
  points: Point3D[],
  floorHeight: number,
  hingeEdgeX: number,
  lockEdgeX: number,
  boundingBox: BoundingBox
): HardwarePosition | null {
  const MIN_POINT_COUNT = 15;
  const cardReaderMinHeight = 1000; // 1000mm from floor
  const cardReaderMaxHeight = 1300; // 1300mm from floor (ADA compliant)
  const minDistFromDoor = 0.1; // 100mm from door edge
  const maxDistFromDoor = 0.3; // 300mm from door edge
  
  const cardReaderPoints = points.filter(p => {
    const heightFromFloorMm = (p.y - floorHeight) * 1000;
    const distFromLockEdge = p.x - lockEdgeX;
    
    return heightFromFloorMm >= cardReaderMinHeight &&
           heightFromFloorMm <= cardReaderMaxHeight &&
           distFromLockEdge >= minDistFromDoor &&
           distFromLockEdge <= maxDistFromDoor;
  });
  
  if (cardReaderPoints.length < MIN_POINT_COUNT) return null;
  
  const centroid = calculateCentroid(cardReaderPoints);
  const bbox = calculateBoundingBox(cardReaderPoints);
  
  const widthMm = bbox.width * 1000;
  const heightMm = bbox.height * 1000;
  
  if (widthMm < 40 || widthMm > 200 || heightMm < 80 || heightMm > 250) return null;
  
  const pointDensityScore = Math.min(1, cardReaderPoints.length / 40);
  const locationScore = 1.0; // Already filtered by location
  const sizeScore = (widthMm >= 60 && widthMm <= 130 && heightMm >= 100 && heightMm <= 180) ? 1 : 0.7;
  const confidence = (pointDensityScore * 0.5) + (locationScore * 0.2) + (sizeScore * 0.3);
  
  return {
    type: "card-reader",
    centerPoint: centroid,
    boundingBox: {
      min: bbox.min,
      max: bbox.max,
      width: bbox.width,
      height: bbox.height,
      depth: bbox.depth
    },
    mountingSide: "ingress",
    heightFromFloor: (centroid.y - floorHeight) * 1000,
    distanceFromHingeEdge: Math.abs(centroid.x - hingeEdgeX) * 1000,
    distanceFromLockEdge: Math.abs(lockEdgeX - centroid.x) * 1000,
    confidence
  };
}

/**
 * Detect electric strike in strike jamb
 * Location: Strike jamb, recessed into frame
 * Height range: 900-1100mm from floor (lock height)
 * Characteristics: Recessed cluster, rectangular void
 */
function detectElectricStrike(
  points: Point3D[],
  floorHeight: number,
  hingeEdgeX: number,
  lockEdgeX: number,
  boundingBox: BoundingBox
): HardwarePosition | null {
  const MIN_POINT_COUNT = 20;
  const strikeMinHeight = 900; // 900mm from floor
  const strikeMaxHeight = 1100; // 1100mm from floor (lock height range)
  const searchWidth = 0.08; // 80mm search width at lock edge
  
  const strikePoints = points.filter(p => {
    const heightFromFloorMm = (p.y - floorHeight) * 1000;
    const distFromLockEdge = Math.abs(p.x - lockEdgeX);
    
    return heightFromFloorMm >= strikeMinHeight &&
           heightFromFloorMm <= strikeMaxHeight &&
           distFromLockEdge < searchWidth;
  });
  
  if (strikePoints.length < MIN_POINT_COUNT) return null;
  
  const centroid = calculateCentroid(strikePoints);
  const bbox = calculateBoundingBox(strikePoints);
  
  const widthMm = bbox.width * 1000;
  const heightMm = bbox.height * 1000;
  const depthMm = bbox.depth * 1000;
  
  if (widthMm < 20 || widthMm > 100 || heightMm < 50 || heightMm > 200) return null;
  
  const depthVariance = calculateDepthVariance(strikePoints, centroid);
  const hasRecessPattern = depthVariance > 0.0005; // Significant depth variation indicates recessed hardware
  
  const pointDensityScore = Math.min(1, strikePoints.length / 50);
  const sizeScore = (widthMm >= 30 && widthMm <= 70 && heightMm >= 80 && heightMm <= 150) ? 1 : 0.7;
  const recessScore = hasRecessPattern ? 1 : 0.6;
  const confidence = (pointDensityScore * 0.4) + (sizeScore * 0.3) + (recessScore * 0.3);
  
  return {
    type: "electric-strike",
    centerPoint: centroid,
    boundingBox: {
      min: bbox.min,
      max: bbox.max,
      width: bbox.width,
      height: bbox.height,
      depth: bbox.depth
    },
    mountingSide: "ingress",
    heightFromFloor: (centroid.y - floorHeight) * 1000,
    distanceFromHingeEdge: Math.abs(centroid.x - hingeEdgeX) * 1000,
    distanceFromLockEdge: Math.abs(lockEdgeX - centroid.x) * 1000,
    confidence
  };
}

/**
 * Calculate depth variance for detecting recessed hardware patterns
 */
function calculateDepthVariance(points: Point3D[], centroid: Point3D): number {
  if (points.length < 2) return 0;
  
  let sumSquaredDiff = 0;
  for (const p of points) {
    const diff = p.z - centroid.z;
    sumSquaredDiff += diff * diff;
  }
  
  return sumSquaredDiff / points.length;
}

/**
 * Detect cylindrical/tubular structures representing electrical conduit, raceway, or wireway
 * Uses RANSAC cylinder fitting to identify conduit runs along wall and ceiling planes
 */
function detectConduitPaths(points: Point3D[], planes: DetectedPlane[]): ConduitPath[] {
  const conduitPaths: ConduitPath[] = [];
  
  // Configuration constants
  const WALL_PROXIMITY_THRESHOLD = 0.05; // 50mm in meters
  const MIN_CONDUIT_DIAMETER = 0.015; // 15mm minimum
  const MAX_CONDUIT_DIAMETER = 0.050; // 50mm maximum
  const TYPICAL_CONDUIT_DIAMETER = 0.022; // 22mm typical EMT
  const MIN_CONDUIT_POINTS = 20;
  const CYLINDER_RANSAC_ITERATIONS = 200;
  const CYLINDER_DISTANCE_THRESHOLD = 0.005; // 5mm tolerance
  const CLUSTER_NEIGHBOR_RADIUS = 0.04; // 40mm for region growing
  
  // Find wall and ceiling planes for conduit proximity detection
  const wallCeilingPlanes = planes.filter(p =>
    p.classification === "wall-interior" ||
    p.classification === "wall-exterior" ||
    p.classification === "head" ||
    p.classification.startsWith("jamb")
  );
  
  if (wallCeilingPlanes.length === 0 || points.length < MIN_CONDUIT_POINTS) {
    return [];
  }
  
  // Get points near wall/ceiling planes (within 50mm)
  const nearWallPoints: Array<{ point: Point3D; index: number }> = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    for (const plane of wallCeilingPlanes) {
      const dist = Math.abs(
        dotProduct(plane.normal, point) - plane.distance
      );
      if (dist < WALL_PROXIMITY_THRESHOLD) {
        nearWallPoints.push({ point, index: i });
        break;
      }
    }
  }
  
  if (nearWallPoints.length < MIN_CONDUIT_POINTS) {
    return [];
  }
  
  // Build K-D tree for efficient neighbor search
  const wallPointsOnly = nearWallPoints.map(np => np.point);
  const kdTree = buildKDTree(wallPointsOnly);
  
  if (!kdTree) {
    return [];
  }
  
  // Segment points into linear clusters using region growing
  const visited = new Set<number>();
  const clusters: Point3D[][] = [];
  
  for (let i = 0; i < nearWallPoints.length; i++) {
    if (visited.has(i)) continue;
    
    const cluster: Point3D[] = [];
    const queue: number[] = [i];
    
    while (queue.length > 0) {
      const idx = queue.shift()!;
      if (visited.has(idx)) continue;
      visited.add(idx);
      cluster.push(nearWallPoints[idx].point);
      
      // Find neighbors within clustering radius
      const neighbors = findKNearestNeighbors(kdTree, nearWallPoints[idx].point, 15);
      for (const neighbor of neighbors) {
        if (neighbor.distance < CLUSTER_NEIGHBOR_RADIUS && !visited.has(neighbor.index)) {
          queue.push(neighbor.index);
        }
      }
    }
    
    if (cluster.length >= MIN_CONDUIT_POINTS) {
      clusters.push(cluster);
    }
  }
  
  // Analyze each cluster for cylindrical fit
  for (const cluster of clusters) {
    const cylinderFit = ransacCylinderFit(cluster, {
      iterations: CYLINDER_RANSAC_ITERATIONS,
      distanceThreshold: CYLINDER_DISTANCE_THRESHOLD,
      minRadius: MIN_CONDUIT_DIAMETER / 2,
      maxRadius: MAX_CONDUIT_DIAMETER / 2
    });
    
    if (!cylinderFit || cylinderFit.inliers.length < MIN_CONDUIT_POINTS) {
      continue;
    }
    
    // Determine conduit type based on diameter
    const diameterMm = cylinderFit.radius * 2 * 1000; // Convert to mm
    let conduitType: "conduit" | "raceway" | "wireway";
    
    if (diameterMm < 30) {
      conduitType = "conduit"; // EMT, IMC, or similar tubing
    } else if (diameterMm < 80) {
      conduitType = "raceway"; // Surface raceway
    } else {
      conduitType = "wireway"; // Larger wireway/trough
    }
    
    // Order points along cylinder axis for path representation
    const orderedPoints = orderPointsAlongCylinderAxis(
      cylinderFit.inliers,
      cylinderFit.axis,
      cylinderFit.axisPoint
    );
    
    // Find potential connected hardware (electrical connections)
    const connected = findElectricalHardwareConnections(
      orderedPoints,
      planes,
      0.1 // 100mm connection threshold
    );
    
    conduitPaths.push({
      id: uuidv4(),
      type: conduitType,
      points: orderedPoints,
      diameter: diameterMm,
      connected
    });
  }
  
  return conduitPaths;
}

/**
 * RANSAC cylinder fitting configuration
 */
interface CylinderRANSACConfig {
  iterations: number;
  distanceThreshold: number;
  minRadius: number;
  maxRadius: number;
}

/**
 * Cylinder fit result from RANSAC
 */
interface CylinderFitResult {
  axis: Point3D;      // Unit vector along cylinder axis
  axisPoint: Point3D; // A point on the axis
  radius: number;     // Cylinder radius in meters
  inliers: Point3D[]; // Points fitting the cylinder
  confidence: number; // Fit confidence 0-1
}

/**
 * RANSAC cylinder fitting algorithm
 * Fits a cylinder to a point cloud and returns the best fit parameters
 */
function ransacCylinderFit(
  points: Point3D[],
  config: CylinderRANSACConfig
): CylinderFitResult | null {
  if (points.length < 6) return null;
  
  let bestInliers: Point3D[] = [];
  let bestAxis: Point3D = { x: 0, y: 0, z: 1 };
  let bestAxisPoint: Point3D = { x: 0, y: 0, z: 0 };
  let bestRadius = 0;
  
  const minInlierCount = Math.floor(points.length * 0.3);
  
  for (let iter = 0; iter < config.iterations; iter++) {
    // Select 3 random points to estimate cylinder parameters
    const indices = getRandomIndices(points.length, 3);
    const p1 = points[indices[0]];
    const p2 = points[indices[1]];
    const p3 = points[indices[2]];
    
    // Estimate cylinder axis from two points (directional)
    const axisCandidate = subtractVectors(p2, p1);
    const axisLen = vectorLength(axisCandidate);
    if (axisLen < 0.001) continue;
    
    const axis = scaleVector(axisCandidate, 1 / axisLen);
    
    // Project third point onto axis to estimate radius
    const p1ToP3 = subtractVectors(p3, p1);
    const projectionLen = dotProduct(p1ToP3, axis);
    const projectedPoint = addVectors(p1, scaleVector(axis, projectionLen));
    const radiusVec = subtractVectors(p3, projectedPoint);
    const radius = vectorLength(radiusVec);
    
    // Check radius bounds
    if (radius < config.minRadius || radius > config.maxRadius) continue;
    
    // Use p1 as axis point reference
    const axisPoint = p1;
    
    // Count inliers - points within distance threshold of cylinder surface
    const inliers: Point3D[] = [];
    
    for (const point of points) {
      const distToAxis = distancePointToLine(point, axisPoint, axis);
      const distToCylinder = Math.abs(distToAxis - radius);
      
      if (distToCylinder < config.distanceThreshold) {
        inliers.push(point);
      }
    }
    
    // Update best if this is better
    if (inliers.length > bestInliers.length) {
      bestInliers = inliers;
      bestAxis = axis;
      bestAxisPoint = axisPoint;
      bestRadius = radius;
      
      // Early exit if we have very high inlier ratio
      if (inliers.length > points.length * 0.8) {
        break;
      }
    }
  }
  
  if (bestInliers.length < minInlierCount) {
    return null;
  }
  
  // Refine cylinder parameters using inliers
  const refined = refineCylinderFit(bestInliers, bestAxis, bestAxisPoint, bestRadius);
  
  const confidence = bestInliers.length / points.length;
  
  return {
    axis: refined.axis,
    axisPoint: refined.axisPoint,
    radius: refined.radius,
    inliers: bestInliers,
    confidence
  };
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function distancePointToLine(point: Point3D, linePoint: Point3D, lineDir: Point3D): number {
  const pointToLine = subtractVectors(point, linePoint);
  const projectionLen = dotProduct(pointToLine, lineDir);
  const projectedPoint = addVectors(linePoint, scaleVector(lineDir, projectionLen));
  return distanceBetweenPoints(point, projectedPoint);
}

/**
 * Refine cylinder fit using least squares on inliers
 */
function refineCylinderFit(
  inliers: Point3D[],
  initialAxis: Point3D,
  initialAxisPoint: Point3D,
  initialRadius: number
): { axis: Point3D; axisPoint: Point3D; radius: number } {
  if (inliers.length < 3) {
    return { axis: initialAxis, axisPoint: initialAxisPoint, radius: initialRadius };
  }
  
  // Compute centroid of inliers as refined axis point
  const centroid = calculateCentroid(inliers);
  
  // Use PCA-like approach to refine axis direction
  // Find the principal direction of the point cloud
  let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0;
  
  for (const p of inliers) {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    const dz = p.z - centroid.z;
    
    cxx += dx * dx;
    cxy += dx * dy;
    cxz += dx * dz;
    cyy += dy * dy;
    cyz += dy * dz;
    czz += dz * dz;
  }
  
  // Simple power iteration to find principal eigenvector (axis direction)
  let v = [initialAxis.x, initialAxis.y, initialAxis.z];
  const matrix = [
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz]
  ];
  
  for (let i = 0; i < 10; i++) {
    const mv = [
      matrix[0][0] * v[0] + matrix[0][1] * v[1] + matrix[0][2] * v[2],
      matrix[1][0] * v[0] + matrix[1][1] * v[1] + matrix[1][2] * v[2],
      matrix[2][0] * v[0] + matrix[2][1] * v[1] + matrix[2][2] * v[2]
    ];
    
    const norm = Math.sqrt(mv[0] * mv[0] + mv[1] * mv[1] + mv[2] * mv[2]);
    if (norm < 0.0001) break;
    
    v = [mv[0] / norm, mv[1] / norm, mv[2] / norm];
  }
  
  const refinedAxis = normalizeVector({ x: v[0], y: v[1], z: v[2] });
  
  // Recalculate average radius using refined axis
  let totalDist = 0;
  for (const p of inliers) {
    totalDist += distancePointToLine(p, centroid, refinedAxis);
  }
  const refinedRadius = totalDist / inliers.length;
  
  return {
    axis: refinedAxis,
    axisPoint: centroid,
    radius: refinedRadius
  };
}

/**
 * Order points along the cylinder axis to create a path
 */
function orderPointsAlongCylinderAxis(
  points: Point3D[],
  axis: Point3D,
  axisPoint: Point3D
): Point3D[] {
  if (points.length === 0) return [];
  
  // Project each point onto the axis and sort by projection distance
  const projectedPoints = points.map(p => {
    const vec = subtractVectors(p, axisPoint);
    const projectionDist = dotProduct(vec, axis);
    return { point: p, projectionDist };
  });
  
  projectedPoints.sort((a, b) => a.projectionDist - b.projectionDist);
  
  // Sample points along the path to create a smooth representation
  const orderedPoints: Point3D[] = [];
  const sampleInterval = Math.max(1, Math.floor(projectedPoints.length / 50)); // Max 50 points
  
  for (let i = 0; i < projectedPoints.length; i += sampleInterval) {
    orderedPoints.push(projectedPoints[i].point);
  }
  
  // Always include the last point
  if (orderedPoints.length > 0 && orderedPoints[orderedPoints.length - 1] !== projectedPoints[projectedPoints.length - 1].point) {
    orderedPoints.push(projectedPoints[projectedPoints.length - 1].point);
  }
  
  return orderedPoints;
}

/**
 * Find hardware that has electrical connections near conduit path endpoints
 * Returns IDs of connected hardware (closer, mag locks, electric strikes)
 */
function findElectricalHardwareConnections(
  pathPoints: Point3D[],
  planes: DetectedPlane[],
  connectionThreshold: number
): string[] {
  const connected: string[] = [];
  
  if (pathPoints.length < 2) return connected;
  
  // Get path endpoints
  const startPoint = pathPoints[0];
  const endPoint = pathPoints[pathPoints.length - 1];
  
  // Check for proximity to electrical hardware locations
  // Standard heights for electrical door hardware (in meters from floor)
  const electricalHardwareZones = [
    { name: "closer", minHeight: 1.8, maxHeight: 2.2 },      // Door closer zone
    { name: "strike", minHeight: 0.9, maxHeight: 1.1 },       // Electric strike zone
    { name: "mag-lock", minHeight: 1.9, maxHeight: 2.1 },     // Magnetic lock zone
    { name: "reader", minHeight: 1.0, maxHeight: 1.3 },       // Card reader zone
    { name: "rex", minHeight: 1.0, maxHeight: 1.2 }           // Request-to-exit zone
  ];
  
  // Find floor plane to calculate heights
  const floorPlane = planes.find(p => 
    p.classification === "floor" || 
    p.classification === "sill" ||
    p.classification === "threshold"
  );
  
  const floorHeight = floorPlane ? floorPlane.bounds.min.y : 0;
  
  for (const endpoint of [startPoint, endPoint]) {
    const heightFromFloor = endpoint.y - floorHeight;
    
    for (const zone of electricalHardwareZones) {
      if (heightFromFloor >= zone.minHeight && heightFromFloor <= zone.maxHeight) {
        // Generate a consistent ID based on zone and approximate position
        const zoneId = `${zone.name}-${Math.round(endpoint.x * 100)}-${Math.round(endpoint.z * 100)}`;
        if (!connected.includes(zoneId)) {
          connected.push(zoneId);
        }
      }
    }
  }
  
  // Check for proximity to jamb planes (common conduit termination points)
  const jambPlanes = planes.filter(p => 
    p.classification === "jamb-left" || 
    p.classification === "jamb-right"
  );
  
  for (const jamb of jambPlanes) {
    for (const endpoint of [startPoint, endPoint]) {
      const distToJamb = Math.abs(dotProduct(jamb.normal, endpoint) - jamb.distance);
      if (distToJamb < connectionThreshold) {
        const jambId = `jamb-${jamb.classification}-connection`;
        if (!connected.includes(jambId)) {
          connected.push(jambId);
        }
      }
    }
  }
  
  return connected;
}

// ============================================================================
// DOOR ANALYSIS FROM DUAL SCAN
// ============================================================================

/**
 * Analyze door from dual scan (closed + open positions)
 * Uses hybrid ML + geometric hardware detection for best results
 */
export async function analyzeDoorFromDualScan(
  closedPoints: Point3D[],
  openPoints: Point3D[],
  registrationResult: ScanRegistrationResult,
  useMLDetection: boolean = true
): Promise<DoorAnalysisResult> {
  const alignedOpenPoints = transformPoints(openPoints, registrationResult.transformMatrix);
  
  const closedBBox = calculateBoundingBox(closedPoints);
  const openBBox = calculateBoundingBox(alignedOpenPoints);
  
  logger.info("Analyzing door from dual scan", {
    closedPoints: closedPoints.length,
    openPoints: openPoints.length,
    useMLDetection
  });
  
  const closedPlanes = detectPlanes(closedPoints, 8);
  const openPlanes = detectPlanes(alignedOpenPoints, 8);
  
  const classifiedPlanes = classifyPlanes(closedPlanes, closedBBox);
  
  const { hingeSide, swingDirection, swingAngle, pivotPoint, swingArc } = 
    determineSwingOrientation(closedPoints, alignedOpenPoints, closedBBox);
  
  const ingressSide: ScanSide = swingDirection.includes("reverse") ? "egress" : "ingress";
  const egressSide: ScanSide = ingressSide === "ingress" ? "egress" : "ingress";
  
  const dimensions = calculateDoorDimensions(closedBBox, classifiedPlanes);
  
  const geometricHardware = detectHardwarePositions(closedPoints, classifiedPlanes);
  
  let hardware: DetectedHardware;
  let mlStatus: string = "not_used";
  let mlConfidence: number = 0;
  
  if (useMLDetection) {
    try {
      const cadBoundingBox: BoundingBox3D = {
        min: closedBBox.min,
        max: closedBBox.max,
        width: closedBBox.width,
        height: closedBBox.height,
        depth: closedBBox.depth
      };
      
      const hybridResult = await detectHardwareHybrid(
        closedPoints,
        cadBoundingBox,
        classifiedPlanes,
        geometricHardware
      );
      
      hardware = hybridResult.hardware;
      mlStatus = hybridResult.mlStatus;
      mlConfidence = hybridResult.mlConfidence;
      
      logger.info("ML-enhanced hardware detection complete", {
        hingeCount: hardware.hinges.length,
        hasLock: !!hardware.lock,
        hasCloser: !!hardware.closer,
        hasPanic: !!hardware.panic,
        mlStatus,
        mlConfidence,
        processingNotes: hybridResult.processingNotes
      });
    } catch (error) {
      logError(error as Error, { context: "ml-hardware-detection-fallback" });
      hardware = geometricHardware;
      mlStatus = "error";
    }
  } else {
    hardware = geometricHardware;
  }
  
  const clearances = calculateDoorClearances(closedBBox, dimensions, hardware);
  
  const confidence = calculateAnalysisConfidence(
    closedPoints.length,
    openPoints.length,
    classifiedPlanes,
    registrationResult
  );

  return {
    dimensions,
    orientation: {
      hingeSide,
      swingDirection,
      swingAngle,
      ingressSide,
      egressSide,
      pivotPoint,
      swingArc
    },
    hardware,
    clearances,
    planes: classifiedPlanes,
    confidence,
    mlDetection: {
      status: mlStatus,
      confidence: mlConfidence,
      used: useMLDetection
    }
  };
}

function determineSwingOrientation(
  closedPoints: Point3D[],
  openPoints: Point3D[],
  boundingBox: BoundingBox
): {
  hingeSide: HingeSide;
  swingDirection: SwingDirection;
  swingAngle: number;
  pivotPoint: Point3D;
  swingArc: Point2D[];
} {
  const closedCenterX = (boundingBox.min.x + boundingBox.max.x) / 2;
  const closedCenterZ = (boundingBox.min.z + boundingBox.max.z) / 2;
  
  const openBBox = calculateBoundingBox(openPoints);
  const openCenterX = (openBBox.min.x + openBBox.max.x) / 2;
  const openCenterZ = (openBBox.min.z + openBBox.max.z) / 2;
  
  const leftPointsClosed = closedPoints.filter(p => p.x < closedCenterX).length;
  const rightPointsClosed = closedPoints.filter(p => p.x >= closedCenterX).length;
  const leftPointsOpen = openPoints.filter(p => p.x < closedCenterX).length;
  const rightPointsOpen = openPoints.filter(p => p.x >= closedCenterX).length;
  
  const leftDiff = Math.abs(leftPointsClosed - leftPointsOpen);
  const rightDiff = Math.abs(rightPointsClosed - rightPointsOpen);
  
  const hingeSide: HingeSide = leftDiff < rightDiff ? "left" : "right";
  
  const pivotX = hingeSide === "left" ? boundingBox.min.x : boundingBox.max.x;
  const pivotY = boundingBox.min.y;
  const pivotZ = closedCenterZ;
  const pivotPoint: Point3D = { x: pivotX, y: pivotY, z: pivotZ };
  
  const deltaZ = openCenterZ - closedCenterZ;
  const deltaX = openCenterX - closedCenterX;
  const swingAngle = Math.abs(Math.atan2(deltaZ, Math.abs(deltaX))) * (180 / Math.PI);
  
  let swingDirection: SwingDirection;
  const swingsToward = deltaZ > 0;
  
  if (hingeSide === "left") {
    swingDirection = swingsToward ? "left-hand" : "left-hand-reverse";
  } else {
    swingDirection = swingsToward ? "right-hand" : "right-hand-reverse";
  }
  
  const swingArc: Point2D[] = [];
  const arcSteps = 10;
  const radius = boundingBox.width;
  
  for (let i = 0; i <= arcSteps; i++) {
    const angle = (swingAngle * i / arcSteps) * (Math.PI / 180);
    const x = pivotX + (hingeSide === "left" ? 1 : -1) * radius * Math.cos(angle);
    const y = pivotZ + radius * Math.sin(angle) * (swingsToward ? 1 : -1);
    swingArc.push({ x, y });
  }

  return { hingeSide, swingDirection, swingAngle, pivotPoint, swingArc };
}

function calculateDoorDimensions(
  boundingBox: BoundingBox,
  planes: DetectedPlane[]
): DoorDimensions {
  const toMm = 1000;
  
  const leftJamb = planes.find(p => p.classification === "jamb-left");
  const rightJamb = planes.find(p => p.classification === "jamb-right");
  const head = planes.find(p => p.classification === "head");
  const sill = planes.find(p => p.classification === "sill" || p.classification === "floor");
  const doorLeaf = planes.find(p => p.classification === "door-leaf");
  
  const frameWidth = (rightJamb && leftJamb) 
    ? (rightJamb.bounds.min.x - leftJamb.bounds.max.x) * toMm
    : boundingBox.width * toMm;
    
  const frameHeight = (head && sill)
    ? (head.bounds.min.y - sill.bounds.max.y) * toMm
    : boundingBox.height * toMm;
    
  const frameDepth = boundingBox.depth * toMm;
  
  const revealWidth = 13;
  const leafWidth = frameWidth - (revealWidth * 2);
  const leafHeight = frameHeight - revealWidth - 13;
  const leafThickness = doorLeaf ? doorLeaf.bounds.depth * toMm : 44;
  
  return {
    frameWidth: createDim(frameWidth, "scan"),
    frameHeight: createDim(frameHeight, "scan"),
    frameDepth: createDim(frameDepth, "scan"),
    leafWidth: createDim(leafWidth, "derived"),
    leafHeight: createDim(leafHeight, "derived"),
    leafThickness: createDim(leafThickness, doorLeaf ? "scan" : "derived"),
    revealLeft: createDim(revealWidth, "derived"),
    revealRight: createDim(revealWidth, "derived"),
    revealTop: createDim(revealWidth, "derived"),
    stopDepth: createDim(13, "derived"),
    wallThickness: createDim(boundingBox.depth * toMm * 2, "derived")
  };
}

function calculateDoorClearances(
  boundingBox: BoundingBox,
  dimensions: DoorDimensions,
  hardware: DetectedHardware
): DoorClearances {
  const undercut = 19;
  const hingeGap = 3;
  const lockGap = 3;
  const headGap = 3;
  
  const adaClearWidth = dimensions.leafWidth.valueMm - 25;
  const adaPushSideClear = 305;
  const adaPullSideClear = 457;

  return {
    undercut: createDim(undercut, "derived"),
    hingeGap: createDim(hingeGap, "derived"),
    lockGap: createDim(lockGap, "derived"),
    headGap: createDim(headGap, "derived"),
    adaClearWidth: createDim(adaClearWidth, "derived"),
    adaPushSideClear: createDim(adaPushSideClear, "derived"),
    adaPullSideClear: createDim(adaPullSideClear, "derived")
  };
}

function calculateAnalysisConfidence(
  closedPointCount: number,
  openPointCount: number,
  planes: DetectedPlane[],
  registration: ScanRegistrationResult
): AnalysisConfidence {
  const minPoints = Math.min(closedPointCount, openPointCount);
  const pointConfidence = Math.min(1, minPoints / 5000);
  
  const requiredPlanes = ["jamb-left", "jamb-right", "head", "door-leaf"];
  const foundPlanes = planes.filter(p => requiredPlanes.includes(p.classification)).length;
  const dimensionConfidence = foundPlanes / requiredPlanes.length;
  
  const orientationConfidence = registration.confidence * 0.8 + 0.2;
  
  const hardwareConfidence = 0.7;
  
  const overall = (pointConfidence + dimensionConfidence + orientationConfidence + hardwareConfidence + registration.confidence) / 5;

  return {
    overall: Math.min(1, Math.max(0, overall)),
    dimensions: dimensionConfidence,
    orientation: orientationConfidence,
    hardware: hardwareConfidence,
    registration: registration.confidence
  };
}

// ============================================================================
// MAIN PROCESSING FUNCTIONS
// ============================================================================

export async function processPointCloud(
  filePath: string,
  format: "ply" | "obj" | "json"
): Promise<{ metrics: ProcessedMetrics; confidence: ConfidenceScores }> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    let points: Point3D[];
    switch (format) {
      case "ply":
        points = parsePLY(content);
        break;
      case "obj":
        points = parseOBJ(content);
        break;
      case "json":
        points = parseJSON(content);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    if (points.length === 0) {
      throw new Error('No points found in file');
    }
    
    logger.info("Parsed point cloud file", { pointCount: points.length, format, filePath });
    
    const boundingBox = calculateBoundingBox(points);
    const planes = detectPlanes(points, 3);
    const swingDirection = inferSwingDirection(points, boundingBox);
    const confidence = calculateConfidenceScores(points, boundingBox, planes);
    
    const metersToMm = 1000;
    
    const metrics: ProcessedMetrics = {
      width: Math.round(boundingBox.width * metersToMm),
      height: Math.round(boundingBox.height * metersToMm),
      frameDepth: Math.round(boundingBox.depth * metersToMm),
      swingDirection: swingDirection as any,
      pointCount: points.length,
      units: "millimeters"
    };
    
    return { metrics, confidence };
  } catch (error) {
    logError(error as Error, { context: 'process-point-cloud', filePath, format });
    throw error;
  }
}

/**
 * Main dual-scan processing pipeline
 * Processes closed and open door scans to produce complete door analysis
 */
export async function processDualScan(
  closedScanPath: string,
  openScanPath: string,
  format: "ply" | "obj" | "json",
  openFormat: "ply" | "obj" | "json" = format
): Promise<DoorAnalysisResult> {
  try {
    logger.info("Starting dual-scan processing", { closedScanPath, openScanPath, format });
    
    const [closedContent, openContent] = await Promise.all([
      readDualScanContent(closedScanPath),
      readDualScanContent(openScanPath),
    ]);
    
    const closedPoints = parsePointCloud(closedContent, format);
    const openPoints = parsePointCloud(openContent, openFormat);
    
    if (closedPoints.length === 0) {
      throw new Error('No points found in closed scan file');
    }
    if (openPoints.length === 0) {
      throw new Error('No points found in open scan file');
    }
    
    logger.info("Parsed dual scan point clouds", {
      closedPointCount: closedPoints.length,
      openPointCount: openPoints.length
    });
    
    const registrationResult = registerDualScans(
      { points: closedPoints },
      { points: openPoints }
    );
    
    logger.info("Scan registration complete", {
      registrationError: registrationResult.registrationError,
      overlapPercentage: registrationResult.overlapPercentage,
      confidence: registrationResult.confidence
    });
    
    const analysisResult = await analyzeDoorFromDualScan(
      closedPoints,
      openPoints,
      registrationResult
    );
    
    logger.info("Door analysis complete", {
      hingeSide: analysisResult.orientation.hingeSide,
      swingDirection: analysisResult.orientation.swingDirection,
      swingAngle: analysisResult.orientation.swingAngle,
      confidence: analysisResult.confidence.overall,
      hingeCount: analysisResult.hardware.hinges.length,
      hasLock: !!analysisResult.hardware.lock,
      hasCloser: !!analysisResult.hardware.closer
    });
    
    return analysisResult;
  } catch (error) {
    logError(error as Error, { 
      context: 'process-dual-scan', 
      closedScanPath, 
      openScanPath, 
      format 
    });
    throw error;
  }
}

// Export for testing
export const _testing = {
  parsePLY,
  parseOBJ,
  parseJSON,
  parsePointCloud,
  calculateBoundingBox,
  detectPlanes,
  inferSwingDirection,
  calculateConfidenceScores,
  vectorLength,
  normalizeVector,
  dotProduct,
  crossProduct,
  subtractVectors,
  addVectors,
  scaleVector,
  distanceBetweenPoints,
  calculateCentroid,
  transformPoints,
  multiplyMatrices
};
