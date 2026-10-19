import { Router } from "express";
import { requireAuth as isAuthenticated, getOrganizationContext } from "../clerkAuth";
import { db } from "../db";
import { projects, doorOpenings } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../logger";
import { doorSurveyPayloadSchema } from "@shared/schemas/doorSurvey.schema";
import { runHybridCompliance } from "../compliance";
import { searchRelevantDocsForOpening } from "../rag/ragQuery";
import type { DoorSurveyPayload } from "@shared/types/doorSurvey";

const router = Router();

function mmToInches(mm: number): string {
  const inches = mm / 25.4;
  return `${inches.toFixed(2)}"`;
}

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ message: "Unauthorized - no organization context" });
    }

    const result = doorSurveyPayloadSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("Door survey validation failed", { errors: result.error.errors });
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: result.error.errors 
      });
    }

    const { project: projectData, opening: openingData } = result.data;

    const transactionResult = await db.transaction(async (tx) => {
      let projectId: string;

      if (projectData.id) {
        const existingProject = await tx.query.projects.findFirst({
          where: and(
            eq(projects.id, projectData.id),
            eq(projects.organizationId, orgContext.organizationId)
          ),
        });
        
        if (!existingProject) {
          throw new Error("Project not found");
        }
        projectId = existingProject.id;
      } else {
        const [newProject] = await tx.insert(projects).values({
          organizationId: orgContext.organizationId,
          name: projectData.name,
          location: projectData.location,
          customerId: projectData.customerId || null,
          buildingType: projectData.buildingType.toLowerCase().replace(/\s+/g, '_'),
          quoteType: projectData.quoteType,
          applicableStandards: projectData.standards,
          status: "active",
        }).returning();
        
        projectId = newProject.id;
        logger.info("Created new project from door survey", { projectId, name: projectData.name });
      }

      const surveyMetadata = {
        measurements: openingData.measurements,
        handing: openingData.handing,
        doorLeaf: {
          ...openingData.doorLeaf,
        },
        hardware: {
          hinges: openingData.hardware.hinges,
          lockFunction: openingData.hardware.lockFunction,
          lockset: openingData.hardware.lockset,
          exitDevice: openingData.hardware.exitDevice,
          closer: openingData.hardware.closer,
          accessories: openingData.hardware.accessories,
          electrifiedHardware: openingData.hardware.electrifiedHardware,
          electronicSecurity: openingData.hardware.electronicSecurity || [],
        },
        compliance: {
          standardsChecked: openingData.compliance.standardsChecked,
          passes: openingData.compliance.passes,
          issues: openingData.compliance.issues,
          notes: openingData.compliance.notes,
        },
        evidence: openingData.evidence,
        engineeringReview: openingData.engineeringReview,
        quoteSummary: openingData.quoteSummary,
        div28Assessment: openingData.div28Assessment,
      };

      const notesContent = [
        openingData.frame.notes,
        openingData.compliance.notes,
        openingData.engineeringReview.notes,
      ].filter(Boolean).join("\n\n");

      const surveyDataJson = JSON.stringify(surveyMetadata);

      const photoUrls = openingData.evidence.photos.map(p => p.url).filter(Boolean);

      const complianceIssuesJson = JSON.stringify(openingData.compliance.issues);

      const [newOpening] = await tx.insert(doorOpenings).values({
        projectId,
        openingNumber: openingData.doorTag,
        location: `${openingData.floor} - ${openingData.spaceName}`,
        roomNumber: openingData.doorTag,
        roomName: openingData.spaceName,
        floor: openingData.floor,
        doorType: openingData.openingType,
        doorWidth: mmToInches(openingData.measurements.roughWidthMm),
        doorHeight: mmToInches(openingData.measurements.roughHeightMm),
        doorThickness: mmToInches(openingData.measurements.doorThicknessMm),
        doorCoreType: openingData.doorLeaf.coreType,
        doorFireRating: openingData.doorLeaf.fireRatingMinutes > 0 
          ? `${openingData.doorLeaf.fireRatingMinutes} min` 
          : "non-rated",
        doorMaterial: openingData.doorLeaf.leafType,
        frameMaterial: openingData.frame.material.replace(/_/g, ' '),
        frameDepth: openingData.frame.profile,
        frameType: openingData.frame.material,
        frameCondition: String(openingData.frame.conditionScore),
        lockType: openingData.hardware.lockFunction,
        closerType: openingData.hardware.closer || undefined,
        exitDevice: openingData.hardware.exitDevice || undefined,
        visionLitePresent: openingData.doorLeaf.hasVisionLite ? "yes" : "no",
        visionLiteWidth: openingData.doorLeaf.visionLiteDescription || undefined,
        electrifiedHardware: openingData.hardware.electrifiedHardware.length > 0 ? "yes" : "no",
        conditionPhotos: photoUrls.length > 0 ? photoUrls : undefined,
        fieldIssues: complianceIssuesJson,
        componentNotes: surveyDataJson,
        notes: notesContent || undefined,
        openingStatus: "not-installed",
        doorCondition: String(openingData.frame.conditionScore),
      }).returning();

      logger.info("Created door opening from survey", { 
        openingId: newOpening.id, 
        projectId, 
        doorTag: openingData.doorTag 
      });

      return {
        projectId,
        openingId: newOpening.id,
      };
    });

    return res.status(201).json({
      projectId: transactionResult.projectId,
      openingId: transactionResult.openingId,
      message: "Door survey saved successfully",
    });
  } catch (error) {
    logger.error("Failed to save door survey", { error });
    
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ message: "Project not found" });
    }
    
    return res.status(500).json({ 
      message: "Failed to save door survey",
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

router.get("/workflow", isAuthenticated, async (_req, res) => {
  try {
    const workflowPath = require.resolve("../../shared/workflows/doorSurveyWorkflow.json");
    const workflow = require(workflowPath);
    return res.json(workflow);
  } catch (error) {
    logger.error("Failed to load door survey workflow", { error });
    return res.status(500).json({ message: "Failed to load workflow" });
  }
});

router.post("/compliance/hybrid", isAuthenticated, async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ message: "Unauthorized - no organization context" });
    }

    const result = doorSurveyPayloadSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("Hybrid compliance validation failed", { errors: result.error.errors });
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: result.error.errors 
      });
    }

    const payload = result.data as DoorSurveyPayload;

    const retrievedDocs = await searchRelevantDocsForOpening(payload);

    const complianceResult = await runHybridCompliance(payload, retrievedDocs);

    logger.info("Hybrid compliance check completed", { 
      doorTag: payload.opening.doorTag,
      passes: complianceResult.compliance.passes,
      issueCount: complianceResult.compliance.issues.length,
      aiEnabled: complianceResult.aiEnabled,
    });

    return res.json(complianceResult);
  } catch (error) {
    logger.error("Hybrid compliance check failed", { error });
    return res.status(500).json({ 
      message: "Failed to run hybrid compliance check",
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

router.post("/export/pdf", isAuthenticated, async (req, res) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ message: "Unauthorized - no organization context" });
    }

    const result = doorSurveyPayloadSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("PDF export validation failed", { errors: result.error.errors });
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: result.error.errors 
      });
    }

    const payload = result.data as DoorSurveyPayload;
    const PDFDocument = (await import("pdfkit")).default;

    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(20).font("Helvetica-Bold").text("Door Survey Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").text("Project Details");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Project Name: ${payload.project.name || "N/A"}`);
    doc.text(`Location: ${payload.project.location || "N/A"}`);
    doc.text(`Customer ID: ${payload.project.customerId || "N/A"}`);
    doc.text(`Building Type: ${payload.project.buildingType || "N/A"}`);
    doc.text(`Standards: ${payload.project.standards.join(", ")}`);
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").text("Opening Details");
    doc.fontSize(10).font("Helvetica");
    doc.text(`Door Tag: ${payload.opening.doorTag || "N/A"}`);
    doc.text(`Floor: ${payload.opening.floor}`);
    doc.text(`Space Name: ${payload.opening.spaceName || "N/A"}`);
    doc.text(`Opening Type: ${payload.opening.openingType}`);
    doc.text(`Handing: ${payload.opening.handing}`);
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").text("Measurements");
    doc.fontSize(10).font("Helvetica");
    const m = payload.opening.measurements;
    doc.text(`Rough Width: ${m.roughWidthMm} mm`);
    doc.text(`Rough Height: ${m.roughHeightMm} mm`);
    doc.text(`Clear Width: ${m.clearWidthMm} mm`);
    doc.text(`Head Height: ${m.headHeightMm} mm`);
    doc.text(`Door Thickness: ${m.doorThicknessMm} mm`);
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").text("Door Panel");
    doc.fontSize(10).font("Helvetica");
    const dl = payload.opening.doorLeaf;
    doc.text(`Type: ${dl.leafType}`);
    doc.text(`Core: ${dl.coreType}`);
    doc.text(`Fire Rating: ${dl.fireRatingMinutes > 0 ? `${dl.fireRatingMinutes} min` : "Non-Rated"}`);
    doc.text(`Manufacturer: ${dl.manufacturer || "N/A"}`);
    doc.text(`Model: ${dl.model || "N/A"}`);
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").text("Frame");
    doc.fontSize(10).font("Helvetica");
    const f = payload.opening.frame;
    doc.text(`Material: ${f.material}`);
    doc.text(`Profile: ${f.profile}`);
    doc.text(`Anchor Type: ${f.anchorType}`);
    doc.text(`Condition Score: ${f.conditionScore}/5`);
    if (f.fireLabelPresent) {
      doc.text(`Fire Label: ${f.fireLabelRating} min`);
    }
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").text("Hardware");
    doc.fontSize(10).font("Helvetica");
    const hw = payload.opening.hardware;
    doc.text(`Lock Function: ${hw.lockFunction}`);
    doc.text(`Lockset: ${hw.lockset || "N/A"}`);
    if (hw.exitDevice) doc.text(`Exit Device: ${hw.exitDevice}`);
    if (hw.closer) doc.text(`Closer: ${hw.closer}`);
    if (hw.hinges && hw.hinges.length > 0) {
      doc.text(`Hinges: ${hw.hinges.length} set(s)`);
    }
    if (hw.electronicSecurity && hw.electronicSecurity.length > 0) {
      doc.text(`Electronic Security: ${hw.electronicSecurity.length} device(s)`);
      hw.electronicSecurity.forEach((dev, i) => {
        doc.text(`  ${i + 1}. ${dev.type} - ${dev.description} (Qty: ${dev.qty})`);
      });
    }
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").text("Compliance");
    doc.fontSize(10).font("Helvetica");
    const c = payload.opening.compliance;
    doc.text(`Status: ${c.passes ? "PASSED" : "ISSUES FOUND"}`);
    doc.text(`Standards Checked: ${c.standardsChecked.join(", ")}`);
    if (c.issues && c.issues.length > 0) {
      doc.text(`Issues:`);
      c.issues.forEach((issue, i) => {
        doc.text(`  ${i + 1}. [${issue.severity}] ${issue.standard} - ${issue.message}`);
      });
    }
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").text("Quote Summary");
    doc.fontSize(10).font("Helvetica");
    const qs = payload.opening.quoteSummary;
    doc.text(`Material Cost: $${qs.materialCost.toLocaleString()}`);
    doc.text(`Labor Cost: $${qs.laborCost.toLocaleString()}`);
    doc.text(`Shipping Cost: $${qs.shippingCost.toLocaleString()}`);
    doc.text(`Margin: ${qs.marginPercent}%`);
    doc.text(`Total Price: $${qs.totalPrice.toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, { align: "right" });

    doc.end();

    await new Promise<void>((resolve) => doc.on("end", resolve));

    const pdfBuffer = Buffer.concat(chunks);
    const filename = `door-survey-${payload.opening.doorTag || "report"}-${new Date().toISOString().split("T")[0]}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

    logger.info("Door survey PDF exported", { 
      doorTag: payload.opening.doorTag,
      organizationId: orgContext.organizationId,
    });
  } catch (error) {
    logger.error("Door survey PDF export failed", { error });
    return res.status(500).json({ 
      message: "Failed to export PDF",
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;
