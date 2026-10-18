/**
 * Measurement parsing and formatting utilities
 * Supports multiple formats: feet-inch, decimal inches, fractions, metric
 */

export type MeasurementUnit = "inches" | "feet-inches" | "mm" | "cm";

export interface ParsedMeasurement {
  value: number; // Always in inches
  unit: MeasurementUnit;
  originalFormat: string;
  isValid: boolean;
}

/**
 * Parse a measurement string into inches
 * Supports formats:
 * - Feet-inches: "3'-0"", "3-0", "3'0", "3' 0""
 * - Decimal inches: "36", "36.5", "36.5 in"
 * - Fractions: "36 1/2", "36-1/2", "36 1/2""
 * - Metric: "914mm", "91.4cm"
 */
export function parseMeasurement(input: string | undefined | null): ParsedMeasurement {
  if (!input || typeof input !== "string") {
    return { value: 0, unit: "inches", originalFormat: "", isValid: false };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { value: 0, unit: "inches", originalFormat: "", isValid: false };
  }

  // Try feet-inches with fraction: 3'-0 3/4", 2'-6 1/2", 3'0 3/4"
  const feetInchesFractionMatch = trimmed.match(/^(\d+)['\s-]+(\d+)\s+(\d+)\s*\/\s*(\d+)"?$/);
  if (feetInchesFractionMatch) {
    const feet = parseFloat(feetInchesFractionMatch[1]);
    const inches = parseFloat(feetInchesFractionMatch[2]);
    const numerator = parseFloat(feetInchesFractionMatch[3]);
    const denominator = parseFloat(feetInchesFractionMatch[4]);
    if (!isNaN(feet) && !isNaN(inches) && !isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
      return {
        value: feet * 12 + inches + numerator / denominator,
        unit: "feet-inches",
        originalFormat: trimmed,
        isValid: true,
      };
    }
  }

  // Try feet-inches format: 3'-0", 3-0, 3'0", 3' 0"
  const feetInchesMatch = trimmed.match(/^(\d+)['\s-]+(\d+(?:\.\d+)?)"?$/);
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1]);
    const inches = parseFloat(feetInchesMatch[2]);
    if (!isNaN(feet) && !isNaN(inches)) {
      return {
        value: feet * 12 + inches,
        unit: "feet-inches",
        originalFormat: trimmed,
        isValid: true,
      };
    }
  }

  // Try fraction format: 36 1/2, 36-1/2, 36 1/2"
  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[-\s]\s*(\d+)\s*\/\s*(\d+)"?$/);
  if (fractionMatch) {
    const whole = parseFloat(fractionMatch[1]);
    const numerator = parseFloat(fractionMatch[2]);
    const denominator = parseFloat(fractionMatch[3]);
    if (!isNaN(whole) && !isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
      return {
        value: whole + numerator / denominator,
        unit: "inches",
        originalFormat: trimmed,
        isValid: true,
      };
    }
  }

  // Try simple fraction: 1/2, 3/4
  const simpleFractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)"?$/);
  if (simpleFractionMatch) {
    const numerator = parseFloat(simpleFractionMatch[1]);
    const denominator = parseFloat(simpleFractionMatch[2]);
    if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
      return {
        value: numerator / denominator,
        unit: "inches",
        originalFormat: trimmed,
        isValid: true,
      };
    }
  }

  // Try metric: 914mm, 91.4cm
  const metricMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(mm|cm)$/i);
  if (metricMatch) {
    const value = parseFloat(metricMatch[1]);
    const unit = metricMatch[2].toLowerCase();
    if (!isNaN(value)) {
      let inches = 0;
      if (unit === "mm") {
        inches = value / 25.4; // 1 inch = 25.4mm
      } else if (unit === "cm") {
        inches = value / 2.54; // 1 inch = 2.54cm
      }
      return {
        value: inches,
        unit: unit as "mm" | "cm",
        originalFormat: trimmed,
        isValid: true,
      };
    }
  }

  // Try decimal inches: "36", "36.5", "36.5 in", "36.5""
  const decimalMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")?$/i);
  if (decimalMatch) {
    const value = parseFloat(decimalMatch[1]);
    if (!isNaN(value)) {
      return {
        value: value,
        unit: "inches",
        originalFormat: trimmed,
        isValid: true,
      };
    }
  }

  // Invalid format
  return { value: 0, unit: "inches", originalFormat: trimmed, isValid: false };
}

/**
 * Format inches into a display string
 */
export function formatMeasurement(
  inches: number | undefined | null,
  format: "decimal" | "feet-inches" | "fraction" = "decimal",
  precision: number = 2
): string {
  if (inches === undefined || inches === null || isNaN(inches) || inches <= 0) {
    return "";
  }

  if (format === "feet-inches") {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    if (remainingInches === 0) {
      return `${feet}'-0"`;
    }
    return `${feet}'-${remainingInches.toFixed(precision).replace(/\.?0+$/, '')}"`;
  }

  if (format === "fraction") {
    const whole = Math.floor(inches);
    const decimal = inches - whole;
    
    // Common fractions
    const fractions = [
      { decimal: 0, fraction: "" },
      { decimal: 0.125, fraction: " 1/8" },
      { decimal: 0.25, fraction: " 1/4" },
      { decimal: 0.375, fraction: " 3/8" },
      { decimal: 0.5, fraction: " 1/2" },
      { decimal: 0.625, fraction: " 5/8" },
      { decimal: 0.75, fraction: " 3/4" },
      { decimal: 0.875, fraction: " 7/8" },
    ];

    // Find closest fraction
    let closest = fractions[0];
    let minDiff = Math.abs(decimal - fractions[0].decimal);
    for (const frac of fractions) {
      const diff = Math.abs(decimal - frac.decimal);
      if (diff < minDiff) {
        minDiff = diff;
        closest = frac;
      }
    }

    if (closest.fraction === "") {
      return `${whole}"`;
    }
    return `${whole}${closest.fraction}"`;
  }

  // Decimal format (default)
  return inches.toFixed(precision).replace(/\.?0+$/, '');
}

/**
 * Convert inches to other units
 */
export function convertMeasurement(
  inches: number,
  toUnit: "mm" | "cm" | "feet"
): number {
  switch (toUnit) {
    case "mm":
      return inches * 25.4;
    case "cm":
      return inches * 2.54;
    case "feet":
      return inches / 12;
    default:
      return inches;
  }
}

/**
 * Validate if a measurement is within a range
 */
export function validateMeasurementRange(
  inches: number,
  min: number,
  max: number
): { valid: boolean; message?: string } {
  if (inches < min) {
    return { valid: false, message: `Measurement must be at least ${min}"` };
  }
  if (inches > max) {
    return { valid: false, message: `Measurement must be at most ${max}"` };
  }
  return { valid: true };
}

/**
 * Common door/frame sizes for quick-fill
 */
export const COMMON_DOOR_WIDTHS = ["24", "28", "30", "32", "36", "42", "48"];
export const COMMON_DOOR_HEIGHTS = ["80", "84", "96"];
export const COMMON_DOOR_THICKNESS = ["1.375", "1.75", "2.25"];
export const COMMON_FRAME_WIDTHS = ["2", "4", "4.75", "5.75", "6.75"];
export const COMMON_FRAME_DEPTHS = ["4.75", "5.75", "6.75", "7.75", "8.75"];
