import { applyDiscount } from "./discountUtils";

/**
 * Manufacturer Discount Helper
 * Applies manufacturer discount multiplier to a price
 */
export function applyManufacturerDiscount(
  price: number,
  manufacturerDiscountMultiplier?: string | null
): number {
  if (!manufacturerDiscountMultiplier || !price) {
    return price;
  }
  
  return applyDiscount(price, manufacturerDiscountMultiplier);
}

/**
 * Procurement Cost Calculator
 * Calculates the final cost of a hardware item based on the procurement source
 * 
 * @param basePrice - The manufacturer's list price (MSRP)
 * @param sourceType - The procurement source type ('manufacturer' | 'distributor')
 * @param manufacturerDiscountMultiplier - Manufacturer's discount (e.g., "0.5", "50", "50/10/5")
 * @param distributorPricing - Distributor pricing configuration
 * @returns The final procurement cost after all discounts, markups, and fees
 * 
 * @remarks
 * - Distributor pricing calculation order (industry standard):
 *   1. Apply discount multiplier to base price
 *   2. Apply markup percentage
 *   3. Apply percentage shipping (on merchandise subtotal, before flat fees)
 *   4. Add flat fee
 *   5. Add flat shipping (if not using percentage)
 *   6. Add handling fee
 * - MinimumOrderAmount enforcement should be handled at the order-assembly layer,
 *   not within this per-item calculator
 * 
 * @example
 * // Distributor with mixed flat + percent shipping
 * calculateProcurementCost(
 *   100,
 *   'distributor',
 *   null,
 *   {
 *     discountMultiplier: '0.5',      // 50% off → $50
 *     markupPercent: 20,               // 20% markup → $60
 *     shippingFeeType: 'percentage',
 *     shippingFeeAmount: 10,           // 10% on $60 → $66
 *     flatFee: 5,                      // → $71
 *     handlingFee: 2                   // → $73 final
 *   }
 * ); // Returns 73
 */
export interface DistributorPricing {
  discountMultiplier?: string | null;
  markupPercent?: number | null;
  flatFee?: number | null;
  shippingFeeType?: 'flat' | 'percentage' | null;
  shippingFeeAmount?: number | null;
  handlingFee?: number | null;
}

export function calculateProcurementCost(
  basePrice: number,
  sourceType: 'manufacturer' | 'distributor',
  manufacturerDiscountMultiplier?: string | null,
  distributorPricing?: DistributorPricing | null
): number {
  if (!basePrice || basePrice <= 0) {
    return 0;
  }

  // Direct manufacturer sourcing - simple discount application
  if (sourceType === 'manufacturer') {
    return applyManufacturerDiscount(basePrice, manufacturerDiscountMultiplier);
  }

  // Distributor sourcing - apply discount, markup, and fees
  let cost = basePrice;

  // Step 1: Apply distributor's discount multiplier to base price
  if (distributorPricing?.discountMultiplier) {
    cost = applyDiscount(cost, distributorPricing.discountMultiplier);
  }

  // Step 2: Apply markup percentage
  if (distributorPricing?.markupPercent && distributorPricing.markupPercent > 0) {
    cost = cost * (1 + distributorPricing.markupPercent / 100);
  }

  // Step 3: Apply percentage-based shipping to merchandise subtotal (before flat fees)
  // Industry practice: percentage shipping is calculated on the discounted/marked-up
  // merchandise price, NOT on fixed fees like flat/handling
  if (distributorPricing?.shippingFeeType === 'percentage' && 
      distributorPricing?.shippingFeeAmount && 
      distributorPricing.shippingFeeAmount > 0) {
    cost = cost * (1 + distributorPricing.shippingFeeAmount / 100);
  }

  // Step 4: Add flat fee
  if (distributorPricing?.flatFee && distributorPricing.flatFee > 0) {
    cost += distributorPricing.flatFee;
  }

  // Step 5: Add flat shipping fee (only if not using percentage)
  if (distributorPricing?.shippingFeeType === 'flat' && 
      distributorPricing?.shippingFeeAmount && 
      distributorPricing.shippingFeeAmount > 0) {
    cost += distributorPricing.shippingFeeAmount;
  }

  // Step 6: Add handling fee
  if (distributorPricing?.handlingFee && distributorPricing.handlingFee > 0) {
    cost += distributorPricing.handlingFee;
  }

  return cost;
}

/**
 * Door Weight Calculator
 * Calculates door weight based on material, dimensions, and construction
 */

interface DoorWeightParams {
  doorWidth?: string | null;
  doorHeight?: string | null;
  doorThickness?: string | null;
  doorMaterial?: string | null;
  doorType?: string | null;
  doorLeadLined?: string | null;
  impactDoor?: string | null;
  doorCoreType?: string | null;
}

export interface DoorWeightResult {
  weight: number; // in pounds
  calculation: string;
  notes: string[];
}

// Effective densities for complete door assemblies (pounds per cubic inch)
// These account for the actual construction (hollow cores, air space, etc.)
const MATERIAL_DENSITIES = {
  'hollow-metal': 0.019, // Hollow metal with foam core (~100 lbs for 3'x7'x1.75")
  'steel': 0.019, // Same as hollow-metal
  'metal': 0.019, // Generic metal (same as hollow-metal)
  'aluminum': 0.012, // Aluminum doors are lighter
  'wood-solid': 0.016, // Solid wood doors
  'wood-veneer': 0.008, // Hollow core with veneer
  'wood': 0.012, // Average wood door (semi-hollow)
  'fiberglass': 0.011, // Fiberglass doors
  'glass': 0.091, // Solid glass
  'composite': 0.010, // Composite materials
};

