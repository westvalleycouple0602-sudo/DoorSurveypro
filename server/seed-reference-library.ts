import { db } from "./db";
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
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { join } from "path";

export async function seedReferenceLibrary() {
  // Seed hollow metal materials
  await seedHmMaterials();
  
  // Seed hollow metal frames
  await seedHmFrames();
  
  // Seed fire ratings
  await seedFireRatings();
  
  // Seed fire labels
  await seedFireLabels();
  
  // Seed electrified hardware
  await seedElectrifiedHardware();
  
  // Seed ordering guidelines
  await seedOrderingGuidelines();
  
  // Seed raceways and EPTs
  await seedRacewaysAndEpts();
  
  // Seed door reference library
  await seedDoorReferenceLibrary();
}

async function seedHmMaterials() {
  const existing = await db.select().from(hmMaterials);
  
  if (existing.length > 0) {
    console.log("HM materials already seeded, skipping...");
    return;
  }

  console.log("Seeding hollow metal materials...");

  try {
    const csvPath = join(process.cwd(), "attached_assets", "extracted", "hm_core_dataset", "materials.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const materials = records.map((row: any) => ({
      materialId: row.material_id,
      name: row.name,
      isDefault: row.is_default === "True" ? "yes" : "no",
      corrosionResistanceRank: row.corrosion_resistance_rank ? parseInt(row.corrosion_resistance_rank) : null,
      paintAdhesion: row.paint_adhesion || null,
      notes: row.notes || null,
      sourceRef: row.source_ref || null,
    }));

    if (materials.length > 0) {
      await db.insert(hmMaterials).values(materials);
      console.log(`✓ Inserted ${materials.length} HM materials`);
    }
  } catch (error) {
    console.error("Error seeding HM materials:", error);
  }
}

async function seedHmFrames() {
  const existing = await db.select().from(hmFrames);
  
  if (existing.length > 0) {
    console.log("HM frames already seeded, skipping...");
    return;
  }

  console.log("Seeding hollow metal frames...");

  try {
    const csvPath = join(process.cwd(), "attached_assets", "extracted", "hm_core_dataset", "frames.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const frames = records.map((row: any) => ({
      frameId: row.frame_id,
      gauge: parseInt(row.gauge),
      description: row.desc,
      notes: row.notes || null,
      sourceRef: row.source_ref || null,
    }));

    if (frames.length > 0) {
      await db.insert(hmFrames).values(frames);
      console.log(`✓ Inserted ${frames.length} HM frames`);
    }
  } catch (error) {
    console.error("Error seeding HM frames:", error);
  }
}

async function seedFireRatings() {
  const existing = await db.select().from(fireRatings);
  
  if (existing.length > 0) {
    console.log("Fire ratings already seeded, skipping...");
    return;
  }

  console.log("Seeding fire ratings...");

  try {
    const csvPath = join(process.cwd(), "attached_assets", "extracted", "hm_core_dataset", "fire_ratings.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const ratings = records.map((row: any) => ({
      fireId: row.fire_id,
      minutes: parseInt(row.minutes),
      label: row.label,
      notes: row.notes || null,
      appliesTo: row.applies_to || null,
      sourceRef: row.source_ref || null,
    }));

    if (ratings.length > 0) {
      await db.insert(fireRatings).values(ratings);
      console.log(`✓ Inserted ${ratings.length} fire ratings`);
    }
  } catch (error) {
    console.error("Error seeding fire ratings:", error);
  }
}

async function seedFireLabels() {
  const existing = await db.select().from(fireLabels);
  
  if (existing.length > 0) {
    console.log("Fire labels already seeded, skipping...");
    return;
  }

  console.log("Seeding fire labels...");

  try {
    const csvPath = join(process.cwd(), "attached_assets", "extracted", "hm_core_dataset", "fire_labels.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const labels = records.map((row: any) => ({
      labelId: row.label_id,
      type: row.type,
      visibilityRule: row.visibility_rule || null,
      relocationNotes: row.relocation_notes || null,
      sourceRef: row.source_ref || null,
    }));

    if (labels.length > 0) {
      await db.insert(fireLabels).values(labels);
      console.log(`✓ Inserted ${labels.length} fire labels`);
    }
  } catch (error) {
    console.error("Error seeding fire labels:", error);
  }
}

