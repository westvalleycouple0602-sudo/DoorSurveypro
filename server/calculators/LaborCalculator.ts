/**
 * Labor Calculator
 * Calculates labor hours and costs for door hardware installation projects
 */

import {
  type LaborRates,
  type LaborCalculationResult,
  type EstimationContext,
  type CalculatorConfig,
  mergeLaborRates,
  mergePricingTiers,
  calculateMarkup,
  roundCurrency,
} from "../models/costs";

/**
 * Labor Calculator - Stateless service for labor cost calculations
 */
export class LaborCalculator {
  /**
   * Calculate labor hours and costs for a project
   *
   * @param context - Project context (openings, hardware count, complexity)
   * @param config - Optional custom rates and pricing tiers
   * @returns Detailed labor calculation breakdown
   */
  static calculate(
    context: EstimationContext,
    config?: CalculatorConfig
  ): LaborCalculationResult {
    const laborRates = mergeLaborRates(config?.laborRates);
    const pricingTiers = mergePricingTiers(config?.pricingTiers);

    // Calculate base labor hours
    const baseHours = this.calculateBaseHours(context);

    // Calculate complexity adjustment hours
    const complexityHours = this.calculateComplexityHours(context, baseHours);

    // Total hours
    const totalHours = roundCurrency(baseHours + complexityHours);

    // Estimate days and technicians
    const estimatedDays = this.estimateDays(totalHours);
    const estimatedTechnicians = this.estimateTechnicians(totalHours, estimatedDays);

    // Determine hourly rate (use rush rate if applicable)
    const hourlyRate = context.isRush
      ? laborRates.installationHourlyRate * laborRates.emergencyMultiplier
      : laborRates.installationHourlyRate;

    // Calculate costs
    const baseCost = roundCurrency(totalHours * hourlyRate);
    const markupAmount = roundCurrency(calculateMarkup(baseCost, pricingTiers.laborMarkup));
    const customerCost = roundCurrency(baseCost + markupAmount);

    return {
      baseHours,
      complexityHours,
      totalHours,
      estimatedDays,
      estimatedTechnicians,
      baseCost,
      markupAmount,
      customerCost,
    };
  }

  /**
   * Calculate base labor hours based on opening and hardware counts
   */
  private static calculateBaseHours(context: EstimationContext): number {
    const { openingCount, hardwareItemCount } = context;

    // Base formula: 2.5 hours per opening + 0.3 hours per hardware item
    const openingHours = openingCount * 2.5;
    const hardwareHours = hardwareItemCount * 0.3;

    return roundCurrency(openingHours + hardwareHours);
  }

  /**
   * Calculate additional hours based on complexity factors
   */
  private static calculateComplexityHours(
    context: EstimationContext,
    baseHours: number
  ): number {
    const factors = context.complexityFactors || {};
    let complexityMultiplier = 0;

    // Add complexity based on fire-rated doors
    if (factors.fireRatedDoors) {
      complexityMultiplier += factors.fireRatedDoors * 0.15; // 15% per fire door
    }

    // Add complexity for access control systems
    if (factors.accessControlSystems) {
      complexityMultiplier += factors.accessControlSystems * 0.25; // 25% per access system
    }

    // Add complexity for custom hardware
    if (factors.customHardware) {
      complexityMultiplier += factors.customHardware * 0.10; // 10% per custom item
    }

    // Add complexity for multiple floors (coordination, logistics)
    if (factors.multipleFloors) {
      complexityMultiplier += 0.20; // 20% for multi-floor projects
    }

    return roundCurrency(baseHours * complexityMultiplier);
  }

  /**
   * Estimate project duration in days
   */
  private static estimateDays(totalHours: number): number {
    // Assume 8-hour workdays with 80% efficiency
    const effectiveHoursPerDay = 8 * 0.8; // 6.4 hours
    return Math.ceil(totalHours / effectiveHoursPerDay);
  }

  /**
   * Estimate number of technicians needed
   */
  private static estimateTechnicians(totalHours: number, days: number): number {
    // Calculate technicians needed to complete work in estimated days
    const hoursPerDay = 8;
    const techsNeeded = totalHours / (days * hoursPerDay);
    return Math.max(1, Math.ceil(techsNeeded)); // Minimum 1 technician
  }

  /**
   * Calculate hours for a specific installation task
   */
  static calculateTaskHours(
    taskType: "survey" | "installation" | "pm",
    hours: number,
    config?: CalculatorConfig
  ): number {
    const laborRates = mergeLaborRates(config?.laborRates);

    switch (taskType) {
      case "survey":
        return roundCurrency(hours * (laborRates.surveyHourlyRate / laborRates.installationHourlyRate));
      case "pm":
        return roundCurrency(hours * (laborRates.pmHourlyRate / laborRates.installationHourlyRate));
      case "installation":
      default:
        return roundCurrency(hours);
    }
  }
}
