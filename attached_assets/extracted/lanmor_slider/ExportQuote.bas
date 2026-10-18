
Attribute VB_Name = "QuoteExport"
Option Explicit

Public Sub ExportQuoteToPDF()
    Dim ws As Worksheet
    Dim fsoPath As String
    Dim outPath As String
    On Error GoTo ErrHandler

    Set ws = ThisWorkbook.Worksheets("Quote")
    fsoPath = ThisWorkbook.Path
    If Len(fsoPath) = 0 Then
        MsgBox "Please save the workbook first.", vbExclamation
        Exit Sub
    End If

    outPath = fsoPath & Application.PathSeparator & "Quote_" & Format(Date, "yyyymmdd") & ".pdf"
    ws.ExportAsFixedFormat Type:=xlTypePDF, Filename:=outPath, _
        Quality:=xlQualityStandard, IncludeDocProperties:=True, _
        IgnorePrintAreas:=False, OpenAfterPublish:=True

    MsgBox "Exported to " & outPath, vbInformation
    Exit Sub
ErrHandler:
    MsgBox "PDF export failed: " & Err.Description, vbCritical
End Sub