export function calculateDoorWeight(params: DoorWeightParams): DoorWeightResult | null {
  const { doorWidth, doorHeight, doorThickness, doorMaterial, doorType, doorLeadLined, impactDoor, doorCoreType } = params;
  
  if (!doorWidth || !doorHeight || !doorMaterial) {
    return null;
  }

  const notes: string[] = [];
  
  // Parse dimensions
  const width = parseFloat(doorWidth);
  const height = parseFloat(doorHeight);
  const thickness = doorThickness ? parseFloat(doorThickness) : 1.75; // default to standard 1.75"
  
  if (isNaN(width) || isNaN(height) || isNaN(thickness)) {
    return null;
  }

  // Get material density
  const materialKey = doorMaterial.toLowerCase();
  let density = MATERIAL_DENSITIES[materialKey as keyof typeof MATERIAL_DENSITIES];
  
  if (!density) {
    // Default to hollow metal if material not found
    density = MATERIAL_DENSITIES['hollow-metal'];
    notes.push(`Using default hollow metal density for unknown material: ${doorMaterial}`);
  }

  // Calculate volume (cubic inches)
  const volume = width * height * thickness;
  
  // Base weight calculation using effective density
  let weight = volume * density;

  // Track if we've already applied mineral core weight
  let mineralCoreApplied = false;

  // Adjust for door type (fire-rated implies mineral core)
  if (doorType?.toLowerCase().includes('fire')) {
    weight *= 1.3; // Fire doors are heavier due to mineral core and thicker steel
    notes.push('Fire-rated doors are approximately 30% heavier due to mineral core');
    mineralCoreApplied = true;
  }

  // Adjust for core type (avoid double-counting if already fire-rated)
  if (doorCoreType && !mineralCoreApplied) {
    const coreType = doorCoreType.toLowerCase();
    if (coreType.includes('mineral')) {
      weight *= 1.3; // Mineral core is heavier
      notes.push('Mineral core adds approximately 30% additional weight');
      mineralCoreApplied = true;
    } else if (coreType.includes('steel-stiffened')) {
      weight *= 1.15; // Steel stiffeners add weight
      notes.push('Steel-stiffened core adds approximately 15% additional weight');
    }
  } else if (doorCoreType?.toLowerCase().includes('steel-stiffened')) {
    // Steel-stiffened can still be applied even if mineral core was applied
    weight *= 1.15;
    notes.push('Steel-stiffened core adds approximately 15% additional weight');
  }

  // Adjust for glass/vision lites (add weight)
  if (doorType?.toLowerCase().includes('glass') && !doorMaterial.toLowerCase().includes('glass')) {
    weight *= 1.15; // Vision lite adds some weight
    notes.push('Vision lite adds approximately 15% additional weight');
  }
  
  // Full glass doors already use glass density, so no additional multiplier needed
  if (doorMaterial.toLowerCase().includes('glass')) {
    notes.push('Full glass door - weight based on glass density');
  }

  // Lead lined doors are significantly heavier
  if (doorLeadLined === 'yes') {
    weight *= 2.5; // Lead lining adds substantial weight (150% increase)
    notes.push('Lead lining adds approximately 150% additional weight');
  }

  // Impact doors have reinforced construction
  if (impactDoor === 'yes') {
    weight *= 1.4; // Impact rated doors are reinforced
    notes.push('Impact-resistant construction adds approximately 40% additional weight');
  }

  // Round to nearest pound
  weight = Math.round(weight);

  const calculation = `${width}" × ${height}" × ${thickness}" × ${density.toFixed(3)} lbs/in³`;

  return {
    weight,
    calculation,
    notes,
  };
}

/**
 * Voltage Calculator
 * Calculates voltage requirements and wire sizing for electrified hardware
 */

interface VoltageParams {
  automationType?: string | null;
  accessControlType?: string | null;
  exitDevice?: string | null;
  lockType?: string | null;
  hardwareItems?: Array<{ itemType?: string | null; manufacturer?: string | null; model?: string | null }>;
}

export interface VoltageResult {
  recommendedVoltage: string;
  totalCurrent: number; // in amps
  wireGauge: string;
  powerSupplySize: string;
  calculation: string;
  notes: string[];
}

// Typical current draws for common devices (in amps)
const DEVICE_CURRENTS = {
  'mag-lock': 0.5,
  'electric-strike': 0.3,
  'auto-operator': 2.0,
  'card-reader': 0.15,
  'request-to-exit': 0.05,
  'door-position-switch': 0.01,
  'closer-hold-open': 0.1,
  'powered-hinge': 0.2,
  'access-panel': 0.25,
};

export function calculateVoltageRequirements(params: VoltageParams): VoltageResult | null {
  const { automationType, accessControlType, exitDevice, lockType, hardwareItems } = params;
  
  const notes: string[] = [];
  let totalCurrent = 0;
  let hasAC = false;
  let hasDC = false;

  // Check automation type
  if (automationType && automationType !== 'none') {
    totalCurrent += DEVICE_CURRENTS['auto-operator'];
    hasAC = true; // Auto operators typically use AC
    notes.push(`Automatic operator: ~${DEVICE_CURRENTS['auto-operator']}A`);
  }

  // Check access control
  if (accessControlType && accessControlType !== 'none') {
    totalCurrent += DEVICE_CURRENTS['card-reader'];
    totalCurrent += DEVICE_CURRENTS['request-to-exit'];
    hasDC = true; // Access control typically DC
    notes.push(`Card reader + REX: ~${(DEVICE_CURRENTS['card-reader'] + DEVICE_CURRENTS['request-to-exit']).toFixed(2)}A`);
  }

  // Check exit device
  if (exitDevice?.toLowerCase().includes('electric') || exitDevice?.toLowerCase().includes('panic')) {
    totalCurrent += DEVICE_CURRENTS['electric-strike'];
    hasDC = true;
    notes.push(`Exit device hardware: ~${DEVICE_CURRENTS['electric-strike']}A`);
  }

  // Check lock type
  if (lockType?.toLowerCase().includes('electric') || lockType?.toLowerCase().includes('mag')) {
    if (lockType.toLowerCase().includes('mag')) {
      totalCurrent += DEVICE_CURRENTS['mag-lock'];
      hasDC = true;
      notes.push(`Magnetic lock: ~${DEVICE_CURRENTS['mag-lock']}A`);
    } else {
      totalCurrent += DEVICE_CURRENTS['electric-strike'];
      hasDC = true;
      notes.push(`Electric strike: ~${DEVICE_CURRENTS['electric-strike']}A`);
    }
  }

  // Check hardware items
  if (hardwareItems && hardwareItems.length > 0) {
    hardwareItems.forEach(item => {
      const itemType = item.itemType?.toLowerCase() || '';
      if (itemType.includes('mag') && itemType.includes('lock')) {
        totalCurrent += DEVICE_CURRENTS['mag-lock'];
        hasDC = true;
      } else if (itemType.includes('strike')) {
        totalCurrent += DEVICE_CURRENTS['electric-strike'];
        hasDC = true;
      } else if (itemType.includes('reader')) {
        totalCurrent += DEVICE_CURRENTS['card-reader'];
        hasDC = true;
      } else if (itemType.includes('rex') || itemType.includes('exit sensor')) {
        totalCurrent += DEVICE_CURRENTS['request-to-exit'];
        hasDC = true;
      } else if (itemType.includes('position') || itemType.includes('dps')) {
        totalCurrent += DEVICE_CURRENTS['door-position-switch'];
        hasDC = true;
      }
    });
  }

  if (totalCurrent === 0) {
    return null; // No electrified hardware
  }

  // Determine recommended voltage
  let recommendedVoltage = '24V DC';
  if (hasAC && !hasDC) {
    recommendedVoltage = '120V AC';
  } else if (hasAC && hasDC) {
    recommendedVoltage = '120V AC + 24V DC (dual power)';
    notes.push('Mixed AC/DC hardware requires dual power supply');
  }

  // Add safety margin (25%)
  const safeTotalCurrent = totalCurrent * 1.25;

  // Determine wire gauge based on current and typical run length
  let wireGauge = '18 AWG';
  if (safeTotalCurrent > 2.0) {
    wireGauge = '14 AWG';
  } else if (safeTotalCurrent > 1.0) {
    wireGauge = '16 AWG';
  }

  // Determine power supply size
  let powerSupplySize = '1A';
  if (safeTotalCurrent > 4.0) {
    powerSupplySize = '6A';
  } else if (safeTotalCurrent > 2.0) {
    powerSupplySize = '4A';
  } else if (safeTotalCurrent > 1.0) {
    powerSupplySize = '2A';
  }

  const calculation = `Total: ${totalCurrent.toFixed(2)}A × 1.25 safety = ${safeTotalCurrent.toFixed(2)}A`;

  return {
    recommendedVoltage,
    totalCurrent: parseFloat(totalCurrent.toFixed(2)),
    wireGauge,
    powerSupplySize,
    calculation,
    notes,
  };
}

