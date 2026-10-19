import { Router } from "express";
import { storage } from "../storage";
import { getOrganizationContext } from "../clerkAuth";
import { insertRecommendationRuleSchema, insertHardwareCompatibilitySchema, insertRecommendationLogSchema } from "@shared/schema";
import { z } from "zod";

const generateRecommendationSchema = z.object({
  buildingType: z.string(),
  trafficLevel: z.string(),
  fireRating: z.string(),
  adaRequired: z.string(),
  securityLevel: z.string(),
  budgetMax: z.number().optional(),
  category: z.string().optional(),
  projectId: z.string().optional(),
  openingId: z.string().optional(),
});

const router = Router();

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// ====== RECOMMENDATION RULES ======

router.post("/api/recommendations/rules", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertRecommendationRuleSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
      createdBy: context.userId,
    });

    const rule = await storage.createRecommendationRule(validatedData);
    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/recommendations/rules", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const rules = await storage.getRecommendationRules(context.organizationId);
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== HARDWARE COMPATIBILITY ======

router.post("/api/recommendations/compatibility", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertHardwareCompatibilitySchema.parse({
      ...req.body,
      organizationId: context.organizationId,
      verifiedBy: context.userId,
      verifiedAt: new Date(),
    });

    const compat = await storage.createHardwareCompatibility(validatedData);
    res.json(compat);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/recommendations/compatibility/:productId", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const compatibility = await storage.getProductCompatibility(req.params.productId, context.organizationId);
    res.json(compatibility);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== HARDWARE RECOMMENDATIONS ======

router.post("/api/recommendations/generate", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Validate request
    const validatedInput = generateRecommendationSchema.parse(req.body);
    const { buildingType, trafficLevel, fireRating, adaRequired, securityLevel, budgetMax, category } = validatedInput;

    // Use AI-powered hardware recommendations for comprehensive analysis
    const { recommendHardwareWithAI } = await import("../ai-service.js");
    
    const aiResult = await recommendHardwareWithAI({
      buildingType,
      trafficLevel,
      fireRating,
      adaRequired,
      securityLevel,
      budgetMax: budgetMax?.toString(),
      category: category || "all",
    });

    const inputParams = { buildingType, trafficLevel, fireRating, adaRequired, securityLevel, budgetMax, category };
    
    // Add defaults to prevent crashes if AI omits fields
    const safeAiResult = {
      ...aiResult,
      alternatives: aiResult.alternatives || [],
      complianceNotes: aiResult.complianceNotes || [],
      installationGuidance: aiResult.installationGuidance || [],
    };

    // Log recommendation
    const log = await storage.createRecommendationLog({
      organizationId: context.organizationId,
      projectId: req.body.projectId,
      openingId: req.body.openingId,
      inputParameters: inputParams,
      recommendations: safeAiResult.alternatives.map((alt, idx) => ({
        category: alt.product,
        score: (3 - idx) * 25, // Score based on position
        reasoning: alt.pros?.join(", ") || "",
        matchedFactors: safeAiResult.complianceNotes,
      })),
      topRecommendation: safeAiResult.topRecommendation,
      recommendationScore: 100,
      appliedRules: [],
      scoringBreakdown: { ai: safeAiResult },
      recommendedBy: context.userId,
    });

    res.json({
      ...safeAiResult,
      logId: log.id,
      appliedRulesCount: safeAiResult.alternatives.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== RECOMMENDATION LOGS ======

router.get("/api/recommendations/logs", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { openingId } = req.query;
    const logs = await storage.getRecommendationLogs(context.organizationId, openingId as string);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/recommendations/logs/:logId/feedback", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { userSelection, feedbackScore, feedbackNotes, wasAccepted } = req.body;
    
    const updated = await storage.updateRecommendationFeedback(req.params.logId, {
      userSelection,
      feedbackScore,
      feedbackNotes,
      wasAccepted,
    });

    if (!updated) {
      return res.status(404).json({ error: "Log not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
