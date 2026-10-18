import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, organizations, auditLogs, projects, memberships, customers, customerLocations, insertCustomerSchema } from "@shared/schema";
import { eq, desc, count, sql, and, gte, ilike, or } from "drizzle-orm";
import { requireAuth as isAuthenticated } from "../clerkAuth";
import { requireAnyRole } from "../middleware/requireRole";
import { logger, logAuditEvent } from "../logger";
import Redis from "ioredis";
import { jobQueue } from "../utils/job-queue";
import { z } from "zod";

const router = Router();

router.use(isAuthenticated);
router.use(requireAnyRole(["owner", "admin"]));

router.get("/health", async (req: Request, res: Response) => {
  try {
    const health: {
      database: { status: string; latency?: number; error?: string };
      redis: { status: string; latency?: number; error?: string };
      jobQueue: { status: string; pending?: number; active?: number; completed?: number; failed?: number; error?: string };
      server: { uptime: number; memory: NodeJS.MemoryUsage; nodeVersion: string };
    } = {
      database: { status: "unknown" },
      redis: { status: "unknown" },
      jobQueue: { status: "unknown" },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    const dbStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      health.database = { status: "healthy", latency: Date.now() - dbStart };
    } catch (err: any) {
      health.database = { status: "unhealthy", error: err.message };
    }

    const redisStart = Date.now();
    try {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        const redis = new Redis(redisUrl, { connectTimeout: 5000, maxRetriesPerRequest: 1 });
        await redis.ping();
        health.redis = { status: "healthy", latency: Date.now() - redisStart };
        redis.disconnect();
      } else {
        health.redis = { status: "not_configured", error: "REDIS_URL not set" };
      }
    } catch (err: any) {
      health.redis = { status: "unhealthy", error: err.message };
    }

    try {
      const queueStats = await jobQueue.getStats();
      health.jobQueue = {
        status: "healthy",
        pending: queueStats.waiting,
        active: queueStats.active,
        completed: queueStats.completed,
        failed: queueStats.failed,
      };
    } catch (err: any) {
      health.jobQueue = { status: "unhealthy", error: err.message };
    }

    res.json(health);
  } catch {
    res.status(500).json({ error: "Failed to check system health" });
  }
});

