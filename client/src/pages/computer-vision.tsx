import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, AlertTriangle, CheckCircle2, Upload, FileWarning, Image as ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { LockedFeature } from "@/components/locked-feature";
import { UpsellDialog } from "@/components/upsell-dialog";

export default function ComputerVisionPage() {
  const { toast } = useToast();
  const { 
    hasFeatureAccess, 
    requireFeature,
    currentTier,
    upsellConfig,
    closeUpsell,
  } = useFeatureAccess();
  
  const hasAiAudits = hasFeatureAccess("aiAudits");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [doorType, setDoorType] = useState("single");
  const [buildingType, setBuildingType] = useState("office");

  const analyzeMutation = useMutation({
    mutationFn: async (data: { imageBase64: string; doorType: string; buildingType: string }) => {
      const res = await apiRequest("POST", "/api/computer-vision/analyze-comprehensive", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to analyze image");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Vision Analysis Complete",
        description: "Photo successfully analyzed with comprehensive damage detection and condition assessment",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to analyze image",
        description: errorMessage.includes("AI service") || errorMessage.includes("vision")
          ? "Computer vision service is temporarily unavailable. Please try again in a few moments"
          : errorMessage.includes("image") || errorMessage.includes("file")
          ? "Unable to process image. Please ensure the photo is clear and in a supported format (JPG, PNG)"
          : errorMessage.includes("size")
          ? "Image file is too large. Please upload a photo under 10MB"
          : errorMessage || "Unable to analyze photo with AI. Please try again",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.onerror = () => {
      toast({
        title: "Failed to load image",
        description: "Unable to read the image file. Please try another photo",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    if (!selectedImage) {
      toast({
        title: "No Image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    analyzeMutation.mutate({
      imageBase64: selectedImage,
      doorType,
      buildingType,
    });
  };

  const result = analyzeMutation.data;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800";
      case "severe": return "bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800";
      case "moderate": return "bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800";
      case "minor": return "bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800";
      default: return "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800";
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "excellent": return "text-green-700 dark:text-green-300";
      case "good": return "text-blue-700 dark:text-blue-300";
      case "fair": return "text-yellow-700 dark:text-yellow-300";
      case "poor": return "text-orange-700 dark:text-orange-300";
      case "critical": return "text-red-700 dark:text-red-300";
      default: return "text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="page-title">
          <Eye className="h-6 sm:h-8 w-6 sm:w-8" />
          Computer Vision Analysis
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          AI-powered photo analysis for door inspection, damage detection, and condition assessment
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Upload & Configuration */}
          <Card data-testid="card-upload">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Upload Photo</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Upload door photo for AI-powered analysis</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo-upload" className="text-xs sm:text-sm">Door Photo</Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                data-testid="input-photo-upload"
              />
            </div>

            {selectedImage && (
              <div className="border rounded-lg p-2">
                <img 
                  src={selectedImage} 
                  alt="Selected door" 
                  className="w-full h-48 object-cover rounded"
                  data-testid="img-preview"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="door-type" className="text-xs sm:text-sm">Door Type</Label>
              <Select value={doorType} onValueChange={setDoorType}>
                <SelectTrigger id="door-type" data-testid="select-door-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Door</SelectItem>
                  <SelectItem value="double">Double Door</SelectItem>
                  <SelectItem value="sliding">Sliding Door</SelectItem>
                  <SelectItem value="overhead">Overhead Door</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="building-type" className="text-xs sm:text-sm">Building Type</Label>
              <Select value={buildingType} onValueChange={setBuildingType}>
                <SelectTrigger id="building-type" data-testid="select-building-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAnalyze}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAnalyze(); }}
              disabled={!selectedImage || analyzeMutation.isPending}
              className="w-full text-xs sm:text-sm"
              size="sm"
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                  Analyze with Computer Vision
                </>
              )}
            </Button>
          </CardContent>
        </Card>

      {/* AI Analysis Results - Both Summary and Detailed */}
        <LockedFeature
          locked={!hasAiAudits}
          onClick={() => requireFeature("aiAudits", {
            featureName: "Computer Vision Analysis",
            featureDescription: "AI-powered photo analysis for comprehensive door inspection. Automatically detect damage, assess condition, identify compliance issues, and generate detailed reports. Available on Enterprise plan.",
          })}
          tierBadgeText="Enterprise"
          variant="overlay"
          featureName="Computer Vision Analysis"
        >
        {/* Quick Summary */}
        <Card data-testid="card-summary">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Analysis Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm">AI-powered inspection results</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {result && hasAiAudits ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="font-semibold text-sm sm:text-base">Overall Condition</span>
                  <span className={`text-lg font-bold ${getConditionColor(result.conditionReport.overallCondition)}`}>
                    {result.conditionReport.overallCondition.toUpperCase()}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Condition Score</span>
                    <span className="font-semibold">{result.conditionReport.conditionScore}/100</span>
                  </div>
                  <Progress value={result.conditionReport.conditionScore} />
                </div>

                {result.damageDetection.hasDamage && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <AlertTitle className="text-sm sm:text-base">Damage Detected</AlertTitle>
                    <AlertDescription>
                      {result.damageDetection.damageTypes.length} issue(s) found - 
                      Severity: {result.damageDetection.severity}
                    </AlertDescription>
                  </Alert>
                )}

                {result.conditionReport.safetyHazards.length > 0 && (
                  <Alert variant="destructive">
                    <FileWarning className="h-4 w-4 shrink-0" />
                    <AlertTitle className="text-sm sm:text-base">Safety Hazards</AlertTitle>
                    <AlertDescription>
                      {result.conditionReport.safetyHazards.length} safety concern(s) identified
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm">
                  <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
                    <div className="font-semibold">Door</div>
                    <div className="text-xs">{result.conditionReport.doorCondition.rating}</div>
                  </div>
                  <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
                    <div className="font-semibold">Frame</div>
                    <div className="text-xs">{result.conditionReport.frameCondition.rating}</div>
                  </div>
                  <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
                    <div className="font-semibold">Hardware</div>
                    <div className="text-xs">{result.conditionReport.hardwareCondition.rating}</div>
                  </div>
                </div>
              </div>
            ) : !hasAiAudits ? (
              <div className="text-center text-muted-foreground py-12">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upgrade to Enterprise to unlock AI-powered vision analysis</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload and analyze a photo to see AI-powered results</p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Detailed Results */}
        <Card data-testid="card-detailed-results">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Detailed Analysis</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Comprehensive AI vision inspection report</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {result && hasAiAudits ? (
              <Tabs defaultValue="specifications">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                  <TabsTrigger value="specifications" data-testid="tab-specifications">Specifications</TabsTrigger>
                  <TabsTrigger value="damage" data-testid="tab-damage">Damage Detection</TabsTrigger>
                  <TabsTrigger value="condition" data-testid="tab-condition">Condition Report</TabsTrigger>
                </TabsList>

                <TabsContent value="specifications" className="space-y-3 sm:space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {result.specifications.doorType && (
                    <div>
                      <div className="text-sm text-muted-foreground">Door Type</div>
                      <div className="font-medium">{result.specifications.doorType}</div>
                    </div>
                  )}
                  {result.specifications.width && (
                    <div>
                      <div className="text-sm text-muted-foreground">Width</div>
                      <div className="font-medium">{result.specifications.width}</div>
                    </div>
                  )}
                  {result.specifications.height && (
                    <div>
                      <div className="text-sm text-muted-foreground">Height</div>
                      <div className="font-medium">{result.specifications.height}</div>
                    </div>
                  )}
                  {result.specifications.material && (
                    <div>
                      <div className="text-sm text-muted-foreground">Material</div>
                      <div className="font-medium">{result.specifications.material}</div>
                    </div>
                  )}
                </div>

                {result.specifications.hardware && result.specifications.hardware.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">Hardware Detected</div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {result.specifications.hardware.map((hw: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs shrink-0">{hw}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Confidence: {(result.specifications.confidence * 100).toFixed(0)}%
                </div>
              </TabsContent>

              <TabsContent value="damage" className="space-y-3 sm:space-y-4 mt-4">
                {result.damageDetection.hasDamage ? (
                  <>
                    <div className={`p-3 sm:p-4 rounded-lg border ${getSeverityColor(result.damageDetection.severity)}`}>
                      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 flex-wrap">
                        <span className="font-semibold text-sm sm:text-base">Severity: {result.damageDetection.severity}</span>
                        <Badge variant={result.damageDetection.urgency === "immediate" ? "destructive" : "secondary"} className="shrink-0">
                          {result.damageDetection.urgency}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        {result.damageDetection.damageTypes.join(", ")}
                      </div>
                    </div>

                    {result.damageDetection.damageDescriptions.map((desc: string, idx: number) => (
                      <div key={idx} className="border-l-4 border-orange-500 pl-4">
                        <p className="text-sm">{desc}</p>
                      </div>
                    ))}

                    {result.damageDetection.repairRecommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm sm:text-base mb-2">Repair Recommendations</h4>
                        <ul className="space-y-1">
                          {result.damageDetection.repairRecommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-xs sm:text-sm flex items-start gap-2 min-w-0">
                              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <AlertTitle className="text-sm sm:text-base">No Damage Detected</AlertTitle>
                    <AlertDescription>
                      No visible damage, wear, or safety issues were identified in the photo.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="condition" className="space-y-3 sm:space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                      <CardTitle className="text-xs sm:text-sm">Door</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className={`text-lg font-bold ${getConditionColor(result.conditionReport.doorCondition.rating)}`}>
                        {result.conditionReport.doorCondition.rating}
                      </div>
                      {result.conditionReport.doorCondition.issues.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {result.conditionReport.doorCondition.issues.map((issue: string, idx: number) => (
                            <li key={idx} className="text-xs text-muted-foreground">• {issue}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                      <CardTitle className="text-xs sm:text-sm">Frame</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className={`text-lg font-bold ${getConditionColor(result.conditionReport.frameCondition.rating)}`}>
                        {result.conditionReport.frameCondition.rating}
                      </div>
                      {result.conditionReport.frameCondition.issues.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {result.conditionReport.frameCondition.issues.map((issue: string, idx: number) => (
                            <li key={idx} className="text-xs text-muted-foreground">• {issue}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                      <CardTitle className="text-xs sm:text-sm">Hardware</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className={`text-lg font-bold ${getConditionColor(result.conditionReport.hardwareCondition.rating)}`}>
                        {result.conditionReport.hardwareCondition.rating}
                      </div>
                      {result.conditionReport.hardwareCondition.issues.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {result.conditionReport.hardwareCondition.issues.map((issue: string, idx: number) => (
                            <li key={idx} className="text-xs text-muted-foreground">• {issue}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {result.conditionReport.maintenanceNeeded.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base mb-2">Maintenance Required</h4>
                    <ul className="space-y-1">
                      {result.conditionReport.maintenanceNeeded.map((item: string, idx: number) => (
                        <li key={idx} className="text-xs sm:text-sm flex items-start gap-2 min-w-0">
                          <span className="text-orange-500 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.conditionReport.replacementRecommended && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <AlertTitle className="text-sm sm:text-base">Replacement Recommended</AlertTitle>
                    <AlertDescription>
                      Based on the condition assessment, replacement is recommended.
                      {result.conditionReport.estimatedLifeRemaining && (
                        <> Estimated life remaining: {result.conditionReport.estimatedLifeRemaining}</>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
            ) : !hasAiAudits ? (
              <div className="text-center text-muted-foreground py-12">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upgrade to Enterprise to unlock comprehensive AI vision reports</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload and analyze a photo to see detailed AI analysis</p>
              </div>
            )}
          </CardContent>
        </Card>
        </LockedFeature>
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