/**
 * Enhanced Cost Calculation Utilities
 */

// Material waste factors (industry standard percentages)
export const WASTE_FACTORS = {
  doors: 0.05, // 5% waste for doors (damaged/defective)
  frames: 0.03, // 3% waste for frames
  hardware: 0.02, // 2% waste for hardware (damaged/lost)
  gasketing: 0.10, // 10% waste for gasketing (cutting/fitting)
  fasteners: 0.15, // 15% waste for fasteners (dropped/lost)
  consumables: 0.20, // 20% waste for consumables (adhesives, etc.)
};

// Installation time estimates (hours per unit)
export const INSTALLATION_TIMES = {
  door: {
    standard: 2.0, // Standard hollow metal/wood door
    fire: 2.5, // Fire-rated door (more precise installation)
    glass: 3.0, // Glass doors (careful handling)
    automatic: 4.0, // Automatic doors (motor, sensors, programming)
    heavy: 3.5, // Heavy/oversized doors (>250 lbs or >4'×8')
  },
  frame: {
    standard: 1.5, // Standard frame installation
    fire: 2.0, // Fire-rated frame (grouting, anchoring)
    borrowed: 1.0, // Borrowed light frame
    sidelight: 1.5, // Sidelight frame
  },
  hardware: {
    standard: 0.5, // Standard lockset/latch
    electrified: 1.5, // Electrified hardware (wiring, programming)
    accessControl: 2.0, // Access control system (card reader, integration)
    closer: 0.75, // Door closer
    exitDevice: 1.0, // Panic/exit device
    hinge: 0.25, // Per hinge (typically 3 hinges = 0.75 hrs)
  },
  automation: {
    lowEnergy: 6.0, // Low-energy operator
    fullPower: 8.0, // Full-power automatic operator
    sliding: 10.0, // Automatic sliding door system
  },
  gasketing: 0.5, // Perimeter gasketing installation
};

interface HardwareCostParams {
  hardwareItems?: Array<{
    quantity?: number | null;
    unitCost?: number | null;
    listPrice?: number | null;
  }>;
  wasteFactor?: number; // Optional override, defaults to WASTE_FACTORS.hardware
}

export interface HardwareCostResult {
  subtotal: number;
  waste: number;
  total: number;
  calculation: string;
  itemCount: number;
}

export function calculateHardwareCost(params: HardwareCostParams): HardwareCostResult {
  const { hardwareItems = [], wasteFactor = WASTE_FACTORS.hardware } = params;
  
  let subtotal = 0;
  let itemCount = 0;
  
  hardwareItems.forEach(item => {
    const quantity = item.quantity || 1;
    const cost = item.unitCost || item.listPrice || 0;
    subtotal += quantity * cost;
    itemCount++;
  });
  
  const waste = subtotal * wasteFactor;
  const total = subtotal + waste;
  
  const calculation = `${itemCount} items × avg cost + ${(wasteFactor * 100).toFixed(0)}% waste = $${total.toFixed(2)}`;
  
  return {
    subtotal,
    waste,
    total,
    calculation,
    itemCount,
  };
}

interface InstallationTimeParams {
  doorType?: string | null;
  doorWeight?: number | null;
  automationType?: string | null;
  accessControlType?: string | null;
  fireRating?: string | null;
  hardwareItems?: Array<{ itemType?: string | null }>;
  hingeCount?: number | null;
  hasGasketing?: boolean;
}

export interface InstallationTimeResult {
  doorInstallHours: number;
  frameInstallHours: number;
  hardwareInstallHours: number;
  automationInstallHours: number;
  totalHours: number;
  calculation: string;
  breakdown: string[];
}

export function calculateInstallationTime(params: InstallationTimeParams): InstallationTimeResult {
  const breakdown: string[] = [];
  
  // Door installation time
  let doorHours = INSTALLATION_TIMES.door.standard;
  
  const doorType = params.doorType?.toLowerCase() || '';
  const isFireRated = params.fireRating && params.fireRating !== 'none' && params.fireRating !== '0';
  const isHeavy = (params.doorWeight || 0) > 250;
  
  if (doorType.includes('glass') || doorType.includes('aluminum')) {
    doorHours = INSTALLATION_TIMES.door.glass;
    breakdown.push('Glass door: 3.0 hrs');
  } else if (isHeavy) {
    doorHours = INSTALLATION_TIMES.door.heavy;
    breakdown.push('Heavy door (>250 lbs): 3.5 hrs');
  } else if (isFireRated) {
    doorHours = INSTALLATION_TIMES.door.fire;
    breakdown.push('Fire-rated door: 2.5 hrs');
  } else {
    breakdown.push('Standard door: 2.0 hrs');
  }
  
  // Frame installation time
  let frameHours = isFireRated ? INSTALLATION_TIMES.frame.fire : INSTALLATION_TIMES.frame.standard;
  if (isFireRated) {
    breakdown.push('Fire-rated frame: 2.0 hrs');
  } else {
    breakdown.push('Standard frame: 1.5 hrs');
  }
  
  // Hardware installation time
  let hardwareHours = 0;
  
  // Base hardware (lockset)
  hardwareHours += INSTALLATION_TIMES.hardware.standard;
  breakdown.push('Base hardware: 0.5 hrs');
  
  // Hinges
  const hingeCount = params.hingeCount || 3;
  const hingeHours = INSTALLATION_TIMES.hardware.hinge * hingeCount;
  hardwareHours += hingeHours;
  breakdown.push(`Hinges (${hingeCount}): ${hingeHours.toFixed(2)} hrs`);
  
  // Check for specialized hardware
  if (params.hardwareItems) {
    params.hardwareItems.forEach(item => {
      const itemType = item.itemType?.toLowerCase() || '';
      if (itemType.includes('exit') || itemType.includes('panic')) {
        hardwareHours += INSTALLATION_TIMES.hardware.exitDevice;
        breakdown.push('Exit device: 1.0 hrs');
      }
      if (itemType.includes('closer')) {
        hardwareHours += INSTALLATION_TIMES.hardware.closer;
        breakdown.push('Door closer: 0.75 hrs');
      }
      if (itemType.includes('electric') || itemType.includes('mag')) {
        hardwareHours += INSTALLATION_TIMES.hardware.electrified;
        breakdown.push('Electrified hardware: 1.5 hrs');
      }
    });
  }
  
  // Access control
  if (params.accessControlType && params.accessControlType !== 'none') {
    hardwareHours += INSTALLATION_TIMES.hardware.accessControl;
    breakdown.push('Access control: 2.0 hrs');
  }
  
  // Gasketing
  if (params.hasGasketing) {
    hardwareHours += INSTALLATION_TIMES.gasketing;
    breakdown.push('Gasketing: 0.5 hrs');
  }
  
  // Automation
  let automationHours = 0;
  if (params.automationType && params.automationType !== 'none') {
    const autoType = params.automationType.toLowerCase();
    if (autoType.includes('sliding')) {
      automationHours = INSTALLATION_TIMES.automation.sliding;
      breakdown.push('Sliding door operator: 10.0 hrs');
    } else if (autoType.includes('low-energy')) {
      automationHours = INSTALLATION_TIMES.automation.lowEnergy;
      breakdown.push('Low-energy operator: 6.0 hrs');
    } else {
      automationHours = INSTALLATION_TIMES.automation.fullPower;
      breakdown.push('Full-power operator: 8.0 hrs');
    }
  }
  
  const totalHours = doorHours + frameHours + hardwareHours + automationHours;
  const calculation = `Door (${doorHours}) + Frame (${frameHours}) + Hardware (${hardwareHours.toFixed(2)}) + Automation (${automationHours}) = ${totalHours.toFixed(2)} hrs`;
  
  return {
    doorInstallHours: doorHours,
    frameInstallHours: frameHours,
    hardwareInstallHours: hardwareHours,
    automationInstallHours: automationHours,
    totalHours,
    calculation,
    breakdown,
  };
}

