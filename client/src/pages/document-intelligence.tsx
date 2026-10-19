import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileText, Image as ImageIcon, CheckCircle2, Sparkles, Upload, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { LockedFeature } from "@/components/locked-feature";
import { UpsellDialog } from "@/components/upsell-dialog";
import { createWorker } from 'tesseract.js';

export default function DocumentIntelligencePage() {
  const { toast } = useToast();
  const { 
    hasFeatureAccess, 
    requireFeature,
    currentTier,
    upsellConfig,
    closeUpsell,
  } = useFeatureAccess();
  
  const hasAiAudits = hasFeatureAccess("aiAudits");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [manufacturerHint, setManufacturerHint] = useState("");
  const [documentType, setDocumentType] = useState("cut-sheet");

  const analyzeOCRMutation = useMutation({
    mutationFn: async (data: { ocrText: string; documentType?: string; manufacturerHint?: string }) => {
      const res = await apiRequest("POST", "/api/document-intelligence/process-ocr", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "OCR analysis failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis complete",
        description: "Specifications extracted successfully from document",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Analysis failed",
        description: errorMessage.includes("AI") || errorMessage.includes("service")
          ? "AI service unavailable. Please try again later"
          : errorMessage.includes("text") || errorMessage.includes("OCR")
          ? "Unable to extract specifications from OCR text. Try different content or image"
          : errorMessage || "Failed to process document. Please try again",
        variant: "destructive",
      });
    },
  });

  const analyzeImageMutation = useMutation({
    mutationFn: async (data: { imageBase64: string; documentType?: string; manufacturerHint?: string }) => {
      const res = await apiRequest("POST", "/api/document-intelligence/analyze-image", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Image analysis failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Vision analysis complete",
        description: "Specifications extracted successfully from image using AI vision",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Vision analysis failed",
        description: errorMessage.includes("AI") || errorMessage.includes("vision") || errorMessage.includes("service")
          ? "AI vision service unavailable. Try OCR extraction instead"
          : errorMessage.includes("image") || errorMessage.includes("format")
          ? "Invalid image format. Please use PNG, JPEG, or WebP"
          : errorMessage.includes("size") || errorMessage.includes("large")
          ? "Image too large. Please use an image under 10MB"
          : errorMessage || "Failed to analyze image. Please try again",
        variant: "destructive",
      });
    },
  });

  const createCatalogMutation = useMutation({
    mutationFn: async (data: { extractedSpecs: any; literatureId?: string }) => {
      const res = await apiRequest("POST", "/api/document-intelligence/create-catalog-item", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Catalog creation failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Catalog item created",
        description: "Product added to catalog successfully and ready to use",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to create catalog item",
        description: errorMessage.includes("duplicate") || errorMessage.includes("exists")
          ? "This product already exists in your catalog"
          : errorMessage.includes("validation") || errorMessage.includes("required")
          ? "Missing required specifications. Please check the extracted data"
          : errorMessage || "Unable to add product to catalog. Please try again",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPEG, WebP, or GIF image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        toast({
          title: "Failed to load image",
          description: "Unable to read file. Please try a different image",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOCR = async () => {
    if (!selectedFile || !imagePreview) {
      toast({
        title: "No File Selected",
        description: "Please select an image or PDF file first",
        variant: "destructive",
      });
      return;
    }

    setIsOCRProcessing(true);
    setOcrProgress(0);

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(imagePreview);
      setOcrText(text);
      await worker.terminate();

      toast({
        title: "OCR Complete",
        description: `Extracted ${text.length} characters from document`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "OCR processing failed",
        description: errorMessage.includes("worker") || errorMessage.includes("language")
          ? "OCR engine failed to load. Please refresh the page"
          : errorMessage.includes("image") || errorMessage.includes("format")
          ? "Unable to process image. Try a different format or higher quality image"
          : "Failed to extract text from image. Please try again",
        variant: "destructive",
      });
    } finally {
      setIsOCRProcessing(false);
      setOcrProgress(0);
    }
  };

  const handleAnalyzeWithOCR = () => {
    if (!ocrText) {
      toast({
        title: "No OCR Text",
        description: "Please perform OCR first",
        variant: "destructive",
      });
      return;
    }

    analyzeOCRMutation.mutate({
      ocrText,
      documentType,
      manufacturerHint: manufacturerHint || undefined,
    });
  };

  const handleAnalyzeWithVision = () => {
    if (!imagePreview) {
      toast({
        title: "No File Selected",
        description: "Please select an image or PDF file first",
        variant: "destructive",
      });
      return;
    }

    analyzeImageMutation.mutate({
      imageBase64: imagePreview,
      documentType,
      manufacturerHint: manufacturerHint || undefined,
    });
  };

  const handleCreateCatalogItem = (extractedSpecs: any) => {
    createCatalogMutation.mutate({
      extractedSpecs,
    });
  };

  const result = analyzeOCRMutation.data || analyzeImageMutation.data;
  const isAnalyzing = analyzeOCRMutation.isPending || analyzeImageMutation.isPending;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-document-intelligence">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="heading-document-intelligence">
          <Sparkles className="h-6 sm:h-8 w-6 sm:w-8" />
          Document Intelligence
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          AI-powered OCR and NLP to extract specifications from manufacturer documents (images)
        </p>
        <Alert className="mt-4">
          <FileText className="h-4 w-4" />
          <AlertTitle>Best Results with Images</AlertTitle>
          <AlertDescription>
            For optimal spec extraction, upload manufacturer documents as high-resolution images (PNG, JPEG, WebP).
            If you have PDFs, please convert them to images first using your PDF viewer's export feature.
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Upload & Configuration */}
          <Card data-testid="card-upload">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Upload Document</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Upload spec sheets, cut sheets, or technical documents</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-xs sm:text-sm">Document File (Images recommended)</Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
              <p className="text-xs text-muted-foreground">
                Supported: PNG, JPEG, WebP, GIF. For PDFs, export as images first.
              </p>
            </div>

            {imagePreview && (
              <div className="border rounded-lg p-2">
                <img 
                  src={imagePreview} 
                  alt="Document preview" 
                  className="w-full h-48 object-contain rounded"
                  data-testid="img-preview"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="manufacturer-hint" className="text-xs sm:text-sm">Manufacturer (Optional)</Label>
              <Input
                id="manufacturer-hint"
                placeholder="e.g., Allegion, ASSA ABLOY"
                value={manufacturerHint}
                onChange={(e) => setManufacturerHint(e.target.value)}
                data-testid="input-manufacturer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-type" className="text-xs sm:text-sm">Document Type</Label>
              <Input
                id="document-type"
                placeholder="e.g., cut-sheet, installation-manual"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                data-testid="input-document-type"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleOCR}
                disabled={!imagePreview || isOCRProcessing}
                variant="outline"
                className="flex-1 text-xs sm:text-sm"
                size="sm"
                data-testid="button-ocr"
              >
                {isOCRProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0 animate-spin" />
                    OCR Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                    Extract Text (OCR)
                  </>
                )}
              </Button>

              <Button
                onClick={handleAnalyzeWithVision}
                disabled={!imagePreview || isAnalyzing}
                className="flex-1 text-xs sm:text-sm"
                size="sm"
                data-testid="button-vision-analyze"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                    AI Vision Analysis
                  </>
                )}
              </Button>
            </div>

            {isOCRProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>OCR Progress</span>
                  <span>{ocrProgress}%</span>
                </div>
                <Progress value={ocrProgress} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* OCR Results */}
        <Card data-testid="card-ocr-results">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Extracted Text (OCR)</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Text extracted from document via Tesseract.js</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            {ocrText ? (
              <>
                <Textarea
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  placeholder="OCR text will appear here..."
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="textarea-ocr"
                />
                <Button
                  onClick={handleAnalyzeWithOCR}
                  disabled={isAnalyzing}
                  className="w-full text-xs sm:text-sm"
                  size="sm"
                  data-testid="button-analyze-ocr"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0 animate-spin" />
                      Analyzing OCR Text...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                      Extract Specs from OCR
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No OCR text extracted yet</p>
                <p className="text-sm mt-2">Upload an image and click "Extract Text (OCR)"</p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Extracted Specifications */}
      {result?.success && result.extractedSpecs && (
        <LockedFeature
          locked={!hasAiAudits}
          onClick={() => requireFeature("aiAudits", {
            featureName: "Document Intelligence",
            featureDescription: "AI-powered OCR and NLP to automatically extract product specifications from manufacturer documents. Upload cut sheets, installation manuals, and technical documents to instantly populate your catalog with accurate hardware specs. Available on Enterprise plan.",
          })}
          tierBadgeText="Enterprise"
          variant="overlay"
          featureName="Document Intelligence"
        >
        <Card data-testid="card-extracted-specs">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center justify-between gap-2 flex-wrap text-base sm:text-lg">
              <span>Extracted Specifications</span>
              <Badge variant="secondary" className="shrink-0">
                Confidence: {(result.extractedSpecs.confidence * 100).toFixed(0)}%
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              AI-extracted product data {result.processingTimeMs && `(${result.processingTimeMs}ms)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <Tabs defaultValue="specs">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
                <TabsTrigger value="specs" data-testid="tab-specs">Specifications</TabsTrigger>
                <TabsTrigger value="catalog" data-testid="tab-catalog">Catalog Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="specs" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.extractedSpecs.manufacturer && (
                    <div>
                      <div className="text-sm text-muted-foreground">Manufacturer</div>
                      <div className="font-medium">{result.extractedSpecs.manufacturer}</div>
                    </div>
                  )}
                  {result.extractedSpecs.model && (
                    <div>
                      <div className="text-sm text-muted-foreground">Model</div>
                      <div className="font-medium">{result.extractedSpecs.model}</div>
                    </div>
                  )}
                  {result.extractedSpecs.category && (
                    <div>
                      <div className="text-sm text-muted-foreground">Category</div>
                      <div className="font-medium">{result.extractedSpecs.category}</div>
                    </div>
                  )}
                  {result.extractedSpecs.fireRating && (
                    <div>
                      <div className="text-sm text-muted-foreground">Fire Rating</div>
                      <div className="font-medium">{result.extractedSpecs.fireRating}</div>
                    </div>
                  )}
                </div>

                {result.extractedSpecs.dimensions && Object.keys(result.extractedSpecs.dimensions).length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">Dimensions</div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {Object.entries(result.extractedSpecs.dimensions).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value as string}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.extractedSpecs.certifications && result.extractedSpecs.certifications.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">Certifications</div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {result.extractedSpecs.certifications.map((cert: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.extractedSpecs.complianceCodes && result.extractedSpecs.complianceCodes.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">Code Compliance</div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {result.extractedSpecs.complianceCodes.map((code: string, idx: number) => (
                        <Badge key={idx} className="text-xs">{code}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.extractedSpecs.features && result.extractedSpecs.features.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Features</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {result.extractedSpecs.features.map((feature: string, idx: number) => (
                        <li key={idx}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="catalog" className="mt-4 space-y-3 sm:space-y-4">
                {result.suggestedCatalogEntry && (
                  <>
                    <Alert>
                      <Package className="h-4 w-4 shrink-0" />
                      <AlertTitle className="text-sm sm:text-base">Ready to Add to Catalog</AlertTitle>
                      <AlertDescription>
                        Review the extracted specifications and create a catalog item
                      </AlertDescription>
                    </Alert>

                    <div className="border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Category</div>
                        <div className="font-medium text-sm sm:text-base">{result.suggestedCatalogEntry.category}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Manufacturer</div>
                        <div className="font-medium text-sm sm:text-base">{result.suggestedCatalogEntry.manufacturer}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Model</div>
                        <div className="font-medium text-sm sm:text-base">{result.suggestedCatalogEntry.model}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Specifications</div>
                        <div className="text-xs sm:text-sm whitespace-pre-line">{result.suggestedCatalogEntry.specifications}</div>
                      </div>
                      {result.suggestedCatalogEntry.notes && (
                        <div>
                          <div className="text-sm text-muted-foreground">Notes</div>
                          <div className="text-sm whitespace-pre-line">{result.suggestedCatalogEntry.notes}</div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleCreateCatalogItem(result.extractedSpecs)}
                      disabled={createCatalogMutation.isPending}
                      className="w-full"
                      data-testid="button-create-catalog"
                    >
                      {createCatalogMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Catalog Item...
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 mr-2" />
                          Add to Catalog
                        </>
                      )}
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </LockedFeature>
      )}
      </div>

      {upsellConfig && (
        <UpsellDialog
          open={true}
          onOpenChange={closeUpsell}
          type="addon"
          featureName={upsellConfig.featureName}
          featureDescription={upsellConfig.featureDescription}
          requiredTier={upsellConfig.requiredTier}
          requiredAddon={upsellConfig.requiredAddon}
          currentTier={currentTier}
        />
      )}
    </div>
  );
}
