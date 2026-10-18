import { db } from "./db";
import { 
  lockProductTypes, 
  manufacturerTimelines, 
  brandMarketTiers, 
  brandComplianceProfiles,
  brandLockAssets 
} from "@shared/schemas/catalog.schema";
import { eq, sql } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Seed Lock Product Data
 * Imports comprehensive lock product types, manufacturer timelines, market positioning,
 * compliance profiles, and asset mappings from CSV files.
 */

interface LockProductTypeRow {
  lock_type_id: string;
  product_family: string;
  subcategory: string;
  mechanism_type: string;
  description: string;
  primary_applications: string;
  primary_verticals: string;
  bhma_relevant_grades: string;
  example_brands: string;
  icon_key: string;
}

interface ManufacturerTimelineRow {
  brand_name: string;
  parent_group: string;
  region_primary: string;
  founded_year_approx: string;
  acquired_by: string;
  acquisition_year_approx: string;
  status: string;
  notes: string;
  primary_verticals: string;
  hq_country: string;
  website_url: string;
  logo_key: string;
}

interface BrandMarketTierRow {
  brand_name: string;
  parent_group: string;
  market_segment: string;
  price_tier: string;
  primary_channels: string;
  common_end_users: string;
  primary_verticals: string;
  notes: string;
  logo_key: string;
}

interface BrandComplianceProfileRow {
  brand_name: string;
  parent_group: string;
  bhma_grade_focus: string;
  ul_fire_listing_focus: string;
  ada_relevance: string;
  en_ce_relevance: string;
  common_codes: string;
  industries_served: string;
  primary_verticals: string;
  primary_cert_bodies: string;
  notes: string;
  logo_key: string;
}

interface BrandLockAssetRow {
  asset_key: string;
  asset_type: string;
  logical_group: string;
  file_name: string;
  file_format: string;
  suggested_path: string;
  theme_variant: string;
  width_px: string;
  height_px: string;
  dpi: string;
  description: string;
}

async function seedLockProductTypes() {
  console.log("📦 Seeding lock product types...");

  const csvPath = join(__dirname, "../attached_assets/lock_product_types_v2_1763452080626.csv");
  const csvContent = readFileSync(csvPath, "utf-8");
  
  const records: LockProductTypeRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} lock product types in CSV`);

  let inserted = 0;
  let updated = 0;

  for (const row of records) {
    const existing = await db
      .select()
      .from(lockProductTypes)
      .where(eq(lockProductTypes.lockTypeId, row.lock_type_id))
      .limit(1);

    const data = {
      lockTypeId: row.lock_type_id,
      productFamily: row.product_family,
      subcategory: row.subcategory,
      mechanismType: row.mechanism_type || null,
      description: row.description || null,
      primaryApplications: row.primary_applications || null,
      primaryVerticals: row.primary_verticals || null,
      bhmaRelevantGrades: row.bhma_relevant_grades || null,
      exampleBrands: row.example_brands || null,
      iconKey: row.icon_key || null,
      isActive: "yes",
    };

    if (existing.length === 0) {
      await db.insert(lockProductTypes).values(data);
      inserted++;
    } else {
      await db
        .update(lockProductTypes)
        .set({ ...data, updatedAt: sql`now()` })
        .where(eq(lockProductTypes.lockTypeId, row.lock_type_id));
      updated++;
    }
  }

  console.log(`✅ Lock product types: ${inserted} inserted, ${updated} updated`);
}

async function seedManufacturerTimelines() {
  console.log("🏢 Seeding manufacturer timelines...");

  const csvPath = join(__dirname, "../attached_assets/manufacturer_timeline_v2_1763452080672.csv");
  const csvContent = readFileSync(csvPath, "utf-8");
  
  const records: ManufacturerTimelineRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} manufacturer timelines in CSV`);

  let inserted = 0;
  let updated = 0;

  for (const row of records) {
    const existing = await db
      .select()
      .from(manufacturerTimelines)
      .where(sql`LOWER(${manufacturerTimelines.brandName}) = LOWER(${row.brand_name})`)
      .limit(1);

    const foundedYear = row.founded_year_approx ? parseInt(row.founded_year_approx, 10) : null;
    const acquisitionYear = row.acquisition_year_approx ? parseInt(row.acquisition_year_approx, 10) : null;

    const data = {
      brandName: row.brand_name,
      parentGroup: row.parent_group || null,
      regionPrimary: row.region_primary || null,
      foundedYearApprox: (foundedYear && !isNaN(foundedYear)) ? foundedYear : null,
      acquiredBy: row.acquired_by || null,
      acquisitionYearApprox: (acquisitionYear && !isNaN(acquisitionYear)) ? acquisitionYear : null,
      status: row.status || "Active",
      notes: row.notes || null,
      primaryVerticals: row.primary_verticals || null,
      hqCountry: row.hq_country || null,
      websiteUrl: row.website_url || null,
      logoKey: row.logo_key || null,
      isActive: "yes",
    };

    if (existing.length === 0) {
      await db.insert(manufacturerTimelines).values(data);
      inserted++;
    } else {
      await db
        .update(manufacturerTimelines)
        .set({ ...data, updatedAt: sql`now()` })
        .where(sql`LOWER(${manufacturerTimelines.brandName}) = LOWER(${row.brand_name})`);
      updated++;
    }
  }

  console.log(`✅ Manufacturer timelines: ${inserted} inserted, ${updated} updated`);
}

