import { Router } from "express";
import { storage } from "../storage";
import { getOrganizationContext } from "../clerkAuth";
import { insertLeadSchema, insertSalesActivitySchema } from "@shared/schema";

const router = Router();

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// ====== LEADS ======

router.post("/api/sales/leads", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertLeadSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
    });

    const lead = await storage.createLead(validatedData);
    res.json(lead);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/sales/leads", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const allLeads = await storage.getLeads(context.organizationId);
    
    // Apply filters client-side for now
    const { status, source, assignedTo } = req.query;
    let filtered = allLeads;
    
    if (status) {
      filtered = filtered.filter(l => l.status === status);
    }
    if (source) {
      filtered = filtered.filter(l => l.source === source);
    }
    if (assignedTo) {
      filtered = filtered.filter(l => l.assignedTo === assignedTo);
    }
    
    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/sales/leads/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const lead = await storage.getLead(req.params.id);
    if (!lead || lead.organizationId !== context.organizationId) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/sales/leads/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Verify ownership
    const existing = await storage.getLead(req.params.id);
    if (!existing || existing.organizationId !== context.organizationId) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const updated = await storage.updateLead(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/sales/leads/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Verify ownership
    const existing = await storage.getLead(req.params.id);
    if (!existing || existing.organizationId !== context.organizationId) {
      return res.status(404).json({ error: "Lead not found" });
    }

    await storage.deleteLead(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/sales/leads/:id/convert", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Verify ownership
    const existing = await storage.getLead(req.params.id);
    if (!existing || existing.organizationId !== context.organizationId) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: "customerId is required" });
    }

    const updated = await storage.updateLead(req.params.id, {
      convertedToCustomerId: customerId,
      status: "won",
    });

    if (!updated) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ====== SALES ACTIVITIES ======

