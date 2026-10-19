import { Router } from "express";
import { storage } from "../storage";
import { getOrganizationContext } from "../clerkAuth";

const router = Router();

// Helper function to get authenticated context
async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// Get current performance metrics
router.get("/api/performance/metrics/current", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await storage.calculatePerformanceMetrics(
      context.organizationId,
      startDate,
      endDate
    );

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get performance trends for a specific metric
router.get("/api/performance/trends/:metricName", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { metricName } = req.params;
    const { periodType = 'monthly', limit = '12' } = req.query;

    const trends = await storage.getPerformanceTrends(
      context.organizationId,
      metricName,
      periodType as 'daily' | 'weekly' | 'monthly',
      parseInt(limit as string)
    );

    res.json(trends);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Store/update a performance metric
router.post("/api/performance/metrics", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { kpiName, kpiCategory, value, periodType, periodStart, periodEnd, metadata } = req.body;

    if (!kpiName || !kpiCategory || value === undefined || !periodType || !periodStart || !periodEnd) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const metric = await storage.storePerformanceMetric(
      context.organizationId,
      kpiName,
      kpiCategory,
      value,
      periodType,
      new Date(periodStart),
      new Date(periodEnd),
      metadata
    );

    res.json(metric);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get performance summary (overview of all key metrics)
router.get("/api/performance/summary", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Get metrics for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const current = await storage.calculatePerformanceMetrics(
      context.organizationId,
      startDate,
      endDate
    );

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - 30);

    const previous = await storage.calculatePerformanceMetrics(
      context.organizationId,
      prevStartDate,
      prevEndDate
    );

    // Calculate changes
    const changes = {
      projectCompletionRate: current.metrics.projectCompletionRate - previous.metrics.projectCompletionRate,
      avgProjectDuration: current.metrics.avgProjectDuration - previous.metrics.avgProjectDuration,
      totalProjects: current.metrics.totalProjects - previous.metrics.totalProjects,
      openingsPerProject: current.metrics.openingsPerProject - previous.metrics.openingsPerProject,
    };

    res.json({
      current,
      previous,
      changes,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
