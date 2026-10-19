import PDFDocument from "pdfkit";
import type { Project, DoorOpening, ProjectCost, PurchaseOrder, PurchaseOrderLineItem, Disclaimer, Organization, Photo } from "@shared/schema";
import { drawOpeningDiagram } from "./pdf-diagram";
import { logError } from "./logger";

interface PDFGenerationOptions {
  project: Project;
  doorOpenings: DoorOpening[];
  costs?: ProjectCost | undefined;
  disclaimers?: Disclaimer[];
  organization?: Organization;
  photos?: Photo[];
}

export async function generateProjectPDF(options: PDFGenerationOptions): Promise<Buffer> {
  const { project, doorOpenings, costs, disclaimers, organization, photos } = options;
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: 40,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title Page
    generateTitlePage(doc, project, doorOpenings, organization);
    
    // Project Narrative
    doc.addPage();
    generateProjectNarrative(doc, project, doorOpenings);
    
    // Scope of Work (if defined)
    if (project.scopeOfWork || hasScopeDisclaimers(project) || hasScopeItems(project)) {
      doc.addPage();
      generateScopeOfWork(doc, project);
    }
    
    // Door Schedule
    doc.addPage();
    generateDoorSchedule(doc, project, doorOpenings);
    
    // Frame Schedule
    doc.addPage();
    generateFrameSchedule(doc, project, doorOpenings);
    
    // Hardware Schedule
    doc.addPage();
    generateHardwareSchedule(doc, project, doorOpenings);
    
    // Opening Diagrams
    doc.addPage();
    generateOpeningDiagrams(doc, project, doorOpenings);
    
    // Photo Documentation & GPS Data
    if (photos && photos.length > 0) {
      doc.addPage();
      generatePhotoDocumentation(doc, project, photos, doorOpenings);
    }
    
    // Compliance Summary
    if (photos && photos.some(p => p.annotations && Array.isArray(p.annotations) && (p.annotations as any[]).some(a => a.type === "compliance"))) {
      doc.addPage();
      generateComplianceSummary(doc, project, photos);
    }
    
    // Installer Documentation (for openings with technician notes)
    const openingsWithNotes = doorOpenings.filter(o => 
      o.installationNarrative || o.componentNotes || o.wiringNotes || o.fieldIssues
    );
    if (openingsWithNotes.length > 0) {
      doc.addPage();
      generateInstallerDocumentation(doc, project, openingsWithNotes);
    }
    
    // Project Costs
    if (costs) {
      doc.addPage();
      generateCostsSummary(doc, project, costs);
    }
    
    // Disclaimers and Addendums
    if (disclaimers && disclaimers.length > 0) {
      const activeDisclaimers = disclaimers
        .filter(d => d.isActive === "yes")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      if (activeDisclaimers.length > 0) {
        doc.addPage();
        generateDisclaimersSection(doc, activeDisclaimers);
      }
    }
    
    // Signature Page (if organization branding is configured)
    if (organization && (organization.signatureName || organization.signatureEmail)) {
      doc.addPage();
      generateSignaturePage(doc, organization);
    }
    
    doc.end();
  });
}

function generateTitlePage(doc: typeof PDFDocument.prototype, project: Project, doorOpenings: DoorOpening[], organization?: Organization) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  let startY = 60;
  
  // Logo (if available)
  if (organization?.logoUrl) {
    try {
      // Parse base64 data URL
      const matches = organization.logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Add logo - max width 150, max height 80
        doc.image(buffer, 40, startY, {
          fit: [150, 80],
          align: 'left',
        });
        startY += 90;
      }
    } catch (error) {
      logError(error as Error, { context: 'pdf-add-logo', organizationName: organization?.name });
      // Continue without logo if there's an error
    }
  }
  
  // Header
  const companyName = organization?.name || "DoorSurvey Pro";
  doc.fontSize(24)
     .font("Helvetica-Bold")
     .text(companyName, 40, startY);
  
  doc.fontSize(14)
     .font("Helvetica")
     .text("Commercial Door & Frame Survey Report", 40, startY + 35);
  
  // Horizontal line
  const lineY = startY + 60;
  doc.moveTo(40, lineY)
     .lineTo(pageWidth - 40, lineY)
     .stroke();
  
  // Project Information Box
  const boxTop = lineY + 30;
  doc.fontSize(20)
     .font("Helvetica-Bold")
     .text(project.name, 40, boxTop);
  
  doc.fontSize(12)
     .font("Helvetica")
     .text(`Project Location: ${project.location}`, 40, boxTop + 35)
     .text(`Building Type: ${project.buildingType}`, 40, boxTop + 55)
     .text(`Status: ${project.status}`, 40, boxTop + 75)
     .text(`Date: ${new Date().toLocaleDateString()}`, 40, boxTop + 95);
  
  if (project.notes) {
    doc.fontSize(11)
       .font("Helvetica")
       .text(`Notes: ${project.notes}`, 40, boxTop + 120, {
         width: pageWidth - 80,
       });
  }
  
  // Summary box
  const summaryTop = 350;
  doc.fontSize(16)
     .font("Helvetica-Bold")
     .text("Project Summary", 40, summaryTop);
  
  doc.fontSize(12)
     .font("Helvetica")
     .text(`Total Door Openings: ${doorOpenings.length}`, 40, summaryTop + 30);
  
  // Footer
  doc.fontSize(10)
     .font("Helvetica")
     .text(
       "Generated by DoorSurvey Pro - Commercial Door Estimating Tool",
       40,
       pageHeight - 60,
       { align: "center", width: pageWidth - 80 }
     );
}

function generateProjectNarrative(doc: typeof PDFDocument.prototype, project: Project, doorOpenings: DoorOpening[]) {
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .text("Project Narrative", 40, 60);
  
  doc.moveTo(40, 85)
     .lineTo(doc.page.width - 40, 85)
     .stroke();
  
  const narrativeTop = 100;
  
  doc.fontSize(12)
     .font("Helvetica")
     .text(
       `This report documents a comprehensive door and frame survey conducted at ${project.location}. ` +
       `The project involves the assessment and specification of ${doorOpenings.length} door opening(s) ` +
       `for the ${project.buildingType} facility.`,
       40,
       narrativeTop,
       { width: doc.page.width - 80, align: "justify" }
     );
  
  let yPos = narrativeTop + 80;
  
  // Door types summary
  const doorTypes = new Set(doorOpenings.map(d => d.doorType).filter(Boolean));
  if (doorTypes.size > 0) {
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .text("Door Types", 40, yPos);
    
    yPos += 25;
    doc.fontSize(12)
       .font("Helvetica")
       .text(
         `The survey includes the following door types: ${Array.from(doorTypes).join(", ")}.`,
         40,
         yPos,
         { width: doc.page.width - 80 }
       );
    yPos += 60;
  }
  
  // Hardware summary
  const hasAutomation = doorOpenings.some(d => d.automationRequired === "yes");
  const hasAccessControl = doorOpenings.some(d => d.accessControlRequired === "yes");
  
  if (hasAutomation || hasAccessControl) {
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .text("Special Requirements", 40, yPos);
    
    yPos += 25;
    const requirements: string[] = [];
    if (hasAutomation) requirements.push("automatic door operators");
    if (hasAccessControl) requirements.push("access control systems");
    
    doc.fontSize(12)
       .font("Helvetica")
       .text(
         `This project includes ${requirements.join(" and ")} as specified in the detailed schedules.`,
         40,
         yPos,
         { width: doc.page.width - 80 }
       );
    yPos += 60;
  }
  
  // Compliance note
  doc.fontSize(14)
     .font("Helvetica-Bold")
     .text("Compliance & Standards", 40, yPos);
  
  yPos += 25;
  doc.fontSize(12)
     .font("Helvetica")
     .text(
       "All door and frame specifications comply with ANSI/SDI A250.8 standards for hollow metal doors and frames. " +
       "Hardware specifications follow ANSI/BHMA standards. Fire-rated assemblies meet applicable building codes.",
       40,
       yPos,
       { width: doc.page.width - 80, align: "justify" }
     );
}

