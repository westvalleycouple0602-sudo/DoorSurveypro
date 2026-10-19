import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, organizations, memberships, projects } from "@shared/schema";
import { eq, desc, count, sql, and, gte, lt } from "drizzle-orm";
import { logger } from "../logger";

const router = Router();

// ─── Auth middleware ───────────────────────────────────────────────────────────

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any).isSuperAdmin) return next();
  return res.status(401).json({ error: "Super-admin authentication required" });
}

// ─── Login / Session ──────────────────────────────────────────────────────────

router.post("/api/super-admin/login", (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    return res.status(503).json({ error: "Super-admin credentials not configured. Set ADMIN_USER and ADMIN_PASS." });
  }
  if (username !== adminUser || password !== adminPass) {
    logger.warn("Failed super-admin login attempt", { username });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  (req.session as any).isSuperAdmin = true;
  req.session.save((err) => {
    if (err) {
      logger.error("Super-admin session save error", { error: err.message });
      return res.status(500).json({ error: "Session save failed" });
    }
    logger.info("Super-admin login successful");
    return res.json({ ok: true });
  });
});

router.post("/api/super-admin/logout", (req: Request, res: Response) => {
  (req.session as any).isSuperAdmin = false;
  res.json({ ok: true });
});

router.get("/api/super-admin/me", (req: Request, res: Response) => {
  res.json({ authenticated: !!(req.session as any).isSuperAdmin });
});

// ─── Platform stats ───────────────────────────────────────────────────────────

router.get("/api/super-admin/stats", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalOrgsResult,
      totalUsersResult,
      totalProjectsResult,
      newOrgsThisMonthResult,
      newOrgsLastMonthResult,
      newUsersThisMonthResult,
      monthlyData,
      planBreakdown,
    ] = await Promise.all([
      db.select({ c: count() }).from(organizations),
      db.select({ c: count() }).from(users),
      db.select({ c: count() }).from(projects),
      db.select({ c: count() }).from(organizations).where(gte(organizations.createdAt, startOfMonth)),
      db.select({ c: count() }).from(organizations).where(
        and(gte(organizations.createdAt, startOfLastMonth), lt(organizations.createdAt, startOfMonth))
      ),
      db.select({ c: count() }).from(users).where(gte(users.createdAt, startOfMonth)),
      // Monthly org signups for last 12 months
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS label,
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon')      AS month,
          EXTRACT(YEAR  FROM created_at)::int                  AS year,
          EXTRACT(MONTH FROM created_at)::int                  AS month_num,
          COUNT(*)::int                                        AS count
        FROM organizations
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at), year, month_num
        ORDER BY year, month_num
      `),
      // Plan breakdown
      db.execute(sql`
        SELECT
          COALESCE(subscription_tier, 'free') AS plan,
          COUNT(*)::int                        AS count
        FROM organizations
        GROUP BY subscription_tier
        ORDER BY count DESC
      `),
    ]);

    const totalOrgs = Number(totalOrgsResult[0]?.c ?? 0);
    const newOrgsThisMonth = Number(newOrgsThisMonthResult[0]?.c ?? 0);
    const newOrgsLastMonth = Number(newOrgsLastMonthResult[0]?.c ?? 0);
    const orgGrowthPct =
      newOrgsLastMonth > 0
        ? parseFloat((((newOrgsThisMonth - newOrgsLastMonth) / newOrgsLastMonth) * 100).toFixed(1))
        : newOrgsThisMonth > 0 ? 100 : 0;

    res.json({
      totalOrgs,
      totalUsers: Number(totalUsersResult[0]?.c ?? 0),
      totalProjects: Number(totalProjectsResult[0]?.c ?? 0),
      newOrgsThisMonth,
      newUsersThisMonth: Number(newUsersThisMonthResult[0]?.c ?? 0),
      orgGrowthPct,
      monthlySignups: (monthlyData as any).rows ?? [],
      planBreakdown: (planBreakdown as any).rows ?? [],
    });
  } catch (err: any) {
    logger.error("Super-admin stats error", { error: err.message });
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// ─── Organizations CRUD ───────────────────────────────────────────────────────

router.get("/api/super-admin/organizations", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const searchClause = search
      ? sql`AND (o.name ILIKE ${"%" + search + "%"} OR o.slug ILIKE ${"%" + search + "%"})`
      : sql``;

    const rows = await db.execute(sql`
      SELECT
        o.id,
        o.name,
        o.slug,
        COALESCE(o.subscription_tier, 'free')       AS plan,
        COALESCE(o.subscription_status, 'active')   AS status,
        o.created_at,
        COUNT(DISTINCT m.user_id)::int               AS user_count,
        COUNT(DISTINCT p.id)::int                    AS project_count,
        MAX(m.created_at)                            AS last_active
      FROM organizations o
      LEFT JOIN memberships m ON m.organization_id = o.id
      LEFT JOIN projects   p ON p.organization_id = o.id
      WHERE 1=1 ${searchClause}
      GROUP BY o.id, o.name, o.slug, o.subscription_tier, o.subscription_status, o.created_at
      ORDER BY o.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `);

    const totalRows = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM organizations o WHERE 1=1 ${searchClause}
    `);

    res.json({
      organizations: (rows as any).rows ?? [],
      total: (totalRows as any).rows?.[0]?.total ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err: any) {
    logger.error("Super-admin orgs error", { error: err.message });
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

router.get("/api/super-admin/organizations/:id/users", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: memberships.role,
        lastLogin: sql<Date | null>`NULL`,
        createdAt: users.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.organizationId, orgId))
      .orderBy(desc(memberships.createdAt));
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch org users" });
  }
});

router.patch("/api/super-admin/organizations/:id/status", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const { status } = req.body as { status: string };
    const allowed = ["active", "suspended", "canceled", "trialing"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    await db
      .update(organizations)
      .set({ subscriptionStatus: status as any, updatedAt: new Date() } as any)
      .where(eq(organizations.id, orgId));
    logger.info("Super-admin org status updated", { orgId, status });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.patch("/api/super-admin/organizations/:id/plan", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const { plan } = req.body as { plan: string };
    const allowed = ["free", "starter", "professional", "enterprise"];
    if (!allowed.includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    await db
      .update(organizations)
      .set({ subscriptionTier: plan as any, updatedAt: new Date() } as any)
      .where(eq(organizations.id, orgId));
    logger.info("Super-admin org plan updated", { orgId, plan });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update plan" });
  }
});

export default router;
