import { Router, Request, Response } from "express";
import { db } from "../db";
import { emailTemplates, emailTemplateUsageLogs, insertEmailTemplateSchema, EMAIL_TEMPLATE_CATEGORIES, ROLE_TEMPLATE_CATEGORIES, memberships } from "@shared/schema";
import { eq, and, or, desc, sql, ilike, count } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// Type for user from request
interface AuthUser {
  id: string;
  organizationId: string | null;
  role?: string;
}

// Get user roles from membership
async function getUserRoles(userId: string, organizationId: string): Promise<string[]> {
  const [membership] = await db.select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId)
      )
    );
  
  if (!membership) return [];
  
  const roles = [membership.role];
  if (membership.roles && Array.isArray(membership.roles)) {
    roles.push(...membership.roles);
  }
  return roles;
}

// Get all templates for the organization (filtered by user's role)
router.get("/", requireRole("viewer"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const userRoles = await getUserRoles(user.id, organizationId);
    const isAdmin = userRoles.includes("owner") || userRoles.includes("admin");
    
    // Query parameters
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const activeOnly = req.query.activeOnly === "true";

    // Build conditions
    const conditions = [
      or(
        eq(emailTemplates.organizationId, organizationId),
        sql`${emailTemplates.organizationId} IS NULL` // System templates
      )
    ];

    if (category && EMAIL_TEMPLATE_CATEGORIES.includes(category as any)) {
      conditions.push(eq(emailTemplates.category, category));
    }

    if (activeOnly) {
      conditions.push(eq(emailTemplates.isActive, true));
    }

    if (search) {
      conditions.push(
        or(
          ilike(emailTemplates.name, `%${search}%`),
          ilike(emailTemplates.subject, `%${search}%`),
          ilike(emailTemplates.description, `%${search}%`)
        )!
      );
    }

    const templates = await db.select()
      .from(emailTemplates)
      .where(and(...conditions))
      .orderBy(desc(emailTemplates.usageCount), emailTemplates.name);

    // Filter templates based on user's role (unless admin)
    let filteredTemplates = templates;
    if (!isAdmin) {
      const allowedCategories = new Set<string>();
      for (const role of userRoles) {
        const cats = ROLE_TEMPLATE_CATEGORIES[role] || [];
        cats.forEach((c: string) => allowedCategories.add(c));
      }
      
      filteredTemplates = templates.filter(template => {
        // Check if template category is in allowed categories
        if (allowedCategories.has(template.category)) return true;
        // Check if template explicitly allows user's role
        const templateRoles = template.allowedRoles || [];
        return userRoles.some(role => templateRoles.includes(role));
      });
    }

    res.json(filteredTemplates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    res.status(500).json({ error: "Failed to fetch email templates" });
  }
});

// Get template categories with counts (role-filtered)
router.get("/categories", requireRole("viewer"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const userRoles = await getUserRoles(user.id, organizationId);
    const isAdmin = userRoles.includes("owner") || userRoles.includes("admin");
    
    // Get all templates (to count with role filtering)
    const templates = await db.select()
      .from(emailTemplates)
      .where(
        or(
          eq(emailTemplates.organizationId, organizationId),
          sql`${emailTemplates.organizationId} IS NULL`
        )
      );

    // Build allowed categories set for non-admin users
    const allowedCategories = new Set<string>();
    if (!isAdmin) {
      for (const role of userRoles) {
        const cats = ROLE_TEMPLATE_CATEGORIES[role] || [];
        cats.forEach((c: string) => allowedCategories.add(c));
      }
    }

    // Count templates per category with role filtering
    const categoryCounts: Record<string, number> = {};
    for (const template of templates) {
      // For admins, count all; for others, count only allowed
      if (isAdmin) {
        categoryCounts[template.category] = (categoryCounts[template.category] || 0) + 1;
      } else {
        // Check if user can access this template
        const canAccess = allowedCategories.has(template.category) || 
          (template.allowedRoles || []).some(r => userRoles.includes(r));
        if (canAccess) {
          categoryCounts[template.category] = (categoryCounts[template.category] || 0) + 1;
        }
      }
    }

    // Build category list - only include categories with counts > 0 for non-admins
    const result = EMAIL_TEMPLATE_CATEGORIES
      .map(cat => ({
        category: cat,
        label: formatCategoryLabel(cat),
        count: categoryCounts[cat] || 0
      }))
      .filter(cat => isAdmin || cat.count > 0);

    res.json(result);
  } catch (error) {
    console.error("Error fetching template categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get a single template by ID
router.get("/:id", requireRole("viewer"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const { id } = req.params;

    const [template] = await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          or(
            eq(emailTemplates.organizationId, organizationId),
            sql`${emailTemplates.organizationId} IS NULL`
          )
        )
      );

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(template);
  } catch (error) {
    console.error("Error fetching email template:", error);
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// Create a new template
router.post("/", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const userId = user.id;

    const validated = insertEmailTemplateSchema.parse({
      ...req.body,
      organizationId,
      createdBy: userId,
      updatedBy: userId
    });

    const [template] = await db.insert(emailTemplates)
      .values(validated)
      .returning();

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating email template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// Update a template
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const userId = user.id;
    const { id } = req.params;

    // Check template exists and belongs to org
    const [existing] = await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.organizationId, organizationId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: "Template not found" });
    }

    // System templates can't be modified by org
    if (existing.isSystem) {
      return res.status(403).json({ error: "System templates cannot be modified" });
    }

    const updateData = {
      ...req.body,
      updatedBy: userId,
      updatedAt: new Date(),
      version: existing.version + 1
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.isSystem;

    const [template] = await db.update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, id))
      .returning();

    res.json(template);
  } catch (error) {
    console.error("Error updating email template:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
});

