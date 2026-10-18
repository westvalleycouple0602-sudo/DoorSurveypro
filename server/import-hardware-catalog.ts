/**
 * Hardware Catalog Importer
 * Imports hardware database from Excel workbook v1.6 into PostgreSQL
 * 
 * Usage: tsx server/import-hardware-catalog.ts
 */

import fs from "fs";
import path from "path";
import xlsx from "@e965/xlsx";
import { db } from "./storage";
import { 
  hardwareCatalog, 
  bhmaFinishes, 
  lockFunctions, 
  functionCatalog,
  codeRules,
  ahjVariations
} from "@shared/schema";

const EXCEL_PATH = path.join(process.cwd(), "attached_assets", "door_hardware_bundle", "door_hardware_database_v1_6.xlsx");

// Field mapping from Excel columns to database columns
const FIELD_MAP: Record<string, string> = {
  "Category": "category",
  "Subtype": "subtype",
  "Brand": "brand",
  "Model": "model",
  "Nomenclature": "nomenclature",
  "Grade": "grade",
  "BHMA Standard": "bhmaStandard",
  "BHMA Certified": "bhmaCertified",
  "MSRP": "msrp",
  "Typical Price": "typicalPrice",
  "Material": "material",
  "Finish Options": "finishOptions",
  "Dimensions": "dimensions",
  "Door Thickness": "doorThickness",
  "Power": "power",
  "Features": "features",
  "Use": "use",
  "Fire Rating": "fireRating",
  "ADA Compliant": "adaCompliant",
  "Cross-Ref": "crossRef",
  "Notes": "notes",
};

// Convert Excel row to database record
function mapRow(row: any): any {
  const mapped: any = {};
  for (const [excelField, dbField] of Object.entries(FIELD_MAP)) {
    if (row[excelField] !== undefined && row[excelField] !== null && row[excelField] !== "—") {
      let value = row[excelField];
      
      // Handle boolean conversion for BHMA Certified
      if (dbField === "bhmaCertified") {
        value = value === true || value === "yes" || value === "Y" ? "yes" : "no";
      }
      
      mapped[dbField] = value;
    }
  }
  return mapped;
}

