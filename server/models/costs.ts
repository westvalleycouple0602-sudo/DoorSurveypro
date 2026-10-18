/**
 * Cost Models and Domain Types
 * Centralized cost-related data structures for estimation and pricing
 */

// ============================================================================
// Rate Cards & Pricing Tables
// ============================================================================

export interface LaborRates {
  /** Hourly rate for installation labor */
  installationHourlyRate: number;
  /** Hourly rate for survey/assessment */
  surveyHourlyRate: number;
  /** Hourly rate for project management */
  pmHourlyRate: number;
  /** Multiplier for overtime work */
  overtimeMultiplier: number;
  /** Multiplier for emergency/rush work */
  emergencyMultiplier: number;
}

export interface FreightRates {
  /** Base freight cost per shipment */
  baseShipmentCost: number;
  /** Cost per pound for freight */
  costPerPound: number;
  /** Cost per cubic foot for freight */
  costPerCubicFoot: number;
  /** Minimum freight charge */
  minimumFreightCost: number;
  /** Expedited shipping multiplier */
  expeditedMultiplier: number;
  /** International shipping multiplier */
  internationalMultiplier: number;
}

export interface PricingTiers {
  /** Markup percentage for materials */
  materialMarkup: number;
  /** Markup percentage for labor */
  laborMarkup: number;
  /** Markup percentage for freight */
  freightMarkup: number;
  /** Profit margin percentage */
  profitMargin: number;
  /** Discount percentage (if applicable) */
  discountPercent?: number;
}

// Default rate card (can be overridden per organization)
export const DEFAULT_LABOR_RATES: LaborRates = {
  installationHourlyRate: 85.00,
  surveyHourlyRate: 95.00,
  pmHourlyRate: 125.00,
  overtimeMultiplier: 1.5,
  emergencyMultiplier: 2.0,
};

export const DEFAULT_FREIGHT_RATES: FreightRates = {
  baseShipmentCost: 150.00,
  costPerPound: 0.45,
  costPerCubicFoot: 8.50,
  minimumFreightCost: 75.00,
  expeditedMultiplier: 1.8,
  internationalMultiplier: 3.5,
};

export const DEFAULT_PRICING_TIERS: PricingTiers = {
  materialMarkup: 0.25,     // 25% markup
  laborMarkup: 0.15,        // 15% markup
  freightMarkup: 0.10,      // 10% markup
  profitMargin: 0.20,       // 20% profit margin
};

// ============================================================================
// Cost Breakdown Structures
// ============================================================================

export interface MaterialCosts {
  /** Total list price of hardware items */
  listPriceTotal: number;
  /** Total net price (after vendor discounts) */
  netPriceTotal: number;
  /** Applied markup amount */
  markupAmount: number;
  /** Final material cost to customer */
  customerCost: number;
  /** Number of hardware items */
  itemCount: number;
}

export interface LaborCosts {
  /** Base labor hours required */
  baseHours: number;
  /** Additional hours for complexity */
  complexityHours: number;
  /** Total labor hours */
  totalHours: number;
  /** Hourly rate used */
  hourlyRate: number;
  /** Base labor cost */
  baseCost: number;
  /** Markup amount */
  markupAmount: number;
  /** Final labor cost to customer */
  customerCost: number;
  /** Estimated number of technicians */
  estimatedTechnicians: number;
  /** Estimated days to complete */
  estimatedDays: number;
}

export interface FreightCosts {
  /** Estimated total weight (lbs) */
  totalWeightLbs: number;
  /** Estimated total volume (cu ft) */
  totalVolumeCuFt: number;
  /** Number of shipments */
  shipmentCount: number;
  /** Base freight cost */
  baseCost: number;
  /** Weight-based cost */
  weightCost: number;
  /** Volume-based cost */
  volumeCost: number;
  /** Applied multipliers (expedited, international) */
  multipliers: number;
  /** Markup amount */
  markupAmount: number;
  /** Final freight cost to customer */
  customerCost: number;
}

