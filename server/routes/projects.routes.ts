import type { Express } from "express";
import type { RouteDependencies } from "./deps";
import { getOrganizationContext } from "../clerkAuth";
import { createHubSpotService } from "../hubspot";
import { 
  insertProjectSchema, 
  updateProjectSchema, 
  insertDoorOpeningSchema,
  updateDoorOpeningSchema,
  insertHardwareItemSchema,
  updateHardwareItemSchema,
  insertAdditionalDoorItemSchema,
  updateAdditionalDoorItemSchema
} from "@shared/schema";
import { checkProjectLimit } from "../feature-gates";
import { handleValidationError } from "../utils/error-handler";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@shared/subscriptions";

/**
 * Projects Routes Module
 * Handles all project-related endpoints including:
 * - Basic CRUD operations
 * - Project duplication
 * - Openings management
 * - PDF exports & proposals
 * - Violations tracking
 * - Quote requests
 * - Purchase orders
 * - Hardware schedules
 * - Vendor quotes
 * - Cost tracking & calculations
 * - External service sync
 */
export async function registerProjectsRoutes(app: Express, deps: RouteDependencies) {
  const { storage, logError, logAuditEvent } = deps;

  // ============================================================================
  // BASIC PROJECT CRUD
  // ============================================================================

  // GET project usage stats for organization
  app.get("/api/projects/usage", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      const projects = await storage.getProjects(orgContext.organizationId);
      const currentCount = projects.length;
      
      // Get organization details to retrieve subscription tier
      const organization = await storage.getOrganization(orgContext.organizationId);
      const tier = (organization?.subscriptionTier as SubscriptionTier) || "free";
      const limit = SUBSCRIPTION_TIERS[tier]?.features.projectLimit ?? 3;
      
      res.json({
        current: currentCount,
        limit: limit,
        isUnlimited: limit === null,
        percentUsed: limit === null ? 0 : Math.round((currentCount / limit) * 100),
        remaining: limit === null ? null : Math.max(0, limit - currentCount),
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET all projects for organization
  app.get("/api/projects", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const projects = await storage.getProjects(orgContext.organizationId);
      res.json(projects);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET single project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST create new project
  app.post("/api/projects", checkProjectLimit, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext || !orgContext.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const data = insertProjectSchema.parse({ ...req.body, organizationId: orgContext.organizationId });
      const project = await storage.createProject(data);
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'project.created',
        'project',
        project.id,
        { projectName: project.name, customerId: project.customerId }
      );
      
      res.status(201).json(project);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PATCH update project
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      // Validate request body with updateProjectSchema
      const validatedData = updateProjectSchema.parse(req.body);
      const project = await storage.updateProject(req.params.id, orgContext.organizationId, validatedData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Get project details before deletion for audit log
      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      
      const success = await storage.deleteProject(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'project.deleted',
        'project',
        req.params.id,
        { projectName: project?.name, customerId: project?.customerId }
      );
      
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST duplicate project
  app.post("/api/projects/:id/duplicate", checkProjectLimit, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      // Get original project to use its name as default
      const original = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!original) {
        return res.status(404).json({ error: "Project not found" });
      }
      const options = {
        name: req.body.name || `${original.name} (Copy)`,
        customerId: req.body.customerId,
        quoteType: req.body.quoteType,
      };
      const duplicated = await storage.duplicateProject(req.params.id, orgContext.organizationId, options);
      res.json(duplicated);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // PROJECT OPENINGS
  // ============================================================================

  // GET openings for a specific project
  app.get("/api/projects/:id/openings", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Verify project belongs to user's organization
      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const openings = await storage.getOpeningsByProject(req.params.id);
      res.json(openings);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST create a new opening for a project
  app.post("/api/projects/:id/openings", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Verify project belongs to user's organization
      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Parse and validate opening data
      const data = insertDoorOpeningSchema.parse({ ...req.body, projectId: req.params.id });
      const opening = await storage.createOpening(data);
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'opening.created',
        'opening',
        opening.id,
        { openingNumber: opening.openingNumber, projectId: req.params.id }
      );
      
      res.status(201).json(opening);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET single opening by ID
  app.get("/api/openings/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      // Verify opening belongs to user's organization via project
      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }

      res.json(opening);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PATCH update opening
  app.patch("/api/openings/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate request body with updateDoorOpeningSchema
      const validatedData = updateDoorOpeningSchema.parse(req.body);
      const opening = await storage.updateOpening(req.params.id, orgContext.organizationId, validatedData);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      res.json(opening);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE opening
  app.delete("/api/openings/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteOpening(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Opening not found" });
      }

      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // HARDWARE ITEMS
  // ============================================================================

  // GET hardware items for a specific opening
  app.get("/api/openings/:id/hardware", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify opening belongs to user's organization via project
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const hardware = await storage.getHardwareItemsByOpening(req.params.id);
      res.json(hardware);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST create a new hardware item for an opening
  app.post("/api/openings/:id/hardware", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify opening belongs to user's organization via project
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }

      // Parse and validate hardware data
      const data = insertHardwareItemSchema.parse({ ...req.body, openingId: req.params.id });
      const hardware = await storage.createHardwareItem(data);

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'hardware.created',
        'hardware',
        hardware.id,
        { itemType: hardware.itemType, openingId: req.params.id }
      );

      res.status(201).json(hardware);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET single hardware item by ID
  app.get("/api/hardware/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const hardware = await storage.getHardwareItem(req.params.id);
      if (!hardware) {
        return res.status(404).json({ error: "Hardware not found" });
      }

      // Verify hardware belongs to user's organization via opening -> project
      const opening = await storage.getOpening(hardware.openingId);
      if (!opening) {
        return res.status(404).json({ error: "Hardware not found" });
      }

      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Hardware not found" });
      }

      res.json(hardware);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PATCH update hardware item
  app.patch("/api/hardware/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate request body with updateHardwareItemSchema
      const validatedData = updateHardwareItemSchema.parse(req.body);
      const hardware = await storage.updateHardwareItem(req.params.id, orgContext.organizationId, validatedData);
      if (!hardware) {
        return res.status(404).json({ error: "Hardware not found" });
      }

      res.json(hardware);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE hardware item
  app.delete("/api/hardware/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteHardwareItem(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Hardware not found" });
      }

      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // ADDITIONAL DOOR ITEMS
  // ============================================================================

  // GET additional items for a specific opening
  app.get("/api/openings/:id/additional-items", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify opening belongs to user's organization via project
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const items = await storage.getAdditionalDoorItems(req.params.id, orgContext.organizationId);
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST create a new additional item for an opening
  app.post("/api/openings/:id/additional-items", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify opening belongs to user's organization via project
      const opening = await storage.getOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ error: "Opening not found" });
      }

      const project = await storage.getProject(opening.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Opening not found" });
      }

      // Parse and validate additional item data
      const data = insertAdditionalDoorItemSchema.parse({ 
        ...req.body, 
        openingId: req.params.id,
        organizationId: orgContext.organizationId 
      });
      const item = await storage.createAdditionalDoorItem(data);

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'additional_item.created',
        'additional_item',
        item.id,
        { name: item.name, category: item.category, openingId: req.params.id }
      );

      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PATCH update additional item
  app.patch("/api/additional-items/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate request body with secure update schema (strict mode rejects org/opening IDs)
      const validatedData = updateAdditionalDoorItemSchema.parse(req.body);
      
      const item = await storage.updateAdditionalDoorItem(req.params.id, orgContext.organizationId, validatedData);
      if (!item) {
        return res.status(404).json({ error: "Additional item not found" });
      }

      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE additional item
  app.delete("/api/additional-items/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteAdditionalDoorItem(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Additional item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // PDF EXPORT & PROPOSALS
  // ============================================================================

  // GET PDF export for project
  app.get("/api/projects/:id/export-pdf", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {generateProjectPDF} = await import("../pdf-generator");
      const [project, doorOpenings, costs, disclaimers, organization] = await Promise.all([
        storage.getProject(req.params.id, orgContext.organizationId),
        storage.getOpeningsByProject(req.params.id),
        storage.getProjectCost(req.params.id),
        storage.getDisclaimers(),
        storage.getOrganization(orgContext.organizationId),
      ]);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const allPhotos = (await Promise.all(
        doorOpenings.map(o => storage.getPhotosByOpening(o.id))
      )).flat();

      const activeDisclaimers = disclaimers.filter(d => d.isActive === "yes");
      const pdfBuffer = await generateProjectPDF({
        project,
        doorOpenings,
        costs,
        disclaimers: activeDisclaimers,
        organization: organization || undefined,
        photos: allPhotos.length > 0 ? allPhotos : undefined,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${project.name.replace(/[^a-z0-9]/gi, '_')}-survey-${new Date().toISOString().split("T")[0]}.pdf`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'pdf-export' });
      res.status(500).json({ error: "PDF export failed" });
    }
  });

  // POST send project proposal via email
  app.post("/api/projects/:id/send-proposal", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {generateProjectPDF} = await import("../pdf-generator");
      const [project, doorOpenings, costs, disclaimers, organization] = await Promise.all([
        storage.getProject(req.params.id, orgContext.organizationId),
        storage.getOpeningsByProject(req.params.id),
        storage.getProjectCost(req.params.id),
        storage.getDisclaimers(),
        storage.getOrganization(orgContext.organizationId),
      ]);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      let customer;
      if (project.customerId) {
        customer = await storage.getCustomer(project.customerId, orgContext.organizationId);
      }

      const { recipientEmail, recipientName } = req.body;
      const customerEmail = recipientEmail || customer?.contactEmail;
      const customerName = recipientName || customer?.contactName || customer?.name || "Valued Customer";

      if (!customerEmail) {
        return res.status(400).json({ 
          error: "No recipient email provided. Please provide an email address or link the project to a customer with an email address." 
        });
      }

      const allPhotos = (await Promise.all(
        doorOpenings.map(o => storage.getPhotosByOpening(o.id))
      )).flat();

      const activeDisclaimers = disclaimers.filter(d => d.isActive === "yes");
      const pdfBuffer = await generateProjectPDF({
        project,
        doorOpenings,
        costs,
        disclaimers: activeDisclaimers,
        organization: organization || undefined,
        photos: allPhotos.length > 0 ? allPhotos : undefined,
      });

      const { emailService } = await import("../email-service");
      const result = await emailService.sendClientProposal({
        project,
        customerEmail,
        customerName,
        attachment: {
          filename: `${project.name.replace(/[^a-z0-9]/gi, '_')}-proposal.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      });

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ error: result.error || "Email send failed" });
      }
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'send-proposal' });
      res.status(500).json({ error: "Failed to send proposal" });
    }
  });

  // ============================================================================
  // COMPLIANCE & VIOLATIONS
  // ============================================================================

  // GET project violations
  app.get("/api/projects/:id/violations", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify project belongs to user's organization
      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const { getProjectViolations } = await import("../compliance-checker");
      const violations = await getProjectViolations(req.params.id);
      res.json(violations);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // QUOTE REQUESTS
  // ============================================================================

  // GET quote requests for project
  app.get("/api/projects/:projectId/quote-requests", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const quoteRequests = await storage.getQuoteRequests();
      const projectQuotes = quoteRequests.filter(q => q.projectId === req.params.projectId);
      res.json(projectQuotes);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // PURCHASE ORDERS
  // ============================================================================

  // GET purchase orders for project
  app.get("/api/projects/:projectId/purchase-orders", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const purchaseOrders = await storage.getPurchaseOrders();
      const projectPOs = purchaseOrders.filter(po => po.projectId === req.params.projectId);
      res.json(projectPOs);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // HARDWARE SCHEDULES
  // ============================================================================

  // GET hardware schedule Excel export
  app.get("/api/projects/:id/hardware-schedule/excel", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const ExcelJS = (await import("exceljs")).default;

      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const openings = await storage.getOpeningsByProject(req.params.id);
      const allHardware = await storage.getHardwareItems();
      const projectHardware = allHardware.filter(hw => 
        openings.some(o => o.id === hw.openingId)
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Hardware Schedule");

      worksheet.columns = [
        { header: "Opening #", key: "openingNumber", width: 12 },
        { header: "Location", key: "location", width: 20 },
        { header: "Hardware Type", key: "hardwareType", width: 20 },
        { header: "Manufacturer", key: "manufacturer", width: 20 },
        { header: "Model", key: "model", width: 20 },
        { header: "Finish", key: "finish", width: 15 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Unit Cost", key: "unitCost", width: 12 },
        { header: "Total Cost", key: "totalCost", width: 12 },
      ];

      for (const hardware of projectHardware) {
        const opening = openings.find(o => o.id === hardware.openingId);
        // Calculate net price from list price and discount
        const qty = Number(hardware.quantity) || 1;
        const listPrice = hardware.listPrice || 0;
        const discount = hardware.discountPercent || 0;
        const netPrice = listPrice * (1 - discount / 100);
        const totalCost = qty * netPrice;
        
        worksheet.addRow({
          openingNumber: opening?.openingNumber || "",
          location: opening?.location || "",
          hardwareType: hardware.itemType,
          manufacturer: hardware.manufacturer || "",
          model: hardware.model || "",
          finish: hardware.finish || "",
          quantity: qty,
          unitCost: netPrice,
          totalCost: totalCost,
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${project.name.replace(/[^a-z0-9]/gi, '_')}-hardware-${new Date().toISOString().split("T")[0]}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'hardware-excel-export' });
      res.status(500).json({ error: "Export failed" });
    }
  });

  // GET hardware schedule PDF export
  app.get("/api/projects/:id/hardware-schedule/pdf", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {generateHardwareSchedulePDF} = await import("../hardware-schedule-export");

      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const openings = await storage.getOpeningsByProject(req.params.id);
      const allHardware = await storage.getHardwareItems();
      const projectHardware = allHardware.filter(hw => 
        openings.some(o => o.id === hw.openingId)
      );

      const pdfBuffer = await generateHardwareSchedulePDF({
        project,
        openings,
        hardware: projectHardware,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${project.name.replace(/[^a-z0-9]/gi, '_')}-hardware-${new Date().toISOString().split("T")[0]}.pdf`
      );
      res.send(pdfBuffer);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'hardware-pdf-export' });
      res.status(500).json({ error: "Export failed" });
    }
  });

  // ============================================================================
  // VENDOR QUOTES
  // ============================================================================

  // GET vendor quotes for project
  app.get("/api/projects/:projectId/vendor-quotes", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const vendorQuotes = await storage.getVendorQuotes();
      const projectQuotes = vendorQuotes.filter(q => q.projectId === req.params.projectId);
      res.json(projectQuotes);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // PROJECT COSTS
  // ============================================================================

  // GET project costs
  app.get("/api/projects/:projectId/costs", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const cost = await storage.getProjectCost(req.params.projectId);
      if (!cost) {
        return res.json({
          projectId: req.params.projectId,
          baselineTravelOverhead: 0,
          baselineProcurementOverhead: 0,
          baselineReviewLaborOverhead: 0,
          pmHours: 0,
          pmHourlyRate: 0,
          engineeringHours: 0,
          engineeringHourlyRate: 0,
          surveyHours: 0,
          surveyHourlyRate: 0,
          overheadCost: 0,
          travelTime: 0,
          travelRate: 0,
          initialVisitCost: 0,
          expeditedCost: 0,
          subcontractorCost: 0,
          marginPercent: 0,
          discountPercent: 0,
          surchargePercent: 0,
          materialFuelCharge: 0,
          handlingFee: 0,
          programmingTestingLabelingFee: 0,
          firePreventionInspectionFee: 0,
          fireRelabelingInspectionFee: 0,
          disposalFee: 0,
          consumableAllowance: 0,
          consumableNotes: "",
          notes: "",
        });
      }
      res.json(cost);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST create project costs
  app.post("/api/projects/:projectId/costs", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(403).json({ error: "Cannot create costs for project not in your organization" });
      }

      const { insertProjectCostSchema } = await import("@shared/schema");
      const validatedData = insertProjectCostSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
      });
      const cost = await storage.createProjectCost(validatedData);
      res.status(201).json(cost);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PATCH update project costs
  app.patch("/api/projects/:projectId/costs", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const cost = await storage.updateProjectCost(req.params.projectId, req.body);
      if (!cost) {
        const { insertProjectCostSchema } = await import("@shared/schema");
        const validatedData = insertProjectCostSchema.parse({
          ...req.body,
          projectId: req.params.projectId,
        });
        const newCost = await storage.createProjectCost(validatedData);
        return res.status(201).json(newCost);
      }
      res.json(cost);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE project costs
  app.delete("/api/projects/:projectId/costs", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const deleted = await storage.deleteProjectCost(req.params.projectId);
      if (!deleted) {
        return res.status(404).json({ error: "Project cost not found" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST calculate project costs from openings
  app.post("/api/projects/:projectId/calculate-costs", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { ProjectEstimator } = await import('../estimators/ProjectEstimator');

      const [project, openings] = await Promise.all([
        storage.getProject(req.params.projectId, orgContext.organizationId),
        storage.getOpeningsByProject(req.params.projectId),
      ]);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const openingIds = openings.map((o: any) => o.id);
      const allHardware = await storage.getHardwareItems();
      const hardwareItems = allHardware.filter((hw: any) => openingIds.includes(hw.openingId));

      // Calculate total hardware prices
      const hardwareListPrice = hardwareItems.reduce((sum: number, hw: any) => {
        return sum + ((hw.listPrice || 0) * (Number(hw.quantity) || 1));
      }, 0);

      const hardwareNetPrice = hardwareItems.reduce((sum: number, hw: any) => {
        const listPrice = hw.listPrice || 0;
        const discount = hw.discountPercent || 0;
        const netPrice = listPrice * (1 - discount / 100);
        return sum + (netPrice * (Number(hw.quantity) || 1));
      }, 0);

      // Build estimation context
      const estimationContext = {
        openingCount: openings.length,
        hardwareItemCount: hardwareItems.length,
        hardwareListPrice,
        hardwareNetPrice,
        buildingType: project.buildingType || undefined,
        location: project.location || undefined,
      };

      // Generate project estimate
      const estimate = ProjectEstimator.estimateProject(estimationContext);

      res.json({
        totalInstallationHours: estimate.labor.totalHours,
        estimatedDays: estimate.labor.estimatedDays,
        estimatedTechnicians: estimate.labor.estimatedTechnicians,
        materialCost: estimate.materials.customerCost,
        laborCost: estimate.labor.customerCost,
        freightCost: estimate.freight.customerCost,
        subtotal: estimate.subtotal,
        profitMargin: estimate.profitAmount,
        totalCost: estimate.totalCost,
        breakdown: estimate,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'calculate-costs' });
      res.status(500).json({ error: "Cost calculation failed" });
    }
  });

  // ============================================================================
  // EXTERNAL SERVICE SYNC
  // ============================================================================

  // POST sync project with external service
  app.post("/api/projects/:projectId/sync/:service", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const service = req.params.service;
      
      if (service === "hubspot") {
        const hubspotService = await createHubSpotService(orgContext.organizationId);
        
        if (!hubspotService.isConfigured()) {
          return res.status(400).json({ 
            success: false, 
            message: "HubSpot integration not configured. Add your API key in Integrations settings." 
          });
        }

        const cost = await storage.getProjectCost(project.id);
        const totalCost = cost ? hubspotService.calculateTotalCost({
          ...cost, travelHours: cost.travelTime, travelHourlyRate: cost.travelRate,
          expeditedDeliveryCost: cost.expeditedCost,
        }) : undefined;
        const result = await hubspotService.syncProject({ ...project, totalCost });

        return res.json({ 
          success: true,
          message: `Project synced with ${service}`,
          projectId: req.params.projectId,
          hubspotId: result.id
        });
      }

      res.status(400).json({ 
        success: false,
        message: `Sync for ${service} is not yet configured.`,
        projectId: req.params.projectId,
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'project-sync' });
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // ============================================================================
  // PROJECT DUPLICATION & COST UPDATES
  // ============================================================================

  // POST duplicate project for another customer
  app.post("/api/projects/:id/duplicate", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const sourceProject = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!sourceProject) {
        return res.status(404).json({ error: "Source project not found" });
      }

      const { customerId, name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Project name is required" });
      }

      // Duplicate the project
      const duplicatedProject = await storage.duplicateProject(
        req.params.id,
        orgContext.organizationId,
        {
          customerId: customerId || sourceProject.customerId,
          name,
          quoteType: req.body.quoteType || sourceProject.quoteType,
        }
      );

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'project.duplicated',
        'project',
        duplicatedProject.id,
        { sourceProjectId: req.params.id, newProjectName: name }
      );

      res.status(201).json(duplicatedProject);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'duplicate-project' });
      res.status(500).json({ error: "Project duplication failed" });
    }
  });

  // POST update costs for outdated quote
  app.post("/api/projects/:id/update-costs", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const summary = await storage.updateProjectHardwareCosts(req.params.id, orgContext.organizationId);
      res.json(summary);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'update-costs' });
      res.status(500).json({ error: "Cost update failed" });
    }
  });

  // ============================================================================
  // PROJECT VERSIONING
  // ============================================================================

  // POST save new version snapshot
  app.post("/api/projects/:id/versions", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const { versionName } = req.body;
      
      // Create version snapshot
      const version = await storage.createProjectVersion(
        req.params.id,
        versionName || `Version ${new Date().toLocaleString()}`,
        orgContext.userId
      );

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'project.version_created',
        'project',
        req.params.id,
        { versionNumber: version.versionNumber, versionName: version.versionName }
      );

      res.status(201).json(version);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'create-version' });
      res.status(500).json({ error: "Version creation failed" });
    }
  });

  // GET all versions for a project
  app.get("/api/projects/:id/versions", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const versions = await storage.getProjectVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'get-versions' });
      res.status(500).json({ error: "Failed to retrieve versions" });
    }
  });

  // POST restore from version
  app.post("/api/projects/:id/versions/:versionId/restore", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.id, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Restore project from version
      await storage.restoreProjectVersion(req.params.id, req.params.versionId);

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'project.version_restored',
        'project',
        req.params.id,
        { versionId: req.params.versionId }
      );

      res.json({ 
        success: true,
        message: "Project restored from version successfully"
      });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { context: 'restore-version' });
      res.status(500).json({ error: "Version restore failed" });
    }
  });
}
