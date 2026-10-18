import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { Project, DoorOpening, HardwareItem } from "@shared/schema";

interface HardwareScheduleOptions {
  project: Project;
  openings: DoorOpening[];
  hardware: HardwareItem[];
}

export async function generateHardwareScheduleExcel(options: HardwareScheduleOptions): Promise<Buffer> {
  const { project, openings, hardware } = options;
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Hardware Schedule");

  // Set column widths
  worksheet.columns = [
    { header: "Opening #", key: "openingNumber", width: 12 },
    { header: "Location", key: "location", width: 25 },
    { header: "Room #", key: "roomNumber", width: 10 },
    { header: "Room Name", key: "roomName", width: 20 },
    { header: "Hardware Type", key: "itemType", width: 15 },
    { header: "Manufacturer", key: "manufacturer", width: 18 },
    { header: "Model", key: "model", width: 20 },
    { header: "Finish", key: "finish", width: 15 },
    { header: "Function", key: "functionCode", width: 12 },
    { header: "Keying", key: "keying", width: 15 },
    { header: "Qty", key: "quantity", width: 8 },
    { header: "List Price", key: "listPrice", width: 12 },
    { header: "Net Price", key: "netPrice", width: 12 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  // Add title
  worksheet.mergeCells("A1:N1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `Door Hardware Schedule - ${project.name}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // Add project info
  worksheet.mergeCells("A2:N2");
  const infoCell = worksheet.getCell("A2");
  infoCell.value = `Project Location: ${project.location} | Building Type: ${project.buildingType} | Date: ${new Date().toLocaleDateString()}`;
  infoCell.font = { italic: true, size: 10 };
  infoCell.alignment = { horizontal: "center" };

  // Skip row 3 for spacing
  worksheet.getRow(3).height = 10;

  // Style the header row (row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0066CC" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;

  // Build data rows
  const scheduleData = hardware.map(hw => {
    const opening = openings.find(o => o.id === hw.openingId);
    // Calculate net price from list price and discount
    const listPrice = hw.listPrice || 0;
    const discount = hw.discountPercent || 0;
    const netPrice = listPrice * (1 - discount / 100);
    // Build keying summary from keying fields
    const keyingParts = [hw.keyBlank, hw.keySymbol].filter(Boolean);
    const keying = keyingParts.length > 0 ? keyingParts.join(" / ") : "";
    
    return {
      openingNumber: opening?.openingNumber || "",
      location: opening?.location || "",
      roomNumber: opening?.roomNumber || "",
      roomName: opening?.roomName || "",
      itemType: hw.itemType || "",
      manufacturer: hw.manufacturer || "",
      model: hw.model || "",
      finish: hw.finish || "",
      functionCode: hw.model || "", // Use model as function code fallback
      keying,
      quantity: Number(hw.quantity) || 1,
      listPrice,
      netPrice,
      notes: hw.notes || "",
    };
  });

  // Add data rows starting from row 5
  scheduleData.forEach((row, index) => {
    const excelRow = worksheet.addRow(row);
    
    // Format price columns as currency
    excelRow.getCell("listPrice").numFmt = "$#,##0.00";
    excelRow.getCell("netPrice").numFmt = "$#,##0.00";
    excelRow.getCell("quantity").numFmt = "#,##0";
    
    // Alternate row colors
    if (index % 2 === 0) {
      excelRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F5F5" },
      };
    }
    
    // Apply borders
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    });
  });

  // Add summary row
  const summaryRowNumber = worksheet.rowCount + 2;
  worksheet.mergeCells(`A${summaryRowNumber}:J${summaryRowNumber}`);
  const summaryCell = worksheet.getCell(`A${summaryRowNumber}`);
  summaryCell.value = `Total Hardware Items: ${hardware.length}`;
  summaryCell.font = { bold: true, size: 12 };
  summaryCell.alignment = { horizontal: "right" };

  // Calculate totals
  const totalListPrice = scheduleData.reduce((sum, row) => sum + (Number(row.listPrice) * Number(row.quantity)), 0);
  const totalNetPrice = scheduleData.reduce((sum, row) => sum + (Number(row.netPrice) * Number(row.quantity)), 0);
  
  const listPriceCell = worksheet.getCell(`K${summaryRowNumber}`);
  listPriceCell.value = totalListPrice;
  listPriceCell.numFmt = "$#,##0.00";
  listPriceCell.font = { bold: true };
  
  const netPriceCell = worksheet.getCell(`L${summaryRowNumber}`);
  netPriceCell.value = totalNetPrice;
  netPriceCell.numFmt = "$#,##0.00";
  netPriceCell.font = { bold: true };

  // Add footer
  const footerRowNumber = summaryRowNumber + 2;
  worksheet.mergeCells(`A${footerRowNumber}:N${footerRowNumber}`);
  const footerCell = worksheet.getCell(`A${footerRowNumber}`);
  footerCell.value = "Generated by DoorSurvey Pro - Commercial Door Estimating Tool";
  footerCell.font = { italic: true, size: 9, color: { argb: "FF666666" } };
  footerCell.alignment = { horizontal: "center" };

  // Generate buffer
  return await workbook.xlsx.writeBuffer() as Buffer;
}

