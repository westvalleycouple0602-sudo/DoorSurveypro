import type { Dim } from "@doorsurvey/scan-core";
export interface DepthPlatformApi {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  capturePhoto: () => Promise<string>;
  ensureScale: () => Promise<{ scaleOk: boolean }>;
  measureBetween: (a: string, b: string) => Promise<Dim>;
  measureEdgeSeries: (edge: string) => Promise<Dim>;
  getQuality: () => Promise<{ coveragePct: number; qualityScore: number; confidence?: number }>;
}
const mockAdapter: DepthPlatformApi = {
  async start() {}, async stop() {}, async capturePhoto() { return "mock://photo"; },
  async ensureScale() { return { scaleOk: true }; },
  async measureBetween() { return { valueMm: 915, source: "scan", uncertainty: 2 }; },
  async measureEdgeSeries() { return { valueMm: 914, source: "scan", uncertainty: 3 }; },
  async getQuality() { return { coveragePct: 86, qualityScore: 0.82, confidence: 0.91 }; },
};
export interface AdapterFactoryOpts { preferNative?: boolean }
export function createAdapter(_opts: AdapterFactoryOpts = {}): DepthPlatformApi { return mockAdapter; }
export { mockAdapter }; export type { Dim };
