
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, serial, real, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations } from "./auth.schema";

// ============================================================================
// CATALOG & REFERENCE TABLES
// ============================================================================

export const hardwareCatalog = pgTable("hardware_catalog", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model").notNull(),
  description: text("description"),
  specifications: jsonb("specifications"),
  msrp: real("msrp"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_hardware_catalog_category").on(table.category),
  index("IDX_hardware_catalog_manufacturer").on(table.manufacturer),
]);

export const doorReference = pgTable("door_reference", {
  id: serial("id").primaryKey(),
  illustration: text("illustration"),
  category: text("category"),
  subcategory: text("subcategory"),
  doorType: text("door_type"),
  material: text("material"),
  finish: text("finish"),
  configuration: text("configuration"),
  operation: text("operation"),
  notes: text("notes"),
});

export const optionsLookup = pgTable("options_lookup", {
  id: serial("id").primaryKey(),
  field: text("field").notNull(),
  value: text("value").notNull(),
});

export const insertHardwareCatalogSchema = createInsertSchema(hardwareCatalog).omit({
  id: true,
  createdAt: true,
});

export type InsertHardwareCatalog = z.infer<typeof insertHardwareCatalogSchema>;
export type HardwareCatalog = typeof hardwareCatalog.$inferSelect;

// ============================================================================
// MANUFACTURER & PRODUCT DATA MODEL
// ============================================================================

export const manufacturerGroups = pgTable("manufacturer_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: varchar("is_active").notNull().default("yes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_manufacturer_groups_name").on(table.name),
]);

export const insertManufacturerGroupSchema = createInsertSchema(manufacturerGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManufacturerGroup = z.infer<typeof insertManufacturerGroupSchema>;
export type ManufacturerGroup = typeof manufacturerGroups.$inferSelect;

export const manufacturers = pgTable("manufacturers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => manufacturerGroups.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  code: varchar("code").unique(),
  website: text("website"),
  country: varchar("country"),
  description: text("description"),
  logoUrl: text("logo_url"),
  isActive: varchar("is_active").notNull().default("yes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_manufacturers_name").on(table.name),
  index("IDX_manufacturers_code").on(table.code),
  index("IDX_manufacturers_group_id").on(table.groupId),
]);

