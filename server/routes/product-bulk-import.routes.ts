import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "../db";
import { importBatches, importRecords, importErrors } from "../../shared/schemas/catalog.schema";
import { eq, desc, and } from "drizzle-orm";
import { getOrganizationContext } from "../clerkAuth";
import { BulkImportService, type ParsedProductRow } from "../services/bulkImportService";

const router = Router();

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for product catalogs
  },
  fileFilter: (req, file, cb) => {
    const isCSV = file.mimetype === "text/csv" || file.originalname.endsWith(".csv");
    const isExcel = file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
                   file.originalname.endsWith(".xlsx");
    
    if (!isCSV && !isExcel) {
      cb(new Error("Only CSV and Excel files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// POST /api/products/bulk-import/upload
// Upload and start processing a product catalog
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const orgContext = await getOrganizationContext(req);
    const uploadedBy = orgContext?.userId || "system";
    const organizationId = orgContext?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const { deduplicationStrategy = "skip" } = req.body;

    // Validate deduplication strategy
    if (!["skip", "merge", "replace"].includes(deduplicationStrategy)) {
      return res.status(400).json({ error: "Invalid deduplication strategy. Must be: skip, merge, or replace" });
    }

    // Parse file based on type
    let rows: ParsedProductRow[];
    const fileName = req.file.originalname;
    const fileType = fileName.endsWith(".csv") ? "csv" : "xlsx";

    try {
      if (fileType === "csv") {
        const csvContent = req.file.buffer.toString("utf-8");
        rows = BulkImportService.parseCSV(csvContent);
      } else {
        rows = BulkImportService.parseExcel(req.file.buffer);
      }
    } catch (error: any) {
      return res.status(400).json({ error: "Invalid file format: " + error.message });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: "File is empty" });
    }

    if (rows.length > 5000) {
      return res.status(400).json({ error: "Maximum 5000 products per import" });
    }

    // Create import batch with organization scoping
    const [batch] = await db
      .insert(importBatches)
      .values({
        organizationId, // CRITICAL: Multi-tenant isolation
        fileName,
        metadata: { fileSize: req.file.size },
        fileType,
        status: "pending",
        totalRows: rows.length,
        deduplicationStrategy: deduplicationStrategy as "skip" | "merge" | "replace",
        uploadedBy: uploadedBy || "system",
      })
      .returning();

    // Process import asynchronously
    BulkImportService.processBulkImport(batch.id, rows, {
      deduplicationStrategy: deduplicationStrategy as "skip" | "merge" | "replace",
      uploadedBy: uploadedBy || "system",
    }).catch((error) => {
      console.error("Error processing bulk import:", error);
    });

    return res.json({
      success: true,
      batchId: batch.id,
      message: "Import started. Check status using the batch ID.",
    });
  } catch (error: any) {
    console.error("Error uploading bulk import:", error);
    return res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

// GET /api/products/bulk-import/status/:batchId
// Get import status and progress
router.get("/status/:batchId", async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const orgContext = await getOrganizationContext(req);
    const organizationId = orgContext?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    // CRITICAL: Filter by organizationId to prevent cross-tenant access
    const batch = await db
      .select()
      .from(importBatches)
      .where(and(
        eq(importBatches.id, batchId),
        eq(importBatches.organizationId, organizationId)
      ))
      .limit(1);

    if (batch.length === 0) {
      return res.status(404).json({ error: "Import batch not found" });
    }

    return res.json({
      success: true,
      batch: batch[0],
    });
  } catch (error: any) {
    console.error("Error getting import status:", error);
    return res.status(500).json({ error: error.message || "Failed to get status" });
  }
});