router.get("/users", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        authProvider: users.authProvider,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const usersWithOrgs = await Promise.all(
      allUsers.map(async (user) => {
        const userMemberships = await db
          .select({
            organizationId: memberships.organizationId,
            role: memberships.role,
          })
          .from(memberships)
          .where(eq(memberships.userId, user.id));
        
        return {
          ...user,
          memberships: userMemberships,
        };
      })
    );

    const [{ total }] = await db.select({ total: count() }).from(users);

    res.json({
      users: usersWithOrgs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/organizations", async (req: Request, res: Response) => {
  try {
    const allOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        subscriptionTier: organizations.subscriptionTier,
        subscriptionStatus: organizations.subscriptionStatus,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    const orgsWithCounts = await Promise.all(
      allOrgs.map(async (org) => {
        const [{ userCount }] = await db
          .select({ userCount: count() })
          .from(memberships)
          .where(eq(memberships.organizationId, org.id));
        
        const [{ projectCount }] = await db
          .select({ projectCount: count() })
          .from(projects)
          .where(eq(projects.organizationId, org.id));

        return { ...org, userCount, projectCount };
      })
    );

    res.json({ organizations: orgsWithCounts });
  } catch {
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;

    const logs = await db
      .select({
        id: auditLogs.id,
        organizationId: auditLogs.organizationId,
        userId: auditLogs.userId,
        method: auditLogs.method,
        path: auditLogs.path,
        status: auditLogs.status,
        ip: auditLogs.ip,
        userAgent: auditLogs.userAgent,
        responseTimeMs: auditLogs.responseTimeMs,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: count() }).from(auditLogs);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get("/feature-flags", async (_req: Request, res: Response) => {
  try {
    const flags = {
      aiAssistant: !!process.env.OPENAI_API_KEY,
      stripePayments: false,
      emailNotifications: !!process.env.RESEND_API_KEY,
      hubspotIntegration: !!process.env.HUBSPOT_ACCESS_TOKEN,
      docusignIntegration: !!process.env.DOCUSIGN_INTEGRATION_KEY,
      lidarScanning: true,
      arMeasurements: true,
      complianceValidation: true,
      masterKeySystem: true,
      bulkImport: true,
      webhooks: true,
      betaTesting: true,
    };

    res.json({ flags });
  } catch {
    res.status(500).json({ error: "Failed to fetch feature flags" });
  }
});

router.get("/config", async (_req: Request, res: Response) => {
  try {
    const config = {
      environment: process.env.NODE_ENV || "development",
      databaseConfigured: !!process.env.DATABASE_URL,
      redisConfigured: !!process.env.REDIS_URL,
      stripeConfigured: false,
      resendConfigured: !!process.env.RESEND_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      hubspotConfigured: !!process.env.HUBSPOT_ACCESS_TOKEN,
      docusignConfigured: !!process.env.DOCUSIGN_INTEGRATION_KEY,
      sentryConfigured: !!process.env.SENTRY_DSN,
      natsConfigured: !!process.env.NATS_URL,
      googleCalendarConfigured: !!process.env.GOOGLE_CLIENT_ID,
      microsoftCalendarConfigured: !!process.env.MICROSOFT_CLIENT_ID,
      customDomains: process.env.CUSTOM_OIDC_DOMAINS?.split(",") || [],
      sessionSecret: process.env.SESSION_SECRET ? "configured" : "not_configured",
    };

    res.json({ config });
  } catch {
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

router.post("/cache/clear", async (_req: Request, res: Response) => {
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return res.status(400).json({ error: "Redis not configured" });
    }

    const redis = new Redis(redisUrl, { connectTimeout: 5000 });
    await redis.flushdb();
    redis.disconnect();

    res.json({ success: true, message: "Cache cleared successfully" });
  } catch {
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

router.post("/queue/retry-failed", async (_req: Request, res: Response) => {
  try {
    const stats = await jobQueue.getStats();
    res.json({ 
      success: true, 
      message: `Queue status: ${stats.failed || 0} failed jobs detected.`,
      stats
    });
  } catch {
    res.status(500).json({ error: "Failed to process queue retry" });
  }
});

router.post("/queue/clear-completed", async (_req: Request, res: Response) => {
  try {
    const stats = await jobQueue.getStats();
    res.json({ 
      success: true, 
      message: `Queue status: ${stats.completed || 0} completed jobs.`,
      stats
    });
  } catch {
    res.status(500).json({ error: "Failed to clear completed jobs" });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(users);
    const [{ totalOrganizations }] = await db.select({ totalOrganizations: count() }).from(organizations);
    const [{ totalProjects }] = await db.select({ totalProjects: count() }).from(projects);
    const [{ totalCustomers }] = await db.select({ totalCustomers: count() }).from(customers);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [{ recentUsers }] = await db
      .select({ recentUsers: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo));

    let activeJobs = 0;
    let failedJobs = 0;
    let completedJobs = 0;
    try {
      const queueStats = await jobQueue.getStats();
      activeJobs = queueStats.active || 0;
      failedJobs = queueStats.failed || 0;
      completedJobs = queueStats.completed || 0;
    } catch {
      // Queue stats unavailable
    }

    const totalJobs = activeJobs + failedJobs + completedJobs;
    const errorRate = totalJobs > 0 ? Math.round((failedJobs / totalJobs) * 100) : 0;

    res.json({
      totalUsers,
      totalOrganizations,
      totalProjects,
      totalCustomers,
      recentUsers,
      activeJobs,
      errorRate,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ============================================================================
// CUSTOMER MANAGEMENT (Admin CRUD)
// ============================================================================

router.get("/customers", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const searchCondition = search
      ? or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.contactName, `%${search}%`),
          ilike(customers.contactEmail, `%${search}%`)
        )
      : undefined;

    const query = db
      .select({
        id: customers.id,
        organizationId: customers.organizationId,
        name: customers.name,
        type: customers.type,
        contactName: customers.contactName,
        contactEmail: customers.contactEmail,
        contactPhone: customers.contactPhone,
        notes: customers.notes,
        createdAt: customers.createdAt,
      })
      .from(customers);

    const allCustomers = searchCondition
      ? await query.where(searchCondition).orderBy(desc(customers.createdAt)).limit(limit).offset(offset)
      : await query.orderBy(desc(customers.createdAt)).limit(limit).offset(offset);

    const customersWithDetails = await Promise.all(
      allCustomers.map(async (cust) => {
        const [{ locationCount }] = await db
          .select({ locationCount: count() })
          .from(customerLocations)
          .where(eq(customerLocations.customerId, cust.id));

        let orgName = null;
        if (cust.organizationId) {
          const [org] = await db
            .select({ name: organizations.name })
            .from(organizations)
            .where(eq(organizations.id, cust.organizationId))
            .limit(1);
          orgName = org?.name || null;
        }

        return { ...cust, locationCount, organizationName: orgName };
      })
    );

    const totalResult = searchCondition
      ? await db.select({ total: count() }).from(customers).where(searchCondition)
      : await db.select({ total: count() }).from(customers);
    const total = totalResult[0].total;

    res.json({
      customers: customersWithDetails,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

const adminCreateCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  organizationId: z.string().optional(),
  type: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/customers", async (req: Request, res: Response) => {
  try {
    const parsed = adminCreateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid customer data", details: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;
    const adminUser = req.dbUser as any;

    if (data.organizationId) {
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, data.organizationId))
        .limit(1);
      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }
    }

    const [newCustomer] = await db
      .insert(customers)
      .values({
        name: data.name,
        organizationId: data.organizationId || null,
        type: data.type || null,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        notes: data.notes || null,
      })
      .returning();

    logger.info("Admin created customer", {
      adminUserId: adminUser?.id,
      customerId: newCustomer.id,
      customerName: data.name,
    });

    res.status(201).json(newCustomer);
  } catch {
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.delete("/customers/:customerId", async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const adminUser = req.dbUser as any;

    const [existing] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Customer not found" });
    }

    await db.delete(customers).where(eq(customers.id, customerId));

    logger.info("Admin deleted customer", {
      adminUserId: adminUser?.id,
      customerId,
      customerName: existing.name,
    });

    res.json({ success: true, message: "Customer deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// ============================================================================
// USER MANAGEMENT (Admin CRUD)
// ============================================================================

const VALID_ROLES = ["owner", "admin", "pm_manager", "manager", "project_manager", "engineer", "sales_rep", "procurement_officer", "technician", "viewer"];

const adminUpdateUserSchema = z.object({
  role: z.enum(VALID_ROLES as [string, ...string[]]).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

router.patch("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminUser = req.dbUser as any;

    const parsed = adminUpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid update data" });
    }

    const [existing] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userId === adminUser?.id && parsed.data.role) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    const updateData: Record<string, any> = {};
    if (parsed.data.role) updateData.role = parsed.data.role;
    if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    logger.info("Admin updated user", {
      adminUserId: adminUser?.id,
      targetUserId: userId,
      changes: Object.keys(updateData),
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminUser = req.dbUser as any;

    if (userId === adminUser?.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const [existing] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.delete(memberships).where(eq(memberships.userId, userId));
    await db.delete(users).where(eq(users.id, userId));

    logger.info("Admin deleted user", {
      adminUserId: adminUser?.id,
      deletedUserId: userId,
      deletedEmail: existing.email,
    });

    res.json({ success: true, message: "User deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.delete("/organizations/:orgId", async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const adminUser = req.dbUser as any;

    const [existing] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Organization not found" });
    }

    await db.delete(organizations).where(eq(organizations.id, orgId));

    logger.info("Admin deleted organization", {
      adminUserId: adminUser?.id,
      organizationId: orgId,
      organizationName: existing.name,
    });

    res.json({ success: true, message: "Organization deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete organization" });
  }
});

export default router;
