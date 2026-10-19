import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Camera,
  Upload,
  X,
  Scan,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  QrCode,
  Barcode,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { HardwareScan } from "@shared/schema";
import { UsageBadge, UsageAlert } from "@/components/usage-badge";

interface HardwareLabelScannerProps {
  openingId?: string;
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete?: (scan: HardwareScan) => void;
}

export function HardwareLabelScanner({
  openingId,
  projectId,
  open,
  onOpenChange,
  onScanComplete,
}: HardwareLabelScannerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [scanResult, setScanResult] = useState<HardwareScan | null>(null);

  // Fetch barcode scan usage stats
  const { data: usageStats, isLoading: usageLoading } = useQuery<{
    current: number;
    limit: number | null;
    isUnlimited: boolean;
    percentUsed: number;
    remaining: number | null;
    resetsAt: string;
    tier: string;
  }>({
    queryKey: ["/api/hardware/scan-usage"],
    staleTime: 1000 * 30, // 30 seconds
  });

  // Check if at limit
  const atLimit = usageStats && !usageStats.isUnlimited && usageStats.remaining === 0;

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      if (openingId) formData.append("openingId", openingId);
      if (projectId) formData.append("projectId", projectId);

      const response = await fetch("/api/hardware/scan-label", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to scan label");
      }

      return response.json();
    },
    onSuccess: (data: HardwareScan) => {
      setScanResult(data);
      toast({
        title: "Scan Complete",
        description: "Hardware label scanned successfully",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/hardware/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hardware/scan-usage"] });
      if (openingId) {
        queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/hardware-scans`] });
      }

      if (onScanComplete) {
        onScanComplete(data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setScanResult(null);
    }
  };

  const handleScan = () => {
    if (selectedFile) {
      scanMutation.mutate(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setScanResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  // Parse the normalized fields from scan result
  const normalizedFields = scanResult?.normalizedFields as any;
  const extractedFields = scanResult?.extractedFields as any;
  const decodedTokens = (scanResult?.decodedTokens as any[]) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-hardware-scanner">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Scan Hardware Label
          </DialogTitle>
          <DialogDescription>
            Upload or capture an image of a hardware label or barcode to automatically identify the product
          </DialogDescription>
        </DialogHeader>

        {/* Usage Stats */}
        {usageStats && !usageStats.isUnlimited && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Daily Scans</span>
              <UsageBadge
                current={usageStats.current}
                limit={usageStats.limit}
                isUnlimited={usageStats.isUnlimited}
                percentUsed={usageStats.percentUsed}
                resourceName="scans"
              />
            </div>
            <UsageAlert
                current={usageStats.current}
                limit={usageStats.limit}
                isUnlimited={usageStats.isUnlimited}
                percentUsed={usageStats.percentUsed}
                resourceName="scans"
              />
          </div>
        )}

        <div className="space-y-6">
          {/* File Upload Section */}
          {!scanResult && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="hardware-image" data-testid="label-upload-image">
                  Upload Image
                </Label>
                <div className="mt-2">
                  <Input
                    id="hardware-image"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                    data-testid="input-hardware-image"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Take a photo with your camera or upload an existing image (JPEG, PNG)
                </p>
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <Card data-testid="card-image-preview">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      Image Preview
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleReset}
                        aria-label="Clear image"
                        data-testid="button-clear-image"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={previewUrl}
                      alt="Hardware label preview"
                      className="max-w-full h-auto rounded-md border"
                      data-testid="img-preview"
                    />
                    <Button
                      onClick={handleScan}
                      disabled={scanMutation.isPending || usageLoading || atLimit}
                      className="mt-4 w-full"
                      data-testid="button-scan-label"
                    >
                      {scanMutation.isPending ? (
                        <>
                          <Scan className="mr-2 h-4 w-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Scan className="mr-2 h-4 w-4" />
                          Scan Label
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Scan Results */}
          {scanResult && (
            <div className="space-y-4">
              {/* Scanned Image */}
              {previewUrl && (
                <Card data-testid="card-scanned-image">
                  <CardHeader>
                    <CardTitle className="text-base">Scanned Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={previewUrl}
                      alt="Scanned hardware label"
                      className="max-w-full h-auto rounded-md border"
                      data-testid="img-scanned"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Decoded Barcodes/QR Codes */}
              {decodedTokens.length > 0 ? (
                <Card data-testid="card-decoded-tokens">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      Decoded Barcodes ({decodedTokens.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {decodedTokens.map((token: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-muted rounded" data-testid={`token-${idx}`}>
                          <Badge variant="outline" data-testid={`badge-symbology-${idx}`}>
                            {token.symbology}
                          </Badge>
                          <code className="flex-1 text-sm" data-testid={`text-token-${idx}`}>
                            {token.text}
                          </code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Alert data-testid="alert-no-barcodes">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No barcodes or QR codes detected in the image. The label may not be clear enough or may use text only.
                  </AlertDescription>
                </Alert>
              )}

              {/* Extracted Hardware Fields */}
              <Card data-testid="card-extracted-fields">
                <CardHeader>
                  <CardTitle className="text-base">Identified Hardware Details</CardTitle>
                  <CardDescription>
                    Automatically extracted from the scanned label
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div data-testid="field-manufacturer">
                      <Label className="text-xs text-muted-foreground">Manufacturer</Label>
                      <div className="mt-1 font-medium">
                        {normalizedFields?.manufacturer || extractedFields?.manufacturer || (
                          <span className="text-muted-foreground">Not detected</span>
                        )}
                      </div>
                    </div>

                    <div data-testid="field-model">
                      <Label className="text-xs text-muted-foreground">Model</Label>
                      <div className="mt-1 font-medium">
                        {normalizedFields?.model || extractedFields?.model || (
                          <span className="text-muted-foreground">Not detected</span>
                        )}
                      </div>
                    </div>

                    <div data-testid="field-bhma-function">
                      <Label className="text-xs text-muted-foreground">BHMA Function</Label>
                      <div className="mt-1 font-medium">
                        {normalizedFields?.bhmaFunction || extractedFields?.bhmaFunction || (
                          <span className="text-muted-foreground">Not detected</span>
                        )}
                      </div>
                      {normalizedFields?.bhmaDesc && (
                        <p className="text-xs text-muted-foreground mt-1" data-testid="text-bhma-description">
                          {normalizedFields.bhmaDesc}
                        </p>
                      )}
                    </div>

                    <div data-testid="field-finish">
                      <Label className="text-xs text-muted-foreground">Finish</Label>
                      <div className="mt-1 font-medium">
                        {normalizedFields?.finish || extractedFields?.finish || (
                          <span className="text-muted-foreground">Not detected</span>
                        )}
                      </div>
                      {normalizedFields?.finishDesc && (
                        <p className="text-xs text-muted-foreground mt-1" data-testid="text-finish-description">
                          {normalizedFields.finishDesc}
                        </p>
                      )}
                    </div>

                    <div data-testid="field-series">
                      <Label className="text-xs text-muted-foreground">Series</Label>
                      <div className="mt-1 font-medium">
                        {normalizedFields?.series || extractedFields?.series || (
                          <span className="text-muted-foreground">Not detected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Catalog Links */}
              {normalizedFields?.catalogLinks && (
                <Card data-testid="card-catalog-links">
                  <CardHeader>
                    <CardTitle className="text-base">Product Resources</CardTitle>
                    <CardDescription>
                      Links to manufacturer documentation and product information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {normalizedFields.catalogLinks.vendorHome && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          asChild
                          data-testid="link-vendor-home"
                        >
                          <a
                            href={normalizedFields.catalogLinks.vendorHome}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Manufacturer Website
                          </a>
                        </Button>
                      )}

                      {normalizedFields.catalogLinks.likelyProductQuery && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          asChild
                          data-testid="link-product-query"
                        >
                          <a
                            href={normalizedFields.catalogLinks.likelyProductQuery}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Product Catalog Search
                          </a>
                        </Button>
                      )}

                      {normalizedFields.catalogLinks.webSearch && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          asChild
                          data-testid="link-web-search"
                        >
                          <a
                            href={normalizedFields.catalogLinks.webSearch}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Web Search
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  data-testid="button-scan-another"
                >
                  Scan Another Label
                </Button>
                <Button onClick={handleClose} data-testid="button-done">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