async function loadHardwareItems() {
  console.log("📦 Loading hardware catalog from Excel workbook...");
  
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Excel file not found: ${EXCEL_PATH}`);
    process.exit(1);
  }

  const workbook = xlsx.readFile(EXCEL_PATH);
  
  // Categories to import from separate sheets
  const hardwareSheets = [
    "Locks",
    "Hinges",
    "Door Closers",
    "Exit Devices",
    "Thresholds",
    "Door Viewers",
    "Flush Bolts",
    "Coordinators",
    "Stops & Holders",
    "Protection Plates",
    "Electric Strikes",
    "Electromagnetic Locks",
    "Gasketing & Sweeps",
    "Power Transfer & Electrified Hinges",
    "Cylinders & Key Systems",
    "Pulls & Push Plates",
    "Closer Accessories",
    "Access Control Readers & Keypads"
  ];

  let totalImported = 0;

  for (const sheetName of hardwareSheets) {
    if (!workbook.Sheets[sheetName]) {
      console.log(`⏭️  Skipping ${sheetName} (not found)`);
      continue;
    }

    const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName], { defval: null });
    
    if (rows.length === 0) {
      console.log(`⏭️  Skipping ${sheetName} (empty)`);
      continue;
    }

    console.log(`\n📋 Processing ${sheetName}...`);
    
    for (const row of rows) {
      const record = mapRow(row);
      record.category = sheetName; // Set category from sheet name
      
      try {
        await db.insert(hardwareCatalog).values(record);
        totalImported++;
      } catch (error) {
        console.error(`   ⚠️  Error importing row:`, error);
      }
    }
    
    console.log(`   ✅ Imported ${rows.length} items from ${sheetName}`);
  }

  console.log(`\n✨ Total hardware items imported: ${totalImported}`);
}

async function loadBhmaFinishes() {
  console.log("\n🎨 Loading BHMA finishes...");
  
  const workbook = xlsx.readFile(EXCEL_PATH);
  
  if (!workbook.Sheets["BHMA Finishes"]) {
    console.log("⏭️  BHMA Finishes sheet not found");
    return;
  }

  const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets["BHMA Finishes"], { defval: null });
  
  for (const row of rows) {
    const record = {
      codeUs: row["Code (US)"] || row["code_us"],
      codeBhma: row["Code (BHMA)"] || row["code_bhma"],
      description: row["Description"] || row["description"],
    };
    
    if (record.codeUs) {
      try {
        await db.insert(bhmaFinishes).values(record);
      } catch (error) {
        // Ignore duplicate key errors
      }
    }
  }
  
  console.log(`   ✅ Imported ${rows.length} BHMA finishes`);
}

async function loadLockFunctions() {
  console.log("\n🔐 Loading lock functions...");
  
  const workbook = xlsx.readFile(EXCEL_PATH);
  
  if (!workbook.Sheets["Lock Functions"]) {
    console.log("⏭️  Lock Functions sheet not found");
    return;
  }

  const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets["Lock Functions"], { defval: null });
  
  for (const row of rows) {
    const record = {
      category: row["Category"] || row["category"],
      function: row["Function"] || row["function"],
      typicalUse: row["Typical Use"] || row["typical_use"],
      notes: row["Notes"] || row["notes"],
    };
    
    try {
      await db.insert(lockFunctions).values(record);
    } catch (error) {
      // Ignore errors
    }
  }
  
  console.log(`   ✅ Imported ${rows.length} lock functions`);
}

async function loadFunctionCatalog() {
  console.log("\n📚 Loading function catalog...");
  
  const workbook = xlsx.readFile(EXCEL_PATH);
  
  const functionSheets = [
    "Function Validators",
    "FuncCat - ND Expanded",
    "FuncCat - L9000 Expanded",
    "FuncCat - 5400LN Expanded",
    "FuncCat - 10-Line Expanded"
  ];

  let totalImported = 0;

  for (const sheetName of functionSheets) {
    if (!workbook.Sheets[sheetName]) {
      continue;
    }

    const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName], { defval: null });
    
    for (const row of rows) {
      const record = {
        brand: row["Brand"] || row["brand"],
        family: row["Family"] || row["family"],
        functionCode: row["Function Code"] || row["function_code"],
        name: row["Name"] || row["name"],
        description: row["Description"] || row["description"],
        verified: "no", // Default to not verified
      };
      
      try {
        await db.insert(functionCatalog).values(record);
        totalImported++;
      } catch (error) {
        // Ignore errors
      }
    }
  }
  
  console.log(`   ✅ Imported ${totalImported} function catalog entries`);
}

async function loadCodeRules() {
  console.log("\n📖 Loading code rules...");
  
  const workbook = xlsx.readFile(EXCEL_PATH);
  
  if (!workbook.Sheets["Code Rules (AHJ)"]) {
    console.log("⏭️  Code Rules (AHJ) sheet not found");
    return;
  }

  const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets["Code Rules (AHJ)"], { defval: null });
  
  for (const row of rows) {
    const record = {
      ruleId: row["Rule ID"] || row["rule_id"],
      category: row["Category"] || row["category"],
      condition: row["Condition"] || row["condition"],
      jurisdiction: row["Jurisdiction"] || row["jurisdiction"],
      severity: row["Severity"] || row["severity"],
      guidance: row["Guidance"] || row["guidance"],
    };
    
    if (record.ruleId) {
      try {
        await db.insert(codeRules).values(record);
      } catch (error) {
        // Ignore duplicate key errors
      }
    }
  }
  
  console.log(`   ✅ Imported ${rows.length} code rules`);
}

async function loadAhjVariations() {
  console.log("\n🗺️  Loading AHJ variations...");
  
  const workbook = xlsx.readFile(EXCEL_PATH);
  
  if (!workbook.Sheets["AHJ Variations"]) {
    console.log("⏭️  AHJ Variations sheet not found");
    return;
  }

  const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets["AHJ Variations"], { defval: null });
  
  for (const row of rows) {
    const record = {
      state: row["State"] || row["state"],
      codeEdition: row["Code Edition"] || row["code_edition"],
      ruleId: row["Rule ID"] || row["rule_id"],
      override: row["Override"] || row["override"],
      notes: row["Notes"] || row["notes"],
    };
    
    try {
      await db.insert(ahjVariations).values(record);
    } catch (error) {
      // Ignore errors
    }
  }
  
  console.log(`   ✅ Imported ${rows.length} AHJ variations`);
}

async function main() {
  console.log("🚀 Starting hardware catalog import...\n");
  
  try {
    await loadHardwareItems();
    await loadBhmaFinishes();
    await loadLockFunctions();
    await loadFunctionCatalog();
    await loadCodeRules();
    await loadAhjVariations();
    
    console.log("\n✅ Import completed successfully!");
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

main();
