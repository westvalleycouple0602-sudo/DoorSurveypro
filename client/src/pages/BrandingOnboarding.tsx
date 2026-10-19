import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle2, Upload, Palette, FileText, Sparkles, ArrowRight, ArrowLeft, Crop, Wand2 } from "lucide-react";
import { useLocation } from "wouter";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface OnboardingProgress {
  logoUploaded: boolean;
  colorsSet: boolean;
  headersSet: boolean;
  watermarkSet: boolean;
  profileCreated: boolean;
}

interface BrandingData {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  headerText: string | null;
  footerText: string | null;
  watermarkText: string | null;
}

interface OnboardingStatusResponse {
  status: string;
  progress: Record<string, { completed: boolean; data?: any }> | null;
  exportBranding: BrandingData | null;
}

const STEPS = [
  { id: 1, title: "Company Logo", description: "Upload your company logo for professional quotes", icon: Upload },
  { id: 2, title: "Brand Colors", description: "Set your brand colors for consistent styling", icon: Palette },
  { id: 3, title: "Headers & Footers", description: "Customize quote headers and footers", icon: FileText },
  { id: 4, title: "Watermark", description: "Add an optional watermark to your documents", icon: Sparkles },
];

export default function BrandingOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [brandingData, setBrandingData] = useState<BrandingData>({
    logoUrl: null,
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    accentColor: "#F59E0B",
    headerText: null,
    footerText: null,
    watermarkText: null,
  });
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isInitialLoad = useRef(true);

  // Logo cropping state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedColors, setExtractedColors] = useState<{ primary: string; secondary: string; accent: string } | null>(null);
  const [colorConfidence, setColorConfidence] = useState<number>(0);

  // Auto-detect crop boundaries using luminance thresholding
  const detectCropBoundaries = useCallback((imageSrc: string): Promise<Area> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ x: 0, y: 0, width: img.width, height: img.height });
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;

        // Find bounding box using luminance threshold
        let minX = width, minY = height, maxX = 0, maxY = 0;
        const threshold = 250; // Luminance threshold for white/transparent

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            // If pixel is not white/transparent, include in bounding box
            if (a > 10 && luminance < threshold) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // Add 5% padding
        const padding = 0.05;
        const paddingX = Math.floor((maxX - minX) * padding);
        const paddingY = Math.floor((maxY - minY) * padding);

        const finalX = Math.max(0, minX - paddingX);
        const finalY = Math.max(0, minY - paddingY);
        const finalWidth = Math.min(width - finalX, maxX - minX + paddingX * 2);
        const finalHeight = Math.min(height - finalY, maxY - minY + paddingY * 2);

        // Fallback to full image if detection confidence is low
        if (finalWidth < width * 0.1 || finalHeight < height * 0.1) {
          resolve({ x: 0, y: 0, width, height });
        } else {
          resolve({ x: finalX, y: finalY, width: finalWidth, height: finalHeight });
        }
      };
      img.src = imageSrc;
    });
  }, []);

  // Handle crop completion from react-easy-crop
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Create cropped image blob
  const createCroppedImage = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      }, "image/png");
    });
  };

  // Process and upload cropped logo
  const processLogo = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await createCroppedImage(imageToCrop, croppedAreaPixels);
      const formData = new FormData();
      formData.append("logo", croppedBlob, "logo.png");

      // Get CSRF token
      const csrfRes = await fetch("/api/csrf-token", { credentials: "include" });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken || "";

      const response = await fetch("/api/onboarding/branding/logo/process", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "x-csrf-token": csrfToken,
        },
      });

      if (response.ok) {
        const { url, colors, confidence } = await response.json();
        setBrandingData({ ...brandingData, logoUrl: url });
        setExtractedColors(colors);
        setColorConfidence(confidence);
        setImageToCrop(null); // Clear cropper
        toast({
          title: "Logo processed successfully",
          description: confidence > 50 
            ? "Brand colors detected and applied!" 
            : "Logo processed. You may want to adjust colors manually.",
        });
      } else {
        throw new Error("Processing failed");
      }
    } catch (error) {
      toast({
        title: "Processing error",
        description: "Failed to process logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch onboarding status
  const { data: onboardingStatus, isLoading } = useQuery<OnboardingStatusResponse>({
    queryKey: ["/api/onboarding/branding"],
  });

  // Auto-populate colors from extraction
  useEffect(() => {
    if (extractedColors && colorConfidence > 30) {
      setBrandingData(prev => ({
        ...prev,
        primaryColor: extractedColors.primary,
        secondaryColor: extractedColors.secondary,
        accentColor: extractedColors.accent,
      }));
    }
  }, [extractedColors, colorConfidence]);

  // Hydrate state from onboarding status ONLY on initial load
  useEffect(() => {
    if (onboardingStatus && isInitialLoad.current) {
      const { progress, exportBranding } = onboardingStatus;
      
      // Restore branding data from existing branding
      if (exportBranding) {
        setBrandingData({
          logoUrl: exportBranding.logoUrl,
          primaryColor: exportBranding.primaryColor || "#3B82F6",
          secondaryColor: exportBranding.secondaryColor || "#10B981",
          accentColor: exportBranding.accentColor || "#F59E0B",
          headerText: exportBranding.headerText,
          footerText: exportBranding.footerText,
          watermarkText: exportBranding.watermarkText,
        });
      }
      
      // Resume from last incomplete step
      if (progress) {
        const steps = ["step1", "step2", "step3", "step4"];
        const firstIncomplete = steps.findIndex(s => !progress[s]?.completed);
        if (firstIncomplete >= 0) {
          setCurrentStep(firstIncomplete + 1);
        }
      }
      
      // Mark initial load as complete
      isInitialLoad.current = false;
    }
  }, [onboardingStatus]);

  // Update onboarding progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: string; data: Record<string, any> }) => {
      const response = await apiRequest("PATCH", "/api/onboarding/branding/progress", { stepId, data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/branding"] });
    },
  });

  // Complete onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/onboarding/branding/complete");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Branding Setup Complete!",
        description: "You're all set to create professional quotes.",
      });
      navigate("/dashboard");
    },
  });

  const handleNext = async () => {
    // Validate current step before proceeding
    const isStepValid = validateCurrentStep();
    if (!isStepValid) {
      toast({
        title: "Please complete this step",
        description: "Fill in all required fields before proceeding.",
        variant: "destructive",
      });
      return;
    }

    // Auto-save current step before moving to next
    await saveCurrentStep();
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - complete onboarding
      await completeOnboardingMutation.mutateAsync();
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!brandingData.logoUrl;
      case 2:
        return !!(brandingData.primaryColor && brandingData.secondaryColor && brandingData.accentColor);
      case 3:
        return !!(brandingData.headerText && brandingData.footerText);
      case 4:
        return true; // Watermark is optional
      default:
        return false;
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveCurrentStep = async () => {
    const stepData: Record<number, Partial<BrandingData>> = {
      1: { logoUrl: brandingData.logoUrl },
      2: {
        primaryColor: brandingData.primaryColor,
        secondaryColor: brandingData.secondaryColor,
        accentColor: brandingData.accentColor,
      },
      3: {
        headerText: brandingData.headerText,
        footerText: brandingData.footerText,
      },
      4: {
        watermarkText: brandingData.watermarkText,
      },
    };

    const data = stepData[currentStep];
    if (data && Object.values(data).some(v => v !== null)) {
      // Update progress with correct payload structure
      await updateProgressMutation.mutateAsync({
        stepId: `step${currentStep}`,
        data: data as Record<string, any>,
      });
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3 sm:space-y-4">
            {!imageToCrop && !brandingData.logoUrl && (
              <>
                <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 md:p-8 text-center hover-elevate">
                  <Upload className="mx-auto h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground mb-2 sm:mb-3 md:mb-4" />
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Click to upload your company logo
                    </span>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (evt) => {
                            const imageSrc = evt.target?.result as string;
                            setImageToCrop(imageSrc);
                            
                            // Auto-detect crop boundaries
                            try {
                              const boundaries = await detectCropBoundaries(imageSrc);
                              const img = new Image();
                              img.onload = () => {
                                // Calculate initial crop position to center on detected area
                                const cropX = ((boundaries.x + boundaries.width / 2) / img.width) * 100 - 50;
                                const cropY = ((boundaries.y + boundaries.height / 2) / img.height) * 100 - 50;
                                setCrop({ x: cropX, y: cropY });
                                
                                // Calculate zoom to fit detected area
                                const zoomX = img.width / boundaries.width;
                                const zoomY = img.height / boundaries.height;
                                setZoom(Math.min(zoomX, zoomY) * 0.9);
                              };
                              img.src = imageSrc;
                            } catch (error) {
                              // handled
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      data-testid="input-logo-upload"
                    />
                  </Label>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                  Recommended: PNG or SVG format, transparent background, 500x200px
                </p>
              </>
            )}

            {imageToCrop && (
              <div className="space-y-3 sm:space-y-4">
                <div className="relative w-full h-64 sm:h-80 md:h-96 bg-muted rounded-lg overflow-hidden">
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={5 / 2}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Label className="text-xs sm:text-sm shrink-0">Zoom:</Label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 min-w-0"
                    data-testid="slider-zoom"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageToCrop(null);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                    }}
                    className="text-xs sm:text-sm"
                    data-testid="button-cancel-crop"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={processLogo}
                    disabled={isProcessing}
                    className="flex-1 text-xs sm:text-sm"
                    data-testid="button-process-logo"
                  >
                    {isProcessing ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline">Process & Extract Colors</span>
                        <span className="sm:hidden">Process</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {brandingData.logoUrl && !imageToCrop && (
              <div className="space-y-3 sm:space-y-4">
                <div className="border border-border rounded-lg p-3 sm:p-4 bg-muted/30">
                  <img
                    src={brandingData.logoUrl}
                    alt="Company logo"
                    className="w-full max-w-md mx-auto"
                    data-testid="img-processed-logo"
                  />
                </div>
                {extractedColors && colorConfidence > 0 && (
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Palette className="h-4 w-4 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">
                        Colors extracted {colorConfidence > 50 ? "with high confidence" : "(manual review recommended)"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded border shrink-0" style={{ backgroundColor: extractedColors.primary }} />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Primary</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded border shrink-0" style={{ backgroundColor: extractedColors.secondary }} />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Secondary</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded border shrink-0" style={{ backgroundColor: extractedColors.accent }} />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">Accent</span>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs sm:text-sm"
                  onClick={() => {
                    setBrandingData({ ...brandingData, logoUrl: null });
                    setExtractedColors(null);
                    setColorConfidence(0);
                  }}
                  data-testid="button-change-logo"
                >
                  <Upload className="h-4 w-4 mr-2 shrink-0" />
                  Upload Different Logo
                </Button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="primary-color" className="text-sm" data-testid="label-primary-color">Primary Color</Label>
              <div className="flex gap-2 min-w-0">
                <Input
                  id="primary-color"
                  type="color"
                  value={brandingData.primaryColor || "#3B82F6"}
                  onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                  className="w-12 h-9 sm:w-20 sm:h-10 shrink-0"
                  data-testid="input-primary-color"
                />
                <Input
                  type="text"
                  value={brandingData.primaryColor || "#3B82F6"}
                  onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                  className="flex-1 min-w-0 text-sm font-mono"
                  placeholder="#3B82F6"
                  data-testid="input-primary-color-text"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="secondary-color" className="text-sm" data-testid="label-secondary-color">Secondary Color</Label>
              <div className="flex gap-2 min-w-0">
                <Input
                  id="secondary-color"
                  type="color"
                  value={brandingData.secondaryColor || "#10B981"}
                  onChange={(e) => setBrandingData({ ...brandingData, secondaryColor: e.target.value })}
                  className="w-12 h-9 sm:w-20 sm:h-10 shrink-0"
                  data-testid="input-secondary-color"
                />
                <Input
                  type="text"
                  value={brandingData.secondaryColor || "#10B981"}
                  onChange={(e) => setBrandingData({ ...brandingData, secondaryColor: e.target.value })}
                  className="flex-1 min-w-0 text-sm font-mono"
                  placeholder="#10B981"
                  data-testid="input-secondary-color-text"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="accent-color" className="text-sm" data-testid="label-accent-color">Accent Color</Label>
              <div className="flex gap-2 min-w-0">
                <Input
                  id="accent-color"
                  type="color"
                  value={brandingData.accentColor || "#F59E0B"}
                  onChange={(e) => setBrandingData({ ...brandingData, accentColor: e.target.value })}
                  className="w-12 h-9 sm:w-20 sm:h-10 shrink-0"
                  data-testid="input-accent-color"
                />
                <Input
                  type="text"
                  value={brandingData.accentColor || "#F59E0B"}
                  onChange={(e) => setBrandingData({ ...brandingData, accentColor: e.target.value })}
                  className="flex-1 min-w-0 text-sm font-mono"
                  placeholder="#F59E0B"
                  data-testid="input-accent-color-text"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="header-text" className="text-sm" data-testid="label-header-text">Header Text</Label>
              <Textarea
                id="header-text"
                value={brandingData.headerText || ""}
                onChange={(e) => setBrandingData({ ...brandingData, headerText: e.target.value })}
                placeholder="e.g., Your Company Name | Professional Door Survey"
                rows={3}
                className="text-sm"
                data-testid="textarea-header-text"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                This appears at the top of every quote document
              </p>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="footer-text" className="text-sm" data-testid="label-footer-text">Footer Text</Label>
              <Textarea
                id="footer-text"
                value={brandingData.footerText || ""}
                onChange={(e) => setBrandingData({ ...brandingData, footerText: e.target.value })}
                placeholder="e.g., Contact: info@yourcompany.com | Phone: (555) 123-4567"
                rows={3}
                className="text-sm"
                data-testid="textarea-footer-text"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                This appears at the bottom of every quote document
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="watermark-text" className="text-sm" data-testid="label-watermark-text">Watermark Text (Optional)</Label>
              <Input
                id="watermark-text"
                value={brandingData.watermarkText || ""}
                onChange={(e) => setBrandingData({ ...brandingData, watermarkText: e.target.value })}
                placeholder="e.g., DRAFT, CONFIDENTIAL, PRELIMINARY"
                className="text-sm"
                data-testid="input-watermark-text"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Add a watermark to appear diagonally across quote pages. Leave empty for no watermark.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mt-4 sm:mt-6">
              <h4 className="font-medium text-xs sm:text-sm mb-1.5 sm:mb-2 flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                Almost Done!
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your branding setup is complete. Click "Finish Setup" to start creating professional quotes with your custom branding.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const StepIcon = STEPS[currentStep - 1]?.icon || Upload;

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto p-3 sm:p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto p-3 sm:p-4 md:p-6" data-testid="page-branding-onboarding">
      <div className="mb-6 sm:mb-8 text-center min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2" data-testid="heading-onboarding-title">
          Welcome to DoorSurvey Pro
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-onboarding-subtitle">
          Let's set up your company branding for professional quotes
        </p>
      </div>

      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 min-w-0">
          <span className="text-xs sm:text-sm font-medium" data-testid="text-step-indicator">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground" data-testid="text-progress-percentage">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="h-1.5 sm:h-2" data-testid="progress-onboarding" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isComplete = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <div
              key={step.id}
              className={`p-2 sm:p-3 rounded-lg border text-center transition-colors ${
                isComplete ? "bg-primary/10 border-primary/20" : isCurrent ? "bg-muted border-border" : "bg-background border-muted"
              }`}
              data-testid={`step-indicator-${step.id}`}
            >
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 shrink-0 ${isComplete ? "text-primary" : isCurrent ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[10px] sm:text-xs leading-tight ${isComplete || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <Card data-testid="card-onboarding-step">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
              <StepIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg" data-testid="heading-step-title">{STEPS[currentStep - 1]?.title}</CardTitle>
              <CardDescription className="text-xs sm:text-sm" data-testid="text-step-description">{STEPS[currentStep - 1]?.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between gap-2 sm:gap-3 p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="text-xs sm:text-sm"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
            Back
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            disabled={updateProgressMutation.isPending || completeOnboardingMutation.isPending}
            className="text-xs sm:text-sm"
            data-testid="button-next"
          >
            {currentStep === STEPS.length ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                Finish Setup
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-1 sm:ml-2 shrink-0" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
