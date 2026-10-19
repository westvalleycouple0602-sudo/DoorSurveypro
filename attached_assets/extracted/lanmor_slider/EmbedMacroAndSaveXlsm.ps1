param(
  [string]$Xlsx = "$PSScriptRoot\Auto_Slider_Config_Package.xlsx",
  [string]$Bas  = "$PSScriptRoot\ExportQuote.bas",
  [string]$Out  = "$PSScriptRoot\Auto_Slider_Config_Package.xlsm"
)

$xlOpenXMLWorkbookMacroEnabled = 52

Write-Host "Opening Excel…" -ForegroundColor Cyan
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  if (!(Test-Path $Xlsx)) { throw "XLSX not found: $Xlsx" }
  if (!(Test-Path $Bas))  { throw "BAS not found: $Bas" }

  $wb = $excel.Workbooks.Open($Xlsx)

  # You may need to enable: Trust Center → Macro Settings → "Trust access to the VBA project object model"
  if ($wb.VBProject -eq $null) {
    throw "VBProject is not accessible. In Excel, enable 'Trust access to the VBA project object model' and retry."
  }

  Write-Host "Importing macro module…" -ForegroundColor Cyan
  $wb.VBProject.VBComponents.Import($Bas) | Out-Null

  Write-Host "Saving as XLSM…" -ForegroundColor Cyan
  $wb.SaveAs($Out, $xlOpenXMLWorkbookMacroEnabled)

  Write-Host "Done: $Out" -ForegroundColor Green
}
catch {
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
  if ($wb) { $wb.Close($true) | Out-Null }
  if ($excel) { $excel.Quit() }
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}