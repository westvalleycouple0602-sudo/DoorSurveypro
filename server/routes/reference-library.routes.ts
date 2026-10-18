import { Router } from "express";
import { db } from "../db";
import {
  hmMaterials,
  hmFrames,
  fireRatings,
  fireLabels,
  electrifiedHardware,
  orderingGuidelines,
  racewaysAndEpts,
  doorReferenceLibrary,
} from "@shared/schema";
import { desc, like, or, and, eq } from "drizzle-orm";

// Security: Input validation and sanitization
// Note: These match the actual seed data which uses placeholder "(verify)" values
const VALID_CATEGORIES = ["General", "Hollow Metal", "Wood", "Aluminum", "Glass", "Fire-Rated", "Acoustic"];
const VALID_MATERIALS = ["Aluminum/Steel", "Steel", "Aluminum", "Wood", "Glass", "Composite"];
const VALID_OPERATIONS = ["Manual", "Swinging", "Sliding", "Folding", "Revolving", "Rolling"];
const VALID_HARDWARE_CATEGORIES = ["Power Transfer", "Locking Mode"];

// Maximum result limits to prevent DOS
const MAX_RESULTS_PER_PAGE = 100;
const DEFAULT_PAGE_SIZE = 50;

// Sanitize LIKE query to prevent SQL injection-style attacks
function sanitizeLikeQuery(input: string): string {
  // Remove any SQL wildcards that user might inject, we'll add our own
  return input.replace(/%/g, "").replace(/_/g, "").trim().substring(0, 50);
}

const router = Router();

