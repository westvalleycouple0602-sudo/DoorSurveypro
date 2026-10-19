import { Router } from "express";
import { storage } from "../storage";
import { getOrganizationContext } from "../clerkAuth";
import { z } from "zod";
import { cache, CacheKeys } from "../utils/cache";
import {
  complianceRequestSchema,
  aiResponseSchema,
  parseAIResponse,
  type ComplianceRequest,
  type ComplianceAIResponse,
} from "@shared/schemas/compliance.schema";

const router = Router();

const doorSpecsSchema = z.object({
  clearWidth: z.string().optional(),
  openingForce: z.string().optional(),
  nominalWidth: z.string().optional(),
  fireRating: z.string().optional(),
  hardwareFireRating: z.string().optional(),
  occupancyLoad: z.string().optional(),
  lockType: z.string().optional(),
});

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// ====== COMPLIANCE VALIDATION ======

router.post("/api/compliance/validate", async (req, res) => {
  let context;
  try {
    context = await authenticateUser(req, res);
    if (!context) return;

    // Validate request
    const validatedData = z.object({ doorSpecs: doorSpecsSchema }).parse(req.body);
    const { doorSpecs } = validatedData;
    
    // Use AI-powered compliance validation for enhanced analysis
    const { validateComplianceWithAI } = await import("../ai-service.js");
    const { logError } = await import("../logger.js");
    
    const result = await validateComplianceWithAI({
      clearWidth: doorSpecs.clearWidth || "36",
      openingForce: doorSpecs.openingForce || "5",
      nominalWidth: doorSpecs.nominalWidth || "36",
      fireRating: doorSpecs.fireRating || "none",
      hardwareFireRating: doorSpecs.hardwareFireRating || "none",
      occupancyLoad: doorSpecs.occupancyLoad || "25",
      lockType: doorSpecs.lockType || "standard",
    });

    res.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // Distinguish between validation errors (400) and AI service errors (500)
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    
    const { logError } = await import("../logger.js");
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'ai-compliance-validation',
      organizationId: context?.organizationId
    });
    
    res.status(500).json({ error: "AI compliance validation service temporarily unavailable" });
  }
});

// Get all compliance rules (cached for 2 hours - rarely changes)
router.get("/api/compliance/rules", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const rules = await cache.getOrSet(
      CacheKeys.complianceRules(),
      () => storage.getComplianceRules(),
      2 * 60 * 60 * 1000 // 2 hours
    );
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// RAG-Enhanced Compliance Check with Citations
router.post("/api/compliance/check-with-citations", async (req, res) => {
  let context;
  try {
    context = await authenticateUser(req, res);
    if (!context) return;

    // STRICT VALIDATION: Use shared schema with coercion & enums
    const validatedData = complianceRequestSchema.parse(req.body);
    const { opening, query } = validatedData;

    // Search for relevant code sections
    const { searchCodeSections, formatCitations } = await import("../rag-service.js");
    const { logger } = await import("../logger.js");
    
    // Build search query from opening context
    const searchQuery = query || `
      Door opening compliance: ${JSON.stringify(opening).substring(0, 200)}
      Fire rating: ${opening.fireRating || 'none'}
      ADA required: ${opening.adaRequired || 'unknown'}
      Building type: ${opening.buildingType || 'commercial'}
    `.trim();

    // Search for relevant code sections
    const codeResults = await searchCodeSections(searchQuery, {
      limit: 8,
      minSimilarity: 0.6,
    });

    logger.info("RAG search completed", { 
      resultsCount: codeResults.length,
      opening: opening.id || "new"
    });

    // Format citations for AI
    const citations = formatCitations(codeResults);

    // Use AI with RAG context for compliance analysis
    const { validateComplianceWithAI } = await import("../ai-service.js");
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Enhanced AI prompt with citations (30s timeout guard)
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a building code compliance expert. Evaluate door openings against IBC/ADA/NFPA codes.

Return JSON with this structure:
{
  "summary": "Brief compliance assessment",
  "violations": [
    {
      "ruleId": "IBC-1010.1.1",
      "severity": "critical" | "warning" | "info",
      "description": "What the violation is",
      "citation": "Which code section (reference the provided citations)",
      "recommendation": "How to fix it"
    }
  ],
  "compliantAreas": ["List what's compliant"],
  "missingInputs": ["What information is needed for complete assessment"],
  "citations": ["List citation numbers used, e.g. [1], [2]"]
}`
          },
          {
            role: "user",
            content: `Opening Data:\n${JSON.stringify(opening, null, 2)}\n\nRelevant Code Sections:\n${citations}\n\nProvide compliance assessment with specific citations.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("OpenAI request timeout after 30s")), 30000)
      )
    ]);

    // SAFE PARSING: Use schema validation with fallback handling
    const rawContent = response.choices[0]?.message?.content || "{}";
    let aiResult: ComplianceAIResponse;
    
    try {
      const parsed = JSON.parse(rawContent);
      aiResult = parseAIResponse(parsed); // Uses aiResponseSchema.safeParse with fallback
      
      if (aiResult.summary === "Validation response could not be fully parsed") {
        logger.warn("AI response partially invalid, using fallback", {
          rawContent: rawContent.substring(0, 200),
          openingId: opening.id || "new"
        });
      }
    } catch (parseError) {
      logger.error("AI response JSON parsing failed", { 
        error: parseError,
        rawContent: rawContent.substring(0, 200),
        openingId: opening.id || "new"
      });
      
      // Fallback response when JSON parsing completely fails
      aiResult = {
        summary: "Unable to parse AI compliance assessment",
        violations: [],
        compliantAreas: [],
        missingInputs: ["AI response parsing failed - please try again"],
        citations: [],
      };
    }

    // Return combined results
    res.json({
      ...aiResult,
      ragResults: codeResults.map(r => ({
        codeType: r.codeType,
        section: r.section,
        title: r.title,
        chunk: r.chunk.substring(0, 300), // Truncate for response size
        similarity: r.similarity,
        page: r.page,
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    
    const { logError } = await import("../logger.js");
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'rag-compliance-check',
      organizationId: context?.organizationId
    });
    
    res.status(500).json({ error: "RAG compliance check failed" });
  }
});

export default router;
