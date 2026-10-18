import { pgTable, varchar, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import type { DualScanStatus, DoorAnalysisResult, DoorDrawingSet } from "../cad-drawing-types";

// This endpoint predates the newer three-capture scan protocol.
export interface DualScanSessionData {
  id: string;
  organizationId: string;
  projectId: string;
  openingId: string;
  status: DualScanStatus | "pending-closed" | "closed-captured";
  closedScanPath?: string;
  openScanPath?: string;
  closedScanFormat?: "ply" | "obj" | "json";
  openScanFormat?: "ply" | "obj" | "json";
  analysisResult?: DoorAnalysisResult;
  drawingSet?: DoorDrawingSet;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  revision?: number;
}

// No new FKs against legacy tables: their deployed definitions can differ.
// Project/opening ownership is validated by the existing create endpoint.
export const dualScanSessions = pgTable("dual_scan_sessions", {
  id: varchar("id").primaryKey(),
  organizationId: varchar("organization_id").notNull(),
  projectId: varchar("project_id").notNull(),
  openingId: varchar("opening_id").notNull(),
  data: jsonb("data").$type<DualScanSessionData>().notNull(),
  revision: integer("revision").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("dual_scan_sessions_org_idx").on(table.organizationId)]);