function generateDoorSchedule(doc: typeof PDFDocument.prototype, project: Project, doorOpenings: DoorOpening[]) {
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .text("Door Schedule", 40, 60);
  
  doc.moveTo(40, 85)
     .lineTo(doc.page.width - 40, 85)
     .stroke();
  
  const tableTop = 100;
  const tableLeft = 40;
  const colWidths = [60, 100, 80, 70, 70, 70, 80];
  const rowHeight = 25;
  
  // Table headers
  const headers = ["Opening", "Location", "Type", "Material", "Width", "Height", "Thickness"];
  let xPos = tableLeft;
  
  doc.fontSize(10)
     .font("Helvetica-Bold");
  
  headers.forEach((header, i) => {
    doc.text(header, xPos, tableTop, { width: colWidths[i], align: "left" });
    xPos += colWidths[i];
  });
  
  // Header underline
  doc.moveTo(tableLeft, tableTop + 15)
     .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15)
     .stroke();
  
  // Table rows
  let yPos = tableTop + 20;
  doc.fontSize(9)
     .font("Helvetica");
  
  doorOpenings.forEach((opening, idx) => {
    if (yPos > doc.page.height - 100) {
      doc.addPage();
      yPos = 60;
    }
    
    xPos = tableLeft;
    const rowData = [
      opening.openingNumber || "-",
      opening.location || "-",
      opening.doorType || "-",
      opening.doorMaterial || "-",
      opening.doorWidth ? `${opening.doorWidth}"` : "-",
      opening.doorHeight ? `${opening.doorHeight}"` : "-",
      opening.doorThickness ? `${opening.doorThickness}"` : "-",
    ];
    
    rowData.forEach((data, i) => {
      doc.text(data, xPos, yPos, { width: colWidths[i], align: "left" });
      xPos += colWidths[i];
    });
    
    yPos += rowHeight;
    
    // Row separator line
    if (idx < doorOpenings.length - 1) {
      doc.moveTo(tableLeft, yPos - 5)
         .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), yPos - 5)
         .strokeOpacity(0.3)
         .stroke()
         .strokeOpacity(1);
    }
  });
  
  // Footer note
  doc.fontSize(9)
     .font("Helvetica-Oblique")
     .text(
       "Note: All dimensions are in inches unless otherwise specified.",
       40,
       yPos + 20,
       { width: doc.page.width - 80 }
     );
}

function generateFrameSchedule(doc: typeof PDFDocument.prototype, project: Project, doorOpenings: DoorOpening[]) {
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .text("Frame Schedule", 40, 60);
  
  doc.moveTo(40, 85)
     .lineTo(doc.page.width - 40, 85)
     .stroke();
  
  const tableTop = 100;
  const tableLeft = 40;
  const colWidths = [60, 100, 80, 80, 70, 70];
  const rowHeight = 25;
  
  // Table headers
  const headers = ["Opening", "Location", "Frame Type", "Material", "Width", "Depth"];
  let xPos = tableLeft;
  
  doc.fontSize(10)
     .font("Helvetica-Bold");
  
  headers.forEach((header, i) => {
    doc.text(header, xPos, tableTop, { width: colWidths[i], align: "left" });
    xPos += colWidths[i];
  });
  
  // Header underline
  doc.moveTo(tableLeft, tableTop + 15)
     .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15)
     .stroke();
  
  // Table rows
  let yPos = tableTop + 20;
  doc.fontSize(9)
     .font("Helvetica");
  
  doorOpenings.forEach((opening, idx) => {
    if (yPos > doc.page.height - 100) {
      doc.addPage();
      yPos = 60;
    }
    
    xPos = tableLeft;
    const rowData = [
      opening.openingNumber || "-",
      opening.location || "-",
      opening.frameType || "-",
      opening.frameMaterial || "-",
      opening.frameWidth ? `${opening.frameWidth}"` : "-",
      opening.frameDepth ? `${opening.frameDepth}"` : "-",
    ];
    
    rowData.forEach((data, i) => {
      doc.text(data, xPos, yPos, { width: colWidths[i], align: "left" });
      xPos += colWidths[i];
    });
    
    yPos += rowHeight;
    
    // Row separator line
    if (idx < doorOpenings.length - 1) {
      doc.moveTo(tableLeft, yPos - 5)
         .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), yPos - 5)
         .strokeOpacity(0.3)
         .stroke()
         .strokeOpacity(1);
    }
  });
  
  // Footer note
  doc.fontSize(9)
     .font("Helvetica-Oblique")
     .text(
       "Note: Frame specifications must comply with ANSI/SDI A250.8 standards.",
       40,
       yPos + 20,
       { width: doc.page.width - 80 }
     );
}

function generateHardwareSchedule(doc: typeof PDFDocument.prototype, project: Project, doorOpenings: DoorOpening[]) {
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .text("Hardware Schedule", 40, 60);
  
  doc.moveTo(40, 85)
     .lineTo(doc.page.width - 40, 85)
     .stroke();
  
  const tableTop = 100;
  const tableLeft = 40;
  const colWidths = [60, 90, 70, 70, 70, 70, 80];
  const rowHeight = 30;
  
  // Table headers
  const headers = ["Opening", "Location", "Lock Type", "Hinge Type", "Count", "Closer", "Exit Device"];
  let xPos = tableLeft;
  
  doc.fontSize(10)
     .font("Helvetica-Bold");
  
  headers.forEach((header, i) => {
    doc.text(header, xPos, tableTop, { width: colWidths[i], align: "left" });
    xPos += colWidths[i];
  });
  
  // Header underline
  doc.moveTo(tableLeft, tableTop + 15)
     .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15)
     .stroke();
  
  // Table rows
  let yPos = tableTop + 20;
  doc.fontSize(9)
     .font("Helvetica");
  
  doorOpenings.forEach((opening, idx) => {
    if (yPos > doc.page.height - 100) {
      doc.addPage();
      yPos = 60;
    }
    
    xPos = tableLeft;
    const rowData = [
      opening.openingNumber || "-",
      opening.location || "-",
      opening.lockType || "-",
      opening.hingeType || "-",
      opening.hingeCount || "-",
      opening.closerType || "-",
      opening.exitDevice || "-",
    ];
    
    rowData.forEach((data, i) => {
      doc.text(data, xPos, yPos, { width: colWidths[i], align: "left" });
      xPos += colWidths[i];
    });
    
    yPos += rowHeight;
    
    // Row separator line
    if (idx < doorOpenings.length - 1) {
      doc.moveTo(tableLeft, yPos - 5)
         .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), yPos - 5)
         .strokeOpacity(0.3)
         .stroke()
         .strokeOpacity(1);
    }
  });
  
  // Automation & Access Control section
  const hasSpecialSystems = doorOpenings.some(
    d => d.automationRequired === "yes" || d.accessControlRequired === "yes"
  );
  
  if (hasSpecialSystems) {
    yPos += 30;
    
    if (yPos > doc.page.height - 150) {
      doc.addPage();
      yPos = 60;
    }
    
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .text("Automation & Access Control", 40, yPos);
    
    yPos += 25;
    
    doc.fontSize(9)
       .font("Helvetica");
    
    doorOpenings.forEach((opening) => {
      if (opening.automationRequired === "yes" || opening.accessControlRequired === "yes") {
        if (yPos > doc.page.height - 80) {
          doc.addPage();
          yPos = 60;
        }
        
        doc.text(
          `${opening.openingNumber} (${opening.location}):`,
          40,
          yPos,
          { continued: true, width: 100 }
        );
        
        const features: string[] = [];
        if (opening.automationRequired === "yes") {
          features.push(`Auto: ${opening.automationType || "Standard"}`);
        }
        if (opening.accessControlRequired === "yes") {
          features.push(`AC: ${opening.accessControlType || "Standard"}`);
        }
        
        doc.text(` ${features.join(", ")}`, { width: 400 });
        yPos += 20;
      }
    });
  }
  
  // Footer note
  doc.fontSize(9)
     .font("Helvetica-Oblique")
     .text(
       "Note: Hardware specifications comply with ANSI/BHMA standards. All electrified hardware requires proper wiring and power supply.",
       40,
       yPos + 20,
       { width: doc.page.width - 80 }
     );
}