export const insertManufacturerSchema = createInsertSchema(manufacturers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturers.$inferSelect;

export const productFamilies = pgTable("product_families", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manufacturerId: varchar("manufacturer_id").notNull().references(() => manufacturers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: varchar("category"),
  subcategory: varchar("subcategory"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_product_families_manufacturer_id").on(table.manufacturerId),
  index("IDX_product_families_category").on(table.category),
]);

export const insertProductFamilySchema = createInsertSchema(productFamilies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductFamily = z.infer<typeof insertProductFamilySchema>;
export type ProductFamily = typeof productFamilies.$inferSelect;

export const productSkus = pgTable("product_skus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => productFamilies.id, { onDelete: "set null" }),
  manufacturerId: varchar("manufacturer_id").notNull().references(() => manufacturers.id, { onDelete: "cascade" }),
  sku: varchar("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  material: varchar("material"),
  fireRating: varchar("fire_rating"),
  grade: varchar("grade"),
  voltage: varchar("voltage"),
  handing: varchar("handing"),
  bhmaFunction: varchar("bhma_function"),
  bhmaGrade: varchar("bhma_grade"),
  msrp: real("msrp"),
  listPrice: real("list_price"),
  isActive: boolean("is_active").default(true),
  isDiscontinued: boolean("is_discontinued").default(false),
  replacementSku: varchar("replacement_sku"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_product_skus_manufacturer_id").on(table.manufacturerId),
  index("IDX_product_skus_family_id").on(table.familyId),
  index("IDX_product_skus_sku").on(table.sku),
]);

export const insertProductSkuSchema = createInsertSchema(productSkus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductSku = z.infer<typeof insertProductSkuSchema>;
export type ProductSku = typeof productSkus.$inferSelect;

export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  skuId: varchar("sku_id").notNull().references(() => productSkus.id, { onDelete: "cascade" }),
  variantSku: varchar("variant_sku").notNull(),
  finishCode: varchar("finish_code"),
  finishName: varchar("finish_name"),
  size: varchar("size"),
  leadTimeDays: integer("lead_time_days"),
  msrp: real("msrp"),
  listPrice: real("list_price"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_product_variants_sku_id").on(table.skuId),
  index("IDX_product_variants_variant_sku").on(table.variantSku),
]);

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;

export const productDocuments = pgTable("product_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  productType: varchar("product_type").notNull(),
  documentType: varchar("document_type").notNull(),
  name: text("name").notNull(),
  url: text("url"),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_product_documents_product_id").on(table.productId),
  index("IDX_product_documents_document_type").on(table.documentType),
]);

export const insertProductDocumentSchema = createInsertSchema(productDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertProductDocument = z.infer<typeof insertProductDocumentSchema>;
export type ProductDocument = typeof productDocuments.$inferSelect;

// ============================================================================
// BULK IMPORT TABLES
// ============================================================================

export const importBatches = pgTable("import_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileType: varchar("file_type"),
  status: varchar("status").notNull().default("pending"),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  successfulRows: integer("successful_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  uploadedBy: varchar("uploaded_by"),
  deduplicationStrategy: varchar("deduplication_strategy").default("skip"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_import_batches_organization_id").on(table.organizationId),
  index("IDX_import_batches_status").on(table.status),
]);

export const insertImportBatchSchema = createInsertSchema(importBatches).omit({
  id: true,
  createdAt: true,
});

export type InsertImportBatch = z.infer<typeof insertImportBatchSchema>;
export type ImportBatch = typeof importBatches.$inferSelect;

export const importRecords = pgTable("import_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  action: varchar("action"),
  status: varchar("status").notNull().default("pending"),
  rawData: jsonb("raw_data"),
  processedData: jsonb("processed_data"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_import_records_batch_id").on(table.batchId),
  index("IDX_import_records_status").on(table.status),
]);

export const insertImportRecordSchema = createInsertSchema(importRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertImportRecord = z.infer<typeof insertImportRecordSchema>;
export type ImportRecord = typeof importRecords.$inferSelect;

export const importErrors = pgTable("import_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  recordId: varchar("record_id").references(() => importRecords.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number"),
  field: varchar("field"),
  errorType: varchar("error_type").notNull(),
  errorMessage: text("error_message").notNull(),
  rawValue: text("raw_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_import_errors_batch_id").on(table.batchId),
  index("IDX_import_errors_record_id").on(table.recordId),
]);

export const insertImportErrorSchema = createInsertSchema(importErrors).omit({
  id: true,
  createdAt: true,
});

export type InsertImportError = z.infer<typeof insertImportErrorSchema>;
export type ImportError = typeof importErrors.$inferSelect;

// ============================================================================
// PRODUCT CATEGORIES
// ============================================================================

export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  itemName: varchar("item_name"),
  categoryLevel1: varchar("category_level_1"),
  categoryLevel2: varchar("category_level_2"),
  description: text("description"),
  typicalUse: text("typical_use"),
  notes: text("notes"),
  parentId: varchar("parent_id"),
  displayOrder: integer("display_order").default(0),
  isActive: varchar("is_active").notNull().default("yes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_product_categories_name").on(table.name),
  index("IDX_product_categories_parent_id").on(table.parentId),
  index("IDX_product_categories_level1").on(table.categoryLevel1),
]);

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

// ============================================================================
// LOCK PRODUCT DATA MODEL
// ============================================================================

export const lockProductTypes = pgTable("lock_product_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lockTypeId: varchar("lock_type_id").notNull().unique(),
  productFamily: varchar("product_family").notNull(),
  subcategory: varchar("subcategory"),
  primaryApplications: text("primary_applications"),
  primaryVerticals: text("primary_verticals"),
  description: text("description"),
  isActive: varchar("is_active").notNull().default("yes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_lock_product_types_lock_type_id").on(table.lockTypeId),
  index("IDX_lock_product_types_product_family").on(table.productFamily),
]);

export const insertLockProductTypeSchema = createInsertSchema(lockProductTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLockProductType = z.infer<typeof insertLockProductTypeSchema>;
export type LockProductType = typeof lockProductTypes.$inferSelect;

export const manufacturerTimelines = pgTable("manufacturer_timelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manufacturerId: varchar("manufacturer_id").references(() => manufacturers.id, { onDelete: "cascade" }),
  brandName: varchar("brand_name"),
  year: integer("year").notNull(),
  event: text("event").notNull(),
  description: text("description"),
  parentGroup: varchar("parent_group"),
  status: varchar("status"),
  regionPrimary: varchar("region_primary"),
  isActive: varchar("is_active").notNull().default("yes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_manufacturer_timelines_manufacturer_id").on(table.manufacturerId),
  index("IDX_manufacturer_timelines_year").on(table.year),
  index("IDX_manufacturer_timelines_brand_name").on(table.brandName),
]);

export const insertManufacturerTimelineSchema = createInsertSchema(manufacturerTimelines).omit({
  id: true,
  createdAt: true,
});

export type InsertManufacturerTimeline = z.infer<typeof insertManufacturerTimelineSchema>;
export type ManufacturerTimeline = typeof manufacturerTimelines.$inferSelect;

export const brandMarketTiers = pgTable("brand_market_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manufacturerId: varchar("manufacturer_id").references(() => manufacturers.id, { onDelete: "cascade" }),
  brandName: varchar("brand_name"),
  tier: varchar("tier").notNull(),
  priceTier: varchar("price_tier"),
  marketSegment: varchar("market_segment"),
  parentGroup: varchar("parent_group"),
  description: text("description"),
  priceRange: varchar("price_range"),
  targetMarket: text("target_market"),
  isActive: varchar("is_active").notNull().default("yes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_brand_market_tiers_manufacturer_id").on(table.manufacturerId),
  index("IDX_brand_market_tiers_tier").on(table.tier),
  index("IDX_brand_market_tiers_brand_name").on(table.brandName),
]);

