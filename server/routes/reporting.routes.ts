import { Router } from "express";
import { storage } from "../storage";
import { requireAuth as isAuthenticated, getOrganizationContext } from "../clerkAuth";
import { requireFeature } from "../feature-gates";
import { 
  insertReportTemplateSchema, 
  insertReportExecutionSchema,
  insertReportScheduleSchema,
  insertReportShareSchema 
} from "@shared/schema";

const router = Router();

// All routes require authentication AND advancedReporting feature (Professional+)
router.use(isAuthenticated);
router.use(requireFeature("advancedReporting"));

// ====== REPORT TEMPLATES ======

// Create a new report template
router.post("/templates", async (req, res) => {
  try {
    const user = req.dbUser as any;
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const validatedData = insertReportTemplateSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
      createdBy: user.id,
    });

    const template = await storage.createReportTemplate(validatedData);
    res.json(template);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get all report templates for organization
router.get("/templates", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const filters: { reportType?: string; isTemplate?: string } = {};
    if (req.query.reportType) filters.reportType = req.query.reportType as string;
    if (req.query.isTemplate) filters.isTemplate = req.query.isTemplate as string;

    const templates = await storage.getReportTemplates(context.organizationId, filters);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific report template
router.get("/templates/:id", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const template = await storage.getReportTemplate(req.params.id, context.organizationId);
    
    if (!template) {
      return res.status(404).json({ error: "Report template not found" });
    }
    
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a report template
router.patch("/templates/:id", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const updated = await storage.updateReportTemplate(
      req.params.id,
      context.organizationId,
      req.body
    );

    if (!updated) {
      return res.status(404).json({ error: "Report template not found" });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a report template
router.delete("/templates/:id", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    await storage.deleteReportTemplate(req.params.id, context.organizationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== REPORT EXECUTIONS ======

// Execute a report
router.post("/templates/:id/execute", async (req, res) => {
  try {
    const user = req.dbUser as any;
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const execution = await storage.executeReport(
      req.params.id,
      context.organizationId,
      user.id,
      req.body.parameters
    );

    res.json(execution);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get execution history for a template
router.get("/templates/:id/executions", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const executions = await storage.getReportExecutions(context.organizationId, {
      templateId: req.params.id,
    });

    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all report executions for organization
router.get("/executions", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const filters: { status?: string } = {};
    if (req.query.status) filters.status = req.query.status as string;

    const executions = await storage.getReportExecutions(context.organizationId, filters);
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific execution
router.get("/executions/:id", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const execution = await storage.getReportExecution(req.params.id, context.organizationId);
    
    if (!execution) {
      return res.status(404).json({ error: "Report execution not found" });
    }
    
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== REPORT SCHEDULES ======

// Create a report schedule
router.post("/schedules", async (req, res) => {
  try {
    const user = req.dbUser as any;
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const validatedData = insertReportScheduleSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
      createdBy: user.id,
    });

    const schedule = await storage.createReportSchedule(validatedData);
    res.json(schedule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get all report schedules for organization
router.get("/schedules", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const filters: { isActive?: string } = {};
    if (req.query.isActive) filters.isActive = req.query.isActive as string;

    const schedules = await storage.getReportSchedules(context.organizationId, filters);
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific schedule
router.get("/schedules/:id", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const schedule = await storage.getReportSchedule(req.params.id, context.organizationId);
    
    if (!schedule) {
      return res.status(404).json({ error: "Report schedule not found" });
    }
    
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a report schedule
router.patch("/schedules/:id", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const updated = await storage.updateReportSchedule(
      req.params.id,
      context.organizationId,
      req.body
    );

    if (!updated) {
      return res.status(404).json({ error: "Report schedule not found" });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a report schedule
router.delete("/schedules/:id", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    await storage.deleteReportSchedule(req.params.id, context.organizationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== REPORT SHARES ======

// Share a report with a user
router.post("/templates/:id/shares", async (req, res) => {
  try {
    const user = req.dbUser as any;
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    // Verify the template belongs to this organization
    const template = await storage.getReportTemplate(req.params.id, context.organizationId);
    if (!template) {
      return res.status(404).json({ error: "Report template not found" });
    }
    
    const validatedData = insertReportShareSchema.parse({
      ...req.body,
      templateId: req.params.id,
      sharedBy: user.id,
    });

    const share = await storage.createReportShare(validatedData);
    res.json(share);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get all shares for a report
router.get("/templates/:id/shares", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const shares = await storage.getReportShares(req.params.id, context.organizationId);
    res.json(shares);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a share
router.delete("/templates/:templateId/shares/:userId", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(403).json({ error: "Organization context required" });
    }
    
    const result = await storage.deleteReportShare(req.params.templateId, req.params.userId, context.organizationId);
    if (!result) {
      return res.status(404).json({ error: "Report template not found or share does not exist" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