function generateOpeningDiagrams(doc: typeof PDFDocument.prototype, project: Project, doorOpenings: DoorOpening[]) {
  // Section Header
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .text("Opening Diagrams", 40, 60);
  
  doc.moveTo(40, 85)
     .lineTo(doc.page.width - 40, 85)
     .stroke();
  
  let yPos = 100;
  const pageMargin = 40;
  const diagramWidth = doc.page.width - (pageMargin * 2);
  const minRequiredHeight = 350; // Minimum height needed for a diagram
  
  doorOpenings.forEach((opening, index) => {
    // Check if we need a new page
    if (yPos > doc.page.height - minRequiredHeight) {
      doc.addPage();
      yPos = 60;
    }
    
    // Draw the diagram and get the height used
    const heightUsed = drawOpeningDiagram(doc, opening, pageMargin, yPos, diagramWidth);
    
    // Add spacing between diagrams
    yPos += heightUsed + 30;
    
    // Add a separator line if not the last opening
    if (index < doorOpenings.length - 1) {
      doc.moveTo(pageMargin, yPos - 15)
         .lineTo(doc.page.width - pageMargin, yPos - 15)
         .strokeColor('#cccccc')
         .lineWidth(0.5)
         .stroke();
    }
  });
  
  // Footer note
  doc.fontSize(9)
     .font("Helvetica-Oblique")
     .fillColor('#666666')
     .text(
       "Note: Diagrams show typical hardware placement based on industry standards. Actual placement may vary based on specific requirements and field conditions.",
       pageMargin,
       doc.page.height - 60,
       { width: doc.page.width - (pageMargin * 2), align: 'center' }
     );
}

function generateInstallerDocumentation(doc: typeof PDFDocument.prototype, project: Project, doorOpenings: DoorOpening[]) {
  // Section Header
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .fillColor('#000000')
     .text("Installer Documentation", 40, 60);
  
  doc.fontSize(12)
     .font("Helvetica")
     .fillColor('#666666')
     .text("Installation Instructions & Field Notes", 40, 90);
  
  doc.moveTo(40, 110)
     .lineTo(doc.page.width - 40, 110)
     .strokeColor('#000000')
     .lineWidth(1)
     .stroke();
  
  let yPos = 130;
  const pageMargin = 40;
  const contentWidth = doc.page.width - (pageMargin * 2);
  
  doorOpenings.forEach((opening, index) => {
    // Check if we need a new page (reserve 400px for content)
    if (yPos > doc.page.height - 400) {
      doc.addPage();
      yPos = 60;
    }
    
    // Opening Header
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .fillColor('#000000')
       .text(`Opening ${opening.openingNumber} - ${opening.location}`, pageMargin, yPos);
    
    yPos += 25;
    
    // Installation Status Box
    doc.fontSize(10)
       .font("Helvetica")
       .fillColor('#666666')
       .text(`Door: ${opening.reuseDoor === 'yes' ? 'Reuse Existing' : 'Install New'}  |  ` +
             `Frame: ${opening.reuseFrame === 'yes' ? 'Reuse Existing' : 'Install New'}  |  ` +
             `Hardware: ${opening.reuseHardware === 'yes' ? 'Reuse Existing' : 'Install New'}`,
             pageMargin, yPos);
    
    yPos += 25;
    
    // Draw separator line
    doc.moveTo(pageMargin, yPos)
       .lineTo(doc.page.width - pageMargin, yPos)
       .strokeColor('#cccccc')
       .lineWidth(0.5)
       .stroke();
    
    yPos += 15;
    
    // Installation Narrative
    if (opening.installationNarrative) {
      if (yPos > doc.page.height - 200) {
        doc.addPage();
        yPos = 60;
      }
      
      doc.fontSize(11)
         .font("Helvetica-Bold")
         .fillColor('#000000')
         .text("Installation Narrative:", pageMargin, yPos);
      
      yPos += 20;
      
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor('#333333')
         .text(opening.installationNarrative, pageMargin, yPos, {
           width: contentWidth,
           align: 'left',
           lineGap: 3
         });
      
      yPos = doc.y + 15;
    }
    
    // Component Notes & Diagram
    if (opening.componentNotes) {
      if (yPos > doc.page.height - 200) {
        doc.addPage();
        yPos = 60;
      }
      
      doc.fontSize(11)
         .font("Helvetica-Bold")
         .fillColor('#000000')
         .text("Component Diagram & Assembly Notes:", pageMargin, yPos);
      
      yPos += 20;
      
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor('#333333')
         .text(opening.componentNotes, pageMargin, yPos, {
           width: contentWidth,
           align: 'left',
           lineGap: 3
         });
      
      yPos = doc.y + 15;
    }
    
    // Wiring Notes & Electrical Diagram
    if (opening.wiringNotes) {
      if (yPos > doc.page.height - 200) {
        doc.addPage();
        yPos = 60;
      }
      
      doc.fontSize(11)
         .font("Helvetica-Bold")
         .fillColor('#000000')
         .text("Wiring Diagram & Electrical Notes:", pageMargin, yPos);
      
      yPos += 20;
      
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor('#333333')
         .text(opening.wiringNotes, pageMargin, yPos, {
           width: contentWidth,
           align: 'left',
           lineGap: 3
         });
      
      yPos = doc.y + 15;
    }
    
    // Field Issues & Tech Insights
    if (opening.fieldIssues) {
      if (yPos > doc.page.height - 200) {
        doc.addPage();
        yPos = 60;
      }
      
      doc.fontSize(11)
         .font("Helvetica-Bold")
         .fillColor('#d97706') // Warning color for issues
         .text("⚠ Field Issues & Installation Considerations:", pageMargin, yPos);
      
      yPos += 20;
      
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor('#92400e') // Dark warning text
         .text(opening.fieldIssues, pageMargin, yPos, {
           width: contentWidth,
           align: 'left',
           lineGap: 3
         });
      
      yPos = doc.y + 15;
    }
    
    // Separator between openings
    if (index < doorOpenings.length - 1) {
      yPos += 15;
      doc.moveTo(pageMargin, yPos)
         .lineTo(doc.page.width - pageMargin, yPos)
         .strokeColor('#000000')
         .lineWidth(1)
         .stroke();
      yPos += 25;
    }
  });
  
  // Footer note
  doc.fontSize(9)
     .font("Helvetica-Oblique")
     .fillColor('#666666')
     .text(
       "This installer documentation is for field technician use only. Follow all safety procedures and building codes during installation.",
       pageMargin,
       doc.page.height - 60,
       { width: doc.page.width - (pageMargin * 2), align: 'center' }
     );
}