export const insertBrandMarketTierSchema = createInsertSchema(brandMarketTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBrandMarketTier = z.infer<typeof insertBrandMarketTierSchema>;
export type BrandMarketTier = typeof brandMarketTiers.$inferSelect;

export const brandComplianceProfiles = pgTable("brand_compliance_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manufacturerId: varchar("manufacturer_id").references(() => manufacturers.id, { onDelete: "cascade" }),
  brandName: varchar("brand_name"),
  complianceType: varchar("compliance_type").notNull(),
  certification: varchar("certification"),
  bhmaGradeFocus: varchar("bhma_grade_focus"),
  adaRelevance: varchar("ada_relevance"),
  parentGroup: varchar("parent_group"),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  description: text("description"),
  isActive: varchar("is_active").notNull().default("yes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_brand_compliance_profiles_manufacturer_id").on(table.manufacturerId),
  index("IDX_brand_compliance_profiles_compliance_type").on(table.complianceType),
  index("IDX_brand_compliance_profiles_brand_name").on(table.brandName),
]);

export const insertBrandComplianceProfileSchema = createInsertSchema(brandComplianceProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBrandComplianceProfile = z.infer<typeof insertBrandComplianceProfileSchema>;
export type BrandComplianceProfile = typeof brandComplianceProfiles.$inferSelect;

export const brandLockAssets = pgTable("brand_lock_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manufacturerId: varchar("manufacturer_id").references(() => manufacturers.id, { onDelete: "cascade" }),
  assetKey: varchar("asset_key"),
  assetType: varchar("asset_type").notNull(),
  logicalGroup: varchar("logical_group"),
  fileFormat: varchar("file_format"),
  name: text("name").notNull(),
  url: text("url"),
  description: text("description"),
  isActive: varchar("is_active").notNull().default("yes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_brand_lock_assets_manufacturer_id").on(table.manufacturerId),
  index("IDX_brand_lock_assets_asset_type").on(table.assetType),
  index("IDX_brand_lock_assets_asset_key").on(table.assetKey),
]);

export const insertBrandLockAssetSchema = createInsertSchema(brandLockAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBrandLockAsset = z.infer<typeof insertBrandLockAssetSchema>;
export type BrandLockAsset = typeof brandLockAssets.$inferSelect;
