import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from './db';
import { pivotPatchHardware } from '../shared/schema';

async function importPivotPatchHardware() {
  console.log('Importing Pivot/Patch Hardware catalog...\n');
  
  const csvContent = readFileSync('attached_assets/pivot_patch_extracted/hardware_catalog/pivot_catalog.csv', 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  console.log(`Found ${records.length} hardware items in CSV`);
  
  const hardwareData = records.map((record: any) => {
    // Parse array fields
    let glassThicknessMm = null;
    let finish = null;
    let compatibleParts = null;
    
    try {
      glassThicknessMm = record.GlassThickness_mm ? JSON.parse(record.GlassThickness_mm) : null;
    } catch (e) {
      // Leave as null if parsing fails
    }
    
    try {
      finish = record.Finish ? JSON.parse(record.Finish) : null;
    } catch (e) {
      // Leave as null if parsing fails
    }
    
    try {
      compatibleParts = record.CompatibleParts ? JSON.parse(record.CompatibleParts) : null;
    } catch (e) {
      // Leave as null if parsing fails
    }
    
    return {
      manufacturer: record.Manufacturer || '',
      partNumber: record.PartNumber || '',
      role: record.Role || '',
      glassThicknessMm,
      offsetMm: record.Offset_mm ? parseFloat(record.Offset_mm) : null,
      maxHeightMm: record.MaxHeight_mm ? parseFloat(record.MaxHeight_mm) : null,
      maxWeightKg: record.MaxWeight_kg ? parseFloat(record.MaxWeight_kg) : null,
      finish,
      compatibleParts,
      notes: record.Notes || null,
      source: record.Source || null,
    };
  });
  
  // Insert or update hardware items
  for (const item of hardwareData) {
    await db.insert(pivotPatchHardware).values(item)
      .onConflictDoUpdate({
        target: pivotPatchHardware.partNumber,
        set: item
      });
    console.log(`  ✓ Imported: ${item.manufacturer} ${item.partNumber} (${item.role})`);
  }
  
  console.log(`\n✅ Imported ${hardwareData.length} pivot/patch hardware items`);
}

importPivotPatchHardware()
  .then(() => {
    console.log('\n✅ Pivot/Patch hardware import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error importing pivot/patch hardware:', error);
    process.exit(1);
  });
