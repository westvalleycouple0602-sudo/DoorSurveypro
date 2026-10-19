import React, { createContext, useContext, useCallback } from "react";
import { useTenant } from "./tenant-context";
export type Metric = { name: string; tenantId: string; userId: string; at: number; props?: Record<string, any> };
export type TelemetryHandler = (m: Metric) => void;
export const TelemetryCtx = createContext<TelemetryHandler>(() => {});
export const useTelemetry = () => useContext(TelemetryCtx);
export function useEmitMetric() {
  const { tenant, user } = useTenant();
  const send = useTelemetry();
  return useCallback((name: string, props?: Record<string, any>) => { send({ name, tenantId: tenant.id, userId: user.id, at: Date.now(), props }); }, [tenant.id, user.id, send]);
}
