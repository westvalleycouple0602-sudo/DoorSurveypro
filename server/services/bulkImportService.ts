import { db } from "../db";
import {
  manufacturers,
  productFamilies,
  productSkus,
  productVariants,
  productDocuments,
  importBatches,
  importRecords,
  importErrors,
  type InsertManufacturer,
  type InsertProductFamily,
  type InsertProductSku,
  type InsertProductVariant,
  type InsertImportBatch,
  type InsertImportRecord,
  type InsertImportError,
} from "../../shared/schemas/catalog.schema";
import { eq, and, or, sql } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import * as XLSX from "@e965/xlsx";

// ============================================================================
// TYPES
// ============================================================================

export interface BulkImportOptions {
  deduplicationStrategy: "skip" | "merge" | "replace";
  uploadedBy?: string;
}

export interface ParsedProductRow {
  // Manufacturer info
  manufacturerName: string;
  manufacturerWebsite?: string;
  manufacturerCountry?: string;
  
  // Product family
  productFamily?: string;
  category?: string;
  subcategory?: string;
  
  // Product SKU
  sku: string;
  productName: string;
  description?: string;
  material?: string;
  fireRating?: string;
  grade?: string;
  voltage?: string;
  handing?: string;
  bhmaFunction?: string;
  bhmaGrade?: string;
  msrp?: number;
  listPrice?: number;
  
  // Status
  isActive?: string;
  isDiscontinued?: string;
  replacementSku?: string;
  
  // Variant info (optional)
  variantSku?: string;
  finishCode?: string;
  finishName?: string;
  size?: string;
  leadTimeDays?: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateId?: string;
  matchType?: "exact_sku" | "similar_name" | "manual";
}

// ============================================================================
// BULK IMPORT SERVICE
// ============================================================================

