import { Router } from "express";
import { db } from "../db";
import { projectAlternatives, insertProjectAlternativeSchema, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getOrganizationContext } from "../clerkAuth";

const router = Router();

// Helper function to verify project belongs to organization
async function verifyProjectOwnership(projectId: string, organizationId: string): Promise<boolean> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
    .limit(1);
  return !!project;
}

// Get all alternatives for a project
router.get("/api/projects/:projectId/alternatives", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const { projectId } = req.params;
    
    // Verify project belongs to organization
    const hasAccess = await verifyProjectOwnership(projectId, organizationId);
    if (!hasAccess) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rows = await db
      .select()
      .from(projectAlternatives)
      .where(eq(projectAlternatives.projectId, projectId));
    
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Create new project alternative
router.post("/api/projects/:projectId/alternatives", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId, userId } = context;
    const { projectId } = req.params;
    
    // Verify project belongs to organization
    const hasAccess = await verifyProjectOwnership(projectId, organizationId);
    if (!hasAccess) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const validated = insertProjectAlternativeSchema.parse({
      ...req.body,
      projectId,
      createdBy: userId,
    });
    
    const [created] = await db
      .insert(projectAlternatives)
      .values(validated)
      .returning();
    
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Update project alternative
router.patch("/api/projects/:projectId/alternatives/:id", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const { projectId, id } = req.params;
    
    // Verify project belongs to organization
    const hasAccess = await verifyProjectOwnership(projectId, organizationId);
    if (!hasAccess) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const validated = insertProjectAlternativeSchema.partial().parse(req.body);
    
    // Strip protected fields to prevent project/user reassignment
    const { projectId: _, createdBy: __, ...safeUpdate } = validated;
    
    const [updated] = await db
      .update(projectAlternatives)
      .set({
        ...safeUpdate,
        updatedAt: new Date(),
      })
      .where(and(eq(projectAlternatives.id, id), eq(projectAlternatives.projectId, projectId)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Project alternative not found" });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete project alternative
router.delete("/api/projects/:projectId/alternatives/:id", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const { projectId, id } = req.params;
    
    // Verify project belongs to organization
    const hasAccess = await verifyProjectOwnership(projectId, organizationId);
    if (!hasAccess) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const deleted = await db
      .delete(projectAlternatives)
      .where(and(eq(projectAlternatives.id, id), eq(projectAlternatives.projectId, projectId)))
      .returning();
    
    if (!deleted.length) {
      return res.status(404).json({ error: "Project alternative not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