async function seedElectrifiedHardware() {
  const existing = await db.select().from(electrifiedHardware);
  
  if (existing.length > 0) {
    console.log("Electrified hardware already seeded, skipping...");
    return;
  }

  console.log("Seeding electrified hardware...");

  try {
    const csvPath = join(process.cwd(), "attached_assets", "extracted", "hm_core_dataset", "electrified_hardware.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const hardware = records.map((row: any) => ({
      hwId: row.hw_id,
      category: row.category,
      name: row.name,
      definition: row.definition || null,
      commonUse: row.common_use || null,
      notes: row.notes || null,
      sourceRef: row.source_ref || null,
    }));

    if (hardware.length > 0) {
      await db.insert(electrifiedHardware).values(hardware);
      console.log(`✓ Inserted ${hardware.length} electrified hardware items`);
    }
  } catch (error) {
    console.error("Error seeding electrified hardware:", error);
  }
}

async function seedOrderingGuidelines() {
  const existing = await db.select().from(orderingGuidelines);
  
  if (existing.length > 0) {
    console.log("Ordering guidelines already seeded, skipping...");
    return;
  }

  console.log("Seeding ordering guidelines...");

  try {
    const csvPath = join(process.cwd(), "attached_assets", "extracted", "hm_core_dataset", "ordering_guidelines.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const guidelines = records.map((row: any) => ({
      guidelineId: row.guideline_id,
      topic: row.topic,
      rule: row.rule,
      methodExamples: row.method_examples || null,
      sourceRef: row.source_ref || null,
    }));

    if (guidelines.length > 0) {
      await db.insert(orderingGuidelines).values(guidelines);
      console.log(`✓ Inserted ${guidelines.length} ordering guidelines`);
    }
  } catch (error) {
    console.error("Error seeding ordering guidelines:", error);
  }
}

async function seedRacewaysAndEpts() {
  const existing = await db.select().from(racewaysAndEpts);
  
  if (existing.length > 0) {
    console.log("Raceways/EPTs already seeded, skipping...");
    return;
  }

  console.log("Seeding raceways and EPTs...");

  try {
    const csvPath = join(process.cwd(), "attached_assets", "extracted", "hm_core_dataset", "raceways_and_epts.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const raceways = records.map((row: any) => ({
      eptId: row.id,
      appliesTo: row.applies_to,
      diameterIn: row.diameter_in ? parseFloat(row.diameter_in) : null,
      installedByDefault: row.installed_by_default || null,
      framePolicy: row.frame_policy || null,
      molexPasses: row.molex_passes || null,
      sourceRef: row.source_ref || null,
    }));

    if (raceways.length > 0) {
      await db.insert(racewaysAndEpts).values(raceways);
      console.log(`✓ Inserted ${raceways.length} raceway/EPT specifications`);
    }
  } catch (error) {
    console.error("Error seeding raceways/EPTs:", error);
  }
}

async function seedDoorReferenceLibrary() {
  const existing = await db.select().from(doorReferenceLibrary);
  
  if (existing.length > 0) {
    console.log("Door reference library already seeded, skipping...");
    return;
  }

  console.log("Seeding door reference library...");

  try {
    const jsonPath = join(process.cwd(), "attached_assets", "extracted", "door_ref_ui", "seed.json");
    const jsonContent = readFileSync(jsonPath, "utf-8");
    const jsonData = JSON.parse(jsonContent);
    const records = jsonData.door_reference || [];

    // Transform records to match our schema
    const doors = records.map((row: any) => ({
      illustration: row.illustration || null,
      category: row.category || null,
      subcategory: row.subcategory || null,
      doorType: row.door_type || null,
      material: row.material || null,
      finish: row.finish || null,
      configuration: row.configuration || null,
      operation: row.operation || null,
      frameType: row.frame_type || null,
      hardware: row.hardware || null,
      glassType: row.glass_type || null,
      automationReady: row.automation_ready || null,
      commonUse: row.common_use || null,
      notes: row.notes || null,
      imageUrl: null,
      sourceRef: "Door Reference Database",
    }));

    if (doors.length > 0) {
      await db.insert(doorReferenceLibrary).values(doors);
      console.log(`✓ Inserted ${doors.length} door reference entries`);
    }
  } catch (error) {
    console.error("Error seeding door reference library:", error);
  }
}
