// server/routes/lidarCompliance.ts
// API route handler for LiDAR-based compliance validation

import { Request, Response } from "express";
import { mapRawLidarToEngineInputs, RawLidarOpeningData } from "../engine/lidarMapping";
import { evaluateOpeningAgainstRules, summarizeViolations } from "../engine/doorComplianceEngine";
import { buildDoorElevationOverlay } from "../engine/doorElevationOverlay";

export async function lidarComplianceHandler(req: Request, res: Response) {
  try {
    const raw: RawLidarOpeningData = req.body;

    if (!raw.openingId || !raw.jurisdiction) {
      return res.status(400).json({ 
        error: "Missing required fields: openingId and jurisdiction are required." 
      });
    }

    if (!raw.hardwareDetections || !Array.isArray(raw.hardwareDetections)) {
      return res.status(400).json({ 
        error: "hardwareDetections array is required." 
      });
    }

    const { opening, hardwareList } = mapRawLidarToEngineInputs(raw, "lidar");
    const results = evaluateOpeningAgainstRules(opening, hardwareList);
    const overlay = buildDoorElevationOverlay(opening, hardwareList, results);
    const summary = summarizeViolations(results);

    res.json({
      openingId: opening.openingId,
      jurisdiction: opening.jurisdiction,
      summary,
      violations: results.filter((r) => !r.passed),
      passes: results.filter((r) => r.passed),
      overlay
    });
  } catch (err) {
    console.error("LiDAR compliance error:", err);
    res.status(400).json({ error: "Invalid LiDAR payload or evaluation error." });
  }
}
