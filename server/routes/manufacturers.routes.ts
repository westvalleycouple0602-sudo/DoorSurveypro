import type { Express } from "express";
import type { RouteDependencies } from "./deps";
import { getOrganizationContext } from "../clerkAuth";
import { insertManufacturerContactSchema, insertManufacturerLiteratureSchema } from "@shared/schema";
import { handleValidationError } from "../utils/error-handler";
import { cache, CacheKeys } from "../utils/cache";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

/**
 * Manufacturers Routes Module
 * Handles all manufacturer-related endpoints including:
 * - Manufacturer contact CRUD
 * - Manufacturer literature management (cut sheets, manuals, elevations, etc.)
 * - File upload and download for literature
 */
export async function registerManufacturersRoutes(app: Express, deps: RouteDependencies) {
  const { storage, logError, logAuditEvent } = deps;

  // Configure Multer for literature uploads
  const literatureUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit for technical documents
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/svg+xml",
        "image/webp",
        "application/zip",
        "application/x-zip-compressed",
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, Images, ZIP"));
      }
    },
  });

  // ============================================================================
  // MANUFACTURER CONTACTS
  // ============================================================================

  // GET all manufacturer contacts (GLOBALLY SHARED - with optional server-side search)
  app.get("/api/manufacturers", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      // All organizations can see all manufacturers
      const searchTerm = typeof req.query.search === 'string' ? req.query.search : undefined;
      
      // Cache manufacturers list (cached for 1 hour - rarely changes)
      // Don't cache if there's a search term to ensure fresh results
      let contacts;
      if (searchTerm) {
        contacts = await storage.getManufacturerContacts(searchTerm);
      } else {
        contacts = await cache.getOrSet(
          CacheKeys.manufacturers(),
          () => storage.getManufacturerContacts(undefined),
          60 * 60 * 1000 // 1 hour
        );
      }
      
      res.json(contacts);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET single manufacturer contact by ID (GLOBALLY SHARED)
  app.get("/api/manufacturers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      // All organizations can view any manufacturer
      const contact = await storage.getManufacturerContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }
      res.json(contact);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST create new manufacturer contact (GLOBALLY SHARED)
  app.post("/api/manufacturers", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext || !orgContext.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validated = insertManufacturerContactSchema.parse({
        ...req.body,
        organizationId: orgContext.organizationId, // Track creator org (optional)
      });

      // Check for duplicates before creating
      const duplicate = await storage.findDuplicateManufacturer(
        validated.manufacturerName,
        validated.email
      );
      
      if (duplicate) {
        return res.status(409).json({ 
          error: "A manufacturer with this name or email already exists",
          existingId: duplicate.id,
          existingName: duplicate.manufacturerName
        });
      }

      const newContact = await storage.createManufacturerContact(
        validated,
        orgContext.userId,
        orgContext.organizationId
      );

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'manufacturer_contact.created',
        'manufacturer_contact',
        newContact.id,
        { manufacturerName: newContact.manufacturerName }
      );

      // Invalidate cache so new manufacturer appears immediately
      await cache.delete(CacheKeys.manufacturers());

      res.status(201).json(newContact);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PUT update manufacturer contact (RESTRICTED: only creator org can edit)
  app.put("/api/manufacturers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Get existing contact for authorization and version check
      const existing = await storage.getManufacturerContact(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }

      // SECURITY: Only creator organization can update
      // Reject if lastEditedByOrg is missing (defensive) OR if it doesn't match
      if (!existing.lastEditedByOrg || existing.lastEditedByOrg !== orgContext.organizationId) {
        if (!existing.lastEditedByOrg) {
          // Log audit alert for missing attribution
          logAuditEvent(
            orgContext.userId,
            orgContext.organizationId,
            'manufacturer_contact.update_blocked_missing_attribution',
            'manufacturer_contact',
            req.params.id,
            { reason: "lastEditedByOrg is null" }
          );
        }
        return res.status(403).json({ 
          error: "Only the organization that created/last edited this manufacturer can update it" 
        });
      }

      const validated = insertManufacturerContactSchema.partial().parse(req.body);

      // SECURITY: Prevent ownership/audit field manipulation attempts
      // Check req.body directly since lastEditedBy/lastEditedByOrg are omitted from schema
      if (validated.organizationId || req.body.lastEditedBy || req.body.lastEditedByOrg) {
        logAuditEvent(
          orgContext.userId,
          orgContext.organizationId,
          'manufacturer_contact.ownership_change_blocked',
          'manufacturer_contact',
          req.params.id,
          { 
            attemptedOrgId: validated.organizationId,
            attemptedLastEditedBy: req.body.lastEditedBy,
            attemptedLastEditedByOrg: req.body.lastEditedByOrg,
          }
        );
        return res.status(400).json({ 
          error: "Cannot change manufacturer ownership or audit fields" 
        });
      }

      // OPTIMISTIC CONCURRENCY: Check version if provided (check req.body since version is omitted from schema)
      if (req.body.version !== undefined && existing.version !== req.body.version) {
        return res.status(409).json({
          error: "Manufacturer has been modified by another user. Please refresh and try again.",
          currentVersion: existing.version,
        });
      }
      
      // Check for duplicates if name or email changed
      if (validated.manufacturerName || validated.email) {
        const checkName = validated.manufacturerName || existing.manufacturerName;
        const checkEmail = validated.email || existing.email;
        
        const duplicate = await storage.findDuplicateManufacturer(
          checkName,
          checkEmail,
          req.params.id
        );
        
        if (duplicate) {
          return res.status(409).json({ 
            error: "A manufacturer with this name or email already exists",
            existingId: duplicate.id,
            existingName: duplicate.manufacturerName
          });
        }
      }

      // Strip organizationId if present (only field from validated that needs removal)
      // Note: lastEditedBy, lastEditedByOrg, updatedAt are not in the schema, so no need to destructure them
      const { organizationId, ...safeUpdate } = validated;

      const updated = await storage.updateManufacturerContact(
        req.params.id,
        safeUpdate,
        orgContext.userId,
        orgContext.organizationId
      );

      if (!updated) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }

      // Invalidate cache so updated manufacturer appears immediately
      await cache.delete(CacheKeys.manufacturers());

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'manufacturer_contact.updated',
        'manufacturer_contact',
        updated.id
      );

      res.json(updated);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE manufacturer contact (RESTRICTED: only creator org can delete)
  app.delete("/api/manufacturers/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Get existing contact for authorization check
      const existing = await storage.getManufacturerContact(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }

      // SECURITY: Only creator organization can delete
      // Reject if lastEditedByOrg is missing (defensive) OR if it doesn't match
      if (!existing.lastEditedByOrg || existing.lastEditedByOrg !== orgContext.organizationId) {
        if (!existing.lastEditedByOrg) {
          // Log audit alert for missing attribution
          logAuditEvent(
            orgContext.userId,
            orgContext.organizationId,
            'manufacturer_contact.delete_blocked_missing_attribution',
            'manufacturer_contact',
            req.params.id,
            { reason: "lastEditedByOrg is null" }
          );
        }
        return res.status(403).json({ 
          error: "Only the organization that created/last edited this manufacturer can delete it" 
        });
      }

      const success = await storage.deleteManufacturerContact(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }

      // Invalidate cache so deleted manufacturer disappears immediately
      await cache.delete(CacheKeys.manufacturers());

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'manufacturer_contact.deleted',
        'manufacturer_contact',
        req.params.id
      );

      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // MANUFACTURER LITERATURE
  // ============================================================================

  // GET all literature for a manufacturer contact (GLOBALLY VISIBLE)
  app.get("/api/manufacturers/:contactId/literature", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      // All organizations can see all literature for any manufacturer
      const literature = await storage.getManufacturerLiterature(req.params.contactId);
      res.json(literature);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET all literature for organization (across all manufacturers)
  app.get("/api/manufacturer-literature", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      const literature = await storage.getManufacturerLiteratureByOrg(orgContext.organizationId);
      res.json(literature);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // POST upload manufacturer literature
  app.post("/api/manufacturers/:contactId/literature", literatureUpload.single("file"), async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext || !orgContext.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Verify manufacturer contact exists (globally shared)
      const contact = await storage.getManufacturerContact(req.params.contactId);
      if (!contact) {
        return res.status(404).json({ error: "Manufacturer contact not found" });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "uploads", "manufacturer-literature");
      if (!existsSync(uploadsDir)) {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `${timestamp}-${sanitizedFilename}`;
      const filePath = path.join(uploadsDir, filename);

      // Write file to disk
      await fs.writeFile(filePath, req.file.buffer);

      // Parse and validate literature metadata
      const validated = insertManufacturerLiteratureSchema.parse({
        contactId: req.params.contactId,
        organizationId: orgContext.organizationId,
        documentType: req.body.documentType || "other",
        title: req.body.title || req.file.originalname,
        description: req.body.description,
        fileName: req.file.originalname,
        filePath: `uploads/manufacturer-literature/${filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        productCatalogItemId: req.body.productCatalogItemId || null,
        uploadedBy: orgContext.userId,
      });

      const newLiterature = await storage.createManufacturerLiterature(validated);

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'manufacturer_literature.uploaded',
        'manufacturer_literature',
        newLiterature.id,
        {
          contactId: req.params.contactId,
          documentType: newLiterature.documentType,
          fileName: newLiterature.fileName,
        }
      );

      res.status(201).json(newLiterature);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // GET download manufacturer literature file (GLOBALLY VISIBLE)
  app.get("/api/manufacturer-literature/:id/download", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // All organizations can download any literature
      const literature = await storage.getManufacturerLiteratureById(req.params.id);

      if (!literature) {
        return res.status(404).json({ error: "Literature not found" });
      }

      const filePath = path.join(process.cwd(), literature.filePath);
      if (!existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on server" });
      }

      res.setHeader("Content-Type", literature.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${literature.fileName}"`);
      res.sendFile(filePath);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // PUT update manufacturer literature metadata (RESTRICTED: only uploader org can update)
  app.put("/api/manufacturer-literature/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Get existing literature for authorization check
      const existing = await storage.getManufacturerLiteratureById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Literature not found" });
      }

      // SECURITY: Only the organization that uploaded the literature can update it
      // Reject if organizationId is missing (defensive) OR if it doesn't match
      if (!existing.organizationId || existing.organizationId !== orgContext.organizationId) {
        if (!existing.organizationId) {
          // Log audit alert for missing attribution
          logAuditEvent(
            orgContext.userId,
            orgContext.organizationId,
            'manufacturer_literature.update_blocked_missing_attribution',
            'manufacturer_literature',
            req.params.id,
            { reason: "organizationId is null" }
          );
        }
        return res.status(403).json({ 
          error: "Only the organization that uploaded this literature can update it" 
        });
      }

      const validated = insertManufacturerLiteratureSchema.partial().parse(req.body);
      
      // SECURITY: Prevent ownership transfer attempts
      if (validated.organizationId || validated.contactId) {
        logAuditEvent(
          orgContext.userId,
          orgContext.organizationId,
          'manufacturer_literature.ownership_change_blocked',
          'manufacturer_literature',
          req.params.id,
          { 
            attemptedOrgId: validated.organizationId,
            attemptedContactId: validated.contactId,
          }
        );
        return res.status(400).json({ 
          error: "Cannot change literature ownership or contact association" 
        });
      }
      
      // Strip ownership fields to be extra safe (defensive)
      const { organizationId, contactId, uploadedBy, ...safeUpdate } = validated;
      const updated = await storage.updateManufacturerLiterature(req.params.id, safeUpdate);

      if (!updated) {
        return res.status(404).json({ error: "Literature not found" });
      }

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'manufacturer_literature.updated',
        'manufacturer_literature',
        updated.id
      );

      res.json(updated);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // DELETE manufacturer literature (RESTRICTED: only uploader org can delete)
  app.delete("/api/manufacturer-literature/:id", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Get literature for authorization check and file deletion
      const literature = await storage.getManufacturerLiteratureById(req.params.id);

      if (!literature) {
        return res.status(404).json({ error: "Literature not found" });
      }

      // SECURITY: Only the organization that uploaded the literature can delete it
      // Reject if organizationId is missing (defensive) OR if it doesn't match
      if (!literature.organizationId || literature.organizationId !== orgContext.organizationId) {
        if (!literature.organizationId) {
          // Log audit alert for missing attribution
          logAuditEvent(
            orgContext.userId,
            orgContext.organizationId,
            'manufacturer_literature.delete_blocked_missing_attribution',
            'manufacturer_literature',
            req.params.id,
            { reason: "organizationId is null" }
          );
        }
        return res.status(403).json({ 
          error: "Only the organization that uploaded this literature can delete it" 
        });
      }

      // Delete from database
      const success = await storage.deleteManufacturerLiterature(req.params.id);

      if (!success) {
        return res.status(404).json({ error: "Literature not found" });
      }

      // Delete file from disk
      const filePath = path.join(process.cwd(), literature.filePath);
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        'manufacturer_literature.deleted',
        'manufacturer_literature',
        req.params.id,
        { fileName: literature.fileName }
      );

      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
}
