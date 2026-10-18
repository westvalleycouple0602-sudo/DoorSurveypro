/**
 * Installation Time Calculator
 * Estimates installation time requirements for door hardware projects
 */

import {
  type InstallationTimeResult,
  type EstimationContext,
  roundCurrency,
} from "../models/costs";

/**
 * Installation Calculator - Stateless service for installation time estimates
 */
export class InstallationCalculator {
  /**
   * Base installation time per opening (hours)
   */
  private static readonly BASE_HOURS_PER_OPENING = 2.5;

  /**
   * Additional time per hardware item (hours)
   */
  private static readonly HOURS_PER_HARDWARE_ITEM = 0.3;

  /**
   * Estimate installation time requirements
   *
   * @param context - Project context (openings, hardware, complexity)
   * @returns Installation time breakdown
   */
  static estimateTime(context: EstimationContext): InstallationTimeResult {
    // Calculate base hours
    const openingHours = context.openingCount * this.BASE_HOURS_PER_OPENING;
    const hardwareHours = context.hardwareItemCount * this.HOURS_PER_HARDWARE_ITEM;
    const baseHours = openingHours + hardwareHours;

    // Calculate complexity multiplier
    const complexityFactor = this.calculateComplexityFactor(context);

    // Apply complexity
    const totalHours = roundCurrency(baseHours * (1 + complexityFactor));

    // Calculate average per opening
    const hoursPerOpening = roundCurrency(totalHours / Math.max(1, context.openingCount));

    // Estimate days (8-hour days, 80% efficiency)
    const effectiveHoursPerDay = 8 * 0.8; // 6.4 hours
    const estimatedDays = Math.ceil(totalHours / effectiveHoursPerDay);

    // Estimate technicians needed
    const estimatedTechnicians = Math.max(1, Math.ceil(totalHours / (estimatedDays * 8)));

    return {
      totalHours,
      hoursPerOpening,
      estimatedDays,
      estimatedTechnicians,
      complexityFactor,
    };
  }

  /**
   * Calculate complexity factor based on project characteristics
   */
  private static calculateComplexityFactor(context: EstimationContext): number {
    const factors = context.complexityFactors || {};
    let complexity = 0;

    // Fire-rated doors add complexity (15% each)
    if (factors.fireRatedDoors) {
      complexity += factors.fireRatedDoors * 0.15;
    }

    // Access control systems add significant complexity (25% each)
    if (factors.accessControlSystems) {
      complexity += factors.accessControlSystems * 0.25;
    }

    // Custom hardware adds moderate complexity (10% each)
    if (factors.customHardware) {
      complexity += factors.customHardware * 0.10;
    }

    // Multiple floors add logistics complexity (20% total)
    if (factors.multipleFloors) {
      complexity += 0.20;
    }

    return roundCurrency(complexity);
  }

  /**
   * Estimate installation time for a specific opening
   */
  static estimateOpeningTime(hardwareCount: number, hasComplexity: boolean = false): number {
    const baseTime = this.BASE_HOURS_PER_OPENING + (hardwareCount * this.HOURS_PER_HARDWARE_ITEM);
    const complexityMultiplier = hasComplexity ? 1.25 : 1.0;
    return roundCurrency(baseTime * complexityMultiplier);
  }
}
