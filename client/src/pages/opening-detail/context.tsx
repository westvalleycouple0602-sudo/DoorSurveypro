import { createContext, useContext, type ReactNode } from "react";
import type { DoorOpening, Project, Photo, HardwareItem, HardwareBundle, ManufacturerContact, QuoteRequest, LidarScan } from "@shared/schema";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

/**
 * Shared context for opening detail page
 * Provides data, queries, and mutations to all feature panels
 */

export interface ScanConfig {
  coverageThreshold: number;
  confidenceThreshold: number;
  minDistanceM: number;
  maxDistanceM: number;
  maxAngleDeg: number;
}

interface OpeningDetailContextValue {
  // Core data
  opening: DoorOpening;
  project?: Project;
  openingId: string;
  
  // Queries
  openingQuery: UseQueryResult<DoorOpening>;
  projectQuery: UseQueryResult<Project>;
  photosQuery: UseQueryResult<Photo[]>;
  hardwareQuery: UseQueryResult<HardwareItem[]>;
  bundlesQuery: UseQueryResult<HardwareBundle[]>;
  manufacturersQuery: UseQueryResult<ManufacturerContact[]>;
  quoteRequestsQuery: UseQueryResult<QuoteRequest[]>;
  lidarScansQuery: UseQueryResult<LidarScan[]>;
  scanConfigQuery: UseQueryResult<ScanConfig>;
  
  // Mutations
  updateOpening: UseMutationResult<DoorOpening, Error, Partial<DoorOpening>, unknown>;
  deleteOpening: UseMutationResult<void, Error, void, unknown>;
  duplicateOpening: UseMutationResult<DoorOpening, Error, void, unknown>;
  uploadLidarScan: UseMutationResult<void, Error, void, unknown>;
  processLidarScan: UseMutationResult<any, Error, string, unknown>;
  deleteLidarScan: UseMutationResult<any, Error, string, unknown>;
  
  // Utilities
  refetchAll: () => Promise<void>;
}

const OpeningDetailContext = createContext<OpeningDetailContextValue | null>(null);

export function useOpeningDetail() {
  const context = useContext(OpeningDetailContext);
  if (!context) {
    throw new Error("useOpeningDetail must be used within OpeningDetailProvider");
  }
  return context;
}

export function OpeningDetailProvider({
  value,
  children,
}: {
  value: OpeningDetailContextValue;
  children: ReactNode;
}) {
  return (
    <OpeningDetailContext.Provider value={value}>
      {children}
    </OpeningDetailContext.Provider>
  );
}