interface FreightCostParams {
  totalWeight?: number | null; // Total project weight in pounds
  distance?: number | null; // Shipping distance in miles
  isExpedited?: boolean;
  requiresLiftGate?: boolean;
}

export interface FreightCostResult {
  baseCost: number;
  fuelSurcharge: number;
  expeditedFee: number;
  liftGateFee: number;
  total: number;
  calculation: string;
  notes: string[];
}

export function calculateFreightCost(params: FreightCostParams): FreightCostResult | null {
  const { totalWeight, distance, isExpedited = false, requiresLiftGate = false } = params;
  
  if (!totalWeight || !distance) {
    return null;
  }
  
  const notes: string[] = [];
  
  // Base freight cost calculation
  // Industry standard: ~$0.15-$0.25 per pound per 100 miles
  const costPerPoundPer100Miles = 0.20;
  const baseCost = (totalWeight * (distance / 100) * costPerPoundPer100Miles);
  
  // Fuel surcharge (typically 15-25% of base cost)
  const fuelSurchargeRate = 0.20;
  const fuelSurcharge = baseCost * fuelSurchargeRate;
  notes.push(`Fuel surcharge: ${(fuelSurchargeRate * 100).toFixed(0)}% of base cost`);
  
  // Expedited shipping fee
  let expeditedFee = 0;
  if (isExpedited) {
    expeditedFee = baseCost * 0.50; // 50% premium for expedited
    notes.push('Expedited shipping: +50% premium');
  }
  
  // Lift gate fee (if no loading dock)
  let liftGateFee = 0;
  if (requiresLiftGate) {
    liftGateFee = 75; // Flat fee for liftgate service
    notes.push('Liftgate service: $75 flat fee');
  }
  
  // Minimum freight charge
  const minimumFreight = 150;
  const calculatedTotal = baseCost + fuelSurcharge + expeditedFee + liftGateFee;
  const total = Math.max(calculatedTotal, minimumFreight);
  
  if (calculatedTotal < minimumFreight) {
    notes.push(`Minimum freight charge applied: $${minimumFreight}`);
  }
  
  const calculation = `${totalWeight} lbs × ${distance} mi × $${costPerPoundPer100Miles}/lb/100mi = $${baseCost.toFixed(2)} base`;
  
  return {
    baseCost,
    fuelSurcharge,
    expeditedFee,
    liftGateFee,
    total,
    calculation,
    notes,
  };
}

interface TaxCalculationParams {
  subtotal: number;
  taxRate?: number | null; // As percentage (e.g., 7.5 for 7.5%)
  taxableLabor?: boolean; // Whether labor is taxable in the jurisdiction
  laborCost?: number | null;
}

export interface TaxCalculationResult {
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  calculation: string;
}

export function calculateTax(params: TaxCalculationParams): TaxCalculationResult | null {
  const { subtotal, taxRate, taxableLabor = false, laborCost = 0 } = params;
  
  if (!taxRate || taxRate === 0) {
    return null;
  }
  
  // Determine taxable amount
  let taxableAmount = subtotal;
  
  // If labor is not taxable, subtract it from the taxable amount
  if (!taxableLabor && laborCost) {
    taxableAmount = subtotal - laborCost;
  }
  
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = subtotal + taxAmount;
  
  const calculation = `$${taxableAmount.toFixed(2)} × ${taxRate}% = $${taxAmount.toFixed(2)}`;
  
  return {
    taxableAmount,
    taxRate,
    taxAmount,
    total,
    calculation,
  };
}

/**
 * Glass Size Calculators
 * Calculate glass sizes for vision lites, sidelights, and transoms
 */

export interface GlassSizeParams {
  // Vision Lite in Door
  visionLiteWidth?: string | null;
  visionLiteHeight?: string | null;
  visionLiteCutoutWidth?: string | null;
  visionLiteCutoutHeight?: string | null;
  visionLiteThickness?: string | null;
  
  // Sidelight dimensions
  sideliteLeftWidth?: string | null;
  sideliteRightWidth?: string | null;
  doorHeight?: string | null; // Used for sidelight height calculation
  
  // Transom dimensions
  transomWidth?: string | null;
  transomHeight?: string | null;
  doorWidth?: string | null; // Used for transom width calculation
  
  // Frame dimensions for calculations
  frameWidth?: string | null;
  frameHeight?: string | null;
}

export interface GlassSizeResult {
  visionLite?: {
    glassWidth: number;
    glassHeight: number;
    cutoutWidth: number;
    cutoutHeight: number;
    notes: string[];
  };
  sideliteLeft?: {
    glassWidth: number;
    glassHeight: number;
    notes: string[];
  };
  sideliteRight?: {
    glassWidth: number;
    glassHeight: number;
    notes: string[];
  };
  transom?: {
    glassWidth: number;
    glassHeight: number;
    notes: string[];
  };
  summary: string;
}

/**
 * Standard glass clearances and tolerances (in inches)
 * Industry standard allows 1/16" to 1/8" clearance around glass
 */
const GLASS_CLEARANCES = {
  standard: 0.125, // 1/8" clearance on each side
  tight: 0.0625, // 1/16" clearance for tight fits
  fireRated: 0.0625, // Fire-rated glass needs tighter tolerances
  structural: 0.25, // Structural glazing may need more clearance
};

