import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertCircle } from "lucide-react";
import type { DoorLocation, FloorPlan } from "@shared/schema";

type OpeningMarker = {
  id: string;
  openingId: string;
  openingNumber: string;
  location: string;
  xPosition: number;
  yPosition: number;
  rotation?: number;
  doorType?: string;
  status?: string;
};

type FloorPlanWithMarkers = FloorPlan & {
  markers: OpeningMarker[];
};

interface FloorPlanViewerProps {
  floorPlanId: string;
  onOpeningSelect?: (openingId: string) => void;
}

export function FloorPlanViewer({ floorPlanId, onOpeningSelect }: FloorPlanViewerProps) {
  const [, navigate] = useLocation();
  const [selectedMarker, setSelectedMarker] = useState<OpeningMarker | null>(null);

  const { data: floorPlan, isLoading, error } = useQuery<FloorPlanWithMarkers>({
    queryKey: ["/api/floorplans", floorPlanId],
  });

  const handleMarkerClick = (marker: OpeningMarker) => {
    setSelectedMarker(marker);
    onOpeningSelect?.(marker.openingId);
  };

  const handleNavigateToOpening = (openingId: string) => {
    navigate(`/openings/${openingId}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 h-[600px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[500px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !floorPlan) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center flex-col gap-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load floor plan</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {floorPlan.name}
          </CardTitle>
          {floorPlan.building && floorPlan.floor && (
            <p className="text-sm text-muted-foreground">
              {floorPlan.building} - {floorPlan.floor}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="relative overflow-auto border rounded-lg">
            {floorPlan.imageData ? (
              <img
                src={`data:${floorPlan.imageMimeType};base64,${floorPlan.imageData}`}
                alt={floorPlan.name}
                className="block max-w-full"
                style={{
                  width: floorPlan.imageWidth ? `${floorPlan.imageWidth}px` : 'auto',
                  height: floorPlan.imageHeight ? `${floorPlan.imageHeight}px` : 'auto',
                }}
              />
            ) : (
              <div className="w-full h-[500px] flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No floor plan image</p>
              </div>
            )}

            {floorPlan.markers.map((marker) => (
              <Button
                key={marker.id}
                size="icon"
                variant={selectedMarker?.id === marker.id ? "default" : "outline"}
                className="absolute w-9 h-9 rounded-full shadow-lg hover-elevate active-elevate-2"
                style={{
                  left: `${marker.xPosition}px`,
                  top: `${marker.yPosition}px`,
                  transform: "translate(-50%, -50%)",
                }}
                onClick={() => handleMarkerClick(marker)}
                aria-label={`Opening ${marker.openingNumber}`}
                data-testid={`marker-opening-${marker.openingId}`}
              >
                <span className="text-xs font-semibold">
                  {marker.openingNumber.replace(/[^0-9A-Z]/g, "").slice(-3) || "NEW"}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opening Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {selectedMarker ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{selectedMarker.openingNumber}</h3>
                    {selectedMarker.status && (
                      <Badge variant={selectedMarker.status === "complete" ? "default" : "secondary"}>
                        {selectedMarker.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedMarker.location}</p>
                </div>

                {selectedMarker.doorType && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Door Type</p>
                    <p className="text-sm font-medium">{selectedMarker.doorType}</p>
                  </div>
                )}

                {selectedMarker.rotation !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rotation</p>
                    <p className="text-sm font-medium">{selectedMarker.rotation}°</p>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    className="w-full"
                    onClick={() => handleNavigateToOpening(selectedMarker.openingId)}
                    data-testid="button-view-opening-detail"
                  >
                    View Full Details
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-center">
                <p className="text-sm text-muted-foreground">
                  Click a marker on the floor plan to view opening details
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
