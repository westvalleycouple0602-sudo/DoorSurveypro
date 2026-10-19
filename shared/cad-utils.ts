import type { Point3D } from "./cad-drawing-types";

export function vectorLength(v: Point3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalizeVector(v: Point3D): Point3D {
  const len = vectorLength(v);
  if (len < 0.0001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function dotProduct(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossProduct(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

export function subtractVectors(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function addVectors(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scaleVector(v: Point3D, s: number): Point3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function distanceBetweenPoints(a: Point3D, b: Point3D): number {
  return vectorLength(subtractVectors(a, b));
}

export function calculateCentroid(points: Point3D[]): Point3D {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  const sum = points.reduce((acc, p) => addVectors(acc, p), { x: 0, y: 0, z: 0 });
  return scaleVector(sum, 1 / points.length);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function angleBetweenVectors(a: Point3D, b: Point3D): number {
  const dot = dotProduct(normalizeVector(a), normalizeVector(b));
  return Math.acos(clamp(dot, -1, 1));
}

export function rotatePoint2D(point: { x: number; y: number }, angle: number, origin: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos
  };
}
