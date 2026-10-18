import { Router } from "express";
import { storage } from "../storage";
import { getOrganizationContext } from "../clerkAuth";
import { 
  insertMarketingLandingPageSchema, 
  insertMarketingLeadFormSchema,
  insertMarketingLeadSchema,
  insertMarketingAnalyticsSchema
} from "@shared/schema";

const router = Router();

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// ====== MARKETING LANDING PAGES ======

router.post("/api/marketing/landing-pages", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertMarketingLandingPageSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
    });

    const page = await storage.createMarketingLandingPage(validatedData);
    res.json(page);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/marketing/landing-pages", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { status } = req.query;
    const pages = await storage.getMarketingLandingPages(
      context.organizationId, 
      status as string | undefined
    );
    
    res.json(pages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/marketing/landing-pages/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const page = await storage.getMarketingLandingPage(req.params.id, context.organizationId);
    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    res.json(page);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/marketing/landing-pages/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const updated = await storage.updateMarketingLandingPage(
      req.params.id,
      context.organizationId,
      req.body
    );

    if (!updated) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/marketing/landing-pages/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const success = await storage.deleteMarketingLandingPage(req.params.id, context.organizationId);
    if (!success) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== MARKETING LEAD FORMS ======

router.post("/api/marketing/lead-forms", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertMarketingLeadFormSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
    });

    const form = await storage.createMarketingLeadForm(validatedData);
    res.json(form);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/marketing/lead-forms", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const forms = await storage.getMarketingLeadForms(context.organizationId);
    res.json(forms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/marketing/lead-forms/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const form = await storage.getMarketingLeadForm(req.params.id, context.organizationId);
    if (!form) {
      return res.status(404).json({ error: "Lead form not found" });
    }
    res.json(form);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/marketing/lead-forms/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const updated = await storage.updateMarketingLeadForm(
      req.params.id,
      context.organizationId,
      req.body
    );

    if (!updated) {
      return res.status(404).json({ error: "Lead form not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/marketing/lead-forms/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const success = await storage.deleteMarketingLeadForm(req.params.id, context.organizationId);
    if (!success) {
      return res.status(404).json({ error: "Lead form not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== MARKETING LEADS ======

router.post("/api/marketing/leads", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertMarketingLeadSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
    });

    const lead = await storage.createMarketingLead(validatedData);
    res.json(lead);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/marketing/leads", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { status, campaignId } = req.query;
    const leads = await storage.getMarketingLeads(context.organizationId, {
      status: status as string | undefined,
      campaignId: campaignId as string | undefined,
    });
    
    res.json(leads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/marketing/leads/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const lead = await storage.getMarketingLead(req.params.id, context.organizationId);
    if (!lead) {
      return res.status(404).json({ error: "Marketing lead not found" });
    }
    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/marketing/leads/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const updated = await storage.updateMarketingLead(
      req.params.id,
      context.organizationId,
      req.body
    );

    if (!updated) {
      return res.status(404).json({ error: "Marketing lead not found" });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/marketing/leads/:id", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const success = await storage.deleteMarketingLead(req.params.id, context.organizationId);
    if (!success) {
      return res.status(404).json({ error: "Marketing lead not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/marketing/leads/:id/convert", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const salesLead = await storage.convertMarketingLeadToSalesLead(
      req.params.id,
      context.organizationId
    );
    
    res.json(salesLead);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ====== MARKETING ANALYTICS ======

router.post("/api/marketing/analytics", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = insertMarketingAnalyticsSchema.parse({
      ...req.body,
      organizationId: context.organizationId,
    });

    const event = await storage.createMarketingAnalytics(validatedData);
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/marketing/analytics", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { eventType, landingPageId, campaignId, startDate, endDate } = req.query;
    const events = await storage.getMarketingAnalytics(context.organizationId, {
      eventType: eventType as string | undefined,
      landingPageId: landingPageId as string | undefined,
      campaignId: campaignId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/marketing/analytics/summary", async (req, res) => {
  try {
    const context = await authenticateUser(req, res);
    if (!context) return;

    const { startDate, endDate } = req.query;
    const summary = await storage.getMarketingAnalyticsSummary(
      context.organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== PUBLIC ROUTES (no auth required) ======

// Public route to get a landing page by slug (for visitors)
router.get("/api/public/landing-pages/:slug", async (req, res) => {
  try {
    const page = await storage.getMarketingLandingPageBySlug(req.params.slug);
    
    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    
    if (page.status !== 'published') {
      return res.status(404).json({ error: "Landing page not found" });
    }
    
    // Increment view count
    await storage.incrementLandingPageView(page.id);
    
    // Track analytics event
    await storage.createMarketingAnalytics({
      organizationId: page.organizationId,
      eventType: 'page_view',
      landingPageId: page.id,
      metadata: {
        slug: req.params.slug,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
      }
    });
    
    res.json(page);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public route to submit a lead directly from landing page (for visitors)
router.post("/api/public/landing-pages/:pageId/leads", async (req, res) => {
  try {
    const pageId = req.params.pageId;
    
    // Get the landing page to verify it exists and get org context
    // We need to query the page directly without organization context (public route)
    const page = await storage.getMarketingLandingPagePublic(pageId);
    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }
    
    // Create lead using the correct schema field names
    const lead = await storage.createLead({
      organizationId: page.organizationId,
      contactName: req.body.name,
      email: req.body.email,
      companyName: req.body.company,
      phone: req.body.phone || null,
      source: req.body.source || 'landing_page',
      status: 'new',
      leadScore: 0,
      notes: req.body.message || null,
    });
    
    // Increment landing page lead count
    await storage.incrementLandingPageLead(pageId);
    
    // Track analytics event
    await storage.createMarketingAnalytics({
      organizationId: page.organizationId,
      eventType: 'form_submit',
      landingPageId: pageId,
      metadata: {
        landingPageSlug: page.slug,
        leadEmail: req.body.email,
        referrer: req.body.metadata?.referrer,
      }
    });
    
    res.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Public route to submit a lead form (for visitors)
router.post("/api/public/lead-forms/:formId/submit", async (req, res) => {
  try {
    const formId = req.params.formId;
    
    // Get the form (need to get org context from form)
    const form = await storage.getMarketingLeadForm(formId, req.body.organizationId);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    // Create marketing lead
    const lead = await storage.createMarketingLead({
      organizationId: form.organizationId,
      formId: form.id,
      landingPageId: form.landingPageId,
      campaignId: req.body.campaignId,
      source: req.body.source || 'website',
      status: 'new',
      data: req.body.data,
    });
    
    // Increment form submission count
    await storage.incrementFormSubmission(formId);
    
    // Increment landing page lead count if applicable
    if (form.landingPageId) {
      await storage.incrementLandingPageLead(form.landingPageId);
    }
    
    // Track analytics events
    await storage.createMarketingAnalytics({
      organizationId: form.organizationId,
      eventType: 'form_submit',
      formId: formId,
      landingPageId: form.landingPageId,
      campaignId: req.body.campaignId,
      leadId: lead.id,
      metadata: {
        formName: form.name,
      }
    });
    
    await storage.createMarketingAnalytics({
      organizationId: form.organizationId,
      eventType: 'lead_captured',
      formId: formId,
      landingPageId: form.landingPageId,
      campaignId: req.body.campaignId,
      leadId: lead.id,
      metadata: {
        leadEmail: (req.body.data as any).email,
      }
    });
    
    res.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
