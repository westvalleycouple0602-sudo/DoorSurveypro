/**
 * Freight Calculator
 * Calculates shipping and freight costs for door hardware projects
 */

import {
  type FreightRates,
  type FreightCalculationResult,
  type EstimationContext,
  type CalculatorConfig,
  mergeFreightRates,
  mergePricingTiers,
  calculateMarkup,
  roundCurrency,
} from "../models/costs";

/**
 * Freight Calculator - Stateless service for freight cost calculations
 */
export class FreightCalculator {
  // Average hardware item weight (lbs) - can be overridden per project
  private static readonly DEFAULT_ITEM_WEIGHT_LBS = 15;
  
  // Average hardware item volume (cubic feet)
  private static readonly DEFAULT_ITEM_VOLUME_CUFT = 0.5;
  
  // Items per shipment (typical pallet capacity)
  private static readonly ITEMS_PER_SHIPMENT = 50;

  /**
   * Calculate freight costs for a project
   *
   * @param context - Project context (hardware count, location, rush status)
   * @param config - Optional custom rates and pricing tiers
   * @returns Detailed freight calculation breakdown
   */
  static calculate(
    context: EstimationContext,
    config?: CalculatorConfig
  ): FreightCalculationResult {
    const freightRates = mergeFreightRates(config?.freightRates);
    const pricingTiers = mergePricingTiers(config?.pricingTiers);

    // Calculate physical dimensions
    const totalWeightLbs = this.calculateTotalWeight(context);
    const totalVolumeCuFt = this.calculateTotalVolume(context);
    const shipmentCount = this.calculateShipmentCount(context);

    // Calculate base freight costs
    const baseCost = roundCurrency(freightRates.baseShipmentCost * shipmentCount);
    const weightCost = roundCurrency(totalWeightLbs * freightRates.costPerPound);
    const volumeCost = roundCurrency(totalVolumeCuFt * freightRates.costPerCubicFoot);

    // Use the greater of weight-based or volume-based cost
    const dimensionalCost = Math.max(weightCost, volumeCost);

    // Calculate multipliers
    let multipliers = 1.0;
    if (context.isRush) {
      multipliers *= freightRates.expeditedMultiplier;
    }
    if (context.isInternational) {
      multipliers *= freightRates.internationalMultiplier;
    }

    // Calculate total freight cost (base + dimensional, with multipliers)
    const rawFreightCost = (baseCost + dimensionalCost) * multipliers;
    
    // Apply minimum freight cost
    const adjustedFreightCost = Math.max(rawFreightCost, freightRates.minimumFreightCost);

    // Calculate markup
    const markupAmount = roundCurrency(calculateMarkup(adjustedFreightCost, pricingTiers.freightMarkup));
    const customerCost = roundCurrency(adjustedFreightCost + markupAmount);

    return {
      totalWeightLbs,
      totalVolumeCuFt,
      shipmentCount,
      baseCost,
      weightCost,
      volumeCost,
      multipliers,
      markupAmount,
      customerCost,
    };
  }

  /**
   * Calculate total weight of hardware items
   */
  private static calculateTotalWeight(context: EstimationContext): number {
    const avgWeight = context.avgHardwareWeight || this.DEFAULT_ITEM_WEIGHT_LBS;
    return roundCurrency(context.hardwareItemCount * avgWeight);
  }

  /**
   * Calculate total volume of hardware items
   */
  private static calculateTotalVolume(context: EstimationContext): number {
    return roundCurrency(context.hardwareItemCount * this.DEFAULT_ITEM_VOLUME_CUFT);
  }

  /**
   * Calculate number of shipments needed
   */
  private static calculateShipmentCount(context: EstimationContext): number {
    return Math.max(1, Math.ceil(context.hardwareItemCount / this.ITEMS_PER_SHIPMENT));
  }

  /**
   * Estimate freight cost for a specific shipment type
   */
  static estimateShipmentCost(
    weightLbs: number,
    volumeCuFt: number,
    isExpedited: boolean = false,
    isInternational: boolean = false,
    config?: CalculatorConfig
  ): number {
    const freightRates = mergeFreightRates(config?.freightRates);

    const weightCost = weightLbs * freightRates.costPerPound;
    const volumeCost = volumeCuFt * freightRates.costPerCubicFoot;
    const dimensionalCost = Math.max(weightCost, volumeCost);

    let cost = freightRates.baseShipmentCost + dimensionalCost;

    if (isExpedited) {
      cost *= freightRates.expeditedMultiplier;
    }
    if (isInternational) {
      cost *= freightRates.internationalMultiplier;
    }

    return roundCurrency(Math.max(cost, freightRates.minimumFreightCost));
  }
}
