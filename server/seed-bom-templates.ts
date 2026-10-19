import { db } from "./db";
import { bomTemplates, bomTemplateItems } from "@shared/schema";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse CSV data
const csvPath = join(__dirname, "../attached_assets/DoorHardware_KeySchedule_1762291654065.csv");
const csvContent = readFileSync(csvPath, "utf-8");

interface CSVRow {
  Door_Hardware_Set: string;
  BOM_Item_Category: string;
  BOM_Manufacturer: string;
  BOM_Model_Number: string;
  BOM_Description: string;
  BOM_Qty: string;
  BOM_Size_Spec: string;
  BOM_Finish: string;
  BOM_Handing: string;
  BOM_Fire_Smoke_Rating: string;
  BOM_Notes: string;
}

const records: CSVRow[] = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

async function seedBomTemplates() {
  console.log("🌱 Seeding BOM templates...");

  // Group records by hardware set name
  const templateGroups = new Map<string, CSVRow[]>();
  
  for (const record of records) {
    const setName = record.Door_Hardware_Set;
    if (!templateGroups.has(setName)) {
      templateGroups.set(setName, []);
    }
    templateGroups.get(setName)!.push(record);
  }

  // Check if already seeded
  const existing = await db.select().from(bomTemplates).limit(1);
  if (existing.length > 0) {
    console.log("BOM templates already seeded, skipping...");
    return;
  }

  // Create templates and their items
  for (const [setName, items] of templateGroups.entries()) {
    // Create template (organizationId null = global/system template)
    const [template] = await db.insert(bomTemplates).values({
      name: setName,
      description: `Pre-configured hardware set: ${setName}`,
      category: items[0].BOM_Item_Category || "Standard Hardware",
      isActive: "yes",
      organizationId: null, // Global template
    }).returning();

    console.log(`✅ Created template: ${setName}`);

    // Create template items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.insert(bomTemplateItems).values({
        templateId: template.id,
        itemCategory: item.BOM_Item_Category || null,
        manufacturer: item.BOM_Manufacturer || null,
        modelNumber: item.BOM_Model_Number || null,
        description: item.BOM_Description || null,
        quantity: item.BOM_Qty ? parseFloat(item.BOM_Qty) : null,
        sizeSpec: item.BOM_Size_Spec || null,
        finish: item.BOM_Finish || null,
        handing: item.BOM_Handing || null,
        fireRating: item.BOM_Fire_Smoke_Rating || null,
        notes: item.BOM_Notes || null,
        sortOrder: i,
      });
    }

    console.log(`   Added ${items.length} items to template`);
  }

  console.log(`\n✅ Successfully seeded ${templateGroups.size} BOM templates`);
}

seedBomTemplates()
  .then(() => {
    console.log("Seeding complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error seeding BOM templates:", err);
    process.exit(1);
  });
