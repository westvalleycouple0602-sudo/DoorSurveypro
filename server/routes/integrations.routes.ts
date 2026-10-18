import { Router, type Request, type Response } from "express";
import { requireAuth as isAuthenticated, getOrganizationContext } from "../clerkAuth";
import { requireFeature } from "../feature-gates";
import { quickBooksOAuth } from "../integrations/quickbooks/oauth";
import { docuSignOAuth } from "../integrations/docusign/oauth";
import { QuickBooksClient } from "../integrations/quickbooks/client";
import { DocuSignClient } from "../integrations/docusign/client";
import { credentialService } from "../integrations/credential-service";
import { db } from "../db";
import { integrationCredentials, projects, customers } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../logger";

const router = Router();

// All integration routes require authentication THEN crmSync feature (Enterprise-only)
router.use(isAuthenticated);
router.use(requireFeature("crmSync"));

// ============================================================================
// QUICKBOOKS INTEGRATION ROUTES
// ============================================================================

router.get("/quickbooks/connect", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    const authUrl = quickBooksOAuth.getAuthorizationUrl(organizationId);
    res.json({ authUrl });
  } catch (error: any) {
    logger.error("QuickBooks connect error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/quickbooks/callback", async (req: Request, res: Response) => {
  try {
    const { code, realmId, state: organizationId } = req.query as { 
      code: string; 
      realmId: string; 
      state: string; 
    };

    if (!code || !realmId || !organizationId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    await quickBooksOAuth.handleCallback(code, realmId, organizationId);

    res.redirect("/settings?tab=integrations&success=quickbooks");
  } catch (error: any) {
    logger.error("QuickBooks callback error:", error);
    res.redirect("/settings?tab=integrations&error=quickbooks");
  }
});

router.get("/quickbooks/status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    const [credential] = await db
      .select()
      .from(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.organizationId, organizationId),
          eq(integrationCredentials.service, "quickbooks")
        )
      )
      .limit(1);

    if (!credential || credential.isActive === "no") {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      lastSynced: credential.lastSyncedAt,
      metadata: credential.metadata
    });
  } catch (error: any) {
    logger.error("QuickBooks status error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/quickbooks/disconnect", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    await credentialService.disconnect(organizationId, "quickbooks");
    res.json({ success: true });
  } catch (error: any) {
    logger.error("QuickBooks disconnect error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/quickbooks/export-invoice", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: "Project ID required" });
    }

    const qbClient = await QuickBooksClient.forOrganization(organizationId);

    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    let customerId = req.body.customerId;
    let customerName = project.name;

    if (project.customerId) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, project.customerId))
        .limit(1);
      
      if (customer) {
        customerName = customer.name;
      }
    }

    if (!customerId && customerName) {
      const existingCustomers = await qbClient.searchCustomers(customerName);
      
      if (existingCustomers.length > 0) {
        customerId = existingCustomers[0].Id;
      } else {
        const customer = await qbClient.createCustomer({
          displayName: customerName
        });
        customerId = customer.Id;
      }
    }

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID required or customer name must be provided" });
    }

    // Note: estimatedCost field doesn't exist in projects schema
    // For QuickBooks export, use 0 as placeholder - user should update in QuickBooks
    const lineItems = [
      {
        description: project.name || "Door Hardware Installation",
        quantity: 1,
        unitPrice: 0, // Placeholder - update in QuickBooks
        amount: 0, // Placeholder - update in QuickBooks
        itemName: "Door Hardware Services"
      }
    ];

    const invoice = await qbClient.createInvoice({
      customerId,
      lineItems,
      txnDate: new Date().toISOString().split('T')[0]
    });

    res.json({
      success: true,
      invoiceId: invoice.Id,
      invoiceNumber: invoice.DocNumber
    });
  } catch (error: any) {
    logger.error("QuickBooks export invoice error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DOCUSIGN INTEGRATION ROUTES
// ============================================================================

router.get("/docusign/connect", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    const authUrl = docuSignOAuth.getAuthorizationUrl(organizationId);
    res.json({ authUrl });
  } catch (error: any) {
    logger.error("DocuSign connect error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/docusign/callback", async (req: Request, res: Response) => {
  try {
    const { code, state: organizationId } = req.query as { 
      code: string; 
      state: string; 
    };

    if (!code || !organizationId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    await docuSignOAuth.handleCallback(code, organizationId);

    res.redirect("/settings?tab=integrations&success=docusign");
  } catch (error: any) {
    logger.error("DocuSign callback error:", error);
    res.redirect("/settings?tab=integrations&error=docusign");
  }
});

router.get("/docusign/status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    const [credential] = await db
      .select()
      .from(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.organizationId, organizationId),
          eq(integrationCredentials.service, "docusign")
        )
      )
      .limit(1);

    if (!credential || credential.isActive === "no") {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      lastSynced: credential.lastSyncedAt,
      metadata: credential.metadata
    });
  } catch (error: any) {
    logger.error("DocuSign status error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/docusign/disconnect", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    await credentialService.disconnect(organizationId, "docusign");
    res.json({ success: true });
  } catch (error: any) {
    logger.error("DocuSign disconnect error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/docusign/send-quote", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    const { projectId, quotePdfBase64, signers } = req.body;
    
    if (!projectId || !quotePdfBase64 || !signers || !Array.isArray(signers)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const dsClient = await DocuSignClient.forOrganization(organizationId);

    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const envelope = await dsClient.createEnvelope({
      emailSubject: `Quote for ${project.name || "Door Hardware Project"} - Requires Signature`,
      documentBase64: quotePdfBase64,
      documentName: `Quote_Project_${project.id}.pdf`,
      fileExtension: "pdf",
      signers: signers.map((signer: any, index: number) => ({
        email: signer.email,
        name: signer.name,
        recipientId: (index + 1).toString()
      })),
      status: "sent"
    });

    res.json({
      success: true,
      envelopeId: envelope.envelopeId,
      status: envelope.status
    });
  } catch (error: any) {
    logger.error("DocuSign send quote error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/docusign/envelope/:envelopeId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    const { envelopeId } = req.params;
    const dsClient = await DocuSignClient.forOrganization(organizationId);
    
    const envelope = await dsClient.getEnvelopeStatus(envelopeId);
    res.json(envelope);
  } catch (error: any) {
    logger.error("DocuSign get envelope error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GENERAL INTEGRATION STATUS
// ============================================================================

router.get("/status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    const { organizationId } = orgContext;

    const credentials = await db
      .select()
      .from(integrationCredentials)
      .where(eq(integrationCredentials.organizationId, organizationId));

    const status = {
      quickbooks: credentials.find(c => c.service === "quickbooks" && c.isActive === "yes") ? {
        connected: true,
        lastSynced: credentials.find(c => c.service === "quickbooks")?.lastSyncedAt
      } : { connected: false },
      docusign: credentials.find(c => c.service === "docusign" && c.isActive === "yes") ? {
        connected: true,
        lastSynced: credentials.find(c => c.service === "docusign")?.lastSyncedAt
      } : { connected: false }
    };

    res.json(status);
  } catch (error: any) {
    logger.error("Integration status error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
