import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth as isAuthenticated, getOrganizationContext } from "../clerkAuth";
import { quoteService } from "../services/quote.service";
import { quotes, quoteDeliveryEvents } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { RouteDependencies } from "./deps";
import { requireOrgAccess } from "../middleware/validateOrg";

const router = Router();

const createQuoteSchema = z.object({
  projectId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerCompany: z.string().optional(),
  introduction: z.string().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  validDays: z.number().int().min(1).max(365).optional(),
  lineItems: z.array(z.object({
    category: z.string().optional(),
    description: z.string(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().int().min(0),
    doorOpeningId: z.string().uuid().optional(),
    isRequired: z.boolean().optional(),
    isOptional: z.boolean().optional(),
    customerCanRemove: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    notes: z.string().optional(),
  })),
  optionGroups: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    selectionType: z.enum(["single", "multi"]),
    isRequired: z.boolean().optional(),
    minSelections: z.number().int().optional(),
    maxSelections: z.number().int().optional(),
    helpText: z.string().optional(),
    sortOrder: z.number().int().optional(),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
      priceAdjustment: z.number().int().optional(),
      priceAdjustmentType: z.enum(["fixed", "percentage"]).optional(),
      imageUrl: z.string().url().optional(),
      swatchColor: z.string().max(7).optional(),
      isDefault: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    })),
  })).optional(),
});

const sendQuoteSchema = z.object({
  channel: z.enum(["email", "portal", "docusign"]),
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  message: z.string().optional(),
  attachPdf: z.boolean().optional(),
});

export function createQuoteDeliveryRoutes(deps: RouteDependencies): Router {
  const { logError, logAuditEvent } = deps;

  router.post("/quotes", isAuthenticated, requireOrgAccess, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context required" });
      }

      const result = createQuoteSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: result.error.issues 
        });
      }

      const { lineItems, optionGroups, ...quoteData } = result.data;

      const quote = await quoteService.createQuoteDraft(
        {
          organizationId: orgContext.organizationId,
          createdBy: orgContext.userId,
          ...quoteData,
        },
        lineItems,
        optionGroups || []
      );

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "create",
        "quote",
        quote.id,
        { projectId: quoteData.projectId }
      );

      res.status(201).json(quote);
    } catch (error) {
      logError(error as Error, { context: "create-quote" });
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  router.get("/quotes", isAuthenticated, requireOrgAccess, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context required" });
      }

      const { projectId } = req.query;
      
      if (projectId && typeof projectId === "string") {
        const projectQuotes = await quoteService.getQuotesForProject(projectId, orgContext.organizationId);
        return res.json(projectQuotes);
      }

      const allQuotes = await db
        .select()
        .from(quotes)
        .where(eq(quotes.organizationId, orgContext.organizationId))
        .orderBy(desc(quotes.createdAt));

      res.json(allQuotes);
    } catch (error) {
      logError(error as Error, { context: "list-quotes" });
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  router.get("/quotes/:id", isAuthenticated, requireOrgAccess, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context required" });
      }

      const quote = await quoteService.getQuoteById(req.params.id, orgContext.organizationId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const totals = await quoteService.calculateQuoteTotal(quote.id, orgContext.organizationId);

      res.json({ ...quote, calculatedTotals: totals });
    } catch (error) {
      logError(error as Error, { context: "get-quote" });
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  router.post("/quotes/:id/send", isAuthenticated, requireOrgAccess, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context required" });
      }

      const result = sendQuoteSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: result.error.issues 
        });
      }

      const deliveryEvent = await quoteService.sendQuote(
        req.params.id,
        orgContext.organizationId,
        {
          ...result.data,
          sentBy: orgContext.userId,
        }
      );

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "send",
        "quote",
        req.params.id,
        { channel: result.data.channel, recipientEmail: result.data.recipientEmail }
      );

      res.json(deliveryEvent);
    } catch (error) {
      logError(error as Error, { context: "send-quote" });
      const message = error instanceof Error ? error.message : "Failed to send quote";
      res.status(500).json({ error: message });
    }
  });

  router.get("/quotes/:id/delivery-events", isAuthenticated, requireOrgAccess, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context required" });
      }

      const events = await db
        .select()
        .from(quoteDeliveryEvents)
        .where(
          and(
            eq(quoteDeliveryEvents.quoteId, req.params.id),
            eq(quoteDeliveryEvents.organizationId, orgContext.organizationId)
          )
        )
        .orderBy(desc(quoteDeliveryEvents.createdAt));

      res.json(events);
    } catch (error) {
      logError(error as Error, { context: "get-delivery-events" });
      res.status(500).json({ error: "Failed to fetch delivery events" });
    }
  });

  router.post("/quotes/:id/duplicate", isAuthenticated, requireOrgAccess, async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context required" });
      }

      const originalQuote = await quoteService.getQuoteById(req.params.id, orgContext.organizationId);
      if (!originalQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const newQuote = await quoteService.createQuoteDraft(
        {
          organizationId: orgContext.organizationId,
          projectId: originalQuote.projectId,
          customerId: originalQuote.customerId || undefined,
          customerName: originalQuote.customerName || undefined,
          customerEmail: originalQuote.customerEmail || undefined,
          customerPhone: originalQuote.customerPhone || undefined,
          customerCompany: originalQuote.customerCompany || undefined,
          introduction: originalQuote.introduction || undefined,
          notes: originalQuote.notes || undefined,
          termsAndConditions: originalQuote.termsAndConditions || undefined,
          validDays: originalQuote.validDays || 30,
          createdBy: orgContext.userId,
        },
        originalQuote.lineItems.map(item => ({
          category: item.category || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          doorOpeningId: item.doorOpeningId || undefined,
          isRequired: item.isRequired,
          isOptional: item.isOptional,
          customerCanRemove: item.customerCanRemove,
          sortOrder: item.sortOrder || undefined,
          notes: item.notes || undefined,
        })),
        originalQuote.optionGroups.map(group => ({
          name: group.name,
          description: group.description || undefined,
          category: group.category || undefined,
          selectionType: group.selectionType as "single" | "multi",
          isRequired: group.isRequired,
          minSelections: group.minSelections || undefined,
          maxSelections: group.maxSelections || undefined,
          helpText: group.helpText || undefined,
          sortOrder: group.sortOrder || undefined,
          options: group.options.map(option => ({
            label: option.label,
            value: option.value,
            description: option.description || undefined,
            priceAdjustment: option.priceAdjustment || undefined,
            priceAdjustmentType: (option.priceAdjustmentType as "fixed" | "percentage") || undefined,
            imageUrl: option.imageUrl || undefined,
            swatchColor: option.swatchColor || undefined,
            isDefault: option.isDefault,
            sortOrder: option.sortOrder || undefined,
          })),
        }))
      );

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "duplicate",
        "quote",
        newQuote.id,
        { originalQuoteId: req.params.id }
      );

      res.status(201).json(newQuote);
    } catch (error) {
      logError(error as Error, { context: "duplicate-quote" });
      res.status(500).json({ error: "Failed to duplicate quote" });
    }
  });

  return router;
}

export default router;
