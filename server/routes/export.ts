import { Router } from "express";
import { db } from "../db";
import { exportHistory, insertExportHistorySchema, projects, doorOpenings, organizations } from "@shared/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getOrganizationContext } from "../clerkAuth";
import { generateProjectExport } from "../services/exportService";
import PDFDocument from "pdfkit";
import { z } from "zod";

const exportRequestSchema = z.object({
  format: z.enum(["pdf", "html"]).optional(),
  templateType: z.string().optional(),
  profileId: z.string().optional(),
  brandingId: z.string().optional(),
  alternativeId: z.string().optional(),
  language: z.string().optional(),
});

const router = Router();

// Generate and download project export
router.post("/api/projects/:projectId/export", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId, userId } = context;
    const { projectId } = req.params;
    
    const validated = exportRequestSchema.parse(req.body);
    
    const { buffer, filename, mimetype } = await generateProjectExport({
      organizationId,
      userId,
      projectId,
      exportProfileId: validated.profileId ?? null,
      projectAlternativeId: validated.alternativeId ?? null,
      format: validated.format ?? "pdf",
      templateType: validated.templateType ?? null,
      language: validated.language ?? "en",
    });
    
    res.setHeader("Content-Type", mimetype);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// Quick Report - generates a project status summary PDF (available to all tiers)