export class BulkImportService {
  /**
   * Parse CSV file content (preserve SKUs as strings)
   */
  static parseCSV(fileContent: string): ParsedProductRow[] {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false, // CRITICAL: Disable casting to preserve SKUs with leading zeros
    }) as ParsedProductRow[];
    
    // Normalize numeric-looking values to preserve them as strings
    return records.map(row => ({
      ...row,
      sku: String(row.sku || "").trim(),
      variantSku: row.variantSku ? String(row.variantSku).trim() : undefined,
    }));
  }

  /**
   * Parse Excel file buffer (preserve SKUs as strings)
   */
  static parseExcel(fileBuffer: Buffer): ParsedProductRow[] {
    const workbook = XLSX.read(fileBuffer, { type: "buffer", raw: false }); // raw:false = read as formatted strings
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<ParsedProductRow>(worksheet, {
      raw: false, // CRITICAL: Preserve SKUs as strings, not numbers
    });
    
    // Normalize SKUs to strings to prevent leading zero loss
    return records.map(row => ({
      ...row,
      sku: String(row.sku || "").trim(),
      variantSku: row.variantSku ? String(row.variantSku).trim() : undefined,
    }));
  }

  /**
   * Check if a product already exists (deduplication)
   */
  static async checkDuplicate(
    manufacturerName: string,
    sku: string
  ): Promise<DuplicateCheckResult> {
    // Find manufacturer by name (CASE-INSENSITIVE)
    const manufacturer = await db
      .select()
      .from(manufacturers)
      .where(sql`LOWER(${manufacturers.name}) = LOWER(${manufacturerName})`)
      .limit(1);

    if (manufacturer.length === 0) {
      return { isDuplicate: false };
    }

    // Check for exact SKU match (preserve case sensitivity for SKU itself)
    const existingProduct = await db
      .select()
      .from(productSkus)
      .where(
        and(
          eq(productSkus.manufacturerId, manufacturer[0].id),
          eq(productSkus.sku, sku)
        )
      )
      .limit(1);

    if (existingProduct.length > 0) {
      return {
        isDuplicate: true,
        duplicateId: existingProduct[0].id,
        matchType: "exact_sku",
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Create or get manufacturer (case-insensitive)
   */
  static async getOrCreateManufacturer(
    row: ParsedProductRow
  ): Promise<string> {
    // Check if manufacturer exists (CASE-INSENSITIVE)
    const existing = await db
      .select()
      .from(manufacturers)
      .where(sql`LOWER(${manufacturers.name}) = LOWER(${row.manufacturerName})`)
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create new manufacturer
    const newManufacturer: InsertManufacturer = {
      name: row.manufacturerName,
      code: row.manufacturerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 50),
      website: row.manufacturerWebsite,
      country: row.manufacturerCountry,
      isActive: "yes",
    };

    const result = await db
      .insert(manufacturers)
      .values(newManufacturer)
      .returning();
    
    return result[0].id;
  }

  /**
   * Create or get product family (case-insensitive)
   */
  static async getOrCreateProductFamily(
    manufacturerId: string,
    row: ParsedProductRow
  ): Promise<string> {
    const familyName = row.productFamily || "General Products";

    // Check if family exists (CASE-INSENSITIVE)
    const existing = await db
      .select()
      .from(productFamilies)
      .where(
        and(
          eq(productFamilies.manufacturerId, manufacturerId),
          sql`LOWER(${productFamilies.name}) = LOWER(${familyName})`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create new product family
    const newFamily: InsertProductFamily = {
      manufacturerId,
      name: familyName,
      category: row.category || "uncategorized",
      subcategory: row.subcategory,
      isActive: true,
    };

    const result = await db
      .insert(productFamilies)
      .values(newFamily)
      .returning();
    
    return result[0].id;
  }

  /**
   * Create product SKU
   */
  static async createProductSku(
    manufacturerId: string,
    familyId: string,
    row: ParsedProductRow
  ): Promise<string> {
    const newProduct: InsertProductSku = {
      manufacturerId,
      familyId,
      sku: row.sku,
      name: row.productName,
      description: row.description,
      material: row.material,
      fireRating: row.fireRating,
      grade: row.grade,
      voltage: row.voltage,
      handing: row.handing,
      bhmaFunction: row.bhmaFunction,
      bhmaGrade: row.bhmaGrade,
      msrp: row.msrp,
      listPrice: row.listPrice,
      isActive: !(row.isActive === "no" || row.isActive === "false"),
      isDiscontinued: row.isDiscontinued === "yes" || row.isDiscontinued === "true",
    };

    const result = await db.insert(productSkus).values(newProduct).returning();
    return result[0].id;
  }

  /**
   * Merge duplicate product (update existing)
   */
  static async mergeProduct(
    existingProductId: string,
    row: ParsedProductRow
  ): Promise<void> {
    await db
      .update(productSkus)
      .set({
        name: row.productName,
        description: row.description,
        material: row.material,
        fireRating: row.fireRating,
        grade: row.grade,
        voltage: row.voltage,
        handing: row.handing,
        bhmaFunction: row.bhmaFunction,
        bhmaGrade: row.bhmaGrade,
        msrp: row.msrp,
        listPrice: row.listPrice,
        isActive: !(row.isActive === "no" || row.isActive === "false"),
        isDiscontinued: row.isDiscontinued === "yes" || row.isDiscontinued === "true",
        updatedAt: new Date(),
      })
      .where(eq(productSkus.id, existingProductId));
  }

  /**
   * Process a single import row
   * Returns record data and optional error info for separate tracking
   */
  static async processRow(
    batchId: string,
    row: ParsedProductRow,
    rowNumber: number,
    options: BulkImportOptions
  ): Promise<{ record: InsertImportRecord; error?: { errorType: string; errorMessage: string } }> {
    try {
      // Check for duplicates
      const duplicateCheck = await this.checkDuplicate(
        row.manufacturerName,
        row.sku
      );

      // Handle duplicates based on strategy
      if (duplicateCheck.isDuplicate) {
        if (options.deduplicationStrategy === "skip") {
          return {
            record: {
              batchId,
              rowNumber,
              entityType: "product_sku",
              entityId: duplicateCheck.duplicateId,
              action: "skipped",
              status: "duplicate",
              rawData: row as any,
              processedData: { duplicateMatchType: duplicateCheck.matchType },
            },
            error: { errorType: "duplicate", errorMessage: "Duplicate product skipped" },
          };
        } else if (options.deduplicationStrategy === "merge") {
          // Update existing product
          await this.mergeProduct(duplicateCheck.duplicateId!, row);
          return {
            record: {
              batchId,
              rowNumber,
              entityType: "product_sku",
              entityId: duplicateCheck.duplicateId,
              action: "merged",
              status: "merged",
              rawData: row as any,
              processedData: { duplicateMatchType: duplicateCheck.matchType },
            },
          };
        }
      }

      // Create new product
      const manufacturerId = await this.getOrCreateManufacturer(row);
      const familyId = await this.getOrCreateProductFamily(manufacturerId, row);
      const productId = await this.createProductSku(manufacturerId, familyId, row);

      return {
        record: {
          batchId,
          rowNumber,
          entityType: "product_sku",
          entityId: productId,
          action: "created",
          status: "success",
          rawData: row as any,
          processedData: { manufacturerId, familyId },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        record: {
          batchId,
          rowNumber,
          entityType: "product_sku",
          action: "failed",
          status: "failed",
          rawData: row as any,
        },
        error: { errorType: "processing_error", errorMessage },
      };
    }
  }

  /**
   * Process bulk import
   */
  static async processBulkImport(
    batchId: string,
    rows: ParsedProductRow[],
    options: BulkImportOptions
  ): Promise<void> {
    // Update batch status to processing
    await db
      .update(importBatches)
      .set({ 
        status: "processing",
        totalRows: rows.length,
        startedAt: new Date(),
      })
      .where(eq(importBatches.id, batchId));

    let successCount = 0;
    let failedCount = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      const { record, error } = await this.processRow(batchId, row, rowNumber, options);

      // Save import record
      await db.insert(importRecords).values(record);

      // Update counts based on status
      if (record.status === "success" || record.status === "merged") {
        successCount++;
      } else if (record.status === "failed" || record.status === "duplicate") {
        failedCount++;
        // Log error if present
        if (error) {
          await db.insert(importErrors).values({
            batchId,
            errorType: error.errorType,
            errorMessage: error.errorMessage,
            rowNumber,
          });
        }
      }

      // Update progress
      await db
        .update(importBatches)
        .set({
          processedRows: rowNumber,
          successfulRows: successCount,
          failedRows: failedCount,
        })
        .where(eq(importBatches.id, batchId));
    }

    // Mark batch as completed
    const finalStatus = failedCount > 0 && successCount === 0 
      ? "failed" 
      : failedCount > 0 
      ? "partially_completed" 
      : "completed";

    await db
      .update(importBatches)
      .set({
        status: finalStatus,
        completedAt: new Date(),
      })
      .where(eq(importBatches.id, batchId));
  }
}