// GET /api/products/bulk-import/history
// Get import history
router.get("/history", async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    const organizationId = orgContext?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const { limit = 20 } = req.query;

    // CRITICAL: Filter by organizationId to prevent cross-tenant data leaks
    const batches = await db
      .select()
      .from(importBatches)
      .where(eq(importBatches.organizationId, organizationId))
      .orderBy(desc(importBatches.createdAt))
      .limit(Number(limit));

    return res.json({
      success: true,
      batches,
    });
  } catch (error: any) {
    console.error("Error getting import history:", error);
    return res.status(500).json({ error: error.message || "Failed to get history" });
  }
});

// GET /api/products/bulk-import/:batchId/records
// Get detailed records for a batch
router.get("/:batchId/records", async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { status } = req.query;
    const orgContext = await getOrganizationContext(req);
    const organizationId = orgContext?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    // CRITICAL: Verify batch belongs to organization before showing records
    const batch = await db
      .select()
      .from(importBatches)
      .where(and(
        eq(importBatches.id, batchId),
        eq(importBatches.organizationId, organizationId)
      ))
      .limit(1);

    if (batch.length === 0) {
      return res.status(404).json({ error: "Import batch not found" });
    }

    let records;
    
    if (status) {
      records = await db
        .select()
        .from(importRecords)
        .where(and(
          eq(importRecords.batchId, batchId),
          eq(importRecords.status, status as string)
        ))
        .limit(1000);
    } else {
      records = await db
        .select()
        .from(importRecords)
        .where(eq(importRecords.batchId, batchId))
        .limit(1000);
    }

    return res.json({
      success: true,
      records,
    });
  } catch (error: any) {
    console.error("Error getting import records:", error);
    return res.status(500).json({ error: error.message || "Failed to get records" });
  }
});

// GET /api/products/bulk-import/:batchId/errors
// Get errors for a batch
router.get("/:batchId/errors", async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const orgContext = await getOrganizationContext(req);
    const organizationId = orgContext?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    // CRITICAL: Verify batch belongs to organization before showing errors
    const batch = await db
      .select()
      .from(importBatches)
      .where(and(
        eq(importBatches.id, batchId),
        eq(importBatches.organizationId, organizationId)
      ))
      .limit(1);

    if (batch.length === 0) {
      return res.status(404).json({ error: "Import batch not found" });
    }

    const errors = await db
      .select()
      .from(importErrors)
      .where(eq(importErrors.batchId, batchId))
      .limit(500);

    return res.json({
      success: true,
      errors,
    });
  } catch (error: any) {
    console.error("Error getting import errors:", error);
    return res.status(500).json({ error: error.message || "Failed to get errors" });
  }
});

// GET /api/products/bulk-import/template
// Download CSV template for product import
router.get("/template", (req: Request, res: Response) => {
  const template = `manufacturerName,manufacturerWebsite,manufacturerCountry,productFamily,category,subcategory,sku,productName,description,material,fireRating,grade,voltage,handing,bhmaFunction,bhmaGrade,msrp,listPrice,isActive,isDiscontinued,replacementSku,variantSku,finishCode,finishName,size,leadTimeDays
Allegion,https://allegion.com,US,Von Duprin 98/99 Series,exit_devices,rim_exit,98-RIM-US26D,Von Duprin 98 Rim Exit Device,"Rim exit device with 3' panic bar",aluminum,3hr,Grade 1,,universal,A,Grade 1,850.00,595.00,yes,no,,,,,36,7
Dormakaba,https://dormakaba.com,CH,8200 Series Closers,closers,surface_mounted,8213-689,8213 Heavy Duty Closer,"Surface mounted closer for high traffic doors",steel,,Grade 1,,,,Grade 1,425.00,297.50,yes,no,,,,,Standard,10
ASSA ABLOY,https://assaabloy.com,SE,4600 Series Locksets,locksets,mortise_lock,4600-US26D,4600 Mortise Lockset,"Heavy duty mortise lock with deadbolt",stainless_steel,,Grade 1,,LH,F,Grade 1,650.00,455.00,yes,no,,,,,2-3/4,14
`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=product_catalog_template.csv");
  res.send(template);
});

export default router;