function generateCostsSummary(doc: typeof PDFDocument.prototype, project: Project, costs: ProjectCost) {
  const pageMargin = 40;
  let yPos = 60;
  
  // Header
  doc.fontSize(20)
     .font("Helvetica-Bold")
     .fillColor('#000000')
     .text("Project Cost Summary", pageMargin, yPos);
  
  yPos += 30;
  
  doc.fontSize(12)
     .font("Helvetica")
     .text(`Project: ${project.name}`, pageMargin, yPos);
  
  yPos += 40;
  
  // Calculate totals
  const laborCosts = 
    ((costs.pmHours || 0) * (costs.pmHourlyRate || 0)) +
    ((costs.engineeringHours || 0) * (costs.engineeringHourlyRate || 0)) +
    ((costs.surveyHours || 0) * (costs.surveyHourlyRate || 0));
  
  const travelCosts = (costs.travelTime || 0) * (costs.travelRate || 0);
  
  const fixedCosts = 
    (costs.overheadCost || 0) +
    (costs.initialVisitCost || 0) +
    (costs.expeditedCost || 0) +
    (costs.subcontractorCost || 0);
  
  const fees = 
    (costs.materialFuelCharge || 0) +
    (costs.handlingFee || 0) +
    (costs.programmingTestingLabelingFee || 0) +
    (costs.firePreventionInspectionFee || 0) +
    (costs.fireRelabelingInspectionFee || 0) +
    (costs.disposalFee || 0) +
    (costs.consumableAllowance || 0);
  
  const subtotal = laborCosts + travelCosts + fixedCosts + fees;
  const margin = subtotal * ((costs.marginPercent || 0) / 100);
  const surcharge = subtotal * ((costs.surchargePercent || 0) / 100);
  const discount = subtotal * ((costs.discountPercent || 0) / 100);
  const total = subtotal + margin + surcharge - discount;
  
  // Helper function for cost line items
  const addCostLine = (label: string, value: number, isBold: boolean = false) => {
    doc.fontSize(isBold ? 11 : 10)
       .font(isBold ? "Helvetica-Bold" : "Helvetica")
       .text(label, pageMargin, yPos, { continued: true })
       .text(`$${value.toFixed(2)}`, pageMargin, yPos, { align: 'right', width: doc.page.width - (pageMargin * 2) });
    yPos += isBold ? 18 : 15;
  };
  
  const addSection = (title: string) => {
    yPos += 5;
    doc.fontSize(13)
       .font("Helvetica-Bold")
       .fillColor('#2563eb')
       .text(title, pageMargin, yPos);
    yPos += 22;
    doc.fillColor('#000000');
  };
  
  // Labor Hours & Rates
  addSection("Labor Hours & Rates");
  if (costs.pmHours && costs.pmHourlyRate) {
    doc.fontSize(9)
       .font("Helvetica")
       .text(`PM: ${costs.pmHours} hrs × $${costs.pmHourlyRate.toFixed(2)}/hr`, pageMargin + 15, yPos);
    yPos += 12;
  }
  if (costs.engineeringHours && costs.engineeringHourlyRate) {
    doc.fontSize(9)
       .font("Helvetica")
       .text(`Engineering: ${costs.engineeringHours} hrs × $${costs.engineeringHourlyRate.toFixed(2)}/hr`, pageMargin + 15, yPos);
    yPos += 12;
  }
  if (costs.surveyHours && costs.surveyHourlyRate) {
    doc.fontSize(9)
       .font("Helvetica")
       .text(`Survey: ${costs.surveyHours} hrs × $${costs.surveyHourlyRate.toFixed(2)}/hr`, pageMargin + 15, yPos);
    yPos += 12;
  }
  addCostLine("Total Labor Costs:", laborCosts, true);
  
  // Travel
  if (travelCosts > 0) {
    addSection("Travel");
    if (costs.travelTime && costs.travelRate) {
      doc.fontSize(9)
         .font("Helvetica")
         .text(`${costs.travelTime} hrs × $${costs.travelRate.toFixed(2)}/hr`, pageMargin + 15, yPos);
      yPos += 12;
    }
    addCostLine("Total Travel Costs:", travelCosts, true);
  }
  
  // Fixed Costs
  if (fixedCosts > 0) {
    addSection("Fixed Costs");
    if (costs.overheadCost) addCostLine("Overhead:", costs.overheadCost);
    if (costs.initialVisitCost) addCostLine("Initial Visit:", costs.initialVisitCost);
    if (costs.expeditedCost) addCostLine("Expedited:", costs.expeditedCost);
    if (costs.subcontractorCost) addCostLine("Subcontractor:", costs.subcontractorCost);
    addCostLine("Total Fixed Costs:", fixedCosts, true);
  }
  
  // Fees & Charges
  if (fees > 0) {
    addSection("Fees & Charges");
    if (costs.materialFuelCharge) addCostLine("Material/Fuel:", costs.materialFuelCharge);
    if (costs.handlingFee) addCostLine("Handling:", costs.handlingFee);
    if (costs.programmingTestingLabelingFee) addCostLine("Programming/Testing/Labeling:", costs.programmingTestingLabelingFee);
    if (costs.firePreventionInspectionFee) addCostLine("Fire Prevention/Inspection:", costs.firePreventionInspectionFee);
    if (costs.fireRelabelingInspectionFee) addCostLine("Fire Relabeling/Inspection:", costs.fireRelabelingInspectionFee);
    if (costs.disposalFee) addCostLine("Disposal:", costs.disposalFee);
    if (costs.consumableAllowance) addCostLine("Consumables:", costs.consumableAllowance);
    addCostLine("Total Fees & Charges:", fees, true);
  }
  
  // Calculated Estimates (from enhanced calculations)
  const hasCalculatedEstimates = costs.estimatedInstallationHours || costs.totalProjectWeight || 
    costs.hardwareMaterialCost || costs.hardwareWasteCost || 
    costs.customShippingCost != null ||
    costs.freightBaseCost || costs.freightFuelSurcharge || costs.freightExpedited || costs.freightLiftGate || 
    costs.taxAmount;
  if (hasCalculatedEstimates) {
    addSection("Calculated Estimates");
    
    if (costs.estimatedInstallationHours) {
      doc.fontSize(9)
         .font("Helvetica")
         .text(`Estimated installation: ${costs.estimatedInstallationHours.toFixed(1)} hours`, pageMargin + 15, yPos);
      yPos += 12;
    }
    
    if (costs.totalProjectWeight) {
      doc.fontSize(9)
         .font("Helvetica")
         .text(`Total project weight: ${costs.totalProjectWeight.toFixed(0)} lbs`, pageMargin + 15, yPos);
      yPos += 12;
    }
    
    if (costs.hardwareMaterialCost || costs.hardwareWasteCost) {
      const hardwareTotal = (costs.hardwareMaterialCost || 0) + (costs.hardwareWasteCost || 0);
      addCostLine("Hardware Materials:", costs.hardwareMaterialCost || 0);
      if (costs.hardwareWasteCost) {
        addCostLine("Hardware Waste (8%):", costs.hardwareWasteCost);
      }
      addCostLine("Total Hardware Costs:", hardwareTotal, true);
    }
    
    if (costs.customShippingCost != null) {
      yPos += 5;
      doc.fontSize(10)
         .font("Helvetica-Bold")
         .text("Shipping & Freight:", pageMargin + 15, yPos);
      yPos += 15;
      
      addCostLine("Custom Shipping Cost:", costs.customShippingCost, true);
    } else if (costs.freightBaseCost || costs.freightFuelSurcharge || costs.freightExpedited || costs.freightLiftGate) {
      yPos += 5;
      doc.fontSize(10)
         .font("Helvetica-Bold")
         .text("Freight Breakdown:", pageMargin + 15, yPos);
      yPos += 15;
      
      if (costs.freightBaseCost) addCostLine("Base Freight:", costs.freightBaseCost);
      if (costs.freightFuelSurcharge) addCostLine("Fuel Surcharge:", costs.freightFuelSurcharge);
      if (costs.freightExpedited) addCostLine("Expedited Fee:", costs.freightExpedited);
      if (costs.freightLiftGate) addCostLine("Lift Gate Fee:", costs.freightLiftGate);
      
      const totalFreight = (costs.freightBaseCost || 0) + (costs.freightFuelSurcharge || 0) + 
                          (costs.freightExpedited || 0) + (costs.freightLiftGate || 0);
      addCostLine("Total Freight:", totalFreight, true);
    }
    
    if (costs.taxAmount) {
      const taxLabel = costs.taxRate ? `Tax (${costs.taxRate}%):` : "Tax:";
      addCostLine(taxLabel, costs.taxAmount, true);
    }
  }
  
  // International Trade & Landed Cost Summary
  const hasLandedCost = costs.totalTariffsCost || costs.totalAntiDumpingCost || 
    costs.totalOtherDutiesCost || costs.totalLandedCost;
  if (hasLandedCost) {
    addSection("International Trade & Landed Cost");
    
    doc.fontSize(9)
       .font("Helvetica")
       .fillColor('#666666')
       .text("Customs duties and freight allocation for imported hardware items", pageMargin + 15, yPos);
    yPos += 18;
    doc.fillColor('#000000');
    
    if (costs.totalTariffsCost) addCostLine("Import Tariffs:", costs.totalTariffsCost);
    if (costs.totalAntiDumpingCost) addCostLine("Anti-Dumping Duties:", costs.totalAntiDumpingCost);
    if (costs.totalOtherDutiesCost) addCostLine("Other Customs Duties:", costs.totalOtherDutiesCost);
    if (costs.totalLandedCost) {
      yPos += 5;
      addCostLine("Total Landed Cost:", costs.totalLandedCost, true);
    }
    
    // Default settings if configured
    if (costs.defaultIncoterm) {
      yPos += 8;
      doc.fontSize(9)
         .font("Helvetica")
         .fillColor('#666666')
         .text(`Default Incoterm: ${costs.defaultIncoterm}`, pageMargin + 15, yPos);
      yPos += 12;
      doc.fillColor('#000000');
    }
  }
  
  // Summary
  yPos += 20;
  doc.moveTo(pageMargin, yPos)
     .lineTo(doc.page.width - pageMargin, yPos)
     .strokeColor('#000000')
     .lineWidth(2)
     .stroke();
  yPos += 15;
  
  doc.fontSize(14)
     .font("Helvetica-Bold")
     .fillColor('#000000')
     .text("Cost Summary", pageMargin, yPos);
  yPos += 25;
  
  addCostLine("Subtotal:", subtotal, true);
  
  if (margin > 0) {
    addCostLine(`Margin (${costs.marginPercent || 0}%):`, margin);
  }
  if (surcharge > 0) {
    addCostLine(`Surcharge (${costs.surchargePercent || 0}%):`, surcharge);
  }
  if (discount > 0) {
    doc.fontSize(10)
       .font("Helvetica")
       .fillColor('#dc2626')
       .text(`Discount (${costs.discountPercent || 0}%):`, pageMargin, yPos, { continued: true })
       .text(`-$${discount.toFixed(2)}`, pageMargin, yPos, { align: 'right', width: doc.page.width - (pageMargin * 2) });
    yPos += 15;
    doc.fillColor('#000000');
  }
  
  // Total with highlight
  yPos += 10;
  doc.rect(pageMargin - 5, yPos - 5, doc.page.width - (pageMargin * 2) + 10, 35)
     .fillAndStroke('#f0fdf4', '#16a34a')
     .lineWidth(2);
  
  doc.fontSize(16)
     .font("Helvetica-Bold")
     .fillColor('#166534')
     .text("TOTAL PROJECT COST:", pageMargin, yPos + 8, { continued: true })
     .text(`$${total.toFixed(2)}`, pageMargin, yPos + 8, { align: 'right', width: doc.page.width - (pageMargin * 2) });
  
  // Notes
  if (costs.notes) {
    yPos += 60;
    doc.fontSize(11)
       .font("Helvetica-Bold")
       .fillColor('#000000')
       .text("Notes:", pageMargin, yPos);
    yPos += 18;
    doc.fontSize(10)
       .font("Helvetica")
       .text(costs.notes, pageMargin, yPos, { width: doc.page.width - (pageMargin * 2) });
  }
  
  if (costs.consumableNotes) {
    yPos = doc.y + 15;
    doc.fontSize(11)
       .font("Helvetica-Bold")
       .fillColor('#000000')
       .text("Consumable Details:", pageMargin, yPos);
    yPos += 18;
    doc.fontSize(10)
       .font("Helvetica")
       .text(costs.consumableNotes, pageMargin, yPos, { width: doc.page.width - (pageMargin * 2) });
  }
}

