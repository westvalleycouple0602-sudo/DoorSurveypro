import { Router, Request, Response } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "../db";
import { projects, customers, insertProjectSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getOrganizationContext } from "../clerkAuth";

const router = Router();

// In-memory store for preview results (expires after 1 hour)
interface PreviewStore {
  organizationId: string;
  rows: ParsedRow[];
  timestamp: number;
}

const previewCache = new Map<string, PreviewStore>();

// Clean up expired previews (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [previewId, store] of previewCache.entries()) {
    if (store.timestamp < oneHourAgo) {
      previewCache.delete(previewId);
    }
  }
}, 10 * 60 * 1000); // Run cleanup every 10 minutes

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
      cb(new Error("Only CSV files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Validation schema for CSV row
const csvProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  location: z.string().min(1, "Location is required"),
  buildingType: z.enum(["hospital", "office", "hotel", "other"]).default("office"),
  status: z.enum(["active", "completed", "archived"]).default("active"),
  quoteType: z.enum(["aftermarket", "tenant_improvement", "new_construction", "hardware_only", "automation_only", "repair", "rough_order_magnitude"]).optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(), // Will try to match existing customer
  applicableStandards: z.string().optional(), // Comma-separated: "ADA,IBC,NFPA"
});

type CSVProject = z.infer<typeof csvProjectSchema>;

interface ParsedRow {
  row: number;
  data: CSVProject;
  customer?: { id: string; name: string };
  errors: string[];
  warnings: string[];
}

// POST /api/bulk-import/projects/preview
// Upload CSV and get preview of what will be imported
router.post("/projects/preview", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    const organizationId = orgContext.organizationId;

    // Parse CSV
    const csvContent = req.file.buffer.toString("utf-8");
    let records: any[];
    
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error: any) {
      return res.status(400).json({ error: "Invalid CSV format: " + error.message });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: "CSV file is empty" });
    }

    if (records.length > 1000) {
      return res.status(400).json({ error: "Maximum 1000 projects per import" });
    }

    // Get all customers for this organization (for matching)
    const existingCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.organizationId, organizationId));

    const customerMap = new Map(
      existingCustomers.map(c => [c.name.toLowerCase(), c])
    );

    // Validate each row
    const parsedRows: ParsedRow[] = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // +2 because CSV is 1-indexed and has header row
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Parse and validate
      let validatedData: CSVProject;
      try {
        validatedData = csvProjectSchema.parse({
          name: record.name || record.Name || record.PROJECT_NAME,
          location: record.location || record.Location || record.LOCATION,
          buildingType: (record.buildingType || record.building_type || "office").toLowerCase(),
          status: (record.status || record.Status || "active").toLowerCase(),
          quoteType: record.quoteType || record.quote_type || record.type,
          notes: record.notes || record.Notes || record.NOTES,
          customerName: record.customerName || record.customer_name || record.customer || record.Customer,
          applicableStandards: record.applicableStandards || record.applicable_standards || record.standards,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          errors.push(...error.errors.map(e => `${e.path.join(".")}: ${e.message}`));
        } else {
          errors.push("Validation failed: " + error.message);
        }
        
        parsedRows.push({
          row: rowNum,
          data: record as any,
          errors,
          warnings,
        });
        continue;
      }

      // Try to match customer
      let matchedCustomer;
      if (validatedData.customerName) {
        matchedCustomer = customerMap.get(validatedData.customerName.toLowerCase());
        if (!matchedCustomer) {
          warnings.push(`Customer "${validatedData.customerName}" not found - project will be created without customer link`);
        }
      }

      parsedRows.push({
        row: rowNum,
        data: validatedData,
        customer: matchedCustomer ? { id: matchedCustomer.id, name: matchedCustomer.name } : undefined,
        errors,
        warnings,
      });
    }

    const validCount = parsedRows.filter(r => r.errors.length === 0).length;
    const errorCount = parsedRows.filter(r => r.errors.length > 0).length;
    const warningCount = parsedRows.filter(r => r.warnings.length > 0).length;

    // Generate secure preview ID and store validated rows server-side
    const previewId = randomBytes(32).toString("hex");
    previewCache.set(previewId, {
      organizationId,
      rows: parsedRows,
      timestamp: Date.now(),
    });

    return res.json({
      success: true,
      previewId, // Return preview ID for execute endpoint
      summary: {
        total: records.length,
        valid: validCount,
        errors: errorCount,
        warnings: warningCount,
      },
      rows: parsedRows,
    });
  } catch (error: any) {
    console.error("Error previewing CSV import:", error);
    return res.status(500).json({ error: error.message || "Failed to preview import" });
  }
});

