import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  HybridBinarizer,
  BinaryBitmap,
} from "@zxing/library";
import * as fs from "fs/promises";
import * as path from "path";
import { Jimp } from "jimp";
import { logger, logError } from "./logger";

// Load hardware mappings from JSON file
let hardwareMappings: any = null;

async function loadMappings() {
  if (!hardwareMappings) {
    try {
      const mappingsPath = path.join(process.cwd(), "shared", "hardware-mappings.json");
      const mappingsData = await fs.readFile(mappingsPath, "utf-8");
      hardwareMappings = JSON.parse(mappingsData);
    } catch (error) {
      logError(error as Error, { context: 'load-hardware-mappings', mappingsPath });
      hardwareMappings = { manufacturers: {}, finishes: {}, bhma_functions: {} };
    }
  }
  return hardwareMappings;
}

// Decoded barcode result interface
export interface DecodedBarcode {
  symbology: string; // QR_CODE, CODE_128, etc.
  text: string;
}

// Parsed hardware fields interface
export interface HardwareFields {
  manufacturer: string | null;
  model: string | null;
  bhmaFunction: string | null;
  finish: string | null;
  series: string | null;
  notes: string[];
}

// Normalized fields with additional metadata
export interface NormalizedFields extends HardwareFields {
  docsBase?: string;
  finishDesc?: string;
  bhmaDesc?: string;
  catalogLinks?: {
    vendorHome?: string;
    likelyProductQuery?: string;
    webSearch: string;
  };
}

/**
 * Decode barcodes from an image buffer using ZXing library
 * @param imageBuffer - Buffer containing the image data
 * @returns Array of decoded barcode results
 */
export async function decodeImage(imageBuffer: Buffer): Promise<DecodedBarcode[]> {
  try {
    // Use Jimp to load the image and extract pixel data
    const image = await Jimp.read(imageBuffer);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // Get image data as Uint8ClampedArray (RGBA format)
    const imageData = new Uint8ClampedArray(image.bitmap.data);
    
    // Create luminance source from RGB data
    const luminanceSource = new RGBLuminanceSource(imageData, width, height);
    
    // Create binary bitmap using hybrid binarizer
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
    
    // Configure hints for barcode detection
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.DATA_MATRIX,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    // Use MultiFormatReader to decode
    const reader = new MultiFormatReader();
    reader.setHints(hints);
    
    const results: DecodedBarcode[] = [];
    
    try {
      const result = reader.decode(binaryBitmap, hints);
      if (result) {
        results.push({
          symbology: result.getBarcodeFormat().toString(),
          text: result.getText(),
        });
      }
    } catch (error) {
      // No barcode found or decode error
      logger.info("No barcode detected in image");
    }
    
    return results;
  } catch (error) {
    logError(error as Error, { context: 'decode-barcode-image' });
    throw new Error("Failed to decode image");
  }
}

/**
 * Parse hardware tokens to extract manufacturer, model, BHMA function, finish, and series
 * @param tokens - Array of decoded barcode strings
 * @returns Parsed hardware fields
 */
