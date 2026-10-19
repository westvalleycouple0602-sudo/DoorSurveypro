import { db } from "../db";
import {
  quotes,
  quoteLineItems,
  quoteOptionGroups,
  quoteOptions,
  quoteSelections,
  quoteDeliveryEvents,
  quoteApprovals,
  quoteComments,
  portalShares,
  projects,
  type Quote,
  type QuoteLineItem,
  type QuoteOptionGroup,
  type QuoteOption,
  type QuoteSelection,
  type QuoteDeliveryEvent,
  type QuoteApproval,
  type QuoteComment,
  type InsertQuote,
  type InsertQuoteLineItem,
  type InsertQuoteOptionGroup,
  type InsertQuoteOption,
  type InsertQuoteSelection,
  type InsertQuoteDeliveryEvent,
  type InsertQuoteApproval,
  type InsertQuoteComment,
} from "@shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { createPortalShare } from "./portal-share.service";
import { logger } from "../logger";
import { emailService } from "../email-service";

interface CreateQuoteData {
  organizationId: string;
  projectId: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  introduction?: string;
  notes?: string;
  termsAndConditions?: string;
  validDays?: number;
  createdBy: string;
}

interface CreateQuoteLineItemData {
  category?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  doorOpeningId?: string;
  isRequired?: boolean;
  isOptional?: boolean;
  customerCanRemove?: boolean;
  sortOrder?: number;
  notes?: string;
}

interface CreateOptionGroupData {
  name: string;
  description?: string;
  category?: string;
  selectionType: "single" | "multi";
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  helpText?: string;
  sortOrder?: number;
  options: CreateOptionData[];
}

interface CreateOptionData {
  label: string;
  value: string;
  description?: string;
  priceAdjustment?: number;
  priceAdjustmentType?: "fixed" | "percentage";
  imageUrl?: string;
  swatchColor?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

interface QuoteWithDetails extends Quote {
  lineItems: QuoteLineItem[];
  optionGroups: (QuoteOptionGroup & { options: QuoteOption[] })[];
  selections: QuoteSelection[];
  deliveryEvents: QuoteDeliveryEvent[];
  approvals: QuoteApproval[];
  comments: QuoteComment[];
}

interface SendQuoteOptions {
  channel: "email" | "portal" | "docusign";
  recipientEmail: string;
  recipientName: string;
  message?: string;
  attachPdf?: boolean;
  sentBy: string;
}

/**
 * Generate a unique quote number for the organization
 */
async function generateQuoteNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  
  // Get the highest existing quote number for this org/year
  const existingQuotes = await db
    .select({ quoteNumber: quotes.quoteNumber })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        sql`${quotes.quoteNumber} LIKE ${prefix + '%'}`
      )
    )
    .orderBy(desc(quotes.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (existingQuotes.length > 0) {
    const lastNumber = existingQuotes[0].quoteNumber.replace(prefix, '');
    const parsed = parseInt(lastNumber, 10);
    if (!isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Create a new quote draft
 */
export async function createQuoteDraft(
  data: CreateQuoteData,
  lineItems: CreateQuoteLineItemData[],
  optionGroups: CreateOptionGroupData[] = []
): Promise<QuoteWithDetails> {
  const quoteNumber = await generateQuoteNumber(data.organizationId);
  
  // Calculate validity
  const validDays = data.validDays || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validDays);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.unitPrice * item.quantity);
  }, 0);

  // Create quote
  const [quote] = await db.insert(quotes).values({
    organizationId: data.organizationId,
    projectId: data.projectId,
    customerId: data.customerId,
    quoteNumber,
    version: 1,
    status: "draft",
    subtotal,
    total: subtotal, // Tax can be added later
    validDays,
    expiresAt,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    customerCompany: data.customerCompany,
    introduction: data.introduction,
    notes: data.notes,
    termsAndConditions: data.termsAndConditions,
    createdBy: data.createdBy,
  }).returning();

  // Create line items
  const createdLineItems: QuoteLineItem[] = [];
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    const [createdItem] = await db.insert(quoteLineItems).values({
      quoteId: quote.id,
      organizationId: data.organizationId,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * item.quantity,
      doorOpeningId: item.doorOpeningId,
      isRequired: item.isRequired ?? true,
      isOptional: item.isOptional ?? false,
      customerCanRemove: item.customerCanRemove ?? false,
      sortOrder: item.sortOrder ?? i,
      notes: item.notes,
    }).returning();
    createdLineItems.push(createdItem);
  }

  // Create option groups and options
  const createdOptionGroups: (QuoteOptionGroup & { options: QuoteOption[] })[] = [];
  for (let i = 0; i < optionGroups.length; i++) {
    const group = optionGroups[i];
    const [createdGroup] = await db.insert(quoteOptionGroups).values({
      quoteId: quote.id,
      organizationId: data.organizationId,
      name: group.name,
      description: group.description,
      category: group.category,
      selectionType: group.selectionType,
      isRequired: group.isRequired ?? true,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      helpText: group.helpText,
      sortOrder: group.sortOrder ?? i,
    }).returning();

    // Create options
    const createdOptions: QuoteOption[] = [];
    for (let j = 0; j < group.options.length; j++) {
      const option = group.options[j];
      const [createdOption] = await db.insert(quoteOptions).values({
        optionGroupId: createdGroup.id,
        organizationId: data.organizationId,
        label: option.label,
        value: option.value,
        description: option.description,
        priceAdjustment: option.priceAdjustment ?? 0,
        priceAdjustmentType: option.priceAdjustmentType ?? "fixed",
        imageUrl: option.imageUrl,
        swatchColor: option.swatchColor,
        isDefault: option.isDefault ?? false,
        sortOrder: option.sortOrder ?? j,
      }).returning();
      createdOptions.push(createdOption);

      // If default, create a selection
      if (option.isDefault) {
        await db.insert(quoteSelections).values({
          quoteId: quote.id,
          optionGroupId: createdGroup.id,
          optionId: createdOption.id,
          organizationId: data.organizationId,
        });
      }
    }

    createdOptionGroups.push({ ...createdGroup, options: createdOptions });
  }

  return {
    ...quote,
    lineItems: createdLineItems,
    optionGroups: createdOptionGroups,
    selections: [],
    deliveryEvents: [],
    approvals: [],
    comments: [],
  };
}

