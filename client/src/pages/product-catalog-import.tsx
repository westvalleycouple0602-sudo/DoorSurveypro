import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  Clock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

interface ImportBatch {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  duplicatesDetected: number;
  duplicatesMerged: number;
  deduplicationStrategy: string;
  uploadedBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function ProductCatalogImport() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deduplicationStrategy, setDeduplicationStrategy] = useState<string>("skip");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Fetch import history
  const { data: historyData, refetch: refetchHistory } = useQuery<{ batches: ImportBatch[] }>({
    queryKey: ["/api/products/bulk-import/history"],
  });

  // Fetch active batch status
  const { data: batchStatus, refetch: refetchBatch } = useQuery<{ batch: ImportBatch }>({
    queryKey: ["/api/products/bulk-import/status", activeBatchId],
    enabled: !!activeBatchId,
    refetchInterval: (data) => {
      // Auto-refresh every 2s if processing
      if (data?.state?.data?.batch?.status === "processing") {
        return 2000;
      }
      return false;
    },
  });

  const handleDownloadTemplate = () => {
    window.open("/api/products/bulk-import/template", "_blank");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx"))) {
      setSelectedFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a CSV or Excel file",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("deduplicationStrategy", deduplicationStrategy);

      const response = await fetch("/api/products/bulk-import/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const data = await response.json();
      setActiveBatchId(data.batchId);
      setSelectedFile(null);

      toast({
        title: "Import started",
        description: `Processing ${selectedFile.name}...`,
      });

      // Refresh history
      refetchHistory();
      refetchBatch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload file",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      processing: { variant: "default", icon: Loader2 },
      completed: { variant: "default", icon: CheckCircle },
      failed: { variant: "destructive", icon: XCircle },
      partially_completed: { variant: "default", icon: AlertTriangle },
    };

    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1 shrink-0 text-xs" data-testid={`badge-status-${status}`}>
        <Icon className={`h-3 w-3 shrink-0 ${status === "processing" ? "animate-spin" : ""}`} />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const calculateProgress = (batch: ImportBatch) => {
    if (batch.totalRows === 0) return 0;
    return Math.round((batch.processedRows / batch.totalRows) * 100);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold">Product Catalog Import</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Bulk upload product catalogs from manufacturers. Supports CSV and Excel formats.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList data-testid="tabs-import" className="text-xs sm:text-sm">
          <TabsTrigger value="upload" data-testid="tab-upload" className="text-xs sm:text-sm">Upload</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history" className="text-xs sm:text-sm">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 sm:space-y-6">
          {/* Upload Section */}
          <Card data-testid="card-upload">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Upload className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Upload Product Catalog
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Upload a CSV or Excel file containing product information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
              {/* Template Download */}
              <Alert>
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 text-xs sm:text-sm">
                  <span>Download the template to see the required format</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    data-testid="button-download-template"
                    className="text-xs sm:text-sm shrink-0"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
                    Download Template
                  </Button>
                </AlertDescription>
              </Alert>

              {/* Deduplication Strategy */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium">Deduplication Strategy</label>
                <Select
                  value={deduplicationStrategy}
                  onValueChange={setDeduplicationStrategy}
                >
                  <SelectTrigger data-testid="select-deduplication">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip duplicates</SelectItem>
                    <SelectItem value="merge">Merge duplicates</SelectItem>
                    <SelectItem value="replace">Replace duplicates</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {deduplicationStrategy === "skip" &&
                    "Skip products that already exist (by manufacturer + SKU)"}
                  {deduplicationStrategy === "merge" &&
                    "Update existing products with new data"}
                  {deduplicationStrategy === "replace" &&
                    "Replace existing products completely"}
                </p>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-4 sm:p-6 lg:p-8 text-center cursor-pointer
                  transition-colors
                  ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }
                `}
                data-testid="dropzone-upload"
              >
                <Upload className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground shrink-0" />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      data-testid="button-clear-file"
                      className="text-xs sm:text-sm"
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm mb-2">
                      Drag and drop your CSV or Excel file here
                    </p>
                    <p className="text-xs text-muted-foreground mb-3 sm:mb-4">or</p>
                    <label>
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </>
                )}
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full text-xs sm:text-sm"
                size="sm"
                data-testid="button-upload"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2 shrink-0" />
                    Start Import
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Active Import Status */}
          {batchStatus?.batch && (
            <Card data-testid="card-import-status">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap text-base sm:text-lg">
                  <span>Import Status</span>
                  {getStatusBadge(batchStatus.batch.status)}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm truncate">{batchStatus.batch.fileName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Progress</span>
                    <span>
                      {batchStatus.batch.processedRows} / {batchStatus.batch.totalRows} rows
                    </span>
                  </div>
                  <Progress value={calculateProgress(batchStatus.batch)} data-testid="progress-import" />
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Successful</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600" data-testid="text-successful-rows">
                      {batchStatus.batch.successfulRows}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Failed</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600" data-testid="text-failed-rows">
                      {batchStatus.batch.failedRows}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Duplicates</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600" data-testid="text-duplicate-rows">
                      {batchStatus.batch.duplicatesDetected}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Merged</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600" data-testid="text-merged-rows">
                      {batchStatus.batch.duplicatesMerged}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchBatch()}
                  data-testid="button-refresh-status"
                  className="text-xs sm:text-sm"
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2 shrink-0" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 sm:space-y-4">
          <Card data-testid="card-import-history">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-base sm:text-lg">Import History</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Recent product catalog imports</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
              <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">File Name</TableHead>
                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                        <TableHead className="text-xs sm:text-sm">Rows</TableHead>
                        <TableHead className="text-xs sm:text-sm">Success</TableHead>
                        <TableHead className="text-xs sm:text-sm">Failed</TableHead>
                        <TableHead className="text-xs sm:text-sm">Duplicates</TableHead>
                        <TableHead className="text-xs sm:text-sm">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData?.batches?.map((batch: ImportBatch) => (
                        <TableRow key={batch.id} data-testid={`row-batch-${batch.id}`}>
                          <TableCell className="font-medium text-xs sm:text-sm">{batch.fileName}</TableCell>
                          <TableCell>{getStatusBadge(batch.status)}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{batch.totalRows}</TableCell>
                          <TableCell className="text-green-600 text-xs sm:text-sm">{batch.successfulRows}</TableCell>
                          <TableCell className="text-red-600 text-xs sm:text-sm">{batch.failedRows}</TableCell>
                          <TableCell className="text-orange-600 text-xs sm:text-sm">{batch.duplicatesDetected}</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setActiveBatchId(batch.id)}
                              aria-label="View batch details"
                              data-testid={`button-view-${batch.id}`}
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!historyData?.batches || historyData.batches.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-xs sm:text-sm text-muted-foreground">
                            No import history found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
