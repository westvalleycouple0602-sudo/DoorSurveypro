import PDFDocument from "pdfkit";
import type { Project, DoorOpening, HardwareItem, Disclaimer } from "@shared/schema";

interface QuotePDFData {
  project: Project;
  opening?: DoorOpening;
  hardwareItem?: HardwareItem;
  disclaimers?: Disclaimer[];
}

export async function generateCoverPage(data: QuotePDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const { project, opening, hardwareItem } = data;

      // Header
      doc.fontSize(24).fillColor("#2563eb").text("Quote Request", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(16).fillColor("#666").text("Cover Page", { align: "center" });
      doc.moveDown(2);

      // Project Information
      doc.fontSize(14).fillColor("#000").text("Project Information", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Project Name: ${project.name}`);
      doc.text(`Location: ${project.location}`);
      doc.text(`Building Type: ${project.buildingType}`);
      doc.text(`Status: ${project.status}`);
      if (project.notes) {
        doc.moveDown(0.3);
        doc.text(`Notes: ${project.notes}`);
      }
      doc.moveDown(1.5);

      // Opening or Hardware Item Information
      if (opening) {
        doc.fontSize(14).fillColor("#000").text("Door Opening Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Opening Number: ${opening.openingNumber}`);
        doc.text(`Location: ${opening.location}`);
        
        if (opening.doorType) doc.text(`Door Type: ${opening.doorType}`);
        if (opening.doorMaterial) doc.text(`Door Material: ${opening.doorMaterial}`);
        if (opening.doorWidth && opening.doorHeight) {
          doc.text(`Door Size: ${opening.doorWidth}" x ${opening.doorHeight}"`);
        }
        if (opening.doorThickness) doc.text(`Door Thickness: ${opening.doorThickness}"`);
        
        if (opening.frameType) {
          doc.moveDown(0.5);
          doc.text(`Frame Type: ${opening.frameType}`);
          if (opening.frameMaterial) doc.text(`Frame Material: ${opening.frameMaterial}`);
          if (opening.frameDepth) doc.text(`Frame Depth: ${opening.frameDepth}"`);
        }

        if (opening.notes) {
          doc.moveDown(0.5);
          doc.text(`Notes: ${opening.notes}`);
        }
      }

      if (hardwareItem) {
        doc.fontSize(14).fillColor("#000").text("Custom Hardware Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Item Type: ${hardwareItem.itemType}`);
        doc.text(`Description: ${hardwareItem.description}`);
        doc.text(`Quantity: ${hardwareItem.quantity}`);
        if (hardwareItem.manufacturer) doc.text(`Manufacturer: ${hardwareItem.manufacturer}`);
        if (hardwareItem.model) doc.text(`Model: ${hardwareItem.model}`);
        if (hardwareItem.location) doc.text(`Location: ${hardwareItem.location}`);
        if (hardwareItem.condition) doc.text(`Condition: ${hardwareItem.condition}`);
        if (hardwareItem.notes) {
          doc.moveDown(0.5);
          doc.text(`Notes: ${hardwareItem.notes}`);
        }
      }

      // Disclaimers and Addendums
      if (data.disclaimers && data.disclaimers.length > 0) {
        doc.addPage();
        doc.fontSize(18).fillColor("#2563eb").text("Disclaimers & Addendums", { align: "center" });
        doc.moveDown(1.5);

        const activeDisclaimers = data.disclaimers
          .filter(d => d.isActive === "yes")
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        activeDisclaimers.forEach((disclaimer, index) => {
          if (index > 0) doc.moveDown(1);
          
          doc.fontSize(12).fillColor("#000").text(disclaimer.title, { underline: true });
          doc.moveDown(0.3);
          
          const typeLabel = disclaimer.type.toUpperCase();
          doc.fontSize(9).fillColor("#666").text(`[${typeLabel}]`);
          doc.moveDown(0.3);
          
          doc.fontSize(10).fillColor("#000").text(disclaimer.content, {
            align: "left",
            indent: 20,
          });
          doc.moveDown(0.5);
        });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).fillColor("#666");
      doc.text(`Request Date: ${new Date().toLocaleDateString()}`, { align: "center" });
      doc.text("DoorSurvey Pro - Commercial Door Estimating", { align: "center" });

      doc.end();
    } catch (error) {
      doc.end();
      reject(error);
    }
  });
}

