import { db } from "../db";
import { 
  exportProfiles, 
  exportHistory, 
  exportBranding, 
  projectAlternatives, 
  projects,
  doorOpenings,
  organizations
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { logger } from "../logger";

interface GenerateExportParams {
  organizationId: string;
  userId: string;
  projectId: string;
  exportProfileId?: string | null;
  projectAlternativeId?: string | null;
  format?: "pdf" | "html";
  templateType?: string | null;
  language?: string | null;
}

interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

/**
 * Main export service - generates professional project exports with customizable templates
 */
export async function generateProjectExport(params: GenerateExportParams): Promise<ExportResult> {
  const {
    organizationId,
    userId,
    projectId,
    exportProfileId,
    projectAlternativeId,
    format = "pdf",
    templateType,
    language = "en",
  } = params;

  try {
    // Fetch project data
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));

    if (!project) {
      throw new Error("Project not found");
    }

    // Fetch organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    // Fetch export profile if specified
    let profile: any = null;
    if (exportProfileId) {
      const [row] = await db
        .select()
        .from(exportProfiles)
        .where(eq(exportProfiles.id, exportProfileId));
      profile = row ?? null;
    }

    // Fetch branding if specified in profile
    let branding: any = null;
    if (profile?.exportBrandingId) {
      const [row] = await db
        .select()
        .from(exportBranding)
        .where(eq(exportBranding.id, profile.exportBrandingId));
      branding = row ?? null;
    }

    // Fetch alternative label if specified
    let alternativeLabel: string | null = null;
    if (projectAlternativeId) {
      const [alternative] = await db
        .select()
        .from(projectAlternatives)
        .where(eq(projectAlternatives.id, projectAlternativeId));
      alternativeLabel = alternative?.label ?? null;
    }

    // Fetch door openings for the project
    const openings = await db
      .select()
      .from(doorOpenings)
      .where(eq(doorOpenings.projectId, projectId));

    // Generate export based on format
    let buffer: Buffer;
    let mimetype: string;

    if (format === "pdf") {
      buffer = await generatePDF({
        project,
        organization,
        openings,
        profile,
        branding,
        alternativeLabel,
        templateType: templateType || profile?.templateType || "proposal",
        language,
      });
      mimetype = "application/pdf";
    } else {
      buffer = Buffer.from(
        generateHTML({
          project,
          organization,
          openings,
          profile,
          branding,
          alternativeLabel,
          templateType: (templateType || profile?.templateType || "proposal") as string,
          language: (language || "en") as string,
        }),
        "utf-8"
      );
      mimetype = "text/html";
    }

    const timestamp = Date.now();
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.${format === "pdf" ? "pdf" : "html"}`;

    // Record export in history
    await db.insert(exportHistory).values({
      organizationId,
      userId,
      projectId,
      projectAlternativeId: projectAlternativeId ?? null,
      exportProfileId: exportProfileId ?? null,
      format,
      templateType: templateType || profile?.templateType || null,
      language,
      deliveredVia: "download",
      targetEmail: null,
    });

    logger.info("Project export generated successfully", {
      projectId,
      format,
      templateType: templateType || profile?.templateType,
      fileSize: buffer.length,
    });

    return { buffer, filename, mimetype };
  } catch (error) {
    logger.error("Error generating project export", {
      projectId,
      format,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate PDF export using PDFKit
 */
async function generatePDF(params: {
  project: any;
  organization: any;
  openings: any[];
  profile: any;
  branding: any;
  alternativeLabel: string | null;
  templateType: string;
  language: string;
}): Promise<Buffer> {
  const { project, organization, openings, profile, branding, alternativeLabel, templateType } = params;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `${templateType.toUpperCase()} - ${project.name}`,
          Author: organization?.name || "DoorSurvey Pro",
          Subject: `Project ${project.name}`,
          Creator: "DoorSurvey Pro",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Apply branding colors
      const primaryColor = (branding?.primaryColor || "#2563eb") as string;
      const secondaryColor = (branding?.secondaryColor || "#64748b") as string;
      const accentColor = (branding?.accentColor || "#0ea5e9") as string;

      // Header section
      doc.fontSize(24).fillColor(primaryColor).text(templateType.toUpperCase(), { align: "center" });
      doc.moveDown(0.5);

      // Organization name
      doc.fontSize(16).fillColor(secondaryColor).text(organization?.name || "DoorSurvey Pro", { align: "center" });
      doc.moveDown(1);

      // Header text from branding
      if (branding?.headerText) {
        doc.fontSize(10).fillColor(secondaryColor).text(branding.headerText, { align: "center" });
        doc.moveDown(1);
      }

      // Project information section
      doc.fontSize(14).fillColor(primaryColor).text("Project Information");
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke(secondaryColor);
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor("#000000");
      doc.text(`Project Name: ${project.name}`);
      doc.text(`Location: ${project.location}`);
      doc.text(`Building Type: ${project.buildingType || "Not specified"}`);
      doc.text(`Status: ${project.status}`);
      if (alternativeLabel) {
        doc.fillColor(accentColor).text(`Option: ${alternativeLabel}`).fillColor("#000000");
      }
      doc.moveDown(1);

      // Scope of work
      if (project.scopeOfWork && profile?.showLineItems !== false) {
        doc.fontSize(14).fillColor(primaryColor).text("Scope of Work");
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke(secondaryColor);
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#000000").text(project.scopeOfWork);
        doc.moveDown(1);
      }

      // Door openings summary
      if (openings.length > 0 && profile?.showLineItems !== false) {
        doc.fontSize(14).fillColor(primaryColor).text("Door Openings Summary");
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke(secondaryColor);
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor("#000000");
        doc.text(`Total Openings: ${openings.length}`);
        doc.moveDown(0.5);

        // Group openings by type if specified
        if (profile?.groupItemsBy === "type") {
          const groupedByType = openings.reduce((acc: any, opening: any) => {
            const type = opening.doorType || "Unspecified";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});

          doc.text("Breakdown by Type:");
          Object.entries(groupedByType).forEach(([type, count]) => {
            doc.text(`  • ${type}: ${count}`, { indent: 20 });
          });
        } else {
          // List individual openings
          openings.slice(0, 10).forEach((opening: any) => {
            doc.text(
              `  • ${opening.openingNumber} - ${opening.location} ${opening.doorType ? `(${opening.doorType})` : ""}`,
              { indent: 20 }
            );
          });

          if (openings.length > 10) {
            doc.text(`  ... and ${openings.length - 10} more openings`, { indent: 20 });
          }
        }
        doc.moveDown(1);
      }

      // Template-specific sections
      if (templateType === "installer_packet") {
        doc.addPage();
        doc.fontSize(14).fillColor(primaryColor).text("Installation Instructions");
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke(secondaryColor);
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#000000");
        doc.text("1. Verify all door openings match the specifications in this document");
        doc.text("2. Check that all required hardware is present and accounted for");
        doc.text("3. Follow applicable building codes and standards");
        doc.text("4. Coordinate with other trades as necessary");
        doc.moveDown(1);
      }

      if (templateType === "submittal") {
        doc.addPage();
        doc.fontSize(14).fillColor(primaryColor).text("Technical Specifications");
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke(secondaryColor);
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#000000");
        doc.text("This submittal package includes specifications for all door openings,");
        doc.text("hardware components, and compliance requirements for the project.");
        doc.moveDown(1);
      }

      // Compliance summary if enabled
      if (profile?.includeComplianceSummary && project.applicableStandards?.length > 0) {
        doc.fontSize(14).fillColor(primaryColor).text("Compliance Summary");
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke(secondaryColor);
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#000000");
        doc.text("Applicable Standards:");
        project.applicableStandards.forEach((standard: string) => {
          doc.text(`  • ${standard}`, { indent: 20 });
        });
        doc.moveDown(1);
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        // Footer text
        const footerY = 750;
        doc.fontSize(8).fillColor(secondaryColor);

        if (branding?.footerText) {
          doc.text(branding.footerText, 50, footerY, { align: "left", width: 300 });
        }

        // Page number
        doc.text(`Page ${i + 1} of ${pageCount}`, 50, footerY, { align: "right", width: 512 });

        // Watermark if specified
        if (branding?.watermarkText) {
          doc.save();
          doc.translate(306, 400);
          doc.rotate(-45, { origin: [0, 0] });
          doc
            .fontSize(60)
            .fillColor(secondaryColor)
            .opacity(0.1)
            .text(branding.watermarkText, -200, 0, {
              align: "center",
              width: 400,
            })
            .opacity(1);
          doc.restore();
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate HTML export
 */
function generateHTML(params: {
  project: any;
  organization: any;
  openings: any[];
  profile: any;
  branding: any;
  alternativeLabel: string | null;
  templateType: string;
  language: string;
}): string {
  const { project, organization, openings, profile, branding, alternativeLabel, templateType } = params;

  const primaryColor = branding?.primaryColor || "#2563eb";
  const secondaryColor = branding?.secondaryColor || "#64748b";
  const accentColor = branding?.accentColor || "#0ea5e9";

  return `
<!DOCTYPE html>
<html lang="${params.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateType.toUpperCase()} - ${project.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    header { 
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${primaryColor};
    }
    h1 { 
      color: ${primaryColor};
      font-size: 32px;
      margin-bottom: 10px;
    }
    h2 { 
      color: ${primaryColor};
      font-size: 20px;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${secondaryColor};
    }
    .org-name { 
      color: ${secondaryColor};
      font-size: 18px;
      margin-bottom: 10px;
    }
    .header-text { 
      color: ${secondaryColor};
      font-size: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 10px;
      margin: 20px 0;
    }
    .info-label {
      font-weight: 600;
      color: ${secondaryColor};
    }
    .alternative { 
      background: ${accentColor}15;
      color: ${accentColor};
      padding: 5px 10px;
      border-radius: 4px;
      display: inline-block;
      font-weight: 600;
    }
    ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    li { margin: 8px 0; }
    footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid ${secondaryColor};
      text-align: center;
      color: ${secondaryColor};
      font-size: 12px;
    }
    @media print {
      body { max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${templateType.replace(/_/g, " ").toUpperCase()}</h1>
    <div class="org-name">${organization?.name || "DoorSurvey Pro"}</div>
    ${branding?.headerText ? `<div class="header-text">${branding.headerText}</div>` : ""}
  </header>

  <main>
    <h2>Project Information</h2>
    <div class="info-grid">
      <div class="info-label">Project Name:</div>
      <div>${project.name}</div>
      <div class="info-label">Location:</div>
      <div>${project.location}</div>
      <div class="info-label">Building Type:</div>
      <div>${project.buildingType || "Not specified"}</div>
      <div class="info-label">Status:</div>
      <div>${project.status}</div>
      ${alternativeLabel ? `
        <div class="info-label">Option:</div>
        <div><span class="alternative">${alternativeLabel}</span></div>
      ` : ""}
    </div>

    ${
      project.scopeOfWork && profile?.showLineItems !== false
        ? `
      <h2>Scope of Work</h2>
      <p>${project.scopeOfWork}</p>
    `
        : ""
    }

    ${
      openings.length > 0 && profile?.showLineItems !== false
        ? `
      <h2>Door Openings Summary</h2>
      <p><strong>Total Openings:</strong> ${openings.length}</p>
      <ul>
        ${openings
          .slice(0, 10)
          .map(
            (opening: any) =>
              `<li>${opening.openingNumber} - ${opening.location} ${opening.doorType ? `(${opening.doorType})` : ""}</li>`
          )
          .join("")}
        ${openings.length > 10 ? `<li>... and ${openings.length - 10} more openings</li>` : ""}
      </ul>
    `
        : ""
    }

    ${
      profile?.includeComplianceSummary && project.applicableStandards?.length > 0
        ? `
      <h2>Compliance Summary</h2>
      <p><strong>Applicable Standards:</strong></p>
      <ul>
        ${project.applicableStandards.map((standard: string) => `<li>${standard}</li>`).join("")}
      </ul>
    `
        : ""
    }
  </main>

  <footer>
    ${branding?.footerText || `Generated by DoorSurvey Pro on ${new Date().toLocaleDateString()}`}
  </footer>
</body>
</html>
  `.trim();
}