export async function generateHardwareSchedulePDF(options: HardwareScheduleOptions): Promise<Buffer> {
  const { project, openings, hardware } = options;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      layout: "landscape",
      margin: 30,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Title
    doc.fontSize(18)
       .font("Helvetica-Bold")
       .text("Door Hardware Schedule", 30, 30, { align: "center" });

    // Project info
    doc.fontSize(12)
       .font("Helvetica")
       .text(`${project.name}`, 30, 55, { align: "center" })
       .fontSize(10)
       .text(`Location: ${project.location} | Building: ${project.buildingType} | Date: ${new Date().toLocaleDateString()}`, 30, 70, { align: "center" });

    // Table setup
    const tableTop = 95;
    const tableLeft = 30;
    const rowHeight = 20;
    
    // Adjusted column widths for landscape layout
    const colWidths = [50, 80, 45, 80, 65, 75, 80, 50, 50, 60, 35, 50, 50];
    const headers = ["Opening", "Location", "Room #", "Room Name", "Type", "Manufacturer", "Model", "Finish", "Function", "Keying", "Qty", "List $", "Net $"];

    // Header row
    let xPos = tableLeft;
    doc.fontSize(9)
       .font("Helvetica-Bold");

    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: "left" });
      xPos += colWidths[i];
    });

    // Header underline
    doc.moveTo(tableLeft, tableTop + 12)
       .lineTo(pageWidth - 30, tableTop + 12)
       .stroke();

    // Data rows
    let yPos = tableTop + 18;
    doc.fontSize(8)
       .font("Helvetica");

    hardware.forEach((hw, index) => {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 30;
        
        // Repeat header on new page
        xPos = tableLeft;
        doc.fontSize(9)
           .font("Helvetica-Bold");
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos, { width: colWidths[i], align: "left" });
          xPos += colWidths[i];
        });
        doc.moveTo(tableLeft, yPos + 12)
           .lineTo(pageWidth - 30, yPos + 12)
           .stroke();
        yPos += 18;
        doc.fontSize(8)
           .font("Helvetica");
      }

      const opening = openings.find(o => o.id === hw.openingId);
      
      // Calculate net price from list price and discount
      const listPrice = hw.listPrice || 0;
      const discount = hw.discountPercent || 0;
      const netPrice = listPrice * (1 - discount / 100);
      // Build keying summary from keying fields
      const keyingParts = [hw.keyBlank, hw.keySymbol].filter(Boolean);
      const keying = keyingParts.length > 0 ? keyingParts.join(" / ") : "-";
      
      xPos = tableLeft;
      const rowData = [
        opening?.openingNumber || "-",
        opening?.location || "-",
        opening?.roomNumber || "-",
        opening?.roomName || "-",
        hw.itemType || "-",
        hw.manufacturer || "-",
        hw.model || "-",
        hw.finish || "-",
        hw.model || "-", // Use model as function code fallback
        keying,
        String(hw.quantity || 1),
        listPrice ? `$${listPrice.toFixed(2)}` : "-",
        netPrice ? `$${netPrice.toFixed(2)}` : "-",
      ];

      rowData.forEach((data, i) => {
        doc.text(data, xPos, yPos, { width: colWidths[i], align: "left", height: rowHeight });
        xPos += colWidths[i];
      });

      yPos += rowHeight;

      // Row separator
      if (index < hardware.length - 1) {
        doc.moveTo(tableLeft, yPos - 5)
           .lineTo(pageWidth - 30, yPos - 5)
           .strokeOpacity(0.2)
           .stroke()
           .strokeOpacity(1);
      }
    });

    // Summary
    const totalListPrice = hardware.reduce((sum, hw) => {
      const listPrice = hw.listPrice || 0;
      const qty = Number(hw.quantity) || 1;
      return sum + (listPrice * qty);
    }, 0);
    const totalNetPrice = hardware.reduce((sum, hw) => {
      const listPrice = hw.listPrice || 0;
      const discount = hw.discountPercent || 0;
      const netPrice = listPrice * (1 - discount / 100);
      const qty = Number(hw.quantity) || 1;
      return sum + (netPrice * qty);
    }, 0);

    yPos += 15;
    doc.fontSize(10)
       .font("Helvetica-Bold")
       .text(`Total Items: ${hardware.length}`, tableLeft, yPos)
       .text(`Total List Price: $${totalListPrice.toFixed(2)}`, tableLeft + 250, yPos)
       .text(`Total Net Price: $${totalNetPrice.toFixed(2)}`, tableLeft + 450, yPos);

    // Footer
    doc.fontSize(8)
       .font("Helvetica-Oblique")
       .text(
         "Generated by DoorSurvey Pro - Commercial Door Estimating Tool",
         30,
         pageHeight - 30,
         { align: "center", width: pageWidth - 60 }
       );

    doc.end();
  });
}
