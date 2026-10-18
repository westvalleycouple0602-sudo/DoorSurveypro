import { Router } from "express";
import { getOrganizationContext } from "../clerkAuth";
import { z } from "zod";
import { logError } from "../logger";
import { insertCatalogItemSchema } from "@shared/schema";
import { requireFeature } from "../feature-gates";

const router = Router();

const ocrProcessingSchema = z.object({
  ocrText: z.string().min(10, "OCR text too short"),
  documentType: z.string().optional(),
  manufacturerHint: z.string().optional(),
});

const visionAnalysisSchema = z.object({
  imageBase64: z.string(),
  documentType: z.string().optional(),
  manufacturerHint: z.string().optional(),
});

const createCatalogFromSpecsSchema = z.object({
  extractedSpecs: z.object({
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    category: z.string().optional(),
    productName: z.string().optional(),
    dimensions: z.any().optional(),
    materials: z.array(z.string()).optional(),
    fireRating: z.string().optional(),
    soundRating: z.string().optional(),
    certifications: z.array(z.string()).optional(),
    complianceCodes: z.array(z.string()).optional(),
    finishes: z.array(z.string()).optional(),
    specifications: z.string().optional(),
    features: z.array(z.string()).optional(),
    applications: z.array(z.string()).optional(),
    pricing: z.any().optional(),
    partNumbers: z.array(z.string()).optional(),
    confidence: z.number(),
    extractionNotes: z.array(z.string()).optional(),
  }),
  literatureId: z.string().optional(), // Link to source document
});

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// ====== DOCUMENT INTELLIGENCE - OCR TEXT PROCESSING ======

router.post("/api/document-intelligence/process-ocr", requireFeature("aiAudits"), async (req, res) => {
  let context;
  try {
    context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = ocrProcessingSchema.parse(req.body);
    const { ocrText, documentType, manufacturerHint } = validatedData;

    const { processOCRText, generateCatalogSuggestion } = await import("../document-intelligence");
    
    const startTime = Date.now();
    const extractedSpecs = await processOCRText(ocrText, documentType, manufacturerHint);
    const processingTimeMs = Date.now() - startTime;
    
    const suggestedCatalogEntry = generateCatalogSuggestion(extractedSpecs);

    res.json({
      success: true,
      ocrText: ocrText.substring(0, 500), // Return preview only
      extractedSpecs,
      suggestedCatalogEntry,
      processingTimeMs,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    logError(error instanceof Error ? error : new Error(String(error)), { 
      context: 'document-intelligence-ocr-processing',
      organizationId: context?.organizationId 
    });
    res.status(500).json({ 
      success: false,
      error: "Failed to process OCR text with document intelligence" 
    });
  }
});

// ====== DOCUMENT INTELLIGENCE - VISION ANALYSIS ======

router.post("/api/document-intelligence/analyze-image", requireFeature("aiAudits"), async (req, res) => {
  let context;
  try {
    context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = visionAnalysisSchema.parse(req.body);
    const { imageBase64, documentType, manufacturerHint } = validatedData;

    const { analyzeDocumentImage, generateCatalogSuggestion } = await import("../document-intelligence");
    
    const startTime = Date.now();
    const extractedSpecs = await analyzeDocumentImage(imageBase64, documentType, manufacturerHint);
    const processingTimeMs = Date.now() - startTime;
    
    const suggestedCatalogEntry = generateCatalogSuggestion(extractedSpecs);

    res.json({
      success: true,
      extractedSpecs,
      suggestedCatalogEntry,
      processingTimeMs,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    logError(error instanceof Error ? error : new Error(String(error)), { 
      context: 'document-intelligence-vision-analysis',
      organizationId: context?.organizationId 
    });
    res.status(500).json({ 
      success: false,
      error: "Failed to analyze document image with Vision API" 
    });
  }
});

// ====== CREATE CATALOG ITEM FROM EXTRACTED SPECS ======

router.post("/api/document-intelligence/create-catalog-item", requireFeature("aiAudits"), async (req, res) => {
  let context;
  try {
    context = await authenticateUser(req, res);
    if (!context) return;

    const validatedRequest = createCatalogFromSpecsSchema.parse(req.body);
    const { extractedSpecs, literatureId } = validatedRequest;

    const { generateCatalogSuggestion } = await import("../document-intelligence");
    const suggestion = generateCatalogSuggestion(extractedSpecs);

    // Create catalog item with extracted specs
    const catalogData = insertCatalogItemSchema.parse({
      organizationId: context.organizationId,
      category: suggestion.category,
      manufacturer: suggestion.manufacturer,
      model: suggestion.model,
      specifications: suggestion.specifications,
      notes: literatureId 
        ? `${suggestion.notes}\n\nExtracted from literature ID: ${literatureId}`
        : suggestion.notes,
      requiresQuote: "yes", // Default to requiring quote
    });

    const { storage } = await import("../storage");
    const catalogItem = await storage.createCatalogItem(catalogData);

    // If literature ID provided, update it to link to this catalog item
    if (literatureId) {
      await storage.updateManufacturerLiterature(literatureId, {
        productCatalogItemId: catalogItem.id,
      });
    }

    res.status(201).json({
      success: true,
      catalogItem,
      extractedSpecs,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    logError(error instanceof Error ? error : new Error(String(error)), { 
      context: 'document-intelligence-create-catalog',
      organizationId: context?.organizationId 
    });
    res.status(500).json({ 
      success: false,
      error: "Failed to create catalog item from extracted specifications" 
    });
  }
});

export default router;
