import { Router, Request, Response } from "express";
import { db } from "../storage";
import { sql } from "drizzle-orm";
import { organizations, users } from "@shared/schemas/auth.schema";
import { projects, doorOpenings } from "@shared/schema";
import { requireRole } from "../middleware/requireRole";

const router = Router();

const requireAdmin = requireRole("admin");

const PLAN_PRICING: Record<string, number> = {
  free: 0,
  starter: 29,
  professional: 99,
  pro: 99,
  enterprise: 299,
  custom: 499,
};

router.get("/api/revenue-assessment", requireAdmin, async (req: Request, res: Response) => {
  try {
    const orgResult = await db.execute(
      sql`SELECT subscription_tier, subscription_status, created_at, stripe_customer_id, trial_ends_at, current_period_end, project_limit, user_limit FROM ${organizations}`
    );

    const userResult = await db.execute(
      sql`SELECT created_at FROM ${users}`
    );

    const projectResult = await db.execute(
      sql`SELECT created_at, status FROM ${projects}`
    );

    const orgs = Array.isArray(orgResult) ? orgResult : (orgResult as any)?.rows || [];
    const usersData = Array.isArray(userResult) ? userResult : (userResult as any)?.rows || [];
    const projectsData = Array.isArray(projectResult) ? projectResult : (projectResult as any)?.rows || [];

    let openingCount = 0;
    try {
      const countResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM ${doorOpenings}`);
      const countRows = Array.isArray(countResult) ? countResult : (countResult as any)?.rows || [];
      openingCount = countRows[0]?.count || 0;
    } catch {
      openingCount = 0;
    }

    const tierBreakdown: Record<string, number> = {};
    let paidOrgs = 0;
    let trialOrgs = 0;
    let stripeConnected = 0;

    for (const org of orgs as any[]) {
      const tier = (org.subscription_tier || "free").toLowerCase();
      tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;
      if (tier !== "free") paidOrgs++;
      if (org.trial_ends_at) trialOrgs++;
      if (org.stripe_customer_id) stripeConnected++;
    }

    let mrr = 0;
    for (const [tier, count] of Object.entries(tierBreakdown)) {
      mrr += (PLAN_PRICING[tier] || 0) * count;
    }
    const arr = mrr * 12;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentOrgs = (orgs as any[]).filter(
      (o) => o.created_at && new Date(o.created_at) >= thirtyDaysAgo
    ).length;
    const previousOrgs = (orgs as any[]).filter(
      (o) => o.created_at && new Date(o.created_at) >= sixtyDaysAgo && new Date(o.created_at) < thirtyDaysAgo
    ).length;

    const recentUsers = (usersData as any[]).filter(
      (u) => u.created_at && new Date(u.created_at) >= thirtyDaysAgo
    ).length;
    const previousUsers = (usersData as any[]).filter(
      (u) => u.created_at && new Date(u.created_at) >= sixtyDaysAgo && new Date(u.created_at) < thirtyDaysAgo
    ).length;

    const recentProjects = (projectsData as any[]).filter(
      (p) => p.created_at && new Date(p.created_at) >= thirtyDaysAgo
    ).length;
    const previousProjects = (projectsData as any[]).filter(
      (p) => p.created_at && new Date(p.created_at) >= sixtyDaysAgo && new Date(p.created_at) < thirtyDaysAgo
    ).length;

    const orgGrowthRate = previousOrgs > 0 ? ((recentOrgs - previousOrgs) / previousOrgs) * 100 : recentOrgs > 0 ? 100 : 0;
    const userGrowthRate = previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers) * 100 : recentUsers > 0 ? 100 : 0;
    const projectGrowthRate = previousProjects > 0 ? ((recentProjects - previousProjects) / previousProjects) * 100 : recentProjects > 0 ? 100 : 0;

    const conversionRate = orgs.length > 0 ? (paidOrgs / orgs.length) * 100 : 0;

    const avgRevenuePerOrg = orgs.length > 0 ? mrr / orgs.length : 0;
    const avgRevenuePerPaidOrg = paidOrgs > 0 ? mrr / paidOrgs : 0;

    const usersPerOrg = orgs.length > 0 ? usersData.length / orgs.length : 0;
    const projectsPerOrg = orgs.length > 0 ? projectsData.length / orgs.length : 0;

    let revenueMultiple = 5;
    if (orgGrowthRate > 50) revenueMultiple = 12;
    else if (orgGrowthRate > 20) revenueMultiple = 8;
    else if (orgGrowthRate > 10) revenueMultiple = 6;

    const estimatedValuation = arr * revenueMultiple;

    const saasScore = calculateSaaSScore({
      mrr,
      orgCount: orgs.length,
      paidOrgs,
      conversionRate,
      orgGrowthRate,
      userGrowthRate,
      usersPerOrg,
      projectsPerOrg,
    });

    const monthlyTrend: { month: string; orgs: number; users: number; projects: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = monthStart.toLocaleString("en-US", { month: "short", year: "2-digit" });

      const mOrgs = (orgs as any[]).filter(
        (o) => o.created_at && new Date(o.created_at) <= monthEnd
      ).length;
      const mUsers = (usersData as any[]).filter(
        (u) => u.created_at && new Date(u.created_at) <= monthEnd
      ).length;
      const mProjects = (projectsData as any[]).filter(
        (p) => p.created_at && new Date(p.created_at) <= monthEnd
      ).length;

      let mRevenue = 0;
      for (const org of orgs as any[]) {
        if (org.created_at && new Date(org.created_at) <= monthEnd) {
          const tier = (org.subscription_tier || "free").toLowerCase();
          mRevenue += PLAN_PRICING[tier] || 0;
        }
      }

      monthlyTrend.push({
        month: label,
        orgs: mOrgs,
        users: mUsers,
        projects: mProjects,
        revenue: mRevenue,
      });
    }

    res.json({
      overview: {
        totalOrganizations: orgs.length,
        totalUsers: usersData.length,
        totalProjects: projectsData.length,
        totalOpenings: openingCount,
        paidOrganizations: paidOrgs,
        trialOrganizations: trialOrgs,
        stripeConnectedOrgs: stripeConnected,
      },
      revenue: {
        mrr,
        arr,
        avgRevenuePerOrg: Math.round(avgRevenuePerOrg * 100) / 100,
        avgRevenuePerPaidOrg: Math.round(avgRevenuePerPaidOrg * 100) / 100,
        conversionRate: Math.round(conversionRate * 10) / 10,
        tierBreakdown,
        planPricing: PLAN_PRICING,
      },
      growth: {
        orgGrowthRate: Math.round(orgGrowthRate * 10) / 10,
        userGrowthRate: Math.round(userGrowthRate * 10) / 10,
        projectGrowthRate: Math.round(projectGrowthRate * 10) / 10,
        newOrgsLast30Days: recentOrgs,
        newUsersLast30Days: recentUsers,
        newProjectsLast30Days: recentProjects,
      },
      engagement: {
        usersPerOrg: Math.round(usersPerOrg * 10) / 10,
        projectsPerOrg: Math.round(projectsPerOrg * 10) / 10,
        openingsPerProject: projectsData.length > 0 ? Math.round((openingCount / projectsData.length) * 10) / 10 : 0,
      },
      valuation: {
        estimatedValuation,
        revenueMultiple,
        saasScore,
        methodology: "ARR-based with growth-adjusted revenue multiple",
      },
      monthlyTrend,
    });
  } catch {
    res.status(500).json({ error: "Failed to generate revenue assessment" });
  }
});

function calculateSaaSScore(metrics: {
  mrr: number;
  orgCount: number;
  paidOrgs: number;
  conversionRate: number;
  orgGrowthRate: number;
  userGrowthRate: number;
  usersPerOrg: number;
  projectsPerOrg: number;
}): number {
  let score = 0;

  if (metrics.mrr > 10000) score += 20;
  else if (metrics.mrr > 5000) score += 15;
  else if (metrics.mrr > 1000) score += 10;
  else if (metrics.mrr > 0) score += 5;

  if (metrics.orgCount > 100) score += 15;
  else if (metrics.orgCount > 50) score += 12;
  else if (metrics.orgCount > 10) score += 8;
  else if (metrics.orgCount > 0) score += 3;

  if (metrics.conversionRate > 30) score += 20;
  else if (metrics.conversionRate > 15) score += 15;
  else if (metrics.conversionRate > 5) score += 10;
  else if (metrics.conversionRate > 0) score += 3;

  if (metrics.orgGrowthRate > 50) score += 20;
  else if (metrics.orgGrowthRate > 20) score += 15;
  else if (metrics.orgGrowthRate > 10) score += 10;
  else if (metrics.orgGrowthRate > 0) score += 5;

  if (metrics.usersPerOrg > 10) score += 10;
  else if (metrics.usersPerOrg > 5) score += 8;
  else if (metrics.usersPerOrg > 2) score += 5;
  else if (metrics.usersPerOrg > 0) score += 2;

  if (metrics.projectsPerOrg > 20) score += 15;
  else if (metrics.projectsPerOrg > 10) score += 12;
  else if (metrics.projectsPerOrg > 5) score += 8;
  else if (metrics.projectsPerOrg > 0) score += 3;

  return Math.min(score, 100);
}

export default router;
