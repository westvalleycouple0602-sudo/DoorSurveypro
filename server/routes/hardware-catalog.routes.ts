import { Router } from "express";
import { db } from "../storage";
import { 
  hardwareCatalog, 
  bhmaFinishes, 
  lockFunctions, 
  functionCatalog,
  codeRules,
  ahjVariations
} from "@shared/schema";
import { eq, like, and, or, sql, desc } from "drizzle-orm";
import { requireAuth as isAuthenticated } from "../clerkAuth";

const router = Router();

// All hardware catalog routes require authentication
// Use path-scoped middleware to avoid catching non-API routes like "/"
router.use("/api/*", isAuthenticated);

// Get all hardware catalog items with optional filtering
router.get("/api/hardware-catalog", async (req, res, next) => {
  try {
    const { category, brand, search, limit = "100", offset = "0" } = req.query;
    
    const conditions: any[] = [];
    
    if (category && typeof category === "string") {
      conditions.push(eq(hardwareCatalog.category, category));
    }
    
    if (brand && typeof brand === "string") {
      conditions.push(eq(hardwareCatalog.brand, brand));
    }
    
    if (search && typeof search === "string") {
      conditions.push(
        or(
          like(hardwareCatalog.model, `%${search}%`),
          like(hardwareCatalog.notes, `%${search}%`),
          like(hardwareCatalog.nomenclature, `%${search}%`),
          like(hardwareCatalog.features, `%${search}%`)
        )
      );
    }
    
    const items = await db
      .select()
      .from(hardwareCatalog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(desc(hardwareCatalog.category), desc(hardwareCatalog.brand));
    
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// Get hardware categories
router.get("/api/hardware-catalog/categories", async (req, res, next) => {
  try {
    const categories = await db
      .selectDistinct({ category: hardwareCatalog.category })
      .from(hardwareCatalog)
      .orderBy(hardwareCatalog.category);
    
    res.json(categories.map(c => c.category));
  } catch (error) {
    next(error);
  }
});

// Get hardware brands
router.get("/api/hardware-catalog/brands", async (req, res, next) => {
  try {
    const { category } = req.query;
    
    let query = db
      .selectDistinct({ brand: hardwareCatalog.brand })
      .from(hardwareCatalog);
    
    if (category && typeof category === "string") {
      query = query.where(eq(hardwareCatalog.category, category));
    }
    
    const brands = await query.orderBy(hardwareCatalog.brand);
    
    res.json(brands.map(b => b.brand).filter(b => b !== null));
  } catch (error) {
    next(error);
  }
});

// Get single hardware item by ID
router.get("/api/hardware-catalog/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [item] = await db
      .select()
      .from(hardwareCatalog)
      .where(eq(hardwareCatalog.id, parseInt(id)));
    
    if (!item) {
      return res.status(404).json({ error: "Hardware item not found" });
    }
    
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// Get all BHMA finishes
router.get("/api/bhma-finishes", async (req, res, next) => {
  try {
    const finishes = await db
      .select()
      .from(bhmaFinishes)
      .orderBy(bhmaFinishes.codeUs);
    
    res.json(finishes);
  } catch (error) {
    next(error);
  }
});

// Get all lock functions
router.get("/api/lock-functions", async (req, res, next) => {
  try {
    const { category } = req.query;
    
    let query = db.select().from(lockFunctions);
    
    if (category && typeof category === "string") {
      query = query.where(eq(lockFunctions.category, category));
    }
    
    const functions = await query.orderBy(lockFunctions.category, lockFunctions.function);
    
    res.json(functions);
  } catch (error) {
    next(error);
  }
});

// Get function catalog (brand-specific functions)
router.get("/api/function-catalog", async (req, res, next) => {
  try {
    const { brand, family } = req.query;
    
    const conditions: any[] = [];
    
    if (brand && typeof brand === "string") {
      conditions.push(eq(functionCatalog.brand, brand));
    }
    
    if (family && typeof family === "string") {
      conditions.push(eq(functionCatalog.family, family));
    }
    
    const functions = await db
      .select()
      .from(functionCatalog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(functionCatalog.brand, functionCatalog.family, functionCatalog.functionCode);
    
    res.json(functions);
  } catch (error) {
    next(error);
  }
});

// Get code rules
router.get("/api/code-rules", async (req, res, next) => {
  try {
    const { category, jurisdiction, severity } = req.query;
    
    const conditions: any[] = [];
    
    if (category && typeof category === "string") {
      conditions.push(eq(codeRules.category, category));
    }
    
    if (jurisdiction && typeof jurisdiction === "string") {
      conditions.push(eq(codeRules.jurisdiction, jurisdiction));
    }
    
    if (severity && typeof severity === "string") {
      conditions.push(eq(codeRules.severity, severity));
    }
    
    const rules = await db
      .select()
      .from(codeRules)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(codeRules.category, codeRules.ruleId);
    
    res.json(rules);
  } catch (error) {
    next(error);
  }
});

// Get AHJ variations
router.get("/api/ahj-variations", async (req, res, next) => {
  try {
    const { state, ruleId } = req.query;
    
    const conditions: any[] = [];
    
    if (state && typeof state === "string") {
      conditions.push(eq(ahjVariations.state, state));
    }
    
    if (ruleId && typeof ruleId === "string") {
      conditions.push(eq(ahjVariations.ruleId, ruleId));
    }
    
    const variations = await db
      .select()
      .from(ahjVariations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(ahjVariations.state, ahjVariations.codeEdition);
    
    res.json(variations);
  } catch (error) {
    next(error);
  }
});

export default router;
