' Usage: double-click (expects files next to this .vbs)
' Creates Auto_Slider_Config_Package.xlsm in the same folder.

Const xlOpenXMLWorkbookMacroEnabled = 52

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
xlsx = base & "\Auto_Slider_Config_Package.xlsx"
bas  = base & "\ExportQuote.bas"
outp = base & "\Auto_Slider_Config_Package.xlsm"

If Not fso.FileExists(xlsx) Then
  WScript.Echo "XLSX not found: " & xlsx
  WScript.Quit 1
End If
If Not fso.FileExists(bas) Then
  WScript.Echo "BAS not found: " & bas
  WScript.Quit 1
End If

On Error Resume Next
Set xl = CreateObject("Excel.Application")
If Err.Number <> 0 Then
  WScript.Echo "Cannot create Excel.Application. Is Excel installed?"
  WScript.Quit 1
End If
On Error GoTo 0

xl.DisplayAlerts = False
xl.Visible = False

Set wb = xl.Workbooks.Open(xlsx)

On Error Resume Next
Set vbproj = wb.VBProject
If Err.Number <> 0 Then
  WScript.Echo "VBProject not accessible. In Excel: Trust Center -> Macro Settings -> check 'Trust access to the VBA project object model'."
  wb.Close False
  xl.Quit
  WScript.Quit 1
End If
On Error GoTo 0

vbproj.VBComponents.Import bas

wb.SaveAs outp, xlOpenXMLWorkbookMacroEnabled
wb.Close True
xl.Quit
WScript.Echo "Saved: " & outp