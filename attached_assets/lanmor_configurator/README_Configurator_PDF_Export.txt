Lanmor Auto Slider Configurator — PDF Export Setup
==================================================

What's inside
-------------
1) Auto_Slider_Config_Package.xlsx     ← Open this in Excel (works on Win/Mac)
2) ExportQuote.bas                      ← VBA module with 'ExportQuoteToPDF'
3) (Optional) EmbedMacroAndSaveXlsm.ps1 ← Windows PowerShell script to auto-import macro and save as .xlsm
4) (Optional) embed_macro_and_save.vbs  ← Windows Script Host (classic VBScript) alternative

Quick Start (manual—recommended, 30 seconds)
--------------------------------------------
1. Open Auto_Slider_Config_Package.xlsx in Excel.
2. Press Alt+F11 to open the VBA editor.
3. File → Import File… → select ExportQuote.bas → OK.
4. Back in Excel, go to the 'Quote' sheet, right–click the blue "Export Quote to PDF" button area,
   choose “Assign Macro…”, select ExportQuoteToPDF → OK.
5. Save As → Excel Macro-Enabled Workbook (*.xlsm).
6. Click the button to export the Quote to PDF in the same folder.

Notes:
- On first use, Excel may prompt to enable macros.
- If you plan to use the automation scripts below, you may need to enable
  'Trust access to the VBA project object model' in Excel Options → Trust Center → Trust Center Settings → Macro Settings.

Optional: Windows automation (PowerShell)
-----------------------------------------
1) Right–click EmbedMacroAndSaveXlsm.ps1 → Run with PowerShell
   (or run from a PowerShell console).
2) By default, it looks for Auto_Slider_Config_Package.xlsx and ExportQuote.bas in the same folder as the script.
   It will produce Auto_Slider_Config_Package.xlsm in that same folder.

   Example from PowerShell:
     .\EmbedMacroAndSaveXlsm.ps1 -Xlsx "C:\path\Auto_Slider_Config_Package.xlsx" -Bas "C:\path\ExportQuote.bas" -Out "C:\path\Auto_Slider_Config_Package.xlsm"

Optional: Windows automation (VBScript)
---------------------------------------
1) Double–click embed_macro_and_save.vbs
2) It assumes the .xlsx and .bas sit next to the .vbs file and creates Auto_Slider_Config_Package.xlsm in the same folder.

Troubleshooting
---------------
- "Cannot open .xlsm / invalid format": that happens when a non-macro writer tries to save a macro container.
  Use the provided .xlsx and import the .bas in Excel, then Save As .xlsm.
- "Programmatic access to Visual Basic Project is not trusted": enable the 'Trust access...' checkbox in Trust Center.
- "ExportAsFixedFormat" errors: ensure you have permission to write to the target folder and that a default printer/PDF exporter exists.

Need help?
----------
Ping back with a screenshot/error text and I'll adjust the script or workbook.