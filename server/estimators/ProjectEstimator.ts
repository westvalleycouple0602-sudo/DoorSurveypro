/**
 * Project Estimator
 * Orchestrates all calculators to produce complete project cost estimates
 */

import { LaborCalculator } from "../calculators/LaborCalculator";
import { FreightCalculator } from "../calculators/FreightCalculator";
import { MaterialCalculator } from "../calculators/MaterialCalculator";
import { InstallationCalculator } from "../calculators/InstallationCalculator";
import {
  type ProjectCostBreakdown,
  type EstimationContext,
  type CalculatorConfig,
  mergePricingTiers,
  mergeLaborRates,
  calculateProfitMargin,
  calculateDiscount,
  roundCurrency,
} from "../models/costs";

/**
 * Project Estimator - Orchestrates cost calculations for complete project estimates
 */
export class ProjectEstimator {
  /**
   * Generate a complete project cost estimate
   *
   * @param context - Project estimation context
   * @param config - Optional configuration for rates and pricing
   * @returns Complete cost breakdown with all components
   */
  static estimateProject(
    context: EstimationContext,
    config?: CalculatorConfig
  ): ProjectCostBreakdown {
    // Calculate materials
    const materialCalc = MaterialCalculator.calculate(context, config);

    // Calculate labor
    const laborCalc = LaborCalculator.calculate(context, config);

    // Calculate freight
    const freightCalc = FreightCalculator.calculate(context, config);

    // Get merged rates for hourly rate reporting
    const laborRates = mergeLaborRates(config?.laborRates);

    // Build material costs
    const materials = {
      listPriceTotal: materialCalc.listPriceTotal,
      netPriceTotal: materialCalc.netPriceTotal,
      markupAmount: materialCalc.markupAmount,
      customerCost: materialCalc.customerCost,
      itemCount: materialCalc.itemCount,
    };

    // Build labor costs (use merged labor rates, apply rush multiplier if applicable)
    const hourlyRate = context.isRush
      ? laborRates.installationHourlyRate * laborRates.emergencyMultiplier
      : laborRates.installationHourlyRate;

    const labor = {
      baseHours: laborCalc.baseHours,
      complexityHours: laborCalc.complexityHours,
      totalHours: laborCalc.totalHours,
      hourlyRate,
      baseCost: laborCalc.baseCost,
      markupAmount: laborCalc.markupAmount,
      customerCost: laborCalc.customerCost,
      estimatedTechnicians: laborCalc.estimatedTechnicians,
      estimatedDays: laborCalc.estimatedDays,
    };

    // Build freight costs
    const freight = {
      totalWeightLbs: freightCalc.totalWeightLbs,
      totalVolumeCuFt: freightCalc.totalVolumeCuFt,
      shipmentCount: freightCalc.shipmentCount,
      baseCost: freightCalc.baseCost,
      weightCost: freightCalc.weightCost,
      volumeCost: freightCalc.volumeCost,
      multipliers: freightCalc.multipliers,
      markupAmount: freightCalc.markupAmount,
      customerCost: freightCalc.customerCost,
    };

    // Calculate subtotal
    const subtotal = roundCurrency(
      materials.customerCost + labor.customerCost + freight.customerCost
    );

    // Calculate profit margin
    const pricingTiers = mergePricingTiers(config?.pricingTiers);
    const profitAmount = roundCurrency(calculateProfitMargin(subtotal, pricingTiers.profitMargin));

    // Calculate discount (if applicable)
    const discountAmount = pricingTiers.discountPercent
      ? roundCurrency(calculateDiscount(subtotal + profitAmount, pricingTiers.discountPercent))
      : undefined;

    // Calculate total cost
    const totalCost = roundCurrency(
      subtotal + profitAmount - (discountAmount || 0)
    );

    return {
      materials,
      labor,
      freight,
      subtotal,
      profitAmount,
      discountAmount,
      totalCost,
    };
  }

  /**
   * Generate a quick estimate without full breakdown
   */
  static quickEstimate(
    openingCount: number,
    hardwareItemCount: number,
    hardwareNetPrice: number,
    config?: CalculatorConfig
  ): { estimatedTotal: number; estimatedDays: number } {
    const context: EstimationContext = {
      openingCount,
      hardwareItemCount,
      hardwareListPrice: hardwareNetPrice * 1.3, // Assume 30% list vs net
      hardwareNetPrice,
    };

    const breakdown = this.estimateProject(context, config);

    return {
      estimatedTotal: breakdown.totalCost,
      estimatedDays: breakdown.labor.estimatedDays,
    };
  }

  /**
   * Generate installation time estimate only
   */
  static estimateInstallationTime(context: EstimationContext) {
    return InstallationCalculator.estimateTime(context);
  }

  /**
   * Calculate cost adjustments (discounts, upcharges)
   */
  static calculateAdjustments(
    baseCost: number,
    discountPercent?: number,
    upchargePercent?: number,
    taxPercent?: number
  ): {
    subtotal: number;
    discountAmount?: number;
    upchargeAmount?: number;
    taxAmount?: number;
    totalCost: number;
  } {
    let subtotal = baseCost;

    const discountAmount = discountPercent
      ? roundCurrency(calculateDiscount(subtotal, discountPercent))
      : undefined;

    if (discountAmount) {
      subtotal -= discountAmount;
    }

    const upchargeAmount = upchargePercent
      ? roundCurrency(subtotal * upchargePercent)
      : undefined;

    if (upchargeAmount) {
      subtotal += upchargeAmount;
    }

    const taxAmount = taxPercent
      ? roundCurrency(subtotal * taxPercent)
      : undefined;

    const totalCost = roundCurrency(subtotal + (taxAmount || 0));

    return {
      subtotal: baseCost,
      discountAmount,
      upchargeAmount,
      taxAmount,
      totalCost,
    };
  }
}
