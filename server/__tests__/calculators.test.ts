import { describe, it, expect } from '@jest/globals';
import {
  calculateDoorWeight,
  calculateVoltageRequirements,
  calculateLandedCost,
  calculateBatchLandedCost,
  type LandedCostLineItem,
} from '../../shared/calculators';

describe('Door Weight Calculator', () => {
  it('should calculate hollow metal door weight correctly', () => {
    const result = calculateDoorWeight({
      doorWidth: '36',
      doorHeight: '84',
      doorThickness: '1.75',
      doorMaterial: 'hollow-metal',
      doorType: 'standard',
      doorLeadLined: 'no',
      impactDoor: 'no',
      doorCoreType: null,
    });
    
    expect(result).not.toBeNull();
    expect(result?.weight).toBeGreaterThan(0);
    expect(result?.weight).toBeLessThan(300); // Reasonable upper bound
    expect(result?.calculation).toBeTruthy();
    expect(Array.isArray(result?.notes)).toBe(true);
  });

  it('should calculate wood door weight correctly', () => {
    const result = calculateDoorWeight({
      doorWidth: '36',
      doorHeight: '80',
      doorThickness: '1.75',
      doorMaterial: 'wood',
      doorType: 'standard',
      doorLeadLined: 'no',
      impactDoor: 'no',
      doorCoreType: null,
    });
    
    expect(result).not.toBeNull();
    expect(result?.weight).toBeGreaterThan(0);
    expect(result?.weight).toBeLessThan(150); // Wood is lighter
  });

  it('should handle missing dimensions gracefully', () => {
    const result = calculateDoorWeight({
      doorWidth: null,
      doorHeight: null,
      doorThickness: null,
      doorMaterial: 'hollow-metal',
      doorType: null,
      doorLeadLined: null,
      impactDoor: null,
      doorCoreType: null,
    });
    
    expect(result).toBeNull();
  });

  it('should add weight for fire-rated doors', () => {
    const standardDoor = calculateDoorWeight({
      doorWidth: '36',
      doorHeight: '84',
      doorThickness: '1.75',
      doorMaterial: 'hollow-metal',
      doorType: 'standard',
      doorLeadLined: 'no',
      impactDoor: 'no',
      doorCoreType: null,
    });
    
    const fireDoor = calculateDoorWeight({
      doorWidth: '36',
      doorHeight: '84',
      doorThickness: '1.75',
      doorMaterial: 'hollow-metal',
      doorType: 'fire-rated',
      doorLeadLined: 'no',
      impactDoor: 'no',
      doorCoreType: null,
    });
    
    expect(fireDoor).not.toBeNull();
    expect(standardDoor).not.toBeNull();
    expect(fireDoor!.weight).toBeGreaterThan(standardDoor!.weight);
  });
});

describe('Voltage Requirements Calculator', () => {
  it('should calculate voltage for access control system', () => {
    const result = calculateVoltageRequirements({
      automationType: 'none',
      accessControlType: 'card-reader',
      exitDevice: 'panic-bar',
      lockType: 'electric-strike',
      hardwareItems: [],
    });
    
    expect(result).not.toBeNull();
    expect(result?.recommendedVoltage).toBeTruthy();
    expect(result?.totalCurrent).toBeGreaterThan(0);
    expect(result?.wireGauge).toBeTruthy();
    expect(result?.powerSupplySize).toBeTruthy();
  });

  it('should return null for non-electrified door', () => {
    const result = calculateVoltageRequirements({
      automationType: 'none',
      accessControlType: 'none',
      exitDevice: 'standard',
      lockType: 'mechanical',
      hardwareItems: [],
    });
    
    expect(result).toBeNull();
  });

  it('should calculate higher current for auto operator', () => {
    const withAutoOperator = calculateVoltageRequirements({
      automationType: 'auto-operator',
      accessControlType: 'card-reader',
      exitDevice: 'standard',
      lockType: 'standard',
      hardwareItems: [],
    });
    
    const withoutAutoOperator = calculateVoltageRequirements({
      automationType: 'none',
      accessControlType: 'card-reader',
      exitDevice: 'standard',
      lockType: 'standard',
      hardwareItems: [],
    });
    
    expect(withAutoOperator).not.toBeNull();
    expect(withoutAutoOperator).not.toBeNull();
    expect(withAutoOperator!.totalCurrent).toBeGreaterThan(withoutAutoOperator!.totalCurrent);
  });
});