// Delete a template
router.delete("/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const { id } = req.params;

    // Check template exists and belongs to org
    const [existing] = await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.organizationId, organizationId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: "Template not found" });
    }

    // System templates can't be deleted
    if (existing.isSystem) {
      return res.status(403).json({ error: "System templates cannot be deleted" });
    }

    await db.delete(emailTemplates)
      .where(eq(emailTemplates.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting email template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

// Duplicate a template (create a copy)
router.post("/:id/duplicate", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const userId = user.id;
    const { id } = req.params;

    // Get the original template
    const [original] = await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          or(
            eq(emailTemplates.organizationId, organizationId),
            sql`${emailTemplates.organizationId} IS NULL`
          )
        )
      );

    if (!original) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Create a copy
    const newSlug = `${original.slug}-copy-${Date.now()}`;
    const [template] = await db.insert(emailTemplates)
      .values({
        organizationId,
        name: `${original.name} (Copy)`,
        slug: newSlug,
        description: original.description,
        category: original.category,
        subcategory: original.subcategory,
        subject: original.subject,
        htmlContent: original.htmlContent,
        markdownContent: original.markdownContent,
        plainTextContent: original.plainTextContent,
        variables: original.variables,
        allowedRoles: original.allowedRoles,
        triggerType: original.triggerType,
        triggerDetails: original.triggerDetails,
        lifecycleStage: original.lifecycleStage,
        isActive: true,
        isSystem: false,
        version: 1,
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    res.status(201).json(template);
  } catch (error) {
    console.error("Error duplicating email template:", error);
    res.status(500).json({ error: "Failed to duplicate template" });
  }
});

// Record template usage
router.post("/:id/use", requireRole("viewer"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const userId = user.id;
    const { id } = req.params;
    const { recipientEmail, recipientName, relatedEntityType, relatedEntityId, variablesUsed } = req.body;

    // Get the template
    const [template] = await db.select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Log usage
    const [usageLog] = await db.insert(emailTemplateUsageLogs)
      .values({
        organizationId,
        templateId: id,
        sentBy: userId,
        recipientEmail,
        recipientName,
        relatedEntityType,
        relatedEntityId,
        subjectSnapshot: template.subject,
        variablesUsed,
        status: "sent"
      })
      .returning();

    // Update template usage count
    await db.update(emailTemplates)
      .set({
        usageCount: sql`${emailTemplates.usageCount} + 1`,
        lastUsedAt: new Date()
      })
      .where(eq(emailTemplates.id, id));

    res.json(usageLog);
  } catch (error) {
    console.error("Error recording template usage:", error);
    res.status(500).json({ error: "Failed to record usage" });
  }
});

// Get template usage stats
router.get("/:id/stats", requireRole("viewer"), async (req: Request, res: Response) => {
  try {
    const user = req.dbUser as AuthUser;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const organizationId = user.organizationId;
    const { id } = req.params;

    const [template] = await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          or(
            eq(emailTemplates.organizationId, organizationId),
            sql`${emailTemplates.organizationId} IS NULL`
          )
        )
      );

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Get usage stats
    const [stats] = await db.select({
      totalSent: count(),
      delivered: sql<number>`COUNT(CASE WHEN status = 'delivered' OR status = 'opened' OR status = 'clicked' THEN 1 END)`,
      opened: sql<number>`COUNT(CASE WHEN status = 'opened' OR status = 'clicked' THEN 1 END)`,
      clicked: sql<number>`COUNT(CASE WHEN status = 'clicked' THEN 1 END)`,
      bounced: sql<number>`COUNT(CASE WHEN status = 'bounced' THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN status = 'failed' THEN 1 END)`
    })
    .from(emailTemplateUsageLogs)
    .where(
      and(
        eq(emailTemplateUsageLogs.templateId, id),
        eq(emailTemplateUsageLogs.organizationId, organizationId)
      )
    );

    res.json({
      template: {
        id: template.id,
        name: template.name,
        usageCount: template.usageCount,
        lastUsedAt: template.lastUsedAt
      },
      stats
    });
  } catch (error) {
    console.error("Error fetching template stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Helper function to format category labels
function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    new_customer: "New Customer",
    sales_followup: "Sales Follow-up",
    scheduling: "Scheduling",
    proposal: "Proposals",
    prospecting: "Prospecting",
    reminder: "Reminders",
    customer_service: "Customer Service",
    procurement: "Procurement",
    closeout: "Closeout",
    surveyor: "Surveyor",
    estimator: "Estimator",
    engineer: "Engineer",
    project_management: "Project Management",
    admin: "Admin",
    onboarding: "Onboarding",
    system: "System"
  };
  return labels[category] || category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export default router;
