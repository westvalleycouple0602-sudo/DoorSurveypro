import { db } from "./db";
import { manufacturerGroups, manufacturers, productCategories } from "../shared/schemas/catalog.schema";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ManufacturerRecord {
  group_name: string;
  brand_name: string;
  product_focus: string;
  segment: string;
  notes: string;
}

interface ProductCategoryRecord {
  category_level1: string;
  category_level2: string;
  item_name: string;
  description: string;
  typical_use: string;
  notes: string;
}

/**
 * Seed manufacturer groups and brands from CSV
 */
async function seedManufacturerGroups() {
  console.log("Seeding manufacturer groups and brands...");
  
  try {
    const csvPath = join(__dirname, "../attached_assets/door_manufacturers_and_groups_expanded_1763448575642.csv");
    const fileContent = readFileSync(csvPath, "utf-8");
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as ManufacturerRecord[];

    const groupsMap = new Map<string, string>(); // group_name -> id

    // First, collect unique groups
    const uniqueGroups = Array.from(new Set(records.map((r) => r.group_name)));

    // Insert groups
    for (const groupName of uniqueGroups) {
      const slug = groupName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      try {
        const [existingGroup] = await db
          .select()
          .from(manufacturerGroups)
          .where(sql`LOWER(${manufacturerGroups.name}) = LOWER(${groupName})`);

        if (existingGroup) {
          groupsMap.set(groupName, existingGroup.id);
          console.log(`  ✓ Group already exists: ${groupName}`);
        } else {
          const [newGroup] = await db
            .insert(manufacturerGroups)
            .values({
              name: groupName,
              slug,
              isActive: "yes",
            })
            .returning();

          groupsMap.set(groupName, newGroup.id);
          console.log(`  + Created group: ${groupName}`);
        }
      } catch (error) {
        console.error(`  ✗ Error creating group ${groupName}:`, error);
      }
    }

    // Now insert manufacturers with their group associations
    for (const record of records) {
      const groupId = groupsMap.get(record.group_name);
      const slug = record.brand_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      try {
        const [existing] = await db
          .select()
          .from(manufacturers)
          .where(sql`LOWER(${manufacturers.name}) = LOWER(${record.brand_name})`);

        if (existing) {
          // Update existing manufacturer with group association
          await db
            .update(manufacturers)
            .set({
              groupId,
              productFocus: record.product_focus || null,
              segment: record.segment || null,
              description: record.notes || null,
            })
            .where(sql`LOWER(${manufacturers.name}) = LOWER(${record.brand_name})`);

          console.log(`  ✓ Updated manufacturer: ${record.brand_name} (linked to ${record.group_name})`);
        } else {
          await db.insert(manufacturers).values({
            name: record.brand_name,
            slug,
            groupId,
            productFocus: record.product_focus || null,
            segment: record.segment || null,
            description: record.notes || null,
            isActive: "yes",
            hasApiIntegration: "no",
          });

          console.log(`  + Created manufacturer: ${record.brand_name} (${record.group_name})`);
        }
      } catch (error) {
        console.error(`  ✗ Error creating manufacturer ${record.brand_name}:`, error);
      }
    }

    console.log(`✅ Manufacturer groups and brands seeded successfully`);
  } catch (error) {
    console.error("❌ Error seeding manufacturer groups:", error);
    throw error;
  }
}

/**
 * Seed product categories from CSV
 */
async function seedProductCategories() {
  console.log("Seeding product categories...");
  
  try {
    const csvPath = join(__dirname, "../attached_assets/door_opening_components_expanded_1763448582713.csv");
    const fileContent = readFileSync(csvPath, "utf-8");
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as ProductCategoryRecord[];

    let insertCount = 0;
    let updateCount = 0;
    let skipCount = 0;

    for (const record of records) {
      try {
        // Check if category already exists (by level1, level2, and item_name)
        const [existing] = await db
          .select()
          .from(productCategories)
          .where(sql`
            LOWER(${productCategories.categoryLevel1}) = LOWER(${record.category_level1})
            AND COALESCE(LOWER(${productCategories.categoryLevel2}), '') = COALESCE(LOWER(${record.category_level2 || ''}), '')
            AND LOWER(${productCategories.itemName}) = LOWER(${record.item_name})
          `);

        if (existing) {
          skipCount++;
        } else {
          await db.insert(productCategories).values({
            categoryLevel1: record.category_level1,
            categoryLevel2: record.category_level2 || null,
            itemName: record.item_name,
            description: record.description || null,
            typicalUse: record.typical_use || null,
            notes: record.notes || null,
            isActive: "yes",
          });

          insertCount++;
        }
      } catch (error) {
        console.error(`  ✗ Error inserting category ${record.item_name}:`, error);
      }
    }

    console.log(`✅ Product categories seeded: ${insertCount} created, ${skipCount} skipped`);
  } catch (error) {
    console.error("❌ Error seeding product categories:", error);
    throw error;
  }
}

/**
 * Main seeder function
 */
export async function seedTaxonomy() {
  console.log("\n=== Starting Taxonomy Data Seeding ===\n");
  
  try {
    await seedManufacturerGroups();
    console.log("");
    await seedProductCategories();
    
    console.log("\n✅ All taxonomy data seeded successfully!\n");
  } catch (error) {
    console.error("\n❌ Taxonomy seeding failed:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTaxonomy()
    .then(() => {
      console.log("Seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