export function calculateGlassSizes(params: GlassSizeParams): GlassSizeResult {
  const result: GlassSizeResult = { summary: '' };
  const summaryParts: string[] = [];
  
  // Vision Lite Calculation
  if (params.visionLiteWidth && params.visionLiteHeight) {
    const notes: string[] = [];
    const specifiedWidth = parseFloat(params.visionLiteWidth);
    const specifiedHeight = parseFloat(params.visionLiteHeight);
    
    // If cutout dimensions are provided, use those; otherwise use specified dimensions
    const cutoutWidth = params.visionLiteCutoutWidth 
      ? parseFloat(params.visionLiteCutoutWidth)
      : specifiedWidth;
    const cutoutHeight = params.visionLiteCutoutHeight
      ? parseFloat(params.visionLiteCutoutHeight)
      : specifiedHeight;
    
    // Calculate actual glass size (cutout minus clearance on all sides)
    const clearance = GLASS_CLEARANCES.standard;
    const glassWidth = cutoutWidth - (clearance * 2);
    const glassHeight = cutoutHeight - (clearance * 2);
    
    notes.push(`Cutout: ${cutoutWidth}" × ${cutoutHeight}"`);
    notes.push(`Glass clearance: ${clearance}" on each side`);
    notes.push(`Final glass: ${glassWidth.toFixed(3)}" × ${glassHeight.toFixed(3)}"`);
    
    result.visionLite = {
      glassWidth: parseFloat(glassWidth.toFixed(3)),
      glassHeight: parseFloat(glassHeight.toFixed(3)),
      cutoutWidth,
      cutoutHeight,
      notes,
    };
    
    summaryParts.push(`Vision Lite: ${glassWidth.toFixed(2)}" × ${glassHeight.toFixed(2)}"`);
  }
  
  // Left Sidelight Calculation
  if (params.sideliteLeftWidth && params.doorHeight) {
    const notes: string[] = [];
    const sideliteWidth = parseFloat(params.sideliteLeftWidth);
    const frameHeight = params.frameHeight 
      ? parseFloat(params.frameHeight)
      : parseFloat(params.doorHeight);
    
    // Sidelight glass typically runs nearly full height with clearances
    const clearance = GLASS_CLEARANCES.standard;
    const glassWidth = sideliteWidth - (clearance * 2);
    const glassHeight = frameHeight - (clearance * 2) - 2; // Additional 2" for top/bottom rails
    
    notes.push(`Sidelight width: ${sideliteWidth}"`);
    notes.push(`Frame height: ${frameHeight}"`);
    notes.push(`Glass clearance: ${clearance}" on each side, 1" rails top/bottom`);
    notes.push(`Final glass: ${glassWidth.toFixed(3)}" × ${glassHeight.toFixed(3)}"`);
    
    result.sideliteLeft = {
      glassWidth: parseFloat(glassWidth.toFixed(3)),
      glassHeight: parseFloat(glassHeight.toFixed(3)),
      notes,
    };
    
    summaryParts.push(`Left Sidelight: ${glassWidth.toFixed(2)}" × ${glassHeight.toFixed(2)}"`);
  }
  
  // Right Sidelight Calculation
  if (params.sideliteRightWidth && params.doorHeight) {
    const notes: string[] = [];
    const sideliteWidth = parseFloat(params.sideliteRightWidth);
    const frameHeight = params.frameHeight 
      ? parseFloat(params.frameHeight)
      : parseFloat(params.doorHeight);
    
    const clearance = GLASS_CLEARANCES.standard;
    const glassWidth = sideliteWidth - (clearance * 2);
    const glassHeight = frameHeight - (clearance * 2) - 2;
    
    notes.push(`Sidelight width: ${sideliteWidth}"`);
    notes.push(`Frame height: ${frameHeight}"`);
    notes.push(`Glass clearance: ${clearance}" on each side, 1" rails top/bottom`);
    notes.push(`Final glass: ${glassWidth.toFixed(3)}" × ${glassHeight.toFixed(3)}"`);
    
    result.sideliteRight = {
      glassWidth: parseFloat(glassWidth.toFixed(3)),
      glassHeight: parseFloat(glassHeight.toFixed(3)),
      notes,
    };
    
    summaryParts.push(`Right Sidelight: ${glassWidth.toFixed(2)}" × ${glassHeight.toFixed(2)}"`);
  }
  
  // Transom Calculation
  if (params.transomWidth && params.transomHeight) {
    const notes: string[] = [];
    const transomWidth = parseFloat(params.transomWidth);
    const transomHeight = parseFloat(params.transomHeight);
    
    // Transom glass calculation
    const clearance = GLASS_CLEARANCES.standard;
    const glassWidth = transomWidth - (clearance * 2);
    const glassHeight = transomHeight - (clearance * 2);
    
    notes.push(`Transom opening: ${transomWidth}" × ${transomHeight}"`);
    notes.push(`Glass clearance: ${clearance}" on each side`);
    notes.push(`Final glass: ${glassWidth.toFixed(3)}" × ${glassHeight.toFixed(3)}"`);
    
    result.transom = {
      glassWidth: parseFloat(glassWidth.toFixed(3)),
      glassHeight: parseFloat(glassHeight.toFixed(3)),
      notes,
    };
    
    summaryParts.push(`Transom: ${glassWidth.toFixed(2)}" × ${glassHeight.toFixed(2)}"`);
  }
  
  result.summary = summaryParts.length > 0
    ? `Glass sizes calculated: ${summaryParts.join('; ')}`
    : 'No glass sizes calculated';
  
  return result;
}

/**
 * Calculate total glass area for an opening (useful for pricing and weight)
 */
export interface GlassAreaResult {
  visionLiteArea: number; // in square inches
  sideliteArea: number; // combined left and right
  transomArea: number;
  totalArea: number;
  totalSqFt: number;
  notes: string[];
}

export function calculateTotalGlassArea(glassSizes: GlassSizeResult): GlassAreaResult {
  const notes: string[] = [];
  let visionLiteArea = 0;
  let sideliteArea = 0;
  let transomArea = 0;
  
  if (glassSizes.visionLite) {
    visionLiteArea = glassSizes.visionLite.glassWidth * glassSizes.visionLite.glassHeight;
    notes.push(`Vision lite: ${visionLiteArea.toFixed(1)} sq in`);
  }
  
  if (glassSizes.sideliteLeft) {
    const leftArea = glassSizes.sideliteLeft.glassWidth * glassSizes.sideliteLeft.glassHeight;
    sideliteArea += leftArea;
  }
  
  if (glassSizes.sideliteRight) {
    const rightArea = glassSizes.sideliteRight.glassWidth * glassSizes.sideliteRight.glassHeight;
    sideliteArea += rightArea;
  }
  
  if (sideliteArea > 0) {
    notes.push(`Sidelights: ${sideliteArea.toFixed(1)} sq in`);
  }
  
  if (glassSizes.transom) {
    transomArea = glassSizes.transom.glassWidth * glassSizes.transom.glassHeight;
    notes.push(`Transom: ${transomArea.toFixed(1)} sq in`);
  }
  
  const totalArea = visionLiteArea + sideliteArea + transomArea;
  const totalSqFt = totalArea / 144; // Convert to square feet
  
  notes.push(`Total: ${totalArea.toFixed(1)} sq in (${totalSqFt.toFixed(2)} sq ft)`);
  
  return {
    visionLiteArea,
    sideliteArea,
    transomArea,
    totalArea,
    totalSqFt,
    notes,
  };
}

