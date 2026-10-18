// BOM Generator Service - Intelligent hardware selection based on door opening specifications
import type { DoorOpening } from "@shared/schema";

export interface BomItem {
  category: string;
  description: string;
  family: string;
  bhmaFunction: string;
  brand: string;
  sku: string;
  finish: string;
  grade: string;
  quantity: number;
  msrp: number;
  notes?: string;
}

export interface BomGenerationContext {
  doorOpening: DoorOpening;
  defaultFinishes?: {
    lock?: string;
    hinge?: string;
    closer?: string;
    exitDevice?: string;
  };
}

/**
 * Generate a Bill of Materials based on door opening specifications
 * Uses intelligent logic to select appropriate hardware based on:
 * - Door type (fire-rated, egress, etc.)
 * - Building code requirements
 * - Space type and usage
 * - Access control needs
 */
export function generateBom(context: BomGenerationContext): BomItem[] {
  const { doorOpening, defaultFinishes = {} } = context;
  const items: BomItem[] = [];

  // Extract relevant fields from door opening
  const isFireDoor = doorOpening.doorFireRating && doorOpening.doorFireRating !== "none";
  const requiresPanic = doorOpening.exitDevice && doorOpening.exitDevice.toLowerCase().includes("panic");
  const isEgressRequired = doorOpening.exitDevice !== null && doorOpening.exitDevice !== "";
  const hasAccessControl = (doorOpening.notes || "").toLowerCase().includes("access control") || 
                           (doorOpening.notes || "").toLowerCase().includes("card reader");
  
  // Determine door function/usage from room name or location
  const spaceType = doorOpening.roomName || doorOpening.location || "general";
  const isDualSwing = (doorOpening.doorType || "").includes("double");

  // 1. LOCK - Every door needs a lock (unless it has an exit device)
  if (!requiresPanic && !isEgressRequired) {
    items.push({
      category: "Lock",
      description: "Mortise Lock",
      family: "Schlage ND-Series",
      bhmaFunction: "F86", // Storeroom function
      brand: "Schlage",
      sku: `ND80PD-${defaultFinishes.lock || "626"}`,
      finish: defaultFinishes.lock || "626", // Satin Chrome
      grade: "Grade 1",
      quantity: 1,
      msrp: 425.00,
      notes: "Heavy-duty commercial mortise lock"
    });
  }

  // 2. HINGES - Critical for fire doors (3 hinges required, 2 for standard)
  const hingeQuantity = isFireDoor ? 3 : 2;
  items.push({
    category: "Hinge",
    description: "Heavy Weight Hinge",
    family: "McKinney TA2714",
    bhmaFunction: "",
    brand: "McKinney",
    sku: "TA2714-4.5x4.5",
    finish: defaultFinishes.hinge || "652", // Satin Chrome Plated
    grade: isFireDoor ? "Fire Rated" : "Standard",
    quantity: hingeQuantity,
    msrp: 45.00,
    notes: isFireDoor ? "Fire-rated hinges required for fire door" : "Standard heavy-weight hinges"
  });

  // 3. DOOR CLOSER - Required for fire doors and high-traffic areas
  if (isFireDoor || spaceType === "corridor" || spaceType === "stairwell") {
    items.push({
      category: "Closer",
      description: "Surface Door Closer",
      family: "LCN 4040XP",
      bhmaFunction: "",
      brand: "LCN",
      sku: `4040XP-${defaultFinishes.closer || "689"}`,
      finish: defaultFinishes.closer || "689", // Aluminum
      grade: "Grade 1",
      quantity: 1,
      msrp: 385.00,
      notes: isFireDoor ? "Required for positive-latching on fire door" : "Recommended for controlled closing"
    });
  }

  // 4. EXIT DEVICE - Required for panic hardware or egress doors
  if (requiresPanic || isEgressRequired) {
    items.push({
      category: "Exit Device",
      description: "Rim Exit Device",
      family: "Von Duprin 99-Series",
      bhmaFunction: "F84", // Exit Only
      brand: "Von Duprin",
      sku: `99-L-06-${defaultFinishes.exitDevice || "689"}`,
      finish: defaultFinishes.exitDevice || "689",
      grade: "Grade 1",
      quantity: 1,
      msrp: 895.00,
      notes: "Panic hardware for life safety compliance"
    });
  }

  // 5. ACCESS CONTROL - Electromagnetic lock for card access systems
  if (hasAccessControl) {
    items.push({
      category: "Access Control",
      description: "Electromagnetic Lock 1200lb",
      family: "Securitron M62",
      bhmaFunction: "",
      brand: "Securitron",
      sku: "M62",
      finish: "Aluminum",
      grade: "Commercial",
      quantity: 1,
      msrp: 425.00,
      notes: "12/24 VDC electromagnetic lock"
    });

    // Add power supply for access control
    items.push({
      category: "Access Control",
      description: "Power Supply 12/24V",
      family: "Altronix",
      bhmaFunction: "",
      brand: "Altronix",
      sku: "AL600ULACM",
      finish: "Gray",
      grade: "Commercial",
      quantity: 1,
      msrp: 185.00,
      notes: "Dual voltage power supply for access control devices"
    });

    // Add card reader
    items.push({
      category: "Access Control",
      description: "HID Proximity Card Reader",
      family: "HID ProxPoint Plus",
      bhmaFunction: "",
      brand: "HID",
      sku: "6005BGS00",
      finish: "Gray",
      grade: "Commercial",
      quantity: 1,
      msrp: 145.00,
      notes: "125kHz proximity card reader"
    });
  }

  // 6. DOOR COORDINATOR - Required for double doors with fire rating
  if (isDualSwing && isFireDoor) {
    items.push({
      category: "Coordinator",
      description: "Door Coordinator",
      family: "Rixson 327",
      bhmaFunction: "",
      brand: "Rixson",
      sku: "327",
      finish: "Aluminum",
      grade: "Fire Rated",
      quantity: 1,
      msrp: 295.00,
      notes: "Ensures proper closing sequence for fire-rated double doors"
    });
  }

  // 7. THRESHOLD - For exterior doors or sound/smoke seal requirements
  if (doorOpening.doorType?.includes("exterior") || isFireDoor) {
    items.push({
      category: "Threshold",
      description: "ADA Compliant Threshold",
      family: "National Guard NGP",
      bhmaFunction: "",
      brand: "National Guard",
      sku: "NGP500",
      finish: "Mill Finish Aluminum",
      grade: "Commercial",
      quantity: 1,
      msrp: 125.00,
      notes: isFireDoor ? "Fire-rated threshold with smoke seal" : "ADA compliant threshold"
    });
  }

  return items;
}

/**
 * Calculate totals for a BOM
 */
export function calculateBomTotals(items: BomItem[]) {
  const totalMsrp = items.reduce((sum, item) => sum + (item.msrp || 0) * item.quantity, 0);
  const itemCount = items.length;

  return {
    totalMsrp,
    itemCount
  };
}