interface POPDFGenerationOptions {
  purchaseOrder: PurchaseOrder;
  lineItems: PurchaseOrderLineItem[];
  project?: Project;
  vendorContact?: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}

export async function generatePurchaseOrderPDF(options: POPDFGenerationOptions): Promise<Buffer> {
  const { purchaseOrder, lineItems, project, vendorContact } = options;
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: 40,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    generatePOPage(doc, purchaseOrder, lineItems, project, vendorContact);
    
    doc.end();
  });
}

function generatePOPage(
  doc: typeof PDFDocument.prototype, 
  po: PurchaseOrder, 
  lineItems: PurchaseOrderLineItem[],
  project?: Project,
  vendorContact?: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  }
) {
  const pageWidth = doc.page.width;
  const pageMargin = 40;
  
  // Header
  doc.fontSize(28)
     .font("Helvetica-Bold")
     .fillColor('#1e3a8a')
     .text("PURCHASE ORDER", pageMargin, 40);
  
  // PO Number and Status
  doc.fontSize(14)
     .font("Helvetica-Bold")
     .fillColor('#000000')
     .text(`PO #: ${po.poNumber}`, pageMargin, 80);
  
  const statusColor = po.status === 'draft' ? '#6b7280' : 
                      po.status === 'sent' ? '#2563eb' : 
                      po.status === 'ordered' ? '#16a34a' : 
                      po.status === 'received' ? '#059669' : '#dc2626';
  
  doc.fontSize(12)
     .font("Helvetica")
     .fillColor(statusColor)
     .text(`Status: ${po.status.toUpperCase()}`, pageMargin, 100);
  
  // Date
  doc.fontSize(10)
     .font("Helvetica")
     .fillColor('#000000')
     .text(`Date: ${new Date(po.createdAt).toLocaleDateString()}`, pageMargin, 120);
  
  // Horizontal line
  doc.moveTo(pageMargin, 145)
     .lineTo(pageWidth - pageMargin, 145)
     .strokeColor('#cbd5e1')
     .lineWidth(1)
     .stroke();
  
  // Two-column layout for addresses
  let yPos = 160;
  const colWidth = (pageWidth - (pageMargin * 2) - 20) / 2;
  
  // Vendor Information (Left Column)
  doc.fontSize(12)
     .font("Helvetica-Bold")
     .fillColor('#1e3a8a')
     .text("VENDOR:", pageMargin, yPos);
  yPos += 20;
  
  doc.fontSize(10)
     .font("Helvetica-Bold")
     .fillColor('#000000')
     .text(vendorContact?.name || 'N/A', pageMargin, yPos);
  yPos += 15;
  
  if (vendorContact?.email) {
    doc.fontSize(9)
       .font("Helvetica")
       .text(`Email: ${vendorContact.email}`, pageMargin, yPos);
    yPos += 12;
  }
  
  if (vendorContact?.phone) {
    doc.text(`Phone: ${vendorContact.phone}`, pageMargin, yPos);
    yPos += 12;
  }
  
  if (vendorContact?.address) {
    doc.text(vendorContact.address, pageMargin, yPos, { width: colWidth });
    yPos = doc.y + 5;
  }
  
  // Ship To Information (Right Column)
  let yPosRight = 160;
  const rightColX = pageMargin + colWidth + 20;
  
  doc.fontSize(12)
     .font("Helvetica-Bold")
     .fillColor('#1e3a8a')
     .text("SHIP TO:", rightColX, yPosRight);
  yPosRight += 20;
  
  // Build ship-to address
  const shipToLines: string[] = [];
  if (po.shipToName) shipToLines.push(po.shipToName);
  if (po.shipToAddress) shipToLines.push(po.shipToAddress);
  const cityStateZip = [po.shipToCity, po.shipToState, po.shipToZip].filter(Boolean).join(', ');
  if (cityStateZip) shipToLines.push(cityStateZip);
  
  if (shipToLines.length > 0) {
    doc.fontSize(10)
       .font("Helvetica")
       .fillColor('#000000')
       .text(shipToLines.join('\n'), rightColX, yPosRight, { width: colWidth });
    yPosRight = doc.y + 5;
  }
  
  if (po.shipToAttention) {
    doc.fontSize(9)
       .text(`Attn: ${po.shipToAttention}`, rightColX, yPosRight);
    yPosRight += 12;
  }
  
  // Project Information
  yPos = Math.max(yPos, yPosRight) + 15;
  
  if (project) {
    doc.fontSize(12)
       .font("Helvetica-Bold")
       .fillColor('#1e3a8a')
       .text("PROJECT:", pageMargin, yPos);
    yPos += 20;
    
    doc.fontSize(10)
       .font("Helvetica")
       .fillColor('#000000')
       .text(`${project.name} - ${project.location}`, pageMargin, yPos, { width: pageWidth - (pageMargin * 2) });
    yPos += 20;
  }
  
  // Payment Terms
  if (po.paymentTerms || po.requestedDeliveryDate) {
    yPos += 5;
    doc.fontSize(10)
       .font("Helvetica-Bold")
       .fillColor('#000000');
    
    if (po.paymentTerms) {
      doc.text(`Payment Terms: `, pageMargin, yPos, { continued: true })
         .font("Helvetica")
         .text(po.paymentTerms);
      yPos += 15;
    }
    
    if (po.requestedDeliveryDate) {
      doc.font("Helvetica-Bold")
         .text(`Expected Delivery: `, pageMargin, yPos, { continued: true })
         .font("Helvetica")
         .text(new Date(po.requestedDeliveryDate).toLocaleDateString());
      yPos += 15;
    }
  }
  
  // Line Items Table
  yPos += 15;
  
  // Table header
  const tableTop = yPos;
  const colWidths = {
    item: 35,
    description: 210,
    quantity: 50,
    unit: 50,
    unitPrice: 65,
    lineTotal: 70,
  };
  
  let xPos = pageMargin;
  
  // Header background
  doc.rect(pageMargin, tableTop, pageWidth - (pageMargin * 2), 25)
     .fillAndStroke('#1e3a8a', '#1e3a8a');
  
  doc.fontSize(9)
     .font("Helvetica-Bold")
     .fillColor('#ffffff');
  
  doc.text("#", xPos + 5, tableTop + 8, { width: colWidths.item });
  xPos += colWidths.item;
  
  doc.text("Description", xPos, tableTop + 8, { width: colWidths.description });
  xPos += colWidths.description;
  
  doc.text("Qty", xPos, tableTop + 8, { width: colWidths.quantity, align: 'center' });
  xPos += colWidths.quantity;
  
  doc.text("Unit", xPos, tableTop + 8, { width: colWidths.unit, align: 'center' });
  xPos += colWidths.unit;
  
  doc.text("Unit Price", xPos, tableTop + 8, { width: colWidths.unitPrice, align: 'right' });
  xPos += colWidths.unitPrice;
  
  doc.text("Total", xPos, tableTop + 8, { width: colWidths.lineTotal, align: 'right' });
  
  yPos = tableTop + 25;
  
  // Line Items
  doc.fillColor('#000000');
  
  lineItems.forEach((item, index) => {
    // Check for page break
    if (yPos > doc.page.height - 150) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    const rowHeight = Math.max(30, doc.heightOfString(item.description || '', { width: colWidths.description }));
    
    // Alternating row background
    if (index % 2 === 0) {
      doc.rect(pageMargin, yPos, pageWidth - (pageMargin * 2), rowHeight)
         .fillAndStroke('#f8fafc', '#e2e8f0')
         .lineWidth(0.5);
    } else {
      doc.rect(pageMargin, yPos, pageWidth - (pageMargin * 2), rowHeight)
         .strokeColor('#e2e8f0')
         .lineWidth(0.5)
         .stroke();
    }
    
    xPos = pageMargin;
    const textYPos = yPos + 8;
    
    doc.fontSize(9)
       .font("Helvetica")
       .fillColor('#000000');
    
    doc.text(`${index + 1}`, xPos + 5, textYPos, { width: colWidths.item });
    xPos += colWidths.item;
    
    doc.text(item.description || '', xPos, textYPos, { width: colWidths.description });
    xPos += colWidths.description;
    
    doc.text(item.quantity?.toString() || '0', xPos, textYPos, { width: colWidths.quantity, align: 'center' });
    xPos += colWidths.quantity;
    
    doc.text(item.unitOfMeasure || 'each', xPos, textYPos, { width: colWidths.unit, align: 'center' });
    xPos += colWidths.unit;
    
    doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, xPos, textYPos, { width: colWidths.unitPrice, align: 'right' });
    xPos += colWidths.unitPrice;
    
    doc.text(`$${(item.lineTotal || 0).toFixed(2)}`, xPos, textYPos, { width: colWidths.lineTotal, align: 'right' });
    
    yPos += rowHeight;
  });
  
  // Totals Section
  yPos += 20;
  const totalsX = pageWidth - pageMargin - 180;
  
  doc.fontSize(10)
     .font("Helvetica")
     .fillColor('#000000');
  
  // Subtotal
  doc.text("Subtotal:", totalsX, yPos, { width: 100, align: 'right' });
  doc.text(`$${(po.subtotal || 0).toFixed(2)}`, totalsX + 100, yPos, { width: 80, align: 'right' });
  yPos += 18;
  
  // Shipping
  if (po.shippingCost && po.shippingCost > 0) {
    doc.text("Shipping:", totalsX, yPos, { width: 100, align: 'right' });
    doc.text(`$${po.shippingCost.toFixed(2)}`, totalsX + 100, yPos, { width: 80, align: 'right' });
    yPos += 18;
  }
  
  // Tax
  if (po.taxAmount && po.taxAmount > 0) {
    const taxLabel = po.taxRate ? `Tax (${po.taxRate}%):` : "Tax:";
    doc.text(taxLabel, totalsX, yPos, { width: 100, align: 'right' });
    doc.text(`$${po.taxAmount.toFixed(2)}`, totalsX + 100, yPos, { width: 80, align: 'right' });
    yPos += 18;
  }
  
  // Total (highlighted)
  yPos += 5;
  doc.rect(totalsX - 5, yPos - 5, 185, 30)
     .fillAndStroke('#f0fdf4', '#16a34a')
     .lineWidth(2);
  
  doc.fontSize(12)
     .font("Helvetica-Bold")
     .fillColor('#166534')
     .text("TOTAL:", totalsX, yPos + 6, { width: 100, align: 'right' })
     .text(`$${(po.totalAmount || 0).toFixed(2)}`, totalsX + 100, yPos + 6, { width: 80, align: 'right' });
  
  // Notes
  if (po.notes) {
    yPos += 50;
    
    if (yPos > doc.page.height - 100) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    doc.fontSize(11)
       .font("Helvetica-Bold")
       .fillColor('#000000')
       .text("Notes:", pageMargin, yPos);
    yPos += 18;
    
    doc.fontSize(10)
       .font("Helvetica")
       .text(po.notes, pageMargin, yPos, { width: pageWidth - (pageMargin * 2) });
  }
  
  // Footer
  const footerY = doc.page.height - 60;
  doc.fontSize(8)
     .font("Helvetica")
     .fillColor('#6b7280')
     .text(
       "Generated by DoorSurvey Pro - Commercial Door Estimating Tool",
       pageMargin,
       footerY,
       { align: "center", width: pageWidth - (pageMargin * 2) }
     );
  
  doc.fontSize(8)
     .text(
       `Generated on: ${new Date().toLocaleString()}`,
       pageMargin,
       footerY + 12,
       { align: "center", width: pageWidth - (pageMargin * 2) }
     );
}

