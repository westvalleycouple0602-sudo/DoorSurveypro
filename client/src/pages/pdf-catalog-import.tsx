import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Database, Trash2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PdfCatalogImport {
  id: string;
  organizationId: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  errorMessage: string | null;
  extractedData: any[];
  itemCount: number;
  importedAt: string | null;
  importedItemCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export default function PdfCatalogImport() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImport, setPreviewImport] = useState<PdfCatalogImport | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch all imports
  const { data: imports = [], isLoading } = useQuery<PdfCatalogImport[]>({
    queryKey: ["/api/pdf-catalog-imports"],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      // Use fetch directly for FormData (apiRequest expects JSON)
      const response = await fetch("/api/pdf-catalog-imports/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-catalog-imports"] });
      setSelectedFile(null);
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  // Process mutation
  const processMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/pdf-catalog-imports/${id}/process`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-catalog-imports"] });
      toast({
        title: "Processing complete",
        description: "Catalog data has been extracted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process file",
        variant: "destructive",
      });
    },
  });

  // Import to catalog mutation
  const importToCatalogMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/pdf-catalog-imports/${id}/import-to-catalog`);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-catalog-imports"] });
      toast({
        title: "Import complete",
        description: `Successfully imported ${data.importedCount} of ${data.totalCount} items to catalog.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import to catalog",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/pdf-catalog-imports/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-catalog-imports"] });
      toast({
        title: "Import deleted",
        description: "The import record has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete import",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    const allowedTypes = ["application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, CSV, or Excel file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleDownload = (importId: string, format: "excel" | "csv") => {
    const url = `/api/pdf-catalog-imports/${importId}/export/${format}`;
    window.open(url, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge data-testid={`badge-status-completed`} className="bg-green-500 shrink-0 text-xs"><CheckCircle className="w-3 h-3 mr-1 shrink-0" />Completed</Badge>;
      case "processing":
        return <Badge data-testid={`badge-status-processing`} className="bg-blue-500 shrink-0 text-xs"><RefreshCw className="w-3 h-3 mr-1 animate-spin shrink-0" />Processing</Badge>;
      case "failed":
        return <Badge data-testid={`badge-status-failed`} variant="destructive" className="shrink-0 text-xs"><XCircle className="w-3 h-3 mr-1 shrink-0" />Failed</Badge>;
      default:
        return <Badge data-testid={`badge-status-uploaded`} variant="secondary" className="shrink-0 text-xs"><Clock className="w-3 h-3 mr-1 shrink-0" />Uploaded</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">PDF Catalog Import</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Upload and process PDF catalogs with AI-powered data extraction</p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="text-base sm:text-lg">Upload Catalog</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Upload PDF catalogs, CSV, or Excel files. PDFs will be processed with OCR and AI to extract catalog data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
          <div
            data-testid="dropzone-upload"
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 lg:p-12 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                document.getElementById("file-input")?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground shrink-0" />
            <p className="text-sm sm:text-base lg:text-lg font-medium mb-2 truncate">
              {selectedFile ? selectedFile.name : "Drag and drop your file here"}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              {selectedFile
                ? `${formatFileSize(selectedFile.size)} • Ready to upload`
                : "or click to browse (PDF, CSV, Excel • Max 50MB)"}
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                data-testid="button-browse-file"
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2 shrink-0" />
                Browse Files
              </Button>
              {selectedFile && (
                <Button
                  data-testid="button-upload-file"
                  size="sm"
                  className="text-xs sm:text-sm"
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin shrink-0" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2 shrink-0" />
                      Upload
                    </>
                  )}
                </Button>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".pdf,.csv,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="text-base sm:text-lg">Import History</CardTitle>
          <CardDescription className="text-xs sm:text-sm">View and manage your catalog import history</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
          {isLoading ? (
            <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">Loading imports...</div>
          ) : imports.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
              No imports yet. Upload a file to get started.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">File Name</TableHead>
                      <TableHead className="text-xs sm:text-sm">Size</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm">Items</TableHead>
                      <TableHead className="text-xs sm:text-sm">Imported</TableHead>
                      <TableHead className="text-xs sm:text-sm">Uploaded</TableHead>
                      <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id} data-testid={`row-import-${imp.id}`}>
                    <TableCell className="font-medium text-xs sm:text-sm">{imp.fileName}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{formatFileSize(imp.fileSize)}</TableCell>
                    <TableCell>{getStatusBadge(imp.status)}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{imp.itemCount || 0}</TableCell>
                    <TableCell>
                      {imp.importedItemCount > 0 ? (
                        <Badge variant="secondary" className="shrink-0 text-xs">{imp.importedItemCount} items</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(imp.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {imp.status === "uploaded" && (
                          <Button
                            data-testid={`button-process-${imp.id}`}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => processMutation.mutate(imp.id)}
                            disabled={processMutation.isPending}
                          >
                            <RefreshCw className="w-3 h-3 mr-1 shrink-0" />
                            Process
                          </Button>
                        )}
                        {imp.status === "completed" && (
                          <>
                            <Button
                              data-testid={`button-preview-${imp.id}`}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => setPreviewImport(imp)}
                            >
                              <FileText className="w-3 h-3 mr-1 shrink-0" />
                              Preview
                            </Button>
                            <Button
                              data-testid={`button-download-excel-${imp.id}`}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => handleDownload(imp.id, "excel")}
                            >
                              <Download className="w-3 h-3 mr-1 shrink-0" />
                              Excel
                            </Button>
                            <Button
                              data-testid={`button-download-csv-${imp.id}`}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => handleDownload(imp.id, "csv")}
                            >
                              <Download className="w-3 h-3 mr-1 shrink-0" />
                              CSV
                            </Button>
                            {!imp.importedAt && (
                              <Button
                                data-testid={`button-import-catalog-${imp.id}`}
                                size="sm"
                                className="text-xs"
                                onClick={() => importToCatalogMutation.mutate(imp.id)}
                                disabled={importToCatalogMutation.isPending}
                              >
                                <Database className="w-3 h-3 mr-1 shrink-0" />
                                Import
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          data-testid={`button-delete-${imp.id}`}
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(imp.id)}
                          disabled={deleteMutation.isPending}
                          aria-label="Delete import"
                        >
                          <Trash2 className="w-3 h-3 shrink-0" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewImport} onOpenChange={() => setPreviewImport(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Preview Extracted Data</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {previewImport?.fileName} • {previewImport?.itemCount} items extracted
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] sm:h-[400px] lg:h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Category</TableHead>
                  <TableHead className="text-xs sm:text-sm">Manufacturer</TableHead>
                  <TableHead className="text-xs sm:text-sm">Model</TableHead>
                  <TableHead className="text-xs sm:text-sm">Specifications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewImport?.extractedData?.map((item: any, index: number) => (
                  <TableRow key={index} data-testid={`row-preview-${index}`}>
                    <TableCell className="text-xs sm:text-sm">{item.category || "-"}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{item.manufacturer || "-"}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{item.model || "-"}</TableCell>
                    <TableCell className="max-w-md truncate text-xs sm:text-sm">{item.specifications || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
