import type { PhotoType } from "./schema";
import type { DoorOpening } from "./schema";

// Photo type metadata
export const photoTypeLabels: Record<PhotoType, string> = {
  "height-width": "Height & Width Measurements",
  "jamb-depth": "Jamb Depth",
  "top-of-door": "Top of Door",
  "hinge-measurements": "Hinge Size & Measurements",
  "door-frame-measurements": "Door & Frame Measurements",
  "locking-hardware": "Locking Hardware",
  "edge-of-door": "Edge of Door",
  "general": "General Photo",
};

export const photoTypeDescriptions: Record<PhotoType, string> = {
  "height-width": "Photo showing door height and width measurements",
  "jamb-depth": "Photo showing jamb depth measurement",
  "top-of-door": "Photo showing top of door and head clearance",
  "hinge-measurements": "Photo showing hinge size and centerline measurements",
  "door-frame-measurements": "Photo showing door and frame dimensions for replacement",
  "locking-hardware": "Photo showing locking hardware details",
  "edge-of-door": "Photo showing door edge profile and construction",
  "general": "General documentation photo",
};

/**
 * Determine which photo types are required for a given door opening
 * based on its configuration (door selected, frame selected, etc.)
 * 
 * Requirements (per user specification):
 * - Height & width, hinge measurements, locking hardware, edge of door: ALWAYS required
 * - Jamb depth: Required if frame is selected (frameType is set)
 * - Top of door: Required if door is selected (doorType is set)  
 * - Door & frame measurements: Required for door replacements (reuseDoor !== "yes")
 */
export function getRequiredPhotoTypes(opening: Partial<DoorOpening>): PhotoType[] {
  const required: PhotoType[] = [
    "height-width",        // Always required
    "hinge-measurements",  // Always required
    "locking-hardware",    // Always required
    "edge-of-door",        // Always required
  ];

  // Jamb depth required if frame is selected (has frameType)
  // Also require if frame is being replaced and we need to verify dimensions
  const hasFrameType = opening.frameType && opening.frameType !== "none" && opening.frameType !== "";
  const isReplacingFrame = opening.reuseFrame !== "yes"; // If not explicitly reusing, assume replacement
  
  if (hasFrameType || isReplacingFrame) {
    required.push("jamb-depth");
  }

  // Top of door required if door is selected (has doorType)
  // Also require if door is being replaced and we need to verify clearance
  const hasDoorType = opening.doorType && opening.doorType !== "none" && opening.doorType !== "";
  const isReplacingDoor = opening.reuseDoor !== "yes"; // If not explicitly reusing, assume replacement
  
  if (hasDoorType || isReplacingDoor) {
    required.push("top-of-door");
  }

  // Door and frame measurements required for replacements
  // Treat missing/undefined reuseDoor as "no" (replacement required)
  // This ensures legacy openings and new openings without explicit reuse flags get proper documentation
  if (opening.reuseDoor !== "yes") {
    required.push("door-frame-measurements");
  }

  return required;
}

/**
 * Check which required photo types are missing for an opening
 */
export function getMissingPhotoTypes(
  opening: Partial<DoorOpening>,
  uploadedPhotoTypes: PhotoType[]
): PhotoType[] {
  const required = getRequiredPhotoTypes(opening);
  const uploaded = new Set(uploadedPhotoTypes);
  
  return required.filter(type => !uploaded.has(type));
}

/**
 * Check if all required photos have been uploaded for an opening
 */
export function hasAllRequiredPhotos(
  opening: Partial<DoorOpening>,
  uploadedPhotoTypes: PhotoType[]
): boolean {
  return getMissingPhotoTypes(opening, uploadedPhotoTypes).length === 0;
}
