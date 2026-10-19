import type { Express, Request, Response, NextFunction } from "express";
import type { RouteDependencies } from "./deps";
import { getOrganizationContext } from "../clerkAuth";
import { insertDistributorSchema, insertDistributorManufacturerSchema } from "@shared/schema";
import { handleValidationError } from "../utils/error-handler";
import { cache, CacheKeys } from "../utils/cache";

/**
 * Distributors Routes Module
 * 
 * Manages distributor/vendor procurement system with:
 * - Organization-scoped CRUD operations
 * - Primary distributor designation (single per org)
 * - Manufacturer relationship management
 * - Pricing configuration (discounts, markups, fees)
 * - Soft-delete with reference validation
 * - Redis caching with 5-minute TTL
 * - Comprehensive audit logging
 * 
 * Security:
 * - All endpoints require valid organization context (401 if missing)
 * - Organization-scoped isolation on all queries
 * - Server-owned field stripping (organizationId, isPrimary, archivedAt)
 * - Reference validation before deletion
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_TTL_DISTRIBUTORS = 5 * 60 * 1000; // 5 minutes

// Fields that affect pricing calculations (tracked for audit purposes)
const PRICING_FIELDS = [
  'discountMultiplier',
  'markupPercent', 
  'flatFee', 
  'shippingFeeType',
  'shippingFeeAmount', 
  'handlingFee',
  'minimumOrderAmount'
] as const;

// Fields that cannot be modified through the update endpoint
const SERVER_OWNED_FIELDS = [
  'organizationId',  // Cannot transfer ownership
  'isPrimary',       // Use dedicated set-primary endpoint
  'archivedAt',      // Use delete endpoint
  'id',              // Immutable
  'createdAt',       // System-managed
  'updatedAt'        // System-managed
] as const;

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to validate organization context for all distributor routes
 * Extracts userId and organizationId from session and validates both exist
 */
