import { Router } from "express";
import type { IStorage } from "../storage";
import { insertTestimonialSchema, insertCaseStudySchema } from "@shared/schema";
import { requireRole } from "../middleware/requireRole";
import { logger, logAuditEvent } from "../logger";

export function createTestimonialsRoutes(storage: IStorage): Router {
  const router = Router();

  // ======================
  // TESTIMONIALS - List endpoint must come before :id routes
  // ======================

  // Get all testimonials (public - filtered by status)
  router.get("/", async (req, res, next) => {
    try {
      const { status = "published", industry, isFeatured } = req.query;
      
      const testimonials = await storage.getTestimonials({
        status: status as string,
        industry: industry as string | undefined,
        isFeatured: isFeatured as string | undefined,
      });
      
      res.json(testimonials);
    } catch (error) {
      logger.error("Failed to fetch testimonials", { error });
      next(error);
    }
  });

  // ======================
  // CASE STUDIES - All case-studies routes MUST come before testimonials/:id
  // ======================

  // Get all case studies (public - filtered by status)
  router.get("/case-studies", async (req, res, next) => {
    try {
      const { status = "published", industry, isFeatured } = req.query;
      
      const caseStudies = await storage.getCaseStudies({
        status: status as string,
        industry: industry as string | undefined,
        isFeatured: isFeatured as string | undefined,
      });
      
      res.json(caseStudies);
    } catch (error) {
      logger.error("Failed to fetch case studies", { error });
      next(error);
    }
  });

  // Get single case study by slug (public - only published)
  router.get("/case-studies/slug/:slug", async (req, res, next) => {
    try {
      const caseStudy = await storage.getCaseStudyBySlug(req.params.slug);
      
      if (!caseStudy || caseStudy.status !== "published") {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      // Increment view count
      await storage.incrementCaseStudyView(caseStudy.id);
      
      res.json(caseStudy);
    } catch (error) {
      logger.error("Failed to fetch case study by slug", { error });
      next(error);
    }
  });

  // Get single case study by ID (public - only published)
  router.get("/case-studies/:id", async (req, res, next) => {
    try {
      const caseStudy = await storage.getCaseStudy(req.params.id);
      
      if (!caseStudy || caseStudy.status !== "published") {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      res.json(caseStudy);
    } catch (error) {
      logger.error("Failed to fetch case study", { error });
      next(error);
    }
  });

  // Create case study (admin only)
  router.post("/case-studies", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertCaseStudySchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid case study data", details: validation.error });
      }
      
      const caseStudy = await storage.createCaseStudy(validation.data);
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "created", "case_study", caseStudy.id);
      
      res.status(201).json(caseStudy);
    } catch (error) {
      logger.error("Failed to create case study", { error });
      next(error);
    }
  });

  // Update case study (admin only)
  router.patch("/case-studies/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertCaseStudySchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid case study data", details: validation.error });
      }
      
      const caseStudy = await storage.updateCaseStudy(req.params.id, validation.data);
      
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "updated", "case_study", caseStudy.id);
      
      res.json(caseStudy);
    } catch (error) {
      logger.error("Failed to update case study", { error });
      next(error);
    }
  });

  // Delete case study (admin only)
  router.delete("/case-studies/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const success = await storage.deleteCaseStudy(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "deleted", "case_study", req.params.id);
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete case study", { error });
      next(error);
    }
  });

  // Approve case study (admin only)
  router.post("/case-studies/:id/approve", requireRole("admin"), async (req, res, next) => {
    try {
      const user = req.dbUser as any;
      const caseStudy = await storage.approveCaseStudy(req.params.id, user.id);
      
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      await logAuditEvent(user.id, user.organizationId, "approved", "case_study", caseStudy.id);
      
      res.json(caseStudy);
    } catch (error) {
      logger.error("Failed to approve case study", { error });
      next(error);
    }
  });

  // Download case study PDF (increments download count, public - only published)
  router.post("/case-studies/:id/download", async (req, res, next) => {
    try {
      const caseStudy = await storage.getCaseStudy(req.params.id);
      
      if (!caseStudy || caseStudy.status !== "published") {
        return res.status(404).json({ error: "Case study not found" });
      }
      
      if (!caseStudy.pdfUrl) {
        return res.status(404).json({ error: "PDF not available for this case study" });
      }
      
      // Increment download count
      await storage.incrementCaseStudyDownload(caseStudy.id);
      
      res.json({ pdfUrl: caseStudy.pdfUrl });
    } catch (error) {
      logger.error("Failed to download case study", { error });
      next(error);
    }
  });

  // ======================
  // TESTIMONIALS - Dynamic :id routes MUST come after all case-studies routes
  // ======================

  // Get single testimonial (public - only published)
  router.get("/:id", async (req, res, next) => {
    try {
      const testimonial = await storage.getTestimonial(req.params.id);
      
      if (!testimonial || testimonial.status !== "published") {
        return res.status(404).json({ error: "Testimonial not found" });
      }
      
      res.json(testimonial);
    } catch (error) {
      logger.error("Failed to fetch testimonial", { error });
      next(error);
    }
  });

  // Create testimonial (admin only)
  router.post("/", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertTestimonialSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid testimonial data", details: validation.error });
      }
      
      const testimonial = await storage.createTestimonial(validation.data);
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "created", "testimonial", testimonial.id);
      
      res.status(201).json(testimonial);
    } catch (error) {
      logger.error("Failed to create testimonial", { error });
      next(error);
    }
  });

  // Update testimonial (admin only)
  router.patch("/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertTestimonialSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid testimonial data", details: validation.error });
      }
      
      const testimonial = await storage.updateTestimonial(req.params.id, validation.data);
      
      if (!testimonial) {
        return res.status(404).json({ error: "Testimonial not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "updated", "testimonial", testimonial.id);
      
      res.json(testimonial);
    } catch (error) {
      logger.error("Failed to update testimonial", { error });
      next(error);
    }
  });

  // Delete testimonial (admin only)
  router.delete("/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const success = await storage.deleteTestimonial(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Testimonial not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "deleted", "testimonial", req.params.id);
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete testimonial", { error });
      next(error);
    }
  });

  // Approve testimonial (admin only)
  router.post("/:id/approve", requireRole("admin"), async (req, res, next) => {
    try {
      const user = req.dbUser as any;
      const testimonial = await storage.approveTestimonial(req.params.id, user.id);
      
      if (!testimonial) {
        return res.status(404).json({ error: "Testimonial not found" });
      }
      
      await logAuditEvent(user.id, user.organizationId, "approved", "testimonial", testimonial.id);
      
      res.json(testimonial);
    } catch (error) {
      logger.error("Failed to approve testimonial", { error });
      next(error);
    }
  });

  return router;
}
