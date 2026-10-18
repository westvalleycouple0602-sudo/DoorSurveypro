import crypto from "crypto";

/**
 * Partner Pricing Utilities
 * Ported from Python Flask backend for multi-partner price comparison
 */

export interface OpeningItem {
  opening_id: string;
  qty: number;
  codes: string[];
}

export interface PriceRequestLine {
  opening_id: string;
  qty: number;
  codes: string[];
}

export interface PartnerPriceResult {
  partner_id: string;
  total?: number;
  currency?: string;
  cached?: boolean;
  unmapped_codes?: string[];
  error?: string;
}

export interface PriceComparisonResult {
  partners: PartnerPriceResult[];
}

export interface CodeConversionResult {
  partner_id: string;
  lines: PriceRequestLine[];
  unmapped_codes?: string[];
}

/**
 * Generate a cache key from partner ID and line items with organization isolation
 * @param organizationId Organization ID for tenant isolation
 * @param partnerId Partner identifier
 * @param lines Array of price request line items
 * @returns SHA-256 hash as hex string prefixed with org ID
 */
export function generateCacheKey(organizationId: string, partnerId: string, lines: PriceRequestLine[]): string {
  // Sort object keys recursively for deterministic serialization
  const sortedData = {
    organization_id: organizationId,
    partner_id: partnerId,
    lines: lines.map(line => ({
      codes: line.codes.slice().sort(), // Sort codes array
      opening_id: line.opening_id,
      qty: line.qty
    })).sort((a, b) => a.opening_id.localeCompare(b.opening_id)) // Sort lines by opening_id
  };
  
  const data = JSON.stringify(sortedData);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return `price:${organizationId}:${hash}`;
}

/**
 * Convert openings to CSV format
 * @param openings Array of opening items
 * @param partnerId Optional partner ID for partner-specific formatting
 * @returns CSV string with opening_id, qty, codes columns
 */
export function openingsToCSV(openings: OpeningItem[], partnerId?: string): string {
  const header = "opening_id,qty,codes\n";
  const rows = openings.map(op => {
    const codes = (op.codes || []).join(";");
    return `${op.opening_id || ""},${op.qty || 1},"${codes}"`;
  }).join("\n");
  
  return header + rows;
}

/**
 * Generate a template CSV with sample data
 * @param appliesTo door or frame
 * @param market residential or commercial
 * @param count Number of sample rows to generate
 * @param defaultCodes Array of default codes to include
 * @returns CSV string
 */
export function makeTemplate(
  appliesTo: "door" | "frame",
  market: "residential" | "commercial",
  count: number = 5,
  defaultCodes: string[] = []
): string {
  const openings: OpeningItem[] = [];
  for (let i = 0; i < Math.max(count, 1); i++) {
    openings.push({
      opening_id: `SAMPLE-${i + 1}`,
      qty: 1,
      codes: defaultCodes
    });
  }
  
  return openingsToCSV(openings);
}

/**
 * Convert internal codes to partner-specific codes using mapping table
 * @param internalCodes Array of internal codes
 * @param mappings Map of internal code -> partner code
 * @returns Object with converted codes and unmapped codes
 */
export function convertCodes(
  internalCodes: string[],
  mappings: Map<string, string>
): { convertedCodes: string[]; unmappedCodes: string[] } {
  const convertedCodes: string[] = [];
  const unmappedCodes: string[] = [];
  
  for (const code of internalCodes) {
    const partnerCode = mappings.get(code);
    if (partnerCode) {
      convertedCodes.push(partnerCode);
    } else {
      unmappedCodes.push(code);
    }
  }
  
  return { convertedCodes, unmappedCodes };
}

/**
 * Validate TTL (time to live) value
 * @param ttl Time to live in seconds
 * @returns Valid TTL (between 60 and 86400 seconds)
 */
export function validateTTL(ttl: number = 1800): number {
  const DEFAULT_TTL = 1800; // 30 minutes
  const MIN_TTL = 60; // 1 minute
  const MAX_TTL = 86400; // 24 hours
  
  if (ttl < MIN_TTL) return DEFAULT_TTL;
  if (ttl > MAX_TTL) return MAX_TTL;
  return ttl;
}