/**
 * Get quote by ID with all details
 */
export async function getQuoteById(
  quoteId: string,
  organizationId: string
): Promise<QuoteWithDetails | null> {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!quote) return null;

  // Get line items
  const lineItems = await db
    .select()
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, quoteId))
    .orderBy(quoteLineItems.sortOrder);

  // Get option groups with options
  const groups = await db
    .select()
    .from(quoteOptionGroups)
    .where(eq(quoteOptionGroups.quoteId, quoteId))
    .orderBy(quoteOptionGroups.sortOrder);

  const optionGroups = await Promise.all(
    groups.map(async (group) => {
      const options = await db
        .select()
        .from(quoteOptions)
        .where(eq(quoteOptions.optionGroupId, group.id))
        .orderBy(quoteOptions.sortOrder);
      return { ...group, options };
    })
  );

  // Get selections
  const selections = await db
    .select()
    .from(quoteSelections)
    .where(eq(quoteSelections.quoteId, quoteId));

  // Get delivery events
  const deliveryEvents = await db
    .select()
    .from(quoteDeliveryEvents)
    .where(eq(quoteDeliveryEvents.quoteId, quoteId))
    .orderBy(desc(quoteDeliveryEvents.createdAt));

  // Get approvals
  const approvals = await db
    .select()
    .from(quoteApprovals)
    .where(eq(quoteApprovals.quoteId, quoteId))
    .orderBy(desc(quoteApprovals.createdAt));

  // Get comments
  const comments = await db
    .select()
    .from(quoteComments)
    .where(eq(quoteComments.quoteId, quoteId))
    .orderBy(quoteComments.createdAt);

  return {
    ...quote,
    lineItems,
    optionGroups,
    selections,
    deliveryEvents,
    approvals,
    comments,
  };
}

/**
 * Get quotes for a project
 */
