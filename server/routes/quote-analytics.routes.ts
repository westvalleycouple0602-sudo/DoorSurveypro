import type { Express } from "express";
import { db } from "../db";
import { quoteRequests, projects, customers, hardwareItems, doorOpenings } from "@shared/schema";
import { eq, and, sql, gte, lte, or, ilike, desc } from "drizzle-orm";
import { getOrganizationContext, requireAuth as isAuthenticated } from "../clerkAuth";
import { requireFeature } from "../feature-gates";
import { logError } from "../logger";

export function registerQuoteAnalyticsRoutes(app: Express) {
  
  // GET /api/quote-analytics - Get comprehensive quote analytics (projects = customer quotes)
  // Requires advancedReporting feature (Professional+)
  app.get("/api/quote-analytics", isAuthenticated, requireFeature("advancedReporting"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        search,
        customerFilter,
        statusFilter,
        startDate,
        endDate,
      } = req.query;

      // Apply filters to projects (= customer quotes in this system)
      const conditions: any[] = [eq(projects.organizationId, orgContext.organizationId)];

      if (search && typeof search === 'string') {
        conditions.push(
          or(
            ilike(customers.name, `%${search}%`),
            ilike(projects.name, `%${search}%`),
            ilike(projects.location, `%${search}%`)
          )
        );
      }

      if (customerFilter && typeof customerFilter === 'string') {
        conditions.push(eq(projects.customerId, customerFilter));
      }

      if (statusFilter && typeof statusFilter === 'string') {
        conditions.push(eq(projects.status, statusFilter));
      }

      if (startDate && typeof startDate === 'string') {
        conditions.push(gte(projects.createdAt, new Date(startDate)));
      }

      if (endDate && typeof endDate === 'string') {
        conditions.push(lte(projects.createdAt, new Date(endDate)));
      }

      const results = await db
        .select({
          project: projects,
          customer: customers,
        })
        .from(projects)
        .leftJoin(customers, eq(projects.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(desc(projects.createdAt));

      // Get all hardware for these projects
      const projectIds = results.map(r => r.project.id);
      let allProjectHardware: any[] = [];
      
      if (projectIds.length > 0) {
        allProjectHardware = await db
          .select({
            hardwareItem: hardwareItems,
            opening: doorOpenings,
          })
          .from(hardwareItems)
          .leftJoin(doorOpenings, eq(hardwareItems.openingId, doorOpenings.id))
          .where(sql`${doorOpenings.projectId} = ANY(ARRAY[${sql.join(projectIds.map(id => sql`${id}`), sql`, `)}])`);
      }

      // Calculate metrics for each project (customer quote)
      const quotesWithMetrics = results.map(r => {
        const projectHardware = allProjectHardware.filter(h => h.opening?.projectId === r.project.id);
        
        let totalRevenue = 0; // What we charge the customer
        let totalCost = 0;    // What it costs us (COGS)
        let totalListPrice = 0; // Original list price
        
        projectHardware.forEach(hw => {
          const qty = parseFloat(hw.hardwareItem.quantity || "1");
          const listPrice = hw.hardwareItem.listPrice || 0;
          const discount = hw.hardwareItem.discountPercent || 0;
          
          // Revenue = discounted price charged to customer
          const sellingPrice = listPrice * (1 - discount / 100);
          // Cost = our cost (assume 60% of list price as COGS)
          const unitCost = listPrice * 0.6;
          
          totalListPrice += listPrice * qty;
          totalRevenue += sellingPrice * qty;
          totalCost += unitCost * qty;
        });

        // Margin % = (Revenue - Cost) / Revenue * 100
        const marginPercent = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
        const marginDollar = totalRevenue - totalCost;
        
        // Check if quote is expired
        const now = new Date();
        const createdDate = new Date(r.project.createdAt);
        const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const isExpired = daysOld > 30; // Consider quotes >30 days as potentially stale
        
        return {
          id: r.project.id,
          projectId: r.project.id,
          projectName: r.project.name,
          customerName: r.customer?.name,
          customerId: r.customer?.id,
          reviewStatus: r.project.status, // draft, active, completed, cancelled
          totalRevenue,
          totalCost,
          totalListPrice,
          marginPercent,
          marginDollar,
          daysOld,
          isExpired,
          productCount: projectHardware.length,
          createdAt: r.project.createdAt,
        };
      });

      res.json(quotesWithMetrics);
    } catch (error) {
      logError(error as Error);
      res.status(500).json({ error: "Failed to fetch quote analytics" });
    }
  });

  // GET /api/quote-analytics/kpis - Get key performance indicators (projects = customer quotes)
  // Requires advancedReporting feature (Professional+)
  app.get("/api/quote-analytics/kpis", isAuthenticated, requireFeature("advancedReporting"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get all projects for the organization (projects = customer quotes)
      const allProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.organizationId, orgContext.organizationId));

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate KPIs based on project status
      const totalQuotes = allProjects.length;
      const approvedQuotes = allProjects.filter(p => p.status === 'completed').length; // Completed = approved/won
      const rejectedQuotes = allProjects.filter(p => p.status === 'cancelled').length; // Cancelled = lost
      const pendingQuotes = allProjects.filter(p => p.status === 'draft' || p.status === 'active').length;
      const paidQuotes = approvedQuotes; // Assume completed projects are paid
      
      // Closing ratio: (completed projects / total projects) * 100
      const closingRatio = totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0;
      
      // Get all hardware for all projects for margin calculation
      const projectIds = allProjects.map(p => p.id);
      let allHardware: any[] = [];
      
      if (projectIds.length > 0) {
        allHardware = await db
          .select({
            hardwareItem: hardwareItems,
            opening: doorOpenings,
          })
          .from(hardwareItems)
          .leftJoin(doorOpenings, eq(hardwareItems.openingId, doorOpenings.id))
          .where(sql`${doorOpenings.projectId} = ANY(ARRAY[${sql.join(projectIds.map(id => sql`${id}`), sql`, `)}])`);
      }

      // Calculate total revenue and margins
      let totalRevenue = 0; // What we charge customers
      let totalCost = 0;    // What it costs us (COGS)
      
      allHardware.forEach(hw => {
        const qty = parseFloat(hw.hardwareItem.quantity || "1");
        const listPrice = hw.hardwareItem.listPrice || 0;
        const discount = hw.hardwareItem.discountPercent || 0;
        
        // Revenue = discounted selling price
        const sellingPrice = listPrice * (1 - discount / 100);
        // Cost = our cost (60% of list price as COGS)
        const unitCost = listPrice * 0.6;
        
        totalRevenue += sellingPrice * qty;
        totalCost += unitCost * qty;
      });

      // Margin % = (Revenue - Cost) / Revenue * 100
      const averageMarginPercent = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
      const averageMarginDollar = totalRevenue - totalCost;

      // Quote aging analysis
      const expiredQuotes = allProjects.filter(p => {
        const createdDate = new Date(p.createdAt);
        const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysOld > 30 && (p.status === 'draft' || p.status === 'active');
      }).length;

      const recentQuotes = allProjects.filter(p => {
        const createdDate = new Date(p.createdAt);
        return createdDate >= thirtyDaysAgo;
      }).length;

      // Dead quotes (cancelled/lost older than 30 days)
      const deadQuotes = allProjects.filter(p => {
        const createdDate = new Date(p.createdAt);
        const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysOld > 30 && p.status === 'cancelled';
      }).length;

      // Total quote value = total revenue from all projects
      const totalQuoteValue = totalRevenue;
      const avgQuoteValue = totalQuotes > 0 ? totalQuoteValue / totalQuotes : 0;

      res.json({
        totalQuotes,
        approvedQuotes,
        rejectedQuotes,
        pendingQuotes,
        paidQuotes,
        closingRatio,
        averageMarginPercent,
        averageMarginDollar,
        expiredQuotes,
        recentQuotes,
        deadQuotes,
        totalQuoteValue,
        avgQuoteValue,
      });
    } catch (error) {
      logError(error as Error);
      res.status(500).json({ error: "Failed to fetch KPIs" });
    }
  });

  // GET /api/quote-analytics/products - Get product performance data
  // Requires advancedReporting feature (Professional+)
  app.get("/api/quote-analytics/products", isAuthenticated, requireFeature("advancedReporting"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get all hardware items grouped by product
      const productStats = await db
        .select({
          manufacturer: hardwareItems.manufacturer,
          model: hardwareItems.model,
          itemType: hardwareItems.itemType,
          count: sql<number>`count(*)`,
          avgPrice: sql<number>`avg(${hardwareItems.listPrice})`,
          totalRevenue: sql<number>`sum(${hardwareItems.listPrice} * cast(${hardwareItems.quantity} as float))`,
        })
        .from(hardwareItems)
        .leftJoin(doorOpenings, eq(hardwareItems.openingId, doorOpenings.id))
        .leftJoin(projects, eq(doorOpenings.projectId, projects.id))
        .where(eq(projects.organizationId, orgContext.organizationId))
        .groupBy(hardwareItems.manufacturer, hardwareItems.model, hardwareItems.itemType)
        .orderBy(desc(sql`count(*)`))
        .limit(50);

      res.json(productStats);
    } catch (error) {
      logError(error as Error);
      res.status(500).json({ error: "Failed to fetch product analytics" });
    }
  });
}
