import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Wrench, FileText, Ruler, Layers, Loader2 } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import type { DoorReference, OptionsLookup, SurveyFieldReference, HardwareLocationCheat, EdgeLiteTypesHmma810 } from "@shared/schema";

export default function Reference() {
  const { 
    data: doorRef, 
    isLoading: loadingDoors,
    isError: doorsError,
    error: doorsErrorObj,
    refetch: refetchDoors
  } = useQuery<DoorReference[]>({
    queryKey: ["/api/reference/doors"],
  });

  const { 
    data: options, 
    isLoading: loadingOptions,
    isError: optionsError,
    error: optionsErrorObj,
    refetch: refetchOptions
  } = useQuery<OptionsLookup[]>({
    queryKey: ["/api/reference/options"],
  });

  const { 
    data: surveyFields, 
    isLoading: loadingSurvey,
    isError: surveyError,
    error: surveyErrorObj,
    refetch: refetchSurvey
  } = useQuery<SurveyFieldReference[]>({
    queryKey: ["/api/reference/survey-fields"],
  });

  const { 
    data: hardwareLocations, 
    isLoading: loadingHardware,
    isError: hardwareError,
    error: hardwareErrorObj,
    refetch: refetchHardware
  } = useQuery<HardwareLocationCheat[]>({
    queryKey: ["/api/reference/hardware-locations"],
  });

  const { 
    data: edgeLiteTypes, 
    isLoading: loadingEdgeLite,
    isError: edgeLiteError,
    error: edgeLiteErrorObj,
    refetch: refetchEdgeLite
  } = useQuery<EdgeLiteTypesHmma810[]>({
    queryKey: ["/api/reference/edge-lite-types"],
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 md:p-6 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 min-w-0">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold truncate" data-testid="text-page-title">Industry Reference Database</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">ANSI/SDI A250.8 and AAADM A156.10 standards</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <Tabs defaultValue="doors" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1" data-testid="tabs-reference">
            <TabsTrigger value="doors" className="text-xs sm:text-sm" data-testid="tab-doors">
              <Layers className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <span className="truncate">Door Specs</span>
            </TabsTrigger>
            <TabsTrigger value="options" className="text-xs sm:text-sm" data-testid="tab-options">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <span className="truncate">Field Options</span>
            </TabsTrigger>
            <TabsTrigger value="survey" className="text-xs sm:text-sm" data-testid="tab-survey">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <span className="truncate">Survey Guide</span>
            </TabsTrigger>
            <TabsTrigger value="hardware" className="text-xs sm:text-sm" data-testid="tab-hardware">
              <Wrench className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <span className="truncate">Hardware CL</span>
            </TabsTrigger>
            <TabsTrigger value="edge-lite" className="text-xs sm:text-sm" data-testid="tab-edge-lite">
              <Ruler className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
              <span className="truncate">HMMA 810</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="doors" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg">Door Reference Database</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Detailed commercial door and frame specifications</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {doorsError ? (
                  <ErrorState 
                    error={doorsErrorObj as Error} 
                    onRetry={refetchDoors}
                    message="Unable to load door reference data. Please try again."
                  />
                ) : loadingDoors ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" data-testid="loader-doors" />
                  </div>
                ) : doorRef && doorRef.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {doorRef.map((door) => (
                      <Card key={door.id} className="hover-elevate" data-testid={`card-door-${door.id}`}>
                        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                          <div className="flex items-start justify-between gap-2 sm:gap-4 min-w-0">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm sm:text-base truncate">{door.category || "N/A"}</CardTitle>
                              {door.subcategory && (
                                <CardDescription className="text-xs sm:text-sm truncate">{door.subcategory}</CardDescription>
                              )}
                            </div>
                            {door.fireLabel && door.fireLabel !== "None" && (
                              <Badge variant="destructive" className="shrink-0 text-xs" data-testid={`badge-fire-${door.id}`}>{door.fireLabel}</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 space-y-2 sm:space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2 text-xs sm:text-sm">
                            {door.doorType && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Type:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.doorType}</span>
                              </div>
                            )}
                            {door.material && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Material:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.material}</span>
                              </div>
                            )}
                            {door.configuration && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Config:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.configuration}</span>
                              </div>
                            )}
                            {door.operation && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Operation:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.operation}</span>
                              </div>
                            )}
                            {door.frameType && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Frame:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.frameType}</span>
                              </div>
                            )}
                            {door.gaugeDoor && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Door Gauge:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.gaugeDoor}</span>
                              </div>
                            )}
                            {door.gaugeFrame && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Frame Gauge:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.gaugeFrame}</span>
                              </div>
                            )}
                            {door.coreType && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground">Core:</span>
                                <span className="ml-1 sm:ml-2 font-medium">{door.coreType}</span>
                              </div>
                            )}
                          </div>
                          {door.commonUse && (
                            <div className="border-t pt-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Common Use</span>
                              <p className="text-xs sm:text-sm mt-1">{door.commonUse}</p>
                            </div>
                          )}
                          {door.notes && door.notes !== "Auto-filled from standards; update after field verification." && (
                            <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
                              <span className="font-medium">Note:</span> {door.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8" data-testid="text-no-doors">No door reference data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg">Field Options Lookup</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Standard dropdown values for door opening forms</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {optionsError ? (
                  <ErrorState 
                    error={optionsErrorObj as Error} 
                    onRetry={refetchOptions}
                    message="Unable to load field options data. Please try again."
                  />
                ) : loadingOptions ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" data-testid="loader-options" />
                  </div>
                ) : options && options.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {Object.entries(
                      options.reduce((acc, opt) => {
                        if (!acc[opt.field]) acc[opt.field] = [];
                        acc[opt.field].push(opt.value);
                        return acc;
                      }, {} as Record<string, string[]>)
                    ).map(([field, values]) => (
                      <div key={field} className="border rounded-md p-2 sm:p-3 md:p-4" data-testid={`field-${field}`}>
                        <h3 className="font-medium mb-2 sm:mb-3 capitalize text-sm sm:text-base">{field.replace(/_/g, " ")}</h3>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {values.map((value, idx) => (
                            <Badge key={idx} variant="secondary" className="shrink-0 text-xs" data-testid={`badge-option-${field}-${idx}`}>
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8" data-testid="text-no-options">No field options available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="survey" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg">Survey Field Reference</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Best practices and guidance for field surveys</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {surveyError ? (
                  <ErrorState 
                    error={surveyErrorObj as Error} 
                    onRetry={refetchSurvey}
                    message="Unable to load survey field reference. Please try again."
                  />
                ) : loadingSurvey ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" data-testid="loader-survey" />
                  </div>
                ) : surveyFields && surveyFields.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {surveyFields.map((field) => (
                      <Card key={field.id} className="hover-elevate" data-testid={`card-survey-${field.id}`}>
                        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                          <CardTitle className="text-sm sm:text-base">{field.topic}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">{field.guidance}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8" data-testid="text-no-survey">No survey guidance available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hardware" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg">Hardware Location Specifications</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Standard centerline measurements for hardware installation</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {hardwareError ? (
                  <ErrorState 
                    error={hardwareErrorObj as Error} 
                    onRetry={refetchHardware}
                    message="Unable to load hardware location specs. Please try again."
                  />
                ) : loadingHardware ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" data-testid="loader-hardware" />
                  </div>
                ) : hardwareLocations && hardwareLocations.length > 0 ? (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm min-w-[400px]">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-2 sm:p-3 font-medium">Hardware Item</th>
                          <th className="text-left p-2 sm:p-3 font-medium">Recommended Centerline (inches)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hardwareLocations.map((hw) => (
                          <tr key={hw.id} className="border-b hover-elevate" data-testid={`row-hardware-${hw.id}`}>
                            <td className="p-2 sm:p-3">{hw.item}</td>
                            <td className="p-2 sm:p-3 font-mono">{hw.recommendedCenterlineIn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8" data-testid="text-no-hardware">No hardware specifications available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edge-lite" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg">HMMA 810 Standards</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Hollow Metal Manufacturers Association edge profile and lite type standards</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                {edgeLiteError ? (
                  <ErrorState 
                    error={edgeLiteErrorObj as Error} 
                    onRetry={refetchEdgeLite}
                    message="Unable to load HMMA 810 standards. Please try again."
                  />
                ) : loadingEdgeLite ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" data-testid="loader-edge-lite" />
                  </div>
                ) : edgeLiteTypes && edgeLiteTypes.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {edgeLiteTypes.map((type) => (
                      <Card key={type.id} className="hover-elevate" data-testid={`card-hmma-${type.id}`}>
                        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                          <CardTitle className="text-sm sm:text-base">{type.category}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">{type.examplesOrNotes}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8" data-testid="text-no-hmma">No HMMA 810 standards available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