/**
 * NFPA 80/101 Tolerance Validator
 * Validates opening measurements against NFPA 80 and NFPA 101 tolerance standards
 */

interface NFPAToleranceParams {
  doorType?: string | null;
  doorWidth?: string | null;
  doorHeight?: string | null;
  frameWidth?: string | null;
  frameDepth?: string | null;
  fireRating?: string | null;
  gasketingRequired?: string | null;
  undercut?: string | null; // Bottom clearance
  // Gap measurements (if available)
  topGap?: string | null;
  sideGap?: string | null;
  meetingStileGap?: string | null; // For pairs
}

export interface NFPAToleranceResult {
  isCompliant: boolean;
  violations: NFPAViolation[];
  warnings: NFPAWarning[];
  passedChecks: string[];
  summary: string;
}

export interface NFPAViolation {
  type: 'clearance' | 'undercut' | 'gap' | 'latch' | 'dimension';
  severity: 'critical' | 'major' | 'minor';
  standard: string; // e.g., "NFPA 80 Table 4.8.4"
  description: string;
  measured?: string;
  required?: string;
  recommendation: string;
}

export interface NFPAWarning {
  type: string;
  message: string;
  standard: string;
}

export function validateNFPATolerance(params: NFPAToleranceParams): NFPAToleranceResult {
  const violations: NFPAViolation[] = [];
  const warnings: NFPAWarning[] = [];
  const passedChecks: string[] = [];
  
  const isFireRated = params.fireRating && params.fireRating !== 'none' && params.fireRating !== '0';
  const hasGasketing = params.gasketingRequired === 'yes';
  const isPair = params.doorType?.toLowerCase().includes('double') || params.doorType?.toLowerCase().includes('pair');
  
  // Parse dimensions
  const doorWidth = params.doorWidth ? parseFloat(params.doorWidth) : null;
  const doorHeight = params.doorHeight ? parseFloat(params.doorHeight) : null;
  const frameWidth = params.frameWidth ? parseFloat(params.frameWidth) : null;
  const undercut = params.undercut ? parseFloat(params.undercut) : null;
  const topGap = params.topGap ? parseFloat(params.topGap) : null;
  const sideGap = params.sideGap ? parseFloat(params.sideGap) : null;
  const meetingStileGap = params.meetingStileGap ? parseFloat(params.meetingStileGap) : null;

  // NFPA 80: Maximum clearances for fire doors
  const maxClearances = {
    top: isFireRated ? (hasGasketing ? 0.25 : 0.125) : 0.25, // 1/8" without gasket, 1/4" with gasket
    sides: isFireRated ? (hasGasketing ? 0.25 : 0.125) : 0.25, // 1/8" without gasket, 1/4" with gasket
    meetingStile: isFireRated ? (hasGasketing ? 0.25 : 0.125) : 0.25, // For pairs
    bottom: isFireRated ? 0.75 : 1.0, // 3/4" for fire doors, 1" for non-fire (NFPA 80 Table 4.8.4)
  };

  // Check door width tolerance
  if (doorWidth && frameWidth) {
    const widthDifference = frameWidth - doorWidth;
    
    // For single doors, each side should have approximately half the difference
    const sideGapEstimate = isPair ? widthDifference : widthDifference / 2;
    
    if (sideGapEstimate > maxClearances.sides && isFireRated) {
      violations.push({
        type: 'clearance',
        severity: 'major',
        standard: 'NFPA 80 Section 4.8.4',
        description: `Side clearance exceeds maximum allowed for fire-rated doors`,
        measured: `${sideGapEstimate.toFixed(3)}"`,
        required: `≤ ${maxClearances.sides}"`,
        recommendation: hasGasketing 
          ? 'Verify gasketing is properly installed and compressed'
          : 'Consider adding intumescent gasketing to allow up to 1/4" clearance',
      });
    } else if (sideGapEstimate <= maxClearances.sides) {
      passedChecks.push(`Side clearance within tolerance (${sideGapEstimate.toFixed(3)}" ≤ ${maxClearances.sides}")`);
    }
    
    // Check if gap is too tight (installation issue)
    if (sideGapEstimate < 0.0625 && isFireRated) {
      warnings.push({
        type: 'clearance',
        message: `Side clearance may be too tight (${sideGapEstimate.toFixed(3)}"), minimum 1/16" recommended for proper operation`,
        standard: 'NFPA 80 Best Practice',
      });
    }
  }

  // Check actual measured gaps if provided
  if (sideGap !== null && isFireRated) {
    if (sideGap > maxClearances.sides) {
      violations.push({
        type: 'gap',
        severity: 'major',
        standard: 'NFPA 80 Section 4.8.4',
        description: `Measured side gap exceeds maximum tolerance`,
        measured: `${sideGap}"`,
        required: `≤ ${maxClearances.sides}"`,
        recommendation: hasGasketing
          ? 'Adjust frame or door dimensions; verify gasketing compression'
          : 'Add intumescent gasketing or adjust door/frame dimensions',
      });
    } else {
      passedChecks.push(`Measured side gap compliant (${sideGap}" ≤ ${maxClearances.sides}")`);
    }
  }

  if (topGap !== null && isFireRated) {
    if (topGap > maxClearances.top) {
      violations.push({
        type: 'gap',
        severity: 'major',
        standard: 'NFPA 80 Section 4.8.4',
        description: `Top gap exceeds maximum tolerance`,
        measured: `${topGap}"`,
        required: `≤ ${maxClearances.top}"`,
        recommendation: hasGasketing
          ? 'Verify head gasketing is properly installed'
          : 'Install intumescent head gasketing or adjust door height',
      });
    } else {
      passedChecks.push(`Top gap compliant (${topGap}" ≤ ${maxClearances.top}")`);
    }
  }

  if (meetingStileGap !== null && isPair && isFireRated) {
    if (meetingStileGap > maxClearances.meetingStile) {
      violations.push({
        type: 'gap',
        severity: 'critical',
        standard: 'NFPA 80 Section 4.8.4',
        description: `Meeting stile gap exceeds maximum tolerance for paired fire doors`,
        measured: `${meetingStileGap}"`,
        required: `≤ ${maxClearances.meetingStile}"`,
        recommendation: hasGasketing
          ? 'Install meeting stile gasketing or astragal; verify proper alignment'
          : 'Install meeting stile gasketing/astragal (required for fire pairs)',
      });
    } else {
      passedChecks.push(`Meeting stile gap compliant (${meetingStileGap}" ≤ ${maxClearances.meetingStile}")`);
    }
  }

  // Check undercut (bottom clearance)
  if (undercut !== null) {
    if (undercut > maxClearances.bottom) {
      violations.push({
        type: 'undercut',
        severity: isFireRated ? 'critical' : 'minor',
        standard: 'NFPA 80 Table 4.8.4',
        description: `Bottom clearance (undercut) exceeds maximum allowed`,
        measured: `${undercut}"`,
        required: `≤ ${maxClearances.bottom}"`,
        recommendation: isFireRated
          ? 'Reduce undercut to 3/4" maximum or install automatic door bottom/drop seal'
          : 'Reduce undercut to 1" maximum for better sound/weather sealing',
      });
    } else {
      passedChecks.push(`Undercut compliant (${undercut}" ≤ ${maxClearances.bottom}")`);
    }
    
    // Warn if undercut is too small
    if (undercut < 0.125) {
      warnings.push({
        type: 'undercut',
        message: `Undercut is very small (${undercut}"), may cause door binding or air pressure issues`,
        standard: 'NFPA 101 Section 7.2.1.8',
      });
    }
  }

  // Fire door specific checks
  if (isFireRated && !hasGasketing) {
    warnings.push({
      type: 'gasketing',
      message: 'Fire-rated door should have intumescent gasketing for maximum 1/4" clearance allowance',
      standard: 'NFPA 80 Section 4.8.4',
    });
  }

  // NFPA 101: Minimum clear width for egress
  if (doorWidth) {
    const clearWidth = doorWidth - 2; // Subtract ~2" for frame/stop
    if (clearWidth < 32 && params.doorType?.toLowerCase().includes('egress')) {
      warnings.push({
        type: 'dimension',
        message: `Clear opening width may not meet egress requirements (measured: ${clearWidth}", required: ≥32")`,
        standard: 'NFPA 101 Section 7.2.1.2',
      });
    }
  }

  // Height check for egress
  if (doorHeight && doorHeight < 80) {
    warnings.push({
      type: 'dimension',
      message: `Door height should be minimum 80" for egress (measured: ${doorHeight}")`,
      standard: 'NFPA 101 Section 7.2.1.2',
    });
  }

  // Summary
  const isCompliant = violations.length === 0;
  let summary = '';
  
  if (isCompliant && warnings.length === 0) {
    summary = '✓ All NFPA 80/101 tolerance checks passed';
  } else if (isCompliant && warnings.length > 0) {
    summary = `✓ Compliant with ${warnings.length} warning(s) to review`;
  } else {
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const majorCount = violations.filter(v => v.severity === 'major').length;
    summary = `✗ ${violations.length} violation(s) found`;
    if (criticalCount > 0) summary += ` (${criticalCount} critical)`;
    if (majorCount > 0) summary += ` (${majorCount} major)`;
  }

  return {
    isCompliant,
    violations,
    warnings,
    passedChecks,
    summary,
  };
}

