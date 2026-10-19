
/**
 * Seed Loader for Door Hardware (TypeScript, Node)
 * Usage:
 *   ts-node seed_loader.ts --db postgres://user:pass@host:5432/db --xlsx door_hardware_database_v1_4.xlsx
 */
import fs from "fs";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import xlsx from "@e965/xlsx";
import { Client } from "pg";

const argv = yargs(hideBin(process.argv)).options({
  db: { type: "string", demandOption: true },
  xlsx: { type: "string", demandOption: true },
}).argv as any;

async function loadSheet(client: Client, wb: xlsx.WorkBook, sheet: string, table: string) {
  if (!wb.Sheets[sheet]) return;
  const json = xlsx.utils.sheet_to_json<any>(wb.Sheets[sheet], { defval: null });
  if (!json.length) return;
  const cols = Object.keys(json[0]);
  const placeholders = cols.map((_, i) => `$${i+1}`).join(",");
  const sql = `INSERT INTO ${table} (${cols.map(c => c.replace(/\W+/g,'_')).join(",")}) VALUES (${placeholders})`;
  for (const row of json) {
    const values = cols.map(c => row[c]);
    await client.query(sql, values);
  }
  console.log(`Loaded ${json.length} rows -> ${table}`);
}

async function main() {
  const client = new Client({ connectionString: argv.db });
  await client.connect();
  const wb = xlsx.readFile(argv.xlsx);

  // Core hardware items: flatten all category sheets into hardware_items
  const hardwareSheets = [
    "Locks","Hinges","Door Closers","Exit Devices","Thresholds","Door Viewers",
    "Flush Bolts","Coordinators","Stops & Holders","Protection Plates",
    "Electric Strikes","Electromagnetic Locks","Gasketing & Sweeps",
    "Power Transfer & Electrified Hinges","Cylinders & Key Systems",
    "Pulls & Push Plates","Closer Accessories","Access Control Readers & Keypads"
  ];

  for (const s of hardwareSheets) {
    if (wb.Sheets[s]) {
      const rows = xlsx.utils.sheet_to_json<any>(wb.Sheets[s], { defval: null });
      for (const r of rows) {
        const cols = [
          "category","subtype","brand","model","nomenclature","grade","bhma_standard","bhma_certified","msrp",
          "typical_price","material","finish_options","dimensions","door_thickness","power","features","use",
          "fire_rating","ada_compliant","cross_ref","notes"
        ];
        const placeholders = cols.map((_, i) => `$${i+1}`).join(",");
        const sql = `INSERT INTO hardware_items(${cols.join(",")}) VALUES (${placeholders})`;
        const vals = cols.map(c => r[c] ?? null);
        await client.query(sql, vals);
      }
      console.log(`Loaded ${rows.length} hardware rows from ${s}`);
    }
  }

  // Mapping/aux tables
  await loadSheet(client, wb, "BHMA Finishes", "bhma_finishes");
  await loadSheet(client, wb, "Lock Functions", "lock_functions");
  await loadSheet(client, wb, "Function Validators", "function_catalog");
  await loadSheet(client, wb, "FuncCat - ND Expanded", "function_catalog");
  await loadSheet(client, wb, "FuncCat - L9000 Expanded", "function_catalog");
  await loadSheet(client, wb, "FuncCat - 5400LN Expanded", "function_catalog");
  await loadSheet(client, wb, "FuncCat - 10-Line Expanded", "function_catalog");
  await loadSheet(client, wb, "Code Rules (AHJ)", "code_rules");
  await loadSheet(client, wb, "AHJ Variations", "ahj_variations");

  await client.end();
  console.log("Seed complete.");
}

main().catch(e => { console.error(e); process.exit(1); });
