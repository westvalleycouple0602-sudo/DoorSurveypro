import { Router } from "express";
import { db } from "../db";
import { manufacturerGroups, manufacturers, productCategories } from "../../shared/schemas/catalog.schema";
import { eq, sql, asc } from "drizzle-orm";

const router = Router();

/**
 * GET /api/taxonomy/manufacturer-groups
 * Get all manufacturer groups
 */
router.get("/manufacturer-groups", async (req, res) => {
  try {
    const groups = await db
      .select()
      .from(manufacturerGroups)
      .where(eq(manufacturerGroups.isActive, "yes"))
      .orderBy(asc(manufacturerGroups.name));

    res.json(groups);
  } catch (error) {
    console.error("Error fetching manufacturer groups:", error);
    res.status(500).json({ error: "Failed to fetch manufacturer groups" });
  }
});

/**
 * GET /api/taxonomy/manufacturer-groups/:id/manufacturers
 * Get all manufacturers in a specific group
 */
router.get("/manufacturer-groups/:id/manufacturers", async (req, res) => {
  try {
    const { id } = req.params;

    const mfgs = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.groupId, id))
      .orderBy(asc(manufacturers.name));

    res.json(mfgs);
  } catch (error) {
    console.error("Error fetching manufacturers by group:", error);
    res.status(500).json({ error: "Failed to fetch manufacturers" });
  }
});

/**
 * GET /api/taxonomy/manufacturers-hierarchy
 * Get complete manufacturer hierarchy (groups with their manufacturers)
 */
router.get("/manufacturers-hierarchy", async (req, res) => {
  try {
    // Get all groups
    const groups = await db
      .select()
      .from(manufacturerGroups)
      .where(eq(manufacturerGroups.isActive, "yes"))
      .orderBy(asc(manufacturerGroups.name));

    // Get all manufacturers
    const allManufacturers = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.isActive, "yes"))
      .orderBy(asc(manufacturers.name));

    // Build hierarchy
    const hierarchy = groups.map((group) => ({
      ...group,
      manufacturers: allManufacturers.filter((m) => m.groupId === group.id),
    }));

    // Also include manufacturers without a group
    const ungroupedManufacturers = allManufacturers.filter((m) => !m.groupId);

    res.json({
      groups: hierarchy,
      ungrouped: ungroupedManufacturers,
    });
  } catch (error) {
    console.error("Error fetching manufacturer hierarchy:", error);
    res.status(500).json({ error: "Failed to fetch manufacturer hierarchy" });
  }
});

/**
 * GET /api/taxonomy/product-categories
 * Get all product categories with optional filtering
 */
router.get("/product-categories", async (req, res) => {
  try {
    const { level1, level2, typicalUse } = req.query;

    // Build where conditions
    const conditions = [eq(productCategories.isActive, "yes")];
    
    if (level1) {
      conditions.push(eq(productCategories.categoryLevel1, level1 as string));
    }
    if (level2) {
      conditions.push(eq(productCategories.categoryLevel2, level2 as string));
    }
    if (typicalUse) {
      conditions.push(eq(productCategories.typicalUse, typicalUse as string));
    }

    const categories = await db
      .select()
      .from(productCategories)
      .where(sql`${sql.join(conditions, sql` AND `)}`);

    res.json(categories);
  } catch (error) {
    console.error("Error fetching product categories:", error);
    res.status(500).json({ error: "Failed to fetch product categories" });
  }
});

/**
 * GET /api/taxonomy/product-categories/hierarchy
 * Get product categories in a hierarchical structure
 */
router.get("/product-categories/hierarchy", async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.isActive, "yes"))
      .orderBy(
        asc(productCategories.categoryLevel1),
        asc(productCategories.categoryLevel2),
        asc(productCategories.itemName)
      );

    // Build hierarchical structure
    const hierarchy = categories.reduce((acc, cat) => {
      const level1 = cat.categoryLevel1 || "Uncategorized";
      const level2 = cat.categoryLevel2 || "General";

      if (!acc[level1]) {
        acc[level1] = {};
      }
      if (!acc[level1][level2]) {
        acc[level1][level2] = [];
      }

      acc[level1][level2].push({
        id: cat.id,
        itemName: cat.itemName,
        description: cat.description,
        typicalUse: cat.typicalUse,
        notes: cat.notes,
      });

      return acc;
    }, {} as Record<string, Record<string, any[]>>);

    res.json(hierarchy);
  } catch (error) {
    console.error("Error fetching category hierarchy:", error);
    res.status(500).json({ error: "Failed to fetch category hierarchy" });
  }
});

/**
 * GET /api/taxonomy/product-categories/level1
 * Get unique category level 1 values
 */
router.get("/product-categories/level1", async (req, res) => {
  try {
    const result = await db
      .selectDistinct({ categoryLevel1: productCategories.categoryLevel1 })
      .from(productCategories)
      .where(eq(productCategories.isActive, "yes"))
      .orderBy(asc(productCategories.categoryLevel1));

    res.json(result.map((r) => r.categoryLevel1));
  } catch (error) {
    console.error("Error fetching level1 categories:", error);
    res.status(500).json({ error: "Failed to fetch level1 categories" });
  }
});

/**
 * GET /api/taxonomy/product-categories/level2
 * Get unique category level 2 values for a given level 1
 */
router.get("/product-categories/level2", async (req, res) => {
  try {
    const { level1 } = req.query;

    const conditions = [eq(productCategories.isActive, "yes")];
    
    if (level1) {
      conditions.push(eq(productCategories.categoryLevel1, level1 as string));
    }

    const result = await db
      .selectDistinct({ categoryLevel2: productCategories.categoryLevel2 })
      .from(productCategories)
      .where(sql`${sql.join(conditions, sql` AND `)}`);

    res.json(result.map((r) => r.categoryLevel2).filter(Boolean));
  } catch (error) {
    console.error("Error fetching level2 categories:", error);
    res.status(500).json({ error: "Failed to fetch level2 categories" });
  }
});

export default router;