async function requireOrganizationContext(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const orgContext = await getOrganizationContext(req);
    
    if (!orgContext?.organizationId || !orgContext?.userId) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Organization context required. Please ensure you are logged in and have an active organization."
      });
    }
    
    // Attach to request for downstream use
    (req as any).orgContext = orgContext;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: "Authentication failed",
      message: "Unable to validate organization context"
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export async function registerDistributorsRoutes(app: Express, deps: RouteDependencies) {
  const { storage, logError, logAuditEvent } = deps;

  // Apply org context middleware to all distributor routes
  app.use("/api/distributors", requireOrganizationContext);

  // ============================================================================
  // DISTRIBUTOR CRUD ENDPOINTS
  // ============================================================================

  /**
   * GET /api/distributors
   * List all distributors for current organization
   * 
   * Query params:
   * - includeArchived: boolean (default: false) - Include soft-deleted distributors
   * 
   * Returns: Distributor[] (200)
   * Caching: 5 minutes for active lists only
   */
  app.get("/api/distributors", async (req, res) => {
    try {
      const { organizationId } = (req as any).orgContext;
      const includeArchived = req.query.includeArchived === 'true';
      
      let distributors;
      
      if (includeArchived) {
        // Don't cache archived requests (less common, more volatile)
        distributors = await storage.getDistributors(organizationId, true);
      } else {
        // Cache active distributors list (common query, stable data)
        distributors = await cache.getOrSet(
          CacheKeys.distributors(organizationId),
          () => storage.getDistributors(organizationId, false),
          CACHE_TTL_DISTRIBUTORS
        );
      }
      
      res.json(distributors);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/distributors/:id
   * Get single distributor by ID
   * 
   * Path params:
   * - id: string (UUID) - Distributor ID
   * 
   * Query params:
   * - includeArchived: boolean (default: false)
   * 
   * Returns: Distributor (200) | Not Found (404)
   */
  app.get("/api/distributors/:id", async (req, res) => {
    try {
      const { organizationId } = (req as any).orgContext;
      const includeArchived = req.query.includeArchived === 'true';
      
      const distributor = await storage.getDistributor(
        req.params.id, 
        organizationId,
        includeArchived
      );
      
      if (!distributor) {
        return res.status(404).json({ 
          error: "Not found",
          message: "Distributor not found or you don't have access to it"
        });
      }
      
      res.json(distributor);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * POST /api/distributors
   * Create new distributor
   * 
   * Body: InsertDistributor (without organizationId - auto-assigned)
   * 
   * Returns: Distributor (201)
   * Side effects:
   * - Invalidates distributor cache for org
   * - Creates audit log entry
   */
  app.post("/api/distributors", async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).orgContext;

      // Validate and sanitize input
      const validated = insertDistributorSchema.parse({
        ...req.body,
        organizationId, // Server-assigned, never trust client
        // Sanitize text fields
        name: req.body.name?.trim(),
        contactName: req.body.contactName?.trim(),
        email: req.body.email?.trim().toLowerCase(),
        phone: req.body.phone?.trim(),
        website: req.body.website?.trim(),
        notes: req.body.notes?.trim(),
      });

      const newDistributor = await storage.createDistributor(validated);
      
      // Invalidate cache
      await cache.delete(CacheKeys.distributors(organizationId));
      
      // Audit log
      await logAuditEvent(
        userId,
        organizationId,
        "distributor.created",
        "distributor",
        newDistributor.id,
        {
          name: newDistributor.name,
          isPrimary: newDistributor.isPrimary,
          vendorType: newDistributor.vendorType,
        }
      );
      
      res.status(201).json(newDistributor);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * PUT /api/distributors/:id
   * Update distributor (partial update)
   * 
   * Path params:
   * - id: string (UUID) - Distributor ID
   * 
   * Body: Partial<InsertDistributor> (server-owned fields stripped)
   * 
   * Returns: Distributor (200) | Not Found (404)
   * Side effects:
   * - Invalidates distributor cache for org
   * - Creates audit log for pricing changes
   * 
   * Security:
   * - Strips organizationId, isPrimary, archivedAt from client payload
   * - Use dedicated endpoints for these operations
   */
  app.put("/api/distributors/:id", async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).orgContext;

      const validated = insertDistributorSchema.partial().parse(req.body);

      // Strip server-owned fields for security (preserves types)
      const safeUpdates = { ...validated };
      SERVER_OWNED_FIELDS.forEach(field => delete (safeUpdates as any)[field]);

      // Sanitize text fields with type guards
      if (typeof safeUpdates.name === 'string') {
        safeUpdates.name = safeUpdates.name.trim();
      }
      if (typeof safeUpdates.contactName === 'string') {
        safeUpdates.contactName = safeUpdates.contactName.trim();
      }
      if (typeof safeUpdates.email === 'string') {
        safeUpdates.email = safeUpdates.email.trim().toLowerCase();
      }
      if (typeof safeUpdates.phone === 'string') {
        safeUpdates.phone = safeUpdates.phone.trim();
      }
      if (typeof safeUpdates.website === 'string') {
        safeUpdates.website = safeUpdates.website.trim();
      }
      if (typeof safeUpdates.notes === 'string') {
        safeUpdates.notes = safeUpdates.notes.trim();
      }

      const updatedDistributor = await storage.updateDistributor(
        req.params.id,
        organizationId,
        safeUpdates
      );
      
      if (!updatedDistributor) {
        return res.status(404).json({ 
          error: "Not found",
          message: "Distributor not found or you don't have access to it"
        });
      }
      
      // Invalidate cache
      await cache.delete(CacheKeys.distributors(organizationId));
      
      // Track pricing changes for audit/compliance
      const changedFields = Object.keys(safeUpdates);
      const hasPricingChanges = changedFields.some(field => 
        PRICING_FIELDS.includes(field as any)
      );
      
      if (hasPricingChanges) {
        const pricingChanges = Object.fromEntries(
          Object.entries(safeUpdates).filter(([key]) => 
            PRICING_FIELDS.includes(key as any)
          )
        );

        await logAuditEvent(
          userId,
          organizationId,
          "distributor.pricing_updated",
          "distributor",
          updatedDistributor.id,
          {
            name: updatedDistributor.name,
            changes: pricingChanges,
          }
        );
      }
      
      res.json(updatedDistributor);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * DELETE /api/distributors/:id
   * Soft-delete distributor (sets archivedAt timestamp)
   * 
   * Path params:
   * - id: string (UUID) - Distributor ID
   * 
   * Returns: No Content (204) | Conflict (409) | Not Found (404)
   * 
   * Validation:
   * - Prevents deletion if hardware_items reference this distributor
   * - Returns structured error with reason code
   * 
   * Side effects:
   * - Invalidates distributor cache for org
   * - Creates audit log entry
   */
  app.delete("/api/distributors/:id", async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).orgContext;

      const result = await storage.deleteDistributor(req.params.id, organizationId);
      
      if (!result.success) {
        if (result.reason === 'HARDWARE_ITEMS_REFERENCE') {
          return res.status(409).json({ 
            error: "Conflict",
            message: "Cannot delete distributor: it is referenced by hardware items. Please reassign or remove the hardware items first.",
            reason: result.reason,
            details: "This distributor is being used as a procurement source"
          });
        }
        
        if (result.reason === 'NOT_FOUND') {
          return res.status(404).json({ 
            error: "Not found",
            message: "Distributor not found or you don't have access to it",
            reason: result.reason
          });
        }
        
        return res.status(400).json({ 
          error: "Bad request",
          message: "Failed to delete distributor"
        });
      }
      
      // Invalidate cache
      await cache.delete(CacheKeys.distributors(organizationId));
      
      // Audit log
      await logAuditEvent(
        userId,
        organizationId,
        "distributor.archived",
        "distributor",
        req.params.id,
        { action: "soft_delete" }
      );
      
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * PUT /api/distributors/:id/set-primary
   * Set distributor as primary for organization
   * 
   * Path params:
   * - id: string (UUID) - Distributor ID
   * 
   * Returns: Distributor (200) | Not Found (404)
   * 
   * Behavior:
   * - Atomically sets isPrimary=true for target distributor
   * - Sets isPrimary=false for all other distributors in org
   * - Enforces single-primary invariant via transaction
   * - Cannot set archived distributor as primary
   * 
   * Side effects:
   * - Invalidates distributor cache for org
   * - Creates audit log entry
   */
  app.put("/api/distributors/:id/set-primary", async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).orgContext;

      const primaryDistributor = await storage.setPrimaryDistributor(
        req.params.id,
        organizationId
      );
      
      if (!primaryDistributor) {
        return res.status(404).json({ 
          error: "Not found",
          message: "Distributor not found, archived, or you don't have access to it"
        });
      }
      
      // Invalidate cache
      await cache.delete(CacheKeys.distributors(organizationId));
      
      // Audit log
      await logAuditEvent(
        userId,
        organizationId,
        "distributor.set_primary",
        "distributor",
        primaryDistributor.id,
        {
          name: primaryDistributor.name,
          previousPrimary: false, // Could enhance to track previous primary
        }
      );
      
      res.json(primaryDistributor);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  // ============================================================================
  // DISTRIBUTOR-MANUFACTURER RELATIONSHIP ENDPOINTS
  // ============================================================================

  /**
   * GET /api/distributors/:id/manufacturers
   * List all manufacturer relationships for a distributor
   * 
   * Path params:
   * - id: string (UUID) - Distributor ID
   * 
   * Returns: DistributorManufacturer[] (200)
   * Note: Only returns relationships for distributors in current org
   */
  app.get("/api/distributors/:id/manufacturers", async (req, res) => {
    try {
      const { organizationId } = (req as any).orgContext;

      const relationships = await storage.getDistributorManufacturers(
        req.params.id,
        organizationId
      );
      
      res.json(relationships);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * POST /api/distributors/:id/manufacturers
   * Add manufacturer relationship to distributor
   * 
   * Path params:
   * - id: string (UUID) - Distributor ID
   * 
   * Body:
   * - manufacturerName: string (required)
   * - isPreferred: "yes" | "no" (optional)
   * - notes: string (optional)
   * 
   * Returns: DistributorManufacturer (201) | Not Found (404) | Conflict (409)
   * 
   * Validation:
   * - Verifies distributor exists and belongs to org
   * - Prevents duplicate relationships (org/distributor/manufacturer combo must be unique)
   * 
   * Side effects:
   * - Creates audit log entry
   */
  app.post("/api/distributors/:id/manufacturers", async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).orgContext;

      const validated = insertDistributorManufacturerSchema.parse({
        ...req.body,
        distributorId: req.params.id,
        organizationId,
        manufacturerName: req.body.manufacturerName?.trim(),
        notes: req.body.notes?.trim(),
      });

      // Verify distributor exists and belongs to this org
      const distributor = await storage.getDistributor(
        req.params.id, 
        organizationId
      );
      
      if (!distributor) {
        return res.status(404).json({ 
          error: "Not found",
          message: "Distributor not found or you don't have access to it"
        });
      }

      // Check for duplicate relationship
      const existingLink = await storage.getDistributorManufacturerLink(
        req.params.id,
        validated.manufacturerName,
        organizationId
      );

      if (existingLink) {
        return res.status(409).json({
          error: "Conflict",
          message: `Relationship already exists between ${distributor.name} and ${validated.manufacturerName}`,
          details: "This distributor is already linked to this manufacturer"
        });
      }

      const newRelationship = await storage.createDistributorManufacturer(validated);
      
      // Audit log
      await logAuditEvent(
        userId,
        organizationId,
        "distributor.manufacturer_added",
        "distributor",
        distributor.id,
        {
          distributorName: distributor.name,
          manufacturerName: newRelationship.manufacturerName,
          isPreferred: newRelationship.isPreferred,
        }
      );
      
      res.status(201).json(newRelationship);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * DELETE /api/distributors/:id/manufacturers/:linkId
   * Remove manufacturer relationship from distributor
   * 
   * Path params:
   * - id: string (UUID) - Distributor ID (for audit context)
   * - linkId: string (UUID) - Relationship ID
   * 
   * Returns: No Content (204) | Not Found (404)
   * 
   * Side effects:
   * - Creates audit log entry
   */
  app.delete("/api/distributors/:id/manufacturers/:linkId", async (req, res) => {
    try {
      const { organizationId, userId } = (req as any).orgContext;

      const success = await storage.deleteDistributorManufacturer(
        req.params.linkId,
        organizationId
      );
      
      if (!success) {
        return res.status(404).json({ 
          error: "Not found",
          message: "Manufacturer relationship not found or you don't have access to it"
        });
      }
      
      // Audit log
      await logAuditEvent(
        userId,
        organizationId,
        "distributor.manufacturer_removed",
        "distributor",
        req.params.id,
        { linkId: req.params.linkId }
      );
      
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
}
