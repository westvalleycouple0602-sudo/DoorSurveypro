import PDFDocument from "pdfkit";
import type { DoorOpening } from "@shared/schema";

// Industry-standard hardware centerline heights (inches from floor)
const HARDWARE_CENTERLINES = {
  lock: 38,           // Standard lock height
  exitDevice: 40,     // Panic/exit device bar
  closer: 84,         // Door closer (top)
  vision: 60,         // Vision panel center
  kick: 10,           // Kick plate bottom
  // Hinge positions for 3-hinge door (7", center, 7" from top)
  hinges3: [7, null, 7], // null means center will be calculated
};

// Convert string measurements to numbers, handling various formats
function parseNumber(value: string | null | undefined, defaultValue: number = 0): number {
  if (!value) return defaultValue;
  const cleaned = value.toString().replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Calculate hinge positions based on count and door height
function calculateHingePositions(hingeCount: string | null, doorHeight: number): number[] {
  const count = parseNumber(hingeCount, 3);
  
  if (count === 2) {
    return [7, doorHeight - 7];
  } else if (count === 3) {
    return [7, doorHeight / 2, doorHeight - 7];
  } else if (count >= 4) {
    // Evenly distribute hinges
    const spacing = (doorHeight - 14) / (count - 1);
    return Array.from({ length: count }, (_, i) => 7 + (i * spacing));
  }
  
  return [7, doorHeight / 2, doorHeight - 7]; // Default 3 hinges
}

// Draw a labeled leader line
function drawLeaderLine(
  doc: typeof PDFDocument.prototype,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  label: string
) {
  doc
    .save()
    .strokeColor('#666666')
    .lineWidth(0.5)
    .moveTo(fromX, fromY)
    .lineTo(toX, toY)
    .stroke()
    .restore();

  doc
    .font('Helvetica', 8)
    .fillColor('#333333')
    .text(label, toX + 5, toY - 4);
}

// Draw elevation view (front view of door)
function drawElevationView(
  doc: typeof PDFDocument.prototype,
  opening: DoorOpening,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const doorWidth = parseNumber(opening.doorWidth, 36);
  const doorHeight = parseNumber(opening.doorHeight, 84);
  const thickness = parseNumber(opening.doorThickness, 1.75);
  
  // Calculate scale to fit in available space
  const scaleX = (width - 60) / doorWidth;
  const scaleY = (height - 60) / doorHeight;
  const scale = Math.min(scaleX, scaleY, 3); // Max 3:1 scale
  
  const scaledWidth = doorWidth * scale;
  const scaledHeight = doorHeight * scale;
  
  // Center the door in available space
  const doorX = x + (width - scaledWidth) / 2;
  const doorY = y + 20;
  
  // Draw door outline
  doc
    .save()
    .strokeColor('#000000')
    .lineWidth(2)
    .rect(doorX, doorY, scaledWidth, scaledHeight)
    .stroke()
    .restore();
  
  // Draw door swing arc (if single door)
  if (opening.doorType?.toLowerCase() === 'single') {
    doc
      .save()
      .strokeColor('#0066cc')
      .lineWidth(1)
      .opacity(0.5)
      .moveTo(doorX, doorY + scaledHeight)
      .arc(doorX, doorY + scaledHeight, scaledWidth, -90, 0)
      .stroke()
      .restore();
  }
  
  // Draw hinges (left side)
  const hingePositions = calculateHingePositions(opening.hingeCount, doorHeight);
  hingePositions.forEach((pos) => {
    const hingeY = doorY + (pos * scale);
    doc
      .save()
      .fillColor('#333333')
      .rect(doorX - 4, hingeY - 3, 8, 6)
      .fill()
      .restore();
  });
  
  // Draw lock/lockset (right side)
  if (opening.lockType) {
    const lockY = doorY + (HARDWARE_CENTERLINES.lock * scale);
    doc
      .save()
      .fillColor('#666666')
      .circle(doorX + scaledWidth + 8, lockY, 6)
      .fill()
      .restore();
    
    drawLeaderLine(
      doc,
      doorX + scaledWidth + 8,
      lockY,
      doorX + scaledWidth + 40,
      lockY,
      opening.lockType
    );
  }
  
  // Draw exit device (if present)
  if (opening.exitDevice) {
    const exitY = doorY + (HARDWARE_CENTERLINES.exitDevice * scale);
    doc
      .save()
      .strokeColor('#cc6600')
      .lineWidth(3)
      .moveTo(doorX + scaledWidth + 5, exitY)
      .lineTo(doorX + scaledWidth + 15, exitY)
      .stroke()
      .restore();
    
    drawLeaderLine(
      doc,
      doorX + scaledWidth + 15,
      exitY,
      doorX + scaledWidth + 40,
      exitY - 20,
      opening.exitDevice
    );
  }
  
  // Draw door closer (top)
  if (opening.closerType) {
    const closerY = doorY + 5;
    doc
      .save()
      .fillColor('#999999')
      .rect(doorX + scaledWidth - 20, closerY, 15, 8)
      .fill()
      .restore();
    
    drawLeaderLine(
      doc,
      doorX + scaledWidth - 12,
      closerY,
      doorX + scaledWidth + 40,
      closerY - 15,
      opening.closerType
    );
  }
  
  // Draw automation (if present)
  if (opening.automationRequired === 'yes' && opening.automationType) {
    const autoY = doorY - 15;
    doc
      .save()
      .strokeColor('#0099cc')
      .lineWidth(1.5)
      .moveTo(doorX, autoY)
      .lineTo(doorX + scaledWidth, autoY)
      .stroke()
      .restore();
    
    doc
      .font('Helvetica-Bold', 8)
      .fillColor('#0099cc')
      .text(opening.automationType, doorX, autoY - 12);
  }
  
  // Draw access control (if present)
  if (opening.accessControlRequired === 'yes' && opening.accessControlType) {
    const accessY = doorY + (48 * scale); // ~48" height for card readers
    doc
      .save()
      .strokeColor('#009933')
      .lineWidth(1)
      .rect(doorX + scaledWidth + 10, accessY - 6, 12, 12)
      .stroke()
      .restore();
    
    drawLeaderLine(
      doc,
      doorX + scaledWidth + 16,
      accessY,
      doorX + scaledWidth + 40,
      accessY + 20,
      opening.accessControlType
    );
  }
  
  // Draw dimension labels
  doc
    .font('Helvetica', 9)
    .fillColor('#000000')
    .text(`${doorWidth}" W`, doorX, doorY + scaledHeight + 10, { width: scaledWidth, align: 'center' })
    .text(`${doorHeight}" H`, doorX - 35, doorY + scaledHeight / 2 - 5);
  
  // Title
  doc
    .font('Helvetica-Bold', 10)
    .fillColor('#000000')
    .text('ELEVATION VIEW', x, y, { width, align: 'center' });
}

// Draw jamb detail view (frame cross-section)
function drawJambDetail(
  doc: typeof PDFDocument.prototype,
  opening: DoorOpening,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const frameWidth = parseNumber(opening.frameWidth, 4.75);
  const frameDepth = parseNumber(opening.frameDepth, 5.75);
  const frameGauge = 16; // Standard gauge (field not in schema)
  
  // Scale for detail view
  const scale = Math.min((width - 40) / frameDepth, (height - 60) / 12, 8);
  
  const detailX = x + (width - frameDepth * scale) / 2;
  const detailY = y + 30;
  
  // Draw frame profile (simplified hollow metal frame)
  const wallThickness = 0.5 * scale;
  
  // Frame face
  doc
    .save()
    .strokeColor('#000000')
    .lineWidth(1.5)
    .rect(detailX, detailY, frameDepth * scale, 8 * scale)
    .stroke()
    .restore();
  
  // Frame rabbet (door stop)
  doc
    .save()
    .strokeColor('#666666')
    .lineWidth(1)
    .moveTo(detailX + (frameDepth * 0.4 * scale), detailY + (2 * scale))
    .lineTo(detailX + (frameDepth * 0.4 * scale), detailY + (6 * scale))
    .stroke()
    .restore();
  
  // Wall indication
  doc
    .save()
    .fillColor('#f0f0f0')
    .rect(detailX - 10, detailY - 10, 10, (8 * scale) + 20)
    .fill()
    .strokeColor('#999999')
    .rect(detailX - 10, detailY - 10, 10, (8 * scale) + 20)
    .stroke()
    .restore();
  
  // Labels
  doc
    .font('Helvetica', 8)
    .fillColor('#333333')
    .text(`${frameDepth}" Depth`, detailX, detailY + (8 * scale) + 8, { width: frameDepth * scale, align: 'center' })
    .text(`${frameGauge} Ga`, detailX + (frameDepth * scale) + 10, detailY + (4 * scale) - 4);
  
  if (opening.frameMaterial) {
    doc.text(opening.frameMaterial, detailX, detailY - 20, { width: frameDepth * scale, align: 'center' });
  }
  
  // Title
  doc
    .font('Helvetica-Bold', 10)
    .fillColor('#000000')
    .text('JAMB DETAIL', x, y, { width, align: 'center' });
}

// Main function to draw complete opening diagram
export function drawOpeningDiagram(
  doc: typeof PDFDocument.prototype,
  opening: DoorOpening,
  x: number,
  y: number,
  availableWidth: number = 500
) {
  const elevationWidth = availableWidth * 0.65;
  const jambWidth = availableWidth * 0.35;
  const diagramHeight = 280;
  
  // Draw title
  doc
    .font('Helvetica-Bold', 12)
    .fillColor('#000000')
    .text(`${opening.openingNumber} - ${opening.location}`, x, y);
  
  // Draw door type and specs
  doc
    .font('Helvetica', 9)
    .fillColor('#666666')
    .text(
      `${opening.doorType || 'Door'} | ${opening.doorMaterial || 'Material TBD'} | ${opening.frameType || 'Standard Frame'}`,
      x,
      y + 15
    );
  
  // Draw elevation view
  drawElevationView(doc, opening, x, y + 35, elevationWidth, diagramHeight);
  
  // Draw jamb detail
  drawJambDetail(doc, opening, x + elevationWidth + 20, y + 35, jambWidth - 20, diagramHeight);
  
  // Return the total height used
  return diagramHeight + 50;
}
