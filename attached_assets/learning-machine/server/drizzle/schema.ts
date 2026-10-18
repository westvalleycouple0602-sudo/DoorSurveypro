import { pgTable, uuid, text, varchar, timestamp, jsonb, numeric, boolean, integer } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const openings = pgTable("openings", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  doorType: varchar("door_type", { length: 64 }).notNull(),
  locationLabel: varchar("location_label", { length: 256 }),
  floor: varchar("floor", { length: 32 }),
  room: varchar("room", { length: 64 }),
  rawMetadata: jsonb("raw_metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const captures = pgTable("captures", {
  id: uuid("id").primaryKey().defaultRandom(),
  openingId: uuid("opening_id").notNull().references(() => openings.id),
  kind: varchar("kind", { length: 32 }).notNull(),
  s3Url: text("s3_url").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  phash: varchar("phash", { length: 32 }),
  widthPx: integer("width_px"),
  heightPx: integer("height_px"),
  exif: jsonb("exif"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const featuresOpeningLatest = pgTable("features_opening_latest", {
  openingId: uuid("opening_id").primaryKey().references(() => openings.id),
  clearWidthMm: numeric("clear_width_mm"),
  leafThicknessMm: numeric("leaf_thickness_mm"),
  swing: varchar("swing", { length: 16 }),
  hardwareSet: jsonb("hardware_set"),
  complianceScore: numeric("compliance_score"),
  lastComputedAt: timestamp("last_computed_at", { withTimezone: true }).defaultNow(),
});

export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  captureId: uuid("capture_id").notNull().references(() => captures.id),
  modality: varchar("modality", { length: 16 }).notNull(),
  model: varchar("model", { length: 64 }).notNull(),
  vec: vector("vec", { dimensions: 1024 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const violations = pgTable("violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  openingId: uuid("opening_id").notNull().references(() => openings.id),
  ruleId: varchar("rule_id", { length: 64 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull(),
  message: text("message").notNull(),
  evidenceCaptureId: uuid("evidence_capture_id").references(() => captures.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