function generateDisclaimersSection(doc: typeof PDFDocument.prototype, disclaimers: Disclaimer[]) {
  const pageWidth = doc.page.width;
  const pageMargin = 40;
  
  // Header
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .fillColor("#2563eb")
     .text("Disclaimers & Addendums", pageMargin, pageMargin, { align: "center" });
  
  let yPos = pageMargin + 40;
  
  disclaimers.forEach((disclaimer, index) => {
    // Check if we need a new page
    if (yPos > doc.page.height - 150) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    // Disclaimer title
    doc.fontSize(12)
       .font("Helvetica-Bold")
       .fillColor("#000000")
       .text(disclaimer.title, pageMargin, yPos, { width: pageWidth - (pageMargin * 2), underline: true });
    yPos += 18;
    
    // Type badge
    const typeLabel = disclaimer.type.toUpperCase();
    doc.fontSize(9)
       .font("Helvetica")
       .fillColor("#666666")
       .text(`[${typeLabel}]`, pageMargin, yPos);
    yPos += 18;
    
    // Content
    doc.fontSize(10)
       .font("Helvetica")
       .fillColor("#000000")
       .text(disclaimer.content, pageMargin + 20, yPos, { 
         width: pageWidth - (pageMargin * 2) - 20,
         align: "left"
       });
    
    // Calculate how much space the content took
    const contentHeight = doc.heightOfString(disclaimer.content, { 
      width: pageWidth - (pageMargin * 2) - 20 
    });
    yPos += contentHeight + 25;
  });
  
  // Footer
  const footerY = doc.page.height - 60;
  doc.fontSize(8)
     .font("Helvetica")
     .fillColor("#6b7280")
     .text(
       "These disclaimers and addendums are an integral part of this proposal.",
       pageMargin,
       footerY,
       { align: "center", width: pageWidth - (pageMargin * 2) }
     );
}