router.get("/api/projects/:projectId/quick-report", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const { projectId } = req.params;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    const openings = await db
      .select()
      .from(doorOpenings)
      .where(eq(doorOpenings.projectId, projectId));

    const totalOpenings = openings.length;
    const completedOpenings = openings.filter((o: any) => o.status === "completed").length;
    const inProgressOpenings = openings.filter((o: any) => o.status === "in_progress" || o.status === "active").length;
    const pendingOpenings = totalOpenings - completedOpenings - inProgressOpenings;

    const scannedOpenings = openings.filter((o: any) => {
      const scanOpen = o.scanStatusOpen === "completed" || o.scanStatusOpen === true;
      const scanClosedA = o.scanStatusClosedA === "completed" || o.scanStatusClosedA === true;
      const scanClosedB = o.scanStatusClosedB === "completed" || o.scanStatusClosedB === true;
      return scanOpen && scanClosedA && scanClosedB;
    }).length;

    const partiallyScanned = openings.filter((o: any) => {
      const scanOpen = o.scanStatusOpen === "completed" || o.scanStatusOpen === true;
      const scanClosedA = o.scanStatusClosedA === "completed" || o.scanStatusClosedA === true;
      const scanClosedB = o.scanStatusClosedB === "completed" || o.scanStatusClosedB === true;
      const anyDone = scanOpen || scanClosedA || scanClosedB;
      const allDone = scanOpen && scanClosedA && scanClosedB;
      return anyDone && !allDone;
    }).length;

    const doorTypes: Record<string, number> = {};
    openings.forEach((o: any) => {
      const dt = o.doorType || "Unspecified";
      doorTypes[dt] = (doorTypes[dt] || 0) + 1;
    });

    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const pdfDone = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const primaryColor = "#1e40af";
    const textColor = "#1f2937";
    const mutedColor = "#6b7280";
    const borderColor = "#e5e7eb";

    doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
    doc.fillColor("#ffffff").fontSize(22).text("Project Status Report", 50, 30);
    doc.fontSize(11).text(org?.name || "DoorSurvey Pro", 50, 58);
    doc.fontSize(9).text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 50, 76);

    let y = 120;

    doc.fillColor(textColor).fontSize(16).text("Project Details", 50, y);
    y += 25;

    const drawField = (label: string, value: string, xPos: number, yPos: number) => {
      doc.fillColor(mutedColor).fontSize(9).text(label, xPos, yPos);
      doc.fillColor(textColor).fontSize(11).text(value || "N/A", xPos, yPos + 13);
    };

    drawField("Project Name", project.name, 50, y);
    drawField("Location", project.location, 300, y);
    y += 40;
    drawField("Building Type", (project.buildingType || "N/A").charAt(0).toUpperCase() + (project.buildingType || "N/A").slice(1), 50, y);
    drawField("Status", (project.status || "N/A").charAt(0).toUpperCase() + (project.status || "N/A").slice(1), 300, y);
    y += 40;

    if (project.applicableStandards && project.applicableStandards.length > 0) {
      drawField("Applicable Standards", project.applicableStandards.join(", "), 50, y);
      y += 40;
    }

    doc.moveTo(50, y).lineTo(562, y).strokeColor(borderColor).stroke();
    y += 15;

    doc.fillColor(textColor).fontSize(16).text("Survey Progress", 50, y);
    y += 25;

    const drawStatBox = (label: string, value: number | string, xPos: number, yPos: number, width: number) => {
      doc.rect(xPos, yPos, width, 55).fillAndStroke("#f9fafb", borderColor);
      doc.fillColor(primaryColor).fontSize(22).text(String(value), xPos + 10, yPos + 8, { width: width - 20, align: "center" });
      doc.fillColor(mutedColor).fontSize(9).text(label, xPos + 10, yPos + 35, { width: width - 20, align: "center" });
    };

    const boxWidth = 120;
    const boxGap = 8;
    drawStatBox("Total Openings", totalOpenings, 50, y, boxWidth);
    drawStatBox("Completed", completedOpenings, 50 + boxWidth + boxGap, y, boxWidth);
    drawStatBox("In Progress", inProgressOpenings, 50 + (boxWidth + boxGap) * 2, y, boxWidth);
    drawStatBox("Pending", pendingOpenings, 50 + (boxWidth + boxGap) * 3, y, boxWidth);
    y += 75;

    doc.fillColor(textColor).fontSize(16).text("Triple-Scan LiDAR Status", 50, y);
    y += 25;

    const scanBoxWidth = 165;
    drawStatBox("All 3 Scans Complete", scannedOpenings, 50, y, scanBoxWidth);
    drawStatBox("Partially Scanned", partiallyScanned, 50 + scanBoxWidth + boxGap, y, scanBoxWidth);
    drawStatBox("Not Scanned", Math.max(0, totalOpenings - scannedOpenings - partiallyScanned), 50 + (scanBoxWidth + boxGap) * 2, y, scanBoxWidth);
    y += 75;

    const verifiedCount = openings.filter((o: any) => o.complianceVerified === "yes").length;
    const withIssues = openings.filter((o: any) => o.complianceIssues && Array.isArray(o.complianceIssues) && o.complianceIssues.length > 0).length;
    const notChecked = totalOpenings - verifiedCount;

    doc.moveTo(50, y).lineTo(562, y).strokeColor(borderColor).stroke();
    y += 15;
    doc.fillColor(textColor).fontSize(16).text("Compliance Status", 50, y);
    y += 25;

    const compBoxWidth = 165;
    drawStatBox("Verified", verifiedCount, 50, y, compBoxWidth);
    drawStatBox("With Issues", withIssues, 50 + compBoxWidth + boxGap, y, compBoxWidth);
    drawStatBox("Not Checked", notChecked, 50 + (compBoxWidth + boxGap) * 2, y, compBoxWidth);
    y += 75;

    if (Object.keys(doorTypes).length > 0) {
      doc.moveTo(50, y).lineTo(562, y).strokeColor(borderColor).stroke();
      y += 15;
      doc.fillColor(textColor).fontSize(16).text("Door Types Breakdown", 50, y);
      y += 25;

      Object.entries(doorTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([type, cnt]) => {
          const pct = totalOpenings > 0 ? Math.round((cnt / totalOpenings) * 100) : 0;
          const barWidth = Math.max(2, (pct / 100) * 300);
          doc.rect(50, y, barWidth, 14).fill(primaryColor);
          doc.fillColor(textColor).fontSize(9)
            .text(`${type.charAt(0).toUpperCase() + type.slice(1)}`, 360, y + 2)
            .text(`${cnt} (${pct}%)`, 490, y + 2, { width: 70, align: "right" });
          y += 22;
        });
    }

    if (openings.length > 0 && y < 620) {
      y += 15;
      doc.moveTo(50, y).lineTo(562, y).strokeColor(borderColor).stroke();
      y += 15;
      doc.fillColor(textColor).fontSize(16).text("Openings Summary", 50, y);
      y += 22;

      doc.rect(50, y, 512, 18).fill("#f3f4f6");
      doc.fillColor(mutedColor).fontSize(8);
      doc.text("#", 55, y + 5, { width: 30 });
      doc.text("Location", 90, y + 5, { width: 150 });
      doc.text("Door Type", 240, y + 5, { width: 100 });
      doc.text("Size", 340, y + 5, { width: 80 });
      doc.text("Status", 420, y + 5, { width: 80 });
      doc.text("Scans", 500, y + 5, { width: 60 });
      y += 20;

      openings.slice(0, Math.min(openings.length, 15)).forEach((opening: any, idx: number) => {
        if (y > 720) return;

        if (idx % 2 === 1) {
          doc.rect(50, y - 2, 512, 18).fill("#fafafa");
        }

        const scanCount = [
          opening.scanStatusOpen === "completed" || opening.scanStatusOpen === true,
          opening.scanStatusClosedA === "completed" || opening.scanStatusClosedA === true,
          opening.scanStatusClosedB === "completed" || opening.scanStatusClosedB === true,
        ].filter(Boolean).length;

        doc.fillColor(textColor).fontSize(8);
        doc.text(String(opening.openingNumber || idx + 1), 55, y + 2, { width: 30 });
        doc.text((opening.location || "N/A").substring(0, 25), 90, y + 2, { width: 150 });
        doc.text((opening.doorType || "N/A").substring(0, 15), 240, y + 2, { width: 100 });
        const size = opening.doorWidth && opening.doorHeight
          ? `${opening.doorWidth}" x ${opening.doorHeight}"`
          : "N/A";
        doc.text(size, 340, y + 2, { width: 80 });
        doc.text((opening.status || "pending").substring(0, 12), 420, y + 2, { width: 80 });
        doc.text(`${scanCount}/3`, 510, y + 2, { width: 50 });
        y += 18;
      });

      if (openings.length > 15) {
        y += 5;
        doc.fillColor(mutedColor).fontSize(8).text(`... and ${openings.length - 15} more openings`, 50, y);
      }
    }

    doc.end();
    const buffer = await pdfDone;

    const safeProjectName = project.name.replace(/[^a-z0-9]/gi, "_");
    const filename = `${safeProjectName}-status-report.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// Get export history for a project
router.get("/api/projects/:projectId/export-history", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    const { projectId } = req.params;
    
    const rows = await db
      .select()
      .from(exportHistory)
      .where(and(eq(exportHistory.projectId, projectId), eq(exportHistory.organizationId, organizationId)))
      .orderBy(desc(exportHistory.createdAt))
      .limit(50);
    
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get all export history for the organization
router.get("/api/export-history", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;
    
    const rows = await db
      .select()
      .from(exportHistory)
      .where(eq(exportHistory.organizationId, organizationId))
      .orderBy(desc(exportHistory.createdAt))
      .limit(100);
    
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
