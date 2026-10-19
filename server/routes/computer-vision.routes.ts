import { Router } from "express";
import { getOrganizationContext } from "../clerkAuth";
import { z } from "zod";
import { logError } from "../logger";
import { requireFeature } from "../feature-gates";

const router = Router();

const photoAnalysisSchema = z.object({
  imageBase64: z.string(),
  doorType: z.string().optional(),
  buildingType: z.string().optional(),
});

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// ====== COMPUTER VISION ANALYSIS ======

router.post("/api/computer-vision/detect-damage", requireFeature("aiAudits"), async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = photoAnalysisSchema.omit({ buildingType: true }).parse(req.body);
    const { imageBase64, doorType } = validatedData;

    const { detectDamage } = await import("../ai-service.js");
    const result = await detectDamage(imageBase64, doorType);
    
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    logError(error instanceof Error ? error : new Error(String(error)), { 
      context: 'computer-vision-damage-detection',
      organizationId: (await getOrganizationContext(req))?.organizationId 
    });
    res.status(500).json({ error: "Failed to detect damage with AI" });
  }
});

router.post("/api/computer-vision/condition-report", requireFeature("aiAudits"), async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = photoAnalysisSchema.parse(req.body);
    const { imageBase64, doorType, buildingType } = validatedData;

    const { generateConditionReport } = await import("../ai-service.js");
    const report = await generateConditionReport(imageBase64, doorType, buildingType);
    
    res.json(report);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    logError(error instanceof Error ? error : new Error(String(error)), { 
      context: 'computer-vision-condition-report',
      organizationId: (await getOrganizationContext(req))?.organizationId 
    });
    res.status(500).json({ error: "Failed to generate condition report with AI" });
  }
});

router.post("/api/computer-vision/analyze-comprehensive", requireFeature("aiAudits"), async (req, res) => {
  let context;
  try {
    context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = photoAnalysisSchema.parse(req.body);
    const { imageBase64, doorType = "single", buildingType = "office" } = validatedData;

    // Validate image size and format
    if (!imageBase64 || imageBase64.length < 100) {
      return res.status(400).json({ 
        error: "Image is too small or invalid. Please upload a clear photo of the door (minimum 100x100 pixels recommended)" 
      });
    }

    // Use the new AI-enhanced comprehensive analysis
    const { analyzeImageComprehensive } = await import("../ai-service.js");
    
    const result = await analyzeImageComprehensive(imageBase64, doorType, buildingType);

    res.json({
      specifications: result.specifications,
      damageDetection: result.damageDetection,
      conditionReport: result.conditionReport,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    
    // Check for OpenAI-specific errors about invalid images
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("Invalid image") || errorMessage.includes("400")) {
      return res.status(400).json({ 
        error: "Unable to process image. Please ensure the photo is clear, properly lit, and shows the door clearly. Minimum size: 100x100 pixels." 
      });
    }
    
    logError(error instanceof Error ? error : new Error(String(error)), { 
      context: 'computer-vision-comprehensive-analysis',
      organizationId: context?.organizationId 
    });
    res.status(500).json({ error: "AI vision service temporarily unavailable. Please try again in a few moments." });
  }
});

export default router;