// Helper functions for scope of work
function hasScopeDisclaimers(project: Project): boolean {
  return !!(
    project.scopePowerByOthers === "yes" ||
    project.scopeDemolitionByOthers === "yes" ||
    project.scopePatchingByOthers === "yes" ||
    project.scopePaintingByOthers === "yes" ||
    project.scopeAsbestosAbatementByOthers === "yes" ||
    project.scopeStructuralWorkByOthers === "yes" ||
    project.scopeFireAlarmByOthers === "yes" ||
    project.scopeAccessControlByOthers === "yes"
  );
}

function hasScopeItems(project: Project): boolean {
  return !!(
    (project.scopeItemsToRemain && project.scopeItemsToRemain.length > 0) ||
    (project.scopeItemsToRemove && project.scopeItemsToRemove.length > 0)
  );
}

// Generate Scope of Work section
function generateScopeOfWork(doc: typeof PDFDocument.prototype, project: Project) {
  const pageMargin = 40;
  const pageWidth = doc.page.width;
  
  // Header
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .fillColor("#2563eb")
     .text("Scope of Work", pageMargin, pageMargin, { align: "center" });
  
  let yPos = pageMargin + 40;
  
  // Scope Description
  if (project.scopeOfWork) {
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .fillColor("#000000")
       .text("Description", pageMargin, yPos);
    yPos += 25;
    
    doc.fontSize(10)
       .font("Helvetica")
       .fillColor("#333333")
       .text(project.scopeOfWork, pageMargin, yPos, { 
         width: pageWidth - (pageMargin * 2),
         align: "left"
       });
    
    const descriptionHeight = doc.heightOfString(project.scopeOfWork, { 
      width: pageWidth - (pageMargin * 2) 
    });
    yPos += descriptionHeight + 30;
  }
  
  // Work by Others Disclaimers
  if (hasScopeDisclaimers(project)) {
    // Check if we need a new page
    if (yPos > doc.page.height - 250) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .fillColor("#000000")
       .text("Work by Others (Not Included)", pageMargin, yPos);
    yPos += 20;
    
    doc.fontSize(9)
       .font("Helvetica")
       .fillColor("#666666")
       .text("The following items will be performed by others and are NOT included in this scope:", pageMargin, yPos, {
         width: pageWidth - (pageMargin * 2)
       });
    yPos += 25;
    
    const disclaimers = [
      { key: "scopePowerByOthers", label: "Electrical power work" },
      { key: "scopeDemolitionByOthers", label: "Demolition work" },
      { key: "scopePatchingByOthers", label: "Wall/ceiling patching" },
      { key: "scopePaintingByOthers", label: "Painting/finishing" },
      { key: "scopeAsbestosAbatementByOthers", label: "Asbestos abatement" },
      { key: "scopeStructuralWorkByOthers", label: "Structural modifications" },
      { key: "scopeFireAlarmByOthers", label: "Fire alarm integration" },
      { key: "scopeAccessControlByOthers", label: "Access control system" },
    ];
    
    disclaimers.forEach(({ key, label }) => {
      if (project[key as keyof Project] === "yes") {
        doc.fontSize(10)
           .font("Helvetica")
           .fillColor("#000000")
           .text(`• ${label}`, pageMargin + 20, yPos);
        yPos += 18;
      }
    });
    
    yPos += 15;
  }
  
  // Items to Remain
  if (project.scopeItemsToRemain && project.scopeItemsToRemain.length > 0) {
    // Check if we need a new page
    if (yPos > doc.page.height - 200) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .fillColor("#000000")
       .text("Items to Remain Intact", pageMargin, yPos);
    yPos += 20;
    
    doc.fontSize(9)
       .font("Helvetica")
       .fillColor("#666666")
       .text("The following existing items will remain in place and will not be touched:", pageMargin, yPos, {
         width: pageWidth - (pageMargin * 2)
       });
    yPos += 25;
    
    project.scopeItemsToRemain.forEach((item) => {
      // Check if we need a new page
      if (yPos > doc.page.height - 100) {
        doc.addPage();
        yPos = pageMargin;
      }
      
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor("#000000")
         .text(`• ${item}`, pageMargin + 20, yPos, {
           width: pageWidth - (pageMargin * 2) - 20
         });
      yPos += 18;
    });
    
    yPos += 15;
  }
  
  // Items to Remove (Reusable)
  if (project.scopeItemsToRemove && project.scopeItemsToRemove.length > 0) {
    // Check if we need a new page
    if (yPos > doc.page.height - 200) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .fillColor("#000000")
       .text("Items to Remove (Reusable)", pageMargin, yPos);
    yPos += 20;
    
    doc.fontSize(9)
       .font("Helvetica")
       .fillColor("#666666")
       .text("The following items will be removed but can be reused elsewhere:", pageMargin, yPos, {
         width: pageWidth - (pageMargin * 2)
       });
    yPos += 25;
    
    project.scopeItemsToRemove.forEach((item) => {
      // Check if we need a new page
      if (yPos > doc.page.height - 100) {
        doc.addPage();
        yPos = pageMargin;
      }
      
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor("#000000")
         .text(`• ${item}`, pageMargin + 20, yPos, {
           width: pageWidth - (pageMargin * 2) - 20
         });
      yPos += 18;
    });
    
    yPos += 15;
  }
  
  // Additional Disclaimers
  if (project.scopeAdditionalDisclaimers) {
    // Check if we need a new page
    if (yPos > doc.page.height - 150) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    doc.fontSize(14)
       .font("Helvetica-Bold")
       .fillColor("#000000")
       .text("Additional Disclaimers", pageMargin, yPos);
    yPos += 25;
    
    doc.fontSize(10)
       .font("Helvetica")
       .fillColor("#333333")
       .text(project.scopeAdditionalDisclaimers, pageMargin, yPos, { 
         width: pageWidth - (pageMargin * 2),
         align: "left"
       });
  }
}

