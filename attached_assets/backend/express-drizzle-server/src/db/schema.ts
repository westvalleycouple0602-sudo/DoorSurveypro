import { pgTable, uuid, varchar, timestamp, boolean, integer, text, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 120 }).notNull(),
  displayName: varchar("display_name", { length: 160 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 32 }).notNull(), // owner | admin | manager | surveyor | viewer
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 240 }).notNull(),
  address: varchar("address", { length: 400 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const floorPlans = pgTable("floor_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  name: varchar("name", { length: 240 }).notNull(),
  imageUrl: text("image_url").notNull(),
  widthPx: integer("width_px"),
  heightPx: integer("height_px"),
  scalePixelsPerUnit: integer("scale_pixels_per_unit"),
  scaleUnit: varchar("scale_unit", { length: 8 }), // ft | m
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const openings = pgTable("openings", {
  id: uuid("id").primaryKey().defaultRandom(),
  floorPlanId: uuid("floor_plan_id").notNull().references(() => floorPlans.id),
  code: varchar("code", { length: 64 }).notNull(),
  label: varchar("label", { length: 240 }),
  type: varchar("type", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }), // planned | existing | installed
  x: text("x").notNull(),
  y: text("y").notNull(),
  heroUrl: text("hero_url"),
  thumbUrl: text("thumb_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const hardwareSets = pgTable("hardware_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  label: varchar("label", { length: 240 }).notNull(),
  items: jsonb("items").$type<Array<{bhma:string; name:string; grade?:string; qty?:number; notes?:string}>>().default([]).notNull()
});

export const openingFiles = pgTable("opening_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  openingId: uuid("opening_id").notNull().references(() => openings.id),
  kind: varchar("kind", { length: 32 }).notNull(),
  name: varchar("name", { length: 240 }).notNull(),
  url: text("url").notNull(),
  thumbUrl: text("thumb_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wiringDiagrams = pgTable("wiring_diagrams", {
  id: uuid("id").primaryKey().defaultRandom(),
  openingId: uuid("opening_id").notNull().references(() => openings.id),
  name: varchar("name", { length: 240 }).notNull(),
  svgUrl: text("svg_url").notNull(),
  overlayPolylines: jsonb("overlay_polylines").$type<number[][][]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const openingHardware = pgTable("opening_hardware", {
  id: uuid("id").primaryKey().defaultRandom(),
  openingId: uuid("opening_id").notNull().references(() => openings.id),
  hardwareSetId: uuid("hardware_set_id").notNull().references(() => hardwareSets.id)
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id").notNull(),
  method: varchar("method", { length: 8 }).notNull(),
  path: varchar("path", { length: 512 }).notNull(),
  status: integer("status").notNull(),
  ip: varchar("ip", { length: 64 }),
  ua: text("ua"),
  at: timestamp("at").defaultNow().notNull(),
  extra: jsonb("extra")
});
