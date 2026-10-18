import type { Express, Request, Response } from "express";
import type { RouteDependencies } from "./deps";
import { getOrganizationContext } from "../clerkAuth";
import { 
  insertMasterKeySystemSchema, 
  type MasterKeySystemData,
  MASTER_KEY_MANUFACTURERS,
  KEY_LEVEL_TYPES,
} from "@shared/schema";
import { handleValidationError } from "../utils/error-handler";

export async function registerMasterKeyingRoutes(app: Express, deps: RouteDependencies) {
  const { storage, logError, logAuditEvent } = deps;

  /**
   * GET /api/master-keying/systems
   * Get all master key systems for the organization
   * Query params: projectId, facilityId
   */
  app.get("/api/master-keying/systems", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const { projectId, facilityId } = req.query;

      let systems = await storage.getMasterKeySystems(orgContext.organizationId);

      if (projectId) {
        systems = systems.filter(s => s.projectId === projectId);
      }
      if (facilityId) {
        systems = systems.filter(s => s.facilityId === facilityId);
      }

      res.json(systems);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/master-keying/systems/:id
   * Get a specific master key system
   */
  app.get("/api/master-keying/systems/:id", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const system = await storage.getMasterKeySystem(req.params.id, orgContext.organizationId);
      
      if (!system) {
        return res.status(404).json({ error: "Master key system not found" });
      }

      res.json(system);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * POST /api/master-keying/systems
   * Create a new master key system
   */
  app.post("/api/master-keying/systems", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validationResult = insertMasterKeySystemSchema.safeParse({
        ...req.body,
        organizationId: orgContext.organizationId,
      });

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues,
        });
      }

      const now = new Date().toISOString();
      const systemData = validationResult.data;
      
      const data = systemData.data as MasterKeySystemData;
      if (!data.createdAt) {
        data.createdAt = now;
      }
      if (!data.updatedAt) {
        data.updatedAt = now;
      }

      const newSystem = await storage.createMasterKeySystem({
        ...systemData,
        data,
      });

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "master_key_system.created",
        "master_key_system",
        newSystem.id,
        { 
          name: newSystem.name, 
          facilityName: newSystem.facilityName,
          manufacturer: newSystem.manufacturer,
        }
      );

      res.status(201).json(newSystem);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * PATCH /api/master-keying/systems/:id
   * Update an existing master key system
   */
  app.patch("/api/master-keying/systems/:id", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const existing = await storage.getMasterKeySystem(req.params.id, orgContext.organizationId);
      if (!existing) {
        return res.status(404).json({ error: "Master key system not found" });
      }

      const updateSchema = insertMasterKeySystemSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues,
        });
      }

      const updateData = validationResult.data;
      
      if (updateData.data) {
        const data = updateData.data as MasterKeySystemData;
        data.updatedAt = new Date().toISOString();
        updateData.data = data;
      }

      const updated = await storage.updateMasterKeySystem(
        req.params.id, 
        orgContext.organizationId, 
        updateData
      );

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "master_key_system.updated",
        "master_key_system",
        req.params.id,
        { updatedFields: Object.keys(updateData) }
      );

      res.json(updated);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * DELETE /api/master-keying/systems/:id
   * Delete a master key system
   */
  app.delete("/api/master-keying/systems/:id", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const existing = await storage.getMasterKeySystem(req.params.id, orgContext.organizationId);
      if (!existing) {
        return res.status(404).json({ error: "Master key system not found" });
      }

      const deleted = await storage.deleteMasterKeySystem(req.params.id, orgContext.organizationId);

      if (deleted) {
        logAuditEvent(
          orgContext.userId,
          orgContext.organizationId,
          "master_key_system.deleted",
          "master_key_system",
          req.params.id,
          { 
            name: existing.name,
            facilityName: existing.facilityName,
          }
        );
      }

      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/master-keying/systems/:id/export
   * Export a master key system with optional redaction for customer view
   * Query params: view (internal | customer)
   */
  app.get("/api/master-keying/systems/:id/export", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const view = (req.query.view as string) || "internal";
      const system = await storage.getMasterKeySystem(req.params.id, orgContext.organizationId);
      
      if (!system) {
        return res.status(404).json({ error: "Master key system not found" });
      }

      const data = system.data as MasterKeySystemData;
      
      if (view === "customer" && data.brand) {
        const redactedData = { ...data };
        const redactedNodes = data.nodes.map(node => {
          const redacted = { ...node };
          
          if (data.brand?.hideBittingOnCustomerView) {
            redacted.bitting = "***REDACTED***";
          }
          
          if (data.brand?.hideKeywayOnCustomerView) {
            redacted.keywayId = undefined;
          }
          
          if (data.brand?.hideManufacturerNamesOnCustomerView) {
            redacted.manufacturer = undefined;
          }
          
          return redacted;
        });
        
        const redactedKeyways = data.brand?.hideManufacturerNamesOnCustomerView
          ? data.keyways.map(k => ({ ...k, manufacturer: "***" }))
          : data.keyways;
        
        redactedData.nodes = redactedNodes;
        redactedData.keyways = redactedKeyways;
        
        res.json({
          ...system,
          data: redactedData,
          exportedAt: new Date().toISOString(),
          view,
        });
      } else {
        res.json({
          ...system,
          exportedAt: new Date().toISOString(),
          view,
        });
      }
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/master-keying/manufacturers
   * Get list of supported manufacturers with presets
   */
  app.get("/api/master-keying/manufacturers", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      res.json({
        manufacturers: Object.values(MASTER_KEY_MANUFACTURERS),
        presets: {
          Allegion: {
            keyways: [
              { name: "Schlage C", notes: "Standard Schlage keyway" },
              { name: "Schlage E", notes: "Everest keyway with high security" },
              { name: "Schlage Primus", notes: "High-security patented keyway" },
            ],
          },
          "ASSA ABLOY": {
            keyways: [
              { name: "Yale 8", notes: "Standard Yale keyway" },
              { name: "Sargent U", notes: "Universal Sargent keyway" },
              { name: "Corbin Russwin Z", notes: "High-security keyway" },
            ],
          },
          dormakaba: {
            keyways: [
              { name: "Best A", notes: "Standard Best/dormakaba keyway" },
              { name: "Peaks", notes: "High-security platform" },
            ],
          },
          Medeco: {
            keyways: [
              { name: "Original", notes: "Classic Medeco rotating pin" },
              { name: "M3", notes: "Slider and lifter design" },
              { name: "XT", notes: "Extended security platform" },
            ],
          },
          Best: {
            keyways: [
              { name: "Best WB", notes: "Wide bottom keyway" },
              { name: "Best A2", notes: "A2 system keyway" },
            ],
          },
        },
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/master-keying/key-levels
   * Get list of supported key level types
   */
  app.get("/api/master-keying/key-levels", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      res.json({
        levels: Object.entries(KEY_LEVEL_TYPES).map(([key, value]) => ({
          type: value,
          name: key,
          description: getKeyLevelDescription(value),
        })),
      });
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
}

function getKeyLevelDescription(type: string): string {
  switch (type) {
    case "GMK":
      return "Grand Master Key - Opens all locks in the entire system";
    case "MK":
      return "Master Key - Opens a section/zone of locks";
    case "SMK":
      return "Sub-Master Key - Opens a subset within a master zone";
    case "CHANGE":
      return "Change Key - Opens only one specific lock";
    case "CONSTRUCTION":
      return "Construction Key - Temporary key for construction phase";
    case "VENDOR":
      return "Vendor/Service Key - Limited access for service personnel";
    case "SPECIAL":
      return "Special Purpose Key - Custom access designation";
    default:
      return "Unknown key level type";
  }
}
