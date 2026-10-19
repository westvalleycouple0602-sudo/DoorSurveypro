import type { Express, Request, Response } from "express";
import type { RouteDependencies } from "./deps";
import { getOrganizationContext } from "../clerkAuth";
import { insertKeyRecordSchema, updateKeyRecordSchema } from "@shared/schema";
import { handleValidationError } from "../utils/error-handler";

export async function registerKeyRecordsRoutes(app: Express, deps: RouteDependencies) {
  const { storage, logError, logAuditEvent } = deps;

  /**
   * GET /api/key-records
   * Get all key records for the organization
   */
  app.get("/api/key-records", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const records = await storage.getKeyRecords(orgContext.organizationId);
      res.json(records);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/key-records/:id
   * Get a specific key record
   */
  app.get("/api/key-records/:id", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const record = await storage.getKeyRecord(req.params.id, orgContext.organizationId);
      
      if (!record) {
        return res.status(404).json({ error: "Key record not found" });
      }

      res.json(record);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * POST /api/key-records
   * Create a new key record
   */
  app.post("/api/key-records", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validationResult = insertKeyRecordSchema.safeParse({
        ...req.body,
        organizationId: orgContext.organizationId,
      });

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues,
        });
      }

      const newRecord = await storage.createKeyRecord(validationResult.data);

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "key_record.created",
        "key_record",
        newRecord.id,
        { 
          doorLabel: newRecord.doorLabel, 
          location: newRecord.location,
        }
      );

      res.status(201).json(newRecord);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * PATCH /api/key-records/:id
   * Update a key record
   */
  app.patch("/api/key-records/:id", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validationResult = updateKeyRecordSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues,
        });
      }

      const updatedRecord = await storage.updateKeyRecord(
        req.params.id,
        orgContext.organizationId,
        validationResult.data
      );

      if (!updatedRecord) {
        return res.status(404).json({ error: "Key record not found" });
      }

      logAuditEvent(
        orgContext.userId,
        orgContext.organizationId,
        "key_record.updated",
        "key_record",
        updatedRecord.id,
        { 
          doorLabel: updatedRecord.doorLabel,
          changes: Object.keys(validationResult.data),
        }
      );

      res.json(updatedRecord);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * DELETE /api/key-records/:id
   * Delete a key record
   */
  app.delete("/api/key-records/:id", async (req: Request, res: Response) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const record = await storage.getKeyRecord(req.params.id, orgContext.organizationId);
      
      if (!record) {
        return res.status(404).json({ error: "Key record not found" });
      }

      const deleted = await storage.deleteKeyRecord(req.params.id, orgContext.organizationId);

      if (deleted) {
        logAuditEvent(
          orgContext.userId,
          orgContext.organizationId,
          "key_record.deleted",
          "key_record",
          req.params.id,
          { doorLabel: record.doorLabel }
        );
      }

      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
}
