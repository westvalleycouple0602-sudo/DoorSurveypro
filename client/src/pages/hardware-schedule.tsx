import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {  
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Download,
  MapPin,
  Hash,
  DoorOpen,
  Wrench,
  Package,
  Ruler,
  Hash as HashTag,
  Lock,
  Key,
  DoorClosed,
  Sparkles,
  Building2,
  Layers,
  BadgeDollarSign,
  Clock,
  Loader2,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  ListChecks,
} from "lucide-react";
import type { Project, DoorOpening, HardwareItem, MasterKeySystem, LockSet } from "@shared/schema";

export default function HardwareSchedule() {
  // Support both standalone (/hardware-schedule) and project-specific (/projects/:id/hardware-schedule) routes
  const [, projectSpecificParams] = useRoute("/projects/:id/hardware-schedule");
  const [standaloneMatch] = useRoute("/hardware-schedule");
  const projectId = projectSpecificParams?.id;
  const isStandaloneMode = standaloneMatch && !projectId;

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [filterHardwareType, setFilterHardwareType] = useState<string>("all");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const { data: project, isLoading: loadingProject, isError: projectError, error: projectErrorDetails, refetch: refetchProject } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: openings = [], isLoading: loadingOpenings, isError: openingsError, error: openingsErrorDetails, refetch: refetchOpenings } = useQuery<DoorOpening[]>({
    queryKey: [`/api/projects/${projectId}/openings`],
    enabled: !!projectId,
  });

  const { data: hardware = [], isLoading: loadingHardware, isError: hardwareError, error: hardwareErrorDetails, refetch: refetchHardware } = useQuery<HardwareItem[]>({
    queryKey: [`/api/projects/${projectId}/hardware`],
    enabled: !!projectId,
  });

  const { data: masterKeySystems = [] } = useQuery<MasterKeySystem[]>({
    queryKey: ["/api/master-key-systems"],
  });

  const { data: lockSets = [] } = useQuery<LockSet[]>({
    queryKey: ["/api/lock-sets"],
  });

  const isLoading = loadingProject || loadingOpenings || loadingHardware;
  const isError = projectError || openingsError || hardwareError;

  // Build hardware schedule data combining openings and hardware
  const scheduleData = openings.flatMap(opening => {
    const openingHardware = hardware.filter(h => h.openingId === opening.id);
    if (openingHardware.length === 0) return [];
    
    return openingHardware.map(hw => ({
      opening,
      hardware: hw,
    }));
  });

  // Get unique buildings and floors for filters
  const buildings = Array.from(new Set(openings.map(o => o.building).filter(Boolean)));
  const floors = Array.from(new Set(openings.map(o => o.floor).filter(Boolean)));
  const hardwareTypes = Array.from(new Set(hardware.map(h => h.itemType)));

  // Filter data
  const filteredData = scheduleData.filter(item => {
    const matchesSearch = 
      debouncedSearch === "" ||
      item.opening.openingNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.opening.roomNumber?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.opening.roomName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.hardware.manufacturer?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.hardware.model?.toLowerCase().includes(debouncedSearch.toLowerCase());

    const matchesBuilding = filterBuilding === "all" || item.opening.building === filterBuilding;
    const matchesFloor = filterFloor === "all" || item.opening.floor === filterFloor;
    const matchesType = filterHardwareType === "all" || item.hardware.itemType === filterHardwareType;

    return matchesSearch && matchesBuilding && matchesFloor && matchesType;
  });

  // Get hardware type icon and badge
  const getHardwareTypeBadge = (itemType: string) => {
    const typeConfig: Record<string, { icon: any }> = {
      "lock": { icon: Lock },
      "lockset": { icon: Lock },
      "hinge": { icon: Wrench },
      "closer": { icon: DoorClosed },
      "exit_device": { icon: DoorOpen },
      "panic_hardware": { icon: DoorOpen },
      "key": { icon: Key },
      "cylinder": { icon: Key },
      "gasketing": { icon: Ruler },
      "threshold": { icon: Ruler },
      "door": { icon: DoorClosed },
      "frame": { icon: Package },
      "glass": { icon: Sparkles },
      "default": { icon: Wrench },
    };

    const config = typeConfig[itemType.toLowerCase()] || typeConfig["default"];
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className="shrink-0 text-xs" data-testid={`badge-hardware-type-${itemType}`}>
        <Icon className="h-3 w-3 mr-1 shrink-0" />
        {itemType}
      </Badge>
    );
  };

  const handleExportExcel = async () => {
    if (!projectId) return;
    
    setIsExportingExcel(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/hardware-schedule/excel`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate Excel file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hardware-Schedule-${project?.name || "Project"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Failed to export Excel file. Please try again.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (!projectId) return;
    
    setIsExportingPDF(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/hardware-schedule/pdf`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hardware-Schedule-${project?.name || "Project"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Failed to export PDF file. Please try again.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Show standalone mode message if no project selected
  if (isStandaloneMode) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Card data-testid="card-project-selector">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <ListChecks className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Hardware Schedule
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                View and manage door hardware schedules across all your projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                The hardware schedule is project-specific. Please select a project to view its hardware schedule.
              </p>
              <Button asChild size="sm" data-testid="button-go-to-projects" className="text-xs sm:text-sm">
                <Link href="/projects">
                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 shrink-0" />
                  View Projects
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    const errorMessage = projectError 
      ? "Unable to load project details"
      : openingsError 
      ? "Unable to load door openings"
      : "Unable to load hardware items";
    
    const error = (projectErrorDetails || openingsErrorDetails || hardwareErrorDetails) as Error;
    const refetch = projectError ? refetchProject : openingsError ? refetchOpenings : refetchHardware;

    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load hardware schedule"
            message={error instanceof Error ? error.message : `${errorMessage}. Please check your connection and try again.`}
            error={error}
            onRetry={refetch}
            testId="error-hardware-schedule"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-10 w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Table header */}
              <div className="flex gap-4 pb-3 border-b">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={`header-${i}`} className="h-5 flex-1" />
                ))}
              </div>
              {/* Table rows */}
              {[...Array(5)].map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-4 items-center">
                  {[...Array(7)].map((_, colIndex) => (
                    <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-10 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Door Hardware Schedule</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {project?.name} - <span className="hidden sm:inline">Complete hardware listing for estimating, ordering, and installation</span><span className="sm:hidden">Hardware listing</span>
          </p>
        </div>
        <div className="flex flex-row gap-2 shrink-0">
          <Button 
            onClick={handleExportExcel} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleExportExcel(); }}
            variant="outline" 
            size="sm"
            disabled={isExportingExcel} 
            data-testid="button-export-excel"
            className="text-xs sm:text-sm"
          >
            {isExportingExcel ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden sm:inline">Export </span>Excel
              </>
            )}
          </Button>
          <Button 
            onClick={handleExportPDF} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleExportPDF(); }}
            variant="outline" 
            size="sm"
            disabled={isExportingPDF} 
            data-testid="button-export-pdf"
            className="text-xs sm:text-sm"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden sm:inline">Export </span>PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search opening, room, manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            
            {buildings.length > 0 && (
              <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                <SelectTrigger data-testid="select-building">
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map(building => (
                    <SelectItem key={building} value={building!}>
                      {building}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {floors.length > 0 && (
              <Select value={filterFloor} onValueChange={setFilterFloor}>
                <SelectTrigger data-testid="select-floor">
                  <SelectValue placeholder="All Floors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {floors.map(floor => (
                    <SelectItem key={floor} value={floor!}>
                      Floor {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filterHardwareType} onValueChange={setFilterHardwareType}>
              <SelectTrigger data-testid="select-hardware-type">
                <SelectValue placeholder="All Hardware Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {hardwareTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Hardware Schedule Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Hardware Schedule ({filteredData.length} items)</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Complete door hardware specifications for estimating, procurement, and installation</span>
            <span className="sm:hidden">Hardware specs for ordering</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Hash className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">Opening #</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">Location</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Wrench className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm"><span className="hidden sm:inline">Hardware </span>Type</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm"><span className="hidden sm:inline">Manu</span>facturer</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">Model</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">Finish</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Package className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">Qty</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm"><span className="hidden sm:inline">Hardware </span>Set</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Key className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">Keying</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm"><span className="hidden sm:inline">Lead </span>Time</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BadgeDollarSign className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">Price</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground" data-testid="empty-state">
                        <Wrench className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-lg font-medium mb-1">No hardware items found</p>
                        <p className="text-sm">Try adjusting your filters or add hardware to openings</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map(item => (
                    <TableRow key={`${item.opening.id}-${item.hardware.id}`} data-testid={`row-hardware-${item.hardware.id}`}>
                      <TableCell className="font-medium">
                        <Link href={`/openings/${item.opening.id}`} className="text-primary hover:underline">
                          {item.opening.openingNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.opening.building && (
                            <div className="text-sm">{item.opening.building}</div>
                          )}
                          {item.opening.floor && (
                            <div className="text-sm text-muted-foreground">Floor {item.opening.floor}</div>
                          )}
                          {item.opening.roomNumber && (
                            <div className="text-sm">Room {item.opening.roomNumber}</div>
                          )}
                          {item.opening.roomName && (
                            <div className="text-xs text-muted-foreground">{item.opening.roomName}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getHardwareTypeBadge(item.hardware.itemType)}
                      </TableCell>
                      <TableCell>{item.hardware.manufacturer || "-"}</TableCell>
                      <TableCell>{item.hardware.model || "-"}</TableCell>
                      <TableCell>
                        {item.hardware.finish ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{item.hardware.finish}</div>
                            {item.hardware.finishDescription && (
                              <div className="text-xs text-muted-foreground">{item.hardware.finishDescription}</div>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{item.hardware.quantity}</TableCell>
                      <TableCell>
                        {item.hardware.hardwareSet ? (
                          <Badge>{item.hardware.hardwareSet}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {(item.hardware.keyBlank || item.hardware.masterKeySystemId || item.hardware.lockSetId) ? (
                          <div className="space-y-1 text-sm">
                            {item.hardware.keyBlank && (
                              <div>Blank: {item.hardware.keyBlank}</div>
                            )}
                            {item.hardware.masterKeySystemId && (
                              <div className="text-muted-foreground">
                                System: {masterKeySystems.find(s => s.id === item.hardware.masterKeySystemId)?.name || "Unknown"}
                              </div>
                            )}
                            {item.hardware.lockSetId && (
                              <div className="text-muted-foreground">
                                Set: {lockSets.find(s => s.id === item.hardware.lockSetId)?.setName || "Unknown"}
                              </div>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {item.hardware.leadTimeDays ? `${item.hardware.leadTimeDays} days` : "-"}
                      </TableCell>
                      <TableCell>
                        {item.hardware.listPrice ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">${item.hardware.listPrice.toFixed(2)}</div>
                            {item.hardware.discountPercent && (
                              <div className="text-xs text-muted-foreground">
                                -{item.hardware.discountPercent}% disc
                              </div>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
