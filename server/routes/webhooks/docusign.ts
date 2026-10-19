import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { logger, logError, logSecurityEvent } from "../../logger";

const router = Router();

interface DocuSignWebhookPayload {
  event: string;
  apiVersion: string;
  uri: string;
  retryCount: number;
  configurationId: string;
  generatedDateTime: string;
  data: {
    accountId: string;
    userId: string;
    envelopeId: string;
    envelopeSummary: {
      status: string;
      statusChangedDateTime: string;
      statusDateTime: string;
      sentDateTime?: string;
      deliveredDateTime?: string;
      completedDateTime?: string;
      voidedDateTime?: string;
      declinedDateTime?: string;
      emailSubject: string;
      envelopeId: string;
      signingLocation: string;
      recipients: {
        signers: Array<{
          name: string;
          email: string;
          recipientId: string;
          routingOrder: string;
          status: string;
          signedDateTime?: string;
          deliveredDateTime?: string;
          declinedDateTime?: string;
          declinedReason?: string;
          clientUserId?: string;
          tabs?: Record<string, any>;
        }>;
      };
    };
  };
}

const DOCUSIGN_HMAC_SECRET = process.env.DOCUSIGN_HMAC_SECRET;

function verifyDocuSignSignature(payload: string, signature: string): boolean {
  if (!DOCUSIGN_HMAC_SECRET) {
    logger.warn("DocuSign HMAC secret not configured, skipping signature verification");
    return true;
  }

  const expectedSignature = crypto
    .createHmac("sha256", DOCUSIGN_HMAC_SECRET)
    .update(payload)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-docusign-signature-1"] as string;
    
    if (DOCUSIGN_HMAC_SECRET) {
      if (!signature) {
        logSecurityEvent(
          "docusign_webhook_missing_signature",
          "high",
          { ip: req.ip }
        );
        return res.status(401).json({ error: "Missing signature header" });
      }
      
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      if (!verifyDocuSignSignature(rawBody, signature)) {
        logSecurityEvent(
          "docusign_webhook_invalid_signature",
          "high",
          { signature, ip: req.ip }
        );
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const payload = req.body as DocuSignWebhookPayload;
    const envelopeId = payload.data?.envelopeId;

    if (!envelopeId) {
      logger.warn("DocuSign webhook missing envelope ID", { event: payload.event });
      return res.status(400).json({ error: "Missing envelope ID" });
    }

    logger.info("Received DocuSign webhook", {
      event: payload.event,
      envelopeId,
      status: payload.data?.envelopeSummary?.status,
    });

    switch (payload.event) {
      case "envelope-completed":
        await handleEnvelopeCompleted(payload);
        break;

      case "envelope-declined":
        await handleEnvelopeDeclined(payload);
        break;

      case "envelope-voided":
        await handleEnvelopeVoided(payload);
        break;

      case "envelope-delivered":
        await handleEnvelopeDelivered(payload);
        break;

      case "envelope-sent":
        await handleEnvelopeSent(payload);
        break;

      case "recipient-completed":
        await handleRecipientCompleted(payload);
        break;

      case "recipient-declined":
        await handleRecipientDeclined(payload);
        break;

      default:
        logger.info("Unhandled DocuSign webhook event", {
          event: payload.event,
          envelopeId,
        });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logError(error as Error, { context: "docusign-webhook" });
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

async function findQuoteByEnvelopeId(envelopeId: string) {
  const quote = await db.query.quotes.findFirst({
    where: eq(schema.quotes.docusignEnvelopeId, envelopeId),
  });
  return quote;
}

async function updateDeliveryEventStatus(
  quoteId: string,
  envelopeId: string,
  status: string
) {
  await db
    .update(schema.quoteDeliveryEvents)
    .set({
      status,
      metadata: { lastUpdated: new Date().toISOString() },
    })
    .where(
      and(
        eq(schema.quoteDeliveryEvents.quoteId, quoteId),
        eq(schema.quoteDeliveryEvents.docusignEnvelopeId, envelopeId)
      )
    );
}

async function findExistingApproval(quoteId: string, envelopeId: string) {
  return db.query.quoteApprovals.findFirst({
    where: and(
      eq(schema.quoteApprovals.quoteId, quoteId),
      eq(schema.quoteApprovals.docusignEnvelopeId, envelopeId)
    ),
  });
}

async function handleEnvelopeCompleted(payload: DocuSignWebhookPayload) {
  const { envelopeId, envelopeSummary } = payload.data;
  const quote = await findQuoteByEnvelopeId(envelopeId);

  if (!quote) {
    logger.warn("Quote not found for completed envelope", { envelopeId });
    return;
  }

  const existingApproval = await findExistingApproval(quote.id, envelopeId);
  if (existingApproval) {
    logger.info("Approval already exists for envelope, skipping", { envelopeId, quoteId: quote.id });
    return;
  }

  const signers = envelopeSummary.recipients?.signers || [];
  const signer = signers[0];

  if (!signer) {
    logger.warn("No signer found in completed envelope", { envelopeId });
    return;
  }

  const now = new Date();
  const completedAt = envelopeSummary.completedDateTime 
    ? new Date(envelopeSummary.completedDateTime) 
    : now;

  await db.insert(schema.quoteApprovals).values({
    quoteId: quote.id,
    decision: "approved",
    method: "docusign",
    approverEmail: signer.email,
    approverName: signer.name,
    signatureType: "docusign",
    docusignEnvelopeId: envelopeId,
    organizationId: quote.organizationId,
    signedAt: completedAt,
  });

  await db
    .update(schema.quotes)
    .set({
      status: "approved",
      approvedAt: completedAt,
      approvalMethod: "docusign",
    })
    .where(eq(schema.quotes.id, quote.id));

  await updateDeliveryEventStatus(quote.id, envelopeId, "completed");

  logger.info("Quote approved via DocuSign", {
    quoteId: quote.id,
    envelopeId,
    signerEmail: signer.email,
  });
}

async function handleEnvelopeDeclined(payload: DocuSignWebhookPayload) {
  const { envelopeId, envelopeSummary } = payload.data;
  const quote = await findQuoteByEnvelopeId(envelopeId);

  if (!quote) {
    logger.warn("Quote not found for declined envelope", { envelopeId });
    return;
  }

  const existingApproval = await findExistingApproval(quote.id, envelopeId);
  if (existingApproval) {
    logger.info("Approval already exists for envelope, skipping", { envelopeId, quoteId: quote.id });
    return;
  }

  const signers = envelopeSummary.recipients?.signers || [];
  const decliner = signers.find(s => s.status === "declined") || signers[0];

  if (!decliner) {
    logger.warn("No decliner found in declined envelope", { envelopeId });
    return;
  }

  const now = new Date();
  const declinedAt = envelopeSummary.declinedDateTime 
    ? new Date(envelopeSummary.declinedDateTime) 
    : now;

  await db.insert(schema.quoteApprovals).values({
    quoteId: quote.id,
    decision: "rejected",
    method: "docusign",
    approverEmail: decliner.email,
    approverName: decliner.name,
    rejectionReason: decliner.declinedReason,
    docusignEnvelopeId: envelopeId,
    organizationId: quote.organizationId,
    signedAt: declinedAt,
  });

  await db
    .update(schema.quotes)
    .set({
      status: "rejected",
      rejectedAt: declinedAt,
    })
    .where(eq(schema.quotes.id, quote.id));

  await updateDeliveryEventStatus(quote.id, envelopeId, "declined");

  logger.info("Quote declined via DocuSign", {
    quoteId: quote.id,
    envelopeId,
    declinerEmail: decliner.email,
    reason: decliner.declinedReason,
  });
}

async function handleEnvelopeVoided(payload: DocuSignWebhookPayload) {
  const { envelopeId } = payload.data;
  const quote = await findQuoteByEnvelopeId(envelopeId);

  if (!quote) {
    logger.warn("Quote not found for voided envelope", { envelopeId });
    return;
  }

  await db
    .update(schema.quotes)
    .set({ status: "superseded" })
    .where(eq(schema.quotes.id, quote.id));

  await updateDeliveryEventStatus(quote.id, envelopeId, "voided");

  logger.info("Quote envelope voided", {
    quoteId: quote.id,
    envelopeId,
  });
}

async function handleEnvelopeDelivered(payload: DocuSignWebhookPayload) {
  const { envelopeId } = payload.data;
  const quote = await findQuoteByEnvelopeId(envelopeId);

  if (!quote) {
    logger.warn("Quote not found for delivered envelope", { envelopeId });
    return;
  }

  if (quote.status === "sent") {
    await db
      .update(schema.quotes)
      .set({ 
        status: "viewed",
        viewedAt: new Date(),
      })
      .where(eq(schema.quotes.id, quote.id));
  }

  await updateDeliveryEventStatus(quote.id, envelopeId, "delivered");

  logger.info("Quote envelope delivered", {
    quoteId: quote.id,
    envelopeId,
  });
}

async function handleEnvelopeSent(payload: DocuSignWebhookPayload) {
  const { envelopeId } = payload.data;
  const quote = await findQuoteByEnvelopeId(envelopeId);

  if (!quote) {
    logger.warn("Quote not found for sent envelope", { envelopeId });
    return;
  }

  await updateDeliveryEventStatus(quote.id, envelopeId, "sent");

  logger.info("Quote envelope sent", {
    quoteId: quote.id,
    envelopeId,
  });
}

async function handleRecipientCompleted(payload: DocuSignWebhookPayload) {
  const { envelopeId, envelopeSummary } = payload.data;
  const signers = envelopeSummary.recipients?.signers || [];
  const allComplete = signers.every(s => s.status === "completed");

  if (allComplete) {
    await handleEnvelopeCompleted(payload);
  }
}

async function handleRecipientDeclined(payload: DocuSignWebhookPayload) {
  await handleEnvelopeDeclined(payload);
}

export default router;
