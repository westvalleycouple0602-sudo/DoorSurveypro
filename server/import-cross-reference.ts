import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";
import { logger } from "./logger";

interface CrossReferenceRecord {
  productType: string;
  abhPart: string;
  trimcoPart?: string;
  rockPart?: string;
  otherManufacturerName?: string;
  otherManufacturerPart?: string;
  notes?: string;
}

async function importCrossReferences() {
  const csvPath = path.join(process.cwd(), "attached_assets", "abh_cross_reference_import.csv");
  
  logger.info("Reading cross-reference CSV file...");
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  }) as CrossReferenceRecord[];
  
  logger.info(`Found ${records.length} cross-reference records`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const record of records) {
    try {
      // Convert empty strings to null
      const data = {
        productType: record.productType || "",
        abhPart: record.abhPart || "",
        trimcoPart: record.trimcoPart || null,
        rockPart: record.rockPart || null,
        otherManufacturerName: record.otherManufacturerName || null,
        otherManufacturerPart: record.otherManufacturerPart || null,
        notes: record.notes || null,
      };
      
      await storage.createHardwareCrossReference(data);
      imported++;
      logger.debug(`✓ Imported: ${data.productType} - ${data.abhPart}`);
    } catch (error) {
      skipped++;
      logger.warn(`✗ Skipped ${record.abhPart}`, { error: error instanceof Error ? error.message : error });
    }
  }
  
  logger.info(`Import complete: ${imported} imported, ${skipped} skipped`);
}

// Run the import
importCrossReferences()
  .then(() => {
    logger.info("Cross-reference import finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Import failed", { error });
    process.exit(1);
  });
