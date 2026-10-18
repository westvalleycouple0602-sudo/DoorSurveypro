import { Router } from "express";
import { z } from "zod";
import { insertScanConfigSchema, insertScanMetricSchema, insertDetectionOverrideSchema } from "@shared/schema";
import { storage } from "../storage.js";
import { getOrganizationContext } from "../clerkAuth.js";
import { identifyHardware, analyzeOpening, type ProcessedMetricsInput, type ConfidenceScoresInput } from "../engine/calibrationEngine.js";
import { applyLearningToAnalysis, buildOverrideContext } from "../engine/learningEngine.js";

const router = Router();

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// Get scan configuration for organization
router.get("/api/organizations/:orgId/scan-config", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Verify user has access to this organization
    if (context.organizationId !== req.params.orgId) {
      return res.status(403).json({ error: "Access denied" });
    }

    let config = await storage.getScanConfig(req.params.orgId);
    
    // Create default config if none exists
    if (!config) {
      const defaultConfig = {
        organizationId: req.params.orgId,
        measurementSystem: "imperial" as const,
        coverageThreshold: 85,
        confidenceThreshold: 0.85,
        minDistanceM: 1.5,
        maxDistanceM: 2.0,
        maxAngleDeg: 25,
        enableVoice: false,
        enableSubtitles: true,
        enableDualPass: true,
      };
      config = await storage.upsertScanConfig(defaultConfig);
    }

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update scan configuration for organization
router.put("/api/organizations/:orgId/scan-config", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Verify user has access to this organization
    if (context.organizationId !== req.params.orgId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate request body
    const validatedData = insertScanConfigSchema.parse(req.body);

    // Upsert configuration
    const config = await storage.upsertScanConfig({
      ...validatedData,
      organizationId: req.params.orgId,
    });

    res.json(config);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid configuration data", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Create scan metric event
router.post("/api/metrics/scan", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Validate request body
    const validatedData = insertScanMetricSchema.parse(req.body);

    // Create metric
    const metric = await storage.createScanMetric({
      ...validatedData,
      organizationId: context.organizationId,
      userId: context.userId,
    });

    res.json(metric);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid metric data", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Complete scan and save results to door opening
router.post("/api/openings/:id/scan-complete", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const openingId = req.params.id;

    // Validate scan data
    const scanDataSchema = z.object({
      frameWidthMin: z.object({
        valueMm: z.number(),
        sigmaMm: z.number().optional(),
        source: z.enum(["scan", "operator", "derived"]),
        uncertainty: z.number().optional(),
      }).optional(),
      frameHeightMin: z.object({
        valueMm: z.number(),
        sigmaMm: z.number().optional(),
        source: z.enum(["scan", "operator", "derived"]),
        uncertainty: z.number().optional(),
      }).optional(),
      leafWidth: z.object({
        valueMm: z.number(),
        sigmaMm: z.number().optional(),
        source: z.enum(["scan", "operator", "derived"]),
        uncertainty: z.number().optional(),
      }).optional(),
      leafHeight: z.object({
        valueMm: z.number(),
        sigmaMm: z.number().optional(),
        source: z.enum(["scan", "operator", "derived"]),
        uncertainty: z.number().optional(),
      }).optional(),
      lockBacksetMm: z.object({
        valueMm: z.number(),
        sigmaMm: z.number().optional(),
        source: z.enum(["scan", "operator", "derived"]),
        uncertainty: z.number().optional(),
      }).optional(),
      hingeSizeMm: z.object({
        valueMm: z.number(),
        sigmaMm: z.number().optional(),
        source: z.enum(["scan", "operator", "derived"]),
        uncertainty: z.number().optional(),
      }).optional(),
      coveragePct: z.number().optional(),
      qualityScore: z.number().optional(),
      confidence: z.number().optional(),
    });

    const validatedData = scanDataSchema.parse(req.body);

    // Verify user has access to this opening
    const opening = await storage.getOpening(openingId);
    if (!opening) {
      return res.status(404).json({ error: "Opening not found" });
    }
    
    // Verify the opening belongs to a project in the user's organization
    const project = await storage.getProject(opening.projectId, context.organizationId);
    if (!project) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Convert mm to inches for storage (door_openings table uses inches)
    const mmToInches = (mm: number) => (mm / 25.4).toFixed(2);

    // Update door opening with scan results
    const updateData: any = {};
    
    if (validatedData.frameWidthMin) {
      updateData.frameWidth = validatedData.frameWidthMin.valueMm / 25.4;
    }
    if (validatedData.frameHeightMin) {
      updateData.frameHeight = validatedData.frameHeightMin.valueMm / 25.4;
    }
    if (validatedData.leafWidth) {
      updateData.doorWidth = validatedData.leafWidth.valueMm / 25.4;
    }
    if (validatedData.leafHeight) {
      updateData.doorHeight = validatedData.leafHeight.valueMm / 25.4;
    }

    // Store scan quality metrics in dedicated columns
    if (validatedData.coveragePct !== undefined) {
      updateData.coveragePct = validatedData.coveragePct;
    }
    if (validatedData.qualityScore !== undefined) {
      updateData.qualityScore = validatedData.qualityScore;
    }
    if (validatedData.confidence !== undefined) {
      updateData.confidence = validatedData.confidence;
    }

    // Update the opening
    const updatedOpening = await storage.updateOpening(openingId, context.organizationId, updateData);

    res.json({
      success: true,
      opening: updatedOpening,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid scan data", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/openings/:id/apply-lidar-assessment", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const openingId = req.params.id;

    const opening = await storage.getOpening(openingId);
    if (!opening) {
      return res.status(404).json({ error: "Opening not found" });
    }

    const project = await storage.getProject(opening.projectId, context.organizationId);
    if (!project) {
      return res.status(403).json({ error: "Access denied" });
    }

    const scans = await storage.getLidarScansByOpening(openingId);
    const processedScans = scans
      .filter(s => s.processingStatus === 'processed' && s.processedMetrics)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    if (processedScans.length === 0) {
      return res.status(404).json({ error: "No processed LiDAR scans found for this opening" });
    }

    const scan = processedScans[0];
    const metrics = scan.processedMetrics as any;
    const scores = scan.confidenceScores as any;
    const overallConfidence = scores?.overall || 0;

    const assessmentData: any = {};

    if (overallConfidence >= 0.85) {
      assessmentData.frameLevelCheck = 'pass';
      assessmentData.framePlumbCheck = 'pass';
      assessmentData.frameSquareCheck = 'pass';
      assessmentData.frameStraightnessCheck = 'pass';
    } else if (overallConfidence >= 0.6) {
      assessmentData.frameLevelCheck = 'marginal';
      assessmentData.framePlumbCheck = 'marginal';
      assessmentData.frameSquareCheck = 'marginal';
      assessmentData.frameStraightnessCheck = 'marginal';
    } else {
      assessmentData.frameLevelCheck = 'fail';
      assessmentData.framePlumbCheck = 'fail';
      assessmentData.frameSquareCheck = 'fail';
      assessmentData.frameStraightnessCheck = 'fail';
    }

    assessmentData.frameTwistObserved = 'no';
    assessmentData.doorDriftObserved = 'no';

    if (metrics.swingDirection && metrics.swingDirection !== 'unknown') {
      assessmentData.doorSwingCheck = 'pass';
    } else {
      assessmentData.doorSwingCheck = 'marginal';
    }

    if (metrics.width) {
      const widthInches = metrics.width / 25.4;
      const estimatedReveal = (widthInches * 0.005).toFixed(3);
      assessmentData.revealLeft = `${estimatedReveal}"`;
      assessmentData.revealRight = `${estimatedReveal}"`;
      assessmentData.revealTop = `${estimatedReveal}"`;
    }

    if (metrics.height) {
      const heightInches = metrics.height / 25.4;
      assessmentData.undercutGap = '3/4"';
    }

    assessmentData.revealUniformity = overallConfidence >= 0.85 ? 'uniform' : 'not_checked';
    assessmentData.revealNotes = `Auto-populated from LiDAR scan (confidence: ${(overallConfidence * 100).toFixed(0)}%). Scan: ${scan.originalFilename}`;

    const updatedOpening = await storage.updateOpening(openingId, context.organizationId, assessmentData);
    res.json({ success: true, assessment: assessmentData, scanId: scan.id, confidence: overallConfidence });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/openings/:openingId/hardware-identification", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const openingId = req.params.openingId;
    const opening = await storage.getOpening(openingId);
    if (!opening) {
      return res.status(404).json({ error: "Opening not found" });
    }

    const project = await storage.getProject(opening.projectId, context.organizationId);
    if (!project) {
      return res.status(403).json({ error: "Access denied" });
    }

    const scans = await storage.getLidarScansByOpening(openingId);
    const processedScans = scans
      .filter(s => s.processingStatus === 'processed' && s.processedMetrics)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    if (processedScans.length === 0) {
      return res.status(404).json({ error: "No processed LiDAR scans found" });
    }

    const scan = processedScans[0];
    const metrics = scan.processedMetrics as ProcessedMetricsInput;
    const scores = scan.confidenceScores as ConfidenceScoresInput;

    if (!metrics || !metrics.width || !metrics.height) {
      return res.status(400).json({ error: "Scan missing required dimension data" });
    }

    let revealData = null;
    if (scan.revealGapAnalysis) {
      revealData = scan.revealGapAnalysis as any;
    }

    const analysisOptions = {
      revealData,
      isExterior: req.query.isExterior === 'true',
      isAccessControlled: req.query.isAccessControlled === 'true',
      isSwingClearRequired: req.query.isSwingClearRequired === 'true',
      isCamLiftRequired: req.query.isCamLiftRequired === 'true',
      isHighFrequency: req.query.isHighFrequency === 'true',
      isCenterHung: req.query.isCenterHung === 'true',
      isCenterPivot: req.query.isCenterPivot === 'true',
      isPocketPivot: req.query.isPocketPivot === 'true',
      isArchitecturalDesign: req.query.isArchitecturalDesign === 'true',
      isExitDevice: req.query.isExitDevice === 'true',
      isMagLock: req.query.isMagLock === 'true',
      hasAccessControl: req.query.hasAccessControl === 'true',
      frameMaterialHint: (req.query.frameMaterial as any) || undefined,
      doorMaterialHint: (req.query.doorMaterial as any) || undefined,
      installationHint: (req.query.installationMethod as any) || undefined,
      hasVisionKit: req.query.hasVisionKit === 'true',
      visionKitType: (req.query.visionKitType as any) || undefined,
      hasLouver: req.query.hasLouver === 'true',
      louverType: (req.query.louverType as any) || undefined,
      finishHint: (req.query.finish as string) || undefined,
      colorHint: (req.query.color as string) || undefined,
      occupancyType: (req.query.occupancyType as string) || undefined,
      fireRating: (req.query.fireRating as string) || undefined,
      isPairDoor: req.query.isPairDoor === 'true',
      conditionAge: req.query.conditionAge ? parseInt(req.query.conditionAge as string) : undefined,
      existingHardwareAge: req.query.hardwareAge ? parseInt(req.query.hardwareAge as string) : undefined,
    };

    const analysis = analyzeOpening(
      metrics,
      scores || { overall: 0.7, width: 0.7, height: 0.7, frameDepth: 0.7, swingDirection: 0.5, pointDensity: 0.7 },
      undefined,
      analysisOptions
    );

    const orgOverrides = await storage.getDetectionOverridesByOrg(context.organizationId);
    const { updatedAnalysis, appliedLearning } = applyLearningToAnalysis(
      {
        materialIdentification: analysis.materialIdentification,
        accessoryDetection: analysis.accessoryDetection,
        enhancedRevealDetails: analysis.enhancedRevealDetails,
        conditionAssessment: analysis.conditionAssessment,
      },
      orgOverrides
    );

    const existingOverrides = await storage.getDetectionOverridesByOpening(openingId);

    res.json({
      scanId: scan.id,
      scanFilename: scan.originalFilename,
      identification: analysis.hardwareIdentification,
      materialIdentification: updatedAnalysis.materialIdentification,
      accessoryDetection: updatedAnalysis.accessoryDetection,
      enhancedRevealDetails: updatedAnalysis.enhancedRevealDetails,
      conditionAssessment: updatedAnalysis.conditionAssessment,
      appliedLearning,
      existingOverrides,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a detection override (user correction)
router.post("/api/openings/:openingId/detection-overrides", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const openingId = req.params.openingId;

    const opening = await storage.getOpening(openingId);
    if (!opening) {
      return res.status(404).json({ error: "Opening not found" });
    }

    const project = await storage.getProject(opening.projectId, context.organizationId);
    if (!project) {
      return res.status(403).json({ error: "Access denied" });
    }

    const bodySchema = z.object({
      fieldPath: z.string().min(1),
      originalValue: z.any(),
      correctedValue: z.any(),
      originalConfidence: z.number().min(0).max(1).nullable().optional(),
      scanId: z.string().nullable().optional(),
      context: z.record(z.any()).nullable().optional(),
    });

    const validated = bodySchema.parse(req.body);

    const override = await storage.createDetectionOverride({
      organizationId: context.organizationId,
      openingId,
      scanId: validated.scanId || null,
      fieldPath: validated.fieldPath,
      originalValue: validated.originalValue,
      correctedValue: validated.correctedValue,
      originalConfidence: validated.originalConfidence || null,
      context: validated.context || null,
      createdBy: context.userId,
    });

    res.json({ success: true, override });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid override data", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get existing overrides for an opening
router.get("/api/openings/:openingId/detection-overrides", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const openingId = req.params.openingId;
    const opening = await storage.getOpening(openingId);
    if (!opening) {
      return res.status(404).json({ error: "Opening not found" });
    }

    const project = await storage.getProject(opening.projectId, context.organizationId);
    if (!project) {
      return res.status(403).json({ error: "Access denied" });
    }

    const overrides = await storage.getDetectionOverridesByOpening(openingId);
    res.json(overrides);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get learning stats for organization
router.get("/api/organizations/:orgId/learning-stats", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    if (context.organizationId !== req.params.orgId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const overrides = await storage.getDetectionOverridesByOrg(req.params.orgId);

    const fieldStats: Record<string, { count: number; topCorrections: Record<string, number> }> = {};
    for (const o of overrides) {
      if (!fieldStats[o.fieldPath]) {
        fieldStats[o.fieldPath] = { count: 0, topCorrections: {} };
      }
      fieldStats[o.fieldPath].count++;
      const key = JSON.stringify(o.correctedValue);
      fieldStats[o.fieldPath].topCorrections[key] = (fieldStats[o.fieldPath].topCorrections[key] || 0) + 1;
    }

    res.json({
      totalOverrides: overrides.length,
      fieldStats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