router.post("/api/sales/activities", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertSalesActivitySchema.parse({
      ...req.body,
      userId: context.userId,
    });

    // Verify lead belongs to organization
    const lead = await storage.getLead(validatedData.leadId);
    if (!lead || lead.organizationId !== context.organizationId) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const activity = await storage.createSalesActivity(validatedData);
    
    // Update lead's lastContactedAt
    await storage.updateLead(validatedData.leadId, {
      lastContactedAt: new Date(),
    });

    res.json(activity);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/sales/activities", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { leadId } = req.query;
    if (!leadId) {
      return res.status(400).json({ error: "leadId query parameter is required" });
    }
    
    // Verify lead belongs to organization
    const lead = await storage.getLead(leadId as string);
    if (!lead || lead.organizationId !== context.organizationId) {
      return res.status(404).json({ error: "Lead not found" });
    }
    
    const activities = await storage.getSalesActivities(leadId as string);
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/sales/activities/lead/:leadId", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Verify lead belongs to organization
    const lead = await storage.getLead(req.params.leadId);
    if (!lead || lead.organizationId !== context.organizationId) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const activities = await storage.getSalesActivities(req.params.leadId);
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/sales/activities/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    // Get the activity to find its lead
    const activity = await storage.getSalesActivity(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // Verify lead belongs to organization
    const lead = await storage.getLead(activity.leadId);
    if (!lead || lead.organizationId !== context.organizationId) {
      return res.status(404).json({ error: "Activity not found" });
    }

    await storage.deleteSalesActivity(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== ANALYTICS ======

router.get("/api/sales/analytics/pipeline", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const allLeads = await storage.getLeads(context.organizationId);
    
    const pipelineByStatus: Record<string, { count: number; totalValue: number }> = {};
    let totalPipelineValue = 0;
    
    allLeads.forEach(lead => {
      const status = lead.status || 'unknown';
      if (!pipelineByStatus[status]) {
        pipelineByStatus[status] = { count: 0, totalValue: 0 };
      }
      pipelineByStatus[status].count++;
      pipelineByStatus[status].totalValue += lead.estimatedValue || 0;
      totalPipelineValue += lead.estimatedValue || 0;
    });

    res.json({
      pipelineByStatus,
      totalLeads: allLeads.length,
      totalPipelineValue,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/sales/analytics/conversion-funnel", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const allLeads = await storage.getLeads(context.organizationId);
    
    const statusCounts = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
      unqualified: 0,
    };

    allLeads.forEach(lead => {
      const status = lead.status as keyof typeof statusCounts;
      if (status && status in statusCounts) {
        statusCounts[status]++;
      }
    });

    const totalLeads = allLeads.length;
    const conversionRate = totalLeads > 0 ? ((statusCounts.won / totalLeads) * 100).toFixed(1) : "0.0";

    res.json({
      statusCounts,
      totalLeads,
      conversionRate,
      wonDeals: statusCounts.won,
      lostDeals: statusCounts.lost,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== COMPREHENSIVE SALES REPORTS ======

router.get("/api/sales/reports", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const allLeads = await storage.getLeads(context.organizationId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Revenue Metrics
    const wonLeads = allLeads.filter(l => l.status === "won");
    const activeLeads = allLeads.filter(l => !["won", "lost", "unqualified"].includes(l.status));
    const totalWonRevenue = wonLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    const totalPipelineValue = activeLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    
    // Win rate calculation
    const closedLeads = allLeads.filter(l => ["won", "lost"].includes(l.status));
    const winRate = closedLeads.length > 0 ? (wonLeads.length / closedLeads.length) * 100 : 0;
    
    // Weighted pipeline (probability based on stage)
    const stageProbabilities: Record<string, number> = {
      new: 0.05,
      contacted: 0.15,
      qualified: 0.30,
      proposal: 0.50,
      negotiation: 0.75,
    };
    const weightedPipeline = activeLeads.reduce((sum, lead) => {
      const probability = stageProbabilities[lead.status] || 0.1;
      return sum + (lead.estimatedValue || 0) * probability;
    }, 0);

    // Sales Rep Performance
    const repPerformance: Record<string, { leads: number; won: number; value: number; activities: number }> = {};
    allLeads.forEach(lead => {
      const repId = lead.assignedTo || "unassigned";
      if (!repPerformance[repId]) {
        repPerformance[repId] = { leads: 0, won: 0, value: 0, activities: 0 };
      }
      repPerformance[repId].leads++;
      if (lead.status === "won") {
        repPerformance[repId].won++;
        repPerformance[repId].value += lead.estimatedValue || 0;
      }
    });

    // Lead Source Analysis
    const sourceAnalysis: Record<string, { total: number; won: number; value: number; conversionRate: number }> = {};
    allLeads.forEach(lead => {
      const source = lead.source || "unknown";
      if (!sourceAnalysis[source]) {
        sourceAnalysis[source] = { total: 0, won: 0, value: 0, conversionRate: 0 };
      }
      sourceAnalysis[source].total++;
      if (lead.status === "won") {
        sourceAnalysis[source].won++;
        sourceAnalysis[source].value += lead.estimatedValue || 0;
      }
    });
    
    // Calculate conversion rates per source
    Object.keys(sourceAnalysis).forEach(source => {
      const data = sourceAnalysis[source];
      data.conversionRate = data.total > 0 ? Math.round((data.won / data.total) * 100) : 0;
    });

    // Pipeline by Stage (for funnel visualization)
    const pipelineStages = [
      { stage: "New", count: allLeads.filter(l => l.status === "new").length, value: allLeads.filter(l => l.status === "new").reduce((s, l) => s + (l.estimatedValue || 0), 0) },
      { stage: "Contacted", count: allLeads.filter(l => l.status === "contacted").length, value: allLeads.filter(l => l.status === "contacted").reduce((s, l) => s + (l.estimatedValue || 0), 0) },
      { stage: "Qualified", count: allLeads.filter(l => l.status === "qualified").length, value: allLeads.filter(l => l.status === "qualified").reduce((s, l) => s + (l.estimatedValue || 0), 0) },
      { stage: "Proposal", count: allLeads.filter(l => l.status === "proposal").length, value: allLeads.filter(l => l.status === "proposal").reduce((s, l) => s + (l.estimatedValue || 0), 0) },
      { stage: "Negotiation", count: allLeads.filter(l => l.status === "negotiation").length, value: allLeads.filter(l => l.status === "negotiation").reduce((s, l) => s + (l.estimatedValue || 0), 0) },
      { stage: "Won", count: wonLeads.length, value: totalWonRevenue },
    ];

    // Trends - leads created in last 30 days grouped by week
    const recentLeads = allLeads.filter(l => new Date(l.createdAt) >= thirtyDaysAgo);
    const trendsByWeek: { week: string; newLeads: number; wonDeals: number; revenue: number }[] = [];
    
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekLeads = allLeads.filter(l => {
        const created = new Date(l.createdAt);
        return created >= weekStart && created < weekEnd;
      });
      const weekWon = allLeads.filter(l => {
        if (l.status !== "won" || !l.updatedAt) return false;
        const updated = new Date(l.updatedAt);
        return updated >= weekStart && updated < weekEnd;
      });
      
      trendsByWeek.unshift({
        week: `Week ${4 - i}`,
        newLeads: weekLeads.length,
        wonDeals: weekWon.length,
        revenue: weekWon.reduce((s, l) => s + (l.estimatedValue || 0), 0),
      });
    }

    // Industry breakdown
    const industryBreakdown: Record<string, { count: number; value: number }> = {};
    allLeads.forEach(lead => {
      const industry = lead.industry || "Not Specified";
      if (!industryBreakdown[industry]) {
        industryBreakdown[industry] = { count: 0, value: 0 };
      }
      industryBreakdown[industry].count++;
      industryBreakdown[industry].value += lead.estimatedValue || 0;
    });

    // Top deals (highest value opportunities)
    const topDeals = [...activeLeads]
      .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
      .slice(0, 5)
      .map(lead => ({
        id: lead.id,
        company: lead.companyName || "Unknown",
        contact: lead.contactName,
        value: lead.estimatedValue || 0,
        status: lead.status,
        industry: lead.industry,
      }));

    // Recent wins
    const recentWins = wonLeads
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 5)
      .map(lead => ({
        id: lead.id,
        company: lead.companyName || "Unknown",
        contact: lead.contactName,
        value: lead.estimatedValue || 0,
        industry: lead.industry,
        closedAt: lead.updatedAt,
      }));

    res.json({
      summary: {
        totalLeads: allLeads.length,
        activeLeads: activeLeads.length,
        wonDeals: wonLeads.length,
        lostDeals: allLeads.filter(l => l.status === "lost").length,
        winRate: Math.round(winRate * 10) / 10,
        totalWonRevenue,
        totalPipelineValue,
        weightedPipeline: Math.round(weightedPipeline),
        avgDealSize: wonLeads.length > 0 ? Math.round(totalWonRevenue / wonLeads.length) : 0,
      },
      pipelineStages,
      sourceAnalysis: Object.entries(sourceAnalysis).map(([source, data]) => ({
        source: source.replace(/-/g, " "),
        ...data,
      })),
      industryBreakdown: Object.entries(industryBreakdown).map(([industry, data]) => ({
        industry: industry.replace(/-/g, " "),
        ...data,
      })),
      repPerformance: Object.entries(repPerformance).map(([repId, data]) => ({
        repId,
        ...data,
        winRate: data.leads > 0 ? Math.round((data.won / data.leads) * 100) : 0,
      })),
      trends: trendsByWeek,
      topDeals,
      recentWins,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
