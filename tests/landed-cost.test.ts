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

      expect(result.netUnitCost).toBe(90); // 100 - 10%
      expect(result.totalDuties).toBeCloseTo(72, 1); // (90 * 10) * 8% = 72
      expect(result.freightCostTotal).toBeCloseTo(122.5, 1); // 50 * 1.15 + 25 + 10 + 30
      expect(result.landedUnitCost).toBeCloseTo(109.45, 1); // 90 + 7.2 + 12.25
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

      expect(result.netUnitCost).toBe(50);
      expect(result.totalDuties).toBe(0);
      expect(result.freightCostTotal).toBe(0);
      expect(result.landedUnitCost).toBe(50);
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

      expect(result.netUnitCost).toBe(100); // 200 - 50%
    });
  });

  describe('calculateLandedCost - Edge Cases', () => {
    it('should reject zero quantity', () => {
      expect(() => calculateLandedCost({
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
      })).toThrow('quantity must be greater than zero');
    });

    it('should reject negative quantity', () => {
      expect(() => calculateLandedCost({
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
      })).toThrow('quantity must be greater than zero');
    });

    it('should reject negative unit cost', () => {
      expect(() => calculateLandedCost({
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
      })).toThrow('unitCost cannot be negative');
    });

    it('should reject negative percentages', () => {
      expect(() => calculateLandedCost({
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
      })).toThrow('cannot be negative');
    });

    it('should reject negative freight costs', () => {
      expect(() => calculateLandedCost({
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
      })).toThrow('cannot be negative');
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

      // With very small quantity, freight per unit should be very high
      expect(result.perUnitFreight).toBeGreaterThan(1000);
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

      // With very large quantity, freight per unit should be very small
      expect(result.perUnitFreight).toBeLessThan(0.01);
    });

    it('should handle NaN inputs gracefully', () => {
      expect(() => calculateLandedCost({
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
      })).toThrow('must be a valid number');
    });
  });

  describe('calculateBatchLandedCost - Basic Functionality', () => {
    it('should calculate batch with all items valid', () => {
      const items = [
        { id: 'item1', quantity: 10, unitCost: 100, discountPercent: 10 },
        { id: 'item2', quantity: 5, unitCost: 50, discountPercent: 5 },
      ];

      const result = calculateBatchLandedCost(items);

      expect(result.itemCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[0].netUnitCost).toBe(90);
      expect(result.lineItems[1].netUnitCost).toBe(47.5);
    });

    it('should handle mixed valid and invalid items', () => {
      const items = [
        { id: 'valid1', quantity: 10, unitCost: 100, discountPercent: 0 },
        { id: 'invalid1', quantity: 0, unitCost: 100, discountPercent: 0 }, // Invalid: zero quantity
        { id: 'valid2', quantity: 5, unitCost: 50, discountPercent: 0 },
        { id: 'invalid2', quantity: 10, unitCost: -50, discountPercent: 0 }, // Invalid: negative cost
      ];

      const result = calculateBatchLandedCost(items);

      expect(result.itemCount).toBe(4);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(2);
      
      const errors = result.errors;
      expect(errors).toHaveLength(2);
      expect(errors.map(error => error.index)).toEqual([1, 3]);
    });

    it('should calculate summary totals correctly', () => {
      const items = [
        { id: 'item1', quantity: 10, unitCost: 100, discountPercent: 0, tariffRatePercent: 5 },
        { id: 'item2', quantity: 20, unitCost: 50, discountPercent: 0, tariffRatePercent: 5 },
      ];

      const result = calculateBatchLandedCost(items);

      expect(result).toBeDefined();
      expect(result.totalDuties).toBeGreaterThan(0);
      expect(result.totalLandedCost).toBeGreaterThan(0);
      
      // Verify totals match sum of individual results
      const summedDuties = result.lineItems
        .reduce((sum, item) => sum + item.totalDuties, 0);
      expect(result.totalDuties).toBeCloseTo(summedDuties, 2);
    });

    it('should handle empty batch', () => {
      const result = calculateBatchLandedCost([]);

      expect(result.itemCount).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.totalDuties).toBe(0);
      expect(result.totalLandedCost).toBe(0);
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

      expect(result.itemCount).toBe(3);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(3);
      expect(result.totalDuties).toBe(0);
      expect(result.totalLandedCost).toBe(0);
    });

    it('should handle very large batches', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item${i}`,
        quantity: 10,
        unitCost: 100,
        discountPercent: 0,
      }));

      const result = calculateBatchLandedCost(items);

      expect(result.itemCount).toBe(1000);
      expect(result.successCount).toBe(1000);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('Rounding and Precision', () => {
    it('rejects infinite inputs and discounts exceeding the item cost', () => {
      expect(() => calculateLandedCost({ quantity: Infinity, unitCost: 10 })).toThrow('valid number');
      expect(() => calculateLandedCost({ quantity: 1, unitCost: Infinity })).toThrow('valid number');
      expect(() => calculateLandedCost({ quantity: 1, unitCost: 10, tariffRatePercent: Infinity })).toThrow('valid number');
      expect(() => calculateLandedCost({ quantity: 1, unitCost: 10, discountPercent: 101 })).toThrow('cannot exceed 100');
      expect(calculateLandedCost({ quantity: 1, unitCost: 10, discountPercent: 100 }).netUnitCost).toBe(0);
    });
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

      // All monetary values should have at most 2 decimal places
      const hasMaxTwoDecimals = (num: number) => {
        const str = num.toString();
        const decimalIndex = str.indexOf('.');
        return decimalIndex === -1 || str.length - decimalIndex - 1 <= 2;
      };

      expect(hasMaxTwoDecimals(result.netUnitCost)).toBe(true);
      expect(hasMaxTwoDecimals(result.landedUnitCost)).toBe(true);
      expect(hasMaxTwoDecimals(result.totalDuties)).toBe(true);
    });
  });
});