// POST /api/bulk-import/projects/execute
// Execute the import using server-stored preview results (SECURE)
router.post("/projects/execute", async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    const organizationId = orgContext.organizationId;

    const { previewId } = req.body;
    if (!previewId || typeof previewId !== "string") {
      return res.status(400).json({ error: "Invalid request: previewId required" });
    }

    // Fetch server-stored preview results (SECURE: client cannot forge this)
    const previewStore = previewCache.get(previewId);
    if (!previewStore) {
      return res.status(400).json({ error: "Preview not found or expired. Please upload and preview your CSV again." });
    }

    // Verify organization ownership (prevent cross-tenant attacks)
    if (previewStore.organizationId !== organizationId) {
      return res.status(403).json({ error: "Unauthorized: preview belongs to a different organization" });
    }

    // Use server-validated rows (SECURE: client cannot tamper with this data)
    const rows = previewStore.rows;

    // Insert only valid rows (already validated during preview)
    const inserted: any[] = [];
    const failed: Array<{ row: number; error: string }> = [];

    for (const parsedRow of rows) {
      // Skip rows with errors (already validated during preview)
      if (parsedRow.errors.length > 0) {
        continue;
      }

      try {
        const validatedData = parsedRow.data;
        const matchedCustomer = parsedRow.customer;
        
        // Parse applicable standards
        const standards = validatedData.applicableStandards 
          ? validatedData.applicableStandards.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        // Build project data with validated fields only
        const projectData: any = {
          organizationId, // Always use authenticated org (prevent cross-tenant)
          name: validatedData.name,
          location: validatedData.location,
          buildingType: validatedData.buildingType,
          status: validatedData.status,
          quoteType: validatedData.quoteType,
          notes: validatedData.notes,
          applicableStandards: standards.length > 0 ? standards : null,
          customerId: matchedCustomer?.id || null, // Only use if customer belongs to this org
        };

        const [project] = await db.insert(projects).values(projectData).returning();
        
        inserted.push({
          id: project.id,
          name: project.name,
          row: parsedRow.row,
        });
      } catch (error: any) {
        failed.push({
          row: parsedRow.row,
          error: error.message || "Failed to insert project",
        });
      }
    }

    // Clean up preview after successful import (prevent replay attacks)
    previewCache.delete(previewId);

    return res.json({
      success: true,
      imported: inserted.length,
      failed: failed.length,
      results: {
        inserted,
        failed,
      },
    });
  } catch (error: any) {
    console.error("Error executing import:", error);
    return res.status(500).json({ error: error.message || "Failed to execute import" });
  }
});

// GET /api/bulk-import/projects/template
// Download a CSV template
router.get("/projects/template", (req: Request, res: Response) => {
  const template = `name,location,buildingType,status,quoteType,notes,customerName,applicableStandards
Sample Office Building,123 Main St Suite 100,office,active,new_construction,New construction project with 50 doors,Acme Corporation,"ADA,IBC,NFPA"
Hospital East Wing,456 Healthcare Dr,hospital,active,tenant_improvement,Renovation of east wing patient rooms,City Hospital,"ADA,IBC,FGI"
Hotel Lobby Renovation,789 Resort Blvd,hotel,active,aftermarket,Replace all lobby entrance hardware,Grand Hotels Inc,"ADA,NFPA"
`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=project_import_template.csv");
  res.send(template);
});

export default router;
