import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertPdfCatalogImportSchema, insertCatalogItemSchema } from "@shared/schema";
import { storage } from "../storage.js";
import { getOrganizationContext } from "../clerkAuth.js";
import { logError } from "../logger.js";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

const router = Router();

// Configure multer for PDF uploads
const upload = multer({
  dest: "uploads/pdf-catalogs/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".csv", ".xlsx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, CSV, and Excel files are allowed"));
    }
  },
});

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// Get all PDF catalog imports for organization
router.get("/api/pdf-catalog-imports", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const imports = await storage.getPdfCatalogImports(context.organizationId);
    res.json(imports);
  } catch (error: any) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: "pdf-catalog-imports-list",
    });
    res.status(500).json({ error: error.message });
  }
});

// Get specific PDF catalog import
router.get("/api/pdf-catalog-imports/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const importRecord = await storage.getPdfCatalogImport(req.params.id, context.organizationId);
    if (!importRecord) {
      return res.status(404).json({ error: "Import record not found" });
    }
    res.json(importRecord);
  } catch (error: any) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: "pdf-catalog-import-get",
    });
    res.status(500).json({ error: error.message });
  }
});

// Upload PDF catalog - SECURITY: Authenticate BEFORE Multer processing
router.post("/api/pdf-catalog-imports/upload", async (req, res, next) => {
  // Authenticate first to prevent unauthenticated file uploads
  const context = await authenticateUser(req, res);
  if (!context) return;

  // Store context for use after Multer
  (req as any).userContext = context;
  
  // Now process the upload with Multer
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) {
        logError(err instanceof Error ? err : new Error(String(err)), {
          context: "pdf-catalog-upload-multer",
        });
        return res.status(400).json({ error: err.message || "File upload failed" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const context = (req as any).userContext;

      // Create import record
      const importRecord = await storage.createPdfCatalogImport({
        organizationId: context.organizationId,
        uploadedBy: context.userId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileUrl: req.file.path, // In production, upload to cloud storage
        status: "uploaded",
      });

      res.json(importRecord);
    } catch (error: any) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      logError(error instanceof Error ? error : new Error(String(error)), {
        context: "pdf-catalog-upload",
      });
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
});

// Process PDF with OCR and AI
router.post("/api/pdf-catalog-imports/:id/process", async (req, res) => {
  const context = await authenticateUser(req, res);
  if (!context) return;

  try {
    const importRecord = await storage.getPdfCatalogImport(req.params.id, context.organizationId);
    if (!importRecord) {
      return res.status(404).json({ error: "Import record not found" });
    }

    // Update status to processing
    await storage.updatePdfCatalogImport(req.params.id, context.organizationId, {
      status: "processing",
      processingStartedAt: new Date(),
    });

    // Process based on file type
    const ext = path.extname(importRecord.fileName).toLowerCase();
    let extractedData: any[] = [];

    if (ext === ".pdf") {
      // Process PDF with OCR and AI
      const { processPdfCatalog } = await import("../ai-service.js");
      extractedData = await processPdfCatalog(importRecord.fileUrl);
    } else if (ext === ".csv") {
      // Parse CSV
      const fileContent = fs.readFileSync(importRecord.fileUrl, "utf-8");
      extractedData = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else if (ext === ".xlsx") {
      // Parse Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(importRecord.fileUrl);
      const worksheet = workbook.worksheets[0];
      const headers: string[] = [];
      
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || "");
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = cell.value;
            }
          });
          extractedData.push(rowData);
        }
      });
    }

    // Update import record with extracted data
    const updated = await storage.updatePdfCatalogImport(req.params.id, context.organizationId, {
      status: "completed",
      processingCompletedAt: new Date(),
      extractedData: extractedData as any,
      itemCount: extractedData.length,
    });

    res.json(updated);
  } catch (error: any) {
    // Update status to failed
    await storage.updatePdfCatalogImport(req.params.id, context.organizationId, {
      status: "failed",
      errorMessage: error.message,
    });

    logError(error instanceof Error ? error : new Error(String(error)), {
      context: "pdf-catalog-process",
      importId: req.params.id,
    });
    res.status(500).json({ error: "Failed to process file" });
  }
});

