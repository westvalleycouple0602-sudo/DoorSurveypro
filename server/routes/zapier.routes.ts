import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { apiKeyAuth, requireScope } from "../middleware/apiKeyAuth";
import { createHubSpotService } from "../hubspot";
import { insertProjectSchema, insertDoorOpeningSchema } from "@shared/schema";
import { handleValidationError } from "../utils/error-handler";
import { logError } from "../logger";

const router = Router();
// No session or global environment-key fallback. Context comes only from the
// hashed, revocable organization-owned key verified by this middleware.
router.use(apiKeyAuth);

router.post("/projects", requireScope("projects:write"), async (req, res) => {
  try {
    const organizationId = req.apiKey!.organizationId;
    const data = insertProjectSchema.parse({ ...req.body, organizationId });
    // Optional relationships must also belong to the key's organization.
    if (data.customerId) {
      const customer = await storage.getCustomer(data.customerId, organizationId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
    }
    if (data.locationId) {
      const location = await storage.getCustomerLocation(data.locationId);
      if (!location || !data.customerId || location.customerId !== data.customerId) {
        return res.status(404).json({ error: "Customer location not found" });
      }
    }
    const project = await storage.createProject(data);
    res.status(201).json({ success: true, message: "Project created successfully", data: project });
  } catch (error) { handleValidationError(error, res, logError); }
});

router.get("/projects/:id", requireScope("projects:read"), requireScope("openings:read"), requireScope("quotes:read"), async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id, req.apiKey!.organizationId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const openings = await storage.getOpeningsByProject(project.id);
    const cost = await storage.getProjectCost(project.id);
    res.json({ success: true, data: { project, openings, cost } });
  } catch (error) { handleValidationError(error, res, logError); }
});

router.post("/projects/:projectId/openings", requireScope("openings:write"), async (req, res) => {
  try {
    const project = await storage.getProject(req.params.projectId, req.apiKey!.organizationId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const data = insertDoorOpeningSchema.parse({ ...req.body, projectId: project.id });
    const opening = await storage.createOpening(data);
    res.status(201).json({ success: true, message: "Opening added successfully", data: opening });
  } catch (error) { handleValidationError(error, res, logError); }
});

router.post("/hubspot/sync-project/:projectId", requireScope("projects:read"), requireScope("quotes:read"), requireScope("integrations:write"), async (req, res) => {
  try {
    const organizationId = req.apiKey!.organizationId;
    const project = await storage.getProject(req.params.projectId, organizationId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const hubspotService = await createHubSpotService(organizationId);
    if (!hubspotService.isConfigured()) return res.status(503).json({ success: false, error: "HubSpot API is not configured" });
    const cost = await storage.getProjectCost(project.id);
    const totalCost = cost ? hubspotService.calculateTotalCost({
      ...cost,
      travelHours: cost.travelTime,
      travelHourlyRate: cost.travelRate,
      expeditedDeliveryCost: cost.expeditedCost,
    }) : 0;
    const result = await hubspotService.syncProject({ ...project, totalCost });
    res.json({ success: true, message: "Project synced to HubSpot", data: { dealId: result.id } });
  } catch (error) {
    logError(error, { context: "zapier-hubspot-sync" });
    res.status(500).json({ success: false, error: "Failed to sync to HubSpot" });
  }
});

router.get("/projects", requireScope("projects:read"), async (req, res) => {
  try {
    const { limit, offset } = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(100),
      offset: z.coerce.number().int().nonnegative().default(0),
    }).parse(req.query);
    const projects = await storage.getProjects(req.apiKey!.organizationId);
    res.json({ success: true, data: projects.slice(offset, offset + limit), pagination: {
      total: projects.length, limit, offset, hasMore: offset + limit < projects.length,
    } });
  } catch (error) { handleValidationError(error, res, logError); }
});

export default router;
