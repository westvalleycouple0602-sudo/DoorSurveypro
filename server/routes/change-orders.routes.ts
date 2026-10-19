import type { Express } from "express";
import type { RouteDependencies } from "./deps";
import { getOrganizationContext } from "../clerkAuth";
import { insertChangeOrderSchema, insertChangeOrderItemSchema } from "@shared/schema";
import { handleValidationError } from "../utils/error-handler";

/**
 * Change Orders Routes Module
 * Handles all change order endpoints including:
 * - Change order CRUD
 * - Change order items management
 * - Approval workflow
 * - Payment integration
 */
export async function registerChangeOrdersRoutes(app: Express, deps: RouteDependencies) {
  const { storage, logError, logAuditEvent } = deps;

  // ============================================================================
  // CHANGE ORDERS
  // ============================================================================

  // GET all change orders for organization
  app.get("/api/change-orders", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const changeOrders = await storage.getChangeOrders(orgContext.organizationId);
      res.json(changeOrders);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET change orders for a specific project
  app.get("/api/projects/:projectId/change-orders", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const changeOrders = await storage.getChangeOrdersByProject(
        req.params.projectId,
        orgContext.organizationId
      );
      res.json(changeOrders);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET single change order by ID
  app.get("/api/change-orders/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const changeOrder = await storage.getChangeOrder(req.params.id, orgContext.organizationId);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }
      res.json(changeOrder);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST create new change order
  app.post("/api/change-orders", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext || !orgContext.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Verify project belongs to organization
      const project = await storage.getProject(req.body.projectId, orgContext.organizationId);
      if (!project) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      // Generate next change order number
      const changeOrderNumber = await storage.generateNextChangeOrderNumber(req.body.projectId, orgContext.organizationId);
      
      const data = insertChangeOrderSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId,
        changeOrderNumber,
        createdBy: req.identity?.email || orgContext.userId,
      });
      
      const changeOrder = await storage.createChangeOrder(data);
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'change_order.created',
        'change_order',
        changeOrder.id,
        { 
          projectId: changeOrder.projectId,
          changeOrderNumber: changeOrder.changeOrderNumber,
          title: changeOrder.title
        }
      );
      
      res.status(201).json(changeOrder);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PATCH update change order
  app.patch("/api/change-orders/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      const changeOrder = await storage.updateChangeOrder(
        req.params.id,
        orgContext.organizationId,
        req.body
      );
      
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }
      
      res.json(changeOrder);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST submit change order for review
  app.post("/api/change-orders/:id/submit", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      const changeOrder = await storage.updateChangeOrder(
        req.params.id,
        orgContext.organizationId,
        {
          status: "pending_review",
          reviewStatus: "pending",
        }
      );
      
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'change_order.submitted',
        'change_order',
        changeOrder.id,
        { changeOrderNumber: changeOrder.changeOrderNumber }
      );
      
      res.json(changeOrder);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST approve change order (engineering review)
  app.post("/api/change-orders/:id/approve", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      const { reviewNotes } = req.body;
      
      const changeOrder = await storage.updateChangeOrder(
        req.params.id,
        orgContext.organizationId,
        {
          reviewStatus: "approved",
          reviewedBy: req.identity?.email || orgContext.userId,
          reviewedAt: new Date(),
          reviewNotes,
        }
      );
      
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'change_order.approved',
        'change_order',
        changeOrder.id,
        { changeOrderNumber: changeOrder.changeOrderNumber, reviewedBy: req.identity?.email }
      );
      
      res.json(changeOrder);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST reject change order
  app.post("/api/change-orders/:id/reject", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      const { reviewNotes } = req.body;
      
      const changeOrder = await storage.updateChangeOrder(
        req.params.id,
        orgContext.organizationId,
        {
          status: "rejected",
          reviewStatus: "rejected",
          reviewedBy: req.identity?.email || orgContext.userId,
          reviewedAt: new Date(),
          reviewNotes,
        }
      );
      
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'change_order.rejected',
        'change_order',
        changeOrder.id,
        { changeOrderNumber: changeOrder.changeOrderNumber, reviewedBy: req.identity?.email }
      );
      
      res.json(changeOrder);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST customer approve change order
  app.post("/api/change-orders/:id/customer-approve", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      const { customerApprovalNotes } = req.body;
      
      const changeOrder = await storage.updateChangeOrder(
        req.params.id,
        orgContext.organizationId,
        {
          status: "approved",
          customerApprovalStatus: "approved",
          customerApprovedBy: req.identity?.email || orgContext.userId,
          customerApprovedAt: new Date(),
          customerApprovalNotes,
          approvedAt: new Date(),
        }
      );
      
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'change_order.customer_approved',
        'change_order',
        changeOrder.id,
        { changeOrderNumber: changeOrder.changeOrderNumber, customerApprovedBy: req.identity?.email }
      );
      
      res.json(changeOrder);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE change order
  app.delete("/api/change-orders/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Get change order details before deletion for audit log
      const changeOrder = await storage.getChangeOrder(req.params.id, orgContext.organizationId);
      
      const success = await storage.deleteChangeOrder(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Change order not found" });
      }
      
      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'change_order.deleted',
        'change_order',
        req.params.id,
        { changeOrderNumber: changeOrder?.changeOrderNumber }
      );
      
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // CHANGE ORDER ITEMS
  // ============================================================================

  // GET items for a change order
  app.get("/api/change-orders/:id/items", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Verify change order belongs to organization
      const changeOrder = await storage.getChangeOrder(req.params.id, orgContext.organizationId);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }
      
      const items = await storage.getChangeOrderItems(req.params.id);
      res.json(items);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST create change order item
  app.post("/api/change-orders/:id/items", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Verify change order belongs to organization
      const changeOrder = await storage.getChangeOrder(req.params.id, orgContext.organizationId);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }
      
      const data = insertChangeOrderItemSchema.parse({
        ...req.body,
        changeOrderId: req.params.id,
      });
      
      const item = await storage.createChangeOrderItem(data);
      res.status(201).json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PATCH update change order item
  app.patch("/api/change-order-items/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Update with organization scoping enforced at storage layer
      const item = await storage.updateChangeOrderItem(req.params.id, orgContext.organizationId, req.body);
      if (!item) {
        return res.status(404).json({ error: "Change order item not found or access denied" });
      }
      res.json(item);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE change order item
  app.delete("/api/change-order-items/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Delete with organization scoping enforced at storage layer
      const success = await storage.deleteChangeOrderItem(req.params.id, orgContext.organizationId);
      if (!success) {
        return res.status(404).json({ error: "Change order item not found or access denied" });
      }
      res.json({ success: true });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
}