export function parseHardwareTokens(tokens: string[]): HardwareFields {
  const fields: HardwareFields = {
    manufacturer: null,
    model: null,
    bhmaFunction: null,
    finish: null,
    series: null,
    notes: [],
  };
  
  // Combine all tokens into uppercase text for pattern matching
  const text = tokens.join(" ").toUpperCase();
  
  // Manufacturer hints (based on Python implementation lines 173-184)
  const mfrHints: Record<string, string[]> = {
    "SCHLAGE": ["SCHLAGE", "AL", "ND", "L SERIES", "AD"],
    "SARGENT": ["SARGENT", "10 LINE", "7 LINE", "BHW"],
    "YALE": ["YALE", "5300", "5400", "7000"],
    "VON DUPRIN": ["VON DUPRIN", "98", "99", "33A", "35A"],
    "LCN": ["LCN", "4040", "4041", "4021", "1460", "1260"],
    "HES": ["HES", "1500", "1600", "5000", "7000"],
    "SDC": ["SDC", "1500", "2340", "1581"],
    "ADAMS RITE": ["ADAMS RITE", "4510", "4900", "HERCULITE"],
    "BEST": ["BEST", "9K", "7K"],
    "CORBIN RUSSWIN": ["CORBIN", "RUSSWIN", "CLX", "ML2000"],
  };
  
  for (const [mfr, keys] of Object.entries(mfrHints)) {
    if (keys.some(k => text.includes(k))) {
      fields.manufacturer = mfr;
      break;
    }
  }
  
  // Finish codes (US/BHMA) - based on Python implementation line 192-195
  const finishCodes = ["626", "625", "630", "605", "606", "612", "613", "619", "622", "689", "690", "695"];
  for (const code of finishCodes) {
    if (new RegExp(`\\b${code}\\b`).test(text)) {
      fields.finish = code;
      break;
    }
  }
  
  // BHMA function like F109, F86, F75, etc. - based on Python implementation line 198-201
  const fMatch = text.match(/\bF(\d{2,3})\b/);
  if (fMatch) {
    fields.bhmaFunction = `F${fMatch[1]}`;
  }
  
  // Model/series: simple token that looks like letters+digits (e.g., ND80, 4040XP)
  // Based on Python implementation line 204-206
  const modelMatch = text.match(/\b([A-Z]{1,4}\d{1,4}[A-Z]{0,3})\b/);
  if (modelMatch) {
    fields.model = modelMatch[1];
  }
  
  // Series heuristics - based on Python implementation line 209-211
  const seriesMatch = text.match(/\b(4040XP|4041|98\/99|33A\/35A|5400|10 LINE|9K)\b/);
  if (seriesMatch) {
    fields.series = seriesMatch[1];
  }
  
  return fields;
}

/**
 * Normalize fields by adding descriptions and catalog links
 * Based on Python implementation lines 301-319
 */
export async function normalizeFields(fields: HardwareFields): Promise<NormalizedFields> {
  const mappings = await loadMappings();
  const normalized: NormalizedFields = { ...fields };
  
  // Match manufacturer by alias and get docs base
  if (fields.manufacturer && mappings.manufacturers) {
    for (const [canonical, info] of Object.entries(mappings.manufacturers)) {
      const mfrInfo = info as any;
      const aliases = [canonical, ...(mfrInfo.aliases || [])];
      if (aliases.some(a => fields.manufacturer?.toUpperCase() === a.toUpperCase())) {
        normalized.manufacturer = canonical;
        normalized.docsBase = mfrInfo.docs_base;
        break;
      }
    }
  }
  
  // Expand finish description
  if (fields.finish && mappings.finishes) {
    normalized.finishDesc = mappings.finishes[fields.finish];
  }
  
  // Expand BHMA function description
  if (fields.bhmaFunction && mappings.bhma_functions) {
    normalized.bhmaDesc = mappings.bhma_functions[fields.bhmaFunction];
  }
  
  // Build catalog links
  normalized.catalogLinks = buildCatalogLinks(
    normalized.manufacturer || "",
    normalized.model || "",
    normalized.docsBase
  );
  
  return normalized;
}

/**
 * Build catalog lookup links for manufacturer and model
 * Based on Python implementation lines 323-338
 */
function buildCatalogLinks(manufacturer: string, model: string, docsBase?: string): {
  vendorHome?: string;
  likelyProductQuery?: string;
  webSearch: string;
} {
  const links: any = {};
  
  // Generic web search fallback
  const searchTerms = [manufacturer, model, "cut sheet", "datasheet"]
    .filter(t => t)
    .join(" ");
  links.webSearch = `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}`;
  
  // Known vendor bases
  if (docsBase) {
    links.vendorHome = docsBase;
    const token = model.replace(/\s/g, "").replace(/\//g, "-");
    if (token) {
      links.likelyProductQuery = `${docsBase}?q=${encodeURIComponent(token)}`;
    }
  }
  
  return links;
}
