import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { validateDoorOpening, type ValidationPayload } from "../validation/validator";
import { db } from "../db";
import { validationResults, doorOpenings, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth as isAuthenticated, getOrganizationContext } from "../clerkAuth";

const router = Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Validation payload schema
const validatePayloadSchema = z.object({
  country: z.enum(["US", "CA"]).optional(),
  residential: z.boolean().optional(),
  accessible_route: z.boolean().optional(),
  egress_required: z.boolean().optional(),
  occupant_load: z.number().int().min(0).optional(),
  door: z.object({
    type: z.enum(["swing", "sliding", "revolving", "folding", "other"]).optional(),
    operation: z.enum(["manual", "automatic"]).optional(),
    fire_rating_minutes: z.number().int().min(0).optional(),
    has_breakout: z.boolean().optional(),
    power_fail_safe_open: z.boolean().optional(),
    adjacent_swing_door_present: z.boolean().optional(),
  }).optional(),
  measurements: z.object({
    clear_opening_in: z.number().min(0).optional(),
    clear_height_in: z.number().min(0).optional(),
    threshold_height_in: z.number().min(0).optional(),
    hardware_height_in: z.number().min(0).optional(),
    gaps_in: z.object({
      top: z.number().min(0).optional(),
      latch: z.number().min(0).optional(),
      hinge: z.number().min(0).optional(),
      meeting_stiles: z.number().min(0).optional(),
      bottom: z.number().min(0).optional(),
    }).optional(),
    maneuvering: z.object({
      pull_side: z.object({
        latch_side_in: z.number().min(0).optional(),
        perpendicular_depth_in: z.number().min(0).optional(),
      }).optional(),
      push_side: z.object({
        latch_side_in: z.number().min(0).optional(),
        perpendicular_depth_in: z.number().min(0).optional(),
      }).optional(),
    }).optional(),
    clear_opening_in_power_on: z.number().min(0).optional(),
    clear_opening_in_power_off: z.number().min(0).optional(),
    breakout_clear_opening_in: z.number().min(0).optional(),
  }).optional(),
  config: z.object({
    measurement_uncertainty_in: z.number().min(0).optional(),
    ca_allow_legacy_800mm: z.boolean().optional(),
  }).optional(),
});

// POST /api/openings/:id/validate - Run building code validation
router.post("/openings/:id/validate", async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const organizationId = orgContext.organizationId;
    const openingId = req.params.id;

    // Verify opening exists and belongs to organization
    const opening = await db.query.doorOpenings.findFirst({
      where: eq(doorOpenings.id, openingId),
      with: {
        project: true,
      },
    });

    if (!opening || opening.project.organizationId !== organizationId) {
      return res.status(404).json({ error: "Door opening not found" });
    }

    // Validate request body
    const payload = validatePayloadSchema.parse(req.body) as ValidationPayload;

    // Run validation
    const validationResult = validateDoorOpening(payload);

    // Store validation result
    const country = payload.country || "US";
    const residential = payload.residential === true ? "yes" : "no";
    const accessibleRoute = payload.accessible_route === false ? "no" : "yes";
    const egressRequired = payload.egress_required === false ? "no" : "yes";
    const occupantLoad = payload.occupant_load || 0;
    const overallStatus = validationResult.summary.failed > 0 ? "failed" : "passed";

    const [storedResult] = await db
      .insert(validationResults)
      .values({
        openingId,
        country,
        residential,
        accessibleRoute,
        egressRequired,
        occupantLoad,
        totalChecks: validationResult.summary.total,
        failedChecks: validationResult.summary.failed,
        passedChecks: validationResult.summary.passed,
        overallStatus,
        results: validationResult.results as any,
        measurements: payload.measurements as any,
        doorConfig: payload.door as any,
      })
      .returning();

    res.json({
      validationId: storedResult.id,
      ...validationResult,
    });
  } catch (error: any) {
    console.error("Validation error:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({ 
        error: "Invalid validation payload", 
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      error: "Validation failed", 
      message: error.message 
    });
  }
});

// GET /api/openings/:id/validations - Get all validation results for an opening
router.get("/openings/:id/validations", async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const organizationId = orgContext.organizationId;
    const openingId = req.params.id;

    // Verify opening exists and belongs to organization
    const opening = await db.query.doorOpenings.findFirst({
      where: eq(doorOpenings.id, openingId),
      with: {
        project: true,
      },
    });

    if (!opening || opening.project.organizationId !== organizationId) {
      return res.status(404).json({ error: "Door opening not found" });
    }

    // Get all validation results for this opening
    const results = await db.query.validationResults.findMany({
      where: eq(validationResults.openingId, openingId),
      orderBy: (validationResults, { desc }) => [desc(validationResults.validatedAt)],
    });

    res.json(results);
  } catch (error: any) {
    console.error("Error fetching validations:", error);
    res.status(500).json({ 
      error: "Failed to fetch validations", 
      message: error.message 
    });
  }
});

// GET /api/validations/:id - Get specific validation result
router.get("/validations/:id", async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const organizationId = orgContext.organizationId;
    const validationId = req.params.id;

    // Get validation result with opening and project to verify ownership
    const result = await db.query.validationResults.findFirst({
      where: eq(validationResults.id, validationId),
      with: {
        doorOpening: {
          with: {
            project: true,
          },
        },
      },
    });

    if (!result || result.doorOpening.project.organizationId !== organizationId) {
      return res.status(404).json({ error: "Validation result not found" });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Error fetching validation:", error);
    res.status(500).json({ 
      error: "Failed to fetch validation", 
      message: error.message 
    });
  }
});

// DELETE /api/validations/:id - Delete validation result
router.delete("/validations/:id", async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const organizationId = orgContext.organizationId;
    const validationId = req.params.id;

    // Get validation result to verify ownership
    const result = await db.query.validationResults.findFirst({
      where: eq(validationResults.id, validationId),
      with: {
        doorOpening: {
          with: {
            project: true,
          },
        },
      },
    });

    if (!result || result.doorOpening.project.organizationId !== organizationId) {
      return res.status(404).json({ error: "Validation result not found" });
    }

    // Delete validation result
    await db.delete(validationResults).where(eq(validationResults.id, validationId));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting validation:", error);
    res.status(500).json({ 
      error: "Failed to delete validation", 
      message: error.message 
    });
  }
});

export default router;
