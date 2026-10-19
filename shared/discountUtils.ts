/**
 * Discount Utilities
 * Handles parsing and calculation of manufacturer/vendor discounts
 * Supports two formats:
 * 1. Decimal: "0.5" = 50% off (multiply by 0.5)
 * 2. Stacked Percentage: "50/10/5" = 50% off, then 10% off, then 5% off
 */

export interface DiscountCalculationResult {
  finalMultiplier: number;
  originalFormat: string;
  calculationSteps: string[];
  totalDiscountPercent: number;
  isValid: boolean;
  error?: string;
}

/**
 * Parse a discount string and return the final multiplier
 * Examples:
 * - "0.5" → 0.5 (50% off, pay 50%)
 * - "50" → 0.5 (50% off, pay 50%)
 * - "50/10" → 0.45 (50% off, then 10% off: 0.5 * 0.9 = 0.45)
 * - "50/10/5" → 0.4275 (50% off, then 10% off, then 5% off: 0.5 * 0.9 * 0.95 = 0.4275)
 */
export function parseDiscountMultiplier(discount: string | null | undefined): DiscountCalculationResult {
  if (!discount || discount.trim() === "") {
    return {
      finalMultiplier: 1.0,
      originalFormat: "",
      calculationSteps: ["No discount applied"],
      totalDiscountPercent: 0,
      isValid: true,
    };
  }

  const trimmed = discount.trim();
  const calculationSteps: string[] = [];

  try {
    // Check if it's a stacked percentage format (contains "/")
    if (trimmed.includes("/")) {
      const percentages = trimmed.split("/").map((p) => p.trim());
      let multiplier = 1.0;
      const steps: string[] = [];

      for (let i = 0; i < percentages.length; i++) {
        const percent = parseFloat(percentages[i]);
        
        if (isNaN(percent) || percent < 0 || percent > 100) {
          return {
            finalMultiplier: 1.0,
            originalFormat: trimmed,
            calculationSteps: [`Invalid percentage at position ${i + 1}: "${percentages[i]}"`],
            totalDiscountPercent: 0,
            isValid: false,
            error: `Invalid percentage value: "${percentages[i]}"`,
          };
        }

        const discountFactor = 1 - percent / 100;
        const prevMultiplier = multiplier;
        multiplier *= discountFactor;

        steps.push(
          `Step ${i + 1}: ${percent}% off → multiply by ${discountFactor.toFixed(4)} (${prevMultiplier.toFixed(4)} × ${discountFactor.toFixed(4)} = ${multiplier.toFixed(4)})`
        );
      }

      const totalDiscountPercent = (1 - multiplier) * 100;

      return {
        finalMultiplier: multiplier,
        originalFormat: trimmed,
        calculationSteps: [
          `Stacked discount: ${trimmed}`,
          ...steps,
          `Final price: ${(multiplier * 100).toFixed(2)}% of list (${totalDiscountPercent.toFixed(2)}% total discount)`,
        ],
        totalDiscountPercent,
        isValid: true,
      };
    }

    // Try parsing as a decimal multiplier (0.0 to 1.0)
    const decimal = parseFloat(trimmed);
    
    if (isNaN(decimal)) {
      return {
        finalMultiplier: 1.0,
        originalFormat: trimmed,
        calculationSteps: [`Invalid decimal format: "${trimmed}"`],
        totalDiscountPercent: 0,
        isValid: false,
        error: `Cannot parse "${trimmed}" as a number`,
      };
    }

    // If value is > 1, assume it's a percentage (e.g., "50" means 50% off)
    if (decimal > 1 && decimal <= 100) {
      const multiplier = 1 - decimal / 100;
      const totalDiscountPercent = decimal;
      
      return {
        finalMultiplier: multiplier,
        originalFormat: trimmed,
        calculationSteps: [
          `${decimal}% off`,
          `Multiplier: ${multiplier.toFixed(4)}`,
          `Final price: ${(multiplier * 100).toFixed(2)}% of list`,
        ],
        totalDiscountPercent,
        isValid: true,
      };
    }

    // If value is between 0 and 1, use it directly as a multiplier
    if (decimal >= 0 && decimal <= 1) {
      const totalDiscountPercent = (1 - decimal) * 100;
      
      return {
        finalMultiplier: decimal,
        originalFormat: trimmed,
        calculationSteps: [
          `Direct multiplier: ${decimal}`,
          `${totalDiscountPercent.toFixed(2)}% discount`,
          `Final price: ${(decimal * 100).toFixed(2)}% of list`,
        ],
        totalDiscountPercent,
        isValid: true,
      };
    }

    // Value is out of range
    return {
      finalMultiplier: 1.0,
      originalFormat: trimmed,
      calculationSteps: [`Value out of range: ${decimal} (expected 0-100)`],
      totalDiscountPercent: 0,
      isValid: false,
      error: `Value ${decimal} is out of valid range (0-100)`,
    };
  } catch (error) {
    return {
      finalMultiplier: 1.0,
      originalFormat: trimmed,
      calculationSteps: [`Error parsing discount: ${error}`],
      totalDiscountPercent: 0,
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Apply a discount multiplier to a price
 */
export function applyDiscount(price: number, discount: string | null | undefined): number {
  const result = parseDiscountMultiplier(discount);
  return price * result.finalMultiplier;
}

/**
 * Validate a discount string format
 */
export function validateDiscountFormat(discount: string): { valid: boolean; error?: string } {
  if (!discount || discount.trim() === "") {
    return { valid: true };
  }

  const result = parseDiscountMultiplier(discount);
  
  if (!result.isValid) {
    return { valid: false, error: result.error };
  }

  return { valid: true };
}

/**
 * Format a discount multiplier for display
 */
export function formatDiscountForDisplay(discount: string | null | undefined): string {
  if (!discount || discount.trim() === "") {
    return "No discount";
  }

  const result = parseDiscountMultiplier(discount);
  
  if (!result.isValid) {
    return `Invalid: ${discount}`;
  }

  if (discount.includes("/")) {
    return `${discount} (${result.totalDiscountPercent.toFixed(2)}% total)`;
  }

  return `${result.totalDiscountPercent.toFixed(2)}% off`;
}
