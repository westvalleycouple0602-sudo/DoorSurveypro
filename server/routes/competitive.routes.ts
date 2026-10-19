import { Router } from "express";
import { storage } from "../storage";
import { getOrganizationContext } from "../clerkAuth";
import {
  insertCompetitorSchema,
  insertCompetitorProductSchema,
  insertCompetitorPricingSchema,
  insertProjectCompetitorSchema,
  updateCompetitorSchema,
  updateCompetitorProductSchema,
  updateProjectCompetitorSchema,
} from "@shared/schema";

const router = Router();

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// ====== COMPETITORS ======

router.post("/api/competitive/competitors", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertCompetitorSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
      createdBy: context.userId,
    });

    const competitor = await storage.createCompetitor(validatedData);
    res.json(competitor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/competitive/competitors", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const competitors = await storage.getCompetitors(context.organizationId);
    res.json(competitors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/competitive/competitors/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const competitor = await storage.getCompetitor(req.params.id, context.organizationId);
    if (!competitor) {
      return res.status(404).json({ error: "Competitor not found" });
    }
    res.json(competitor);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/competitive/competitors/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedUpdates = updateCompetitorSchema.parse(req.body);

    const updated = await storage.updateCompetitor(
      req.params.id,
      context.organizationId,
      validatedUpdates
    );

    if (!updated) {
      return res.status(404).json({ error: "Competitor not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/competitive/competitors/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    await storage.deleteCompetitor(req.params.id, context.organizationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== COMPETITOR PRODUCTS ======

router.post("/api/competitive/products", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertCompetitorProductSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
    });

    const product = await storage.createCompetitorProduct(validatedData);
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/competitive/competitors/:competitorId/products", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const products = await storage.getCompetitorProducts(
      req.params.competitorId,
      context.organizationId
    );
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/competitive/products/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedUpdates = updateCompetitorProductSchema.parse(req.body);

    const updated = await storage.updateCompetitorProduct(
      req.params.id,
      context.organizationId,
      validatedUpdates
    );

    if (!updated) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/competitive/products/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    await storage.deleteCompetitorProduct(req.params.id, context.organizationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== COMPETITOR PRICING ======

router.post("/api/competitive/pricing", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertCompetitorPricingSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
      recordedBy: context.userId,
    });

    const pricing = await storage.createCompetitorPricing(validatedData);
    res.json(pricing);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/competitive/competitors/:competitorId/pricing", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const pricing = await storage.getCompetitorPricing(
      req.params.competitorId,
      context.organizationId
    );
    res.json(pricing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== WIN/LOSS ANALYSIS ======

router.post("/api/competitive/project-competitors", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertProjectCompetitorSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
      recordedBy: context.userId,
    });

    const entry = await storage.createProjectCompetitor(validatedData);
    res.json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/competitive/projects/:projectId/competitors", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const competitors = await storage.getProjectCompetitors(
      req.params.projectId,
      context.organizationId
    );
    res.json(competitors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/competitive/project-competitors/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedUpdates = updateProjectCompetitorSchema.parse(req.body);

    const updated = await storage.updateProjectCompetitor(
      req.params.id,
      context.organizationId,
      validatedUpdates
    );

    if (!updated) {
      return res.status(404).json({ error: "Project competitor not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/competitive/project-competitors/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    await storage.deleteProjectCompetitor(req.params.id, context.organizationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/competitive/analytics/win-loss", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { startDate, endDate } = req.query;
    
    const analytics = await storage.getWinLossAnalytics(
      context.organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
