import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, FileText, Database, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function Import() {
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [cutSheetFile, setCutSheetFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleCatalogUpload = async () => {
    if (!catalogFile) {
      toast({
        title: "No file selected",
        description: "Please select a catalog file to upload",
        variant: "destructive",
      });
      return;
    }

    // Validate file type (CSV or Excel)
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = catalogFile.name.toLowerCase().slice(catalogFile.name.lastIndexOf('.'));
    
    if (!validTypes.includes(catalogFile.type) && !validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Catalog file must be a CSV or Excel file (.csv, .xls, or .xlsx)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (catalogFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Catalog file must be under 10MB. Please reduce the file size and try again",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", catalogFile);

      const response = await fetch("/api/import/catalog", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Import failed");
      }

      const result = await response.json();

      toast({
        title: "Catalog imported successfully",
        description: `Successfully imported ${result.count} catalog items from ${catalogFile.name}`,
      });

      setCatalogFile(null);
      // Reset file input
      const fileInput = document.getElementById("catalog-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to import catalog",
        description: errorMessage.includes("format") || errorMessage.includes("column")
          ? "File format is incorrect. Please ensure all required columns are present (category, manufacturer, model, specifications)"
          : errorMessage.includes("parse") || errorMessage.includes("invalid")
          ? "Unable to read file data. Please ensure the file is a valid CSV or Excel file"
          : errorMessage || "Import failed. Please check your file format and try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCutSheetUpload = async () => {
    if (!cutSheetFile) {
      toast({
        title: "No file selected",
        description: "Please select a cut sheet file to upload",
        variant: "destructive",
      });
      return;
    }

    // Validate file type (check both MIME type and extension)
    const isPdfType = cutSheetFile.type.includes('pdf');
    const isPdfExtension = cutSheetFile.name.toLowerCase().endsWith('.pdf');
    
    if (!isPdfType && !isPdfExtension) {
      toast({
        title: "Invalid file type",
        description: "Cut sheets must be PDF files. Please select a .pdf file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (20MB limit for PDFs)
    if (cutSheetFile.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "PDF file must be under 20MB. Please reduce the file size and try again",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", cutSheetFile);

      const response = await fetch("/api/import/cutsheet", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Upload failed");
      }

      const result = await response.json();

      toast({
        title: "Cut sheet uploaded successfully",
        description: `${cutSheetFile.name} has been saved to the system`,
      });

      setCutSheetFile(null);
      const fileInput = document.getElementById("cutsheet-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to upload cut sheet",
        description: errorMessage.includes("storage") || errorMessage.includes("space")
          ? "Not enough storage space available. Please contact support"
          : errorMessage.includes("corrupt") || errorMessage.includes("invalid")
          ? "Unable to process PDF file. The file may be corrupted or password-protected"
          : errorMessage || "Upload failed. Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReferenceUpload = async () => {
    if (!referenceFile) {
      toast({
        title: "No file selected",
        description: "Please select a reference data JSON file to upload",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!referenceFile.name.endsWith('.json')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JSON file (.json)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (referenceFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "JSON file must be under 5MB. Please reduce the file size and try again",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Read the JSON file
      const fileContent = await referenceFile.text();
      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error("Invalid JSON format. Please ensure the file contains valid JSON data");
      }

      const response = await fetch("/api/reference/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || "Import failed");
      }

      const result = await response.json();

      const tableCount = Object.keys(result.imported).length;
      const totalRecords = Object.values(result.imported).reduce((a: number, b: any) => a + b, 0);

      toast({
        title: "Reference data imported successfully",
        description: `Successfully imported ${totalRecords} records across ${tableCount} tables`,
      });

      setReferenceFile(null);
      const fileInput = document.getElementById("reference-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to import reference data",
        description: errorMessage.includes("JSON") || errorMessage.includes("parse")
          ? "Invalid JSON format. Please ensure the file contains valid JSON data"
          : errorMessage.includes("schema") || errorMessage.includes("validation")
          ? "Data validation failed. Please ensure the JSON structure matches the required format"
          : errorMessage.includes("duplicate") || errorMessage.includes("constraint")
          ? "Import contains duplicate or invalid data. Please check your file and try again"
          : errorMessage || "Import failed. Please check your file format and try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReferenceExport = async () => {
    try {
      const response = await fetch("/api/reference/export");
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Export failed");
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'reference_data.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export complete",
        description: "Reference data has been successfully exported to JSON",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to export reference data",
        description: errorMessage.includes("database") || errorMessage.includes("fetch")
          ? "Unable to retrieve reference data from database. Please try again"
          : errorMessage || "Export failed. Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Import Data</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Upload files to import catalog items, cut sheets, and update reference data
          </p>
        </div>

        {/* Import Instructions */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Import Instructions
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Follow the format requirements for successful imports
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium">Catalog Import (CSV/Excel)</p>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    Required columns: category, manufacturer, model, specifications
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium">Cut Sheets (PDF)</p>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    Manufacturer specification sheets - stored for reference
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium">Reference Data (JSON/CSV)</p>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    Update door specs, field options, and hardware standards
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Catalog Import */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Import Catalog Items
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Upload CSV or Excel file with product catalog data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catalog-file" className="text-xs sm:text-sm">Select File</Label>
              <input
                id="catalog-file"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={(e) => setCatalogFile(e.target.files?.[0] || null)}
                className="block w-full text-xs sm:text-sm text-muted-foreground
                  file:mr-3 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4
                  file:rounded-md file:border-0
                  file:text-xs sm:file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  file:cursor-pointer cursor-pointer"
                data-testid="input-catalog-file"
              />
              {catalogFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {catalogFile.name} ({(catalogFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <Button
              onClick={handleCatalogUpload}
              disabled={!catalogFile || isUploading}
              data-testid="button-upload-catalog"
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Upload className="h-4 w-4 mr-2 shrink-0" />
              Upload Catalog
            </Button>
          </CardContent>
        </Card>

        {/* Cut Sheet Upload */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Upload Cut Sheets
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Upload manufacturer specification sheets (PDF)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cutsheet-file" className="text-xs sm:text-sm">Select File</Label>
              <input
                id="cutsheet-file"
                type="file"
                accept=".pdf"
                onChange={(e) => setCutSheetFile(e.target.files?.[0] || null)}
                className="block w-full text-xs sm:text-sm text-muted-foreground
                  file:mr-3 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4
                  file:rounded-md file:border-0
                  file:text-xs sm:file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  file:cursor-pointer cursor-pointer"
                data-testid="input-cutsheet-file"
              />
              {cutSheetFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {cutSheetFile.name} ({(cutSheetFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <Button
              onClick={handleCutSheetUpload}
              disabled={!cutSheetFile || isUploading}
              data-testid="button-upload-cutsheet"
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Upload className="h-4 w-4 mr-2 shrink-0" />
              Upload Cut Sheet
            </Button>
          </CardContent>
        </Card>

        {/* Reference Data Import/Export */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Reference Data Import/Export
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Import or export door reference, options, survey fields, hardware locations, and edge/lite types
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference-file" className="text-xs sm:text-sm">Select JSON File to Import</Label>
              <input
                id="reference-file"
                type="file"
                accept=".json"
                onChange={(e) => setReferenceFile(e.target.files?.[0] || null)}
                className="block w-full text-xs sm:text-sm text-muted-foreground
                  file:mr-3 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4
                  file:rounded-md file:border-0
                  file:text-xs sm:file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  file:cursor-pointer cursor-pointer"
                data-testid="input-reference-file"
              />
              {referenceFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {referenceFile.name} ({(referenceFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <div className="p-2 sm:p-3 rounded-md bg-muted/50 border">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-chart-1 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Warning: Importing reference data will replace existing records. Export current data first to create a backup.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={handleReferenceUpload}
                disabled={!referenceFile || isUploading}
                data-testid="button-upload-reference"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Upload className="h-4 w-4 mr-2 shrink-0" />
                Import Data
              </Button>
              <Button
                variant="outline"
                onClick={handleReferenceExport}
                data-testid="button-export-reference"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Download className="h-4 w-4 mr-2 shrink-0" />
                Export Current Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
