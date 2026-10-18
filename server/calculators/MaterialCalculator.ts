/**
 * Material Calculator
 * Calculates material (hardware) costs with markups
 */

import {
  type MaterialCalculationResult,
  type EstimationContext,
  type CalculatorConfig,
  mergePricingTiers,
  calculateMarkup,
  roundCurrency,
} from "../models/costs";

/**
 * Material Calculator - Stateless service for material cost calculations
 */
export class MaterialCalculator {
  /**
   * Calculate material costs from hardware prices
   *
   * @param context - Project context with hardware pricing data
   * @param config - Optional custom pricing tiers
   * @returns Detailed material calculation breakdown
   */
  static calculate(
    context: EstimationContext,
    config?: CalculatorConfig
  ): MaterialCalculationResult {
    const pricingTiers = mergePricingTiers(config?.pricingTiers);

    const listPriceTotal = roundCurrency(context.hardwareListPrice);
    const netPriceTotal = roundCurrency(context.hardwareNetPrice);
    const itemCount = context.hardwareItemCount;

    // Calculate markup based on net price (actual cost to us)
    const markupAmount = roundCurrency(calculateMarkup(netPriceTotal, pricingTiers.materialMarkup));
    const customerCost = roundCurrency(netPriceTotal + markupAmount);

    return {
      listPriceTotal,
      netPriceTotal,
      markupAmount,
      customerCost,
      itemCount,
    };
  }

  /**
   * Calculate cost for specific hardware item
   */
  static calculateItemCost(
    listPrice: number,
    netPrice: number,
    quantity: number = 1,
    config?: CalculatorConfig
  ): { itemCost: number; markupAmount: number; customerCost: number } {
    const pricingTiers = mergePricingTiers(config?.pricingTiers);

    const itemCost = roundCurrency(netPrice * quantity);
    const markupAmount = roundCurrency(calculateMarkup(itemCost, pricingTiers.materialMarkup));
    const customerCost = roundCurrency(itemCost + markupAmount);

    return {
      itemCost,
      markupAmount,
      customerCost,
    };
  }
}
