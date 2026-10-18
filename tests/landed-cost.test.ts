import { test as it, expect } from '@playwright/test';
const describe = it.describe;
import { calculateLandedCost, calculateBatchLandedCost } from '../shared/calculators';

describe('Landed Cost Calculator', () => {
  describe('calculateLandedCost - Basic Functionality', () => {
    it('should calculate landed cost with all fields populated', () => {
      const result = calculateLandedCost({
        quantity: 10,
        unitCost: 100,
        discountPercent: 10,
        tariffRatePercent: 5,
        antiDumpingPercent: 2,
        otherDutiesPercent: 1,
        baseFreightCost: 50,
        fuelSurchargePercent: 15,
        accessorialsCost: 25,
        insuranceCost: 10,
        customsBrokerageCost: 30,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.netUnitCost).toBe(90); // 100 - 10%
        expect(result.totalDuties).toBeCloseTo(72, 1); // (90 * 10) * 8% = 72
        expect(result.totalFreight).toBeCloseTo(122.5, 1); // 50 * 1.15 + 25 + 10 + 30
        expect(result.landedUnitCost).toBeCloseTo(109.45, 1); // 90 + 7.2 + 12.25
      }
    });

    it('should calculate with zero discount', () => {
      const result = calculateLandedCost({
        quantity: 5,
        unitCost: 50,
        discountPercent: 0,
        tariffRatePercent: 0,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 0,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.netUnitCost).toBe(50);
        expect(result.totalDuties).toBe(0);
        expect(result.totalFreight).toBe(0);
        expect(result.landedUnitCost).toBe(50);
      }
    });

    it('should handle high discount percentages correctly', () => {
      const result = calculateLandedCost({
        quantity: 100,
        unitCost: 200,
        discountPercent: 50,
        tariffRatePercent: 0,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 0,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.netUnitCost).toBe(100); // 200 - 50%
      }
    });
  });

  describe('calculateLandedCost - Edge Cases', () => {
    it('should reject zero quantity', () => {
      const result = calculateLandedCost({
        quantity: 0,
        unitCost: 100,
        discountPercent: 0,
        tariffRatePercent: 0,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 0,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Quantity must be greater than 0');
      }
    });

    it('should reject negative quantity', () => {
      const result = calculateLandedCost({
        quantity: -5,
        unitCost: 100,
        discountPercent: 0,
        tariffRatePercent: 0,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 0,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Quantity must be greater than 0');
      }
    });

    it('should reject negative unit cost', () => {
      const result = calculateLandedCost({
        quantity: 10,
        unitCost: -100,
        discountPercent: 0,
        tariffRatePercent: 0,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 0,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unit cost cannot be negative');
      }
    });

    it('should reject negative percentages', () => {
      const result = calculateLandedCost({
        quantity: 10,
        unitCost: 100,
        discountPercent: -10,
        tariffRatePercent: 0,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 0,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('cannot be negative');
      }
    });

    it('should reject negative freight costs', () => {
      const result = calculateLandedCost({
        quantity: 10,
        unitCost: 100,
        discountPercent: 0,
        tariffRatePercent: 0,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: -50,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('cannot be negative');
      }
    });

    it('should handle very small quantities', () => {
      const result = calculateLandedCost({
        quantity: 0.001,
        unitCost: 1000,
        discountPercent: 0,
        tariffRatePercent: 5,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 100,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // With very small quantity, freight per unit should be very high
        expect(result.freightPerUnit).toBeGreaterThan(1000);
      }
    });

    it('should handle very large quantities', () => {
      const result = calculateLandedCost({
        quantity: 1000000,
        unitCost: 1,
        discountPercent: 0,
        tariffRatePercent: 5,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 1000,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // With very large quantity, freight per unit should be very small
        expect(result.freightPerUnit).toBeLessThan(0.01);
      }
    });

    it('should handle NaN inputs gracefully', () => {
      const result = calculateLandedCost({
        quantity: NaN,
        unitCost: 100,
        discountPercent: 0,
        tariffRatePercent: 0,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 0,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('calculateBatchLandedCost - Basic Functionality', () => {
    it('should calculate batch with all items valid', () => {
      const items = [
        { id: 'item1', quantity: 10, unitCost: 100, discountPercent: 10 },
        { id: 'item2', quantity: 5, unitCost: 50, discountPercent: 5 },
      ];

      const result = calculateBatchLandedCost(items);

      expect(result.totalItems).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should handle mixed valid and invalid items', () => {
      const items = [
        { id: 'valid1', quantity: 10, unitCost: 100, discountPercent: 0 },
        { id: 'invalid1', quantity: 0, unitCost: 100, discountPercent: 0 }, // Invalid: zero quantity
        { id: 'valid2', quantity: 5, unitCost: 50, discountPercent: 0 },
        { id: 'invalid2', quantity: 10, unitCost: -50, discountPercent: 0 }, // Invalid: negative cost
      ];

      const result = calculateBatchLandedCost(items);

      expect(result.totalItems).toBe(4);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(2);
      
      const errors = result.results.filter(r => !r.success);
      expect(errors).toHaveLength(2);
    });

    it('should calculate summary totals correctly', () => {
      const items = [
        { id: 'item1', quantity: 10, unitCost: 100, discountPercent: 0, tariffRatePercent: 5 },
        { id: 'item2', quantity: 20, unitCost: 50, discountPercent: 0, tariffRatePercent: 5 },
      ];

      const result = calculateBatchLandedCost(items);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalDuties).toBeGreaterThan(0);
      expect(result.summary.totalLandedCost).toBeGreaterThan(0);
      
      // Verify totals match sum of individual results
      const summedDuties = result.results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.success ? r.calculation.totalDuties : 0), 0);
      expect(result.summary.totalDuties).toBeCloseTo(summedDuties, 2);
    });

    it('should handle empty batch', () => {
      const result = calculateBatchLandedCost([]);

      expect(result.totalItems).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.summary.totalDuties).toBe(0);
      expect(result.summary.totalLandedCost).toBe(0);
    });
  });

  describe('calculateBatchLandedCost - Edge Cases', () => {
    it('should handle all items failing validation', () => {
      const items = [
        { id: 'invalid1', quantity: 0, unitCost: 100, discountPercent: 0 },
        { id: 'invalid2', quantity: -5, unitCost: 100, discountPercent: 0 },
        { id: 'invalid3', quantity: 10, unitCost: -100, discountPercent: 0 },
      ];

      const result = calculateBatchLandedCost(items);

      expect(result.totalItems).toBe(3);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(3);
      expect(result.summary.totalDuties).toBe(0);
      expect(result.summary.totalLandedCost).toBe(0);
    });

    it('should handle very large batches', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item${i}`,
        quantity: 10,
        unitCost: 100,
        discountPercent: 0,
      }));

      const result = calculateBatchLandedCost(items);

      expect(result.totalItems).toBe(1000);
      expect(result.successCount).toBe(1000);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('Rounding and Precision', () => {
    it('should round monetary values to 2 decimal places', () => {
      const result = calculateLandedCost({
        quantity: 3,
        unitCost: 10.333,
        discountPercent: 0,
        tariffRatePercent: 5.555,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 0,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // All monetary values should have at most 2 decimal places
        const hasMaxTwoDecimals = (num: number) => {
          const str = num.toString();
          const decimalIndex = str.indexOf('.');
          return decimalIndex === -1 || str.length - decimalIndex - 1 <= 2;
        };

        expect(hasMaxTwoDecimals(result.netUnitCost)).toBe(true);
        expect(hasMaxTwoDecimals(result.landedUnitCost)).toBe(true);
        expect(hasMaxTwoDecimals(result.totalDuties)).toBe(true);
      }
    });
  });
});
