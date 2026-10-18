import { Router } from "express";
import { db } from "../db";
import {
  lockProductTypes,
  manufacturerTimelines,
  brandMarketTiers,
  brandComplianceProfiles,
  brandLockAssets,
} from "@shared/schemas/catalog.schema";
import { eq, sql, asc, desc, like } from "drizzle-orm";

const router = Router();

/**
 * GET /api/lock-data/product-types
 * Get all lock product types with optional filtering
 * Query params: family, applications, vertical
 */
router.get("/product-types", async (req, res) => {
  try {
    const { family, applications, vertical } = req.query;

    const conditions = [eq(lockProductTypes.isActive, "yes")];

    if (family) {
      conditions.push(like(lockProductTypes.productFamily, `%${family}%`));
    }
    if (applications) {
      conditions.push(eq(lockProductTypes.primaryApplications, applications as string));
    }
    if (vertical) {
      conditions.push(like(lockProductTypes.primaryVerticals, `%${vertical}%`));
    }

    const types = await db
      .select()
      .from(lockProductTypes)
      .where(conditions.length > 1 ? sql`${sql.join(conditions, sql` AND `)}` : conditions[0])
      .orderBy(asc(lockProductTypes.productFamily), asc(lockProductTypes.subcategory));

    res.json(types);
  } catch (error) {
    console.error("Error fetching lock product types:", error);
    res.status(500).json({ error: "Failed to fetch lock product types" });
  }
});

/**
 * GET /api/lock-data/product-types/:lockTypeId
 * Get a specific lock product type by lock_type_id
 */
router.get("/product-types/:lockTypeId", async (req, res) => {
  try {
    const { lockTypeId } = req.params;

    const lockType = await db
      .select()
      .from(lockProductTypes)
      .where(eq(lockProductTypes.lockTypeId, lockTypeId))
      .limit(1);

    if (lockType.length === 0) {
      return res.status(404).json({ error: "Lock product type not found" });
    }

    res.json(lockType[0]);
  } catch (error) {
    console.error("Error fetching lock product type:", error);
    res.status(500).json({ error: "Failed to fetch lock product type" });
  }
});

/**
 * GET /api/lock-data/product-families
 * Get unique product families
 */
router.get("/product-families", async (req, res) => {
  try {
    const families = await db
      .selectDistinct({ productFamily: lockProductTypes.productFamily })
      .from(lockProductTypes)
      .where(eq(lockProductTypes.isActive, "yes"))
      .orderBy(asc(lockProductTypes.productFamily));

    res.json(families.map((f) => f.productFamily));
  } catch (error) {
    console.error("Error fetching product families:", error);
    res.status(500).json({ error: "Failed to fetch product families" });
  }
});

/**
 * GET /api/lock-data/manufacturer-timelines
 * Get manufacturer timeline and acquisition data
 * Query params: parentGroup, status, region
 */
router.get("/manufacturer-timelines", async (req, res) => {
  try {
    const { parentGroup, status, region } = req.query;

    const conditions = [eq(manufacturerTimelines.isActive, "yes")];

    if (parentGroup) {
      conditions.push(eq(manufacturerTimelines.parentGroup, parentGroup as string));
    }
    if (status) {
      conditions.push(eq(manufacturerTimelines.status, status as string));
    }
    if (region) {
      conditions.push(like(manufacturerTimelines.regionPrimary, `%${region}%`));
    }

    const timelines = await db
      .select()
      .from(manufacturerTimelines)
      .where(conditions.length > 1 ? sql`${sql.join(conditions, sql` AND `)}` : conditions[0])
      .orderBy(asc(manufacturerTimelines.brandName));

    res.json(timelines);
  } catch (error) {
    console.error("Error fetching manufacturer timelines:", error);
    res.status(500).json({ error: "Failed to fetch manufacturer timelines" });
  }
});

/**
 * GET /api/lock-data/manufacturer-timelines/:brandName
 * Get timeline data for a specific brand
 */
router.get("/manufacturer-timelines/:brandName", async (req, res) => {
  try {
    const { brandName } = req.params;

    const timeline = await db
      .select()
      .from(manufacturerTimelines)
      .where(sql`LOWER(${manufacturerTimelines.brandName}) = LOWER(${brandName})`)
      .limit(1);

    if (timeline.length === 0) {
      return res.status(404).json({ error: "Manufacturer timeline not found" });
    }

    res.json(timeline[0]);
  } catch (error) {
    console.error("Error fetching manufacturer timeline:", error);
    res.status(500).json({ error: "Failed to fetch manufacturer timeline" });
  }
});

/**
 * GET /api/lock-data/brand-market-tiers
 * Get brand market positioning and tier information
 * Query params: segment, tier, parentGroup
 */
router.get("/brand-market-tiers", async (req, res) => {
  try {
    const { segment, tier, parentGroup } = req.query;

    const conditions = [eq(brandMarketTiers.isActive, "yes")];

    if (segment) {
      conditions.push(like(brandMarketTiers.marketSegment, `%${segment}%`));
    }
    if (tier) {
      conditions.push(like(brandMarketTiers.priceTier, `%${tier}%`));
    }
    if (parentGroup) {
      conditions.push(eq(brandMarketTiers.parentGroup, parentGroup as string));
    }

    const tiers = await db
      .select()
      .from(brandMarketTiers)
      .where(conditions.length > 1 ? sql`${sql.join(conditions, sql` AND `)}` : conditions[0])
      .orderBy(asc(brandMarketTiers.brandName));

    res.json(tiers);
  } catch (error) {
    console.error("Error fetching brand market tiers:", error);
    res.status(500).json({ error: "Failed to fetch brand market tiers" });
  }
});