export async function generateHardMachineSheet(data: QuotePDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const { project, opening, hardwareItem } = data;

      // Header
      doc.fontSize(20).fillColor("#2563eb").text("Hard Machine Sheet", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor("#666").text("Technical Specifications", { align: "center" });
      doc.moveDown(2);

      // Reference Information
      doc.fontSize(10).fillColor("#000");
      doc.text(`Project: ${project.name}`, 50, 120);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 120);
      doc.moveDown(2);

      if (opening) {
        // Door Specifications Table
        doc.fontSize(12).fillColor("#000").text("Door Specifications", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);

        const doorSpecs = [
          ["Opening Number:", opening.openingNumber],
          ["Location:", opening.location],
          ["Door Type:", opening.doorType || "N/A"],
          ["Material:", opening.doorMaterial || "N/A"],
          ["Width:", opening.doorWidth ? `${opening.doorWidth}"` : "N/A"],
          ["Height:", opening.doorHeight ? `${opening.doorHeight}"` : "N/A"],
          ["Thickness:", opening.doorThickness ? `${opening.doorThickness}"` : "N/A"],
        ];

        let y = doc.y;
        doorSpecs.forEach(([label, value]) => {
          doc.text(label, 50, y, { width: 200, continued: true });
          doc.text(value, { align: "right" });
          y += 20;
        });

        doc.moveDown(1);

        // Frame Specifications
        if (opening.frameType) {
          doc.fontSize(12).text("Frame Specifications", { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          const frameSpecs = [
            ["Frame Type:", opening.frameType],
            ["Material:", opening.frameMaterial || "N/A"],
            ["Width:", opening.frameWidth || "N/A"],
            ["Depth:", opening.frameDepth ? `${opening.frameDepth}"` : "N/A"],
          ];

          y = doc.y;
          frameSpecs.forEach(([label, value]) => {
            doc.text(label, 50, y, { width: 200, continued: true });
            doc.text(value, { align: "right" });
            y += 20;
          });

          doc.moveDown(1);
        }

        // Hardware Specifications
        if (opening.lockType || opening.hingeType || opening.closerType || opening.exitDevice) {
          doc.fontSize(12).text("Hardware Specifications", { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          const hardwareSpecs = [
            ["Lock Type:", opening.lockType || "N/A"],
            ["Hinge Type:", opening.hingeType || "N/A"],
            ["Hinge Count:", opening.hingeCount || "N/A"],
            ["Closer Type:", opening.closerType || "N/A"],
            ["Exit Device:", opening.exitDevice || "N/A"],
          ];

          y = doc.y;
          hardwareSpecs.forEach(([label, value]) => {
            doc.text(label, 50, y, { width: 200, continued: true });
            doc.text(value, { align: "right" });
            y += 20;
          });

          doc.moveDown(1);
        }

        // Automation & Access Control
        if (opening.automationRequired === "yes" || opening.accessControlRequired === "yes") {
          doc.fontSize(12).text("Automation & Access Control", { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          const autoSpecs: [string, string][] = [];
          if (opening.automationRequired === "yes") {
            autoSpecs.push(["Automation Type:", opening.automationType || "N/A"]);
            if (opening.powerRequirements && opening.powerRequirements.length > 0) {
              autoSpecs.push(["Power Requirements:", opening.powerRequirements.join(", ")]);
            }
            autoSpecs.push(["Power Available:", opening.powerAvailable || "no"]);
            autoSpecs.push(["Electrified Hardware:", opening.electrifiedHardware || "no"]);
          }
          if (opening.accessControlRequired === "yes") {
            autoSpecs.push(["Access Control Type:", opening.accessControlType || "N/A"]);
          }

          y = doc.y;
          autoSpecs.forEach(([label, value]) => {
            doc.text(label, 50, y, { width: 200, continued: true });
            doc.text(value, { align: "right" });
            y += 20;
          });
        }
      }

      if (hardwareItem) {
        doc.fontSize(12).text("Custom Hardware Specifications", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);

        const hwSpecs = [
          ["Item Type:", hardwareItem.itemType],
          ["Description:", hardwareItem.description],
          ["Quantity:", hardwareItem.quantity || "1"],
          ["Manufacturer:", hardwareItem.manufacturer || "TBD"],
          ["Model:", hardwareItem.model || "TBD"],
          ["Location:", hardwareItem.location || "N/A"],
          ["Condition:", hardwareItem.condition || "new"],
        ];

        let y = doc.y;
        hwSpecs.forEach(([label, value]) => {
          doc.text(label, 50, y, { width: 200, continued: true });
          doc.text(value, { align: "right" });
          y += 20;
        });
      }

      doc.end();
    } catch (error) {
      doc.end();
      reject(error);
    }
  });
}

export async function generateOrderForm(data: QuotePDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const { project, opening, hardwareItem } = data;

      // Header
      doc.fontSize(20).fillColor("#2563eb").text("Order Form", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor("#666").text("Quote Request", { align: "center" });
      doc.moveDown(2);

      // Project Header
      doc.fontSize(10).fillColor("#000");
      doc.text(`Project: ${project.name}`, 50, 120);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 120);
      if (opening) {
        doc.text(`Opening: ${opening.openingNumber}`, 50, 135);
      }
      doc.moveDown(3);

      // Order Table
      doc.fontSize(12).text("Items to Quote", { underline: true });
      doc.moveDown(0.5);

      // Table headers
      const tableTop = doc.y;
      const columnWidths = { qty: 50, description: 300, notes: 150 };
      
      doc.fontSize(10).fillColor("#666");
      doc.text("QTY", 50, tableTop);
      doc.text("DESCRIPTION", 110, tableTop);
      doc.text("NOTES", 420, tableTop);
      
      // Horizontal line under headers
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      let currentY = tableTop + 25;

      if (opening) {
        // Door line item
        if (opening.doorType && opening.reuseDoor !== "yes") {
          doc.fillColor("#000");
          doc.text("1", 50, currentY);
          const doorDesc = `${opening.doorType} Door - ${opening.doorWidth || "?"}x${opening.doorHeight || "?"} ${opening.doorMaterial || ""}`;
          doc.text(doorDesc, 110, currentY, { width: columnWidths.description });
          doc.text(opening.doorThickness ? `Thickness: ${opening.doorThickness}"` : "", 420, currentY, { width: columnWidths.notes });
          currentY += 30;
        }

        // Frame line item
        if (opening.frameType && opening.reuseFrame !== "yes") {
          doc.text("1", 50, currentY);
          const frameDesc = `${opening.frameType} Frame ${opening.frameMaterial ? `- ${opening.frameMaterial}` : ""}`;
          doc.text(frameDesc, 110, currentY, { width: columnWidths.description });
          doc.text(opening.frameDepth ? `Depth: ${opening.frameDepth}"` : "", 420, currentY, { width: columnWidths.notes });
          currentY += 30;
        }

        // Hardware as single line (detail in hardware items)
        if (opening.reuseHardware !== "yes") {
          doc.text("Set", 50, currentY);
          doc.text("Hardware Package - See Hardware Schedule", 110, currentY, { width: columnWidths.description });
          doc.text("Per specifications", 420, currentY, { width: columnWidths.notes });
          currentY += 30;
        }
      }

      if (hardwareItem) {
        doc.text(hardwareItem.quantity || "1", 50, currentY);
        doc.text(`${hardwareItem.itemType}: ${hardwareItem.description}`, 110, currentY, { width: columnWidths.description });
        doc.text(hardwareItem.model || "Custom", 420, currentY, { width: columnWidths.notes });
        currentY += 30;
      }

      // Bottom line
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke();

      // Quote Instructions
      doc.moveDown(2);
      currentY += 40;
      doc.fontSize(12).fillColor("#000").text("Quote Instructions:", 50, currentY);
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text("• Provide unit pricing for each line item", 70);
      doc.text("• Include lead time from order to delivery", 70);
      doc.text("• Specify delivery terms (FOB, freight, etc.)", 70);
      doc.text("• Note payment terms", 70);
      doc.text("• Contact us with any technical clarifications needed", 70);

      // Footer
      doc.moveDown(3);
      doc.fontSize(9).fillColor("#666");
      doc.text("Please return quote within 5 business days", { align: "center" });
      doc.text("DoorSurvey Pro - Commercial Door Estimating", { align: "center" });

      doc.end();
    } catch (error) {
      doc.end();
      reject(error);
    }
  });
}

export async function generateAllQuoteForms(data: QuotePDFData): Promise<{
  coverPage: Buffer;
  hardMachineSheet: Buffer;
  orderForm: Buffer;
}> {
  const [coverPage, hardMachineSheet, orderForm] = await Promise.all([
    generateCoverPage(data),
    generateHardMachineSheet(data),
    generateOrderForm(data),
  ]);

  return { coverPage, hardMachineSheet, orderForm };
}