// Get all hollow metal materials
router.get("/hm/materials", async (req, res) => {
  try {
    const materials = await db.select().from(hmMaterials)
      .orderBy(desc(hmMaterials.corrosionResistanceRank))
      .limit(MAX_RESULTS_PER_PAGE);
    res.json(materials);
  } catch (error) {
    console.error("Error fetching HM materials:", error);
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

// Get all hollow metal frames
router.get("/hm/frames", async (req, res) => {
  try {
    const frames = await db.select().from(hmFrames)
      .orderBy(hmFrames.gauge)
      .limit(MAX_RESULTS_PER_PAGE);
    res.json(frames);
  } catch (error) {
    console.error("Error fetching HM frames:", error);
    res.status(500).json({ error: "Failed to fetch frames" });
  }
});

// Get all fire ratings
router.get("/fire/ratings", async (req, res) => {
  try {
    const ratings = await db.select().from(fireRatings)
      .orderBy(fireRatings.minutes)
      .limit(MAX_RESULTS_PER_PAGE);
    res.json(ratings);
  } catch (error) {
    console.error("Error fetching fire ratings:", error);
    res.status(500).json({ error: "Failed to fetch fire ratings" });
  }
});

// Get all fire labels
router.get("/fire/labels", async (req, res) => {
  try {
    const labels = await db.select().from(fireLabels)
      .limit(MAX_RESULTS_PER_PAGE);
    res.json(labels);
  } catch (error) {
    console.error("Error fetching fire labels:", error);
    res.status(500).json({ error: "Failed to fetch fire labels" });
  }
});

// Get all electrified hardware
router.get("/hardware/electrified", async (req, res) => {
  try {
    const { category } = req.query;
    
    const conditions: any[] = [];
    if (category && typeof category === "string") {
      conditions.push(eq(electrifiedHardware.category, category));
    }
    
    const hardware = await db.select().from(electrifiedHardware)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(MAX_RESULTS_PER_PAGE);
    
    res.json(hardware);
  } catch (error) {
    console.error("Error fetching electrified hardware:", error);
    res.status(500).json({ error: "Failed to fetch electrified hardware" });
  }
});

// Get all ordering guidelines
router.get("/guidelines/ordering", async (req, res) => {
  try {
    const { topic } = req.query;
    
    const conditions: any[] = [];
    if (topic && typeof topic === "string") {
      conditions.push(eq(orderingGuidelines.topic, topic));
    }
    
    const guidelines = await db.select().from(orderingGuidelines)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(MAX_RESULTS_PER_PAGE);
    
    res.json(guidelines);
  } catch (error) {
    console.error("Error fetching ordering guidelines:", error);
    res.status(500).json({ error: "Failed to fetch ordering guidelines" });
  }
});

// Get all raceways and EPTs
router.get("/hardware/raceways", async (req, res) => {
  try {
    const raceways = await db.select().from(racewaysAndEpts)
      .limit(MAX_RESULTS_PER_PAGE);
    res.json(raceways);
  } catch (error) {
    console.error("Error fetching raceways/EPTs:", error);
    res.status(500).json({ error: "Failed to fetch raceways/EPTs" });
  }
});

// Get door reference library with filtering
router.get("/doors", async (req, res) => {
  try {
    const {
      category,
      material,
      operation,
      configuration,
      automation_ready,
      search,
      limit = DEFAULT_PAGE_SIZE.toString(),
      offset = "0"
    } = req.query;

    // Security: Validate and sanitize inputs
    const conditions: any[] = [];

    // Validate category against whitelist
    if (category && typeof category === "string") {
      const sanitized = sanitizeLikeQuery(category);
      if (sanitized.length > 0 && VALID_CATEGORIES.some(c => c.toLowerCase().includes(sanitized.toLowerCase()))) {
        conditions.push(like(doorReferenceLibrary.category, `%${sanitized}%`));
      }
    }

    // Validate material against whitelist
    if (material && typeof material === "string") {
      const sanitized = sanitizeLikeQuery(material);
      if (sanitized.length > 0 && VALID_MATERIALS.some(m => m.toLowerCase().includes(sanitized.toLowerCase()))) {
        conditions.push(like(doorReferenceLibrary.material, `%${sanitized}%`));
      }
    }

    // Validate operation against whitelist
    if (operation && typeof operation === "string") {
      const sanitized = sanitizeLikeQuery(operation);
      if (sanitized.length > 0 && VALID_OPERATIONS.some(o => o.toLowerCase().includes(sanitized.toLowerCase()))) {
        conditions.push(like(doorReferenceLibrary.operation, `%${sanitized}%`));
      }
    }

    // Configuration is free-form but sanitized
    if (configuration && typeof configuration === "string") {
      const sanitized = sanitizeLikeQuery(configuration);
      if (sanitized.length > 0) {
        conditions.push(like(doorReferenceLibrary.configuration, `%${sanitized}%`));
      }
    }

    // Automation ready is exact match (yes/no)
    if (automation_ready && typeof automation_ready === "string") {
      if (automation_ready === "yes" || automation_ready === "no") {
        conditions.push(eq(doorReferenceLibrary.automationReady, automation_ready));
      }
    }

    // Search is sanitized and limited
    if (search && typeof search === "string") {
      const sanitized = sanitizeLikeQuery(search);
      if (sanitized.length >= 2) { // Require at least 2 characters for search
        conditions.push(
          or(
            like(doorReferenceLibrary.category, `%${sanitized}%`),
            like(doorReferenceLibrary.material, `%${sanitized}%`),
            like(doorReferenceLibrary.doorType, `%${sanitized}%`),
            like(doorReferenceLibrary.operation, `%${sanitized}%`),
            like(doorReferenceLibrary.commonUse, `%${sanitized}%`),
            like(doorReferenceLibrary.notes, `%${sanitized}%`)
          )
        );
      }
    }

    // Security: Enforce maximum page size to prevent DOS
    const limitNum = Math.min(parseInt(limit as string, 10) || DEFAULT_PAGE_SIZE, MAX_RESULTS_PER_PAGE);
    const offsetNum = Math.max(parseInt(offset as string, 10) || 0, 0);

    // Build and execute query in one call
    const doors = await db.select().from(doorReferenceLibrary)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limitNum)
      .offset(offsetNum);

    res.json(doors);
  } catch (error) {
    console.error("Error fetching door reference library:", error);
    res.status(500).json({ error: "Failed to fetch door reference library" });
  }
});

// Get unique filter options for dropdowns
router.get("/doors/options/:field", async (req, res) => {
  try {
    const { field } = req.params;

    const validFields = [
      "category",
      "material",
      "operation",
      "configuration",
      "automationReady",
      "frameType",
      "subcategory"
    ];

    if (!validFields.includes(field)) {
      return res.status(400).json({ error: "Invalid field" });
    }

    // Get distinct values for the field
    const fieldMapping: Record<string, any> = {
      category: doorReferenceLibrary.category,
      material: doorReferenceLibrary.material,
      operation: doorReferenceLibrary.operation,
      configuration: doorReferenceLibrary.configuration,
      automationReady: doorReferenceLibrary.automationReady,
      frameType: doorReferenceLibrary.frameType,
      subcategory: doorReferenceLibrary.subcategory,
    };

    const results = await db
      .selectDistinct({ value: fieldMapping[field] })
      .from(doorReferenceLibrary)
      .where(fieldMapping[field]);

    const options = results
      .map(r => r.value)
      .filter(v => v !== null)
      .sort();

    res.json(options);
  } catch (error) {
    console.error("Error fetching field options:", error);
    res.status(500).json({ error: "Failed to fetch field options" });
  }
});

// Get reference data overview/summary
router.get("/summary", async (req, res) => {
  try {
    const [
      materialsCount,
      framesCount,
      fireRatingsCount,
      fireLabelsCount,
      electrifiedHardwareCount,
      orderingGuidelinesCount,
      racewaysCount,
      doorsCount
    ] = await Promise.all([
      db.select().from(hmMaterials).then(r => r.length),
      db.select().from(hmFrames).then(r => r.length),
      db.select().from(fireRatings).then(r => r.length),
      db.select().from(fireLabels).then(r => r.length),
      db.select().from(electrifiedHardware).then(r => r.length),
      db.select().from(orderingGuidelines).then(r => r.length),
      db.select().from(racewaysAndEpts).then(r => r.length),
      db.select().from(doorReferenceLibrary).then(r => r.length),
    ]);

    res.json({
      hollowMetal: {
        materials: materialsCount,
        frames: framesCount,
      },
      fire: {
        ratings: fireRatingsCount,
        labels: fireLabelsCount,
      },
      hardware: {
        electrified: electrifiedHardwareCount,
        raceways: racewaysCount,
      },
      guidelines: {
        ordering: orderingGuidelinesCount,
      },
      doors: {
        total: doorsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching reference data summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;