function generateSignaturePage(doc: typeof PDFDocument.prototype, organization: Organization) {
  const pageMargin = 40;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  // Header
  doc.fontSize(18)
     .font("Helvetica-Bold")
     .fillColor("#000000")
     .text("Prepared By", pageMargin, 80);
  
  // Horizontal line
  doc.moveTo(pageMargin, 110)
     .lineTo(pageWidth - pageMargin, 110)
     .stroke();
  
  let yPos = 140;
  
  // Company name
  doc.fontSize(14)
     .font("Helvetica-Bold")
     .fillColor("#000000")
     .text(organization.name, pageMargin, yPos);
  yPos += 30;
  
  // Signature name and title
  if (organization.signatureName) {
    doc.fontSize(12)
       .font("Helvetica-Bold")
       .fillColor("#333333")
       .text(organization.signatureName, pageMargin, yPos);
    yPos += 18;
    
    if (organization.signatureTitle) {
      doc.fontSize(11)
         .font("Helvetica")
         .fillColor("#666666")
         .text(organization.signatureTitle, pageMargin, yPos);
      yPos += 25;
    } else {
      yPos += 20;
    }
  }
  
  // Contact information
  if (organization.signatureEmail || organization.signaturePhone) {
    doc.fontSize(11)
       .font("Helvetica")
       .fillColor("#000000")
       .text("Contact Information:", pageMargin, yPos);
    yPos += 20;
    
    if (organization.signatureEmail) {
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor("#333333")
         .text(`Email: ${organization.signatureEmail}`, pageMargin + 20, yPos);
      yPos += 15;
    }
    
    if (organization.signaturePhone) {
      doc.fontSize(10)
         .font("Helvetica")
         .fillColor("#333333")
         .text(`Phone: ${organization.signaturePhone}`, pageMargin + 20, yPos);
      yPos += 15;
    }
  }
  
  // Signature line
  yPos += 40;
  doc.fontSize(9)
     .font("Helvetica")
     .fillColor("#666666")
     .text("Signature:", pageMargin, yPos);
  yPos += 5;
  
  doc.moveTo(pageMargin + 70, yPos)
     .lineTo(pageWidth - pageMargin - 200, yPos)
     .stroke();
  
  yPos += 25;
  doc.fontSize(9)
     .font("Helvetica")
     .fillColor("#666666")
     .text("Date:", pageMargin, yPos);
  yPos += 5;
  
  doc.moveTo(pageMargin + 70, yPos)
     .lineTo(pageWidth - pageMargin - 200, yPos)
     .stroke();
  
  // Footer with date
  const date = new Date().toLocaleDateString();
  doc.fontSize(9)
     .font("Helvetica")
     .fillColor("#999999")
     .text(
       `Document prepared on ${date}`,
       pageMargin,
       pageHeight - 60,
       { align: "center", width: pageWidth - (pageMargin * 2) }
     );
}

function generatePhotoDocumentation(
  doc: typeof PDFDocument.prototype, 
  project: Project, 
  photos: Photo[],
  doorOpenings: DoorOpening[]
) {
  const pageWidth = doc.page.width;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#1e3a5f")
    .text("PHOTO DOCUMENTATION", margin, margin);
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").fillColor("#666666")
    .text(`Project: ${project.name} | ${photos.length} photo(s) captured`);
  doc.moveDown(1);
  
  const openingMap = new Map<string, DoorOpening>();
  doorOpenings.forEach(o => openingMap.set(o.id, o));
  
  const photosByOpening = new Map<string, Photo[]>();
  photos.forEach(p => {
    const key = p.openingId;
    if (!photosByOpening.has(key)) photosByOpening.set(key, []);
    photosByOpening.get(key)!.push(p);
  });
  
  for (const [openingId, openingPhotos] of photosByOpening) {
    const opening = openingMap.get(openingId);
    const openingLabel = opening ? `Opening ${opening.openingNumber} - ${opening.location}` : `Opening ${openingId}`;
    
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }
    
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#333333")
      .text(openingLabel, margin);
    doc.moveDown(0.3);
    
    openingPhotos.forEach((photo, idx) => {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }
      
      const photoData = photo as any;
      
      doc.fontSize(9).font("Helvetica").fillColor("#555555");
      
      const typeLabel = photo.photoType || "general";
      const dateStr = photo.capturedAt ? new Date(photo.capturedAt).toLocaleDateString() : "N/A";
      
      doc.text(`  ${idx + 1}. ${photo.filename}`, margin + 10);
      doc.text(`     Type: ${typeLabel} | Captured: ${dateStr}`, margin + 10);
      
      if (photoData.gpsLat && photoData.gpsLng) {
        const lat = Number(photoData.gpsLat).toFixed(6);
        const lng = Number(photoData.gpsLng).toFixed(6);
        const accuracy = photoData.gpsAccuracy ? ` (accuracy: ${Math.round(photoData.gpsAccuracy)}m)` : "";
        doc.text(`     GPS: ${lat}, ${lng}${accuracy}`, margin + 10);
      }
      
      if (photo.annotations && Array.isArray(photo.annotations)) {
        const annots = photo.annotations as any[];
        if (annots.length > 0) {
          const types = new Map<string, number>();
          annots.forEach(a => {
            const t = a.type || "unknown";
            types.set(t, (types.get(t) || 0) + 1);
          });
          const typeSummary = Array.from(types.entries()).map(([t, c]) => `${c} ${t}`).join(", ");
          doc.text(`     Annotations: ${typeSummary}`, margin + 10);
          
          const complianceAnnots = annots.filter(a => a.type === "compliance");
          if (complianceAnnots.length > 0) {
            complianceAnnots.forEach(ca => {
              const severity = ca.complianceSeverity || "warning";
              const standard = ca.complianceStandard || "CODE";
              const note = ca.text ? ` - ${ca.text}` : "";
              const severityIcon = severity === "pass" ? "[PASS]" : severity === "violation" ? "[VIOLATION]" : "[WARNING]";
              doc.text(`       ${severityIcon} ${standard}${note}`, margin + 10);
            });
          }
        }
      }
      
      doc.moveDown(0.3);
    });
    
    doc.moveDown(0.5);
  }
}

function generateComplianceSummary(
  doc: typeof PDFDocument.prototype, 
  project: Project, 
  photos: Photo[]
) {
  const margin = 40;
  
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#1e3a5f")
    .text("COMPLIANCE SUMMARY", margin, margin);
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").fillColor("#666666")
    .text(`Project: ${project.name} | Compliance flags from photo annotations`);
  doc.moveDown(1);
  
  const allCompliance: { photoFilename: string; standard: string; severity: string; note: string }[] = [];
  
  photos.forEach(photo => {
    if (photo.annotations && Array.isArray(photo.annotations)) {
      (photo.annotations as any[]).forEach(a => {
        if (a.type === "compliance") {
          allCompliance.push({
            photoFilename: photo.filename,
            standard: a.complianceStandard || "CODE",
            severity: a.complianceSeverity || "warning",
            note: a.text || "",
          });
        }
      });
    }
  });
  
  if (allCompliance.length === 0) return;
  
  const violations = allCompliance.filter(c => c.severity === "violation").length;
  const warnings = allCompliance.filter(c => c.severity === "warning").length;
  const passes = allCompliance.filter(c => c.severity === "pass").length;
  
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#333333")
    .text("Overview");
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor("#555555");
  
  if (violations > 0) {
    doc.fillColor("#dc2626").text(`  Violations: ${violations}`, margin);
  }
  if (warnings > 0) {
    doc.fillColor("#d97706").text(`  Warnings: ${warnings}`, margin);
  }
  if (passes > 0) {
    doc.fillColor("#16a34a").text(`  Passing: ${passes}`, margin);
  }
  doc.fillColor("#555555");
  doc.text(`  Total flags: ${allCompliance.length}`, margin);
  doc.moveDown(1);
  
  const byStandard = new Map<string, typeof allCompliance>();
  allCompliance.forEach(c => {
    if (!byStandard.has(c.standard)) byStandard.set(c.standard, []);
    byStandard.get(c.standard)!.push(c);
  });
  
  for (const [standard, flags] of byStandard) {
    if (doc.y > doc.page.height - 120) {
      doc.addPage();
    }
    
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333")
      .text(standard, margin);
    doc.moveDown(0.2);
    
    flags.forEach(flag => {
      if (doc.y > doc.page.height - 60) {
        doc.addPage();
      }
      
      const severityLabel = flag.severity === "violation" ? "VIOLATION" : flag.severity === "pass" ? "PASS" : "WARNING";
      const color = flag.severity === "violation" ? "#dc2626" : flag.severity === "pass" ? "#16a34a" : "#d97706";
      
      doc.fontSize(9).font("Helvetica-Bold").fillColor(color)
        .text(`  [${severityLabel}]`, margin, undefined, { continued: true });
      doc.font("Helvetica").fillColor("#555555")
        .text(` ${flag.note || "No note"} (Photo: ${flag.photoFilename})`);
    });
    
    doc.moveDown(0.5);
  }
}