// Export to Excel
router.get("/api/pdf-catalog-imports/:id/export/excel", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const importRecord = await storage.getPdfCatalogImport(req.params.id, context.organizationId);
    if (!importRecord) {
      return res.status(404).json({ error: "Import record not found" });
    }

    if (!importRecord.extractedData || (importRecord.extractedData as any[]).length === 0) {
      return res.status(400).json({ error: "No data to export" });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Catalog Items");

    // Define headers
    const headers = [
      { header: "Category", key: "category", width: 15 },
      { header: "Manufacturer", key: "manufacturer", width: 20 },
      { header: "Model", key: "model", width: 25 },
      { header: "Specifications", key: "specifications", width: 40 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    worksheet.columns = headers;

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add data rows
    const data = importRecord.extractedData as any[];
    data.forEach((item) => {
      worksheet.addRow({
        category: item.category || "",
        manufacturer: item.manufacturer || "",
        model: item.model || "",
        specifications: item.specifications || "",
        notes: item.notes || "",
      });
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="catalog-import-${importRecord.id}.xlsx"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: "pdf-catalog-export-excel",
      importId: req.params.id,
    });
    res.status(500).json({ error: "Failed to export to Excel" });
  }
});

// Export to CSV
router.get("/api/pdf-catalog-imports/:id/export/csv", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const importRecord = await storage.getPdfCatalogImport(req.params.id, context.organizationId);
    if (!importRecord) {
      return res.status(404).json({ error: "Import record not found" });
    }

    if (!importRecord.extractedData || (importRecord.extractedData as any[]).length === 0) {
      return res.status(400).json({ error: "No data to export" });
    }

    // Create CSV content
    const headers = ["Category", "Manufacturer", "Model", "Specifications", "Notes"];
    const data = importRecord.extractedData as any[];
    
    const csvRows = [
      headers.join(","),
      ...data.map((item) =>
        [
          item.category || "",
          item.manufacturer || "",
          item.model || "",
          `"${(item.specifications || "").replace(/"/g, '""')}"`,
          `"${(item.notes || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    // Set response headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="catalog-import-${importRecord.id}.csv"`
    );

    res.send(csvContent);
  } catch (error: any) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: "pdf-catalog-export-csv",
      importId: req.params.id,
    });
    res.status(500).json({ error: "Failed to export to CSV" });
  }
});

// Import extracted data to catalog
router.post("/api/pdf-catalog-imports/:id/import-to-catalog", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const importRecord = await storage.getPdfCatalogImport(req.params.id, context.organizationId);
    if (!importRecord) {
      return res.status(404).json({ error: "Import record not found" });
    }

    if (!importRecord.extractedData || (importRecord.extractedData as any[]).length === 0) {
      return res.status(400).json({ error: "No data to import" });
    }

    const data = importRecord.extractedData as any[];
    let importedCount = 0;
    const errors: string[] = [];

    // Import each item to catalog
    for (const item of data) {
      try {
        // Validate and create catalog item
        const catalogItem = {
          organizationId: context.organizationId,
          category: item.category || "hardware",
          manufacturer: item.manufacturer || null,
          model: item.model || "Unknown",
          specifications: item.specifications || null,
          notes: item.notes || null,
        };

        await storage.createCatalogItem(catalogItem);
        importedCount++;
      } catch (error: any) {
        errors.push(`Failed to import item "${item.model}": ${error.message}`);
      }
    }

    // Update import record
    await storage.updatePdfCatalogImport(req.params.id, context.organizationId, {
      importedAt: new Date(),
      importedItemCount: importedCount,
    });

    res.json({
      success: true,
      importedCount,
      totalCount: data.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: "pdf-catalog-import-to-catalog",
      importId: req.params.id,
    });
    res.status(500).json({ error: "Failed to import to catalog" });
  }
});

// Delete import record
router.delete("/api/pdf-catalog-imports/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const importRecord = await storage.getPdfCatalogImport(req.params.id, context.organizationId);
    if (!importRecord) {
      return res.status(404).json({ error: "Import record not found" });
    }

    // Delete file if it exists
    if (fs.existsSync(importRecord.fileUrl)) {
      fs.unlinkSync(importRecord.fileUrl);
    }

    const deleted = await storage.deletePdfCatalogImport(req.params.id, context.organizationId);
    if (!deleted) {
      return res.status(404).json({ error: "Import record not found" });
    }

    res.json({ success: true });
  } catch (error: any) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: "pdf-catalog-delete",
    });
    res.status(500).json({ error: error.message });
  }
});

export default router;