export interface ProjectCostBreakdown {
  /** Material costs breakdown */
  materials: MaterialCosts;
  /** Labor costs breakdown */
  labor: LaborCosts;
  /** Freight costs breakdown */
  freight: FreightCosts;
  /** Subtotal before profit margin */
  subtotal: number;
  /** Profit margin amount */
  profitAmount: number;
  /** Discount amount (if applicable) */
  discountAmount?: number;
  /** Tax amount */
  taxAmount?: number;
  /** Final total cost to customer */
  totalCost: number;
}

// ============================================================================
// Estimation Context & Parameters
// ============================================================================

export interface EstimationContext {
  /** Number of door openings */
  openingCount: number;
  /** Number of hardware items */
  hardwareItemCount: number;
  /** Total hardware list price */
  hardwareListPrice: number;
  /** Total hardware net price */
  hardwareNetPrice: number;
  /** Building type */
  buildingType?: string;
  /** Project location (affects freight, labor rates) */
  location?: string;
  /** Is this a rush/emergency project? */
  isRush?: boolean;
  /** Is this international shipping? */
  isInternational?: boolean;
  /** Average hardware weight (lbs per item) */
  avgHardwareWeight?: number;
  /** Complexity factors */
  complexityFactors?: {
    fireRatedDoors?: number;
    accessControlSystems?: number;
    customHardware?: number;
    multipleFloors?: boolean;
  };
}

export interface CalculatorConfig {
  /** Labor rates to use */
  laborRates?: Partial<LaborRates>;
  /** Freight rates to use */
  freightRates?: Partial<FreightRates>;
  /** Pricing tiers to use */
  pricingTiers?: Partial<PricingTiers>;
  /** Organization-specific overrides */
  organizationId?: string;
}

// ============================================================================
// Calculation Results
// ============================================================================

export interface LaborCalculationResult {
  baseHours: number;
  complexityHours: number;
  totalHours: number;
  estimatedDays: number;
  estimatedTechnicians: number;
  baseCost: number;
  markupAmount: number;
  customerCost: number;
}

export interface FreightCalculationResult {
  totalWeightLbs: number;
  totalVolumeCuFt: number;
  shipmentCount: number;
  baseCost: number;
  weightCost: number;
  volumeCost: number;
  multipliers: number;
  markupAmount: number;
  customerCost: number;
}

export interface MaterialCalculationResult {
  listPriceTotal: number;
  netPriceTotal: number;
  markupAmount: number;
  customerCost: number;
  itemCount: number;
}

export interface InstallationTimeResult {
  totalHours: number;
  hoursPerOpening: number;
  estimatedDays: number;
  estimatedTechnicians: number;
  complexityFactor: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge default rates with custom overrides
 */
export function mergeLaborRates(overrides?: Partial<LaborRates>): LaborRates {
  return { ...DEFAULT_LABOR_RATES, ...overrides };
}

/**
 * Merge default freight rates with custom overrides
 */
export function mergeFreightRates(overrides?: Partial<FreightRates>): FreightRates {
  return { ...DEFAULT_FREIGHT_RATES, ...overrides };
}

/**
 * Merge default pricing tiers with custom overrides
 */
export function mergePricingTiers(overrides?: Partial<PricingTiers>): PricingTiers {
  return { ...DEFAULT_PRICING_TIERS, ...overrides };
}

/**
 * Calculate markup amount from base cost
 */
export function calculateMarkup(baseCost: number, markupPercent: number): number {
  return baseCost * markupPercent;
}

/**
 * Calculate customer cost (base + markup)
 */
export function calculateCustomerCost(baseCost: number, markupPercent: number): number {
  return baseCost * (1 + markupPercent);
}

/**
 * Calculate profit margin amount
 */
export function calculateProfitMargin(subtotal: number, profitPercent: number): number {
  return subtotal * profitPercent;
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(amount: number, discountPercent: number): number {
  return amount * discountPercent;
}

/**
 * Round currency to 2 decimal places
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}