describe('Landed Cost Calculator', () => {
  const baseItem: LandedCostLineItem = {
    quantity: 10,
    unitCost: 100,
    tariffRatePercent: 5,
    antiDumpingPercent: 2,
    otherDutiesPercent: 1,
    baseFreightCost: 50,
    fuelSurchargePercent: 20,
    accessorialsCost: 10,
    insuranceCost: 15,
    customsBrokerageCost: 25,
  };

  it('should calculate landed cost with all factors', () => {
    const result = calculateLandedCost(baseItem);
    
    expect(result.netUnitCost).toBe(100);
    expect(result.customsValue).toBe(1000); // 100 * 10
    expect(result.tariffCost).toBeGreaterThan(0);
    expect(result.antiDumpingCost).toBeGreaterThan(0);
    expect(result.otherDutiesCost).toBeGreaterThan(0);
    expect(result.freightCostTotal).toBeGreaterThan(0);
    expect(result.landedUnitCost).toBeGreaterThan(result.netUnitCost);
    expect(result.landedLineTotal).toBe(result.landedUnitCost * 10);
  });

  it('should apply volume discount correctly', () => {
    const itemWithDiscount: LandedCostLineItem = {
      ...baseItem,
      discountPercent: 10,
    };
    
    const result = calculateLandedCost(itemWithDiscount);
    
    expect(result.netUnitCost).toBe(90); // 100 - 10%
    expect(result.customsValue).toBe(900); // 90 * 10
  });

  it('should calculate duties based on customs value', () => {
    const result = calculateLandedCost(baseItem);
    
    const expectedTariff = 1000 * 0.05; // 5% of $1000
    const expectedAntiDumping = 1000 * 0.02; // 2% of $1000
    const expectedOtherDuties = 1000 * 0.01; // 1% of $1000
    
    expect(result.tariffCost).toBeCloseTo(expectedTariff, 2);
    expect(result.antiDumpingCost).toBeCloseTo(expectedAntiDumping, 2);
    expect(result.otherDutiesCost).toBeCloseTo(expectedOtherDuties, 2);
  });

  it('should allocate freight costs correctly', () => {
    const result = calculateLandedCost(baseItem);
    
    expect(result.perUnitFreight).toBeGreaterThan(0);
    expect(result.perUnitFreight).toBe(result.freightCostTotal / 10);
  });
});

describe('Batch Landed Cost Calculator', () => {
  it('should calculate batch landed cost correctly', () => {
    const items: LandedCostLineItem[] = [
      {
        quantity: 10,
        unitCost: 100,
        tariffRatePercent: 5,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 30,
        fuelSurchargePercent: 10,
        accessorialsCost: 0,
        insuranceCost: 10,
        customsBrokerageCost: 15,
      },
      {
        quantity: 5,
        unitCost: 200,
        tariffRatePercent: 3,
        antiDumpingPercent: 1,
        otherDutiesPercent: 0,
        baseFreightCost: 20,
        fuelSurchargePercent: 10,
        accessorialsCost: 0,
        insuranceCost: 5,
        customsBrokerageCost: 10,
      },
    ];
    
    const result = calculateBatchLandedCost(items);
    
    expect(result.itemCount).toBe(2);
    expect(result.successCount).toBe(2);
    expect(result.errorCount).toBe(0);
    expect(result.totalLandedCost).toBeGreaterThan(0);
    expect(result.totalTariffs).toBeGreaterThan(0);
    expect(result.totalFreight).toBeGreaterThan(0);
    expect(result.lineItems.length).toBe(2);
  });

  it('should handle empty batch', () => {
    const result = calculateBatchLandedCost([]);
    
    expect(result.itemCount).toBe(0);
    expect(result.totalTariffs).toBe(0);
    expect(result.totalFreight).toBe(0);
    expect(result.totalLandedCost).toBe(0);
    expect(result.lineItems.length).toBe(0);
  });

  it('should sum all line items correctly', () => {
    const items: LandedCostLineItem[] = [
      {
        quantity: 20,
        unitCost: 50,
        tariffRatePercent: 10,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 25,
        fuelSurchargePercent: 10,
        accessorialsCost: 0,
        insuranceCost: 10,
        customsBrokerageCost: 10,
      },
      {
        quantity: 10,
        unitCost: 75,
        tariffRatePercent: 5,
        antiDumpingPercent: 2,
        otherDutiesPercent: 1,
        baseFreightCost: 15,
        fuelSurchargePercent: 10,
        accessorialsCost: 0,
        insuranceCost: 5,
        customsBrokerageCost: 5,
      },
      {
        quantity: 5,
        unitCost: 100,
        tariffRatePercent: 8,
        antiDumpingPercent: 0,
        otherDutiesPercent: 0,
        baseFreightCost: 10,
        fuelSurchargePercent: 0,
        accessorialsCost: 0,
        insuranceCost: 0,
        customsBrokerageCost: 5,
      },
    ];
    
    const result = calculateBatchLandedCost(items);
    
    expect(result.itemCount).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.totalLandedCost).toBeGreaterThan(0);
    expect(result.totalTariffs).toBeGreaterThan(0);
    
    // Verify each line item was processed
    result.lineItems.forEach((item) => {
      expect(item.landedUnitCost).toBeGreaterThan(0);
    });
  });
});