export async function getQuotesForProject(
  projectId: string,
  organizationId: string
): Promise<Quote[]> {
  return db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.projectId, projectId),
        eq(quotes.organizationId, organizationId)
      )
    )
    .orderBy(desc(quotes.createdAt));
}

/**
 * Update quote selections
 */
export async function updateQuoteSelections(
  quoteId: string,
  organizationId: string,
  selectedOptionIds: string[],
  portalUserId?: string,
  userId?: string
): Promise<{ selections: QuoteSelection[]; adjustedTotal: number }> {
  // Verify quote access
  const quote = await getQuoteById(quoteId, organizationId);
  if (!quote) {
    throw new Error("Quote not found");
  }

  // Cannot modify selections on approved/rejected quotes
  if (quote.status === "approved" || quote.status === "rejected") {
    throw new Error("Cannot modify selections on finalized quotes");
  }

  // Get valid option IDs for this quote
  const validOptions = await db
    .select({ id: quoteOptions.id, optionGroupId: quoteOptions.optionGroupId })
    .from(quoteOptions)
    .innerJoin(quoteOptionGroups, eq(quoteOptions.optionGroupId, quoteOptionGroups.id))
    .where(eq(quoteOptionGroups.quoteId, quoteId));

  const validOptionMap = new Map(validOptions.map(o => [o.id, o.optionGroupId]));

  // Validate all selected options belong to this quote
  for (const optionId of selectedOptionIds) {
    if (!validOptionMap.has(optionId)) {
      throw new Error(`Invalid option: ${optionId}`);
    }
  }

  // Delete existing selections
  await db.delete(quoteSelections).where(eq(quoteSelections.quoteId, quoteId));

  // Create new selections
  const newSelections: QuoteSelection[] = [];
  for (const optionId of selectedOptionIds) {
    const optionGroupId = validOptionMap.get(optionId)!;
    const [selection] = await db.insert(quoteSelections).values({
      quoteId,
      optionGroupId,
      optionId,
      organizationId,
      portalUserId,
      userId,
    }).returning();
    newSelections.push(selection);
  }

  // Calculate adjusted total
  const selectedOptionDetails = await db
    .select()
    .from(quoteOptions)
    .where(inArray(quoteOptions.id, selectedOptionIds));

  let adjustment = 0;
  for (const option of selectedOptionDetails) {
    if (option.priceAdjustmentType === "fixed") {
      adjustment += option.priceAdjustment || 0;
    } else if (option.priceAdjustmentType === "percentage") {
      adjustment += Math.round((quote.subtotal * (option.priceAdjustment || 0)) / 10000);
    }
  }

  const adjustedTotal = quote.subtotal + adjustment;

  // Update quote viewed status if this is a customer selection
  if (portalUserId && quote.status === "sent") {
    await db.update(quotes)
      .set({ 
        status: "viewed", 
        viewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(quotes.id, quoteId));
  }

  return { selections: newSelections, adjustedTotal };
}

/**
 * Send quote to customer
 */
export async function sendQuote(
  quoteId: string,
  organizationId: string,
  options: SendQuoteOptions
): Promise<QuoteDeliveryEvent> {
  const quote = await getQuoteById(quoteId, organizationId);
  if (!quote) {
    throw new Error("Quote not found");
  }

  if (quote.status !== "draft" && quote.status !== "sent") {
    throw new Error("Can only send draft or previously sent quotes");
  }

  let deliveryEvent: QuoteDeliveryEvent;
  const now = new Date();

  if (options.channel === "email") {
    // Send via email
    try {
      const viewLink = `${process.env.APP_URL || 'https://doorsurvepro.com'}/client-portal/quotes/${quote.id}`;
      const expiresDate = quote.expiresAt?.toLocaleDateString() || 'N/A';
      const totalFormatted = (quote.total / 100).toFixed(2);
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Quote ${quote.quoteNumber}</h2>
          <p>Dear ${options.recipientName},</p>
          ${options.message ? `<p>${options.message}</p>` : ''}
          <p>You have received a new quote for your review:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Quote Number</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${quote.quoteNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Total</td>
              <td style="padding: 10px; border: 1px solid #ddd;">$${totalFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Valid Until</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${expiresDate}</td>
            </tr>
          </table>
          <p>
            <a href="${viewLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
              View Quote
            </a>
          </p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
      `;
      
      const result = await emailService.sendEmail({
        to: options.recipientEmail,
        subject: `Quote ${quote.quoteNumber} from DoorSurvey Pro`,
        html,
      });

      const [event] = await db.insert(quoteDeliveryEvents).values({
        quoteId,
        organizationId,
        channel: "email",
        status: "sent",
        recipientEmail: options.recipientEmail,
        recipientName: options.recipientName,
        emailMessageId: result?.messageId,
        sentBy: options.sentBy,
        metadata: { message: options.message },
      }).returning();
      
      deliveryEvent = event;
    } catch (error) {
      logger.error("Failed to send quote email", { error, quoteId });
      
      const [event] = await db.insert(quoteDeliveryEvents).values({
        quoteId,
        organizationId,
        channel: "email",
        status: "failed",
        recipientEmail: options.recipientEmail,
        recipientName: options.recipientName,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        sentBy: options.sentBy,
      }).returning();
      
      throw error;
    }
  } else if (options.channel === "portal") {
    // Create portal share for this quote
    const { share, token } = await createPortalShare({
      organizationId,
      projectId: quote.projectId,
      accessLevel: "approve",
      clientName: options.recipientName,
      clientEmail: options.recipientEmail,
      createdBy: options.sentBy,
      expiresAt: quote.expiresAt || undefined,
    });

    // Update quote with portal share
    await db.update(quotes)
      .set({ portalShareId: share.id })
      .where(eq(quotes.id, quoteId));

    // Send portal link via email
    const portalLink = `${process.env.APP_URL || 'https://doorsurvepro.com'}/client-portal/share/${token}?quoteId=${quoteId}`;
    const totalFormatted = (quote.total / 100).toFixed(2);
    const expiresDate = quote.expiresAt?.toLocaleDateString() || 'N/A';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Quote Ready for Review</h2>
        <p>Dear ${options.recipientName},</p>
        ${options.message ? `<p>${options.message}</p>` : ''}
        <p>You have a new quote to review and approve:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Quote Number</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${quote.quoteNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Total</td>
            <td style="padding: 10px; border: 1px solid #ddd;">$${totalFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Valid Until</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${expiresDate}</td>
          </tr>
        </table>
        <p>
          <a href="${portalLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            Review & Approve Quote
          </a>
        </p>
        <p>You can select your preferred options, add comments, and approve or request changes directly in the portal.</p>
      </div>
    `;
    
    try {
      await emailService.sendEmail({
        to: options.recipientEmail,
        subject: `You have a new quote to review: ${quote.quoteNumber}`,
        html,
      });
    } catch (error) {
      logger.warn("Failed to send portal notification email", { error, quoteId });
    }

    const [event] = await db.insert(quoteDeliveryEvents).values({
      quoteId,
      organizationId,
      channel: "portal",
      status: "sent",
      recipientEmail: options.recipientEmail,
      recipientName: options.recipientName,
      portalShareId: share.id,
      sentBy: options.sentBy,
      metadata: { message: options.message, portalLink },
    }).returning();
    
    deliveryEvent = event;
  } else if (options.channel === "docusign") {
    // DocuSign integration - requires DocuSign credentials
    const [event] = await db.insert(quoteDeliveryEvents).values({
      quoteId,
      organizationId,
      channel: "docusign",
      status: "queued",
      recipientEmail: options.recipientEmail,
      recipientName: options.recipientName,
      sentBy: options.sentBy,
      metadata: { message: options.message },
    }).returning();
    
    deliveryEvent = event;
    
    // DocuSign envelope creation handled separately
    logger.info("DocuSign quote delivery queued", { quoteId, eventId: event.id });
  } else {
    throw new Error("Invalid delivery channel");
  }

  // Update quote status
  await db.update(quotes)
    .set({ 
      status: "sent", 
      sentAt: now, 
      sentVia: options.channel,
      updatedAt: now
    })
    .where(eq(quotes.id, quoteId));

  return deliveryEvent;
}

/**
 * Approve or reject a quote
 */
export async function approveQuote(
  quoteId: string,
  organizationId: string,
  approval: {
    decision: "approved" | "rejected";
    approverEmail: string;
    approverName: string;
    approverTitle?: string;
    approverCompany?: string;
    portalUserId?: string;
    method: "portal" | "docusign" | "pdf_link";
    signatureType?: "typed" | "drawn" | "docusign";
    signatureData?: string;
    comments?: string;
    rejectionReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<QuoteApproval> {
  const quote = await getQuoteById(quoteId, organizationId);
  if (!quote) {
    throw new Error("Quote not found");
  }

  // Check quote can be approved
  if (quote.status === "approved" || quote.status === "rejected") {
    throw new Error("Quote has already been finalized");
  }

  if (quote.status === "expired") {
    throw new Error("Quote has expired");
  }

  if (quote.status === "draft") {
    throw new Error("Quote has not been sent yet");
  }

  // Check expiry
  if (quote.expiresAt && new Date() > quote.expiresAt) {
    await db.update(quotes)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(quotes.id, quoteId));
    throw new Error("Quote has expired");
  }

  // Create approval record
  const [approvalRecord] = await db.insert(quoteApprovals).values({
    quoteId,
    organizationId,
    decision: approval.decision,
    approverEmail: approval.approverEmail,
    approverName: approval.approverName,
    approverTitle: approval.approverTitle,
    approverCompany: approval.approverCompany,
    portalUserId: approval.portalUserId,
    method: approval.method,
    signatureType: approval.signatureType,
    signatureData: approval.signatureData,
    comments: approval.comments,
    rejectionReason: approval.rejectionReason,
    ipAddress: approval.ipAddress,
    userAgent: approval.userAgent,
  }).returning();

  // Update quote status
  const now = new Date();
  await db.update(quotes)
    .set({
      status: approval.decision,
      approvalMethod: approval.method,
      approvedAt: approval.decision === "approved" ? now : undefined,
      rejectedAt: approval.decision === "rejected" ? now : undefined,
      updatedAt: now,
    })
    .where(eq(quotes.id, quoteId));

  logger.info("Quote approval recorded", { 
    quoteId, 
    decision: approval.decision, 
    method: approval.method 
  });

  return approvalRecord;
}

/**
 * Add comment to quote
 */
export async function addQuoteComment(
  data: InsertQuoteComment
): Promise<QuoteComment> {
  const [comment] = await db.insert(quoteComments).values(data).returning();
  return comment;
}

/**
 * Mark quote as viewed
 */
export async function markQuoteViewed(
  quoteId: string,
  organizationId: string
): Promise<void> {
  await db.update(quotes)
    .set({ 
      viewedAt: new Date(),
      status: sql`CASE WHEN status = 'sent' THEN 'viewed' ELSE status END`,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organizationId, organizationId)
      )
    );
}

/**
 * Calculate quote total with selections
 */
export async function calculateQuoteTotal(
  quoteId: string,
  organizationId: string
): Promise<{ subtotal: number; adjustments: number; taxAmount: number; total: number }> {
  const quote = await getQuoteById(quoteId, organizationId);
  if (!quote) {
    throw new Error("Quote not found");
  }

  const subtotal = quote.subtotal;

  // Calculate adjustments from selections
  let adjustments = 0;
  for (const selection of quote.selections) {
    const option = quote.optionGroups
      .flatMap(g => g.options)
      .find(o => o.id === selection.optionId);
    
    if (option) {
      if (option.priceAdjustmentType === "fixed") {
        adjustments += option.priceAdjustment || 0;
      } else if (option.priceAdjustmentType === "percentage") {
        adjustments += Math.round((subtotal * (option.priceAdjustment || 0)) / 10000);
      }
    }
  }

  const taxableAmount = subtotal + adjustments;
  const taxAmount = Math.round((taxableAmount * (quote.taxRate || 0)) / 10000);
  const total = taxableAmount + taxAmount;

  return { subtotal, adjustments, taxAmount, total };
}

export const quoteService = {
  createQuoteDraft,
  getQuoteById,
  getQuotesForProject,
  updateQuoteSelections,
  sendQuote,
  approveQuote,
  addQuoteComment,
  markQuoteViewed,
  calculateQuoteTotal,
};
