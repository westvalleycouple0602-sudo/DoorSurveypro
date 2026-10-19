import { Router } from "express";
import { z } from "zod";
import { insertArMeasurementSchema } from "@shared/schema";
import { storage } from "../storage.js";
import { getOrganizationContext } from "../clerkAuth.js";

const router = Router();

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// Get all AR measurements for organization
router.get("/api/ar-measurements", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const measurements = await storage.getArMeasurements(context.organizationId);
    res.json(measurements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get AR measurements for a specific opening
router.get("/api/ar-measurements/opening/:openingId", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const measurements = await storage.getArMeasurementsByOpening(
      req.params.openingId,
      context.organizationId
    );
    res.json(measurements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific AR measurement
router.get("/api/ar-measurements/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const measurement = await storage.getArMeasurement(req.params.id, context.organizationId);
    if (!measurement) {
      return res.status(404).json({ error: "Measurement not found" });
    }
    res.json(measurement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new AR measurement
router.post("/api/ar-measurements", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Validate request body
    const validatedData = insertArMeasurementSchema.parse(req.body);

    // Create measurement
    const measurement = await storage.createArMeasurement({
      ...validatedData,
      organizationId: context.organizationId,
      measuredBy: context.userId,
    });

    res.json(measurement);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid measurement data", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete AR measurement
router.delete("/api/ar-measurements/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const deleted = await storage.deleteArMeasurement(req.params.id, context.organizationId);
    if (!deleted) {
      return res.status(404).json({ error: "Measurement not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
