import { db } from "./db";
import { doorFrameOptions, optionValidationRules } from "@shared/schema";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { join } from "path";

export async function seedDoorFrameOptions() {
  const existingOptions = await db.select().from(doorFrameOptions);
  
  if (existingOptions.length > 0) {
    console.log("Door/frame options already seeded, skipping...");
    return;
  }

  console.log("Seeding door/frame options catalog...");

  try {
    // Read and parse door options CSV
    const doorCsvPath = join(process.cwd(), "attached_assets", "door_options_catalog.csv");
    const doorCsvContent = readFileSync(doorCsvPath, "utf-8");
    const doorRecords = parse(doorCsvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Read and parse frame options CSV
    const frameCsvPath = join(process.cwd(), "attached_assets", "frame_options_catalog.csv");
    const frameCsvContent = readFileSync(frameCsvPath, "utf-8");
    const frameRecords = parse(frameCsvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Transform and insert door options
    const doorOptions = doorRecords.map((row: any) => ({
      appliesTo: row.applies_to as "door" | "frame",
      market: row.market as "commercial" | "residential" | "both",
      attributeGroup: row.attribute_group,
      attributeName: row.attribute_name,
      value: row.value,
      valueCode: row.value_code,
      description: row.description || null,
      compatibility: row.compatibility || null,
      standardsCodes: row.standards_codes || null,
      costImpact: row.cost_impact || null,
      leadTimeImpact: row.lead_time_impact || null,
      isDefault: row.default === "Y" ? "yes" : "no",
      notes: row.notes || null,
    }));

    // Transform and insert frame options
    const frameOptions = frameRecords.map((row: any) => ({
      appliesTo: row.applies_to as "door" | "frame",
      market: row.market as "commercial" | "residential" | "both",
      attributeGroup: row.attribute_group,
      attributeName: row.attribute_name,
      value: row.value,
      valueCode: row.value_code,
      description: row.description || null,
      compatibility: row.compatibility || null,
      standardsCodes: row.standards_codes || null,
      costImpact: row.cost_impact || null,
      leadTimeImpact: row.lead_time_impact || null,
      isDefault: row.default === "Y" ? "yes" : "no",
      notes: row.notes || null,
    }));

    // Insert all options
    const allOptions = [...doorOptions, ...frameOptions];
    if (allOptions.length > 0) {
      await db.insert(doorFrameOptions).values(allOptions);
      console.log(`✓ Inserted ${allOptions.length} door/frame options`);
    }

    // Seed validation rules
    await seedValidationRules();

  } catch (error) {
    console.error("Error seeding door/frame options:", error);
    throw error;
  }
}

async function seedValidationRules() {
  const existingRules = await db.select().from(optionValidationRules);
  
  if (existingRules.length > 0) {
    console.log("Validation rules already seeded, skipping...");
    return;
  }

  console.log("Seeding validation rules...");

  try {
    // Read validation rules JSON
    const rulesPath = join(process.cwd(), "attached_assets", "validation_rules.json");
    const rulesContent = readFileSync(rulesPath, "utf-8");
    const rulesData = JSON.parse(rulesContent);

    const rules = rulesData.map((rule: any) => ({
      ruleId: rule.id,
      appliesTo: rule.applies_to as "door" | "frame",
      severity: rule.severity as "error" | "warning" | "info",
      whenConditions: rule.when || rule.when_any_of ? {
        when: rule.when,
        when_any_of: rule.when_any_of
      } : null,
      requirements: {
        require_any_of: rule.require_any_of,
        validate: rule.validate
      },
      message: rule.message,
      references: rule.references || [],
      isActive: "yes",
    }));

    if (rules.length > 0) {
      await db.insert(optionValidationRules).values(rules);
      console.log(`✓ Inserted ${rules.length} validation rules`);
    }

  } catch (error) {
    console.error("Error seeding validation rules:", error);
    throw error;
  }
}
