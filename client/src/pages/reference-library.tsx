import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Wrench, 
  Flame, 
  Zap, 
  FileText, 
  Cable,
  Search,
  Info,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorState } from "@/components/error-state";
import type {
  HmMaterial,
  HmFrame,
  FireRating,
  FireLabel,
  ElectrifiedHardware,
  OrderingGuideline,
  RacewayAndEpt,
  DoorReferenceLibrary
} from "@shared/schema";

// Summary response type
interface DoorSummary {
  total: number;
  categories: { category: string; count: number }[];
}

interface FireSummary {
  ratings: number;
  labels: number;
}

interface HollowMetalSummary {
  materials: number;
  frames: number;
}

interface Summary {
  doors: DoorSummary;
  fire: FireSummary;
  hollowMetal: HollowMetalSummary;
  electrifiedHardware: number;
  orderingGuidelines: number;
  racewaysAndEpts: number;
}

export default function ReferenceLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [doorFilters, setDoorFilters] = useState({
    category: "all",
    material: "all",
    operation: "all",
  });

  // Fetch summary
  const { 
    data: summary, 
    isLoading: summaryLoading, 
    isError: summaryError,
    error: summaryErrorObj,
    refetch: refetchSummary
  } = useQuery<Summary>({
    queryKey: ["/api/reference/summary"],
    retry: 2,
  });

  // Fetch door reference library
  const { 
    data: doors, 
    isLoading: doorsLoading, 
    isError: doorsError,
    error: doorsErrorObj,
    refetch: refetchDoors
  } = useQuery<DoorReferenceLibrary[]>({
    queryKey: ["/api/reference/doors", doorFilters, searchTerm],
    queryFn: async () => {
      // Build query parameters, filtering out "all" values
      const params = new URLSearchParams();
      if (doorFilters.category && doorFilters.category !== "all") params.append("category", doorFilters.category);
      if (doorFilters.material && doorFilters.material !== "all") params.append("material", doorFilters.material);
      if (doorFilters.operation && doorFilters.operation !== "all") params.append("operation", doorFilters.operation);
      if (searchTerm) params.append("search", searchTerm);
      
      const url = `/api/reference/doors${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doors");
      return res.json();
    },
    retry: 2,
  });

  // Fetch materials
  const { 
    data: materials, 
    isLoading: materialsLoading, 
    isError: materialsError,
    error: materialsErrorObj,
    refetch: refetchMaterials
  } = useQuery<HmMaterial[]>({
    queryKey: ["/api/reference/hm/materials"],
    retry: 2,
  });

  // Fetch frames
  const { 
    data: frames, 
    isLoading: framesLoading, 
    isError: framesError,
    error: framesErrorObj,
    refetch: refetchFrames
  } = useQuery<HmFrame[]>({
    queryKey: ["/api/reference/hm/frames"],
    retry: 2,
  });

  // Fetch fire ratings
  const { 
    data: fireRatings, 
    isLoading: fireRatingsLoading, 
    isError: fireRatingsError,
    error: fireRatingsErrorObj,
    refetch: refetchFireRatings
  } = useQuery<FireRating[]>({
    queryKey: ["/api/reference/fire/ratings"],
    retry: 2,
  });

  // Fetch fire labels
  const { 
    data: fireLabels, 
    isLoading: fireLabelsLoading, 
    isError: fireLabelsError,
    error: fireLabelsErrorObj,
    refetch: refetchFireLabels
  } = useQuery<FireLabel[]>({
    queryKey: ["/api/reference/fire/labels"],
    retry: 2,
  });

  // Fetch electrified hardware
  const { 
    data: electrifiedHardware, 
    isLoading: electrifiedLoading, 
    isError: electrifiedError,
    error: electrifiedErrorObj,
    refetch: refetchElectrified
  } = useQuery<ElectrifiedHardware[]>({
    queryKey: ["/api/reference/hardware/electrified"],
    retry: 2,
  });

  // Fetch ordering guidelines
  const { 
    data: orderingGuidelines, 
    isLoading: guidelinesLoading, 
    isError: guidelinesError,
    error: guidelinesErrorObj,
    refetch: refetchGuidelines
  } = useQuery<OrderingGuideline[]>({
    queryKey: ["/api/reference/guidelines/ordering"],
    retry: 2,
  });

  // Fetch raceways
  const { 
    data: raceways, 
    isLoading: racewaysLoading, 
    isError: racewaysError,
    error: racewaysErrorObj,
    refetch: refetchRaceways
  } = useQuery<RacewayAndEpt[]>({
    queryKey: ["/api/reference/hardware/raceways"],
    retry: 2,
  });

  if (summaryError) {
    return (
      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <ErrorState
          title="Failed to load reference summary"
          message={summaryErrorObj instanceof Error ? summaryErrorObj.message : "Unable to fetch reference library summary"}
          error={summaryErrorObj as Error}
          onRetry={refetchSummary}
          testId="error-summary"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6" data-testid="page-reference-library">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 min-w-0" data-testid="heading-reference-library">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 shrink-0" />
            <span className="truncate">Industry Reference Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
            Comprehensive technical specifications and industry standards for commercial doors and hardware
          </p>
        </div>
        
        {summary && (
          <Card className="w-full sm:w-auto shrink-0">
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm">Reference Data</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 text-xs sm:text-sm">
              <div className="flex justify-between gap-2 sm:gap-4">
                <span className="text-muted-foreground">Door Specs:</span>
                <span className="font-medium">{summary.doors.total}</span>
              </div>
              <div className="flex justify-between gap-2 sm:gap-4">
                <span className="text-muted-foreground">Materials:</span>
                <span className="font-medium">{summary.hollowMetal.materials}</span>
              </div>
              <div className="flex justify-between gap-2 sm:gap-4">
                <span className="text-muted-foreground">Fire Ratings:</span>
                <span className="font-medium">{summary.fire.ratings}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="doors" className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-1">
          <TabsTrigger value="doors" className="text-xs sm:text-sm" data-testid="tab-doors">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Doors</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="text-xs sm:text-sm" data-testid="tab-materials">
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Materials</span>
          </TabsTrigger>
          <TabsTrigger value="frames" className="text-xs sm:text-sm" data-testid="tab-frames">
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Frames</span>
          </TabsTrigger>
          <TabsTrigger value="fire" className="text-xs sm:text-sm" data-testid="tab-fire">
            <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Fire</span>
          </TabsTrigger>
          <TabsTrigger value="electrified" className="text-xs sm:text-sm" data-testid="tab-electrified">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Electrified</span>
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="text-xs sm:text-sm" data-testid="tab-guidelines">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Guidelines</span>
          </TabsTrigger>
          <TabsTrigger value="raceways" className="text-xs sm:text-sm" data-testid="tab-raceways">
            <Cable className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Raceways</span>
          </TabsTrigger>
        </TabsList>

        {/* Door Reference Library */}
        <TabsContent value="doors" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate">Door & Frame Reference Database</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Comprehensive specifications for commercial door systems
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="search" className="text-xs sm:text-sm">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <Input
                      id="search"
                      placeholder="Search doors, materials..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 sm:pl-9 text-xs sm:text-sm"
                      data-testid="input-search-doors"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-40 md:w-48">
                  <Label className="text-xs sm:text-sm">Category</Label>
                  <Select
                    value={doorFilters.category}
                    onValueChange={(value) => setDoorFilters({ ...doorFilters, category: value })}
                  >
                    <SelectTrigger data-testid="select-category" className="text-xs sm:text-sm">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-40 md:w-48">
                  <Label className="text-xs sm:text-sm">Material</Label>
                  <Select
                    value={doorFilters.material}
                    onValueChange={(value) => setDoorFilters({ ...doorFilters, material: value })}
                  >
                    <SelectTrigger data-testid="select-material" className="text-xs sm:text-sm">
                      <SelectValue placeholder="All materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All materials</SelectItem>
                      <SelectItem value="Aluminum/Steel">Aluminum/Steel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className="h-[400px] sm:h-[500px] md:h-[600px]">
                {doorsLoading ? (
                  <div className="space-y-2 sm:space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 sm:h-32 w-full" />
                    ))}
                  </div>
                ) : doorsError ? (
                  <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-destructive">
                    Error loading door specifications. Please try again.
                  </div>
                ) : doors && doors.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {doors.map((door) => (
                      <Card key={door.id} data-testid={`card-door-${door.id}`}>
                        <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0">
                              <CardTitle className="text-sm sm:text-base truncate">
                                {door.doorType || "Door Specification"}
                              </CardTitle>
                              <CardDescription className="mt-1 text-xs truncate">
                                {door.category} • {door.material}
                              </CardDescription>
                            </div>
                            {door.automationReady === "yes" && (
                              <Badge variant="secondary" className="shrink-0 text-xs">Automation Ready</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 md:gap-4">
                            {door.operation && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Operation:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.operation}</span>
                              </div>
                            )}
                            {door.configuration && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Configuration:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.configuration}</span>
                              </div>
                            )}
                            {door.frameType && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Frame:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.frameType}</span>
                              </div>
                            )}
                            {door.hardware && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Hardware:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.hardware}</span>
                              </div>
                            )}
                          </div>
                          {door.commonUse && (
                            <div className="mt-1 sm:mt-2">
                              <span className="text-muted-foreground">Common Use:</span>
                              <span className="ml-1 sm:ml-2">{door.commonUse}</span>
                            </div>
                          )}
                          {door.notes && (
                            <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t text-xs text-muted-foreground">
                              <Info className="h-3 w-3 inline mr-1 shrink-0" />
                              {door.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                    No door specifications found matching your criteria
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hollow Metal Materials */}
        <TabsContent value="materials" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate">Hollow Metal Materials</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Industry-standard material specifications for hollow metal doors and frames
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
              {materialsLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 sm:h-24 w-full" />
                  ))}
                </div>
              ) : materialsError ? (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-destructive">
                  Error loading materials. Please try again.
                </div>
              ) : materials && materials.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {materials?.map((material) => (
                  <Card key={material.id} data-testid={`card-material-${material.materialId}`}>
                    <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <CardTitle className="text-sm sm:text-base truncate">{material.name}</CardTitle>
                        {material.isDefault === "yes" && (
                          <Badge variant="secondary" className="shrink-0 text-xs">Default</Badge>
                        )}
                      </div>
                      <CardDescription className="font-mono text-xs">
                        {material.materialId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                      {material.corrosionResistanceRank && (
                        <div>
                          <span className="text-muted-foreground">Corrosion Resistance:</span>
                          <span className="ml-1 sm:ml-2 font-medium">Rank {material.corrosionResistanceRank}/3</span>
                        </div>
                      )}
                      {material.paintAdhesion && (
                        <div>
                          <span className="text-muted-foreground">Paint Adhesion:</span>
                          <span className="ml-1 sm:ml-2 font-medium">{material.paintAdhesion}</span>
                        </div>
                      )}
                      {material.notes && (
                        <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t text-xs text-muted-foreground">
                          {material.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                  No materials found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hollow Metal Frames */}
        <TabsContent value="frames" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate">Hollow Metal Frames</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Frame gauge specifications for commercial applications
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
              {framesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 sm:h-32 w-full" />
                  ))}
                </div>
              ) : framesError ? (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-destructive">
                  Error loading frames. Please try again.
                </div>
              ) : frames && frames.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {frames.map((frame) => (
                    <Card key={frame.id} data-testid={`card-frame-${frame.frameId}`}>
                      <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                        <CardTitle className="text-sm sm:text-base">
                          {frame.gauge} Gauge
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {frame.frameId}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                        <p>{frame.description}</p>
                        {frame.notes && (
                          <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t text-xs text-muted-foreground">
                            {frame.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                  No frames found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fire Ratings & Labels */}
        <TabsContent value="fire" className="space-y-3 sm:space-y-4">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Flame className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">Fire Ratings</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  UL fire rating specifications
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {fireRatingsLoading ? (
                  <div className="space-y-2 sm:space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 sm:h-28 w-full" />
                    ))}
                  </div>
                ) : fireRatingsError ? (
                  <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-destructive">
                    Error loading fire ratings
                  </div>
                ) : fireRatings && fireRatings.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {fireRatings.map((rating) => (
                      <Card key={rating.id} data-testid={`card-rating-${rating.fireId}`}>
                        <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                          <CardTitle className="text-sm sm:text-base">{rating.label}</CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {rating.fireId} • {rating.minutes} minutes
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                          {rating.appliesTo && (
                            <div>
                              <span className="text-muted-foreground">Applies to:</span>
                              <span className="ml-1 sm:ml-2">{rating.appliesTo}</span>
                            </div>
                          )}
                          {rating.notes && (
                            <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t text-xs text-muted-foreground">
                              {rating.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                    No fire ratings found
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Flame className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">Fire Labels</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  UL label types and requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {fireLabelsLoading ? (
                  <div className="space-y-2 sm:space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 sm:h-28 w-full" />
                    ))}
                  </div>
                ) : fireLabelsError ? (
                  <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-destructive">
                    Error loading fire labels
                  </div>
                ) : fireLabels && fireLabels.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {fireLabels.map((label) => (
                      <Card key={label.id} data-testid={`card-label-${label.labelId}`}>
                        <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                          <CardTitle className="text-sm sm:text-base">{label.type}</CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {label.labelId}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                          {label.visibilityRule && (
                            <div>
                              <span className="text-muted-foreground">Visibility:</span>
                              <span className="ml-1 sm:ml-2">{label.visibilityRule}</span>
                            </div>
                          )}
                          {label.relocationNotes && (
                            <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t text-xs text-muted-foreground">
                              {label.relocationNotes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                    No fire labels found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Electrified Hardware */}
        <TabsContent value="electrified" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate">Electrified Hardware</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Power transfer and locking mode specifications
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
              {electrifiedLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 sm:h-32 w-full" />
                  ))}
                </div>
              ) : electrifiedError ? (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-destructive">
                  Error loading electrified hardware
                </div>
              ) : electrifiedHardware && electrifiedHardware.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {electrifiedHardware.map((hw) => (
                    <Card key={hw.id} data-testid={`card-hardware-${hw.hwId}`}>
                      <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <CardTitle className="text-sm sm:text-base truncate">{hw.name}</CardTitle>
                          <Badge variant="outline" className="shrink-0 text-xs">{hw.category}</Badge>
                        </div>
                        <CardDescription className="font-mono text-xs">
                          {hw.hwId}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                        {hw.definition && (
                          <p>{hw.definition}</p>
                        )}
                        {hw.commonUse && (
                          <div>
                            <span className="text-muted-foreground">Common Use:</span>
                            <span className="ml-1 sm:ml-2">{hw.commonUse}</span>
                          </div>
                        )}
                        {hw.notes && (
                          <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t text-xs text-muted-foreground">
                            {hw.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                  No electrified hardware found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ordering Guidelines */}
        <TabsContent value="guidelines" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate">Ordering Guidelines</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Best practices and requirements for commercial door orders
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
              {guidelinesLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 sm:h-32 w-full" />
                  ))}
                </div>
              ) : guidelinesError ? (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-destructive">
                  Error loading ordering guidelines
                </div>
              ) : orderingGuidelines && orderingGuidelines.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {orderingGuidelines.map((guideline) => (
                    <Card key={guideline.id} data-testid={`card-guideline-${guideline.guidelineId}`}>
                      <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <CardTitle className="text-sm sm:text-base truncate">{guideline.topic}</CardTitle>
                          <Badge variant="outline" className="shrink-0 text-xs">{guideline.guidelineId}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                        <p className="font-medium">{guideline.rule}</p>
                        {guideline.methodExamples && (
                          <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t">
                            <span className="text-muted-foreground">Methods:</span>
                            <p className="mt-1">{guideline.methodExamples}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                  No ordering guidelines found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raceways & EPTs */}
        <TabsContent value="raceways" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Cable className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate">Raceways & EPTs</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Power transfer specifications for electrified hardware
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
              {racewaysLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 sm:h-40 w-full" />
                  ))}
                </div>
              ) : racewaysError ? (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-destructive">
                  Error loading raceways
                </div>
              ) : raceways && raceways.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {raceways.map((raceway) => (
                    <Card key={raceway.id} data-testid={`card-raceway-${raceway.eptId}`}>
                      <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                        <CardTitle className="text-sm sm:text-base">
                          {raceway.appliesTo === "door" ? "Door Raceway" : "Frame Raceway"}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {raceway.eptId}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-2 sm:p-3 pt-0 sm:pt-0 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                        {raceway.diameterIn && (
                          <div>
                            <span className="text-muted-foreground">Diameter:</span>
                            <span className="ml-1 sm:ml-2 font-medium">{raceway.diameterIn}" (inches)</span>
                          </div>
                        )}
                        {raceway.installedByDefault && (
                          <div>
                            <span className="text-muted-foreground">Default Install:</span>
                            <span className="ml-1 sm:ml-2">{raceway.installedByDefault}</span>
                          </div>
                        )}
                        {raceway.framePolicy && (
                          <div>
                            <span className="text-muted-foreground">Frame Policy:</span>
                            <span className="ml-1 sm:ml-2">{raceway.framePolicy}</span>
                          </div>
                        )}
                        {raceway.molexPasses && (
                          <div>
                            <span className="text-muted-foreground">Molex Compatible:</span>
                            <span className="ml-1 sm:ml-2">{raceway.molexPasses}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                  No raceways found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
