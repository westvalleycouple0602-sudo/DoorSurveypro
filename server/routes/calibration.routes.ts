import { Router } from "express";
import { storage } from "../storage.js";
import { getOrganizationContext } from "../clerkAuth.js";
import { insertCalibrationProfileSchema } from "@shared/schema";
import {
  applyCalibrationCorrection,
  detectHardwarePlacements,
  analyzeDualScanReveals,
  type ProcessedMetricsInput,
  type ConfidenceScoresInput,
  type CalibrationInput,
  type CalibrationProfile as CalibrationProfileEngine,
} from "../engine/calibrationEngine";

const router = Router();

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return context;
}

router.get("/api/calibration/profiles", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const profiles = await storage.getCalibrationProfiles(context.organizationId);
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/calibration/profiles/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const profile = await storage.getCalibrationProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: "Calibration profile not found" });
    }

    if (profile.organizationId !== context.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/calibration/profiles", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertCalibrationProfileSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
    });

    const profile = await storage.createCalibrationProfile(validatedData);
    res.status(201).json(profile);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid profile data", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/calibration/profiles/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const existing = await storage.getCalibrationProfile(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Calibration profile not found" });
    }

    if (existing.organizationId !== context.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await storage.updateCalibrationProfile(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/calibration/profiles/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const existing = await storage.getCalibrationProfile(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Calibration profile not found" });
    }

    if (existing.organizationId !== context.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const deleted = await storage.deleteCalibrationProfile(req.params.id);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete calibration profile" });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/calibration/profiles/seed-default", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const profile = await storage.createCalibrationProfile({
      organizationId: context.organizationId,
      name: "Standard Door - AprilTag36h11",
      description: "Default calibration profile for standard commercial doors using AprilTag 36h11 fiducial markers (75mm). Standard 36\" x 84\" door frame.",
      markerType: "AprilTag36h11",
      markerSizeMM: 75,
      expectedGeometry: { topWidth: 914, leftHeight: 2134 },
      toleranceMM: 2,
      isDefault: true,
      isActive: true,
    });

    res.status(201).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/lidar/scans/:id/calibrate", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const scan = await storage.getLidarScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    if (scan.processingStatus !== "processed") {
      return res.status(400).json({ error: "Scan must be processed before calibration" });
    }

    const profileId = req.body.profileId || scan.calibrationProfileId;
    if (!profileId) {
      return res.status(400).json({ error: "No calibration profile specified" });
    }

    const profile = await storage.getCalibrationProfile(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Calibration profile not found" });
    }

    const metrics = scan.processedMetrics as ProcessedMetricsInput;
    const calibrationData = (scan.calibrationData || req.body.calibrationData) as CalibrationInput;

    if (!calibrationData) {
      return res.status(400).json({ error: "No calibration data available" });
    }

    const engineProfile: CalibrationProfileEngine = {
      markerType: profile.markerType,
      markerSizeMM: profile.markerSizeMM,
      expectedGeometry: profile.expectedGeometry as { topWidth: number; leftHeight: number; [key: string]: number },
      toleranceMM: profile.toleranceMM,
    };

    const result = applyCalibrationCorrection(metrics, calibrationData, engineProfile);

    const updateData: any = {
      calibrationStatus: result.status,
      calibrationQualityScore: result.qualityScore,
      calibrationProfileId: profileId,
      calibrationData: {
        ...calibrationData,
        result,
      },
    };

    if (result.correctedMetrics) {
      updateData.processedMetrics = {
        ...metrics,
        width: result.correctedMetrics.width,
        height: result.correctedMetrics.height,
        frameDepth: result.correctedMetrics.frameDepth,
      };
    }

    const updatedScan = await storage.updateLidarScan(req.params.id, updateData);
    res.json({ scan: updatedScan, calibrationResult: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/lidar/scans/:id/detect-hardware", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const scan = await storage.getLidarScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const metrics = scan.processedMetrics as ProcessedMetricsInput;
    if (!metrics) {
      return res.status(400).json({ error: "Scan must have processed metrics for hardware detection" });
    }

    const confidenceScores = (scan.confidenceScores || {
      overall: 0.8,
      width: 0.8,
      height: 0.8,
      frameDepth: 0.8,
      swingDirection: 0.8,
      pointDensity: 0.8,
    }) as ConfidenceScoresInput;

    const result = detectHardwarePlacements(metrics, confidenceScores);

    await storage.updateLidarScan(req.params.id, {
      hardwareMeasurements: result as any,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/lidar/scans/:id/pair/:pairedId", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const scan = await storage.getLidarScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: "Primary scan not found" });
    }

    const pairedScan = await storage.getLidarScan(req.params.pairedId);
    if (!pairedScan) {
      return res.status(404).json({ error: "Paired scan not found" });
    }

    if (scan.openingId !== pairedScan.openingId) {
      return res.status(400).json({ error: "Both scans must belong to the same opening" });
    }

    const updatedPrimary = await storage.updateLidarScan(req.params.id, {
      scanPurpose: "dual-closed",
      pairedScanId: req.params.pairedId,
    });

    const updatedPaired = await storage.updateLidarScan(req.params.pairedId, {
      scanPurpose: "dual-open",
      pairedScanId: req.params.id,
    });

    res.json({ primary: updatedPrimary, paired: updatedPaired });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/lidar/scans/:id/analyze-reveals", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const scan = await storage.getLidarScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    if (!scan.pairedScanId) {
      return res.status(400).json({ error: "Scan must be paired for reveal analysis" });
    }

    const pairedScan = await storage.getLidarScan(scan.pairedScanId);
    if (!pairedScan) {
      return res.status(404).json({ error: "Paired scan not found" });
    }

    const closedMetrics = scan.processedMetrics as ProcessedMetricsInput;
    const openMetrics = pairedScan.processedMetrics as ProcessedMetricsInput | null;
    const closedConfidence = (scan.confidenceScores || {
      overall: 0.8,
      width: 0.8,
      height: 0.8,
      frameDepth: 0.8,
      swingDirection: 0.8,
      pointDensity: 0.8,
    }) as ConfidenceScoresInput;
    const openConfidence = (pairedScan.confidenceScores || null) as ConfidenceScoresInput | null;

    const result = analyzeDualScanReveals(closedMetrics, openMetrics, closedConfidence, openConfidence);

    await storage.updateLidarScan(req.params.id, {
      revealGapAnalysis: result as any,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
