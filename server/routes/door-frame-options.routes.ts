import type { Express, Request, Response } from "express";
import type { RouteDependencies } from "./deps";
import { z } from "zod";
import { handleValidationError } from "../utils/error-handler";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { doorFrameOptions, optionValidationRules } from "@shared/schema";

/**
 * Register Door/Frame Options API routes
 * Provides hierarchical dropdown data and validation rules for door/frame configuration
 */
export async function registerDoorFrameOptionsRoutes(
  app: Express,
  deps: RouteDependencies
) {
  const { logError } = deps;

  /**
   * GET /api/door-frame-options
   * Get all door/frame options (optionally filtered)
   */
  app.get("/api/door-frame-options", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        applies_to: z.enum(["door", "frame"]).optional(),
        market: z.enum(["commercial", "residential", "both"]).optional(),
        attribute_group: z.string().optional(),
        attribute_name: z.string().optional(),
      });

      const filters = schema.parse(req.query);
      
      // Build where conditions
      const conditions = [];
      if (filters.applies_to) {
        conditions.push(eq(doorFrameOptions.appliesTo, filters.applies_to));
      }
      if (filters.market) {
        conditions.push(eq(doorFrameOptions.market, filters.market));
      }
      if (filters.attribute_group) {
        conditions.push(eq(doorFrameOptions.attributeGroup, filters.attribute_group));
      }
      if (filters.attribute_name) {
        conditions.push(eq(doorFrameOptions.attributeName, filters.attribute_name));
      }

      const options = await db
        .select()
        .from(doorFrameOptions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(doorFrameOptions.appliesTo, doorFrameOptions.market, doorFrameOptions.attributeGroup, doorFrameOptions.attributeName);

      res.json(options);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/door-frame-options/hierarchical
   * Get options in hierarchical structure for dropdown UIs
   * Structure: { door: { commercial: { "Material": { "Door Material": [...options] } } } }
   */
  app.get("/api/door-frame-options/hierarchical", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        applies_to: z.enum(["door", "frame"]).optional(),
        market: z.enum(["commercial", "residential", "both"]).optional(),
      });

      const filters = schema.parse(req.query);
      
      // Build where conditions
      const conditions = [];
      if (filters.applies_to) {
        conditions.push(eq(doorFrameOptions.appliesTo, filters.applies_to));
      }
      if (filters.market) {
        conditions.push(eq(doorFrameOptions.market, filters.market));
      }

      const options = await db
        .select()
        .from(doorFrameOptions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(doorFrameOptions.appliesTo, doorFrameOptions.market, doorFrameOptions.attributeGroup, doorFrameOptions.attributeName);

      // Build hierarchical structure
      const hierarchical: Record<string, any> = {};

      options.forEach((option) => {
        // Ensure path exists: appliesTo -> market -> attributeGroup -> attributeName -> []
        if (!hierarchical[option.appliesTo]) {
          hierarchical[option.appliesTo] = {};
        }
        if (!hierarchical[option.appliesTo][option.market]) {
          hierarchical[option.appliesTo][option.market] = {};
        }
        if (!hierarchical[option.appliesTo][option.market][option.attributeGroup]) {
          hierarchical[option.appliesTo][option.market][option.attributeGroup] = {};
        }
        if (!hierarchical[option.appliesTo][option.market][option.attributeGroup][option.attributeName]) {
          hierarchical[option.appliesTo][option.market][option.attributeGroup][option.attributeName] = [];
        }

        // Add option to the array
        hierarchical[option.appliesTo][option.market][option.attributeGroup][option.attributeName].push({
          id: option.id,
          value: option.value,
          code: option.valueCode,
          description: option.description,
          compatibility: option.compatibility,
          standards: option.standardsCodes,
          cost_impact: option.costImpact,
          lead_time_impact: option.leadTimeImpact,
          default: option.isDefault === "yes",
          notes: option.notes,
        });
      });

      res.json(hierarchical);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });

  /**
   * GET /api/validation-rules
   * Get validation rules for cross-field dependencies
   */
  app.get("/api/validation-rules", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        applies_to: z.enum(["door", "frame"]).optional(),
        active_only: z.enum(["true", "false"]).optional().default("true"),
      });

      const filters = schema.parse(req.query);
      
      // Build where conditions
      const conditions = [];
      if (filters.applies_to) {
        conditions.push(eq(optionValidationRules.appliesTo, filters.applies_to));
      }
      if (filters.active_only === "true") {
        conditions.push(eq(optionValidationRules.isActive, "yes"));
      }

      const rules = await db
        .select()
        .from(optionValidationRules)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(optionValidationRules.appliesTo, optionValidationRules.severity);

      res.json(rules);
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
}
