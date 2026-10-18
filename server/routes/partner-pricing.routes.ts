import type { Express, Request, Response } from "express";
import type { RouteDependencies } from "./deps";
import type { PartnerCodeMapping } from "@shared/schema";
import { z } from "zod";
import { 
  makeTemplate, 
  generateCacheKey, 
  convertCodes, 
  validateTTL,
  type OpeningItem,
  type PriceRequestLine,
  type CodeConversionResult,
  type PartnerPriceResult
} from "@shared/partner-pricing";
import { handleValidationError } from "../utils/error-handler";
import { getOrganizationContext } from "../clerkAuth";
import { db } from "../db";
import { eq, and, or, gt, sql, isNull } from "drizzle-orm";
import { partnerVendors, partnerCodeMappings, priceComparisonCache } from "@shared/schema";

/**
 * Register Partner Pricing API routes
 * Provides template generation, code conversion, and multi-partner price comparison
 */
export async function registerPartnerPricingRoutes(
  app: Express,
  deps: RouteDependencies
) {
  const { storage, logError, logAuditEvent } = deps;
  
  /**
   * GET /api/template
   * Generate CSV template with default option codes
   */
  app.get("/api/template", async (req: Request, res: Response) => {
    try {
      const appliesTo = (req.query.applies_to as string) || "door";
      const market = (req.query.market as string) || "commercial";
      const count = parseInt(req.query.count as string) || 5;
      
      // Validate inputs
      if (!["door", "frame"].includes(appliesTo)) {
        return res.status(400).json({ error: "Invalid applies_to value. Must be 'door' or 'frame'" });
      }
      if (!["residential", "commercial"].includes(market)) {
        return res.status(400).json({ error: "Invalid market value. Must be 'residential' or 'commercial'" });
      }
      
      // For now, use basic defaults. In production, this would load from options_dropdowns.json
      const defaultCodes = appliesTo === "door" 
        ? ["HM16G-G90", "FR-ULX", "GL-FR"]
        : ["HM16G-G90", "HINGE-CONT-FS"];
      
      const csvContent = makeTemplate(
        appliesTo as "door" | "frame",
        market as "residential" | "commercial",
        count,
        defaultCodes
      );
      
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const filename = `template_${appliesTo}_${market}_${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
      
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
  
  /**
   * POST /api/partners/convert
   * Convert internal codes to partner-specific codes
   */
  app.post("/api/partners/convert", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        partner_id: z.string(),
        items: z.array(z.object({
          opening_id: z.string(),
          qty: z.number(),
          codes: z.array(z.string())
        }))
      });
      
      const { partner_id, items } = schema.parse(req.body);
      
      // Require authentication and organization context
      const orgContext = await getOrganizationContext(req);
      if (!orgContext || !orgContext.organizationId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get partner's code mappings with deterministic precedence
      // Fetch both org-specific and system-wide mappings in a single query
      const allMappings = await db
        .select()
        .from(partnerCodeMappings)
        .where(
          and(
            eq(partnerCodeMappings.partnerId, partner_id),
            // Get org-specific OR system-wide (null org_id)
            or(
              eq(partnerCodeMappings.organizationId, orgContext.organizationId),
              isNull(partnerCodeMappings.organizationId)
            )
          )
        )
        .orderBy(
          // Deterministic ordering: org-specific (NOT NULL) first, then system-wide (NULL)
          // Using CASE to sort NULL values last
          sql`CASE WHEN ${partnerCodeMappings.organizationId} IS NULL THEN 1 ELSE 0 END`,
          partnerCodeMappings.internalCode  // Secondary sort for consistency
        );
      
      // Build mapping lookup (org-specific takes precedence due to ordering)
      const codeMap = new Map<string, string>();
      allMappings.forEach((m: PartnerCodeMapping) => {
        // First occurrence wins (org-specific comes first due to ordering)
        if (!codeMap.has(m.internalCode)) {
          codeMap.set(m.internalCode, m.partnerCode);
        }
      });
      
      // Convert codes for each line item
      const convertedLines: PriceRequestLine[] = [];
      const allUnmappedCodes = new Set<string>();
      
      items.forEach(item => {
        const { convertedCodes, unmappedCodes } = convertCodes(item.codes, codeMap);
        
        convertedLines.push({
          opening_id: item.opening_id,
          qty: item.qty,
          codes: convertedCodes.length > 0 ? convertedCodes : item.codes // Fallback to original if no mapping
        });
        
        unmappedCodes.forEach(code => allUnmappedCodes.add(code));
      });
      
      const result: CodeConversionResult = {
        partner_id,
        lines: convertedLines,
        unmapped_codes: Array.from(allUnmappedCodes)
      };
      
      res.json(result);
      
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
  
  /**
   * POST /api/partners/price
   * Get pricing from a single partner (cache-first honest response)
   */
  app.post("/api/partners/price", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        partner_id: z.string(),
        lines: z.array(z.object({
          opening_id: z.string(),
          qty: z.number(),
          codes: z.array(z.string())
        }))
      });
      
      const { partner_id, lines } = schema.parse(req.body);
      
      // Require authentication and organization context
      const orgContext = await getOrganizationContext(req);
      if (!orgContext || !orgContext.organizationId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // 1. Verify partner exists
      const partner = await db.query.partnerVendors.findFirst({
        where: and(
          eq(partnerVendors.partnerId, partner_id),
          eq(partnerVendors.isActive, "yes")
        )
      });

      if (!partner) {
        return res.status(404).json({ error: `Partner ${partner_id} not found or inactive` });
      }
      
      // 2. Generate cache key
      const cacheKey = generateCacheKey(orgContext.organizationId, partner_id, lines);

      // 3. Query priceComparisonCache for a cached result
      const cached = await db
        .select()
        .from(priceComparisonCache)
        .where(
          and(
            eq(priceComparisonCache.organizationId, orgContext.organizationId),
            eq(priceComparisonCache.cacheKey, cacheKey),
            gt(priceComparisonCache.expiresAt, new Date())
          )
        )
        .limit(1);
      
      // 4. If cache hit: return cached response
      if (cached.length > 0) {
        return res.json({
          ...cached[0].responseData as object,
          cached: true
        });
      }

      // 5. If cache miss: return unavailable message
      res.json({
        partner_id,
        total: null,
        currency: "USD",
        cached: false,
        message: "Live pricing requires partner API credentials. Configure them in Integrations settings."
      });
      
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
  
  /**
   * POST /api/partners/price_multi
   * Compare pricing across multiple partners
   */
  app.post("/api/partners/price_multi", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        partners: z.array(z.string()),
        items: z.array(z.object({
          opening_id: z.string(),
          qty: z.number(),
          codes: z.array(z.string())
        })),
        use_cache: z.boolean().optional().default(true),
        ttl: z.number().optional().default(1800)
      });
      
      const { partners, items, use_cache, ttl } = schema.parse(req.body);
      
      // Require authentication and organization context
      const orgContext = await getOrganizationContext(req);
      if (!orgContext || !orgContext.organizationId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const validTTL = validateTTL(ttl);
      
      const results: PartnerPriceResult[] = [];
      
      for (const partnerId of partners) {
        try {
          // Step 1: Convert codes
          const conversionResponse = await fetch(`${req.protocol}://${req.get('host')}/api/partners/convert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.cookie || ''
            },
            body: JSON.stringify({
              partner_id: partnerId,
              items
            })
          });
          
          // Abort on conversion failure (401, 400, 500, etc.)
          if (!conversionResponse.ok) {
            const errorText = await conversionResponse.text();
            throw new Error(`Code conversion failed for partner ${partnerId}: ${conversionResponse.status} ${errorText}`);
          }
          
          const conversion: CodeConversionResult = await conversionResponse.json();
          
          // Verify conversion has required data
          if (!conversion.lines || conversion.lines.length === 0) {
            throw new Error(`Code conversion returned no lines for partner ${partnerId}`);
          }
          
          // Step 2: Check cache
          let priceResult = null;
          let fromCache = false;
          
          if (use_cache) {
            const cacheKey = generateCacheKey(orgContext.organizationId, partnerId, conversion.lines);
            const cached = await db
              .select()
              .from(priceComparisonCache)
              .where(
                and(
                  eq(priceComparisonCache.organizationId, orgContext.organizationId),
                  eq(priceComparisonCache.cacheKey, cacheKey),
                  gt(priceComparisonCache.expiresAt, new Date())
                )
              )
              .limit(1);
            
            if (cached.length > 0) {
              priceResult = cached[0].responseData;
              fromCache = true;
            }
          }
          
          // Step 3: Get price (from cache or API)
          if (!priceResult) {
            const priceResponse = await fetch(`${req.protocol}://${req.get('host')}/api/partners/price`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': req.headers.cookie || ''
              },
              body: JSON.stringify({
                partner_id: partnerId,
                lines: conversion.lines
              })
            });
            
            priceResult = await priceResponse.json();
            
            // Cache the result
            if (use_cache && priceResult.total !== undefined) {
              const cacheKey = generateCacheKey(orgContext.organizationId, partnerId, conversion.lines);
              const expiresAt = new Date(Date.now() + validTTL * 1000);
              
              await db.insert(priceComparisonCache).values({
                organizationId: orgContext.organizationId,
                cacheKey,
                partnerId,
                requestData: { partner_id: partnerId, lines: conversion.lines },
                responseData: priceResult,
                expiresAt
              }).onConflictDoUpdate({
                target: [priceComparisonCache.organizationId, priceComparisonCache.cacheKey],
                set: {
                  responseData: priceResult,
                  expiresAt
                }
              });
            }
          }
          
          results.push({
            partner_id: partnerId,
            total: priceResult.total,
            currency: priceResult.currency,
            cached: fromCache,
            unmapped_codes: conversion.unmapped_codes
          });
          
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), {
            context: 'partner-price-fetch',
            partnerId
          });
          
          results.push({
            partner_id: partnerId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Sort by total (nulls last)
      results.sort((a, b) => {
        if (a.total === undefined && b.total === undefined) return 0;
        if (a.total === undefined) return 1;
        if (b.total === undefined) return -1;
        return a.total - b.total;
      });
      
      res.json({ partners: results });
      
    } catch (error) {
      handleValidationError(error, res, logError);
    }
  });
}
