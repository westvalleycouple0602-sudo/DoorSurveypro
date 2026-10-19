import { Router } from "express";
import type { Express } from "express";
import type { RouteDependencies } from "./deps";
import { requireRole, requireAnyRole } from "../middleware/requireRole";
import { db } from "../db";
import {
  corporateJobTitles,
  insertCorporateJobTitleSchema,
  userJobTitleAssignments,
  insertUserJobTitleAssignmentSchema,
  memberships,
  users,
  DEPARTMENT_CATEGORIES,
  INDUSTRY_SPECIALIZATIONS,
  ROLE_HIERARCHY,
  type MembershipRole,
} from "@shared/schema";
import { eq, and, or, isNull, desc, asc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

export function registerJobTitlesRoutes(app: Express, deps: RouteDependencies) {
  const { logError, logAuditEvent, logger } = deps;

  router.get("/", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const { departmentCategory, industrySpecialization, isActive } = req.query;

      let query = db
        .select()
        .from(corporateJobTitles)
        .where(
          or(
            isNull(corporateJobTitles.organizationId),
            eq(corporateJobTitles.organizationId, user.organizationId)
          )
        )
        .orderBy(desc(corporateJobTitles.hierarchyLevel), asc(corporateJobTitles.displayOrder));

      const allTitles = await query;

      let filteredTitles = allTitles;

      if (departmentCategory && typeof departmentCategory === "string") {
        filteredTitles = filteredTitles.filter(
          (t) => t.departmentCategory === departmentCategory
        );
      }

      if (industrySpecialization && typeof industrySpecialization === "string") {
        filteredTitles = filteredTitles.filter(
          (t) => t.industrySpecialization === industrySpecialization
        );
      }

      if (isActive !== undefined) {
        const activeFilter = isActive === "true";
        filteredTitles = filteredTitles.filter((t) => t.isActive === activeFilter);
      }

      res.json(filteredTitles);
    } catch (error: any) {
      logError(error, { context: "get-job-titles", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch job titles" });
    }
  });

  router.get("/assignments", requireRole("manager"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const assignments = await db
        .select({
          id: userJobTitleAssignments.id,
          userId: userJobTitleAssignments.userId,
          jobTitleId: userJobTitleAssignments.jobTitleId,
          effectiveDate: userJobTitleAssignments.effectiveDate,
          endDate: userJobTitleAssignments.endDate,
          customTitle: userJobTitleAssignments.customTitle,
          customPermissions: userJobTitleAssignments.customPermissions,
          reportsToUserId: userJobTitleAssignments.reportsToUserId,
          isActive: userJobTitleAssignments.isActive,
          isPrimary: userJobTitleAssignments.isPrimary,
          assignedBy: userJobTitleAssignments.assignedBy,
          assignmentReason: userJobTitleAssignments.assignmentReason,
          createdAt: userJobTitleAssignments.createdAt,
          updatedAt: userJobTitleAssignments.updatedAt,
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          jobTitle: corporateJobTitles.title,
          jobTitleDepartment: corporateJobTitles.departmentCategory,
          jobTitleHierarchy: corporateJobTitles.hierarchyLevel,
          jobTitleRoles: corporateJobTitles.assignedRoles,
          jobTitlePrimaryRole: corporateJobTitles.primaryRole,
        })
        .from(userJobTitleAssignments)
        .innerJoin(users, eq(userJobTitleAssignments.userId, users.id))
        .innerJoin(corporateJobTitles, eq(userJobTitleAssignments.jobTitleId, corporateJobTitles.id))
        .where(eq(userJobTitleAssignments.organizationId, user.organizationId))
        .orderBy(desc(userJobTitleAssignments.createdAt));

      const formattedAssignments = assignments.map((a) => ({
        id: a.id,
        userId: a.userId,
        jobTitleId: a.jobTitleId,
        effectiveDate: a.effectiveDate,
        endDate: a.endDate,
        customTitle: a.customTitle,
        customPermissions: a.customPermissions,
        reportsToUserId: a.reportsToUserId,
        isActive: a.isActive,
        isPrimary: a.isPrimary,
        assignedBy: a.assignedBy,
        assignmentReason: a.assignmentReason,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        user: {
          id: a.userId,
          email: a.userEmail,
          firstName: a.userFirstName,
          lastName: a.userLastName,
        },
        jobTitle: {
          id: a.jobTitleId,
          title: a.jobTitle,
          departmentCategory: a.jobTitleDepartment,
          hierarchyLevel: a.jobTitleHierarchy,
          assignedRoles: a.jobTitleRoles,
          primaryRole: a.jobTitlePrimaryRole,
        },
      }));

      res.json(formattedAssignments);
    } catch (error: any) {
      logError(error, { context: "get-job-title-assignments", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch job title assignments" });
    }
  });

  router.get("/:id", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [jobTitle] = await db
        .select()
        .from(corporateJobTitles)
        .where(
          and(
            eq(corporateJobTitles.id, req.params.id),
            or(
              isNull(corporateJobTitles.organizationId),
              eq(corporateJobTitles.organizationId, user.organizationId)
            )
          )
        );

      if (!jobTitle) {
        return res.status(404).json({ error: "Job title not found" });
      }

      res.json(jobTitle);
    } catch (error: any) {
      logError(error, { context: "get-job-title", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch job title" });
    }
  });

  router.post("/", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validation = insertCorporateJobTitleSchema.safeParse({
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id,
        isSystemTemplate: false,
      });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [jobTitle] = await db
        .insert(corporateJobTitles)
        .values(validation.data)
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "job-title.created",
        "corporate-job-title",
        jobTitle.id,
        { title: jobTitle.title, departmentCategory: jobTitle.departmentCategory }
      );

      logger.info("Job title created", {
        userId: user.id,
        organizationId: user.organizationId,
        jobTitleId: jobTitle.id,
      });

      res.status(201).json(jobTitle);
    } catch (error: any) {
      logError(error, { context: "create-job-title", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to create job title" });
    }
  });

  router.patch("/:id", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [existingTitle] = await db
        .select()
        .from(corporateJobTitles)
        .where(eq(corporateJobTitles.id, req.params.id));

      if (!existingTitle) {
        return res.status(404).json({ error: "Job title not found" });
      }

      if (existingTitle.isSystemTemplate) {
        return res.status(403).json({ error: "Cannot modify system templates. Copy it first to create an org-specific version." });
      }

      if (existingTitle.organizationId !== user.organizationId) {
        return res.status(403).json({ error: "You can only modify job titles belonging to your organization" });
      }

      const updateSchema = insertCorporateJobTitleSchema.partial().omit({
        organizationId: true,
        createdBy: true,
        isSystemTemplate: true,
      });

      const validation = updateSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [updatedTitle] = await db
        .update(corporateJobTitles)
        .set({ ...validation.data, updatedAt: new Date() })
        .where(eq(corporateJobTitles.id, req.params.id))
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "job-title.updated",
        "corporate-job-title",
        updatedTitle.id,
        { title: updatedTitle.title, changes: Object.keys(validation.data) }
      );

      res.json(updatedTitle);
    } catch (error: any) {
      logError(error, { context: "update-job-title", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to update job title" });
    }
  });

  router.delete("/:id", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [existingTitle] = await db
        .select()
        .from(corporateJobTitles)
        .where(eq(corporateJobTitles.id, req.params.id));

      if (!existingTitle) {
        return res.status(404).json({ error: "Job title not found" });
      }

      if (existingTitle.isSystemTemplate) {
        return res.status(403).json({ error: "Cannot delete system templates" });
      }

      if (existingTitle.organizationId !== user.organizationId) {
        return res.status(403).json({ error: "You can only delete job titles belonging to your organization" });
      }

      const assignmentCount = await db
        .select({ id: userJobTitleAssignments.id })
        .from(userJobTitleAssignments)
        .where(eq(userJobTitleAssignments.jobTitleId, req.params.id));

      if (assignmentCount.length > 0) {
        return res.status(400).json({
          error: "Cannot delete job title with active assignments. Remove all assignments first.",
          assignmentCount: assignmentCount.length,
        });
      }

      await db.delete(corporateJobTitles).where(eq(corporateJobTitles.id, req.params.id));

      logAuditEvent(
        user.id,
        user.organizationId,
        "job-title.deleted",
        "corporate-job-title",
        req.params.id,
        { title: existingTitle.title }
      );

      res.json({ success: true });
    } catch (error: any) {
      logError(error, { context: "delete-job-title", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to delete job title" });
    }
  });

  router.post("/:id/copy", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [sourceTitle] = await db
        .select()
        .from(corporateJobTitles)
        .where(eq(corporateJobTitles.id, req.params.id));

      if (!sourceTitle) {
        return res.status(404).json({ error: "Job title not found" });
      }

      if (!sourceTitle.isSystemTemplate) {
        return res.status(400).json({ error: "Only system templates can be copied" });
      }

      const customTitle = req.body.title || sourceTitle.title;
      const customDescription = req.body.description || sourceTitle.description;

      const [copiedTitle] = await db
        .insert(corporateJobTitles)
        .values({
          organizationId: user.organizationId,
          title: customTitle,
          description: customDescription,
          departmentCategory: sourceTitle.departmentCategory,
          industrySpecialization: sourceTitle.industrySpecialization,
          assignedRoles: sourceTitle.assignedRoles,
          primaryRole: sourceTitle.primaryRole,
          additionalPermissions: sourceTitle.additionalPermissions,
          restrictedPermissions: sourceTitle.restrictedPermissions,
          hierarchyLevel: sourceTitle.hierarchyLevel,
          displayOrder: sourceTitle.displayOrder,
          isActive: true,
          isSystemTemplate: false,
          createdBy: user.id,
        })
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "job-title.copied",
        "corporate-job-title",
        copiedTitle.id,
        { sourceId: sourceTitle.id, sourceTitle: sourceTitle.title, newTitle: copiedTitle.title }
      );

      res.status(201).json(copiedTitle);
    } catch (error: any) {
      logError(error, { context: "copy-job-title", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to copy job title" });
    }
  });

  router.post("/assignments", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validation = insertUserJobTitleAssignmentSchema.safeParse({
        ...req.body,
        organizationId: user.organizationId,
        assignedBy: user.id,
      });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [targetUser] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, validation.data.userId),
            eq(memberships.organizationId, user.organizationId)
          )
        );

      if (!targetUser) {
        return res.status(404).json({ error: "User not found in organization" });
      }

      const [jobTitle] = await db
        .select()
        .from(corporateJobTitles)
        .where(
          and(
            eq(corporateJobTitles.id, validation.data.jobTitleId),
            or(
              isNull(corporateJobTitles.organizationId),
              eq(corporateJobTitles.organizationId, user.organizationId)
            )
          )
        );

      if (!jobTitle) {
        return res.status(404).json({ error: "Job title not found" });
      }

      if (validation.data.isPrimary) {
        await db
          .update(userJobTitleAssignments)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(userJobTitleAssignments.userId, validation.data.userId),
              eq(userJobTitleAssignments.organizationId, user.organizationId),
              eq(userJobTitleAssignments.isPrimary, true)
            )
          );
      }

      const [assignment] = await db
        .insert(userJobTitleAssignments)
        .values(validation.data)
        .returning();

      if (validation.data.isPrimary !== false) {
        const allRoles = [jobTitle.primaryRole, ...(jobTitle.assignedRoles || [])].filter(Boolean);
        const sortedRoles = [...allRoles].sort(
          (a, b) => (ROLE_HIERARCHY[b as MembershipRole] || 0) - (ROLE_HIERARCHY[a as MembershipRole] || 0)
        );
        const primaryRole = sortedRoles[0];
        const additionalRoles = sortedRoles.slice(1);

        await db
          .update(memberships)
          .set({
            role: primaryRole,
            roles: additionalRoles,
          })
          .where(
            and(
              eq(memberships.userId, validation.data.userId),
              eq(memberships.organizationId, user.organizationId)
            )
          );
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "job-title.assigned",
        "user-job-title-assignment",
        assignment.id,
        {
          userId: validation.data.userId,
          jobTitleId: validation.data.jobTitleId,
          jobTitle: jobTitle.title,
          isPrimary: validation.data.isPrimary,
        }
      );

      res.status(201).json(assignment);
    } catch (error: any) {
      logError(error, { context: "assign-job-title", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to assign job title" });
    }
  });

  router.patch("/assignments/:id", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [existingAssignment] = await db
        .select()
        .from(userJobTitleAssignments)
        .where(
          and(
            eq(userJobTitleAssignments.id, req.params.id),
            eq(userJobTitleAssignments.organizationId, user.organizationId)
          )
        );

      if (!existingAssignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const updateSchema = insertUserJobTitleAssignmentSchema.partial().omit({
        organizationId: true,
        assignedBy: true,
        userId: true,
      });

      const validation = updateSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      if (validation.data.isPrimary === true) {
        await db
          .update(userJobTitleAssignments)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(userJobTitleAssignments.userId, existingAssignment.userId),
              eq(userJobTitleAssignments.organizationId, user.organizationId),
              eq(userJobTitleAssignments.isPrimary, true)
            )
          );
      }

      const [updatedAssignment] = await db
        .update(userJobTitleAssignments)
        .set({ ...validation.data, updatedAt: new Date() })
        .where(eq(userJobTitleAssignments.id, req.params.id))
        .returning();

      if (validation.data.isPrimary === true || validation.data.jobTitleId) {
        const jobTitleId = validation.data.jobTitleId || existingAssignment.jobTitleId;
        const [jobTitle] = await db
          .select()
          .from(corporateJobTitles)
          .where(eq(corporateJobTitles.id, jobTitleId));

        if (jobTitle) {
          const allRoles = [jobTitle.primaryRole, ...(jobTitle.assignedRoles || [])].filter(Boolean);
          const sortedRoles = [...allRoles].sort(
            (a, b) => (ROLE_HIERARCHY[b as MembershipRole] || 0) - (ROLE_HIERARCHY[a as MembershipRole] || 0)
          );
          const primaryRole = sortedRoles[0];
          const additionalRoles = sortedRoles.slice(1);

          await db
            .update(memberships)
            .set({
              role: primaryRole,
              roles: additionalRoles,
            })
            .where(
              and(
                eq(memberships.userId, existingAssignment.userId),
                eq(memberships.organizationId, user.organizationId)
              )
            );
        }
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "job-title.assignment.updated",
        "user-job-title-assignment",
        updatedAssignment.id,
        { changes: Object.keys(validation.data) }
      );

      res.json(updatedAssignment);
    } catch (error: any) {
      logError(error, { context: "update-job-title-assignment", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  router.delete("/assignments/:id", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [existingAssignment] = await db
        .select()
        .from(userJobTitleAssignments)
        .where(
          and(
            eq(userJobTitleAssignments.id, req.params.id),
            eq(userJobTitleAssignments.organizationId, user.organizationId)
          )
        );

      if (!existingAssignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      await db.delete(userJobTitleAssignments).where(eq(userJobTitleAssignments.id, req.params.id));

      logAuditEvent(
        user.id,
        user.organizationId,
        "job-title.assignment.deleted",
        "user-job-title-assignment",
        req.params.id,
        { userId: existingAssignment.userId, jobTitleId: existingAssignment.jobTitleId }
      );

      res.json({ success: true });
    } catch (error: any) {
      logError(error, { context: "delete-job-title-assignment", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  app.use("/api/job-titles", router);
}
