import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Camera,
  Upload,
  X,
  ScanText,
  Sparkles,
  Pencil,
  Loader2,
  CheckCircle2,
  Eye,
  Crosshair,
} from "lucide-react";
import type { Photo, PhotoType } from "@shared/schema";
import { photoTypes } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { OCRDialog } from "@/components/ocr-dialog";
import { AIPhotoAnalyzer } from "@/components/ai-photo-analyzer";
import { PhotoAnnotator, type Annotation, type HardwareItemRef } from "@/components/photo-annotator";
import { PhotoAnnotationOverlay } from "@/components/photo-annotation-overlay";
import { AnnotatedPhotoExport } from "@/components/annotated-photo-export";
import { OptimizedImage } from "@/components/optimized-image";
import { MapPin } from "lucide-react";
import { getRequiredPhotoTypes, getMissingPhotoTypes, photoTypeLabels, photoTypeDescriptions } from "@shared/photoVerification";
import { useOpeningDetail } from "../context";

export default function PhotosPanel() {
  const { opening, project, photosQuery, hardwareQuery, refetchAll } = useOpeningDetail();
  const { data: photos = [] } = photosQuery;
  const { data: hardwareItems = [] } = hardwareQuery;
  const { toast } = useToast();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [selectedPhotoType, setSelectedPhotoType] = useState<PhotoType>("general");
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [selectedPhotoForOCR, setSelectedPhotoForOCR] = useState<Photo | null>(null);
  const [aiAnalyzerOpen, setAiAnalyzerOpen] = useState(false);
  const [selectedPhotoForAI, setSelectedPhotoForAI] = useState<Photo | null>(null);
  const [annotatorOpen, setAnnotatorOpen] = useState(false);
  const [selectedPhotoForAnnotation, setSelectedPhotoForAnnotation] = useState<Photo | null>(null);
  const [exportViewPhoto, setExportViewPhoto] = useState<Photo | null>(null);

  const hardwareItemRefs: HardwareItemRef[] = hardwareItems.map(hw => ({
    id: hw.id,
    itemType: hw.itemType,
    manufacturer: hw.manufacturer,
    model: hw.model,
    description: hw.description,
    condition: hw.condition,
    finish: hw.finish,
  }));

  const doorInfo = {
    doorType: opening.doorType,
    doorMaterial: opening.doorMaterial,
    doorWidth: opening.doorWidth,
    doorHeight: opening.doorHeight,
  };

  const frameInfo = {
    frameType: opening.frameType,
    frameMaterial: opening.frameMaterial,
    frameWidth: opening.frameWidth,
    frameDepth: opening.frameDepth,
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getGpsPosition = (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  const uploadPhoto = useMutation({
    mutationFn: async () => {
      if (!photoFile) throw new Error("No file selected");

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(photoFile);
      });

      const [base64, gps] = await Promise.all([base64Promise, getGpsPosition()]);

      return await apiRequest("POST", "/api/photos", {
        openingId: opening.id,
        url: base64,
        filename: photoFile.name,
        photoType: selectedPhotoType,
        annotations: null,
        ...(gps && {
          gpsLat: gps.lat,
          gpsLng: gps.lng,
          gpsAccuracy: gps.accuracy,
          gpsSource: "device",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${opening.id}/photos`] });
      toast({
        title: "Photo uploaded",
        description: "Photo has been added successfully.",
      });
      setPhotoFile(null);
      setPhotoPreview("");
      setSelectedPhotoType("general");
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const savePhotoAnnotations = async (photoId: string, annotations: Annotation[]) => {
    try {
      await apiRequest("PATCH", `/api/photos/${photoId}`, {
        annotations,
      });

      await queryClient.invalidateQueries({ queryKey: [`/api/openings/${opening.id}/photos`] });

      toast({
        title: "Annotations saved",
        description: "Photo annotations have been saved successfully.",
      });

      setAnnotatorOpen(false);
      setSelectedPhotoForAnnotation(null);
    } catch (error) {
      toast({
        title: "Failed to save annotations",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const requiredTypes = getRequiredPhotoTypes(opening);
  const uploadedTypes = photos.map(p => p.photoType as PhotoType);
  const missingTypes = getMissingPhotoTypes(opening, uploadedTypes);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Photo Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {missingTypes.length > 0 ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                Required photos missing ({missingTypes.length})
              </p>
              <ul className="space-y-1">
                {missingTypes.map(type => (
                  <li key={type} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    {photoTypeLabels[type]}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-4">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                All required photos uploaded
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requiredTypes.map(type => {
              const hasPhoto = uploadedTypes.includes(type);
              return (
                <div
                  key={type}
                  className={`rounded-md border p-3 ${
                    hasPhoto
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-destructive/5 border-destructive/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-2 w-2 rounded-full ${
                      hasPhoto ? 'bg-emerald-500' : 'bg-destructive'
                    }`} />
                    <p className="text-xs font-medium">
                      {photoTypeLabels[type]}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasPhoto ? 'Uploaded' : 'Required'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Photo Type</label>
              <Select
                value={selectedPhotoType}
                onValueChange={(value) => setSelectedPhotoType(value as PhotoType)}
              >
                <SelectTrigger data-testid="select-photo-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {photoTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {photoTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {photoTypeDescriptions[selectedPhotoType]}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                data-testid="input-photo-file"
              />
              {photoFile && (
                <Button
                  onClick={() => uploadPhoto.mutate()}
                  disabled={uploadPhoto.isPending}
                  data-testid="button-upload-photo"
                >
                  {uploadPhoto.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {photoPreview && (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="max-w-md rounded-md border"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview("");
                }}
                title="Remove preview"
                aria-label="Remove preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {photos.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <Card key={photo.id} data-testid={`card-photo-${photo.id}`}>
              <CardContent className="p-4">
                <div className="relative mb-3">
                  <OptimizedImage
                    src={photo.url}
                    alt={photo.filename}
                    className="w-full h-48 object-cover rounded-md"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {Array.isArray(photo.annotations) && (photo.annotations as Annotation[]).length > 0 && (
                    <PhotoAnnotationOverlay
                      photoUrl={photo.url}
                      annotations={photo.annotations as Annotation[]}
                      className="absolute inset-0 w-full h-48 rounded-md"
                    />
                  )}
                  <Badge
                    className="absolute top-2 left-2 bg-background/90 text-foreground border"
                    data-testid={`badge-photo-type-${photo.id}`}
                  >
                    {photoTypeLabels[photo.photoType as PhotoType] || photo.photoType}
                  </Badge>
                  {(photo as any).gpsLat && (photo as any).gpsLng && (
                    <Badge
                      className="absolute top-2 right-2 bg-background/90 text-foreground border text-xs"
                      data-testid={`badge-gps-${photo.id}`}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      GPS
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {photo.filename}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPhotoForAnnotation(photo);
                        setAnnotatorOpen(true);
                      }}
                      data-testid={`button-annotate-${photo.id}`}
                      title="Annotate & Highlight"
                      aria-label="Annotate and highlight photo"
                    >
                      <Crosshair className="h-4 w-4" />
                    </Button>
                    {Array.isArray(photo.annotations) && (photo.annotations as Annotation[]).some(a => a.type === "element-highlight") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExportViewPhoto(exportViewPhoto?.id === photo.id ? null : photo)}
                        data-testid={`button-export-view-${photo.id}`}
                        title="View annotated export"
                        aria-label="View annotated export"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPhotoForOCR(photo);
                        setOcrDialogOpen(true);
                      }}
                      data-testid={`button-ocr-${photo.id}`}
                      title="Extract text (OCR)"
                      aria-label="Extract text from photo (OCR)"
                    >
                      <ScanText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPhotoForAI(photo);
                        setAiAnalyzerOpen(true);
                      }}
                      data-testid={`button-ai-analyze-${photo.id}`}
                      title="AI analyze"
                      aria-label="AI analyze photo"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(photo.capturedAt).toLocaleDateString()}
                  </p>
                  {(photo as any).gpsLat && (photo as any).gpsLng && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-gps-coords-${photo.id}`}>
                      <MapPin className="h-3 w-3" />
                      {Number((photo as any).gpsLat).toFixed(4)}, {Number((photo as any).gpsLng).toFixed(4)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No photos yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload photos to document this door opening
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPhotoForOCR && (
        <OCRDialog
          open={ocrDialogOpen}
          onOpenChange={setOcrDialogOpen}
          imageUrl={selectedPhotoForOCR.url}
          imageName={selectedPhotoForOCR.filename}
        />
      )}

      {selectedPhotoForAI && (
        <Dialog open={aiAnalyzerOpen} onOpenChange={setAiAnalyzerOpen}>
          <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Photo Analysis</DialogTitle>
              <DialogDescription>
                Analyzing {selectedPhotoForAI.filename} to extract door specifications
              </DialogDescription>
            </DialogHeader>
            <AIPhotoAnalyzer
              imageBase64={selectedPhotoForAI.url}
              buildingType={project?.buildingType}
              onApplyData={(data) => {
                toast({
                  title: "AI analysis complete",
                  description: "Specifications extracted from photo. You can now create/update a door opening with this data.",
                });
                setAiAnalyzerOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedPhotoForAnnotation && (
        <PhotoAnnotator
          open={annotatorOpen}
          onOpenChange={setAnnotatorOpen}
          photoUrl={selectedPhotoForAnnotation.url}
          existingAnnotations={(selectedPhotoForAnnotation.annotations as Annotation[]) || []}
          onSave={(annotations) => savePhotoAnnotations(selectedPhotoForAnnotation.id, annotations)}
          hardwareItems={hardwareItemRefs}
          doorInfo={doorInfo}
          frameInfo={frameInfo}
        />
      )}

      {exportViewPhoto && (
        <div className="mt-4">
          <AnnotatedPhotoExport
            photoUrl={exportViewPhoto.url}
            photoName={exportViewPhoto.filename}
            annotations={(exportViewPhoto.annotations as Annotation[]) || []}
            openingNumber={opening.openingNumber || undefined}
            openingLocation={opening.location || undefined}
            projectName={project?.name}
          />
        </div>
      )}
    </div>
  );
}