async function seedBrandMarketTiers() {
  console.log("💰 Seeding brand market tiers...");

  const csvPath = join(__dirname, "../attached_assets/brand_market_tiers_v2_1763452080704.csv");
  const csvContent = readFileSync(csvPath, "utf-8");
  
  const records: BrandMarketTierRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} brand market tiers in CSV`);

  let inserted = 0;
  let updated = 0;

  for (const row of records) {
    const existing = await db
      .select()
      .from(brandMarketTiers)
      .where(sql`LOWER(${brandMarketTiers.brandName}) = LOWER(${row.brand_name})`)
      .limit(1);

    const data = {
      brandName: row.brand_name,
      parentGroup: row.parent_group || null,
      marketSegment: row.market_segment || null,
      priceTier: row.price_tier || null,
      primaryChannels: row.primary_channels || null,
      commonEndUsers: row.common_end_users || null,
      primaryVerticals: row.primary_verticals || null,
      notes: row.notes || null,
      logoKey: row.logo_key || null,
      isActive: "yes",
    };

    if (existing.length === 0) {
      await db.insert(brandMarketTiers).values(data);
      inserted++;
    } else {
      await db
        .update(brandMarketTiers)
        .set({ ...data, updatedAt: sql`now()` })
        .where(sql`LOWER(${brandMarketTiers.brandName}) = LOWER(${row.brand_name})`);
      updated++;
    }
  }

  console.log(`✅ Brand market tiers: ${inserted} inserted, ${updated} updated`);
}

async function seedBrandComplianceProfiles() {
  console.log("📜 Seeding brand compliance profiles...");

  const csvPath = join(__dirname, "../attached_assets/brand_compliance_profile_v2_1763452080725.csv");
  const csvContent = readFileSync(csvPath, "utf-8");
  
  const records: BrandComplianceProfileRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} brand compliance profiles in CSV`);

  let inserted = 0;
  let updated = 0;

  for (const row of records) {
    const existing = await db
      .select()
      .from(brandComplianceProfiles)
      .where(sql`LOWER(${brandComplianceProfiles.brandName}) = LOWER(${row.brand_name})`)
      .limit(1);

    const data = {
      brandName: row.brand_name,
      parentGroup: row.parent_group || null,
      bhmaGradeFocus: row.bhma_grade_focus || null,
      ulFireListingFocus: row.ul_fire_listing_focus || null,
      adaRelevance: row.ada_relevance || null,
      enCeRelevance: row.en_ce_relevance || null,
      commonCodes: row.common_codes || null,
      industriesServed: row.industries_served || null,
      primaryVerticals: row.primary_verticals || null,
      primaryCertBodies: row.primary_cert_bodies || null,
      notes: row.notes || null,
      logoKey: row.logo_key || null,
      isActive: "yes",
    };

    if (existing.length === 0) {
      await db.insert(brandComplianceProfiles).values(data);
      inserted++;
    } else {
      await db
        .update(brandComplianceProfiles)
        .set({ ...data, updatedAt: sql`now()` })
        .where(sql`LOWER(${brandComplianceProfiles.brandName}) = LOWER(${row.brand_name})`);
      updated++;
    }
  }

  console.log(`✅ Brand compliance profiles: ${inserted} inserted, ${updated} updated`);
}

async function seedBrandLockAssets() {
  console.log("🎨 Seeding brand and lock assets...");

  const csvPath = join(__dirname, "../attached_assets/brand_and_lock_assets_1763452080747.csv");
  const csvContent = readFileSync(csvPath, "utf-8");
  
  const records: BrandLockAssetRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} brand/lock assets in CSV`);

  let inserted = 0;
  let updated = 0;

  for (const row of records) {
    const existing = await db
      .select()
      .from(brandLockAssets)
      .where(eq(brandLockAssets.assetKey, row.asset_key))
      .limit(1);

    const widthPx = row.width_px ? parseInt(row.width_px, 10) : null;
    const heightPx = row.height_px ? parseInt(row.height_px, 10) : null;
    const dpi = row.dpi ? parseInt(row.dpi, 10) : null;

    const data = {
      assetKey: row.asset_key,
      assetType: row.asset_type,
      logicalGroup: row.logical_group,
      fileName: row.file_name,
      fileFormat: row.file_format,
      suggestedPath: row.suggested_path || null,
      themeVariant: row.theme_variant || null,
      widthPx: (widthPx && !isNaN(widthPx)) ? widthPx : null,
      heightPx: (heightPx && !isNaN(heightPx)) ? heightPx : null,
      dpi: (dpi && !isNaN(dpi)) ? dpi : null,
      description: row.description || null,
      isActive: "yes",
    };

    if (existing.length === 0) {
      await db.insert(brandLockAssets).values(data);
      inserted++;
    } else {
      await db
        .update(brandLockAssets)
        .set({ ...data, updatedAt: sql`now()` })
        .where(eq(brandLockAssets.assetKey, row.asset_key));
      updated++;
    }
  }

  console.log(`✅ Brand/lock assets: ${inserted} inserted, ${updated} updated`);
}

async function main() {
  try {
    console.log("🚀 Starting lock and manufacturer data seeding...\n");

    await seedLockProductTypes();
    await seedManufacturerTimelines();
    await seedBrandMarketTiers();
    await seedBrandComplianceProfiles();
    await seedBrandLockAssets();

    console.log("\n✅ All lock and manufacturer data seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

main();
