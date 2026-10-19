import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileText, CheckCircle, AlertTriangle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedRow {
  row: number;
  data: {
    name: string;
    location: string;
    buildingType?: string;
    status?: string;
    quoteType?: string;
    notes?: string;
    customerName?: string;
    applicableStandards?: string;
  };
  customer?: { id: string; name: string };
  errors: string[];
  warnings: string[];
}

interface PreviewResponse {
  previewId: string;
  summary: {
    total: number;
    valid: number;
    errors: number;
    warnings: number;
  };
  rows: ParsedRow[];
}

export default function BulkImport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadTemplate = () => {
    window.open("/api/bulk-import/projects/template", "_blank");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(null);
      setPreviewId(null); // Reset preview ID when new file is selected
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/bulk-import/projects/preview", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to preview import");
      }

      const data: PreviewResponse = await response.json();
      setPreview(data);
      setPreviewId(data.previewId); // Store server-generated preview ID
      
      toast({
        title: "Preview ready",
        description: `Found ${data.summary.valid} valid projects, ${data.summary.errors} errors`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Preview failed",
        description: error.message || "Failed to preview CSV file",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !previewId) return;

    setIsImporting(true);
    try {
      const response = await apiRequest("POST", "/api/bulk-import/projects/execute", {
        previewId, // Send server-generated preview ID (SECURE)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import projects");
      }

      const result = await response.json();
      
      // Invalidate projects cache to force refresh
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      
      toast({
        title: "Import successful",
        description: `Imported ${result.imported} projects successfully`,
      });

      // Navigate to projects page
      setLocation("/projects");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message || "Failed to import projects",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/projects")}
          aria-label="Back to projects"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Bulk Project Import</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Import multiple projects at once using a CSV file
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Step 1: Download Template</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Download a CSV template with the correct format and sample data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            data-testid="button-download-template"
            className="text-xs sm:text-sm"
          >
            <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Step 2: Upload CSV File</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Upload your CSV file to preview what will be imported
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              data-testid="input-csv-file"
              className="text-xs sm:text-sm file:text-xs sm:file:text-sm file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4"
            />
            <Button
              onClick={handlePreview}
              disabled={!selectedFile || isUploading}
              data-testid="button-preview"
              size="sm"
              className="text-xs sm:text-sm shrink-0"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                  <span className="hidden sm:inline">Processing...</span>
                  <span className="sm:hidden">Loading</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2 shrink-0" />
                  Preview
                </>
              )}
            </Button>
          </div>

          {preview && (
            <Alert>
              <AlertDescription>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                    <span className="font-medium text-xs sm:text-sm">{preview.summary.valid} Valid</span>
                  </div>
                  {preview.summary.errors > 0 && (
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0" />
                      <span className="font-medium text-xs sm:text-sm">{preview.summary.errors} Errors</span>
                    </div>
                  )}
                  {preview.summary.warnings > 0 && (
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 shrink-0" />
                      <span className="font-medium text-xs sm:text-sm">{preview.summary.warnings} Warnings</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {preview && preview.rows.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Step 3: Review & Import</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Review the projects below and fix any errors before importing
                </CardDescription>
              </div>
              <Button
                onClick={handleImport}
                disabled={preview.summary.valid === 0 || isImporting}
                data-testid="button-import"
                size="sm"
                className="text-xs sm:text-sm w-full sm:w-auto shrink-0"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2 shrink-0" />
                    Import {preview.summary.valid} Projects
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs sm:text-sm">Row</TableHead>
                    <TableHead className="text-xs sm:text-sm">Project Name</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Location</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Customer</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.row} data-testid={`row-preview-${row.row}`}>
                      <TableCell className="font-mono text-xs sm:text-sm">{row.row}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="font-medium text-xs sm:text-sm truncate">{row.data.name}</div>
                          <div className="text-xs text-muted-foreground sm:hidden truncate">{row.data.location}</div>
                          {row.errors.length > 0 && (
                            <div className="text-xs text-destructive mt-1">
                              {row.errors.map((err, i) => (
                                <div key={i}>{err}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{row.data.location}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="capitalize text-xs">
                          {row.data.buildingType || "office"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {row.customer ? (
                          <span className="text-xs sm:text-sm">{row.customer.name}</span>
                        ) : row.data.customerName ? (
                          <span className="text-xs sm:text-sm text-yellow-600">
                            Not found: {row.data.customerName}
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <Badge variant="destructive" className="text-xs">Error</Badge>
                        ) : row.warnings.length > 0 ? (
                          <Badge variant="outline" className="border-yellow-600 text-yellow-600 text-xs">
                            Warning
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-600 text-green-600 text-xs">
                            Valid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
