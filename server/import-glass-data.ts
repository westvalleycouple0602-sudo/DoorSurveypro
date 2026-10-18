import ExcelJS from 'exceljs';
import { db } from './db';
import { liteKits, glassTypes, glassFireSizes } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';

async function importVisionLiteData() {
  logger.info('Importing VisionLite Excel data...');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('attached_assets/VisionLite_Replit_v5_1760747522192.xlsx');
  
  // Import Lite Kits from Kits sheet
  const kitsSheet = workbook.getWorksheet('Kits');
  if (kitsSheet) {
    logger.info('=== Importing Lite Kits ===');
    const kitsData = [];
    
    // Row 1 is headers, data starts at row 2
    for (let i = 2; i <= kitsSheet.rowCount; i++) {
      const row = kitsSheet.getRow(i);
      const kitModel = row.getCell(2).value as string;
      
      if (!kitModel) continue;
      
      // Helper to safely convert to yes/no
      const toYesNo = (value: any): string => {
        if (value === true || String(value).toLowerCase() === 'yes') return 'yes';
        return 'no';
      };
      
      // Helper to safely get number
      const toNumber = (value: any, defaultVal: number = 0): number => {
        if (value === null || value === undefined) return defaultVal;
        const num = parseFloat(String(value));
        return isNaN(num) ? defaultVal : num;
      };
      
      kitsData.push({
        kitModel,
        kitType: String(row.getCell(3).value || ''),
        doorMaterials: String(row.getCell(4).value || ''),
        stdDoorThicknessIn: toNumber(row.getCell(5).value, 1.75),
        variableThickness: row.getCell(6).value ? String(row.getCell(6).value) : null,
        positivePresurreUL10C: toYesNo(row.getCell(7).value),
        maxFireRatingMetalDoor: row.getCell(8).value ? String(row.getCell(8).value) : null,
        maxFireRatingWoodDoor: row.getCell(9).value ? String(row.getCell(9).value) : null,
        smokeSLabelCapable: toYesNo(row.getCell(10).value),
        adaBottomEdgeMaxIn: toNumber(row.getCell(11).value, 43),
        stdGlazingTape: row.getCell(12).value ? String(row.getCell(12).value) : null,
        intumescentTape: row.getCell(13).value ? String(row.getCell(13).value) : null,
        stcOption: toYesNo(row.getCell(14).value),
        notesUseCase: row.getCell(15).value ? String(row.getCell(15).value) : null,
        presetHospital: toYesNo(row.getCell(16).value),
        presetHotel: toYesNo(row.getCell(17).value),
        defaultFinish: row.getCell(18).value ? String(row.getCell(18).value) : null,
        finishNote: row.getCell(19).value ? String(row.getCell(19).value) : null,
        adderMullionBarEach: toNumber(row.getCell(22).value),
        adderTorxScrewsUpto24x24: toNumber(row.getCell(23).value),
        adderTorxScrewsOver24x24: toNumber(row.getCell(24).value),
        adderLeadLiningPerPerimeterIn: toNumber(row.getCell(25).value),
        adderStcPerSqft: toNumber(row.getCell(26).value),
        notes: null,
      });
    }
    
    // Insert or update lite kits
    for (const kit of kitsData) {
      await db.insert(liteKits).values(kit)
        .onConflictDoUpdate({
          target: liteKits.kitModel,
          set: kit
        });
      logger.debug(`✓ Imported lite kit: ${kit.kitModel}`);
    }
    
    logger.info(`Imported ${kitsData.length} lite kits`);
  }
  
  // Import Glass Types from Glazing sheet
  const glazingSheet = workbook.getWorksheet('Glazing');
  if (glazingSheet) {
    logger.info('=== Importing Glass Types ===');
    const glassData = [];
    
    for (let i = 2; i <= glazingSheet.rowCount; i++) {
      const row = glazingSheet.getRow(i);
      const glassName = row.getCell(2).value as string;
      
      if (!glassName) continue;
      
      glassData.push({
        glassName,
        thicknessIn: row.getCell(3).value as string || '',
        fireRating: row.getCell(4).value as string || 'Non-fire',
        maxAreaSqInFor60_90Min: row.getCell(5).value as string === '100' ? 100 : null,
        maxAreaSqInFor20_45Min: row.getCell(6).value as string === '1296' ? 1296 : null,
        safetyStandard: row.getCell(7).value as string || null,
        stcRating: row.getCell(8).value as string || null,
        gasketing: row.getCell(9).value as string || null,
        ul10C: null,
        notes: row.getCell(11).value as string || null,
        presetHospital: row.getCell(12).value === true ? 'yes' : 'no',
        presetOffice: row.getCell(13).value === true ? 'yes' : 'no',
        presetHotel: row.getCell(14).value === true ? 'yes' : 'no',
      });
    }
    
    // Insert or update glass types
    for (const glass of glassData) {
      await db.insert(glassTypes).values(glass)
        .onConflictDoUpdate({
          target: glassTypes.glassName,
          set: glass
        });
      logger.debug(`✓ Imported glass type: ${glass.glassName}`);
    }
    
    logger.info(`Imported ${glassData.length} glass types`);
  }
  
  // Import Glass Fire Sizes from size matrices
  logger.info('=== Importing Fire-Rated Glass Size Matrices ===');
  
  const matrices = [
    { sheetName: 'SizeMatrix_FireLite', glassType: 'FireLite NT' },
    { sheetName: 'SizeMatrix_PyranF', glassType: 'Pyran Platinum F' },
    { sheetName: 'SizeMatrix_PyranL', glassType: 'Pyran Platinum L' },
  ];
  
  let totalSizes = 0;
  
  for (const { sheetName, glassType } of matrices) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;
    
    logger.info(`Processing ${glassType}...`);
    const sizesData = [];
    
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      // Columns are: kit_model (A/1), glass_type (B/2), width_in (C/3), height_in (D/4), price_usd (E/5)
      const widthIn = row.getCell(3).value;
      const heightIn = row.getCell(4).value;
      
      if (!widthIn || !heightIn) continue;
      
      const width = typeof widthIn === 'number' ? widthIn : parseFloat(String(widthIn));
      const height = typeof heightIn === 'number' ? heightIn : parseFloat(String(heightIn));
      
      if (isNaN(width) || isNaN(height)) continue;
      
      sizesData.push({
        glassType,
        widthIn: width,
        heightIn: height,
        priceUsd: null,
        notes: null,
      });
    }
    
    // Batch insert (clear existing first for this glass type)
    await db.delete(glassFireSizes).where(eq(glassFireSizes.glassType, glassType));
    
    if (sizesData.length > 0) {
      await db.insert(glassFireSizes).values(sizesData);
      logger.info(`✓ Imported ${sizesData.length} valid sizes for ${glassType}`);
      totalSizes += sizesData.length;
    }
  }
  
  logger.info(`✓ Total fire-rated glass sizes imported: ${totalSizes}`);
}

importVisionLiteData()
  .then(() => {
    logger.info('✅ VisionLite data import complete!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error importing VisionLite data', { error });
    process.exit(1);
  });
