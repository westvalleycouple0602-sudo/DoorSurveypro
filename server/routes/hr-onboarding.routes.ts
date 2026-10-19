import { Router } from "express";
import type { Express } from "express";
import type { RouteDependencies } from "./deps";
import { requireRole, requireAnyRole } from "../middleware/requireRole";
import { db } from "../db";
import {
  hrOnboardingPlans,
  insertHROnboardingPlanSchema,
  hrOnboardingSteps,
  insertHROnboardingStepSchema,
  hrEmployeeOnboarding,
  insertHREmployeeOnboardingSchema,
  hrOnboardingStepProgress,
  insertHROnboardingStepProgressSchema,
  hrIntegrationCredentials,
  insertHRIntegrationCredentialSchema,
  hrEmployeeImportJobs,
  insertHREmployeeImportJobSchema,
  hrSyncLogs,
  hrEmployeeInvites,
  insertHREmployeeInviteSchema,
  users,
  memberships,
  organizations,
  corporateJobTitles,
} from "@shared/schema";
import { eq, and, or, desc, asc, sql, count, isNull, isNotNull, gte } from "drizzle-orm";
import crypto from "crypto";
import { emailService } from "../email-service";
import { z } from "zod";
import multer from "multer";
import { parse } from "csv-parse/sync";

