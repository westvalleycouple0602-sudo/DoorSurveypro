import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileBox, Filter, Download, Trash2, RefreshCw, Search, Calendar, AlertCircle, CheckCircle2, Clock, XCircle, Loader2, Play, FileDown, Zap, Building2, MapPin, FileSignature, Smartphone, HardDrive, CalendarClock, Ruler, Eye, Link2, LinkIcon, Unlink, Shield } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LidarScan, Project, DoorOpening } from "@shared/schema";

type ScanWithDetails = LidarScan & {
  project?: Project;
  opening?: DoorOpening;
};

export default function LidarScans() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [linkFilter, setLinkFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scanToDelete, setScanToDelete] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(() => 
    localStorage.getItem('lidar-auto-refresh') === 'true'
  );
  const [dxfAvailability, setDxfAvailability] = useState<Record<string, boolean>>({});
  
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [scanToLink, setScanToLink] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedOpeningId, setSelectedOpeningId] = useState<string>("");

  const { data: scans = [], isLoading: scansLoading, isError: scansError, error: scansErrorObj, refetch } = useQuery<LidarScan[]>({
    queryKey: ["/api/lidar/scans"],
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: openings = [] } = useQuery<DoorOpening[]>({
    queryKey: ["/api/openings"],
  });

  // Enrich scans with project and opening details
  const scansWithDetails: ScanWithDetails[] = useMemo(() => {
    return scans.map(scan => ({
      ...scan,
      project: projects.find(p => p.id === scan.projectId),
      opening: openings.find(o => o.id === scan.openingId),
    }));
  }, [scans, projects, openings]);

  // Get openings for selected project (for link dialog)
  const projectOpenings = useMemo(() => {
    if (!selectedProjectId) return [];
    return openings.filter(o => o.projectId === selectedProjectId);
  }, [selectedProjectId, openings]);

  // Filter scans
  const filteredScans = useMemo(() => {
    let filtered = scansWithDetails;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(scan => scan.processingStatus === statusFilter);
    }

    // Project filter
    if (projectFilter !== "all") {
      filtered = filtered.filter(scan => scan.projectId === projectFilter);
    }

    // Link filter (linked/unlinked)
    if (linkFilter === "unlinked") {
      filtered = filtered.filter(scan => !scan.projectId || !scan.openingId);
    } else if (linkFilter === "linked") {
      filtered = filtered.filter(scan => scan.projectId && scan.openingId);
    }

    if (methodFilter !== "all") {
      filtered = filtered.filter(scan => scan.captureMethod === methodFilter);
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(scan =>
        scan.originalFilename.toLowerCase().includes(query) ||
        scan.opening?.location?.toLowerCase().includes(query) ||
        scan.project?.name.toLowerCase().includes(query) ||
        (scan.scanLabel && scan.scanLabel.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [scansWithDetails, statusFilter, projectFilter, linkFilter, methodFilter, debouncedSearch]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = scans.length;
    const processed = scans.filter(s => s.processingStatus === "processed").length;
    const processing = scans.filter(s => s.processingStatus === "processing").length;
    const failed = scans.filter(s => s.processingStatus === "failed").length;
    const uploaded = scans.filter(s => s.processingStatus === "uploaded").length;
    const unlinked = scans.filter(s => !s.projectId || !s.openingId).length;

    const avgQuality = (() => {
      const processedWithScores = scans.filter(s => 
        s.processingStatus === 'processed' && 
        s.confidenceScores && 
        typeof s.confidenceScores === 'object' &&
        (s.confidenceScores as any).overall != null
      );
      if (processedWithScores.length === 0) return null;
      const sum = processedWithScores.reduce((acc, s) => acc + ((s.confidenceScores as any).overall || 0), 0);
      return sum / processedWithScores.length;
    })();

    return { total, processed, processing, failed, uploaded, unlinked, avgQuality };
  }, [scans]);

  // Auto-refresh toggle handler
  useEffect(() => {
    localStorage.setItem('lidar-auto-refresh', autoRefresh.toString());
  }, [autoRefresh]);

  // Check DXF availability for visible scans (with cache to avoid redundant requests)
  useEffect(() => {
    const checkDXF = async (scanId: string) => {
      // Skip if already checked
      if (dxfAvailability[scanId] !== undefined) return;
      
      try {
        const response = await fetch(`/api/lidar/scans/${scanId}/dxf`, { method: 'HEAD' });
        setDxfAvailability(prev => ({ ...prev, [scanId]: response.ok }));
      } catch {
        setDxfAvailability(prev => ({ ...prev, [scanId]: false }));
      }
    };

    filteredScans.forEach(scan => {
      if (scan.processingStatus === 'processed') {
        checkDXF(scan.id);
      }
    });
  }, [filteredScans, dxfAvailability]);

  const reprocessMutation = useMutation({
    mutationFn: async ({ scanId, mode = 'full' }: { scanId: string, mode?: 'fast' | 'full' }) => {
      return await apiRequest("POST", `/api/lidar/scans/${scanId}/process?mode=${mode}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lidar/scans"] });
      toast({
        title: "Success",
        description: "Scan processing started successfully. The scan will be analyzed and measurements will be extracted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to process scan",
        description: error.message || "Unable to start scan processing. Please check the scan file and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scanId: string) => {
      return await apiRequest("DELETE", `/api/lidar/scans/${scanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lidar/scans"] });
      toast({
        title: "Success",
        description: "Scan deleted successfully. All associated scan data and files have been removed.",
      });
      setDeleteDialogOpen(false);
      setScanToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete scan",
        description: error.message || "Unable to remove scan. It may be associated with active door openings.",
        variant: "destructive",
      });
    },
  });

  const linkMutation = useMutation({
    mutationFn: async ({ scanId, projectId, openingId }: { scanId: string; projectId: string; openingId: string }) => {
      return await apiRequest("POST", `/api/lidar/scans/${scanId}/link`, { projectId, openingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lidar/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/openings"] });
      toast({
        title: "Success",
        description: "Scan linked to project/opening successfully. Measurements will be applied if available.",
      });
      setLinkDialogOpen(false);
      setScanToLink(null);
      setSelectedProjectId("");
      setSelectedOpeningId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to link scan",
        description: error.message || "Unable to link scan to the selected opening.",
        variant: "destructive",
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (scanId: string) => {
      return await apiRequest("POST", `/api/lidar/scans/${scanId}/unlink`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lidar/scans"] });
      toast({
        title: "Success",
        description: "Scan unlinked from project/opening.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unlink scan",
        description: error.message || "Unable to unlink scan.",
        variant: "destructive",
      });
    },
  });

  // Bulk process all LiDAR scans
  const bulkProcessMutation = useMutation({
    mutationFn: async () => {
      const lidarScans = filteredScans.filter(scan => 
        scan.captureMethod === 'ios_lidar' && scan.processingStatus !== 'processing'
      );
      
      for (const scan of lidarScans) {
        await apiRequest("POST", `/api/lidar/scans/${scan.id}/process?mode=full`);
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      return lidarScans.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lidar/scans"] });
      toast({
        title: "Success",
        description: `Bulk processing started for ${count} LiDAR scans. All scans will be analyzed and measurements extracted.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start bulk processing",
        description: error.message || "Unable to process multiple scans. Please check scan files and try again.",
        variant: "destructive",
      });
    },
  });

  // Quality indicator function based on metrics
  const getQualityClass = (scan: LidarScan): 'good' | 'warn' | 'bad' | 'unknown' => {
    if (!scan.processedMetrics || scan.processingStatus !== 'processed') return 'unknown';
    
    const metrics = scan.processedMetrics as any;
    const parallelError = metrics.parallel_error_deg || 0;
    const plumbError = metrics.plumb_error_deg || 0;
    const sigmaWidth = metrics.sigma_width_mm || 0;
    
    if (parallelError > 3 || plumbError > 3 || sigmaWidth > 3) return 'bad';
    if (parallelError > 2 || plumbError > 2 || sigmaWidth > 2) return 'warn';
    return 'good';
  };

  const getQualityBadge = (scan: LidarScan) => {
    if (!scan.processedMetrics || scan.processingStatus !== 'processed') return null;
    
    const metrics = scan.processedMetrics as any;
    const parts = [];
    if (metrics.sigma_width_mm != null) parts.push(`σw=${metrics.sigma_width_mm.toFixed(1)}mm`);
    if (metrics.parallel_error_deg != null) parts.push(`∥=${metrics.parallel_error_deg.toFixed(1)}°`);
    if (metrics.plumb_error_deg != null) parts.push(`⊥=${metrics.plumb_error_deg.toFixed(1)}°`);
    
    return parts.join(" ");
  };

  const handleDeleteClick = (scanId: string) => {
    setScanToDelete(scanId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scanToDelete) {
      deleteMutation.mutate(scanToDelete);
    }
  };

  const handleLinkClick = (scanId: string) => {
    setScanToLink(scanId);
    setSelectedProjectId("");
    setSelectedOpeningId("");
    setLinkDialogOpen(true);
  };

  const confirmLink = () => {
    if (scanToLink && selectedProjectId && selectedOpeningId) {
      linkMutation.mutate({ scanId: scanToLink, projectId: selectedProjectId, openingId: selectedOpeningId });
    }
  };

  const isUnlinked = (scan: ScanWithDetails) => !scan.projectId || !scan.openingId;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return (
          <Badge className="bg-chart-2/10 text-chart-2" data-testid={`badge-status-processed`}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Processed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-chart-4/10 text-chart-4" data-testid={`badge-status-processing`}>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" data-testid={`badge-status-failed`}>
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "queued":
        return (
          <Badge className="bg-muted text-muted-foreground" data-testid={`badge-status-queued`}>
            <Clock className="h-3 w-3 mr-1" />
            Queued
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground" data-testid={`badge-status-uploaded`}>
            <AlertCircle className="h-3 w-3 mr-1" />
            Uploaded
          </Badge>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportCSV = () => {
    if (filteredScans.length === 0) {
      toast({ title: "No data to export", description: "Apply filters or add scans before exporting.", variant: "destructive" });
      return;
    }
    const headers = ["Filename", "Label", "Status", "Project", "Opening", "Capture Method", "Device", "Quality Score", "Width (mm)", "Height (mm)", "Frame Depth (mm)", "Swing Direction", "Point Count", "File Size (bytes)", "Uploaded At"];
    const rows = filteredScans.map(scan => {
      const metrics = scan.processedMetrics as any;
      const scores = scan.confidenceScores as any;
      const deviceInfo = scan.deviceInfo as any;
      return [
        scan.originalFilename,
        scan.scanLabel || "",
        scan.processingStatus,
        scan.project?.name || "",
        (scan as ScanWithDetails).opening?.location || "",
        scan.captureMethod || "",
        deviceInfo?.model || deviceInfo?.name || "",
        scores?.overall != null ? (scores.overall * 100).toFixed(0) + "%" : "",
        metrics?.width || "",
        metrics?.height || "",
        metrics?.frameDepth || "",
        metrics?.swingDirection || "",
        metrics?.pointCount || "",
        scan.fileSizeBytes || "",
        scan.createdAt ? new Date(scan.createdAt).toISOString() : "",
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lidar-scans-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: `${filteredScans.length} scan(s) exported to CSV.` });
  };

  // Show error state
  if (scansError) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load LiDAR scans"
            message={scansErrorObj instanceof Error ? scansErrorObj.message : "Unable to fetch scan data. Please check your connection and try again."}
            error={scansErrorObj as Error}
            onRetry={refetch}
            testId="error-lidar-scans"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (scansLoading) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Loading LiDAR scans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">LiDAR Scans</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage and review 3D point cloud scans for door openings
            </p>
          </div>
          <div className="flex flex-row items-center gap-2 shrink-0">
            <Button
              onClick={() => bulkProcessMutation.mutate()}
              disabled={bulkProcessMutation.isPending || filteredScans.filter(s => s.captureMethod === 'ios_lidar').length === 0}
              variant="default"
              size="sm"
              className="text-xs sm:text-sm"
              data-testid="button-bulk-process"
            >
              {bulkProcessMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                  <span className="hidden sm:inline">Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2 shrink-0" />
                  <span className="hidden sm:inline">Bulk Process</span>
                  <span className="sm:hidden">Process</span>
                </>
              )}
            </Button>
            <Button
              onClick={exportCSV}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              disabled={filteredScans.length === 0}
              data-testid="button-export-csv"
            >
              <FileDown className="h-4 w-4 mr-2 shrink-0" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                data-testid="switch-auto-refresh"
              />
              <Label htmlFor="auto-refresh" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                <span className="hidden sm:inline">Auto-refresh</span>
                <span className="sm:hidden">Auto</span>
              </Label>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2 sm:gap-3">
          <Card>
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Scans
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-semibold" data-testid="text-total-scans">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Processed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-semibold text-chart-2" data-testid="text-processed-scans">{stats.processed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-semibold text-chart-4" data-testid="text-processing-scans">{stats.processing}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-semibold text-destructive" data-testid="text-failed-scans">{stats.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Uploaded
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-semibold" data-testid="text-uploaded-scans">{stats.uploaded}</div>
            </CardContent>
          </Card>

          <Card className={stats.unlinked > 0 ? "border-chart-5" : ""}>
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Unlink className="h-3 w-3 shrink-0" />
                Unlinked
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-semibold text-chart-5" data-testid="text-unlinked-scans">{stats.unlinked}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3 shrink-0" />
                Avg Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0">
              <div className="text-lg sm:text-2xl font-semibold" data-testid="text-avg-quality">
                {stats.avgQuality != null ? `${(stats.avgQuality * 100).toFixed(0)}%` : '\u2014'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Project</label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger data-testid="select-project-filter">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Link Status</label>
                <Select value={linkFilter} onValueChange={setLinkFilter}>
                  <SelectTrigger data-testid="select-link-filter">
                    <SelectValue placeholder="All scans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scans</SelectItem>
                    <SelectItem value="linked">Linked</SelectItem>
                    <SelectItem value="unlinked">Unlinked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Capture Method</label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger data-testid="select-method-filter">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="ios_lidar">iOS LiDAR</SelectItem>
                    <SelectItem value="arkit">ARKit</SelectItem>
                    <SelectItem value="lidarkit">LiDARKit</SelectItem>
                    <SelectItem value="manual">Manual Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Search filename, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>

            {(statusFilter !== "all" || projectFilter !== "all" || linkFilter !== "all" || methodFilter !== "all" || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs sm:text-sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setProjectFilter("all");
                    setLinkFilter("all");
                    setMethodFilter("all");
                    setSearchQuery("");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Showing {filteredScans.length} of {scans.length} scans
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scans List */}
        {scansLoading ? (
          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4 animate-spin" />
                <h3 className="text-base sm:text-lg font-medium mb-2">Loading scans...</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                  Please wait while we fetch your LiDAR scans.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filteredScans.length === 0 ? (
          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <FileBox className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">
                  {scans.length === 0 ? "No LiDAR scans yet" : "No scans match your filters"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                  {scans.length === 0
                    ? "Upload LiDAR scans from the opening detail pages to see them here."
                    : "Try adjusting your filters to see more results."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-sm sm:text-base">Scans ({filteredScans.length})</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Review and manage your LiDAR point cloud scans
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <FileBox className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">File</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Project</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Location</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <FileSignature className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Status</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Device</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <HardDrive className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Size</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Uploaded</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <Ruler className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Measurements</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                          <Shield className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm">Quality</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="text-xs sm:text-sm">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScans.map((scan) => (
                      <TableRow 
                        key={scan.id} 
                        data-testid={`row-scan-${scan.id}`}
                        className="group hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleLinkClick(scan.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleLinkClick(scan.id);
                          }
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileBox className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium flex items-center gap-1 sm:gap-2 flex-wrap text-xs sm:text-sm">
                                <span className="truncate max-w-[120px] sm:max-w-none">{scan.originalFilename}</span>
                                {isUnlinked(scan) && (
                                  <Badge variant="outline" className="text-chart-5 border-chart-5 text-xs shrink-0" data-testid={`badge-unlinked-${scan.id}`}>
                                    <Unlink className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 shrink-0" />
                                    <span className="hidden sm:inline">Unlinked</span>
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase flex items-center gap-1 sm:gap-2">
                                {scan.scanFormat}
                                {scan.scanLabel && (
                                  <span className="normal-case text-foreground/70 truncate">
                                    ({scan.scanLabel})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {scan.projectId ? (
                            <Link href={`/projects/${scan.projectId}`}>
                              <Button variant="ghost" size="sm" className="h-auto p-0 hover:underline text-xs sm:text-sm" data-testid={`link-project-${scan.id}`}>
                                {scan.project?.name || "Unknown"}
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground italic text-xs sm:text-sm">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {scan.openingId ? (
                            <span className="text-xs sm:text-sm">{scan.opening?.location || "N/A"}</span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs sm:text-sm">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(scan.processingStatus)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm text-muted-foreground">
                          <div className="min-w-0">
                            <div className="text-xs">
                              {scan.captureMethod === "ios_lidar" && "iOS LiDAR"}
                              {scan.captureMethod === "lidarkit" && "LiDARKit"}
                              {scan.captureMethod === "arkit" && "ARKit"}
                              {scan.captureMethod === "manual" && "Manual"}
                            </div>
                            {scan.deviceInfo && (
                              <div className="text-xs text-muted-foreground/70 truncate max-w-[120px]">
                                {scan.deviceInfo}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm text-muted-foreground">
                          {formatFileSize(scan.fileSizeBytes)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs sm:text-sm text-muted-foreground">
                          {formatDate(scan.createdAt)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {scan.processedMetrics && typeof scan.processedMetrics === 'object' ? (
                            <div className="text-xs space-y-0.5">
                              {(scan.processedMetrics as any).width ? (
                                <div>Width: {(scan.processedMetrics as any).width}"</div>
                              ) : null}
                              {(scan.processedMetrics as any).height ? (
                                <div>Height: {(scan.processedMetrics as any).height}"</div>
                              ) : null}
                              {(scan.processedMetrics as any).depth ? (
                                <div>Depth: {(scan.processedMetrics as any).depth}"</div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {scan.processingStatus === 'processed' && scan.confidenceScores && typeof scan.confidenceScores === 'object' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <div className={`h-2 w-2 rounded-full shrink-0 ${
                                  (scan.confidenceScores as any).overall >= 0.9 ? 'bg-green-500' :
                                  (scan.confidenceScores as any).overall >= 0.7 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`} />
                                <span className="text-xs font-medium">
                                  {((scan.confidenceScores as any).overall * 100).toFixed(0)}%
                                </span>
                              </div>
                              {(scan.confidenceScores as any).width != null && (
                                <div className="text-xs text-muted-foreground">
                                  W: {((scan.confidenceScores as any).width * 100).toFixed(0)}%
                                  {(scan.confidenceScores as any).height != null && ` H: ${((scan.confidenceScores as any).height * 100).toFixed(0)}%`}
                                </div>
                              )}
                            </div>
                          ) : scan.processingStatus === 'processed' ? (
                            <span className="text-xs text-muted-foreground">No scores</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                            {scan.processingStatus === "processed" && getQualityBadge(scan) && (
                              <Badge 
                                variant="outline"
                                className={`text-xs shrink-0 hidden sm:inline-flex ${
                                  getQualityClass(scan) === 'good' ? 'border-chart-2 text-chart-2' :
                                  getQualityClass(scan) === 'warn' ? 'border-chart-4 text-chart-4' :
                                  getQualityClass(scan) === 'bad' ? 'border-destructive text-destructive' :
                                  ''
                                }`}
                                data-testid={`badge-quality-${scan.id}`}
                              >
                                {getQualityBadge(scan)}
                              </Badge>
                            )}
                            {dxfAvailability[scan.id] && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => window.open(`/api/lidar/scans/${scan.id}/dxf`, '_blank')}
                                    data-testid={`button-download-dxf-${scan.id}`}
                                  >
                                    <Download className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 sm:mr-2" />
                                    <span className="hidden sm:inline">DXF</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download DXF file</TooltipContent>
                              </Tooltip>
                            )}
                            {isUnlinked(scan) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => handleLinkClick(scan.id)}
                                    disabled={linkMutation.isPending}
                                    data-testid={`button-link-${scan.id}`}
                                  >
                                    {linkMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />
                                    ) : (
                                      <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 sm:mr-2" />
                                    )}
                                    <span className="hidden sm:inline">Link</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Link to project/opening</TooltipContent>
                              </Tooltip>
                            ) : (
                              <>
                                <Link href={`/openings/${scan.openingId}`}>
                                  <Button variant="ghost" size="sm" className="text-xs" data-testid={`button-view-${scan.id}`}>
                                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 sm:mr-2" />
                                    <span className="hidden sm:inline">View</span>
                                  </Button>
                                </Link>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => unlinkMutation.mutate(scan.id)}
                                      disabled={unlinkMutation.isPending}
                                      data-testid={`button-unlink-${scan.id}`}
                                    >
                                      {unlinkMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />
                                      ) : (
                                        <Unlink className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Unlink from opening</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            {scan.processingStatus !== "processing" && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => reprocessMutation.mutate({ scanId: scan.id, mode: 'fast' })}
                                      disabled={reprocessMutation.isPending}
                                      data-testid={`button-reprocess-fast-${scan.id}`}
                                    >
                                      {reprocessMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                      ) : (
                                        <Play className="h-3 w-3 shrink-0" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Fast processing</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => reprocessMutation.mutate({ scanId: scan.id, mode: 'full' })}
                                      disabled={reprocessMutation.isPending}
                                      data-testid={`button-reprocess-full-${scan.id}`}
                                    >
                                      {reprocessMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                      ) : (
                                        <Zap className="h-3 w-3 shrink-0" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Full processing with RANSAC</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(scan.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${scan.id}`}
                                >
                                  {deleteMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive animate-spin shrink-0" />
                                  ) : (
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive shrink-0" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete scan</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this LiDAR scan? This action cannot be undone.
              The scan file and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete Scan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Scan Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Link Scan to Opening
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Select a project and opening to link this scan. Any processed measurements will be applied to the opening.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="link-project" className="text-xs sm:text-sm">Project</Label>
              <Select value={selectedProjectId} onValueChange={(value) => {
                setSelectedProjectId(value);
                setSelectedOpeningId("");
              }}>
                <SelectTrigger id="link-project" data-testid="select-link-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="link-opening" className="text-xs sm:text-sm">Door Opening</Label>
              <Select 
                value={selectedOpeningId} 
                onValueChange={setSelectedOpeningId}
                disabled={!selectedProjectId}
              >
                <SelectTrigger id="link-opening" data-testid="select-link-opening">
                  <SelectValue placeholder={selectedProjectId ? "Select an opening" : "Select a project first"} />
                </SelectTrigger>
                <SelectContent>
                  {projectOpenings.length === 0 ? (
                    <SelectItem value="" disabled>No openings in this project</SelectItem>
                  ) : (
                    projectOpenings.map(opening => (
                      <SelectItem key={opening.id} value={opening.id}>
                        {opening.location || `Opening #${opening.openingNumber}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => setLinkDialogOpen(false)}
              data-testid="button-cancel-link"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmLink}
              disabled={!selectedProjectId || !selectedOpeningId || linkMutation.isPending}
              size="sm"
              className="text-xs sm:text-sm"
              data-testid="button-confirm-link"
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2 shrink-0" />
                  Link Scan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
