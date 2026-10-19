# Lanmor Auto Slider Configurator

## Overview
The Lanmor Auto Slider Configurator is an Excel-based tool for configuring and quoting automatic sliding door systems. This tool is complementary to DoorSurvey Pro and can be used for detailed automatic door specifications.

## Package Contents

### 1. Auto_Slider_Config_Package.xlsx
- Main Excel configuration workbook
- Contains product specifications, pricing, and configuration options
- Includes a "Quote" sheet for generating customer quotes
- Works on both Windows and Mac

### 2. ExportQuote.bas
- VBA macro module for PDF export functionality
- Enables one-click PDF quote generation
- Exports the Quote sheet as a professional PDF

### 3. Automation Scripts (Optional)
- **EmbedMacroAndSaveXlsm.ps1**: PowerShell script for Windows automation
- **embed_macro_and_save.vbs**: VBScript alternative for Windows

## Quick Setup Instructions

### Manual Setup (Recommended - 30 seconds)
1. Open `Auto_Slider_Config_Package.xlsx` in Excel
2. Press `Alt+F11` to open the VBA editor
3. Go to **File → Import File...** and select `ExportQuote.bas`
4. Return to Excel, go to the 'Quote' sheet
5. Right-click the blue "Export Quote to PDF" button
6. Choose **Assign Macro...** and select `ExportQuoteToPDF`
7. **Save As** → Excel Macro-Enabled Workbook (*.xlsm)
8. Click the button to export quotes as PDF

### Security Note
- Excel may prompt to enable macros on first use
- This is safe - the macro only exports the sheet as PDF
- If using automation scripts, enable "Trust access to the VBA project object model" in:
  - Excel Options → Trust Center → Trust Center Settings → Macro Settings

## Integration with DoorSurvey Pro

### Using Lanmor Specifications in Surveys
The Lanmor configurator provides detailed specifications for automatic sliding doors that can be referenced when creating door opening surveys in DoorSurvey Pro:

1. **Configure Door in Lanmor Excel**
   - Use the configurator to determine specifications
   - Export quote as PDF for reference

2. **Create Opening in DoorSurvey Pro**
   - Navigate to a project and create a new door opening
   - Select "Automatic Sliding" door type
   - Reference Lanmor quote for:
     - Automation type: Automatic Sliding
     - Manufacturer: Lanmor
     - Model number from quote
     - Operator specifications
     - Activation sensors

3. **Attach Lanmor Quote as Reference**
   - Upload the exported PDF quote to the door opening photos/attachments
   - Store in project catalog for procurement reference

### Automatic Door Template
Consider using the "Automatic Sliding - Storefront" template in DoorSurvey Pro when surveying Lanmor automatic doors:
- Pre-configured for automatic sliding operation
- Includes automation and access control fields
- Matches typical Lanmor installations

## Product Information
- **Manufacturer**: Lanmor
- **Product Type**: Automatic Sliding Door Systems
- **Use Cases**: Commercial entrances, storefronts, hospitals, office buildings
- **Features**: Configurable operators, sensors, and safety features

## File Locations
All Lanmor configurator files are stored in:
```
attached_assets/lanmor_configurator/
├── Auto_Slider_Config_Package.xlsx
├── ExportQuote.bas
├── EmbedMacroAndSaveXlsm.ps1
├── embed_macro_and_save.vbs
└── README_Configurator_PDF_Export.txt
```

## Support
- Refer to `README_Configurator_PDF_Export.txt` for detailed setup instructions
- For DoorSurvey Pro integration questions, contact support
- For Lanmor product questions, refer to manufacturer documentation