/**
 * Landed Cost Calculator
 * Calculates total landed cost including duties, tariffs, and freight allocation
 * Based on international trade compliance requirements
 */

export interface LandedCostLineItem {
  // Basic item info
  quantity: number;
  unitCost: number;
  discountPercent?: number;
  netUnitCost?: number; // If already calculated
  
  // Customs/Duties
  tariffRatePercent?: number; // Import tariff rate
  antiDumpingPercent?: number; // Anti-dumping duty
  otherDutiesPercent?: number; // Other customs duties
  
  // Pre-calculated duty costs (optional, will be calculated if not provided)
  tariffCost?: number;
  antiDumpingCost?: number;
  otherDutiesCost?: number;
  
  // Freight allocation
  baseFreightCost?: number; // Base freight for this line
  fuelSurchargePercent?: number; // Fuel surcharge percentage
  accessorialsCost?: number; // Liftgate, inside delivery, etc.
  insuranceCost?: number; // Cargo insurance
  customsBrokerageCost?: number; // Customs clearance fee
  freightCostTotal?: number; // If already calculated
  
  // Output fields (will be calculated)
  landedUnitCost?: number;
  landedLineTotal?: number;
}

export interface LandedCostResult {
  // Calculated costs
  netUnitCost: number;
  tariffCost: number;
  antiDumpingCost: number;
  otherDutiesCost: number;
  freightCostTotal: number;
  landedUnitCost: number;
  landedLineTotal: number;
  
  // Per-unit allocations
  perUnitDuties: number;
  perUnitFreight: number;
  
  // Breakdown details
  customsValue: number; // Net cost × quantity
  totalDuties: number; // Sum of all duties
  calculation: string;
  notes: string[];
}

