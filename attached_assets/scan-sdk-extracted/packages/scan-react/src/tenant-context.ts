import React, { createContext, useContext } from "react";
export type Role = "owner" | "admin" | "installer" | "surveyor" | "viewer";
export type Permission = "scan:start" | "scan:export" | "scan:hardware" | "scan:compliance" | "scan:voice" | "scan:subtitles";
export type FeatureFlags = { voice?: boolean; subtitles?: boolean; dualPass?: boolean; heatmap?: boolean; arDepth?: boolean; };
export interface TenantConfig {
  id: string; name: string; theme?: Record<string, string>; locale?: string;
  flags?: FeatureFlags; thresholds?: { coveragePct: number; confidence: number; maxAngleDeg: number; minDistM: number; maxDistM: number };
  permissions?: Partial<Record<Role, Permission[]>>;
}
export interface CurrentUser { id: string; email: string; role: Role }
const DEFAULT_FLAGS: FeatureFlags = { voice: true, subtitles: true, dualPass: true, heatmap: true, arDepth: true };
const DEFAULT_THRESHOLDS = { coveragePct: 80, confidence: 0.8, maxAngleDeg: 25, minDistM: 1.5, maxDistM: 2.0 };
const DEFAULT_PERMS: Record<Role, Permission[]> = {
  owner: ["scan:start","scan:export","scan:hardware","scan:compliance","scan:voice","scan:subtitles"],
  admin: ["scan:start","scan:export","scan:hardware","scan:compliance","scan:voice","scan:subtitles"],
  installer: ["scan:start","scan:hardware","scan:export","scan:voice","scan:subtitles"],
  surveyor: ["scan:start","scan:hardware","scan:voice","scan:subtitles"],
  viewer: ["scan:subtitles"],
};
export const TenantCtx = createContext<{ tenant: TenantConfig; user: CurrentUser; flags: Required<FeatureFlags>; thresholds: typeof DEFAULT_THRESHOLDS } | null>(null);
export function useTenant() { const v = useContext(TenantCtx); if (!v) throw new Error("useTenant must be inside TenantCtx.Provider"); return v; }
export function hasPerm(tenant: TenantConfig, role: Role, perm: Permission): boolean {
  const table = tenant.permissions ?? DEFAULT_PERMS; const list = table[role] ?? []; return list.includes(perm);
}
export function buildContext(tenant: TenantConfig, user: CurrentUser) {
  return { tenant, user, flags: { ...DEFAULT_FLAGS, ...(tenant.flags||{}) } as Required<FeatureFlags>, thresholds: { ...DEFAULT_THRESHOLDS, ...(tenant.thresholds||{}) } };
}