/**
 * GET /api/lock-data/brand-market-tiers/:brandName
 * Get market tier data for a specific brand
 */
router.get("/brand-market-tiers/:brandName", async (req, res) => {
  try {
    const { brandName } = req.params;

    const tier = await db
      .select()
      .from(brandMarketTiers)
      .where(sql`LOWER(${brandMarketTiers.brandName}) = LOWER(${brandName})`)
      .limit(1);

    if (tier.length === 0) {
      return res.status(404).json({ error: "Brand market tier not found" });
    }

    res.json(tier[0]);
  } catch (error) {
    console.error("Error fetching brand market tier:", error);
    res.status(500).json({ error: "Failed to fetch brand market tier" });
  }
});

/**
 * GET /api/lock-data/brand-compliance
 * Get brand compliance and certification profiles
 * Query params: bhmaGrade, adaRelevance, parentGroup
 */
router.get("/brand-compliance", async (req, res) => {
  try {
    const { bhmaGrade, adaRelevance, parentGroup } = req.query;

    const conditions = [eq(brandComplianceProfiles.isActive, "yes")];

    if (bhmaGrade) {
      conditions.push(like(brandComplianceProfiles.bhmaGradeFocus, `%${bhmaGrade}%`));
    }
    if (adaRelevance) {
      conditions.push(eq(brandComplianceProfiles.adaRelevance, adaRelevance as string));
    }
    if (parentGroup) {
      conditions.push(eq(brandComplianceProfiles.parentGroup, parentGroup as string));
    }

    const profiles = await db
      .select()
      .from(brandComplianceProfiles)
      .where(conditions.length > 1 ? sql`${sql.join(conditions, sql` AND `)}` : conditions[0])
      .orderBy(asc(brandComplianceProfiles.brandName));

    res.json(profiles);
  } catch (error) {
    console.error("Error fetching brand compliance profiles:", error);
    res.status(500).json({ error: "Failed to fetch brand compliance profiles" });
  }
});

/**
 * GET /api/lock-data/brand-compliance/:brandName
 * Get compliance profile for a specific brand
 */
router.get("/brand-compliance/:brandName", async (req, res) => {
  try {
    const { brandName } = req.params;

    const profile = await db
      .select()
      .from(brandComplianceProfiles)
      .where(sql`LOWER(${brandComplianceProfiles.brandName}) = LOWER(${brandName})`)
      .limit(1);

    if (profile.length === 0) {
      return res.status(404).json({ error: "Brand compliance profile not found" });
    }

    res.json(profile[0]);
  } catch (error) {
    console.error("Error fetching brand compliance profile:", error);
    res.status(500).json({ error: "Failed to fetch brand compliance profile" });
  }
});

/**
 * GET /api/lock-data/assets
 * Get brand and lock assets (logos, icons)
 * Query params: type, group, format
 */
router.get("/assets", async (req, res) => {
  try {
    const { type, group, format } = req.query;

    const conditions = [eq(brandLockAssets.isActive, "yes")];

    if (type) {
      conditions.push(eq(brandLockAssets.assetType, type as string));
    }
    if (group) {
      conditions.push(eq(brandLockAssets.logicalGroup, group as string));
    }
    if (format) {
      conditions.push(eq(brandLockAssets.fileFormat, format as string));
    }

    const assets = await db
      .select()
      .from(brandLockAssets)
      .where(conditions.length > 1 ? sql`${sql.join(conditions, sql` AND `)}` : conditions[0])
      .orderBy(asc(brandLockAssets.assetKey));

    res.json(assets);
  } catch (error) {
    console.error("Error fetching brand/lock assets:", error);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

/**
 * GET /api/lock-data/assets/:assetKey(*)
 * Get a specific asset by asset key (supports slashes in key, e.g., "logos/yale")
 * Note: Asset key should be URL-encoded if it contains special characters
 */
router.get("/assets/:assetKey(*)", async (req, res) => {
  try {
    // Use req.params[0] to get the full wildcard match, or req.params.assetKey
    const assetKey = decodeURIComponent(req.params.assetKey || req.params[0] || "");

    if (!assetKey) {
      return res.status(400).json({ error: "Asset key is required" });
    }

    const asset = await db
      .select()
      .from(brandLockAssets)
      .where(eq(brandLockAssets.assetKey, assetKey))
      .limit(1);

    if (asset.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    res.json(asset[0]);
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.status(500).json({ error: "Failed to fetch asset" });
  }
});

/**
 * GET /api/lock-data/brand/:brandName/complete
 * Get complete brand information (timeline, market tier, compliance) for a specific brand
 */
router.get("/brand/:brandName/complete", async (req, res) => {
  try {
    const { brandName } = req.params;

    const [timeline, marketTier, compliance] = await Promise.all([
      db
        .select()
        .from(manufacturerTimelines)
        .where(sql`LOWER(${manufacturerTimelines.brandName}) = LOWER(${brandName})`)
        .limit(1),
      db
        .select()
        .from(brandMarketTiers)
        .where(sql`LOWER(${brandMarketTiers.brandName}) = LOWER(${brandName})`)
        .limit(1),
      db
        .select()
        .from(brandComplianceProfiles)
        .where(sql`LOWER(${brandComplianceProfiles.brandName}) = LOWER(${brandName})`)
        .limit(1),
    ]);

    if (timeline.length === 0 && marketTier.length === 0 && compliance.length === 0) {
      return res.status(404).json({ error: "Brand information not found" });
    }

    res.json({
      timeline: timeline[0] || null,
      marketTier: marketTier[0] || null,
      compliance: compliance[0] || null,
    });
  } catch (error) {
    console.error("Error fetching complete brand information:", error);
    res.status(500).json({ error: "Failed to fetch brand information" });
  }
});

export default router;