function toFloat(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function validateNumeric(value: any, fieldName: string, allowZero: boolean = true): number {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number, got: ${value}`);
  }
  if (!allowZero && parsed <= 0) {
    throw new Error(`${fieldName} must be greater than zero, got: ${parsed}`);
  }
  return parsed;
}

export function calculateLandedCost(item: LandedCostLineItem): LandedCostResult {
  const notes: string[] = [];
  
  // Validate critical fields with strict checking
  const qty = validateNumeric(item.quantity, 'quantity', false); // Must be > 0
  const unitCost = validateNumeric(item.unitCost, 'unitCost', true); // Can be 0
  
  // Optional numeric fields - validate if provided, otherwise default to 0
  const discountPct = item.discountPercent !== undefined && item.discountPercent !== null
    ? validateNumeric(item.discountPercent, 'discountPercent', true) 
    : 0;
  
  // Calculate net unit cost (after discount)
  let netUnitCost = item.netUnitCost;
  if (netUnitCost === null || netUnitCost === undefined || netUnitCost === 0) {
    netUnitCost = unitCost * (1.0 - discountPct / 100.0);
    if (discountPct > 0) {
      notes.push(`Applied ${discountPct}% discount to unit cost`);
    }
  } else {
    netUnitCost = validateNumeric(netUnitCost, 'netUnitCost', true);
  }
  
  // Duty rates - validate if provided
  const tariffRatePct = item.tariffRatePercent !== undefined && item.tariffRatePercent !== null
    ? validateNumeric(item.tariffRatePercent, 'tariffRatePercent', true)
    : 0;
  const antiDumpingPct = item.antiDumpingPercent !== undefined && item.antiDumpingPercent !== null
    ? validateNumeric(item.antiDumpingPercent, 'antiDumpingPercent', true)
    : 0;
  const otherDutiesPct = item.otherDutiesPercent !== undefined && item.otherDutiesPercent !== null
    ? validateNumeric(item.otherDutiesPercent, 'otherDutiesPercent', true)
    : 0;
  
  // Customs value (basis for duty calculation)
  const customsValue = netUnitCost * qty;
  
  // Calculate duties (use provided values or calculate from rates)
  const calculatedTariffCost = Math.round((customsValue * (tariffRatePct / 100.0)) * 100) / 100;
  const calculatedAntiDumpingCost = Math.round((customsValue * (antiDumpingPct / 100.0)) * 100) / 100;
  const calculatedOtherDutiesCost = Math.round((customsValue * (otherDutiesPct / 100.0)) * 100) / 100;
  
  let tariffCost = item.tariffCost !== undefined && item.tariffCost !== null
    ? validateNumeric(item.tariffCost, 'tariffCost', true)
    : calculatedTariffCost;
  let antiDumpingCost = item.antiDumpingCost !== undefined && item.antiDumpingCost !== null
    ? validateNumeric(item.antiDumpingCost, 'antiDumpingCost', true)
    : calculatedAntiDumpingCost;
  let otherDutiesCost = item.otherDutiesCost !== undefined && item.otherDutiesCost !== null
    ? validateNumeric(item.otherDutiesCost, 'otherDutiesCost', true)
    : calculatedOtherDutiesCost;
  
  if (tariffRatePct > 0) {
    notes.push(`Import tariff: ${tariffRatePct}%`);
  }
  if (antiDumpingPct > 0) {
    notes.push(`Anti-dumping duty: ${antiDumpingPct}%`);
  }
  if (otherDutiesPct > 0) {
    notes.push(`Other duties: ${otherDutiesPct}%`);
  }
  
  const totalDuties = tariffCost + antiDumpingCost + otherDutiesCost;
  
  // Freight costs - validate if provided
  const baseFreightCost = item.baseFreightCost !== undefined && item.baseFreightCost !== null
    ? validateNumeric(item.baseFreightCost, 'baseFreightCost', true)
    : 0;
  const fuelSurchargePct = item.fuelSurchargePercent !== undefined && item.fuelSurchargePercent !== null
    ? validateNumeric(item.fuelSurchargePercent, 'fuelSurchargePercent', true)
    : 0;
  const accessorialsCost = item.accessorialsCost !== undefined && item.accessorialsCost !== null
    ? validateNumeric(item.accessorialsCost, 'accessorialsCost', true)
    : 0;
  const insuranceCost = item.insuranceCost !== undefined && item.insuranceCost !== null
    ? validateNumeric(item.insuranceCost, 'insuranceCost', true)
    : 0;
  const customsBrokerageCost = item.customsBrokerageCost !== undefined && item.customsBrokerageCost !== null
    ? validateNumeric(item.customsBrokerageCost, 'customsBrokerageCost', true)
    : 0;
  
  const calculatedFreightTotal = Math.round((
    baseFreightCost +
    baseFreightCost * (fuelSurchargePct / 100.0) +
    accessorialsCost +
    insuranceCost +
    customsBrokerageCost
  ) * 100) / 100;
  
  let freightCostTotal = item.freightCostTotal !== undefined && item.freightCostTotal !== null
    ? validateNumeric(item.freightCostTotal, 'freightCostTotal', true)
    : calculatedFreightTotal;
  
  if (fuelSurchargePct > 0) {
    notes.push(`Fuel surcharge: ${fuelSurchargePct}%`);
  }
  if (accessorialsCost > 0) {
    notes.push(`Accessorials: $${accessorialsCost.toFixed(2)}`);
  }
  if (insuranceCost > 0) {
    notes.push(`Insurance: $${insuranceCost.toFixed(2)}`);
  }
  if (customsBrokerageCost > 0) {
    notes.push(`Customs brokerage: $${customsBrokerageCost.toFixed(2)}`);
  }
  
  // Per-unit allocations (qty is validated > 0 above)
  const perUnitDuties = totalDuties / qty;
  const perUnitFreight = freightCostTotal / qty;
  
  // Landed costs
  const landedUnitCost = Math.round((netUnitCost + perUnitDuties + perUnitFreight) * 100) / 100;
  const landedLineTotal = Math.round((landedUnitCost * qty) * 100) / 100;
  
  const calculation = 
    `Net: $${netUnitCost.toFixed(2)} + Duties: $${perUnitDuties.toFixed(2)}/unit + ` +
    `Freight: $${perUnitFreight.toFixed(2)}/unit = $${landedUnitCost.toFixed(2)} landed`;
  
  return {
    netUnitCost: Math.round(netUnitCost * 100) / 100,
    tariffCost: Math.round(tariffCost * 100) / 100,
    antiDumpingCost: Math.round(antiDumpingCost * 100) / 100,
    otherDutiesCost: Math.round(otherDutiesCost * 100) / 100,
    freightCostTotal: Math.round(freightCostTotal * 100) / 100,
    landedUnitCost,
    landedLineTotal,
    perUnitDuties: Math.round(perUnitDuties * 100) / 100,
    perUnitFreight: Math.round(perUnitFreight * 100) / 100,
    customsValue: Math.round(customsValue * 100) / 100,
    totalDuties: Math.round(totalDuties * 100) / 100,
    calculation,
    notes,
  };
}

/**
 * Batch Landed Cost Calculator
 * Calculates landed costs for multiple line items and provides summary totals
 */
export interface LandedCostItemError {
  index: number;
  error: string;
  item: LandedCostLineItem;
}

export interface LandedCostSummary {
  totalLandedCost: number;
  totalTariffs: number;
  totalAntiDumping: number;
  totalOtherDuties: number;
  totalFreight: number;
  totalDuties: number;
  itemCount: number;
  successCount: number;
  errorCount: number;
  lineItems: (LandedCostLineItem & LandedCostResult)[];
  errors: LandedCostItemError[];
}

export function calculateBatchLandedCost(items: LandedCostLineItem[]): LandedCostSummary {
  const lineItems: (LandedCostLineItem & LandedCostResult)[] = [];
  const errors: LandedCostItemError[] = [];
  let totalLandedCost = 0;
  let totalTariffs = 0;
  let totalAntiDumping = 0;
  let totalOtherDuties = 0;
  let totalFreight = 0;
  let successCount = 0;
  
  items.forEach((item, index) => {
    try {
      const result = calculateLandedCost(item);
      lineItems.push({ ...item, ...result });
      
      totalLandedCost += result.landedLineTotal;
      totalTariffs += result.tariffCost;
      totalAntiDumping += result.antiDumpingCost;
      totalOtherDuties += result.otherDutiesCost;
      totalFreight += result.freightCostTotal;
      successCount++;
    } catch (error) {
      errors.push({
        index,
        error: error instanceof Error ? error.message : String(error),
        item,
      });
    }
  });
  
  const totalDuties = totalTariffs + totalAntiDumping + totalOtherDuties;
  
  return {
    totalLandedCost: Math.round(totalLandedCost * 100) / 100,
    totalTariffs: Math.round(totalTariffs * 100) / 100,
    totalAntiDumping: Math.round(totalAntiDumping * 100) / 100,
    totalOtherDuties: Math.round(totalOtherDuties * 100) / 100,
    totalFreight: Math.round(totalFreight * 100) / 100,
    totalDuties: Math.round(totalDuties * 100) / 100,
    itemCount: items.length,
    successCount,
    errorCount: errors.length,
    lineItems,
    errors,
  };
}