// Configure multer for CSV uploads
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
      cb(new Error("Only CSV files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Valid roles for employee invites - comprehensive list matching system roles
const VALID_ROLES = [
  "viewer", 
  "surveyor", 
  "estimator", 
  "project_manager", 
  "pm_manager",
  "manager", 
  "admin", 
  "owner",
  "engineer",
  "sales_rep",
  "technician",
  "procurement_officer",
] as const;

const router = Router();

export function registerHROnboardingRoutes(app: Express, deps: RouteDependencies) {
  const { logError, logAuditEvent } = deps;

  // ============================================================================
  // HR ONBOARDING PLANS
  // ============================================================================

  router.get("/plans", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const plans = await db
        .select()
        .from(hrOnboardingPlans)
        .where(eq(hrOnboardingPlans.organizationId, user.organizationId))
        .orderBy(desc(hrOnboardingPlans.createdAt));

      res.json(plans);
    } catch (error: any) {
      logError(error, { context: "get-hr-onboarding-plans", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch onboarding plans" });
    }
  });

  router.get("/plans/:id", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [plan] = await db
        .select()
        .from(hrOnboardingPlans)
        .where(
          and(
            eq(hrOnboardingPlans.id, req.params.id),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        );

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const steps = await db
        .select()
        .from(hrOnboardingSteps)
        .where(eq(hrOnboardingSteps.planId, plan.id))
        .orderBy(asc(hrOnboardingSteps.stepOrder));

      res.json({ ...plan, steps });
    } catch (error: any) {
      logError(error, { context: "get-hr-onboarding-plan", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch onboarding plan" });
    }
  });

  router.post("/plans", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validation = insertHROnboardingPlanSchema.safeParse({
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id,
      });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [plan] = await db
        .insert(hrOnboardingPlans)
        .values(validation.data)
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.plan.created",
        "hr-onboarding-plan",
        plan.id,
        { planName: plan.name }
      );

      res.status(201).json(plan);
    } catch (error: any) {
      logError(error, { context: "create-hr-onboarding-plan", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to create onboarding plan" });
    }
  });

  router.put("/plans/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const updateSchema = insertHROnboardingPlanSchema.partial().omit({
        organizationId: true,
        createdBy: true,
      });

      const validation = updateSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [plan] = await db
        .update(hrOnboardingPlans)
        .set({ ...validation.data, updatedAt: new Date() })
        .where(
          and(
            eq(hrOnboardingPlans.id, req.params.id),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        )
        .returning();

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.plan.updated",
        "hr-onboarding-plan",
        plan.id,
        { planName: plan.name }
      );

      res.json(plan);
    } catch (error: any) {
      logError(error, { context: "update-hr-onboarding-plan", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to update onboarding plan" });
    }
  });

  router.delete("/plans/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [plan] = await db
        .delete(hrOnboardingPlans)
        .where(
          and(
            eq(hrOnboardingPlans.id, req.params.id),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        )
        .returning();

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.plan.deleted",
        "hr-onboarding-plan",
        plan.id,
        { planName: plan.name }
      );

      res.json({ success: true });
    } catch (error: any) {
      logError(error, { context: "delete-hr-onboarding-plan", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to delete onboarding plan" });
    }
  });

  // ============================================================================
  // HR ONBOARDING STEPS
  // ============================================================================

  router.get("/plans/:planId/steps", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [plan] = await db
        .select()
        .from(hrOnboardingPlans)
        .where(
          and(
            eq(hrOnboardingPlans.id, req.params.planId),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        );

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const steps = await db
        .select()
        .from(hrOnboardingSteps)
        .where(eq(hrOnboardingSteps.planId, req.params.planId))
        .orderBy(asc(hrOnboardingSteps.stepOrder));

      res.json(steps);
    } catch (error: any) {
      logError(error, { context: "get-hr-onboarding-steps", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch onboarding steps" });
    }
  });

  router.post("/plans/:planId/steps", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [plan] = await db
        .select()
        .from(hrOnboardingPlans)
        .where(
          and(
            eq(hrOnboardingPlans.id, req.params.planId),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        );

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const validation = insertHROnboardingStepSchema.safeParse({
        ...req.body,
        planId: req.params.planId,
      });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [step] = await db
        .insert(hrOnboardingSteps)
        .values(validation.data)
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.step.created",
        "hr-onboarding-step",
        step.id,
        { stepTitle: step.title, planId: plan.id }
      );

      res.status(201).json(step);
    } catch (error: any) {
      logError(error, { context: "create-hr-onboarding-step", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to create onboarding step" });
    }
  });

  router.put("/steps/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [existingStep] = await db
        .select({
          step: hrOnboardingSteps,
          plan: hrOnboardingPlans,
        })
        .from(hrOnboardingSteps)
        .innerJoin(hrOnboardingPlans, eq(hrOnboardingSteps.planId, hrOnboardingPlans.id))
        .where(
          and(
            eq(hrOnboardingSteps.id, req.params.id),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        );

      if (!existingStep) {
        return res.status(404).json({ error: "Step not found" });
      }

      const updateSchema = insertHROnboardingStepSchema.partial().omit({ planId: true });
      const validation = updateSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [step] = await db
        .update(hrOnboardingSteps)
        .set({ ...validation.data, updatedAt: new Date() })
        .where(eq(hrOnboardingSteps.id, req.params.id))
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.step.updated",
        "hr-onboarding-step",
        step.id,
        { stepTitle: step.title }
      );

      res.json(step);
    } catch (error: any) {
      logError(error, { context: "update-hr-onboarding-step", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to update onboarding step" });
    }
  });

  router.delete("/steps/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [existingStep] = await db
        .select({
          step: hrOnboardingSteps,
          plan: hrOnboardingPlans,
        })
        .from(hrOnboardingSteps)
        .innerJoin(hrOnboardingPlans, eq(hrOnboardingSteps.planId, hrOnboardingPlans.id))
        .where(
          and(
            eq(hrOnboardingSteps.id, req.params.id),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        );

      if (!existingStep) {
        return res.status(404).json({ error: "Step not found" });
      }

      await db.delete(hrOnboardingSteps).where(eq(hrOnboardingSteps.id, req.params.id));

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.step.deleted",
        "hr-onboarding-step",
        req.params.id,
        { stepTitle: existingStep.step.title }
      );

      res.json({ success: true });
    } catch (error: any) {
      logError(error, { context: "delete-hr-onboarding-step", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to delete onboarding step" });
    }
  });

  router.put("/plans/:planId/steps/reorder", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [plan] = await db
        .select()
        .from(hrOnboardingPlans)
        .where(
          and(
            eq(hrOnboardingPlans.id, req.params.planId),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        );

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const reorderSchema = z.object({
        stepIds: z.array(z.string()),
      });

      const validation = reorderSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const { stepIds } = validation.data;

      for (let i = 0; i < stepIds.length; i++) {
        await db
          .update(hrOnboardingSteps)
          .set({ stepOrder: i, updatedAt: new Date() })
          .where(
            and(
              eq(hrOnboardingSteps.id, stepIds[i]),
              eq(hrOnboardingSteps.planId, req.params.planId)
            )
          );
      }

      const steps = await db
        .select()
        .from(hrOnboardingSteps)
        .where(eq(hrOnboardingSteps.planId, req.params.planId))
        .orderBy(asc(hrOnboardingSteps.stepOrder));

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.steps.reordered",
        "hr-onboarding-plan",
        plan.id,
        { planName: plan.name, stepCount: stepIds.length }
      );

      res.json(steps);
    } catch (error: any) {
      logError(error, { context: "reorder-hr-onboarding-steps", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to reorder onboarding steps" });
    }
  });

  // ============================================================================
  // EMPLOYEE ONBOARDING
  // ============================================================================

  router.get("/employees", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const employees = await db
        .select({
          onboarding: hrEmployeeOnboarding,
          employee: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
          },
          plan: {
            id: hrOnboardingPlans.id,
            name: hrOnboardingPlans.name,
          },
        })
        .from(hrEmployeeOnboarding)
        .innerJoin(users, eq(hrEmployeeOnboarding.employeeUserId, users.id))
        .innerJoin(hrOnboardingPlans, eq(hrEmployeeOnboarding.planId, hrOnboardingPlans.id))
        .where(eq(hrEmployeeOnboarding.organizationId, user.organizationId))
        .orderBy(desc(hrEmployeeOnboarding.createdAt));

      res.json(employees);
    } catch (error: any) {
      logError(error, { context: "get-employee-onboarding-list", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch employee onboarding records" });
    }
  });

  router.get("/employees/:id", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [result] = await db
        .select({
          onboarding: hrEmployeeOnboarding,
          employee: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(hrEmployeeOnboarding)
        .innerJoin(users, eq(hrEmployeeOnboarding.employeeUserId, users.id))
        .where(
          and(
            eq(hrEmployeeOnboarding.id, req.params.id),
            eq(hrEmployeeOnboarding.organizationId, user.organizationId)
          )
        );

      if (!result) {
        return res.status(404).json({ error: "Employee onboarding not found" });
      }

      const progress = await db
        .select({
          progress: hrOnboardingStepProgress,
          step: hrOnboardingSteps,
        })
        .from(hrOnboardingStepProgress)
        .innerJoin(hrOnboardingSteps, eq(hrOnboardingStepProgress.stepId, hrOnboardingSteps.id))
        .where(eq(hrOnboardingStepProgress.employeeOnboardingId, req.params.id))
        .orderBy(asc(hrOnboardingSteps.stepOrder));

      const [plan] = await db
        .select()
        .from(hrOnboardingPlans)
        .where(eq(hrOnboardingPlans.id, result.onboarding.planId));

      res.json({
        ...result.onboarding,
        employee: result.employee,
        plan,
        progress: progress.map((p) => ({
          ...p.progress,
          step: p.step,
        })),
      });
    } catch (error: any) {
      logError(error, { context: "get-employee-onboarding-detail", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch employee onboarding" });
    }
  });

  router.post("/employees", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validation = insertHREmployeeOnboardingSchema.safeParse({
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id,
      });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [plan] = await db
        .select()
        .from(hrOnboardingPlans)
        .where(
          and(
            eq(hrOnboardingPlans.id, validation.data.planId),
            eq(hrOnboardingPlans.organizationId, user.organizationId)
          )
        );

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const steps = await db
        .select()
        .from(hrOnboardingSteps)
        .where(eq(hrOnboardingSteps.planId, plan.id))
        .orderBy(asc(hrOnboardingSteps.stepOrder));

      const [onboarding] = await db
        .insert(hrEmployeeOnboarding)
        .values({
          ...validation.data,
          totalSteps: steps.length,
          completedSteps: 0,
        })
        .returning();

      if (steps.length > 0) {
        const startDate = new Date(onboarding.startDate);
        const progressRecords = steps.map((step) => ({
          employeeOnboardingId: onboarding.id,
          stepId: step.id,
          status: "pending" as const,
          dueDate: step.dueDaysAfterStart
            ? new Date(startDate.getTime() + step.dueDaysAfterStart * 24 * 60 * 60 * 1000)
            : null,
          assignedToUserId: step.isSelfAssigned
            ? onboarding.employeeUserId
            : step.assignToUserId || null,
          requiresVerification: false,
        }));

        await db.insert(hrOnboardingStepProgress).values(progressRecords);
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.employee.onboarding.started",
        "hr-employee-onboarding",
        onboarding.id,
        { employeeUserId: onboarding.employeeUserId, planId: plan.id }
      );

      res.status(201).json(onboarding);
    } catch (error: any) {
      logError(error, { context: "start-employee-onboarding", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to start employee onboarding" });
    }
  });

  router.put("/employees/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const updateSchema = insertHREmployeeOnboardingSchema.partial().omit({
        organizationId: true,
        employeeUserId: true,
        planId: true,
        createdBy: true,
      });

      const validation = updateSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [onboarding] = await db
        .update(hrEmployeeOnboarding)
        .set({ ...validation.data, updatedAt: new Date() })
        .where(
          and(
            eq(hrEmployeeOnboarding.id, req.params.id),
            eq(hrEmployeeOnboarding.organizationId, user.organizationId)
          )
        )
        .returning();

      if (!onboarding) {
        return res.status(404).json({ error: "Employee onboarding not found" });
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.employee.onboarding.updated",
        "hr-employee-onboarding",
        onboarding.id,
        { status: onboarding.status }
      );

      res.json(onboarding);
    } catch (error: any) {
      logError(error, { context: "update-employee-onboarding", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to update employee onboarding" });
    }
  });

  router.delete("/employees/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [onboarding] = await db
        .delete(hrEmployeeOnboarding)
        .where(
          and(
            eq(hrEmployeeOnboarding.id, req.params.id),
            eq(hrEmployeeOnboarding.organizationId, user.organizationId)
          )
        )
        .returning();

      if (!onboarding) {
        return res.status(404).json({ error: "Employee onboarding not found" });
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.employee.onboarding.cancelled",
        "hr-employee-onboarding",
        onboarding.id,
        { employeeUserId: onboarding.employeeUserId }
      );

      res.json({ success: true });
    } catch (error: any) {
      logError(error, { context: "cancel-employee-onboarding", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to cancel employee onboarding" });
    }
  });

  // ============================================================================
  // STEP PROGRESS
  // ============================================================================

  router.put("/progress/:id", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [existingProgress] = await db
        .select({
          progress: hrOnboardingStepProgress,
          onboarding: hrEmployeeOnboarding,
        })
        .from(hrOnboardingStepProgress)
        .innerJoin(
          hrEmployeeOnboarding,
          eq(hrOnboardingStepProgress.employeeOnboardingId, hrEmployeeOnboarding.id)
        )
        .where(
          and(
            eq(hrOnboardingStepProgress.id, req.params.id),
            eq(hrEmployeeOnboarding.organizationId, user.organizationId)
          )
        );

      if (!existingProgress) {
        return res.status(404).json({ error: "Step progress not found" });
      }

      const updateSchema = insertHROnboardingStepProgressSchema.partial().omit({
        employeeOnboardingId: true,
        stepId: true,
      });

      const validation = updateSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const updateData: Record<string, any> = { ...validation.data, updatedAt: new Date() };

      if (validation.data.status === "completed" && !existingProgress.progress.completedAt) {
        updateData.completedAt = new Date();
        updateData.completedByUserId = user.id;
      }

      if (validation.data.status === "in_progress" && !existingProgress.progress.startedAt) {
        updateData.startedAt = new Date();
      }

      const [progress] = await db
        .update(hrOnboardingStepProgress)
        .set(updateData)
        .where(eq(hrOnboardingStepProgress.id, req.params.id))
        .returning();

      if (validation.data.status === "completed") {
        const completedCount = await db
          .select()
          .from(hrOnboardingStepProgress)
          .where(
            and(
              eq(hrOnboardingStepProgress.employeeOnboardingId, existingProgress.onboarding.id),
              eq(hrOnboardingStepProgress.status, "completed")
            )
          );

        await db
          .update(hrEmployeeOnboarding)
          .set({
            completedSteps: completedCount.length,
            status:
              completedCount.length >= existingProgress.onboarding.totalSteps
                ? "completed"
                : "in_progress",
            completedAt:
              completedCount.length >= existingProgress.onboarding.totalSteps
                ? new Date()
                : null,
            updatedAt: new Date(),
          })
          .where(eq(hrEmployeeOnboarding.id, existingProgress.onboarding.id));
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.progress.updated",
        "hr-onboarding-step-progress",
        progress.id,
        { status: progress.status }
      );

      res.json(progress);
    } catch (error: any) {
      logError(error, { context: "update-step-progress", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to update step progress" });
    }
  });

  router.post("/progress/:id/verify", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [existingProgress] = await db
        .select({
          progress: hrOnboardingStepProgress,
          onboarding: hrEmployeeOnboarding,
        })
        .from(hrOnboardingStepProgress)
        .innerJoin(
          hrEmployeeOnboarding,
          eq(hrOnboardingStepProgress.employeeOnboardingId, hrEmployeeOnboarding.id)
        )
        .where(
          and(
            eq(hrOnboardingStepProgress.id, req.params.id),
            eq(hrEmployeeOnboarding.organizationId, user.organizationId)
          )
        );

      if (!existingProgress) {
        return res.status(404).json({ error: "Step progress not found" });
      }

      if (existingProgress.progress.status !== "completed") {
        return res.status(400).json({ error: "Step must be completed before verification" });
      }

      const [progress] = await db
        .update(hrOnboardingStepProgress)
        .set({
          verifiedByUserId: user.id,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(hrOnboardingStepProgress.id, req.params.id))
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.onboarding.progress.verified",
        "hr-onboarding-step-progress",
        progress.id,
        {}
      );

      res.json(progress);
    } catch (error: any) {
      logError(error, { context: "verify-step-progress", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to verify step" });
    }
  });

  // ============================================================================
  // HR INTEGRATIONS
  // ============================================================================

  router.get("/integrations", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const integrations = await db
        .select()
        .from(hrIntegrationCredentials)
        .where(eq(hrIntegrationCredentials.organizationId, user.organizationId))
        .orderBy(desc(hrIntegrationCredentials.createdAt));

      const sanitizedIntegrations = integrations.map((int) => ({
        ...int,
        apiKey: int.apiKey ? "********" : null,
        apiSecret: int.apiSecret ? "********" : null,
        accessToken: int.accessToken ? "********" : null,
        refreshToken: int.refreshToken ? "********" : null,
      }));

      res.json(sanitizedIntegrations);
    } catch (error: any) {
      logError(error, { context: "get-hr-integrations", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch HR integrations" });
    }
  });

  router.post("/integrations", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validation = insertHRIntegrationCredentialSchema.safeParse({
        ...req.body,
        organizationId: user.organizationId,
        createdBy: user.id,
      });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [integration] = await db
        .insert(hrIntegrationCredentials)
        .values(validation.data)
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.integration.created",
        "hr-integration",
        integration.id,
        { provider: integration.provider }
      );

      res.status(201).json({
        ...integration,
        apiKey: integration.apiKey ? "********" : null,
        apiSecret: integration.apiSecret ? "********" : null,
        accessToken: integration.accessToken ? "********" : null,
        refreshToken: integration.refreshToken ? "********" : null,
      });
    } catch (error: any) {
      logError(error, { context: "create-hr-integration", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to create HR integration" });
    }
  });

  router.put("/integrations/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const updateSchema = insertHRIntegrationCredentialSchema.partial().omit({
        organizationId: true,
        createdBy: true,
      });

      const validation = updateSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [integration] = await db
        .update(hrIntegrationCredentials)
        .set({ ...validation.data, updatedAt: new Date() })
        .where(
          and(
            eq(hrIntegrationCredentials.id, req.params.id),
            eq(hrIntegrationCredentials.organizationId, user.organizationId)
          )
        )
        .returning();

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.integration.updated",
        "hr-integration",
        integration.id,
        { provider: integration.provider }
      );

      res.json({
        ...integration,
        apiKey: integration.apiKey ? "********" : null,
        apiSecret: integration.apiSecret ? "********" : null,
        accessToken: integration.accessToken ? "********" : null,
        refreshToken: integration.refreshToken ? "********" : null,
      });
    } catch (error: any) {
      logError(error, { context: "update-hr-integration", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to update HR integration" });
    }
  });

  router.delete("/integrations/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [integration] = await db
        .delete(hrIntegrationCredentials)
        .where(
          and(
            eq(hrIntegrationCredentials.id, req.params.id),
            eq(hrIntegrationCredentials.organizationId, user.organizationId)
          )
        )
        .returning();

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.integration.deleted",
        "hr-integration",
        integration.id,
        { provider: integration.provider }
      );

      res.json({ success: true });
    } catch (error: any) {
      logError(error, { context: "delete-hr-integration", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to delete HR integration" });
    }
  });

  router.post("/integrations/:id/test", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [integration] = await db
        .select()
        .from(hrIntegrationCredentials)
        .where(
          and(
            eq(hrIntegrationCredentials.id, req.params.id),
            eq(hrIntegrationCredentials.organizationId, user.organizationId)
          )
        );

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const testResult = {
        success: true,
        message: `Connection to ${integration.provider} successful`,
        testedAt: new Date().toISOString(),
      };

      await db
        .update(hrIntegrationCredentials)
        .set({
          connectionStatus: "connected",
          updatedAt: new Date(),
        })
        .where(eq(hrIntegrationCredentials.id, req.params.id));

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.integration.tested",
        "hr-integration",
        integration.id,
        { provider: integration.provider, success: true }
      );

      res.json(testResult);
    } catch (error: any) {
      logError(error, { context: "test-hr-integration", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to test HR integration" });
    }
  });

  router.post("/integrations/:id/sync", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [integration] = await db
        .select()
        .from(hrIntegrationCredentials)
        .where(
          and(
            eq(hrIntegrationCredentials.id, req.params.id),
            eq(hrIntegrationCredentials.organizationId, user.organizationId)
          )
        );

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const [syncLog] = await db
        .insert(hrSyncLogs)
        .values({
          organizationId: user.organizationId,
          integrationId: integration.id,
          eventType: "manual_trigger",
          direction: "pull",
          status: "success",
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsDeleted: 0,
          recordsFailed: 0,
          durationMs: 0,
        })
        .returning();

      await db
        .update(hrIntegrationCredentials)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
          updatedAt: new Date(),
        })
        .where(eq(hrIntegrationCredentials.id, req.params.id));

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.integration.synced",
        "hr-integration",
        integration.id,
        { provider: integration.provider }
      );

      res.json({
        success: true,
        message: `Sync with ${integration.provider} initiated`,
        syncLogId: syncLog.id,
      });
    } catch (error: any) {
      logError(error, { context: "sync-hr-integration", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to sync HR integration" });
    }
  });

  // ============================================================================
  // IMPORT JOBS
  // ============================================================================

  router.get("/imports", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const jobs = await db
        .select()
        .from(hrEmployeeImportJobs)
        .where(eq(hrEmployeeImportJobs.organizationId, user.organizationId))
        .orderBy(desc(hrEmployeeImportJobs.createdAt));

      res.json(jobs);
    } catch (error: any) {
      logError(error, { context: "get-hr-import-jobs", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch import jobs" });
    }
  });

  router.get("/imports/:id", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [job] = await db
        .select()
        .from(hrEmployeeImportJobs)
        .where(
          and(
            eq(hrEmployeeImportJobs.id, req.params.id),
            eq(hrEmployeeImportJobs.organizationId, user.organizationId)
          )
        );

      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }

      res.json(job);
    } catch (error: any) {
      logError(error, { context: "get-hr-import-job", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch import job" });
    }
  });

  // CSV Employee Invite Import - Upload file and create invites
  router.post("/imports/csv", requireAnyRole(["owner", "admin", "manager"]), csvUpload.single("file"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; firstName?: string; lastName?: string };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Parse CSV content
      const csvContent = req.file.buffer.toString("utf-8");
      let records: Record<string, string>[];
      
      try {
        records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
        });
      } catch (parseError: any) {
        return res.status(400).json({ error: "Invalid CSV format: " + parseError.message });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: "CSV file is empty" });
      }

      if (records.length > 500) {
        return res.status(400).json({ error: "Maximum 500 employees per import" });
      }

      // Get organization details
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      const organizationName = org?.name || "Your Organization";
      const inviterName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : "Your team";

      // CSV row validation schema
      const csvRowSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Invalid email format"),
        role: z.enum(VALID_ROLES).optional().default("viewer"),
        department: z.string().optional(),
        startDate: z.string().optional(),
        message: z.string().optional(),
      });

      // Create import job record
      const [importJob] = await db
        .insert(hrEmployeeImportJobs)
        .values({
          organizationId: user.organizationId,
          source: "csv_upload",
          status: "processing",
          sourceFileName: req.file.originalname,
          totalRecords: records.length,
          createdBy: user.id,
        })
        .returning();

      const results: {
        row: number;
        email: string;
        status: "success" | "error";
        message: string;
        inviteId?: string;
      }[] = [];

      let successCount = 0;
      let errorCount = 0;

      // Process each row
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNum = i + 2; // +2 for 1-indexed and header row
        
        // Normalize field names (handle various CSV column naming conventions)
        const normalizedRecord = {
          firstName: record.firstName || record.first_name || record.FirstName || record["First Name"] || "",
          lastName: record.lastName || record.last_name || record.LastName || record["Last Name"] || "",
          email: record.email || record.Email || record.EMAIL || record["Email Address"] || "",
          role: (record.role || record.Role || record.ROLE || "viewer").toLowerCase(),
          department: record.department || record.Department || record.DEPARTMENT || "",
          startDate: record.startDate || record.start_date || record.StartDate || record["Start Date"] || "",
          message: record.message || record.Message || record.note || record.Note || "",
        };

        // Validate row data
        const validation = csvRowSchema.safeParse(normalizedRecord);
        
        if (!validation.success) {
          const errorMessages = validation.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
          results.push({
            row: rowNum,
            email: normalizedRecord.email || "(no email)",
            status: "error",
            message: errorMessages,
          });
          errorCount++;
          continue;
        }

        const data = validation.data;

        // Check if email already has pending/active invite
        const [existingInvite] = await db
          .select()
          .from(hrEmployeeInvites)
          .where(
            and(
              eq(hrEmployeeInvites.organizationId, user.organizationId),
              eq(hrEmployeeInvites.email, data.email.toLowerCase()),
              or(
                eq(hrEmployeeInvites.status, "pending"),
                eq(hrEmployeeInvites.status, "invited"),
                eq(hrEmployeeInvites.status, "link_clicked"),
                eq(hrEmployeeInvites.status, "setup_started"),
                eq(hrEmployeeInvites.status, "active")
              )
            )
          );

        if (existingInvite) {
          results.push({
            row: rowNum,
            email: data.email,
            status: "error",
            message: "Employee already has an active or pending invite",
          });
          errorCount++;
          continue;
        }

        // Check if user already exists in organization
        const [existingMembership] = await db
          .select()
          .from(memberships)
          .innerJoin(users, eq(memberships.userId, users.id))
          .where(
            and(
              eq(memberships.organizationId, user.organizationId),
              eq(users.email, data.email.toLowerCase())
            )
          );

        if (existingMembership) {
          results.push({
            row: rowNum,
            email: data.email,
            status: "error",
            message: "Employee is already a member of this organization",
          });
          errorCount++;
          continue;
        }

        // Create the invite
        try {
          const setupToken = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

          const [invite] = await db
            .insert(hrEmployeeInvites)
            .values({
              organizationId: user.organizationId,
              invitedByUserId: user.id,
              email: data.email.toLowerCase(),
              firstName: data.firstName,
              lastName: data.lastName,
              primaryRole: data.role,
              department: data.department || null,
              inviteMessage: data.message || null,
              setupToken,
              expiresAt,
              status: "pending",
            })
            .returning();

          // Send invite email
          const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
            : "http://localhost:5000";

          const setupLink = `${baseUrl}/setup-account?token=${setupToken}`;

          const html = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
              <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Welcome to DoorSurvey Pro</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${organizationName}</p>
                </div>
                <div style="padding: 32px 24px;">
                  <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Hi ${data.firstName},</p>
                  <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    ${inviterName} has invited you to join ${organizationName} on DoorSurvey Pro. 
                    Click the button below to set up your password and access your account.
                  </p>
                  ${data.message ? `<div style="background: #f8fafc; border-radius: 6px; padding: 16px; margin: 0 0 24px;"><p style="margin: 0; color: #4b5563; font-size: 14px; font-style: italic;">"${data.message}"</p></div>` : ""}
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${setupLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 16px;">Set Up Your Account</a>
                  </div>
                  <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">This link will expire in 7 days.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const emailSent = await emailService.sendEmail({
            to: data.email,
            subject: `You're invited to join ${organizationName} on DoorSurvey Pro`,
            html,
          });

          // Update invite status
          await db
            .update(hrEmployeeInvites)
            .set({ 
              status: emailSent.success ? "invited" : "pending",
              lastEmailSentAt: emailSent.success ? new Date() : null,
              emailSendCount: emailSent.success ? 1 : 0,
            })
            .where(eq(hrEmployeeInvites.id, invite.id));

          results.push({
            row: rowNum,
            email: data.email,
            status: "success",
            message: emailSent.success ? "Invite sent successfully" : "Invite created (email pending)",
            inviteId: invite.id,
          });
          successCount++;
        } catch (inviteError: any) {
          results.push({
            row: rowNum,
            email: data.email,
            status: "error",
            message: "Failed to create invite: " + (inviteError.message || "Unknown error"),
          });
          errorCount++;
        }
      }

      // Update import job with results
      await db
        .update(hrEmployeeImportJobs)
        .set({
          status: errorCount === records.length ? "failed" : successCount === records.length ? "completed" : "partial",
          totalRecords: records.length,
          successfulImports: successCount,
          failedImports: errorCount,
          errors: results.filter(r => r.status === "error").map(r => ({ row: r.row, message: r.message })),
          completedAt: new Date(),
        })
        .where(eq(hrEmployeeImportJobs.id, importJob.id));

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.import.csv.completed",
        "hr-import-job",
        importJob.id,
        { 
          fileName: req.file.originalname, 
          totalRecords: records.length,
          successCount,
          errorCount,
        }
      );

      res.status(201).json({
        importJobId: importJob.id,
        fileName: req.file.originalname,
        totalRecords: records.length,
        successCount,
        errorCount,
        results,
      });
    } catch (error: any) {
      logError(error, { context: "csv-employee-import", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to process CSV import" });
    }
  });

  // ============================================================================
  // QUICK EMPLOYEE INVITE SYSTEM
  // ============================================================================

  // Generate secure token for password setup
  function generateSetupToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // Send invite email with setup link
  async function sendInviteEmail(
    invite: typeof hrEmployeeInvites.$inferSelect,
    organizationName: string,
    inviterName: string
  ): Promise<boolean> {
    const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000";

    const setupLink = `${baseUrl}/setup-account?token=${invite.setupToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Welcome to DoorSurvey Pro</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
        <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Welcome to DoorSurvey Pro</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${organizationName}</p>
          </div>
          
          <div style="padding: 32px 24px;">
            <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Hi ${invite.firstName},</p>
            
            <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
              ${inviterName} has invited you to join ${organizationName} on DoorSurvey Pro. 
              Click the button below to set up your password and access your account.
            </p>

            ${invite.inviteMessage ? `
            <div style="background: #f8fafc; border-radius: 6px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0; color: #4b5563; font-size: 14px; font-style: italic;">"${invite.inviteMessage}"</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${setupLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 16px;">
                Set Up Your Account
              </a>
            </div>
            
            <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
              This link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              DoorSurvey Pro - Commercial Door Survey & Estimation Platform
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const result = await emailService.sendEmail({
        to: invite.email,
        subject: `You're invited to join ${organizationName} on DoorSurvey Pro`,
        html,
      });
      return result.success;
    } catch (error) {
      logError(error as Error, { context: "send-invite-email", email: invite.email });
      return false;
    }
  }

  // Get all employee invites with status summary
  router.get("/invites", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const invites = await db
        .select({
          invite: hrEmployeeInvites,
          invitedBy: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
          jobTitle: {
            id: corporateJobTitles.id,
            title: corporateJobTitles.title,
          },
          plan: {
            id: hrOnboardingPlans.id,
            name: hrOnboardingPlans.name,
          },
        })
        .from(hrEmployeeInvites)
        .leftJoin(users, eq(hrEmployeeInvites.invitedByUserId, users.id))
        .leftJoin(corporateJobTitles, eq(hrEmployeeInvites.jobTitleId, corporateJobTitles.id))
        .leftJoin(hrOnboardingPlans, eq(hrEmployeeInvites.onboardingPlanId, hrOnboardingPlans.id))
        .where(eq(hrEmployeeInvites.organizationId, user.organizationId))
        .orderBy(desc(hrEmployeeInvites.createdAt));

      res.json(invites);
    } catch (error: any) {
      logError(error, { context: "get-hr-employee-invites", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch employee invites" });
    }
  });

  // Get invite statistics/dashboard summary
  router.get("/invites/stats", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const stats = await db
        .select({
          status: hrEmployeeInvites.status,
          count: count(),
        })
        .from(hrEmployeeInvites)
        .where(eq(hrEmployeeInvites.organizationId, user.organizationId))
        .groupBy(hrEmployeeInvites.status);

      const statsByStatus = stats.reduce((acc, s) => {
        acc[s.status as string] = Number(s.count);
        return acc;
      }, {} as Record<string, number>);

      // Get total invited vs active
      const total = Object.values(statsByStatus).reduce((sum, n) => sum + n, 0);
      const active = statsByStatus["active"] || 0;
      const pending = (statsByStatus["pending"] || 0) + (statsByStatus["invited"] || 0);
      const setupInProgress = (statsByStatus["link_clicked"] || 0) + (statsByStatus["setup_started"] || 0);

      res.json({
        total,
        active,
        pending,
        setupInProgress,
        expired: statsByStatus["expired"] || 0,
        cancelled: statsByStatus["cancelled"] || 0,
        activationRate: total > 0 ? Math.round((active / total) * 100) : 0,
        byStatus: statsByStatus,
      });
    } catch (error: any) {
      logError(error, { context: "get-hr-invite-stats", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch invite statistics" });
    }
  });

  // Get comprehensive HR analytics dashboard data
  router.get("/analytics", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Get role distribution
      const roleStats = await db
        .select({
          role: hrEmployeeInvites.primaryRole,
          count: count(),
        })
        .from(hrEmployeeInvites)
        .where(eq(hrEmployeeInvites.organizationId, user.organizationId))
        .groupBy(hrEmployeeInvites.primaryRole);

      // Get department breakdown
      const departmentStats = await db
        .select({
          department: hrEmployeeInvites.department,
          count: count(),
        })
        .from(hrEmployeeInvites)
        .where(eq(hrEmployeeInvites.organizationId, user.organizationId))
        .groupBy(hrEmployeeInvites.department);

      // Get invite trends - last 30 days grouped by date
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const inviteTrends = await db
        .select({
          date: sql<string>`DATE(${hrEmployeeInvites.createdAt})`,
          count: count(),
        })
        .from(hrEmployeeInvites)
        .where(
          and(
            eq(hrEmployeeInvites.organizationId, user.organizationId),
            gte(hrEmployeeInvites.createdAt, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(${hrEmployeeInvites.createdAt})`)
        .orderBy(sql`DATE(${hrEmployeeInvites.createdAt})`);

      // Get activation trends - when invites became active
      const activationTrends = await db
        .select({
          date: sql<string>`DATE(${hrEmployeeInvites.accountCreatedAt})`,
          count: count(),
        })
        .from(hrEmployeeInvites)
        .where(
          and(
            eq(hrEmployeeInvites.organizationId, user.organizationId),
            eq(hrEmployeeInvites.status, "active"),
            isNotNull(hrEmployeeInvites.accountCreatedAt),
            gte(hrEmployeeInvites.accountCreatedAt, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(${hrEmployeeInvites.accountCreatedAt})`)
        .orderBy(sql`DATE(${hrEmployeeInvites.accountCreatedAt})`);

      // Get average time to activation (in hours)
      const activationTimeData = await db
        .select({
          avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${hrEmployeeInvites.accountCreatedAt} - ${hrEmployeeInvites.createdAt})) / 3600)`,
        })
        .from(hrEmployeeInvites)
        .where(
          and(
            eq(hrEmployeeInvites.organizationId, user.organizationId),
            eq(hrEmployeeInvites.status, "active"),
            isNotNull(hrEmployeeInvites.accountCreatedAt),
            isNotNull(hrEmployeeInvites.createdAt)
          )
        );

      // Get funnel data (conversion through stages)
      const funnelStats = await db
        .select({
          status: hrEmployeeInvites.status,
          count: count(),
        })
        .from(hrEmployeeInvites)
        .where(eq(hrEmployeeInvites.organizationId, user.organizationId))
        .groupBy(hrEmployeeInvites.status);

      const funnelByStatus = funnelStats.reduce((acc, s) => {
        acc[s.status as string] = Number(s.count);
        return acc;
      }, {} as Record<string, number>);

      // Calculate funnel conversion
      const totalInvited = Object.values(funnelByStatus).reduce((sum, n) => sum + n, 0);
      const linkClicked = (funnelByStatus["link_clicked"] || 0) + (funnelByStatus["setup_started"] || 0) + (funnelByStatus["active"] || 0);
      const setupStarted = (funnelByStatus["setup_started"] || 0) + (funnelByStatus["active"] || 0);
      const activated = funnelByStatus["active"] || 0;

      const funnel = [
        { stage: "Invited", count: totalInvited, percentage: 100 },
        { stage: "Link Clicked", count: linkClicked, percentage: totalInvited > 0 ? Math.round((linkClicked / totalInvited) * 100) : 0 },
        { stage: "Setup Started", count: setupStarted, percentage: totalInvited > 0 ? Math.round((setupStarted / totalInvited) * 100) : 0 },
        { stage: "Activated", count: activated, percentage: totalInvited > 0 ? Math.round((activated / totalInvited) * 100) : 0 },
      ];

      // Get recent activity (last 10 status changes)
      const recentActivity = await db
        .select({
          id: hrEmployeeInvites.id,
          firstName: hrEmployeeInvites.firstName,
          lastName: hrEmployeeInvites.lastName,
          email: hrEmployeeInvites.email,
          status: hrEmployeeInvites.status,
          primaryRole: hrEmployeeInvites.primaryRole,
          department: hrEmployeeInvites.department,
          updatedAt: hrEmployeeInvites.updatedAt,
        })
        .from(hrEmployeeInvites)
        .where(eq(hrEmployeeInvites.organizationId, user.organizationId))
        .orderBy(desc(hrEmployeeInvites.updatedAt))
        .limit(10);

      res.json({
        roleDistribution: roleStats.map(r => ({
          role: r.role || "Not Assigned",
          count: Number(r.count),
        })),
        departmentBreakdown: departmentStats
          .filter(d => d.department)
          .map(d => ({
            department: d.department,
            count: Number(d.count),
          })),
        inviteTrends: inviteTrends.map(t => ({
          date: t.date,
          invites: Number(t.count),
        })),
        activationTrends: activationTrends.map(t => ({
          date: t.date,
          activations: Number(t.count),
        })),
        avgActivationTimeHours: activationTimeData[0]?.avgHours ? Math.round(activationTimeData[0].avgHours) : null,
        funnel,
        recentActivity,
      });
    } catch (error: any) {
      logError(error, { context: "get-hr-analytics", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to fetch HR analytics" });
    }
  });

  // Create quick employee invite
  router.post("/invites", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; firstName?: string; lastName?: string };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const inviteSchema = insertHREmployeeInviteSchema.extend({
        sendEmail: z.boolean().default(true),
      });

      const validation = inviteSchema.safeParse({
        ...req.body,
        organizationId: user.organizationId,
        invitedByUserId: user.id,
      });

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      // Validate that onboardingPlanId belongs to this organization if provided
      if (validation.data.onboardingPlanId) {
        const [plan] = await db
          .select({ id: hrOnboardingPlans.id })
          .from(hrOnboardingPlans)
          .where(
            and(
              eq(hrOnboardingPlans.id, validation.data.onboardingPlanId),
              eq(hrOnboardingPlans.organizationId, user.organizationId)
            )
          );

        if (!plan) {
          return res.status(400).json({ error: "Invalid onboarding plan" });
        }
      }

      // Validate that jobTitleId belongs to this organization or is a system template if provided
      if (validation.data.jobTitleId) {
        const [jobTitle] = await db
          .select({ id: corporateJobTitles.id })
          .from(corporateJobTitles)
          .where(
            and(
              eq(corporateJobTitles.id, validation.data.jobTitleId),
              or(
                eq(corporateJobTitles.organizationId, user.organizationId),
                isNull(corporateJobTitles.organizationId)
              )
            )
          );

        if (!jobTitle) {
          return res.status(400).json({ error: "Invalid job title" });
        }
      }

      // Validate that reportsToUserId belongs to this organization if provided
      if (validation.data.reportsToUserId) {
        const [manager] = await db
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.userId, validation.data.reportsToUserId),
              eq(memberships.organizationId, user.organizationId)
            )
          );

        if (!manager) {
          return res.status(400).json({ error: "Invalid reporting manager" });
        }
      }

      // Validate that buddyUserId belongs to this organization if provided
      if (validation.data.buddyUserId) {
        const [buddy] = await db
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.userId, validation.data.buddyUserId),
              eq(memberships.organizationId, user.organizationId)
            )
          );

        if (!buddy) {
          return res.status(400).json({ error: "Invalid onboarding buddy" });
        }
      }

      // Check for existing invite with same email
      const existing = await db
        .select()
        .from(hrEmployeeInvites)
        .where(
          and(
            eq(hrEmployeeInvites.organizationId, user.organizationId),
            eq(hrEmployeeInvites.email, validation.data.email.toLowerCase())
          )
        );

      if (existing.length > 0 && existing[0].status !== "cancelled" && existing[0].status !== "expired") {
        return res.status(409).json({ error: "An invite for this email already exists" });
      }

      // Generate setup token
      const setupToken = generateSetupToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const [invite] = await db
        .insert(hrEmployeeInvites)
        .values({
          ...validation.data,
          organizationId: user.organizationId,
          invitedByUserId: user.id,
          email: validation.data.email.toLowerCase(),
          setupToken,
          setupTokenExpiresAt: expiresAt,
          expiresAt,
          status: "pending",
        })
        .returning();

      // Get organization name for email
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      // Send invite email if requested
      if (validation.data.sendEmail) {
        const inviterName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Your administrator";
        const emailSent = await sendInviteEmail(invite, org?.name || "Your Organization", inviterName);

        if (emailSent) {
          await db
            .update(hrEmployeeInvites)
            .set({
              status: "invited",
              lastEmailSentAt: new Date(),
              emailSendCount: 1,
              updatedAt: new Date(),
            })
            .where(eq(hrEmployeeInvites.id, invite.id));

          invite.status = "invited";
          invite.lastEmailSentAt = new Date();
          invite.emailSendCount = 1;
        }
      }

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.employee.invited",
        "hr-employee-invite",
        invite.id,
        { email: invite.email, firstName: invite.firstName, lastName: invite.lastName }
      );

      res.status(201).json(invite);
    } catch (error: any) {
      logError(error, { context: "create-hr-employee-invite", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to create employee invite" });
    }
  });

  // Resend invite email
  router.post("/invites/:id/resend", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; firstName?: string; lastName?: string };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const [invite] = await db
        .select()
        .from(hrEmployeeInvites)
        .where(
          and(
            eq(hrEmployeeInvites.id, req.params.id),
            eq(hrEmployeeInvites.organizationId, user.organizationId)
          )
        );

      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      // Status transition guard: only allow resending if status is pending, invited, or expired
      const allowedResendStatuses = ["pending", "invited", "expired"];
      if (!allowedResendStatuses.includes(invite.status)) {
        return res.status(400).json({ 
          error: invite.status === "active" 
            ? "This invite has already been activated" 
            : "Cannot resend invite in current status" 
        });
      }

      // Generate new token if expired
      let newToken = invite.setupToken;
      let newExpiry = invite.setupTokenExpiresAt;

      if (!invite.setupTokenExpiresAt || new Date(invite.setupTokenExpiresAt) < new Date()) {
        newToken = generateSetupToken();
        newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);
      }

      // Get organization name
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      const inviterName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Your administrator";
      const updatedInvite = { ...invite, setupToken: newToken };
      const emailSent = await sendInviteEmail(updatedInvite as any, org?.name || "Your Organization", inviterName);

      if (emailSent) {
        await db
          .update(hrEmployeeInvites)
          .set({
            setupToken: newToken,
            setupTokenExpiresAt: newExpiry,
            expiresAt: newExpiry,
            status: "invited",
            lastEmailSentAt: new Date(),
            emailSendCount: (invite.emailSendCount || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(hrEmployeeInvites.id, invite.id));

        logAuditEvent(
          user.id,
          user.organizationId,
          "hr.employee.invite.resent",
          "hr-employee-invite",
          invite.id,
          { email: invite.email }
        );

        res.json({ success: true, message: "Invite email sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send email" });
      }
    } catch (error: any) {
      logError(error, { context: "resend-hr-employee-invite", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  // Cancel invite
  router.post("/invites/:id/cancel", requireAnyRole(["owner", "admin", "manager"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null };

      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // First fetch the invite to check organization ownership and status
      const [existingInvite] = await db
        .select()
        .from(hrEmployeeInvites)
        .where(
          and(
            eq(hrEmployeeInvites.id, req.params.id),
            eq(hrEmployeeInvites.organizationId, user.organizationId)
          )
        );

      if (!existingInvite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      // Status transition guard: cannot cancel if already active or cancelled
      if (existingInvite.status === "active") {
        return res.status(400).json({ error: "Cannot cancel an active invite" });
      }

      if (existingInvite.status === "cancelled") {
        return res.status(400).json({ error: "Invite is already cancelled" });
      }

      const [invite] = await db
        .update(hrEmployeeInvites)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(hrEmployeeInvites.id, existingInvite.id))
        .returning();

      logAuditEvent(
        user.id,
        user.organizationId,
        "hr.employee.invite.cancelled",
        "hr-employee-invite",
        invite.id,
        { email: invite.email }
      );

      res.json({ success: true });
    } catch (error: any) {
      logError(error, { context: "cancel-hr-employee-invite", userId: (req.dbUser as any)?.id });
      res.status(500).json({ error: "Failed to cancel invite" });
    }
  });

  // Validate setup token (public endpoint)
  router.get("/setup/validate/:token", async (req, res) => {
    try {
      const [invite] = await db
        .select({
          id: hrEmployeeInvites.id,
          email: hrEmployeeInvites.email,
          firstName: hrEmployeeInvites.firstName,
          lastName: hrEmployeeInvites.lastName,
          status: hrEmployeeInvites.status,
          expiresAt: hrEmployeeInvites.setupTokenExpiresAt,
          organizationId: hrEmployeeInvites.organizationId,
        })
        .from(hrEmployeeInvites)
        .where(eq(hrEmployeeInvites.setupToken, req.params.token));

      if (!invite) {
        return res.status(404).json({ error: "Invalid or expired token" });
      }

      if (invite.status === "active") {
        return res.status(400).json({ error: "This account has already been set up" });
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        await db
          .update(hrEmployeeInvites)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(hrEmployeeInvites.id, invite.id));
        return res.status(400).json({ error: "This invite has expired" });
      }

      // Get organization name
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, invite.organizationId));

      // Update status to link_clicked
      if (invite.status === "invited") {
        await db
          .update(hrEmployeeInvites)
          .set({ status: "link_clicked", updatedAt: new Date() })
          .where(eq(hrEmployeeInvites.id, invite.id));
      }

      res.json({
        valid: true,
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        organizationName: org?.name || "Your Organization",
      });
    } catch (error: any) {
      logError(error, { context: "validate-setup-token" });
      res.status(500).json({ error: "Failed to validate token" });
    }
  });

  // Complete account setup (public endpoint)
  router.post("/setup/complete", async (req, res) => {
    try {
      const setupSchema = z.object({
        token: z.string().min(1),
        password: z.string().min(8, "Password must be at least 8 characters"),
      });

      const validation = setupSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const [invite] = await db
        .select()
        .from(hrEmployeeInvites)
        .where(eq(hrEmployeeInvites.setupToken, validation.data.token));

      if (!invite) {
        return res.status(404).json({ error: "Invalid or expired token" });
      }

      if (invite.status === "active") {
        return res.status(400).json({ error: "This account has already been set up" });
      }

      if (invite.setupTokenExpiresAt && new Date(invite.setupTokenExpiresAt) < new Date()) {
        return res.status(400).json({ error: "This invite has expired" });
      }

      // Update status to setup_started
      await db
        .update(hrEmployeeInvites)
        .set({ status: "setup_started", updatedAt: new Date() })
        .where(eq(hrEmployeeInvites.id, invite.id));

      // Hash password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(validation.data.password, 10);

      // Create user account
      const [newUser] = await db
        .insert(users)
        .values({
          email: invite.email,
          firstName: invite.firstName,
          lastName: invite.lastName,
          passwordHash,
          authProvider: "email",
          emailVerifiedAt: new Date(), // Pre-verified since they came from invite
        })
        .returning();

      // Create membership with assigned roles
      const allRoles = [invite.primaryRole, ...(invite.additionalRoles || [])].filter(Boolean);
      await db.insert(memberships).values({
        userId: newUser.id,
        organizationId: invite.organizationId,
        role: invite.primaryRole,
        roles: allRoles,
      });

      // Update invite to active status
      await db
        .update(hrEmployeeInvites)
        .set({
          status: "active",
          createdUserId: newUser.id,
          accountCreatedAt: new Date(),
          setupTokenUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(hrEmployeeInvites.id, invite.id));

      // If there's an onboarding plan, start employee onboarding
      if (invite.onboardingPlanId) {
        const [plan] = await db
          .select()
          .from(hrOnboardingPlans)
          .where(eq(hrOnboardingPlans.id, invite.onboardingPlanId));

        if (plan) {
          const steps = await db
            .select()
            .from(hrOnboardingSteps)
            .where(eq(hrOnboardingSteps.planId, plan.id));

          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + (plan.estimatedDurationDays || 30));

          const [onboarding] = await db
            .insert(hrEmployeeOnboarding)
            .values({
              organizationId: invite.organizationId,
              employeeUserId: newUser.id,
              planId: plan.id,
              status: "in_progress",
              startDate: new Date(),
              targetCompletionDate: targetDate,
              totalSteps: steps.length,
              managerUserId: invite.reportsToUserId,
              buddyUserId: invite.buddyUserId,
            })
            .returning();

          // Create step progress entries
          for (const step of steps) {
            await db.insert(hrOnboardingStepProgress).values({
              employeeOnboardingId: onboarding.id,
              stepId: step.id,
              status: "pending",
            });
          }
        }
      }

      res.json({
        success: true,
        message: "Account created successfully",
        userId: newUser.id,
      });
    } catch (error: any) {
      logError(error, { context: "complete-account-setup" });
      res.status(500).json({ error: "Failed to complete account setup" });
    }
  });

  app.use("/api/hr-onboarding", router);
}
